import { useQuery } from "@tanstack/react-query";
import { useUser, useClerk } from "@clerk/react";
import { format, parseISO } from "date-fns";
import { Package, ShoppingBag, LogIn, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

interface OrderItem {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
}

interface Order {
  id: number;
  customerName: string;
  customerEmail: string;
  status: string;
  totalAmount: number;
  items: OrderItem[];
  createdAt: string;
}

function useMyOrders(enabled: boolean) {
  return useQuery<Order[]>({
    queryKey: ["me", "orders"],
    queryFn: async () => {
      const res = await fetch(`${basePath}/api/me/orders`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch orders");
      return res.json();
    },
    enabled,
  });
}

export default function Orders() {
  const { user, isLoaded } = useUser();
  const { openSignIn } = useClerk();
  const { data: orders, isLoading } = useMyOrders(isLoaded && !!user);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered": return "bg-green-100 text-green-800 border-green-200";
      case "shipped": return "bg-blue-100 text-blue-800 border-blue-200";
      case "processing": return "bg-amber-100 text-amber-800 border-amber-200";
      case "pending": return "bg-slate-100 text-slate-800 border-slate-200";
      default: return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  if (isLoaded && !user) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-3">Sign in to view your orders</h1>
          <p className="text-muted-foreground max-w-sm mb-8">
            Create a free account or sign in to track your orders and view your order history.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={() => openSignIn()} className="gap-2">
              <LogIn className="h-4 w-4" /> Sign In
            </Button>
            <Link href="/shop">
              <Button variant="outline">Browse Shop</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Order History</h1>
        <p className="text-muted-foreground">View and track your previous shop orders.</p>
      </div>

      {isLoading || !isLoaded ? (
        <div className="space-y-6">
          {[1, 2].map((i) => (
            <Card key={i} className="shadow-sm">
              <div className="p-6 bg-slate-50/50 border-b">
                <Skeleton className="h-6 w-1/4 mb-2" />
                <Skeleton className="h-4 w-1/3" />
              </div>
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : orders?.length === 0 ? (
        <div className="text-center py-20 bg-slate-50/50 rounded-xl border border-dashed">
          <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
          <h3 className="text-lg font-medium">No orders found</h3>
          <p className="text-muted-foreground mb-6">You haven't placed any orders yet.</p>
          <Link href="/shop">
            <Button variant="outline">Browse Shop</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {orders?.map((order) => (
            <Card key={order.id} className="shadow-sm overflow-hidden border-border/60">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 bg-slate-50 border-b border-border/60 gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold">Order #{order.id.toString().padStart(4, "0")}</h3>
                    <Badge variant="outline" className={`font-medium ${getStatusColor(order.status)}`}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Placed on {format(parseISO(order.createdAt), "MMMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <div className="text-sm text-muted-foreground mb-1">Total Amount</div>
                  <div className="font-bold text-lg">{order.totalAmount.toLocaleString()} kr.</div>
                </div>
              </div>

              <CardContent className="p-0">
                <ul className="divide-y divide-border/40">
                  {order.items.map((item, idx) => (
                    <li key={idx} className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded bg-slate-100 flex items-center justify-center shrink-0">
                          <Package className="h-6 w-6 text-slate-400" />
                        </div>
                        <div>
                          <Link href={`/shop/${item.productId}`} className="font-medium hover:underline hover:text-primary transition-colors">
                            {item.productName}
                          </Link>
                          <div className="text-sm text-muted-foreground mt-1">
                            Qty: {item.quantity} × {item.unitPrice.toLocaleString()} kr.
                          </div>
                        </div>
                      </div>
                      <div className="font-medium sm:text-right pl-16 sm:pl-0">
                        {(item.quantity * item.unitPrice).toLocaleString()} kr.
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { useListOrders, useUpdateOrder } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import AdminLayout from "./AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  shipped: "bg-indigo-100 text-indigo-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const STATUS_OPTIONS = ["pending", "processing", "shipped", "completed", "cancelled"];

export default function AdminOrders() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: orders, isLoading } = useListOrders();
  const updateOrder = useUpdateOrder();
  const [search, setSearch] = useState("");

  const filtered = orders?.filter(o => {
    if (!search) return true;
    const q = search.toLowerCase();
    return o.customerName.toLowerCase().includes(q) || o.customerEmail.toLowerCase().includes(q);
  }) ?? [];

  const handleStatus = async (id: number, status: string) => {
    try {
      await updateOrder.mutateAsync({ id, data: { status } });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: "Updated", description: `Order status set to ${status}.` });
    } catch {
      toast({ title: "Error", description: "Failed to update order.", variant: "destructive" });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-5xl">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
          <p className="text-slate-500 text-sm mt-1">Manage shop orders</p>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <p className="p-6 text-sm text-slate-400">Loading orders…</p>
            ) : filtered.length === 0 ? (
              <p className="p-6 text-sm text-slate-400">No orders found.</p>
            ) : (
              <div className="divide-y">
                {filtered.map(o => (
                  <div key={o.id} className="p-4 flex items-start justify-between gap-4 flex-wrap">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">Order #{o.id}</p>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[o.status] ?? ""}`}>
                          {o.status}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">{o.customerName} · {o.customerEmail}</p>
                      <div className="text-xs text-slate-400">
                        {(o.items as Array<{ productName: string; quantity: number; unitPrice: number }>).map((item, i) => (
                          <span key={i}>{item.productName} ×{item.quantity}{i < o.items.length - 1 ? ", " : ""}</span>
                        ))}
                      </div>
                      <p className="text-xs text-slate-500">
  {localStorage.getItem("staff_role") === "owner" && `Total: ${o.totalAmount.toLocaleString()} kr. · `}
  {format(new Date(o.createdAt), "PPp")}
</p>
                    </div>
                    <div className="shrink-0 w-40">
                      <Select
                        value={o.status}
                        onValueChange={(val) => handleStatus(o.id, val)}
                        disabled={updateOrder.isPending}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map(s => (
                            <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

import { useState } from "react";
import { useListOrders, useUpdateOrder } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import AdminLayout from "./AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Truck, Store, CreditCard, Banknote, CheckCircle2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function adminHeaders() {
  const token = localStorage.getItem("admin_token") ?? "";
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  ready: "bg-blue-100 text-blue-800",
  out_for_delivery: "bg-indigo-100 text-indigo-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "ready", label: "Ready" },
  { value: "out_for_delivery", label: "Out for Delivery" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  unpaid: "bg-red-100 text-red-700",
  awaiting_online: "bg-amber-100 text-amber-700",
  paid: "bg-green-100 text-green-700",
};

export default function AdminOrders() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: orders, isLoading } = useListOrders();
  const updateOrder = useUpdateOrder();
  const [search, setSearch] = useState("");
  const [fulfillmentFilter, setFulfillmentFilter] = useState("all");
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const isOwner = localStorage.getItem("staff_role") === "owner";

  const filtered = (orders ?? []).filter(o => {
    const matchSearch = !search || o.customerName.toLowerCase().includes(search.toLowerCase()) || o.customerEmail.toLowerCase().includes(search.toLowerCase());
    const matchFulfillment = fulfillmentFilter === "all" || (o as any).fulfillmentType === fulfillmentFilter;
    return matchSearch && matchFulfillment;
  });

  const handleStatus = async (id: number, status: string) => {
    try {
      await updateOrder.mutateAsync({ id, data: { status } });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: "Updated" });
    } catch {
      toast({ title: "Error", description: "Failed to update order.", variant: "destructive" });
    }
  };

  const handleMarkPaid = async (id: number, paymentStatus: string) => {
    try {
      await fetch(`${basePath}/api/orders/${id}`, {
        method: "PATCH",
        headers: adminHeaders(),
        body: JSON.stringify({ paymentStatus }),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: paymentStatus === "paid" ? "Marked as paid" : "Payment status updated" });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await fetch(`${basePath}/api/orders/${id}`, {
        method: "DELETE",
        headers: adminHeaders(),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: "Order deleted" });
    } catch {
      toast({ title: "Error", description: "Failed to delete order.", variant: "destructive" });
    } finally {
      setConfirmDeleteId(null);
    }
  };
      <div className="space-y-6 max-w-5xl">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
          <p className="text-slate-500 text-sm mt-1">Manage shop orders</p>
        </div>

        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={fulfillmentFilter} onValueChange={setFulfillmentFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Orders</SelectItem>
              <SelectItem value="pickup">Pickup Only</SelectItem>
              <SelectItem value="delivery">Delivery Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <p className="p-6 text-sm text-slate-400">Loading orders…</p>
            ) : filtered.length === 0 ? (
              <p className="p-6 text-sm text-slate-400">No orders found.</p>
            ) : (
              <div className="divide-y">
                {filtered.map(o => {
                  const order = o as any;
                  const paymentStatus = order.paymentStatus ?? "unpaid";
                  return (
                    <div key={o.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm">Order #{o.id}</p>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[o.status] ?? "bg-slate-100 text-slate-700"}`}>
                              {STATUS_OPTIONS.find(s => s.value === o.status)?.label ?? o.status}
                            </span>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${PAYMENT_STATUS_COLORS[paymentStatus] ?? ""}`}>
                              {paymentStatus === "paid" ? <CheckCircle2 className="h-3 w-3" /> : null}
                              {paymentStatus === "paid" ? "Paid" : paymentStatus === "awaiting_online" ? "Awaiting Online" : "Unpaid"}
                            </span>
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 flex items-center gap-1">
                              {order.fulfillmentType === "delivery" ? <Truck className="h-3 w-3" /> : <Store className="h-3 w-3" />}
                              {order.fulfillmentType === "delivery" ? "Delivery" : "Pickup"}
                            </span>
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              {order.paymentMethod === "online" ? <CreditCard className="h-3 w-3" /> : <Banknote className="h-3 w-3" />}
                              {order.paymentMethod === "online" ? "Online" : "On Pickup"}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600">{o.customerName} · {o.customerEmail}{o.customerPhone ? ` · ${o.customerPhone}` : ""}</p>
                          {order.deliveryAddress && (
                            <p className="text-xs text-slate-500 flex items-center gap-1"><Truck className="h-3 w-3" /> {order.deliveryAddress}</p>
                          )}
                          <div className="text-xs text-slate-400">
                            {(o.items as Array<{ productName: string; quantity: number; unitPrice: number }>).map((item, i) => (
                              <span key={i}>{item.productName} ×{item.quantity}{i < o.items.length - 1 ? ", " : ""}</span>
                            ))}
                          </div>
                          <p className="text-xs text-slate-500">
                            {isOwner && `Total: ${o.totalAmount.toLocaleString()} kr.${order.deliveryFee > 0 ? ` (incl. ${order.deliveryFee} kr. delivery)` : ""} · `}
                            {format(new Date(o.createdAt), "PPp")}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 shrink-0">
                          <Select value={o.status} onValueChange={val => handleStatus(o.id, val)} disabled={updateOrder.isPending}>
                            <SelectTrigger className="h-8 text-xs w-44"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {STATUS_OPTIONS.map(s => (
                                <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select value={paymentStatus} onValueChange={val => handleMarkPaid(o.id, val)}>
                            <SelectTrigger className={`h-8 text-xs w-44 font-medium ${PAYMENT_STATUS_COLORS[paymentStatus] ?? ""}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unpaid" className="text-xs">Not Paid</SelectItem>
                              <SelectItem value="awaiting_online" className="text-xs">Awaiting Online</SelectItem>
                              <SelectItem value="paid" className="text-xs">Payment Completed</SelectItem>
                            </SelectContent>
                          </Select>
                          {isOwner && (
                            confirmDeleteId === o.id ? (
                              <div className="flex gap-1">
                                <Button size="sm" variant="destructive" className="h-8 text-xs flex-1" onClick={() => handleDelete(o.id)}>
                                  Confirm
                                </Button>
                                <Button size="sm" variant="outline" className="h-8 text-xs flex-1" onClick={() => setConfirmDeleteId(null)}>
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <Button size="sm" variant="outline" className="text-red-500 border-red-200 hover:bg-red-50 h-8 text-xs" onClick={() => setConfirmDeleteId(o.id)}>
                                <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete Order
                              </Button>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
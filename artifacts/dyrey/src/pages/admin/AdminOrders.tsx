import { useState } from "react";
import { useListOrders, useUpdateOrder } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import AdminLayout from "./AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Truck, Store, CreditCard, Banknote, CheckCircle2, Trash2, ChevronDown, ChevronUp, Package } from "lucide-react";
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
  const [expandedId, setExpandedId] = useState<number | null>(null);
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

  return (
    <AdminLayout>
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
                    <div key={o.id} className="divide-y">
                      {/* ── Summary row (always visible, clickable to expand) ── */}
                      <button
                        className="w-full text-left p-4 hover:bg-slate-50/70 transition-colors"
                        onClick={() => setExpandedId(expandedId === o.id ? null : o.id)}
                      >
                        <div className="flex items-center justify-between gap-4 flex-wrap">
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
                            <p className="text-sm text-slate-600">{o.customerName} · {o.customerEmail}{(o as any).customerPhone ? ` · ${(o as any).customerPhone}` : ""}</p>
                            <p className="text-xs text-slate-400">
                              {(o.items as Array<{ productName: string; quantity: number }>).map((item, i) => (
                                <span key={i}>{item.productName} ×{item.quantity}{i < o.items.length - 1 ? ", " : ""}</span>
                              ))}
                            </p>
                            <p className="text-xs text-slate-400">{format(new Date(o.createdAt), "PPp")}</p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            {isOwner && (
                              <p className="text-sm font-semibold text-slate-700">{o.totalAmount.toLocaleString()} kr.</p>
                            )}
                            {expandedId === o.id ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                          </div>
                        </div>
                      </button>

                      {/* ── Expanded details ── */}
                      {expandedId === o.id && (
                        <div className="bg-slate-50/60 p-4 space-y-4">

                          {/* Product list with images */}
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Items</p>
                            <div className="space-y-2">
                              {(o.items as Array<{ productId: number; productName: string; quantity: number; unitPrice: number; imageUrl?: string }>).map((item, i) => (
                                <div key={i} className="flex items-center gap-3 bg-white rounded-lg border border-slate-100 p-3">
                                  <div className="h-14 w-14 rounded-md border bg-slate-50 flex items-center justify-center shrink-0 overflow-hidden">
                                    {item.imageUrl
                                      ? <img src={item.imageUrl} alt={item.productName} className="h-full w-full object-contain p-1" />
                                      : <Package className="h-6 w-6 text-slate-300" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-800 truncate">{item.productName}</p>
                                    <p className="text-xs text-slate-500">{item.unitPrice.toLocaleString()} kr. × {item.quantity}</p>
                                  </div>
                                  <p className="text-sm font-semibold text-slate-700 shrink-0">{(item.unitPrice * item.quantity).toLocaleString()} kr.</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Totals */}
                          {isOwner && (
                            <div className="bg-white rounded-lg border border-slate-100 p-3 space-y-1 text-sm">
                              <div className="flex justify-between text-slate-500">
                                <span>Subtotal</span>
                                <span>{(o.totalAmount - (order.deliveryFee ?? 0)).toLocaleString()} kr.</span>
                              </div>
                              {order.deliveryFee > 0 && (
                                <div className="flex justify-between text-slate-500">
                                  <span>Delivery fee</span>
                                  <span>{order.deliveryFee.toLocaleString()} kr.</span>
                                </div>
                              )}
                              <div className="flex justify-between font-semibold text-slate-800 border-t pt-1 mt-1">
                                <span>Total</span>
                                <span>{o.totalAmount.toLocaleString()} kr.</span>
                              </div>
                            </div>
                          )}

                          {/* Customer & delivery info */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
                            <div className="bg-white rounded-lg border border-slate-100 p-3 space-y-1">
                              <p className="font-semibold text-slate-500 uppercase tracking-wide text-xs mb-1">Customer</p>
                              <p>{o.customerName}</p>
                              <p>{o.customerEmail}</p>
                              {(o as any).customerPhone && <p>{(o as any).customerPhone}</p>}
                            </div>
                            {order.deliveryAddress && (
                              <div className="bg-white rounded-lg border border-slate-100 p-3 space-y-1">
                                <p className="font-semibold text-slate-500 uppercase tracking-wide text-xs mb-1">Delivery Address</p>
                                <p>{order.deliveryAddress}</p>
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex flex-wrap gap-2 pt-1">
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
                                  <Button size="sm" variant="destructive" className="h-8 text-xs" onClick={() => handleDelete(o.id)}>Confirm Delete</Button>
                                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
                                </div>
                              ) : (
                                <Button size="sm" variant="outline" className="text-red-500 border-red-200 hover:bg-red-50 h-8 text-xs ml-auto" onClick={() => setConfirmDeleteId(o.id)}>
                                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete Order
                                </Button>
                              )
                            )}
                          </div>
                        </div>
                      )}
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
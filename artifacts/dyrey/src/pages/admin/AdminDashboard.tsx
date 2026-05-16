import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useListAppointments, useGetAppointmentsSummary } from "@workspace/api-client-react";
import {
  startOfWeek, addDays, addWeeks, format, isSameDay, parseISO,
} from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import AdminLayout from "./AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CalendarDays, Clock, CheckCircle2, XCircle, Users, ChevronLeft, ChevronRight,
  TrendingUp, ShoppingBag, Pencil, Check,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { StaffNotepad } from "@/components/StaffNotepad";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const TIME_SLOTS = ["08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00"];
const PIE_COLORS: Record<string, string> = {
  pending: "#f59e0b", confirmed: "#3b82f6", completed: "#22c55e", cancelled: "#ef4444",
};
const PRIMARY = "hsl(205,70%,55%)";

interface Analytics {
  topServices: { name: string; count: number }[];
  topProducts: { name: string; count: number; revenue: number }[];
  statusCount: Record<string, number>;
  totalRevenue: number;
  orderCount: number;
  appointmentCount: number;
}

function useAdminAnalytics() {
  return useQuery<Analytics>({
    queryKey: ["admin", "analytics"],
    queryFn: async () => {
      const token = localStorage.getItem("admin_token") ?? "";
      const res = await fetch(`${BASE}/api/admin/analytics`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    staleTime: 60_000,
  });
}

interface CapacityRow { date: string; maxConcurrent: number }

function useScheduleCapacity() {
  return useQuery<CapacityRow[]>({
    queryKey: ["admin", "schedule-capacity"],
    queryFn: async () => {
      const token = localStorage.getItem("admin_token") ?? "";
      const res = await fetch(`${BASE}/api/admin/schedule-capacity`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });
}

function CapacityEditor({ date, current, onSaved }: { date: string; current: number; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(current);
  const { toast } = useToast();

  const save = async () => {
    const token = localStorage.getItem("admin_token") ?? "";
    await fetch(`${BASE}/api/admin/schedule-capacity`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ date, maxConcurrent: value }),
    });
    toast({ title: "Capacity saved", description: `${date}: max ${value} per slot` });
    onSaved();
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1 justify-center mt-1">
        <Input type="number" min={1} max={20} value={value} onChange={e => setValue(Number(e.target.value))}
          className="h-6 w-12 text-xs text-center px-1" autoFocus />
        <button onClick={save} className="text-green-600 hover:text-green-700">
          <Check className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <button onClick={() => { setValue(current); setEditing(true); }}
      className="flex items-center gap-1 text-xs text-slate-400 hover:text-primary mt-1 mx-auto" title="Set max concurrent bookings">
      <Users className="h-3 w-3" />
      <span>max {current}</span>
      <Pencil className="h-2.5 w-2.5" />
    </button>
  );
}

export default function AdminDashboard() {
  const [weekOffset, setWeekOffset] = useState(0);
  const queryClient = useQueryClient();

  const { data: summary, isLoading: loadingSummary } = useGetAppointmentsSummary();
  const { data: allAppointments } = useListAppointments({});
  const { data: analytics } = useAdminAnalytics();
  const { data: capacityRows, refetch: refetchCapacity } = useScheduleCapacity();

  const weekStart = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const capacityMap = Object.fromEntries((capacityRows ?? []).map(r => [r.date, r.maxConcurrent]));
  const pieData = Object.entries(analytics?.statusCount ?? {}).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
  const shortName = (name: string) => name.length > 20 ? name.slice(0, 18) + "…" : name;
  const STATUS_LABELS: Record<string, string> = {
    pending: "Pending", confirmed: "Confirmed", completed: "Completed", cancelled: "Cancelled",
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Clinic overview and schedule</p>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Pending", value: summary?.pending, color: "bg-yellow-100", icon: <Clock className="h-4 w-4 text-yellow-600" /> },
            { label: "Confirmed", value: summary?.confirmed, color: "bg-blue-100", icon: <CheckCircle2 className="h-4 w-4 text-blue-600" /> },
            { label: "Today", value: summary?.todayCount, color: "bg-primary/10", icon: <CalendarDays className="h-4 w-4 text-primary" /> },
            { label: "Completed", value: summary?.completed, color: "bg-green-100", icon: <CheckCircle2 className="h-4 w-4 text-green-600" /> },
            { label: "Cancelled", value: summary?.cancelled, color: "bg-red-100", icon: <XCircle className="h-4 w-4 text-red-500" /> },
            { label: "Total", value: summary?.total, color: "bg-slate-100", icon: <Users className="h-4 w-4 text-slate-600" /> },
          ].map(({ label, value, color, icon }) => (
            <Card key={label}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2">
                  <div className={`h-8 w-8 ${color} rounded-lg flex items-center justify-center shrink-0`}>{icon}</div>
                  <div>
                    <p className="text-xl font-bold leading-none">{loadingSummary ? "—" : (value ?? 0)}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Analytics + Notepad ── */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Charts (left 3/4) */}
          <div className="lg:col-span-3 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Bar chart */}
              <div className="lg:col-span-2">
                <Card className="h-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-slate-700">Activity Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="services">
                      <TabsList className="mb-4 h-8">
                        <TabsTrigger value="services" className="text-xs">Top Services</TabsTrigger>
                        <TabsTrigger value="products" className="text-xs">Top Products</TabsTrigger>
                      </TabsList>
                      <TabsContent value="services">
                        {!analytics?.topServices?.length ? (
                          <p className="text-sm text-slate-400 py-8 text-center">No appointment data yet</p>
                        ) : (
                          <ResponsiveContainer width="100%" height={200}>
                            <BarChart layout="vertical" data={analytics.topServices.map(s => ({ ...s, name: shortName(s.name) }))} margin={{ left: 8, right: 16 }}>
                              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                              <Tooltip formatter={(v) => [`${v} bookings`, "Count"]} />
                              <Bar dataKey="count" fill={PRIMARY} radius={[0, 4, 4, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </TabsContent>
                      <TabsContent value="products">
                        {!analytics?.topProducts?.length ? (
                          <p className="text-sm text-slate-400 py-8 text-center">No sales data yet</p>
                        ) : (
                          <ResponsiveContainer width="100%" height={200}>
                            <BarChart layout="vertical" data={analytics.topProducts.map(p => ({ ...p, name: shortName(p.name) }))} margin={{ left: 8, right: 16 }}>
                              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                              <Tooltip formatter={(v, name) => [name === "count" ? `${v} sold` : `${Number(v).toLocaleString()} kr.`, name === "count" ? "Units" : "Revenue"]} />
                              <Bar dataKey="count" fill={PRIMARY} radius={[0, 4, 4, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>

              {/* Right column: pie + revenue */}
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-1">
                    <CardTitle className="text-sm font-semibold text-slate-700">Appointment Status</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center">
                    {pieData.length === 0 ? (
                      <p className="text-sm text-slate-400 py-6">No data yet</p>
                    ) : (
                      <PieChart width={160} height={160}>
                        <Pie data={pieData} cx={80} cy={80} innerRadius={44} outerRadius={70} dataKey="value" paddingAngle={2}>
                          {pieData.map((entry, i) => (
                            <Cell key={i} fill={PIE_COLORS[entry.name] ?? "#94a3b8"} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v, name) => [v, STATUS_LABELS[String(name)] ?? name]} />
                      </PieChart>
                    )}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1 w-full">
                      {Object.entries(PIE_COLORS).map(([status, color]) => (
                        <div key={status} className="flex items-center gap-1.5 text-xs text-slate-600">
                          <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: color }} />
                          <span>{STATUS_LABELS[status]}: {analytics?.statusCount?.[status] ?? 0}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
                        <TrendingUp className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-lg font-bold leading-none">{analytics ? `${Math.round(analytics.totalRevenue).toLocaleString()} kr.` : "—"}</p>
                        <p className="text-xs text-slate-500 mt-0.5">Total Revenue</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 bg-violet-100 rounded-lg flex items-center justify-center shrink-0">
                        <ShoppingBag className="h-4 w-4 text-violet-600" />
                      </div>
                      <div>
                        <p className="text-lg font-bold leading-none">{analytics?.orderCount ?? "—"}</p>
                        <p className="text-xs text-slate-500 mt-0.5">Total Orders</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Notepad (right 1/4) */}
          <div className="hidden lg:flex flex-col" style={{ minHeight: "320px" }}>
            <StaffNotepad compact />
          </div>
        </div>

        {/* ── Weekly Schedule Calendar ── */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-700">Weekly Schedule</CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">
                  {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d, yyyy")}
                </span>
                <div className="flex gap-1">
                  <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setWeekOffset(w => w - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => setWeekOffset(0)}>Today</Button>
                  <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setWeekOffset(w => w + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-1">Click the pencil icon on each day to set max concurrent bookings.</p>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs border-collapse min-w-[640px]">
              <thead>
                <tr>
                  <th className="w-16 p-2 text-left text-slate-400 font-normal border-b border-r bg-slate-50/50">Time</th>
                  {weekDays.map(day => {
                    const dateStr = format(day, "yyyy-MM-dd");
                    const cap = capacityMap[dateStr] ?? 2;
                    const isToday = isSameDay(day, new Date());
                    return (
                      <th key={dateStr} className={`p-2 text-center border-b border-r font-normal ${isToday ? "bg-primary/5" : "bg-slate-50/50"}`}>
                        <div className={`font-semibold ${isToday ? "text-primary" : "text-slate-700"}`}>{format(day, "EEE")}</div>
                        <div className={`text-slate-500 ${isToday ? "font-bold text-primary" : ""}`}>{format(day, "d MMM")}</div>
                        <CapacityEditor date={dateStr} current={cap} onSaved={() => queryClient.invalidateQueries({ queryKey: ["admin", "schedule-capacity"] })} />
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {TIME_SLOTS.map(slot => (
                  <tr key={slot} className="border-b last:border-b-0">
                    <td className="w-16 p-2 text-slate-400 font-mono border-r align-top bg-slate-50/30">{slot}</td>
                    {weekDays.map(day => {
                      const dateStr = format(day, "yyyy-MM-dd");
                      const cap = capacityMap[dateStr] ?? 2;
                      const aptsInSlot = (allAppointments ?? []).filter(a =>
                        a.date === dateStr && a.time === slot && a.status !== "cancelled"
                      );
                      const isOver = aptsInSlot.length > 0 && aptsInSlot.length >= cap;
                      const isToday = isSameDay(day, new Date());
                      return (
                        <td key={dateStr} className={`p-1.5 border-r align-top min-w-[90px] ${isToday ? "bg-primary/5" : ""} ${isOver ? "bg-red-50" : ""}`}>
                          {aptsInSlot.length > 0 && (
                            <div className="space-y-1">
                              {aptsInSlot.map(a => (
                                <div key={a.id} title={`${a.ownerName} — ${a.petName} (${a.serviceName})`}
                                  className={`px-1.5 py-0.5 rounded text-xs truncate max-w-full leading-snug ${
                                    a.status === "confirmed" ? "bg-blue-100 text-blue-800"
                                    : a.status === "completed" ? "bg-green-100 text-green-800"
                                    : "bg-amber-100 text-amber-800"
                                  }`}>
                                  {a.petName}
                                </div>
                              ))}
                              {isOver && <div className="text-red-500 font-semibold">{aptsInSlot.length}/{cap} ⚠</div>}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

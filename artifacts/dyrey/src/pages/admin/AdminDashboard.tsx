import { useListAppointments, useGetAppointmentsSummary } from "@workspace/api-client-react";
import AdminLayout from "./AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Clock, CheckCircle2, XCircle, Users } from "lucide-react";
import { format } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function AdminDashboard() {
  const { data: summary, isLoading: loadingSummary } = useGetAppointmentsSummary();
  const { data: appointments, isLoading: loadingAppointments } = useListAppointments({ status: "pending" });

  const today = format(new Date(), "yyyy-MM-dd");
  const todayAppointments = appointments?.filter(a => a.date === today) ?? [];

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-5xl">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Overview of clinic activity</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{loadingSummary ? "—" : summary?.pending ?? 0}</p>
                  <p className="text-xs text-slate-500">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{loadingSummary ? "—" : summary?.confirmed ?? 0}</p>
                  <p className="text-xs text-slate-500">Confirmed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <CalendarDays className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{loadingSummary ? "—" : summary?.todayCount ?? 0}</p>
                  <p className="text-xs text-slate-500">Today</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{loadingSummary ? "—" : summary?.completed ?? 0}</p>
                  <p className="text-xs text-slate-500">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{loadingSummary ? "—" : summary?.cancelled ?? 0}</p>
                  <p className="text-xs text-slate-500">Cancelled</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-slate-100 rounded-lg flex items-center justify-center">
                  <Users className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{loadingSummary ? "—" : summary?.total ?? 0}</p>
                  <p className="text-xs text-slate-500">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending appointments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingAppointments ? (
              <p className="text-sm text-slate-400">Loading…</p>
            ) : appointments?.length === 0 ? (
              <p className="text-sm text-slate-400">No pending appointments.</p>
            ) : (
              <div className="divide-y">
                {appointments?.slice(0, 8).map(a => (
                  <div key={a.id} className="py-3 flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-sm">{a.ownerName} — {a.petName} ({a.petType})</p>
                      <p className="text-xs text-slate-500">{a.serviceName} · {a.date} at {a.time}</p>
                      {a.customDescription && (
                        <p className="text-xs text-slate-400 mt-0.5 italic">"{a.customDescription}"</p>
                      )}
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${STATUS_COLORS[a.status] ?? ""}`}>
                      {a.status}
                    </span>
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

import { useState } from "react";
import { useListAppointments, useUpdateAppointment, useCancelAppointment } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import AdminLayout from "./AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { CheckCircle2, XCircle, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  confirmed: "bg-blue-100 text-blue-800 border-blue-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

export default function AdminAppointments() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: appointments, isLoading } = useListAppointments(
    statusFilter !== "all" ? { status: statusFilter } : {}
  );
  const updateAppointment = useUpdateAppointment();
  const cancelAppointment = useCancelAppointment();

  const filtered = appointments?.filter(a => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.ownerName.toLowerCase().includes(q) ||
      a.petName.toLowerCase().includes(q) ||
      a.ownerEmail.toLowerCase().includes(q) ||
      a.serviceName.toLowerCase().includes(q)
    );
  }) ?? [];

  const handleStatus = async (id: number, status: string) => {
    try {
      await updateAppointment.mutateAsync({ id, data: { status } });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({ title: "Updated", description: `Appointment marked as ${status}.` });
    } catch {
      toast({ title: "Error", description: "Failed to update appointment.", variant: "destructive" });
    }
  };

  const handleCancel = async (id: number) => {
    try {
      await cancelAppointment.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({ title: "Cancelled", description: "Appointment cancelled." });
    } catch {
      toast({ title: "Error", description: "Failed to cancel appointment.", variant: "destructive" });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-5xl">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Appointments</h1>
          <p className="text-slate-500 text-sm mt-1">Manage and update all bookings</p>
        </div>

        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by name, pet, email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <p className="p-6 text-sm text-slate-400">Loading appointments…</p>
            ) : filtered.length === 0 ? (
              <p className="p-6 text-sm text-slate-400">No appointments found.</p>
            ) : (
              <div className="divide-y">
                {filtered.map(a => (
                  <div key={a.id} className="p-4 flex items-start justify-between gap-4 flex-wrap">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{a.ownerName}</p>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_COLORS[a.status] ?? ""}`}>
                          {a.status}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">
                        {a.petName} ({a.petType}) · {a.serviceName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {a.date} at {a.time} · {a.ownerEmail} · {a.ownerPhone}
                      </p>
                      {a.customDescription && (
                        <p className="text-xs text-slate-500 italic">Reason: {a.customDescription}</p>
                      )}
                      {a.notes && (
                        <p className="text-xs text-slate-400">Notes: {a.notes}</p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {a.status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-blue-600 border-blue-200 hover:bg-blue-50"
                          onClick={() => handleStatus(a.id, "confirmed")}
                          disabled={updateAppointment.isPending}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          Confirm
                        </Button>
                      )}
                      {a.status === "confirmed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 border-green-200 hover:bg-green-50"
                          onClick={() => handleStatus(a.id, "completed")}
                          disabled={updateAppointment.isPending}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          Complete
                        </Button>
                      )}
                      {a.status !== "cancelled" && a.status !== "completed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => handleCancel(a.id)}
                          disabled={cancelAppointment.isPending}
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" />
                          Cancel
                        </Button>
                      )}
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

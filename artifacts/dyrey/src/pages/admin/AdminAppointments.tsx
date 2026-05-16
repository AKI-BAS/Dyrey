import { useState, useEffect } from "react";
import {
  useListAppointments,
  useUpdateAppointment,
  useCancelAppointment,
  getListAppointmentsQueryKey,
} from "@workspace/api-client-react";
import type { Appointment } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import AdminLayout from "./AdminLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2, XCircle, Search, Phone, Mail, CalendarDays, Clock,
  MessageSquare, PawPrint, AlertCircle, Loader2, Save,
} from "lucide-react";
import { StaffNotepad } from "@/components/StaffNotepad";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, formatDistanceToNow } from "date-fns";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function adminHeaders() {
  const token = localStorage.getItem("admin_token") ?? "";
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  confirmed: "bg-blue-100 text-blue-800 border-blue-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

// ---------------------------------------------------------------------------
// Appointment Detail Dialog
// ---------------------------------------------------------------------------

function AppointmentDetailDialog({
  appointment,
  open,
  onClose,
  onConfirm,
  onComplete,
  onCancel,
  onNotesSaved,
  loading,
}: {
  appointment: Appointment | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (id: number) => void;
  onComplete: (id: number) => void;
  onCancel: (id: number) => void;
  onNotesSaved: () => void;
  loading: boolean;
}) {
  const { toast } = useToast();
  const updateAppointment = useUpdateAppointment();
  const [staffNotes, setStaffNotes] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);

  useEffect(() => {
    if (appointment) setStaffNotes(appointment.notes ?? "");
  }, [appointment]);

  if (!appointment) return null;
  const a = appointment;

  const handleSaveNotes = async () => {
    setNotesSaving(true);
    try {
      await updateAppointment.mutateAsync({ id: a.id, data: { notes: staffNotes } });
      onNotesSaved();
      toast({ title: "Notes saved" });
    } catch {
      toast({ title: "Error", description: "Failed to save notes.", variant: "destructive" });
    } finally {
      setNotesSaving(false);
    }
  };

  const notesChanged = staffNotes !== (a.notes ?? "");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <DialogTitle className="text-xl">
              {a.petName}
              <span className="text-muted-foreground font-normal text-base ml-2">({a.petType})</span>
            </DialogTitle>
            <Badge variant="outline" className={`shrink-0 font-medium text-sm px-3 py-1 ${STATUS_COLORS[a.status] ?? ""}`}>
              {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                <CalendarDays className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Date</p>
                <p className="font-semibold text-sm">{format(parseISO(a.date), "EEEE, MMMM d, yyyy")}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                <Clock className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Time</p>
                <p className="font-semibold text-sm">{a.time}</p>
              </div>
            </div>
          </div>

          {/* Service */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Service</p>
            <p className="font-medium text-slate-800">{a.serviceName}</p>
          </div>

          <Separator />

          {/* Pet & Owner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <PawPrint className="h-3 w-3" /> Pet
              </p>
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Name</span>
                  <span className="font-medium">{a.petName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Type</span>
                  <span className="font-medium">{a.petType}</span>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Owner</p>
              <div className="space-y-2">
                <p className="font-medium text-sm">{a.ownerName}</p>
                <a href={`mailto:${a.ownerEmail}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
                  <Mail className="h-3.5 w-3.5 shrink-0" /> {a.ownerEmail}
                </a>
                {a.ownerPhone && (
                  <a href={`tel:${a.ownerPhone}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
                    <Phone className="h-3.5 w-3.5 shrink-0" /> {a.ownerPhone}
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Customer message / reason */}
          {a.customDescription && (
            <>
              <Separator />
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">Customer's Reason — Review before appointment</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-sm text-slate-800 leading-relaxed">"{a.customDescription}"</p>
                </div>
                <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                  <Phone className="h-3 w-3" /> Consider calling the owner for more information before the visit.
                </p>
              </div>
            </>
          )}

          {/* Staff Notes — editable */}
          <Separator />
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <MessageSquare className="h-3 w-3" /> Staff Notes
              </p>
              {notesChanged && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1.5 text-primary border-primary/30 hover:bg-primary/5"
                  onClick={handleSaveNotes}
                  disabled={notesSaving}
                >
                  {notesSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  Save notes
                </Button>
              )}
              {!notesChanged && a.notes && (
                <span className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Saved
                </span>
              )}
            </div>
            <Textarea
              value={staffNotes}
              onChange={e => setStaffNotes(e.target.value)}
              placeholder="Add internal notes about this appointment — treatment plan, observations, follow-up required, medication given…"
              rows={4}
              className="text-sm resize-none bg-slate-50 border-slate-200 focus:bg-white"
            />
            <p className="text-xs text-slate-400 mt-1.5">Only visible to staff. Not shown to the customer.</p>
          </div>
        </div>

        <DialogFooter className="gap-2 mt-4 flex-wrap">
          <Button variant="outline" onClick={onClose} className="mr-auto">Close</Button>
          {a.status !== "cancelled" && a.status !== "completed" && (
            <Button
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => { onCancel(a.id); onClose(); }}
              disabled={loading}
            >
              <XCircle className="h-4 w-4 mr-1.5" /> Cancel
            </Button>
          )}
          {a.status === "pending" && (
            <Button
              variant="outline"
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
              onClick={() => { onConfirm(a.id); onClose(); }}
              disabled={loading}
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" /> Confirm
            </Button>
          )}
          {a.status === "confirmed" && (
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => { onComplete(a.id); onClose(); }}
              disabled={loading}
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" /> Mark Completed
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function AdminAppointments() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Appointment | null>(null);
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

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey() });

  const handleStatus = async (id: number, status: string) => {
    try {
      await updateAppointment.mutateAsync({ id, data: { status } });
      invalidate();
      toast({ title: "Updated", description: `Appointment marked as ${status}.` });
    } catch {
      toast({ title: "Error", description: "Failed to update appointment.", variant: "destructive" });
    }
  };

  const handleCancel = async (id: number) => {
    try {
      await cancelAppointment.mutateAsync({ id });
      invalidate();
      toast({ title: "Cancelled", description: "Appointment cancelled." });
    } catch {
      toast({ title: "Error", description: "Failed to cancel appointment.", variant: "destructive" });
    }
  };

  const loading = updateAppointment.isPending || cancelAppointment.isPending;

  return (
    <AdminLayout>
      <div className="flex gap-6 items-start">
        {/* ---- Left: Appointments list ---- */}
        <div className="flex-1 min-w-0 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Appointments</h1>
            <p className="text-slate-500 text-sm mt-1">Click any row to view details and add notes</p>
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
                    <div
                      key={a.id}
                      className="p-4 flex items-start justify-between gap-4 flex-wrap cursor-pointer hover:bg-slate-50 transition-colors"
                      onClick={() => setSelected(a)}
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm">{a.ownerName}</p>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_COLORS[a.status] ?? ""}`}>
                            {a.status}
                          </span>
                          {a.customDescription && (
                            <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <AlertCircle className="h-2.5 w-2.5" /> Has message
                            </span>
                          )}
                          {a.notes && (
                            <span className="text-xs bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <MessageSquare className="h-2.5 w-2.5" /> Has notes
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600">
                          {a.petName} ({a.petType}) · {a.serviceName}
                        </p>
                        <p className="text-xs text-slate-500">
                          {a.date} at {a.time} · {a.ownerEmail}
                          {a.ownerPhone ? ` · ${a.ownerPhone}` : ""}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                        {a.status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-blue-600 border-blue-200 hover:bg-blue-50"
                            onClick={() => handleStatus(a.id, "confirmed")}
                            disabled={loading}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Confirm
                          </Button>
                        )}
                        {a.status === "confirmed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 border-green-200 hover:bg-green-50"
                            onClick={() => handleStatus(a.id, "completed")}
                            disabled={loading}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Complete
                          </Button>
                        )}
                        {a.status !== "cancelled" && a.status !== "completed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => handleCancel(a.id)}
                            disabled={loading}
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1" /> Cancel
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

        {/* ---- Right: Staff Notepad ---- */}
        <div className="hidden lg:flex flex-col w-72 xl:w-80 shrink-0 sticky top-8" style={{ maxHeight: "calc(100vh - 4rem)" }}>
          <StaffNotepad />
        </div>
      </div>

      <AppointmentDetailDialog
        appointment={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        onConfirm={id => handleStatus(id, "confirmed")}
        onComplete={id => handleStatus(id, "completed")}
        onCancel={handleCancel}
        onNotesSaved={invalidate}
        loading={loading}
      />
    </AdminLayout>
  );
}

import { useState, useEffect } from "react";
import AdminLayout from "./AdminLayout";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search, PawPrint, Phone, Mail, CalendarDays, ChevronDown, ChevronUp, Plus, Save, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";

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

interface Appointment {
  id: number;
  ownerName: string;
  ownerEmail: string;
  ownerPhone?: string;
  petName: string;
  petType: string;
  serviceName: string;
  date: string;
  time: string;
  status: string;
  notes?: string;
  customDescription?: string;
  createdAt: string;
}

interface PatientGroup {
  ownerName: string;
  ownerEmail: string;
  ownerPhone?: string;
  pets: {
    petName: string;
    petType: string;
    appointments: Appointment[];
  }[];
}

function groupByOwnerAndPet(appointments: Appointment[]): PatientGroup[] {
  const ownerMap = new Map<string, PatientGroup>();
  for (const a of appointments) {
    const key = a.ownerEmail.toLowerCase();
    if (!ownerMap.has(key)) {
      ownerMap.set(key, { ownerName: a.ownerName, ownerEmail: a.ownerEmail, ownerPhone: a.ownerPhone, pets: [] });
    }
    const owner = ownerMap.get(key)!;
    const petKey = a.petName.toLowerCase() + "|" + a.petType.toLowerCase();
    let pet = owner.pets.find(p => (p.petName + "|" + p.petType).toLowerCase() === petKey);
    if (!pet) { pet = { petName: a.petName, petType: a.petType, appointments: [] }; owner.pets.push(pet); }
    pet.appointments.push(a);
  }
  return Array.from(ownerMap.values());
}

function AddNoteDialog({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (note: string) => Promise<void> }) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Patient History / Note</DialogTitle></DialogHeader>
        <Textarea value={note} onChange={e => setNote(e.target.value)} rows={5} placeholder="Diagnosis, treatment, medication, follow-up notes…" className="resize-none" />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!note.trim() || saving} onClick={async () => { setSaving(true); await onSave(note); setSaving(false); setNote(""); onClose(); }}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />} Save Note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PetCard({ pet, ownerEmail }: { pet: PatientGroup["pets"][0]; ownerEmail: string }) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [addNoteOpen, setAddNoteOpen] = useState(false);
  const upcoming = pet.appointments.filter(a => a.status === "pending" || a.status === "confirmed")
    .sort((a, b) => a.date.localeCompare(b.date));
  const past = pet.appointments.filter(a => a.status === "completed" || a.status === "cancelled")
    .sort((a, b) => b.date.localeCompare(a.date));

  const handleSaveNote = async (note: string) => {
    // Save note to the most recent appointment for this pet, or as a standalone staff note
    try {
      await fetch(`${basePath}/api/admin/notes`, {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify({ content: `[${pet.petName} / ${ownerEmail}] ${note}`, importance: "medium" }),
      });
      toast({ title: "Note saved", description: `Added to ${pet.petName}'s record.` });
    } catch {
      toast({ title: "Error", description: "Failed to save note.", variant: "destructive" });
    }
  };

  return (
    <div className="border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between p-4 bg-slate-50 cursor-pointer" onClick={() => setExpanded(e => !e)}>
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-primary/10 rounded-lg flex items-center justify-center">
            <PawPrint className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm">{pet.petName}</p>
            <p className="text-xs text-slate-500">{pet.petType}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">{pet.appointments.length} appointment{pet.appointments.length !== 1 ? "s" : ""}</span>
          {expanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </div>
      </div>

      {expanded && (
        <div className="p-4 space-y-4">
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={() => setAddNoteOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add History / Note
            </Button>
          </div>

          {upcoming.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Upcoming</p>
              <div className="space-y-2">
                {upcoming.map(a => (
                  <div key={a.id} className="flex items-center justify-between text-sm p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <div>
                      <p className="font-medium">{a.serviceName}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <CalendarDays className="h-3 w-3" /> {a.date} at {a.time}
                      </p>
                      {a.notes && <p className="text-xs text-slate-600 mt-1 italic">"{a.notes}"</p>}
                    </div>
                    <Badge variant="outline" className={`text-xs ${STATUS_COLORS[a.status]}`}>{a.status}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Previous Appointments</p>
              <div className="space-y-2">
                {past.map(a => (
                  <div key={a.id} className="flex items-center justify-between text-sm p-3 bg-slate-50 rounded-lg border">
                    <div>
                      <p className="font-medium">{a.serviceName}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <CalendarDays className="h-3 w-3" /> {a.date} at {a.time}
                      </p>
                      {a.notes && <p className="text-xs text-slate-600 mt-1 italic">"{a.notes}"</p>}
                      {a.customDescription && <p className="text-xs text-amber-700 mt-1">Reason: {a.customDescription}</p>}
                    </div>
                    <Badge variant="outline" className={`text-xs ${STATUS_COLORS[a.status]}`}>{a.status}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      <AddNoteDialog open={addNoteOpen} onClose={() => setAddNoteOpen(false)} onSave={handleSaveNote} />
    </div>
  );
}

export default function AdminPatients() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch(`${basePath}/api/appointments`, { headers: adminHeaders() })
      .then(r => r.json()).then(setAppointments).finally(() => setLoading(false));
  }, []);

  const groups = groupByOwnerAndPet(appointments);

  const filtered = groups.filter(g => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      g.ownerName.toLowerCase().includes(q) ||
      g.ownerEmail.toLowerCase().includes(q) ||
      (g.ownerPhone ?? "").includes(q) ||
      g.pets.some(p => p.petName.toLowerCase().includes(q) || p.petType.toLowerCase().includes(q))
    );
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Patients & Owners</h1>
          <p className="text-slate-500 text-sm mt-1">Search by owner name, animal name, or breed</p>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Search owner, pet name, breed…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        {loading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-slate-400">No patients found.</p>
        ) : (
          <div className="space-y-4">
            {filtered.map(owner => (
              <Card key={owner.ownerEmail}>
                <CardContent className="p-0">
                  <div className="p-4 border-b bg-white">
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <div>
                        <p className="font-semibold">{owner.ownerName}</p>
                        <div className="flex flex-wrap gap-3 mt-1">
                          <a href={`mailto:${owner.ownerEmail}`} className="text-xs text-primary hover:underline flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {owner.ownerEmail}
                          </a>
                          {owner.ownerPhone && (
                            <a href={`tel:${owner.ownerPhone}`} className="text-xs text-primary hover:underline flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {owner.ownerPhone}
                            </a>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-slate-400">{owner.pets.length} pet{owner.pets.length !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    {owner.pets.map(pet => (
                      <PetCard key={pet.petName + pet.petType} pet={pet} ownerEmail={owner.ownerEmail} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
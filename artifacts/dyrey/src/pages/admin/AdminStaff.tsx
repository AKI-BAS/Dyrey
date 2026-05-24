import { useState, useEffect } from "react";
import AdminLayout from "./AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, User, Loader2, LogIn } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function adminHeaders() {
  const token = localStorage.getItem("admin_token") ?? "";
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

interface StaffMember { id: number; name: string; role: string; createdAt: string; }

export default function AdminStaff() {
  const [, setLocation] = useLocation();
  const role = localStorage.getItem("staff_role") ?? "staff";
  if (role !== "owner") {
    setLocation("/admin/dashboard");
    return null;
  }
  const { toast } = useToast();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
const [newRole, setNewRole] = useState<"staff" | "owner">("staff");
const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const currentStaff = localStorage.getItem("staff_name");

  const load = () => {
    setLoading(true);
    fetch(`${basePath}/api/admin/staff`, { headers: adminHeaders() })
      .then(r => r.json()).then(setStaff).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`${basePath}/api/admin/staff`, {
        method: "POST", headers: adminHeaders(),
        body: JSON.stringify({ name: newName.trim(), role: newRole }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Staff member added" });
      setNewName(""); setAddOpen(false); load();
    } catch {
      toast({ title: "Error", description: "Failed to add staff member.", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    try {
      await fetch(`${basePath}/api/admin/staff/${id}`, { method: "DELETE", headers: adminHeaders() });
      toast({ title: "Removed" });
      load();
    } catch {
      toast({ title: "Error", description: "Failed to remove.", variant: "destructive" });
    } finally { setDeleteId(null); }
  };

  const handleSetActive = (name: string) => {
    localStorage.setItem("staff_name", name);
    toast({ title: `Now signed in as ${name}` });
    window.location.reload();
  };

  return (
    <AdminLayout>
      <div className="max-w-xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Staff</h1>
            <p className="text-slate-500 text-sm mt-1">Manage staff members. Click "Sign in as" to set your active name.</p>
          </div>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Staff
          </Button>
        </div>

        {currentStaff && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-sm">
            Currently signed in as <strong>{currentStaff}</strong>
          </div>
        )}

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Staff Members</CardTitle></CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <p className="p-4 text-sm text-slate-400">Loading…</p>
            ) : staff.length === 0 ? (
              <p className="p-4 text-sm text-slate-400">No staff members yet. Add one above.</p>
            ) : (
              <div className="divide-y">
                {staff.map(s => (
                  <div key={s.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                        <User className="h-4 w-4 text-slate-500" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{s.name}</p>
<p className="text-xs text-slate-400">{s.role === "owner" ? "Owner" : "Staff"}{s.name === currentStaff ? " · Active" : ""}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {s.name !== currentStaff && (
                        <Button size="sm" variant="outline" onClick={() => handleSetActive(s.name)}>
                          <LogIn className="h-3.5 w-3.5 mr-1" /> Sign in as
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => setDeleteId(s.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Staff Member</DialogTitle></DialogHeader>
         <Input placeholder="Full name" value={newName} onChange={e => setNewName(e.target.value)}
  onKeyDown={e => e.key === "Enter" && handleAdd()} />
<div className="flex gap-2 mt-2">
  <Button size="sm" variant={newRole === "staff" ? "default" : "outline"} onClick={() => setNewRole("staff")}>Staff</Button>
  <Button size="sm" variant={newRole === "owner" ? "default" : "outline"} onClick={() => setNewRole("owner")}>Owner</Button>
</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button disabled={!newName.trim() || saving} onClick={handleAdd}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete */}
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Remove staff member?</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-500">This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>Remove</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
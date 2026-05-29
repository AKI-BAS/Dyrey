import { useState, useEffect, useRef } from "react";
import AdminLayout from "./AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, User, Loader2, LogIn, Pencil, Upload, ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function adminHeaders() {
  const token = localStorage.getItem("admin_token") ?? "";
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

function uploadHeaders() {
  const token = localStorage.getItem("admin_token") ?? "";
  return { Authorization: `Bearer ${token}` };
}

interface StaffMember {
  id: number;
  name: string;
  role: string;
  bio: string | null;
  photoUrl: string | null;
  createdAt: string;
}

async function uploadPhoto(file: File): Promise<string> {
  const res = await fetch(`${basePath}/api/storage/uploads/request-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...uploadHeaders() },
    body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
  });
  if (!res.ok) throw new Error("Failed to get upload URL");
  const { uploadURL, objectPath } = await res.json();
  const put = await fetch(uploadURL, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
  if (!put.ok) throw new Error("Upload failed");
  return `${basePath}/api/storage/objects${objectPath}`;
}

function EditStaffDialog({
  member,
  open,
  onClose,
  onSaved,
}: {
  member: StaffMember;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [bio, setBio] = useState(member.bio ?? "");
  const [photoUrl, setPhotoUrl] = useState(member.photoUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setBio(member.bio ?? "");
    setPhotoUrl(member.photoUrl ?? "");
  }, [member, open]);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadPhoto(file);
      setPhotoUrl(url);
      toast({ title: "Photo uploaded" });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`${basePath}/api/admin/staff/${member.id}`, {
        method: "PATCH",
        headers: adminHeaders(),
        body: JSON.stringify({ bio: bio.trim() || null, photoUrl: photoUrl || null }),
      });
      toast({ title: "Saved" });
      onSaved();
      onClose();
    } catch {
      toast({ title: "Error", description: "Failed to save.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit — {member.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 py-1">
          {/* Photo */}
          <div className="space-y-2">
            <Label>Photo</Label>
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-xl border bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                {photoUrl
                  ? <img src={photoUrl} alt={member.name} className="h-full w-full object-cover" />
                  : <ImageIcon className="h-7 w-7 text-slate-300" />}
              </div>
              <div className="space-y-1.5">
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Upload className="h-4 w-4 mr-1.5" />}
                  {uploading ? "Uploading…" : "Upload photo"}
                </Button>
                {photoUrl && (
                  <Button variant="ghost" size="sm" className="text-slate-400 block" onClick={() => setPhotoUrl("")}>
                    Remove
                  </Button>
                )}
                <p className="text-xs text-slate-400">JPG, PNG up to 10 MB</p>
              </div>
            </div>
          </div>

          {/* Bio */}
          <div className="space-y-1.5">
            <Label>Short description</Label>
            <Textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="e.g. Veterinarian specialising in small animals. Over 10 years experience."
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-slate-400">Shown on the public About page</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || uploading}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
  const [editingMember, setEditingMember] = useState<StaffMember | null>(null);
  const currentStaff = localStorage.getItem("staff_name");

  const load = () => {
    setLoading(true);
    fetch(`${basePath}/api/admin/staff`, { headers: adminHeaders() })
      .then(r => r.json())
      .then(setStaff)
      .finally(() => setLoading(false));
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
      toast({ title: "Removed" }); load();
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
      <div className="max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Staff</h1>
            <p className="text-slate-500 text-sm mt-1">
              Manage staff members. Edit each person's photo and bio for the public About page.
            </p>
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
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Staff Members</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <p className="p-4 text-sm text-slate-400">Loading…</p>
            ) : staff.length === 0 ? (
              <p className="p-4 text-sm text-slate-400">No staff members yet.</p>
            ) : (
              <div className="divide-y">
                {staff.map(s => (
                  <div key={s.id} className="flex items-center gap-4 px-4 py-3">
                    {/* Avatar */}
                    <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden shrink-0 border">
                      {s.photoUrl
                        ? <img src={s.photoUrl} alt={s.name} className="h-full w-full object-cover" />
                        : <User className="h-5 w-5 text-slate-400" />}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{s.name}</p>
                      <p className="text-xs text-slate-400">
                        {s.role === "owner" ? "Owner" : "Staff"}
                        {s.name === currentStaff ? " · Active" : ""}
                      </p>
                      {s.bio && (
                        <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">{s.bio}</p>
                      )}
                    </div>
                    {/* Actions */}
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => setEditingMember(s)}>
                        <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                      </Button>
                      {s.name !== currentStaff && (
                        <Button size="sm" variant="outline" onClick={() => handleSetActive(s.name)}>
                          <LogIn className="h-3.5 w-3.5 mr-1" /> Sign in as
                        </Button>
                      )}
                      <Button
                        size="sm" variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => setDeleteId(s.id)}
                      >
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
          <div className="space-y-3">
            <Input
              placeholder="Full name"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAdd()}
            />
            <div className="flex gap-2">
              <Button size="sm" variant={newRole === "staff" ? "default" : "outline"} onClick={() => setNewRole("staff")}>Staff</Button>
              <Button size="sm" variant={newRole === "owner" ? "default" : "outline"} onClick={() => setNewRole("owner")}>Owner</Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button disabled={!newName.trim() || saving} onClick={handleAdd}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit bio/photo dialog */}
      {editingMember && (
        <EditStaffDialog
          member={editingMember}
          open={!!editingMember}
          onClose={() => setEditingMember(null)}
          onSaved={load}
        />
      )}

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

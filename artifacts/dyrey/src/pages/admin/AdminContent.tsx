import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "./AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Bell, Globe, Loader2, Check, Megaphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function adminHeaders() {
  const token = localStorage.getItem("admin_token") ?? "";
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface SiteNotification {
  id: number;
  message: string;
  type: string;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
}

const CONTENT_KEYS: { key: string; label: string; multiline?: boolean }[] = [
  { key: "hero_title_is", label: "Hero Heading (Icelandic)" },
  { key: "hero_title_en", label: "Hero Heading (English)" },
  { key: "hero_subtitle_is", label: "Hero Subtext (Icelandic)", multiline: true },
  { key: "hero_subtitle_en", label: "Hero Subtext (English)", multiline: true },
  { key: "clinic_phone", label: "Clinic Phone" },
  { key: "clinic_email", label: "Clinic Email" },
  { key: "clinic_address", label: "Clinic Address" },
  { key: "clinic_hours", label: "Opening Hours" },
];

const NOTIF_TYPES: Record<string, { label: string; color: string }> = {
  info:     { label: "Info",     color: "bg-blue-100 text-blue-800 border-blue-200" },
  discount: { label: "Discount", color: "bg-green-100 text-green-800 border-green-200" },
  warning:  { label: "Warning",  color: "bg-amber-100 text-amber-800 border-amber-200" },
  urgent:   { label: "Urgent",   color: "bg-red-100 text-red-800 border-red-200" },
};

// ─── Hooks ───────────────────────────────────────────────────────────────────
function useSiteNotifications() {
  return useQuery<SiteNotification[]>({
    queryKey: ["admin", "site-notifications"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/admin/site-notifications`, { headers: adminHeaders() });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });
}

function useSiteContent() {
  return useQuery<Record<string, string>>({
    queryKey: ["admin", "site-content"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/admin/site-content`, { headers: adminHeaders() });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });
}

// ─── Notification Dialog ──────────────────────────────────────────────────────
function NotifDialog({
  open,
  onClose,
  editing,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  editing: SiteNotification | null;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [type, setType] = useState("info");
  const [expiresAt, setExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) {
      setMessage(editing.message);
      setType(editing.type);
      setExpiresAt(editing.expiresAt ? editing.expiresAt.slice(0, 16) : "");
    } else {
      setMessage("");
      setType("info");
      setExpiresAt("");
    }
  }, [editing, open]);

  const handleSave = async () => {
    if (!message.trim()) return;
    setSaving(true);
    try {
      const body = { message: message.trim(), type, expiresAt: expiresAt || null };
      if (editing) {
        await fetch(`${BASE}/api/admin/site-notifications/${editing.id}`, {
          method: "PATCH", headers: adminHeaders(), body: JSON.stringify(body),
        });
      } else {
        await fetch(`${BASE}/api/admin/site-notifications`, {
          method: "POST", headers: adminHeaders(), body: JSON.stringify({ ...body, isActive: true }),
        });
      }
      onSaved();
      onClose();
    } catch {
      toast({ title: "Error", description: "Failed to save notification.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Notification" : "New Customer Notification"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Message</Label>
            <Textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="e.g. 20% off all flea treatments this week! Use code FLEA20 at checkout."
              rows={3}
              className="resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(NOTIF_TYPES).map(([val, { label }]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Expires (optional)</Label>
            <Input type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
            <p className="text-xs text-slate-400">Leave blank to show indefinitely</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!message.trim() || saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminContent() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Site notifications
  const { data: notifications, isLoading: loadingNotifs } = useSiteNotifications();
  const [notifDialogOpen, setNotifDialogOpen] = useState(false);
  const [editingNotif, setEditingNotif] = useState<SiteNotification | null>(null);

  // Site content
  const { data: contentData } = useSiteContent();
  const [contentDraft, setContentDraft] = useState<Record<string, string>>({});
  const [contentSaving, setContentSaving] = useState(false);
  const [contentSaved, setContentSaved] = useState(false);

  useEffect(() => {
    if (contentData) setContentDraft(contentData);
  }, [contentData]);

  const handleToggleNotif = async (notif: SiteNotification) => {
    await fetch(`${BASE}/api/admin/site-notifications/${notif.id}`, {
      method: "PATCH",
      headers: adminHeaders(),
      body: JSON.stringify({ isActive: !notif.isActive }),
    });
    queryClient.invalidateQueries({ queryKey: ["admin", "site-notifications"] });
  };

  const handleDeleteNotif = async (id: number) => {
    await fetch(`${BASE}/api/admin/site-notifications/${id}`, { method: "DELETE", headers: adminHeaders() });
    queryClient.invalidateQueries({ queryKey: ["admin", "site-notifications"] });
    toast({ title: "Notification deleted" });
  };

  const handleSaveContent = async () => {
    setContentSaving(true);
    try {
      await fetch(`${BASE}/api/admin/site-content`, {
        method: "PUT", headers: adminHeaders(), body: JSON.stringify(contentDraft),
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "site-content"] });
      setContentSaved(true);
      setTimeout(() => setContentSaved(false), 2000);
    } catch {
      toast({ title: "Error", description: "Failed to save content.", variant: "destructive" });
    } finally {
      setContentSaving(false);
    }
  };

  const openEditNotif = (n: SiteNotification) => { setEditingNotif(n); setNotifDialogOpen(true); };
  const openNewNotif = () => { setEditingNotif(null); setNotifDialogOpen(true); };
  const invalidateNotifs = () => queryClient.invalidateQueries({ queryKey: ["admin", "site-notifications"] });

  return (
    <AdminLayout>
      <div className="space-y-8 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Edit Website</h1>
          <p className="text-slate-500 text-sm mt-1">Update public-facing text and manage customer notifications</p>
        </div>

        {/* ─── Customer Notifications ─── */}
        <Card>
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Megaphone className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Customer Notifications</CardTitle>
                  <p className="text-xs text-slate-400 mt-0.5">Active ones appear as a banner on the public site</p>
                </div>
              </div>
              <Button size="sm" onClick={openNewNotif} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> New
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loadingNotifs ? (
              <p className="p-6 text-sm text-slate-400">Loading…</p>
            ) : !notifications?.length ? (
              <div className="p-8 text-center text-slate-400">
                <Bell className="h-8 w-8 mx-auto opacity-30 mb-2" />
                <p className="text-sm">No notifications yet</p>
                <p className="text-xs mt-1">Create one to show a banner to customers</p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map(n => {
                  const cfg = NOTIF_TYPES[n.type] ?? NOTIF_TYPES.info;
                  return (
                    <div key={n.id} className="p-4 flex items-start gap-4">
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={`text-xs ${cfg.color}`}>{cfg.label}</Badge>
                          {!n.isActive && <Badge variant="outline" className="text-xs text-slate-400">Inactive</Badge>}
                          {n.expiresAt && (
                            <span className="text-xs text-slate-400">
                              Expires {new Date(n.expiresAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-700">{n.message}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">{n.isActive ? "Active" : "Off"}</span>
                          <Switch checked={n.isActive} onCheckedChange={() => handleToggleNotif(n)} />
                        </div>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditNotif(n)}>
                          <Pencil className="h-3.5 w-3.5 text-slate-400" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 hover:text-red-500 hover:bg-red-50" onClick={() => handleDeleteNotif(n.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-slate-400" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─── Site Text Content ─── */}
        <Card>
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Globe className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Website Text</CardTitle>
                  <p className="text-xs text-slate-400 mt-0.5">Edit the text shown on the public-facing homepage</p>
                </div>
              </div>
              <Button
                size="sm"
                variant={contentSaved ? "outline" : "default"}
                onClick={handleSaveContent}
                disabled={contentSaving}
                className="gap-1.5 min-w-24"
              >
                {contentSaving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : contentSaved ? (
                  <><Check className="h-3.5 w-3.5 text-green-600" /> Saved</>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            {CONTENT_KEYS.map(({ key, label, multiline }) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-slate-700">{label}</Label>
                {multiline ? (
                  <Textarea
                    value={contentDraft[key] ?? ""}
                    onChange={e => setContentDraft(d => ({ ...d, [key]: e.target.value }))}
                    placeholder={`Enter ${label.toLowerCase()}…`}
                    rows={2}
                    className="resize-none text-sm"
                  />
                ) : (
                  <Input
                    value={contentDraft[key] ?? ""}
                    onChange={e => setContentDraft(d => ({ ...d, [key]: e.target.value }))}
                    placeholder={`Enter ${label.toLowerCase()}…`}
                    className="text-sm"
                  />
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <NotifDialog
        open={notifDialogOpen}
        onClose={() => setNotifDialogOpen(false)}
        editing={editingNotif}
        onSaved={invalidateNotifs}
      />
    </AdminLayout>
  );
}

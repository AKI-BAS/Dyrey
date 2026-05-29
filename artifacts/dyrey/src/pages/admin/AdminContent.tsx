import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Plus, Pencil, Trash2, Bell, Loader2, Check, Megaphone, Save, Phone, Mail, MapPin, PhoneCall, BookOpen, Info } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const NOTIF_TYPES: Record<string, { label: string; color: string }> = {
  info:     { label: "Info",     color: "bg-blue-100 text-blue-800 border-blue-200" },
  discount: { label: "Discount", color: "bg-green-100 text-green-800 border-green-200" },
  warning:  { label: "Warning",  color: "bg-amber-100 text-amber-800 border-amber-200" },
  urgent:   { label: "Urgent",   color: "bg-red-100 text-red-800 border-red-200" },
};

const DEFAULTS: Record<string, string> = {
  hero_title_is: "Hlý umönnun fyrir gæludýrin þín",
  hero_title_en: "Compassionate Care for Your Beloved Pets",
  hero_subtitle_is: "Nútímaleg dýralæknisfræði ásamt hlýhug. Frá reglubundnum skoðunum til sérhæfðra meðferða — við erum hér fyrir þig og dýrin þín í Eyjafirði.",
  hero_subtitle_en: "Modern veterinary medicine combined with genuine warmth. From routine check-ups to specialized treatments, we are here for you and your animals in Eyjafjörður.",
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

// ─── Auto-resize textarea ─────────────────────────────────────────────────────
function AutoTextarea({
  value,
  onChange,
  className,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => { resize(); }, [value, resize]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={e => { onChange(e.target.value); resize(); }}
      placeholder={placeholder}
      rows={1}
      className={`w-full resize-none overflow-hidden bg-transparent border-0 p-0 m-0 outline-none focus:ring-0 leading-tight ${className ?? ""}`}
      style={{ height: "auto" }}
    />
  );
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

// ─── Hero Editor ──────────────────────────────────────────────────────────────
function HeroEditor({
  draft,
  onChange,
  onSave,
  saving,
  saved,
}: {
  draft: Record<string, string>;
  onChange: (key: string, val: string) => void;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
}) {
  const [lang, setLang] = useState<"is" | "en">("is");

  const titleKey = `hero_title_${lang}`;
  const subtitleKey = `hero_subtitle_${lang}`;

  const title = draft[titleKey] ?? DEFAULTS[titleKey] ?? "";
  const subtitle = draft[subtitleKey] ?? DEFAULTS[subtitleKey] ?? "";

  const bookLabel = lang === "is" ? "Bóka tíma" : "Book Appointment";
  const shopLabel = lang === "is" ? "Fara í gæludýraverslun" : "Visit Pet Shop";

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="text-base">Hero Section</CardTitle>
            <p className="text-xs text-slate-400 mt-0.5">Click any text in the preview to edit it directly</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Language toggle — same pill style as site navbar */}
            <div className="flex items-center rounded-full border border-border overflow-hidden text-xs font-bold shrink-0">
              <button
                onClick={() => setLang("is")}
                className={`px-3 py-1.5 transition-colors ${lang === "is" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                IS
              </button>
              <button
                onClick={() => setLang("en")}
                className={`px-3 py-1.5 transition-colors ${lang === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                EN
              </button>
            </div>

            <Button
              size="sm"
              variant={saved ? "outline" : "default"}
              onClick={onSave}
              disabled={saving}
              className="gap-1.5 min-w-[130px]"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : saved ? (
                <><Check className="h-3.5 w-3.5 text-green-600" /> Saved</>
              ) : (
                <><Save className="h-3.5 w-3.5" /> Save Changes</>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* ── Mini Hero Preview ── */}
      <div className="relative overflow-hidden bg-sky-50">
        {/* Same faint background tint as the real hero */}
        <div className="absolute inset-0 bg-[url('/hero-vet.jpg')] bg-cover bg-center opacity-10 mix-blend-multiply pointer-events-none" />

        <div className="relative px-8 py-10 max-w-2xl">

          {/* Editable title */}
          <div className="group relative mb-5">
            <AutoTextarea
              value={title}
              onChange={v => onChange(titleKey, v)}
              placeholder={DEFAULTS[titleKey]}
              className="text-3xl font-bold tracking-tight text-slate-900 rounded-md transition-shadow focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)] hover:shadow-[0_0_0_2px_hsl(var(--border))]"
            />
            <div className="absolute -top-5 left-0 hidden group-focus-within:flex items-center gap-1 text-[10px] text-primary font-semibold">
              <Pencil className="h-2.5 w-2.5" /> Heading
            </div>
          </div>

          {/* Editable subtitle */}
          <div className="group relative mb-8">
            <AutoTextarea
              value={subtitle}
              onChange={v => onChange(subtitleKey, v)}
              placeholder={DEFAULTS[subtitleKey]}
              className="text-base text-slate-600 leading-relaxed rounded-md transition-shadow focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)] hover:shadow-[0_0_0_2px_hsl(var(--border))]"
            />
            <div className="absolute -top-5 left-0 hidden group-focus-within:flex items-center gap-1 text-[10px] text-primary font-semibold">
              <Pencil className="h-2.5 w-2.5" /> Subtitle
            </div>
          </div>

          {/* Decorative buttons — not interactive, just visual */}
          <div className="flex flex-col sm:flex-row gap-3 pointer-events-none select-none">
            <div className="inline-flex items-center justify-center h-10 px-6 text-sm font-medium rounded-md bg-primary text-primary-foreground opacity-75">
              {bookLabel}
            </div>
            <div className="inline-flex items-center justify-center h-10 px-6 text-sm font-medium rounded-md border border-slate-300 bg-white/50 text-slate-700 opacity-75">
              {shopLabel}
            </div>
          </div>
        </div>

        {/* Subtle edit hint */}
        <div className="absolute bottom-2 right-3 text-[10px] text-slate-400 flex items-center gap-1 select-none">
          <Pencil className="h-2.5 w-2.5" /> Click text to edit
        </div>
      </div>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminContent() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: notifications, isLoading: loadingNotifs } = useSiteNotifications();
  const [notifDialogOpen, setNotifDialogOpen] = useState(false);
  const [editingNotif, setEditingNotif] = useState<SiteNotification | null>(null);

  const { data: contentData } = useSiteContent();
  const [contentDraft, setContentDraft] = useState<Record<string, string>>({});
  const [contentSaving, setContentSaving] = useState(false);
  const [contentSaved, setContentSaved] = useState(false);

  useEffect(() => {
    if (contentData) setContentDraft(contentData);
  }, [contentData]);

  const handleContentChange = (key: string, val: string) => {
    setContentDraft(d => ({ ...d, [key]: val }));
    setContentSaved(false);
  };

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
      setTimeout(() => setContentSaved(false), 2500);
    } catch {
      toast({ title: "Error", description: "Failed to save content.", variant: "destructive" });
    } finally {
      setContentSaving(false);
    }
  };

  const openEditNotif = (n: SiteNotification) => { setEditingNotif(n); setNotifDialogOpen(true); };
  const openNewNotif = () => { setEditingNotif(null); setNotifDialogOpen(true); };
  const invalidateNotifs = () => queryClient.invalidateQueries({ queryKey: ["admin", "site-notifications"] });

  // ─── Contact & About field helpers ──────────────────────────────────────────
  const cf = (key: string, fallback = "") => contentDraft[key] ?? fallback;
  const setField = (key: string, v: string) => handleContentChange(key, v);

  const SaveBar = () => (
    <div className="flex justify-end pt-2">
      <Button
        size="sm"
        variant={contentSaved ? "outline" : "default"}
        onClick={handleSaveContent}
        disabled={contentSaving}
        className="gap-1.5 min-w-[130px]"
      >
        {contentSaving ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : contentSaved ? (
          <><Check className="h-3.5 w-3.5 text-green-600" /> Saved</>
        ) : (
          <><Save className="h-3.5 w-3.5" /> Save Changes</>
        )}
      </Button>
    </div>
  );

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Edit Website</h1>
          <p className="text-slate-500 text-sm mt-1">Manage all public-facing content from here</p>
        </div>

        <Tabs defaultValue="homepage">
          <TabsList className="mb-6">
            <TabsTrigger value="homepage">Homepage</TabsTrigger>
            <TabsTrigger value="contact">Contact Page</TabsTrigger>
            <TabsTrigger value="about">About Page</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          {/* ─── Homepage ─── */}
          <TabsContent value="homepage" className="space-y-6 mt-0">
            <HeroEditor
              draft={contentDraft}
              onChange={handleContentChange}
              onSave={handleSaveContent}
              saving={contentSaving}
              saved={contentSaved}
            />
          </TabsContent>

          {/* ─── Contact Page ─── */}
          <TabsContent value="contact" className="space-y-6 mt-0">
            <Card>
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Phone className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Contact Page</CardTitle>
                    <p className="text-xs text-slate-400 mt-0.5">Shown at <code className="bg-slate-100 px-1 rounded">/contact</code> — update phone numbers and hours here</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">

                {/* Shop */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center">
                      <Phone className="h-3.5 w-3.5 text-primary" />
                    </div>
                    Shop
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-8">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-500">Phone number</label>
                      <input className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                        value={cf("contact_shop_phone", "+354 460 0000")}
                        onChange={e => setField("contact_shop_phone", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-500">Opening hours</label>
                      <input className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                        value={cf("contact_shop_hours", "Mon–Fri 09:00–18:00 · Sat 10:00–15:00")}
                        onChange={e => setField("contact_shop_hours", e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="border-t" />

                {/* Appointments */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <div className="h-6 w-6 rounded bg-blue-100 flex items-center justify-center">
                      <Phone className="h-3.5 w-3.5 text-blue-600" />
                    </div>
                    Appointments
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-8">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-500">Phone number</label>
                      <input className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                        value={cf("contact_appt_phone", "+354 460 0001")}
                        onChange={e => setField("contact_appt_phone", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-500">Opening hours</label>
                      <input className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                        value={cf("contact_appt_hours", "Mon–Fri 08:00–17:00")}
                        onChange={e => setField("contact_appt_hours", e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="border-t" />

                {/* Duty / on-call */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <div className="h-6 w-6 rounded bg-amber-100 flex items-center justify-center">
                      <PhoneCall className="h-3.5 w-3.5 text-amber-700" />
                    </div>
                    Duty / On-call number
                  </div>
                  <p className="text-xs text-slate-400 pl-8">Update this each week/shift when the duty number changes</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-8">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-500">Current duty number</label>
                      <input className="flex h-9 w-full rounded-md border border-amber-300 bg-amber-50 px-3 py-1 text-sm shadow-sm font-semibold"
                        value={cf("contact_duty_phone", "+354 460 0002")}
                        onChange={e => setField("contact_duty_phone", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-500">Label (e.g. "Duty number this week")</label>
                      <input className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                        value={cf("contact_duty_label", "Duty number (this week)")}
                        onChange={e => setField("contact_duty_label", e.target.value)} />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-medium text-slate-500">Subtext under duty number</label>
                      <input className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                        value={cf("contact_duty_note", "For urgent cases outside opening hours")}
                        onChange={e => setField("contact_duty_note", e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="border-t" />

                {/* General */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <div className="h-6 w-6 rounded bg-emerald-100 flex items-center justify-center">
                      <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                    </div>
                    Address & Email
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-8">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-500">Address</label>
                      <input className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                        value={cf("contact_address", "Eyjafjarðarbraut, Akureyri")}
                        onChange={e => setField("contact_address", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-500">Email</label>
                      <input className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                        value={cf("contact_email", "info@dyrey.is")}
                        onChange={e => setField("contact_email", e.target.value)} />
                    </div>
                  </div>
                </div>

                <SaveBar />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── About Page ─── */}
          <TabsContent value="about" className="space-y-6 mt-0">
            <Card>
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Info className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">About Page</CardTitle>
                    <p className="text-xs text-slate-400 mt-0.5">Shown at <code className="bg-slate-100 px-1 rounded">/about</code> — the team section is managed under Staff</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500">Page heading</label>
                  <input className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                    value={cf("about_title", "About Dýrey")}
                    onChange={e => setField("about_title", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500">About text</label>
                  <textarea
                    rows={8}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm resize-none"
                    value={cf("about_body", "Dýrey Veterinary provides compassionate, modern care for animals across Eyjafjörður.")}
                    onChange={e => setField("about_body", e.target.value)}
                    placeholder="Write about the clinic, its history, values…"
                  />
                  <p className="text-xs text-slate-400">Line breaks are preserved. Staff photos and bios are edited on the <strong>Staff</strong> page.</p>
                </div>
                <SaveBar />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Notifications ─── */}
          <TabsContent value="notifications" className="mt-0">
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
          </TabsContent>
        </Tabs>
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

import { useState } from "react";
import { useListServices, useCreateService, useUpdateService, useDeleteService } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import AdminLayout from "./AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Clock, BadgeCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type ServiceForm = {
  name: string;
  description: string;
  duration: number;
  price: number;
  isActive: boolean;
  allowCustomDescription: boolean;
};

const EMPTY: ServiceForm = {
  name: "",
  description: "",
  duration: 30,
  price: 0,
  isActive: true,
  allowCustomDescription: false,
};

export default function AdminServices() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: services, isLoading } = useListServices();
  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<ServiceForm>(EMPTY);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const openCreate = () => { setEditId(null); setForm(EMPTY); setDialogOpen(true); };
  const openEdit = (s: NonNullable<typeof services>[0]) => {
    setEditId(s.id);
    setForm({
      name: s.name,
      description: s.description,
      duration: s.duration,
      price: s.price,
      isActive: s.isActive,
      allowCustomDescription: s.allowCustomDescription,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.description || !form.duration || form.price < 0) {
      toast({ title: "Validation", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    try {
      if (editId !== null) {
        await updateService.mutateAsync({ id: editId, data: form });
        toast({ title: "Saved", description: "Service updated." });
      } else {
        await createService.mutateAsync({ data: form });
        toast({ title: "Created", description: "Service created." });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setDialogOpen(false);
    } catch {
      toast({ title: "Error", description: "Failed to save service.", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (deleteId === null) return;
    try {
      await deleteService.mutateAsync({ id: deleteId });
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({ title: "Deleted", description: "Service removed." });
    } catch {
      toast({ title: "Error", description: "Failed to delete service.", variant: "destructive" });
    }
    setDeleteId(null);
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Services</h1>
            <p className="text-slate-500 text-sm mt-1">Manage appointment types</p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add Service
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <p className="p-6 text-sm text-slate-400">Loading…</p>
            ) : services?.length === 0 ? (
              <p className="p-6 text-sm text-slate-400">No services yet. Add one to get started.</p>
            ) : (
              <div className="divide-y">
                {services?.map(s => (
                  <div key={s.id} className="p-4 flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">{s.name}</p>
                        {!s.isActive && (
                          <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Inactive</span>
                        )}
                        {s.allowCustomDescription && (
                          <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">Custom reason</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">{s.description}</p>
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{s.duration} min</span>
                        <span>{s.price.toLocaleString()} kr.</span>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(s)}>
                        <Pencil className="h-4 w-4 text-slate-500" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setDeleteId(s.id)}>
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Service" : "New Service"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Annual Wellness Exam" />
            </div>
            <div className="space-y-1.5">
              <Label>Description *</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Duration (minutes) *</Label>
                <Input type="number" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Price (kr.) *</Label>
                <Input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label className="cursor-pointer">Active (visible to customers)</Label>
              <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="cursor-pointer">Require custom reason</Label>
                <p className="text-xs text-slate-400">Customer must describe their reason</p>
              </div>
              <Switch checked={form.allowCustomDescription} onCheckedChange={v => setForm(f => ({ ...f, allowCustomDescription: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createService.isPending || updateService.isPending}>
              {editId ? "Save Changes" : "Create Service"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this service?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone. Existing appointments with this service won't be affected.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}

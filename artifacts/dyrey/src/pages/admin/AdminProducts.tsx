import { useState, useRef } from "react";
import { useListProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, useListProductCategories } from "@workspace/api-client-react";
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
import { Plus, Pencil, Trash2, Search, ImageIcon, Upload, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type ProductForm = {
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  inStock: boolean;
  featured: boolean;
  stockCount: number;
};

const EMPTY: ProductForm = {
  name: "",
  description: "",
  price: 0,
  category: "",
  imageUrl: "",
  inStock: true,
  featured: false,
  stockCount: 0,
};

async function uploadImage(file: File): Promise<string> {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const res = await fetch(`${base}/api/storage/uploads/request-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
  });
  if (!res.ok) throw new Error("Failed to get upload URL");
  const { uploadURL, objectPath } = await res.json();
  const putRes = await fetch(uploadURL, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!putRes.ok) throw new Error("Failed to upload file");
  return `${base}/api/storage/objects${objectPath}`;
}

export default function AdminProducts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: products, isLoading } = useListProducts({});
  const { data: categories } = useListProductCategories();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const allCategories = Array.from(new Set([
    ...(categories?.map(c => c.name) ?? []),
    ...(newCategory ? [newCategory] : []),
  ]));

  const filtered = products?.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
  }) ?? [];

  const openCreate = () => { setEditId(null); setForm(EMPTY); setNewCategory(""); setDialogOpen(true); };
  const openEdit = (p: NonNullable<typeof products>[0]) => {
    setEditId(p.id);
    setForm({
      name: p.name,
      description: p.description,
      price: p.price,
      category: p.category,
      imageUrl: p.imageUrl ?? "",
      inStock: p.inStock,
      featured: p.featured,
      stockCount: p.stockCount ?? 0,
    });
    setNewCategory("");
    setDialogOpen(true);
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      setForm(f => ({ ...f, imageUrl: url }));
      toast({ title: "Image uploaded", description: "Product image updated." });
    } catch {
      toast({ title: "Upload failed", description: "Could not upload image.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    const category = newCategory.trim() || form.category;
    if (!form.name || !form.description || !category || form.price < 0) {
      toast({ title: "Validation", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    const data = { ...form, category };
    try {
      if (editId !== null) {
        await updateProduct.mutateAsync({ id: editId, data });
        toast({ title: "Saved", description: "Product updated." });
      } else {
        await createProduct.mutateAsync({ data });
        toast({ title: "Created", description: "Product created." });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products/categories"] });
      setDialogOpen(false);
    } catch {
      toast({ title: "Error", description: "Failed to save product.", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (deleteId === null) return;
    try {
      await deleteProduct.mutateAsync({ id: deleteId });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products/categories"] });
      toast({ title: "Deleted", description: "Product removed." });
    } catch {
      toast({ title: "Error", description: "Failed to delete product.", variant: "destructive" });
    }
    setDeleteId(null);
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Products</h1>
            <p className="text-slate-500 text-sm mt-1">Manage the online shop inventory</p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <p className="p-6 text-sm text-slate-400">Loading…</p>
            ) : filtered.length === 0 ? (
              <p className="p-6 text-sm text-slate-400">No products found.</p>
            ) : (
              <div className="divide-y">
                {filtered.map(p => (
                  <div key={p.id} className="p-4 flex items-center gap-4">
                    <div className="h-14 w-14 rounded-lg border bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                      ) : (
                        <ImageIcon className="h-6 w-6 text-slate-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{p.name}</p>
                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{p.category}</span>
                        {p.featured && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Featured</span>}
                        {!p.inStock && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Out of stock</span>}
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{p.description}</p>
                      <p className="text-sm font-medium mt-1">{p.price.toLocaleString()} kr.</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(p)}>
                        <Pencil className="h-4 w-4 text-slate-500" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setDeleteId(p.id)}>
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Product" : "New Product"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Image upload */}
            <div className="space-y-2">
              <Label>Product Image</Label>
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-lg border bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                  {form.imageUrl ? (
                    <img src={form.imageUrl} alt="preview" className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-slate-300" />
                  )}
                </div>
                <div className="flex-1">
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                    {uploading ? "Uploading…" : "Upload Image"}
                  </Button>
                  {form.imageUrl && (
                    <Button variant="ghost" size="sm" className="ml-2 text-slate-400" onClick={() => setForm(f => ({ ...f, imageUrl: "" }))}>
                      Remove
                    </Button>
                  )}
                  <p className="text-xs text-slate-400 mt-1">JPG, PNG, WebP up to 10MB</p>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Product name" />
            </div>
            <div className="space-y-1.5">
              <Label>Description *</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Price (kr.) *</Label>
                <Input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Stock Count</Label>
                <Input type="number" value={form.stockCount} onChange={e => setForm(f => ({ ...f, stockCount: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Category *</Label>
              <div className="flex gap-2">
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  value={newCategory ? "__new__" : form.category}
                  onChange={e => {
                    if (e.target.value === "__new__") {
                      setNewCategory("");
                    } else {
                      setForm(f => ({ ...f, category: e.target.value }));
                      setNewCategory("");
                    }
                  }}
                >
                  <option value="">Select category</option>
                  {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  <option value="__new__">+ Add new category…</option>
                </select>
              </div>
              {(newCategory !== undefined && (form.category === "" || newCategory !== "")) && (
                <Input
                  placeholder="New category name"
                  value={newCategory}
                  onChange={e => {
                    setNewCategory(e.target.value);
                    setForm(f => ({ ...f, category: e.target.value }));
                  }}
                  className="mt-2"
                />
              )}
            </div>
            <div className="flex items-center justify-between">
              <Label>In Stock</Label>
              <Switch checked={form.inStock} onCheckedChange={v => setForm(f => ({ ...f, inStock: v }))} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Featured</Label>
                <p className="text-xs text-slate-400">Show on homepage</p>
              </div>
              <Switch checked={form.featured} onCheckedChange={v => setForm(f => ({ ...f, featured: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createProduct.isPending || updateProduct.isPending || uploading}>
              {editId ? "Save Changes" : "Create Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this product?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
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

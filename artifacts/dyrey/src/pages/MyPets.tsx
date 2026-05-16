import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser, useClerk } from "@clerk/react";
import { PawPrint, Plus, Pencil, Trash2, LogIn, Lock, CalendarDays, FileText } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO, differenceInYears, differenceInMonths } from "date-fns";
import { useT } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Pet {
  id: number;
  userId: string;
  name: string;
  species: string;
  breed: string | null;
  color: string | null;
  birthDate: string | null;
  notes: string | null;
  createdAt: string;
}

const petSchema = z.object({
  name: z.string().min(1, "Name is required"),
  species: z.string().min(1, "Species is required"),
  breed: z.string().optional(),
  color: z.string().optional(),
  birthDate: z.string().optional(),
  notes: z.string().optional(),
});
type PetFormValues = z.infer<typeof petSchema>;

const SPECIES_OPTIONS = ["Dog", "Cat", "Horse", "Rabbit", "Bird", "Fish", "Reptile", "Other"];

function petAge(birthDate: string): string {
  const birth = parseISO(birthDate);
  const years = differenceInYears(new Date(), birth);
  if (years >= 1) return `${years}y`;
  const months = differenceInMonths(new Date(), birth);
  return `${months}mo`;
}

function speciesEmoji(species: string): string {
  switch (species.toLowerCase()) {
    case "dog": return "🐶";
    case "cat": return "🐱";
    case "horse": return "🐴";
    case "rabbit": return "🐰";
    case "bird": return "🦜";
    case "fish": return "🐟";
    case "reptile": return "🦎";
    default: return "🐾";
  }
}

function usePets(enabled: boolean) {
  return useQuery<Pet[]>({
    queryKey: ["me", "pets"],
    queryFn: async () => {
      const res = await fetch(`${basePath}/api/me/pets`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch pets");
      return res.json();
    },
    enabled,
  });
}

function PetDialog({
  open,
  onClose,
  pet,
}: {
  open: boolean;
  onClose: () => void;
  pet: Pet | null;
}) {
  const t = useT();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<PetFormValues>({
    resolver: zodResolver(petSchema),
    defaultValues: {
      name: pet?.name ?? "",
      species: pet?.species ?? "",
      breed: pet?.breed ?? "",
      color: pet?.color ?? "",
      birthDate: pet?.birthDate ?? "",
      notes: pet?.notes ?? "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: PetFormValues) => {
      const body = {
        ...values,
        breed: values.breed || undefined,
        color: values.color || undefined,
        birthDate: values.birthDate || undefined,
        notes: values.notes || undefined,
      };
      const url = pet ? `${basePath}/api/me/pets/${pet.id}` : `${basePath}/api/me/pets`;
      const method = pet ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to save pet");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me", "pets"] });
      toast({ title: t("pets_saved") });
      onClose();
    },
    onError: () => {
      toast({ title: "Error", description: t("pets_saveError"), variant: "destructive" });
    },
  });

  const onSubmit = (values: PetFormValues) => mutation.mutate(values);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{pet ? t("pets_editPet") : t("pets_addPet")}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("pets_name")}</FormLabel>
                    <FormControl><Input placeholder="Max" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="species"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("pets_species")}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder={t("pets_selectSpecies")} /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SPECIES_OPTIONS.map((s) => (
                          <SelectItem key={s} value={s}>{speciesEmoji(s)} {s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="breed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("pets_breed")}</FormLabel>
                    <FormControl><Input placeholder="Golden Retriever" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("pets_color")}</FormLabel>
                    <FormControl><Input placeholder="Golden" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="birthDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("pets_birthDate")}</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} max={new Date().toISOString().split("T")[0]} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("pets_notes")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("pets_notes_placeholder")}
                      rows={4}
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>{t("pets_cancel")}</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? t("pets_saving") : t("pets_save")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function MyPets() {
  const t = useT();
  const { user, isLoaded } = useUser();
  const { openSignIn } = useClerk();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: pets, isLoading } = usePets(isLoaded && !!user);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${basePath}/api/me/pets/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete pet");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me", "pets"] });
      toast({ title: t("pets_deleted") });
    },
    onError: () => {
      toast({ title: "Error", description: t("pets_deleteError"), variant: "destructive" });
    },
  });

  const openAdd = () => { setEditingPet(null); setDialogOpen(true); };
  const openEdit = (pet: Pet) => { setEditingPet(pet); setDialogOpen(true); };
  const closeDialog = () => { setDialogOpen(false); setEditingPet(null); };

  if (isLoaded && !user) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-3">{t("pets_gated_title")}</h1>
          <p className="text-muted-foreground max-w-sm mb-8">{t("pets_gated_desc")}</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={() => openSignIn()} className="gap-2">
              <LogIn className="h-4 w-4" /> {t("appt_signIn")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">{t("pets_title")}</h1>
          <p className="text-muted-foreground">{t("pets_subtitle")}</p>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="h-4 w-4" /> {t("pets_addPet")}
        </Button>
      </div>

      {isLoading || !isLoaded ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="shadow-sm">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-14 w-14 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-1/2" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                </div>
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : pets?.length === 0 ? (
        <div className="text-center py-20 bg-slate-50/50 rounded-xl border border-dashed">
          <PawPrint className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
          <h3 className="text-lg font-medium">{t("pets_empty")}</h3>
          <p className="text-muted-foreground mb-6">{t("pets_empty_desc")}</p>
          <Button onClick={openAdd} className="gap-2">
            <Plus className="h-4 w-4" /> {t("pets_addPet")}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pets?.map((pet) => (
            <Card key={pet.id} className="shadow-sm border-border/60 hover:border-border transition-all overflow-hidden">
              <CardContent className="p-0">
                {/* Header strip */}
                <div className="bg-primary/5 px-5 pt-5 pb-4 border-b border-border/40 flex items-start gap-4">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-2xl shrink-0">
                    {speciesEmoji(pet.species)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg leading-tight truncate">{pet.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {pet.species}{pet.breed ? ` · ${pet.breed}` : ""}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {pet.color && (
                        <Badge variant="outline" className="text-xs bg-background">{pet.color}</Badge>
                      )}
                      {pet.birthDate && (
                        <Badge variant="outline" className="text-xs bg-background gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {petAge(pet.birthDate)} · {format(parseISO(pet.birthDate), "dd MMM yyyy")}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="px-5 py-4">
                  {pet.notes ? (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4 mt-0.5 shrink-0 text-primary/60" />
                      <p className="line-clamp-4 whitespace-pre-line">{pet.notes}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground/60 italic">{t("pets_noNotes")}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="px-5 pb-4 flex justify-between items-center border-t border-border/40 pt-3 mt-1">
                  <Link href="/book">
                    <Button variant="outline" size="sm" className="text-xs gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" /> {t("pets_bookAppt")}
                    </Button>
                  </Link>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEdit(pet)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t("pets_deleteTitle")}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t("pets_deleteDesc", { name: pet.name })}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t("appt_keepIt")}</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate(pet.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {t("pets_yesDelete")}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PetDialog open={dialogOpen} onClose={closeDialog} pet={editingPet} />
    </div>
  );
}

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser, useClerk } from "@clerk/react";
import { useCancelAppointment } from "@workspace/api-client-react";
import { format, parseISO, isBefore, startOfDay } from "date-fns";
import { CalendarDays, Clock, MoreHorizontal, FileText, Ban, LogIn, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useT } from "@/hooks/use-language";
import { Link } from "wouter";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Appointment {
  id: number;
  petName: string;
  petType: string;
  serviceName: string;
  date: string;
  time: string;
  status: string;
  notes: string | null;
  customDescription: string | null;
  ownerName: string;
  ownerEmail: string;
  createdAt: string;
}

function useMyAppointments(enabled: boolean) {
  return useQuery<Appointment[]>({
    queryKey: ["me", "appointments"],
    queryFn: async () => {
      const res = await fetch(`${basePath}/api/me/appointments`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch appointments");
      return res.json();
    },
    enabled,
  });
}

// ─── Appointment Card ─────────────────────────────────────────────────────────
function AppointmentCard({
  apt,
  onCancel,
  getStatusColor,
  t,
}: {
  apt: Appointment;
  onCancel: (id: number) => void;
  getStatusColor: (s: string) => string;
  t: (k: string, p?: Record<string, string>) => string;
}) {
  return (
    <Card className="shadow-sm overflow-hidden border-border/60 transition-all hover:border-border">
      <div className="flex flex-col sm:flex-row">
        <div className="bg-slate-50 p-6 sm:w-64 flex flex-col justify-center border-b sm:border-b-0 sm:border-r border-border/60">
          <div className="flex items-center gap-2 text-primary font-medium mb-2">
            <CalendarDays className="h-4 w-4" />
            <span>{format(parseISO(apt.date), "MMMM d, yyyy")}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600 mb-4">
            <Clock className="h-4 w-4" />
            <span>{apt.time}</span>
          </div>
          <div>
            <Badge variant="outline" className={`font-medium ${getStatusColor(apt.status)}`}>
              {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
            </Badge>
          </div>
        </div>

        <div className="p-6 flex-1 flex flex-col justify-center relative">
          {(apt.status === "pending" || apt.status === "confirmed") && (
            <div className="absolute top-4 right-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer">
                        <Ban className="h-4 w-4 mr-2" /> {t("appt_cancel")}
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t("appt_cancel_title")}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t("appt_cancel_desc", { pet: apt.petName })}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t("appt_keepIt")}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onCancel(apt.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          {t("appt_yesCancel")}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          <h3 className="text-xl font-bold mb-1">
            {apt.petName} <span className="text-muted-foreground font-normal text-base">({apt.petType})</span>
          </h3>
          <p className="text-slate-700 font-medium mb-4">{apt.serviceName}</p>

          {apt.notes && (
            <div className="flex items-start gap-2 text-sm text-muted-foreground bg-slate-50/50 p-3 rounded-md">
              <FileText className="h-4 w-4 mt-0.5 shrink-0" />
              <p>{apt.notes}</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

// ─── Appointment Tabs ─────────────────────────────────────────────────────────
function AppointmentTabs({
  appointments,
  onCancel,
  getStatusColor,
  t,
}: {
  appointments: Appointment[];
  onCancel: (id: number) => void;
  getStatusColor: (s: string) => string;
  t: (k: string, p?: Record<string, string>) => string;
}) {
  const today = startOfDay(new Date());

  const upcoming = appointments
    .filter(a => !isBefore(parseISO(a.date), today))
    .sort((a, b) => a.date.localeCompare(b.date));

  const past = appointments
    .filter(a => isBefore(parseISO(a.date), today))
    .sort((a, b) => b.date.localeCompare(a.date));

  const EmptyState = ({ label }: { label: string }) => (
    <div className="text-center py-20 bg-slate-50/50 rounded-xl border border-dashed">
      <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
      <h3 className="text-lg font-medium">{label}</h3>
      <Link href="/book">
        <Button variant="outline" className="mt-6">{t("appt_bookBtn")}</Button>
      </Link>
    </div>
  );

  if (appointments.length === 0) {
    return (
      <div className="text-center py-20 bg-slate-50/50 rounded-xl border border-dashed">
        <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
        <h3 className="text-lg font-medium">{t("appt_empty")}</h3>
        <p className="text-muted-foreground mb-6">{t("appt_empty_desc")}</p>
        <Link href="/book">
          <Button variant="outline">{t("appt_bookBtn")}</Button>
        </Link>
      </div>
    );
  }

  return (
    <Tabs defaultValue="upcoming">
      <TabsList className="mb-6">
        <TabsTrigger value="upcoming" className="gap-2">
          Upcoming
          {upcoming.length > 0 && (
            <span className="bg-primary/15 text-primary text-xs font-semibold px-1.5 py-0.5 rounded-full">
              {upcoming.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="past" className="gap-2">
          Past
          {past.length > 0 && (
            <span className="bg-slate-100 text-slate-600 text-xs font-semibold px-1.5 py-0.5 rounded-full">
              {past.length}
            </span>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="upcoming">
        {upcoming.length === 0 ? (
          <EmptyState label="No upcoming appointments" />
        ) : (
          <div className="space-y-4">
            {upcoming.map(apt => (
              <AppointmentCard key={apt.id} apt={apt} onCancel={onCancel} getStatusColor={getStatusColor} t={t} />
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="past">
        {past.length === 0 ? (
          <EmptyState label="No past appointments" />
        ) : (
          <div className="space-y-4">
            {past.map(apt => (
              <AppointmentCard key={apt.id} apt={apt} onCancel={onCancel} getStatusColor={getStatusColor} t={t} />
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Appointments() {
  const t = useT();
  const { user, isLoaded } = useUser();
  const { openSignIn } = useClerk();
  const { data: appointments, isLoading } = useMyAppointments(isLoaded && !!user);
  const cancelAppointment = useCancelAppointment();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleCancel = async (id: number) => {
    try {
      await cancelAppointment.mutateAsync({ id });
      toast({ title: t("appt_cancelled"), description: t("appt_cancelSuccess") });
      queryClient.invalidateQueries({ queryKey: ["me", "appointments"] });
    } catch {
      toast({ title: "Error", description: t("appt_cancelError"), variant: "destructive" });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed": return "bg-blue-100 text-blue-800 border-blue-200";
      case "pending": return "bg-amber-100 text-amber-800 border-amber-200";
      case "completed": return "bg-green-100 text-green-800 border-green-200";
      case "cancelled": return "bg-slate-100 text-slate-800 border-slate-200";
      default: return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  if (isLoaded && !user) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-3">{t("appt_gated_title")}</h1>
          <p className="text-muted-foreground max-w-sm mb-8">{t("appt_gated_desc")}</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={() => openSignIn()} className="gap-2">
              <LogIn className="h-4 w-4" /> {t("appt_signIn")}
            </Button>
            <Link href="/book">
              <Button variant="outline">{t("appt_bookGuest")}</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">{t("appt_title")}</h1>
          <p className="text-muted-foreground">{t("appt_subtitle")}</p>
        </div>
        <Link href="/book">
          <Button>{t("appt_bookNew")}</Button>
        </Link>
      </div>

      {isLoading || !isLoaded ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="shadow-sm">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-3 w-full">
                    <Skeleton className="h-6 w-1/4" />
                    <Skeleton className="h-4 w-1/3" />
                    <div className="flex gap-4 pt-4">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <AppointmentTabs
          appointments={appointments ?? []}
          onCancel={handleCancel}
          getStatusColor={getStatusColor}
          t={t}
        />
      )}
    </div>
  );
}

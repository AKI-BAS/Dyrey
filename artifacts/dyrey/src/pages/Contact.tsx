import { useQuery } from "@tanstack/react-query";
import { Phone, Mail, MapPin, Clock, ShoppingBag, CalendarDays, PhoneCall } from "lucide-react";
import { useT } from "@/hooks/use-language";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function useSiteContent() {
  return useQuery<Record<string, string>>({
    queryKey: ["site-content"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/site-content`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    staleTime: 60_000,
  });
}

function val(data: Record<string, string> | undefined, key: string, fallback = "") {
  return data?.[key] ?? fallback;
}

export default function Contact() {
  const { data } = useSiteContent();

  const shopPhone    = val(data, "contact_shop_phone",        "+354 460 0000");
  const apptPhone    = val(data, "contact_appt_phone",        "+354 460 0001");
  const dutyPhone    = val(data, "contact_duty_phone",        "+354 460 0002");
  const email        = val(data, "contact_email",             "info@dyrey.is");
  const address      = val(data, "contact_address",           "Eyjafjarðarbraut, Akureyri");
  const shopHours    = val(data, "contact_shop_hours",        "Mon–Fri 09:00–18:00 · Sat 10:00–15:00");
  const apptHours    = val(data, "contact_appt_hours",        "Mon–Fri 08:00–17:00");
  const dutyLabel    = val(data, "contact_duty_label",        "Duty number (this week)");
  const dutyNote     = val(data, "contact_duty_note",         "For urgent cases outside opening hours");

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-4xl">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">Contact Us</h1>
        <p className="text-muted-foreground mt-2 max-w-xl">
          Get in touch with the clinic — whether it's about the shop, booking an appointment, or an urgent matter.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Shop */}
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <ShoppingBag className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-base">Shop</h2>
              <p className="text-xs text-muted-foreground">Products & orders</p>
            </div>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <Phone className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <a href={`tel:${shopPhone.replace(/\s/g,"")}`} className="hover:text-primary transition-colors font-medium">{shopPhone}</a>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <span className="text-muted-foreground whitespace-pre-line">{shopHours}</span>
            </div>
          </div>
        </div>

        {/* Appointments */}
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
              <CalendarDays className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-base">Appointments</h2>
              <p className="text-xs text-muted-foreground">Bookings & clinic enquiries</p>
            </div>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <Phone className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <a href={`tel:${apptPhone.replace(/\s/g,"")}`} className="hover:text-primary transition-colors font-medium">{apptPhone}</a>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <span className="text-muted-foreground whitespace-pre-line">{apptHours}</span>
            </div>
          </div>
        </div>

        {/* Duty / On-call */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <PhoneCall className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <h2 className="font-semibold text-base">{dutyLabel}</h2>
              <p className="text-xs text-muted-foreground">{dutyNote}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <a href={`tel:${dutyPhone.replace(/\s/g,"")}`} className="hover:text-primary transition-colors font-bold text-amber-800 text-base">{dutyPhone}</a>
          </div>
        </div>

        {/* Location & email */}
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
              <MapPin className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="font-semibold text-base">Find Us</h2>
              <p className="text-xs text-muted-foreground">Address & general contact</p>
            </div>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <span className="text-muted-foreground">{address}</span>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <a href={`mailto:${email}`} className="hover:text-primary transition-colors font-medium">{email}</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

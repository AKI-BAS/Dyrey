import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock, CheckCircle2 } from "lucide-react";
import { useListServices } from "@workspace/api-client-react";
import AdminLayout from "./AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  ownerName: z.string().min(2, "Name is required"),
  ownerEmail: z.string().email("Valid email is required"),
  ownerPhone: z.string().min(6, "Phone number is required"),
  petName: z.string().min(1, "Pet name is required"),
  petType: z.string().min(1, "Pet type is required"),
  serviceId: z.coerce.number().min(1, "Please select a service"),
  date: z.date({ required_error: "A date is required" }),
  time: z.string().min(1, "A time is required"),
  notes: z.string().optional(),
  customDescription: z.string().optional(),
});

const TIME_SLOTS = ["08:00","09:00","10:00","11:00","13:00","14:00","15:00","16:00"];

function adminHeaders() {
  const token = localStorage.getItem("admin_token") ?? "";
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function AdminBookAppointment() {
  const { toast } = useToast();
  const { data: services, isLoading: loadingServices } = useListServices();
  const [isSuccess, setIsSuccess] = useState(false);
  const [lastBooking, setLastBooking] = useState<{ ownerName: string; petName: string; date: string; time: string } | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ownerName: "", ownerEmail: "", ownerPhone: "",
      petName: "", petType: "", notes: "", customDescription: "",
    },
  });

  const selectedServiceId = form.watch("serviceId");
  const selectedService = services?.find(s => s.id === selectedServiceId);
  const needsDescription = selectedService?.allowCustomDescription === true;

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const res = await fetch(`${basePath}/api/appointments`, {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify({
          ownerName: values.ownerName,
          ownerEmail: values.ownerEmail,
          ownerPhone: values.ownerPhone,
          petName: values.petName,
          petType: values.petType,
          serviceId: values.serviceId,
          date: format(values.date, "yyyy-MM-dd"),
          time: values.time,
          notes: values.notes || undefined,
          customDescription: values.customDescription || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setLastBooking({
        ownerName: values.ownerName,
        petName: values.petName,
        date: format(values.date, "EEEE, MMMM d, yyyy"),
        time: values.time,
      });
      setIsSuccess(true);
    } catch {
      toast({ title: "Error", description: "Failed to book appointment.", variant: "destructive" });
    }
  };

  if (isSuccess && lastBooking) {
    return (
      <AdminLayout>
        <div className="max-w-lg mx-auto text-center py-16">
          <div className="h-20 w-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Appointment Booked</h2>
          <p className="text-slate-500 mb-6">
            <strong>{lastBooking.petName}</strong> for <strong>{lastBooking.ownerName}</strong><br />
            {lastBooking.date} at {lastBooking.time}
          </p>
          <p className="text-xs text-slate-400 mb-8">No confirmation email was sent — this is a staff booking.</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => { setIsSuccess(false); form.reset(); }}>Book Another</Button>
            <Button variant="outline" onClick={() => window.location.href = `${basePath}/admin/appointments`}>
              View Appointments
            </Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Book Appointment</h1>
          <p className="text-slate-500 text-sm mt-1">Book on behalf of a customer — no confirmation email will be sent.</p>
        </div>

        <Card>
          <CardHeader className="bg-slate-50/50 border-b">
            <CardTitle>Appointment Details</CardTitle>
            <CardDescription>Fill in the customer and pet information</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

                {/* Pet */}
                <div className="space-y-4">
                  <h3 className="font-semibold border-b pb-2">Pet Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="petName" render={({ field }) => (
                      <FormItem><FormLabel>Pet Name</FormLabel><FormControl><Input placeholder="Max" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="petType" render={({ field }) => (
                      <FormItem><FormLabel>Pet Type / Breed</FormLabel><FormControl><Input placeholder="Dog / Golden Retriever" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                </div>

                {/* Service */}
                <div className="space-y-4">
                  <h3 className="font-semibold border-b pb-2">Service</h3>
                  <FormField control={form.control} name="serviceId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service</FormLabel>
                      <Select disabled={loadingServices} onValueChange={(val) => field.onChange(Number(val))}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select a service" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {services?.filter(s => s.isActive).map(s => (
                            <SelectItem key={s.id} value={s.id.toString()}>
                              {s.name} ({s.duration} min) — {s.price.toLocaleString()} kr.
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  {needsDescription && (
                    <FormField control={form.control} name="customDescription" render={({ field }) => (
                      <FormItem><FormLabel>Description / Reason</FormLabel><FormControl><Textarea rows={3} className="resize-none" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  )}
                </div>

                {/* Date & Time */}
                <div className="space-y-4">
                  <h3 className="font-semibold border-b pb-2">Date & Time</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="date" render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange}
                              disabled={(date) => date < new Date(new Date().setHours(0,0,0,0)) || date.getDay() === 0 || date.getDay() === 6}
                              initialFocus />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="time" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Time</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select time" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {TIME_SLOTS.map(t => (
                              <SelectItem key={t} value={t}>
                                <div className="flex items-center gap-2"><Clock className="h-4 w-4 opacity-50" />{t}</div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>

                {/* Owner */}
                <div className="space-y-4">
                  <h3 className="font-semibold border-b pb-2">Owner Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="ownerName" render={({ field }) => (
                      <FormItem className="md:col-span-2"><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="Jón Jónsson" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="ownerEmail" render={({ field }) => (
                      <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="jon@example.is" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="ownerPhone" render={({ field }) => (
                      <FormItem><FormLabel>Phone</FormLabel><FormControl><Input type="tel" placeholder="555 1234" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="notes" render={({ field }) => (
                      <FormItem className="md:col-span-2"><FormLabel>Staff Notes <span className="text-muted-foreground font-normal">(optional)</span></FormLabel><FormControl><Textarea placeholder="Internal notes about this booking…" className="resize-none" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                </div>

                <Button type="submit" className="w-full h-12 text-base" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Booking…" : "Book Appointment"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
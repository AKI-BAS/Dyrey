import { useState } from "react";
import { Link, useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon, CheckCircle2, Clock } from "lucide-react";
import { useCreateAppointment, useListServices } from "@workspace/api-client-react";
import { useT } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  ownerName: z.string().min(2, "Name is required"),
  ownerEmail: z.string().email("Valid email is required"),
  ownerPhone: z.string().min(6, "Phone number is required"),
  petName: z.string().min(1, "Pet's name is required"),
  petType: z.string().min(1, "Pet type is required"),
  serviceId: z.coerce.number().min(1, "Please select a service"),
  date: z.date({ required_error: "A date is required" }),
  time: z.string().min(1, "A time is required"),
  notes: z.string().optional(),
  customDescription: z.string().optional(),
});

const TIME_SLOTS = [
  "08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"
];

export default function BookAppointment() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const t = useT();
  const { data: services, isLoading: loadingServices } = useListServices();
  const createAppointment = useCreateAppointment();
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ownerName: "",
      ownerEmail: "",
      ownerPhone: "",
      petName: "",
      petType: "",
      notes: "",
      customDescription: "",
    },
  });

  const selectedServiceId = form.watch("serviceId");
  const selectedService = services?.find(s => s.id === selectedServiceId);
  const needsDescription = selectedService?.allowCustomDescription === true;

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      await createAppointment.mutateAsync({
        data: {
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
        },
      });
      setIsSuccess(true);
    } catch {
      toast({
        title: "Error",
        description: "Failed to book appointment. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isSuccess) {
    return (
      <div className="container mx-auto px-4 py-20 text-center max-w-lg">
        <div className="h-20 w-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <h2 className="text-3xl font-bold mb-4">{t("book_success_title")}</h2>
        <p className="text-muted-foreground mb-8 text-lg">
          {t("book_success_desc")}
        </p>
        <Link href="/appointments">
          <Button size="lg">{t("book_success_btn")}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight mb-4">{t("book_title")}</h1>
          <p className="text-muted-foreground text-lg">{t("book_subtitle")}</p>
        </div>

        <Card className="border shadow-sm">
          <CardHeader className="bg-slate-50/50 border-b pb-6">
            <CardTitle>{t("book_card_title")}</CardTitle>
            <CardDescription>{t("book_card_desc")}</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {/* Pet Information */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">{t("book_section1")}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="petName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("book_petName")}</FormLabel>
                          <FormControl>
                            <Input placeholder="Max" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="petType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("book_petType")}</FormLabel>
                          <FormControl>
                            <Input placeholder="Dog / Golden Retriever" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Service Selection */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">{t("book_section2")}</h3>
                  <FormField
                    control={form.control}
                    name="serviceId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("book_reason")}</FormLabel>
                        <Select
                          disabled={loadingServices}
                          onValueChange={(val) => field.onChange(Number(val))}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t("book_selectService")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {services?.filter(s => s.isActive).map((service) => (
                              <SelectItem key={service.id} value={service.id.toString()}>
                                {service.name} ({service.duration} min) — {service.price.toLocaleString()} kr.
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {needsDescription && (
                    <FormField
                      control={form.control}
                      name="customDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("book_describeReason")}</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder={t("book_describePlaceholder")}
                              className="resize-none"
                              rows={3}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                {/* Date & Time */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">{t("book_section3")}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>{t("book_date")}</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? format(field.value, "PPP") : <span>{t("book_pickDate")}</span>}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  date < new Date(new Date().setHours(0, 0, 0, 0)) ||
                                  date.getDay() === 0 ||
                                  date.getDay() === 6
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("book_timeSlot")}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t("book_selectTime")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {TIME_SLOTS.map((time) => (
                                <SelectItem key={time} value={time}>
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 opacity-50" /> {time}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Owner Information */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">{t("book_section4")}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="ownerName"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>{t("book_fullName")}</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="ownerEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("book_email")}</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="john@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="ownerPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("book_phone")}</FormLabel>
                          <FormControl>
                            <Input type="tel" placeholder="+354 123 4567" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>
                            {t("book_notes")} <span className="text-muted-foreground font-normal">{t("book_notes_optional")}</span>
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder={t("book_notes_placeholder")}
                              className="resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full h-12 text-base" disabled={createAppointment.isPending}>
                  {createAppointment.isPending ? t("book_submitting") : t("book_submit")}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { Link } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ShoppingCart, Trash2, ArrowRight, Minus, Plus, CheckCircle2, Truck, Store, CreditCard, Banknote } from "lucide-react";
import { useCreateOrder } from "@workspace/api-client-react";
import { useCart } from "@/hooks/use-cart";
import { useT } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const formSchema = z.object({
  customerName: z.string().min(2, "Name is required"),
  customerEmail: z.string().email("Valid email is required"),
  customerPhone: z.string().optional(),
  deliveryAddress: z.string().optional(),
});

export default function Cart() {
  const { toast } = useToast();
  const t = useT();
  const { items, removeItem, updateQuantity, clearCart, totalPrice, totalItems } = useCart();
  const [isSuccess, setIsSuccess] = useState(false);
  const [fulfillment, setFulfillment] = useState<"pickup" | "delivery">("pickup");
  const [paymentMethod, setPaymentMethod] = useState<"online" | "pickup">("pickup");
  const [deliveryFee, setDeliveryFee] = useState(500);
// delivery fee loaded from API
const [deliveryFee, setDeliveryFee] = useState(500);

  const createOrder = useCreateOrder();

  useEffect(() => {
    fetch(`${basePath}/api/orders/delivery-fee`)
      .then(r => r.json())
      .then(d => setDeliveryFee(d.deliveryFee))
      .catch(() => {});
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { customerName: "", customerEmail: "", customerPhone: "", deliveryAddress: "" },
  });

  const grandTotal = totalPrice + (fulfillment === "delivery" ? deliveryFee : 0);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (items.length === 0) return;
    if (fulfillment === "delivery" && !values.deliveryAddress?.trim()) {
      form.setError("deliveryAddress", { message: "Delivery address is required" });
      return;
    }
    try {
      await createOrder.mutateAsync({
        data: {
          customerName: values.customerName,
          customerEmail: values.customerEmail,
          customerPhone: values.customerPhone,
          items: items.map(item => ({ productId: item.product.id, quantity: item.quantity })),
          // @ts-ignore — extra fields passed through
          fulfillmentType: fulfillment,
          paymentMethod,
          deliveryAddress: fulfillment === "delivery" ? values.deliveryAddress : undefined,
        },
      });
      setIsSuccess(true);
      clearCart();
    } catch {
      toast({ title: "Error", description: "Failed to place order. Please try again.", variant: "destructive" });
    }
  };

  if (isSuccess) {
    return (
      <div className="container mx-auto px-4 py-20 text-center max-w-lg">
        <div className="h-20 w-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <h2 className="text-3xl font-bold mb-4">{t("cart_success_title")}</h2>
        <p className="text-muted-foreground mb-2 text-lg">{t("cart_success_desc")}</p>
        {paymentMethod === "online" && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
            You selected online payment — we will contact you shortly to confirm payment.
          </p>
        )}
        <Link href="/shop">
          <Button size="lg">{t("cart_continue")}</Button>
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-20 text-center max-w-lg">
        <ShoppingCart className="h-16 w-16 mx-auto text-muted-foreground opacity-50 mb-6" />
        <h2 className="text-2xl font-bold mb-4">{t("cart_empty_title")}</h2>
        <p className="text-muted-foreground mb-8">{t("cart_empty_desc")}</p>
        <Link href="/shop"><Button size="lg">{t("cart_browse")}</Button></Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <h1 className="text-3xl font-bold tracking-tight mb-8">{t("cart_title")}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Cart items */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="hidden sm:grid sm:grid-cols-12 gap-4 p-4 border-b bg-slate-50/50 text-sm font-medium text-muted-foreground">
              <div className="col-span-6">{t("cart_product")}</div>
              <div className="col-span-3 text-center">{t("cart_quantity")}</div>
              <div className="col-span-2 text-right">{t("cart_total")}</div>
              <div className="col-span-1"></div>
            </div>
            <ul className="divide-y">
              {items.map(item => (
                <li key={item.product.id} className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                  <div className="sm:col-span-6 flex gap-4 items-center">
                    <div className="h-20 w-20 rounded-md border bg-slate-50 flex items-center justify-center shrink-0 overflow-hidden">
                      {item.product.imageUrl
                        ? <img src={item.product.imageUrl} alt={item.product.name} className="h-full w-full object-contain p-2" />
                        : <ShoppingCart className="h-8 w-8 text-slate-300" />}
                    </div>
                    <div>
                      <h3 className="font-medium line-clamp-2">
                        <Link href={`/shop/${item.product.id}`} className="hover:underline">{item.product.name}</Link>
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">{item.product.price.toLocaleString()} kr.</p>
                    </div>
                  </div>
                  <div className="sm:col-span-3 flex justify-center">
                    <div className="flex items-center border rounded-md h-10 w-28 bg-background">
                      <button className="px-2 flex items-center justify-center text-muted-foreground hover:text-foreground" onClick={() => updateQuantity(item.product.id, Math.max(1, item.quantity - 1))}>
                        <Minus className="h-3 w-3" />
                      </button>
                      <div className="flex-1 text-center text-sm font-medium">{item.quantity}</div>
                      <button className="px-2 flex items-center justify-center text-muted-foreground hover:text-foreground" onClick={() => updateQuantity(item.product.id, item.quantity + 1)}>
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <div className="sm:col-span-2 text-right font-medium">{(item.product.price * item.quantity).toLocaleString()} kr.</div>
                  <div className="sm:col-span-1 flex justify-end">
                    <Button variant="ghost" size="icon" onClick={() => removeItem(item.product.id)} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Order summary + form */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24 shadow-sm border-border">
            <CardContent className="p-6 space-y-6">
              <h2 className="text-xl font-bold">{t("cart_summary")}</h2>

              {/* Fulfillment */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Fulfillment</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setFulfillment("pickup")} className={cn("flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-colors", fulfillment === "pickup" ? "border-primary bg-primary/5 text-primary" : "border-slate-200 text-slate-600 hover:border-slate-300")}>
                    <Store className="h-4 w-4" /> Pickup
                  </button>
                  <button onClick={() => setFulfillment("delivery")} className={cn("flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-colors", fulfillment === "delivery" ? "border-primary bg-primary/5 text-primary" : "border-slate-200 text-slate-600 hover:border-slate-300")}>
                    <Truck className="h-4 w-4" /> Delivery
                  </button>
                </div>
                {fulfillment === "delivery" && (
                  <p className="text-xs text-slate-500">Delivery fee: {deliveryFee.toLocaleString()} kr.</p>
                )}
              </div>

              {/* Payment */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Payment</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setPaymentMethod("pickup")} className={cn("flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-colors", paymentMethod === "pickup" ? "border-primary bg-primary/5 text-primary" : "border-slate-200 text-slate-600 hover:border-slate-300")}>
                    <Banknote className="h-4 w-4" /> On Pickup
                  </button>
                  <button onClick={() => setPaymentMethod("online")} className={cn("flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-colors", paymentMethod === "online" ? "border-primary bg-primary/5 text-primary" : "border-slate-200 text-slate-600 hover:border-slate-300")}>
                    <CreditCard className="h-4 w-4" /> Online
                  </button>
                </div>
                {paymentMethod === "online" && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">Online payment coming soon — we'll contact you to confirm.</p>
                )}
              </div>

              {/* Totals */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal ({totalItems} items)</span>
                  <span>{totalPrice.toLocaleString()} kr.</span>
                </div>
                {fulfillment === "delivery" && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Delivery fee</span>
                    <span>{deliveryFee.toLocaleString()} kr.</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span>{grandTotal.toLocaleString()} kr.</span>
                </div>
              </div>

              {/* Customer form */}
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                  <FormField control={form.control} name="customerName" render={({ field }) => (
                    <FormItem><FormLabel>{t("cart_name")}</FormLabel><FormControl><Input placeholder="Jón Jónsson" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="customerEmail" render={({ field }) => (
                    <FormItem><FormLabel>{t("cart_email")}</FormLabel><FormControl><Input type="email" placeholder="jon@example.is" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="customerPhone" render={({ field }) => (
                    <FormItem><FormLabel>{t("cart_phone")} <span className="text-muted-foreground font-normal">(optional)</span></FormLabel><FormControl><Input type="tel" placeholder="555 1234" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  {fulfillment === "delivery" && (
                    <FormField control={form.control} name="deliveryAddress" render={({ field }) => (
                      <FormItem><FormLabel>Delivery Address *</FormLabel><FormControl><Input placeholder="Strandgata 1, Akureyri" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  )}
                  <Button type="submit" className="w-full h-12 text-base font-medium" disabled={createOrder.isPending}>
                    {createOrder.isPending ? "Placing order…" : "Place Order"}
                    {!createOrder.isPending && <ArrowRight className="ml-2 h-4 w-4" />}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
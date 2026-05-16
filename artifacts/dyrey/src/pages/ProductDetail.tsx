import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useGetProduct, getGetProductQueryKey } from "@workspace/api-client-react";
import { ArrowLeft, Minus, Plus, ShoppingCart, Package, Bell, Tag, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
import { useT } from "@/hooks/use-language";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function NotifyMeForm({ productId }: { productId: number }) {
  const t = useT();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${basePath}/api/products/${productId}/notify-me`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error();
      setDone(true);
      toast({ title: t("product_notifyDone"), description: t("product_notifyDoneDesc") });
    } catch {
      toast({ title: "Error", description: t("product_notifyError"), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
        <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
        <div>
          <p className="text-sm font-medium text-green-800">{t("product_notifyDone")}</p>
          <p className="text-xs text-green-600 mt-0.5">{t("product_notifyDoneDesc")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold">{t("product_notifyTitle")}</p>
      </div>
      <p className="text-xs text-muted-foreground">{t("product_notifyDesc")}</p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          type="email"
          placeholder={t("product_notifyPlaceholder")}
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="flex-1 h-9 text-sm"
        />
        <Button type="submit" size="sm" disabled={submitting || !email} className="h-9">
          {submitting ? "…" : t("product_notifyBtn")}
        </Button>
      </form>
    </div>
  );
}

export default function ProductDetail() {
  const [, params] = useRoute("/shop/:id");
  const productId = params?.id ? parseInt(params.id, 10) : undefined;
  const { toast } = useToast();
  const t = useT();
  const [quantity, setQuantity] = useState(1);
  const addItem = useCart((state) => state.addItem);

  const { data: product, isLoading } = useGetProduct(productId!, {
    query: { enabled: !!productId && !isNaN(productId), queryKey: getGetProductQueryKey(productId!) }
  });

  const handleAddToCart = () => {
    if (!product) return;
    addItem(product, quantity);
    toast({ title: t("product_addedToCart"), description: `${quantity}× ${product.name} ${t("product_addedDesc")}` });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <Link href="/shop" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary mb-8 transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" /> {t("product_back")}
        </Link>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <div className="space-y-6">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-8 w-1/4" />
            <div className="space-y-2 pt-6">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <Skeleton className="h-12 w-full mt-8" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <Package className="h-16 w-16 mx-auto text-muted-foreground opacity-50 mb-6" />
        <h2 className="text-2xl font-bold mb-2">{t("product_notFound")}</h2>
        <p className="text-muted-foreground mb-8">{t("product_notFound_desc")}</p>
        <Link href="/shop"><Button>{t("product_returnShop")}</Button></Link>
      </div>
    );
  }

  const hasDiscount = (product.discountPercent ?? 0) > 0;
  const discountedPrice = hasDiscount
    ? product.price * (1 - (product.discountPercent ?? 0) / 100)
    : product.price;

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <Link href="/shop" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary mb-8 transition-colors">
        <ArrowLeft className="mr-2 h-4 w-4" /> {t("product_back")}
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
        {/* Image */}
        <div className="bg-white rounded-xl p-8 shadow-sm border overflow-hidden relative">
          <div className="aspect-square relative">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-300 rounded-lg">
                <Package className="h-24 w-24" />
              </div>
            )}
          </div>
          {!product.inStock && (
            <div className="absolute inset-0 bg-slate-900/35 flex items-center justify-center rounded-xl">
              <div className="bg-slate-900 text-white font-bold px-6 py-2 rounded-lg -rotate-12 shadow-xl tracking-wide text-lg">
                {t("product_outOfStock")}
              </div>
            </div>
          )}
          {hasDiscount && product.inStock && (
            <div className="absolute top-3 left-3 bg-red-500 text-white text-sm font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-md">
              <Tag className="h-3.5 w-3.5" /> -{product.discountPercent}% {t("product_off")}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex flex-col">
          <div className="text-sm font-medium text-primary mb-2 uppercase tracking-wider">{product.category}</div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">{product.name}</h1>

          {/* Price */}
          {hasDiscount ? (
            <div className="flex items-baseline gap-3 mb-6">
              <span className="text-3xl font-bold text-red-600">{Math.round(discountedPrice).toLocaleString()} kr.</span>
              <span className="text-xl text-muted-foreground line-through">{product.price.toLocaleString()} kr.</span>
              <span className="text-sm font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded">-{product.discountPercent}%</span>
            </div>
          ) : (
            <div className="text-2xl font-semibold mb-6">{product.price.toLocaleString()} kr.</div>
          )}

          <div className="prose prose-slate dark:prose-invert mb-8">
            <p className="text-slate-600 dark:text-slate-300 text-lg leading-relaxed">{product.description}</p>
          </div>

          <div className="border-t pt-8 mt-auto space-y-4">
            {product.inStock ? (
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex items-center border rounded-md h-12 w-full sm:w-32 bg-background">
                  <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-50"
                    disabled={quantity <= 1}>
                    <Minus className="h-4 w-4" />
                  </button>
                  <div className="flex-1 text-center font-medium">{quantity}</div>
                  <button type="button" onClick={() => setQuantity(quantity + 1)}
                    className="px-3 flex items-center justify-center text-muted-foreground hover:text-foreground">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <Button size="lg" className="flex-1 h-12 gap-2" onClick={handleAddToCart}>
                  <ShoppingCart className="h-5 w-5" />
                  {t("product_addToCart")}
                </Button>
              </div>
            ) : (
              <NotifyMeForm productId={product.id} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

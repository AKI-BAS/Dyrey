import { useState } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { useGetProduct, getGetProductQueryKey } from "@workspace/api-client-react";
import { ArrowLeft, Minus, Plus, ShoppingCart, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";

export default function ProductDetail() {
  const [, params] = useRoute("/shop/:id");
  const productId = params?.id ? parseInt(params.id, 10) : undefined;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [quantity, setQuantity] = useState(1);
  const addItem = useCart((state) => state.addItem);

  const { data: product, isLoading } = useGetProduct(productId!, {
    query: {
      enabled: !!productId && !isNaN(productId),
      queryKey: getGetProductQueryKey(productId!)
    }
  });

  const handleAddToCart = () => {
    if (!product) return;
    addItem(product, quantity);
    toast({
      title: "Added to cart",
      description: `${quantity}x ${product.name} added to your cart.`,
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <Link href="/shop" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary mb-8 transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Shop
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
        <h2 className="text-2xl font-bold mb-2">Product not found</h2>
        <p className="text-muted-foreground mb-8">The product you're looking for doesn't exist or has been removed.</p>
        <Link href="/shop">
          <Button>Return to Shop</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <Link href="/shop" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary mb-8 transition-colors">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Shop
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
        <div className="bg-white rounded-xl p-8 shadow-sm border overflow-hidden relative">
          <div className="aspect-square relative">
            {product.imageUrl ? (
              <img 
                src={product.imageUrl} 
                alt={product.name} 
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-300 rounded-lg">
                <Package className="h-24 w-24" />
              </div>
            )}
          </div>
          {!product.inStock && (
            <div className="absolute top-4 right-4 bg-destructive text-destructive-foreground font-semibold px-3 py-1.5 rounded-md shadow-sm">
              Out of Stock
            </div>
          )}
        </div>

        <div className="flex flex-col">
          <div className="text-sm font-medium text-primary mb-2 uppercase tracking-wider">{product.category}</div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">{product.name}</h1>
          <div className="text-2xl font-semibold mb-6">{product.price.toLocaleString()} kr.</div>
          
          <div className="prose prose-slate dark:prose-invert mb-8">
            <p className="text-slate-600 dark:text-slate-300 text-lg leading-relaxed">{product.description}</p>
          </div>

          <div className="border-t pt-8 mt-auto">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center border rounded-md h-12 w-full sm:w-32 bg-background">
                <button 
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-50"
                  disabled={quantity <= 1 || !product.inStock}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <div className="flex-1 text-center font-medium">{quantity}</div>
                <button 
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-3 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-50"
                  disabled={!product.inStock}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              
              <Button 
                size="lg" 
                className="flex-1 h-12 gap-2"
                onClick={handleAddToCart}
                disabled={!product.inStock}
              >
                <ShoppingCart className="h-5 w-5" />
                {product.inStock ? 'Add to Cart' : 'Out of Stock'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

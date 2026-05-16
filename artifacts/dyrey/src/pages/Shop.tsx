import { useState } from "react";
import { Link } from "wouter";
import { useListProducts, useListProductCategories } from "@workspace/api-client-react";
import { Search, Package, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export default function Shop() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | undefined>(undefined);

  const { data: products, isLoading: loadingProducts } = useListProducts(
    { search: search || undefined, category },
    { query: { keepPreviousData: true } }
  );

  const { data: categories, isLoading: loadingCategories } = useListProductCategories();

  const handleCategoryClick = (cat: string | undefined) => {
    setCategory(cat === category ? undefined : cat);
  };

  const SidebarContent = () => (
    <div className="space-y-6">
      <div>
        <h3 className="font-medium text-lg mb-4">Categories</h3>
        {loadingCategories ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : (
          <div className="space-y-1">
            <Button
              variant={category === undefined ? "secondary" : "ghost"}
              className="w-full justify-start font-normal"
              onClick={() => handleCategoryClick(undefined)}
            >
              All Products
            </Button>
            {categories?.map((cat) => (
              <Button
                key={cat.name}
                variant={category === cat.name ? "secondary" : "ghost"}
                className="w-full justify-start font-normal flex justify-between"
                onClick={() => handleCategoryClick(cat.name)}
              >
                <span>{cat.name}</span>
                <Badge variant="outline" className="ml-auto bg-background">{cat.count}</Badge>
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-4">Pet Shop</h1>
        <p className="text-muted-foreground max-w-3xl text-lg">
          High-quality nutrition, toys, and care products for your pets.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Desktop Sidebar */}
        <aside className="hidden md:block w-64 shrink-0">
          <div className="sticky top-24">
            <SidebarContent />
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="md:hidden w-full sm:w-auto">
                  <Filter className="h-4 w-4 mr-2" />
                  Filters {category && "(1)"}
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  <SidebarContent />
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {loadingProducts ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="overflow-hidden border-none shadow-sm">
                  <Skeleton className="h-48 w-full rounded-none" />
                  <CardContent className="p-4">
                    <Skeleton className="h-4 w-20 mb-2" />
                    <Skeleton className="h-6 w-full mb-4" />
                    <Skeleton className="h-5 w-24" />
                  </CardContent>
                </Card>
              ))
            ) : products?.length === 0 ? (
              <div className="col-span-full py-12 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
                <h3 className="text-lg font-medium">No products found</h3>
                <p className="text-muted-foreground">Try adjusting your filters or search query.</p>
              </div>
            ) : (
              products?.map((product) => (
                <Link key={product.id} href={`/shop/${product.id}`}>
                  <Card className="overflow-hidden border-none shadow-sm hover:shadow-md transition-all group h-full flex flex-col cursor-pointer bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="aspect-square relative overflow-hidden bg-white p-6">
                      {product.imageUrl ? (
                        <img 
                          src={product.imageUrl} 
                          alt={product.name} 
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-100 rounded-md text-slate-400">
                          <Package className="h-12 w-12 opacity-50" />
                        </div>
                      )}
                      {!product.inStock && (
                        <div className="absolute top-2 right-2 bg-destructive text-destructive-foreground text-xs font-semibold px-2 py-1 rounded">
                          Out of Stock
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4 flex-1 flex flex-col">
                      <div className="text-xs text-primary font-medium mb-1">{product.category}</div>
                      <h3 className="font-medium text-base mb-2 line-clamp-2 flex-1">{product.name}</h3>
                      <div className="font-semibold text-lg">{product.price.toLocaleString()} kr.</div>
                    </CardContent>
                  </Card>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

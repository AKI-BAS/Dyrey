import { Link } from "wouter";
import { ArrowRight, Calendar, Heart, ShieldPlus, ShoppingBag, Clock, Package } from "lucide-react";
import { motion } from "framer-motion";
import { useListServices, useListFeaturedProducts } from "@workspace/api-client-react";
import { useT } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const t = useT();
  const { data: services, isLoading: loadingServices } = useListServices();
  const { data: featuredProducts, isLoading: loadingProducts } = useListFeaturedProducts();

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-sky-50 dark:bg-slate-900/40">
        <div className="absolute inset-0 bg-[url('/hero-vet.jpg')] bg-cover bg-center opacity-10 mix-blend-multiply pointer-events-none" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32 relative">
          <div className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 dark:text-white mb-6">
                {t("home_hero_title")}
              </h1>
              <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">
                {t("home_hero_subtitle")}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/book">
                  <Button size="lg" className="w-full sm:w-auto h-12 px-8 text-base">
                    {t("home_hero_book")}
                  </Button>
                </Link>
                <Link href="/shop">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto h-12 px-8 text-base bg-white/50 backdrop-blur-sm hover:bg-white/80">
                    {t("home_hero_shop")}
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-12 border-y bg-white dark:bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x border-border">
            <div className="flex flex-col items-center p-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
                <Heart className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{t("home_trust_staff_title")}</h3>
              <p className="text-muted-foreground text-sm">{t("home_trust_staff_desc")}</p>
            </div>
            <div className="flex flex-col items-center p-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
                <ShieldPlus className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{t("home_trust_clinic_title")}</h3>
              <p className="text-muted-foreground text-sm">{t("home_trust_clinic_desc")}</p>
            </div>
            <div className="flex flex-col items-center p-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
                <Clock className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{t("home_trust_booking_title")}</h3>
              <p className="text-muted-foreground text-sm">{t("home_trust_booking_desc")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Services Overview */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight mb-4">{t("home_services_title")}</h2>
              <p className="text-muted-foreground max-w-2xl">{t("home_services_desc")}</p>
            </div>
            <Link href="/book">
              <Button variant="outline" className="gap-2">
                {t("home_services_link")} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loadingServices ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="border-none shadow-sm">
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))
            ) : (
              services?.slice(0, 6).map((service) => (
                <Card key={service.id} className="border-none shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-xl">{service.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Clock className="h-4 w-4" /> {service.duration} min
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-600 dark:text-slate-400 line-clamp-3">
                      {service.description}
                    </p>
                  </CardContent>
                  <CardFooter>
                    <span className="font-medium text-primary">{service.price.toLocaleString()} kr.</span>
                  </CardFooter>
                </Card>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight mb-4">{t("home_products_title")}</h2>
              <p className="text-muted-foreground max-w-2xl">{t("home_products_desc")}</p>
            </div>
            <Link href="/shop">
              <Button variant="outline" className="gap-2">
                {t("home_products_link")} <ShoppingBag className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {loadingProducts ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="overflow-hidden border-none shadow-sm">
                  <Skeleton className="h-48 w-full rounded-none" />
                  <CardContent className="p-4">
                    <Skeleton className="h-4 w-20 mb-2" />
                    <Skeleton className="h-6 w-full mb-4" />
                    <Skeleton className="h-5 w-24" />
                  </CardContent>
                </Card>
              ))
            ) : (
              featuredProducts?.map((product) => (
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
      </section>
    </div>
  );
}

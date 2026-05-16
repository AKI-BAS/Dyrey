import { Link, useLocation } from "wouter";
import { ShoppingCart, Menu, Home, Package, CalendarDays, CalendarIcon, LogIn, LogOut, User, ChevronDown, PawPrint } from "lucide-react";
import { useState } from "react";
import { useClerk, useUser } from "@clerk/react";
import logoPath from "@assets/image_1778924453421.png";
import { useCart } from "@/hooks/use-cart";
import { useLanguage, useT } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function LanguageToggle() {
  const { lang, setLang } = useLanguage();
  return (
    <div className="flex items-center rounded-full border border-border overflow-hidden text-xs font-bold shrink-0">
      <button
        onClick={() => setLang("is")}
        className={`px-2.5 py-1 transition-colors ${lang === "is" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
      >
        IS
      </button>
      <button
        onClick={() => setLang("en")}
        className={`px-2.5 py-1 transition-colors ${lang === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
      >
        EN
      </button>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const items = useCart((state) => state.items);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const t = useT();

  const navigation = [
    { name: t("nav_home"), href: "/", icon: Home },
    { name: t("nav_shop"), href: "/shop", icon: Package },
    { name: t("nav_book"), href: "/book", icon: CalendarIcon },
    { name: t("nav_appointments"), href: "/appointments", icon: CalendarDays },
    { name: t("nav_orders"), href: "/orders", icon: Package },
  ];

  const handleSignOut = () => {
    signOut({ redirectUrl: `${basePath}/` });
  };

  const UserSection = () => {
    if (!isLoaded) return null;

    if (!user) {
      return (
        <Link href="/sign-in">
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-primary">
            <LogIn className="h-4 w-4" />
            <span className="hidden sm:inline">{t("nav_signIn")}</span>
          </Button>
        </Link>
      );
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-primary max-w-[160px]">
            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="hidden sm:inline truncate text-sm">
              {user.firstName ?? user.emailAddresses[0]?.emailAddress?.split("@")[0]}
            </span>
            <ChevronDown className="h-3 w-3 shrink-0 hidden sm:inline" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <div className="px-3 py-2">
            <p className="text-sm font-medium text-foreground truncate">
              {user.fullName ?? user.emailAddresses[0]?.emailAddress?.split("@")[0]}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user.emailAddresses[0]?.emailAddress}
            </p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/pets" className="cursor-pointer">
              <PawPrint className="h-4 w-4 mr-2" /> {t("nav_myPets")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/appointments" className="cursor-pointer">
              <CalendarDays className="h-4 w-4 mr-2" /> {t("nav_myAppointments")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/orders" className="cursor-pointer">
              <Package className="h-4 w-4 mr-2" /> {t("nav_myOrders")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive cursor-pointer">
            <LogOut className="h-4 w-4 mr-2" /> {t("nav_signOut")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground font-sans">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between">
            {/* Left: hamburger + logo */}
            <div className="flex items-center gap-3">
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" className="md:hidden mr-1 -ml-2" size="icon">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px] sm:w-[400px]">
                  <nav className="flex flex-col gap-4 mt-8">
                    {navigation.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                            location === item.href
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {item.name}
                        </Link>
                      );
                    })}
                    {user && (
                      <Link
                        href="/pets"
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          location === "/pets" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                        }`}
                      >
                        <PawPrint className="h-4 w-4" />
                        {t("nav_myPets")}
                      </Link>
                    )}
                    <div className="border-t pt-4 mt-2 space-y-3">
                      {user ? (
                        <button
                          onClick={() => { handleSignOut(); setMobileOpen(false); }}
                          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors w-full"
                        >
                          <LogOut className="h-4 w-4" /> {t("nav_signOut")}
                        </button>
                      ) : (
                        <Link
                          href="/sign-in"
                          onClick={() => setMobileOpen(false)}
                          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium hover:bg-muted transition-colors"
                        >
                          <LogIn className="h-4 w-4" /> {t("nav_signIn")}
                        </Link>
                      )}
                    </div>
                  </nav>
                </SheetContent>
              </Sheet>

              <Link href="/" className="flex items-center gap-3">
                <img src={logoPath} alt="Dýrey Logo" className="h-14 w-auto" />
                <span className="font-bold text-xl tracking-tight hidden sm:inline-block">Dýrey</span>
              </Link>
            </div>

            {/* Centre: desktop nav */}
            <nav className="hidden md:flex items-center gap-6">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    location === item.href ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* Right: lang toggle + user + cart */}
            <div className="flex items-center gap-2">
              <LanguageToggle />
              <UserSection />
              <Link href="/cart">
                <Button variant="ghost" size="icon" className="relative">
                  <ShoppingCart className="h-5 w-5" />
                  {totalItems > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-primary text-primary-foreground border-background">
                      {totalItems}
                    </Badge>
                  )}
                  <span className="sr-only">Shopping Cart</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {children}
      </main>

      <footer className="border-t bg-muted/40 py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <img src={logoPath} alt="Dýrey Logo" className="h-10 w-auto grayscale opacity-70" />
                <span className="font-semibold text-muted-foreground">Dýrey</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("footer_tagline")}
              </p>
            </div>

            <div>
              <h3 className="font-medium mb-4">{t("footer_clinic")}</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/book" className="hover:text-primary transition-colors">{t("footer_bookAppointment")}</Link></li>
                <li><Link href="/appointments" className="hover:text-primary transition-colors">{t("footer_myAppointments")}</Link></li>
                <li>{t("footer_services")}</li>
                <li>{t("footer_ourTeam")}</li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium mb-4">{t("footer_shop")}</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/shop" className="hover:text-primary transition-colors">{t("footer_allProducts")}</Link></li>
                <li><Link href="/cart" className="hover:text-primary transition-colors">{t("footer_cart")}</Link></li>
                <li><Link href="/orders" className="hover:text-primary transition-colors">{t("footer_orders")}</Link></li>
                <li>{t("footer_shipping")}</li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium mb-4">{t("footer_contact")}</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>info@dyrey.is</li>
                <li>+354 460 0000</li>
                <li>Eyjafjarðarbraut, Akureyri</li>
                <li>{t("footer_hours")}</li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground flex flex-col sm:flex-row justify-between items-center gap-4">
            <p>&copy; {new Date().getFullYear()} Dýralæknaþjónusta Eyjafjarðar ehf. {t("footer_rights")}</p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-primary transition-colors">{t("footer_privacy")}</a>
              <a href="#" className="hover:text-primary transition-colors">{t("footer_terms")}</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

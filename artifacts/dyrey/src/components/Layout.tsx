import { Link, useLocation } from "wouter";
import { ShoppingCart, Menu, X, Calendar as CalendarIcon, Package, Home, CalendarDays } from "lucide-react";
import { useState } from "react";
import logoPath from "@assets/image_1778924453421.png";
import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const items = useCart((state) => state.items);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const navigation = [
    { name: "Home", href: "/", icon: Home },
    { name: "Shop", href: "/shop", icon: Package },
    { name: "Book Appointment", href: "/book", icon: CalendarIcon },
    { name: "My Appointments", href: "/appointments", icon: CalendarDays },
    { name: "Orders", href: "/orders", icon: Package },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground font-sans">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" className="md:hidden mr-2 -ml-2" size="icon">
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
                          key={item.name}
                          href={item.href}
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
                  </nav>
                </SheetContent>
              </Sheet>
              
              <Link href="/" className="flex items-center gap-2">
                <img src={logoPath} alt="Dýrey Logo" className="h-8 w-auto" />
                <span className="font-semibold text-lg tracking-tight hidden sm:inline-block">Dýrey</span>
              </Link>
            </div>

            <nav className="hidden md:flex items-center gap-6">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    location === item.href ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-4">
              <Link href="/cart">
                <Button variant="ghost" size="icon" className="relative">
                  <ShoppingCart className="h-5 w-5" />
                  {totalItems > 0 && (
                    <Badge
                      className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-primary text-primary-foreground border-background"
                    >
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
                <img src={logoPath} alt="Dýrey Logo" className="h-6 w-auto grayscale opacity-70" />
                <span className="font-semibold text-muted-foreground">Dýrey</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Professional veterinary care and quality pet products in Eyjafjörður.
              </p>
            </div>
            
            <div>
              <h3 className="font-medium mb-4">Clinic</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/book" className="hover:text-primary transition-colors">Book Appointment</Link></li>
                <li><Link href="/appointments" className="hover:text-primary transition-colors">My Appointments</Link></li>
                <li>Services</li>
                <li>Our Team</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium mb-4">Shop</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/shop" className="hover:text-primary transition-colors">All Products</Link></li>
                <li><Link href="/cart" className="hover:text-primary transition-colors">Cart</Link></li>
                <li><Link href="/orders" className="hover:text-primary transition-colors">Orders</Link></li>
                <li>Shipping Policy</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium mb-4">Contact</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>info@dyrey.is</li>
                <li>+354 460 0000</li>
                <li>Eyjafjarðarbraut, Akureyri</li>
                <li>Mon-Fri: 08:00 - 17:00</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground flex flex-col sm:flex-row justify-between items-center gap-4">
            <p>&copy; {new Date().getFullYear()} Dýralæknaþjónusta Eyjafjarðar ehf. All rights reserved.</p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-primary transition-colors">Privacy</a>
              <a href="#" className="hover:text-primary transition-colors">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

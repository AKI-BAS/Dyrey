import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import {
  LayoutDashboard,
  Package,
  Stethoscope,
  CalendarDays,
  ShoppingBag,
  LogOut,
  Menu,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/appointments", label: "Appointments", icon: CalendarDays },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/services", label: "Services", icon: Stethoscope },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { href: "/admin/content", label: "Edit Website", icon: Globe },
];

function NavLinks({ onClick }: { onClick?: () => void }) {
  const [location] = useLocation();
  return (
    <nav className="space-y-1">
      {NAV.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} onClick={onClick}>
          <span
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer",
              location === href || location.startsWith(href + "/")
                ? "bg-primary text-primary-foreground"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            )}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            {label}
          </span>
        </Link>
      ))}
    </nav>
  );
}

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      setLocation("/admin");
    }
  }, [setLocation]);

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    setLocation("/admin");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 bg-white border-r shrink-0">
        <div className="p-5 border-b">
          <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-0.5">Staff Portal</p>
          <p className="font-bold text-slate-800 text-sm">Dýrey Veterinary</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <NavLinks />
        </div>
        <div className="p-4 border-t">
          <Button variant="ghost" size="sm" className="w-full justify-start text-slate-600" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b flex items-center justify-between px-4 h-14">
        <p className="font-bold text-sm text-slate-800">Dýrey Staff Portal</p>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon"><Menu className="h-5 w-5" /></Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-60 p-4">
            <p className="font-bold text-slate-800 mb-4">Navigation</p>
            <NavLinks onClick={() => {}} />
            <div className="mt-4 pt-4 border-t">
              <Button variant="ghost" size="sm" className="w-full justify-start text-slate-600" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto md:p-8 p-4 pt-18 md:pt-8">
        {children}
      </main>
    </div>
  );
}

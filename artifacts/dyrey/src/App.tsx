import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/Layout";

// Public pages
import Home from "@/pages/Home";
import Shop from "@/pages/Shop";
import ProductDetail from "@/pages/ProductDetail";
import Cart from "@/pages/Cart";
import BookAppointment from "@/pages/BookAppointment";
import Appointments from "@/pages/Appointments";
import Orders from "@/pages/Orders";
import NotFound from "@/pages/not-found";

// Admin pages
import AdminLogin from "@/pages/admin/AdminLogin";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminAppointments from "@/pages/admin/AdminAppointments";
import AdminProducts from "@/pages/admin/AdminProducts";
import AdminServices from "@/pages/admin/AdminServices";
import AdminOrders from "@/pages/admin/AdminOrders";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function Router() {
  return (
    <Switch>
      {/* Admin routes — no public Layout */}
      <Route path="/admin" component={AdminLogin} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/appointments" component={AdminAppointments} />
      <Route path="/admin/products" component={AdminProducts} />
      <Route path="/admin/services" component={AdminServices} />
      <Route path="/admin/orders" component={AdminOrders} />

      {/* Public routes */}
      <Route>
        <Layout>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/shop" component={Shop} />
            <Route path="/shop/:id" component={ProductDetail} />
            <Route path="/cart" component={Cart} />
            <Route path="/book" component={BookAppointment} />
            <Route path="/appointments" component={Appointments} />
            <Route path="/orders" component={Orders} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

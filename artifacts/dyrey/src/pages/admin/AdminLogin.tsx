import { useState } from "react";
import { useLocation } from "wouter";
import { useAdminLogin } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ShieldCheck, User } from "lucide-react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [step, setStep] = useState<"password" | "staff">("password");
  const [staffList, setStaffList] = useState<{ id: number; name: string }[]>([]);
  const login = useAdminLogin();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const result = await login.mutateAsync({ data: { password } });
      localStorage.setItem("admin_token", result.token);
      // Fetch staff list
      const res = await fetch(`${basePath}/api/admin/staff`, {
        headers: { Authorization: `Bearer ${result.token}` },
      });
      if (res.ok) {
        const staff = await res.json();
        if (staff.length > 0) {
          setStaffList(staff);
          setStep("staff");
        } else {
          setLocation("/admin/dashboard");
        }
      } else {
        setLocation("/admin/dashboard");
      }
    } catch {
      setError("Invalid password. Please try again.");
    }
  };

  const handleSelectStaff = (name: string) => {
    localStorage.setItem("staff_name", name);
    setLocation("/admin/dashboard");
  };

  if (step === "staff") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-sm shadow-lg">
          <CardHeader className="text-center">
            <div className="h-14 w-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <User className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="text-2xl">Who are you?</CardTitle>
            <CardDescription>Select your name to continue</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {staffList.map(s => (
              <Button key={s.id} variant="outline" className="w-full justify-start text-left" onClick={() => handleSelectStaff(s.name)}>
                <User className="h-4 w-4 mr-2 text-slate-400" />
                {s.name}
              </Button>
            ))}
            <Button variant="ghost" className="w-full text-slate-400 text-sm mt-2" onClick={() => { localStorage.removeItem("staff_name"); setLocation("/admin/dashboard"); }}>
              Continue without selecting
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="text-center">
          <div className="h-14 w-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl">Staff Portal</CardTitle>
          <CardDescription>Dýrey Veterinary Hospital — admin access</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Staff Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter staff password"
                autoFocus
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={login.isPending}>
              {login.isPending ? "Signing in…" : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
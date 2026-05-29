import { useQuery } from "@tanstack/react-query";
import { User } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface StaffMember { id: number; name: string; role: string; bio: string | null; photoUrl: string | null }

function useSiteContent() {
  return useQuery<Record<string, string>>({
    queryKey: ["site-content"],
    queryFn: async () => (await fetch(`${BASE}/api/site-content`)).json(),
    staleTime: 60_000,
  });
}

function useStaff() {
  return useQuery<StaffMember[]>({
    queryKey: ["staff-public"],
    queryFn: async () => (await fetch(`${BASE}/api/staff`)).json(),
    staleTime: 60_000,
  });
}

function val(data: Record<string, string> | undefined, key: string, fallback = "") {
  return data?.[key] ?? fallback;
}

export default function About() {
  const { data: content } = useSiteContent();
  const { data: staff } = useStaff();

  const aboutTitle    = val(content, "about_title",    "About Dýrey");
  const aboutBody     = val(content, "about_body",     "Dýrey Veterinary provides compassionate, modern care for animals across Eyjafjörður. Our team of experienced vets and nurses is dedicated to the health and wellbeing of your pets.");

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-4xl space-y-16">

      {/* About section */}
      <section className="space-y-5">
        <h1 className="text-3xl font-bold tracking-tight">{aboutTitle}</h1>
        <div className="prose prose-slate max-w-none text-muted-foreground leading-relaxed whitespace-pre-line">
          {aboutBody}
        </div>
      </section>

      {/* Team section */}
      {staff && staff.length > 0 && (
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Our Team</h2>
            <p className="text-muted-foreground mt-1">The people who care for your animals</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {staff.map(member => (
              <div key={member.id} className="rounded-xl border bg-card overflow-hidden">
                {/* Photo */}
                <div className="aspect-[4/3] bg-muted flex items-center justify-center overflow-hidden">
                  {member.photoUrl ? (
                    <img
                      src={member.photoUrl}
                      alt={member.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <User className="h-12 w-12 opacity-20" />
                    </div>
                  )}
                </div>
                {/* Info */}
                <div className="p-4 space-y-1">
                  <p className="font-semibold text-base">{member.name}</p>
                  <p className="text-xs text-primary font-medium uppercase tracking-wide">{member.role}</p>
                  {member.bio && (
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{member.bio}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

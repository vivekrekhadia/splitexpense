import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Sidebar from "@/components/layout/Sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const userName = session.user?.name ?? "User";
  const userEmail = session.user?.email ?? "";

  return (
    <div className="min-h-screen bg-[#070a13] md:flex md:items-center md:justify-center md:py-8 relative overflow-hidden">
      {/* Decorative ambient background glows */}
      <div className="hidden md:block absolute top-[15%] left-[25%] w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="hidden md:block absolute bottom-[15%] right-[25%] w-[450px] h-[450px] bg-rose-500/5 rounded-full blur-[150px] pointer-events-none" />

      {/* Simulated Premium Phone Shell */}
      <div className="w-full md:w-[420px] h-screen md:h-[840px] md:rounded-[3rem] md:border-[10px] md:border-[#1e293b]/90 bg-[#070b14] md:shadow-[0_20px_70px_-10px_rgba(0,0,0,0.7)] md:shadow-emerald-950/10 relative flex flex-col overflow-hidden">
        <Sidebar userName={userName} userEmail={userEmail} />
        {/* pb-20 leaves room for floating bottom tab bar; overflow hidden for inner page scrolling */}
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden pb-20 bg-[#070b14]">
          {children}
        </main>
      </div>
    </div>
  );
}

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
    <div className="min-h-screen bg-gray-200 md:flex md:items-start md:justify-center md:py-8">
      {/* Phone shell on desktop */}
      <div className="w-full md:w-[430px] md:rounded-[2.5rem] md:shadow-2xl md:overflow-hidden bg-[#F7F8FA] relative flex flex-col min-h-screen md:min-h-[85vh]">
        <Sidebar userName={userName} userEmail={userEmail} />
        {/* pb-16 leaves room for bottom tab bar */}
        <main className="flex-1 pb-16 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

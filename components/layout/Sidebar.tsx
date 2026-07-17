"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LayoutDashboard, Users, UsersRound, LogOut } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/friends", label: "Friends", icon: Users },
  { href: "/groups", label: "Groups", icon: UsersRound },
];

interface SidebarProps {
  userName: string;
  userEmail: string;
}

export default function Sidebar({ userName, userEmail }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Premium Glassmorphic User Info Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#0d121f]/90 backdrop-blur-md border-b border-white/[0.06] z-10 shrink-0">
        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-bold text-sm shrink-0 shadow-lg shadow-emerald-500/20">
          {userName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-100 truncate tracking-wide">{userName}</p>
          <p className="text-xs text-slate-400 truncate">{userEmail}</p>
        </div>
      </div>

      {/* Floating Bottom Tab Bar — Mobile-first Deck */}
      <nav
        className="absolute bottom-4 left-4 right-4 z-40 bg-[#0e1424]/85 backdrop-blur-xl border border-white/[0.08] flex rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.6)] p-1.5 justify-around"
        aria-label="Main navigation"
      >
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center py-2 rounded-xl gap-1 text-[10px] font-semibold transition-all duration-200 active:scale-95 ${
                active
                  ? "text-emerald-400 bg-white/[0.05] shadow-inner text-glow-green"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={18} aria-hidden="true" strokeWidth={active ? 2.2 : 1.8} />
              {label}
            </Link>
          );
        })}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex-1 flex flex-col items-center justify-center py-2 rounded-xl gap-1 text-[10px] font-semibold text-slate-400 hover:text-rose-400 hover:bg-white/[0.02] transition-all duration-200 active:scale-95"
          title="Sign out"
        >
          <LogOut size={18} aria-hidden="true" strokeWidth={1.8} />
          Logout
        </button>
      </nav>
    </>
  );
}

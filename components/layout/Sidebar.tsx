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
}

export default function Sidebar({ userName }: SidebarProps) {
  const pathname = usePathname();

  return (
    // Bottom tab bar — always shown (phone layout on all screen sizes)
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-100 flex
                 md:absolute md:bottom-0 md:left-auto md:right-auto md:w-[430px]
                 safe-area-inset-bottom"
      aria-label="Main navigation"
      style={{ maxWidth: "430px", margin: "0 auto" }}
    >
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 text-xs font-medium transition-colors ${
              active ? "text-[#5BC5A7]" : "text-gray-400"
            }`}
            aria-current={active ? "page" : undefined}
          >
            <Icon size={22} aria-hidden="true" strokeWidth={active ? 2.5 : 1.8} />
            {label}
          </Link>
        );
      })}
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="flex-1 flex flex-col items-center justify-center py-3 gap-1 text-xs font-medium text-gray-400 transition-colors"
        title={userName}
      >
        <LogOut size={22} aria-hidden="true" strokeWidth={1.8} />
        Logout
      </button>
    </nav>
  );
}

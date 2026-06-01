"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import LegalGuard from "@/components/LegalGuard";

const sidebarLinks = [
  { href: "/dashboard", label: "Overview", icon: "O", admin: false },
  { href: "/dashboard/products", label: "My Products", icon: "P", admin: false },
  { href: "/dashboard/licenses", label: "Licenses", icon: "K", admin: false },
  { href: "/dashboard/orders", label: "Orders", icon: "O", admin: false },
  { href: "/dashboard/notifications", label: "Notifications", icon: "N", admin: false },
  { href: "/dashboard/achievements", label: "Achievements", icon: "A", admin: false },
  { href: "/dashboard/tickets", label: "My Tickets", icon: "T", admin: false },
  { href: "/dashboard/support", label: "Support", icon: "S", admin: false },
  { href: "/dashboard/settings", label: "Settings", icon: "G", admin: false },
  { href: "/dashboard/analytics", label: "Analytics", icon: "A", admin: true },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login?redirect=" + encodeURIComponent(pathname));
    }
  }, [loading, user, router, pathname]);

  const visibleLinks = sidebarLinks.filter((l) => !l.admin || isAdmin);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-dark-900 pt-16 lg:pt-20 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 pt-16 lg:pt-20">
      <div className="flex">
        <aside className={cn(
          "fixed lg:sticky top-16 lg:top-20 left-0 z-40 h-[calc(100vh-4rem)] lg:h-[calc(100vh-5rem)] w-64 bg-dark-800/50 border-r border-purple-500/10 backdrop-blur-xl transition-transform lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <nav className="p-4 space-y-1">
            {visibleLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all",
                  pathname === link.href
                    ? "bg-purple-600/10 text-purple-400 border border-purple-500/20"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                )}
              >
                <div className="w-7 h-7 rounded-lg bg-dark-600 flex items-center justify-center text-xs font-bold">
                  {link.icon}
                </div>
                {link.label}
              </Link>
            ))}
            {isAdmin && (
              <div className="pt-2 mt-2 border-t border-purple-500/10">
                <Link
                  href="/admin"
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 transition-all"
                >
                  <div className="w-7 h-7 rounded-lg bg-purple-600/20 flex items-center justify-center text-xs font-bold text-purple-400">
                    A
                  </div>
                  Admin Panel
                </Link>
              </div>
            )}
          </nav>
        </aside>

        <main className="flex-1 p-4 lg:p-8 min-h-[calc(100vh-5rem)]">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden mb-4 p-2 rounded-lg bg-dark-600 text-gray-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <LegalGuard>{children}</LegalGuard>
        </main>
      </div>
    </div>
  );
}

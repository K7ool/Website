"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import LegalGuard from "@/components/LegalGuard";

interface NavItem {
  href: string;
  label: string;
}

interface NavGroup {
  title: string;
  icon: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: "Management",
    icon: "grid",
    items: [
      { href: "/admin", label: "Overview" },
      { href: "/admin/statistics", label: "Statistics" },
    ],
  },
  {
    title: "Store",
    icon: "cart",
    items: [
      { href: "/admin/products", label: "Products" },
      { href: "/admin/orders", label: "Orders" },
      { href: "/admin/payments", label: "Payments" },
      { href: "/admin/licenses", label: "Licenses" },
    ],
  },
  {
    title: "Community",
    icon: "users",
    items: [
      { href: "/admin/users", label: "Users" },
      { href: "/admin/tickets", label: "Tickets" },
      { href: "/admin/testimonials", label: "Testimonials" },
      { href: "/admin/notifications", label: "Notifications" },
      { href: "/admin/roblox", label: "Roblox Verifications" },
    ],
  },
  {
    title: "Content",
    icon: "file",
    items: [
      { href: "/admin/portfolio", label: "Portfolio" },
      { href: "/admin/services", label: "Services" },
      { href: "/admin/homepage", label: "Homepage" },
      { href: "/admin/faq", label: "FAQ" },
      { href: "/admin/announcements", label: "Announcements" },
    ],
  },
  {
    title: "Marketing",
    icon: "cart",
    items: [
      { href: "/admin/coupons", label: "Coupons" },
      { href: "/admin/achievements", label: "Achievements" },
    ],
  },
  {
    title: "Products",
    icon: "file",
    items: [
      { href: "/admin/versions", label: "Product Versions" },
    ],
  },
  {
    title: "License System",
    icon: "shield",
    items: [
      { href: "/admin/license-activity", label: "Activity Log" },
      { href: "/admin/license-blacklist", label: "Blacklist" },
      { href: "/admin/license-servers", label: "Server Browser" },
      { href: "/admin/incidents", label: "Incidents" },
    ],
  },
  {
    title: "System",
    icon: "gear",
    items: [
      { href: "/admin/site-settings", label: "Site Settings" },
      { href: "/admin/footer", label: "Footer" },
      { href: "/admin/legal", label: "Legal" },
    ],
  },
];

const STORAGE_KEY = "admin_sidebar_collapsed";

function getCollapsed(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch {}
  return new Set();
}

function GroupIcon({ icon, className }: { icon: string; className?: string }) {
  switch (icon) {
    case "grid":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
        </svg>
      );
    case "cart":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" />
        </svg>
      );
    case "users":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
        </svg>
      );
    case "file":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
        </svg>
      );
    case "shield":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      );
    case "gear":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
      );
    default:
      return <div className={className} />;
  }
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={cn("w-3.5 h-3.5 text-gray-500 transition-transform duration-200", open && "rotate-90")}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function SidebarNav() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState<Set<string>>(getCollapsed);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...collapsed]));
  }, [collapsed]);

  const toggle = (title: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  return (
    <nav className="py-3 px-2 space-y-4">
      {navGroups.map((group) => {
        const isCollapsed = collapsed.has(group.title);
        const isActive = group.items.some((item) => pathname === item.href);

        return (
          <div key={group.title}>
            <button
              onClick={() => toggle(group.title)}
              className={cn(
                "flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-widest transition-all",
                isActive
                  ? "text-purple-300"
                  : "text-gray-500 hover:text-gray-300"
              )}
            >
              <GroupIcon icon={group.icon} className="w-4 h-4" />
              <span className="flex-1 text-left">{group.title}</span>
              <Chevron open={!isCollapsed} />
            </button>

            {!isCollapsed && (
              <div className="mt-0.5 space-y-0.5 ml-1 pl-3 border-l border-purple-500/10">
                {group.items.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-1.5 rounded-md text-sm transition-all",
                        active
                          ? "bg-purple-600/15 text-purple-300 font-medium"
                          : "text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]"
                      )}
                    >
                      <div className={cn(
                        "w-1 h-1 rounded-full shrink-0 transition-all",
                        active ? "bg-purple-400" : "bg-transparent"
                      )} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm lg:hidden" onClick={onClose} />
      )}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-60 bg-dark-900 border-r border-purple-500/10 transition-transform duration-300 ease-in-out lg:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between h-14 px-4 border-b border-purple-500/10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-xs">F</span>
            </div>
            <span className="text-sm font-bold text-white">Flipp<span className="text-purple-400">Studios</span></span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <SidebarNav />
      </aside>
    </>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.push("/dashboard");
    }
  }, [loading, user, isAdmin, router]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (loading || !user || !isAdmin) {
    return (
      <div className="min-h-screen bg-dark-900 pt-16 lg:pt-20 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 pt-16 lg:pt-20">
      {/* Top bar */}
      <div className="border-b border-purple-500/10 bg-dark-800/50 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all -ml-1.5">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <h1 className="text-lg font-bold text-white">Admin</h1>
            <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
            <span className="text-xs text-purple-400">Live</span>
          </div>
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white transition-colors">
            &larr; Back to Dashboard
          </Link>
        </div>
      </div>

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="sticky top-16 lg:top-20 left-0 z-40 h-[calc(100vh-5rem)] w-56 bg-dark-800/30 border-r border-purple-500/10 hidden lg:block shrink-0 overflow-y-auto">
          <SidebarNav />
        </aside>

        {/* Mobile drawer */}
        <MobileSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main content */}
        <main className="flex-1 p-4 lg:p-8 min-h-[calc(100vh-5rem)] max-w-full overflow-x-auto">
          <LegalGuard>{children}</LegalGuard>
        </main>
      </div>
    </div>
  );
}

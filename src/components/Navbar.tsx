"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import Avatar from "@/components/Avatar";
import { announcementService, notificationService } from "@/lib/firestore";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Products" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/custom-development", label: "Custom Work" },
  { href: "/documentation", label: "Docs" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

const BANNER_COLORS: Record<string, string> = {
  purple: "bg-purple-600/20 text-purple-300 border-purple-500/30",
  blue: "bg-blue-600/20 text-blue-300 border-blue-500/30",
  green: "bg-green-600/20 text-green-300 border-green-500/30",
  red: "bg-red-600/20 text-red-300 border-red-500/30",
  yellow: "bg-yellow-600/20 text-yellow-300 border-yellow-500/30",
  orange: "bg-orange-600/20 text-orange-300 border-orange-500/30",
};

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileMenu, setProfileMenu] = useState(false);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const router = useRouter();
  const { user, profile, isAdmin, signOut } = useAuth();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    return announcementService.subscribe((items) => {
      setAnnouncements(items.filter((a: any) => a.active !== false && (!a.expiryDate || new Date(a.expiryDate) > new Date())));
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    return notificationService.subscribe(user.uid, (items) => {
      setNotifications(items);
    });
  }, [user]);

  const unreadCount = notifications.filter((n: any) => !n.read).length;
  const activeAnnouncement = announcements[0] || null;

  const handleMarkAllRead = async () => {
    if (!user) return;
    await notificationService.markAllRead(user.uid);
  };

  const handleMarkRead = async (id: string) => {
    await notificationService.markRead(id);
  };

  const typeIcons: Record<string, string> = {
    purchase: "🛒", update: "🔄", ticket: "🎫", review: "⭐",
    license: "🔑", coupon: "🏷️", announcement: "📢",
  };

  return (
    <>
      {activeAnnouncement && (
        <div className={`fixed top-0 left-0 right-0 z-50 px-4 py-2 text-center text-sm font-medium border-b ${BANNER_COLORS[activeAnnouncement.color] || BANNER_COLORS.purple}`}>
          {activeAnnouncement.text}
        </div>
      )}
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          activeAnnouncement ? "mt-9" : "",
          scrolled
            ? "bg-dark-900/80 backdrop-blur-xl border-b border-purple-500/10"
            : "bg-transparent"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">F</span>
              </div>
              <span className="font-bold text-lg text-white group-hover:text-purple-400 transition-colors">
                Flipp<span className="text-purple-400">Studios</span>
              </span>
            </Link>

            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              {user ? <>
                <div className="relative">
                  <button
                    onClick={() => setNotifOpen(!notifOpen)}
                    className="relative p-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </button>
                  <AnimatePresence>
                    {notifOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute right-0 mt-2 w-80 glass rounded-xl border border-purple-500/10 shadow-xl overflow-hidden"
                      >
                        <div className="flex items-center justify-between px-4 py-3 border-b border-purple-500/10">
                          <h3 className="text-sm font-semibold text-white">Notifications</h3>
                          <div className="flex gap-2">
                            {unreadCount > 0 && (
                              <button onClick={handleMarkAllRead} className="text-xs text-purple-400 hover:text-purple-300 transition-colors">
                                Mark all read
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                          {notifications.length === 0 ? (
                            <div className="text-center py-8">
                              <svg className="w-8 h-8 text-gray-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                              </svg>
                              <p className="text-sm text-gray-400">No notifications</p>
                            </div>
                          ) : (
                            notifications.slice(0, 5).map((n: any) => (
                              <button
                                key={n.id}
                                onClick={() => { if (!n.read) handleMarkRead(n.id); router.push(`/dashboard/notifications/${n.id}`); setNotifOpen(false); }}
                                className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-all hover:bg-white/5 ${
                                  !n.read ? "bg-purple-500/5 border-l-2 border-purple-500" : "border-l-2 border-transparent"
                                }`}
                              >
                                <span className="text-lg shrink-0">{typeIcons[n.type] || "📌"}</span>
                                <div className="min-w-0 flex-1">
                                  <p className={`text-sm ${!n.read ? "text-white font-medium" : "text-gray-300"}`}>{n.title}</p>
                                  <p className="text-xs text-gray-400 truncate">{n.message}</p>
                                  <p className="text-[10px] text-gray-500 mt-0.5">
                                    {n.createdAt ? new Date(n.createdAt).toLocaleDateString() : ""}
                                  </p>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                        <Link
                          href="/dashboard/notifications"
                          onClick={() => setNotifOpen(false)}
                          className="block text-center py-3 text-sm text-purple-400 hover:text-purple-300 border-t border-purple-500/10 transition-colors"
                        >
                          View All Notifications
                        </Link>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="relative">
                  <button
                    onClick={() => setProfileMenu(!profileMenu)}
                    className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors"
                  >
                    <Avatar size="sm" className="rounded-lg" src={profile?.avatar} fallback={profile?.displayName || user.email || "U"} />
                  </button>
                  <AnimatePresence>
                    {profileMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 mt-2 w-56 glass rounded-xl border border-purple-500/10 p-2 shadow-xl"
                    >
                      <div className="flex items-center gap-3 px-3 py-3 border-b border-purple-500/10 mb-1">
                        <Avatar size="md" src={profile?.avatar} fallback={profile?.displayName || user.email || "U"} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">{profile?.displayName || "User"}</p>
                          <p className="text-xs text-gray-400 truncate">{user.email}</p>
                        </div>
                      </div>
                      <Link href="/dashboard" onClick={() => setProfileMenu(false)} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all">
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                        Dashboard
                      </Link>
                      <Link href="/dashboard/settings" onClick={() => setProfileMenu(false)} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all">
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        Account Settings
                      </Link>
                      {profile?.username && (
                        <Link href={`/profile/${profile.username}`} onClick={() => setProfileMenu(false)} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all">
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                          Public Profile
                        </Link>
                      )}
                      <Link href="/dashboard/products" onClick={() => setProfileMenu(false)} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all">
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                        My Products
                      </Link>
                      <Link href="/dashboard/orders" onClick={() => setProfileMenu(false)} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all">
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                        Orders
                      </Link>
                      <div className="border-t border-purple-500/10 mt-1 pt-1">
                        {isAdmin && (
                          <Link href="/admin" onClick={() => setProfileMenu(false)} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 transition-all">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                            Admin Panel
                          </Link>
                        )}
                        <button onClick={() => { signOut(); setProfileMenu(false); }} className="flex items-center gap-3 w-full text-left px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-red-400 hover:bg-red-500/5 transition-all">
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                          Sign Out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              </> : <>
                <Link href="/auth/login" className="hidden sm:inline-flex text-sm text-gray-300 hover:text-white transition-colors">
                  Sign In
                </Link>
                <Link href="/auth/register" className="text-sm px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium hover:from-purple-500 hover:to-blue-500 transition-all shadow-lg shadow-purple-500/25">
                  Get Started
                </Link>
              </>}
              <button onClick={() => setMenuOpen(!menuOpen)} className="lg:hidden p-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/5">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {menuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden border-t border-purple-500/10 overflow-hidden"
            >
              <div className="px-4 py-4 space-y-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all"
                  >
                    {link.label}
                  </Link>
                ))}
                {!user && (
                  <>
                    <div className="border-t border-purple-500/10 my-2" />
                    <Link href="/auth/login" onClick={() => setMenuOpen(false)} className="block px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white">Sign In</Link>
                    <Link href="/auth/register" onClick={() => setMenuOpen(false)} className="block px-3 py-2 rounded-lg text-sm bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium text-center">Get Started</Link>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}

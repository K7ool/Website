"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Avatar from "@/components/Avatar";
import GlassCard from "@/components/GlassCard";
import { profileService } from "@/lib/firestore";

const ALL_BADGES = [
  { id: "admin", label: "Admin", icon: "🛡️" },
  { id: "owner", label: "Owner", icon: "👑" },
  { id: "verified_seller", label: "Verified Seller", icon: "⭐" },
  { id: "top_creator", label: "Top Creator", icon: "🏆" },
  { id: "premium", label: "Premium Member", icon: "💎" },
  { id: "top_customer", label: "Top Customer", icon: "🔥" },
  { id: "early_supporter", label: "Early Supporter", icon: "🚀" },
];

export default function AdminUsersPage() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  useEffect(() => {
    const unsub = profileService.subscribe((items) => {
      setProfiles(items);
      setLoading(false);
    });
    return unsub;
  }, []);

  const filtered = profiles.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (p.username || "").toLowerCase().includes(q) || (p.displayName || "").toLowerCase().includes(q) || (p.email || "").toLowerCase().includes(q);
  });

  const toggleBadge = async (userId: string, badge: string, has: boolean) => {
    try {
      if (has) await profileService.removeBadge(userId, badge);
      else await profileService.addBadge(userId, badge);
    } catch (e) { console.error("Badge toggle failed:", e); }
  };

  const toggleVerify = async (userId: string, current: boolean) => {
    try { await profileService.setVerified(userId, !current); }
    catch (e) { console.error("Verify toggle failed:", e); }
  };

  const toggleFeatured = async (userId: string, current: boolean) => {
    try { await profileService.setFeatured(userId, !current); }
    catch (e) { console.error("Featured toggle failed:", e); }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">User Management</h1>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..."
            className="w-64 pl-10 pr-4 py-2 rounded-lg bg-dark-700 border border-purple-500/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/30" />
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && <GlassCard><p className="text-sm text-gray-400 text-center py-8">No users found.</p></GlassCard>}
        {filtered.map((p) => {
          const badges: string[] = p.badges || [];
          return (
            <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <GlassCard className="hover:border-purple-500/20 transition-all">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar size="md" src={p.avatar} fallback={p.displayName || p.username || "U"} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-white font-medium truncate">{p.displayName || p.username}</span>
                        {badges.slice(0, 3).map((b: string) => {
                          const badge = ALL_BADGES.find((bb) => bb.id === b);
                          return badge ? <span key={b} title={badge.label}>{badge.icon}</span> : null;
                        })}
                        {p.verified && <span className="text-xs text-green-400">✓</span>}
                      </div>
                      <p className="text-xs text-gray-500">@{p.username} · {p.role}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedUser(selectedUser?.id === p.id ? null : p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${selectedUser?.id === p.id ? "bg-purple-600/20 text-purple-400" : "bg-dark-600 text-gray-400 hover:text-white"}`}>
                    {selectedUser?.id === p.id ? "Close" : "Manage"}
                  </button>
                </div>
                {selectedUser?.id === p.id && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 pt-4 border-t border-purple-500/10 space-y-4">
                    <div>
                      <p className="text-xs text-gray-400 mb-2">Badges</p>
                      <div className="flex flex-wrap gap-2">
                        {ALL_BADGES.map((badge) => {
                          const has = badges.includes(badge.id);
                          return (
                            <button key={badge.id} onClick={() => toggleBadge(p.id, badge.id, has)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${has ? "bg-purple-600/20 text-purple-400 border border-purple-500/30" : "bg-dark-600 text-gray-400 border border-transparent hover:text-white"}`}>
                              {badge.icon} {badge.label} {has ? "✕" : "+"}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                        <input type="checkbox" checked={!!p.verified} onChange={() => toggleVerify(p.id, !!p.verified)}
                          className="w-4 h-4 rounded accent-purple-500" />
                        Verified
                      </label>
                      <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                        <input type="checkbox" checked={!!p.featured} onChange={() => toggleFeatured(p.id, !!p.featured)}
                          className="w-4 h-4 rounded accent-purple-500" />
                        Featured
                      </label>
                    </div>
                  </motion.div>
                )}
              </GlassCard>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

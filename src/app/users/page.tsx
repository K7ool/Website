"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import GlassCard from "@/components/GlassCard";
import { profileService } from "@/lib/firestore";

export default function UsersPage() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const unsub = profileService.subscribe((items) => {
      setProfiles(items.filter((p: any) => p.privacy?.publicProfile !== false));
      setLoading(false);
    });
    return unsub;
  }, []);

  const filtered = profiles.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (p.username || "").toLowerCase().includes(q) ||
      (p.displayName || "").toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="pt-24 pb-16 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">Users</h1>
            <p className="text-gray-400">{profiles.length} members</p>
          </div>

          <div className="relative mb-8">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by username or display name..."
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-dark-700 border border-purple-500/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/30 transition-all" />
          </div>

          {filtered.length === 0 ? (
            <GlassCard>
              <p className="text-sm text-gray-400 text-center py-10">{search ? "No users found matching your search." : "No users found."}</p>
            </GlassCard>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((p) => (
                <Link key={p.id} href={`/profile/${p.username}`}>
                  <GlassCard className="hover:border-purple-500/30 transition-all cursor-pointer">
                    <div className="flex items-center gap-3">
                      <Avatar size="md" className="w-12 h-12" src={p.avatar} fallback={p.displayName || p.username || "U"} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm text-white font-medium truncate">{p.displayName || p.username}</p>
                          {p.role === "admin" && <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400">Admin</span>}
                          {p.verifiedCustomer && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400">✓</span>}
                        </div>
                        <p className="text-xs text-gray-500">@{p.username}</p>
                      </div>
                    </div>
                  </GlassCard>
                </Link>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

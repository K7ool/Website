"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import GlassCard from "@/components/GlassCard";
import { incidentService } from "@/lib/firestore";

const SEVERITY_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  info: { label: "Info", color: "text-blue-400 bg-blue-500/10 border-blue-500/20", icon: "ℹ" },
  minor: { label: "Minor", color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20", icon: "⚠" },
  major: { label: "Major", color: "text-orange-400 bg-orange-500/10 border-orange-500/20", icon: "🔶" },
  critical: { label: "Critical", color: "text-red-400 bg-red-500/10 border-red-500/20", icon: "🔴" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  investigating: { label: "Investigating", color: "text-yellow-400 bg-yellow-500/10" },
  identified: { label: "Identified", color: "text-blue-400 bg-blue-500/10" },
  monitoring: { label: "Monitoring", color: "text-purple-400 bg-purple-500/10" },
  resolved: { label: "Resolved", color: "text-green-400 bg-green-500/10" },
  maintenance: { label: "Scheduled Maintenance", color: "text-gray-400 bg-gray-500/10" },
};

export default function StatusPage() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "resolved" | "maintenance">("all");

  useEffect(() => {
    const unsub = incidentService.subscribe((items) => {
      setIncidents(items);
      setLoading(false);
    });
    return unsub;
  }, []);

  const visible = incidents.filter((i) => i.isVisible !== false);
  const active = visible.filter((i) => i.status !== "resolved" && i.status !== "maintenance");
  const resolved = visible.filter((i) => i.status === "resolved");
  const maintenance = visible.filter((i) => i.status === "maintenance");

  const filtered = visible.filter((i) => {
    if (filter === "active") return i.status !== "resolved" && i.status !== "maintenance";
    if (filter === "resolved") return i.status === "resolved";
    if (filter === "maintenance") return i.status === "maintenance";
    return true;
  }).filter((i) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return i.title?.toLowerCase().includes(q) || i.status?.toLowerCase().includes(q) || i.severity?.toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">F</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Flipp Studios Status</h1>
            <p className="text-sm text-gray-400">
              {active.length > 0
                ? `${active.length} active incident${active.length > 1 ? "s" : ""}`
                : "All systems operational"}
            </p>
          </div>
          {active.length === 0 ? (
            <span className="ml-auto px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-xs font-medium">All Systems Operational</span>
          ) : (
            <span className="ml-auto px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-400 text-xs font-medium">{active.length} Active</span>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, status, severity..."
            className="flex-1 px-4 py-2.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
          <div className="flex gap-1.5">
            {(["all", "active", "resolved", "maintenance"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all capitalize ${
                  filter === f ? "bg-purple-600/20 text-purple-400 border border-purple-500/20" : "bg-dark-600 text-gray-400 hover:text-white"
                }`}>{f}</button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <GlassCard>
            <div className="text-center py-10">
              <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">All Systems Normal</h3>
              <p className="text-sm text-gray-400">No incidents reported.</p>
            </div>
          </GlassCard>
        ) : (
          <div className="space-y-3">
            {filtered.map((inc, i) => {
              const sev = SEVERITY_CONFIG[inc.severity] || SEVERITY_CONFIG.info;
              const stat = STATUS_CONFIG[inc.status] || STATUS_CONFIG.investigating;
              return (
                <motion.div key={inc.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                  <Link href={`/status/${inc.slug || inc.id}`}>
                    <GlassCard className="hover:border-purple-500/30 transition-all cursor-pointer">
                      <div className="flex items-start gap-4">
                        <span className="text-lg mt-0.5">{sev.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-white">{inc.title}</h3>
                            {inc.isPinned && <span className="text-[10px]">📌</span>}
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className={`px-2 py-0.5 rounded border ${sev.color}`}>{sev.label}</span>
                            <span className={`px-2 py-0.5 rounded ${stat.color}`}>{stat.label}</span>
                            {inc.createdAt && <span className="text-gray-500">{new Date(inc.createdAt).toLocaleDateString()}</span>}
                          </div>
                          {inc.description && <p className="text-xs text-gray-400 mt-1 line-clamp-1">{inc.description}</p>}
                        </div>
                        <svg className="w-5 h-5 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </GlassCard>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}

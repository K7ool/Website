"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import GlassCard from "@/components/GlassCard";
import { licenseActivityService, licenseService, activeSessionService } from "@/lib/firestore";

export default function LicenseAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    totalLicenses: number;
    activeLicenses: number;
    revokedLicenses: number;
    totalActivations: number;
    activeSessions: number;
    totalPlayers: number;
    dailyActivations: { date: string; count: number }[];
    topProducts: { name: string; count: number }[];
  }>({
    totalLicenses: 0,
    activeLicenses: 0,
    revokedLicenses: 0,
    totalActivations: 0,
    activeSessions: 0,
    totalPlayers: 0,
    dailyActivations: [],
    topProducts: [],
  });

  useEffect(() => {
    const unsubs: (() => void)[] = [];

    unsubs.push(licenseService.subscribe((items) => {
      const total = items.length;
      const active = items.filter((l: any) => l.status === "active" && (!l.expiresAt || new Date(l.expiresAt) > new Date())).length;
      const revoked = items.filter((l: any) => l.status === "revoked").length;
      const totalAct = items.reduce((s: number, l: any) => s + (l.activationCount || 0), 0);

      const productMap = new Map<string, number>();
      items.forEach((l: any) => {
        if (l.productName) {
          productMap.set(l.productName, (productMap.get(l.productName) || 0) + 1);
        }
      });
      const topProducts = Array.from(productMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }));

      setStats((prev) => ({ ...prev, totalLicenses: total, activeLicenses: active, revokedLicenses: revoked, totalActivations: totalAct, topProducts }));
      setLoading(false);
    }));

    unsubs.push(licenseActivityService.subscribeAll((items) => {
      const verifyItems = items.filter((a: any) => a.type === "verify");
      const dayMap = new Map<string, number>();
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        dayMap.set(key, 0);
      }
      verifyItems.forEach((a: any) => {
        if (a.createdAt) {
          const d = new Date(a.createdAt);
          const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          if (dayMap.has(key)) {
            dayMap.set(key, (dayMap.get(key) || 0) + 1);
          }
        }
      });
      const dailyActivations = Array.from(dayMap.entries()).map(([date, count]) => ({ date, count }));
      setStats((prev) => ({ ...prev, dailyActivations }));
    }));

    unsubs.push(activeSessionService.subscribe((items) => {
      const staleCutoff = new Date(Date.now() - 120_000).toISOString();
      const active = items.filter((s: any) => s.lastHeartbeat && s.lastHeartbeat >= staleCutoff);
      const totalPlayers = active.reduce((sum: number, s: any) => sum + (s.playerCount || 0), 0);
      setStats((prev) => ({ ...prev, activeSessions: active.length, totalPlayers }));
    }));

    return () => unsubs.forEach((u) => u());
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const maxActivation = Math.max(...stats.dailyActivations.map((d) => d.count), 1);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <h2 className="text-2xl font-bold text-white mb-6">License Analytics</h2>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <GlassCard>
          <div className="text-2xl font-bold text-white">{stats.totalLicenses}</div>
          <div className="text-xs text-gray-400 mt-1">Total Licenses</div>
        </GlassCard>
        <GlassCard>
          <div className="text-2xl font-bold text-green-400">{stats.activeLicenses}</div>
          <div className="text-xs text-gray-400 mt-1">Active</div>
        </GlassCard>
        <GlassCard>
          <div className="text-2xl font-bold text-red-400">{stats.revokedLicenses}</div>
          <div className="text-xs text-gray-400 mt-1">Revoked</div>
        </GlassCard>
        <GlassCard>
          <div className="text-2xl font-bold text-purple-400">{stats.totalActivations}</div>
          <div className="text-xs text-gray-400 mt-1">Total Activations</div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <GlassCard>
          <h3 className="text-sm font-semibold text-white mb-4">Daily Verifications (7 days)</h3>
          <div className="flex items-end gap-2 h-32">
            {stats.dailyActivations.map((day) => {
              const height = Math.max((day.count / maxActivation) * 100, day.count > 0 ? 8 : 0);
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-gray-500">{day.count || ""}</span>
                  <div
                    className="w-full rounded-t bg-gradient-to-t from-purple-600 to-blue-500 transition-all"
                    style={{ height: `${height}%`, minHeight: day.count > 0 ? "4px" : "0" }}
                  />
                  <span className="text-[10px] text-gray-500">{day.date}</span>
                </div>
              );
            })}
          </div>
        </GlassCard>

        <GlassCard>
          <h3 className="text-sm font-semibold text-white mb-4">Server Sessions</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-3xl font-bold text-blue-400">{stats.activeSessions}</div>
              <div className="text-xs text-gray-400 mt-1">Active Servers</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-400">{stats.totalPlayers}</div>
              <div className="text-xs text-gray-400 mt-1">Total Players</div>
            </div>
          </div>
        </GlassCard>
      </div>

      <GlassCard>
        <h3 className="text-sm font-semibold text-white mb-4">Top Products by License Count</h3>
        {stats.topProducts.length === 0 ? (
          <p className="text-sm text-gray-400">No products yet.</p>
        ) : (
          <div className="space-y-2">
            {stats.topProducts.map((p, i) => {
              const maxCount = stats.topProducts[0].count;
              const pct = (p.count / maxCount) * 100;
              return (
                <div key={p.name} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-5">{i + 1}.</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-300 truncate">{p.name}</span>
                      <span className="text-xs text-purple-400 font-mono">{p.count}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-dark-600 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-purple-600 to-blue-500 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
}

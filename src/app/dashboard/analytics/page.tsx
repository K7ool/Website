"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { orderBy, limit, where } from "firebase/firestore";
import DashboardLayout from "@/components/DashboardLayout";
import GlassCard from "@/components/GlassCard";
import { useAuth } from "@/contexts/AuthContext";
import { analyticsService, orderService, profileService, downloadService } from "@/lib/firestore";

export default function DashboardAnalyticsPage() {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !isAdmin) { setLoading(false); return; }
    const load = async () => {
      const s = await analyticsService.getStats();
      setStats(s);

      const unsub = orderService.subscribe((orders) => {
        const activities = orders.slice(0, 4).map((o: any) => ({
          action: `New order: ${o.items?.[0]?.title || "Product"}`,
          time: new Date(o.createdAt).toLocaleDateString(),
          type: "sale",
        }));
        setRecentActivity(activities.length ? activities : [
          { action: "No recent activity", time: "", type: "empty" },
        ]);
      }, [orderBy("createdAt", "desc"), limit(5)]);

      setLoading(false);
      return unsub;
    };
    load();
  }, [user, isAdmin]);

  if (loading || !stats) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  const statCards = [
    { label: "Total Revenue", value: `$${stats.totalRevenue.toLocaleString()}`, change: "From all completed orders", up: true },
    { label: "Total Orders", value: stats.totalOrders.toLocaleString(), change: "All time", up: true },
    { label: "Total Customers", value: stats.totalCustomers.toLocaleString(), change: "Registered users", up: true },
    { label: "Total Downloads", value: stats.totalDownloads.toLocaleString(), change: "All time", up: true },
  ];

  return (
    <DashboardLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white mb-6">Analytics</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((stat, i) => (
            <GlassCard key={stat.label + i} delay={i * 0.05}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-2xl font-bold text-white">{stat.value}</span>
                <span className="text-xs font-medium text-green-400">{stat.up ? "↑" : "↓"}</span>
              </div>
              <div className="text-sm text-gray-400">{stat.label}</div>
              <div className="text-xs text-gray-500">{stat.change}</div>
            </GlassCard>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <GlassCard>
            <h2 className="text-lg font-semibold text-white mb-4">Top Products</h2>
            {stats.topProducts.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No sales data yet</p>
            ) : (
              <div className="space-y-3">
                {stats.topProducts.map((item: any, i: number) => (
                  <div key={item.name + i} className="flex items-center justify-between p-3 rounded-lg bg-dark-600">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-5">{i + 1}.</span>
                      <span className="text-sm text-white">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-300">{item.sales} sales</div>
                      <div className="text-xs text-gray-500">${item.revenue.toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          <GlassCard>
            <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>
            <div className="space-y-3">
              {recentActivity.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-dark-600">
                  <span className="text-sm text-gray-300">{item.action}</span>
                  {item.time && <span className="text-xs text-gray-500">{item.time}</span>}
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}

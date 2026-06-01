"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { analyticsService, ticketService } from "@/lib/firestore";
import GlassCard from "@/components/GlassCard";

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsService.getAdminStats().then((s) => { setStats(s); setLoading(false); });
  }, []);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>
    );
  }

  const cards = [
    { label: "Total Revenue", value: `$${stats.totalRevenue.toLocaleString()}`, color: "text-green-400" },
    { label: "Total Orders", value: stats.totalOrders.toLocaleString(), color: "text-blue-400" },
    { label: "Total Users", value: stats.totalUsers.toLocaleString(), color: "text-purple-400" },
    { label: "Total Products", value: stats.totalProducts.toLocaleString(), color: "text-yellow-400" },
    { label: "Open Tickets", value: stats.openTickets.toLocaleString(), color: "text-orange-400" },
    { label: "Closed Tickets", value: stats.closedTickets.toLocaleString(), color: "text-green-400" },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <h2 className="text-2xl font-bold text-white mb-6">Admin Overview</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card, i) => (
          <GlassCard key={card.label} delay={i * 0.05}>
            <div className={`text-3xl font-bold ${card.color} mb-1`}>{card.value}</div>
            <div className="text-sm text-gray-400">{card.label}</div>
          </GlassCard>
        ))}
      </div>
    </motion.div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import GlassCard from "@/components/GlassCard";
import { statisticsService } from "@/lib/firestore";

const STARTER_STATS = [
  { label: "Projects Delivered", value: "0", sortOrder: 0 },
  { label: "Games Worked On", value: "0", sortOrder: 1 },
  { label: "Happy Clients", value: "0", sortOrder: 2 },
  { label: "Lines Of Code", value: "0", sortOrder: 3 },
];

export default function AdminStatisticsPage() {
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    const unsub = statisticsService.subscribe((items) => {
      setStats(items);
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleUpdate = async (id: string, value: string) => {
    await statisticsService.update(id, { value });
  };

  const loadStarter = async () => {
    setSeeding(true);
    for (const stat of STARTER_STATS) {
      await statisticsService.create(stat);
    }
    setSeeding(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <h2 className="text-2xl font-bold text-white mb-6">Statistics</h2>
      <p className="text-sm text-gray-400 mb-6">Edit the statistics shown on the homepage and portfolio page.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {stats.map((stat) => (
          <GlassCard key={stat.id}>
            <label className="block text-sm text-gray-400 mb-1">{stat.label}</label>
            <div className="flex gap-2">
              <input type="text" defaultValue={stat.value}
                onBlur={(e) => { if (e.target.value !== stat.value) handleUpdate(stat.id, e.target.value); }}
                className="flex-1 px-3 py-2 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white focus:outline-none focus:border-purple-500" />
            </div>
          </GlassCard>
        ))}
        {stats.length === 0 && !loading && (
          <div className="text-center py-12 col-span-2">
            <p className="text-gray-400 mb-4">No statistics configured.</p>
            <button onClick={loadStarter} disabled={seeding}
              className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-medium hover:from-purple-500 hover:to-blue-500 transition-all disabled:opacity-40">
              {seeding ? "Loading..." : "Load Starter Stats"}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

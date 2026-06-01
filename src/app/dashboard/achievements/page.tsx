"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import GlassCard from "@/components/GlassCard";
import { useAuth } from "@/contexts/AuthContext";
import { achievementService, userAchievementService } from "@/lib/firestore";

export default function AchievementsPage() {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<any[]>([]);
  const [userAchievements, setUserAchievements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const unsub1 = achievementService.subscribe((items) => {
      setAchievements(items);
    });
    const unsub2 = userAchievementService.subscribe(user.uid, (items) => {
      setUserAchievements(items);
      setLoading(false);
    });
    return () => { unsub1(); unsub2(); };
  }, [user]);

  const unlockedKeys = new Set(userAchievements.map((ua: any) => ua.achievementKey));
  const progress = achievements.length > 0 ? Math.round((unlockedKeys.size / achievements.length) * 100) : 0;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white mb-6">Achievements</h1>

        <GlassCard className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Progress</span>
            <span className="text-sm text-white font-medium">{unlockedKeys.size} / {achievements.length}</span>
          </div>
          <div className="w-full h-3 rounded-full bg-dark-600 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-purple-600 to-blue-600"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">{progress}% complete</p>
        </GlassCard>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {achievements.map((a: any) => {
            const unlocked = unlockedKeys.has(a.key);
            const userAch = userAchievements.find((ua: any) => ua.achievementKey === a.key);
            return (
              <GlassCard key={a.id} className={unlocked ? "border-green-500/20" : "opacity-60"}>
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{a.icon || "🏆"}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-sm font-semibold ${unlocked ? "text-white" : "text-gray-400"}`}>{a.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{a.description}</p>
                    {unlocked && userAch && (
                      <p className="text-[10px] text-green-400 mt-1">
                        Unlocked {userAch.unlockedAt ? new Date(userAch.unlockedAt).toLocaleDateString() : ""}
                      </p>
                    )}
                  </div>
                  {unlocked && (
                    <svg className="w-5 h-5 text-green-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </GlassCard>
            );
          })}
        </div>
      </motion.div>
    </DashboardLayout>
  );
}

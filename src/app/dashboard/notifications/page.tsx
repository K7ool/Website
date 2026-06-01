"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import GlassCard from "@/components/GlassCard";
import { useAuth } from "@/contexts/AuthContext";
import { notificationService } from "@/lib/firestore";

const typeIcons: Record<string, string> = {
  purchase: "🛒", update: "🔄", ticket: "🎫", review: "⭐",
  license: "🔑", coupon: "🏷️", announcement: "📢",
};

const typeColors: Record<string, string> = {
  purchase: "bg-green-500/10 text-green-400 border-green-500/20",
  update: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  ticket: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  review: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  license: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  coupon: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  announcement: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const unsub = notificationService.subscribe(user.uid, (items) => {
      setNotifications(items);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  const handleMarkAllRead = async () => {
    if (!user) return;
    await notificationService.markAllRead(user.uid);
  };

  const handleMarkRead = async (id: string) => {
    await notificationService.markRead(id);
  };

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
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Notifications</h1>
          <div className="flex gap-2">
            {notifications.some((n: any) => !n.read) && (
              <button onClick={handleMarkAllRead}
                className="px-4 py-2 rounded-lg bg-purple-600/10 text-purple-400 text-sm hover:bg-purple-600/20 transition-all">
                Mark All as Read
              </button>
            )}
          </div>
        </div>

        <GlassCard>
          {notifications.length === 0 ? (
            <div className="text-center py-16">
              <svg className="w-12 h-12 text-gray-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <p className="text-lg font-medium text-gray-300 mb-1">No notifications yet</p>
              <p className="text-sm text-gray-500">You'll see notifications here when you make purchases or receive updates.</p>
            </div>
          ) : (
            <div className="divide-y divide-purple-500/10">
              {notifications.map((n: any) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-4 p-4 transition-all hover:bg-white/5 ${
                    !n.read ? "bg-purple-500/5" : ""
                  }`}
                >
                  <span className="text-2xl shrink-0 mt-0.5">{typeIcons[n.type] || "📌"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm ${!n.read ? "text-white font-semibold" : "text-gray-300"}`}>{n.title}</p>
                      <div className="flex items-center gap-2 shrink-0">
                        {n.type && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] border ${typeColors[n.type] || "bg-gray-500/10 text-gray-400 border-gray-500/20"}`}>
                            {n.type}
                          </span>
                        )}
                        {!n.read && (
                          <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{n.message}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-gray-500">
                        {n.createdAt ? new Date(n.createdAt).toLocaleDateString("en-US", {
                          year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                        }) : ""}
                      </span>
                      <div className="flex gap-2">
                        {!n.read && (
                          <button onClick={() => handleMarkRead(n.id)}
                            className="text-xs text-purple-400 hover:text-purple-300 transition-colors">
                            Mark Read
                          </button>
                        )}
                        {n.link && (
                          <Link href={n.link}
                            className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                            View Details
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </motion.div>
    </DashboardLayout>
  );
}

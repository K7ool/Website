"use client";
import { useState, useEffect, use } from "react";
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

export default function NotificationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const [notification, setNotification] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsub = notificationService.subscribe(user.uid, (items) => {
      const found = items.find((n: any) => n.id === id);
      if (found) {
        setNotification(found);
        setNotFound(false);
        if (!found.read) {
          notificationService.markRead(found.id);
        }
      } else {
        setNotFound(true);
      }
      setLoading(false);
    });
    return unsub;
  }, [id, user]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (notFound || !notification) {
    return (
      <DashboardLayout>
        <GlassCard>
          <div className="text-center py-10">
            <h2 className="text-lg font-semibold text-white mb-2">Notification Not Found</h2>
            <p className="text-sm text-gray-400 mb-4">This notification does not exist or has been removed.</p>
            <Link href="/dashboard/notifications" className="text-sm text-purple-400 hover:text-purple-300">← Back to Notifications</Link>
          </div>
        </GlassCard>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Link href="/dashboard/notifications" className="text-sm text-gray-400 hover:text-white transition-colors mb-6 inline-block">
          ← Back to Notifications
        </Link>

        <GlassCard>
          <div className="flex items-start gap-4 mb-4">
            <span className="text-2xl mt-0.5">{typeIcons[notification.type] || "📌"}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-lg font-bold text-white">{notification.title}</h1>
                {notification.type && (
                  <span className={`px-2 py-0.5 rounded-full text-xs border ${typeColors[notification.type] || ""}`}>
                    {notification.type}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-400">
                {notification.createdAt
                  ? new Date(notification.createdAt).toLocaleDateString("en-US", {
                      year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
                    })
                  : ""}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-dark-700/50 border border-purple-500/10">
            <p className="text-sm text-gray-300 whitespace-pre-wrap">{notification.message}</p>
          </div>

          {notification.link && (
            <div className="mt-4">
              <Link href={notification.link}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                View Details
              </Link>
            </div>
          )}
        </GlassCard>
      </motion.div>
    </DashboardLayout>
  );
}

"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import GlassCard from "@/components/GlassCard";
import { notificationService, profileService } from "@/lib/firestore";
import { serverTimestamp } from "firebase/firestore";

const typeColors: Record<string, string> = {
  purchase: "bg-green-500/10 text-green-400", update: "bg-blue-500/10 text-blue-400",
  ticket: "bg-yellow-500/10 text-yellow-400", review: "bg-purple-500/10 text-purple-400",
  license: "bg-orange-500/10 text-orange-400", coupon: "bg-pink-500/10 text-pink-400",
  announcement: "bg-indigo-500/10 text-indigo-400",
};

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSend, setShowSend] = useState(false);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ userId: "", title: "", message: "", type: "announcement", link: "" });

  useEffect(() => {
    const unsub = notificationService.subscribeAll((items) => {
      setNotifications(items);
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    profileService.getAll().then(setProfiles).catch(() => {});
  }, []);

  const handleSend = async () => {
    if (!form.title.trim() || !form.message.trim()) return;
    setSending(true);
    try {
      if (form.userId === "all") {
        for (const p of profiles) {
          await notificationService.create({ userId: p.id, title: form.title, message: form.message, type: form.type, link: form.link || undefined });
        }
      } else {
        await notificationService.create({ userId: form.userId, title: form.title, message: form.message, type: form.type, link: form.link || undefined });
      }
      setShowSend(false);
      setForm({ userId: "", title: "", message: "", type: "announcement", link: "" });
    } catch (err) {
      console.error("Failed to send notification:", err);
    }
    setSending(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Notifications</h2>
        <button onClick={() => setShowSend(true)}
          className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-all">
          + Send Notification
        </button>
      </div>

      <GlassCard>
        {notifications.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">No notifications yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-purple-500/10">
                  <th className="text-left py-3 px-3 text-gray-400 font-medium">User</th>
                  <th className="text-left py-3 px-3 text-gray-400 font-medium">Title</th>
                  <th className="text-left py-3 px-3 text-gray-400 font-medium">Type</th>
                  <th className="text-left py-3 px-3 text-gray-400 font-medium">Read</th>
                  <th className="text-left py-3 px-3 text-gray-400 font-medium">Date</th>
                  <th className="text-left py-3 px-3 text-gray-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {notifications.map((n: any) => (
                  <tr key={n.id} className="border-b border-purple-500/5 hover:bg-white/5">
                    <td className="py-3 px-3 text-gray-300 font-mono text-xs">{n.userId?.slice(0, 12)}...</td>
                    <td className="py-3 px-3">
                      <div>
                        <div className="text-white">{n.title}</div>
                        <div className="text-xs text-gray-500 truncate max-w-[200px]">{n.message}</div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${typeColors[n.type] || "bg-gray-500/10 text-gray-400"}`}>{n.type}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${n.read ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-400"}`}>
                        {n.read ? "Read" : "Unread"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-gray-500 text-xs">{n.createdAt ? new Date(n.createdAt).toLocaleDateString() : "—"}</td>
                    <td className="py-3 px-3">
                      <button onClick={() => notificationService.delete(n.id)}
                        className="px-2 py-1 rounded bg-red-500/10 text-red-400 text-xs hover:bg-red-500/20 transition-all">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {showSend && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowSend(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="glass rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">Send Notification</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Send To</label>
                <select value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-gray-300 focus:outline-none focus:border-purple-500">
                  <option value="">Select user...</option>
                  <option value="all">All Users</option>
                  {profiles.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.username || p.email || p.id}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-gray-300 focus:outline-none focus:border-purple-500">
                  <option value="announcement">Announcement</option>
                  <option value="purchase">Purchase</option>
                  <option value="update">Update</option>
                  <option value="ticket">Ticket</option>
                  <option value="review">Review</option>
                  <option value="license">License</option>
                  <option value="coupon">Coupon</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Title</label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Message</label>
                <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={3}
                  className="w-full px-4 py-2.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Link (optional)</label>
                <input type="text" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })}
                  placeholder="/dashboard/products"
                  className="w-full px-4 py-2.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-purple-500/10">
              <button onClick={() => setShowSend(false)}
                className="px-4 py-2 rounded-lg bg-dark-600 text-gray-300 text-sm hover:bg-dark-500 transition-all">Cancel</button>
              <button onClick={handleSend} disabled={sending || !form.title.trim() || !form.message.trim() || !form.userId}
                className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm hover:bg-purple-500 disabled:opacity-50 transition-all">
                {sending ? "Sending..." : "Send"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}

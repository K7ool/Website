"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { orderBy, limit, where } from "firebase/firestore";
import DashboardLayout from "@/components/DashboardLayout";
import GlassCard from "@/components/GlassCard";
import { useAuth } from "@/contexts/AuthContext";
import { orderService, ticketService, licenseService, downloadService, notificationService } from "@/lib/firestore";

export default function DashboardPage() {
  const { user, profile, isAdmin } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [licenses, setLicenses] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [downloads, setDownloads] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const orderConstraints: any[] = isAdmin
      ? [orderBy("createdAt", "desc"), limit(5)]
      : [where("userId", "==", user.uid), orderBy("createdAt", "desc"), limit(5)];

    const unsubOrders = orderService.subscribe((items) => {
      setOrders(items);
    }, orderConstraints);

    const ticketConstraints: any[] = isAdmin
      ? [orderBy("createdAt", "desc"), limit(5)]
      : [where("userId", "==", user.uid), orderBy("createdAt", "desc"), limit(5)];

    const unsubTickets = ticketService.subscribe((items) => {
      setTickets(items);
    }, ticketConstraints);

    const licenseConstraints: any[] = isAdmin
      ? []
      : [where("userId", "==", user.uid)];

    const unsubLicenses = licenseService.subscribe((items) => {
      setLicenses(items);
    }, licenseConstraints);

    const unsubDownloads = downloadService.subscribe((items) => {
      setDownloads(items);
    }, user.uid);

    const unsubNotifications = notificationService.subscribe(user.uid, (items) => {
      setNotifications(items);
    });

    setLoading(false);

    return () => {
      unsubOrders(); unsubTickets(); unsubLicenses(); unsubDownloads(); unsubNotifications();
    };
  }, [user, isAdmin]);

  const purchasedCount = orders.filter((o: any) => o.userId === user?.uid).length;
  const activeLicenses = licenses.filter((l: any) => l.active !== false).length;
  const openTickets = tickets.filter((t: any) => t.status === "open").length;
  const recentDownloads = downloads.filter((d: any) => {
    const dayAgo = Date.now() - 86400000;
    return new Date(d.createdAt).getTime() > dayAgo;
  }).length;

  const recentItems = orders
    .filter((o: any) => o.items?.length)
    .slice(0, 3)
    .map((o: any) => ({
      id: o.id,
      name: o.items?.[0]?.title || "Product",
      date: new Date(o.createdAt).toLocaleDateString(),
      status: o.status === "completed" ? "Active" : o.status,
    }));

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
        <h1 className="text-2xl font-bold text-white mb-1">Dashboard Overview</h1>
        {user?.uid && <p className="text-xs text-gray-500 mb-6 font-mono">UID: {user.uid}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Purchased Products", value: String(purchasedCount), change: `${orders.length} total orders` },
            { label: "Active Licenses", value: String(activeLicenses), change: `${licenses.length} total` },
            { label: "Support Tickets", value: String(openTickets), change: openTickets === 0 ? "None open" : `${openTickets} open` },
            { label: "Downloads Today", value: String(recentDownloads), change: "Last 24 hours" },
          ].map((stat, i) => (
            <GlassCard key={stat.label + i} delay={i * 0.05}>
              <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-sm text-gray-400">{stat.label}</div>
              <div className="text-xs text-gray-500 mt-1">{stat.change}</div>
            </GlassCard>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <GlassCard>
            <h2 className="text-lg font-semibold text-white mb-4">Recent Products</h2>
            {recentItems.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No purchases yet</p>
            ) : (
              <div className="space-y-3">
                {recentItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-dark-600">
                    <div>
                      <div className="text-sm font-medium text-white">{item.name}</div>
                      <div className="text-xs text-gray-500">Purchased {item.date}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 text-xs">{item.status}</span>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          <GlassCard>
            <h2 className="text-lg font-semibold text-white mb-4">Support Tickets</h2>
            {tickets.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No open tickets</p>
            ) : (
              <div className="space-y-3">
                {tickets.slice(0, 3).map((ticket: any) => (
                  <div key={ticket.id} className="p-3 rounded-lg bg-dark-600">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-white">{ticket.subject}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        ticket.status === "open" ? "bg-yellow-500/10 text-yellow-400" :
                        ticket.status === "closed" ? "bg-green-500/10 text-green-400" :
                        "bg-gray-500/10 text-gray-400"
                      }`}>{ticket.status}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      Priority: {ticket.priority} &middot; {new Date(ticket.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>

        <GlassCard>
          <h2 className="text-lg font-semibold text-white mb-4">Notifications</h2>
          {notifications.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No notifications</p>
          ) : (
            <div className="space-y-2">
              {notifications.map((n: any) => (
                <div key={n.id} className="flex items-start gap-3 p-3 rounded-lg bg-dark-600">
                  <div className="w-2 h-2 rounded-full bg-purple-500 mt-1.5 shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-white">{n.title}</div>
                    <div className="text-xs text-gray-400">{n.message}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">{new Date(n.createdAt).toLocaleDateString()}</div>
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

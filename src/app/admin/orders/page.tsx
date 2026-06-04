"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { orderBy } from "firebase/firestore";
import GlassCard from "@/components/GlassCard";
import { orderService, recalculateProductStats, userAchievementService, activityService } from "@/lib/firestore";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = orderService.subscribe((items) => {
      setOrders(items);
      setLoading(false);
    }, [orderBy("createdAt", "desc")]);
    return unsub;
  }, []);

  const updateStatus = async (id: string, status: string) => {
    const order = orders.find((o) => o.id === id);
    await orderService.updateStatus(id, status);
    if (order && (status === "completed") && order.userId) {
      userAchievementService.checkAfterPurchase(order.userId);
      activityService.log(order.userId, { type: "purchase", description: `Order ${order.orderNumber} completed`, metadata: { orderId: id } });
    }
    if (order && (status === "approved" || status === "completed" || status === "refunded")) {
      const ids: string[] = [];
      if (order.productId) ids.push(order.productId);
      if (order.items) order.items.forEach((i: any) => { if (i.id) ids.push(i.id); });
      ids.forEach((pid) => recalculateProductStats(pid));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <h2 className="text-2xl font-bold text-white mb-6">Orders</h2>
      <GlassCard>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-purple-500/10">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Order ID</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Customer</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Product</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Price</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Payment</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Date</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order: any) => (
                <tr key={order.id} className="border-b border-purple-500/5 hover:bg-white/5">
                  <td className="py-3 px-4 text-white font-mono text-xs">#{order.id.slice(0, 8)}</td>
                  <td className="py-3 px-4 text-gray-300">{order.customerName || order.userId?.slice(0, 8)}</td>
                  <td className="py-3 px-4 text-gray-300">{order.items?.[0]?.title || "—"}</td>
                  <td className="py-3 px-4 text-gray-300">${(order.total || 0).toFixed(2)}</td>
                  <td className="py-3 px-4 text-gray-300">{order.paymentMethod || "—"}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      order.status === "completed" ? "bg-green-500/10 text-green-400" :
                      order.status === "pending" ? "bg-yellow-500/10 text-yellow-400" :
                      "bg-red-500/10 text-red-400"
                    }`}>{order.status}</span>
                  </td>
                  <td className="py-3 px-4 text-gray-400">{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1">
                      {order.status !== "completed" && (
                        <button onClick={() => updateStatus(order.id, "completed")} className="px-2 py-1 rounded bg-green-500/10 text-green-400 text-xs hover:bg-green-500/20">Complete</button>
                      )}
                      {order.status !== "refunded" && (
                        <button onClick={() => updateStatus(order.id, "refunded")} className="px-2 py-1 rounded bg-red-500/10 text-red-400 text-xs hover:bg-red-500/20">Refund</button>
                      )}
                      {order.status !== "cancelled" && (
                        <button onClick={() => updateStatus(order.id, "cancelled")} className="px-2 py-1 rounded bg-gray-500/10 text-gray-400 text-xs hover:bg-gray-500/20">Cancel</button>
                      )}
                      <button onClick={() => { if (confirm("Permanently delete this order?")) orderService.delete(order.id); }} className="px-2 py-1 rounded bg-red-500/10 text-red-400 text-xs hover:bg-red-500/20">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </motion.div>
  );
}

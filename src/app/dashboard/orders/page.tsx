"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { orderBy, where } from "firebase/firestore";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import GlassCard from "@/components/GlassCard";
import LicenseHealthBadge from "@/components/LicenseHealthBadge";
import Invoice from "@/components/Invoice";
import { useAuth } from "@/contexts/AuthContext";
import { orderService, invoiceService, licenseService } from "@/lib/firestore";

export default function DashboardOrdersPage() {
  const { user, isAdmin } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<Map<string, any>>(new Map());
  const [licenses, setLicenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const constraints: any[] = isAdmin
      ? [orderBy("createdAt", "desc")]
      : [where("userId", "==", user.uid), orderBy("createdAt", "desc")];
    const unsub = orderService.subscribe((items) => {
      const filtered = isAdmin ? items : items.filter((o: any) => o.userId === user.uid);
      setOrders(filtered);
      setLoading(false);
    }, constraints);
    return unsub;
  }, [user, isAdmin]);

  useEffect(() => {
    if (!user) return;
    const unsub = invoiceService.subscribe((items) => {
      const map = new Map<string, any>();
      items.forEach((inv: any) => { if (inv.orderId) map.set(inv.orderId, inv); });
      setInvoices(map);
    }, [where("userId", "==", user.uid)]);
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsub = licenseService.subscribe((items) => {
      setLicenses(items.filter((l: any) => l.userId === user.uid));
    }, [where("userId", "==", user.uid)]);
    return unsub;
  }, [user]);

  const getLicenseForOrder = (order: any) => {
    const productId = order.productId || order.items?.[0]?.productId || order.items?.[0]?.id;
    if (!productId) return null;
    return licenses.find((l: any) => l.productId === productId && l.status === "active") || null;
  };

  const [verifyModal, setVerifyModal] = useState<any | null>(null);
  const [verifyInput, setVerifyInput] = useState("");
  const [verifyResult, setVerifyResult] = useState<{ valid: boolean; msg: string } | null>(null);

  const doVerify = () => {
    const lic = verifyModal;
    if (!lic || !verifyInput.trim()) return;
    const input = verifyInput.trim().toUpperCase();
    const key = (lic.key || "").toUpperCase();
    if (input !== key) { setVerifyResult({ valid: false, msg: "Invalid License Key" }); return; }
    if (lic.status !== "active") { setVerifyResult({ valid: false, msg: "License Expired" }); return; }
    if (lic.expiresAt && new Date(lic.expiresAt) < new Date()) { setVerifyResult({ valid: false, msg: "License Expired" }); return; }
    setVerifyResult({ valid: true, msg: "License Verified — Active and Valid" });
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending_payment: "bg-yellow-500/10 text-yellow-400",
      approved: "bg-blue-500/10 text-blue-400",
      completed: "bg-green-500/10 text-green-400",
      rejected: "bg-red-500/10 text-red-400",
    };
    const labels: Record<string, string> = {
      pending_payment: "Pending Verification",
      approved: "Approved",
      completed: "Completed",
      rejected: "Rejected",
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs ${styles[status] || "bg-gray-500/10 text-gray-400"}`}>
        {labels[status] || status}
      </span>
    );
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
        <h1 className="text-2xl font-bold text-white mb-6">Orders</h1>
        <GlassCard>
          {orders.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">No orders found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-purple-500/10">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Order</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Product</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Amount</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Payment</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Date</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order: any) => {
                    const inv = invoices.get(order.id);
                    const lic = getLicenseForOrder(order);
                    const isCompleted = order.status === "completed" || order.status === "approved";
                    return (
                      <tr key={order.id} className="border-b border-purple-500/5 hover:bg-white/5">
                        <td className="py-3 px-4 text-white font-mono text-xs">{order.orderNumber || `#${order.id.slice(0, 8).toUpperCase()}`}</td>
                        <td className="py-3 px-4 text-gray-300 max-w-[160px] truncate">{order.items?.[0]?.title || order.productName || "—"}</td>
                        <td className="py-3 px-4 text-gray-300">${(order.total || 0).toFixed(2)}</td>
                        <td className="py-3 px-4">
                          <span className="text-xs text-gray-400">
                            {order.paymentMethod === "discord" ? "Discord" :
                             order.paymentMethod === "vodafone_cash" ? "Vodafone Cash" :
                             order.paymentMethod || "—"}
                          </span>
                        </td>
                        <td className="py-3 px-4">{statusBadge(order.status)}</td>
                        <td className="py-3 px-4 text-gray-400 text-xs">{new Date(order.createdAt).toLocaleDateString()}</td>
                        <td className="py-3 px-4">
                          {order.status === "pending_payment" ? (
                            <span className="text-xs text-gray-500">—</span>
                          ) : isCompleted && lic ? (
                            <div className="flex flex-wrap gap-1.5">
                              <LicenseHealthBadge lic={lic} />
                              <button onClick={() => { navigator.clipboard.writeText(lic.key); }}
                                className="px-2 py-1 rounded bg-dark-600 text-gray-300 text-xs hover:bg-dark-500 transition-all">
                                Copy License
                              </button>
                              <button onClick={() => { setVerifyModal(lic); setVerifyInput(""); setVerifyResult(null); }}
                                className="px-2 py-1 rounded bg-blue-500/10 text-blue-400 text-xs hover:bg-blue-500/20 transition-all">
                                Verify License
                              </button>
                              <Link href={`/dashboard/licenses`}
                                className="px-2 py-1 rounded bg-purple-500/10 text-purple-400 text-xs hover:bg-purple-500/20 transition-all">
                                View License
                              </Link>
                              {inv ? (
                                <Link href={`/dashboard/invoices/${inv.id}`}
                                  className="px-2 py-1 rounded bg-green-500/10 text-green-400 text-xs hover:bg-green-500/20 transition-all">
                                  Download Invoice
                                </Link>
                              ) : (
                                <span className="text-xs text-gray-500">Loading invoice...</span>
                              )}
                            </div>
                          ) : isCompleted && !lic ? (
                            <div className="flex flex-wrap gap-1.5">
                              <span className="text-xs text-yellow-400">License pending</span>
                              {inv ? (
                                <Link href={`/dashboard/invoices/${inv.id}`}
                                  className="px-2 py-1 rounded bg-green-500/10 text-green-400 text-xs hover:bg-green-500/20 transition-all">
                                  Download Invoice
                                </Link>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-500">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      </motion.div>

      {/* Verify License Modal */}
      {verifyModal && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => { setVerifyModal(null); setVerifyResult(null); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="glass rounded-2xl p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white mb-2">Verify License</h3>
            <p className="text-sm text-gray-400 mb-4">
              Enter license key for <span className="text-white">{verifyModal.productName || "Product"}</span>
            </p>
            <input type="text" value={verifyInput} onChange={(e) => setVerifyInput(e.target.value)}
              placeholder="FLIPP-XXXX-XXXX-XXXX"
              className="w-full px-4 py-2.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 mb-4" />
            {verifyResult && (
              <div className={`p-3 rounded-xl mb-4 text-sm ${
                verifyResult.valid ? "bg-green-500/10 border border-green-500/20 text-green-400" : "bg-red-500/10 border border-red-500/20 text-red-400"
              }`}>{verifyResult.msg}</div>
            )}
            <div className="flex justify-end gap-3">
              <button onClick={() => { setVerifyModal(null); setVerifyResult(null); }}
                className="px-4 py-2 rounded-lg bg-dark-600 text-gray-300 text-sm hover:bg-dark-500 transition-all">Close</button>
              {!verifyResult && (
                <button onClick={doVerify} disabled={!verifyInput.trim()}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-500 disabled:opacity-50 transition-all">Verify</button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </DashboardLayout>
  );
}

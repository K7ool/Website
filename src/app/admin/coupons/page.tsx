"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GlassCard from "@/components/GlassCard";
import { couponService } from "@/lib/firestore";
import { useAuth } from "@/contexts/AuthContext";

const initialForm = {
  code: "", type: "percentage" as "percentage" | "fixed", value: 0,
  maxUses: 0, minPurchase: 0, applicableProducts: [] as string[],
  expiresAt: "",
};

export default function AdminCouponsPage() {
  const { user } = useAuth();
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ ...initialForm });
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loadTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadTimeout.current = setTimeout(() => {
      if (loading) {
        setLoadError("Failed to load coupons. Check Firestore rules or console for details.");
        setLoading(false);
      }
    }, 8000);

    const unsub = couponService.subscribe((items) => {
      setCoupons(items);
      setLoading(false);
      setLoadError(null);
      if (loadTimeout.current) clearTimeout(loadTimeout.current);
    });
    return () => {
      unsub();
      if (loadTimeout.current) clearTimeout(loadTimeout.current);
    };
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...initialForm });
    setShowModal(true);
  };

  const openEdit = (coupon: any) => {
    setEditing(coupon);
    setForm({
      code: coupon.code || "",
      type: coupon.type || "percentage",
      value: coupon.value || 0,
      maxUses: coupon.maxUses || 0,
      minPurchase: coupon.minPurchase || 0,
      applicableProducts: coupon.applicableProducts || [],
      expiresAt: coupon.expiresAt ? new Date(coupon.expiresAt).toISOString().split("T")[0] : "",
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.code.trim() || !form.value) return;
    setSubmitting(true);
    setError(null);
    if (!user) { setError("Not authenticated"); setSubmitting(false); return; }
    try {
      const token = await user.getIdToken();
      const data = {
        code: form.code.toUpperCase(),
        type: form.type,
        value: Number(form.value),
        maxUses: Number(form.maxUses),
        minPurchase: Number(form.minPurchase),
        applicableProducts: form.applicableProducts,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : "",
        ...(editing ? { id: editing.id } : {}),
        ...(editing && editing.active !== undefined ? { active: editing.active } : {}),
      };

      const res = await fetch("/api/admin/coupons", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      setShowModal(false);
      setEditing(null);
    } catch (err: any) {
      setError(`Error: ${err.message || err}`);
    }
    setSubmitting(false);
  };

  const toggleActive = async (coupon: any) => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/coupons", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: coupon.id, active: !coupon.active }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
    } catch (err: any) {
      setError(`Toggle failed: ${err.message || err}`);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || !user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/coupons?id=${deleteTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      setDeleteTarget(null);
    } catch (err: any) {
      setError(`Delete failed: ${err.message || err}`);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400 animate-pulse">Loading Coupons...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 max-w-md text-center">
          {loadError}
        </div>
        <button onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm hover:bg-purple-500 transition-all">
          Retry
        </button>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Coupons</h2>
        <button onClick={openAdd}
          className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-all">
          + Create Coupon
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400 break-all">
          {error}
          <button onClick={() => setError(null)} className="ml-3 text-red-300 hover:text-white">&times;</button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <GlassCard><div className="text-2xl font-bold text-white">{coupons.length}</div><div className="text-xs text-gray-400">Total Coupons</div></GlassCard>
        <GlassCard><div className="text-2xl font-bold text-green-400">{coupons.filter((c: any) => c.active).length}</div><div className="text-xs text-gray-400">Active</div></GlassCard>
        <GlassCard><div className="text-2xl font-bold text-red-400">{coupons.filter((c: any) => !c.active).length}</div><div className="text-xs text-gray-400">Disabled</div></GlassCard>
        <GlassCard><div className="text-2xl font-bold text-blue-400">{coupons.reduce((s: number, c: any) => s + (c.usedCount || 0), 0)}</div><div className="text-xs text-gray-400">Total Uses</div></GlassCard>
      </div>

      <GlassCard>
        {coupons.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">No coupons yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-purple-500/10">
                  <th className="text-left py-3 px-3 text-gray-400 font-medium">Code</th>
                  <th className="text-left py-3 px-3 text-gray-400 font-medium">Type</th>
                  <th className="text-left py-3 px-3 text-gray-400 font-medium">Value</th>
                  <th className="text-left py-3 px-3 text-gray-400 font-medium">Uses</th>
                  <th className="text-left py-3 px-3 text-gray-400 font-medium">Expires</th>
                  <th className="text-left py-3 px-3 text-gray-400 font-medium">Status</th>
                  <th className="text-left py-3 px-3 text-gray-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((coupon: any) => (
                  <tr key={coupon.id} className="border-b border-purple-500/5 hover:bg-white/5">
                    <td className="py-3 px-3">
                      <code className="text-purple-300 bg-dark-600 px-2 py-0.5 rounded font-mono">{coupon.code}</code>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${coupon.type === "percentage" ? "bg-blue-500/10 text-blue-400" : "bg-green-500/10 text-green-400"}`}>
                        {coupon.type === "percentage" ? "%" : "$"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-white font-medium">
                      {coupon.type === "percentage" ? `${coupon.value}%` : `$${coupon.value}`}
                    </td>
                    <td className="py-3 px-3 text-gray-400">{coupon.usedCount || 0}/{coupon.maxUses || "∞"}</td>
                    <td className="py-3 px-3 text-xs text-gray-500">
                      {coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString() : "Never"}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${coupon.active ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                        {coupon.active ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex gap-1.5">
                        <button onClick={() => openEdit(coupon)}
                          className="px-2 py-1 rounded bg-blue-500/10 text-blue-400 text-xs hover:bg-blue-500/20 transition-all">Edit</button>
                        <button onClick={() => toggleActive(coupon)}
                          className={`px-2 py-1 rounded text-xs transition-all ${coupon.active ? "bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20" : "bg-green-500/10 text-green-400 hover:bg-green-500/20"}`}>
                          {coupon.active ? "Disable" : "Enable"}
                        </button>
                        <button onClick={() => setDeleteTarget(coupon)}
                          className="px-2 py-1 rounded bg-red-500/10 text-red-400 text-xs hover:bg-red-500/20 transition-all">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => { setShowModal(false); setEditing(null); }}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="glass rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-white mb-4">{editing ? "Edit Coupon" : "Create Coupon"}</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Coupon Code *</label>
                  <input type="text" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    placeholder="SAVE20"
                    className="w-full px-4 py-2.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 uppercase" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">Type</label>
                    <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as "percentage" | "fixed" })}
                      className="w-full px-4 py-2.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-gray-300 focus:outline-none focus:border-purple-500">
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Fixed Amount</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">Value *</label>
                    <input type="number" step="0.01" min="0" value={form.value || ""} onChange={(e) => setForm({ ...form, value: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white focus:outline-none focus:border-purple-500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">Max Uses (0 = unlimited)</label>
                    <input type="number" min="0" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white focus:outline-none focus:border-purple-500" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">Min Purchase</label>
                    <input type="number" step="0.01" min="0" value={form.minPurchase || ""} onChange={(e) => setForm({ ...form, minPurchase: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white focus:outline-none focus:border-purple-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Expiry Date</label>
                  <input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white focus:outline-none focus:border-purple-500" />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-purple-500/10">
                <button onClick={() => { setShowModal(false); setEditing(null); }}
                  className="px-4 py-2 rounded-lg bg-dark-600 text-gray-300 text-sm hover:bg-dark-500 transition-all">Cancel</button>
                <button onClick={handleSubmit} disabled={submitting || !form.code.trim() || !form.value}
                  className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm hover:bg-purple-500 disabled:opacity-50 transition-all">
                  {submitting ? "Saving..." : editing ? "Save Changes" : "Create"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteTarget(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="glass rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-white mb-2">Delete Coupon</h3>
              <p className="text-sm text-gray-400 mb-6">Delete <span className="text-white font-medium">{deleteTarget.code}</span>? This cannot be undone.</p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 rounded-lg bg-dark-600 text-gray-300 text-sm hover:bg-dark-500 transition-all">Cancel</button>
                <button onClick={handleDelete}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-500 transition-all">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

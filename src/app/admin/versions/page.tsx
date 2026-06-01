"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GlassCard from "@/components/GlassCard";
import { productService, productVersionService } from "@/lib/firestore";
import { useAuth } from "@/contexts/AuthContext";

const initialForm = { version: "1.0.0", title: "", notes: "" };

function DebugPanel({ user, profile, isAdmin }: { user: any; profile: any; isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<{ exists: boolean; length: number; uid?: string } | null>(null);
  const [fetching, setFetching] = useState(false);

  const fetchToken = useCallback(async () => {
    if (!user) { setTokenInfo({ exists: false, length: 0 }); return; }
    setFetching(true);
    try {
      const t = await user.getIdToken(true);
      const d = JSON.parse(atob(t.split(".")[1]));
      setTokenInfo({ exists: true, length: t.length, uid: d.sub });
    } catch {
      setTokenInfo({ exists: false, length: 0 });
    }
    setFetching(false);
  }, [user]);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="mb-4 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs hover:bg-red-500/20 transition-all">
        🐛 Debug: Show Auth State
      </button>
    );
  }

  return (
    <div className="mb-4 p-4 rounded-xl bg-dark-800 border border-red-500/20 text-xs font-mono space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-red-400 font-bold">🐛 DEBUG — Auth State</span>
        <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white">✕</button>
      </div>
      <div className="text-gray-300 space-y-1">
        <div>👤 UID: {user?.uid || <span className="text-red-400">NULL</span>}</div>
        <div>👤 Email: {user?.email || <span className="text-red-400">NULL</span>}</div>
        <div>🔑 isAdmin: {isAdmin ? <span className="text-green-400">true</span> : <span className="text-red-400">false</span>}</div>
        <div>📄 profile.role: {profile?.role || <span className="text-red-400">MISSING</span>}</div>
        <div className="flex items-center gap-2">
          <span>🎫 Token:</span>
          {tokenInfo ? (
            tokenInfo.exists
              ? <span className="text-green-400">✅ {tokenInfo.length} chars</span>
              : <span className="text-red-400">❌ none</span>
          ) : (
            <span className="text-gray-500">—</span>
          )}
          <button onClick={fetchToken} disabled={fetching || !user}
            className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[10px] hover:bg-purple-500/20 disabled:opacity-50">
            {fetching ? "..." : "Fetch"}
          </button>
        </div>
        {tokenInfo?.uid && <div>🔖 Token UID: {tokenInfo.uid}</div>}
      </div>
    </div>
  );
}

export default function AdminVersionsPage() {
  const { user, profile, isAdmin } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ ...initialForm });
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [notifying, setNotifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notifyResult, setNotifyResult] = useState<string | null>(null);
  const [notifyError, setNotifyError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = productService.subscribe((items) => {
      setProducts(items.filter((p: any) => p.status === "published"));
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!selectedProduct) { setVersions([]); return; }
    const unsub = productVersionService.subscribe(selectedProduct.id, (items) => setVersions(items));
    return unsub;
  }, [selectedProduct]);

  const openAdd = () => { setEditing(null); setForm({ ...initialForm }); setShowModal(true); };

  const openEdit = (v: any) => {
    setEditing(v);
    setForm({
      version: v.version || "", title: v.title || "",
      notes: Array.isArray(v.notes) ? v.notes.join("\n") : "",
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!selectedProduct || !form.version.trim()) return;
    if (!user) { setError("User not logged in"); return; }
    setSubmitting(true); setError(null);
    try {
      const token = await user.getIdToken(true);
      const notes = form.notes.split("\n").map((n) => n.trim()).filter(Boolean);
      const data = { version: form.version.trim(), title: form.title.trim(), notes };
      const method = editing ? "PUT" : "POST";
      const body = editing
        ? { productId: selectedProduct.id, versionId: editing.id, ...data }
        : { productId: selectedProduct.id, ...data };
      const res = await fetch("/api/admin/versions", {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || `HTTP ${res.status}`); }
      setShowModal(false); setEditing(null);
    } catch (err: any) {
      console.error("[VERSIONS] handleSubmit:", err.message);
      setError(err.message || "Save failed");
    }
    setSubmitting(false);
  };

  const handleDelete = async () => {
    if (!selectedProduct || !deleteTarget) return;
    if (!user) { setError("User not logged in"); return; }
    setError(null);
    try {
      const token = await user.getIdToken(true);
      const res = await fetch(
        `/api/admin/versions?productId=${selectedProduct.id}&versionId=${deleteTarget.id}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || `HTTP ${res.status}`); }
      setDeleteTarget(null);
    } catch (err: any) {
      console.error("[VERSIONS] handleDelete:", err.message);
      setError(err.message || "Delete failed");
    }
  };

  const notifyOwners = async () => {
    if (!selectedProduct || !versions.length) return;
    if (!user) { setNotifyError("User not logged in"); return; }
    setNotifying(true); setNotifyResult(null); setNotifyError(null);
    const latestVersion = versions[0];
    try {
      const token = await user.getIdToken(true);
      if (!token || token.length < 20) { throw new Error("Token is empty or malformed"); }
      console.log("[NOTIFY_OWNERS] uid:", user.uid, "email:", user.email, "tokenLength:", token.length);
      const res = await fetch("/api/admin/notify-owners", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          productId: selectedProduct.id,
          productName: selectedProduct.name || selectedProduct.title,
          productSlug: selectedProduct.slug,
          latestVersion: latestVersion.version,
          latestTitle: latestVersion.title || "",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`);
      setNotifyResult(`✓ Notifications sent to ${data.notifiedCount} owner${data.notifiedCount !== 1 ? "s" : ""}`);
    } catch (err: any) {
      console.error("[NOTIFY_OWNERS]", err.message);
      setNotifyError(err.message || "Notify failed");
    }
    setNotifying(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <h2 className="text-2xl font-bold text-white mb-6">Product Versions</h2>
      <DebugPanel user={user} profile={profile} isAdmin={isAdmin} />
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400 break-all">
          {error} <button onClick={() => setError(null)} className="ml-2 text-red-300 hover:text-white">&times;</button>
        </div>
      )}
      <div className="mb-6">
        <label className="block text-sm text-gray-400 mb-1.5">Select Product</label>
        <select
          value={selectedProduct?.id || ""}
          onChange={(e) => setSelectedProduct(products.find((p) => p.id === e.target.value) || null)}
          className="w-full max-w-md px-4 py-2.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-gray-300 focus:outline-none focus:border-purple-500"
        >
          <option value="">Choose a product...</option>
          {products.map((p: any) => (
            <option key={p.id} value={p.id}>{p.name || p.title} (v{p.version || "1.0.0"})</option>
          ))}
        </select>
      </div>

      {selectedProduct ? (
        <>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">{selectedProduct.name} — Version History</h3>
            <div className="flex items-center gap-3">
              {notifyResult && <span className="text-xs text-green-400">{notifyResult}</span>}
              {notifyError && <span className="text-xs text-red-400">{notifyError}</span>}
              <button onClick={notifyOwners} disabled={notifying || !versions.length || !user}
                className="px-3 py-1.5 rounded-lg bg-blue-600/10 text-blue-400 text-xs hover:bg-blue-600/20 disabled:opacity-50 transition-all">
                {notifying ? "Notifying..." : "Notify Owners"}
              </button>
              <button onClick={openAdd}
                className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-all">
                + Add Version
              </button>
            </div>
          </div>

          {!versions.length ? (
            <GlassCard><p className="text-sm text-gray-400 text-center py-10">No versions yet.</p></GlassCard>
          ) : (
            <div className="space-y-3">
              {versions.map((v: any, i: number) => (
                <GlassCard key={v.id} delay={i * 0.03}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 text-xs font-mono">v{v.version}</span>
                        {i === 0 && <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-400 text-xs">Latest</span>}
                        <span className="text-xs text-gray-500">{v.createdAt ? new Date(v.createdAt).toLocaleDateString() : ""}</span>
                      </div>
                      {v.title && <h4 className="text-sm font-medium text-white mb-2">{v.title}</h4>}
                      {v.notes?.length > 0 && (
                        <ul className="space-y-1">
                          {v.notes.map((note: string, ni: number) => (
                            <li key={ni} className="flex items-start gap-2 text-xs text-gray-400">
                              <span className="text-purple-400 mt-0.5">•</span>{note}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => openEdit(v)}
                        className="px-2 py-1 rounded bg-blue-500/10 text-blue-400 text-xs hover:bg-blue-500/20 transition-all">Edit</button>
                      <button onClick={() => setDeleteTarget(v)}
                        className="px-2 py-1 rounded bg-red-500/10 text-red-400 text-xs hover:bg-red-500/20 transition-all">Delete</button>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </>
      ) : (
        <GlassCard><p className="text-sm text-gray-400 text-center py-10">Select a product to manage its versions.</p></GlassCard>
      )}

      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => { setShowModal(false); setEditing(null); }}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="glass rounded-2xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-white mb-4">{editing ? "Edit Version" : "Add Version"}</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">Version *</label>
                    <input type="text" value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })}
                      placeholder="1.2.0"
                      className="w-full px-4 py-2.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">Title</label>
                    <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="Building Save System"
                      className="w-full px-4 py-2.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Release Notes (one per line)</label>
                  <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={6}
                    placeholder="Added save slots&#10;Added plot backups&#10;Improved performance"
                    className="w-full px-4 py-2.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none" />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-purple-500/10">
                <button onClick={() => { setShowModal(false); setEditing(null); }}
                  className="px-4 py-2 rounded-lg bg-dark-600 text-gray-300 text-sm hover:bg-dark-500 transition-all">Cancel</button>
                <button onClick={handleSubmit} disabled={submitting || !form.version.trim()}
                  className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm hover:bg-purple-500 disabled:opacity-50 transition-all">
                  {submitting ? "Saving..." : editing ? "Save" : "Create"}
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
              <h3 className="text-lg font-bold text-white mb-2">Delete Version</h3>
              <p className="text-sm text-gray-400 mb-6">Delete v{deleteTarget.version}?</p>
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

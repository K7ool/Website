"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { orderBy, where } from "firebase/firestore";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import GlassCard from "@/components/GlassCard";
import { useAuth } from "@/contexts/AuthContext";
import { licenseService, licenseVerificationService, productService, productVersionService } from "@/lib/firestore";

export default function DashboardProductsPage() {
  const { user } = useAuth();
  const [licenses, setLicenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Record<string, any>>({});
  const [latestVersions, setLatestVersions] = useState<Record<string, any>>({});
  const [showChangelog, setShowChangelog] = useState<any | null>(null);
  const [verifiedIds, setVerifiedIds] = useState<Set<string>>(new Set());
  const [verifyModal, setVerifyModal] = useState<any | null>(null);
  const [verifyInput, setVerifyInput] = useState("");
  const [verifyResult, setVerifyResult] = useState<{ valid: boolean; msg: string } | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsub = licenseService.subscribe((items) => {
      setLicenses(items);
      setLoading(false);
    }, [where("userId", "==", user.uid), orderBy("createdAt", "desc")]);
    return unsub;
  }, [user]);

  useEffect(() => {
    const unsub = productService.subscribe((items) => {
      const map: Record<string, any> = {};
      items.forEach((p: any) => { map[p.id] = p; });
      setProducts(map);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsubscribers: (() => void)[] = [];
    const versionMap: Record<string, any> = {};
    const uniqueProductIds = new Set(licenses.map((l: any) => l.productId));
    uniqueProductIds.forEach((pid) => {
      const unsub = productVersionService.subscribe(pid, (versions) => {
        versionMap[pid] = versions[0] || null;
        setLatestVersions({ ...versionMap });
      });
      unsubscribers.push(unsub);
    });
    return () => unsubscribers.forEach((u) => u());
  }, [licenses]);

  useEffect(() => {
    if (!user) return;
    const unsub = licenseVerificationService.subscribe(user.uid, (items) => {
      setVerifiedIds(new Set(items.map((v: any) => v.licenseId)));
    });
    return unsub;
  }, [user]);

  const handleVerify = (lic: any) => {
    setVerifyModal(lic);
    setVerifyInput("");
    setVerifyResult(null);
  };

  const doVerify = useCallback(async () => {
    const lic = verifyModal;
    if (!lic || !verifyInput.trim()) return;
    setVerifyingId(lic.id);
    const input = verifyInput.trim().toUpperCase();
    const key = (lic.key || "").toUpperCase();
    console.log("[Verify Debug]", { enteredLicense: input, licenseDocument: lic.key, userId: user?.uid, licenseUserId: lic.userId, licenseStatus: lic.status, licenseProductId: lic.productId });
    if (input !== key) {
      setVerifyResult({ valid: false, msg: "Invalid License Key" });
      setVerifyingId(null);
      return;
    }
    if (lic.userId !== user?.uid) {
      setVerifyResult({ valid: false, msg: "License belongs to another account" });
      setVerifyingId(null);
      return;
    }
    if (lic.status !== "active") {
      if (lic.status === "revoked") { setVerifyResult({ valid: false, msg: "License revoked" }); }
      else { setVerifyResult({ valid: false, msg: "License expired" }); }
      setVerifyingId(null);
      return;
    }
    if (lic.expiresAt && new Date(lic.expiresAt) < new Date()) {
      setVerifyResult({ valid: false, msg: "License expired" });
      setVerifyingId(null);
      return;
    }
    try {
      const payload = { userId: user!.uid, licenseId: lic.id, productId: lic.productId };
      console.log("[Verify] currentUser.uid:", user!.uid, "payload:", payload, "collection: license_verifications");
      await licenseVerificationService.create(payload);
      console.log("[Verify] verification document created successfully");
    } catch (e: any) {
      console.error("[Verify] Firestore write failed (non-critical):", e?.code || e);
    }
    setVerifyResult({ valid: true, msg: "✓ License Verified" });
    setVerifiedIds((prev) => new Set(prev).add(lic.id));
    setVerifyingId(null);
  }, [verifyModal, verifyInput, user]);

  const handleDownload = async (lic: any) => {
    try {
      if (!user) return;
      console.log("[Download] productId:", lic.productId, "licenseId:", lic.id, "downloadFile:", lic.downloadFile, "fileName:", lic.fileName);
      let downloadUrl = "";
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/verify-download", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ licenseId: lic.id, productId: lic.productId }),
        });
        if (res.ok) {
          const data = await res.json();
          downloadUrl = data.downloadUrl;
        }
      } catch (apiErr) {
        console.warn("[Download] API route unavailable, falling back to client-side verify");
      }
      if (!downloadUrl) {
        console.log("[Download] Re-verifying license via Firestore...");
        const fresh = await licenseService.getById(lic.id);
        if (!fresh) { alert("License not found."); return; }
        if (fresh.userId !== user.uid) { alert("License does not belong to you."); return; }
        if (fresh.status !== "active") { alert("License is not active."); return; }
        if (fresh.expiresAt && new Date(fresh.expiresAt) < new Date()) { alert("License has expired."); return; }
        downloadUrl = fresh.downloadFile || "";
        if (!downloadUrl || downloadUrl === "#") { alert("No product file uploaded by admin."); return; }
      }
      const { downloadService } = await import("@/lib/firestore");
      await downloadService.log(user.uid, lic.productId, lic.productName || "Product");
      console.log("[Download] Opening URL:", downloadUrl);
      window.open(downloadUrl, "_blank");
    } catch (e: any) {
      console.error("[Download] Failed:", e);
      alert("Download failed. Please try again.");
    }
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
        <h1 className="text-2xl font-bold text-white mb-6">My Products</h1>

        {licenses.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-dark-600 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No products yet</h3>
            <p className="text-gray-400">Browse our store and purchase your first product</p>
            <Link href="/products" className="inline-block mt-4 px-6 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-medium hover:from-purple-500 hover:to-blue-500 transition-all">
              Browse Store
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
              {licenses.map((lic: any, i: number) => {
              const expired = lic.expiresAt && new Date(lic.expiresAt) < new Date() && lic.status === "active";
              const statusLabel = expired ? "Expired" : lic.status === "active" ? "Active" : lic.status;
              const isVerified = verifiedIds.has(lic.id);
              const product = products[lic.productId];
              const currentVersion = product?.version || "1.0.0";
              const latestVersion = latestVersions[lic.productId];
              const hasUpdate = latestVersion && latestVersion.version !== currentVersion;
              return (
                <GlassCard key={lic.id} delay={i * 0.05}>
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-white">{lic.productName || lic.productTitle || "Product"}</h3>
                        {hasUpdate && (
                          <button onClick={() => setShowChangelog(latestVersion)}
                            className="px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 text-xs border border-yellow-500/20 hover:bg-yellow-500/20 transition-all flex items-center gap-1">
                            <span>🟡</span> Update Available
                          </button>
                        )}
                      </div>
                      <div className="space-y-1.5 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">License:</span>
                          <code className="text-purple-300 bg-dark-600 px-2 py-0.5 rounded font-mono">{lic.key}</code>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">Status:</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            expired || lic.status === "revoked" ? "bg-red-500/10 text-red-400" :
                            lic.status === "active" ? "bg-green-500/10 text-green-400" :
                            "bg-yellow-500/10 text-yellow-400"
                          }`}>{statusLabel}</span>
                        </div>
                        {hasUpdate && (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400">Version:</span>
                            <span className="text-gray-300">{currentVersion}</span>
                            <span className="text-gray-500">&rarr;</span>
                            <span className="text-yellow-400 font-medium">{latestVersion.version}</span>
                          </div>
                        )}
                        {lic.expiresAt && (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400">Expires:</span>
                            <span className={expired ? "text-red-400" : "text-gray-300"}>
                              {new Date(lic.expiresAt).toLocaleDateString()}
                              {!expired && lic.status === "active" && (
                                <span className="ml-2 text-yellow-400">
                                  ({Math.ceil((new Date(lic.expiresAt).getTime() - Date.now()) / 86400000)} days left)
                                </span>
                              )}
                            </span>
                          </div>
                        )}
                        {lic.durationMonths ? (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400">Duration:</span>
                            <span className="text-gray-300">{lic.durationMonths} month{lic.durationMonths > 1 ? "s" : ""}</span>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 shrink-0">
                      <button onClick={() => { navigator.clipboard.writeText(lic.key); }}
                        className="px-3 py-2 rounded-lg bg-dark-600 text-gray-300 text-xs hover:bg-dark-500 transition-all">
                        Copy License
                      </button>
                      {isVerified ? (
                        <span className="px-3 py-2 rounded-lg bg-green-500/10 text-green-400 text-xs font-medium flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Verified ✓
                        </span>
                      ) : (
                        <button onClick={() => handleVerify(lic)}
                          className="px-3 py-2 rounded-lg bg-blue-500/10 text-blue-400 text-xs hover:bg-blue-500/20 transition-all">
                          Verify License
                        </button>
                      )}
                      {isVerified && (lic.downloadFile && lic.downloadFile !== "#") && (
                        <button onClick={() => handleDownload(lic)}
                          className="px-3 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs font-medium hover:from-purple-500 hover:to-blue-500 transition-all">
                          Download Product
                        </button>
                      )}
                      <Link href={`/dashboard/invoices/${lic.invoiceId || ""}`}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          lic.invoiceId ? "bg-green-500/10 text-green-400 hover:bg-green-500/20" : "bg-dark-600 text-gray-500 pointer-events-none"
                        }`}>
                        Download Invoice
                      </Link>
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}

        {/* Verify License Modal */}
        {verifyModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => { setVerifyModal(null); setVerifyResult(null); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass rounded-2xl p-6 w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-white mb-2">Verify License</h3>
              <p className="text-sm text-gray-400 mb-4">
                Enter your license key for <span className="text-white">{verifyModal.productName || verifyModal.productTitle}</span>
              </p>
              <input
                type="text"
                value={verifyInput}
                onChange={(e) => setVerifyInput(e.target.value)}
                placeholder="FLIPP-XXXX-XXXX-XXXX"
                className="w-full px-4 py-2.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 mb-4"
              />
              {verifyResult && (
                <div className={`p-3 rounded-xl mb-4 text-sm ${
                  verifyResult.valid
                    ? "bg-green-500/10 border border-green-500/20 text-green-400"
                    : "bg-red-500/10 border border-red-500/20 text-red-400"
                }`}>
                  {verifyResult.msg}
                </div>
              )}
              <div className="flex justify-end gap-3">
                <button onClick={() => { setVerifyModal(null); setVerifyResult(null); }}
                  className="px-4 py-2 rounded-lg bg-dark-600 text-gray-300 text-sm hover:bg-dark-500 transition-all">Close</button>
                {!verifyResult && (
                  <button onClick={doVerify} disabled={!verifyInput.trim() || verifyingId === verifyModal.id}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-500 disabled:opacity-50 transition-all">
                    {verifyingId === verifyModal.id ? "Verifying..." : "Verify"}
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </motion.div>

      <AnimatePresence>
        {showChangelog && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowChangelog(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="glass rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Update Available</h3>
                <button onClick={() => setShowChangelog(null)} className="text-gray-400 hover:text-white">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex items-center gap-2 mb-4">
                <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 text-xs font-mono">v{showChangelog.version}</span>
                <span className="text-xs text-gray-500">{showChangelog.createdAt ? new Date(showChangelog.createdAt).toLocaleDateString() : ""}</span>
              </div>
              {showChangelog.title && <h4 className="text-sm font-medium text-white mb-3">{showChangelog.title}</h4>}
              {showChangelog.notes?.length > 0 && (
                <ul className="space-y-2">
                  {showChangelog.notes.map((note: string, ni: number) => (
                    <li key={ni} className="flex items-start gap-2 text-sm text-gray-400">
                      <svg className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {note}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-6 flex justify-end">
                <button onClick={() => setShowChangelog(null)}
                  className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm hover:bg-purple-500 transition-all">Close</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}

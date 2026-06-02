"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { orderBy, where } from "firebase/firestore";
import DashboardLayout from "@/components/DashboardLayout";
import GlassCard from "@/components/GlassCard";
import LicenseHealthBadge from "@/components/LicenseHealthBadge";
import { licenseService, licenseVerificationService } from "@/lib/firestore";
import { useAuth } from "@/contexts/AuthContext";

export default function DashboardLicensesPage() {
  const { user } = useAuth();
  const [licenses, setLicenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "expiring_soon" | "expired" | "revoked">("all");
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
    if (!user) return;
    const unsub = licenseVerificationService.subscribe(user.uid, (items) => {
      setVerifiedIds(new Set(items.map((v: any) => v.licenseId)));
    });
    return unsub;
  }, [user]);

  const activeCount = licenses.filter((l) => l.status === "active" && (!l.expiresAt || new Date(l.expiresAt) > new Date())).length;
  const boundCount = licenses.filter((l) => l.universeId).length;

  const filtered = licenses.filter((l) => {
    const expired = l.expiresAt && new Date(l.expiresAt) < new Date() && l.status === "active";
    const daysLeft = l.expiresAt ? Math.ceil((new Date(l.expiresAt).getTime() - Date.now()) / 86400000) : null;
    const expiringSoon = l.status === "active" && !expired && daysLeft !== null && daysLeft <= 7;
    if (filter === "all") return true;
    if (filter === "active") return l.status === "active" && !expired;
    if (filter === "expiring_soon") return expiringSoon;
    if (filter === "expired") return expired;
    if (filter === "revoked") return l.status === "revoked";
    return true;
  });

  const doVerify = useCallback(async () => {
    const lic = verifyModal;
    if (!lic || !verifyInput.trim()) return;
    setVerifyingId(lic.id);
    const input = verifyInput.trim().toUpperCase();
    const key = (lic.key || "").toUpperCase();
    if (input !== key) { setVerifyResult({ valid: false, msg: "Invalid License Key" }); setVerifyingId(null); return; }
    if (lic.userId !== user?.uid) { setVerifyResult({ valid: false, msg: "License belongs to another account" }); setVerifyingId(null); return; }
    if (lic.status !== "active") {
      setVerifyResult({ valid: false, msg: lic.status === "revoked" ? "License revoked" : "License expired" });
      setVerifyingId(null); return;
    }
    if (lic.expiresAt && new Date(lic.expiresAt) < new Date()) { setVerifyResult({ valid: false, msg: "License expired" }); setVerifyingId(null); return; }
    try {
      await licenseVerificationService.create({ userId: user!.uid, licenseId: lic.id, productId: lic.productId });
    } catch (e: any) {
      console.error("[Verify License] Firestore write non-critical:", e?.code || e);
    }
    setVerifyResult({ valid: true, msg: "✓ License Verified" });
    setVerifiedIds((prev) => new Set(prev).add(lic.id));
    setVerifyingId(null);
  }, [verifyModal, verifyInput, user]);

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
        <div>
          <h2 className="text-2xl font-bold text-white">My Licenses</h2>
          <p className="text-sm text-gray-400 mt-1">{activeCount} active · {boundCount} bound · {licenses.length} total</p>
        </div>
      </div>

      <div className="flex gap-1.5 mb-6 flex-wrap">
        {(["all", "active", "expiring_soon", "expired", "revoked"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              filter === f ? "bg-purple-600/20 text-purple-400 border border-purple-500/20" : "bg-dark-600 text-gray-400 hover:text-white"
            }`}
          >
            {f === "expiring_soon" ? "Expiring Soon" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <GlassCard>
          <p className="text-sm text-gray-400 text-center py-10">No licenses found.</p>
        </GlassCard>
      ) : (
        <div className="space-y-4">
          {filtered.map((lic) => {
            const expired = lic.expiresAt && new Date(lic.expiresAt) < new Date() && lic.status === "active";
            const daysLeft = lic.expiresAt ? Math.ceil((new Date(lic.expiresAt).getTime() - Date.now()) / 86400000) : null;
            const isVerified = verifiedIds.has(lic.id);
            return (
              <motion.div key={lic.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <GlassCard>
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-white font-semibold truncate">{lic.productName || "Product"}</h3>
                        {lic.productId && <span className="text-[10px] text-gray-500 font-mono hidden sm:inline">ID: {lic.productId}</span>}
                        <LicenseHealthBadge lic={lic} />
                      </div>
                      <code className="text-lg font-bold text-purple-400 font-mono">{lic.key}</code>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-400">
                        {lic.durationMonths ? <span>{lic.durationMonths} month{lic.durationMonths > 1 ? "s" : ""}</span> : null}
                        {lic.expiresAt ? <span>Expires {new Date(lic.expiresAt).toLocaleDateString()}</span> : <span className="text-green-400">Lifetime</span>}
                        {daysLeft !== null && daysLeft > 0 && lic.status === "active" && <span className="text-yellow-400">{daysLeft} day{daysLeft > 1 ? "s" : ""} left</span>}
                        <span>{lic.downloadCount || 0} download{(lic.downloadCount || 0) !== 1 ? "s" : ""}</span>
                      </div>

                      {(lic.universeId || lic.lastVerification) && (
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-gray-500">
                          {lic.universeId && <span>Universe: <span className="text-gray-400 font-mono">{lic.universeId}</span></span>}
                          {lic.creatorId && <span>Creator: <span className="text-gray-400 font-mono">{lic.creatorId}</span></span>}
                          {lic.activationCount && <span>Activations: {lic.activationCount}</span>}
                          {lic.lastVerification && <span>Last verified: {new Date(lic.lastVerification).toLocaleDateString()}</span>}
                        </div>
                      )}

                      {!lic.universeId && lic.status === "active" && !expired && (
                        <div className="mt-1.5 text-xs text-purple-400">
                          Not yet bound to a Roblox game — first API verification will auto-link.
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      <button onClick={() => navigator.clipboard.writeText(lic.key)}
                        className="px-3 py-1.5 rounded-lg bg-dark-600 text-gray-300 text-xs hover:bg-dark-500 transition-all">Copy</button>
                      <Link href={`/dashboard/licenses/${lic.id}`}
                        className="px-3 py-1.5 rounded-lg bg-dark-600 text-gray-300 text-xs hover:bg-dark-500 transition-all inline-flex items-center">
                        Activity
                      </Link>
                      {isVerified ? (
                        <span className="px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 text-xs font-medium flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Verified
                        </span>
                      ) : (
                        <button onClick={() => { setVerifyModal(lic); setVerifyInput(""); setVerifyResult(null); }}
                          className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 text-xs hover:bg-blue-500/20 transition-all">Verify License</button>
                      )}
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      )}

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
              Enter license key for <span className="text-white">{verifyModal.productName}</span>
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
    </DashboardLayout>
  );
}

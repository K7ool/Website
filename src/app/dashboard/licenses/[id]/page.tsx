"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import GlassCard from "@/components/GlassCard";
import { licenseService } from "@/lib/firestore";
import { useAuth } from "@/contexts/AuthContext";

const TYPE_ICONS: Record<string, string> = {
  verify: "✅",
  activate: "🚀",
  revoke: "❌",
  heartbeat: "💓",
  blacklist_deny: "🚫",
  transfer: "🔄",
};

export default function LicenseDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const [license, setLicense] = useState<any | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [transferring, setTransferring] = useState(false);
  const [confirmTransfer, setConfirmTransfer] = useState(false);

  useEffect(() => {
    if (!user || !params.id) return;
    (async () => {
      const lic = await licenseService.getById(params.id as string);
      if (!lic || lic.userId !== user.uid) { router.push("/dashboard/licenses"); return; }
      setLicense(lic);
      try {
        const res = await window.fetch(`/api/license/activity?licenseId=${params.id}`);
        const data = await res.json();
        if (data.success) setActivities(data.entries);
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, [user, params.id]);

  const handleTransfer = async () => {
    if (!user || !license) return;
    setTransferring(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/license/reset-transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ licenseId: params.id }),
      });
      const data = await res.json();
      if (data.success) {
        const lic = await licenseService.getById(params.id as string);
        if (lic) setLicense(lic);
        const actsRes = await fetch(`/api/license/activity?licenseId=${params.id}`);
        const actsData = await actsRes.json();
        if (actsData.success) setActivities(actsData.entries);
      }
    } catch (e) { console.error(e); }
    setTransferring(false);
    setConfirmTransfer(false);
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

  if (!license) return null;

  return (
    <DashboardLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <button onClick={() => router.push("/dashboard/licenses")} className="text-sm text-gray-400 hover:text-white transition-colors mb-4 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Licenses
        </button>

        <GlassCard className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-white">{license.productName || "License"}</h1>
              <code className="text-lg text-purple-400 font-mono">{license.key}</code>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                license.status === "active" ? "bg-green-500/10 text-green-400" :
                license.status === "revoked" ? "bg-red-500/10 text-red-400" : "bg-gray-500/10 text-gray-400"
              }`}>{license.status}</span>
              {license.universeId && license.status === "active" && (
                <>
                  {confirmTransfer ? (
                    <div className="flex items-center gap-1">
                      <button onClick={handleTransfer} disabled={transferring}
                        className="px-2 py-1 rounded bg-red-500/10 text-red-400 text-xs hover:bg-red-500/20 transition-all disabled:opacity-50">
                        {transferring ? "Transferring..." : "Confirm Transfer"}
                      </button>
                      <button onClick={() => setConfirmTransfer(false)}
                        className="px-2 py-1 rounded bg-dark-600 text-gray-400 text-xs hover:text-white transition-all">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmTransfer(true)}
                      className="px-2 py-1 rounded bg-orange-500/10 text-orange-400 text-xs hover:bg-orange-500/20 transition-all">Transfer License</button>
                  )}
                </>
              )}
            </div>
          </div>
          {license.features && Object.keys(license.features).length > 0 && (
            <div className="mb-4 p-3 rounded-xl bg-purple-500/5 border border-purple-500/10">
              <div className="text-xs text-gray-500 mb-2 font-medium">License Features</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(license.features).map(([key, val]) => (
                  <span key={key} className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                    val === true || val === "true" ? "bg-green-500/10 text-green-400" :
                    val === false || val === "false" || val === 0 ? "bg-gray-500/10 text-gray-500" :
                    "bg-blue-500/10 text-blue-400"
                  }`}>
                    {key.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase())}: {String(val)}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-500 text-xs">Product ID</div>
              <div className="text-gray-300 font-mono text-xs">{license.productId || "—"}</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs">Duration</div>
              <div className="text-gray-300">{license.durationMonths ? `${license.durationMonths} months` : "Lifetime"}</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs">Expires</div>
              <div className="text-gray-300">{license.expiresAt ? new Date(license.expiresAt).toLocaleDateString() : "Never"}</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs">Activations</div>
              <div className="text-gray-300">{license.activationCount || 0}</div>
            </div>
            {license.universeId && (
              <>
                <div>
                  <div className="text-gray-500 text-xs">Universe ID</div>
                  <div className="text-gray-300 font-mono">{license.universeId}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-xs">Creator ID</div>
                  <div className="text-gray-300 font-mono">{license.creatorId || "—"}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-xs">Place ID</div>
                  <div className="text-gray-300 font-mono">{license.placeId || "—"}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-xs">Last Verified</div>
                  <div className="text-gray-300">{license.lastVerification ? new Date(license.lastVerification).toLocaleString() : "—"}</div>
                </div>
              </>
            )}
          </div>
        </GlassCard>

        <h2 className="text-lg font-semibold text-white mb-4">Activity Timeline</h2>

        {activities.length === 0 ? (
          <GlassCard><p className="text-sm text-gray-400 text-center py-8">No activity recorded yet.</p></GlassCard>
        ) : (
          <div className="space-y-2">
            {activities.map((a, i) => (
              <motion.div key={a.id || i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                <GlassCard className="py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{TYPE_ICONS[a.type] || "📋"}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                          a.type === "verify" ? "text-green-400 bg-green-500/10" :
                          a.type === "activate" ? "text-blue-400 bg-blue-500/10" :
                          a.type === "revoke" ? "text-red-400 bg-red-500/10" :
                          a.type === "transfer" ? "text-orange-400 bg-orange-500/10" :
                          "text-gray-400 bg-gray-500/10"
                        }`}>{a.type}</span>
                        {a.details?.serverId && <span className="text-[10px] text-gray-600 font-mono">Server: {a.details.serverId?.slice(0, 16)}...</span>}
                      </div>
                      <div className="text-[10px] text-gray-600 mt-0.5">
                        {a.details?.universeId && `Universe: ${a.details.universeId} · `}
                        {a.details?.placeId && `Place: ${a.details.placeId} · `}
                        {a.createdAt ? new Date(a.createdAt).toLocaleString() : ""}
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </DashboardLayout>
  );
}

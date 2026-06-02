"use client";
import { useState, useEffect, use } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import GlassCard from "@/components/GlassCard";
import { incidentService } from "@/lib/firestore";

const SEVERITY_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  info: { label: "Info", color: "text-blue-400 bg-blue-500/10 border-blue-500/20", icon: "ℹ" },
  minor: { label: "Minor", color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20", icon: "⚠" },
  major: { label: "Major", color: "text-orange-400 bg-orange-500/10 border-orange-500/20", icon: "🔶" },
  critical: { label: "Critical", color: "text-red-400 bg-red-500/10 border-red-500/20", icon: "🔴" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  investigating: { label: "Investigating", color: "text-yellow-400 bg-yellow-500/10" },
  identified: { label: "Identified", color: "text-blue-400 bg-blue-500/10" },
  monitoring: { label: "Monitoring", color: "text-purple-400 bg-purple-500/10" },
  resolved: { label: "Resolved", color: "text-green-400 bg-green-500/10" },
  maintenance: { label: "Scheduled Maintenance", color: "text-gray-400 bg-gray-500/10" },
};

export default function IncidentDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [incident, setIncident] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const unsub = incidentService.subscribe((items) => {
      const found = items.find((i: any) => (i.slug || i.id) === slug);
      if (found) {
        setIncident(found);
        setNotFound(false);
      } else {
        setNotFound(true);
      }
      setLoading(false);
    });
    return unsub;
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !incident) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <GlassCard>
          <div className="text-center py-10">
            <h2 className="text-lg font-semibold text-white mb-2">Incident Not Found</h2>
            <p className="text-sm text-gray-400 mb-4">This incident does not exist or has been removed.</p>
            <Link href="/status" className="text-sm text-purple-400 hover:text-purple-300">← Back to Status</Link>
          </div>
        </GlassCard>
      </div>
    );
  }

  const sev = SEVERITY_CONFIG[incident.severity] || SEVERITY_CONFIG.info;
  const stat = STATUS_CONFIG[incident.status] || STATUS_CONFIG.investigating;
  const timeline = incident.timeline || [];

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Link href="/status" className="text-sm text-gray-400 hover:text-white transition-colors mb-6 inline-block">
          ← Back to Status
        </Link>

        <GlassCard>
          <div className="flex items-start gap-4 mb-6">
            <span className="text-2xl">{sev.icon}</span>
            <div>
              <h1 className="text-xl font-bold text-white mb-2">{incident.title}</h1>
              <div className="flex flex-wrap gap-2 mb-3">
                <span className={`px-3 py-1 rounded-lg text-xs font-medium border ${sev.color}`}>{sev.label}</span>
                <span className={`px-3 py-1 rounded-lg text-xs font-medium ${stat.color}`}>{stat.label}</span>
                {incident.isPinned && <span className="px-3 py-1 rounded-lg text-xs bg-purple-500/10 text-purple-400">Pinned</span>}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                <span>Created: {incident.createdAt ? new Date(incident.createdAt).toLocaleString() : "—"}</span>
                <span>Updated: {incident.updatedAt ? new Date(incident.updatedAt).toLocaleString() : "—"}</span>
              </div>
            </div>
          </div>

          {incident.description && (
            <div className="mb-6 p-4 rounded-xl bg-dark-700/50 border border-purple-500/10">
              <p className="text-sm text-gray-300 whitespace-pre-wrap">{incident.description}</p>
            </div>
          )}

          {timeline.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-white mb-4">Timeline</h3>
              <div className="space-y-0">
                {timeline.map((t: any, i: number) => {
                  const ts = STATUS_CONFIG[t.status] || STATUS_CONFIG.investigating;
                  const isLast = i === timeline.length - 1;
                  return (
                    <div key={i} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full shrink-0 ${isLast ? "bg-purple-500" : "bg-dark-600 border border-purple-500/30"}`} />
                        {!isLast && <div className="w-px flex-1 bg-purple-500/20 my-1" />}
                      </div>
                      <div className={`pb-6 ${isLast ? "" : ""}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-gray-500">{t.createdAt || ""}</span>
                          <span className={`px-2 py-0.5 rounded text-xs ${ts.color}`}>{ts.label}</span>
                        </div>
                        <p className="text-sm text-gray-300">{t.message}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </GlassCard>
      </motion.div>
    </div>
  );
}

"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { incidentService } from "@/lib/firestore";

const SEVERITY_ICONS: Record<string, string> = {
  info: "ℹ️",
  minor: "⚠️",
  major: "🔶",
  critical: "🔴",
};

const SEVERITY_COLORS: Record<string, string> = {
  info: "border-blue-500/20 bg-blue-500/5 text-blue-400",
  minor: "border-yellow-500/20 bg-yellow-500/5 text-yellow-400",
  major: "border-orange-500/20 bg-orange-500/5 text-orange-400",
  critical: "border-red-500/20 bg-red-500/5 text-red-400",
};

export default function StatusBanner() {
  const [activeIncident, setActiveIncident] = useState<any | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const unsub = incidentService.subscribe((items) => {
      const visible = items.filter((i: any) => i.isVisible !== false);
      const active = visible.find((i: any) => i.status !== "resolved" && i.status !== "maintenance");
      setActiveIncident(active || null);
    });
    return unsub;
  }, []);

  if (!activeIncident || dismissed) return null;

  const icon = SEVERITY_ICONS[activeIncident.severity] || "⚠️";
  const colors = SEVERITY_COLORS[activeIncident.severity] || SEVERITY_COLORS.minor;
  const slug = activeIncident.slug || activeIncident.id;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className={`relative z-20 border-b ${colors}`}
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3 text-sm">
          <span className="text-lg">{icon}</span>
          <div className="flex-1 min-w-0">
            <span className="font-medium">{activeIncident.title}</span>
            {activeIncident.description && (
              <span className="text-gray-400 ml-2 hidden sm:inline">— {activeIncident.description}</span>
            )}
          </div>
          <Link
            href={`/status/${slug}`}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all text-xs font-medium"
          >
            View Details
          </Link>
          <button
            onClick={() => setDismissed(true)}
            className="shrink-0 p-1 rounded-lg hover:bg-white/10 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

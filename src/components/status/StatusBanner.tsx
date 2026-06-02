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
  info: "border-blue-500/20 bg-blue-500/10 text-blue-400",
  minor: "border-yellow-500/20 bg-yellow-500/10 text-yellow-400",
  major: "border-orange-500/20 bg-orange-500/10 text-orange-400",
  critical: "border-red-500/20 bg-red-500/10 text-red-400",
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
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`sticky top-16 lg:top-20 z-40 border-b ${colors}`}
      >
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-center gap-3 text-sm">
          <span>{icon}</span>
          <span className="font-medium truncate">{activeIncident.title}</span>
          <Link
            href={`/status/${slug}`}
            className="shrink-0 px-3 py-1 rounded-lg bg-white/15 hover:bg-white/25 transition-all text-xs font-semibold"
          >
            View Details
          </Link>
          <button
            onClick={() => setDismissed(true)}
            className="shrink-0 p-1 rounded hover:bg-white/10 transition-all ml-2"
            aria-label="Dismiss"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

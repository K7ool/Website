"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { profileService } from "@/lib/firestore";
import { LEGAL_VERSIONS } from "@/lib/legal";
import { serverTimestamp } from "firebase/firestore";

export default function LegalAcceptModal() {
  const { user, profile, refreshProfile } = useAuth();
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [refund, setRefund] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const allChecked = terms && privacy && refund;

  const handleAccept = async () => {
    if (!allChecked || !user) return;
    setSaving(true);
    setError("");
    try {
      await profileService.upsert(user.uid, {
        acceptedTermsVersion: LEGAL_VERSIONS.terms,
        acceptedPrivacyVersion: LEGAL_VERSIONS.privacy,
        acceptedRefundVersion: LEGAL_VERSIONS.refund,
        acceptedAt: new Date().toISOString(),
      });
      if (refreshProfile) await refreshProfile();
    } catch (e: any) {
      setError(e?.message || "Failed to save acceptance.");
    }
    setSaving(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="glass rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Legal Agreement Required</h2>
          <p className="text-sm text-gray-400">
            To continue using FlippStudios, you must accept our legal documents. Please read and agree to each policy below.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 mb-4">{error}</div>
        )}

        <div className="space-y-4 mb-6">
          <p className="text-xs text-gray-500 leading-relaxed">
            By accepting, you acknowledge that you have read, understood, and agree to be bound by:
          </p>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-dark-600/50 border border-purple-500/10">
            <input
              type="checkbox"
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
              className="mt-0.5 w-5 h-5 rounded bg-dark-700 border-purple-500/30 accent-purple-500 shrink-0"
            />
            <div>
              <label className="text-sm text-white font-medium cursor-pointer" onClick={() => setTerms(!terms)}>
                I agree to the Terms of Service
              </label>
              <p className="text-xs text-gray-500 mt-0.5">Terms governing the use of FlippStudios products and services.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-dark-600/50 border border-purple-500/10">
            <input
              type="checkbox"
              checked={privacy}
              onChange={(e) => setPrivacy(e.target.checked)}
              className="mt-0.5 w-5 h-5 rounded bg-dark-700 border-purple-500/30 accent-purple-500 shrink-0"
            />
            <div>
              <label className="text-sm text-white font-medium cursor-pointer" onClick={() => setPrivacy(!privacy)}>
                I agree to the Privacy Policy
              </label>
              <p className="text-xs text-gray-500 mt-0.5">How we collect, use, and protect your personal data.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-dark-600/50 border border-purple-500/10">
            <input
              type="checkbox"
              checked={refund}
              onChange={(e) => setRefund(e.target.checked)}
              className="mt-0.5 w-5 h-5 rounded bg-dark-700 border-purple-500/30 accent-purple-500 shrink-0"
            />
            <div>
              <label className="text-sm text-white font-medium cursor-pointer" onClick={() => setRefund(!refund)}>
                I agree to the Refund Policy
              </label>
              <p className="text-xs text-gray-500 mt-0.5">Our refund and cancellation terms for purchases.</p>
            </div>
          </div>
        </div>

        {!allChecked && (
          <p className="text-xs text-yellow-400 mb-4 text-center">
            Please check all boxes to continue.
          </p>
        )}

        <button
          onClick={handleAccept}
          disabled={!allChecked || saving}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 transition-all"
        >
          {saving ? "Saving..." : "Accept & Continue"}
        </button>

        <p className="text-xs text-gray-500 mt-4 text-center">
          You must accept the Terms of Service, Privacy Policy, and Refund Policy to continue using FlippStudios.
        </p>
      </motion.div>
    </motion.div>
  );
}

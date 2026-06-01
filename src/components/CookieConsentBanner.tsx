"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getCookieConsent, setCookieConsent } from "@/lib/legal";

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const consent = getCookieConsent();
    if (!consent) setVisible(true);
  }, []);

  const accept = () => {
    setCookieConsent("accepted");
    setVisible(false);
  };

  const reject = () => {
    setCookieConsent("rejected");
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-0 left-0 right-0 z-50 p-4"
        >
          <div className="max-w-5xl mx-auto">
            <div className="glass rounded-2xl p-5 border border-purple-500/20 shadow-2xl shadow-purple-500/5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm text-gray-300 leading-relaxed">
                    We use cookies to improve your experience, analyze traffic, and enhance security.
                    By continuing to use this website, you agree to our use of cookies.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={accept}
                    className="px-5 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-medium hover:from-purple-500 hover:to-blue-500 transition-all"
                  >
                    Accept Cookies
                  </button>
                  <button
                    onClick={reject}
                    className="px-4 py-2 rounded-lg bg-dark-600 text-gray-300 text-sm hover:bg-dark-500 transition-all"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="px-4 py-2 rounded-lg bg-dark-700 text-gray-400 text-sm hover:text-white transition-all"
                  >
                    Settings
                  </button>
                </div>
              </div>
              {showSettings && (
                <div className="mt-4 pt-4 border-t border-purple-500/10">
                  <p className="text-xs text-gray-500 mb-3">Cookie preferences are stored locally. You can change them anytime from your Account Settings page.</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Essential cookies (always active)</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-green-500/10 text-green-400">Required</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

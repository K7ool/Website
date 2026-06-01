"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { servicesService } from "@/lib/firestore";

const defaultReasons = [
  "Professional Roblox Development",
  "Secure & Optimized Code",
  "Fast Delivery",
  "Source Code Included",
  "Ongoing Support",
  "Trusted by Developers",
];

export default function CustomDevelopmentPage() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = servicesService.subscribe((items) => { setServices(items); setLoading(false); });
    return unsub;
  }, []);

  if (loading) {
    return <div className="pt-24 pb-16 flex justify-center"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            <span className="gradient-text">Custom Roblox</span> Development
          </h1>
          <p className="text-lg text-gray-400 max-w-3xl mx-auto leading-relaxed">
            Need something unique for your Roblox game? We create custom systems, UI, scripts, vehicles, and complete game features tailored to your project.
          </p>
        </motion.div>

        {services.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-20">
            {services.map((card, i) => (
              <motion.div
                key={card.id || card.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className={`relative rounded-2xl p-8 card-shine transition-all duration-300 ${
                  card.featured
                    ? "bg-gradient-to-b from-purple-600/20 to-blue-600/10 border-2 border-purple-500/40 shadow-xl shadow-purple-500/10"
                    : "glass border border-purple-500/10 hover:border-purple-500/30"
                }`}
              >
                {card.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-xs font-semibold text-white shadow-lg">
                    Most Popular
                  </div>
                )}
                <h3 className={`text-xl font-bold text-white mb-3 ${card.featured ? "mt-2" : ""}`}>
                  {card.name}
                </h3>
                <p className="text-sm text-gray-400 mb-6 leading-relaxed">{card.description}</p>
                <ul className="space-y-3 mb-8">
                  {(card.features || []).map((f: string) => (
                    <li key={f} className="flex items-center gap-3 text-sm text-gray-300">
                      <svg className="w-4 h-4 text-green-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="text-2xl font-bold gradient-text mb-6">Starting at {card.price}</div>
                <Link
                  href="/contact"
                  className={`block text-center py-3 rounded-xl font-medium transition-all ${
                    card.featured
                      ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-500 hover:to-blue-500 shadow-lg shadow-purple-500/25"
                      : "glass border border-purple-500/20 text-gray-200 hover:border-purple-500/40 hover:text-white"
                  }`}
                >
                  Request Quote
                </Link>
              </motion.div>
            ))}
          </div>
        ) : null}

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="glass rounded-2xl p-10 sm:p-14 text-center max-w-4xl mx-auto border border-purple-500/10"
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Why Work With Us?</h2>
          <p className="text-gray-400 mb-8 max-w-xl mx-auto">
            We deliver quality Roblox development with every project.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
            {defaultReasons.map((reason) => (
              <div key={reason} className="flex items-center gap-3 text-sm text-gray-300">
                <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span>{reason}</span>
              </div>
            ))}
          </div>
          <Link
            href={process.env.NEXT_PUBLIC_DISCORD_INVITE || "https://discord.gg/xEFTFB89jK"}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium hover:from-purple-500 hover:to-blue-500 transition-all shadow-xl shadow-purple-500/25"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z"/>
            </svg>
            Contact on Discord
          </Link>
        </motion.div>
      </div>
    </div>
  );
}

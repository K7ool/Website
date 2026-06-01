"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import GlassCard from "@/components/GlassCard";
import SectionHeading from "@/components/SectionHeading";
import Link from "next/link";
import { ticketService } from "@/lib/firestore";

const projectTypes = ["Scripting", "UI Design", "Building", "Modeling", "System Development", "Other"];

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "", discord: "", email: "", projectType: "Scripting", message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await ticketService.create({
        userId: "guest",
        username: formData.name,
        email: formData.email,
        subject: `Contact: ${formData.projectType}`,
        message: formData.message,
        projectType: formData.projectType,
        discord: formData.discord,
        status: "open",
        createdAt: new Date().toISOString(),
      });
      setSubmitted(true);
    } catch (err) {
      console.error("Failed to submit contact form:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading title="Contact Us" subtitle="Get in touch with the Flipp Studios team" />

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <GlassCard>
              <h3 className="text-xl font-semibold text-white mb-6">Send a Message</h3>
              {submitted ? (
                <div className="text-center py-8">
                  <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-7 h-7 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-white font-medium">Message Sent!</p>
                  <p className="text-sm text-gray-400 mt-1">We&apos;ll get back to you within 24 hours.</p>
                </div>
              ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">Name</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Your name"
                      className="w-full px-4 py-3 rounded-lg bg-dark-600 border border-purple-500/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/30 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">Discord Username</label>
                    <input
                      type="text"
                      value={formData.discord}
                      onChange={(e) => setFormData({ ...formData, discord: e.target.value })}
                      placeholder="user#0000"
                      className="w-full px-4 py-3 rounded-lg bg-dark-600 border border-purple-500/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/30 transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 rounded-lg bg-dark-600 border border-purple-500/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/30 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Project Type</label>
                  <select
                    value={formData.projectType}
                    onChange={(e) => setFormData({ ...formData, projectType: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg bg-dark-600 border border-purple-500/10 text-gray-300 focus:outline-none focus:border-purple-500/30 transition-colors"
                  >
                    {projectTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Message</label>
                  <textarea
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={5}
                    placeholder="Describe your project..."
                    className="w-full px-4 py-3 rounded-lg bg-dark-600 border border-purple-500/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/30 transition-colors resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 transition-all shadow-lg shadow-purple-500/25"
                >
                  {submitting ? "Sending..." : "Send Message"}
                </button>
              </form>
              )}
            </GlassCard>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <GlassCard>
              <h3 className="text-lg font-semibold text-white mb-4">Other Ways to Reach Us</h3>
              <div className="space-y-4">
                {[
                   { label: "Discord", desc: "Join our community", href: process.env.NEXT_PUBLIC_DISCORD_INVITE || "https://discord.gg/xEFTFB89jK" },
                  { label: "Email", desc: "support@flippstudios.com", href: "mailto:support@flippstudios.com" },
                ].map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="flex items-center gap-4 p-4 rounded-lg bg-dark-600 hover:bg-dark-500 transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600/20 to-blue-600/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <span className="text-sm font-bold gradient-text">{item.label[0]}</span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">{item.label}</div>
                      <div className="text-xs text-gray-400">{item.desc}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </GlassCard>

            <GlassCard>
              <h3 className="text-lg font-semibold text-white mb-4">Response Time</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Discord</span>
                  <span className="text-green-400">&lt; 1 hour</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Email</span>
                  <span className="text-yellow-400">&lt; 24 hours</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Contact Form</span>
                  <span className="text-yellow-400">&lt; 12 hours</span>
                </div>
              </div>
            </GlassCard>

            <GlassCard>
              <h3 className="text-lg font-semibold text-white mb-4">Quick Links</h3>
              <div className="space-y-2">
                {[
                  { label: "Browse Products", href: "/products" },
                  { label: "View Portfolio", href: "/portfolio" },
                  { label: "Custom Development", href: "/custom-development" },
                  { label: "Documentation", href: "/documentation" },
                ].map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="block text-sm text-gray-400 hover:text-purple-400 transition-colors"
                  >
                    &rarr; {link.label}
                  </Link>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

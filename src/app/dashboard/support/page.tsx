"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { orderBy, where } from "firebase/firestore";
import DashboardLayout from "@/components/DashboardLayout";
import GlassCard from "@/components/GlassCard";
import { useAuth } from "@/contexts/AuthContext";
import { ticketService } from "@/lib/firestore";

export default function DashboardSupportPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsub = ticketService.subscribe((items) => {
      setTickets(items);
    }, [where("userId", "==", user.uid), orderBy("createdAt", "desc")]);
    return unsub;
  }, [user]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !message) return;
    setSubmitting(true);
    await ticketService.create({
      userId: user!.uid,
      userName: user!.email,
      subject,
      message,
      priority: "medium",
    });
    setSubject("");
    setMessage("");
    setShowForm(false);
    setSubmitting(false);
  };

  return (
    <DashboardLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Support Tickets</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-medium hover:from-purple-500 hover:to-blue-500 transition-all"
          >
            {showForm ? "Cancel" : "New Ticket"}
          </button>
        </div>

        {showForm && (
          <GlassCard className="mb-6">
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief description of your issue"
                  required
                  className="w-full px-4 py-3 rounded-lg bg-dark-600 border border-purple-500/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/30"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Message</label>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your issue in detail"
                  required
                  className="w-full px-4 py-3 rounded-lg bg-dark-600 border border-purple-500/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/30 resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium hover:from-purple-500 hover:to-blue-500 transition-all disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit Ticket"}
              </button>
            </form>
          </GlassCard>
        )}

        {tickets.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-dark-600 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No tickets yet</h3>
            <p className="text-gray-400">Create a ticket and we&apos;ll get back to you</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket: any) => (
              <GlassCard key={ticket.id} className="card-shine">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-1">{ticket.subject}</h3>
                    <p className="text-sm text-gray-400 mb-2 line-clamp-2">{ticket.message}</p>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        ticket.status === "open" ? "bg-yellow-500/10 text-yellow-400" :
                        ticket.status === "closed" ? "bg-green-500/10 text-green-400" :
                        "bg-gray-500/10 text-gray-400"
                      }`}>{ticket.status}</span>
                      <span>Priority: {ticket.priority}</span>
                      <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </motion.div>
    </DashboardLayout>
  );
}

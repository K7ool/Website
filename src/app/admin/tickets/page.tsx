"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { orderBy } from "firebase/firestore";
import Link from "next/link";
import GlassCard from "@/components/GlassCard";
import { ticketService } from "@/lib/firestore";

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = ticketService.subscribe((items) => {
      setTickets(items);
      setLoading(false);
    }, [orderBy("createdAt", "desc")]);
    return unsub;
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <h2 className="text-2xl font-bold text-white mb-6">Support Tickets</h2>
      {tickets.length === 0 ? (
        <GlassCard><p className="text-sm text-gray-400 text-center py-10">No tickets yet</p></GlassCard>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket: any) => (
            <Link key={ticket.id} href={`/admin/tickets/${ticket.id}`}>
              <GlassCard className="hover:border-purple-500/30 transition-all cursor-pointer">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-white truncate">{ticket.subject}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs shrink-0 ${
                        ticket.status === "open" ? "bg-yellow-500/10 text-yellow-400" :
                        ticket.status === "closed" ? "bg-green-500/10 text-green-400" :
                        ticket.status === "in_progress" ? "bg-blue-500/10 text-blue-400" :
                        "bg-gray-500/10 text-gray-400"
                      }`}>{ticket.status}</span>
                    </div>
                    <p className="text-sm text-gray-400 truncate">{ticket.message}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      <span>{ticket.username || ticket.userId?.slice(0, 8)}</span>
                      <span>{ticket.email}</span>
                      <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-gray-500 shrink-0 ml-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </GlassCard>
            </Link>
          ))}
        </div>
      )}
    </motion.div>
  );
}

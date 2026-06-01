"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { orderBy } from "firebase/firestore";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import GlassCard from "@/components/GlassCard";
import { ticketService, messageService } from "@/lib/firestore";

const projectTypes = [
  "Game Script",
  "UI Design",
  "Discord Bot",
  "Web App",
  "Other",
];

export default function TicketsPage() {
  const { user, profile } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);

  // new ticket form
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [projectType, setProjectType] = useState(projectTypes[0]);
  const [submitting, setSubmitting] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const unsub = ticketService.subscribeByUser(user.uid, (items) => {
      setTickets(items);
      setLoading(false);
    }, [orderBy("createdAt", "desc")]);
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!selectedTicket) return;
    const unsub = messageService.subscribe(selectedTicket.id, (msgs) => {
      setMessages(msgs);
    });
    return unsub;
  }, [selectedTicket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const createTicket = async () => {
    if (!subject.trim() || !message.trim() || !user) return;
    setSubmitting(true);
    const ticketId = await ticketService.create({
      userId: user.uid,
      username: profile?.displayName || user.displayName || user.email?.split("@")[0] || "User",
      email: user.email || "",
      subject: subject.trim(),
      message: message.trim(),
      projectType,
      status: "open",
      createdAt: new Date().toISOString(),
    });
    if (ticketId) {
      await messageService.create(ticketId, {
        senderId: user.uid,
        senderRole: "user",
        message: message.trim(),
        createdAt: new Date().toISOString(),
      });
    }
    setSubject("");
    setMessage("");
    setProjectType(projectTypes[0]);
    setShowForm(false);
    setSubmitting(false);
  };

  const sendReply = async () => {
    if (!newMessage.trim() || !user || !selectedTicket) return;
    setSending(true);
    await messageService.create(selectedTicket.id, {
      senderId: user.uid,
      senderRole: profile?.role === "admin" ? "admin" : "user",
      message: newMessage.trim(),
      createdAt: new Date().toISOString(),
    });
    setNewMessage("");
    setSending(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>
    );
  }

  return (
    <DashboardLayout>
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">My Tickets</h2>
        <button
          onClick={() => { setShowForm(!showForm); setSelectedTicket(null); }}
          className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-all"
        >
          {showForm ? "Cancel" : "New Ticket"}
        </button>
      </div>

      {showForm && (
        <GlassCard className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Create New Ticket</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief description of your issue"
                className="w-full px-4 py-2.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Project Type</label>
              <select
                value={projectType}
                onChange={(e) => setProjectType(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-gray-300 focus:outline-none focus:border-purple-500"
              >
                {projectTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="Describe your issue in detail..."
                className="w-full px-4 py-2.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
              />
            </div>
            <button
              onClick={createTicket}
              disabled={submitting || !subject.trim() || !message.trim()}
              className="px-6 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm font-medium transition-all"
            >
              {submitting ? "Submitting..." : "Submit Ticket"}
            </button>
          </div>
        </GlassCard>
      )}

      {selectedTicket && (
        <GlassCard className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-white">{selectedTicket.subject}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                selectedTicket.status === "open" ? "bg-yellow-500/10 text-yellow-400" :
                selectedTicket.status === "closed" ? "bg-green-500/10 text-green-400" :
                "bg-gray-500/10 text-gray-400"
              }`}>{selectedTicket.status}</span>
            </div>
            <button onClick={() => setSelectedTicket(null)} className="text-sm text-gray-400 hover:text-white transition-colors">
              &larr; Back
            </button>
          </div>

          <div className="h-72 overflow-y-auto mb-4 space-y-3 p-2">
            {messages.map((msg: any) => (
              <div key={msg.id} className={`flex ${msg.senderRole === "admin" ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                  msg.senderRole === "user"
                    ? "bg-purple-600/20 border border-purple-500/20 text-purple-200"
                    : "bg-dark-600 border border-purple-500/10 text-gray-300"
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium opacity-70">{msg.senderRole === "user" ? "You" : "Support"}</span>
                    <span className="text-[10px] opacity-50">{new Date(msg.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-sm">{msg.message}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
              placeholder="Type your reply..."
              className="flex-1 px-4 py-2.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
            <button
              onClick={sendReply}
              disabled={sending || !newMessage.trim()}
              className="px-5 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm font-medium transition-all"
            >
              {sending ? "..." : "Send"}
            </button>
          </div>
        </GlassCard>
      )}

      {tickets.length === 0 ? (
        <GlassCard>
          <p className="text-sm text-gray-400 text-center py-10">
            No tickets yet. Click "New Ticket" to create one.
          </p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket: any) => (
            <GlassCard
              key={ticket.id}
              onClick={() => { setSelectedTicket(ticket); setShowForm(false); }}
              className="hover:border-purple-500/30 transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-white truncate">{ticket.subject}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs shrink-0 ${
                      ticket.status === "open" ? "bg-yellow-500/10 text-yellow-400" :
                      ticket.status === "in_progress" ? "bg-blue-500/10 text-blue-400" :
                      "bg-green-500/10 text-green-400"
                    }`}>{ticket.status}</span>
                  </div>
                  <p className="text-sm text-gray-400 truncate">{ticket.message}</p>
                  <p className="text-xs text-gray-500 mt-1">{new Date(ticket.createdAt).toLocaleDateString()}</p>
                </div>
                <svg className="w-5 h-5 text-gray-500 shrink-0 ml-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </motion.div>
    </DashboardLayout>
  );
}

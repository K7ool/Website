"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { orderBy } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import GlassCard from "@/components/GlassCard";
import { ticketService, messageService } from "@/lib/firestore";

export default function AdminTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const [ticket, setTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubTicket = ticketService.subscribeById(id, (t) => {
      if (t) { setTicket(t); setStatus(t.status); }
    });
    const unsubMessages = messageService.subscribe(id, (msgs) => {
      setMessages(msgs);
    });
    return () => { unsubTicket(); unsubMessages(); };
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;
    setSending(true);
    await messageService.create(id, {
      senderId: user.uid,
      senderRole: profile?.role === "admin" ? "admin" : "user",
      message: newMessage.trim(),
      createdAt: new Date().toISOString(),
    });
    setNewMessage("");
    setSending(false);
  };

  const updateStatus = async (newStatus: string) => {
    await ticketService.updateStatus(id, newStatus);
    setStatus(newStatus);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      {!ticket ? (
        <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">{ticket.subject}</h2>
              <p className="text-sm text-gray-400 mt-1">
                {ticket.username || ticket.userId?.slice(0, 8)} &middot; {ticket.email} &middot; {new Date(ticket.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-sm ${
                status === "open" ? "bg-yellow-500/10 text-yellow-400" :
                status === "closed" ? "bg-green-500/10 text-green-400" :
                "bg-gray-500/10 text-gray-400"
              }`}>{status}</span>
              <select
                value={status}
                onChange={(e) => updateStatus(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-gray-300 focus:outline-none focus:border-purple-500"
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>

          {ticket.projectType && (
            <div className="mb-4 text-sm text-gray-400">
              Project Type: <span className="text-purple-400">{ticket.projectType}</span>
            </div>
          )}

          <GlassCard className="mb-4">
            <p className="text-sm text-gray-300">{ticket.message}</p>
          </GlassCard>

          <GlassCard>
            <div className="h-80 overflow-y-auto mb-4 p-2 space-y-3">
              {messages.map((msg: any) => (
                <div key={msg.id} className={`flex ${msg.senderRole === "admin" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                    msg.senderRole === "admin"
                      ? "bg-purple-600/20 border border-purple-500/20 text-purple-200"
                      : "bg-dark-600 border border-purple-500/10 text-gray-300"
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium opacity-70">
                        {msg.senderRole === "admin" ? "You" : ticket.username || "Customer"}
                      </span>
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
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Type your reply..."
                className="flex-1 px-4 py-2.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
              <button
                onClick={sendMessage}
                disabled={sending || !newMessage.trim()}
                className="px-5 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm font-medium transition-all"
              >
                {sending ? "..." : "Send"}
              </button>
            </div>
          </GlassCard>
        </>
      )}
    </motion.div>
  );
}

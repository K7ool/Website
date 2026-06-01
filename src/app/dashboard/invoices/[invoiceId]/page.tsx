"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import GlassCard from "@/components/GlassCard";
import Invoice from "@/components/Invoice";
import { invoiceService } from "@/lib/firestore";

export default function InvoiceDetailPage() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!invoiceId) return;
    invoiceService.getById(invoiceId).then((inv) => {
      setInvoice(inv);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [invoiceId]);

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !invoice ? (
          <GlassCard>
            <p className="text-sm text-gray-400 text-center py-10">Invoice not found</p>
          </GlassCard>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-white">Invoice {invoice.invoiceNumber}</h1>
              <Invoice data={{
                invoiceNumber: invoice.invoiceNumber,
                orderNumber: invoice.orderNumber,
                username: invoice.username,
                email: invoice.email,
                items: invoice.items || [],
                total: invoice.total,
                paymentMethod: invoice.paymentMethod,
                createdAt: invoice.createdAt,
                paidAt: invoice.paidAt,
              }} />
            </div>
            <GlassCard>
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Customer</p>
                  <p className="text-sm text-white">{invoice.username}</p>
                  <p className="text-xs text-gray-400">{invoice.email}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Details</p>
                  <p className="text-sm text-white">Order: {invoice.orderNumber}</p>
                  <p className="text-xs text-gray-400">{new Date(invoice.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <table className="w-full text-sm mb-6">
                <thead>
                  <tr className="border-b border-purple-500/10">
                    <th className="text-left py-2 text-gray-400 font-medium">Product</th>
                    <th className="text-right py-2 text-gray-400 font-medium">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {(invoice.items || []).map((item: any, i: number) => (
                    <tr key={i} className="border-b border-purple-500/5">
                      <td className="py-2 text-white">{item.title}</td>
                      <td className="py-2 text-right text-white">${(item.price || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr className="font-bold">
                    <td className="py-2 text-purple-400">Total</td>
                    <td className="py-2 text-right text-purple-400">${(invoice.total || 0).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-purple-500/10">
                <div>
                  <p className="text-xs text-gray-500">Payment Method</p>
                  <p className="text-sm text-white">{invoice.paymentMethod === "discord" ? "Discord" : "Vodafone Cash"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Paid Date</p>
                  <p className="text-sm text-white">{invoice.paidAt ? new Date(invoice.paidAt).toLocaleDateString() : "—"}</p>
                </div>
              </div>
            </GlassCard>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { orderBy } from "firebase/firestore";
import GlassCard from "@/components/GlassCard";
import { paymentRequestService, orderService, licenseService, invoiceService, notificationService, productService, profileService, recalculateProductStats, userAchievementService, activityService } from "@/lib/firestore";
import { sendEmail } from "@/lib/email";
import { licenseDeliveredTemplate, paymentRejectedTemplate } from "@/lib/email-templates";

export default function AdminPaymentsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [durationModal, setDurationModal] = useState<any | null>(null);
  const [selectedDuration, setSelectedDuration] = useState(12);

  useEffect(() => {
    const unsub = paymentRequestService.subscribe((items) => {
      setRequests(items);
      setLoading(false);
    }, [orderBy("createdAt", "desc")]);
    setTimeout(() => setLoading(false), 10000);
    return unsub;
  }, []);

  const handleApprove = async (req: any, durationMonths: number = 12) => {
    setApprovingId(req.id);
    try {
      await paymentRequestService.updateStatus(req.id, "approved");
      await orderService.updateStatus(req.orderId, "completed");

      let downloadFile = "";
      let productBindingType = "any";
      if (req.productId) {
        const product = await productService.getById(req.productId);
        downloadFile = product?.downloadFile || "";
        productBindingType = product?.bindingType || "any";
      }

      const invoice = await invoiceService.create({
        orderId: req.orderId,
        orderNumber: req.orderNumber,
        userId: req.userId,
        username: req.username,
        email: req.email,
        items: [{ title: req.productName || req.productTitle, price: req.amount }],
        total: req.amount,
        paymentMethod: req.paymentMethod,
        licenseKey: "",
        licenseExpiresAt: "",
        durationMonths,
      });

      const licId = await licenseService.create({
        userId: req.userId,
        productId: req.productId,
        productName: req.productName || req.productTitle,
        orderId: req.orderId,
        orderNumber: req.orderNumber,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        downloadFile,
        durationMonths,
        generatedBy: "admin",
        bindingType: productBindingType as any,
      });

      const license = await licenseService.getById(licId);

      const existingProfile = await profileService.get(req.userId);
      await profileService.upsert(req.userId, {
        purchaseCount: (existingProfile?.purchaseCount || 0) + 1,
      });

      await notificationService.create({
        userId: req.userId,
        title: "Payment Approved!",
        message: `Your payment for ${req.productName || req.productTitle} (${req.orderNumber}) has been approved. License: ${license?.key}`,
        type: "payment_approved",
      });

      if (req.email) {
        sendEmail(req.email, "Your License Key — Flipp Studios", licenseDeliveredTemplate({
          customerName: req.username || "Customer",
          productName: req.productName || req.productTitle || "Product",
          licenseKey: license?.key || "",
          orderNumber: req.orderNumber || "",
        }));
      }

      userAchievementService.checkAfterPurchase(req.userId);
      activityService.log(req.userId, { type: "purchase", description: `Payment approved for ${req.productName || req.productTitle} (${req.orderNumber})`, metadata: { orderId: req.orderId } });
      if (req.productId) recalculateProductStats(req.productId);
    } catch (err) {
      console.error("Approve failed:", err);
      setError("Failed to approve payment. Check console.");
    }
    setApprovingId(null);
  };

  const handleReject = async (req: any) => {
    try {
      await paymentRequestService.updateStatus(req.id, "rejected");
      await orderService.updateStatus(req.orderId, "rejected");
      await notificationService.create({
        userId: req.userId,
        title: "Payment Rejected",
        message: `Your payment for ${req.productName || req.productTitle} (${req.orderNumber}) has been rejected.`,
        type: "payment_rejected",
      });

      if (req.email) {
        sendEmail(req.email, "Payment Rejected — Flipp Studios", paymentRejectedTemplate({
          customerName: req.username || "Customer",
          productName: req.productName || req.productTitle || "Product",
          orderNumber: req.orderNumber || "",
        }));
      }

      if (req.productId) recalculateProductStats(req.productId);
    } catch (err) {
      console.error("Reject failed:", err);
      setError("Failed to reject payment. Check console.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <h2 className="text-2xl font-bold text-white mb-6">Payment Requests</h2>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
          {error}
          <button onClick={() => setError("")} className="ml-2 text-red-300 hover:text-red-200">Dismiss</button>
        </div>
      )}

      {requests.length === 0 ? (
        <GlassCard><p className="text-sm text-gray-400 text-center py-10">No payment requests yet</p></GlassCard>
      ) : (
        <div className="space-y-4">
          {requests.map((req: any) => (
            <GlassCard key={req.id}>
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-sm font-semibold text-white">{req.productName || req.productTitle || "—"}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      req.status === "pending" ? "bg-yellow-500/10 text-yellow-400" :
                      req.status === "approved" ? "bg-green-500/10 text-green-400" :
                      "bg-red-500/10 text-red-400"
                    }`}>{req.status}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                    <span>Order: <span className="text-gray-300">{req.orderNumber || "—"}</span></span>
                    <span>Customer: <span className="text-gray-300">{req.username || req.userId?.slice(0, 8)}</span></span>
                    <span>Email: <span className="text-gray-300">{req.email || "—"}</span></span>
                    <span>Method: <span className="text-gray-300">{req.paymentMethod === "discord" ? "Discord" : "Vodafone Cash"}</span></span>
                    <span>Amount: <span className="text-gray-300">${(req.amount || 0).toFixed(2)}</span></span>
                    <span>Date: <span className="text-gray-300">{req.createdAt ? new Date(req.createdAt).toLocaleDateString() : "—"}</span></span>
                  </div>
                  {req.discordUsername && (
                    <p className="text-xs text-indigo-400 mt-1">Discord: {req.discordUsername}</p>
                  )}
                  {req.phoneNumber && (
                    <p className="text-xs text-gray-400 mt-1">Phone: {req.phoneNumber}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {req.receiptImage && (
                    <button
                      onClick={() => setSelectedImage(req.receiptImage)}
                      className="px-3 py-1.5 rounded-lg bg-dark-600 text-xs text-gray-300 hover:text-white transition-colors"
                    >
                      View Receipt
                    </button>
                  )}
                  {req.status === "pending" && (
                    <>
                      <button
                        onClick={() => { setDurationModal(req); setSelectedDuration(12); }}
                        disabled={approvingId === req.id}
                        className="px-4 py-1.5 rounded-lg bg-green-500/10 text-green-400 text-xs font-medium hover:bg-green-500/20 transition-all disabled:opacity-50"
                      >
                        {approvingId === req.id ? "Approving..." : "Approve"}
                      </button>
                      <button
                        onClick={() => handleReject(req)}
                        className="px-4 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-all"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => { if (confirm("Delete this payment request permanently?")) fetch(`/api/payments/${req.id}`, { method: "DELETE" }); }}
                    className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs hover:bg-red-500/20 transition-all"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {selectedImage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setSelectedImage(null)}
        >
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="max-w-2xl max-h-[90vh]">
            <img src={selectedImage} alt="Payment Receipt" className="rounded-xl w-full h-auto" />
          </motion.div>
        </motion.div>
      )}

      {durationModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setDurationModal(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass rounded-2xl p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white mb-2">Set License Duration</h3>
            <p className="text-sm text-gray-400 mb-4">
              Select license duration for <span className="text-white font-medium">{durationModal.productName || durationModal.productTitle}</span>
            </p>
            <div className="space-y-2 mb-6">
              {[1, 6, 12].map((m) => (
                <button
                  key={m}
                  onClick={() => setSelectedDuration(m)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                    selectedDuration === m
                      ? "border-purple-500 bg-purple-500/10"
                      : "border-purple-500/10 bg-dark-600 hover:border-purple-500/30"
                  }`}
                >
                  <span className="text-sm text-white font-medium">{m} Month{m > 1 ? "s" : ""}</span>
                  {selectedDuration === m && (
                    <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDurationModal(null)} className="px-4 py-2 rounded-lg bg-dark-600 text-gray-300 text-sm hover:bg-dark-500 transition-all">Cancel</button>
              <button onClick={() => { const d = selectedDuration; const req = durationModal; setDurationModal(null); handleApprove(req, d); }}
                className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm hover:bg-green-500 transition-all">
                Approve & Generate License
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}

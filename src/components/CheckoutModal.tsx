"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { orderService, paymentRequestService, notificationService, storageService, ownedProductService, recalculateProductStats, couponService, userAchievementService, activityService } from "@/lib/firestore";

const VODAFONE_CASH_NUMBER = process.env.NEXT_PUBLIC_VODAFONE_CASH_NUMBER || "01000000000";
const VODAFONE_CASH_HOLDER = process.env.NEXT_PUBLIC_VODAFONE_CASH_HOLDER || "Flipp Studios";
const DISCORD_INVITE = process.env.NEXT_PUBLIC_DISCORD_INVITE || "https://discord.gg/xEFTFB89jK";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: { id: string; title: string; price: number; slug: string };
}

export default function CheckoutModal({ isOpen, onClose, product }: CheckoutModalProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [method, setMethod] = useState<"discord" | "vodafone_cash" | null>(null);
  const [discordUsername, setDiscordUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [alreadyOwned, setAlreadyOwned] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponResult, setCouponResult] = useState<{ valid: boolean; error?: string; discount?: number; coupon?: any } | null>(null);
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
  const [ownershipLoaded, setOwnershipLoaded] = useState(false);

  useEffect(() => {
    if (!isOpen || !user || !product.id) { setAlreadyOwned(false); setOwnershipLoaded(false); return; }
    const unsub = ownedProductService.subscribe(user.uid, (ids) => {
      setAlreadyOwned(ids.has(product.id));
      setOwnershipLoaded(true);
    });
    return unsub;
  }, [isOpen, user, product.id]);

  const reset = () => {
    setMethod(null);
    setDiscordUsername("");
    setPhone("");
    setReceiptFile(null);
    setError("");
    setOrderNumber("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const notify = async (userId: string, title: string, message: string, type: string) => {
    try {
      await notificationService.create({ userId, title, message, type });
    } catch {
      // non-critical
    }
  };

  const handleDiscordPayment = async () => {
    if (!user) return;
    if (alreadyOwned) { setError("You already own this product."); return; }
    setSubmitting(true);
    setError("");

    try {
      const token = await user.getIdToken();
      const checkRes = await fetch("/api/check-ownership", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ productId: product.id }),
      });
      if (!checkRes.ok) {
        const checkData = await checkRes.json();
        if (checkRes.status === 409) { setError("You already own this product."); setSubmitting(false); return; }
        setError(checkData.error || "Verification failed."); setSubmitting(false); return;
      }

      const finalTotal = appliedCoupon ? Math.max(0, product.price - (couponResult?.discount || 0)) : product.price;
      const result = await orderService.create({
        userId: user.uid,
        customerName: user.displayName || user.email?.split("@")[0] || "User",
        email: user.email || "",
        items: [{ id: product.id, title: product.title, price: product.price }],
        total: finalTotal,
        discount: couponResult?.discount || 0,
        couponCode: appliedCoupon?.code || "",
        paymentMethod: "discord",
        status: "pending_payment",
        discordUsername: discordUsername.trim(),
      });

      const { id, orderNumber: num } = result;

      if (appliedCoupon) await couponService.incrementUsed(appliedCoupon.id);

      await paymentRequestService.create({
        orderId: id,
        orderNumber: num,
        userId: user.uid,
        username: user.displayName || user.email?.split("@")[0] || "User",
        email: user.email || "",
        phoneNumber: "",
        paymentMethod: "discord",
        receiptImage: "",
        productId: product.id,
        productName: product.title,
        amount: finalTotal,
      });

      setOrderNumber(num);
      recalculateProductStats(product.id);
      notify(user.uid, "Payment Submitted", `Your Discord payment for ${product.title} (${num}) has been submitted.`, "payment_submitted");
      userAchievementService.checkAfterPurchase(user.uid);
      activityService.log(user.uid, { type: "purchase", description: `Purchased ${product.title}`, metadata: { productId: product.id, orderNumber: num } });
    } catch (err: any) {
      console.error("Discord payment failed:", err);
      setError(err?.message || "Failed to submit payment. Please try again.");
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
  };

  const handleVodafonePayment = async () => {
    if (!user) return;
    if (alreadyOwned) { setError("You already own this product."); return; }
    if (!receiptFile) { setError("Please upload a receipt."); return; }

    setSubmitting(true);
    setError("");

    let receiptImage = "";
    try {
      const receiptPath = `receipts/${user.uid}/${Date.now()}_${receiptFile.name}`;
      receiptImage = await storageService.uploadFile(receiptPath, receiptFile, "receipts", user.uid);
    } catch (err: any) {
      console.error("RECEIPT UPLOAD FAILED:", err);
      setError("Failed to upload receipt: " + (err?.message || "Unknown error"));
      setSubmitting(false);
      return;
    }

    try {
      const token = await user.getIdToken();
      const checkRes = await fetch("/api/check-ownership", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ productId: product.id }),
      });
      if (!checkRes.ok) {
        const checkData = await checkRes.json();
        if (checkRes.status === 409) { setError("You already own this product."); setSubmitting(false); return; }
        setError(checkData.error || "Verification failed."); setSubmitting(false); return;
      }

      const finalTotal = appliedCoupon ? Math.max(0, product.price - (couponResult?.discount || 0)) : product.price;
      const result = await orderService.create({
        userId: user.uid,
        customerName: user.displayName || user.email?.split("@")[0] || "User",
        email: user.email || "",
        items: [{ id: product.id, title: product.title, price: product.price }],
        total: finalTotal,
        discount: couponResult?.discount || 0,
        couponCode: appliedCoupon?.code || "",
        paymentMethod: "vodafone_cash",
        status: "pending_payment",
        phone: phone.trim(),
      });

      const { id, orderNumber: num } = result;

      if (appliedCoupon) await couponService.incrementUsed(appliedCoupon.id);

      await paymentRequestService.create({
        orderId: id,
        orderNumber: num,
        userId: user.uid,
        username: user.displayName || user.email?.split("@")[0] || "User",
        email: user.email || "",
        phoneNumber: phone.trim(),
        paymentMethod: "vodafone_cash",
        receiptImage,
        productId: product.id,
        productName: product.title,
        amount: finalTotal,
      });

      setOrderNumber(num);
      recalculateProductStats(product.id);
      notify(user.uid, "Payment Submitted", `Your Vodafone Cash payment for ${product.title} (${num}) has been submitted.`, "payment_submitted");
      userAchievementService.checkAfterPurchase(user.uid);
      activityService.log(user.uid, { type: "purchase", description: `Purchased ${product.title}`, metadata: { productId: product.id, orderNumber: num } });
    } catch (err: any) {
      console.error("VODAFONE PAYMENT FAILED:", err);
      setError("Payment failed: " + (err?.message || "Unknown error"));
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
  };

  const safeTitle = product?.title || "Product";
  const safePrice = product?.price ?? 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="glass rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Checkout</h2>
              <button onClick={handleClose} className="text-gray-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {!ownershipLoaded ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : alreadyOwned ? (
              <div className="text-center py-8">
                <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-7 h-7 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-white font-semibold text-lg mb-1">You already own this product</p>
                <p className="text-sm text-gray-400 mb-6">Go to your products to download and manage your license.</p>
                <button
                  onClick={() => { handleClose(); router.push("/dashboard/products"); }}
                  className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-medium hover:from-purple-500 hover:to-blue-500 transition-all"
                >
                  Go To My Products
                </button>
              </div>
            ) : orderNumber ? (
              <div className="text-center py-8">
                <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-7 h-7 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-white font-semibold text-lg mb-1">Order Submitted!</p>
                <p className="text-sm text-gray-400 mb-2">Order: <span className="text-purple-400 font-mono">{orderNumber}</span></p>
                <p className="text-sm text-gray-400 mb-6">The admin will verify your payment shortly.</p>
                <button
                  onClick={() => { handleClose(); router.push("/dashboard/orders"); }}
                  className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-medium hover:from-purple-500 hover:to-blue-500 transition-all"
                >
                  View My Orders
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-6 p-3 rounded-lg bg-dark-600">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600/20 to-blue-600/20 flex items-center justify-center">
                    <span className="text-lg font-bold gradient-text">{safeTitle.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{safeTitle}</div>
                    <div className="text-xs text-gray-400">${safePrice.toFixed(2)}</div>
                  </div>
                </div>

                {error && (
                  <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                    {error}
                  </div>
                )}

                {/* Coupon Code */}
                <div className="mb-4">
                  <label className="block text-sm text-gray-400 mb-1.5">Coupon Code</label>
                  <div className="flex gap-2">
                    <input type="text" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="SAVE20" disabled={!!appliedCoupon}
                      className="flex-1 px-4 py-2.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 uppercase" />
                    {appliedCoupon ? (
                      <button onClick={() => { setAppliedCoupon(null); setCouponResult(null); setCouponCode(""); }}
                        className="px-3 py-2 rounded-lg bg-red-500/10 text-red-400 text-xs hover:bg-red-500/20 transition-all">Remove</button>
                    ) : (
                      <button onClick={async () => {
                        if (!couponCode.trim()) return;
                        setCheckingCoupon(true);
                        setCouponResult(null);
                        const result = await couponService.validate(couponCode, product.price);
                        setCheckingCoupon(false);
                        setCouponResult(result);
                        if (result.valid) setAppliedCoupon(result.coupon);
                      }} disabled={checkingCoupon || !couponCode.trim()}
                        className="px-3 py-2 rounded-lg bg-purple-600 text-white text-xs hover:bg-purple-500 disabled:opacity-50 transition-all">
                        {checkingCoupon ? "..." : "Apply"}
                      </button>
                    )}
                  </div>
                  {couponResult && !couponResult.valid && (
                    <p className="text-xs text-red-400 mt-1">{couponResult.error}</p>
                  )}
                  {appliedCoupon && (
                    <div className="mt-2 p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                      <p className="text-xs text-green-400">
                        Coupon applied! {appliedCoupon.type === "percentage" ? `${appliedCoupon.value}% off` : `$${appliedCoupon.value} off`}
                        {couponResult?.discount ? ` (-$${couponResult.discount.toFixed(2)})` : ""}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Total: <span className="text-white font-medium">${Math.max(0, product.price - (couponResult?.discount || 0)).toFixed(2)}</span>
                      </p>
                    </div>
                  )}
                </div>

                <p className="text-sm text-gray-400 mb-4">Select payment method:</p>

                <button
                  onClick={() => setMethod(method === "discord" ? null : "discord")}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all mb-3 text-left ${
                    method === "discord"
                      ? "border-indigo-500 bg-indigo-500/10"
                      : "border-purple-500/10 bg-dark-600 hover:border-purple-500/30"
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-indigo-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.1776-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">Discord Payment</div>
                    <div className="text-xs text-gray-400">Pay via Discord &middot; Manual verification</div>
                  </div>
                </button>

                <button
                  onClick={() => setMethod(method === "vodafone_cash" ? null : "vodafone_cash")}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all mb-6 text-left ${
                    method === "vodafone_cash"
                      ? "border-red-500 bg-red-500/10"
                      : "border-purple-500/10 bg-dark-600 hover:border-purple-500/30"
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-red-600/20 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">Vodafone Cash</div>
                    <div className="text-xs text-gray-400">Pay via Vodafone Cash &middot; Upload receipt</div>
                  </div>
                </button>

                {method === "discord" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1.5">Discord Username</label>
                      <input
                        type="text"
                        value={discordUsername}
                        onChange={(e) => setDiscordUsername(e.target.value)}
                        placeholder="username#0000"
                        className="w-full px-4 py-2.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <button
                      onClick={handleDiscordPayment}
                      disabled={submitting || !discordUsername.trim()}
                      className="w-full py-3 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 disabled:opacity-50 transition-all"
                    >
                      {submitting ? "Processing..." : "Submit Payment"}
                    </button>
                  </div>
                )}

                {method === "vodafone_cash" && (
                  <div className="space-y-4">
                    <div className="p-3 rounded-lg bg-dark-600 text-sm">
                      <p className="text-gray-400 mb-1">Send payment to:</p>
                      <p className="text-white font-mono font-semibold">{VODAFONE_CASH_NUMBER}</p>
                      <p className="text-gray-400 text-xs">Holder: {VODAFONE_CASH_HOLDER}</p>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1.5">Your Phone Number</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="01XXXXXXXXX"
                        className="w-full px-4 py-2.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1.5">Upload Receipt</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                        className="w-full text-sm text-gray-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-purple-600/20 file:text-purple-400 hover:file:bg-purple-600/30"
                      />
                    </div>
                    <button
                      onClick={handleVodafonePayment}
                      disabled={submitting || !phone.trim() || !receiptFile}
                      className="w-full py-3 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-500 disabled:opacity-50 transition-all"
                    >
                      {submitting ? "Processing..." : "Submit Payment"}
                    </button>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

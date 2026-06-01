"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { where, orderBy } from "firebase/firestore";
import GlassCard from "@/components/GlassCard";
import ImageGallery from "@/components/ImageGallery";
import ReviewSection from "@/components/ReviewSection";
import CheckoutModal from "@/components/CheckoutModal";
import { useAuth } from "@/contexts/AuthContext";
import { productService, licenseService, orderService, productStatsService, productVersionService } from "@/lib/firestore";

export default function ProductDetailPage() {
  const params = useParams();
  const { user } = useAuth();
  const [product, setProduct] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("description");
  const [showCheckout, setShowCheckout] = useState(false);
  const [owned, setOwned] = useState(false);
  const [ownedLoaded, setOwnedLoaded] = useState(false);
  const [reviewCount, setReviewCount] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [salesCount, setSalesCount] = useState(0);
  const [showVerify, setShowVerify] = useState(false);
  const [verifyInput, setVerifyInput] = useState("");
  const [verifyResult, setVerifyResult] = useState<{ valid: boolean; msg: string } | null>(null);
  const [versions, setVersions] = useState<any[]>([]);

  useEffect(() => {
    if (!params.slug) return;
    const unsub = productService.subscribe((items) => {
      const found = items.find((p: any) => p.slug === params.slug && p.status === "published");
      setProduct(found || null);
      setLoading(false);
    }, [where("slug", "==", params.slug)]);
    return unsub;
  }, [params.slug]);

  useEffect(() => {
    if (!user || !product) { setOwned(false); setOwnedLoaded(!!user); return; }
    setOwnedLoaded(false);
    let unsub1: (() => void) | null = null;
    let unsub2: (() => void) | null = null;
    let loaded1 = false, loaded2 = false;
    const checkDone = () => { if (loaded1 && loaded2) setOwnedLoaded(true); };
    unsub1 = licenseService.subscribe((items) => {
      const hasLic = items.some((l: any) => l.userId === user.uid && l.productId === product.id && l.status === "active" && (!l.expiresAt || new Date(l.expiresAt) > new Date()));
      if (hasLic) setOwned(true);
      loaded1 = true; checkDone();
    }, [where("userId", "==", user.uid), where("productId", "==", product.id)]);
    unsub2 = orderService.subscribe((items) => {
      const hasOrder = items.some((o: any) => (o.status === "approved" || o.status === "completed") && (o.items?.[0]?.id === product.id || o.productId === product.id));
      if (hasOrder) setOwned(true);
      loaded2 = true; checkDone();
    }, [where("userId", "==", user.uid)]);
    return () => { if (unsub1) unsub1(); if (unsub2) unsub2(); };
  }, [user, product?.id]);

  useEffect(() => {
    if (!product?.id) return;
    const unsub = productStatsService.subscribe(product.id, (stats) => {
      setReviewCount(stats.reviewCount);
      setAverageRating(stats.averageRating);
      setSalesCount(stats.salesCount);
    });
    return unsub;
  }, [product?.id]);

  useEffect(() => {
    if (!product?.id) return;
    const unsub = productVersionService.subscribe(product.id, (items) => {
      setVersions(items);
    });
    return unsub;
  }, [product?.id]);

  if (loading) {
    return (
      <div className="pt-24 pb-16 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="pt-24 pb-16 text-center">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl font-bold text-white mb-4">Product Not Found</h1>
          <Link href="/products" className="text-purple-400 hover:text-purple-300">Back to Products</Link>
        </div>
      </div>
    );
  }

  const features = product.features || [];
  const compatibility = product.compatibility || [];
  const thumbnail = product.thumbnail || product.image || null;
  const images = product.images?.length ? product.images : product.gallery?.length ? product.gallery : thumbnail ? [thumbnail] : [];

  return (
    <div className="pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Link href="/products" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-purple-400 mb-6 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Products
          </Link>

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Left: Gallery */}
            <div>
              <ImageGallery images={images} title={product.title || product.name || "Product"} />
            </div>

            {/* Right: Info */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300">
                  {product.category || "General"}
                </span>
                {product.featured && (
                  <span className="px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-xs text-yellow-400">
                    Featured
                  </span>
                )}
              </div>

              <h1 className="text-3xl lg:text-4xl font-bold text-white mb-4">{product.title || product.name || "Product"}</h1>
              <p className="text-gray-400 mb-6 leading-relaxed">{product.shortDescription || product.description || "No description available."}</p>

              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <svg key={i} className={`w-5 h-5 ${i < Math.round(averageRating) ? "text-yellow-500" : "text-dark-500"}`} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-sm text-gray-400">({reviewCount} reviews)</span>
                </div>
                <span className="text-sm text-gray-500">{salesCount} sold</span>
              </div>

              <div className="flex items-baseline gap-3 mb-8">
                <span className="text-4xl font-bold gradient-text">${(product.price || 0).toFixed(2)}</span>
                {product.salePrice ? (
                  <>
                    <span className="text-xl text-gray-500 line-through">${product.salePrice.toFixed(2)}</span>
                    <span className="text-sm text-red-400 font-medium">
                      Save ${((product.salePrice || 0) - (product.price || 0)).toFixed(2)}
                    </span>
                  </>
                ) : null}
              </div>

              {user && owned && ownedLoaded ? (
                <div className="space-y-3 mb-4">
                  <div className="w-full py-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 font-semibold text-lg text-center">
                    ✓ You Own This Product
                  </div>
                  <div className="flex gap-2">
                    <Link href="/dashboard/products"
                      className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium text-sm hover:from-purple-500 hover:to-blue-500 transition-all text-center">
                      Go To My Products
                    </Link>
                    <button onClick={() => { setShowVerify(true); setVerifyInput(""); setVerifyResult(null); }}
                      className="flex-1 py-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 font-medium text-sm hover:bg-blue-500/20 transition-all">
                      Verify License
                    </button>
                  </div>
                  <Link href={user ? "/dashboard/licenses" : "#"}
                    className="block w-full py-3 rounded-xl bg-dark-600 text-gray-300 font-medium text-sm hover:bg-dark-500 transition-all text-center">
                    View License
                  </Link>
                </div>
              ) : user && ownedLoaded && !owned ? (
                <>
                  <button
                    onClick={() => setShowCheckout(true)}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold text-lg hover:from-purple-500 hover:to-blue-500 transition-all shadow-xl shadow-purple-500/25 mb-3"
                  >
                    Purchase Now
                  </button>

                  <a
                    href={process.env.NEXT_PUBLIC_DISCORD_INVITE || "https://discord.gg/xEFTFB89jK"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-indigo-500/30 text-indigo-400 font-medium hover:bg-indigo-500/10 transition-all mb-4"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.1776-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" />
                    </svg>
                    Contact on Discord
                  </a>
                </>
              ) : null}

              <CheckoutModal
                isOpen={showCheckout}
                onClose={() => setShowCheckout(false)}
                product={{ id: product.id, title: product.title || product.name || "Product", price: product.price ?? 0, slug: product.slug }}
              />

              <div className="flex items-center gap-3 text-sm text-gray-400 mb-8">
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Instant Download
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  License Key Included
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Secure Delivery
                </span>
              </div>

              {features.length > 0 && (
                <GlassCard className="mb-6">
                  <h3 className="font-semibold text-white mb-4">Features</h3>
                  <ul className="grid grid-cols-2 gap-3">
                    {features.map((f: string) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                        <svg className="w-4 h-4 text-purple-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                </GlassCard>
              )}

              {compatibility.length > 0 && (
                <GlassCard>
                  <h3 className="font-semibold text-white mb-3">Compatibility</h3>
                  <div className="flex flex-wrap gap-2">
                    {compatibility.map((c: string) => (
                      <span key={c} className="px-3 py-1.5 rounded-lg bg-dark-600 text-sm text-gray-300">
                        {c}
                      </span>
                    ))}
                  </div>
                </GlassCard>
              )}
            </div>
          </div>

          <div className="mt-12">
            <div className="flex gap-1 border-b border-purple-500/10 mb-8 overflow-x-auto">
              {["description", "documentation", "reviews", "versions"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-3 text-sm font-medium whitespace-nowrap transition-all border-b-2 ${
                    activeTab === tab
                      ? "text-purple-400 border-purple-500"
                      : "text-gray-400 border-transparent hover:text-gray-200"
                  }`}
                >
                  {tab === "description" && "Description"}
                  {tab === "documentation" && "Documentation"}
                  {tab === "reviews" && "Reviews"}
                  {tab === "updates" && "Updates"}
                  {tab === "versions" && "Version History"}
                </button>
              ))}
            </div>

            <div className="min-h-[300px]">
              {activeTab === "description" && (
                <div className="prose prose-invert max-w-none">
                  <p className="text-gray-400 leading-relaxed mb-4">
                    {product.description || product.shortDescription || "No description available."}
                  </p>
                </div>
              )}

              {activeTab === "documentation" && (
                <div>
                  <GlassCard className="mb-4">
                    <h3 className="font-semibold text-white mb-2">Installation Guide</h3>
                    <p className="text-sm text-gray-400">{product.installationGuide || "Installation guide coming soon."}</p>
                  </GlassCard>
                </div>
              )}

              {activeTab === "reviews" && (
                <ReviewSection productId={product.id} productTitle={product.title || product.name || "Product"} productImage={(product.images || product.gallery || [])[0] || ""} />
              )}

              {activeTab === "updates" && (
                <div>
                  <GlassCard>
                    <h3 className="font-semibold text-white mb-2">Updates & Changelog</h3>
                    <p className="text-sm text-gray-400">Update information coming soon.</p>
                  </GlassCard>
                </div>
              )}

              {activeTab === "versions" && (
                <div className="space-y-4">
                  {versions.length === 0 ? (
                    <GlassCard>
                      <p className="text-sm text-gray-400 text-center py-8">No version history available yet.</p>
                    </GlassCard>
                  ) : (
                    versions.map((v: any, i: number) => (
                      <GlassCard key={v.id} delay={i * 0.05}>
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600/20 to-blue-600/20 flex items-center justify-center shrink-0">
                            <span className="text-lg font-bold gradient-text">{v.version?.charAt(0) || "V"}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 text-xs font-mono">v{v.version}</span>
                              {i === 0 && <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-400 text-xs">Latest</span>}
                              <span className="text-xs text-gray-500">{v.createdAt ? new Date(v.createdAt).toLocaleDateString() : ""}</span>
                            </div>
                            {v.title && <h4 className="text-sm font-medium text-white mb-2">{v.title}</h4>}
                            {v.notes?.length > 0 && (
                              <ul className="space-y-1.5">
                                {v.notes.map((note: string, ni: number) => (
                                  <li key={ni} className="flex items-start gap-2 text-sm text-gray-400">
                                    <svg className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    {note}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      </GlassCard>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Verify License Modal */}
      {showVerify && user && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => { setShowVerify(false); setVerifyResult(null); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="glass rounded-2xl p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white mb-2">Verify License</h3>
            <p className="text-sm text-gray-400 mb-4">
              Enter license key for <span className="text-white">{product.title || product.name || "Product"}</span>
            </p>
            <input type="text" value={verifyInput} onChange={(e) => setVerifyInput(e.target.value)}
              placeholder="FLIPP-XXXX-XXXX-XXXX"
              className="w-full px-4 py-2.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 mb-4" />
            {verifyResult && (
              <div className={`p-3 rounded-xl mb-4 text-sm ${
                verifyResult.valid ? "bg-green-500/10 border border-green-500/20 text-green-400" : "bg-red-500/10 border border-red-500/20 text-red-400"
              }`}>{verifyResult.msg}</div>
            )}
            <div className="flex justify-end gap-3">
              <button onClick={() => { setShowVerify(false); setVerifyResult(null); }}
                className="px-4 py-2 rounded-lg bg-dark-600 text-gray-300 text-sm hover:bg-dark-500 transition-all">Close</button>
              {!verifyResult && (
                <button onClick={async () => {
                  if (!verifyInput.trim()) return;
                  const input = verifyInput.trim().toUpperCase();
                  const items = await licenseService.getAll([where("productId", "==", product.id), where("userId", "==", user.uid)]);
                  const lic = items.find((l: any) => (l.key || "").toUpperCase() === input);
                  if (!lic) { setVerifyResult({ valid: false, msg: "Invalid License Key" }); return; }
                  if (lic.status !== "active") { setVerifyResult({ valid: false, msg: "License expired" }); return; }
                  if (lic.expiresAt && new Date(lic.expiresAt) < new Date()) { setVerifyResult({ valid: false, msg: "License expired" }); return; }
                  setVerifyResult({ valid: true, msg: "✓ License Verified" });
                }} disabled={!verifyInput.trim()}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-500 disabled:opacity-50 transition-all">Verify</button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

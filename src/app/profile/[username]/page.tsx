"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { where, orderBy, limit as limitQuery } from "firebase/firestore";
import Avatar from "@/components/Avatar";
import GlassCard from "@/components/GlassCard";
import { useAuth } from "@/contexts/AuthContext";
import { profileService, reviewService, productService, orderService, licenseService, userAchievementService, activityService } from "@/lib/firestore";

const BADGE_MAP: Record<string, { icon: string; label: string; color: string }> = {
  admin: { icon: "🛡️", label: "Admin", color: "purple" },
  owner: { icon: "👑", label: "Owner", color: "yellow" },
  verified_seller: { icon: "⭐", label: "Verified Seller", color: "yellow" },
  top_creator: { icon: "🏆", label: "Top Creator", color: "amber" },
  premium: { icon: "💎", label: "Premium Member", color: "blue" },
  top_customer: { icon: "🔥", label: "Top Customer", color: "orange" },
  early_supporter: { icon: "🚀", label: "Early Supporter", color: "cyan" },
};

function BadgeIcon({ badge, size = "sm" }: { badge: string; size?: "sm" | "md" }) {
  const info = BADGE_MAP[badge] || { icon: "🏅", label: badge, color: "gray" };
  const sizeClass = size === "md" ? "text-lg" : "text-sm";
  return (
    <span
      className={`inline-block ${sizeClass} drop-shadow-[0_0_6px_rgba(168,85,247,0.5)] transition-transform hover:scale-110`}
      title={info.label}
    >
      {info.icon}
    </span>
  );
}

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-dark-600 ${className}`} />;
}

export default function PublicProfilePage() {
  const params = useParams();
  const { user: currentUser, isAdmin } = useAuth();
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<any[]>([]);
  const [products, setProducts] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState("reviews");
  const [achievements, setAchievements] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [viewCounted, setViewCounted] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [licenses, setLicenses] = useState<any[]>([]);
  const canViewPrivate = currentUser?.uid === profile?.userId;

  const username = params?.username as string;

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    profileService.getByUsername(username.toLowerCase()).then((data) => {
      setProfile(data);
      setLoading(false);
    });
  }, [username]);

  // Count profile view (once per session, not self)
  useEffect(() => {
    if (!profile?.userId || viewCounted) return;
    if (currentUser?.uid === profile.userId) { setViewCounted(true); return; }
    profileService.incrementProfileViews(profile.userId).catch(() => {});
    setViewCounted(true);
  }, [profile?.userId, currentUser?.uid, viewCounted]);

  // Subscribe to reviews
  useEffect(() => {
    if (!profile?.userId) return;
    const showReviews = profile.privacy?.showReviews !== false;
    if (!showReviews) return;
    const unsub = reviewService.subscribe((items) => {
      setReviews(items.filter((r: any) => r.userId === profile.userId).slice(0, 20));
    }, [where("userId", "==", profile.userId), orderBy("createdAt", "desc")]);
    return () => unsub();
  }, [profile?.userId, profile?.privacy?.showReviews]);

  // Load product info for review cards
  const reviewProductIds = useMemo(() => {
    const ids = new Set<string>();
    reviews.forEach((r: any) => { if (r.productId) ids.add(r.productId); });
    return Array.from(ids);
  }, [reviews]);

  useEffect(() => {
    if (reviewProductIds.length === 0) return;
    const missing = reviewProductIds.filter((id) => !products[id]);
    if (missing.length === 0) return;
    Promise.all(missing.map((id) => productService.getById(id))).then((results) => {
      const map: Record<string, any> = {};
      results.forEach((p) => { if (p) map[p.id] = p; });
      setProducts((prev) => ({ ...prev, ...map }));
    });
  }, [reviewProductIds]);

  // Activity — orders (only if viewer is profile owner)
  const isOwnProfile = currentUser?.uid === profile?.userId;
  useEffect(() => {
    if (!profile?.userId || !isOwnProfile) return;
    const unsub = orderService.subscribe((items) => {
      setOrders(items.filter((o: any) => o.userId === profile.userId && (o.status === "completed" || o.status === "approved")));
    }, [where("userId", "==", profile.userId)]);
    return () => unsub();
  }, [profile?.userId, isOwnProfile]);

  // Activity — licenses (only if viewer is profile owner)
  useEffect(() => {
    if (!profile?.userId || !isOwnProfile) return;
    const unsub = licenseService.subscribe((items) => {
      setLicenses(items.filter((l: any) => l.userId === profile.userId));
    }, [where("userId", "==", profile.userId)]);
    return () => unsub();
  }, [profile?.userId, isOwnProfile]);

  // Achievements
  useEffect(() => {
    if (!profile?.userId) return;
    const unsub = userAchievementService.subscribe(profile.userId, (items) => {
      setAchievements(items);
    });
    return unsub;
  }, [profile?.userId]);

  // Activity feed from Firestore
  useEffect(() => {
    if (!profile?.userId) return;
    const unsub = activityService.subscribe(profile.userId, (items) => {
      setActivities(items);
    });
    return unsub;
  }, [profile?.userId]);

  const mergedActivities = useMemo(() => {
    const items: { date: string; type: string; description: string; icon: string }[] = [];
    activities.forEach((a: any) => {
      const iconMap: Record<string, string> = { purchase: "🛒", review: "⭐", achievement: "🏆", verification: "🎮", registration: "👤" };
      items.push({ date: a.createdAt, type: a.type, description: a.description, icon: iconMap[a.type] || "📌" });
    });
    reviews.forEach((r) => {
      items.push({ date: r.createdAt, type: "review", description: `Left a review on ${r.productTitle || "a product"}`, icon: "⭐" });
    });
    orders.forEach((o) => {
      const itemName = o.items?.[0]?.title || "a product";
      items.push({ date: o.createdAt, type: "purchase", description: `Purchased ${itemName}`, icon: "🛒" });
    });
    licenses.forEach((l) => {
      if (l.status === "active") {
        items.push({ date: l.createdAt, type: "license", description: `Activated license for ${l.productName || "a product"}`, icon: "🔑" });
      }
    });
    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return items.slice(0, 30);
  }, [reviews, orders, licenses, activities]);

  if (loading) {
    return (
      <div className="pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <GlassCard><div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 p-6">
            <SkeletonBlock className="w-20 h-20 rounded-full shrink-0" />
            <div className="flex-1 space-y-3 text-center sm:text-left">
              <SkeletonBlock className="h-7 w-48 mx-auto sm:mx-0" />
              <SkeletonBlock className="h-4 w-32 mx-auto sm:mx-0" />
              <SkeletonBlock className="h-4 w-64 mx-auto sm:mx-0" />
              <div className="flex gap-4 justify-center sm:justify-start"><SkeletonBlock className="h-3 w-20" /><SkeletonBlock className="h-3 w-20" /><SkeletonBlock className="h-3 w-20" /></div>
            </div>
          </div></GlassCard>
          <SkeletonBlock className="h-10 w-full" />
          <div className="space-y-3"><SkeletonBlock className="h-24 w-full" /><SkeletonBlock className="h-24 w-full" /></div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="pt-24 pb-16 text-center">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl font-bold text-white mb-4">Profile Not Found</h1>
          <p className="text-gray-400 mb-6">No user found with the username "{username}"</p>
          <Link href="/users" className="text-purple-400 hover:text-purple-300">Search Users</Link>
        </div>
      </div>
    );
  }

  const isPrivate = profile.privacy?.publicProfile === false;
  if (isPrivate && (!currentUser || currentUser.uid !== profile.userId)) {
    return (
      <div className="pt-24 pb-16 text-center">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl font-bold text-white mb-4">Profile Private</h1>
          <p className="text-gray-400">This user has set their profile to private.</p>
        </div>
      </div>
    );
  }

  const badges: string[] = profile.badges || [];
  if (profile.role === "admin" && !badges.includes("admin")) badges.unshift("admin");
  const joinDate = profile.createdAt ? new Date(profile.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "Unknown";
  const reviewCount = reviews.length;
  const purchaseCount = profile.purchaseCount || 0;
  const licenseCount = profile.licenseCount || 0;
  const profileViews = profile.profileViews || 0;
  const productsOwned = (profile.productsOwned || []).length;
  const isOwner = currentUser?.uid === profile.userId;

  return (
    <div className="pt-24 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

          {/* ═══ HEADER ═══ */}
          <GlassCard className="mb-6 overflow-hidden">
            <div className="relative px-6 py-8 sm:px-8">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-blue-600/5 pointer-events-none" />
              <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-6">
                <Avatar size="xl" className="w-24 h-24 ring-2 ring-purple-500/20" src={profile.avatar} fallback={profile.displayName || profile.username || "U"} />
                <div className="flex-1 text-center sm:text-left min-w-0">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                    <h1 className="text-2xl sm:text-3xl font-bold text-white">{profile.displayName || profile.username}</h1>
                    {badges.map((b: string) => <BadgeIcon key={b} badge={b} size="md" />)}
                    {profile.verified && <span className="text-sm text-green-400" title="Verified">✓</span>}
                    {profile.robloxVerified && <span className="inline-block text-lg drop-shadow-[0_0_6px_rgba(168,85,247,0.5)]" title="Roblox Verified">🎮</span>}
                  </div>
                  <p className="text-sm text-gray-400 mb-2">@{profile.username}</p>
                  {profile.bio && <p className="text-sm text-gray-300 mb-3 max-w-lg">{profile.bio}</p>}
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-xs text-gray-500">
                    <span>Joined {joinDate}</span>
                    <span>{purchaseCount} purchase{purchaseCount !== 1 ? "s" : ""}</span>
                    <span>{reviewCount} review{reviewCount !== 1 ? "s" : ""}</span>
                    <span>{productsOwned} owned</span>
                    <span>{licenseCount} license{licenseCount !== 1 ? "s" : ""}</span>
                    <span>{profileViews} view{profileViews !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
                    {profile.country && (
                      <span className="px-2 py-1 rounded bg-dark-600 text-gray-400 text-xs">{profile.country}</span>
                    )}
                    {profile.robloxVerified && profile.robloxUsername && (
                      <a href={profile.robloxProfileUrl || `https://www.roblox.com/users/${profile.robloxUserId}/profile`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2 py-1 rounded bg-green-500/10 text-green-400 text-xs hover:bg-green-500/20 transition-all">
                        <span>🎮</span> {profile.robloxUsername}
                      </a>
                    )}
                    {profile.socialLinks?.discord && (
                      <a href={profile.socialLinks.discord} target="_blank" rel="noopener noreferrer" className="px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 text-xs hover:bg-indigo-500/20 transition-all">Discord</a>
                    )}
                    {profile.socialLinks?.roblox && !profile.robloxVerified && (
                      <a href={profile.socialLinks.roblox} target="_blank" rel="noopener noreferrer" className="px-2 py-1 rounded bg-green-500/10 text-green-400 text-xs hover:bg-green-500/20 transition-all">Roblox</a>
                    )}
                    {profile.socialLinks?.youtube && (
                      <a href={profile.socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="px-2 py-1 rounded bg-red-500/10 text-red-400 text-xs hover:bg-red-500/20 transition-all">YouTube</a>
                    )}
                    {profile.socialLinks?.github && (
                      <a href={profile.socialLinks.github} target="_blank" rel="noopener noreferrer" className="px-2 py-1 rounded bg-gray-500/10 text-gray-400 text-xs hover:bg-gray-500/20 transition-all">GitHub</a>
                    )}
                    {profile.socialLinks?.twitter && (
                      <a href={profile.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="px-2 py-1 rounded bg-sky-500/10 text-sky-400 text-xs hover:bg-sky-500/20 transition-all">Twitter</a>
                    )}
                    {profile.socialLinks?.website && (
                      <a href={profile.socialLinks.website} target="_blank" rel="noopener noreferrer" className="px-2 py-1 rounded bg-purple-500/10 text-purple-400 text-xs hover:bg-purple-500/20 transition-all">Website</a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* ═══ SELLER SECTION (if user published products) ═══ */}
          {profile.sellerStats && (
            <GlassCard className="mb-6">
              <div className="px-6 py-5">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <span className="text-lg">🛒</span> Creator Stats
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div><p className="text-xs text-gray-400">Products</p><p className="text-lg font-bold text-white">{profile.sellerStats.productCount || 0}</p></div>
                  <div><p className="text-xs text-gray-400">Sales</p><p className="text-lg font-bold text-white">{profile.sellerStats.sales || 0}</p></div>
                  <div><p className="text-xs text-gray-400">Revenue</p><p className="text-lg font-bold text-green-400">${(profile.sellerStats.revenue || 0).toLocaleString()}</p></div>
                  <div><p className="text-xs text-gray-400">Avg Rating</p><p className="text-lg font-bold text-yellow-400">{profile.sellerStats.avgRating ? profile.sellerStats.avgRating.toFixed(1) : "—"}</p></div>
                </div>
              </div>
            </GlassCard>
          )}

          {/* ═══ TABS ═══ */}
          <div className="flex gap-1 border-b border-purple-500/10 mb-6 overflow-x-auto">
            {profile.privacy?.showReviews !== false && (
              <button onClick={() => setActiveTab("reviews")}
                className={`px-4 py-2.5 text-sm font-medium transition-all border-b-2 whitespace-nowrap ${activeTab === "reviews" ? "text-purple-400 border-purple-500" : "text-gray-400 border-transparent hover:text-gray-200"}`}>
                Reviews ({reviewCount})
              </button>
            )}
            <button onClick={() => setActiveTab("achievements")}
              className={`px-4 py-2.5 text-sm font-medium transition-all border-b-2 whitespace-nowrap ${activeTab === "achievements" ? "text-purple-400 border-purple-500" : "text-gray-400 border-transparent hover:text-gray-200"}`}>
              Achievements ({achievements.length})
            </button>
            <button onClick={() => setActiveTab("activity")}
              className={`px-4 py-2.5 text-sm font-medium transition-all border-b-2 whitespace-nowrap ${activeTab === "activity" ? "text-purple-400 border-purple-500" : "text-gray-400 border-transparent hover:text-gray-200"}`}>
              Activity {mergedActivities.length > 0 && <span className="ml-1 text-xs text-gray-500">({mergedActivities.length})</span>}
            </button>
            <button onClick={() => setActiveTab("showcase")}
              className={`px-4 py-2.5 text-sm font-medium transition-all border-b-2 whitespace-nowrap ${activeTab === "showcase" ? "text-purple-400 border-purple-500" : "text-gray-400 border-transparent hover:text-gray-200"}`}>
              Showcase
            </button>
          </div>

          {/* ═══ REVIEWS TAB ═══ */}
          {activeTab === "reviews" && (
            <div>
              {reviews.length === 0 ? (
                <GlassCard><p className="text-sm text-gray-400 text-center py-8">No reviews yet.</p></GlassCard>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => {
                    const prod = products[review.productId];
                    const thumb = review.productImage || prod?.images?.[0] || prod?.image || "";
                    const title = review.productTitle || prod?.name || prod?.title || "Product";
                    return (
                      <motion.div key={review.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                        <GlassCard className="hover:border-purple-500/20 transition-all">
                          <div className="flex items-start gap-4">
                            <Link href={`/products/${prod?.slug || review.productId}`} className="w-14 h-14 rounded-xl bg-dark-600 overflow-hidden shrink-0 flex items-center justify-center hover:ring-2 ring-purple-500/30 transition-all">
                              {thumb ? (
                                <img src={thumb} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-lg font-bold gradient-text">{(title).charAt(0)}</span>
                              )}
                            </Link>
                            <div className="flex-1 min-w-0">
                              <Link href={`/products/${prod?.slug || review.productId}`} className="text-sm font-medium text-white hover:text-purple-400 transition-colors">{title}</Link>
                              <div className="flex items-center gap-1 mt-0.5">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <svg key={i} className={`w-3.5 h-3.5 ${i < (review.rating || 0) ? "text-yellow-500" : "text-dark-500"}`} fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                ))}
                              </div>
                              <p className="text-sm text-gray-300 mt-1 line-clamp-2">{review.content || review.text || review.review || ""}</p>
                              <p className="text-xs text-gray-500 mt-1">{review.createdAt ? new Date(review.createdAt).toLocaleDateString() : ""}</p>
                            </div>
                          </div>
                        </GlassCard>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ═══ ACHIEVEMENTS TAB ═══ */}
          {activeTab === "achievements" && (
            <div>
              {achievements.length === 0 ? (
                <GlassCard><p className="text-sm text-gray-400 text-center py-8">No achievements unlocked yet.</p></GlassCard>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {achievements.map((ua: any) => (
                    <GlassCard key={ua.id} className="border-green-500/20">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{ua.achievementIcon || "🏆"}</span>
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-white">{ua.achievementName}</h3>
                          <p className="text-xs text-gray-400">{ua.achievementDescription}</p>
                          <p className="text-[10px] text-green-400 mt-1">
                            Unlocked {ua.unlockedAt ? new Date(ua.unlockedAt).toLocaleDateString() : ""}
                          </p>
                        </div>
                      </div>
                    </GlassCard>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══ ACTIVITY TAB ═══ */}
          {activeTab === "activity" && (
            <div>
              {mergedActivities.length === 0 ? (
                <GlassCard><p className="text-sm text-gray-400 text-center py-8">No recent activity.</p></GlassCard>
              ) : (
                <div className="space-y-3">
                  {mergedActivities.map((act, i) => (
                    <motion.div key={`${act.type}-${act.date}-${i}`} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                      <GlassCard className="hover:border-purple-500/20 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-dark-600 flex items-center justify-center text-lg shrink-0">{act.icon}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white">{act.description}</p>
                            <p className="text-xs text-gray-500">{new Date(act.date).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </GlassCard>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══ SHOWCASE TAB ═══ */}
          {activeTab === "showcase" && (
            <div>
              {(!profile.pinnedProducts || profile.pinnedProducts.length === 0) ? (
                <GlassCard><p className="text-sm text-gray-400 text-center py-8">No products showcased yet.</p></GlassCard>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {profile.pinnedProducts.slice(0, 6).map((pid: string) => {
                    const p = products[pid];
                    const img = p?.images?.[0] || p?.image || "";
                    return (
                      <Link key={pid} href={`/products/${p?.slug || pid}`}>
                        <GlassCard className="hover:border-purple-500/30 transition-all cursor-pointer group">
                          <div className="aspect-video rounded-lg bg-dark-600 overflow-hidden mb-2 flex items-center justify-center">
                            {img ? <img src={img} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /> : <span className="text-2xl font-bold gradient-text">{(p?.name || "P").charAt(0)}</span>}
                          </div>
                          <p className="text-sm text-white font-medium truncate">{p?.name || p?.title || "Product"}</p>
                        </GlassCard>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

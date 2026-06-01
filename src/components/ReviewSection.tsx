"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { where, orderBy, doc, onSnapshot } from "firebase/firestore";
import Avatar from "@/components/Avatar";
import GlassCard from "@/components/GlassCard";
import { useAuth } from "@/contexts/AuthContext";
import { reviewService, commentService, orderService, licenseService, recalculateProductStats, userAchievementService, activityService } from "@/lib/firestore";
import { db } from "@/lib/firebase";

interface ReviewSectionProps {
  productId: string;
  productTitle: string;
  productImage?: string;
}

export default function ReviewSection({ productId, productTitle, productImage }: ReviewSectionProps) {
  const { user, profile, isAdmin } = useAuth();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [canReview, setCanReview] = useState(false);
  const [purchased, setPurchased] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingReview, setEditingReview] = useState<any | null>(null);
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const profileCache = useRef<Map<string, any>>(new Map());
  const [, forceUpdate] = useState(0);
  const [expandedReview, setExpandedReview] = useState<string | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState("");

  useEffect(() => {
    const unsub = reviewService.subscribe((items) => {
      setReviews(items.filter((r: any) => r.productId === productId && !r.hidden));
      setLoading(false);
    }, [where("productId", "==", productId), orderBy("createdAt", "desc")]);
    return unsub;
  }, [productId]);

  useEffect(() => {
    if (!user) return;
    let unsubOrders: (() => void) | null = null;
    let unsubLicenses: (() => void) | null = null;

    unsubOrders = orderService.subscribe((items) => {
      const hasCompleted = items.some(
        (o: any) => o.userId === user.uid && o.status === "completed" &&
          o.items?.some((i: any) => (i.id === productId || i.productId === productId))
      );
      setPurchased(hasCompleted);
      if (hasCompleted) setCanReview(true);
    }, [where("userId", "==", user.uid), where("status", "==", "completed")]);

    unsubLicenses = licenseService.subscribe((items) => {
      const hasActive = items.some(
        (l: any) => l.userId === user.uid && l.productId === productId && l.status === "active"
      );
      if (hasActive) setCanReview(true);
    }, [where("userId", "==", user.uid), where("productId", "==", productId)]);

    return () => { unsubOrders?.(); unsubLicenses?.(); };
  }, [user, productId]);

  useEffect(() => {
    if (!expandedReview) { setComments([]); return; }
    const unsub = commentService.subscribe(expandedReview, setComments);
    return unsub;
  }, [expandedReview]);

  // Load profiles for all review + comment userIds with realtime updates
  useEffect(() => {
    const reviewIds = reviews.map(r => r.userId).filter(Boolean);
    const commentIds = comments.map(c => c.userId).filter(Boolean);
    const userIds = [...new Set([...reviewIds, ...commentIds])];
    if (userIds.length === 0) return;
    const unsubs = userIds.map(userId =>
      onSnapshot(doc(db!, 'profiles', userId),
        (snap) => {
          if (snap.exists()) {
            profileCache.current.set(userId, snap.data());
          } else {
            profileCache.current.delete(userId);
          }
          forceUpdate(n => n + 1);
        },
        (err) => {
          if (err.code !== 'permission-denied') console.error('Profile sub error:', err);
        }
      )
    );
    return () => { unsubs.forEach(u => u()); };
  }, [reviews, comments]);

  const getProfile = (userId: string) => profileCache.current.get(userId) || {};
  const ownReview = reviews.find((r) => r.userId === user?.uid);

  const ratingBreakdown = () => {
    const counts = [0, 0, 0, 0, 0];
    reviews.forEach((r) => { if (r.rating >= 1 && r.rating <= 5) counts[r.rating - 1]++; });
    return counts;
  };
  const breakdown = ratingBreakdown();
  const avgRating = reviews.length ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length) : 0;

  const handleSubmitReview = async () => {
    if (!content.trim() || !user) return;
    setSubmitting(true);
    try {
      if (editingReview) {
        await reviewService.update(editingReview.id, { rating, content: content.trim() });
      } else {
        await reviewService.create({
          productId,
          productTitle,
          productImage: productImage || "",
          userId: user.uid,
          rating,
          content: content.trim(),
        });
        userAchievementService.checkAfterReview(user.uid);
        activityService.log(user.uid, { type: "review", description: `Left a review on ${productTitle}`, metadata: { productId } });
      }
      setShowForm(false);
      setEditingReview(null);
      setContent("");
      setRating(5);
      recalculateProductStats(productId);
    } catch (err) {
      console.error("Review submit failed:", err);
    }
    setSubmitting(false);
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm("Delete this review?")) return;
    await reviewService.delete(reviewId);
    recalculateProductStats(productId);
  };

  const handleHideReview = async (reviewId: string, hidden: boolean) => {
    await reviewService.update(reviewId, { hidden });
  };

  const openEdit = (review: any) => {
    setEditingReview(review);
    setRating(review.rating || 5);
    setContent(review.content || "");
    setShowForm(true);
  };

  const handleAddComment = async (reviewId: string) => {
    if (!commentText.trim() || !user) return;
    setSendingComment(true);
    await commentService.create(reviewId, {
      userId: user.uid,
      content: commentText.trim(),
    });
    setCommentText("");
    setSendingComment(false);
  };

  const handleEditComment = async (reviewId: string, commentId: string) => {
    if (!editCommentText.trim()) return;
    await commentService.update(reviewId, commentId, { content: editCommentText.trim() });
    setEditingComment(null);
    setEditCommentText("");
  };

  const handleDeleteComment = async (reviewId: string, commentId: string) => {
    if (!confirm("Delete this comment?")) return;
    await commentService.delete(reviewId, commentId);
  };

  const handleLockComments = async (review: any) => {
    await reviewService.update(review.id, { commentsLocked: !review.commentsLocked });
  };

  const starButton = (n: number, current: number, set: (v: number) => void) => (
    <button key={n} onClick={() => set(n)} className="focus:outline-none">
      <svg className={`w-6 h-6 ${n <= current ? "text-yellow-500" : "text-dark-500"}`} fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    </button>
  );

  if (loading) {
    return <div className="flex justify-center py-10"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div>
      {/* Rating Summary */}
      <GlassCard className="mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="text-center">
            <div className="text-4xl font-bold gradient-text">{avgRating.toFixed(1)}</div>
            <div className="flex justify-center gap-0.5 mt-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <svg key={n} className={`w-4 h-4 ${n <= Math.round(avgRating) ? "text-yellow-500" : "text-dark-500"}`} fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <div className="text-xs text-gray-500 mt-1">{reviews.length} reviews</div>
          </div>

          <div className="flex-1 space-y-1.5 w-full">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = breakdown[star - 1] || 0;
              const pct = reviews.length ? (count / reviews.length) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-2 text-sm">
                  <span className="text-gray-400 w-6 shrink-0">{star}</span>
                  <svg className="w-3.5 h-3.5 text-yellow-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <div className="flex-1 h-2 rounded-full bg-dark-600 overflow-hidden">
                    <div className="h-full rounded-full bg-yellow-500/60 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-gray-500 w-8 text-right shrink-0">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </GlassCard>

      {/* Write Review */}
      {user && (
        <div className="mb-6">
          {canReview ? (
            ownReview && !showForm ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-400">You reviewed this product</span>
                <button onClick={() => openEdit(ownReview)} className="text-xs text-purple-400 hover:text-purple-300">Edit</button>
                <button onClick={() => handleDeleteReview(ownReview.id)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
              </div>
            ) : showForm ? (
              <GlassCard>
                <h4 className="text-sm font-semibold text-white mb-3">{editingReview ? "Edit Review" : "Write a Review"}</h4>
                <div className="flex gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map((n) => starButton(n, rating, setRating))}
                </div>
                <textarea value={content} onChange={(e) => setContent(e.target.value)}
                  placeholder="Share your experience with this product..."
                  rows={3} className="w-full px-4 py-2.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none mb-3" />
                <div className="flex gap-2">
                  <button onClick={handleSubmitReview} disabled={submitting || !content.trim()}
                    className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm font-medium transition-all">
                    {submitting ? "Submitting..." : editingReview ? "Update" : "Submit Review"}
                  </button>
                  <button onClick={() => { setShowForm(false); setEditingReview(null); setContent(""); setRating(5); }}
                    className="px-4 py-2 rounded-lg bg-dark-600 text-gray-300 text-sm hover:bg-dark-500 transition-all">
                    Cancel
                  </button>
                </div>
              </GlassCard>
            ) : (
              <button onClick={() => { setShowForm(true); setEditingReview(null); setContent(""); setRating(5); }}
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-all">
                Write a Review
              </button>
            )
          ) : (
            <p className="text-sm text-gray-500">You must purchase this product before reviewing.</p>
          )}
        </div>
      )}

      {/* Review List */}
      {reviews.length === 0 ? (
        <p className="text-gray-400 text-center py-10">No reviews yet.</p>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <GlassCard key={review.id}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Avatar size="sm" className="w-9 h-9" src={getProfile(review.userId).avatar} fallback={getProfile(review.userId).displayName || getProfile(review.userId).username} />
                  <div>
                    <Link href={`/profile/${getProfile(review.userId).username}`} className="text-sm font-medium text-white hover:text-purple-400 transition-colors">{getProfile(review.userId).displayName || getProfile(review.userId).username}</Link>
                    <div className="flex gap-0.5 mt-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <svg key={n} className={`w-3.5 h-3.5 ${n <= (review.rating || 0) ? "text-yellow-500" : "text-dark-500"}`} fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{review.createdAt ? new Date(review.createdAt).toLocaleDateString() : ""}</span>
                  {isAdmin && (
                    <>
                      <button onClick={() => handleHideReview(review.id, !review.hidden)} className="text-xs text-yellow-400 hover:text-yellow-300">
                        {review.hidden ? "Unhide" : "Hide"}
                      </button>
                      <button onClick={() => handleDeleteReview(review.id)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
                      <button onClick={() => handleLockComments(review)} className="text-xs text-gray-400 hover:text-gray-300">
                        {review.commentsLocked ? "Unlock" : "Lock"} Comments
                      </button>
                    </>
                  )}
                  {user?.uid === review.userId && !isAdmin && (
                    <>
                      <button onClick={() => openEdit(review)} className="text-xs text-purple-400 hover:text-purple-300">Edit</button>
                      <button onClick={() => handleDeleteReview(review.id)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
                    </>
                  )}
                </div>
              </div>

              <p className="text-sm text-gray-300 mb-3">{review.content}</p>

              {/* Comments */}
              <div className="border-t border-purple-500/10 pt-3">
                <button
                  onClick={() => setExpandedReview(expandedReview === review.id ? null : review.id)}
                  className="text-xs text-gray-400 hover:text-purple-400 transition-colors"
                >
                  {expandedReview === review.id ? "Hide Comments" : `Comments (${review.commentsCount || 0})`}
                </button>

                {expandedReview === review.id && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3 space-y-3">
                    {comments.map((c: any) => (
                      <div key={c.id} className="flex items-start gap-2">
                        <Avatar size="sm" className="w-6 h-6" src={getProfile(c.userId).avatar} fallback={getProfile(c.userId).displayName || getProfile(c.userId).username} />
                        <div className="flex-1 min-w-0">
                          {editingComment === c.id ? (
                            <div className="flex gap-2">
                              <input type="text" value={editCommentText} onChange={(e) => setEditCommentText(e.target.value)}
                                className="flex-1 px-3 py-1.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white focus:outline-none focus:border-purple-500" />
                              <button onClick={() => handleEditComment(review.id, c.id)} className="text-xs text-purple-400">Save</button>
                              <button onClick={() => setEditingComment(null)} className="text-xs text-gray-400">Cancel</button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2">
                                <Link href={`/profile/${getProfile(c.userId).username}`} className="text-xs font-medium text-white hover:text-purple-400 transition-colors">{getProfile(c.userId).displayName || getProfile(c.userId).username}</Link>
                                <span className="text-[10px] text-gray-500">{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ""}</span>
                              </div>
                              <p className="text-xs text-gray-400">{c.content}</p>
                            </>
                          )}
                        </div>
                        {(user?.uid === c.userId || isAdmin) && editingComment !== c.id && (
                          <div className="flex gap-1 shrink-0">
                            {user?.uid === c.userId && (
                              <button onClick={() => { setEditingComment(c.id); setEditCommentText(c.content); }} className="text-[10px] text-purple-400 hover:text-purple-300">Edit</button>
                            )}
                            <button onClick={() => handleDeleteComment(review.id, c.id)} className="text-[10px] text-red-400 hover:text-red-300">Delete</button>
                          </div>
                        )}
                      </div>
                    ))}

                    {user && !review.commentsLocked && (
                      <div className="flex gap-2">
                        <input type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)}
                          placeholder="Write a comment..."
                          className="flex-1 px-3 py-1.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
                        <button onClick={() => handleAddComment(review.id)} disabled={sendingComment || !commentText.trim()}
                          className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs font-medium transition-all">
                          {sendingComment ? "..." : "Send"}
                        </button>
                      </div>
                    )}
                    {review.commentsLocked && <p className="text-xs text-gray-500">Comments are locked.</p>}
                  </motion.div>
                )}
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}

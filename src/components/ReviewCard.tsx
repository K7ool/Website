"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { doc, onSnapshot } from "firebase/firestore";
import { Review } from "@/lib/types";
import Avatar from "@/components/Avatar";
import { db } from "@/lib/firebase";

interface ReviewCardProps {
  review: Review;
  index?: number;
}

export default function ReviewCard({ review, index = 0 }: ReviewCardProps) {
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!review.userId) return;
    const unsub = onSnapshot(doc(db!, "profiles", review.userId),
      (snap) => {
        if (snap.exists()) setProfile(snap.data());
      },
      () => {}
    );
    return unsub;
  }, [review.userId]);

  const p = profile || {};
  const username = p.username || review.username;
  const displayName = p.displayName || p.username || review.displayName || review.username;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      className="glass rounded-xl p-6 card-shine"
    >
      <div className="flex items-start gap-4">
        <Avatar size="md" src={p.avatar} fallback={displayName} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Link href={`/profile/${username}`} className="font-medium text-white text-sm hover:text-purple-400 transition-colors">{displayName}</Link>
            {review.verified && (
              <span className="px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-xs text-green-400">
                Verified Purchase
              </span>
            )}
          </div>
          <div className="flex items-center gap-0.5 mb-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <svg
                key={i}
                className={`w-4 h-4 ${i < review.rating ? "text-yellow-500" : "text-dark-500"}`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          <p className="text-sm text-gray-400 leading-relaxed">{review.text}</p>
          <p className="text-xs text-gray-500 mt-2">{new Date(review.createdAt).toLocaleDateString()}</p>
        </div>
      </div>
    </motion.div>
  );
}

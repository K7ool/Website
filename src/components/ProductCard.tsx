"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import Link from "next/link";
import { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: Product;
  index?: number;
  isOwned?: boolean;
}

function getThumbnailUrl(product: Product): string | null {
  const url = product?.thumbnail || product?.image || (product as any)?.thumbnailUrl || (product as any)?.thumbnail_url || null;
  if (url) console.log("ProductCard thumbnail URL:", url);
  else console.warn("ProductCard: no thumbnail URL found for", product?.title || product?.id);
  return url;
}

export default function ProductCard({ product, index = 0, isOwned }: ProductCardProps) {
  const thumbnailUrl = getThumbnailUrl(product);
  const [imgError, setImgError] = useState(false);

  const title = product?.title || "Untitled Product";
  const slug = product?.slug || "#";
  const category = product?.category || "General";
  const description = product?.description || "No description available.";
  const rating = product?.rating ?? 0;
  const reviewsCount = product?.reviewsCount ?? 0;
  const salesCount = product?.salesCount ?? 0;
  const price = product?.price ?? 0;
  const originalPrice = product?.originalPrice;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05, duration: 0.5 }}
      className="group relative"
    >
      <div className="glass rounded-xl overflow-hidden card-shine transition-all duration-300 group-hover:border-purple-500/30 group-hover:shadow-lg group-hover:shadow-purple-500/10">
        <Link href={`/products/${slug}`}>
          <div className="relative aspect-[16/9] bg-dark-600 overflow-hidden">
            {thumbnailUrl && !imgError ? (
              <Image
                src={thumbnailUrl}
                alt={title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                onError={(e) => {
                  console.error("ProductCard thumbnail failed to load:", thumbnailUrl);
                  setImgError(true);
                }}
              />
            ) : (
              <>
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-blue-600/20" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center opacity-80 group-hover:scale-110 transition-transform duration-300">
                    <span className="text-2xl font-bold text-white">
                      {title.charAt(0)}
                    </span>
                  </div>
                </div>
              </>
            )}
            {originalPrice && price > 0 && (
              <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-red-500/90 text-white text-xs font-semibold z-10">
                -{Math.round(((originalPrice - price) / originalPrice) * 100)}%
              </div>
            )}
            {isOwned && (
              <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-green-500/90 text-white text-xs font-semibold z-10">
                Owned
              </div>
            )}
            <div className="absolute top-3 right-3 px-2 py-1 rounded-md bg-dark-900/80 backdrop-blur-sm text-xs text-gray-300 border border-white/10 z-10">
              {category}
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-dark-800 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10" />
          </div>
        </Link>

        <div className="p-5">
          <Link href={`/products/${slug}`}>
            <h3 className="text-lg font-semibold text-white group-hover:text-purple-400 transition-colors mb-2 line-clamp-1">
              {title}
            </h3>
          </Link>
          <p className="text-sm text-gray-400 mb-4 line-clamp-2 leading-relaxed">
            {description}
          </p>

          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-sm font-medium text-gray-300">{rating ? Number(rating).toFixed(1) : "0.0"}</span>
              <span className="text-xs text-gray-500">({reviewsCount})</span>
            </div>
            <span className="text-xs text-gray-500">&middot;</span>
            <span className="text-xs text-gray-500">{salesCount} sold</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold gradient-text">${price.toFixed(2)}</span>
              {originalPrice && (
                <span className="text-sm text-gray-500 line-through">${originalPrice.toFixed(2)}</span>
              )}
            </div>
            <Link
              href={`/products/${slug}`}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg",
                isOwned
                  ? "bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20"
                  : "bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-500 hover:to-blue-500 shadow-purple-500/20"
              )}
            >
              {isOwned ? "View" : "Buy Now"}
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

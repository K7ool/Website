"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { where } from "firebase/firestore";
import ProductCard from "@/components/ProductCard";
import { productService, ownedProductService, productStatsService, ProductStats } from "@/lib/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

function slugify(name: string) { return name.toLowerCase().replace(/\s+/g, "-"); }

const sortOptions = [
  { label: "Popular", value: "popular" },
  { label: "Newest", value: "newest" },
  { label: "Price: Low to High", value: "price-asc" },
  { label: "Price: High to Low", value: "price-desc" },
];

export default function ProductsPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [sortBy, setSortBy] = useState("popular");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 200]);
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());
  const [productStats, setProductStats] = useState<Map<string, ProductStats>>(new Map());

  useEffect(() => {
    const unsub = productService.subscribe((items) => {
      const published = items
        .filter((p: any) => p.status === "published")
        .map((p: any) => ({
          id: p.id,
          title: p.name || p.title,
          slug: p.slug,
          description: p.shortDescription || p.description,
          price: p.price || 0,
          originalPrice: p.salePrice || null,
          category: p.category,
          rating: p.rating || 0,
          reviewsCount: p.reviewCount || 0,
          salesCount: p.sales || 0,
          image: p.thumbnail || "",
          images: p.gallery || [],
          features: p.features || [],
          compatibility: p.compatibility || [],
          installationGuide: p.installationGuide || "",
          fileUrl: p.downloadFile || "",
          createdAt: p.createdAt,
          popular: p.featured || false,
        }));
      setProducts(published);
      setLoading(false);
    }, [where("status", "==", "published")]);
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) { setOwnedIds(new Set()); return; }
    const unsub = ownedProductService.subscribe(user.uid, (ids) => { setOwnedIds(ids); });
    return unsub;
  }, [user]);

  useEffect(() => {
    const unsub = productStatsService.subscribeAll((statsMap) => { setProductStats(statsMap); });
    return unsub;
  }, []);

  const categories = useMemo(() => {
    const catSet = new Set<string>();
    products.forEach((p) => { if (p.category) catSet.add(p.category); });
    return Array.from(catSet).map((name) => ({ slug: slugify(name), name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  const filtered = useMemo(() => {
    let result = [...products];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }

    if (activeCategory !== "all") {
      result = result.filter((p) => slugify(p.category) === activeCategory);
    }

    result = result.filter((p) => p.price >= priceRange[0] && p.price <= priceRange[1]);

    switch (sortBy) {
      case "popular":
        result.sort((a, b) => b.salesCount - a.salesCount);
        break;
      case "newest":
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "price-asc":
        result.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        result.sort((a, b) => b.price - a.price);
        break;
    }

    return result;
  }, [search, activeCategory, sortBy, priceRange, products]);

  if (loading) {
    return (
      <div className="pt-24 pb-16 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-3">
            Products
          </h1>
          <p className="text-gray-400 text-lg">{products.length} premium products available</p>
        </motion.div>

        <div className="glass rounded-xl p-4 sm:p-6 mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg bg-dark-600 border border-purple-500/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/30 transition-colors"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-3 rounded-lg bg-dark-600 border border-purple-500/10 text-gray-300 focus:outline-none focus:border-purple-500/30"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
            <button
              onClick={() => setActiveCategory("all")}
              className={cn(
                "px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-all",
                activeCategory === "all"
                  ? "bg-purple-600 text-white"
                  : "bg-dark-600 text-gray-400 hover:text-white hover:bg-dark-500"
              )}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.slug}
                onClick={() => setActiveCategory(cat.slug)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-all",
                  activeCategory === cat.slug
                    ? "bg-purple-600 text-white"
                    : "bg-dark-600 text-gray-400 hover:text-white hover:bg-dark-500"
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">Price:</span>
            <input
              type="range"
              min={0}
              max={200}
              step={5}
              value={priceRange[1]}
              onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
              className="flex-1 accent-purple-500"
            />
            <span className="text-sm text-gray-300">${priceRange[0]} - ${priceRange[1]}</span>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-dark-600 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No products found</h3>
            <p className="text-gray-400">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((product, i) => (
              <ProductCard key={product.id} product={{
                  ...product,
                  rating: productStats.get(product.id)?.averageRating || product.rating,
                  reviewsCount: productStats.get(product.id)?.reviewCount ?? product.reviewsCount,
                  salesCount: productStats.get(product.id)?.salesCount ?? product.salesCount,
                }} index={i} isOwned={ownedIds.has(product.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

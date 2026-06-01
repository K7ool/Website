"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import GlassCard from "@/components/GlassCard";
import SectionHeading from "@/components/SectionHeading";
import { homepageService, statisticsService, testimonialService, productService, portfolioService, productStatsService } from "@/lib/firestore";
import { where } from "firebase/firestore";



export default function HomePage() {
  const [homepageData, setHomepageData] = useState<any>(null);
  const [stats, setStats] = useState<any[]>([]);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [portfolioProjects, setPortfolioProjects] = useState<any[]>([]);
  const [productStats, setProductStats] = useState<Map<string, { reviewCount: number; averageRating: number; salesCount: number }>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub1 = homepageService.subscribe(setHomepageData);
    const unsub2 = statisticsService.subscribe((items) => { setStats(items); });
    const unsub3 = testimonialService.subscribe((items) => { setTestimonials(items); setLoading(false); });
    const unsub4 = portfolioService.subscribe((items) => {
      setPortfolioProjects(items.filter((p: any) => p.featured && p.status !== "draft"));
    });
    const unsub5 = productService.subscribe((items) => {
      const valid = items.filter((p: any) => p && (p.title || p.name) && p.slug && p.price != null);
      if (items.length !== valid.length) {
        console.warn(`Filtered out ${items.length - valid.length} invalid products`);
      }
      setAllProducts(valid);
      setFeaturedProducts(valid.filter((p: any) => p.featured));
    }, [where("status", "==", "published")]);
    const unsub6 = productStatsService.subscribeAll((statsMap) => { setProductStats(statsMap); });
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); unsub6(); };
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const hero = homepageData || {};

  const categoryMap = new Map<string, number>();
  allProducts.forEach((p: any) => {
    const cat = p.category || p.categories?.[0];
    if (cat) categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
  });
  const productCategories = Array.from(categoryMap.entries())
    .map(([name, count]) => ({
      name,
      slug: name.toLowerCase().replace(/\s+/g, "-"),
      count,
    }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="overflow-hidden">
      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 pb-16">
        <div className="hero-glow bg-purple-600 -top-40 -left-40" />
        <div className="hero-glow bg-blue-600 -bottom-40 -right-40" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            {hero.trustBadge !== false && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-sm text-purple-300 mb-8">
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                {hero.trustBadgeText || "Trusted by developers worldwide"}
              </div>
            )}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold text-white leading-[1.1] mb-6"
              dangerouslySetInnerHTML={{
                __html: hero.heroTitle?.replace(/\[/g, '<span class="gradient-text">').replace(/\]/g, "</span>")
                  || 'Premium Roblox<br/><span class="gradient-text">Scripts & Models</span>'
              }}
            />
            <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              {hero.heroSubtitle || "High-quality Roblox systems, scripts, UI packs, and models built for developers who demand the best."}
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link
                href={hero.heroButtonUrl || "/products"}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold text-lg hover:from-purple-500 hover:to-blue-500 transition-all shadow-xl shadow-purple-500/30 hover:shadow-purple-500/40"
              >
                {hero.heroButtonText || "Browse Products"}
              </Link>
              <Link
                href={process.env.NEXT_PUBLIC_DISCORD_INVITE || "https://discord.gg/xEFTFB89jK"}
                className="px-8 py-4 rounded-xl glass text-white font-semibold text-lg hover:bg-dark-600 transition-all border border-purple-500/20"
              >
                Join Discord
              </Link>
            </div>
          </motion.div>

          <div className="absolute inset-0 pointer-events-none overflow-hidden hidden lg:block">
            {[
              { x: "10%", y: "20%", size: 24, delay: "0s", color: "from-purple-500/20 to-purple-600/10" },
              { x: "85%", y: "30%", size: 32, delay: "1s", color: "from-blue-500/20 to-blue-600/10" },
              { x: "20%", y: "70%", size: 20, delay: "2s", color: "from-purple-500/20 to-blue-600/10" },
              { x: "75%", y: "65%", size: 28, delay: "0.5s", color: "from-purple-500/15 to-purple-600/10" },
              { x: "50%", y: "15%", size: 16, delay: "1.5s", color: "from-blue-500/15 to-blue-600/10" },
            ].map((cube, i) => (
              <motion.div
                key={i}
                className={`absolute rounded-2xl bg-gradient-to-br ${cube.color} border border-purple-500/10 backdrop-blur-sm`}
                style={{ left: cube.x, top: cube.y, width: cube.size, height: cube.size }}
                animate={{ y: [0, -15, 0], rotate: [0, 5, -5, 0] }}
                transition={{ duration: 6, repeat: Infinity, delay: parseFloat(cube.delay), ease: "easeInOut" }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      {homepageData?.statsEnabled !== false && stats.length > 0 && (
        <section className="py-16 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {stats.map((stat, i) => (
                <GlassCard key={stat.id || i} delay={i * 0.1} className="text-center">
                  <div className="text-3xl sm:text-4xl font-bold gradient-text mb-1">{stat.value}</div>
                  <div className="text-sm text-gray-400">{stat.label}</div>
                </GlassCard>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Categories */}
      {productCategories.length > 0 && (
        <section className="py-16 lg:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeading title="Explore Categories" subtitle="Find exactly what you need for your Roblox project" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {productCategories.map((cat, i) => (
                <motion.div
                  key={cat.slug}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05, duration: 0.4 }}
                >
                  <Link
                    href={`/products?category=${cat.slug}`}
                    className="group glass rounded-xl p-5 text-center card-shine block hover:border-purple-500/30"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600/20 to-blue-600/20 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                      <div className="w-6 h-6 rounded-md bg-gradient-to-br from-purple-500 to-blue-600" />
                    </div>
                    <h3 className="font-medium text-white text-sm group-hover:text-purple-400 transition-colors">{cat.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">{cat.count} item{cat.count !== 1 ? "s" : ""}</p>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Work */}
      {homepageData?.portfolioEnabled !== false && portfolioProjects.length > 0 && (
        <section className="py-16 lg:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeading title="Featured Work" subtitle="Showcasing our best projects" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {portfolioProjects.slice(0, 4).map((project, i) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                >
                  <GlassCard className="h-full flex flex-col card-shine">
                    <div className="aspect-video rounded-lg bg-gradient-to-br from-purple-600/20 to-blue-600/20 flex items-center justify-center mb-4 overflow-hidden">
                      {project.coverImage ? (
                        <img src={project.coverImage} alt={project.title} className="w-full h-full object-cover" />
                      ) : project.thumbnail ? (
                        <img src={project.thumbnail} alt={project.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                          <span className="text-2xl font-bold text-white">{project.title?.charAt(0)}</span>
                        </div>
                      )}
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300 self-start mb-2">{project.category}</span>
                    <h3 className="text-lg font-semibold text-white mb-2">{project.title}</h3>
                    <p className="text-sm text-gray-400 flex-1">{project.description}</p>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mt-10"
            >
              <Link
                href="/portfolio"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl glass text-white font-medium hover:bg-dark-600 transition-all border border-purple-500/20"
              >
                View Full Portfolio
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </motion.div>
          </div>
        </section>
      )}

      {/* Featured Products */}
      {homepageData?.featuredEnabled !== false && featuredProducts.length > 0 && (
        <section className="py-16 lg:py-24 bg-dark-800/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeading title="Featured Products" subtitle="Our most popular and highest-rated creations" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredProducts.slice(0, 6).map((product, i) => (
                <ProductCard key={product.id} product={{
                    ...product,
                    rating: productStats.get(product.id)?.averageRating ?? product.rating ?? 0,
                    reviewsCount: productStats.get(product.id)?.reviewCount ?? product.reviewsCount ?? 0,
                    salesCount: productStats.get(product.id)?.salesCount ?? product.salesCount ?? 0,
                  }} index={i} />
              ))}
            </div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mt-10"
            >
              <Link
                href="/products"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl glass text-white font-medium hover:bg-dark-600 transition-all border border-purple-500/20"
              >
                View All Products
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </motion.div>
          </div>
        </section>
      )}

      {/* Testimonials */}
      {homepageData?.testimonialsEnabled !== false && testimonials.filter((t) => t.featured !== false).length > 0 && (
        <section className="py-16 lg:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeading title="What Developers Say" subtitle="Join thousands of satisfied customers" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {testimonials.filter((t) => t.featured !== false).slice(0, 6).map((t, i) => (
                <motion.div
                  key={t.id || i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05, duration: 0.5 }}
                >
                  <GlassCard className="h-full flex flex-col">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {t.name?.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{t.name}</p>
                        {t.position && <p className="text-xs text-gray-500">{t.position}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mb-2">
                      {Array.from({ length: 5 }).map((_, si) => (
                        <svg key={si} className={`w-4 h-4 ${si < (t.rating || 5) ? "text-yellow-400" : "text-gray-600"}`} fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <p className="text-sm text-gray-400 leading-relaxed flex-1">{t.review}</p>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Why Choose Us */}
      {(homepageData?.whyTitle || homepageData?.whyFeatures?.length > 0) && (
        <section className="py-16 lg:py-24 bg-dark-800/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeading title={homepageData.whyTitle || "Why Choose Us"} subtitle={homepageData.whyDescription || ""} />
            {homepageData.whyFeatures && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
                {homepageData.whyFeatures.map((reason: string, i: number) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 text-sm text-gray-300"
                  >
                    <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                      <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span>{reason}</span>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-20 lg:py-28 relative">
        <div className="hero-glow bg-purple-600 left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-3xl sm:text-5xl font-bold text-white mb-6">
              Ready to Build <span className="gradient-text">Something Amazing?</span>
            </h2>
            <p className="text-lg text-gray-400 mb-10 max-w-2xl mx-auto">
              Get access to our entire library of premium scripts, systems, and models. Start building today.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link
                href="/auth/register"
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold text-lg hover:from-purple-500 hover:to-blue-500 transition-all shadow-xl shadow-purple-500/30"
              >
                Get Started Free
              </Link>
              <Link
                href="/contact"
                className="px-8 py-4 rounded-xl glass text-white font-semibold text-lg border border-purple-500/20 hover:bg-dark-600 transition-all"
              >
                Contact Us
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

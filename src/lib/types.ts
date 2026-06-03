export interface Product {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  originalPrice?: number;
  category: string;
  image: string;
  images: string[];
  thumbnail?: string;
  gallery?: string[];
  rating: number;
  reviewsCount: number;
  salesCount: number;
  features: string[];
  compatibility: string[];
  installationGuide: string;
  createdAt: string;
  updatedAt: string;
  featured: boolean;
  popular: boolean;
  bindingType?: "universe" | "creator" | "user" | "any";
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  username: string;
  displayName?: string;
  avatar: string;
  rating: number;
  text: string;
  content?: string;
  productTitle?: string;
  productImage?: string;
  verified: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  count: number;
}

export interface User {
  id: string;
  email: string;
  username: string;
  avatar: string;
  role: "customer" | "admin";
  discordId?: string;
  createdAt: string;
}

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  total: number;
  status: "pending" | "completed" | "refunded";
  createdAt: string;
}

export interface OrderItem {
  productId: string;
  title: string;
  price: number;
  licenseKey?: string;
}

export type LicenseHealth = "active" | "expiring_soon" | "revoked" | "expired";

export interface License {
  id: string;
  productId: string;
  userId: string;
  key: string;
  status: LicenseHealth;
  productName?: string;
  durationMonths?: number;
  maxDownloads?: number;
  downloadCount?: number;
  expiresAt?: string;
  createdAt: string;

  // Roblox binding (set on first API verification)
  robloxUserId?: number;
  robloxUsername?: string;
  creatorId?: number;
  universeId?: number;
  placeId?: number;

  // Analytics
  activationCount?: number;
  lastVerification?: string;
  lastPlaceId?: number;
  generatedBy?: string;
  orderId?: string;
  orderNumber?: string;
  downloadFile?: string;
}

export interface Ticket {
  id: string;
  userId: string;
  subject: string;
  status: "open" | "closed" | "pending";
  priority: "low" | "medium" | "high";
  createdAt: string;
  updatedAt: string;
}

export interface Analytics {
  revenue: number;
  sales: number;
  visitors: number;
  topProducts: Product[];
  dailySales: { date: string; amount: number }[];
}

// ─── CMS Types ───

export interface PortfolioProject {
  id: string;
  title: string;
  slug: string;
  category: string;
  description: string;
  thumbnail: string;
  galleryImages: string[];
  robloxLink?: string;
  visits?: string;
  status: "published" | "draft";
  featured: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface SiteStatistic {
  id: string;
  label: string;
  value: string;
  sortOrder: number;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  price: string;
  features: string[];
  featured: boolean;
  icon: string;
  displayOrder: number;
}

export interface Testimonial {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  review: string;
  position?: string;
  featured: boolean;
  createdAt: string;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
}

export interface Announcement {
  id: string;
  text: string;
  color: string;
  active: boolean;
  expiryDate?: string;
  createdAt: string;
}

export interface SiteSettings {
  id: string;
  siteName: string;
  logo: string;
  favicon: string;
  contactEmail: string;
  discordLink: string;
  seoTitle: string;
  seoDescription: string;
  footerDiscord: string;
  footerYoutube: string;
  footerTwitter: string;
  footerGithub: string;
  footerEmail: string;
  footerCopyright: string;
}

export interface HomepageSection {
  id: string;
  heroTitle: string;
  heroSubtitle: string;
  heroButtonText: string;
  heroButtonUrl: string;
  heroImage: string;
  featuredEnabled: boolean;
  featuredProductIds: string[];
  whyTitle: string;
  whyDescription: string;
  whyFeatures: string[];
  statsEnabled: boolean;
  testimonialsEnabled: boolean;
}

export interface LegalSection {
  heading: string;
  content: string;
}

export interface LegalPage {
  id?: string;
  type: "terms" | "privacy" | "refund";
  title: string;
  sections: LegalSection[];
  updatedAt?: string;
}

// ─── NOTIFICATIONS ───

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "purchase" | "update" | "ticket" | "review" | "license" | "coupon" | "announcement";
  read: boolean;
  createdAt: string;
  link?: string;
}

// ─── PRODUCT VERSIONS ───

export interface ProductVersion {
  id: string;
  version: string;
  title: string;
  notes: string[];
  createdAt: string;
}

// ─── ROBlOX VERIFICATION ───

export interface RobloxVerification {
  id: string;
  userId: string;
  robloxUsername: string;
  robloxUserId: number;
  robloxProfileUrl: string;
  robloxAvatarUrl: string;
  verified: boolean;
  verificationCode: string;
  createdAt: string;
  verifiedAt?: string;
}

// ─── ACHIEVEMENTS ───

export interface Achievement {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  type: "purchase" | "review" | "social" | "special";
  requirement: { type: string; value: number };
}

export interface UserAchievement {
  id: string;
  userId: string;
  achievementKey: string;
  achievementName: string;
  achievementDescription: string;
  achievementIcon: string;
  unlockedAt: string;
}

// ─── COUPONS ───

export interface Coupon {
  id: string;
  code: string;
  type: "percentage" | "fixed";
  value: number;
  maxUses: number;
  usedCount: number;
  minPurchase?: number;
  applicableProducts?: string[];
  expiresAt: string;
  active: boolean;
  createdAt: string;
}

// ─── ACTIVITY ───

export interface Activity {
  id: string;
  userId: string;
  type: "purchase" | "review" | "achievement" | "verification" | "registration";
  description: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

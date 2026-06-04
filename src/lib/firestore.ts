import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  getCountFromServer,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  serverTimestamp,
  increment,
  DocumentData,
  QueryConstraint,
} from "firebase/firestore";
import { db } from "./firebase";
import { getAuth } from "firebase/auth";

function serializeDoc(id: string, data: DocumentData) {
  const obj: any = { id, ...data };
  Object.keys(obj).forEach((key) => {
    if (obj[key] instanceof Timestamp) obj[key] = obj[key].toDate().toISOString();
  });
  return obj;
}

async function serializeSnapshot(snapshot: any) {
  const results: any[] = [];
  snapshot.forEach((doc: any) => results.push(serializeDoc(doc.id, doc.data())));
  return results;
}

const COLLECTIONS = {
  products: "products",
  orders: "orders",
  reviews: "reviews",
  licenses: "licenses",
  tickets: "tickets",
  ticketReplies: "ticketReplies",
  messages: "messages",
  notifications: "notifications",
  downloads: "downloads",
  profiles: "profiles",
  categories: "categories",
  pageViews: "pageViews",
  paymentRequests: "payment_requests",
  invoices: "invoices",
  portfolio: "portfolio_projects",
  statistics: "site_statistics",
  services: "services",
  homepage: "homepage_sections",
  testimonials: "testimonials",
  faqs: "faqs",
  announcements: "announcements",
  siteSettings: "site_settings",
  legal: "legal_content",
  productVersions: "productVersions",
  achievements: "achievements",
  userAchievements: "userAchievements",
  coupons: "coupons",
  activities: "activities",
  robloxVerifications: "robloxVerifications",
  licenseActivity: "licenseActivity",
  licenseBlacklist: "licenseBlacklist",
  activeSessions: "activeSessions",
  incidents: "incidents",
} as const;

function handleSnapshotError(err: any) {
  console.error(`[snapshot] ${err?.code || "unknown"}: ${err?.message || err}`, err);
}

// ─── PRODUCTS ───

export const productService = {
  async getAll(constraints: QueryConstraint[] = []) {
    const q = query(collection(db!, COLLECTIONS.products), ...constraints);
    const snap = await getDocs(q);
    return serializeSnapshot(snap);
  },
  async getById(id: string) {
    const snap = await getDoc(doc(db!, COLLECTIONS.products, id));
    if (!snap.exists()) return null;
    return serializeDoc(snap.id, snap.data());
  },
  async create(data: any) {
    const ref = await addDoc(collection(db!, COLLECTIONS.products), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    await updateDoc(ref, { productId: ref.id });
    return ref.id;
  },
  async update(id: string, data: any) {
    await updateDoc(doc(db!, COLLECTIONS.products, id), { ...data, updatedAt: serverTimestamp() });
  },
  async delete(id: string) {
    await deleteDoc(doc(db!, COLLECTIONS.products, id));
  },
  subscribe(callback: (items: any[]) => void, constraints: QueryConstraint[] = []) {
    const q = query(collection(db!, COLLECTIONS.products), ...constraints);
    return onSnapshot(q, (snap) => { serializeSnapshot(snap).then(callback); }, handleSnapshotError);
  },
};

// ─── ORDERS ───

function generateOrderNumber(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `FLP-${seg()}-${seg()}`;
}

export const orderService = {
  async getAll(constraints: QueryConstraint[] = []) {
    const q = query(collection(db!, COLLECTIONS.orders), ...constraints);
    const snap = await getDocs(q);
    return serializeSnapshot(snap);
  },
  async getByUser(userId: string) {
    const q = query(collection(db!, COLLECTIONS.orders), where("userId", "==", userId));
    const snap = await getDocs(q);
    return serializeSnapshot(snap);
  },
  async create(data: any) {
    const orderNumber = generateOrderNumber();
    const ref = await addDoc(collection(db!, COLLECTIONS.orders), {
      ...data,
      orderNumber,
      status: data.status || "pending_payment",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { id: ref.id, orderNumber };
  },
  async updateStatus(id: string, status: string) {
    await updateDoc(doc(db!, COLLECTIONS.orders, id), { status, updatedAt: serverTimestamp() });
  },
  async update(id: string, data: any) {
    await updateDoc(doc(db!, COLLECTIONS.orders, id), { ...data, updatedAt: serverTimestamp() });
  },
  async delete(id: string) {
    await deleteDoc(doc(db!, COLLECTIONS.orders, id));
  },
  subscribe(callback: (items: any[]) => void, constraints: QueryConstraint[] = []) {
    const q = query(collection(db!, COLLECTIONS.orders), ...constraints);
    return onSnapshot(q, async (snap) => callback(await serializeSnapshot(snap)), handleSnapshotError);
  },
};

// ─── REVIEWS ───

export const reviewService = {
  async getAll(constraints: QueryConstraint[] = []) {
    const q = query(collection(db!, COLLECTIONS.reviews), ...constraints);
    const snap = await getDocs(q);
    return serializeSnapshot(snap);
  },
  async getByProduct(productId: string) {
    const q = query(collection(db!, COLLECTIONS.reviews), where("productId", "==", productId), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return serializeSnapshot(snap);
  },
  async create(data: any) {
    const ref = await addDoc(collection(db!, COLLECTIONS.reviews), { ...data, createdAt: serverTimestamp() });
    return ref.id;
  },
  async update(id: string, data: any) {
    await updateDoc(doc(db!, COLLECTIONS.reviews, id), data);
  },
  async delete(id: string) {
    await deleteDoc(doc(db!, COLLECTIONS.reviews, id));
  },
  subscribe(callback: (items: any[]) => void, constraints: QueryConstraint[] = []) {
    const q = query(collection(db!, COLLECTIONS.reviews), ...constraints);
    return onSnapshot(q, async (snap) => callback(await serializeSnapshot(snap)), handleSnapshotError);
  },
};

// ─── REVIEW COMMENTS (subcollection) ───

export const commentService = {
  async getByReview(reviewId: string) {
    const q = query(collection(db!, COLLECTIONS.reviews, reviewId, "comments"), orderBy("createdAt", "asc"));
    const snap = await getDocs(q);
    return serializeSnapshot(snap);
  },
  async create(reviewId: string, data: any) {
    const ref = await addDoc(collection(db!, COLLECTIONS.reviews, reviewId, "comments"), { ...data, createdAt: serverTimestamp() });
    return ref.id;
  },
  async update(reviewId: string, commentId: string, data: any) {
    await updateDoc(doc(db!, COLLECTIONS.reviews, reviewId, "comments", commentId), data);
  },
  async delete(reviewId: string, commentId: string) {
    await deleteDoc(doc(db!, COLLECTIONS.reviews, reviewId, "comments", commentId));
  },
  subscribe(reviewId: string, callback: (items: any[]) => void) {
    const q = query(collection(db!, COLLECTIONS.reviews, reviewId, "comments"), orderBy("createdAt", "asc"));
    return onSnapshot(q, async (snap) => callback(await serializeSnapshot(snap)), handleSnapshotError);
  },
};

// ─── LICENSES ───

function calcExpiry(durationMonths?: number): Date | null {
  if (!durationMonths || durationMonths <= 0) return null;
  const d = new Date();
  d.setMonth(d.getMonth() + durationMonths);
  return d;
}

export const licenseService = {
  async getAll(constraints: QueryConstraint[] = []) {
    const q = query(collection(db!, COLLECTIONS.licenses), ...constraints);
    const snap = await getDocs(q);
    return serializeSnapshot(snap);
  },
  async getById(id: string) {
    const snap = await getDoc(doc(db!, COLLECTIONS.licenses, id));
    if (!snap.exists()) return null;
    return serializeDoc(snap.id, snap.data());
  },
  async getByUser(userId: string) {
    const q = query(collection(db!, COLLECTIONS.licenses), where("userId", "==", userId), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return serializeSnapshot(snap);
  },
  async getByKey(key: string) {
    const q = query(collection(db!, COLLECTIONS.licenses), where("key", "==", key));
    const snap = await getDocs(q);
    const items = await serializeSnapshot(snap);
    return items.length > 0 ? items[0] : null;
  },
  async getByProductId(productId: string) {
    const q = query(collection(db!, COLLECTIONS.licenses), where("productId", "==", productId), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return serializeSnapshot(snap);
  },
  generateKey(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    return `FLIPP-${seg()}-${seg()}-${seg()}`;
  },
  async create(data: {
    userId: string;
    productId: string;
    productName: string;
    orderId?: string;
    orderNumber?: string;
    invoiceId?: string;
    invoiceNumber?: string;
    downloadFile?: string;
    durationMonths?: number;
    maxDownloads?: number;
    generatedBy?: string;
    robloxUserId?: number;
    creatorId?: number;
    universeId?: number;
    features?: Record<string, any>;
    bindingType?: "universe" | "creator" | "user" | "any";
    maxConcurrentServers?: number;
  }) {
    const expiresAt = calcExpiry(data.durationMonths);
    const ref = await addDoc(collection(db!, COLLECTIONS.licenses), {
      key: licenseService.generateKey(),
      userId: data.userId,
      productId: data.productId,
      productName: data.productName,
      orderId: data.orderId || "",
      orderNumber: data.orderNumber || "",
      invoiceId: data.invoiceId || "",
      invoiceNumber: data.invoiceNumber || "",
      downloadFile: data.downloadFile || "",
      durationMonths: data.durationMonths || 0,
      maxDownloads: data.maxDownloads || 0,
      generatedBy: data.generatedBy || "",
      status: "active",
      downloadCount: 0,
      expiresAt: expiresAt ? expiresAt.toISOString() : "",
      // Roblox fields
      bindingType: data.bindingType || "any",
      maxConcurrentServers: data.maxConcurrentServers || 0,
      lastTransferAt: null,
      robloxUserId: data.robloxUserId || null,
      creatorId: data.creatorId || null,
      universeId: data.universeId || null,
      placeId: null,
      robloxUsername: null,
      features: data.features || null,
      activationCount: 0,
      lastVerification: null,
      lastPlaceId: null,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  },
  async update(id: string, data: any) {
    await updateDoc(doc(db!, COLLECTIONS.licenses, id), { ...data, updatedAt: serverTimestamp() });
  },
  async revoke(id: string) {
    await updateDoc(doc(db!, COLLECTIONS.licenses, id), { status: "revoked", updatedAt: serverTimestamp() });
  },
  async delete(id: string) {
    await deleteDoc(doc(db!, COLLECTIONS.licenses, id));
  },
  async extend(id: string, extraMonths: number) {
    const snap = await getDoc(doc(db!, COLLECTIONS.licenses, id));
    if (!snap.exists()) throw new Error("License not found");
    const data = snap.data();
    const currentExpiry = data.expiresAt ? new Date(data.expiresAt) : new Date();
    currentExpiry.setMonth(currentExpiry.getMonth() + extraMonths);
    await updateDoc(doc(db!, COLLECTIONS.licenses, id), {
      status: "active",
      expiresAt: currentExpiry.toISOString(),
      durationMonths: (data.durationMonths || 0) + extraMonths,
      updatedAt: serverTimestamp(),
    });
  },
  async regenerate(id: string) {
    const newKey = licenseService.generateKey();
    await updateDoc(doc(db!, COLLECTIONS.licenses, id), {
      key: newKey,
      status: "active",
      updatedAt: serverTimestamp(),
    });
    return newKey;
  },
  async resetBinding(id: string) {
    await updateDoc(doc(db!, COLLECTIONS.licenses, id), {
      robloxUserId: null,
      creatorId: null,
      universeId: null,
      placeId: null,
      robloxUsername: null,
      activationCount: 0,
      lastVerification: null,
      lastPlaceId: null,
      updatedAt: serverTimestamp(),
    });
  },
  async recordVerification(id: string, robloxData: { robloxUserId?: number; robloxUsername?: string; creatorId?: number; universeId?: number; placeId?: number }) {
    await updateDoc(doc(db!, COLLECTIONS.licenses, id), {
      activationCount: increment(1),
      lastVerification: serverTimestamp(),
      lastPlaceId: robloxData.placeId || null,
      robloxUserId: robloxData.robloxUserId || null,
      robloxUsername: robloxData.robloxUsername || null,
      creatorId: robloxData.creatorId || null,
      universeId: robloxData.universeId || null,
      placeId: robloxData.placeId || null,
      updatedAt: serverTimestamp(),
    });
  },
  async recordDownload(id: string) {
    const snap = await getDoc(doc(db!, COLLECTIONS.licenses, id));
    if (!snap.exists()) throw new Error("License not found");
    const data = snap.data();
    const current = data.downloadCount || 0;
    const max = data.maxDownloads || 0;
    if (max > 0 && current >= max) throw new Error("Download limit reached");
    await updateDoc(doc(db!, COLLECTIONS.licenses, id), { downloadCount: current + 1, updatedAt: serverTimestamp() });
  },
  subscribe(callback: (items: any[]) => void, constraints: QueryConstraint[] = []) {
    const q = query(collection(db!, COLLECTIONS.licenses), ...constraints);
    return onSnapshot(q, async (snap) => callback(await serializeSnapshot(snap)), handleSnapshotError);
  },
};

// ─── TICKETS ───

export const ticketService = {
  async getAll(constraints: QueryConstraint[] = []) {
    const q = query(collection(db!, COLLECTIONS.tickets), ...constraints);
    const snap = await getDocs(q);
    return serializeSnapshot(snap);
  },
  async getById(id: string) {
    const snap = await getDoc(doc(db!, COLLECTIONS.tickets, id));
    if (!snap.exists()) return null;
    return serializeDoc(snap.id, snap.data());
  },
  async getByUser(userId: string) {
    const q = query(collection(db!, COLLECTIONS.tickets), where("userId", "==", userId), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return serializeSnapshot(snap);
  },
  async create(data: any) {
    const ref = await addDoc(collection(db!, COLLECTIONS.tickets), {
      ...data, status: "open", createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    return ref.id;
  },
  async updateStatus(id: string, status: string) {
    await updateDoc(doc(db!, COLLECTIONS.tickets, id), { status, updatedAt: serverTimestamp() });
  },
  subscribe(callback: (items: any[]) => void, constraints: QueryConstraint[] = []) {
    const q = query(collection(db!, COLLECTIONS.tickets), ...constraints);
    return onSnapshot(q, async (snap) => callback(await serializeSnapshot(snap)), handleSnapshotError);
  },
  async delete(id: string) {
    await deleteDoc(doc(db!, COLLECTIONS.tickets, id));
  },
  subscribeById(id: string, callback: (item: any) => void) {
    return onSnapshot(doc(db!, COLLECTIONS.tickets, id), (snap) => {
      if (snap.exists()) callback(serializeDoc(snap.id, snap.data()));
    }, handleSnapshotError);
  },
  subscribeByUser(userId: string, callback: (items: any[]) => void, constraints: QueryConstraint[] = []) {
    const q = query(collection(db!, COLLECTIONS.tickets), where("userId", "==", userId), ...constraints);
    return onSnapshot(q, async (snap) => callback(await serializeSnapshot(snap)), handleSnapshotError);
  },
};

// ─── MESSAGES (ticket conversations) ───

export const messageService = {
  subscribe(ticketId: string, callback: (items: any[]) => void) {
    const q = query(
      collection(db!, COLLECTIONS.tickets, ticketId, COLLECTIONS.messages),
      orderBy("createdAt", "asc")
    );
    return onSnapshot(q, async (snap) => callback(await serializeSnapshot(snap)), handleSnapshotError);
  },
  async create(ticketId: string, data: { senderId: string; senderRole: string; message: string; createdAt: string }) {
    await addDoc(collection(db!, COLLECTIONS.tickets, ticketId, COLLECTIONS.messages), data);
    try {
      await updateDoc(doc(db!, COLLECTIONS.tickets, ticketId), { updatedAt: data.createdAt });
    } catch (err: any) {
      console.error(`[tickets] update failed: ${err?.code || "unknown"} — ${err?.message || err}`);
    }
  },
};

export async function recalculateProductStats(productId: string) {
  try {
    const [reviewSnap, orderSnap] = await Promise.all([
      getDocs(query(collection(db!, COLLECTIONS.reviews), where("productId", "==", productId))),
      getDocs(query(collection(db!, COLLECTIONS.orders), where("productId", "==", productId))),
    ]);
    const reviews = await serializeSnapshot(reviewSnap);
    const orders = await serializeSnapshot(orderSnap);
    const reviewCount = reviews.length;
    const averageRating = reviewCount > 0
      ? reviews.reduce((s: number, r: any) => s + (r.rating || 0), 0) / reviewCount
      : 0;
    const salesCount = orders.filter(
      (o: any) => o.status === "approved" || o.status === "completed"
    ).length;
    try {
      const directRef = doc(db!, COLLECTIONS.products, productId);
      await updateDoc(directRef, { reviewCount, averageRating, salesCount });
    } catch {
      const prodQuery = query(collection(db!, COLLECTIONS.products), where("slug", "==", productId));
      const prodSnap = await getDocs(prodQuery);
      if (!prodSnap.empty) {
        await updateDoc(prodSnap.docs[0].ref, { reviewCount, averageRating, salesCount });
      }
    }
  } catch (err) {
    console.error("recalculateProductStats error:", err);
  }
}

// ─── NOTIFICATIONS ───

export const notificationService = {
  async create(data: { userId: string; title: string; message: string; type: string; link?: string; ticketId?: string }) {
    await addDoc(collection(db!, COLLECTIONS.notifications), {
      ...data, read: false, createdAt: serverTimestamp(),
    });
  },
  async createBulk(userIds: string[], data: { title: string; message: string; type: string; link?: string }) {
    const batch = userIds.map((userId) => ({
      ...data, userId, read: false, createdAt: serverTimestamp(),
    }));
    for (const docData of batch) {
      await addDoc(collection(db!, COLLECTIONS.notifications), docData);
    }
  },
  subscribe(userId: string, callback: (items: any[]) => void) {
    const q = query(
      collection(db!, COLLECTIONS.notifications),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
      limit(20)
    );
    return onSnapshot(q, async (snap) => callback(await serializeSnapshot(snap)), handleSnapshotError);
  },
  subscribeRecent(userId: string, callback: (items: any[]) => void) {
    const q = query(
      collection(db!, COLLECTIONS.notifications),
      where("userId", "==", userId),
      where("read", "==", false),
      orderBy("createdAt", "desc"),
      limit(5)
    );
    return onSnapshot(q, async (snap) => callback(await serializeSnapshot(snap)), handleSnapshotError);
  },
  subscribeAll(callback: (items: any[]) => void) {
    const q = query(collection(db!, COLLECTIONS.notifications), orderBy("createdAt", "desc"), limit(50));
    return onSnapshot(q, async (snap) => callback(await serializeSnapshot(snap)), handleSnapshotError);
  },
  async getAll(constraints: QueryConstraint[] = []) {
    const q = query(collection(db!, COLLECTIONS.notifications), ...constraints);
    const snap = await getDocs(q);
    return serializeSnapshot(snap);
  },
  async getById(id: string) {
    const snap = await getDoc(doc(db!, COLLECTIONS.notifications, id));
    if (!snap.exists()) return null;
    return serializeDoc(snap.id, snap.data());
  },
  async markRead(id: string) {
    await updateDoc(doc(db!, COLLECTIONS.notifications, id), { read: true });
  },
  async markAllRead(userId: string) {
    const q = query(collection(db!, COLLECTIONS.notifications), where("userId", "==", userId), where("read", "==", false));
    const snap = await getDocs(q);
    const updates = snap.docs.map((d) => updateDoc(d.ref, { read: true }));
    await Promise.all(updates);
  },
  async delete(id: string) {
    await deleteDoc(doc(db!, COLLECTIONS.notifications, id));
  },
  getUnreadCount(userId: string, callback: (count: number) => void) {
    const q = query(collection(db!, COLLECTIONS.notifications), where("userId", "==", userId), where("read", "==", false));
    return onSnapshot(q, async (snap) => callback(snap.size), handleSnapshotError);
  },
};

// ─── DOWNLOADS ───

export const downloadService = {
  async log(userId: string, productId: string, productTitle: string) {
    await addDoc(collection(db!, COLLECTIONS.downloads), { userId, productId, productTitle, createdAt: serverTimestamp() });
  },
  async getByUser(userId: string) {
    const q = query(collection(db!, COLLECTIONS.downloads), where("userId", "==", userId), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return serializeSnapshot(snap);
  },
  async getCount() {
    const snap = await getCountFromServer(collection(db!, COLLECTIONS.downloads));
    return snap.data().count;
  },
  subscribe(callback: (items: any[]) => void, userId?: string) {
    const constraints: QueryConstraint[] = userId ? [where("userId", "==", userId)] : [];
    const q = query(collection(db!, COLLECTIONS.downloads), ...constraints, orderBy("createdAt", "desc"));
    return onSnapshot(q, async (snap) => callback(await serializeSnapshot(snap)), handleSnapshotError);
  },
};

// ─── PROFILES ───

const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;
const USERNAME_CHANGE_COOLDOWN_DAYS = 30;

export function sanitizeUsername(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, "")
    .replace(/[^a-zA-Z0-9_]/g, "")
    .toLowerCase();
}

export function validateUsernameFormat(raw: string): string | null {
  const cleaned = sanitizeUsername(raw);
  if (!cleaned) return "Username is required.";
  if (raw.includes(" ")) return "Username cannot contain spaces.";
  if (cleaned.length < 3) return "Username must be at least 3 characters.";
  if (cleaned.length > 30) return "Username must be 30 characters or fewer.";
  if (!USERNAME_REGEX.test(cleaned)) return "Username can only contain letters, numbers, and underscores.";
  return null;
}

export function getUsernameCooldownInfo(lastUsernameChange: string | number | Date | null | undefined): {
  canChange: boolean;
  remainingDays: number;
  nextAvailable: string | null;
} {
  if (!lastUsernameChange) return { canChange: true, remainingDays: 0, nextAvailable: null };
  const last = new Date(lastUsernameChange).getTime();
  const now = Date.now();
  const elapsed = now - last;
  const cooldownMs = USERNAME_CHANGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
  if (elapsed >= cooldownMs) return { canChange: true, remainingDays: 0, nextAvailable: null };
  const remainingMs = cooldownMs - elapsed;
  const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
  const nextAvailable = new Date(last + cooldownMs).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
  return { canChange: false, remainingDays, nextAvailable };
}

export const profileService = {
  async get(userId: string) {
    const snap = await getDoc(doc(db!, COLLECTIONS.profiles, userId));
    if (!snap.exists()) return null;
    return serializeDoc(snap.id, snap.data());
  },
  async getByUsername(username: string) {
    const q = query(collection(db!, COLLECTIONS.profiles), where("username", "==", username.toLowerCase()), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return serializeDoc(snap.docs[0].id, snap.docs[0].data());
  },
  async isUsernameAvailable(username: string, excludeUserId?: string): Promise<boolean> {
    const sanitized = sanitizeUsername(username);
    if (!sanitized) return false;
    const q = query(collection(db!, COLLECTIONS.profiles), where("username", "==", sanitized), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return true;
    if (excludeUserId && snap.docs[0].id === excludeUserId) return true;
    return false;
  },
  async updateUsername(userId: string, newUsername: string): Promise<{ success: boolean; error?: string }> {
    const formatError = validateUsernameFormat(newUsername);
    if (formatError) return { success: false, error: formatError };
    const sanitized = sanitizeUsername(newUsername);
    const currentProfile = await profileService.get(userId);
    if (!currentProfile) return { success: false, error: "Profile not found." };
    if (currentProfile.username === sanitized) return { success: true };
    const cooldown = getUsernameCooldownInfo(currentProfile.lastUsernameChange);
    if (!cooldown.canChange) {
      return { success: false, error: `You can change your username again in ${cooldown.remainingDays} day${cooldown.remainingDays === 1 ? "" : "s"}.` };
    }
    const available = await profileService.isUsernameAvailable(sanitized, userId);
    if (!available) return { success: false, error: "Username is already taken." };
    await setDoc(doc(db!, COLLECTIONS.profiles, userId), {
      username: sanitized,
      lastUsernameChange: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
    return { success: true };
  },
  async upsert(userId: string, data: any) {
    await setDoc(doc(db!, COLLECTIONS.profiles, userId), { ...data, updatedAt: serverTimestamp() }, { merge: true });
  },
  async getAll() {
    const snap = await getDocs(collection(db!, COLLECTIONS.profiles));
    return serializeSnapshot(snap);
  },
  async getCount() {
    const snap = await getCountFromServer(collection(db!, COLLECTIONS.profiles));
    return snap.data().count;
  },
  subscribe(callback: (items: any[]) => void) {
    const q = query(collection(db!, COLLECTIONS.profiles));
    return onSnapshot(q, async (snap) => callback(await serializeSnapshot(snap)), handleSnapshotError);
  },
  subscribeByUser(userId: string, callback: (item: any | null) => void) {
    return onSnapshot(doc(db!, COLLECTIONS.profiles, userId), (snap) => {
      if (snap.exists()) callback(serializeDoc(snap.id, snap.data()));
      else callback(null);
    }, handleSnapshotError);
  },

  // Admin profile management
  async setBadges(userId: string, badges: string[]) {
    await updateDoc(doc(db!, COLLECTIONS.profiles, userId), { badges, updatedAt: serverTimestamp() });
  },
  async addBadge(userId: string, badge: string) {
    const snap = await getDoc(doc(db!, COLLECTIONS.profiles, userId));
    if (!snap.exists()) throw new Error("Profile not found");
    const existing: string[] = snap.data().badges || [];
    if (existing.includes(badge)) return;
    await updateDoc(doc(db!, COLLECTIONS.profiles, userId), { badges: [...existing, badge], updatedAt: serverTimestamp() });
  },
  async removeBadge(userId: string, badge: string) {
    const snap = await getDoc(doc(db!, COLLECTIONS.profiles, userId));
    if (!snap.exists()) throw new Error("Profile not found");
    const existing: string[] = snap.data().badges || [];
    await updateDoc(doc(db!, COLLECTIONS.profiles, userId), { badges: existing.filter((b: string) => b !== badge), updatedAt: serverTimestamp() });
  },
  async setVerified(userId: string, verified: boolean) {
    await updateDoc(doc(db!, COLLECTIONS.profiles, userId), { verified, updatedAt: serverTimestamp() });
  },
  async setFeatured(userId: string, featured: boolean) {
    await updateDoc(doc(db!, COLLECTIONS.profiles, userId), { featured, updatedAt: serverTimestamp() });
  },
  async incrementProfileViews(userId: string) {
    await updateDoc(doc(db!, COLLECTIONS.profiles, userId), { profileViews: increment(1) });
  },
  async setPinnedProducts(userId: string, productIds: string[]) {
    await updateDoc(doc(db!, COLLECTIONS.profiles, userId), { pinnedProducts: productIds.slice(0, 6), updatedAt: serverTimestamp() });
  },
};

// ─── ANALYTICS ───

export const analyticsService = {
  async getStats() {
    const [productSnap, orderSnap, profileSnap, downloadSnap] = await Promise.all([
      getCountFromServer(collection(db!, COLLECTIONS.products)),
      getCountFromServer(collection(db!, COLLECTIONS.orders)),
      getCountFromServer(collection(db!, COLLECTIONS.profiles)),
      getCountFromServer(collection(db!, COLLECTIONS.downloads)),
    ]);
    const orders = await orderService.getAll();
    const totalRevenue = orders.filter((o: any) => o.status === "completed").reduce((sum: number, o: any) => sum + (o.total || 0), 0);
    const topProductsMap = new Map<string, { name: string; sales: number; revenue: number }>();
    orders.forEach((o: any) => {
      if (o.items) {
        o.items.forEach((item: any) => {
          const existing = topProductsMap.get(item.productId) || { name: item.title, sales: 0, revenue: 0 };
          existing.sales += 1; existing.revenue += item.price || 0;
          topProductsMap.set(item.productId, existing);
        });
      }
    });
    const topProducts = Array.from(topProductsMap.values()).sort((a, b) => b.sales - a.sales).slice(0, 5);
    return { totalProducts: productSnap.data().count, totalOrders: orderSnap.data().count, totalCustomers: profileSnap.data().count, totalDownloads: downloadSnap.data().count, totalRevenue, topProducts };
  },
  async getAdminStats() {
    const [productSnap, orderSnap, profileSnap, ticketSnap] = await Promise.all([
      getCountFromServer(collection(db!, COLLECTIONS.products)),
      getCountFromServer(collection(db!, COLLECTIONS.orders)),
      getCountFromServer(collection(db!, COLLECTIONS.profiles)),
      getCountFromServer(collection(db!, COLLECTIONS.tickets)),
    ]);
    const orders = await orderService.getAll();
    const tickets = await ticketService.getAll();
    const totalRevenue = orders.filter((o: any) => o.status === "completed").reduce((sum: number, o: any) => sum + (o.total || 0), 0);
    const openTickets = tickets.filter((t: any) => t.status === "open").length;
    const closedTickets = tickets.filter((t: any) => t.status === "closed").length;
    return { totalRevenue, totalOrders: orderSnap.data().count, totalUsers: profileSnap.data().count, totalProducts: productSnap.data().count, openTickets, closedTickets };
  },
};

// ─── PAYMENT REQUESTS ───

export const paymentRequestService = {
  async create(data: any) {
    const ref = await addDoc(collection(db!, COLLECTIONS.paymentRequests), {
      ...data,
      status: "pending",
      createdAt: serverTimestamp(),
    });
    return ref.id;
  },
  async updateStatus(id: string, status: string) {
    await updateDoc(doc(db!, COLLECTIONS.paymentRequests, id), { status, updatedAt: serverTimestamp() });
  },
  async getById(id: string) {
    const snap = await getDoc(doc(db!, COLLECTIONS.paymentRequests, id));
    if (!snap.exists()) return null;
    return serializeDoc(snap.id, snap.data());
  },
  async getAll(constraints: QueryConstraint[] = []) {
    const q = query(collection(db!, COLLECTIONS.paymentRequests), ...constraints);
    const snap = await getDocs(q);
    return serializeSnapshot(snap);
  },
  subscribe(callback: (items: any[]) => void, constraints: QueryConstraint[] = []) {
    const q = query(collection(db!, COLLECTIONS.paymentRequests), ...constraints);
    return onSnapshot(q, async (snap) => callback(await serializeSnapshot(snap)), handleSnapshotError);
  },
  async delete(id: string) {
    await deleteDoc(doc(db!, COLLECTIONS.paymentRequests, id));
  },
  subscribeById(id: string, callback: (item: any) => void) {
    return onSnapshot(doc(db!, COLLECTIONS.paymentRequests, id), (snap) => {
      if (snap.exists()) callback(serializeDoc(snap.id, snap.data()));
    }, handleSnapshotError);
  },
};

// ─── INVOICES ───

function generateInvoiceNumber(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `INV-${seg()}-${seg()}`;
}

export const invoiceService = {
  async create(data: {
    orderId: string;
    orderNumber: string;
    userId: string;
    username: string;
    email: string;
    items: any[];
    total: number;
    paymentMethod: string;
    licenseKey?: string;
    licenseExpiresAt?: string;
    durationMonths?: number;
  }) {
    const invoiceNumber = generateInvoiceNumber();
    const ref = await addDoc(collection(db!, COLLECTIONS.invoices), {
      ...data,
      invoiceNumber,
      status: "paid",
      paidAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    });
    return { id: ref.id, invoiceNumber };
  },
  async getByOrder(orderId: string) {
    const q = query(collection(db!, COLLECTIONS.invoices), where("orderId", "==", orderId), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return serializeDoc(snap.docs[0].id, snap.docs[0].data());
  },
  async getByUser(userId: string) {
    const q = query(collection(db!, COLLECTIONS.invoices), where("userId", "==", userId), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return serializeSnapshot(snap);
  },
  async getById(id: string) {
    const snap = await getDoc(doc(db!, COLLECTIONS.invoices, id));
    if (!snap.exists()) return null;
    return serializeDoc(snap.id, snap.data());
  },
  subscribe(callback: (items: any[]) => void, constraints: QueryConstraint[] = []) {
    const q = query(collection(db!, COLLECTIONS.invoices), ...constraints);
    return onSnapshot(q, async (snap) => callback(await serializeSnapshot(snap)), handleSnapshotError);
  },
};

// ─── OWNED PRODUCTS (licenses + orders composite) ───

export const ownedProductService = {
  subscribe(userId: string, callback: (productIds: Set<string>) => void) {
    const ownedIds = new Set<string>();
    let licensesReady = false;
    let ordersReady = false;

    const checkReady = () => { if (licensesReady && ordersReady) callback(ownedIds); };

    const unsubLicenses = licenseService.subscribe((items) => {
      ownedIds.clear();
      items.forEach((l: any) => {
        if (l.status === "active" && l.productId && (!l.expiresAt || new Date(l.expiresAt) > new Date())) {
          ownedIds.add(l.productId);
        }
      });
      licensesReady = true;
      checkReady();
    }, [where("userId", "==", userId)]);

    const unsubOrders = orderService.subscribe((items) => {
      items.forEach((o: any) => {
        if ((o.status === "approved" || o.status === "completed") && o.items?.[0]?.id) {
          ownedIds.add(o.items[0].id);
        }
        if ((o.status === "approved" || o.status === "completed") && o.productId) {
          ownedIds.add(o.productId);
        }
      });
      ordersReady = true;
      checkReady();
    }, [where("userId", "==", userId)]);

    return () => { unsubLicenses(); unsubOrders(); };
  },
};

// ─── PRODUCT STATS (reviews + orders for real-time counts) ───

export interface ProductStats {
  reviewCount: number;
  averageRating: number;
  salesCount: number;
}

export const productStatsService = {
  subscribe(productId: string, callback: (stats: ProductStats) => void) {
    let reviews: any[] = [];
    let orders: any[] = [];
    let reviewsReady = false;
    let ordersReady = false;
    const emit = () => {
      if (!reviewsReady || !ordersReady) return;
      const reviewCount = reviews.length;
      const averageRating = reviewCount > 0 ? reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviewCount : 0;
      const salesCount = orders.filter((o) => o.status === "approved" || o.status === "completed").length;
      callback({ reviewCount, averageRating, salesCount });
    };
    const unsubReviews = reviewService.subscribe((items) => {
      reviews = items.filter((r: any) => r.productId === productId);
      reviewsReady = true;
      emit();
    }, [where("productId", "==", productId)]);
    const unsubOrders = orderService.subscribe((items) => {
      orders = items.filter((o: any) => {
        if (o.productId === productId) return true;
        if (o.items?.some((i: any) => i.id === productId)) return true;
        return false;
      });
      ordersReady = true;
      emit();
    });
    return () => { unsubReviews(); unsubOrders(); };
  },
  subscribeAll(callback: (statsMap: Map<string, ProductStats>) => void) {
    const reviewsMap = new Map<string, any[]>();
    const ordersMap = new Map<string, any[]>();
    let reviewsReady = false;
    let ordersReady = false;
    const emit = () => {
      if (!reviewsReady || !ordersReady) return;
      const statsMap = new Map<string, ProductStats>();
      const allIds = new Set([...reviewsMap.keys(), ...ordersMap.keys()]);
      allIds.forEach((pid) => {
        const revs = reviewsMap.get(pid) || [];
        const ords = ordersMap.get(pid) || [];
        const reviewCount = revs.length;
        const averageRating = reviewCount > 0 ? revs.reduce((s, r) => s + (r.rating || 0), 0) / reviewCount : 0;
        const salesCount = ords.filter((o) => o.status === "approved" || o.status === "completed").length;
        statsMap.set(pid, { reviewCount, averageRating, salesCount });
      });
      callback(statsMap);
    };
    const unsubReviews = reviewService.subscribe((items) => {
      reviewsMap.clear();
      items.forEach((r: any) => {
        const pid = r.productId;
        if (!reviewsMap.has(pid)) reviewsMap.set(pid, []);
        reviewsMap.get(pid)!.push(r);
      });
      reviewsReady = true;
      emit();
    });
    const unsubOrders = orderService.subscribe((items) => {
      ordersMap.clear();
      items.forEach((o: any) => {
        const pids: string[] = [];
        if (o.productId) pids.push(o.productId);
        if (o.items) o.items.forEach((i: any) => { if (i.id) pids.push(i.id); });
        pids.forEach((pid) => {
          if (!ordersMap.has(pid)) ordersMap.set(pid, []);
          ordersMap.get(pid)!.push(o);
        });
      });
      ordersReady = true;
      emit();
    });
    return () => { unsubReviews(); unsubOrders(); };
  },
};

// ─── LICENSE ACTIVITY LOG ───

export const licenseActivityService = {
  async getAll(constraints: QueryConstraint[] = []) {
    const q = query(collection(db!, COLLECTIONS.licenseActivity), ...constraints);
    const snap = await getDocs(q);
    return serializeSnapshot(snap);
  },
  async getByLicense(licenseId: string) {
    const q = query(collection(db!, COLLECTIONS.licenseActivity), where("licenseId", "==", licenseId), orderBy("createdAt", "desc"), limit(50));
    const snap = await getDocs(q);
    return serializeSnapshot(snap);
  },
  async getByUser(userId: string) {
    const q = query(collection(db!, COLLECTIONS.licenseActivity), where("userId", "==", userId), orderBy("createdAt", "desc"), limit(50));
    const snap = await getDocs(q);
    return serializeSnapshot(snap);
  },
  subscribe(licenseId: string, callback: (items: any[]) => void, constraints: QueryConstraint[] = []) {
    const q = query(collection(db!, COLLECTIONS.licenseActivity), where("licenseId", "==", licenseId), orderBy("createdAt", "desc"), limit(50), ...constraints);
    return onSnapshot(q, async (snap) => callback(await serializeSnapshot(snap)), handleSnapshotError);
  },
  subscribeAll(callback: (items: any[]) => void) {
    const q = query(collection(db!, COLLECTIONS.licenseActivity), orderBy("createdAt", "desc"), limit(100));
    return onSnapshot(q, async (snap) => callback(await serializeSnapshot(snap)), handleSnapshotError);
  },
};

// ─── LICENSE BLACKLIST ───

export const licenseBlacklistService = {
  async getAll(constraints: QueryConstraint[] = []) {
    const q = query(collection(db!, COLLECTIONS.licenseBlacklist), ...constraints);
    const snap = await getDocs(q);
    return serializeSnapshot(snap);
  },
  async getByType(type: string) {
    const q = query(collection(db!, COLLECTIONS.licenseBlacklist), where("type", "==", type), where("active", "==", true));
    const snap = await getDocs(q);
    return serializeSnapshot(snap);
  },
  async create(data: { type: "placeId" | "universeId" | "userId"; value: string; reason: string }) {
    const ref = await addDoc(collection(db!, COLLECTIONS.licenseBlacklist), {
      ...data, active: true, createdAt: serverTimestamp(),
    });
    return ref.id;
  },
  async toggle(id: string, active: boolean) {
    await updateDoc(doc(db!, COLLECTIONS.licenseBlacklist, id), { active });
  },
  async delete(id: string) {
    await deleteDoc(doc(db!, COLLECTIONS.licenseBlacklist, id));
  },
  subscribe(callback: (items: any[]) => void) {
    return onSnapshot(collection(db!, COLLECTIONS.licenseBlacklist), async (snap) => callback(await serializeSnapshot(snap)), handleSnapshotError);
  },
};

// ─── ACTIVE SESSIONS (Server Browser) ───

export const activeSessionService = {
  async getAll(constraints: QueryConstraint[] = []) {
    const q = query(collection(db!, COLLECTIONS.activeSessions), ...constraints);
    const snap = await getDocs(q);
    return serializeSnapshot(snap);
  },
  async getByLicense(licenseId: string) {
    const q = query(collection(db!, COLLECTIONS.activeSessions), where("licenseId", "==", licenseId));
    const snap = await getDocs(q);
    return serializeSnapshot(snap);
  },
  async create(data: any) {
    const ref = await addDoc(collection(db!, COLLECTIONS.activeSessions), {
      ...data, startedAt: serverTimestamp(), lastHeartbeat: serverTimestamp(),
    });
    return ref.id;
  },
  async heartbeat(sessionId: string, playerCount: number, maxPlayers: number) {
    await updateDoc(doc(db!, COLLECTIONS.activeSessions, sessionId), {
      playerCount, maxPlayers, lastHeartbeat: serverTimestamp(),
    });
  },
  async end(sessionId: string) {
    await deleteDoc(doc(db!, COLLECTIONS.activeSessions, sessionId));
  },
  subscribe(callback: (items: any[]) => void) {
    const q = query(collection(db!, COLLECTIONS.activeSessions), orderBy("lastHeartbeat", "desc"));
    return onSnapshot(q, async (snap) => callback(await serializeSnapshot(snap)), handleSnapshotError);
  },
};

// ─── LICENSE VERIFICATION ───

export const licenseVerificationService = {
  async getByUser(userId: string) {
    const q = query(collection(db!, "license_verifications"), where("userId", "==", userId));
    const snap = await getDocs(q);
    return serializeSnapshot(snap);
  },
  async create(data: { userId: string; licenseId: string; productId: string }) {
    const ref = await addDoc(collection(db!, "license_verifications"), {
      ...data,
      verifiedAt: serverTimestamp(),
    });
    return ref.id;
  },
  subscribe(userId: string, callback: (items: any[]) => void) {
    const q = query(collection(db!, "license_verifications"), where("userId", "==", userId));
    return onSnapshot(q, async (snap) => callback(await serializeSnapshot(snap)), handleSnapshotError);
  },
};

// ─── PRODUCT VERSIONS ───

export const productVersionService = {
  async getByProduct(productId: string) {
    const q = query(collection(db!, COLLECTIONS.products, productId, COLLECTIONS.productVersions), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return serializeSnapshot(snap);
  },
  async create(productId: string, data: { version: string; title: string; notes: string[] }) {
    try {
      const ref = await addDoc(collection(db!, COLLECTIONS.products, productId, COLLECTIONS.productVersions), {
        ...data, createdAt: serverTimestamp(),
      });
      return ref.id;
    } catch (err: any) {
      console.error(`[productVersionService] create failed: ${err?.code || "unknown"} — ${err?.message || err}`);
      throw err;
    }
  },
  async update(productId: string, versionId: string, data: { version?: string; title?: string; notes?: string[] }) {
    try {
      await updateDoc(doc(db!, COLLECTIONS.products, productId, COLLECTIONS.productVersions, versionId), data);
    } catch (err: any) {
      console.error(`[productVersionService] update failed: ${err?.code || "unknown"} — ${err?.message || err}`);
      throw err;
    }
  },
  async delete(productId: string, versionId: string) {
    try {
      await deleteDoc(doc(db!, COLLECTIONS.products, productId, COLLECTIONS.productVersions, versionId));
    } catch (err: any) {
      console.error(`[productVersionService] delete failed: ${err?.code || "unknown"} — ${err?.message || err}`);
      throw err;
    }
  },
  subscribe(productId: string, callback: (items: any[]) => void) {
    if (!productId) { callback([]); return () => {}; }
    const q = query(collection(db!, COLLECTIONS.products, productId, COLLECTIONS.productVersions), orderBy("createdAt", "desc"));
    return onSnapshot(q, async (snap) => callback(await serializeSnapshot(snap)), handleSnapshotError);
  },
};

// ─── ACHIEVEMENTS ───

const DEFAULT_ACHIEVEMENTS = [
  { key: "first_purchase", name: "First Purchase", description: "Made your first purchase", icon: "🥇", type: "purchase", requirement: { type: "purchases", value: 1 } },
  { key: "first_review", name: "First Review", description: "Posted your first review", icon: "⭐", type: "review", requirement: { type: "reviews", value: 1 } },
  { key: "premium_customer", name: "Premium Customer", description: "Spent over $50", icon: "💎", type: "purchase", requirement: { type: "spent", value: 50 } },
  { key: "five_purchases", name: "Five Purchases", description: "Made 5 purchases", icon: "🏆", type: "purchase", requirement: { type: "purchases", value: 5 } },
  { key: "ten_purchases", name: "Ten Purchases", description: "Made 10 purchases", icon: "🔥", type: "purchase", requirement: { type: "purchases", value: 10 } },
  { key: "early_supporter", name: "Early Supporter", description: "One of the first customers", icon: "🎖", type: "special", requirement: { type: "early", value: 1 } },
  { key: "roblox_verified", name: "Roblox Verified", description: "Verified your Roblox account", icon: "🎮", type: "social", requirement: { type: "roblox", value: 1 } },
  { key: "product_collector", name: "Product Collector", description: "Own 3 different products", icon: "🚀", type: "purchase", requirement: { type: "products", value: 3 } },
];

export const achievementService = {
  async seedDefaults() {
    const existing = await achievementService.getAll();
    if (existing.length > 0) return;
    for (const a of DEFAULT_ACHIEVEMENTS) {
      await addDoc(collection(db!, COLLECTIONS.achievements), { ...a, createdAt: serverTimestamp() });
    }
  },
  async getAll() {
    const snap = await getDocs(collection(db!, COLLECTIONS.achievements));
    return serializeSnapshot(snap);
  },
  subscribe(callback: (items: any[]) => void) {
    return onSnapshot(collection(db!, COLLECTIONS.achievements), async (snap) => callback(await serializeSnapshot(snap)), handleSnapshotError);
  },
  async create(data: any) {
    const ref = await addDoc(collection(db!, COLLECTIONS.achievements), { ...data, createdAt: serverTimestamp() });
    return ref.id;
  },
  async update(id: string, data: any) {
    await updateDoc(doc(db!, COLLECTIONS.achievements, id), data);
  },
  async delete(id: string) {
    await deleteDoc(doc(db!, COLLECTIONS.achievements, id));
  },
};

export const userAchievementService = {
  async getUserAchievements(userId: string) {
    const q = query(collection(db!, COLLECTIONS.userAchievements), where("userId", "==", userId), orderBy("unlockedAt", "desc"));
    const snap = await getDocs(q);
    return serializeSnapshot(snap);
  },
  subscribe(userId: string, callback: (items: any[]) => void) {
    const q = query(collection(db!, COLLECTIONS.userAchievements), where("userId", "==", userId), orderBy("unlockedAt", "desc"));
    return onSnapshot(q, async (snap) => callback(await serializeSnapshot(snap)), handleSnapshotError);
  },
  async unlock(userId: string, achievementKey: string) {
    const q = query(collection(db!, COLLECTIONS.userAchievements), where("userId", "==", userId), where("achievementKey", "==", achievementKey), limit(1));
    const existing = await getDocs(q);
    if (!existing.empty) return false;
    const achievements = await achievementService.getAll();
    const achievement = achievements.find((a: any) => a.key === achievementKey);
    if (!achievement) return false;
    await addDoc(collection(db!, COLLECTIONS.userAchievements), {
      userId,
      achievementKey: achievement.key,
      achievementName: achievement.name,
      achievementDescription: achievement.description,
      achievementIcon: achievement.icon,
      unlockedAt: serverTimestamp(),
    });
    await notificationService.create({
      userId,
      title: "Achievement Unlocked!",
      message: `You unlocked the "${achievement.name}" achievement!`,
      type: "announcement",
      link: "/dashboard/achievements",
    });
    await activityService.log(userId, {
      type: "achievement",
      description: `Unlocked achievement: ${achievement.name}`,
      metadata: { achievementKey: achievement.key },
    });
    return true;
  },
  async checkAndUnlock(userId: string, purchases: number, spent: number, products: number, reviewsCount: number, robloxVerified: boolean) {
    const achievements = await achievementService.getAll();
    const userAchievements = await userAchievementService.getUserAchievements(userId);
    const unlockedKeys = new Set(userAchievements.map((ua: any) => ua.achievementKey));
    for (const a of achievements) {
      if (unlockedKeys.has(a.key)) continue;
      let shouldUnlock = false;
      switch (a.key) {
        case "first_purchase": shouldUnlock = purchases >= 1; break;
        case "five_purchases": shouldUnlock = purchases >= 5; break;
        case "ten_purchases": shouldUnlock = purchases >= 10; break;
        case "product_collector": shouldUnlock = products >= 3; break;
        case "premium_customer": shouldUnlock = spent >= 50; break;
        case "first_review": shouldUnlock = reviewsCount >= 1; break;
        case "roblox_verified": shouldUnlock = robloxVerified; break;
        case "early_supporter": shouldUnlock = purchases >= 1; break;
      }
      if (shouldUnlock) {
        await userAchievementService.unlock(userId, a.key);
      }
    }
  },
  async checkAfterPurchase(userId: string) {
    const userOrders = await orderService.getByUser(userId);
    const purchases = userOrders.filter((o: any) => o.status === "completed" || o.status === "pending_payment").length;
    const spent = userOrders.reduce((sum: number, o: any) => sum + (o.total || 0), 0);
    const products = new Set(userOrders.flatMap((o: any) => o.items?.map((i: any) => i.id || i.productId) || [])).size;
    const profileDoc = await getDoc(doc(db!, COLLECTIONS.profiles, userId));
    const robloxVerified = profileDoc.data()?.robloxVerified || false;
    const reviewsSnap = await getDocs(query(collection(db!, COLLECTIONS.reviews), where("userId", "==", userId)));
    const reviewsCount = reviewsSnap.size;
    await userAchievementService.checkAndUnlock(userId, purchases, spent, products, reviewsCount, robloxVerified);
  },
  async checkAfterReview(userId: string) {
    const reviewsSnap = await getDocs(query(collection(db!, COLLECTIONS.reviews), where("userId", "==", userId)));
    const reviewsCount = reviewsSnap.size;
    const userOrders = await orderService.getByUser(userId);
    const purchases = userOrders.filter((o: any) => o.status === "completed" || o.status === "pending_payment").length;
    const spent = userOrders.reduce((sum: number, o: any) => sum + (o.total || 0), 0);
    const products = new Set(userOrders.flatMap((o: any) => o.items?.map((i: any) => i.id || i.productId) || [])).size;
    const profileDoc = await getDoc(doc(db!, COLLECTIONS.profiles, userId));
    const robloxVerified = profileDoc.data()?.robloxVerified || false;
    await userAchievementService.checkAndUnlock(userId, purchases, spent, products, reviewsCount, robloxVerified);
  },
};

// ─── COUPONS ───

export const couponService = {
  async getAll() {
    const q = query(collection(db!, COLLECTIONS.coupons), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return serializeSnapshot(snap);
  },
  subscribe(callback: (items: any[]) => void) {
    const q = query(collection(db!, COLLECTIONS.coupons), orderBy("createdAt", "desc"));
    return onSnapshot(q, async (snap) => callback(await serializeSnapshot(snap)), handleSnapshotError);
  },
  async getByCode(code: string) {
    const q = query(collection(db!, COLLECTIONS.coupons), where("code", "==", code.toUpperCase()), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return serializeDoc(snap.docs[0].id, snap.docs[0].data());
  },
  async getById(id: string) {
    const snap = await getDoc(doc(db!, COLLECTIONS.coupons, id));
    if (!snap.exists()) return null;
    return serializeDoc(snap.id, snap.data());
  },
  async validate(code: string, total?: number): Promise<{ valid: boolean; error?: string; coupon?: any; discount?: number }> {
    const coupon = await couponService.getByCode(code);
    if (!coupon) return { valid: false, error: "Invalid coupon code" };
    if (!coupon.active) return { valid: false, error: "This coupon is no longer active" };
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) return { valid: false, error: "This coupon has expired" };
    if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) return { valid: false, error: "This coupon has reached its usage limit" };
    if (coupon.minPurchase && total && total < coupon.minPurchase) return { valid: false, error: `Minimum purchase of $${coupon.minPurchase} required` };
    let discount = 0;
    if (coupon.type === "percentage") discount = (total || 0) * (coupon.value / 100);
    else discount = coupon.value;
    if (discount > (total || 0)) discount = total || 0;
    return { valid: true, coupon, discount };
  },
  async create(data: any) {
    const ref = await addDoc(collection(db!, COLLECTIONS.coupons), {
      ...data,
      code: data.code.toUpperCase(),
      usedCount: 0,
      active: true,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  },
  async update(id: string, data: any) {
    if (data.code) data.code = data.code.toUpperCase();
    await updateDoc(doc(db!, COLLECTIONS.coupons, id), data);
  },
  async incrementUsed(id: string) {
    await updateDoc(doc(db!, COLLECTIONS.coupons, id), { usedCount: increment(1) });
  },
  async delete(id: string) {
    await deleteDoc(doc(db!, COLLECTIONS.coupons, id));
  },
};

// ─── ACTIVITIES ───

export const activityService = {
  async getByUser(userId: string) {
    const q = query(collection(db!, COLLECTIONS.activities), where("userId", "==", userId), orderBy("createdAt", "desc"), limit(20));
    const snap = await getDocs(q);
    return serializeSnapshot(snap);
  },
  subscribe(userId: string, callback: (items: any[]) => void) {
    const q = query(collection(db!, COLLECTIONS.activities), where("userId", "==", userId), orderBy("createdAt", "desc"), limit(20));
    return onSnapshot(q, async (snap) => callback(await serializeSnapshot(snap)), handleSnapshotError);
  },
  async log(userId: string, data: { type: string; description: string; metadata?: Record<string, any> }) {
    await addDoc(collection(db!, COLLECTIONS.activities), {
      ...data, userId, createdAt: serverTimestamp(),
    });
  },
};

// ─── STORAGE (Supabase) ───

import { supabase } from "./supabase";

function formatStorageError(error: any): string {
  const code = error?.statusCode || error?.status || "unknown";
  const name = error?.name || "StorageError";
  const message = error?.message || "An unknown storage error occurred";
  return `Supabase ${code} (${name}): ${message}`;
}

function requireSupabase() {
  if (!supabase) throw new Error("Supabase client not initialized — check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return supabase;
}

export const storageService = {
  async uploadFile(path: string, file: File, bucket: string = "receipts", userId?: string) {
    const client = requireSupabase();
    const { data, error } = await client.storage
      .from(bucket)
      .upload(path, file, { upsert: true });
    if (error) {
      console.error("Supabase upload error:", error);
      throw new Error(formatStorageError(error));
    }
    const { data: urlData } = client.storage
      .from(bucket)
      .getPublicUrl(path);
    return urlData.publicUrl;
  },
  async deleteFile(path: string, bucket: string = "receipts") {
    const client = requireSupabase();
    const { error } = await client.storage
      .from(bucket)
      .remove([path]);
    if (error) {
      console.error("Supabase delete error:", error);
      throw new Error(formatStorageError(error));
    }
  },
  async listFiles(prefix: string, bucket: string = "products") {
    const client = requireSupabase();
    const { data, error } = await client.storage
      .from(bucket)
      .list(prefix);
    if (error) throw new Error(formatStorageError(error));
    return data || [];
  },
  async uploadAvatar(userId: string, file: File): Promise<string> {
    const ext = file.name.split(".").pop() || "png";
    const path = `avatars/${userId}/${Date.now()}.${ext}`;
    const url = await storageService.uploadFile(path, file, "avatars", userId);
    return url;
  },
  async deleteAvatar(path: string) {
    await storageService.deleteFile(path, "avatars");
  },

  // ── Product-specific upload methods ──

  async uploadProductThumbnail(productId: string, file: File, userId?: string): Promise<string> {
    const ext = file.name.split(".").pop() || "png";
    const path = `thumbnails/${productId}/${Date.now()}.${ext}`;
    return storageService.uploadFile(path, file, "products", userId);
  },

  async uploadProductGallery(productId: string, file: File, userId?: string): Promise<string> {
    const ext = file.name.split(".").pop() || "png";
    const path = `gallery/${productId}/${Date.now()}.${ext}`;
    return storageService.uploadFile(path, file, "products", userId);
  },

  async uploadProductDownload(productId: string, file: File, userId?: string): Promise<string> {
    const path = `downloads/${productId}/${file.name}`;
    return storageService.uploadFile(path, file, "products", userId);
  },

  async deleteProductFiles(productId: string) {
    const prefixes = [
      `thumbnails/${productId}/`,
      `gallery/${productId}/`,
      `downloads/${productId}/`,
    ];
    for (const prefix of prefixes) {
      const files = await storageService.listFiles(prefix);
      if (files.length > 0) {
        const paths = files.map((f: any) => `${prefix}${f.name}`);
        await requireSupabase().storage.from("products").remove(paths);
      }
    }
  },
};

// ─── CMS SERVICES ───

function cmsCollection(name: string) {
  return collection(db!, name);
}

function cmsDoc(name: string, id: string) {
  return doc(db!, name, id);
}

export const portfolioService = {
  async getAll() {
    const q = query(cmsCollection(COLLECTIONS.portfolio), orderBy("sortOrder", "asc"));
    const snap = await getDocs(q);
    return serializeSnapshot(snap);
  },
  subscribe(callback: (items: any[]) => void) {
    const q = query(cmsCollection(COLLECTIONS.portfolio), orderBy("sortOrder", "asc"));
    return onSnapshot(q, async (snap) => callback(await serializeSnapshot(snap)), handleSnapshotError);
  },
  async getById(id: string) {
    const snap = await getDoc(cmsDoc(COLLECTIONS.portfolio, id));
    return snap.exists() ? serializeDoc(snap.id, snap.data()) : null;
  },
  async create(data: any) {
    const ref = await addDoc(cmsCollection(COLLECTIONS.portfolio), { ...data, createdAt: serverTimestamp() });
    return ref.id;
  },
  async update(id: string, data: any) {
    await updateDoc(cmsDoc(COLLECTIONS.portfolio, id), data);
  },
  async remove(id: string) {
    await deleteDoc(cmsDoc(COLLECTIONS.portfolio, id));
  },
};

export const statisticsService = {
  subscribe(callback: (items: any[]) => void) {
    const q = query(cmsCollection(COLLECTIONS.statistics), orderBy("sortOrder", "asc"));
    return onSnapshot(q, async (snap) => callback(await serializeSnapshot(snap)), handleSnapshotError);
  },
  async getAll() {
    const q = query(cmsCollection(COLLECTIONS.statistics), orderBy("sortOrder", "asc"));
    const snap = await getDocs(q);
    return serializeSnapshot(snap);
  },
  async update(id: string, data: any) {
    await updateDoc(cmsDoc(COLLECTIONS.statistics, id), data);
  },
  async create(data: any) {
    const ref = await addDoc(cmsCollection(COLLECTIONS.statistics), data);
    return ref.id;
  },
  async remove(id: string) {
    await deleteDoc(cmsDoc(COLLECTIONS.statistics, id));
  },
};

export const servicesService = {
  subscribe(callback: (items: any[]) => void) {
    const q = query(cmsCollection(COLLECTIONS.services), orderBy("displayOrder", "asc"));
    return onSnapshot(q, async (snap) => callback(await serializeSnapshot(snap)), handleSnapshotError);
  },
  async getAll() {
    const q = query(cmsCollection(COLLECTIONS.services), orderBy("displayOrder", "asc"));
    const snap = await getDocs(q);
    return serializeSnapshot(snap);
  },
  async create(data: any) {
    const ref = await addDoc(cmsCollection(COLLECTIONS.services), { ...data, createdAt: serverTimestamp() });
    return ref.id;
  },
  async update(id: string, data: any) {
    await updateDoc(cmsDoc(COLLECTIONS.services, id), data);
  },
  async remove(id: string) {
    await deleteDoc(cmsDoc(COLLECTIONS.services, id));
  },
};

export const testimonialService = {
  subscribe(callback: (items: any[]) => void) {
    const q = query(cmsCollection(COLLECTIONS.testimonials), orderBy("createdAt", "desc"));
    return onSnapshot(q, async (snap) => callback(await serializeSnapshot(snap)), handleSnapshotError);
  },
  async getAll() {
    const q = query(cmsCollection(COLLECTIONS.testimonials), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return serializeSnapshot(snap);
  },
  async create(data: any) {
    const ref = await addDoc(cmsCollection(COLLECTIONS.testimonials), { ...data, createdAt: serverTimestamp() });
    return ref.id;
  },
  async update(id: string, data: any) {
    await updateDoc(cmsDoc(COLLECTIONS.testimonials, id), data);
  },
  async remove(id: string) {
    await deleteDoc(cmsDoc(COLLECTIONS.testimonials, id));
  },
};

export const faqService = {
  subscribe(callback: (items: any[]) => void) {
    const q = query(cmsCollection(COLLECTIONS.faqs), orderBy("sortOrder", "asc"));
    return onSnapshot(q, async (snap) => callback(await serializeSnapshot(snap)), handleSnapshotError);
  },
  async getAll() {
    const q = query(cmsCollection(COLLECTIONS.faqs), orderBy("sortOrder", "asc"));
    const snap = await getDocs(q);
    return serializeSnapshot(snap);
  },
  async create(data: any) {
    const ref = await addDoc(cmsCollection(COLLECTIONS.faqs), { ...data, createdAt: serverTimestamp() });
    return ref.id;
  },
  async update(id: string, data: any) {
    await updateDoc(cmsDoc(COLLECTIONS.faqs, id), data);
  },
  async remove(id: string) {
    await deleteDoc(cmsDoc(COLLECTIONS.faqs, id));
  },
};

export const announcementService = {
  subscribe(callback: (items: any[]) => void) {
    const q = query(cmsCollection(COLLECTIONS.announcements), orderBy("createdAt", "desc"));
    return onSnapshot(q, async (snap) => callback(await serializeSnapshot(snap)), handleSnapshotError);
  },
  async getAll() {
    const q = query(cmsCollection(COLLECTIONS.announcements), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return serializeSnapshot(snap);
  },
  async create(data: any) {
    const ref = await addDoc(cmsCollection(COLLECTIONS.announcements), { ...data, createdAt: serverTimestamp() });
    return ref.id;
  },
  async update(id: string, data: any) {
    await updateDoc(cmsDoc(COLLECTIONS.announcements, id), data);
  },
  async remove(id: string) {
    await deleteDoc(cmsDoc(COLLECTIONS.announcements, id));
  },
};

export const siteSettingsService = {
  subscribe(callback: (item: any) => void) {
    const q = query(cmsCollection(COLLECTIONS.siteSettings), limit(1));
    return onSnapshot(q, async (snap) => {
      const items = await serializeSnapshot(snap);
      callback(items[0] || null);
    }, handleSnapshotError);
  },
  async get() {
    const q = query(cmsCollection(COLLECTIONS.siteSettings), limit(1));
    const snap = await getDocs(q);
    const items = await serializeSnapshot(snap);
    return items[0] || null;
  },
  async set(data: any) {
    const q = query(cmsCollection(COLLECTIONS.siteSettings), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) {
      await addDoc(cmsCollection(COLLECTIONS.siteSettings), data);
    } else {
      await updateDoc(cmsDoc(COLLECTIONS.siteSettings, snap.docs[0].id), data);
    }
  },
};

export const homepageService = {
  subscribe(callback: (item: any) => void) {
    const q = query(cmsCollection(COLLECTIONS.homepage), limit(1));
    return onSnapshot(q, async (snap) => {
      const items = await serializeSnapshot(snap);
      callback(items[0] || null);
    }, handleSnapshotError);
  },
  async get() {
    const q = query(cmsCollection(COLLECTIONS.homepage), limit(1));
    const snap = await getDocs(q);
    const items = await serializeSnapshot(snap);
    return items[0] || null;
  },
  async set(data: any) {
    const q = query(cmsCollection(COLLECTIONS.homepage), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) {
      await addDoc(cmsCollection(COLLECTIONS.homepage), data);
    } else {
      await updateDoc(cmsDoc(COLLECTIONS.homepage, snap.docs[0].id), data);
    }
  },
};

// ─── INCIDENTS (Status Page) ───

export const incidentService = {
  async getAll(constraints: QueryConstraint[] = []) {
    const q = query(collection(db!, COLLECTIONS.incidents), ...constraints);
    const snap = await getDocs(q);
    return serializeSnapshot(snap);
  },
  async getBySlug(slug: string) {
    const q = query(collection(db!, COLLECTIONS.incidents), where("slug", "==", slug), limit(1));
    const snap = await getDocs(q);
    const items = await serializeSnapshot(snap);
    return items[0] || null;
  },
  async getById(id: string) {
    const snap = await getDoc(doc(db!, COLLECTIONS.incidents, id));
    if (!snap.exists()) return null;
    return serializeDoc(snap.id, snap.data());
  },
  async create(data: any) {
    const ref = await addDoc(collection(db!, COLLECTIONS.incidents), {
      ...data,
      timeline: data.timeline || [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  },
  async update(id: string, data: any) {
    await updateDoc(doc(db!, COLLECTIONS.incidents, id), { ...data, updatedAt: serverTimestamp() });
  },
  async delete(id: string) {
    await deleteDoc(doc(db!, COLLECTIONS.incidents, id));
  },
  subscribe(callback: (items: any[]) => void, constraints: QueryConstraint[] = []) {
    const q = query(collection(db!, COLLECTIONS.incidents), ...constraints);
    return onSnapshot(q, async (snap) => callback(await serializeSnapshot(snap)), handleSnapshotError);
  },
};

// ─── LEGAL PAGES ───

export const legalService = {
  subscribe(type: string, callback: (item: any) => void) {
    const q = query(cmsCollection(COLLECTIONS.legal), where("type", "==", type), limit(1));
    return onSnapshot(q, async (snap) => {
      const items = await serializeSnapshot(snap);
      callback(items[0] || null);
    }, handleSnapshotError);
  },
  async get(type: string) {
    const q = query(cmsCollection(COLLECTIONS.legal), where("type", "==", type), limit(1));
    const snap = await getDocs(q);
    const items = await serializeSnapshot(snap);
    return items[0] || null;
  },
  async set(type: string, data: any) {
    const q = query(cmsCollection(COLLECTIONS.legal), where("type", "==", type), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) {
      await addDoc(cmsCollection(COLLECTIONS.legal), { ...data, type, createdAt: serverTimestamp() });
    } else {
      await updateDoc(cmsDoc(COLLECTIONS.legal, snap.docs[0].id), { ...data, updatedAt: serverTimestamp() });
    }
  },
};

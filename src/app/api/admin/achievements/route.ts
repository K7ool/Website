import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";

async function verifyAdmin(req: NextRequest): Promise<{ uid: string } | NextResponse> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }) as any;
  }
  try {
    const decoded = await adminAuth.verifyIdToken(authHeader.split("Bearer ")[1]);
    const profileSnap = await adminDb.collection("profiles").doc(decoded.uid).get();
    const profile = profileSnap.data();
    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 }) as any;
    }
    return { uid: decoded.uid };
  } catch (err: any) {
    console.error("[AUTH] verifyAdmin failed:", err?.code, err?.message);
    return NextResponse.json({ success: false, error: err?.message || "Authentication failed" }, { status: 401 }) as any;
  }
}

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

// POST /api/admin/achievements — Create achievement (seed defaults if empty)
export async function POST(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    // Check if defaults need seeding
    const existing = await adminDb.collection("achievements").get();
    if (existing.empty) {
      const batch = adminDb.batch();
      for (const a of DEFAULT_ACHIEVEMENTS) {
        const ref = adminDb.collection("achievements").doc();
        batch.set(ref, { ...a, createdAt: new Date().toISOString() });
      }
      await batch.commit();
      console.log(`[ADMIN ACHIEVEMENTS] Seeded ${DEFAULT_ACHIEVEMENTS.length} default achievements`);
      return NextResponse.json({ success: true, seeded: true, count: DEFAULT_ACHIEVEMENTS.length });
    }

    const body = await req.json();
    const { key, name, description, icon, type, requirement } = body;

    if (!key || !name) {
      return NextResponse.json({ success: false, error: "Missing achievement key or name" }, { status: 400 });
    }

    const ref = await adminDb.collection("achievements").add({
      key: key.toLowerCase().replace(/\s+/g, "_"),
      name,
      description: description || "",
      icon: icon || "🏆",
      type: type || "purchase",
      requirement: requirement || { type: "purchases", value: 1 },
      createdAt: new Date().toISOString(),
    });

    console.log(`[ADMIN ACHIEVEMENTS] Created achievement ${key}, docId: ${ref.id}`);
    return NextResponse.json({ success: true, id: ref.id });
  } catch (err: any) {
    console.error("[ADMIN ACHIEVEMENTS] Create error:", err);
    return NextResponse.json({ success: false, error: err.message || "Server error" }, { status: 500 });
  }
}

// PUT /api/admin/achievements — Update an achievement
export async function PUT(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { id, key, name, description, icon, type, requirement } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing achievement id" }, { status: 400 });
    }

    const updateData: any = {};
    if (key !== undefined) updateData.key = key.toLowerCase().replace(/\s+/g, "_");
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (icon !== undefined) updateData.icon = icon;
    if (type !== undefined) updateData.type = type;
    if (requirement !== undefined) updateData.requirement = requirement;

    await adminDb.collection("achievements").doc(id).update(updateData);

    console.log(`[ADMIN ACHIEVEMENTS] Updated achievement ${id}`);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[ADMIN ACHIEVEMENTS] Update error:", err);
    return NextResponse.json({ success: false, error: err.message || "Server error" }, { status: 500 });
  }
}

// DELETE /api/admin/achievements — Delete an achievement
export async function DELETE(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing achievement id" }, { status: 400 });
    }

    await adminDb.collection("achievements").doc(id).delete();

    console.log(`[ADMIN ACHIEVEMENTS] Deleted achievement ${id}`);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[ADMIN ACHIEVEMENTS] Delete error:", err);
    return NextResponse.json({ success: false, error: err.message || "Server error" }, { status: 500 });
  }
}

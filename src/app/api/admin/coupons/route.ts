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

// POST /api/admin/coupons — Create a coupon
export async function POST(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { code, type, value, maxUses, minPurchase, applicableProducts, expiresAt } = body;

    if (!code) {
      return NextResponse.json({ success: false, error: "Missing coupon code" }, { status: 400 });
    }

    const ref = await adminDb.collection("coupons").add({
      code: code.toUpperCase(),
      type: type || "percentage",
      value: Number(value) || 0,
      maxUses: Number(maxUses) || 0,
      minPurchase: Number(minPurchase) || 0,
      applicableProducts: applicableProducts || [],
      expiresAt: expiresAt || "",
      usedCount: 0,
      active: true,
      createdAt: new Date().toISOString(),
    });

    console.log(`[ADMIN COUPONS] Created coupon ${code}, docId: ${ref.id}`);
    return NextResponse.json({ success: true, id: ref.id });
  } catch (err: any) {
    console.error("[ADMIN COUPONS] Create error:", err);
    return NextResponse.json({ success: false, error: err.message || "Server error" }, { status: 500 });
  }
}

// PUT /api/admin/coupons — Update a coupon
export async function PUT(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { id, code, type, value, maxUses, minPurchase, applicableProducts, expiresAt, active } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing coupon id" }, { status: 400 });
    }

    const updateData: any = {};
    if (code !== undefined) updateData.code = code.toUpperCase();
    if (type !== undefined) updateData.type = type;
    if (value !== undefined) updateData.value = Number(value);
    if (maxUses !== undefined) updateData.maxUses = Number(maxUses);
    if (minPurchase !== undefined) updateData.minPurchase = Number(minPurchase);
    if (applicableProducts !== undefined) updateData.applicableProducts = applicableProducts;
    if (expiresAt !== undefined) updateData.expiresAt = expiresAt;
    if (active !== undefined) updateData.active = active;

    await adminDb.collection("coupons").doc(id).update(updateData);

    console.log(`[ADMIN COUPONS] Updated coupon ${id}`);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[ADMIN COUPONS] Update error:", err);
    return NextResponse.json({ success: false, error: err.message || "Server error" }, { status: 500 });
  }
}

// DELETE /api/admin/coupons — Delete a coupon
export async function DELETE(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing coupon id" }, { status: 400 });
    }

    await adminDb.collection("coupons").doc(id).delete();

    console.log(`[ADMIN COUPONS] Deleted coupon ${id}`);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[ADMIN COUPONS] Delete error:", err);
    return NextResponse.json({ success: false, error: err.message || "Server error" }, { status: 500 });
  }
}

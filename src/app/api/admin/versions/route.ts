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

// ─── POST /api/admin/versions — Create a new version ───
export async function POST(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { productId, version, title, notes } = body;

    if (!productId || !version) {
      return NextResponse.json({ success: false, error: "Missing productId or version" }, { status: 400 });
    }

    // Create version document
    const ref = await adminDb.collection("products").doc(productId).collection("productVersions").add({
      version,
      title: title || "",
      notes: notes || [],
      createdAt: new Date().toISOString(),
    });

    // Update product's latest version
    await adminDb.collection("products").doc(productId).update({
      version,
      updatedAt: new Date().toISOString(),
    });

    console.log(`[ADMIN VERSIONS] Created version ${version} for product ${productId}, docId: ${ref.id}`);

    return NextResponse.json({ success: true, id: ref.id });
  } catch (err: any) {
    console.error("[ADMIN VERSIONS] Create error:", err);
    return NextResponse.json({ success: false, error: err.message || "Server error" }, { status: 500 });
  }
}

// ─── PUT /api/admin/versions — Update an existing version ───
export async function PUT(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { productId, versionId, version, title, notes } = body;

    if (!productId || !versionId) {
      return NextResponse.json({ success: false, error: "Missing productId or versionId" }, { status: 400 });
    }

    const updateData: any = {};
    if (version !== undefined) updateData.version = version;
    if (title !== undefined) updateData.title = title;
    if (notes !== undefined) updateData.notes = notes;
    updateData.updatedAt = new Date().toISOString();

    await adminDb.collection("products").doc(productId).collection("productVersions").doc(versionId).update(updateData);

    console.log(`[ADMIN VERSIONS] Updated version ${versionId} for product ${productId}`);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[ADMIN VERSIONS] Update error:", err);
    return NextResponse.json({ success: false, error: err.message || "Server error" }, { status: 500 });
  }
}

// ─── DELETE /api/admin/versions — Delete a version ───
export async function DELETE(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");
    const versionId = searchParams.get("versionId");

    if (!productId || !versionId) {
      return NextResponse.json({ success: false, error: "Missing productId or versionId" }, { status: 400 });
    }

    await adminDb.collection("products").doc(productId).collection("productVersions").doc(versionId).delete();

    console.log(`[ADMIN VERSIONS] Deleted version ${versionId} for product ${productId}`);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[ADMIN VERSIONS] Delete error:", err);
    return NextResponse.json({ success: false, error: err.message || "Server error" }, { status: 500 });
  }
}

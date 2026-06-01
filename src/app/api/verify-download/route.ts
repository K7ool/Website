import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { checkLegalAcceptanceServer } from "@/lib/legal";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { licenseId, productId } = await req.json();
    if (!licenseId || !productId) {
      return NextResponse.json({ error: "Missing licenseId or productId" }, { status: 400 });
    }

    const idToken = authHeader.split("Bearer ")[1];
    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(idToken);
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const userId = decoded.uid;

    // Check legal acceptance
    const profileSnap = await adminDb.collection("profiles").doc(userId).get();
    const profileData = profileSnap.data();
    const profile = profileData ? { acceptedTermsVersion: profileData.acceptedTermsVersion, acceptedPrivacyVersion: profileData.acceptedPrivacyVersion, acceptedRefundVersion: profileData.acceptedRefundVersion } : null;
    if (!checkLegalAcceptanceServer(profile)) {
      return NextResponse.json({ error: "Legal documents must be accepted before downloading. Please accept the Terms of Service, Privacy Policy, and Refund Policy." }, { status: 403 });
    }
    const licSnap = await adminDb.collection("licenses").doc(licenseId).get();
    if (!licSnap.exists) {
      return NextResponse.json({ error: "License not found" }, { status: 404 });
    }

    const lic = licSnap.data()!;
    if (lic.userId !== userId) {
      return NextResponse.json({ error: "License does not belong to you" }, { status: 403 });
    }
    if (lic.productId !== productId) {
      return NextResponse.json({ error: "Product mismatch" }, { status: 403 });
    }
    if (lic.status !== "active") {
      return NextResponse.json({ error: "License is not active" }, { status: 403 });
    }
    if (lic.expiresAt && new Date(lic.expiresAt) < new Date()) {
      return NextResponse.json({ error: "License has expired" }, { status: 403 });
    }

    const maxDownloads = lic.maxDownloads || 0;
    const downloadCount = lic.downloadCount || 0;
    if (maxDownloads > 0 && downloadCount >= maxDownloads) {
      return NextResponse.json({ error: "Download limit reached" }, { status: 403 });
    }

    const downloadFile = lic.downloadFile || "";
    if (!downloadFile || downloadFile === "#") {
      return NextResponse.json({ error: "Download file not available" }, { status: 404 });
    }

    return NextResponse.json({ downloadUrl: downloadFile, licenseId: licSnap.id });
  } catch (err: any) {
    console.error("verify-download error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

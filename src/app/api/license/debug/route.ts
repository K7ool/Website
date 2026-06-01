import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET() {
  const results: Record<string, unknown> = {
    success: true,
    timestamp: Date.now(),
    environment: {
      nodeEnv: process.env.NODE_ENV || "not set",
      hasServiceAccount: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
      serviceAccountLength: process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.length || 0,
    },
  };

  try {
    const licSnap = await adminDb.collection("licenses").limit(1).get();
    results.licenseCollectionExists = true;
    results.licenseCount = licSnap.size;
  } catch (err: any) {
    results.licenseCollectionExists = false;
    results.licenseError = err.message;
  }

  try {
    const prodSnap = await adminDb.collection("products").limit(1).get();
    results.productsCollectionExists = true;
    results.productsCount = prodSnap.size;
  } catch (err: any) {
    results.productsCollectionExists = false;
    results.productsError = err.message;
  }

  results.firestoreConnected = results.licenseCollectionExists === true || results.productsCollectionExists === true;

  return NextResponse.json(results);
}

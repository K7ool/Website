import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { sanitizeUsername, validateUsernameFormat } from "@/lib/firestore";

export async function POST(req: NextRequest) {
  try {
    const { username, userId } = await req.json();
    if (!username || typeof username !== "string") {
      return NextResponse.json({ available: false, error: "Username is required." }, { status: 400 });
    }

    const formatError = validateUsernameFormat(username);
    if (formatError) {
      return NextResponse.json({ available: false, error: formatError }, { status: 400 });
    }

    const sanitized = sanitizeUsername(username);

    const snap = await adminDb.collection("profiles").where("username", "==", sanitized).limit(1).get();

    if (snap.empty) {
      return NextResponse.json({ available: true });
    }

    if (userId && snap.docs[0].id === userId) {
      return NextResponse.json({ available: true, isCurrentUser: true });
    }

    return NextResponse.json({ available: false });
  } catch (err: any) {
    return NextResponse.json({ available: false, error: err.message }, { status: 500 });
  }
}

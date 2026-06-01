import * as admin from "firebase-admin";

let _app: admin.app.App | null = null;
let _db: admin.firestore.Firestore | null = null;
let _auth: admin.auth.Auth | null = null;
let _initError: Error | null = null;

function getServiceAccount(): admin.ServiceAccount {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!raw) {
    console.error("[FIREBASE_ADMIN] Missing credentials — FIREBASE_SERVICE_ACCOUNT_KEY is not set");
    throw new Error("Firebase Admin SDK not configured — FIREBASE_SERVICE_ACCOUNT_KEY environment variable is missing");
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error("[FIREBASE_ADMIN] Invalid JSON service account — FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON");
    throw new Error("Firebase Admin SDK not configured — Invalid FIREBASE_SERVICE_ACCOUNT_KEY");
  }

  if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
    console.error("[FIREBASE_ADMIN] Invalid JSON service account — missing required fields (project_id, client_email, private_key)");
    throw new Error("Firebase Admin SDK not configured — Invalid FIREBASE_SERVICE_ACCOUNT_KEY");
  }

  return {
    projectId: parsed.project_id as string,
    clientEmail: parsed.client_email as string,
    privateKey: (parsed.private_key as string).replace(/\\n/g, "\n"),
  };
}

async function verifyConnectivity(db: admin.firestore.Firestore): Promise<void> {
  try {
    const testRef = db.collection("_firebase_admin_test").doc("_ping");
    await testRef.set({ _ts: Date.now(), _pid: process.pid }, { merge: true });
    await testRef.delete();
    console.log("[FIREBASE_ADMIN] Firestore connection OK");
  } catch (err: any) {
    console.error("[FIREBASE_ADMIN] Firestore connection FAILED —", err?.message || err);
  }
}

function ensure() {
  if (_app) return;
  if (_initError) throw _initError;

  if (admin.apps.length > 0) {
    _app = admin.apps[0]!;
    _db = _app.firestore();
    _auth = _app.auth();
    console.log("[FIREBASE_ADMIN] Reusing existing Firebase Admin app");
    verifyConnectivity(_db);
    return;
  }

  console.log("[FIREBASE_ADMIN] Initializing...");

  try {
    const serviceAccount = getServiceAccount();
    _app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.projectId,
    });
    _db = _app.firestore();
    _auth = _app.auth();
    console.log("[FIREBASE_ADMIN] Initialized successfully");
    verifyConnectivity(_db);
  } catch (err: any) {
    _initError = err;
    console.error("[FIREBASE_ADMIN] Initialization failed —", err?.message || err);
    throw err;
  }
}

export function getAdminDb(): admin.firestore.Firestore {
  ensure();
  return _db!;
}

export function getAdminAuth(): admin.auth.Auth {
  ensure();
  return _auth!;
}

export const adminDb: admin.firestore.Firestore = new Proxy({} as any, {
  get(_, p) {
    const real = getAdminDb();
    const v = (real as any)[p];
    return typeof v === "function" ? v.bind(real) : v;
  },
});

export const adminAuth: admin.auth.Auth = new Proxy({} as any, {
  get(_, p) {
    const real = getAdminAuth();
    const v = (real as any)[p];
    return typeof v === "function" ? v.bind(real) : v;
  },
});

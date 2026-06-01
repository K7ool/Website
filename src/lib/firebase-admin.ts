import * as admin from "firebase-admin";

let _app: admin.app.App | null = null;
let _db: admin.firestore.Firestore | null = null;
let _auth: admin.auth.Auth | null = null;
let _initError: Error | null = null;

// ─── Startup diagnostics ───

console.log("[FIREBASE_ADMIN]");
console.log("[FIREBASE_ADMIN] SERVICE_ACCOUNT_EXISTS:", !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
console.log("[FIREBASE_ADMIN] SERVICE_ACCOUNT_LENGTH:", process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.length || 0);

// ─── Credential loading ───

function getServiceAccount(): admin.ServiceAccount {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!raw) {
    console.error("[FIREBASE_ADMIN] Missing credentials — FIREBASE_SERVICE_ACCOUNT_KEY is not set");
    throw new Error("Firebase Admin SDK not configured — FIREBASE_SERVICE_ACCOUNT_KEY environment variable is missing");
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch (parseErr: any) {
    const preview = raw.substring(0, 80).replace(/\n/g, "\\n");
    console.error("[FIREBASE_ADMIN] Invalid JSON service account — parse failure at offset", parseErr?.message);
    console.error("[FIREBASE_ADMIN] Raw value preview (first 80 chars):", preview);
    throw new Error("Firebase Admin SDK not configured — Invalid FIREBASE_SERVICE_ACCOUNT_KEY (JSON parse failed)");
  }

  if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
    console.error("[FIREBASE_ADMIN] Invalid JSON service account — missing required fields");
    console.error("[FIREBASE_ADMIN]   project_id:", !!parsed.project_id);
    console.error("[FIREBASE_ADMIN]   client_email:", !!parsed.client_email);
    console.error("[FIREBASE_ADMIN]   private_key:", !!parsed.private_key);
    throw new Error("Firebase Admin SDK not configured — Invalid FIREBASE_SERVICE_ACCOUNT_KEY (missing fields)");
  }

  const projectId = parsed.project_id as string;
  const clientEmail = parsed.client_email as string;
  let privateKey = parsed.private_key as string;

  // After JSON.parse, \n in the JSON string are already real newlines.
  // If the env var was double-escaped (\\n), JSON.parse yields literal \n.
  // This replace handles the double-escaped case.
  privateKey = privateKey.replace(/\\n/g, "\n");

  console.log("[FIREBASE_ADMIN] Service account parsed — project:", projectId, "client:", clientEmail);

  return { projectId, clientEmail, privateKey };
}

// ─── Firestore connectivity check ───

async function verifyConnectivity(db: admin.firestore.Firestore): Promise<void> {
  try {
    const snap = await db.collection("profiles").limit(1).get();
    console.log("[FIREBASE_ADMIN] Firestore connection OK — profiles collection readable");
  } catch (err: any) {
    const code = err?.code || err?.details || "unknown";
    const msg = err?.message || String(err);
    console.error("[FIREBASE_ADMIN] Firestore connection FAILED");
    console.error("[FIREBASE_ADMIN]   error code:", code);
    console.error("[FIREBASE_ADMIN]   error message:", msg);
    if (code === "16" || code === "UNAUTHENTICATED" || msg?.includes("UNAUTHENTICATED")) {
      console.error("[FIREBASE_ADMIN]   ──> AUTHENTICATION FAILURE: The service account credentials were rejected by Google.");
      console.error("[FIREBASE_ADMIN]   ──> Check that:");
      console.error("[FIREBASE_ADMIN]         1. FIREBASE_SERVICE_ACCOUNT_KEY is set correctly in Netlify env vars (Production)");
      console.error("[FIREBASE_ADMIN]         2. The private_key PEM is intact (starts with -----BEGIN PRIVATE KEY-----)");
      console.error("[FIREBASE_ADMIN]         3. The service account has Firestore access in GCP IAM");
      console.error("[FIREBASE_ADMIN]         4. The Firebase project is not disabled / billing is active");
    }
  }
}

// ─── Singleton initialization ───

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
    console.error("[FIREBASE_ADMIN] Initialization failed");
    console.error("[FIREBASE_ADMIN]   error name:", err?.name || err?.constructor?.name);
    console.error("[FIREBASE_ADMIN]   error message:", err?.message || String(err));
    if (err?.stack) {
      console.error("[FIREBASE_ADMIN]   stack:", err.stack.split("\n").slice(0, 4).join("\n"));
    }
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

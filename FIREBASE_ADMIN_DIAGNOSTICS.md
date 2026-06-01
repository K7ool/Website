# Firebase Admin Diagnostics Report

**Date:** June 1, 2026  
**Project:** Flipp Studios  
**Source file:** `src/lib/firebase-admin.ts`

---

## Error

```
16 UNAUTHENTICATED
Request had invalid authentication credentials
```

This error occurs when the Firebase Admin SDK attempts to authenticate with Google's servers and the service account credentials are rejected.

---

## Where credentials are loaded

All Firebase Admin initialization happens in a **single file**:

```
src/lib/firebase-admin.ts  (line 8–34: getServiceAccount())
```

The flow:

```
1. Module is imported (lazy — no side effects beyond logging)
2. First API call triggers ensure()
3. ensure() calls getServiceAccount()
4. getServiceAccount() reads process.env.FIREBASE_SERVICE_ACCOUNT_KEY
5. JSON.parse() extracts project_id, client_email, private_key
6. admin.credential.cert() creates credential object
7. admin.initializeApp() initializes the SDK
8. verifyConnectivity() tests a profiles collection query
```

No other file initializes Firebase Admin. The old `check-username/route.ts` fallback that called `initializeApp()` directly has been removed.

---

## Root cause analysis

### Most likely: Netlify env var format

The `private_key` field in the service account JSON contains a PEM-encoded RSA key with embedded `\n` escape sequences (in JSON string format). When stored as a Netlify environment variable, the key can be mangled in several ways:

| Scenario | JSON.parse result | private_key after .replace(/\\n/g, "\n") | Result |
|----------|-------------------|------------------------------------------|--------|
| Correct JSON with `\n` escapes | Actual newlines | Already correct (no-op) | ✅ Works |
| JSON with `\\n` (double-escaped) | Literal `\n` string | Converted to newlines | ✅ Works |
| JSON with actual newlines in private_key | Parse fails | N/A | ❌ "Invalid JSON" |
| Truncated key (>256 chars in UI) | Parse may succeed but key is incomplete | Incomplete PEM | ❌ 16 UNAUTHENTICATED |
| Key with wrong encoding | Depends | Wrong bytes | ❌ 16 UNAUTHENTICATED |

### Other possibilities

1. **Env var scope**: `FIREBASE_SERVICE_ACCOUNT_KEY` is set but scoped to "Preview" deployments only, not "Production".
2. **Service account revoked**: The service account `firebase-adminsdk-fbsvc@marketplace-87050.iam.gserviceaccount.com` may have been deleted or its key revoked in GCP IAM.
3. **Firebase project disabled**: The project `marketplace-87050` may have billing disabled or be suspended.
4. **Firestore API disabled**: The `firestore.googleapis.com` API may not be enabled for the project.

---

## Startup diagnostics (added)

Every time `firebase-admin.ts` is imported, it now logs:

```
[FIREBASE_ADMIN]
[FIREBASE_ADMIN] SERVICE_ACCOUNT_EXISTS: true/false
[FIREBASE_ADMIN] SERVICE_ACCOUNT_LENGTH: 2480
```

This will appear in Netlify Function logs immediately when any API route is called.

### Expected output on Netlify (working):

```
[FIREBASE_ADMIN]
[FIREBASE_ADMIN] SERVICE_ACCOUNT_EXISTS: true
[FIREBASE_ADMIN] SERVICE_ACCOUNT_LENGTH: <non-zero>
[FIREBASE_ADMIN] Service account parsed — project: marketplace-87050 client: firebase-adminsdk-fbsvc@marketplace-87050.iam.gserviceaccount.com
[FIREBASE_ADMIN] Initializing...
[FIREBASE_ADMIN] Initialized successfully
[FIREBASE_ADMIN] Firestore connection OK — profiles collection readable
```

### Expected output on Netlify (broken):

```
[FIREBASE_ADMIN]
[FIREBASE_ADMIN] SERVICE_ACCOUNT_EXISTS: true
[FIREBASE_ADMIN] SERVICE_ACCOUNT_LENGTH: 2480
[FIREBASE_ADMIN] Service account parsed — project: marketplace-87050 client: firebase-adminsdk-fbsvc@marketplace-87050.iam.gserviceaccount.com
[FIREBASE_ADMIN] Initializing...
[FIREBASE_ADMIN] Initialized successfully
[FIREBASE_ADMIN] Firestore connection FAILED
[FIREBASE_ADMIN]   error code: 16
[FIREBASE_ADMIN]   error message: 16 UNAUTHENTICATED: Request had invalid authentication credentials
[FIREBASE_ADMIN]   ──> AUTHENTICATION FAILURE: The service account credentials were rejected by Google.
```

If `SERVICE_ACCOUNT_EXISTS` is `false`, the env var is not set or not accessible.

---

## Exact fixes applied

| # | Fix | File |
|---|-----|------|
| 1 | Rewrote `firebase-admin.ts` to read **only** `FIREBASE_SERVICE_ACCOUNT_KEY` | `src/lib/firebase-admin.ts` |
| 2 | Removed fallback to individual vars (`FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_PROJECT_ID`) | `src/lib/firebase-admin.ts` |
| 3 | Added `privateKey.replace(/\\n/g, "\n")` to handle double-escaped env vars | `src/lib/firebase-admin.ts:48` |
| 4 | Added startup diagnostics: `SERVICE_ACCOUNT_EXISTS`, `SERVICE_ACCOUNT_LENGTH` | `src/lib/firebase-admin.ts:13-16` |
| 5 | Changed connectivity test from write/delete to `profiles.limit(1).get()` | `src/lib/firebase-admin.ts:57` |
| 6 | Added detailed auth failure logging with remediation steps | `src/lib/firebase-admin.ts:63-72` |
| 7 | Added raw value preview (first 80 chars) on JSON parse failure | `src/lib/firebase-admin.ts:25` |
| 8 | Added field-level missing check (project_id/client_email/private_key) | `src/lib/firebase-admin.ts:31-35` |
| 9 | Removed direct `initializeApp()` + `getFirestore()` from `check-username/route.ts` | `src/app/api/check-username/route.ts` |
| 10 | Added `[CHECK_OWNERSHIP]` logging to `/api/check-ownership` | `src/app/api/check-ownership/route.ts` |

---

## API routes verified

| Route | Uses singleton | Status |
|-------|---------------|--------|
| `POST /api/check-ownership` | `{ adminDb, adminAuth }` | ✅ |
| `POST /api/check-username` | `{ adminDb }` | ✅ (was broken, fixed) |
| `POST /api/license/verify` | `{ adminDb }` | ✅ |
| `POST /api/verify-download` | `{ adminDb, adminAuth }` | ✅ |
| `POST/PUT/DELETE /api/admin/achievements` | `{ adminDb, adminAuth }` | ✅ |
| `POST/PUT/DELETE /api/admin/coupons` | `{ adminDb, adminAuth }` | ✅ |
| `POST/PUT/DELETE /api/admin/versions` | `{ adminDb, adminAuth }` | ✅ |
| `POST /api/admin/notify-owners` | `{ adminDb, adminAuth }` | ✅ |

---

## How to fix on Netlify

### Step 1: Verify env var is set

In Netlify Dashboard → Site → Environment variables, confirm:

```
FIREBASE_SERVICE_ACCOUNT_KEY  (Production)  =  { "type": "service_account", ... }
```

The value must be the **entire** JSON blob — copy it directly from the downloaded Firebase service account key file. **Do not** modify the `\n` sequences in the `private_key` field — they are correct as-is.

### Step 2: Check deployment logs

1. Deploy the latest commit
2. After deployment, call any API route (e.g., `POST /api/check-ownership`)
3. Open Netlify Dashboard → Function logs
4. Look for `[FIREBASE_ADMIN]` entries

### Step 3: If SERVICE_ACCOUNT_EXISTS is false

The env var is not reaching the Netlify Function. Check:
- Is it set for **Production** scope (not just Preview)?
- Does the Netlify site have the variable in the correct section?

### Step 4: If SERVICE_ACCOUNT_EXISTS is true but auth still fails

The service account key itself is the issue:
1. Go to [GCP Console → IAM → Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts)
2. Find `firebase-adminsdk-fbsvc@marketplace-87050.iam.gserviceaccount.com`
3. Check if the key with ID `f994a7c56fce2c539f7b8adf71216584c7122445` exists and is active
4. If not, generate a new key and update the Netlify env var
5. Verify Firestore API is enabled: [APIs → Firestore API](https://console.cloud.google.com/apis/library/firestore.googleapis.com)
6. Verify Firebase project billing is active

---

## Build status

```
BUILD SUCCESS
55 routes · 0 errors · 0 warnings
```

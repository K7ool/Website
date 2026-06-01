# Network Diagnostics — Roblox License System

## Diagnosis Result: **SITE NOT DEPLOYED**

`flippstudios.com` **DNS cannot be resolved.** The domain has no DNS records pointing to any hosting provider. This is the **root cause** of all timeouts.

---

## 1. Exact API Endpoint

```
https://flippstudios.com/api/license/verify
```

- **Method:** POST
- **Content-Type:** application/json
- **Framework:** Next.js 16 API Route
- **Deployment target:** Netlify (`@netlify/plugin-nextjs`)
- **Actual status:** ❌ Not deployed — domain DNS does not resolve

---

## 2. Exact Payload Sent

From `ROBLOX/LicenseVerifier.lua`:

```json
{
  "licenseKey": "FLIPP-R4TV-DQ07-2EIA",
  "productId": "5",
  "placeId": <game.PlaceId>,
  "universeId": <game.GameId>,
  "creatorId": <game.CreatorId>
}
```

---

## 3. Expected Response (if deployed)

### Success:
```json
{
  "success": true,
  "valid": true,
  "productName": "...",
  "licenseType": "lifetime",
  "expiresAt": null,
  "latestVersion": "1.0.0",
  "activationCount": 1,
  "boundUniverseId": 123456789
}
```

### Failure examples:
```json
{ "success": false, "valid": false, "reason": "LICENSE_NOT_FOUND" }
{ "success": false, "valid": false, "reason": "LICENSE_EXPIRED" }
{ "success": false, "valid": false, "reason": "UNIVERSE_MISMATCH" }
```

---

## 4. Actual Response Received

```
NONE — Connection failed at DNS resolution layer
```

- **Status code:** No HTTP response
- **Response body:** N/A
- **Error:** `The remote name could not be resolved: 'flippstudios.com'`

---

## 5. Timeout Reason

| Layer | Timeout | Result |
|-------|---------|--------|
| DNS resolution | ~2-5s | ❌ Failed — domain not found |
| TCP connection | N/A | ❌ Never attempted (DNS failed) |
| TLS handshake | N/A | ❌ Never attempted |
| HTTP request | N/A | ❌ Never attempted |
| Roblox PostAsync | 10s (user config) | ⏱ Manual timeout fires at 10s |

**Primary cause:** DNS lookup for `flippstudios.com` returns `NXDOMAIN` (non-existent domain).

---

## 6. Connection Failures

### DNS Resolution
```
Diagnostic: nslookup flippstudios.com
Result:    Non-existent domain (NXDOMAIN)
```

### HTTP Connection
```
Diagnostic: Invoke-WebRequest -Uri "https://flippstudios.com/api/license/ping"
Result:    "The remote name could not be resolved: 'flippstudios.com'"
```

### HTTPS Check
```
Diagnostic: Invoke-WebRequest -Uri "https://flippstudios.com"
Result:    "The remote name could not be resolved: 'flippstudios.com'"
```

---

## 7. Netlify Function Failures

**The project uses Next.js API routes, NOT standalone Netlify Functions.**

- Config: `netlify.toml` with `@netlify/plugin-nextjs`
- Build command: `npm run build` → outputs to `.next/`
- Node version: 22
- **Current status:** Never deployed to Netlify

To deploy:
1. Push `EXPORT/` contents to a GitHub repo
2. Connect repo to Netlify
3. Set environment variables
4. Deploy

Netlify will provision a URL like `random-name-123456.netlify.app` automatically.

---

## 8. Firebase Failures

**Firebase has never been reached** because the API requests never leave the Roblox client.

- The `verify` endpoint reads from Firestore (`licenses` collection)
- Firebase Admin SDK is initialized from `FIREBASE_SERVICE_ACCOUNT_KEY`
- Firestore connectivity is tested on startup via `profiles.limit(1).get()`
- **Current status:** Cannot verify — site not deployed, no HTTP requests made

---

## 9. New Ping Endpoint

Created at `src/app/api/license/ping/route.ts`:

```
GET /api/license/ping
POST /api/license/ping
```

Response:
```json
{
  "success": true,
  "server": "online",
  "timestamp": <Date.now()>
}
```

### Flow (updated LicenseVerifier):
1. ✅ **Step 1:** Call `GET /api/license/ping`
2. ❌ If ping fails → return `"CANNOT_REACH_SERVER"` → UI shows "Cannot reach licensing server"
3. ✅ **Step 2:** Only on ping success → call `POST /api/license/verify`

---

## 10. Deploy Checklist

| Step | Status |
|------|--------|
| Push EXPORT/ to GitHub | ❌ Not done |
| Connect repo to Netlify | ❌ Not done |
| Set env vars in Netlify | ❌ Not done |
| Deploy site | ❌ Not done |
| Configure custom domain (flippstudios.com) | ❌ Not done |
| Update DNS CNAME to Netlify | ❌ Not done |
| Verify `/api/license/ping` returns 200 | ❌ Not done |
| Update Roblox Configuration.lua ApiUrl | ❌ Only if URL changed |

Once deployed, Netlify will provide a temporary URL (e.g. `https://abc123.netlify.app`). Update `ApiUrl` in `ROBLOX/Configuration.lua` to this URL before testing.

---

## Files Modified in This Diagnostic

| File | Change |
|------|--------|
| `src/app/api/license/ping/route.ts` | **New** — lightweight connectivity check endpoint |
| `ROBLOX/LicenseVerifier.lua` | **Updated** — added `pingServer()`, ping-before-verify flow, request duration logging |
| `ROBLOX/Loader.server.lua` | **Updated** — added `CANNOT_REACH_SERVER` error handler |
| `ROBLOX/Configuration.lua` | **Updated** — pre-filled ProductId, LicenseKey, Timeout |
| `ROBLOX/NETWORK_DIAGNOSTICS.md` | **New** — this document |
| Studio `ServerScriptService.LicenseVerifier` | **Updated** — added `PingServer()` method, ping-before-verify |
| Studio `ReplicatedStorage.LicenseController` | **Updated** — added `CANNOT_REACH_SERVER` error message |

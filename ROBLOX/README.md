# Flipp Studios — Roblox License Client

A complete license verification system for Roblox experiences sold on [flippstudios.com](https://flippstudios.com).  
Auto-detected API endpoint: `/api/license/verify`

---

## File Overview

| File | Type | Where to Place |
|------|------|----------------|
| `LicenseConfig.lua` | ModuleScript | `ReplicatedStorage` |
| `LicenseVerifier.lua` | ModuleScript | `ServerScriptService` |
| `LicenseController.lua` | ModuleScript | `ServerScriptService` |
| `LicenseUI.lua` | ModuleScript | `ReplicatedStorage` |

---

## Installation

### 1. Enable HttpService

In Roblox Studio:
1. Open **Game Settings** → **Security**
2. Enable **Allow HTTP Requests**
3. Click **Save**

### 2. Place the Scripts

```
ReplicatedStorage
├── LicenseConfig.lua      (ModuleScript)
├── LicenseUI.lua          (ModuleScript)

ServerScriptService
├── LicenseVerifier.lua    (ModuleScript)
├── LicenseController.lua  (ModuleScript)
```

### 3. Create a Script to Start the System

Create a **Script** (not LocalScript) in `ServerScriptService`:

```lua
local LicenseController = require(game:GetService("ServerScriptService").LicenseController)

LicenseController.Start(function()
	-- Your protected game system starts here.
	-- This only runs after a valid license is verified.
	print("[FlippStudios] License verified — system starting")

	-- Example: load your main game scripts
	-- require(game:GetService("ServerScriptService").MainGameLoader)
end)
```

### 4. Set Up the UI (Client-side)

Create a **LocalScript** in `StarterGui` or `StarterPlayerScripts`:

```lua
local LicenseUI = require(game:GetService("ReplicatedStorage").LicenseUI)
LicenseUI:Init()
```

---

## How It Works

### Verification Flow

```
Player joins game
       │
       ▼
LicenseController checks DataStore
       │
       ├── Saved license found ──► Auto re-verify via API
       │                              │
       │                              ├── Valid ──► Start protected system
       │                              └── Invalid ──► Show license UI
       │
       └── No saved license ──► Show license UI
                                    │
                                    ▼
                         Player enters license key
                                    │
                                    ▼
                         POST /api/license/verify
                                    │
                                    ├── Success ──► Save to DataStore
                                    │              Start protected system
                                    │
                                    └── Failure ──► Show error message
```

### API Request

```
POST https://flippstudios.com/api/license/verify
Content-Type: application/json

{
  "licenseKey": "FLIPP-XXXX-XXXX-XXXX",
  "productId": "3",
  "placeId": 1234567890,
  "universeId": 1234567890,
  "creatorId": 123456
}
```

### API Response (Success)

```json
{
  "success": true,
  "valid": true,
  "productName": "Modern UI Library",
  "licenseType": "lifetime",
  "expiresAt": null,
  "latestVersion": "2.1.0",
  "activationCount": 3,
  "boundUniverseId": 1234567890
}
```

### Error Responses

| Reason | Meaning |
|--------|---------|
| `LICENSE_NOT_FOUND` | License key doesn't match any record |
| `LICENSE_EXPIRED` | License has passed its expiry date |
| `LICENSE_REVOKED` | License was manually revoked by an admin |
| `PRODUCT_MISMATCH` | License is for a different product |
| `UNIVERSE_MISMATCH` | License is bound to a different Roblox experience |
| `RATE_LIMIT_EXCEEDED` | More than 10 requests/minute from the same IP |

---

## Configuration

Edit `LicenseConfig.lua` in ReplicatedStorage:

```lua
Config.LICENSE_KEY = ""        -- Your purchased license key
Config.PRODUCT_ID = ""         -- Product ID from flippstudios.com
Config.API_URL = "https://flippstudios.com/api/license/verify"
Config.TIMEOUT = 10            -- HTTP request timeout (seconds)
Config.REVERIFY_INTERVAL = 3600 -- Re-verify every hour
Config.SHOW_UI_ON_START = true -- Show UI if no valid license
Config.DATASTORE_KEY = "FlippStudios_License" -- DataStore key prefix
```

---

## Product Reference

| ID | Product | Category | Price |
|----|---------|----------|-------|
| 1 | Advanced Admin System | Admin Systems | $24.99 |
| 2 | Premium Vehicle System | Vehicles | $34.99 |
| 3 | Modern UI Library | UI Systems | $19.99 |
| 4 | Donation & VIP System | Donation Systems | $29.99 |
| 5 | Building System Pro | Building Systems | $39.99 |
| 6 | Orbital Hub — Admin GUI | Admin Systems | $44.99 |
| 7 | Realistic Weapon System | Scripts | $27.99 |
| 8 | Neon UI Pack | UI Systems | $14.99 |
| 9 | 3D Character Models Pack | Models | $49.99 |
| 10 | Economy System Plus | Scripts | $22.99 |

Set `Config.PRODUCT_ID` to the ID of the product you purchased.

---

## Security

- **Verification is server-side**: The HTTP request runs in a Script, not a LocalScript. Exploiters cannot intercept or fake the verification.
- **Universe binding**: Once a license is activated, it is bound to that specific Roblox universe. Attempting to use the same license on a different experience returns `UNIVERSE_MISMATCH`.
- **Re-verification**: Licenses are re-verified every hour. If re-verification fails at any point, the protected system is disabled.
- **DataStore**: The license is saved locally so players don't need to re-enter their key every join, but re-verification still happens server-side.
- **Rate limiting**: The API enforces 10 requests per minute per IP to prevent brute-force attacks.

---

## Updating the System

When a new product version is released on flippstudios.com, the `latestVersion` field in the API response changes. The LicenseController automatically detects this and shows a notification:

> **Flipp Studios** — New update available: v2.1.0

Players see this as a Roblox notification when they join.

---

## Troubleshooting

| Problem | Likely Cause | Solution |
|---------|-------------|----------|
| "Could not reach the verification server" | HTTP disabled | Enable **Allow HTTP Requests** in Game Settings |
| "License key not found" | Wrong key | Double-check your license key in LicenseConfig.lua |
| "This license is bound to a different Roblox experience" | Wrong universe | Each license is locked to the first universe that activates it |
| UI doesn't appear | Script not in right place | Check LicenseUI is in ReplicatedStorage and LocalScript in StarterGui |
| "Too many verification attempts" | Rate limited | Wait 1 minute before trying again |

---

## Support

For help, join the Discord: [https://discord.gg/xEFTFB89jK](https://discord.gg/xEFTFB89jK)  
Or email: [support@flippstudios.com](mailto:support@flippstudios.com)

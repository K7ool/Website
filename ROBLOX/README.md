# Flipp Studios — Roblox License Client

A complete license verification system for Roblox experiences sold on [flippstudios.com](https://flippstudios.com).  
Auto-detected API endpoint: `/api/license/verify`

---

## File Overview

| File | Type | Where to Place | Purpose |
|------|------|----------------|---------|
| `LicenseConfig.lua` | ModuleScript | `ReplicatedStorage` | License configuration |
| `LicenseVerifier.lua` | ModuleScript | `ServerScriptService` | License verification logic |
| `LicenseController.lua` | ModuleScript | `ServerScriptService` | License system controller |
| `LicenseUI.lua` | ModuleScript | `ReplicatedStorage` | License prompt UI |
| `WebsiteConnector.lua` | ModuleScript | `ServerScriptService` | **[NEW]** Handles admin commands (kick, ban, DM) |
| `ServerStart.lua` | Script | `ServerScriptService` | **[NEW]** Main startup script |

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
├── WebsiteConnector.lua   (ModuleScript) — [NEW]
└── ServerStart.lua        (Script)       — [NEW]
```

### 3. Create a Script to Start the System

The `ServerStart.lua` file has already been created for you. This is your main server startup script that:
1. Initializes the **WebsiteConnector** (handles admin commands: kick, ban, DM)
2. Starts the **LicenseController** (verifies license)
3. Starts your protected game systems

Simply place `ServerStart.lua` as a **Script** (not LocalScript) in `ServerScriptService`. 
It will automatically initialize both systems.

**If you want to use a custom startup script instead**, create a **Script** in `ServerScriptService`:

```lua
-- Require the license system
local LicenseController = require(game:GetService("ServerScriptService").LicenseController)

-- Require the website connector (handles admin commands)
local WebsiteConnector = require(game:GetService("ServerScriptService").WebsiteConnector)

-- Start the website connector FIRST
WebsiteConnector.Start()

-- Then start the license verification
LicenseController.Start(function()
	-- Your protected game system starts here
	print("[FlippStudios] License verified — system starting")
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

## WebsiteConnector — Admin Commands

The **WebsiteConnector** system connects your Roblox experience to the Flipp Studios admin panel, allowing you to:
- **Kick players** from your game remotely
- **Ban players** with persistent banlists stored in DataStore
- **Send DMs** to players in-game
- **Get player info** (name, ID, account age, ban status)

### How It Works

1. **Admin Panel** sends command to `/api/servers/commands` (your website)
2. **Roblox Game** polls `/api/servers/commands/pending` every 5 seconds
3. **WebsiteConnector** processes the command (kick/ban/dm/info)
4. **Roblox Game** reports completion to `/api/servers/commands/complete`
5. **Admin Panel** receives the result and updates the UI

### Command Flow

```
Admin clicks "Kick" on website
         │
         ▼
POST /api/servers/commands
         │
         ▼
Stored in serverCommands collection
         │
         ▼
Roblox polls /api/servers/commands/pending
         │
         ▼
WebsiteConnector.processCommand()
         │
         ├── type = "kick" ──► Players:FindFirstChild(name):Kick(reason)
         ├── type = "ban"  ──► Add to banlist + kick player
         ├── type = "dm"   ──► Send system message via TextChat
         └── type = "info" ──► Return player stats
         │
         ▼
POST /api/servers/commands/complete
         │
         ▼
Admin panel receives result
```

### Usage

The WebsiteConnector automatically starts when you run `ServerStart.lua`. No configuration needed—it automatically discovers your game's server ID.

**Check if a player is banned:**

```lua
local WebsiteConnector = require(game:GetService("ServerScriptService").WebsiteConnector)

if WebsiteConnector.IsBanned(userId) then
	print("Player is banned")
end
```

**Get all banned users:**

```lua
local bannedUsers = WebsiteConnector.GetBannedUsers()
for userId, _ in pairs(bannedUsers) do
	print("Banned: " .. userId)
end
```

### Firestore Collections

Commands are stored in the `serverCommands` collection with this structure:

```json
{
  "serverId": "123456789",
  "type": "kick|ban|dm|info|chat",
  "targetUserId": 123456,
  "targetName": "DevAboSolo",
  "payload": {
    "reason": "Reason for kick/ban",
    "message": "Message content for DM"
  },
  "status": "pending|sent|completed",
  "createdAt": "2026-06-08T10:30:00Z",
  "completedAt": "2026-06-08T10:30:05Z",
  "result": { "success": true, "message": "Player kicked" }
}
```

### Troubleshooting

| Problem | Likely Cause | Solution |
|---------|-------------|----------|
| Commands not executing | WebsiteConnector not started | Place `ServerStart.lua` as Script in ServerScriptService |
| "Unknown command type" | API sending invalid type | Update your website API or WebsiteConnector |
| Players not actually kicked | Incorrect player name | Ensure target name matches exact player name in game |
| Ban not persisting | DataStore disabled | Enable DataStore access in game settings |
| DM not sending | TextChat unavailable | Ensure your game has TextChatService enabled |

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

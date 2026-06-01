--[[
  LicenseConfig.lua
  ──────────────────────────────────────────────
  Auto-detected from Flipp Studios marketplace.
  Edit LICENSE_KEY and PRODUCT_ID for your purchase.
  All other values are pre-configured.
]]

local Config = {}

-- Your license key (purchased from https://flippstudios.com)
Config.LICENSE_KEY = ""

-- Product ID matching the product on flippstudios.com
Config.PRODUCT_ID = ""

-- API endpoint — POST endpoint that verifies licenses
Config.API_URL = "https://romarketdev.netlify.app/api/license/verify"

-- HTTP request timeout in seconds
Config.TIMEOUT = 10

-- How often to re-verify (in seconds) — 3600 = 1 hour
Config.REVERIFY_INTERVAL = 3600

-- Auto-displayed if license is missing
Config.SHOW_UI_ON_START = true

-- DataStore key prefix (change only if conflicting with another system)
Config.DATASTORE_KEY = "FlippStudios_License"

return Config

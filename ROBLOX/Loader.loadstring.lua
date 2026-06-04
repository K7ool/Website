--[[
  FlippStudios License Loader
  ───────────────────────────
  The ONLY script customers put in ServerScriptService.
  Everything else is served from your website — source stays hidden.
]]

local HttpService = game:GetService("HttpService")

-- ✏️ CHANGE THIS to your product ID from the admin panel
local PRODUCT_ID = "YOUR_PRODUCT_ID_HERE"

-- ✏️ CHANGE THIS to your website URL
local MODULE_URL = "https://YOUR-DOMAIN.com/api/license/module?productId=" .. PRODUCT_ID

local function loadLicenseService()
	local success, source = pcall(function()
		return HttpService:GetAsync(MODULE_URL)
	end)

	if not success then
		warn("[LICENSE] Failed to fetch module from:", MODULE_URL)
		return nil, "NETWORK_ERROR"
	end

	local ok, LicenseService = loadstring(source)
	if not ok then
		warn("[LICENSE] Failed to compile module:", tostring(LicenseService))
		return nil, "COMPILE_ERROR"
	end

	return LicenseService()
end

-- Load and start
local LicenseService, err = loadLicenseService()
if LicenseService then
	LicenseService.Start(function()
		print("[LICENSE] Verified — enabling protected content")
		_G.LicenseVerified = true
	end)
else
	warn("[LICENSE] License system failed to load:", err or "UNKNOWN")
end

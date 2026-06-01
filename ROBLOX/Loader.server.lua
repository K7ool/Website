local Configuration = require(script:WaitForChild("Configuration"))
local LicenseVerifier = require(script:WaitForChild("LicenseVerifier"))

-- ─── Roblox Identifiers ──────────────────────────────────────
local placeId = game.PlaceId
local universeId = game.GameId
local creatorId = game.CreatorId

-- ─── Validate Configuration ──────────────────────────────────
if Configuration.LicenseKey == "" or Configuration.ProductId == "" then
	warn(string.format(
		"[%s] License configuration missing. Set LicenseKey and ProductId in Configuration.",
		Configuration.MarketplaceName
	))
	return
end

-- ─── Verify License ──────────────────────────────────────────
local success, result = LicenseVerifier.verify(Configuration, placeId, universeId, creatorId)

if not success then
	local reason = tostring(result)

	if reason == "LICENSE_NOT_FOUND" then
		warn(string.format("[%s] License key not found. Check your key.", Configuration.MarketplaceName))
	elseif reason == "LICENSE_REVOKED" then
		warn(string.format("[%s] License has been revoked. Contact support.", Configuration.MarketplaceName))
	elseif reason == "LICENSE_EXPIRED" then
		warn(string.format("[%s] License has expired. Renew on the marketplace.", Configuration.MarketplaceName))
	elseif reason == "PRODUCT_MISMATCH" then
		warn(string.format("[%s] License does not match this product. Check ProductId.", Configuration.MarketplaceName))
	elseif reason == "UNIVERSE_MISMATCH" then
		warn(string.format("[%s] License bound to another universe. Anti-leak triggered.", Configuration.MarketplaceName))
	elseif reason == "RATE_LIMIT_EXCEEDED" then
		warn(string.format("[%s] Too many verification attempts. Try again later.", Configuration.MarketplaceName))
	elseif reason == "CANNOT_REACH_SERVER" then
		warn(string.format("[%s] Cannot reach licensing server at %s.", Configuration.MarketplaceName, Configuration.ApiUrl))
		print(string.format("[%s] Check that the website is online and ApiUrl is correct.", Configuration.MarketplaceName))
	elseif reason == "NETWORK_ERROR" or reason == "INVALID_RESPONSE" then
		warn(string.format("[%s] Could not reach verification server. Check ApiUrl.", Configuration.MarketplaceName))
	else
		warn(string.format("[%s] Verification failed: %s", Configuration.MarketplaceName, reason))
	end

	-- Anti-leak: do not load protected content
	return
end

-- ─── License Valid ───────────────────────────────────────────
local productName = result.productName or "Unknown Product"
local latestVersion = result.latestVersion or "1.0.0"
local licenseType = result.licenseType or "lifetime"
local expiresAt = result.expiresAt or ""
local activationCount = result.activationCount or 1
local boundUniverseId = result.boundUniverseId or universeId

print(string.format("[%s] License verified successfully.", Configuration.MarketplaceName))
print(string.format("[%s] Product: %s", Configuration.MarketplaceName, productName))
print(string.format("[%s] Type: %s", Configuration.MarketplaceName, licenseType))
print(string.format("[%s] Activation: #%d (Universe: %d)", Configuration.MarketplaceName, activationCount, boundUniverseId))

if licenseType == "subscription" and expiresAt ~= "" then
	print(string.format("[%s] Expires: %s", Configuration.MarketplaceName, expiresAt))
end

-- ─── Version Check ──────────────────────────────────────────
local currentVersion = Configuration.LocalVersion or "1.0.0"

if latestVersion ~= currentVersion then
	print(string.format(
		"[%s] Update Available: Current v%s → Latest v%s",
		Configuration.MarketplaceName,
		currentVersion,
		latestVersion
	))
end

-- ─── License Data (for integration) ──────────────────────────
local FlippStudios = {
	Verified = true,
	ProductName = productName,
	LicenseType = licenseType,
	ExpiresAt = expiresAt,
	LatestVersion = latestVersion,
	CurrentVersion = currentVersion,
	ActivationCount = activationCount,
	BoundUniverseId = boundUniverseId,
}

-- Expose to other scripts via _G (lightweight bridge).
-- Other scripts can check: _G.FlippStudios.Verified
_G.FlippStudios = FlippStudios

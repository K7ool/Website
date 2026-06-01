--[[
  LicenseVerifier.lua
  ──────────────────────────────────────────────
  Server-side license verification module.
  Sends POST request to the marketplace API.
  Uses DataStore to remember verified licenses.
  Must run on the Server (Script, not LocalScript).
]]

local HttpService = game:GetService("HttpService")
local DataStoreService = game:GetService("DataStoreService")
local Players = game:GetService("Players")

local LicenseVerifier = {}
LicenseVerifier.__index = LicenseVerifier

-- ─── Constructor ───

function LicenseVerifier.new(config)
	local self = setmetatable({}, LicenseVerifier)
	self.Config = config
	self.VerifiedData = nil
	self.LastError = nil
	self.LastCheckTime = 0
	self.Store = DataStoreService:GetDataStore(config.DATASTORE_KEY .. "_v2")
	return self
end

-- ─── Get Roblox environment data ───

function LicenseVerifier:_getRobloxContext()
	return {
		placeId = game.PlaceId,
		universeId = game.GameId,
		creatorId = game.CreatorId,
	}
end

-- ─── Ping server connectivity check ───

function LicenseVerifier:PingServer()
	local pingUrl = self.Config.API_URL:gsub("/api/license/verify$", "/api/license/ping")
	print("[LICENSE_PING] Pinging:", pingUrl)

	local startTime = tick()

	local timedOut = false
	local coro = coroutine.running()
	local timeoutThread = task.delay(self.Config.TIMEOUT, function()
		timedOut = true
		coroutine.resume(coro)
	end)

	local httpSuccess, response = pcall(function()
		return HttpService:GetAsync(pingUrl)
	end)

	task.cancel(timeoutThread)
	local duration = math.floor((tick() - startTime) * 1000)

	print("[LICENSE_PING] Duration:", duration, "ms")
	print("[LICENSE_PING] Timed out:", timedOut)
	print("[LICENSE_PING] HTTP success:", httpSuccess)

	if timedOut then
		warn("[LICENSE_PING] Request timed out after " .. self.Config.TIMEOUT .. " seconds")
		print("[LICENSE_PING] URL:", pingUrl)
		return false, "TIMEOUT"
	end

	if not httpSuccess then
		local errorMsg = tostring(response)
		warn("[LICENSE_PING] HTTP error:", errorMsg)
		print("[LICENSE_PING] URL:", pingUrl)
		return false, "NETWORK_ERROR"
	end

	print("[LICENSE_PING] Response:", response)

	local ok, decoded = pcall(function()
		return HttpService:JSONDecode(response)
	end)

	if not ok then
		warn("[LICENSE_PING] Invalid JSON:", tostring(response))
		return false, "INVALID_RESPONSE"
	end

	if decoded.server ~= "online" then
		warn("[LICENSE_PING] Server not online:", decoded.server)
		return false, "SERVER_OFFLINE"
	end

	local serverTime = decoded.timestamp or 0
	local timeDiffMs = (os.clock() * 1000) - serverTime
	print("[LICENSE_PING] Server online! Clock diff ms:", timeDiffMs)
	print("[LICENSE_PING] Status: 200 OK")
	return true, decoded
end

-- ─── Verify license via API ───

function LicenseVerifier:Verify(licenseKey, productId)
	local key = licenseKey or self.Config.LICENSE_KEY
	local pid = productId or self.Config.PRODUCT_ID

	print("[LICENSE] Starting verification...")
	print("[LICENSE] Key:", key and #key .. " chars" or "NONE")
	print("[LICENSE] Product:", pid)
	print("[LICENSE] API:", self.Config.API_URL)
	print("[LICENSE] Timeout:", self.Config.TIMEOUT, "seconds")

	if not key or key == "" then
		warn("[LICENSE] MISSING_LICENSE_KEY")
		self.LastError = "MISSING_LICENSE_KEY"
		return { success = false, reason = "MISSING_LICENSE_KEY" }
	end

	if not pid or pid == "" then
		warn("[LICENSE] MISSING_PRODUCT_ID")
		self.LastError = "MISSING_PRODUCT_ID"
		return { success = false, reason = "MISSING_PRODUCT_ID" }
	end

	-- Step 1: Ping the server first
	local pingOk, pingResult = self:PingServer()
	if not pingOk then
		local pingReason = tostring(pingResult)
		warn("[LICENSE] Ping failed:", pingReason)
		print("[LICENSE] Cannot reach licensing server at:", self.Config.API_URL)
		self.LastError = "CANNOT_REACH_SERVER"
		return { success = false, reason = "CANNOT_REACH_SERVER", message = "Cannot reach licensing server at " .. self.Config.API_URL }
	end
	print("[LICENSE] Ping OK — server is reachable, proceeding with verification")

	-- Check HttpService is enabled
	local hsOk, hsErr = pcall(function()
		return HttpService.HttpEnabled
	end)
	if hsOk and not hsErr then
		warn("[LICENSE] HttpService.HttpEnabled is false — requests will fail")
		print("[LICENSE] Enable HTTP Requests in Game Settings > Security")
		return { success = false, reason = "HTTP_DISABLED" }
	end

	local ctx = self:_getRobloxContext()
	print("[LICENSE] Context: placeId=" .. ctx.placeId .. " universeId=" .. ctx.universeId .. " creatorId=" .. ctx.creatorId)

	local jsonOk, payload = pcall(function()
		return HttpService:JSONEncode({
			licenseKey = key,
			productId = pid,
			placeId = ctx.placeId,
			universeId = ctx.universeId,
			creatorId = ctx.creatorId,
		})
	end)
	if not jsonOk then
		warn("[LICENSE] JSONEncode failed:", tostring(payload))
		self.LastError = "INTERNAL_ERROR"
		return { success = false, reason = "INTERNAL_ERROR", message = "Failed to encode request" }
	end

	print("[LICENSE] Sending HTTP request")
	print("[LICENSE] Payload:", payload)

	-- Manual timeout using task.delay
	local timedOut = false
	local resultData = nil
	local coro = coroutine.running()

	local timeoutThread = task.delay(self.Config.TIMEOUT, function()
		timedOut = true
		coroutine.resume(coro)
	end)

	local httpOk, httpResult = pcall(function()
		local response = HttpService:PostAsync(
			self.Config.API_URL,
			payload,
			Enum.HttpContentType.ApplicationJson,
			false,
			nil
		)
		return response
	end)

	task.cancel(timeoutThread)

	if timedOut then
		warn("[LICENSE] Request timed out after " .. self.Config.TIMEOUT .. " seconds")
		print("[LICENSE] The API endpoint may be unreachable or not responding")
		self.LastError = "TIMEOUT"
		return { success = false, reason = "TIMEOUT", message = "Verification timed out" }
	end

	if not httpOk then
		local errorMsg = tostring(httpResult)
		warn("[LICENSE] HTTP error:", errorMsg)
		print("[LICENSE] Request URL:", self.Config.API_URL)
		print("[LICENSE] Status: Error")
		self.LastError = "HTTP_ERROR"
		return { success = false, reason = "HTTP_ERROR", message = errorMsg }
	end

	print("[LICENSE] Status: 200 OK")
	print("[LICENSE] Response body:", httpResult)
	print("[LICENSE] Request URL:", self.Config.API_URL)
	print("[LICENSE] Payload sent:", payload)

	local decodeOk, decoded = pcall(function()
		return HttpService:JSONDecode(httpResult)
	end)

	if not decodeOk then
		warn("[LICENSE] JSON decode failed:", tostring(httpResult))
		self.LastError = "INVALID_RESPONSE"
		return { success = false, reason = "INVALID_RESPONSE", message = "Invalid API Response" }
	end

	print("[LICENSE] Decoded response:", HttpService:JSONEncode(decoded))

	if not decoded.success then
		local reason = decoded.reason or "UNKNOWN"
		warn("[LICENSE] API returned failure:", reason)
		self.LastError = reason
		return decoded
	end

	if decoded.valid ~= true then
		warn("[LICENSE] API returned valid=false without success=false")
		self.LastError = "INVALID_RESPONSE"
		return { success = false, reason = "INVALID_RESPONSE", message = "Invalid API Response" }
	end

	print("[LICENSE] Verification successful!")
	print("[LICENSE] Product:", decoded.productName or "Unknown")
	print("[LICENSE] Type:", decoded.licenseType or "lifetime")

	-- Store verification data
	self.VerifiedData = decoded
	self.LastError = nil
	self.LastCheckTime = os.time()

	-- Persist to DataStore
	self:_SaveToDataStore({
		licenseKey = key,
		productId = pid,
		verifiedAt = DateTime.now():ToIsoDate(),
	})

	return decoded
end

-- ─── Re-verify using DataStore ───

function LicenseVerifier:ReVerify()
	local saved = self:_LoadFromDataStore()
	if not saved then
		return { success = false, reason = "NO_SAVED_LICENSE" }
	end
	return self:Verify(saved.licenseKey, saved.productId)
end

-- ─── Check if a re-verify is due ───

function LicenseVerifier:ShouldReVerify()
	local saved = self:_LoadFromDataStore()
	if not saved then return true end
	if not saved.verifiedAt then return true end
	local elapsed = os.time() - saved.verifiedAt
	return elapsed >= self.Config.REVERIFY_INTERVAL
end

-- ─── DataStore persistence ───

function LicenseVerifier:_SaveToDataStore(data)
	local success, err = pcall(function()
		self.Store:SetAsync("license_data", data)
	end)
	if not success then
		warn("[FlippStudios] DataStore save failed:", err)
	end
end

function LicenseVerifier:_LoadFromDataStore()
	local success, data = pcall(function()
		return self.Store:GetAsync("license_data")
	end)
	if success and data then
		return data
	end
	return nil
end

-- ─── Status queries ───

function LicenseVerifier:IsVerified()
	return self.VerifiedData ~= nil and self.VerifiedData.valid == true
end

function LicenseVerifier:GetProductName()
	if self.VerifiedData then
		return self.VerifiedData.productName or "Unknown Product"
	end
	return "Unknown Product"
end

function LicenseVerifier:GetLicenseType()
	if self.VerifiedData then
		return self.VerifiedData.licenseType or "lifetime"
	end
	return "unknown"
end

function LicenseVerifier:GetExpiresAt()
	if self.VerifiedData then
		return self.VerifiedData.expiresAt
	end
	return nil
end

function LicenseVerifier:GetLatestVersion()
	if self.VerifiedData then
		return self.VerifiedData.latestVersion or "1.0.0"
	end
	return "1.0.0"
end

function LicenseVerifier:GetLastError()
	return self.LastError
end

function LicenseVerifier:ClearVerification()
	self.VerifiedData = nil
	self.LastError = nil
	self.LastCheckTime = 0
end

return LicenseVerifier

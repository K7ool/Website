--[[
  RoMarketDev LicenseService
  Private server-only license package.

  Keep this ModuleScript in ServerScriptService. Product scripts only need to require this one module.
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local HttpService = game:GetService("HttpService")
local DataStoreService = game:GetService("DataStoreService")
local TextChatService = game:GetService("TextChatService")

local LicenseConfig = {
	PRODUCT_ID = "cNGSuYiXq9rRnQRmUXDX",
}

local LicenseSecurity = {}
function LicenseSecurity.GenerateHash(data)
	local copy = {}
	for k, v in pairs(data) do
		if k ~= "LicenseHash" then
			copy[k] = v
		end
	end
	local keys = {}
	for k in pairs(copy) do
		table.insert(keys, k)
	end
	table.sort(keys)
	local parts = {}
	for _, k in ipairs(keys) do
		local v = copy[k]
		if type(v) == "table" then
			parts[#parts + 1] = k .. "=" .. HttpService:JSONEncode(v)
		else
			parts[#parts + 1] = k .. "=" .. tostring(v)
		end
	end
	local serialized = table.concat(parts, "|")
	local hash = 0
	for i = 1, #serialized do
		hash = (hash * 37 + string.byte(serialized, i)) % 2^31
	end
	return tostring(hash)
end
function LicenseSecurity.Validate(data, hash)
	if not data or not hash then
		warn("[LICENSE_SECURITY] Missing activation data or hash - blocking cached activation")
		return false
	end
	local computed = LicenseSecurity.GenerateHash(data)
	if computed ~= hash then
		warn("[LICENSE_SECURITY] Hash mismatch - blocking cached activation")
		return false
	end
	return true
end
--[[
  LicenseRuntime.lua  (OPTIMIZED)
  Bootstrap cache (24h TTL), request dedup, recent-verify tracking.
]]
local LicenseRuntime = {}
-- ─── State ───
local state = {
	loaded = false,
	bootstrapFailed = false,
	productId = nil,
	verifyUrl = nil,
	sessionUrl = nil,
	statusUrl = nil,
	restoreUrl = nil,
	revokeCheckUrl = nil,
	activityUrl = nil,
	heartbeatUrl = nil,
	blacklistUrl = nil,
	resetTransferUrl = nil,
	features = nil,
	productName = nil,
	latestVersion = nil,
	company = nil,
	activated = false,
	sessionRestored = false,
	activationData = nil,
	playerVerified = {},
	productVerified = {},
	-- OPTIMIZATION: bootstrap cache
	bootstrapCache = nil,       -- cached data table
	bootstrapCacheTime = 0,     -- os.time when cached
	-- OPTIMIZATION: request dedup
	pendingRequests = {},       -- endpoint -> true
	-- OPTIMIZATION: recent verification timestamps per player
	lastVerifyTime = {},        -- player -> os.time
}
local BOOTSTRAP_BASE = "https://robloxdevmarket.vercel.app/api/license/bootstrap"
local LICENSE_STORE_NAME = "RoMarketDev_LicenseData"
local BOOTSTRAP_TTL = 86400   -- 24 hours
local RECENT_VERIFY_TTL = 21600 -- 6 hours
local licenseStore = DataStoreService:GetDataStore(LICENSE_STORE_NAME)
-- ─── Bootstrap with cache ───
function LicenseRuntime.Bootstrap(productId)
	-- Check cache first (24h TTL)
	if state.bootstrapCache and (os.time() - state.bootstrapCacheTime) < BOOTSTRAP_TTL then
		local cached = state.bootstrapCache
		state.loaded = true
		state.productId = cached.productId
		state.verifyUrl = cached.verifyUrl
		state.sessionUrl = cached.sessionUrl
		state.statusUrl = cached.statusUrl
		state.restoreUrl = cached.restoreUrl
		state.revokeCheckUrl = cached.revokeCheckUrl
		state.productName = cached.productName
		state.latestVersion = cached.latestVersion
		state.company = cached.company
		print("[BOOTSTRAP] Using cached data (age: " .. (os.time() - state.bootstrapCacheTime) .. "s)")
		return true
	end
	state.loaded = false
	state.bootstrapFailed = false
	print("[BOOTSTRAP] Fetching for productId:", productId)
	LicenseController:_FireAllPlayers("StatusUpdate", { text = "Fetching configuration...", status = "loading" })
	local url = BOOTSTRAP_BASE .. "?productId=" .. productId
	local timedOut = false
	local coro = coroutine.running()
	local timeoutThread = task.delay(15, function()
		timedOut = true
		coroutine.resume(coro)
	end)
	local httpOk, response = pcall(function()
		return HttpService:GetAsync(url, false)
	end)
	task.cancel(timeoutThread)
	if timedOut then
		warn("[BOOTSTRAP] Request timed out")
		state.bootstrapFailed = true
		return false, "Unable to load product configuration from RoMarketDev servers."
	end
	if not httpOk then
		warn("[BOOTSTRAP] HTTP error:", tostring(response))
		state.bootstrapFailed = true
		return false, "Unable to load product configuration from RoMarketDev servers."
	end
	local decodeOk, decoded = pcall(function()
		return HttpService:JSONDecode(response)
	end)
	if not decodeOk or type(decoded) ~= "table" or not decoded.success then
		warn("[BOOTSTRAP] Invalid response from server")
		state.bootstrapFailed = true
		return false, "Unable to load product configuration from RoMarketDev servers."
	end
	-- Update state
	state.loaded = true
	state.productId = decoded.productId or productId
	state.verifyUrl = decoded.verifyUrl or (BOOTSTRAP_BASE:gsub("/bootstrap$", "/verify"))
	state.sessionUrl = decoded.sessionUrl or (state.verifyUrl:gsub("/verify$", "/session"))
	state.statusUrl = decoded.statusUrl or (state.verifyUrl:gsub("/verify$", "/status"))
	state.restoreUrl = decoded.restoreUrl or (state.verifyUrl:gsub("/verify$", "/session"))
	state.revokeCheckUrl = decoded.revokeCheckUrl or (state.verifyUrl:gsub("/verify$", "/revoke-check"))
	state.activityUrl = decoded.activityUrl or (state.verifyUrl:gsub("/verify$", "/activity"))
	state.heartbeatUrl = decoded.heartbeatUrl or (state.verifyUrl:gsub("/verify$", "/heartbeat"))
	state.blacklistUrl = decoded.blacklistUrl or (state.verifyUrl:gsub("/verify$", "/blacklist"))
	state.resetTransferUrl = decoded.resetTransferUrl or (state.verifyUrl:gsub("/verify$", "/reset-transfer"))
	state.features = decoded.features or nil
	state.productName = decoded.productName or "Unknown Product"
	state.latestVersion = decoded.latestVersion or "1.0.0"
	state.company = decoded.company or "RoMarketDev"
	-- Save to cache
	state.bootstrapCache = {
		productId = state.productId,
		verifyUrl = state.verifyUrl,
		sessionUrl = state.sessionUrl,
		statusUrl = state.statusUrl,
		restoreUrl = state.restoreUrl,
		revokeCheckUrl = state.revokeCheckUrl,
		activityUrl = state.activityUrl,
		heartbeatUrl = state.heartbeatUrl,
		blacklistUrl = state.blacklistUrl,
		resetTransferUrl = state.resetTransferUrl,
		features = state.features,
		productName = state.productName,
		latestVersion = state.latestVersion,
		company = state.company,
	}
	state.bootstrapCacheTime = os.time()
	print("[BOOTSTRAP] Success! Cached for 24h")
	LicenseController:_FireAllPlayers("StatusUpdate", { text = "Configuration loaded", status = "success" })
	return true
end
-- ─── Request deduplication ───
function LicenseRuntime.IsRequestPending(endpoint)
	return state.pendingRequests[endpoint] == true
end
function LicenseRuntime.MarkRequestPending(endpoint)
	state.pendingRequests[endpoint] = true
end
function LicenseRuntime.MarkRequestComplete(endpoint)
	state.pendingRequests[endpoint] = nil
end
-- ─── Recent verification tracking ───
function LicenseRuntime.IsRecentlyVerified(player)
	if not player then return false end
	local t = state.lastVerifyTime[player]
	if not t then return false end
	return (os.time() - t) < RECENT_VERIFY_TTL
end
function LicenseRuntime.SetLastVerifyTime(player)
	if not player then return end
	state.lastVerifyTime[player] = os.time()
end
function LicenseRuntime.ClearLastVerifyTime(player)
	if player then
		state.lastVerifyTime[player] = nil
	end
end
-- ─── Activation DataStore ───
local function activationKey()
	return "Activation_" .. tostring(game.GameId)
end
function LicenseRuntime.LoadActivation()
	local key = activationKey()
	print("[LICENSE_CACHE] Loading activation from key:", key)
	local ok, data = pcall(function()
		return licenseStore:GetAsync(key)
	end)
	if not ok then
		print("[LICENSE_CACHE] DataStore GetAsync error:", tostring(data))
		return false
	end
	if not data or type(data) ~= "table" then
		print("[LICENSE_CACHE] No saved activation found")
		return false
	end
	if not LicenseSecurity.Validate(data, data.LicenseHash) then
		warn("[LICENSE_CACHE] Saved activation failed integrity validation; clearing it")
		pcall(function()
			licenseStore:RemoveAsync(key)
		end)
		return false
	end
	state.activated = true
	state.activationData = data
	print("[LICENSE_CACHE] Activation loaded. LicenseId:", data.LicenseId)
	return true
end
function LicenseRuntime.SaveActivation(data)
	if type(data) ~= "table" then return false end
	data.LicenseHash = LicenseSecurity.GenerateHash(data)
	data.LastSync = os.time()
	local key = activationKey()
	local ok, err = pcall(function()
		licenseStore:SetAsync(key, data)
	end)
	if not ok then
		warn("[LICENSE_RUNTIME] Failed to save activation:", tostring(err))
		return false
	end
	state.activated = true
	state.activationData = data
	print("[LICENSE_RUNTIME] Activation saved. LicenseId:", data.LicenseId)
	return true
end
function LicenseRuntime.ClearActivation()
	local key = activationKey()
	pcall(function()
		licenseStore:RemoveAsync(key)
	end)
	state.activated = false
	state.activationData = nil
	for player, _ in pairs(state.playerVerified) do
		state.playerVerified[player] = nil
	end
	for player, _ in pairs(state.productVerified) do
		state.productVerified[player] = nil
	end
	for player, _ in pairs(state.lastVerifyTime) do
		state.lastVerifyTime[player] = nil
	end
	print("[LICENSE_RUNTIME] Activation cleared")
end
-- ─── Getters ───
function LicenseRuntime.IsLoaded()
	return state.loaded
end
function LicenseRuntime.BootstrapFailed()
	return state.bootstrapFailed
end
function LicenseRuntime.GetVerifyUrl() return state.verifyUrl end
function LicenseRuntime.GetStatusUrl() return state.statusUrl end
function LicenseRuntime.GetSessionUrl() return state.sessionUrl end
function LicenseRuntime.GetRestoreUrl() return state.restoreUrl end
function LicenseRuntime.GetRevokeCheckUrl() return state.revokeCheckUrl end
function LicenseRuntime.GetActivityUrl() return state.activityUrl end
function LicenseRuntime.GetHeartbeatUrl() return state.heartbeatUrl end
function LicenseRuntime.GetBlacklistUrl() return state.blacklistUrl end
function LicenseRuntime.GetResetTransferUrl() return state.resetTransferUrl end
function LicenseRuntime.GetFeatures() return state.features end
function LicenseRuntime.SetFeatures(features) state.features = features end
function LicenseRuntime.GetProductName() return state.productName or "Unknown Product" end
function LicenseRuntime.GetLatestVersion() return state.latestVersion or "1.0.0" end
function LicenseRuntime.GetCompany() return state.company or "RoMarketDev" end
function LicenseRuntime.GetProductId() return state.productId end
function LicenseRuntime.IsActivated() return state.activated end
function LicenseRuntime.GetActivation() return state.activationData end
function LicenseRuntime.IsSessionRestored() return state.sessionRestored end
function LicenseRuntime.SetSessionRestored() state.sessionRestored = true end
function LicenseRuntime.ClearSessionRestored() state.sessionRestored = false end
function LicenseRuntime.GetIntegrityHash()
	if state.activationData then
		return state.activationData.LicenseHash
	end
	return nil
end
-- ─── Player verification ───
function LicenseRuntime.IsVerified(player)
	if not player then return false end
	if not state.activated then return false end
	return state.playerVerified[player] == true
end
function LicenseRuntime.SetVerified(player)
	if not player then return end
	state.playerVerified[player] = true
	state.lastVerifyTime[player] = os.time()
end
function LicenseRuntime.ClearVerification(player)
	if player then
		state.playerVerified[player] = nil
		state.lastVerifyTime[player] = nil
	end
end
function LicenseRuntime.IsProductVerified(player)
	if not player then return false end
	return state.productVerified[player] == true
end
function LicenseRuntime.SetProductVerified(player)
	if not player then return end
	state.productVerified[player] = true
end
function LicenseRuntime.ClearProductVerification(player)
	if player then
		state.productVerified[player] = nil
	end
end
LicenseRuntime.ShowVerificationUI = nil
LicenseRuntime._controllerRef = nil
function LicenseRuntime.RequireVerification(player)
	if LicenseRuntime.IsVerified(player) then
		print("[LICENSE_RUNTIME] RequireVerification: PASSED (cached)")
		return true
	end
	-- Skip API call if recently verified (6h window)
	if LicenseRuntime.IsRecentlyVerified(player) then
		print("[LICENSE_RUNTIME] RequireVerification: PASSED (recently verified, within 6h)")
		LicenseRuntime.SetVerified(player)
		return true
	end
	if LicenseRuntime._controllerRef then
		local restored = LicenseRuntime._controllerRef:_SilentReVerify(player)
		if restored then
			print("[LICENSE_RUNTIME] RequireVerification: restore succeeded")
			return true
		end
	end
	print("[LICENSE_RUNTIME] RequireVerification: FAILED, showing UI")
	if LicenseRuntime.ShowVerificationUI then
		LicenseRuntime.ShowVerificationUI(player)
	end
	return false
end
function LicenseRuntime.GetConfig()
	return {
		loaded = state.loaded,
		bootstrapFailed = state.bootstrapFailed,
		productId = state.productId,
		verifyUrl = state.verifyUrl,
		sessionUrl = state.sessionUrl,
		statusUrl = state.statusUrl,
		restoreUrl = state.restoreUrl,
		revokeCheckUrl = state.revokeCheckUrl,
		productName = state.productName,
		latestVersion = state.latestVersion,
		company = state.company,
		features = state.features,
		activated = state.activated,
		sessionRestored = state.sessionRestored,
		bootstrapCached = state.bootstrapCache ~= nil,
	}
end
--[[
  LicenseController.lua  (OPTIMIZED)
  No duplicate sync loops. Randomized revoke check (3-6h). Request dedup.
  Session restore skipped if recently verified (6h window).
  No API calls on player join when activation exists locally.
]]
local LicenseController = {}
local RemoteEvent = ReplicatedStorage:FindFirstChild("RoMarketDev_LicenseEvent")
if not RemoteEvent then
	RemoteEvent = Instance.new("RemoteEvent")
	RemoteEvent.Name = "RoMarketDev_LicenseEvent"
	RemoteEvent.Parent = ReplicatedStorage
end
local Verifier = nil
local ProtectedCallback = nil
local IsRunning = false
local ActivationInProgress = false
local BOOTSTRAP_TIMEOUT = 15
local ErrorMessages = {
	MISSING_LICENSE_KEY = "License key is missing. Please enter your key.",
	LICENSE_NOT_FOUND = "License key not found. Please check your key and try again.",
	LICENSE_REVOKED = "This license has been revoked. Please contact support.",
	LICENSE_NOT_ACTIVE = "This license is not active. Please contact support.",
	OWNER_MISMATCH = "License ownership mismatch. This key belongs to another user.",
	LICENSE_EXPIRED = "This license has expired. Please renew your license.",
	PRODUCT_MISMATCH = "This license does not match the product. Please check your configuration.",
	UNIVERSE_MISMATCH = "This license is bound to a different Roblox experience.",
	CREATOR_MISMATCH = "This license is bound to a different creator.",
	USER_MISMATCH = "This license is bound to a different user.",
	RATE_LIMIT_EXCEEDED = "Too many verification attempts. Please wait and try again.",
	SERVER_ERROR = "The verification server encountered an error. Please try again later.",
	HTTP_ERROR = "Could not reach the verification server. Please check your internet connection.",
	TIMEOUT = "Verification timed out. The server may be down or unreachable.",
	INVALID_RESPONSE = "Received an invalid response from the server.",
	INTERNAL_ERROR = "An internal error occurred. Please try again.",
	BOOTSTRAP_FAILED = "Unable to load product configuration from RoMarketDev servers.",
	UNKNOWN = "An unknown error occurred. Please contact support.",
}
function LicenseController:GetErrorMessage(reason)
	return ErrorMessages[reason] or ErrorMessages.UNKNOWN
end
function LicenseController:_FireUI(player, eventType, data)
	local args = { eventType }
	if data then table.insert(args, data) end
	RemoteEvent:FireClient(player, unpack(args))
end
function LicenseController:_FireTimeline(player, stepId, status)
	self:_FireUI(player, "TimelineStep", { stepId = stepId, status = status })
end
function LicenseController:_FireLog(player, source, message)
	self:_FireUI(player, "LogEntry", { source = source, message = message })
end
function LicenseController:_FireAllPlayers(eventType, data)
	for _, player in ipairs(Players:GetPlayers()) do
		self:_FireUI(player, eventType, data)
	end
end
-- ─── HTTP helper ───
function LicenseController:_PostJson(url, payload, timeoutSeconds)
	if not url then return nil, "NO_URL" end
	local jsonOk, payloadJson = pcall(function()
		return HttpService:JSONEncode(payload)
	end)
	if not jsonOk then return nil, "JSON_ENCODE_FAILED" end
	timeoutSeconds = timeoutSeconds or 10
	local timedOut = false
	local coro = coroutine.running()
	local timeoutThread = task.delay(timeoutSeconds, function()
		timedOut = true
		coroutine.resume(coro)
	end)
	local httpOk, httpResponse = pcall(function()
		return HttpService:RequestAsync({
			Url = url,
			Method = "POST",
			Headers = { ["Content-Type"] = "application/json" },
			Body = payloadJson,
		})
	end)
	task.cancel(timeoutThread)
	if timedOut then return nil, "TIMEOUT" end
	if not httpOk then return nil, "HTTP_ERROR" end
	local decoded
	local decodeOk = pcall(function()
		decoded = HttpService:JSONDecode(httpResponse.Body)
	end)
	if not decodeOk or not decoded then return nil, "INVALID_RESPONSE" end
	return decoded, nil, httpResponse.StatusCode
end
-- ─── Activation request (one-time, deduped) ───
function LicenseController:_OnActivateRequest(player, licenseKey)
	if not player then return end
	if ActivationInProgress then
		print("[LICENSE_CONTROLLER] Activation already in progress — ignoring")
		return
	end
	if not licenseKey or licenseKey == "" then
		self:_FireUI(player, "Error", { reason = "MISSING_LICENSE_KEY", message = ErrorMessages.MISSING_LICENSE_KEY })
		return
	end
	if LicenseRuntime.IsActivated() and LicenseRuntime.IsVerified(player) then
		self:_FireUI(player, "Success", { productName = LicenseRuntime.GetProductName() })
		return
	end
	print("[LICENSE_CONTROLLER] Activation request from", player.Name)
	self:_FireUI(player, "StatusUpdate", { text = "Verifying license key...", status = "loading" })
	self:_FireUI(player, "Verifying", nil)
	self:_FireTimeline(player, "verifying", "active")
	self:_FireLog(player, "VERIFY", "Verifying license key...")
	-- Check blacklist
	local blacklistUrl = LicenseRuntime.GetBlacklistUrl()
	if blacklistUrl then
		local blResult, blErr = self:_PostJson(blacklistUrl, {
			type = "placeId",
			value = tostring(game.PlaceId),
		}, 5)
		if blResult and blResult.blacklisted == true then
			ActivationInProgress = false
			warn("[LICENSE_CONTROLLER] Server blacklisted!", game.PlaceId)
			self:_FireUI(player, "Error", { reason = "BLACKLISTED", message = "This server is blacklisted. Please contact support." })
			return
		end
		local blUniverseResult, blUniverseErr = self:_PostJson(blacklistUrl, {
			type = "universeId",
			value = tostring(game.GameId),
		}, 5)
		if blUniverseResult and blUniverseResult.blacklisted == true then
			ActivationInProgress = false
			warn("[LICENSE_CONTROLLER] Universe blacklisted!", game.GameId)
			self:_FireUI(player, "Error", { reason = "BLACKLISTED", message = "This experience is blacklisted. Please contact support." })
			return
		end
	end
	ActivationInProgress = true
	local ctx = {
		placeId = game.PlaceId,
		universeId = game.GameId,
		creatorId = game.CreatorId,
	}
	local payload = {
		licenseKey = licenseKey,
		productId = LicenseRuntime.GetProductId() or LicenseConfig.PRODUCT_ID,
		placeId = ctx.placeId,
		universeId = ctx.universeId,
		creatorId = ctx.creatorId,
		robloxUserId = player.UserId,
		gameName = game.Name,
	}
	local jsonOk, payloadJson = pcall(function()
		return HttpService:JSONEncode(payload)
	end)
	if not jsonOk then
		ActivationInProgress = false
		self:_FireUI(player, "Error", { reason = "INTERNAL_ERROR", message = ErrorMessages.INTERNAL_ERROR })
		return
	end
	local url = LicenseRuntime.GetVerifyUrl()
	if not url then
		ActivationInProgress = false
		self:_FireUI(player, "Error", { reason = "BOOTSTRAP_FAILED", message = ErrorMessages.BOOTSTRAP_FAILED })
		return
	end
	local timedOut = false
	local coro = coroutine.running()
	local timeoutThread = task.delay(10, function()
		timedOut = true
		coroutine.resume(coro)
	end)
	local httpOk, httpResponse = pcall(function()
		return HttpService:RequestAsync({
			Url = url,
			Method = "POST",
			Headers = { ["Content-Type"] = "application/json" },
			Body = payloadJson,
		})
	end)
	task.cancel(timeoutThread)
	ActivationInProgress = false
	if timedOut then
		warn("[LICENSE_CONTROLLER] Activation request timed out")
		self:_FireUI(player, "Error", { reason = "TIMEOUT", message = ErrorMessages.TIMEOUT })
		return
	end
	if not httpOk then
		self:_FireUI(player, "Error", { reason = "HTTP_ERROR", message = ErrorMessages.HTTP_ERROR })
		return
	end
	local decoded
	local decodeOk = pcall(function()
		decoded = HttpService:JSONDecode(httpResponse.Body)
	end)
	if not decodeOk or not decoded then
		self:_FireUI(player, "Error", { reason = "INVALID_RESPONSE", message = ErrorMessages.INVALID_RESPONSE })
		return
	end
	local statusCode = httpResponse.StatusCode
	if statusCode >= 200 and statusCode < 300 and decoded.valid == true then
		print("[LICENSE_CONTROLLER] Activation SUCCESS for", player.Name)
		self:_FireUI(player, "StatusUpdate", { text = "License activated!", status = "success" })
		self:_FireTimeline(player, "verifying", "complete")
		self:_FireLog(player, "VERIFY", "License accepted")
		-- Log activity
		local activityUrl = LicenseRuntime.GetActivityUrl()
		if activityUrl then
			self:_PostJson(activityUrl, {
				licenseKey = licenseKey,
				licenseId = decoded.licenseId or licenseKey,
				userId = tostring(player.UserId),
				type = "activate",
				details = {
					universeId = game.GameId,
					placeId = game.PlaceId,
					playerName = player.Name,
				},
			}, 5)
		end
		-- Store features from verify response
		if decoded.features and type(decoded.features) == "table" then
			LicenseRuntime.SetFeatures(decoded.features)
		end
		local activationRecord = {
			LicenseId = decoded.licenseId or decoded.licenseKey or tostring(HttpService:GenerateGUID(false)),
			LicenseKey = decoded.licenseKey or "",
			ProductId = LicenseRuntime.GetProductId() or LicenseConfig.PRODUCT_ID,
			UniverseId = ctx.universeId,
			ActivatedAt = os.time(),
			LastSync = os.time(),
			Status = "active",
			Features = decoded.features or nil,
		}
		-- First heartbeat (after activationRecord created)
		local heartbeatUrl = LicenseRuntime.GetHeartbeatUrl()
		if heartbeatUrl then
			local hbResult = self:_PostJson(heartbeatUrl, {
				licenseId = activationRecord.LicenseId,
				licenseKey = activationRecord.LicenseKey,
				universeId = game.GameId,
				placeId = game.PlaceId,
				serverId = tostring(game.JobId),
				playerCount = #Players:GetPlayers(),
				maxPlayers = 50,
				gameName = game.Name,
			}, 5)
			if hbResult and hbResult.sessionId then
				activationRecord.SessionId = hbResult.sessionId
				activationRecord.ServerJobId = tostring(game.JobId)
			end
		end
		if not LicenseRuntime.SaveActivation(activationRecord) then
			self:_FireUI(player, "Error", { reason = "INTERNAL_ERROR", message = "Failed to save activation. Please try again." })
			return
		end
		LicenseRuntime.SetVerified(player)
		LicenseRuntime.SetLastVerifyTime(player)
		player:SetAttribute("LicenseVerified", true)
		self:_FireTimeline(player, "activated", "complete")
		self:_FireLog(player, "SUCCESS", "Product activated")
		self:_FireUI(player, "Success", {
			productName = LicenseRuntime.GetProductName(),
			version = LicenseRuntime.GetLatestVersion(),
			company = LicenseRuntime.GetCompany(),
			universeId = tostring(ctx.universeId),
			expiresAt = decoded.expiresAt or "—",
			licenseType = "Full",
		})
		self:_StartProtectedSystem()
	elseif decoded.reason == "UNIVERSE_MISMATCH" or decoded.reason == "CREATOR_MISMATCH" or decoded.reason == "USER_MISMATCH" or (decoded.message and decoded.message:find("already bound")) then
		self:_FireUI(player, "StatusUpdate", { text = "Already bound", status = "error" })
		self:_FireTimeline(player, "universe_binding", "error")
		self:_FireLog(player, "BOUND", "License is already bound to another " .. (decoded.reason == "CREATOR_MISMATCH" and "creator" or decoded.reason == "USER_MISMATCH" and "user" or "experience"))
		self:_FireUI(player, "Bound", {
			productName = decoded.productName or LicenseRuntime.GetProductName(),
			universeId = decoded.boundUniverseId or "—",
			message = "This license is already activated in another Roblox experience.",
		})
	else
		local reason = decoded.reason or "UNKNOWN"
		self:_FireUI(player, "StatusUpdate", { text = LicenseController:GetErrorMessage(reason), status = "error" })
		self:_FireTimeline(player, "verifying", "error")
		self:_FireLog(player, "ERROR", ErrorMessages[reason] or ErrorMessages.UNKNOWN)
		self:_FireUI(player, "Error", { reason = reason, message = LicenseController:GetErrorMessage(reason) })
	end
end
-- ─── Silent session restore (deduped, rate-limited) ───
function LicenseController:_SilentReVerify(player)
	if not player then return false end
	-- OPTIMIZATION: skip if recently verified within 6h
	if LicenseRuntime.IsRecentlyVerified(player) then
		print("[SESSION_RESTORE] Skipped —", player.Name, "verified within 6h")
		return true
	end
	-- OPTIMIZATION: request deduplication
	local dedupKey = "session:" .. player.UserId
	if LicenseRuntime.IsRequestPending(dedupKey) then
		print("[SESSION_RESTORE] Request already pending for", player.Name, "— reusing")
		return false
	end
	LicenseRuntime.MarkRequestPending(dedupKey)
	local sessionUrl = LicenseRuntime.GetSessionUrl()
	if not sessionUrl then
		LicenseRuntime.MarkRequestComplete(dedupKey)
		return false
	end
	local payload = {
		universeId = game.GameId,
		creatorId = game.CreatorId,
		productId = LicenseRuntime.GetProductId() or LicenseConfig.PRODUCT_ID,
		userId = player.UserId,
	}
	local jsonOk, payloadJson = pcall(function()
		return HttpService:JSONEncode(payload)
	end)
	if not jsonOk then
		LicenseRuntime.MarkRequestComplete(dedupKey)
		return false
	end
	self:_FireUI(player, "StatusUpdate", { text = "Restoring session...", status = "loading" })
	print("[SESSION_RESTORE] Silent re-verify", player.Name)
	local timedOut = false
	local coro = coroutine.running()
	local timeoutThread = task.delay(10, function()
		timedOut = true
		coroutine.resume(coro)
	end)
	local httpOk, httpResponse = pcall(function()
		return HttpService:RequestAsync({
			Url = sessionUrl,
			Method = "POST",
			Headers = { ["Content-Type"] = "application/json" },
			Body = payloadJson,
		})
	end)
	task.cancel(timeoutThread)
	LicenseRuntime.MarkRequestComplete(dedupKey)
	if timedOut then
		warn("[SESSION_RESTORE] Request timed out for", player.Name)
		return false
	end
	if not httpOk then
		warn("[SESSION_RESTORE] HTTP error for", player.Name)
		return false
	end
	local decoded
	local decodeOk = pcall(function()
		decoded = HttpService:JSONDecode(httpResponse.Body)
	end)
	if not decodeOk or not decoded then
		return false
	end
	local statusCode = httpResponse.StatusCode
	if statusCode < 200 or statusCode >= 300 then
		return false
	end
	if decoded.verified == true then
		print("[SESSION_RESTORE] Verified for", player.Name)
		self:_FireUI(player, "StatusUpdate", { text = "Session restored", status = "success" })
		self:_FireTimeline(player, "session_restore", "complete")
		self:_FireTimeline(player, "universe_binding", "complete")
		self:_FireTimeline(player, "revocation", "complete")
		self:_FireTimeline(player, "activated", "complete")
		self:_FireLog(player, "SESSION", "Session restored successfully")
		local activationRecord = {
			LicenseId = decoded.licenseId or decoded.licenseKey or tostring(HttpService:GenerateGUID(false)),
			LicenseKey = decoded.licenseKey or "",
			ProductId = LicenseRuntime.GetProductId() or LicenseConfig.PRODUCT_ID,
			UniverseId = game.GameId,
			ActivatedAt = os.time(),
			LastSync = os.time(),
			Status = "active",
		}
		LicenseRuntime.SaveActivation(activationRecord)
		LicenseRuntime.SetSessionRestored()
		LicenseRuntime.SetVerified(player)
		LicenseRuntime.SetLastVerifyTime(player)
		player:SetAttribute("LicenseVerified", true)
		return true
	elseif decoded.revoked == true or decoded.reason == "LICENSE_REVOKED" then
		warn("[SESSION_RESTORE] License REVOKED for", player.Name)
		self:_FireUI(player, "StatusUpdate", { text = "License revoked", status = "error" })
		self:_FireTimeline(player, "revocation", "error")
		self:_FireLog(player, "REVOKED", "License has been revoked")
		LicenseRuntime.ClearActivation()
		LicenseRuntime.ClearVerification(player)
		player:SetAttribute("LicenseVerified", nil)
		IsRunning = false
		return false
	else
		print("[SESSION_RESTORE] No session for", player.Name, "reason:", decoded.reason)
		return false
	end
end
-- ─── Revoke check (randomized 3-6h) ───
local REVOKE_CHECK_BASE = 21600  -- 6h base
local REVOKE_CHECK_JITTER = 10800 -- +/- 3h
function LicenseController:_NextRevokeDelay()
	return REVOKE_CHECK_BASE + math.random(-REVOKE_CHECK_JITTER, REVOKE_CHECK_JITTER)
end
function LicenseController:_RevokeCheckLoop()
	while true do
		local delay = self:_NextRevokeDelay()
		print("[LICENSE_CONTROLLER] Next revoke check in", delay, "seconds (", math.floor(delay/3600), "h)")
		task.wait(delay)
		if not LicenseRuntime.IsActivated() then
			print("[LICENSE_CONTROLLER] No activation — revoke check skipped")
			continue
		end
		self:_CheckRevoked()
	end
end
function LicenseController:_CheckRevoked()
	local revokeUrl = LicenseRuntime.GetRevokeCheckUrl()
	if not revokeUrl then return nil end
	-- OPTIMIZATION: deduplicate revoke checks
	if LicenseRuntime.IsRequestPending("revoke-check") then
		print("[REVOKE_CHECK] Request already pending, skipping")
		return nil
	end
	LicenseRuntime.MarkRequestPending("revoke-check")
	local payload = {
		universeId = game.GameId,
		productId = LicenseRuntime.GetProductId() or LicenseConfig.PRODUCT_ID,
	}
	local jsonOk, payloadJson = pcall(function()
		return HttpService:JSONEncode(payload)
	end)
	if not jsonOk then
		LicenseRuntime.MarkRequestComplete("revoke-check")
		return nil
	end
	local httpOk, httpResponse = pcall(function()
		return HttpService:RequestAsync({
			Url = revokeUrl,
			Method = "POST",
			Headers = { ["Content-Type"] = "application/json" },
			Body = payloadJson,
		})
	end)
	LicenseRuntime.MarkRequestComplete("revoke-check")
	if not httpOk then return nil end
	local decoded
	local decodeOk = pcall(function()
		decoded = HttpService:JSONDecode(httpResponse.Body)
	end)
	if not decodeOk or not decoded then return nil end
	if decoded.revoked == true then
		print("[REVOKE_CHECK] License REVOKED!")
		-- Log revoke activity
		local activityUrl = LicenseRuntime.GetActivityUrl()
		if activityUrl then
			local activation = LicenseRuntime.GetActivation()
			self:_PostJson(activityUrl, {
				licenseKey = (activation and activation.LicenseKey) or nil,
				type = "revoke",
				details = {
					universeId = game.GameId,
					placeId = game.PlaceId,
					playerCount = #Players:GetPlayers(),
				},
			}, 5)
		end
		LicenseRuntime.ClearActivation()
		IsRunning = false
		for _, player in ipairs(Players:GetPlayers()) do
			LicenseRuntime.ClearVerification(player)
			player:SetAttribute("LicenseVerified", nil)
			self:_FireUI(player, "Revoked", { message = "License has been revoked." })
		end
		return true
	end
	if decoded.active == false then
		print("[REVOKE_CHECK] License no longer active")
		LicenseRuntime.ClearActivation()
		IsRunning = false
		for _, player in ipairs(Players:GetPlayers()) do
			LicenseRuntime.ClearVerification(player)
			player:SetAttribute("LicenseVerified", nil)
		end
		return true
	end
	print("[REVOKE_CHECK] License still valid")
	return false
end
-- ─── Heartbeat loop (every 5 min) ───
function LicenseController:_HeartbeatLoop()
	while true do
		task.wait(300)
		if not LicenseRuntime.IsActivated() then continue end
		local heartbeatUrl = LicenseRuntime.GetHeartbeatUrl()
		local activation = LicenseRuntime.GetActivation()
		if not heartbeatUrl or not activation then continue end
		if LicenseRuntime.IsRequestPending("heartbeat") then continue end
		LicenseRuntime.MarkRequestPending("heartbeat")
		local payload = {
			licenseId = activation.LicenseId,
			licenseKey = activation.LicenseKey,
			universeId = game.GameId,
			placeId = game.PlaceId,
			serverId = tostring(game.JobId),
			playerCount = #Players:GetPlayers(),
			maxPlayers = 50,
			gameName = game.Name,
		}
		if activation.SessionId then
			payload.sessionId = activation.SessionId
		end
		self:_PostJson(heartbeatUrl, payload, 5)
		LicenseRuntime.MarkRequestComplete("heartbeat")
	end
end
-- ─── Protected system ───
function LicenseController:_StartProtectedSystem()
	if IsRunning then return end
	if not ProtectedCallback then return end
	IsRunning = true
	task.spawn(function()
		local success, err = pcall(ProtectedCallback)
		if not success then
			warn("[LICENSE_CONTROLLER] Protected system error:", err)
		end
	end)
end
-- ─── Bootstrap ───
function LicenseController:_Bootstrap()
	print("[LICENSE_CONTROLLER] Bootstrapping LicenseRuntime...")
	local ok, err = LicenseRuntime.Bootstrap(LicenseConfig.PRODUCT_ID)
	if not ok then
		warn("[LICENSE_CONTROLLER] Bootstrap FAILED:", tostring(err))
		self:_FireAllPlayers("TimelineStep", { stepId = "bootstrap_config", status = "error" })
		self:_FireAllPlayers("LogEntry", { source = "ERROR", message = ErrorMessages.BOOTSTRAP_FAILED })
		for _, player in ipairs(Players:GetPlayers()) do
			self:_FireUI(player, "Error", { reason = "BOOTSTRAP_FAILED", message = ErrorMessages.BOOTSTRAP_FAILED })
		end
		Players.PlayerAdded:Connect(function(player)
			self:_FireUI(player, "Error", { reason = "BOOTSTRAP_FAILED", message = ErrorMessages.BOOTSTRAP_FAILED })
		end)
		return false
	end
	self:_FireAllPlayers("TimelineStep", { stepId = "bootstrap_config", status = "complete" })
	self:_FireAllPlayers("TimelineStep", { stepId = "connecting", status = "active" })
	task.wait(0.3)
	self:_FireAllPlayers("TimelineStep", { stepId = "connecting", status = "complete" })
	self:_FireAllPlayers("TimelineStep", { stepId = "product_info", status = "active" })
	print("[LICENSE_CONTROLLER] Bootstrap succeeded")
	self:_FireAllPlayers("TimelineStep", { stepId = "product_info", status = "complete" })
	self:_FireAllPlayers("LogEntry", { source = "SYSTEM", message = "Product configuration loaded successfully" })
	self:_FireAllPlayers("ProductInfo", {
		productName = LicenseRuntime.GetProductName(),
		latestVersion = LicenseRuntime.GetLatestVersion(),
		company = LicenseRuntime.GetCompany(),
	})
	return true
end
-- ─── Public API ───
function LicenseController:Start(callback)
	ProtectedCallback = callback
	print("[LICENSE_CONTROLLER] Starting...")
	local bootstrapOk = self:_Bootstrap()
	if not bootstrapOk then
		warn("[LICENSE_CONTROLLER] Cannot start — bootstrap failed")
		return
	end
	local activationLoaded = LicenseRuntime.LoadActivation()
	if activationLoaded then
		print("[LICENSE_CONTROLLER] Existing activation found")
	end
	LicenseRuntime.ShowVerificationUI = function(player)
		self:_FireUI(player, "StatusUpdate", { text = "Enter your license key", status = "info" })
		self:_FireUI(player, "ShowUI", {})
	end
	LicenseRuntime._controllerRef = self
	-- RemoteEvent listener
	RemoteEvent.OnServerEvent:Connect(function(player, eventType, ...)
		if eventType == "ActivateLicense" then
			self:_OnActivateRequest(player, ...)
		elseif eventType == "RequestUI" then
			if LicenseRuntime.IsVerified(player) then
				print("[LICENSE_CONTROLLER] RequestUI blocked —", player.Name, "already verified")
				return
			end
			-- OPTIMIZATION: skip silent re-verify if recently verified
			if LicenseRuntime.IsRecentlyVerified(player) then
				print("[LICENSE_CONTROLLER] RequestUI — recently verified, restoring cached state")
				LicenseRuntime.SetVerified(player)
				player:SetAttribute("LicenseVerified", true)
				return
			end
			local restored = self:_SilentReVerify(player)
			if not restored then
				self:_FireTimeline(player, "bootstrap_config", "complete")
				self:_FireTimeline(player, "connecting", "complete")
				self:_FireTimeline(player, "product_info", "complete")
				self:_FireUI(player, "ProductInfo", {
					productName = LicenseRuntime.GetProductName(),
					latestVersion = LicenseRuntime.GetLatestVersion(),
					company = LicenseRuntime.GetCompany(),
				})
				if LicenseRuntime.ShowVerificationUI then
					LicenseRuntime.ShowVerificationUI(player)
				end
			end
		end
	end)
	-- Player joins — NO API call on join if activation exists locally
	Players.PlayerAdded:Connect(function(player)
		print("[LICENSE_CONTROLLER] Player joined:", player.Name)
		task.wait(1)
		self:_FireUI(player, "TimelineStep", { stepId = "bootstrap_config", status = "complete" })
		self:_FireUI(player, "TimelineStep", { stepId = "connecting", status = "complete" })
		self:_FireUI(player, "TimelineStep", { stepId = "product_info", status = "complete" })
		self:_FireUI(player, "ProductInfo", {
			productName = LicenseRuntime.GetProductName(),
			latestVersion = LicenseRuntime.GetLatestVersion(),
			company = LicenseRuntime.GetCompany(),
		})
		if LicenseRuntime.IsActivated() then
			-- OPTIMIZATION: Set verified immediately from local DataStore.
			-- NO session restore API call on join.
			print("[LICENSE_CONTROLLER] Activation exists — verifying locally for", player.Name)
			LicenseRuntime.SetVerified(player)
			LicenseRuntime.SetLastVerifyTime(player)
			player:SetAttribute("LicenseVerified", true)
			LicenseRuntime.SetProductVerified(player)
			self:_StartProtectedSystem()
		else
			-- OPTIMIZATION: try one silent restore, but only once per join
			print("[LICENSE_CONTROLLER] No local activation — checking session for", player.Name)
			task.spawn(function()
				local restored = self:_SilentReVerify(player)
				if restored then
					LicenseRuntime.SetProductVerified(player)
					self:_StartProtectedSystem()
				else
					print("[LICENSE_CONTROLLER] No session for", player.Name, "— player must activate")
				end
			end)
		end
	end)
	-- Chat /verify command
	local chatCommands = TextChatService:FindFirstChild("Commands")
	if not chatCommands then
		chatCommands = Instance.new("Folder")
		chatCommands.Name = "Commands"
		chatCommands.Parent = TextChatService
	end
	local verifyCommand = Instance.new("TextChatCommand")
	verifyCommand.Name = "verify"
	verifyCommand.PrimaryAlias = "/verify"
	verifyCommand.Parent = chatCommands
	verifyCommand.Triggered:Connect(function(originTextSource, unfilteredText)
		local player = Players:GetPlayerByUserId(originTextSource.UserId)
		if not player then return end
		if LicenseRuntime.IsVerified(player) then
			return
		end
		if LicenseRuntime.IsRecentlyVerified(player) then
			LicenseRuntime.SetVerified(player)
			player:SetAttribute("LicenseVerified", true)
			return
		end
		self:_FireTimeline(player, "bootstrap_config", "complete")
		self:_FireTimeline(player, "connecting", "complete")
		self:_FireTimeline(player, "product_info", "complete")
		local restored = self:_SilentReVerify(player)
		if not restored then
			self:_FireTimeline(player, "session_restore", "error")
			LicenseRuntime.ShowVerificationUI(player)
		end
	end)
	Players.PlayerRemoving:Connect(function(player)
		LicenseRuntime.ClearVerification(player)
		player:SetAttribute("LicenseVerified", nil)
	end)
	-- OPTIMIZATION: Single loop — randomized revoke check only (3-6h)
	-- No separate 24h sync loop (removed — revoke check covers both)
	task.spawn(function()
		if LicenseRuntime.IsActivated() then
			self:_RevokeCheckLoop()
		else
			while not LicenseRuntime.IsActivated() do
				task.wait(30)
			end
			self:_RevokeCheckLoop()
		end
	end)
	-- Heartbeat loop (starts immediately, only heartbeats when activated)
	task.spawn(function()
		self:_HeartbeatLoop()
	end)
	print("[LICENSE_CONTROLLER] License system fully started (OPTIMIZED)")
end
local LicenseService = {}
local Started = false

local function defaultProtectedCallback()
	print("[LICENSE_SERVICE] License verified - enabling protected product")
	_G.LicenseVerified = true
	for _, player in ipairs(Players:GetPlayers()) do
		player:SetAttribute("LicenseVerified", true)
	end
	Players.PlayerAdded:Connect(function(player)
		player:SetAttribute("LicenseVerified", true)
	end)
end

function LicenseService.Start(callback)
	if Started then return true end
	Started = true
	LicenseController:Start(callback or defaultProtectedCallback)
	return true
end

function LicenseService.RequireVerification(player)
	LicenseService.Start()
	return LicenseRuntime.RequireVerification(player)
end

function LicenseService.IsVerified(player)
	return LicenseRuntime.IsVerified(player)
end

function LicenseService.GetRuntime()
	return LicenseRuntime
end

function LicenseService.GetConfig()
	return LicenseRuntime.GetConfig()
end

task.defer(function()
	LicenseService.Start()
end)

return LicenseService
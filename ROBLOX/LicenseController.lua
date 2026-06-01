--[[
  LicenseController.lua
  ──────────────────────────────────────────────
  Main controller that runs the verification flow.
  Place in ServerScriptService.
  Only executes the protected callback after valid license is confirmed.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")

local LicenseConfig = require(script.Parent.LicenseConfig)
local LicenseVerifier = require(script.Parent.LicenseVerifier)
local LicenseUI = require(script.Parent.LicenseUI)

local LicenseController = {}

-- ─── Remote events for UI communication ───

local RemoteEvent = Instance.new("RemoteEvent")
RemoteEvent.Name = "FlippStudios_LicenseEvent"
RemoteEvent.Parent = ReplicatedStorage

-- ─── State ───

local Verifier = LicenseVerifier.new(LicenseConfig)
local ProtectedCallback = nil
local IsRunning = false
local CurrentPlayer = nil
local ActiveRequests = {}

-- ─── Error message mapping ───

local ErrorMessages = {
	MISSING_LICENSE_KEY = "License key is missing. Please enter your key.",
	MISSING_PRODUCT_ID = "Product ID is missing. Please check your configuration.",
	LICENSE_NOT_FOUND = "License key not found. Please check your key and try again.",
	LICENSE_REVOKED = "This license has been revoked. Please contact support.",
	LICENSE_NOT_ACTIVE = "This license is not active. Please contact support.",
	LICENSE_EXPIRED = "This license has expired. Please renew your license.",
	PRODUCT_MISMATCH = "This license does not match the product. Please check your configuration.",
	UNIVERSE_MISMATCH = "This license is bound to a different Roblox experience.",
	RATE_LIMIT_EXCEEDED = "Too many verification attempts. Please wait and try again.",
	SERVER_ERROR = "The verification server encountered an error. Please try again later.",
	HTTP_ERROR = "Could not reach the verification server. Please check your internet connection.",
	CANNOT_REACH_SERVER = "Cannot reach licensing server. Check your internet connection or the server may be down.",
	HTTP_DISABLED = "HTTP Requests are disabled. Enable in Game Settings > Security.",
	TIMEOUT = "Verification timed out. The server may be down or unreachable.",
	NO_SAVED_LICENSE = "No saved license found. Please enter your license key.",
	INVALID_RESPONSE = "Received an invalid response from the server.",
	INTERNAL_ERROR = "An internal error occurred. Please try again.",
	UNKNOWN = "An unknown error occurred. Please contact support.",
}

function LicenseController:GetErrorMessage(reason)
	return ErrorMessages[reason] or ErrorMessages.UNKNOWN
end

-- ─── Fire UI event ───

function LicenseController:_FireUI(player, eventType, data)
	local args = { eventType }
	if data then table.insert(args, data) end
	RemoteEvent:FireClient(player, unpack(args))
end

-- ─── Handle verify request from UI ───

function LicenseController:_OnVerifyRequest(player, licenseKey)
	if not player then return end

	print("[LICENSE_CONTROLLER] Verify request from", player.Name, "key:", licenseKey and #licenseKey .. " chars" or "NONE")

	self:_FireUI(player, "Verifying", nil)

	-- Client-side timeout safety net
	local requestId = tick()
	ActiveRequests[requestId] = true
	local timeoutThread = task.delay((LicenseConfig.TIMEOUT or 10) + 3, function()
		if ActiveRequests[requestId] then
			ActiveRequests[requestId] = nil
			warn("[LICENSE_CONTROLLER] Safety timeout fired for", player.Name)
			if player and player.Parent then
				self:_FireUI(player, "Error", {
					reason = "TIMEOUT",
					message = "Verification timed out. The server may be down.",
				})
			end
		end
	end)

	local result = Verifier:Verify(licenseKey, LicenseConfig.PRODUCT_ID)

	-- Cancel safety timeout
	ActiveRequests[requestId] = nil
	task.cancel(timeoutThread)

	print("[LICENSE_CONTROLLER] Verify result: success=", result.success, "valid=", result.valid, "reason=", result.reason or "nil")

	if result.success and result.valid then
		print("[LICENSE_CONTROLLER] Verification SUCCESS for", player.Name)
		self:_FireUI(player, "Success", {
			productName = result.productName,
			licenseType = result.licenseType,
			expiresAt = result.expiresAt,
			latestVersion = result.latestVersion,
		})
		self:_CheckVersion(player, result.latestVersion)
		self:_StartProtectedSystem(player)
	else
		local reason = result.reason or "UNKNOWN"
		local message = self:GetErrorMessage(reason)
		print("[LICENSE_CONTROLLER] Verification FAILED for", player.Name, "reason:", reason)
		self:_FireUI(player, "Error", { reason = reason, message = message })
	end
end

-- ─── Version update check ───

function LicenseController:_CheckVersion(player, latestVersion)
	if not latestVersion then return end
	local currentVersion = LicenseConfig.CURRENT_VERSION
	if currentVersion and currentVersion ~= "" and latestVersion ~= currentVersion then
		self:_FireUI(player, "UpdateAvailable", {
			currentVersion = currentVersion,
			latestVersion = latestVersion,
		})
	end
end

-- ─── Start the protected system ───

function LicenseController:_StartProtectedSystem(player)
	if IsRunning then return end
	IsRunning = true

	task.spawn(function()
		local success, err = pcall(ProtectedCallback)
		if not success then
			warn("[FlippStudios] Protected system error:", err)
			IsRunning = false
		end
	end)
end

-- ─── Auto re-verify loop ───

function LicenseController:_ReVerifyLoop()
	while true do
		task.wait(LicenseConfig.REVERIFY_INTERVAL)
		if Verifier:IsVerified() then
			print("[LICENSE_CONTROLLER] Starting re-verification...")

			-- Timeout-protected re-verify
			local reverifyTimedOut = false
			local reverifyCoro = coroutine.running()
			local timeoutThread = task.delay(LicenseConfig.TIMEOUT or 10, function()
				reverifyTimedOut = true
				coroutine.resume(reverifyCoro)
			end)

			local result = Verifier:ReVerify()
			task.cancel(timeoutThread)

			if reverifyTimedOut then
				warn("[LICENSE_CONTROLLER] Re-verification timed out")
				continue
			end

			if not result.success or not result.valid then
				warn("[LICENSE_CONTROLLER] Re-verification failed — disabling system")
				IsRunning = false
				Verifier:ClearVerification()
				if CurrentPlayer then
					self:_FireUI(CurrentPlayer, "SessionExpired", {
						message = "License verification failed. Please re-enter your key.",
					})
				end
			else
				print("[LICENSE_CONTROLLER] Re-verification SUCCESS")
				self:_CheckVersion(CurrentPlayer, result.latestVersion)
			end
		end
	end
end

-- ─── Public API ───

function LicenseController:Start(callback)
	ProtectedCallback = callback

	print("[LICENSE_CONTROLLER] Started — waiting for players...")

	RemoteEvent.OnServerEvent:Connect(function(player, eventType, ...)
		print("[LICENSE_CONTROLLER] RemoteEvent from", player.Name, "type:", eventType)
		if eventType == "VerifyLicense" then
			local licenseKey = ...
			self:_OnVerifyRequest(player, licenseKey)
		end
	end)

	Players.PlayerAdded:Connect(function(player)
		CurrentPlayer = player
		print("[LICENSE_CONTROLLER] Player joined:", player.Name)

		task.wait(2)

		-- Step 1: Try session restore via website (no license key needed)
		print("[LICENSE_CONTROLLER] Attempting session restore for", player.Name)
		local sessionResult = Verifier:SessionRestore()

		if sessionResult.success and sessionResult.verified then
			print("[LICENSE_CONTROLLER] Session restored for", player.Name, "— no UI needed")
			self:_FireUI(player, "AutoVerified", {
				productName = sessionResult.productName,
				latestVersion = sessionResult.latestVersion,
			})
			self:_CheckVersion(player, sessionResult.latestVersion)
			self:_StartProtectedSystem(player)
			return
		end

		if sessionResult.reason == "LICENSE_REVOKED" then
			print("[LICENSE_CONTROLLER] License revoked for", player.Name)
			self:_FireUI(player, "Revoked", { message = "License has been revoked." })
			return
		end

		-- Step 2: Fall back to DataStore re-verify
		print("[LICENSE_CONTROLLER] Session restore failed — trying DataStore re-verify for", player.Name)

		local initialTimedOut = false
		local initCoro = coroutine.running()
		local initTimeout = task.delay(LicenseConfig.TIMEOUT or 10, function()
			initialTimedOut = true
			coroutine.resume(initCoro)
		end)

		local result = Verifier:ReVerify()
		task.cancel(initTimeout)

		if initialTimedOut then
			print("[LICENSE_CONTROLLER] Initial re-verify timed out — showing UI")
			self:_FireUI(player, "ShowUI", { savedKey = "" })
			return
		end

		if result.success and result.valid then
			print("[LICENSE_CONTROLLER] Auto-verified for", player.Name)
			self:_FireUI(player, "AutoVerified", {
				productName = result.productName,
				latestVersion = result.latestVersion,
			})
			self:_CheckVersion(player, result.latestVersion)
			self:_StartProtectedSystem(player)
		else
			print("[LICENSE_CONTROLLER] No saved license for", player.Name, "— showing UI")
			local saved = Verifier._LoadFromDataStore and Verifier:_LoadFromDataStore()
			self:_FireUI(player, "ShowUI", {
				savedKey = (saved and saved.licenseKey) or "",
			})
		end
	end)

	Players.PlayerRemoving:Connect(function(player)
		print("[LICENSE_CONTROLLER] Player left:", player.Name)
		CurrentPlayer = nil
	end)

	-- Start re-verify loop
	task.spawn(function()
		self:_ReVerifyLoop()
	end)
end

return LicenseController

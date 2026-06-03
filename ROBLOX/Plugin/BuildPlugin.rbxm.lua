--[[
  BuildPlugin.rbxm.lua
  ────────────────────────────────────────────────────────────
  Run this script in Roblox Studio (paste into Command Bar or
  run as a LocalScript in Studio) to generate the .rbxm file.
  
  The generated .rbxm will appear on your Desktop as:
    FlippStudios_LicenseInstaller.rbxm
  
  Installation: Double-click the .rbxm to open, then drag the
  Plugin instance into the Plugins folder in Studio's Explorer.
]]

local outputPath = "%USERPROFILE%/Desktop/FlippStudios_LicenseInstaller.rbxm"

-- ─── Embedded Module Sources ────────────────────────────────────
-- (same content as LicenseInstaller.lua)

local SOURCE_LICENSE_CONFIG = [=====[
local Config = {}

Config.LICENSE_KEY = "YOUR_LICENSE_KEY"
Config.PRODUCT_ID = "YOUR_PRODUCT_ID"
Config.API_URL = "https://flippstudios.com/api/license/verify"
Config.TIMEOUT = 10
Config.REVERIFY_INTERVAL = 3600
Config.SHOW_UI_ON_START = true
Config.DATASTORE_KEY = "FlippStudios_License"
Config.LOCAL_VERSION = "1.0.0"

return Config
]=====]

local SOURCE_MAIN_SCRIPT = [=====[
--[[
  Flipp Studios License Installer — Roblox Studio Plugin
  ────────────────────────────────────────────────────────────
  Drop this into Plugins folder or install via .rbxm.
]]

local plugin = plugin
local HttpService = game:GetService("HttpService")
local DEFAULT_API = "https://flippstudios.com"
local WIDGET_TITLE = "Flipp Studios License Manager"
local WIDGET_ID = "FlippStudios_LicenseInstaller"

-- ─── Embedded Module Sources ────────────────────────────────────

local sourceConfig = script:FindFirstChild("LicenseConfigSrc")
local sourceVerifier = script:FindFirstChild("LicenseVerifierSrc")
local sourceController = script:FindFirstChild("LicenseControllerSrc")
local sourceUI = script:FindFirstChild("LicenseUISrc")
local sourceLoader = script:FindFirstChild("LicenseLoaderSrc")
local sourceUILoader = script:FindFirstChild("LicenseUILoaderSrc")

local SCRIPTS = {
	LicenseConfig = { container = "ReplicatedStorage", className = "ModuleScript", source = sourceConfig and sourceConfig.Value or "" },
	LicenseVerifier = { container = "ServerScriptService", className = "ModuleScript", source = sourceVerifier and sourceVerifier.Value or "" },
	LicenseController = { container = "ServerScriptService", className = "ModuleScript", source = sourceController and sourceController.Value or "" },
	LicenseUI = { container = "ReplicatedStorage", className = "ModuleScript", source = sourceUI and sourceUI.Value or "" },
	LicenseLoader = { container = "ServerScriptService", className = "Script", source = sourceLoader and sourceLoader.Value or "" },
	LicenseUILoader = { container = "StarterGui", className = "LocalScript", source = sourceUILoader and sourceUILoader.Value or "" },
}

local function getService(name)
	local svc = game:FindService(name)
	if not svc then
		svc = Instance.new("Folder")
		svc.Name = name
		svc.Parent = game
	end
	return svc
end

local function setStatus(label, text, color)
	if label then
		label.Text = text or ""
		label.TextColor3 = color or Color3.fromRGB(140, 140, 160)
	end
end

local function getConfig(inputs)
	return {
		licenseKey = (inputs.licenseKey and inputs.licenseKey.Text):match("^%s*(.-)%s*$") or "",
		productId = (inputs.productId and inputs.productId.Text):match("^%s*(.-)%s*$") or "",
		apiUrl = (inputs.apiUrl and inputs.apiUrl.Text):match("^%s*(.-)%s*$") or DEFAULT_API,
	}
end

local function installScript(def, config)
	local container = getService(def.container)
	local existing = container:FindFirstChild(def.name)
	if existing then
		existing:Destroy()
	end

	local source = def.source
	if def.name == "LicenseConfig" then
		source = source:gsub("YOUR_LICENSE_KEY", config.licenseKey)
		source = source:gsub("YOUR_PRODUCT_ID", config.productId)
	end

	local instance = Instance.new(def.className)
	instance.Name = def.name
	instance.Source = source
	instance.Parent = container
	return instance
end

local function ensureRemoteEvent()
	local rstorage = getService("ReplicatedStorage")
	local existing = rstorage:FindFirstChild("FlippStudios_LicenseEvent")
	if existing then return existing end
	local re = Instance.new("RemoteEvent")
	re.Name = "FlippStudios_LicenseEvent"
	re.Parent = rstorage
	return re
end

local function testConnection(apiUrl, statusLabel)
	local url = apiUrl:gsub("/+$", "") .. "/api/license/ping"
	setStatus(statusLabel, "Testing connection...", Color3.fromRGB(180, 180, 200))
	local ok, result = pcall(function()
		return HttpService:GetAsync(url, false)
	end)
	if ok then
		local ok2, data = pcall(function() return HttpService:JSONDecode(result) end)
		if ok2 and data and data.server == "online" then
			setStatus(statusLabel, "Server online — OK", Color3.fromRGB(60, 200, 120))
			return true
		end
	end
	setStatus(statusLabel, "Cannot reach server", Color3.fromRGB(220, 80, 80))
	return false
end

local function installSystem(config, statusLabel)
	setStatus(statusLabel, "Installing...", Color3.fromRGB(180, 180, 200))
	pcall(function() game:GetService("HttpService").HttpEnabled = true end)
	ensureRemoteEvent()

	local installed = {}
	for name, def in pairs(SCRIPTS) do
		local ok, inst = pcall(installScript, def, config)
		if ok then
			table.insert(installed, def.container .. "." .. name)
		else
			setStatus(statusLabel, "Failed: " .. name, Color3.fromRGB(220, 80, 80))
			return false
		end
	end

	setStatus(statusLabel, "Installed " .. #installed .. " scripts!", Color3.fromRGB(60, 200, 120))
	game:GetService("StarterGui"):SetCore("SendNotification", {
		Title = "Flipp Studios",
		Text = "License system installed (" .. #installed .. " scripts)",
		Duration = 5,
	})
	return true
end

-- ─── Build UI ───────────────────────────────────────────────────

local function createUI()
	local frame = Instance.new("Frame")
	frame.Size = UDim2.fromScale(1, 1)
	frame.BackgroundColor3 = Color3.fromRGB(22, 22, 35)
	frame.BorderSizePixel = 0

	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, 8)
	corner.Parent = frame

	local title = Instance.new("TextLabel")
	title.Parent = frame
	title.Size = UDim2.fromScale(1, 0.07)
	title.BackgroundColor3 = Color3.fromRGB(30, 30, 48)
	title.BorderSizePixel = 0
	title.Text = "Flipp Studios License Manager"
	title.TextColor3 = Color3.fromRGB(220, 220, 240)
	title.TextSize = 14
	title.Font = Enum.Font.GothamBold

	local logo = Instance.new("Frame")
	logo.Parent = title
	logo.Size = UDim2.fromOffset(24, 24)
	logo.Position = UDim2.fromOffset(8, 0)
	logo.AnchorPoint = Vector2.new(0, 0.5)
	logo.BackgroundColor3 = Color3.fromRGB(120, 80, 255)
	logo.BorderSizePixel = 0
	local logoCorner = Instance.new("UICorner")
	logoCorner.CornerRadius = UDim.new(0, 6)
	logoCorner.Parent = logo
	local logoText = Instance.new("TextLabel")
	logoText.Parent = logo
	logoText.Size = UDim2.fromScale(1, 1)
	logoText.BackgroundTransparency = 1
	logoText.Text = "FS"
	logoText.TextColor3 = Color3.fromRGB(255, 255, 255)
	logoText.TextSize = 10
	logoText.Font = Enum.Font.GothamBold
	logoText.TextXAlignment = Enum.TextXAlignment.Center
	logoText.TextYAlignment = Enum.TextYAlignment.Center

	local titleCorner = Instance.new("UICorner")
	titleCorner.CornerRadius = UDim.new(0, 8)
	titleCorner.Parent = title

	local inputs = {}
	local statusLabel
	local yPos = 50
	local fields = {
		{ label = "LICENSE KEY", hint = "FLIPP-XXXX-XXXX-XXXX", key = "licenseKey" },
		{ label = "PRODUCT ID", hint = "Product ID", key = "productId" },
		{ label = "API URL", hint = "https://flippstudios.com", key = "apiUrl", default = DEFAULT_API },
	}

	for _, field in ipairs(fields) do
		local label = Instance.new("TextLabel")
		label.Parent = frame
		label.Size = UDim2.fromScale(0.9, 0.035)
		label.Position = UDim2.fromOffset(0, yPos)
		label.AnchorPoint = Vector2.new(0.5, 0)
		label.BackgroundTransparency = 1
		label.Text = field.label
		label.TextColor3 = Color3.fromRGB(140, 140, 160)
		label.TextSize = 10
		label.Font = Enum.Font.GothamBold
		label.TextXAlignment = Enum.TextXAlignment.Left

		local input = Instance.new("TextBox")
		input.Parent = frame
		input.Name = "Input_" .. field.key
		input.Size = UDim2.fromScale(0.9, 0.065)
		input.Position = UDim2.fromOffset(0, yPos + 20)
		input.AnchorPoint = Vector2.new(0.5, 0)
		input.BackgroundColor3 = Color3.fromRGB(32, 32, 48)
		input.BorderSizePixel = 0
		input.TextColor3 = Color3.fromRGB(220, 220, 240)
		input.TextSize = 13
		input.Font = Enum.Font.Gotham
		input.PlaceholderText = field.hint
		input.PlaceholderColor3 = Color3.fromRGB(60, 60, 80)
		input.ClearTextOnFocus = false
		input.Text = field.default or ""

		local inputCorner = Instance.new("UICorner")
		inputCorner.CornerRadius = UDim.new(0, 8)
		inputCorner.Parent = input
		local inputStroke = Instance.new("UIStroke")
		inputStroke.Color = Color3.fromRGB(45, 45, 65)
		inputStroke.Parent = input

		inputs[field.key] = input
		yPos = yPos + 62
	end

	statusLabel = Instance.new("TextLabel")
	statusLabel.Parent = frame
	statusLabel.Size = UDim2.fromScale(0.9, 0.04)
	statusLabel.Position = UDim2.fromOffset(0, yPos + 2)
	statusLabel.AnchorPoint = Vector2.new(0.5, 0)
	statusLabel.BackgroundTransparency = 1
	statusLabel.Text = ""
	statusLabel.TextColor3 = Color3.fromRGB(140, 140, 160)
	statusLabel.TextSize = 11
	statusLabel.Font = Enum.Font.Gotham
	statusLabel.TextXAlignment = Enum.TextXAlignment.Center

	yPos = yPos + 32

	local testBtn = Instance.new("TextButton")
	testBtn.Parent = frame
	testBtn.Size = UDim2.fromScale(0.9, 0.075)
	testBtn.Position = UDim2.fromOffset(0, yPos)
	testBtn.AnchorPoint = Vector2.new(0.5, 0)
	testBtn.BackgroundColor3 = Color3.fromRGB(50, 50, 75)
	testBtn.BorderSizePixel = 0
	testBtn.AutoButtonColor = false
	testBtn.Text = "TEST CONNECTION"
	testBtn.TextColor3 = Color3.fromRGB(200, 200, 220)
	testBtn.TextSize = 12
	testBtn.Font = Enum.Font.GothamBold
	local testCorner = Instance.new("UICorner")
	testCorner.CornerRadius = UDim.new(0, 8)
	testCorner.Parent = testBtn

	yPos = yPos + 46

	local installBtn = Instance.new("TextButton")
	installBtn.Parent = frame
	installBtn.Size = UDim2.fromScale(0.9, 0.085)
	installBtn.Position = UDim2.fromOffset(0, yPos)
	installBtn.AnchorPoint = Vector2.new(0.5, 0)
	installBtn.BackgroundColor3 = Color3.fromRGB(100, 70, 200)
	installBtn.BorderSizePixel = 0
	installBtn.AutoButtonColor = false
	installBtn.Text = "INSTALL LICENSE SYSTEM"
	installBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
	installBtn.TextSize = 14
	installBtn.Font = Enum.Font.GothamBold
	local installCorner = Instance.new("UICorner")
	installCorner.CornerRadius = UDim.new(0, 8)
	installCorner.Parent = installBtn

	yPos = yPos + 52

	local footer = Instance.new("TextLabel")
	footer.Parent = frame
	footer.Size = UDim2.fromScale(0.9, 0.035)
	footer.Position = UDim2.fromOffset(0, yPos)
	footer.AnchorPoint = Vector2.new(0.5, 0)
	footer.BackgroundTransparency = 1
	footer.Text = "Flipp Studios — flippstudios.com"
	footer.TextColor3 = Color3.fromRGB(60, 60, 80)
	footer.TextSize = 10
	footer.Font = Enum.Font.Gotham

	return frame, inputs, statusLabel, testBtn, installBtn
end

-- ─── Plugin Entry ───────────────────────────────────────────────

local toolbar = plugin:CreateToolbar("Flipp Studios")
local button = toolbar:CreateButton("License", "Install/manage license system", "")

local dockWidget = plugin:CreateDockWidgetPluginGui(WIDGET_ID, {
	Title = WIDGET_TITLE,
	Size = Vector2.new(420, 500),
	MinSize = Vector2.new(350, 400),
	InitialEnabled = false,
})

local widgetFrame, inputs, statusLabel, testBtn, installBtn = createUI()
widgetFrame.Parent = dockWidget

testBtn.MouseButton1Click:Connect(function()
	local apiUrl = (inputs.apiUrl and inputs.apiUrl.Text):match("^%s*(.-)%s*$") or DEFAULT_API
	testConnection(apiUrl, statusLabel)
end)

installBtn.MouseButton1Click:Connect(function()
	local config = getConfig(inputs)
	if config.licenseKey == "" or config.productId == "" then
		setStatus(statusLabel, "Enter license key and product ID", Color3.fromRGB(220, 80, 80))
		return
	end
	installSystem(config, statusLabel)
end)

button.Click:Connect(function()
	dockWidget.Enabled = not dockWidget.Enabled
end)

dockWidget.Enabled = true
print("[Flipp Studios Plugin] Loaded")
]=====]

-- ─── Module source strings (stored as StringValues for the Plugin) ───

local moduleSources = {
	LicenseConfigSrc = SOURCE_LICENSE_CONFIG,
	LicenseVerifierSrc = [=====[
local HttpService = game:GetService("HttpService")
local DataStoreService = game:GetService("DataStoreService")

local LicenseVerifier = {}
LicenseVerifier.__index = LicenseVerifier

function LicenseVerifier.new(config)
	local self = setmetatable({}, LicenseVerifier)
	self.Config = config
	self.VerifiedData = nil
	self.LastError = nil
	self.LastCheckTime = 0
	self.Store = DataStoreService:GetDataStore(config.DATASTORE_KEY .. "_v2")
	return self
end

function LicenseVerifier:_getRobloxContext()
	return {
		placeId = game.PlaceId,
		universeId = game.GameId,
		creatorId = game.CreatorId,
	}
end

function LicenseVerifier:Verify(licenseKey, productId)
	local key = licenseKey or self.Config.LICENSE_KEY
	local pid = productId or self.Config.PRODUCT_ID

	if not key or key == "" then
		self.LastError = "MISSING_LICENSE_KEY"
		return { success = false, reason = "MISSING_LICENSE_KEY" }
	end

	if not pid or pid == "" then
		self.LastError = "MISSING_PRODUCT_ID"
		return { success = false, reason = "MISSING_PRODUCT_ID" }
	end

	if not HttpService.HttpEnabled then
		return { success = false, reason = "HTTP_DISABLED" }
	end

	local ctx = self:_getRobloxContext()

	local ok, payload = pcall(function()
		return HttpService:JSONEncode({
			licenseKey = key,
			productId = pid,
			placeId = ctx.placeId,
			universeId = ctx.universeId,
			creatorId = ctx.creatorId,
		})
	end)
	if not ok then
		return { success = false, reason = "INTERNAL_ERROR" }
	end

	local timedOut = false
	local coro = coroutine.running()
	local timeoutThread = task.delay(self.Config.TIMEOUT, function()
		timedOut = true
		coroutine.resume(coro)
	end)

	local httpOk, httpResult = pcall(function()
		return HttpService:PostAsync(self.Config.API_URL, payload, Enum.HttpContentType.ApplicationJson, false, nil)
	end)

	task.cancel(timeoutThread)

	if timedOut then
		self.LastError = "TIMEOUT"
		return { success = false, reason = "TIMEOUT" }
	end

	if not httpOk then
		self.LastError = "HTTP_ERROR"
		return { success = false, reason = "HTTP_ERROR" }
	end

	local decodeOk, decoded = pcall(function()
		return HttpService:JSONDecode(httpResult)
	end)

	if not decodeOk then
		self.LastError = "INVALID_RESPONSE"
		return { success = false, reason = "INVALID_RESPONSE" }
	end

	if not decoded.success then
		self.LastError = decoded.reason or "UNKNOWN"
		return decoded
	end

	self.VerifiedData = decoded
	self.LastError = nil
	self.LastCheckTime = os.time()

	pcall(function()
		self.Store:SetAsync("license_data", {
			licenseKey = key,
			productId = pid,
			verifiedAt = DateTime.now():ToIsoDate(),
		})
	end)

	return decoded
end

function LicenseVerifier:ReVerify()
	local saved = nil
	pcall(function()
		saved = self.Store:GetAsync("license_data")
	end)
	if not saved then
		return { success = false, reason = "NO_SAVED_LICENSE" }
	end
	return self:Verify(saved.licenseKey, saved.productId)
end

function LicenseVerifier:IsVerified()
	return self.VerifiedData ~= nil and self.VerifiedData.valid == true
end

function LicenseVerifier:GetProductName()
	return (self.VerifiedData and self.VerifiedData.productName) or "Unknown Product"
end

function LicenseVerifier:GetLicenseType()
	return (self.VerifiedData and self.VerifiedData.licenseType) or "lifetime"
end

function LicenseVerifier:GetLatestVersion()
	return (self.VerifiedData and self.VerifiedData.latestVersion) or "1.0.0"
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
]=====],
	LicenseControllerSrc = [=====[
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")

local LicenseConfig = require(script.Parent.LicenseConfig)
local LicenseVerifier = require(script.Parent.LicenseVerifier)
local LicenseUI = require(game:GetService("ReplicatedStorage").LicenseUI)

local LicenseController = {}

local RemoteEvent = Instance.new("RemoteEvent")
RemoteEvent.Name = "FlippStudios_LicenseEvent"
RemoteEvent.Parent = ReplicatedStorage

local Verifier = LicenseVerifier.new(LicenseConfig)
local ProtectedCallback = nil
local IsRunning = false
local CurrentPlayer = nil

local ErrorMessages = {
	MISSING_LICENSE_KEY = "License key is missing.",
	MISSING_PRODUCT_ID = "Product ID is missing.",
	LICENSE_NOT_FOUND = "License key not found. Check your key.",
	LICENSE_REVOKED = "License revoked. Contact support.",
	LICENSE_NOT_ACTIVE = "License not active. Contact support.",
	LICENSE_EXPIRED = "License expired. Renew your license.",
	PRODUCT_MISMATCH = "License doesn't match this product.",
	UNIVERSE_MISMATCH = "License bound to a different experience.",
	RATE_LIMIT_EXCEEDED = "Too many attempts. Wait and try again.",
	HTTP_ERROR = "Cannot reach verification server.",
	HTTP_DISABLED = "HTTP disabled. Enable in Game Settings > Security.",
	TIMEOUT = "Verification timed out.",
	INVALID_RESPONSE = "Invalid response from server.",
	INTERNAL_ERROR = "Internal error. Try again.",
	UNKNOWN = "Unknown error. Contact support.",
}

function LicenseController:GetErrorMessage(reason)
	return ErrorMessages[reason] or ErrorMessages.UNKNOWN
end

function LicenseController:_FireUI(player, eventType, data)
	local args = { eventType }
	if data then table.insert(args, data) end
	RemoteEvent:FireClient(player, unpack(args))
end

function LicenseController:_OnVerifyRequest(player, licenseKey)
	if not player then return end
	self:_FireUI(player, "Verifying", nil)
	local result = Verifier:Verify(licenseKey, LicenseConfig.PRODUCT_ID)
	if result.success and result.valid then
		self:_FireUI(player, "Success", {
			productName = result.productName,
			licenseType = result.licenseType,
			expiresAt = result.expiresAt,
		})
		self:_StartProtectedSystem(player)
	else
		self:_FireUI(player, "Error", {
			reason = result.reason or "UNKNOWN",
			message = self:GetErrorMessage(result.reason),
		})
	end
end

function LicenseController:_StartProtectedSystem(player)
	if IsRunning then return end
	IsRunning = true
	task.spawn(function()
		local ok, err = pcall(ProtectedCallback)
		if not ok then
			warn("[FlippStudios] Protected system error:", err)
			IsRunning = false
		end
	end)
end

function LicenseController:_ReVerifyLoop()
	while true do
		task.wait(LicenseConfig.REVERIFY_INTERVAL)
		if Verifier:IsVerified() then
			local result = Verifier:ReVerify()
			if not result.success or not result.valid then
				IsRunning = false
				Verifier:ClearVerification()
				if CurrentPlayer then
					self:_FireUI(CurrentPlayer, "SessionExpired", {
						message = "License expired. Re-enter your key.",
					})
				end
			end
		end
	end
end

function LicenseController:Start(callback)
	ProtectedCallback = callback

	RemoteEvent.OnServerEvent:Connect(function(player, eventType, ...)
		if eventType == "VerifyLicense" then
			self:_OnVerifyRequest(player, ...)
		end
	end)

	Players.PlayerAdded:Connect(function(player)
		CurrentPlayer = player
		task.wait(2)
		local result = Verifier:ReVerify()
		if result.success and result.valid then
			self:_FireUI(player, "Success", {
				productName = result.productName,
			})
			self:_StartProtectedSystem(player)
		else
			self:_FireUI(player, "ShowUI", { savedKey = "" })
		end
	end)

	Players.PlayerRemoving:Connect(function(player)
		CurrentPlayer = nil
	end)

	task.spawn(function()
		self:_ReVerifyLoop()
	end)
end

return LicenseController
]=====],
	LicenseUISrc = [=====[
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")
local Player = Players.LocalPlayer
local PlayerGui = Player:WaitForChild("PlayerGui")
local RemoteEvent = ReplicatedStorage:WaitForChild("FlippStudios_LicenseEvent")
local LicenseUI = {}
local Colors = {
	background = Color3.fromRGB(18, 18, 28),
	card = Color3.fromRGB(26, 26, 38),
	cardBorder = Color3.fromRGB(45, 45, 65),
	accent = Color3.fromRGB(120, 80, 255),
	accentHover = Color3.fromRGB(140, 100, 255),
	success = Color3.fromRGB(40, 200, 120),
	error = Color3.fromRGB(220, 50, 70),
	text = Color3.fromRGB(220, 220, 240),
	textDim = Color3.fromRGB(140, 140, 160),
	textDark = Color3.fromRGB(60, 60, 80),
	inputBg = Color3.fromRGB(32, 32, 48),
	overlay = Color3.fromRGB(0, 0, 0),
}
local ScreenGui, MainFrame, LicenseInput, VerifyButton, StatusLabel, LoadingSpinner, ErrorLabel

function LicenseUI:Build()
	if ScreenGui then return end
	ScreenGui = Instance.new("ScreenGui")
	ScreenGui.Name = "FlippStudios_LicenseUI"
	ScreenGui.ResetOnSpawn = false
	ScreenGui.Parent = PlayerGui

	local overlay = Instance.new("Frame")
	overlay.Name = "Overlay"
	overlay.Parent = ScreenGui
	overlay.Size = UDim2.fromScale(1, 1)
	overlay.BackgroundColor3 = Colors.overlay
	overlay.BackgroundTransparency = 0.5
	overlay.BorderSizePixel = 0

	MainFrame = Instance.new("Frame")
	MainFrame.Parent = ScreenGui
	MainFrame.Size = UDim2.fromOffset(380, 400)
	MainFrame.Position = UDim2.fromScale(0.5, 0.5)
	MainFrame.AnchorPoint = Vector2.new(0.5, 0.5)
	MainFrame.BackgroundColor3 = Colors.card
	MainFrame.BorderSizePixel = 0
	Instance.new("UICorner").CornerRadius = UDim.new(0, 16)
	MainFrame.UICorner.CornerRadius = UDim.new(0, 16)

	local stroke = Instance.new("UIStroke")
	stroke.Color = Colors.cardBorder
	stroke.Parent = MainFrame

	local headerBar = Instance.new("Frame")
	headerBar.Parent = MainFrame
	headerBar.Size = UDim2.fromScale(1, 0.25)
	headerBar.BackgroundColor3 = Colors.background
	headerBar.BorderSizePixel = 0
	Instance.new("UICorner").CornerRadius = UDim.new(0, 16)
	headerBar.UICorner.CornerRadius = UDim.new(0, 16)

	local glow = Instance.new("Frame")
	glow.Parent = headerBar
	glow.Size = UDim2.fromScale(1, 3)
	glow.Position = UDim2.fromScale(0, 1)
	glow.AnchorPoint = Vector2.new(0, 1)
	glow.BackgroundColor3 = Colors.accent
	glow.BackgroundTransparency = 0.3
	glow.BorderSizePixel = 0

	local icon = Instance.new("Frame")
	icon.Parent = headerBar
	icon.Size = UDim2.fromOffset(44, 44)
	icon.Position = UDim2.fromScale(0.5, 0.5)
	icon.AnchorPoint = Vector2.new(0.5, 0.5)
	icon.BackgroundColor3 = Colors.accent
	icon.BorderSizePixel = 0
	Instance.new("UICorner").CornerRadius = UDim.new(0, 12)
	icon.UICorner.CornerRadius = UDim.new(0, 12)

	local iconLabel = Instance.new("TextLabel")
	iconLabel.Parent = icon
	iconLabel.Size = UDim2.fromScale(1, 1)
	iconLabel.BackgroundTransparency = 1
	iconLabel.Text = "FS"
	iconLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
	iconLabel.TextSize = 18
	iconLabel.Font = Enum.Font.GothamBold
	iconLabel.TextXAlignment = Enum.TextXAlignment.Center
	iconLabel.TextYAlignment = Enum.TextYAlignment.Center

	local function cl(p, t, s, c, f)
		local l = Instance.new("TextLabel")
		l.Parent = p
		l.Text = t
		l.Size = s or UDim2.fromOffset(200, 24)
		l.BackgroundTransparency = 1
		l.TextColor3 = c or Colors.text
		l.TextSize = 14
		l.Font = f or Enum.Font.Gotham
		l.TextXAlignment = Enum.TextXAlignment.Center
		return l
	end

	cl(headerBar, "Flipp Studios", UDim2.fromScale(1, 0.3), Colors.text, Enum.Font.GothamBold).TextSize = 16
	local function findLastLabel()
		for _, v in ipairs(headerBar:GetChildren()) do if v:IsA("TextLabel") then return v end end
	end
	findLastLabel().Position = UDim2.fromScale(0, 0.72)
	cl(headerBar, "License Verification", UDim2.fromScale(1, 0.2), Colors.textDim).TextSize = 12
	findLastLabel().Position = UDim2.fromScale(0, 0.88)

	cl(MainFrame, "LICENSE KEY", UDim2.fromOffset(340, 18), Colors.textDim, Enum.Font.GothamBold).TextSize = 10
	local kl = findLastLabel()
	kl.Position = UDim2.fromOffset(20, 120)
	kl.TextXAlignment = Enum.TextXAlignment.Left

	LicenseInput = Instance.new("TextBox")
	LicenseInput.Parent = MainFrame
	LicenseInput.Size = UDim2.fromOffset(340, 42)
	LicenseInput.Position = UDim2.fromOffset(20, 142)
	LicenseInput.BackgroundColor3 = Colors.inputBg
	LicenseInput.BorderSizePixel = 0
	LicenseInput.TextColor3 = Colors.text
	LicenseInput.TextSize = 14
	LicenseInput.Font = Enum.Font.Code
	LicenseInput.PlaceholderText = "Enter your license key"
	LicenseInput.PlaceholderColor3 = Colors.textDark
	LicenseInput.ClearTextOnFocus = false
	LicenseInput.TextXAlignment = Enum.TextXAlignment.Center
	Instance.new("UICorner").CornerRadius = UDim.new(0, 10)
	LicenseInput.UICorner.CornerRadius = UDim.new(0, 10)
	local is = Instance.new("UIStroke")
	is.Color = Colors.cardBorder
	is.Parent = LicenseInput

	VerifyButton = Instance.new("ImageButton")
	VerifyButton.Parent = MainFrame
	VerifyButton.Size = UDim2.fromOffset(340, 46)
	VerifyButton.Position = UDim2.fromOffset(20, 200)
	VerifyButton.BackgroundColor3 = Colors.accent
	VerifyButton.BorderSizePixel = 0
	VerifyButton.AutoButtonColor = false
	Instance.new("UICorner").CornerRadius = UDim.new(0, 10)
	VerifyButton.UICorner.CornerRadius = UDim.new(0, 10)
	local bt = Instance.new("TextLabel")
	bt.Parent = VerifyButton
	bt.Size = UDim2.fromScale(1, 1)
	bt.BackgroundTransparency = 1
	bt.Text = "VERIFY"
	bt.TextColor3 = Color3.fromRGB(255, 255, 255)
	bt.TextSize = 15
	bt.Font = Enum.Font.GothamBold

	LoadingSpinner = Instance.new("Frame")
	LoadingSpinner.Parent = MainFrame
	LoadingSpinner.Size = UDim2.fromOffset(24, 24)
	LoadingSpinner.Position = UDim2.fromOffset(178, 214)
	LoadingSpinner.BackgroundTransparency = 1
	LoadingSpinner.Visible = false
	Instance.new("UICorner").CornerRadius = UDim.new(1, 0)
	LoadingSpinner.UICorner.CornerRadius = UDim.new(1, 0)
	local ss = Instance.new("UIStroke")
	ss.Color = Colors.accent
	ss.Thickness = 3
	ss.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
	ss.Parent = LoadingSpinner

	StatusLabel = cl(MainFrame, "", UDim2.fromOffset(340, 20))
	StatusLabel.TextSize = 12
	StatusLabel.Position = UDim2.fromOffset(20, 258)
	StatusLabel.Visible = false

	ErrorLabel = cl(MainFrame, "", UDim2.fromOffset(340, 36), Colors.error)
	ErrorLabel.TextSize = 12
	ErrorLabel.Position = UDim2.fromOffset(20, 280)
	ErrorLabel.Visible = false
	ErrorLabel.TextWrapped = true
	ErrorLabel.TextYAlignment = Enum.TextYAlignment.Top

	cl(MainFrame, "Purchased from flippstudios.com", UDim2.fromOffset(340, 20), Colors.textDark).TextSize = 10
	local ft = findLastLabel()
	ft.Position = UDim2.fromOffset(20, 370)
end

function LicenseUI:Show()
	if not ScreenGui then self:Build() end
	ScreenGui.Enabled = true
end

function LicenseUI:Hide()
	if ScreenGui then ScreenGui.Enabled = false end
end

function LicenseUI:SetStatus(t, c)
	StatusLabel.Text = t or ""
	StatusLabel.TextColor3 = c or Colors.text
	StatusLabel.Visible = t and t ~= ""
end

function LicenseUI:SetError(t)
	ErrorLabel.Text = t or ""
	ErrorLabel.Visible = t and t ~= ""
end

function LicenseUI:ShowLoading(v)
	VerifyButton.Visible = not v
	LoadingSpinner.Visible = v
	if v then self:SetStatus("Verifying license...", Colors.textDim) end
end

function LicenseUI:ShowSuccess(d)
	self:ShowLoading(false)
	self:SetError(nil)
	self:SetStatus("License verified — " .. (d and d.productName or "product"), Colors.success)
	VerifyButton.BackgroundColor3 = Colors.success
	VerifyButton:FindFirstChildOfClass("TextLabel").Text = "VERIFIED"
	task.wait(1.5)
	self:Hide()
end

function LicenseUI:ShowError(d)
	self:ShowLoading(false)
	self:SetStatus(nil)
	self:SetError((d and d.message) or "An error occurred.")
	VerifyButton.BackgroundColor3 = Colors.error
	task.wait(0.5)
	VerifyButton.BackgroundColor3 = Colors.accent
end

function LicenseUI:Init(savedKey)
	self:Build()
	if savedKey and savedKey ~= "" then LicenseInput.Text = savedKey end
	VerifyButton.MouseButton1Click:Connect(function()
		local key = LicenseInput.Text:match("^%s*(.-)%s*$")
		if key and key ~= "" then
			self:ShowLoading(true)
			self:SetError(nil)
			RemoteEvent:FireServer("VerifyLicense", key)
		else
			self:SetError("Enter a valid license key.")
		end
	end)
	VerifyButton.MouseEnter:Connect(function()
		if VerifyButton.Visible then TweenService:Create(VerifyButton, TweenInfo.new(0.25), { BackgroundColor3 = Colors.accentHover }):Play() end
	end)
	VerifyButton.MouseLeave:Connect(function()
		if VerifyButton.Visible then TweenService:Create(VerifyButton, TweenInfo.new(0.25), { BackgroundColor3 = Colors.accent }):Play() end
	end)
	LicenseInput.FocusLost:Connect(function(ep) if ep then VerifyButton.MouseButton1Click:Fire() end end)
	RemoteEvent.OnClientEvent:Connect(function(eventType, data)
		if eventType == "ShowUI" then
			self:Show()
		elseif eventType == "Verifying" then
			self:ShowLoading(true)
		elseif eventType == "Success" then
			self:ShowSuccess(data)
		elseif eventType == "Error" then
			self:ShowError(data)
		elseif eventType == "SessionExpired" then
			self:Show()
			self:SetError(data and data.message or "Session expired.")
		end
	end)
end

return LicenseUI
]=====],
	LicenseLoaderSrc = [=====[
local LicenseController = require(game:GetService("ServerScriptService"):WaitForChild("LicenseController"))
LicenseController.Start(function()
	print("[Flipp Studios] License verified — system starting")
end)
]=====],
	LicenseUILoaderSrc = [=====[
local LicenseUI = require(game:GetService("ReplicatedStorage"):WaitForChild("LicenseUI"))
LicenseUI:Init("")
]=====],
}

-- ─── Build the Plugin Model ─────────────────────────────────────

local function buildPluginModel()
	-- Plugin instance (the actual plugin script)
	local pluginScript = Instance.new("Script")
	pluginScript.Name = "FlippStudios_LicenseInstaller"
	pluginScript.Source = SOURCE_MAIN_SCRIPT

	-- Attach module sources as StringValue children
	for name, source in pairs(moduleSources) do
		local sv = Instance.new("StringValue")
		sv.Name = name
		sv.Value = source
		sv.Parent = pluginScript
	end

	return pluginScript
end

-- ─── Save .rbxm to Desktop ─────────────────────────────────────

local function saveToDesktop(model, filename)
	local path = outputPath:gsub("%%USERPROFILE%%", os.getenv("USERPROFILE") or "C:/Users/Default")
	
	-- Use InsertService to save
	local success, err = pcall(function()
		local InsertService = game:GetService("InsertService")
		InsertService:SaveLocalAsset(model, path)
	end)

	if success then
		print("[BUILD] Plugin saved to: " .. path)
		print("[BUILD] Double-click the .rbxm to install in Studio.")
	else
		warn("[BUILD] Failed to save .rbxm:", err)
		warn("[BUILD] Try: select the model in Explorer, right-click → Save to File")
	end
end

-- ─── Main ───────────────────────────────────────────────────────

print("[BUILD] Creating FlippStudios License Installer plugin...")

local model = buildPluginModel()
model.Parent = game:GetService("CoreGui") or workspace

-- Show in Explorer for manual export as fallback
local Selection = game:GetService("Selection")
Selection:Set({ model })
print("[BUILD] Plugin model created and selected in Explorer.")
print("[BUILD] You can now: File → Save to File → choose .rbxm format")
print("[BUILD] Or run: saveToDesktop() to auto-save to Desktop")

-- Try auto-save
saveToDesktop(model)

--[[
  Flipp Studios License Installer — Roblox Studio Plugin

  HOW TO INSTALL AS PLUGIN (works in edit mode, no need to run the game):
    Option A — Plugins folder:
      1. Copy this .rbxm file to:
         %USERPROFILE%\AppData\Local\Roblox\Plugins\
      2. Restart Studio (or View → Toolbar → Reload Plugins)
    Option B — Plugin Manager:
      1. In Studio, go to Plugins → Plugin Manager
      2. Click "Load Plugin" and select the .rbxm file

  You'll see a "Flipp Studios" toolbar with a License button.
  Click it to open the installer — works even when the game is stopped.
]]

local plugin = plugin
local PLUGIN_NAME = "Flipp Studios License Installer"
local TOOLBAR_NAME = "Flipp Studios"
local BUTTON_TEXT = "License"
local BUTTON_TOOLTIP = "Install the Flipp Studios license system"
local BUTTON_ICON = "rbxasset://textures/StudioSharedUI/statusSuccess.png"
local DEFAULT_API = "https://robloxdevmarket.vercel.app"
local WIDGET_TITLE = "License Manager"
local WIDGET_ID = "FlippStudios_LicenseInstaller"

-- ─── Module Sources ─────────────────────────────────────────────

local function getModuleSource(name)
	local sv = script:FindFirstChild(name)
	if sv and sv:IsA("StringValue") and sv.Value ~= "" then
		return sv.Value
	end
	return nil
end

local SOURCE_LICENSE_CONFIG = getModuleSource("LicenseConfigSrc") or [[
local Config = {}
Config.LICENSE_KEY = "{LICENSE_KEY}"
Config.PRODUCT_ID = "{PRODUCT_ID}"
Config.API_URL = "{API_URL}/api/license/verify"
Config.TIMEOUT = 10
Config.REVERIFY_INTERVAL = 3600
Config.SHOW_UI_ON_START = true
Config.DATASTORE_KEY = "FlippStudios_License"
Config.LOCAL_VERSION = "1.0.0"
return Config
]]

local SOURCE_LICENSE_VERIFIER = getModuleSource("LicenseVerifierSrc") or ""
local SOURCE_LICENSE_CONTROLLER = getModuleSource("LicenseControllerSrc") or ""
local SOURCE_LICENSE_UI = getModuleSource("LicenseUISrc") or ""
local SOURCE_LOADER = getModuleSource("LicenseLoaderSrc") or [[
local LicenseController = require(game:GetService("ServerScriptService"):WaitForChild("LicenseController"))
LicenseController.Start(function() print("[Flipp Studios] License verified — system starting") end)
]]
local SOURCE_UI_LOADER = getModuleSource("LicenseUILoaderSrc") or [[
local LicenseUI = require(game:GetService("ReplicatedStorage"):WaitForChild("LicenseUI"))
LicenseUI:Init("")
]]

-- ─── Plugin Script Definitions ──────────────────────────────────

local SCRIPTS = {
	LicenseConfig = { container = "ServerScriptService", className = "ModuleScript", source = SOURCE_LICENSE_CONFIG },
	LicenseVerifier = { container = "ServerScriptService", className = "ModuleScript", source = SOURCE_LICENSE_VERIFIER },
	LicenseController = { container = "ServerScriptService", className = "ModuleScript", source = SOURCE_LICENSE_CONTROLLER },
	LicenseUI = { container = "ReplicatedStorage", className = "ModuleScript", source = SOURCE_LICENSE_UI },
	LicenseLoader = { container = "ServerScriptService", className = "Script", source = SOURCE_LOADER },
	LicenseUILoader = { container = "StarterGui", className = "LocalScript", source = SOURCE_UI_LOADER },
}

-- ─── Plugin UI ──────────────────────────────────────────────────

local function createWidgetUI()
	local frame = Instance.new("Frame")
	frame.Name = "MainFrame"
	frame.Size = UDim2.fromScale(1, 1)
	frame.BackgroundColor3 = Color3.fromRGB(22, 22, 35)
	frame.BorderSizePixel = 0
	local c = Instance.new("UICorner"); c.CornerRadius = UDim.new(0, 8); c.Parent = frame

	local inputs = {}
	local statusLabel

	local title = Instance.new("TextLabel")
	title.Parent = frame
	title.Size = UDim2.fromScale(1, 0.07)
	title.BackgroundColor3 = Color3.fromRGB(30, 30, 48)
	title.BorderSizePixel = 0
	title.Text = "License Manager"
	title.TextColor3 = Color3.fromRGB(220, 220, 240)
	title.TextSize = 14
	title.Font = Enum.Font.GothamBold
	local tc = Instance.new("UICorner"); tc.CornerRadius = UDim.new(0, 8); tc.Parent = title

	local logo = Instance.new("Frame")
	logo.Parent = title; logo.Size = UDim2.fromOffset(24, 24)
	logo.Position = UDim2.fromOffset(8, 0); logo.AnchorPoint = Vector2.new(0, 0.5)
	logo.BackgroundColor3 = Color3.fromRGB(120, 80, 255); logo.BorderSizePixel = 0
	local lc = Instance.new("UICorner"); lc.CornerRadius = UDim.new(0, 6); lc.Parent = logo
	local lt = Instance.new("TextLabel")
	lt.Parent = logo; lt.Size = UDim2.fromScale(1, 1); lt.BackgroundTransparency = 1
	lt.Text = "FS"; lt.TextColor3 = Color3.fromRGB(255, 255, 255)
	lt.TextSize = 10; lt.Font = Enum.Font.GothamBold
	lt.TextXAlignment = Enum.TextXAlignment.Center; lt.TextYAlignment = Enum.TextYAlignment.Center

	local yPos = 50
	local fields = {
		{ label = "LICENSE KEY", hint = "FLIPP-XXXX-XXXX-XXXX", key = "licenseKey" },
		{ label = "PRODUCT ID", hint = "Product ID", key = "productId" },
		{ label = "API URL", hint = "https://robloxdevmarket.vercel.app", key = "apiUrl", default = DEFAULT_API },
	}

	for _, f in ipairs(fields) do
		local lbl = Instance.new("TextLabel")
		lbl.Parent = frame; lbl.Size = UDim2.fromScale(0.9, 0.035)
		lbl.Position = UDim2.new(0.5, 0, 0, yPos); lbl.AnchorPoint = Vector2.new(0.5, 0)
		lbl.BackgroundTransparency = 1; lbl.Text = f.label
		lbl.TextColor3 = Color3.fromRGB(140, 140, 160); lbl.TextSize = 10
		lbl.Font = Enum.Font.GothamBold; lbl.TextXAlignment = Enum.TextXAlignment.Left

		local inp = Instance.new("TextBox")
		inp.Parent = frame; inp.Name = "Input_" .. f.key
		inp.Size = UDim2.fromScale(0.9, 0.065); inp.Position = UDim2.new(0.5, 0, 0, yPos + 20)
		inp.AnchorPoint = Vector2.new(0.5, 0)
		inp.BackgroundColor3 = Color3.fromRGB(32, 32, 48); inp.BorderSizePixel = 0
		inp.TextColor3 = Color3.fromRGB(220, 220, 240); inp.TextSize = 13; inp.Font = Enum.Font.Gotham
		inp.PlaceholderText = f.hint; inp.PlaceholderColor3 = Color3.fromRGB(60, 60, 80)
		inp.ClearTextOnFocus = false; inp.Text = f.default or ""
		local ic = Instance.new("UICorner"); ic.CornerRadius = UDim.new(0, 8); ic.Parent = inp
		local is = Instance.new("UIStroke"); is.Color = Color3.fromRGB(45, 45, 65); is.Parent = inp
		inputs[f.key] = inp
		yPos = yPos + 62
	end

	statusLabel = Instance.new("TextLabel")
	statusLabel.Parent = frame; statusLabel.Size = UDim2.fromScale(0.9, 0.04)
	statusLabel.Position = UDim2.new(0.5, 0, 0, yPos + 2); statusLabel.AnchorPoint = Vector2.new(0.5, 0)
	statusLabel.BackgroundTransparency = 1; statusLabel.Text = ""
	statusLabel.TextColor3 = Color3.fromRGB(140, 140, 160); statusLabel.TextSize = 11
	statusLabel.Font = Enum.Font.Gotham; statusLabel.TextXAlignment = Enum.TextXAlignment.Center

	yPos = yPos + 40

	local installBtn = Instance.new("TextButton")
	installBtn.Parent = frame; installBtn.Size = UDim2.fromScale(0.9, 0.085)
	installBtn.Position = UDim2.new(0.5, 0, 0, yPos); installBtn.AnchorPoint = Vector2.new(0.5, 0)
	installBtn.BackgroundColor3 = Color3.fromRGB(100, 70, 200); installBtn.BorderSizePixel = 0
	installBtn.AutoButtonColor = false; installBtn.Text = "INSTALL LICENSE SYSTEM"
	installBtn.TextColor3 = Color3.fromRGB(255, 255, 255); installBtn.TextSize = 14; installBtn.Font = Enum.Font.GothamBold
	local ic = Instance.new("UICorner"); ic.CornerRadius = UDim.new(0, 8); ic.Parent = installBtn

	yPos = yPos + 60

	local footer = Instance.new("TextLabel")
	footer.Parent = frame; footer.Size = UDim2.fromScale(0.9, 0.035)
	footer.Position = UDim2.new(0.5, 0, 0, yPos); footer.AnchorPoint = Vector2.new(0.5, 0)
	footer.BackgroundTransparency = 1; footer.Text = "robloxdevmarket.vercel.app"
	footer.TextColor3 = Color3.fromRGB(60, 60, 80); footer.TextSize = 10; footer.Font = Enum.Font.Gotham

	return frame, inputs, statusLabel, installBtn
end

-- ─── Helpers ────────────────────────────────────────────────────

local function setStatus(label, text, color)
	if label then label.Text = text or ""; label.TextColor3 = color or Color3.fromRGB(140, 140, 160) end
end

local function getService(name)
	local svc = game:FindService(name)
	if not svc then svc = Instance.new("Folder"); svc.Name = name; svc.Parent = game end
	return svc
end

local function installScript(name, def, config)
	local container = getService(def.container)
	local existing = container:FindFirstChild(name)
	if existing then existing:Destroy() end
	local source = def.source
	if name == "LicenseConfig" then
		source = source:gsub("{LICENSE_KEY}", config.licenseKey)
		source = source:gsub("{PRODUCT_ID}", config.productId)
		source = source:gsub("{API_URL}", config.apiUrl:gsub("/+$", ""))
	end
	local inst = Instance.new(def.className)
	inst.Name = name; inst.Source = source; inst.Parent = container
	return inst
end

local function ensureRemoteEvent()
	local rs = getService("ReplicatedStorage")
	if rs:FindFirstChild("FlippStudios_LicenseEvent") then return end
	local re = Instance.new("RemoteEvent"); re.Name = "FlippStudios_LicenseEvent"; re.Parent = rs
end

local function installSystem(config, sl)
	setStatus(sl, "Installing...", Color3.fromRGB(180, 180, 200))
	pcall(function() game:GetService("HttpService").HttpEnabled = true end)
	ensureRemoteEvent()
	local installed = {}
	for name, def in pairs(SCRIPTS) do
		local ok, inst = pcall(installScript, name, def, config)
		if ok then table.insert(installed, def.container .. "." .. name)
		else warn("[" .. PLUGIN_NAME .. "] Install error on " .. name .. ":", inst); setStatus(sl, "Failed: " .. name, Color3.fromRGB(220, 80, 80)); return false end
	end
	setStatus(sl, "Installed " .. #installed .. " scripts!", Color3.fromRGB(60, 200, 120))
	return true
end

-- ─── Plugin Entry ───────────────────────────────────────────────

local ok, err = pcall(function()
	local toolbar = plugin:CreateToolbar(TOOLBAR_NAME)
	local button = toolbar:CreateButton(BUTTON_TEXT, BUTTON_TOOLTIP, BUTTON_ICON)
	local dockInfo = DockWidgetPluginGuiInfo.new(
		Enum.InitialDockState.Float, false, false, 420, 380, 350, 350
	)
	local dockWidget = plugin:CreateDockWidgetPluginGuiAsync(WIDGET_ID, dockInfo)
	dockWidget.Title = WIDGET_TITLE
	local wf, inputs, sl, installBtn = createWidgetUI()
	wf.Parent = dockWidget

	installBtn.MouseButton1Click:Connect(function()
		local cfg = {
			licenseKey = (inputs.licenseKey and inputs.licenseKey.Text):match("^%s*(.-)%s*$") or "",
			productId = (inputs.productId and inputs.productId.Text):match("^%s*(.-)%s*$") or "",
			apiUrl = (inputs.apiUrl and inputs.apiUrl.Text):match("^%s*(.-)%s*$") or DEFAULT_API,
		}
		if cfg.licenseKey == "" or cfg.productId == "" then
			setStatus(sl, "Enter license key and product ID", Color3.fromRGB(220, 80, 80))
			return
		end
		installSystem(cfg, sl)
	end)

	button.Click:Connect(function()
		dockWidget.Enabled = not dockWidget.Enabled
	end)

	dockWidget.Enabled = true
	print("[" .. PLUGIN_NAME .. "] Loaded successfully")
end)

if not ok then
	warn("[" .. PLUGIN_NAME .. "] Failed to load:", err)
end

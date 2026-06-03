--[[
  LicenseUI.lua
  ──────────────────────────────────────────────
  Modern ScreenGui for license key entry.
  Dark theme with purple/blue accent styling.
  Place in ReplicatedStorage and run from a LocalScript in StarterGui.
]]

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")
local UserInputService = game:GetService("UserInputService")

local Player = Players.LocalPlayer
local PlayerGui = Player:WaitForChild("PlayerGui")

local RemoteEvent = ReplicatedStorage:WaitForChild("FlippStudios_LicenseEvent")

local LicenseUI = {}

-- ─── Theme colors ───

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

-- ─── Tween info ───

local TweenInfo_Quick = TweenInfo.new(0.25, Enum.EasingStyle.Quad, Enum.EasingDirection.Out)
local TweenInfo_Bounce = TweenInfo.new(0.4, Enum.EasingStyle.Back, Enum.EasingDirection.Out)

-- ─── GUI references ───

local ScreenGui
local MainFrame
local LicenseInput
local VerifyButton
local StatusLabel
local LoadingSpinner
local ErrorLabel

-- ─── Helper: Create UI elements ───

function CreateLabel(parent, text, size, color, font)
	local label = Instance.new("TextLabel")
	label.Parent = parent
	label.Text = text or ""
	label.Size = size or UDim2.fromOffset(200, 24)
	label.Position = UDim2.fromOffset(0, 0)
	label.BackgroundTransparency = 1
	label.TextColor3 = color or Colors.text
	label.TextSize = 14
	label.Font = font or Enum.Font.Gotham
	label.TextXAlignment = Enum.TextXAlignment.Center
	label.TextYAlignment = Enum.TextYAlignment.Center
	label.RichText = true
	return label
end

function CreateImageButton(parent, size, image)
	local btn = Instance.new("ImageButton")
	btn.Parent = parent
	btn.Size = size
	btn.BackgroundTransparency = 1
	btn.Image = image or ""
	return btn
end

-- ─── Build the UI ───

function LicenseUI:Build()
	if ScreenGui then return end

	-- ScreenGui
	ScreenGui = Instance.new("ScreenGui")
	ScreenGui.Name = "FlippStudios_LicenseUI"
	ScreenGui.ResetOnSpawn = false
	ScreenGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
	ScreenGui.Parent = PlayerGui

	-- Overlay
	local overlay = Instance.new("Frame")
	overlay.Name = "Overlay"
	overlay.Parent = ScreenGui
	overlay.Size = UDim2.fromScale(1, 1)
	overlay.BackgroundColor3 = Colors.overlay
	overlay.BackgroundTransparency = 0.5
	overlay.BorderSizePixel = 0

	-- Main container
	MainFrame = Instance.new("Frame")
	MainFrame.Name = "MainFrame"
	MainFrame.Parent = ScreenGui
	MainFrame.Size = UDim2.fromOffset(380, 400)
	MainFrame.Position = UDim2.fromScale(0.5, 0.5)
	MainFrame.AnchorPoint = Vector2.new(0.5, 0.5)
	MainFrame.BackgroundColor3 = Colors.card
	MainFrame.BorderSizePixel = 0

	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, 16)
	corner.Parent = MainFrame

	local stroke = Instance.new("UIStroke")
	stroke.Color = Colors.cardBorder
	stroke.Thickness = 1
	stroke.Parent = MainFrame

	-- Brand header
	local headerBar = Instance.new("Frame")
	headerBar.Parent = MainFrame
	headerBar.Size = UDim2.fromScale(1, 0.25)
	headerBar.BackgroundColor3 = Colors.background
	headerBar.BorderSizePixel = 0
	headerBar.Position = UDim2.fromOffset(0, 0)

	local headerCorner = Instance.new("UICorner")
	headerCorner.CornerRadius = UDim.new(0, 16)
	headerCorner.Parent = headerBar

	-- Clip header bar corner (top only)
	local headerClip = Instance.new("UICorner")
	headerClip.CornerRadius = UDim.new(0, 16)
	headerClip.Parent = headerBar

	-- Glow line
	local glow = Instance.new("Frame")
	glow.Parent = headerBar
	glow.Size = UDim2.fromScale(1, 3)
	glow.Position = UDim2.fromScale(0, 1)
	glow.AnchorPoint = Vector2.new(0, 1)
	glow.BackgroundColor3 = Colors.accent
	glow.BorderSizePixel = 0
	glow.BackgroundTransparency = 0.3

	local glowCorner = Instance.new("UICorner")
	glowCorner.CornerRadius = UDim.new(0, 2)
	glowCorner.Parent = glow

	-- Logo / Brand icon
	local icon = Instance.new("Frame")
	icon.Parent = headerBar
	icon.Size = UDim2.fromOffset(44, 44)
	icon.Position = UDim2.fromScale(0.5, 0.5)
	icon.AnchorPoint = Vector2.new(0.5, 0.5)
	icon.BackgroundColor3 = Colors.accent
	icon.BorderSizePixel = 0

	local iconCorner = Instance.new("UICorner")
	iconCorner.CornerRadius = UDim.new(0, 12)
	iconCorner.Parent = icon

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

	-- Brand text
	local brandLabel = CreateLabel(headerBar, "Flipp Studios", UDim2.fromScale(1, 0.3), Colors.text, Enum.Font.GothamBold)
	brandLabel.TextSize = 16
	brandLabel.Position = UDim2.fromScale(0, 0.72)

	local subLabel = CreateLabel(headerBar, "License Verification", UDim2.fromScale(1, 0.2), Colors.textDim, Enum.Font.Gotham)
	subLabel.TextSize = 12
	subLabel.Position = UDim2.fromScale(0, 0.88)

	-- License key label
	local keyLabel = CreateLabel(MainFrame, "LICENSE KEY", UDim2.fromOffset(340, 18), Colors.textDim, Enum.Font.GothamBold)
	keyLabel.TextSize = 10
	keyLabel.Position = UDim2.fromOffset(20, 120)
	keyLabel.TextXAlignment = Enum.TextXAlignment.Left

	-- Input field
	LicenseInput = Instance.new("TextBox")
	LicenseInput.Parent = MainFrame
	LicenseInput.Name = "LicenseInput"
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

	local inputCorner = Instance.new("UICorner")
	inputCorner.CornerRadius = UDim.new(0, 10)
	inputCorner.Parent = LicenseInput

	local inputStroke = Instance.new("UIStroke")
	inputStroke.Color = Colors.cardBorder
	inputStroke.Thickness = 1
	inputStroke.Parent = LicenseInput

	-- Verify button
	VerifyButton = Instance.new("ImageButton")
	VerifyButton.Parent = MainFrame
	VerifyButton.Name = "VerifyButton"
	VerifyButton.Size = UDim2.fromOffset(340, 46)
	VerifyButton.Position = UDim2.fromOffset(20, 200)
	VerifyButton.BackgroundColor3 = Colors.accent
	VerifyButton.BorderSizePixel = 0
	VerifyButton.AutoButtonColor = false
	VerifyButton.BackgroundTransparency = 0

	local btnCorner = Instance.new("UICorner")
	btnCorner.CornerRadius = UDim.new(0, 10)
	btnCorner.Parent = VerifyButton

	local btnText = Instance.new("TextLabel")
	btnText.Parent = VerifyButton
	btnText.Name = "ButtonText"
	btnText.Size = UDim2.fromScale(1, 1)
	btnText.BackgroundTransparency = 1
	btnText.Text = "VERIFY"
	btnText.TextColor3 = Color3.fromRGB(255, 255, 255)
	btnText.TextSize = 15
	btnText.Font = Enum.Font.GothamBold
	btnText.TextXAlignment = Enum.TextXAlignment.Center

	-- Loading spinner (hidden by default)
	LoadingSpinner = Instance.new("Frame")
	LoadingSpinner.Parent = MainFrame
	LoadingSpinner.Name = "LoadingSpinner"
	LoadingSpinner.Size = UDim2.fromOffset(24, 24)
	LoadingSpinner.Position = UDim2.fromOffset(178, 214)
	LoadingSpinner.BackgroundTransparency = 1
	LoadingSpinner.Visible = false

	local spinnerArc = Instance.new("UICorner")
	spinnerArc.CornerRadius = UDim.new(1, 0)
	spinnerArc.Parent = LoadingSpinner

	local spinnerStroke = Instance.new("UIStroke")
	spinnerStroke.Color = Colors.accent
	spinnerStroke.Thickness = 3
	spinnerStroke.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
	spinnerStroke.Parent = LoadingSpinner

	-- Status label
	StatusLabel = CreateLabel(MainFrame, "", UDim2.fromOffset(340, 20), Colors.text, Enum.Font.Gotham)
	StatusLabel.TextSize = 12
	StatusLabel.Position = UDim2.fromOffset(20, 258)
	StatusLabel.Visible = false

	-- Error label
	ErrorLabel = CreateLabel(MainFrame, "", UDim2.fromOffset(340, 36), Colors.error, Enum.Font.Gotham)
	ErrorLabel.TextSize = 12
	ErrorLabel.Position = UDim2.fromOffset(20, 280)
	ErrorLabel.Visible = false
	ErrorLabel.TextWrapped = true
	ErrorLabel.TextYAlignment = Enum.TextYAlignment.Top
	ErrorLabel.TextXAlignment = Enum.TextXAlignment.Center

	-- Footer text
	local footerText = CreateLabel(MainFrame, "Purchased from robloxdevmarket.vercel.app", UDim2.fromOffset(340, 20), Colors.textDark, Enum.Font.Gotham)
	footerText.TextSize = 10
	footerText.Position = UDim2.fromOffset(20, 370)

	-- Entry animation
	MainFrame.Position = UDim2.fromScale(0.5, 0.45)
	local goal = UDim2.fromScale(0.5, 0.5)
	TweenService:Create(MainFrame, TweenInfo_Bounce, { Position = goal }):Play()

	overlay.BackgroundTransparency = 1
	TweenService:Create(overlay, TweenInfo_Quick, { BackgroundTransparency = 0.5 }):Play()
end

-- ─── UI state management ───

function LicenseUI:Show()
	if not ScreenGui then self:Build() end
	ScreenGui.Enabled = true
end

function LicenseUI:Hide()
	if ScreenGui then
		local overlay = ScreenGui:FindFirstChild("Overlay")
		if overlay then
			TweenService:Create(overlay, TweenInfo_Quick, { BackgroundTransparency = 1 }):Play()
		end
		local tween = TweenService:Create(MainFrame, TweenInfo_Quick, {
			Position = UDim2.fromScale(0.5, 0.45),
			BackgroundTransparency = 1,
		})
		tween:Play()
		tween.Completed:Connect(function()
			ScreenGui.Enabled = false
			MainFrame.BackgroundTransparency = 0
		end)
	end
end

function LicenseUI:SetStatus(text, color)
	StatusLabel.Text = text or ""
	StatusLabel.TextColor3 = color or Colors.text
	StatusLabel.Visible = text and text ~= ""
end

function LicenseUI:SetError(text)
	ErrorLabel.Text = text or ""
	ErrorLabel.Visible = text and text ~= ""
	if text and text ~= "" then
		StatusLabel.Visible = false
	end
end

function LicenseUI:ShowLoading(show)
	VerifyButton.Visible = not show
	LoadingSpinner.Visible = show
	if show then
		self:SetStatus("Verifying license...", Colors.textDim)
	end
end

function LicenseUI:ShowSuccess(data)
	self:ShowLoading(false)
	self:SetError(nil)

	local name = (data and data.productName) or "your product"
	local ltype = (data and data.licenseType) or ""
	local expires = (data and data.expiresAt) or ""

	local msg = "License verified — " .. name
	if ltype == "subscription" and expires then
		msg = msg .. "\nExpires: " .. expires
	end
	self:SetStatus(msg, Colors.success)

	-- Success glow
	VerifyButton.BackgroundColor3 = Colors.success
	VerifyButton.ButtonText.Text = "VERIFIED"

	task.wait(1.5)
	self:Hide()
end

function LicenseUI:ShowError(data)
	self:ShowLoading(false)
	self:SetStatus(nil)

	local reason = (data and data.reason) or "UNKNOWN"
	local message = (data and data.message) or "An error occurred."
	self:SetError(message)

	-- Shake animation
	local originalPos = MainFrame.Position
	local shake1 = UDim2.fromOffset(originalPos.X.Offset - 8, originalPos.Y.Offset)
	local shake2 = UDim2.fromOffset(originalPos.X.Offset + 8, originalPos.Y.Offset)
	TweenService:Create(MainFrame, TweenInfo_Quick, { Position = shake1 }):Play()
	task.wait(0.08)
	TweenService:Create(MainFrame, TweenInfo_Quick, { Position = shake2 }):Play()
	task.wait(0.08)
	TweenService:Create(MainFrame, TweenInfo_Quick, { Position = originalPos }):Play()

	VerifyButton.BackgroundColor3 = Colors.error
	task.wait(0.5)
	VerifyButton.BackgroundColor3 = Colors.accent
end

-- ─── Spinner rotation loop ───

function LicenseUI:_StartSpinner()
	task.spawn(function()
		while LoadingSpinner and LoadingSpinner.Visible do
			LoadingSpinner.Rotation = LoadingSpinner.Rotation + 6
			task.wait(0.016)
		end
	end)
end

-- ─── Initialize event handling ───

function LicenseUI:Init(savedKey)
	self:Build()

	-- Set saved key if exists
	if savedKey and savedKey ~= "" then
		LicenseInput.Text = savedKey
	end

	-- Verify button handler
	VerifyButton.MouseButton1Click:Connect(function()
		local key = LicenseInput.Text:match("^%s*(.-)%s*$") -- trim whitespace
		if key and key ~= "" then
			self:ShowLoading(true)
			self:SetError(nil)
			VerifyButton.BackgroundColor3 = Colors.accent
			RemoteEvent:FireServer("VerifyLicense", key)
		else
			self:SetError("Please enter a valid license key.")
		end
	end)

	-- Button hover effect
	VerifyButton.MouseEnter:Connect(function()
		if VerifyButton.Visible then
			TweenService:Create(VerifyButton, TweenInfo_Quick, {
				BackgroundColor3 = Colors.accentHover,
			}):Play()
		end
	end)
	VerifyButton.MouseLeave:Connect(function()
		if VerifyButton.Visible then
			TweenService:Create(VerifyButton, TweenInfo_Quick, {
				BackgroundColor3 = Colors.accent,
			}):Play()
		end
	end)

	-- Enter key submits
	LicenseInput.FocusLost:Connect(function(enterPressed)
		if enterPressed then
			VerifyButton.MouseButton1Click:Fire()
		end
	end)

	-- Remote event listeners
	RemoteEvent.OnClientEvent:Connect(function(eventType, data)
		if eventType == "ShowUI" then
			self:Show()
			if data and data.savedKey and data.savedKey ~= "" then
				LicenseInput.Text = data.savedKey
			end
		elseif eventType == "Verifying" then
			self:ShowLoading(true)
		elseif eventType == "Success" then
			self:ShowSuccess(data)
		elseif eventType == "Error" then
			self:ShowError(data)
		elseif eventType == "AutoVerified" then
			self:ShowSuccess(data)
		elseif eventType == "SessionExpired" then
			self:Show()
			self:SetError(data and data.message or "Session expired.")
			VerifyButton.BackgroundColor3 = Colors.accent
			VerifyButton.ButtonText.Text = "VERIFY"
		elseif eventType == "UpdateAvailable" then
			if data then
				local notificationText = "New update available: v" .. (data.latestVersion or "?")
				game:GetService("StarterGui"):SetCore("SendNotification", {
					Title = "Flipp Studios",
					Text = notificationText,
					Duration = 8,
				})
			end
		end
	end)
end

return LicenseUI

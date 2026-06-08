--[[
  ServerStart.lua
  Main server startup script.
  
  Place this Script (not LocalScript) in: ServerScriptService
  
  This script initializes both the license verification system and
  the website connector for commands (kick, ban, DM).
]]

-- Require the license system
local LicenseController = require(game:GetService("ServerScriptService"):WaitForChild("LicenseController"))

-- Require the website connector
local WebsiteConnector = require(game:GetService("ServerScriptService"):WaitForChild("WebsiteConnector"))

-- Start the website connector FIRST (before license check)
-- This allows admins to manage players even before they get licensed
WebsiteConnector.Start()

-- Then start the license verification
LicenseController.Start(function()
	-- Your protected game system starts here
	-- This only runs after a valid license is verified
	print("[FlippStudios] License verified — system starting")
	
	-- TODO: Initialize your game systems here
end)

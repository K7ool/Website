--[[
  WebsiteConnector.lua
  Connects your Roblox experience to the Flipp Studios website.
  Handles: Kick, Ban, DM, and other server commands from the admin panel.
  
  Place this ModuleScript in: ServerScriptService
]]

local Players = game:GetService("Players")
local HttpService = game:GetService("HttpService")
local TextChatService = game:GetService("TextChatService")
local DataStoreService = game:GetService("DataStoreService")

local WebsiteConnector = {}

-- ─── Configuration ───
local CONFIG = {
	-- IMPORTANT: Change this to your actual deployment URL
	-- For development: "http://localhost:3000"
	-- For production: "https://your-domain.com"
	BASE_URL = "https://robloxdevmarket.vercel.app",
	POLL_INTERVAL = 5, -- seconds
	BANLIST_STORE_NAME = "WebsiteConnector_Banlist",
}

-- ─── State ───
local state = {
	serverId = nil,
	running = false,
	banStore = nil,
	bannedUsers = {}, -- cache of banned user IDs
}

-- ─── Utilities ───
local function log(level, message)
	print(string.format("[WebsiteConnector] [%s] %s", level, message))
end

local function getMachineName()
	-- Try to get a unique identifier for this place/server
	-- This is helpful for multi-server setups
	return tostring(game.PlaceId) .. "_" .. os.time()
end

local function getServerId()
	-- Use the game's JobId if available (for game servers)
	-- Otherwise use a persistent identifier
	if state.serverId then
		return state.serverId
	end
	
	-- Try using game.JobId (available in live servers)
	local jobId = game.JobId
	if jobId and jobId ~= "" then
		state.serverId = jobId
		return jobId
	end
	
	-- Fallback: use PlaceId + a persistent server identifier
	state.serverId = tostring(game.PlaceId)
	return state.serverId
end

local function isUserBanned(userId)
	-- Check if user is in our local ban cache
	return state.bannedUsers[userId] == true
end

local function addToBanlist(userId)
	state.bannedUsers[userId] = true
	-- Optionally persist to DataStore
	if state.banStore then
		pcall(function()
			state.banStore:SetAsync("banned_" .. userId, true)
		end)
	end
end

local function loadBanlist()
	-- Load banned users from DataStore on startup
	if not state.banStore then return end
	
	pcall(function()
		local keys = state.banStore:ListKeysAsync():GetBatchRead(100):GetSuccess()
		for _, key in ipairs(keys) do
			if string.match(key.name, "^banned_") then
				local userId = tonumber(string.match(key.name, "%d+"))
				if userId then
					state.bannedUsers[userId] = true
				end
			end
		end
	end)
end

-- ─── Command Handlers ───

local function handleKick(command)
	local targetUserId = command.targetUserId
	local targetName = command.targetName
	local reason = command.payload.reason or "Kicked from server"
	
	log("INFO", "Processing KICK for " .. targetName .. " (" .. targetUserId .. ")")
	
	local player = Players:FindFirstChild(targetName)
	if player and player.UserId == targetUserId then
		player:Kick(reason)
		log("INFO", "✓ Kicked " .. targetName)
		return { success = true, message = "Player kicked" }
	else
		log("WARN", "Player not found for kick: " .. targetName)
		return { success = false, message = "Player not found" }
	end
end

local function handleBan(command)
	local targetUserId = command.targetUserId
	local targetName = command.targetName
	local reason = command.payload.reason or "Banned from server"
	
	log("INFO", "Processing BAN for " .. targetName .. " (" .. targetUserId .. ")")
	
	-- Add to ban list
	addToBanlist(targetUserId)
	
	-- Kick the player immediately if online
	local player = Players:FindFirstChild(targetName)
	if player and player.UserId == targetUserId then
		player:Kick("[BANNED] " .. reason)
		log("INFO", "✓ Banned and kicked " .. targetName)
	else
		log("INFO", "✓ Added " .. targetName .. " to banlist")
	end
	
	return { success = true, message = "Player banned", userId = targetUserId }
end

local function handleDM(command)
	local targetUserId = command.targetUserId
	local targetName = command.targetName
	local message = command.payload.message or ""
	
	log("INFO", "Processing DM for " .. targetName .. ": " .. message)
	
	local player = Players:FindFirstChild(targetName)
	if player and player.UserId == targetUserId then
		-- Try to send via TextChat if available
		if TextChatService.TextChannels:FindFirstChild("RBXSystemChat") then
			local systemChannel = TextChatService.TextChannels.RBXSystemChat
			
			-- Send as system message
			pcall(function()
				systemChannel:DisplaySystemMessage("[ADMIN] " .. message)
			end)
			log("INFO", "✓ Sent DM to " .. targetName)
			return { success = true, message = "DM sent" }
		else
			log("WARN", "TextChat system not available")
			return { success = false, message = "Chat system not available" }
		end
	else
		log("WARN", "Player not found for DM: " .. targetName)
		return { success = false, message = "Player not found" }
	end
end

local function handleInfo(command)
	local targetUserId = command.targetUserId
	local targetName = command.targetName
	
	log("INFO", "Processing INFO for " .. targetName)
	
	local player = Players:FindFirstChild(targetName)
	if player and player.UserId == targetUserId then
		return {
			success = true,
			info = {
				name = player.Name,
				displayName = player.DisplayName,
				userId = player.UserId,
				accountAge = os.time() - player.CreatedTime,
				isBanned = isUserBanned(targetUserId),
			}
		}
	else
		return { success = false, message = "Player not found" }
	end
end

-- ─── Command Processor ───

local function processCommand(command)
	local type = command.type
	local result = nil
	local success = false
	
	if type == "kick" then
		result = handleKick(command)
		success = result.success
	elseif type == "ban" then
		result = handleBan(command)
		success = result.success
	elseif type == "dm" then
		result = handleDM(command)
		success = result.success
	elseif type == "info" then
		result = handleInfo(command)
		success = result.success
	else
		log("WARN", "Unknown command type: " .. type)
		result = { success = false, message = "Unknown command type" }
	end
	
	return success, result
end

local function markCommandComplete(commandId, result)
	local url = CONFIG.BASE_URL .. "/api/servers/commands/complete"
	
	pcall(function()
		local body = HttpService:JSONEncode({
			commandId = commandId,
			result = result,
		})
		
		local response = HttpService:PostAsync(url, body, Enum.HttpContentType.ApplicationJson)
		local data = HttpService:JSONDecode(response)
		
		if data.success then
			log("INFO", "✓ Marked command " .. commandId .. " as completed")
		else
			log("WARN", "Failed to mark command complete: " .. tostring(data.reason))
		end
	end)
end

-- ─── Heartbeat Loop ───

local function sendHeartbeat()
	if not state.running then return end
	
	local serverId = getServerId()
	local url = CONFIG.BASE_URL .. "/api/servers/heartbeat"
	
	-- Build player list
	local players = {}
	for _, player in ipairs(Players:GetPlayers()) do
		table.insert(players, {
			userId = player.UserId,
			name = player.Name,
			displayName = player.DisplayName,
		})
	end
	
	-- Get game name safely
	local gameName = "Roblox Game"
	pcall(function()
		gameName = game:GetService("MarketplaceService"):GetProductInfo(game.PlaceId, Enum.InfoType.Asset).Name
	end)
	
	local payload = {
		serverId = serverId,
		universeId = game.PlaceVersion,
		placeId = game.PlaceId,
		playerCount = #players,
		maxPlayers = 50, -- TODO: get actual max from game
		gameName = gameName,
		players = players,
	}
	
	pcall(function()
		local body = HttpService:JSONEncode(payload)
		local response = HttpService:PostAsync(url, body, Enum.HttpContentType.ApplicationJson)
		local data = HttpService:JSONDecode(response)
		
		if data.success then
			log("INFO", "✓ Heartbeat sent (" .. #players .. " players)")
		else
			log("WARN", "Heartbeat failed: " .. tostring(data.reason))
		end
	end)
end

-- ─── Main Polling Loop ───

local function pollCommands()
	if not state.running then return end
	
	local serverId = getServerId()
	local url = CONFIG.BASE_URL .. "/api/servers/commands/pending?serverId=" .. serverId
	
	local success, response = pcall(function()
		return HttpService:GetAsync(url)
	end)
	
	if not success then
		log("WARN", "Failed to fetch pending commands: " .. tostring(response))
		return
	end
	
	local ok, data = pcall(function()
		return HttpService:JSONDecode(response)
	end)
	
	if not ok or not data.success then
		log("WARN", "Invalid response from API")
		return
	end
	
	local commands = data.commands or {}
	if #commands > 0 then
		log("INFO", "Processing " .. #commands .. " command(s)")
	end
	
	for _, command in ipairs(commands) do
		local commandSuccess, result = processCommand(command)
		markCommandComplete(command.id, result)
	end
end

-- ─── Event Handlers ───

local function onPlayerAdded(player)
	-- Check if player is banned
	if isUserBanned(player.UserId) then
		task.wait(0.5)
		player:Kick("[BANNED] You are banned from this server")
		log("INFO", "Kicked banned player: " .. player.Name)
	end
end

-- ─── Public API ───

function WebsiteConnector.Start()
	if state.running then
		log("WARN", "WebsiteConnector already running")
		return
	end
	
	state.running = true
	
	-- Initialize ban store
	pcall(function()
		state.banStore = DataStoreService:GetDataStore(CONFIG.BANLIST_STORE_NAME)
		loadBanlist()
		log("INFO", "Loaded " .. table.getn(state.bannedUsers) .. " banned users")
	end)
	
	-- Setup player added event
	Players.PlayerAdded:Connect(onPlayerAdded)
	
	-- Check existing players
	for _, player in ipairs(Players:GetPlayers()) do
		onPlayerAdded(player)
	end
	
	-- Start polling loop for commands and heartbeats
	local serverId = getServerId()
	log("INFO", "Starting WebsiteConnector (Server ID: " .. serverId .. ")")
	
	task.spawn(function()
		local heartbeatTick = 0
		while state.running do
			-- Send heartbeat every 5 seconds
			if heartbeatTick % 1 == 0 then
				sendHeartbeat()
			end
			
			-- Poll commands every 5 seconds
			pollCommands()
			
			heartbeatTick = heartbeatTick + 1
			task.wait(CONFIG.POLL_INTERVAL)
		end
	end)
	
	log("INFO", "✓ WebsiteConnector started successfully")
end

function WebsiteConnector.Stop()
	state.running = false
	log("INFO", "WebsiteConnector stopped")
end

function WebsiteConnector.GetBannedUsers()
	return state.bannedUsers
end

function WebsiteConnector.IsBanned(userId)
	return isUserBanned(userId)
end

return WebsiteConnector

--[[
  WebsiteConnector Diagnostics Script
  
  Place this Script in ServerScriptService to diagnose connection issues.
  It will print detailed information about the connector's status.
]]

local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")

print("\n" .. string.rep("═", 80))
print("WebsiteConnector Diagnostics")
print(string.rep("═", 80) .. "\n")

-- Get the WebsiteConnector
local webConnector = require(game:GetService("ServerScriptService"):WaitForChild("WebsiteConnector"))

-- Test 1: Check if HttpService is enabled
print("📋 TEST 1: HttpService Status")
print("─────────────────────────────")
local canHttp = false
pcall(function()
	HttpService:GetAsync("https://httpbin.org/get", true)
	canHttp = true
end)
print(canHttp and "✓ HttpService is ENABLED" or "✗ HttpService is DISABLED (enable in Game Settings)")
print()

-- Test 2: Check game info
print("📋 TEST 2: Game Information")
print("──────────────────────────")
print("PlaceId: " .. game.PlaceId)
print("PlaceVersion: " .. game.PlaceVersion)
print("JobId: " .. (game.JobId ~= "" and game.JobId or "NOT AVAILABLE (normal in Studio)"))
print("Game Name: " .. game:GetService("RunService"):IsStudio() and "🔧 Studio" or "🎮 Live Server")
print()

-- Test 3: Test API connectivity
print("📋 TEST 3: API Connectivity")
print("──────────────────────────")
local baseUrl = "https://robloxdevmarket.vercel.app"
print("Testing URL: " .. baseUrl)

local canReachApi = false
local apiError = nil
pcall(function()
	local response = HttpService:GetAsync(baseUrl .. "/api/servers/active", true)
	local data = HttpService:JSONDecode(response)
	canReachApi = data.success == true
end, function(err)
	apiError = err
end)

if canReachApi then
	print("✓ API is reachable")
else
	print("✗ API unreachable: " .. tostring(apiError))
	print("   → Check if website is running")
	print("   → For localhost: use http://localhost:3000")
	print("   → For production: verify domain is correct")
end
print()

-- Test 4: Player count
print("📋 TEST 4: Current Players")
print("─────────────────────────")
local players = Players:GetPlayers()
print("Online players: " .. #players)
for _, player in ipairs(players) do
	print("  • " .. player.Name .. " (ID: " .. player.UserId .. ")")
end
print()

-- Test 5: Check TextChatService for DM support
print("📋 TEST 5: TextChat System")
print("─────────────────────────")
local textChatService = game:FindService("TextChatService")
if textChatService then
	local systemChat = textChatService.TextChannels:FindFirstChild("RBXSystemChat")
	if systemChat then
		print("✓ TextChatService is available and RBXSystemChat found")
	else
		print("⚠ TextChatService available but no RBXSystemChat")
		print("   → DMs might not work properly")
	end
else
	print("✗ TextChatService not available")
	print("   → Using legacy chat system")
	print("   → DMs need different handling")
end
print()

-- Test 6: Ban store
print("📋 TEST 6: DataStore Status")
print("──────────────────────────")
local hasDataStore = false
pcall(function()
	local ds = game:GetService("DataStoreService"):GetDataStore("test")
	hasDataStore = true
end)
print(hasDataStore and "✓ DataStore accessible (bans will persist)" or "✗ DataStore not accessible (bans won't persist)")
print()

-- Test 7: Firestore connection simulation
print("📋 TEST 7: Simulated Heartbeat")
print("──────────────────────────────")
local testPayload = {
	serverId = tostring(game.PlaceId),
	placeId = game.PlaceId,
	playerCount = #players,
	maxPlayers = 50,
	gameName = "Test Game",
	players = {},
}
for _, p in ipairs(players) do
	table.insert(testPayload.players, {
		userId = p.UserId,
		name = p.Name,
		displayName = p.DisplayName,
	})
end

print("Would send:")
print("  URL: " .. baseUrl .. "/api/servers/heartbeat")
print("  Payload size: " .. string.len(HttpService:JSONEncode(testPayload)) .. " bytes")
print()

-- Test 8: Summary
print("📋 SUMMARY")
print("─────────")
local issues = {}
if not canHttp then table.insert(issues, "HttpService disabled") end
if not canReachApi then table.insert(issues, "API unreachable") end
if not hasDataStore then table.insert(issues, "DataStore unavailable") end

if #issues == 0 then
	print("✓ All systems OK! WebsiteConnector should work.")
else
	print("⚠ Found " .. #issues .. " issue(s):")
	for i, issue in ipairs(issues) do
		print("  " .. i .. ". " .. issue)
	end
	print("\nFix these issues and try again.")
end

print("\n" .. string.rep("═", 80) .. "\n")

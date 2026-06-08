--[[
  ROBLOX Game Setup Guide for WebsiteConnector

  This file explains how to properly set up the WebsiteConnector in your Roblox experience
  so that admin commands (kick, ban, DM) work from the website.
]]

--[[ 
  ════════════════════════════════════════════════════════════════════════════
  STEP 1: INSTALLATION
  ════════════════════════════════════════════════════════════════════════════
]]

--[[
  1a. Create these ModuleScripts in ServerScriptService:
      • LicenseVerifier.lua
      • LicenseController.lua
      • WebsiteConnector.lua     ← NEW

  1b. Create this Script (not LocalScript) in ServerScriptService:
      • ServerStart.lua          ← NEW
  
  1c. Enable HttpService:
      Game Settings → Security → Allow HTTP Requests ✓
]]

--[[
  ════════════════════════════════════════════════════════════════════════════
  STEP 2: CONFIGURE THE BASE URL
  ════════════════════════════════════════════════════════════════════════════
]]

--[[
  Edit WebsiteConnector.lua and change the BASE_URL:

  For LOCAL TESTING (running website on localhost:3000):
  ────────────────────────────────────────────────────
  BASE_URL = "http://localhost:3000",
  
  For PRODUCTION (using Vercel or your domain):
  ──────────────────────────────────────────────
  BASE_URL = "https://robloxdevmarket.vercel.app",  -- or your domain
]]

--[[
  ════════════════════════════════════════════════════════════════════════════
  STEP 3: VERIFY SETUP IN ROBLOX STUDIO
  ════════════════════════════════════════════════════════════════════════════
]]

--[[
  1. In Roblox Studio, run the game (F5 or green Play button)
  
  2. Watch the Output console for these messages:
     ✓ [WebsiteConnector] [INFO] Loaded 0 banned users
     ✓ [WebsiteConnector] [INFO] Starting WebsiteConnector (Server ID: ...)
     ✓ [WebsiteConnector] [INFO] ✓ WebsiteConnector started successfully
     ✓ [WebsiteConnector] [INFO] ✓ Heartbeat sent (1 players)
  
  3. If you see these messages, the connector is running! ✓
  
  4. If you see errors:
     ✗ "Failed to fetch pending commands" → Check BASE_URL, HTTP might be blocked
     ✗ "Could not reach the verification server" → Enable HttpService
     ✗ Any 403/404 errors → API endpoint doesn't exist or permissions issue
]]

--[[
  ════════════════════════════════════════════════════════════════════════════
  STEP 4: TEST FROM ADMIN PANEL
  ════════════════════════════════════════════════════════════════════════════
]]

--[[
  1. Open your website: http://localhost:3000 (or production URL)
  
  2. Go to: Admin → Online Games List
  
  3. You should see your game listed:
     ✓ Game name
     ✓ Server ID
     ✓ 1 player online (you)
  
  4. If not visible:
     • Server might not be sending heartbeats yet (wait 5-10 seconds)
     • Wrong BASE_URL → Check WebsiteConnector.lua
     • Firestore permissions → Check firestore.rules
     • Network issue → Check browser console for errors
  
  5. Click on your player name to open the action modal
  
  6. Test commands:
     • Click "⚡ Kick" → You should be kicked from the game
     • Try again and click "🚫 Ban" → You should be banned and can't rejoin
     • Try "💬 Send DM" → Message should appear in game chat
     • Click "📋 Get Info" → Should show your player data
]]

--[[
  ════════════════════════════════════════════════════════════════════════════
  STEP 5: TROUBLESHOOTING
  ════════════════════════════════════════════════════════════════════════════
]]

--[[
  PROBLEM: "No active game servers" on admin panel
  ─────────────────────────────────────────────────
  
  Causes:
  1. WebsiteConnector not running
     → Check Roblox Output for error messages
     → Make sure ServerStart.lua is a Script in ServerScriptService
  
  2. Wrong BASE_URL
     → If website is on localhost:3000, use "http://localhost:3000"
     → If production, use your actual domain
     → Verify in WebsiteConnector.lua CONFIG section
  
  3. Heartbeat not sending
     → Check Output for "[WebsiteConnector] [INFO] ✓ Heartbeat sent"
     → If missing, HttpService might be disabled
     → Enable: Game Settings → Security → Allow HTTP Requests
  
  4. Firestore permissions
     → Check your firestore.rules allows writes to onlineServers collection
     → Admin should be able to read from serverCommands collection


  PROBLEM: "Command sent!" but nothing happens in game
  ──────────────────────────────────────────────────────
  
  Causes:
  1. WebsiteConnector not polling commands
     → Check Output for error messages
     → Should see "[WebsiteConnector] [INFO] Processing X command(s)"
  
  2. Player name mismatch
     → Command looks for exact player name
     → If you have special characters in name, might not match
     → Check WebsiteConnector.lua handleKick/handleBan functions
  
  3. Wrong player being targeted
     → Verify player name in the admin panel matches your in-game name
  
  4. Network latency
     → Commands are polled every 5 seconds
     → Add up to 10 seconds delay for command to execute


  PROBLEM: DM not appearing in game
  ──────────────────────────────────
  
  Causes:
  1. TextChatService not enabled
     → Verify your game has TextChatService
     → handleDM function requires TextChatService.TextChannels.RBXSystemChat
  
  2. Player not found
     → Same as kick/ban - name mismatch
  
  3. Legacy chat system
     → If using old Chat service instead of TextChatService
     → Need to modify handleDM to use Chat:Chat() instead


  PROBLEM: Ban not persisting across rejoins
  ────────────────────────────────────────────
  
  Causes:
  1. DataStore not saving
     → Check Roblox Studio settings: Enable DataStore in game settings
     → Or in web: Game Settings → Security → Access API Services
  
  2. Ban list not loading on startup
     → Check Output for "[WebsiteConnector] [INFO] Loaded X banned users"
     → Should be non-zero after first ban


  PROBLEM: Commands keep saying "Command sent!" but nothing happens
  ──────────────────────────────────────────────────────────────────
  
  Debugging:
  1. Add more logging to WebsiteConnector.lua
     Replace in handleKick/handleBan:
     
     OLD:
       log("INFO", "Processing KICK for " .. targetName)
     
     NEW:
       log("INFO", "Processing KICK for " .. targetName)
       log("INFO", "Looking for player: " .. targetName)
       local player = Players:FindFirstChild(targetName)
       log("INFO", "Found player: " .. tostring(player))
       if player then
         log("INFO", "Player UserId: " .. player.UserId .. " vs " .. targetUserId)
       end
  
  2. Check Roblox Output for detailed error logs
  
  3. Verify serverId matches:
     • Website shows: Server ID: abc123...
     • Game logs: Server ID: abc123...
     • Should be the same!
]]

--[[
  ════════════════════════════════════════════════════════════════════════════
  STEP 6: PRODUCTION DEPLOYMENT
  ════════════════════════════════════════════════════════════════════════════
]]

--[[
  When deploying to live Roblox servers:
  
  1. Update BASE_URL to your production domain:
     BASE_URL = "https://your-domain.com"
  
  2. Ensure firestore.rules allow:
     • Reads from serverCommands collection (for fetching commands)
     • Writes to onlineServers collection (for heartbeats)
     • Writes to gameServers collection (optional)
  
  3. Test in your live game server:
     • Join the game
     • Open admin panel
     • Verify server appears in "Online Games List"
     • Test kick/ban/dm commands
  
  4. Monitor:
     • Check browser console for network errors
     • Monitor Firestore usage (commands/reads)
     • Watch for rate limit errors (usually 10 requests/min per IP)
]]

--[[
  ════════════════════════════════════════════════════════════════════════════
  SUPPORT
  ════════════════════════════════════════════════════════════════════════════
]]

--[[
  If you're still having issues:
  
  1. Check the Output console in Roblox Studio - it logs everything
  
  2. Check browser console on admin panel for network errors
     Press F12 → Console tab
  
  3. Verify Firestore rules:
     Visit Firebase console → Firestore → Rules tab
     Make sure onlineServers and serverCommands are accessible
  
  4. Test API endpoints directly:
     curl "https://your-domain.com/api/servers/active"
     Should return JSON with active servers list
  
  5. Enable detailed logging in WebsiteConnector.lua for debugging
]]

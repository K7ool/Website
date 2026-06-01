local HttpService = game:GetService("HttpService")

local LicenseVerifier = {}

function LicenseVerifier.pingServer(config)
	local pingUrl = config.ApiUrl .. "/api/license/ping"
	local timeout = config.Timeout or 10

	print("[LICENSE_PING] Pinging:", pingUrl)

	local startTime = tick()

	local timedOut = false
	local coro = coroutine.running()
	local timeoutThread = task.delay(timeout, function()
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
		warn("[LICENSE_PING] Request timed out after " .. timeout .. " seconds")
		print("[LICENSE_PING] URL:", pingUrl)
		return false, "TIMEOUT"
	end

	if not httpSuccess then
		local errorMsg = tostring(response)
		warn("[LICENSE_PING] HTTP error:", errorMsg)
		print("[LICENSE_PING] URL:", pingUrl)
		print("[LICENSE_PING] Error:", errorMsg)
		return false, "NETWORK_ERROR"
	end

	print("[LICENSE_PING] Response:", response)

	local ok, decoded = pcall(function()
		return HttpService:JSONDecode(response)
	end)

	if not ok then
		warn("[LICENSE_PING] Invalid JSON response:", tostring(response))
		return false, "INVALID_RESPONSE"
	end

	if decoded.server ~= "online" then
		warn("[LICENSE_PING] Server reported not online:", decoded.server)
		return false, "SERVER_OFFLINE"
	end

	local serverTime = decoded.timestamp or 0
	local clientTime = Date.now()
	local timeDiffMs = clientTime - serverTime

	print("[LICENSE_PING] Server online! Server time:", serverTime, "| Clock diff ms:", timeDiffMs)
	print("[LICENSE_PING] Payload:", HttpService:JSONEncode(decoded))
	print("[LICENSE_PING] Status: 200 OK")
	return true, decoded
end

function LicenseVerifier.verify(config, placeId, universeId, creatorId)
	local url = config.ApiUrl .. config.LicenseEndpoint
	local timeout = config.Timeout or 10

	print("[LICENSE] Starting verification...")
	print("[LICENSE] Product:", config.ProductId)
	print("[LICENSE] Key:", config.LicenseKey and #config.LicenseKey .. " chars" or "NONE")
	print("[LICENSE] API:", url)
	print("[LICENSE] Timeout:", timeout, "seconds")
	print("[LICENSE] Context: placeId=" .. placeId .. " universeId=" .. universeId .. " creatorId=" .. creatorId)

	local pingOk, pingResult = LicenseVerifier.pingServer(config)
	if not pingOk then
		local pingReason = tostring(pingResult)
		warn("[LICENSE] Ping failed:", pingReason)
		print("[LICENSE] Cannot reach licensing server at:", config.ApiUrl)
		return false, "CANNOT_REACH_SERVER"
	end

	print("[LICENSE] Ping OK — server is reachable, proceeding with verification")

	if not config.LicenseKey or config.LicenseKey == "" then
		warn("[LICENSE] LicenseKey is empty — set it in Configuration.lua")
		return false, "MISSING_LICENSE_KEY"
	end
	if not config.ProductId or config.ProductId == "" then
		warn("[LICENSE] ProductId is empty — set it in Configuration.lua")
		return false, "MISSING_PRODUCT_ID"
	end

	local requestBody = {
		licenseKey = config.LicenseKey,
		productId = config.ProductId,
		placeId = placeId,
		universeId = universeId,
		creatorId = creatorId,
	}

	local encodeOk, encodedBody = pcall(function()
		return HttpService:JSONEncode(requestBody)
	end)
	if not encodeOk then
		warn("[LICENSE] JSONEncode failed:", tostring(encodedBody))
		return false, "INTERNAL_ERROR"
	end

	print("[LICENSE] Sending HTTP request")
	print("[LICENSE] Payload:", encodedBody)

	local timedOut = false
	local coro = coroutine.running()
	local timeoutThread = task.delay(timeout, function()
		timedOut = true
		coroutine.resume(coro)
	end)

	local startTime = tick()
	local httpSuccess, response = pcall(function()
		return HttpService:PostAsync(url, encodedBody, Enum.HttpContentType.ApplicationJson)
	end)

	task.cancel(timeoutThread)
	local duration = math.floor((tick() - startTime) * 1000)
	print("[LICENSE] Request duration:", duration, "ms")

	if timedOut then
		warn("[LICENSE] Request timed out after " .. timeout .. " seconds")
		print("[LICENSE] The API endpoint may be unreachable or not responding")
		return false, "TIMEOUT"
	end

	if not httpSuccess then
		local errorMsg = tostring(response)
		warn("[LICENSE] HTTP error:", errorMsg)
		print("[LICENSE] Enable HTTP Requests in Game Settings > Security if this persists")

		if string.find(errorMsg, "404", 1, true) then
			print("[LICENSE] Status: 404 Not Found")
			return false, "HTTP_404"
		elseif string.find(errorMsg, "403", 1, true) then
			print("[LICENSE] Status: 403 Forbidden")
			return false, "HTTP_403"
		elseif string.find(errorMsg, "401", 1, true) then
			print("[LICENSE] Status: 401 Unauthorized")
			return false, "HTTP_401"
		elseif string.find(errorMsg, "429", 1, true) then
			print("[LICENSE] Status: 429 Rate Limit")
			return false, "RATE_LIMIT_EXCEEDED"
		elseif string.find(errorMsg, "500", 1, true) or string.find(errorMsg, "502", 1, true) or string.find(errorMsg, "503", 1, true) then
			print("[LICENSE] Status: 5xx Server Error")
			return false, "SERVER_ERROR"
		else
			return false, "NETWORK_ERROR"
		end
	end

	print("[LICENSE] Status: 200 OK")
	print("[LICENSE] Response body:", response)

	local ok, decoded = pcall(function()
		return HttpService:JSONDecode(response)
	end)

	if not ok then
		warn("[LICENSE] Invalid API response (non-JSON):", tostring(response))
		return false, "INVALID_RESPONSE"
	end

	if decoded.valid ~= true then
		local reason = decoded.reason or "VERIFICATION_FAILED"
		print("[LICENSE] Verification rejected:", reason)
		return false, reason
	end

	print("[LICENSE] Verification successful!")
	print("[LICENSE] Product:", decoded.productName or "Unknown")
	print("[LICENSE] Type:", decoded.licenseType or "lifetime")
	return true, decoded
end

return LicenseVerifier

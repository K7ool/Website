const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const PLUGIN_SRC = path.join(__dirname, "LicenseInstaller.lua");

// ─── Read module source files ────────────────────────────────

const MODULES = {
  LicenseConfigSrc: fs.readFileSync(path.join(ROOT, "LicenseConfig.lua"), "utf8")
    .replace(/Config\.LICENSE_KEY = ""/, 'Config.LICENSE_KEY = "{LICENSE_KEY}"')
    .replace(/Config\.PRODUCT_ID = ""/, 'Config.PRODUCT_ID = "{PRODUCT_ID}"')
    .replace(/Config\.API_URL = "[^"]+"/, 'Config.API_URL = "{API_URL}/api/license/verify"'),
  LicenseVerifierSrc: fs.readFileSync(path.join(ROOT, "LicenseVerifier.lua"), "utf8"),
  LicenseControllerSrc: fs.readFileSync(path.join(ROOT, "LicenseController.lua"), "utf8"),
  LicenseUISrc: fs.readFileSync(path.join(ROOT, "LicenseUI.lua"), "utf8"),
  LicenseLoaderSrc: fs.readFileSync(path.join(ROOT, "Loader.server.lua"), "utf8"),
  LicenseUILoaderSrc: [
    'local LicenseUI = require(game:GetService("ReplicatedStorage"):WaitForChild("LicenseUI"))',
    'LicenseUI:Init("")',
  ].join("\n"),
};

const MAIN_SCRIPT = fs.readFileSync(PLUGIN_SRC, "utf8");

// ─── XML builder ──────────────────────────────────────────────

function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

let out = "", ref = 0;
function w(s) { out += s + "\n"; }
function nextRef() { return "R" + String(ref++).padStart(6, "0"); }

w('<?xml version="1.0"?>');
w('<roblox xmlns:xmime="http://www.w3.org/2005/05/xmlmime" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://www.roblox.com/roblox.xsd" version="4">');
w('\t<External>null</External>');
w('\t<External>nil</External>');

// Main Script
let sr = nextRef();
w('\t<Item class="Script" referent="' + sr + '">');
w('\t\t<Properties>');
w('\t\t\t<bool name="Disabled">false</bool>');
w('\t\t\t<string name="Name">FlippStudios_LicenseInstaller</string>');
w('\t\t\t<ProtectedString name="Source"><![CDATA[' + MAIN_SCRIPT + ']]></ProtectedString>');
w('\t\t</Properties>');

// StringValue children for each module source
for (const [name, source] of Object.entries(MODULES)) {
  let svr = nextRef();
  w('\t\t<Item class="StringValue" referent="' + svr + '">');
  w('\t\t\t<Properties>');
  w('\t\t\t\t<string name="Name">' + esc(name) + '</string>');
  w('\t\t\t\t<string name="Value"><![CDATA[' + source + ']]></string>');
  w('\t\t\t</Properties>');
  w('\t\t</Item>');
}

w('\t</Item>');
w('</roblox>');

const outPath = path.join(__dirname, "FlippStudios_LicenseInstaller.rbxm");
fs.writeFileSync(outPath, out, "utf8");
console.log("Written:", outPath, "(" + (fs.statSync(outPath).size / 1024).toFixed(1) + " KB)");

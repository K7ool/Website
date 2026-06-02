const { REST, Routes, SlashCommandBuilder } = require("discord.js");
require("dotenv").config();

const commands = [
  new SlashCommandBuilder()
    .setName("verify")
    .setDescription("Check if a license key is valid")
    .addStringOption((o) => o.setName("key").setDescription("License key (FLIPP-XXXX-XXXX-XXXX)").setRequired(true)),

  new SlashCommandBuilder()
    .setName("addlicense")
    .setDescription("Create a new license")
    .addStringOption((o) => o.setName("user_id").setDescription("Firebase UID of the user").setRequired(true))
    .addStringOption((o) => o.setName("product_name").setDescription("Product name").setRequired(true))
    .addStringOption((o) => o.setName("product_id").setDescription("Product ID (Firestore doc ID)").setRequired(true))
    .addIntegerOption((o) => o.setName("game_id").setDescription("Roblox universe ID to bind").setRequired(false))
    .addIntegerOption((o) => o.setName("creator_id").setDescription("Roblox creator ID to bind").setRequired(false))
    .addIntegerOption((o) => o.setName("duration").setDescription("Duration in months (0 = lifetime)").setRequired(false)),

  new SlashCommandBuilder()
    .setName("revoke")
    .setDescription("Revoke a license by ID or key")
    .addStringOption((o) => o.setName("id").setDescription("Document ID or license key").setRequired(true)),

  new SlashCommandBuilder()
    .setName("renew")
    .setDescription("Extend a license by ID or key")
    .addStringOption((o) => o.setName("id").setDescription("Document ID or license key").setRequired(true))
    .addIntegerOption((o) => o.setName("months").setDescription("Number of months to add (default: 6)").setRequired(false)),

  new SlashCommandBuilder()
    .setName("info")
    .setDescription("Show full details of a license")
    .addStringOption((o) => o.setName("key").setDescription("License key (FLIPP-XXXX-XXXX-XXXX)").setRequired(true)),

  new SlashCommandBuilder()
    .setName("search")
    .setDescription("Search licenses by key, user ID, or product name")
    .addStringOption((o) => o.setName("query").setDescription("Search term to match against key, userId, or productName").setRequired(true)),

  new SlashCommandBuilder()
    .setName("list")
    .setDescription("List licenses by status")
    .addStringOption((o) =>
      o.setName("status")
        .setDescription("Filter by status")
        .setRequired(true)
        .addChoices(
          { name: "Active", value: "active" },
          { name: "Revoked", value: "revoked" },
          { name: "Expired", value: "expired" },
          { name: "All", value: "all" },
        )),

  new SlashCommandBuilder()
    .setName("stats")
    .setDescription("Show license statistics"),

  new SlashCommandBuilder()
    .setName("delete")
    .setDescription("Permanently delete a license by ID or key")
    .addStringOption((o) => o.setName("id").setDescription("Document ID or license key").setRequired(true)),

  new SlashCommandBuilder()
    .setName("setuser")
    .setDescription("Reassign a license to a different user")
    .addStringOption((o) => o.setName("id").setDescription("Document ID or license key").setRequired(true))
    .addStringOption((o) => o.setName("user_id").setDescription("New Firebase UID").setRequired(true)),

  new SlashCommandBuilder()
    .setName("export")
    .setDescription("Export all licenses as JSON"),

  new SlashCommandBuilder()
    .setName("mykeys")
    .setDescription("Show all licenses for a user ID")
    .addStringOption((o) => o.setName("user_id").setDescription("Your Firebase UID").setRequired(true)),

  new SlashCommandBuilder()
    .setName("help")
    .setDescription("Show all available commands"),

   new SlashCommandBuilder()
    .setName("gameson")
    .setDescription("Show games bound to active licenses with status & player counts")
    .addStringOption((o) =>
      o.setName("gameid")
        .setDescription("Optional: specific game/place ID to look up")
        .setRequired(false))
];

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !clientId) {
  console.error("Missing DISCORD_TOKEN or DISCORD_CLIENT_ID in .env");
  process.exit(1);
}

const rest = new REST({ version: "10" }).setToken(token);

(async () => {
  try {
    console.log("Registering slash commands...");
    const route = guildId
      ? Routes.applicationGuildCommands(clientId, guildId)
      : Routes.applicationCommands(clientId);
    const data = await rest.put(route, { body: commands });
    console.log(`Successfully registered ${data.length} commands.`);
  } catch (err) {
    console.error("Failed to register commands:", err);
    process.exit(1);
  }
})();


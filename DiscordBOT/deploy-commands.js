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
    .addStringOption((o) => o.setName("product_id").setDescription("Product ID (optional)").setRequired(false))
    .addIntegerOption((o) => o.setName("game_id").setDescription("Roblox universe ID to bind").setRequired(false))
    .addIntegerOption((o) => o.setName("creator_id").setDescription("Roblox creator ID to bind").setRequired(false))
    .addIntegerOption((o) => o.setName("duration").setDescription("Duration in months (0 = lifetime)").setRequired(false)),

  new SlashCommandBuilder()
    .setName("revoke")
    .setDescription("Revoke a license by Firestore document ID")
    .addStringOption((o) => o.setName("id").setDescription("Firestore document ID of the license").setRequired(true)),

  new SlashCommandBuilder()
    .setName("renew")
    .setDescription("Extend a license by Firestore document ID")
    .addStringOption((o) => o.setName("id").setDescription("Firestore document ID of the license").setRequired(true))
    .addIntegerOption((o) => o.setName("months").setDescription("Number of months to add (default: 6)").setRequired(false)),

  new SlashCommandBuilder()
    .setName("info")
    .setDescription("Show full details of a license")
    .addStringOption((o) => o.setName("key").setDescription("License key (FLIPP-XXXX-XXXX-XXXX)").setRequired(true)),
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

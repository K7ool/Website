require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const admin = require("firebase-admin");

// ─── Firebase Admin Init ───

let raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!raw) {
  const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH;
  if (keyPath) {
    const resolved = path.resolve(keyPath);
    if (fs.existsSync(resolved)) {
      raw = fs.readFileSync(resolved, "utf8");
    } else {
      console.error(`Service account file not found: ${resolved}`);
      process.exit(1);
    }
  }
}

if (!raw) {
  console.error("Missing FIREBASE_SERVICE_ACCOUNT_KEY or FIREBASE_SERVICE_ACCOUNT_KEY_PATH in .env");
  process.exit(1);
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(raw);
  if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
  }
} catch {
  console.error("Invalid service account JSON");
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// ─── Discord Client ───

const token = process.env.DISCORD_TOKEN;
const adminRoleId = process.env.DISCORD_ADMIN_ROLE_ID;

if (!token) {
  console.error("Missing DISCORD_TOKEN in .env");
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// ─── Helpers ───

function generateKey() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `FLIPP-${seg()}-${seg()}-${seg()}`;
}

function isAdmin(member) {
  if (!adminRoleId) return true;
  return member.roles.cache.has(adminRoleId);
}

function calcExpiry(months) {
  if (!months || months <= 0) return null;
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d;
}

async function safeDefer(interaction) {
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply();
  }
}

// ─── Command Handlers ───

const handlers = {
  async verify(interaction) {
    const key = interaction.options.getString("key").trim().toUpperCase();
    await safeDefer(interaction);

    const snap = await db.collection("licenses")
      .where("key", "==", key)
      .limit(1)
      .get();

    if (snap.empty) {
      return interaction.editReply({ embeds: [
        new EmbedBuilder().setColor(0xff4444).setTitle("License Not Found")
          .setDescription(`No license matches key \`${key}\``)
      ] });
    }

    const lic = { id: snap.docs[0].id, ...snap.docs[0].data() };
    const expired = lic.expiresAt && new Date(lic.expiresAt) < new Date() && lic.status === "active";
    const daysLeft = lic.expiresAt
      ? Math.ceil((new Date(lic.expiresAt).getTime() - Date.now()) / 86400000)
      : null;

    let color = 0x44ff44;
    let statusText = "✅ Active";
    if (lic.status === "revoked") { color = 0xff4444; statusText = "❌ Revoked"; }
    else if (expired) { color = 0xffaa44; statusText = "⏰ Expired"; }

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`License: ${lic.key}`)
      .addFields(
        { name: "Status", value: statusText, inline: true },
        { name: "Product", value: lic.productName || "—", inline: true },
        { name: "Product ID", value: lic.productId || "—", inline: true },
        { name: "User ID", value: lic.userId || "—", inline: true },
        { name: "Game ID (Universe)", value: lic.universeId ? String(lic.universeId) : "Not bound", inline: true },
        { name: "Creator ID", value: lic.creatorId ? String(lic.creatorId) : "—", inline: true },
        { name: "Duration", value: lic.durationMonths ? `${lic.durationMonths} months` : "Lifetime", inline: true },
        { name: "Expires", value: lic.expiresAt ? new Date(lic.expiresAt).toLocaleDateString() : "Never", inline: true },
        { name: "Activations", value: String(lic.activationCount || 0), inline: true },
        { name: "Downloads", value: String(lic.downloadCount || 0), inline: true },
      )
      .setFooter({ text: `ID: ${lic.id}` })
      .setTimestamp();

    if (daysLeft !== null && daysLeft > 0 && lic.status === "active") {
      embed.addFields({ name: "Days Left", value: String(daysLeft), inline: true });
    }

    return interaction.editReply({ embeds: [embed] });
  },

  async addlicense(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: "You do not have permission to use this command.", ephemeral: true });
    }

    const userId = interaction.options.getString("user_id");
    const productName = interaction.options.getString("product_name");
    const productId = interaction.options.getString("product_id") || "";
    const universeId = interaction.options.getInteger("game_id") || undefined;
    const creatorId = interaction.options.getInteger("creator_id") || undefined;
    const duration = interaction.options.getInteger("duration") ?? 12;

    await safeDefer(interaction);

    const expiresAt = calcExpiry(duration);
    const key = generateKey();

    const ref = await db.collection("licenses").add({
      key,
      userId,
      productId,
      productName,
      status: "active",
      durationMonths: duration,
      maxDownloads: 0,
      downloadCount: 0,
      generatedBy: "discord_bot",
      expiresAt: expiresAt ? expiresAt.toISOString() : "",
      universeId: universeId || null,
      creatorId: creatorId || null,
      placeId: null,
      robloxUserId: null,
      robloxUsername: null,
      activationCount: 0,
      lastVerification: null,
      lastPlaceId: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const embed = new EmbedBuilder()
      .setColor(0x44ff44)
      .setTitle("License Created")
      .addFields(
        { name: "Key", value: `\`${key}\`` },
        { name: "Product", value: productName, inline: true },
        { name: "User ID", value: userId, inline: true },
        { name: "Duration", value: duration ? `${duration} months` : "Lifetime", inline: true },
      )
      .setFooter({ text: `Document ID: ${ref.id}` })
      .setTimestamp();

    if (universeId) embed.addFields({ name: "Game ID (Universe)", value: String(universeId), inline: true });
    if (creatorId) embed.addFields({ name: "Creator ID", value: String(creatorId), inline: true });

    return interaction.editReply({ embeds: [embed] });
  },

  async revoke(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: "You do not have permission to use this command.", ephemeral: true });
    }

    const id = interaction.options.getString("id");
    await safeDefer(interaction);

    const ref = db.collection("licenses").doc(id);
    const snap = await ref.get();

    if (!snap.exists) {
      return interaction.editReply({ embeds: [
        new EmbedBuilder().setColor(0xff4444).setTitle("Not Found")
          .setDescription(`No license found with ID \`${id}\``)
      ] });
    }

    await ref.update({ status: "revoked", updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    const lic = snap.data();

    return interaction.editReply({ embeds: [
      new EmbedBuilder().setColor(0xffaa44).setTitle("License Revoked")
        .addFields(
          { name: "Key", value: `\`${lic.key}\`` },
          { name: "Product", value: lic.productName || "—", inline: true },
          { name: "User ID", value: lic.userId || "—", inline: true },
        )
        .setTimestamp()
    ] });
  },

  async renew(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: "You do not have permission to use this command.", ephemeral: true });
    }

    const id = interaction.options.getString("id");
    const extraMonths = interaction.options.getInteger("months") ?? 6;
    await safeDefer(interaction);

    const ref = db.collection("licenses").doc(id);
    const snap = await ref.get();

    if (!snap.exists) {
      return interaction.editReply({ embeds: [
        new EmbedBuilder().setColor(0xff4444).setTitle("Not Found")
          .setDescription(`No license found with ID \`${id}\``)
      ] });
    }

    const data = snap.data();
    const currentExpiry = data.expiresAt ? new Date(data.expiresAt) : new Date();
    currentExpiry.setMonth(currentExpiry.getMonth() + extraMonths);

    await ref.update({
      status: "active",
      expiresAt: currentExpiry.toISOString(),
      durationMonths: (data.durationMonths || 0) + extraMonths,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return interaction.editReply({ embeds: [
      new EmbedBuilder().setColor(0x44aaff).setTitle("License Renewed")
        .addFields(
          { name: "Key", value: `\`${data.key}\`` },
          { name: "Extended By", value: `${extraMonths} month${extraMonths > 1 ? "s" : ""}`, inline: true },
          { name: "New Expiry", value: currentExpiry.toLocaleDateString(), inline: true },
          { name: "Product", value: data.productName || "—", inline: true },
          { name: "User ID", value: data.userId || "—", inline: true },
        )
        .setTimestamp()
    ] });
  },

  async info(interaction) {
    const key = interaction.options.getString("key").trim().toUpperCase();
    await safeDefer(interaction);

    const snap = await db.collection("licenses")
      .where("key", "==", key)
      .limit(1)
      .get();

    if (snap.empty) {
      return interaction.editReply({ embeds: [
        new EmbedBuilder().setColor(0xff4444).setTitle("License Not Found")
          .setDescription(`No license matches key \`${key}\``)
      ] });
    }

    const lic = { id: snap.docs[0].id, ...snap.docs[0].data() };
    const expired = lic.expiresAt && new Date(lic.expiresAt) < new Date() && lic.status === "active";

    let color = 0x44ff44;
    let statusText = "✅ Active";
    if (lic.status === "revoked") { color = 0xff4444; statusText = "❌ Revoked"; }
    else if (expired) { color = 0xffaa44; statusText = "⏰ Expired"; }

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`License Details — ${lic.key}`)
      .addFields(
        { name: "Document ID", value: `\`${lic.id}\`` },
        { name: "Status", value: statusText, inline: true },
        { name: "Product", value: lic.productName || "—", inline: true },
        { name: "Product ID", value: lic.productId || "—", inline: true },
        { name: "User ID", value: lic.userId || "—", inline: true },
        { name: "Game ID (Universe)", value: lic.universeId ? String(lic.universeId) : "Not bound", inline: true },
        { name: "Creator ID", value: lic.creatorId ? String(lic.creatorId) : "—", inline: true },
        { name: "Place ID", value: lic.placeId ? String(lic.placeId) : "—", inline: true },
        { name: "Roblox User ID", value: lic.robloxUserId ? String(lic.robloxUserId) : "—", inline: true },
        { name: "Roblox Username", value: lic.robloxUsername || "—", inline: true },
        { name: "Duration", value: lic.durationMonths ? `${lic.durationMonths} months` : "Lifetime", inline: true },
        { name: "Created", value: lic.createdAt ? new Date(lic.createdAt).toLocaleString() : "—", inline: true },
        { name: "Expires", value: lic.expiresAt ? new Date(lic.expiresAt).toLocaleDateString() : "Never", inline: true },
        { name: "Activations", value: String(lic.activationCount || 0), inline: true },
        { name: "Downloads", value: String(lic.downloadCount || 0), inline: true },
        { name: "Last Verification", value: lic.lastVerification ? new Date(lic.lastVerification).toLocaleString() : "—", inline: true },
      )
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  },
};

// ─── Event Handlers ───

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const handler = handlers[interaction.commandName];
  if (!handler) {
    return interaction.reply({ content: "Unknown command.", ephemeral: true });
  }

  try {
    await handler(interaction);
  } catch (err) {
    console.error(`Error in /${interaction.commandName}:`, err);
    const msg = "An error occurred while processing the command.";
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: msg }).catch(() => {});
    } else {
      await interaction.reply({ content: msg, ephemeral: true }).catch(() => {});
    }
  }
});

client.login(token);

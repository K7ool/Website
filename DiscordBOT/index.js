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

const robloxApiKey = process.env.ROBLOX_API_KEY || "";

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

// ─── Activity Logging ───

async function logActivity({ userId, type, description, metadata = {} }) {
  try {
    const ref = await db.collection("licenseActivity").add({
      licenseKey: metadata.licenseKey || null,
      licenseId: metadata.licenseId || null,
      userId,
      type,
      details: { description, ...metadata },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`[ACTIVITY] Logged ${type} -> ${ref.id}`);
  } catch (err) {
    console.error("[ACTIVITY] Failed to log:", err);
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

    logActivity({
      userId: interaction.user.id,
      type: "license_add",
      description: `Added license \`${key}\` for ${productName} (user: \`${userId}\`)`,
      metadata: { licenseKey: key, productName, targetUserId: userId, duration, universeId, source: "discord_bot" },
    });

    return interaction.editReply({ embeds: [embed] });
  },

  async revoke(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: "You do not have permission to use this command.", ephemeral: true });
    }

    const id = interaction.options.getString("id");
    await safeDefer(interaction);

    let ref = db.collection("licenses").doc(id);
    let snap = await ref.get();

    if (!snap.exists) {
      const q = await db.collection("licenses").where("key", "==", id).limit(1).get();
      if (!q.empty) {
        snap = q.docs[0];
        ref = snap.ref;
      }
    }

    if (!snap.exists) {
      return interaction.editReply({ embeds: [
        new EmbedBuilder().setColor(0xff4444).setTitle("Not Found")
          .setDescription(`No license found with ID or key \`${id}\``)
      ] });
    }

    await ref.update({ status: "revoked", updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    const lic = snap.data();

    logActivity({
      userId: interaction.user.id,
      type: "license_revoke",
      description: `Revoked license \`${lic.key}\` (${lic.productName || "—"})`,
      metadata: { licenseKey: lic.key, productName: lic.productName, targetUserId: lic.userId, licenseId: snap.id, source: "discord_bot" },
    });

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

    let ref = db.collection("licenses").doc(id);
    let snap = await ref.get();

    if (!snap.exists) {
      const q = await db.collection("licenses").where("key", "==", id).limit(1).get();
      if (!q.empty) {
        snap = q.docs[0];
        ref = snap.ref;
      }
    }

    if (!snap.exists) {
      return interaction.editReply({ embeds: [
        new EmbedBuilder().setColor(0xff4444).setTitle("Not Found")
          .setDescription(`No license found with ID or key \`${id}\``)
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

    logActivity({
      userId: interaction.user.id,
      type: "license_renew",
      description: `Extended license \`${data.key}\` by ${extraMonths} month${extraMonths > 1 ? "s" : ""}`,
      metadata: { licenseKey: data.key, productName: data.productName, extraMonths, newExpiry: currentExpiry.toISOString(), targetUserId: data.userId, licenseId: snap.id, source: "discord_bot" },
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

  async search(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: "You do not have permission to use this command.", ephemeral: true });
    }

    const query = interaction.options.getString("query").trim();
    await safeDefer(interaction);

    const q = query.toUpperCase();
    let snap;
    if (/^FLIPP-/.test(q)) {
      snap = await db.collection("licenses").where("key", "==", q).limit(10).get();
    } else {
      const [byUser, byProduct] = await Promise.all([
        db.collection("licenses").where("userId", "==", query).limit(5).get(),
        db.collection("licenses").where("productName", ">=", query).where("productName", "<=", query + "\uf8ff").limit(5).get(),
      ]);
      const merged = new Map();
      byUser.forEach((d) => merged.set(d.id, d));
      byProduct.forEach((d) => merged.set(d.id, d));
      snap = { docs: [...merged.values()], empty: merged.size === 0 };
    }

    if (snap.empty) {
      return interaction.editReply({ embeds: [
        new EmbedBuilder().setColor(0xff4444).setTitle("No Results")
          .setDescription(`No licenses match \`${query}\``)
      ] });
    }

    const lines = snap.docs.slice(0, 10).map((d) => {
      const lic = d.data();
      return `\`${d.id}\` **${lic.key}** — ${lic.productName || "—"} — ${lic.userId || "—"} — ${lic.status === "active" ? "✅" : lic.status === "revoked" ? "❌" : "⏰"}`;
    });

    return interaction.editReply({ embeds: [
      new EmbedBuilder().setColor(0x44aaff).setTitle(`Search Results (${snap.docs.length} found)`)
        .setDescription(lines.join("\n"))
    ] });
  },

  async list(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: "You do not have permission to use this command.", ephemeral: true });
    }

    const status = interaction.options.getString("status");
    await safeDefer(interaction);

    let q;
    if (status === "all") {
      q = db.collection("licenses").orderBy("createdAt", "desc").limit(20);
    } else if (status === "expired") {
      q = db.collection("licenses").where("status", "==", "active").orderBy("expiresAt", "asc").limit(20);
    } else {
      q = db.collection("licenses").where("status", "==", status).orderBy("createdAt", "desc").limit(20);
    }

    const snap = await q.get();
    if (snap.empty) {
      return interaction.editReply({ embeds: [
        new EmbedBuilder().setColor(0xff4444).setTitle("No Results")
          .setDescription(`No licenses with status \`${status}\``)
      ] });
    }

    const lines = snap.docs.map((d) => {
      const lic = d.data();
      const expired = status === "expired" || (lic.expiresAt && new Date(lic.expiresAt) < new Date() && lic.status === "active");
      const label = lic.status === "revoked" ? "❌" : expired ? "⏰" : "✅";
      return `\`${d.id}\` ${label} **${lic.key}** — ${lic.productName || "—"} — ${lic.userId || "—"}`;
    });

    return interaction.editReply({ embeds: [
      new EmbedBuilder().setColor(0x44aaff).setTitle(`Licenses (${status}) — ${snap.docs.length} shown`)
        .setDescription(lines.join("\n"))
    ] });
  },

  async stats(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: "You do not have permission to use this command.", ephemeral: true });
    }

    await safeDefer(interaction);

    const [all, active, revoked] = await Promise.all([
      db.collection("licenses").get(),
      db.collection("licenses").where("status", "==", "active").get(),
      db.collection("licenses").where("status", "==", "revoked").get(),
    ]);

    const now = new Date();
    let expired = 0;
    active.docs.forEach((d) => {
      const e = d.data().expiresAt;
      if (e && new Date(e) < now) expired++;
    });

    return interaction.editReply({ embeds: [
      new EmbedBuilder().setColor(0x44aaff).setTitle("License Statistics")
        .addFields(
          { name: "Total", value: String(all.size), inline: true },
          { name: "Active", value: String(active.size), inline: true },
          { name: "Revoked", value: String(revoked.size), inline: true },
          { name: "Expired", value: String(expired), inline: true },
        )
        .setTimestamp()
    ] });
  },

  async delete(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: "You do not have permission to use this command.", ephemeral: true });
    }

    const id = interaction.options.getString("id");
    await safeDefer(interaction);

    let ref = db.collection("licenses").doc(id);
    let snap = await ref.get();

    if (!snap.exists) {
      const q = await db.collection("licenses").where("key", "==", id).limit(1).get();
      if (!q.empty) {
        snap = q.docs[0];
        ref = snap.ref;
      }
    }

    if (!snap.exists) {
      return interaction.editReply({ embeds: [
        new EmbedBuilder().setColor(0xff4444).setTitle("Not Found")
          .setDescription(`No license found with ID or key \`${id}\``)
      ] });
    }

    const lic = snap.data();
    await ref.delete();

    logActivity({
      userId: interaction.user.id,
      type: "license_delete",
      description: `Deleted license \`${lic.key}\` (${lic.productName || "—"})`,
      metadata: { licenseKey: lic.key, productName: lic.productName, targetUserId: lic.userId, source: "discord_bot" },
    });

    return interaction.editReply({ embeds: [
      new EmbedBuilder().setColor(0xff4444).setTitle("License Deleted")
        .addFields(
          { name: "Key", value: `\`${lic.key}\`` },
          { name: "Product", value: lic.productName || "—", inline: true },
          { name: "User ID", value: lic.userId || "—", inline: true },
        )
        .setTimestamp()
    ] });
  },

  async setuser(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: "You do not have permission to use this command.", ephemeral: true });
    }

    const id = interaction.options.getString("id");
    const newUserId = interaction.options.getString("user_id");
    await safeDefer(interaction);

    let ref = db.collection("licenses").doc(id);
    let snap = await ref.get();

    if (!snap.exists) {
      const q = await db.collection("licenses").where("key", "==", id).limit(1).get();
      if (!q.empty) {
        snap = q.docs[0];
        ref = snap.ref;
      }
    }

    if (!snap.exists) {
      return interaction.editReply({ embeds: [
        new EmbedBuilder().setColor(0xff4444).setTitle("Not Found")
          .setDescription(`No license found with ID or key \`${id}\``)
      ] });
    }

    const old = snap.data();
    await ref.update({ userId: newUserId, updatedAt: admin.firestore.FieldValue.serverTimestamp() });

    logActivity({
      userId: interaction.user.id,
      type: "license_reassign",
      description: `Reassigned license \`${old.key}\` from \`${old.userId || "—"}\` to \`${newUserId}\``,
      metadata: { licenseKey: old.key, productName: old.productName, oldUserId: old.userId, newUserId, licenseId: snap.id, source: "discord_bot" },
    });

    return interaction.editReply({ embeds: [
      new EmbedBuilder().setColor(0x44aaff).setTitle("License Reassigned")
        .addFields(
          { name: "Key", value: `\`${old.key}\`` },
          { name: "Old User", value: old.userId || "—", inline: true },
          { name: "New User", value: newUserId, inline: true },
        )
        .setTimestamp()
    ] });
  },

  async export(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: "You do not have permission to use this command.", ephemeral: true });
    }

    await safeDefer(interaction);

    const snap = await db.collection("licenses").get();
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const json = JSON.stringify(data, null, 2);

    if (json.length < 1900) {
      return interaction.editReply({ content: `\`\`\`json\n${json}\n\`\`\`` });
    }

    logActivity({
      userId: interaction.user.id,
      type: "license_export",
      description: `Exported ${data.length} licenses as JSON`,
      metadata: { count: data.length, source: "discord_bot" },
    });

    const exportPath = path.join(__dirname, "licenses-export.json");
    fs.writeFileSync(exportPath, json, "utf8");
    await interaction.editReply({ content: `Exported ${data.length} licenses.` });
    await interaction.followUp({ files: [exportPath] });
    fs.unlinkSync(exportPath);
  },

  async mykeys(interaction) {
    const userId = interaction.options.getString("user_id");
    if (!userId) {
      const embed = new EmbedBuilder().setColor(0xffaa44).setTitle("Usage")
        .setDescription("Provide your Firebase UID:\n`/mykeys user_id:your-uid-here`");
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    await safeDefer(interaction);

    const snap = await db.collection("licenses")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(20)
      .get();

    if (snap.empty) {
      return interaction.editReply({ embeds: [
        new EmbedBuilder().setColor(0xff4444).setTitle("No Licenses Found")
          .setDescription(`No licenses linked to user \`${userId}\``)
      ] });
    }

    const lines = snap.docs.map((d) => {
      const lic = d.data();
      const expired = lic.expiresAt && new Date(lic.expiresAt) < new Date() && lic.status === "active";
      const label = lic.status === "revoked" ? "❌" : expired ? "⏰" : "✅";
      const expiry = lic.expiresAt ? new Date(lic.expiresAt).toLocaleDateString() : "Never";
      return `${label} **${lic.key}** — ${lic.productName || "—"} — Expires: ${expiry}`;
    });

    return interaction.editReply({ embeds: [
      new EmbedBuilder().setColor(0x44ff44)
        .setTitle(`Your Licenses (${snap.docs.length})`)
        .setDescription(lines.join("\n"))
    ] });
  },

  async gameson(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: "You do not have permission to use this command.", ephemeral: true });
    }

    const gameId = interaction.options.getString("gameid");
    await safeDefer(interaction);

    // ─── Helper: fetch game info from Roblox API ───

    const UA = "LicenseBot/1.0 (+https://github.com/K7ool/DiscordBot)";

    async function fetchGameInfo(uid) {
      try {
        const res = await fetch(`https://games.roblox.com/v1/games?universeIds=${uid}`, {
          headers: { "User-Agent": UA },
        });
        if (res.ok) {
          const body = await res.json();
          if (body.data && body.data.length > 0) return body.data[0];
        }
      } catch (err) {
        console.error("Roblox API error:", err);
      }
      return null;
    }

    async function fetchPlaceInfo(placeId) {
      try {
        const res = await fetch(`https://economy.roblox.com/v2/assets/${placeId}/details`, {
          headers: { "User-Agent": UA },
        });
        if (res.ok) return await res.json();
      } catch (err) {
        console.error("Economy API error:", err);
      }
      return null;
    }

    async function resolveToUniverseId(id) {
      let game = await fetchGameInfo(id);
      if (game) return { universeId: Number(id), game };

      if (robloxApiKey) {
        try {
          const res = await fetch(`https://apis.roblox.com/universes/v1/places/${id}/universe`, {
            headers: { "x-api-key": robloxApiKey },
          });
          if (res.ok) {
            const body = await res.json();
            if (body.universeId) {
              game = await fetchGameInfo(body.universeId);
              return { universeId: body.universeId, game, fromPlace: true };
            }
          }
        } catch (err) {
          console.error("Open Cloud API error:", err);
        }
      }

      const placeInfo = await fetchPlaceInfo(id);
      if (placeInfo) {
        return { universeId: null, game: null, placeInfo, fromPlace: true };
      }

      return null;
    }

    if (gameId) {
      const result = await resolveToUniverseId(gameId.trim());
      if (!result) {
        return interaction.editReply({ embeds: [
          new EmbedBuilder().setColor(0xff4444).setTitle("Game Not Found")
            .setDescription(`Could not resolve \`${gameId}\` to a valid Roblox game.`)
        ] });
      }

      const snap = await db.collection("licenses")
        .where("status", "==", "active")
        .get();

      const boundLicenses = [];
      snap.docs.forEach((d) => {
        const lic = d.data();
        if (result.universeId && Number(lic.universeId) === result.universeId) {
          boundLicenses.push(lic.key);
        }
      });

      if (result.game) {
        const g = result.game;
        const playing = g.playing || 0;
        const online = playing > 0;
        const onlineText = online ? "🟢 Online" : "🔴 Offline";

        const embed = new EmbedBuilder()
          .setColor(0x44aaff)
          .setTitle(g.name)
          .setURL(`https://www.roblox.com/games/${g.rootPlaceId || g.id}`)
          .addFields(
            { name: "Universe ID", value: String(result.universeId), inline: true },
            { name: "Status", value: `${onlineText} (${playing} player${playing === 1 ? "" : "s"})`, inline: true },
            { name: "Visits", value: (g.visits || 0).toLocaleString(), inline: true },
            { name: "Favorites", value: (g.favoritedCount || 0).toLocaleString(), inline: true },
            { name: "Created", value: g.created ? new Date(g.created).toLocaleDateString() : "—", inline: true },
            { name: "Updated", value: g.updated ? new Date(g.updated).toLocaleDateString() : "—", inline: true },
            { name: "Bound Licenses", value: boundLicenses.length > 0 ? boundLicenses.join("\n") : "None" },
          )
          .setTimestamp();

        if (g.description) embed.setDescription(g.description.slice(0, 200));

        return interaction.editReply({ embeds: [embed] });
      }

      // Fallback: only place info available (economy API)
      const p = result.placeInfo;
      const creatorName = p.Creator ? `${p.Creator.Name} (${p.Creator.CreatorType === "Group" ? "Group" : "User"})` : "—";

      return interaction.editReply({ embeds: [
        new EmbedBuilder()
          .setColor(0xffaa44)
          .setTitle(p.Name || "Unknown Game")
          .setURL(`https://www.roblox.com/games/${gameId.trim()}`)
          .addFields(
            { name: "Place ID", value: String(p.AssetId), inline: true },
            { name: "Creator", value: creatorName, inline: true },
            { name: "Created", value: p.Created ? new Date(p.Created).toLocaleDateString() : "—", inline: true },
            { name: "Updated", value: p.Updated ? new Date(p.Updated).toLocaleDateString() : "—", inline: true },
            { name: "Bound Licenses", value: boundLicenses.length > 0 ? boundLicenses.join("\n") : "None" },
            { name: "Note", value: "This is a **Place ID**, not a Universe ID. Player count unavailable. Set `ROBLOX_API_KEY` in `.env` for full lookup." },
          )
          .setTimestamp()
      ] });
    }

    // ─── No gameId — show all games ───

    const snap = await db.collection("licenses")
      .where("status", "==", "active")
      .get();

    const universeMap = new Map();
    snap.docs.forEach((d) => {
      const lic = d.data();
      const uid = lic.universeId;
      if (!uid) return;
      if (!universeMap.has(uid)) {
        universeMap.set(uid, { universeId: uid, licenses: [] });
      }
      universeMap.get(uid).licenses.push(lic.key);
    });

    // Filter by specific game ID if provided
    if (targetGameId) {
      if (!universeMap.has(targetGameId)) {
        return interaction.editReply({ embeds: [
          new EmbedBuilder().setColor(0xff4444).setTitle("Game Not Found")
            .setDescription(`No active licenses are bound to game ID \`${targetGameId}\`.`)
        ] });
      }
      // Keep only the target game
      const targetEntry = universeMap.get(targetGameId);
      universeMap.clear();
      universeMap.set(targetGameId, targetEntry);
    }

    if (universeMap.size === 0) {
      return interaction.editReply({ embeds: [
        new EmbedBuilder().setColor(0xffaa44).setTitle("No Games Found")
          .setDescription("No active licenses are bound to any Roblox game.")
      ] });
    }

    const universeIds = [...universeMap.keys()];

    let apiGames = [];
    try {
      const res = await fetch(`https://games.roblox.com/v1/games?universeIds=${universeIds.join(",")}`);
      if (res.ok) {
        const body = await res.json();
        apiGames = body.data || [];
      }
    } catch (err) {
      console.error("Roblox API error:", err);
    }

    const apiMap = new Map(apiGames.map((g) => [g.id, g]));

    const fields = [];
    for (const [uid, entry] of universeMap) {
      if (fields.length >= 25) break;

      const game = apiMap.get(Number(uid));
      const name = game ? game.name : `\`${uid}\``;
      const playing = game ? game.playing : 0;
      const online = playing > 0;
      const onlineText = online ? "🟢 Online" : "🔴 Offline";

      const detailLines = [
        `**Status:** ${onlineText} (${playing} player${playing === 1 ? "" : "s"})`,
        `**Licenses:** ${entry.licenses.join(", ")}`,
      ];

      if (game) {
        detailLines.push(
          `**Visits:** ${(game.visits || 0).toLocaleString()}`,
          `**Favorites:** ${(game.favoritedCount || 0).toLocaleString()}`,
        );
      }

      fields.push({
        name: name,
        value: detailLines.join("\n"),
        inline: false,
      });
    }

    const remaining = universeMap.size - fields.length;
    const footer = remaining > 0 ? `\n… and ${remaining} more game${remaining === 1 ? "" : "s"}` : "";

    const title = targetGameId
      ? `Game Details — ${universeMap.get(targetGameId)?.universeId || targetGameId}`
      : `Games on License System (${universeMap.size})`;

    return interaction.editReply({ embeds: [
      new EmbedBuilder()
        .setColor(0x44aaff)
        .setTitle(title)
        .setDescription(`Universe${universeMap.size === 1 ? "" : "s"} bound to active licenses${footer}`)
        .addFields(fields)
        .setTimestamp()
    ] });
  },

  async help(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0x44aaff)
      .setTitle("License Bot Commands")
      .setDescription("Prefix: `/`")
      .addFields(
        { name: "Everyone", value: [
          "`/verify key:` — Check a license key",
          "`/mykeys user_id:` — List your licenses",
          "`/help` — Show this message",
        ].join("\n") },
        { name: "Admin Only", value: [
          "`/addlicense` — Create a license",
          "`/revoke id:` — Revoke by ID or key",
          "`/renew id: months:` — Extend expiry",
          "`/info key:` — Full license details",
          "`/search query:` — Search by key/ID/product",
          "`/list status:` — List by status",
          "`/stats` — License statistics",
          "`/delete id:` — Permanently remove",
          "`/setuser id: user_id:` — Reassign user",
          "`/export` — Dump all licenses as JSON",
          "`/gameson gameid:` — Show games on license system (optional specific game)",
        ].join("\n") },
      )
      .setFooter({ text: "Flipp Studios License Manager" })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
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


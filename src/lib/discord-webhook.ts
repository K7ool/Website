const WEBHOOK_URL =
  process.env.DISCORD_LICENSE_WEBHOOK_URL ||
  "https://discord.com/api/webhooks/1512076442580684833/vQ3ELrYJdnxIaDlN-1td5l9fqXz6c50cpD5Bnt1w4CU_zu034PV27X8dSdQr4z2_Wyf6";

interface WebhookField {
  name: string;
  value: string;
  inline?: boolean;
}

interface WebhookEmbed {
  title: string;
  description: string;
  color: number;
  fields?: WebhookField[];
  timestamp?: string;
}

export async function sendLicenseWebhook(embeds: WebhookEmbed[]) {
  try {
    await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: embeds.map((e) => ({
          ...e,
          timestamp: e.timestamp || new Date().toISOString(),
        })),
      }),
    });
  } catch (err) {
    console.error("[DISCORD_WEBHOOK] Failed to send:", err);
  }
}

export function activationEmbed(data: {
  key: string;
  productName: string;
  userId: string;
  universeId?: number;
  robloxUserId?: number;
}): WebhookEmbed[] {
  return [
    {
      title: "License Activated",
      description: `License **${data.key}** was activated`,
      color: 0x00ff00,
      fields: [
        { name: "Product", value: data.productName, inline: true },
        { name: "User", value: `\`${data.userId}\``, inline: true },
        ...(data.universeId
          ? [{ name: "Universe", value: String(data.universeId), inline: true }]
          : []),
        ...(data.robloxUserId
          ? [{ name: "Roblox User", value: String(data.robloxUserId), inline: true }]
          : []),
      ],
    },
  ];
}

export function revokeEmbed(data: {
  key: string;
  productName: string;
  userId: string;
  universeId?: number;
}): WebhookEmbed[] {
  return [
    {
      title: "License Revoked",
      description: `License **${data.key}** was revoked`,
      color: 0xff0000,
      fields: [
        { name: "Product", value: data.productName, inline: true },
        { name: "User", value: `\`${data.userId}\``, inline: true },
        ...(data.universeId
          ? [{ name: "Universe", value: String(data.universeId), inline: true }]
          : []),
      ],
    },
  ];
}

export function expiryWarningEmbed(data: {
  key: string;
  productName: string;
  userId: string;
  daysLeft: number;
}): WebhookEmbed[] {
  return [
    {
      title: "License Expiring Soon",
      description: `License **${data.key}** expires in **${data.daysLeft} day${data.daysLeft > 1 ? "s" : ""}**`,
      color: 0xffa500,
      fields: [
        { name: "Product", value: data.productName, inline: true },
        { name: "User", value: `\`${data.userId}\``, inline: true },
        { name: "Days Left", value: String(data.daysLeft), inline: true },
      ],
    },
  ];
}

const STORAGE_KEY = "discord_roblox_links";

export interface ManualRobloxLink {
  discordId: string;
  robloxId: number;
  robloxUsername: string;
  linkedAt: number;
}

export function getManualLinks(): Record<string, ManualRobloxLink> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getManualLink(discordId: string): ManualRobloxLink | null {
  return getManualLinks()[discordId] || null;
}

export function setManualLink(discordId: string, robloxId: number, robloxUsername: string): void {
  const links = getManualLinks();
  links[discordId] = { discordId, robloxId, robloxUsername, linkedAt: Date.now() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
}

export function removeManualLink(discordId: string): void {
  const links = getManualLinks();
  delete links[discordId];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
}

export function getAllManualLinks(): ManualRobloxLink[] {
  return Object.values(getManualLinks()).sort((a, b) => b.linkedAt - a.linkedAt);
}

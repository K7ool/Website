export function generateVerificationCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const seg = () => Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `FLIPP-VERIFY-${seg()}-${seg()}`;
}

export interface RobloxProfileData {
  username: string;
  userId: number;
  displayName: string;
  profileUrl: string;
  avatarUrl: string;
  description: string;
}

export async function fetchRobloxProfile(username: string): Promise<RobloxProfileData | null> {
  try {
    const res = await fetch(`https://users.roblox.com/v1/usernames/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usernames: [username], excludeBannedUsers: true }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.data?.length) return null;
    const user = data.data[0];
    const userId = user.id;
    const profileRes = await fetch(`https://users.roblox.com/v1/users/${userId}`);
    if (!profileRes.ok) return null;
    const profile = await profileRes.json();
    const thumbRes = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png`);
    let avatarUrl = "";
    if (thumbRes.ok) {
      const thumbData = await thumbRes.json();
      avatarUrl = thumbData.data?.[0]?.imageUrl || "";
    }
    return {
      username: profile.name,
      userId: profile.id,
      displayName: profile.displayName,
      profileUrl: `https://www.roblox.com/users/${userId}/profile`,
      avatarUrl,
      description: profile.description || "",
    };
  } catch {
    return null;
  }
}

export async function checkRobloxBio(username: string, code: string): Promise<boolean> {
  try {
    const profile = await fetchRobloxProfile(username);
    if (!profile) return false;
    return profile.description.includes(code);
  } catch {
    return false;
  }
}

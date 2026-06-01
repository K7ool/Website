"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import Avatar from "@/components/Avatar";
import GlassCard from "@/components/GlassCard";
import { useAuth } from "@/contexts/AuthContext";
import { profileService, storageService, sanitizeUsername, validateUsernameFormat, getUsernameCooldownInfo, userAchievementService, achievementService } from "@/lib/firestore";
import { LEGAL_VERSIONS, getCookieConsent } from "@/lib/legal";
import { generateVerificationCode, fetchRobloxProfile, checkRobloxBio } from "@/lib/roblox";

export default function DashboardSettingsPage() {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [cooldownInfo, setCooldownInfo] = useState<{ canChange: boolean; remainingDays: number; nextAvailable: string | null }>({ canChange: true, remainingDays: 0, nextAvailable: null });
  const [originalUsername, setOriginalUsername] = useState("");

  const [form, setForm] = useState({
    username: "",
    displayName: "",
    bio: "",
    discordUsername: "",
    robloxUsername: "",
    country: "",
    socialLinks: { twitter: "", github: "", website: "" },
    privacy: { publicProfile: true, showPurchases: true, showReviews: true, showComments: true },
  });

  useEffect(() => {
    if (!user) return;
    const unsub = profileService.subscribeByUser(user.uid, (data) => {
      if (data) {
        const cleaned = sanitizeUsername(data.username || "");
        setOriginalUsername(cleaned);
        setCooldownInfo(getUsernameCooldownInfo(data.lastUsernameChange));
        setProfile(data);
        setForm({
          username: cleaned,
          displayName: data.displayName || "",
          bio: data.bio || "",
          discordUsername: data.discordUsername || "",
          robloxUsername: data.robloxUsername || "",
          country: data.country || "",
          socialLinks: { twitter: data.socialLinks?.twitter || "", github: data.socialLinks?.github || "", website: data.socialLinks?.website || "" },
          privacy: {
            publicProfile: data.privacy?.publicProfile !== false,
            showPurchases: data.privacy?.showPurchases !== false,
            showReviews: data.privacy?.showReviews !== false,
            showComments: data.privacy?.showComments !== false,
          },
        });
      }
      setLoading(false);
    });
    return unsub;
  }, [user]);

  const debouncedCheck = useCallback(
    (() => {
      let timer: ReturnType<typeof setTimeout>;
      return (val: string, uid: string) => {
        clearTimeout(timer);
        const sanitized = sanitizeUsername(val);
        if (!sanitized || sanitized === sanitizeUsername(originalUsername)) {
          setUsernameAvailable(null);
          setUsernameError("");
          return;
        }
        const fmtErr = validateUsernameFormat(val);
        if (fmtErr) { setUsernameError(fmtErr); setUsernameAvailable(null); return; }
        setUsernameError("");
        setCheckingUsername(true);
        timer = setTimeout(async () => {
          try {
            const avail = await profileService.isUsernameAvailable(sanitized, uid);
            setUsernameAvailable(avail);
            setUsernameError(avail ? "" : "Username is already taken.");
          } catch { setUsernameAvailable(null); }
          setCheckingUsername(false);
        }, 400);
      };
    })(),
    [originalUsername]
  );

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const cleaned = sanitizeUsername(raw);
    setForm((prev) => ({ ...prev, username: cleaned }));
    if (user) debouncedCheck(cleaned, user.uid);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true); setError(""); setSaved(false);

    const sanitized = sanitizeUsername(form.username);
    const usernameChanged = sanitized !== originalUsername;

    if (usernameChanged) {
      const result = await profileService.updateUsername(user.uid, sanitized);
      if (!result.success) {
        setError(result.error || "Failed to update username.");
        setSaving(false);
        return;
      }
    }

    try {
      await profileService.upsert(user.uid, {
        userId: user.uid,
        email: user.email || "",
        username: sanitized,
        displayName: form.displayName,
        bio: form.bio,
        discordUsername: form.discordUsername,
        robloxUsername: form.robloxUsername,
        country: form.country,
        socialLinks: form.socialLinks,
        privacy: form.privacy,
        createdAt: profile?.createdAt || new Date().toISOString(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e?.message || "Failed to save");
    }
    setSaving(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true); setError("");
    console.log("User:", user.uid);
    try {
      const url = await storageService.uploadAvatar(user.uid, file);
      await profileService.upsert(user.uid, { avatar: url });
      setProfile((prev: any) => prev ? { ...prev, avatar: url } : { avatar: url });
    } catch (err: any) {
      setError(err?.message || "Upload failed");
    }
    setUploading(false);
  };

  const handleRemoveAvatar = async () => {
    if (!user || !profile?.avatar) return;
    setUploading(true);
    try {
      const pathPart = profile.avatar.split("/avatars/")[1]?.split("?")[0];
      if (pathPart) await storageService.deleteAvatar(pathPart);
      await profileService.upsert(user.uid, { avatar: "" });
      setProfile((prev: any) => prev ? { ...prev, avatar: "" } : null);
    } catch { /* silent */ }
    setUploading(false);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white mb-6">Account Settings</h1>

        <div className="grid lg:grid-cols-3 gap-6">
          <div>
            <GlassCard>
              <h3 className="text-white font-semibold mb-4">Profile Picture</h3>
              <div className="flex flex-col items-center gap-3">
                <Avatar size="xl" className="w-24 h-24" src={profile?.avatar} fallback={form.displayName || user?.email || "U"} />
                <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                <div className="flex gap-2">
                  <button onClick={() => fileRef.current?.click()} disabled={uploading}
                    className="px-3 py-1.5 rounded-lg bg-purple-600/10 text-purple-400 text-xs hover:bg-purple-600/20 disabled:opacity-50 transition-all">
                    {uploading ? "Uploading..." : "Upload"}
                  </button>
                  {profile?.avatar && (
                    <button onClick={handleRemoveAvatar} disabled={uploading}
                      className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs hover:bg-red-500/20 disabled:opacity-50 transition-all">
                      Remove
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500">JPG, PNG, GIF. Max 5MB.</p>
              </div>
            </GlassCard>
          </div>

          <div className="lg:col-span-2 space-y-6">
            {saved && <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-sm text-green-400">Settings saved successfully.</div>}
            {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">{error}</div>}

            <GlassCard>
              <h3 className="text-white font-semibold mb-4">Basic Information</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Username</label>
                  <div className="relative">
                    <input value={form.username} onChange={handleUsernameChange}
                      placeholder="your_username"
                      className={`w-full px-4 py-2.5 pr-10 rounded-lg bg-dark-700 border text-sm text-white placeholder-gray-500 focus:outline-none transition-all
                        ${usernameError ? "border-red-500/50 focus:border-red-500" : usernameAvailable === true ? "border-green-500/50 focus:border-green-500" : "border-purple-500/20 focus:border-purple-500"}`} />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {checkingUsername ? (
                        <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                      ) : usernameAvailable === true ? (
                        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                      ) : usernameAvailable === false ? (
                        <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-1 space-y-1">
                    {usernameError ? (
                      <p className="text-xs text-red-400">{usernameError}</p>
                    ) : usernameAvailable === true ? (
                      <p className="text-xs text-green-400">Available</p>
                    ) : null}
                    <p className="text-xs text-gray-500">Letters, numbers, underscores. Profile URL: /profile/{form.username || "username"}</p>
                    {!cooldownInfo.canChange && (
                      <>
                        <p className="text-xs text-yellow-400">Last changed: {profile?.lastUsernameChange ? new Date(profile.lastUsernameChange).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : ""}</p>
                        <p className="text-xs text-yellow-400">Next change available: {cooldownInfo.nextAvailable}</p>
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Display Name</label>
                  <input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm text-gray-400 mb-1">Bio</label>
                  <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3}
                    className="w-full px-4 py-2.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Country</label>
                  <input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
                </div>
              </div>
            </GlassCard>

            <GlassCard>
              <h3 className="text-white font-semibold mb-4">Social & Contact</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Discord Username</label>
                  <input value={form.discordUsername} onChange={(e) => setForm({ ...form, discordUsername: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Roblox Username</label>
                  <input value={form.robloxUsername} onChange={(e) => setForm({ ...form, robloxUsername: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Twitter URL</label>
                  <input value={form.socialLinks.twitter} onChange={(e) => setForm({ ...form, socialLinks: { ...form.socialLinks, twitter: e.target.value } })}
                    className="w-full px-4 py-2.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">GitHub URL</label>
                  <input value={form.socialLinks.github} onChange={(e) => setForm({ ...form, socialLinks: { ...form.socialLinks, github: e.target.value } })}
                    className="w-full px-4 py-2.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm text-gray-400 mb-1">Website URL</label>
                  <input value={form.socialLinks.website} onChange={(e) => setForm({ ...form, socialLinks: { ...form.socialLinks, website: e.target.value } })}
                    className="w-full px-4 py-2.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
                </div>
              </div>
            </GlassCard>

            <GlassCard>
              <h3 className="text-white font-semibold mb-4">Roblox Account Verification</h3>
              {profile?.robloxVerified ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <span className="text-2xl">🎮</span>
                    <div>
                      <p className="text-sm text-green-400 font-semibold">✓ Roblox Verified</p>
                      <p className="text-xs text-gray-400">{profile.robloxUsername}</p>
                    </div>
                  </div>
                  {profile.robloxAvatarUrl && (
                    <img src={profile.robloxAvatarUrl} alt="" className="w-16 h-16 rounded-full mx-auto" />
                  )}
                  {profile.robloxProfileUrl && (
                    <a href={profile.robloxProfileUrl} target="_blank" rel="noopener noreferrer"
                      className="block text-center text-sm text-purple-400 hover:text-purple-300 transition-colors">
                      View Roblox Profile &rarr;
                    </a>
                  )}
                  <button onClick={async () => {
                    await profileService.upsert(user!.uid, { robloxVerified: false });
                    setProfile((prev: any) => prev ? { ...prev, robloxVerified: false } : null);
                  }}
                    className="w-full py-2 rounded-lg bg-red-500/10 text-red-400 text-sm hover:bg-red-500/20 transition-all">
                    Remove Verification
                  </button>
                </div>
              ) : (
                <RobloxVerificationForm
                  userId={user?.uid || ""}
                  currentRobloxUsername={profile?.robloxUsername || ""}
                  onVerified={(data) => {
                    setProfile((prev: any) => prev ? { ...prev, ...data } : null);
                  }}
                />
              )}
            </GlassCard>

            <GlassCard>
              <h3 className="text-white font-semibold mb-4">Privacy</h3>
              <div className="space-y-3">
                {[
                  { key: "publicProfile", label: "Public Profile", desc: "Allow others to view your profile" },
                  { key: "showPurchases", label: "Show Purchased Products", desc: "Display your purchased products on your profile" },
                  { key: "showReviews", label: "Show Reviews", desc: "Display your reviews on your profile" },
                  { key: "showComments", label: "Show Comments", desc: "Display your comments on your profile" },
                ].map((item) => (
                  <label key={item.key} className="flex items-center justify-between p-3 rounded-lg bg-dark-600 cursor-pointer">
                    <div>
                      <div className="text-sm text-white">{item.label}</div>
                      <div className="text-xs text-gray-400">{item.desc}</div>
                    </div>
                    <input type="checkbox" checked={(form.privacy as any)[item.key]}
                      onChange={(e) => setForm({ ...form, privacy: { ...form.privacy, [item.key]: e.target.checked } })}
                      className="w-5 h-5 rounded bg-dark-700 border-purple-500/30 accent-purple-500" />
                  </label>
                ))}
              </div>
            </GlassCard>

            <GlassCard>
              <h3 className="text-white font-semibold mb-4">Legal & Privacy</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-dark-600">
                    <div className="text-xs text-gray-400">Accepted Terms Version</div>
                    <div className="text-sm text-white font-medium">{profile?.acceptedTermsVersion || "—"}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-dark-600">
                    <div className="text-xs text-gray-400">Accepted Privacy Version</div>
                    <div className="text-sm text-white font-medium">{profile?.acceptedPrivacyVersion || "—"}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-dark-600">
                    <div className="text-xs text-gray-400">Accepted Refund Version</div>
                    <div className="text-sm text-white font-medium">{profile?.acceptedRefundVersion || "—"}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-dark-600">
                    <div className="text-xs text-gray-400">Acceptance Date</div>
                    <div className="text-sm text-white font-medium">
                      {profile?.acceptedAt
                        ? new Date(profile.acceptedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
                        : "—"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-dark-600">
                  <div>
                    <div className="text-sm text-white">Cookie Preferences</div>
                    <div className="text-xs text-gray-400">
                      Current status: <span className="text-purple-400">{getCookieConsent() ? getCookieConsent() === "accepted" ? "Accepted" : "Rejected" : "Not set"}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        localStorage.removeItem("flipp_cookie_consent");
                        window.location.reload();
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-purple-600/10 text-purple-400 text-xs hover:bg-purple-600/20 transition-all"
                  >
                    Reset Preferences
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  Current legal versions: Terms v{LEGAL_VERSIONS.terms}, Privacy v{LEGAL_VERSIONS.privacy}, Refund v{LEGAL_VERSIONS.refund}.
                  You will be prompted to accept new versions when they are updated.
                </p>
              </div>
            </GlassCard>

            <button onClick={handleSave} disabled={saving || !!usernameError}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 transition-all">
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}

function RobloxVerificationForm({ userId, currentRobloxUsername, onVerified }: {
  userId: string; currentRobloxUsername: string; onVerified: (data: any) => void;
}) {
  const [step, setStep] = useState<"username" | "code" | "verifying" | "done">("username");
  const [username, setUsername] = useState(currentRobloxUsername);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);

  const handleLookup = async () => {
    if (!username.trim()) return;
    setLoading(true); setError("");
    try {
      const profile = await fetchRobloxProfile(username.trim());
      if (!profile) { setError("Roblox user not found"); setLoading(false); return; }
      setProfileData(profile);
      const newCode = generateVerificationCode();
      setCode(newCode);
      setStep("code");
    } catch { setError("Failed to lookup Roblox user"); }
    setLoading(false);
  };

  const handleVerify = async () => {
    setStep("verifying"); setError("");
    try {
      const found = await checkRobloxBio(username.trim(), code);
      if (!found) { setError("Verification code not found in your Roblox bio. Make sure to add it exactly as shown."); setStep("code"); return; }
      await profileService.upsert(userId, {
        robloxUsername: profileData.username,
        robloxUserId: profileData.userId,
        robloxProfileUrl: profileData.profileUrl,
        robloxAvatarUrl: profileData.avatarUrl,
        robloxVerified: true,
        verificationCode: code,
        verifiedAt: new Date().toISOString(),
      });
      try {
        await userAchievementService.unlock(userId, "roblox_verified");
      } catch {}
      setStep("done");
      onVerified({ robloxVerified: true, robloxUsername: profileData.username, robloxUserId: profileData.userId, robloxProfileUrl: profileData.profileUrl, robloxAvatarUrl: profileData.avatarUrl });
    } catch { setError("Verification failed. Try again."); setStep("code"); }
  };

  if (step === "done") {
    return (
      <div className="text-center py-4">
        <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
          <svg className="w-7 h-7 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-white font-semibold">Roblox Verified!</p>
        <p className="text-sm text-gray-400">Your Roblox account has been verified.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">{error}</div>
      )}

      {step === "username" && (
        <>
          <p className="text-sm text-gray-400">Enter your Roblox username to start verification.</p>
          <div className="flex gap-2">
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
              placeholder="Roblox Username"
              className="flex-1 px-4 py-2.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
            <button onClick={handleLookup} disabled={loading || !username.trim()}
              className="px-4 py-2.5 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-500 disabled:opacity-50 transition-all">
              {loading ? "..." : "Next"}
            </button>
          </div>
        </>
      )}

      {step === "code" && profileData && (
        <>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-dark-600">
            {profileData.avatarUrl && <img src={profileData.avatarUrl} alt="" className="w-10 h-10 rounded-full" />}
            <div>
              <p className="text-sm text-white font-medium">{profileData.displayName}</p>
              <p className="text-xs text-gray-400">@{profileData.username}</p>
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">1. Copy this verification code:</label>
            <div className="flex gap-2">
              <code className="flex-1 px-4 py-2.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-purple-300 font-mono">{code}</code>
              <button onClick={() => navigator.clipboard.writeText(code)}
                className="px-3 py-2 rounded-lg bg-dark-600 text-gray-300 text-xs hover:bg-dark-500 transition-all">Copy</button>
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">2. Add the code to your Roblox bio</label>
            <a href={`https://www.roblox.com/users/${profileData.userId}/profile`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors">
              Open Roblox Profile &rarr;
            </a>
          </div>
          <button onClick={handleVerify} disabled={loading}
            className="w-full py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-medium hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 transition-all">
            {loading ? "Verifying..." : "3. Verify My Account"}
          </button>
        </>
      )}

      {step === "verifying" && (
        <div className="text-center py-4">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-400">Checking Roblox bio for verification code...</p>
        </div>
      )}
    </div>
  );
}

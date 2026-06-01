export const LEGAL_VERSIONS = {
  terms: 1,
  privacy: 1,
  refund: 1,
};

export const COOKIE_CONSENT_KEY = "flipp_cookie_consent";

export function checkLegalAcceptance(profile: any): boolean {
  if (!profile) return false;
  const tv = profile.acceptedTermsVersion || 0;
  const pv = profile.acceptedPrivacyVersion || 0;
  const rv = profile.acceptedRefundVersion || 0;
  return tv >= LEGAL_VERSIONS.terms && pv >= LEGAL_VERSIONS.privacy && rv >= LEGAL_VERSIONS.refund;
}

/** Server-side legal check — uses the same logic without browser APIs. */
export function checkLegalAcceptanceServer(profile: { acceptedTermsVersion?: number; acceptedPrivacyVersion?: number; acceptedRefundVersion?: number } | null): boolean {
  if (!profile) return false;
  const tv = profile.acceptedTermsVersion ?? 0;
  const pv = profile.acceptedPrivacyVersion ?? 0;
  const rv = profile.acceptedRefundVersion ?? 0;
  return tv >= LEGAL_VERSIONS.terms && pv >= LEGAL_VERSIONS.privacy && rv >= LEGAL_VERSIONS.refund;
}

export function getCookieConsent(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(COOKIE_CONSENT_KEY);
}

export function setCookieConsent(value: "accepted" | "rejected"): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(COOKIE_CONSENT_KEY, value);
}

"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  signInWithPopup,
  User,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, googleProvider } from "@/lib/firebase";
import { profileService } from "@/lib/firestore";
import { checkLegalAcceptance, LEGAL_VERSIONS } from "@/lib/legal";

interface AuthContextType {
  user: User | null;
  profile: any | null;
  loading: boolean;
  isAdmin: boolean;
  hasAcceptedLegal: boolean;
  refreshProfile: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, username: string) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signInWithDiscord: () => Promise<{ error?: string }>;
  signInWithRoblox: () => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null, profile: null, loading: true, isAdmin: false, hasAcceptedLegal: false,
  refreshProfile: async () => {},
  signIn: async () => ({}), signUp: async () => ({}),
  signInWithGoogle: async () => ({}), signInWithDiscord: async () => ({}), signInWithRoblox: async () => ({}),
  signOut: async () => {},
});

async function ensureProfile(firebaseUser: User, extra?: Record<string, any>) {
  try {
    const existing = await profileService.get(firebaseUser.uid);
    if (existing) return existing;
    const newProfile = {
      id: firebaseUser.uid,
      email: firebaseUser.email || "",
      username: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "user",
      avatar: firebaseUser.photoURL || "",
      role: "customer",
      ...extra,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await profileService.upsert(firebaseUser.uid, newProfile);
    return newProfile;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const p = await profileService.get(user.uid);
    if (p) setProfile(p);
  }, [user]);

  useEffect(() => {
    if (!auth) { setLoading(false); return; }
    let unsubProfile: (() => void) | null = null;
    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const p = await ensureProfile(firebaseUser);
        setProfile(p);
        unsubProfile = profileService.subscribeByUser(firebaseUser.uid, (data) => {
          if (data) setProfile(data);
        });
      } else {
        setProfile(null);
        if (unsubProfile) { unsubProfile(); unsubProfile = null; }
      }
      setLoading(false);
    });
    return () => { unsubAuth(); if (unsubProfile) unsubProfile(); };
  }, []);

  const isAdmin = profile?.role === "admin";
  const hasAcceptedLegal = checkLegalAcceptance(profile);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!auth) return { error: "Firebase not configured" };
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return {};
    } catch (e: any) {
      return { error: e.message };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, username: string) => {
    if (!auth) return { error: "Firebase not configured" };
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db!, "profiles", cred.user.uid), {
        id: cred.user.uid, username, email, role: "customer", avatar: "",
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      return {};
    } catch (e: any) {
      return { error: e.message };
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!auth || !googleProvider) return { error: "Firebase not configured" };
    try {
      await signInWithPopup(auth, googleProvider);
      return {};
    } catch (e: any) {
      return { error: e.message };
    }
  }, []);

  const signInWithDiscord = useCallback(async () => {
    if (typeof window === "undefined") return { error: "Not in browser" };
    window.location.href = "/api/auth/discord";
    return {};
  }, []);

  const signInWithRoblox = useCallback(async () => {
    if (!auth) return { error: "Firebase not configured" };
    try {
      const { OAuthProvider } = await import("firebase/auth");
      const provider = new OAuthProvider("roblox.com");
      await signInWithPopup(auth, provider);
      return {};
    } catch (e: any) {
      return { error: e.message };
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!auth) return;
    await firebaseSignOut(auth);
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin, hasAcceptedLegal, refreshProfile, signIn, signUp, signInWithGoogle, signInWithDiscord, signInWithRoblox, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

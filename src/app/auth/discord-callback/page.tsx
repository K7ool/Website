"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithCustomToken } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function DiscordCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setError("No token received");
      return;
    }
    if (!auth) {
      setError("Firebase not configured");
      return;
    }
    signInWithCustomToken(auth, token)
      .then(() => router.push("/dashboard"))
      .catch((e) => setError(e.message));
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Sign-in Failed</h1>
          <p className="text-red-400 mb-4">{error}</p>
          <a href="/auth/login" className="text-purple-400 hover:text-purple-300">Back to login</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Signing you in with Discord...</p>
      </div>
    </div>
  );
}

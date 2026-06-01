"use client";

import { useAuth } from "@/contexts/AuthContext";
import LegalAcceptModal from "@/components/LegalAcceptModal";

export default function LegalGuard({ children }: { children: React.ReactNode }) {
  const { loading, hasAcceptedLegal } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!hasAcceptedLegal) {
    return <LegalAcceptModal />;
  }

  return <>{children}</>;
}

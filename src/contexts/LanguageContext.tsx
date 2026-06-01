"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { en } from "@/lib/translations/en";
import { ar } from "@/lib/translations/ar";

type Lang = "ar" | "en";
type TranslationDict = Record<string, string>;

const STORAGE_KEY = "flipp_language";
const translations: Record<Lang, TranslationDict> = { ar, en };

interface LanguageContextType {
  lang: Lang;
  dir: "rtl" | "ltr";
  t: (key: string, params?: Record<string, string | number>) => string;
  setLang: (lang: Lang) => void;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "ar",
  dir: "rtl",
  t: (key) => key,
  setLang: () => {},
});

function detectLanguage(): Lang {
  if (typeof window === "undefined") return "ar";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "ar" || stored === "en") return stored;
  return "ar";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ar");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setLangState(detectLanguage());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [lang, mounted]);

  const setLang = useCallback((newLang: Lang) => {
    setLangState(newLang);
    localStorage.setItem(STORAGE_KEY, newLang);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const dict = translations[lang] || ar;
      let val = dict[key];
      if (val === undefined) {
        val = (en as Record<string, string>)[key] || key;
      }
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          val = val.replace(`{${k}}`, String(v));
        });
      }
      return val;
    },
    [lang]
  );

  if (!mounted) {
    return (
      <div dir="rtl" lang="ar">
        {children}
      </div>
    );
  }

  return (
    <LanguageContext.Provider value={{ lang, dir: lang === "ar" ? "rtl" : "ltr", t, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);

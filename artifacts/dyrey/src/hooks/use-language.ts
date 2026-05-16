import { create } from "zustand";
import { persist } from "zustand/middleware";
import { translations, type Lang, type TKey } from "@/lib/i18n";

type LanguageStore = {
  lang: Lang;
  setLang: (lang: Lang) => void;
};

export const useLanguage = create<LanguageStore>()(
  persist(
    (set) => ({
      lang: "is",
      setLang: (lang) => set({ lang }),
    }),
    { name: "dyrey-lang" }
  )
);

export function useT() {
  const lang = useLanguage((s) => s.lang);
  return (key: TKey, vars?: Record<string, string>): string => {
    let text: string = (translations[lang] as Record<string, string>)[key]
      ?? (translations.en as Record<string, string>)[key]
      ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        text = text.replace(`{${k}}`, v);
      }
    }
    return text;
  };
}

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type AppLanguage = "en" | "he";

const copy = {
  en: {
    home: "Home", schedule: "Schedule", checkIn: "Check in", checkOut: "Check out", messages: "Messages", updates: "Updates", work: "Work", more: "More",
    attendance: "Attendance", members: "Members", projects: "Projects", tools: "Tools", files: "Files",
    language: "Language", settings: "Settings", administration: "Administration", profile: "My profile",
    teamHub: "Team Hub", moreTitle: "People, projects and account settings.", english: "English", hebrew: "Hebrew",
  },
  he: {
    home: "בית", schedule: "לוח זמנים", checkIn: "כניסה", checkOut: "יציאה", messages: "הודעות", updates: "עדכונים", work: "עבודה", more: "עוד",
    attendance: "נוכחות", members: "חברי הקבוצה", projects: "פרויקטים", tools: "כלים", files: "קבצים",
    language: "שפה", settings: "הגדרות", administration: "ניהול", profile: "הפרופיל שלי",
    teamHub: "מרכז הקבוצה", moreTitle: "אנשים, פרויקטים והגדרות חשבון.", english: "אנגלית", hebrew: "עברית",
  },
} as const;

type TranslationKey = keyof typeof copy.en;
type LocalizationState = { language: AppLanguage; direction: "ltr" | "rtl"; setLanguage: (language: AppLanguage) => void; t: (key: TranslationKey) => string; pick: (english: string, hebrew: string) => string };
const LocalizationContext = createContext<LocalizationState | null>(null);

export function LocalizationProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>(() => localStorage.getItem("g3-language") === "he" ? "he" : "en");
  const setLanguage = (next: AppLanguage) => { localStorage.setItem("g3-language", next); setLanguageState(next); };
  useEffect(() => { document.documentElement.lang = language; document.documentElement.dir = language === "he" ? "rtl" : "ltr"; }, [language]);
  const value = useMemo(() => ({ language, direction: language === "he" ? "rtl" as const : "ltr" as const, setLanguage, t: (key: TranslationKey) => copy[language][key], pick: (english: string, hebrew: string) => language === "he" ? hebrew : english }), [language]);
  return <LocalizationContext.Provider value={value}>{children}</LocalizationContext.Provider>;
}

export function useLocalization() {
  const value = useContext(LocalizationContext);
  if (!value) throw new Error("useLocalization must be used inside LocalizationProvider");
  return value;
}

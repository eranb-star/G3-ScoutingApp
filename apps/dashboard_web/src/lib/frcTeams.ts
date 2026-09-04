export type FrcTeam = {
  key: string;
  name: string;
  nameHe: string;
  mark: string;
  aliases?: string[];
};

export const frcTeams: FrcTeam[] = [
  { key: "mechanical", name: "Mechanical", nameHe: "מכניקה", mark: "MECH" },
  { key: "cad", name: "CAD & Design", nameHe: "שרטוט ותכנון", mark: "CAD" },
  { key: "electrical", name: "Electrical", nameHe: "אלקטרוניקה", mark: "ELEC", aliases: ["electronics"] },
  { key: "software", name: "Software", nameHe: "תוכנה", mark: "CODE" },
  { key: "strategy", name: "Strategy & Scouting", nameHe: "אסטרטגיה וסקאוטינג", mark: "DATA" },
  { key: "field", name: "Field Build & Infrastructure", nameHe: "בניית מגרש ותשתיות", mark: "FIELD" },
  { key: "pit", name: "Drive & Pit", nameHe: "נהיגה ופיט", mark: "PIT" },
  { key: "business", name: "Business & Outreach", nameHe: "קהילה ועסקים", mark: "BIZ" },
  { key: "publicity", name: "Publicity & Awards", nameHe: "ייצוג ופרסים", mark: "AWARD", aliases: ["judging", "awards"] },
];

export function teamMatches(value: string | null | undefined, team: FrcTeam | string) {
  const normalized = (value ?? "").trim().toLowerCase();
  const definition = typeof team === "string" ? frcTeams.find(item => item.key === team) : team;
  if (!definition) return normalized.includes(String(team).toLowerCase());
  return [definition.key, definition.name, ...(definition.aliases ?? [])]
    .some(candidate => normalized.includes(candidate.toLowerCase()));
}

export function teamByKey(key: string) {
  return frcTeams.find(team => team.key === key);
}

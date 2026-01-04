// apps/dashboard_web/src/lib/allianceIntel.ts

export type Risk = "LOW" | "MED" | "HIGH";

export type TeamRow = {
  event_id: string;
  team_number: number;

  matches_scouted: number;

  auto_score_avg: any;
  auto_mobility_rate: any;

  teleop_score_avg: any;
  teleop_missed_avg: any;
  cycles_avg: any;

  endgame_success_rate: any;
  endgame_attempt_rate: any;

  disabled_rate: any;
  brownout_rate: any;

  defense_effectiveness_score: any;
  played_defense_rate: any;

  consistency_avg: any;
  overall_value_avg?: any;

  playoff_score?: any;
  pick_score?: any; // if present in v_picklist_v1
};

export type Role =
  | "MAIN_SCORER"
  | "SECOND_SCORER"
  | "DEFENDER"
  | "ENDGAME_ANCHOR"
  | "SUPPORT"
  | "UNKNOWN";

export function toNum(x: any, fallback = 0) {
  const n = typeof x === "number" ? x : Number(x);
  return Number.isFinite(n) ? n : fallback;
}

export function num(x: any, digits = 2) {
  return toNum(x, 0).toFixed(digits);
}

export function pct(x: any) {
  return `${Math.round(toNum(x, 0) * 100)}%`;
}

export function riskLabel(disabledRate: any, brownoutRate: any): Risk {
  const disabled = toNum(disabledRate, 0);
  const brownout = toNum(brownoutRate, 0);
  if (disabled >= 0.18) return "HIGH";
  if (disabled >= 0.08 || brownout >= 0.18) return "MED";
  return "LOW";
}

export function roleFor(t: TeamRow | null): Role {
  if (!t) return "UNKNOWN";

  const teleop = toNum(t.teleop_score_avg);
  const cycles = toNum(t.cycles_avg);
  const endgame = toNum(t.endgame_success_rate);
  const defense = toNum(t.defense_effectiveness_score);
  const playedDef = toNum(t.played_defense_rate);
  const consistency = toNum(t.consistency_avg);

  if (defense >= 0.65 || playedDef >= 0.55) return "DEFENDER";
  if ((teleop >= 10 || cycles >= 8) && endgame >= 0.55) return "MAIN_SCORER";
  if (teleop >= 6 || cycles >= 5) return "SECOND_SCORER";
  if (endgame >= 0.7) return "ENDGAME_ANCHOR";
  if (consistency >= 3.8) return "SUPPORT";
  return "UNKNOWN";
}

export function computeAllianceIntel(teamStats: (TeamRow | null)[]) {
  const present = teamStats.filter(Boolean) as TeamRow[];
  const haveAll = present.length === 3;

  const sum = (vals: number[]) => vals.reduce((a, b) => a + b, 0);
  const avg = (vals: number[]) => (vals.length ? sum(vals) / vals.length : 0);

  const autoScore = sum(teamStats.map((t) => toNum(t?.auto_score_avg)));
  const autoMob = avg(teamStats.map((t) => toNum(t?.auto_mobility_rate)));

  const teleop = sum(teamStats.map((t) => toNum(t?.teleop_score_avg)));
  const cycles = sum(teamStats.map((t) => toNum(t?.cycles_avg)));
  const missed = sum(teamStats.map((t) => toNum(t?.teleop_missed_avg)));

  const endgame = avg(teamStats.map((t) => toNum(t?.endgame_success_rate)));
  const defense = sum(teamStats.map((t) => toNum(t?.defense_effectiveness_score)));
  const consistency = avg(teamStats.map((t) => toNum(t?.consistency_avg)));

  const disabled = avg(teamStats.map((t) => toNum(t?.disabled_rate)));
  const brownout = avg(teamStats.map((t) => toNum(t?.brownout_rate)));

  const risk = riskLabel(disabled, brownout);

  const weaknesses: string[] = [];
  if (autoScore < 1.5 && autoMob < 0.5) weaknesses.push("AUTO");
  if (endgame < 0.35) weaknesses.push("ENDGAME");
  if (cycles < 6) weaknesses.push("CYCLES");
  if (defense < 0.6) weaknesses.push("DEFENSE");

  const roles = teamStats.map((t) => roleFor(t));

  // ONE formula everywhere (0..100)
  const synergyRaw =
    autoScore * 4 +
    autoMob * 8 +
    teleop * 1.5 +
    cycles * 2.2 +
    endgame * 18 +
    defense * 6 +
    consistency * 6 -
    missed * 1.2 -
    disabled * 40 -
    brownout * 15;

  const synergy = Math.max(0, Math.min(100, synergyRaw));

  return {
    haveAll,
    synergy,
    riskLabel: risk,
    weaknessText: weaknesses.length ? weaknesses.join(", ") : "NONE",
    weaknesses: weaknesses.length ? weaknesses : ["NONE"],
    roles,
    quick: {
      autoScore,
      autoMob,
      teleop,
      cycles,
      missed,
      endgame,
      defense,
      consistency,
      disabled,
      brownout,
    },
  };
}

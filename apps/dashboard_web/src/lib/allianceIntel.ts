// apps/dashboard_web/src/lib/allianceIntel.ts

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

  // some views also expose:
  pick_score?: any;
};

export type Role =
  | "MAIN_SCORER"
  | "SECOND_SCORER"
  | "DEFENDER"
  | "ENDGAME_ANCHOR"
  | "SUPPORT"
  | "UNKNOWN";

export type Risk = "LOW" | "MED" | "HIGH";

export function toNum(x: any, fallback = 0) {
  const n = typeof x === "number" ? x : Number(x);
  return Number.isFinite(n) ? n : fallback;
}

export function pct(x: any) {
  return `${Math.round(toNum(x, 0) * 100)}%`;
}

export function num(x: any, digits = 2) {
  return toNum(x, 0).toFixed(digits);
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

// ---------- Normalization helpers ----------
function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

// Smooth saturation: 0..1 where x=target ~0.63, x=2*target ~0.86 etc.
function softCap(x: number, target: number) {
  const v = toNum(x, 0);
  if (target <= 0) return 0;
  return 1 - Math.exp(-v / target);
}

function clamp100(x: number) {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(100, x));
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

  // Risk label
  const risk = riskLabel(disabled, brownout);

  // Weaknesses (simple + stable)
  const weaknesses: string[] = [];
  if (autoScore < 1.5 && autoMob < 0.5) weaknesses.push("AUTO");
  if (endgame < 0.35) weaknesses.push("ENDGAME");
  if (cycles < 6) weaknesses.push("CYCLES");
  if (defense < 0.6) weaknesses.push("DEFENSE");

  // Roles
  const roles = teamStats.map((t) => roleFor(t));

  // ✅ NEW: normalized synergy (no “always 100”)
  //
  // We convert raw metrics into 0..1 components using softCap.
  // Targets are tuned so good alliances land ~70–90, elite can reach ~95+, but not everyone hits 100.
  //
  // If later you want tighter/looser spread: adjust targets + weights only here.
  const autoScore01 = softCap(autoScore, 10); // target “good” combined auto
  const autoMob01 = clamp01(autoMob); // already 0..1

  const teleop01 = softCap(teleop, 90); // combined teleop points typical “good”
  const cycles01 = softCap(cycles, 24); // combined cycles target
  const endgame01 = clamp01(endgame); // 0..1
  const defense01 = softCap(defense, 1.8); // sum of 3 teams 0..3-ish depending on view
  const consistency01 = clamp01(consistency / 5); // your form uses 0..5

  const missed01 = softCap(missed, 18); // higher is worse
  const reliabilityPenalty01 = clamp01(disabled * 1.6 + brownout * 0.9); // 0..~1+

  // weighted score 0..100
  const base =
    18 * autoScore01 +
    8 * autoMob01 +
    22 * teleop01 +
    12 * cycles01 +
    22 * endgame01 +
    10 * defense01 +
    8 * consistency01;

  const penalties =
    14 * missed01 +
    22 * reliabilityPenalty01;

  const synergy = clamp100(base - penalties);

  return {
    haveAll,
    synergy, // 0..100
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

      // helpful debug for verifying consistency across pages
      _norm: {
        autoScore01,
        autoMob01,
        teleop01,
        cycles01,
        endgame01,
        defense01,
        consistency01,
        missed01,
        reliabilityPenalty01,
      },
    },
  };
}

// Discovery hints only. These associations must never become verified robot facts.
export function titleCandidates(title) {
  const explicit = [...title.matchAll(/(?:\b(?:frc|team)\s*#?\s*|#)(\d{1,5})\b/gi)];
  const years = [...new Set([...title.matchAll(/\b20(?:1[7-9]|2[0-6])\b/g)]
    .filter(m => !explicit.some(t => m.index >= t.index && m.index < t.index + t[0].length))
    .map(m => Number(m[0])))];
  const bare = [...title.matchAll(/(?<![\w.])([1-9]\d{1,4})(?![\w.])/g)]
    .map(m => Number(m[1])).filter(n => n < 2017 || n > 2026);
  const teams = [...new Set([...explicit.map(m => Number(m[1])), ...bare])].filter(n => n > 0);
  return {years, teams};
}

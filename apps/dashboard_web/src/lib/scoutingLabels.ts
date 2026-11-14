// Presentation only: never translate field IDs or stored option values.
const hebrew: Record<string, string> = {
  'Only if important':'רק אם יש משהו חשוב לציין',
  'Only key things: unique ability, big weakness, strategy insight':'רק דברים מרכזיים: יכולת ייחודית, חולשה משמעותית או תובנה אסטרטגית',
  'Pre-Match':'לפני המשחק', 'Identity':'זיהוי', 'Station':'עמדה',
  'Starting Configuration':'מצב התחלתי', 'Start Position':'מיקום התחלתי',
  'Red 1':'אדום 1', 'Red 2':'אדום 2', 'Red 3':'אדום 3',
  'Blue 1':'כחול 1', 'Blue 2':'כחול 2', 'Blue 3':'כחול 3',
  'Left':'שמאל', 'Center':'מרכז', 'Right':'ימין', 'Other / Unknown':'אחר / לא ידוע',
  'Preload':'טעינה מראש', 'None':'ללא', 'FUEL':'כדור (FUEL)', 'Other':'אחר',
  'Auto':'אוטונומי', 'Teleop':'שליטת נהגים',
  'Auto Scoring — FUEL into active HUB':'ניקוד באוטונומי — כדורים למרכז פעיל (HUB)',
  'Auto FUEL scored (active HUB)':'כדורים שנקלעו באוטונומי (HUB פעיל)',
  'Auto missed / bounced-out (FUEL attempts that did not score)':'החטאות באוטונומי / כדורים שקפצו החוצה ולא נוקדו',
  'AUTO: Achieved TOWER Level 1 (counts in AUTO)':'אוטונומי: הושגה רמה 1 במגדל (ניקוד באוטונומי)',
  'Auto Notes (optional)':'הערות לאוטונומי (רשות)',
  'Teleop Scoring — FUEL into active HUB':'ניקוד בשליטת נהגים — כדורים למרכז פעיל (HUB)',
  'Teleop FUEL scored (active HUB)':'כדורים שנקלעו בשליטת נהגים (HUB פעיל)',
  'Cycle + Field Behavior':'מחזורי פעולה והתנהגות במגרש',
  'Estimated Cycles (rough)':'הערכת מספר מחזורי פעולה', 'Intake Reliability':'אמינות האיסוף',
  'Excellent':'מצוינת', 'Good':'טובה', 'OK':'סבירה', 'Poor':'נמוכה', 'N/A':'לא רלוונטי',
  'Shot Alignment Speed':'מהירות ההתכווננות לירי', 'Fast':'מהירה', 'Medium':'בינונית', 'Slow':'איטית',
  'Field Awareness':'מודעות למתרחש במגרש', 'High':'גבוהה', 'Low':'נמוכה',
  'Defense (if applicable)':'הגנה (אם רלוונטי)', 'Played Defense (any time)':'שיחק בהגנה במהלך המשחק',
  'Defense Effectiveness':'יעילות ההגנה', 'Foul Risk While Defending':'סיכון לעבירות בזמן הגנה', 'Unknown':'לא ידוע',
  'Endgame (TOWER)':'סיום המשחק — מגדל (TOWER)',
  'TOWER Level (counts in TELEOP) + Location':'רמת הטיפוס במגדל (ניקוד בשליטת נהגים) ומיקום',
  'Attempted TOWER':'ניסה לטפס על המגדל', 'TOWER Level Achieved':'רמת הטיפוס שהושגה',
  'Level 1 (TELEOP)':'רמה 1 (שליטת נהגים)', 'Level 2':'רמה 2', 'Level 3':'רמה 3', 'Fail':'נכשל',
  'Time to Complete (sec)':'זמן להשלמה (שניות)',
  'TOWER location (for buddy/space planning)':'מיקום במגדל (לתכנון מקום לשותפים)',
  'N/A / Unknown':'לא רלוונטי / לא ידוע', 'Side':'צד', 'Endgame Stability':'יציבות בסיום המשחק',
  'Stable':'יציב', 'Shaky':'מתנדנד', 'Almost fell':'כמעט נפל',
  'Reliability / Issues':'אמינות ותקלות', 'Breakdowns / Problems':'תקלות ובעיות',
  'Robot Disabled (any time)':'הרובוט הושבת במהלך המשחק', 'Brownout / Comms Issues':'נפילת מתח / בעיות תקשורת',
  'Mechanical Failure':'תקלה מכנית', 'Electrical Failure':'תקלה חשמלית', 'Software / Auto Bug':'תקלה בתוכנה / באוטונומי',
  'Penalties Observed':'עבירות שנצפו', 'Few / Minor':'מעטות / קלות', 'Several':'מספר עבירות', 'Many / Costly':'רבות / משמעותיות',
  'Post-Match Ratings':'הערכה לאחר המשחק', 'Post-Match Summary':'סיכום המשחק',
  'Robot Role (observed at end)':'תפקיד הרובוט שנצפה במשחק', 'Fuel Scorer':'קולע כדורים', 'Feeder':'מזין כדורים',
  'Defense':'הגנה', 'Support / Utility':'תמיכה / שימוש כללי', 'Ratings (0–5)':'דירוגים (0–5)',
  'Driver Skill (0–5)':'מיומנות נהיגה (0–5)', 'Cycle Speed (0–5)':'מהירות מחזור פעולה (0–5)',
  'Consistency (0–5)':'עקביות (0–5)', 'Defense Value (0–5)':'תרומה בהגנה (0–5)', 'Overall Value (0–5)':'תרומה כוללת (0–5)',
  'Notes':'הערות', 'Notes (optional)':'הערות (רשות)',
  'Endgame':'סיום המשחק', 'Reliability':'אמינות', 'Post‑Match':'לאחר המשחק',
  'Auto Scoring':'ניקוד באוטונומי', 'Teleop Scoring':'ניקוד בשליטת נהגים', 'Pickup':'איסוף',
  'Pickup Fail':'כשל באיסוף', 'floor':'מהרצפה', 'human':'מהשחקן האנושי', 'both':'שניהם', 'unknown':'לא ידוע',
  'Auto A':'אוטונומי A', 'Auto B':'אוטונומי B', 'Auto C (optional)':'אוטונומי C (רשות)',
  'Fail/Dropped A':'החטאה / נפילה A', 'Fail/Dropped B':'החטאה / נפילה B',
  'Teleop A':'שליטת נהגים A', 'Teleop B':'שליטת נהגים B', 'Teleop C (optional)':'שליטת נהגים C (רשות)',
};

export function scoutingLabel(text: unknown, language: 'en' | 'he'): string {
  const source = String(text ?? '');
  return language === 'he' ? hebrew[source] ?? source : source;
}

export function scoutingNodeLabel(node: any, language: 'en' | 'he', field = 'label'): string {
  // Explicit template translations take precedence, including future custom fields.
  const translated = node?.[`${field}_${language}`] ?? node?.[`${field}s`]?.[language];
  return typeof translated === 'string' ? translated : scoutingLabel(node?.[field] ?? node?.title ?? node?.value ?? node?.id ?? node, language);
}

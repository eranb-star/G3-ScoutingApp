import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLocalization } from "../lib/localization";
import { useMemberAuth } from "../lib/memberAuth";
import { supabase } from "../supabase";

type Team = { team_number: number; team_name: string | null };
type Person = { id: string; display_name: string };
type Assignment = { id: string; team_number: number; member_id: string; status: string };

export default function PitAssignmentsPage() {
  const { pick } = useLocalization();
  const { profile } = useMemberAuth();
  const [eventId] = useState(localStorage.getItem("g3_event_id") || "");
  const [teams, setTeams] = useState<Team[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [rows, setRows] = useState<Assignment[]>([]);
  const [team, setTeam] = useState("");
  const [member, setMember] = useState("");
  const [message, setMessage] = useState("");
  const allowed = !!profile && ["admin", "mentor", "team_leader"].includes(profile.role);
  const assignmentByTeam = useMemo(() => new Map(rows.map(row => [row.team_number, row])), [rows]);
  const name = (id: string) => people.find(person => person.id === id)?.display_name || "—";

  async function load() {
    if (!eventId) return;
    const [teamResult, peopleResult, assignmentResult] = await Promise.all([
      supabase.from("teams").select("team_number,team_name").eq("event_id", eventId).order("team_number"),
      supabase.from("team_members").select("id,display_name").eq("active", true).order("display_name"),
      supabase.from("pit_scouting_assignments").select("id,team_number,member_id,status").eq("event_id", eventId).neq("status", "cancelled"),
    ]);
    setTeams((teamResult.data ?? []) as Team[]);
    setPeople((peopleResult.data ?? []) as Person[]);
    setRows((assignmentResult.data ?? []) as Assignment[]);
  }

  useEffect(() => { void load(); }, [eventId]);

  async function save(event: FormEvent) {
    event.preventDefault();
    const teamNumber = Number(team);
    const existing = assignmentByTeam.get(teamNumber);
    if (existing) {
      setMessage(pick(`Team ${teamNumber} is already assigned to ${name(existing.member_id)}. Remove that assignment before assigning someone else.`, `קבוצה ${teamNumber} כבר משובצת ל${name(existing.member_id)}. יש להסיר את השיבוץ לפני שיבוץ מחדש.`));
      return;
    }
    const { error } = await supabase.from("pit_scouting_assignments").insert({ event_id: eventId, team_number: teamNumber, member_id: member, status: "assigned", assigned_by: profile?.id });
    setMessage(error?.message ?? pick("Assignment saved.", "השיבוץ נשמר."));
    if (!error) { setTeam(""); setMember(""); await load(); }
  }

  async function remove(id: string) {
    const { error } = await supabase.from("pit_scouting_assignments").update({ status: "cancelled" }).eq("id", id);
    setMessage(error?.message ?? pick("Assignment removed. The team is available again.", "השיבוץ הוסר. הקבוצה זמינה שוב."));
    if (!error) await load();
  }

  return <main className="hub-page pit-assign-page">
    <header className="quality-hero"><div><div className="hub-eyebrow">PIT COVERAGE</div><h1>{pick("Pit assignments", "שיבוצי פיט")}</h1><p>{pick("One accountable scout per event team. Assigned teams are locked until the current assignment is removed.", "סקאוטר אחראי אחד לכל קבוצה באירוע. קבוצה ששובצה נעולה עד להסרת השיבוץ הנוכחי.")}</p></div></header>
    {message ? <div className="hub-message" role="status">{message}</div> : null}
    {allowed ? <form className="hub-card pit-assign-form" onSubmit={save}>
      <div className="pit-assign-form-heading"><span>{pick("NEW COVERAGE", "שיבוץ חדש")}</span><h2>{pick("Assign one scout to an available team", "שיבוץ סקאוטר לקבוצה זמינה")}</h2></div>
      <label>{pick("Event team", "קבוצה באירוע")}<select required value={team} onChange={event => setTeam(event.target.value)}><option value="">{pick("Choose an unassigned team", "בחירת קבוצה ללא שיבוץ")}</option>{teams.map(item => { const assignment = assignmentByTeam.get(item.team_number); return <option key={item.team_number} value={item.team_number} disabled={!!assignment}>{assignment ? "✓ " : ""}{item.team_number}{item.team_name ? ` · ${item.team_name}` : ""}{assignment ? ` — ${pick("assigned to", "משובצת ל")} ${name(assignment.member_id)}` : ""}</option>; })}</select></label>
      <label>{pick("Pit scout", "סקאוטר פיט")}<select required value={member} onChange={event => setMember(event.target.value)}><option value="">{pick("Choose a member", "בחירת חבר/ת קבוצה")}</option>{people.map(person => <option key={person.id} value={person.id}>{person.display_name}</option>)}</select></label>
      <button className="hub-button pit-assign-save">{pick("Save assignment", "שמירת שיבוץ")}</button>
    </form> : null}
    <section className="pit-assignment-board" aria-label={pick("Event team coverage", "כיסוי קבוצות באירוע")}>{teams.map(item => { const assignment = assignmentByTeam.get(item.team_number); return <article className={`hub-card${assignment ? " is-assigned" : ""}`} key={item.team_number}>
      <div className="pit-team-number"><small>{pick("TEAM", "קבוצה")}</small><b>{item.team_number}</b></div>
      <div className="pit-team-assignment"><strong>{item.team_name || pick("Event team", "קבוצת אירוע")}</strong><span className={assignment ? "is-covered" : "is-open"}>{assignment ? pick("Assigned", "משובצת") : pick("Available", "זמינה")}</span><small>{assignment ? `${name(assignment.member_id)} · ${assignment.status}` : pick("Ready for assignment", "מוכנה לשיבוץ")}</small></div>
      {assignment && allowed ? <button className="pit-assignment-remove" onClick={() => void remove(assignment.id)}>{pick("Remove", "הסרה")}</button> : null}
    </article>; })}</section>
  </main>;
}

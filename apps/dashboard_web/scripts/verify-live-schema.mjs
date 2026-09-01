import { readFileSync } from "node:fs";

const values = {};
for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split(/\r?\n/)) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) values[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, "");
}
const base = values.VITE_SUPABASE_URL;
const key = values.VITE_SUPABASE_ANON_KEY;
if (!base || !key) throw new Error("Supabase environment configuration is incomplete.");
const response = await fetch(`${base.replace(/\/$/, "")}/rest/v1/team_actions?select=id,destination&limit=1`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
});
console.log(`LIVE_SCHEMA_HTTP_${response.status}`);
if (!response.ok) {
  const body = await response.text();
  console.log(body.includes("destination") ? "DESTINATION_SCHEMA_ERROR" : "REST_ACCESS_ERROR");
  process.exit(1);
}

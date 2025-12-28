alter table events enable row level security;
alter table teams enable row level security;
alter table matches enable row level security;
alter table scout_entries enable row level security;
alter table form_templates enable row level security;
alter table picklists enable row level security;
alter table users enable row level security;

create policy "read events" on events for select to authenticated using (true);
create policy "read teams" on teams for select to authenticated using (true);
create policy "read matches" on matches for select to authenticated using (true);
create policy "read entries" on scout_entries for select to authenticated using (true);

create policy "insert entries" on scout_entries for insert to authenticated with check (true);

create policy "read users" on users for select to authenticated using (true);

create policy "manage templates strategy" on form_templates
for all to authenticated
using (exists(select 1 from users where users.id = auth.uid() and users.role='STRATEGY'))
with check (exists(select 1 from users where users.id = auth.uid() and users.role='STRATEGY'));

create policy "manage picklists strategy" on picklists
for all to authenticated
using (exists(select 1 from users where users.id = auth.uid() and users.role='STRATEGY'))
with check (exists(select 1 from users where users.id = auth.uid() and users.role='STRATEGY'));

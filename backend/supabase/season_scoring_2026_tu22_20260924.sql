begin;
-- Release-reviewed numeric facts, not an LLM extraction. Verified 2026-09-24
-- against official TU22 PDF pages 47–48 and the production indexed SHA-256.
-- The all-zero actor denotes this recorded release review, never a human account.
do $$
declare document public.frc_knowledge_documents;version_id uuid;
begin
 select * into document from public.frc_knowledge_documents
 where season=2026 and url='https://firstfrc.blob.core.windows.net/frc2026/Manual/2026GameManual.pdf'
 and sha256='5c67300fc412a1eed8ca9dc37fb6644aee05795a2befed1f69736643cbf95139' and indexed_sha256=sha256;
 if not found then raise exception 'Reviewed TU22 source is not the current indexed manual; do not activate stale scoring';end if;
 if exists(select 1 from public.frc_scoring_rule_versions where season=2026 and rule_key='tower-traversal') then return;end if;
 insert into public.frc_scoring_rule_versions(season,rule_key,revision,rule,sources,created_by)
 values(2026,'tower-traversal',1,
 '{"id":"tower-traversal","revision":"1","threshold":50,"robots":3,"levels":[{"id":"none","points":0},{"id":"L1","points":10},{"id":"L2","points":20},{"id":"L3","points":30}],"keywords":["tower","traversal","climb","טיפוס","מגדל"],"autonomous":{"pointsPerRobot":15,"maxRobots":2}}',
 jsonb_build_array(jsonb_build_object('documentId',document.id,'sha256',document.sha256,'page',47,'excerpt','TU22 Table 6-4: teleoperated tower levels score 10, 20, 30. Autonomous level one scores 15 per robot, at most two robots.'),jsonb_build_object('documentId',document.id,'sha256',document.sha256,'page',48,'excerpt','TU22 Table 6-5: traversal threshold is 50 across the listed event levels; tower points across the match contribute.')),
 '00000000-0000-0000-0000-000000000000') returning id into version_id;
 insert into public.frc_scoring_rule_activations(season,rule_key,version_id,actor,note)
 values(2026,'tower-traversal',version_id,'00000000-0000-0000-0000-000000000000','Release source verification by Codex, 2026-09-24: official TU22 PDF pages 47–48, exact indexed hash. Numeric arithmetic only; physical scoring criteria still apply.');
end$$;
do $$declare d public.frc_knowledge_documents;v uuid;begin
 select * into d from public.frc_knowledge_documents where season=2026 and url='https://firstfrc.blob.core.windows.net/frc2026/Manual/2026GameManual.pdf' and sha256='5c67300fc412a1eed8ca9dc37fb6644aee05795a2befed1f69736643cbf95139' and indexed_sha256=sha256;
 if not found then raise exception 'Current TU22 indexed manual required';end if;
 if exists(select 1 from public.frc_planning_policies where season=2026) then return;end if;
 insert into public.frc_planning_policies(season,revision,policy,sources,actor) values(2026,1,'{"seconds":20,"maxPreload":8,"pointsPerPiece":1}',jsonb_build_array(jsonb_build_object('documentId',d.id,'sha256',d.sha256,'page',43,'excerpt','Section 6.3.4: no more than eight fuel preloaded per robot.'),jsonb_build_object('documentId',d.id,'sha256',d.sha256,'page',44,'excerpt','Section 6.4: autonomous lasts twenty seconds; both hubs are active.'),jsonb_build_object('documentId',d.id,'sha256',d.sha256,'page',47,'excerpt','Table 6-4: each fuel scored in an active hub earns one point.')), '00000000-0000-0000-0000-000000000000') returning id into v;
 insert into public.frc_planning_policy_activations(season,version_id,actor,note) values(2026,v,'00000000-0000-0000-0000-000000000000','Release verification against TU22 pages 43,44,47. Numeric constraints only; start position, shots and complete legality require review.');
end$$;
commit;

-- Isolated QA ONLY: cyooubycafubbnkjcqlw. All fixture writes roll back.
begin;
create temporary table qa_article_context(member_id uuid,mentor_id uuid,article_id uuid);
insert into qa_article_context select
 (select id from public.team_members where email='student@g3-qa.invalid' and active),
 (select id from public.team_members where email='mentor@g3-qa.invalid' and active),gen_random_uuid();
do $$begin if exists(select 1 from qa_article_context where member_id is null or mentor_id is null) then raise exception 'Missing QA actors'; end if; end$$;
grant select on qa_article_context to authenticated;
select set_config('request.jwt.claim.sub',member_id::text,true) from qa_article_context;
set local role authenticated;
insert into public.frc_knowledge_articles(id,title,content,created_by)
select article_id,'QA review boundary','Synthetic article for authenticated acceptance.',member_id from qa_article_context;
do $$begin
 begin update public.frc_knowledge_articles set verified=true where id=(select article_id from qa_article_context); raise exception 'Direct verification accepted'; exception when insufficient_privilege then null; end;
 begin perform public.review_frc_article((select article_id from qa_article_context),1,true); raise exception 'Member review accepted'; exception when insufficient_privilege then null; end;
end$$;
select set_config('request.jwt.claim.sub',mentor_id::text,true) from qa_article_context;
select public.review_frc_article(article_id,1,true) from qa_article_context;
do $$begin if not exists(select 1 from public.frc_knowledge_articles a join qa_article_context q on a.id=q.article_id where a.verified and a.reviewed_by=q.mentor_id and a.revision=1) then raise exception 'Review attribution failed'; end if; end$$;
select set_config('request.jwt.claim.sub',member_id::text,true) from qa_article_context;
update public.frc_knowledge_articles set content='Changed after review by its synthetic author.' where id=(select article_id from qa_article_context);
do $$begin
 if not exists(select 1 from public.frc_knowledge_articles where id=(select article_id from qa_article_context) and revision=2 and not verified and reviewed_by is null) then raise exception 'Edit did not invalidate review'; end if;
 if (select count(*) from public.frc_article_revisions where article_id=(select article_id from qa_article_context))<>2 then raise exception 'Missing snapshots'; end if;
 begin update public.frc_article_revisions set snapshot='{}' where article_id=(select article_id from qa_article_context); raise exception 'Snapshot forgery accepted'; exception when insufficient_privilege then null; end;
end$$;
select set_config('request.jwt.claim.sub',mentor_id::text,true) from qa_article_context;
do $$begin
 begin perform public.review_frc_article((select article_id from qa_article_context),1,true); raise exception 'Stale review accepted'; exception when serialization_failure then null; end;
end$$;
select public.review_frc_article(article_id,2,true) from qa_article_context;
reset role;
rollback;
select 'PASS: hosted draft, direct/member review denial, attributed mentor review, edit invalidation, immutable snapshots and stale revision denial; rolled back' as result;

begin;
create table if not exists robot_studio_comments(
 id uuid primary key,scene_id uuid not null,revision integer not null,option_id text not null,
 instance_id text,body text not null check(length(trim(body)) between 1 and 4000),
 author_id uuid not null references team_members(id),created_at timestamptz not null default now(),
 foreign key(scene_id,revision)references robot_studio_versions(scene_id,revision)
);
alter table robot_studio_comments enable row level security;
revoke all on robot_studio_comments from public,anon,authenticated;grant select on robot_studio_comments to authenticated;
drop policy if exists studio_comments_read on robot_studio_comments;
create policy studio_comments_read on robot_studio_comments for select to authenticated using(studio_access(scene_id) and exists(select 1 from robot_studio_versions v where v.scene_id=robot_studio_comments.scene_id and v.revision=robot_studio_comments.revision));
create or replace function comment_robot_studio(p_id uuid,p_scene uuid,p_revision integer,p_option text,p_instance text,p_body text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare d jsonb;o jsonb;old robot_studio_comments%rowtype;
begin
 if not studio_access(p_scene) then raise exception 'Design access required';end if;
 select document into d from robot_studio_versions where scene_id=p_scene and revision=p_revision;
 if d is null or not studio_source_access(d) then raise exception 'Saved revision is not accessible';end if;
 select value into o from jsonb_array_elements(d->'options') x where x->>'id'=p_option;
 if o is null or (p_instance is not null and not exists(select 1 from jsonb_array_elements(o->'parts') x where x->>'id'=p_instance)) then raise exception 'Comment target is not in this version';end if;
 select * into old from robot_studio_comments where id=p_id;
 if old.id is not null then if old.author_id=auth.uid() and old.scene_id=p_scene and old.revision=p_revision and old.option_id=p_option and old.instance_id is not distinct from p_instance and old.body=trim(p_body) then return;end if;raise exception 'Comment identity already used';end if;
 insert into robot_studio_comments(id,scene_id,revision,option_id,instance_id,body,author_id)values(p_id,p_scene,p_revision,p_option,p_instance,trim(p_body),auth.uid());
end$$;
revoke all on function comment_robot_studio(uuid,uuid,integer,text,text,text) from public,anon;
grant execute on function comment_robot_studio(uuid,uuid,integer,text,text,text) to authenticated;
commit;

-- Private append-only history. Existing backend writes remain compatible.
create table if not exists public.s4_school_audit (
 school_id text not null references public.s4_schools(id) on delete cascade deferrable initially deferred,
 id text not null, actor_id text, created_at text, payload jsonb not null,
 primary key(school_id,id)
);
alter table public.s4_school_audit enable row level security;
revoke all on public.s4_school_audit from public,anon,authenticated;
grant select,insert,update,delete on public.s4_school_audit to service_role;
create index if not exists s4_school_audit_actor_time on public.s4_school_audit(actor_id,created_at desc);
create or replace function public.s4_archive_school_audit() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 insert into public.s4_school_audit(school_id,id,actor_id,created_at,payload)
 select new.id,e->>'id',e->>'actorId',e->>'createdAt',e
 from jsonb_array_elements(coalesce(new.data->'audit','[]'::jsonb)) e
 on conflict(school_id,id) do nothing;
 if exists(select 1 from jsonb_array_elements(coalesce(new.data->'audit','[]'::jsonb)) e
 join public.s4_school_audit a on a.school_id=new.id and a.id=e->>'id' where a.payload<>e)
 then raise exception 'Audit identity collision';end if;
 new.data=jsonb_set(new.data,'{audit}','[]'::jsonb);
 return new;
end $$;
revoke all on function public.s4_archive_school_audit() from public,anon,authenticated;
grant execute on function public.s4_archive_school_audit() to service_role;
create trigger s4_archive_school_audit before insert or update of data on public.s4_schools
 for each row execute function public.s4_archive_school_audit();
-- Lock each current version and assert that only audit storage changed.
do $$ declare r record; next_data jsonb;begin
 for r in select id,data,revision from public.s4_schools order by id for update loop
  update public.s4_schools set data=data where id=r.id returning data into next_data;
  if (next_data-'audit') is distinct from (r.data-'audit') then raise exception 'Business data changed';end if;
  if exists(select 1 from jsonb_array_elements(coalesce(r.data->'audit','[]'::jsonb)) e
    where not exists(select 1 from public.s4_school_audit a where a.school_id=r.id and a.id=e->>'id' and a.payload=e))
  then raise exception 'Audit archive incomplete';end if;
 end loop;
end $$;
-- A login receives only its own active member and linked teacher, never scores/history.
create or replace function public.s4_login_context(p_code text,p_username text) returns jsonb
language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('id',s.id,'enabled',s.enabled,'data',jsonb_build_object(
 'school',s.data->'school','members',jsonb_build_array(m),
 'teachers',coalesce((select jsonb_agg(t) from jsonb_array_elements(s.data->'teachers') t where t->>'id'=m->>'teacherId'),'[]'::jsonb)))
 from public.s4_schools s cross join lateral jsonb_array_elements(s.data->'members') m
 where s.code=p_code and m->>'username'=p_username and m->>'active'='1';
$$;
-- Auth is verified by the Edge API first; membership is rechecked under the row lock.
create or replace function public.s4_open_session(p_id text,p_member text,p_uid text,p_hash text,p_expires timestamptz) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare r public.s4_schools%rowtype;m jsonb;sessions jsonb;next_data jsonb;
begin
 if p_hash!~'^[a-f0-9]{64}$' or p_expires<=now() or p_expires>now()+interval '8 days' then raise exception 'Invalid session';end if;
 select * into r from public.s4_schools where id=p_id for update;
 if not found or not r.enabled then return null;end if;
 select e into m from jsonb_array_elements(r.data->'members') e where e->>'id'=p_member and e->>'authUserId'=p_uid and e->>'active'='1';
 if m is null then return null;end if;
 select coalesce(jsonb_agg(e),'[]'::jsonb) into sessions from jsonb_array_elements(coalesce(r.data->'sessions','[]'::jsonb)) e where (e->>'expiresAt')::timestamptz>now();
 next_data=jsonb_set(r.data,'{sessions}',sessions||jsonb_build_array(jsonb_build_object('hash',p_hash,'memberId',p_member,'expiresAt',to_char(p_expires at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))));
 if next_data->'pdpc' is null and jsonb_array_length(coalesce(next_data->'assessments','[]'::jsonb))=0 then
 next_data=jsonb_set(next_data,'{pdpc}',jsonb_build_object('version',2,'epoch',gen_random_uuid(),'revision',0,'assignments','{}'::jsonb));end if;
 update public.s4_schools set data=next_data,revision=revision+1,updated_at=now() where id=r.id;
 return public.s4_login_context(r.code,m->>'username');
end $$;
revoke all on function public.s4_login_context(text,text) from public,anon,authenticated;
revoke all on function public.s4_open_session(text,text,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.s4_login_context(text,text),public.s4_open_session(text,text,text,text,timestamptz) to service_role;

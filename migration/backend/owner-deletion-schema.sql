-- Server-only deletion receipts/outbox. No school payload, scores, names or
-- passwords are retained here; Auth identifiers are cleared after cleanup.
create table public.s4_owner_deletions (
 id uuid primary key,
 school_id text not null unique,
 school_code text not null,
 actor_id text not null,
 created_at timestamptz not null default now(),
 pending_auth text[] not null default '{}'
);
alter table public.s4_owner_deletions enable row level security;
revoke all on public.s4_owner_deletions from public,anon,authenticated;
grant select,insert,update on public.s4_owner_deletions to service_role;

create or replace function public.s4_delete_school(
 p_school_id text,p_revision bigint,p_confirmation text,p_owner_id text,
 p_sid_hash text,p_operation_id uuid
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare s public.s4_schools%rowtype; j public.s4_owner_deletions%rowtype; ids text[];
begin
 if p_school_id is null or p_revision is null or p_revision<1 or p_confirmation is null or p_operation_id is null then
  return jsonb_build_object('ok',false,'status',400,'message','Maklumat pengesahan pemadaman tidak lengkap.');
 end if;
 -- Recheck owner capability inside the same transaction as removal.
 if not exists(select 1 from public.s4_platform_owners o
  join public.s4_owner_sessions se on se.owner_id=o.id
  where o.id=p_owner_id and o.enabled and not o.must_change_password
  and se.hash=p_sid_hash and se.expires_at>now()) then
  return jsonb_build_object('ok',false,'status',403,'message','Akses pemilik tidak sah.');
 end if;
 -- Same operation ID retries may finish cleanup, but cannot delete another
 -- school (including a later registration reusing the same school code).
 select * into j from public.s4_owner_deletions where id=p_operation_id;
 if found then
  if j.school_id<>p_school_id or 'PADAM '||j.school_code<>p_confirmation or j.actor_id<>p_owner_id then
   return jsonb_build_object('ok',false,'status',409,'message','Permintaan pemadaman tidak sepadan.');
  end if;
  return jsonb_build_object('ok',true,'job',to_jsonb(j));
 end if;
 select * into s from public.s4_schools where id=p_school_id for update;
 if not found then return jsonb_build_object('ok',false,'status',404,'message','Sekolah tidak ditemui. Muat semula senarai.'); end if;
 if s.code='SUPERADMIN' then return jsonb_build_object('ok',false,'status',403,'message','Akaun pemilik tidak boleh dipadam di sini.'); end if;
 if s.revision<>p_revision then return jsonb_build_object('ok',false,'status',409,'message','Rekod sekolah telah berubah. Muat semula dan sahkan semula.'); end if;
 if p_confirmation is null or p_confirmation<>'PADAM '||s.code then
  return jsonb_build_object('ok',false,'status',400,'message','Taip PADAM diikuti kod sekolah untuk mengesahkan.');
 end if;
 -- Preserve only identity cleanup work, not the school document.
 select coalesce(array_agg(distinct m->>'authUserId') filter(where m->>'authUserId' is not null),'{}')
 into ids from jsonb_array_elements(coalesce(s.data->'members','[]')) m;
 insert into public.s4_owner_deletions(id,school_id,school_code,actor_id,pending_auth)
 values(p_operation_id,s.id,s.code,p_owner_id,ids) returning * into j;
 delete from public.s4_schools where id=s.id;
 return jsonb_build_object('ok',true,'job',to_jsonb(j));
end $$;
revoke all on function public.s4_delete_school(text,bigint,text,text,text,uuid) from public,anon,authenticated;
grant execute on function public.s4_delete_school(text,bigint,text,text,text,uuid) to service_role;

import fs from 'node:fs';
// Isolated temporary tables/functions and ROLLBACK: no production school writes.
const schema=fs.readFileSync('migration/backend/owner-deletion-schema.sql','utf8');
const fn=schema.slice(schema.indexOf('create or replace function')).replaceAll('public.','pg_temp.');
console.log(`begin;
create temp table s4_schools(id text primary key,code text unique not null,data jsonb not null,revision bigint not null,enabled boolean not null default true);
create temp table s4_platform_owners(id text primary key,enabled boolean,must_change_password boolean);
create temp table s4_owner_sessions(hash text,owner_id text,expires_at timestamptz);
create temp table s4_owner_deletions(id uuid primary key,school_id text unique not null,school_code text not null,actor_id text not null,created_at timestamptz default now(),pending_auth text[] not null default '{}');
${fn}
insert into pg_temp.s4_platform_owners values('fixture-owner',true,false);
insert into pg_temp.s4_owner_sessions values(repeat('e',64),'fixture-owner',now()+interval '1 hour');
insert into pg_temp.s4_schools(id,code,revision,data) values
 ('fixture-target','ABC001',4,'{"school":{"id":"fixture-target","code":"ABC001"},"members":[{"authUserId":"fixture-auth"},{"authUserId":"fixture-auth"}],"teachers":[{"name":"Fictional"}],"staff":[{}],"assessments":[{"total":77}],"strength":{"2026":{"A1":{"score":4}}},"management":{"2025":{}},"achievement":{"2026":{}},"resources":{"assignment":"fixture"},"sessions":[{"hash":"secret-fixture"}],"invitations":[{}],"audit":[{}]}'),
 ('fixture-other','ABC002',8,'{"school":{"id":"fixture-other","code":"ABC002"},"members":[],"assessments":[{"total":88}]}');
do $$
declare r jsonb; before_other jsonb; op uuid:='11111111-1111-4111-8111-111111111111';
begin
 select data into before_other from pg_temp.s4_schools where id='fixture-other';
 r:=pg_temp.s4_delete_school('fixture-target',4,'PADAM ABC001','impostor',repeat('e',64),op);
 assert (r->>'status')::int=403,'owner authorization';
 r:=pg_temp.s4_delete_school('fixture-target',null,'PADAM ABC001','fixture-owner',repeat('e',64),op);
 assert (r->>'status')::int=400,'missing revision rejected';
 r:=pg_temp.s4_delete_school('fixture-target',3,'PADAM ABC001','fixture-owner',repeat('e',64),op);
 assert (r->>'status')::int=409,'stale revision';
 r:=pg_temp.s4_delete_school('fixture-target',4,'ABC001','fixture-owner',repeat('e',64),op);
 assert (r->>'status')::int=400,'explicit irreversible confirmation';
 assert (select count(*)=2 from pg_temp.s4_schools),'rejected writes';
 update pg_temp.s4_platform_owners set must_change_password=true;
 r:=pg_temp.s4_delete_school('fixture-target',4,'PADAM ABC001','fixture-owner',repeat('e',64),op);
 assert (r->>'status')::int=403,'temporary owner denied';
 update pg_temp.s4_platform_owners set must_change_password=false;
 r:=pg_temp.s4_delete_school('fixture-target',4,'PADAM ABC001','fixture-owner',repeat('e',64),op);
 assert (r->>'ok')::boolean,'successful transaction';
 assert not exists(select 1 from pg_temp.s4_schools where id='fixture-target'),'entire school document removed';
 assert (select data=before_other from pg_temp.s4_schools where id='fixture-other'),'other school untouched';
 assert (select pending_auth=array['fixture-auth'] from pg_temp.s4_owner_deletions where id=op),'deduplicated Auth work';
 assert (select school_code='ABC001' from pg_temp.s4_owner_deletions where id=op),'receipt keeps actual code';
 assert not (r->'job' ? 'data'),'no school payload in receipt';
 r:=pg_temp.s4_delete_school('fixture-target',4,'PADAM ABC001','fixture-owner',repeat('e',64),op);
 assert (r->>'ok')::boolean,'retry after committed removal';
 r:=pg_temp.s4_delete_school('fixture-other',8,'PADAM ABC002','fixture-owner',repeat('e',64),op);
 assert (r->>'status')::int=409,'operation cannot target another school';
 insert into pg_temp.s4_schools values('fixture-new','ABC001','{"school":{"id":"fixture-new","code":"ABC001"}}',1,true);
 r:=pg_temp.s4_delete_school('fixture-target',4,'PADAM ABC001','fixture-owner',repeat('e',64),op);
 assert exists(select 1 from pg_temp.s4_schools where id='fixture-new'),'retry cannot delete re-registered code';
 update pg_temp.s4_owner_sessions set expires_at=now()-interval '1 minute';
 r:=pg_temp.s4_delete_school('fixture-other',8,'PADAM ABC002','fixture-owner',repeat('e',64),'22222222-2222-4222-8222-222222222222');
 assert (r->>'status')::int=403,'expired owner denied';
end $$;
-- Force receipt failure: the school must remain if audit/outbox cannot commit.
update pg_temp.s4_owner_sessions set expires_at=now()+interval '1 hour';
create function pg_temp.reject_receipt() returns trigger language plpgsql as $$begin raise exception 'fixture rejection';end$$;
create trigger receipt_failure before insert on pg_temp.s4_owner_deletions for each row execute function pg_temp.reject_receipt();
do $$begin
 begin
  perform pg_temp.s4_delete_school('fixture-other',8,'PADAM ABC002','fixture-owner',repeat('e',64),'33333333-3333-4333-8333-333333333333');
  raise exception 'expected receipt failure';
 exception when raise_exception then assert sqlerrm='fixture rejection';
 end;
 assert exists(select 1 from pg_temp.s4_schools where id='fixture-other'),'receipt failure rolls back deletion';
 assert not exists(select 1 from pg_temp.s4_owner_deletions where id='33333333-3333-4333-8333-333333333333'),'failed transaction leaves no receipt';
 assert not has_function_privilege('anon','pg_temp.s4_delete_school(text,bigint,text,text,text,uuid)','EXECUTE'),'anon denied';
 assert not has_function_privilege('authenticated','pg_temp.s4_delete_school(text,bigint,text,text,text,uuid)','EXECUTE'),'school Auth denied';
end $$;
select 'PASS: isolated PostgreSQL deletion, authorization, stale revision, confirmation, all-module removal, other-school preservation, idempotency, code re-registration, expiry, grants and atomic rollback' as result;
rollback;`);

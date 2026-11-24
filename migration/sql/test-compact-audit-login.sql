-- Integration test: transaction rolls back every synthetic row/session.
begin;
set local role service_role;
do $$
declare sid text:='TST-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)); d jsonb; before_data jsonb; r jsonb;rev bigint;
begin
 d=jsonb_build_object('school',jsonb_build_object('id',sid,'code',sid,'name','Synthetic performance test'),
 'members',jsonb_build_array(jsonb_build_object('id','m','username','synthetic','authUserId','synthetic-uid','active',1,'role','admin','teacherId','t')),
 'teachers',jsonb_build_array(jsonb_build_object('id','t','position','GURU BESAR')),
 'assessments',jsonb_build_array(jsonb_build_object('id','a','scores',jsonb_build_array(0,null,4),'status','verified')),
 'moduleAttestations',jsonb_build_object('2026',jsonb_build_object('strength',jsonb_build_object('revision',2,'fingerprint','preserve'))),
 'sessions','[]'::jsonb,'invitations','[]'::jsonb,'audit',jsonb_build_array(jsonb_build_object('id','original','actorId','m','before','old','after','new')));
 insert into public.s4_schools(id,code,data,revision,enabled) values(sid,sid,d,1,true);
 if not exists(select 1 from public.s4_school_audit where school_id=sid and payload=d->'audit'->0) then raise exception 'archive failed';end if;
 select data into before_data from public.s4_schools where id=sid;
 if before_data-'audit'<>d-'audit' or before_data->'audit'<>'[]'::jsonb then raise exception 'data changed';end if;
 r=public.s4_login_context(sid,'synthetic');
 if r->'data' ? 'assessments' or jsonb_array_length(r->'data'->'members')<>1 then raise exception 'login projection leak';end if;
 if public.s4_login_context(sid,'missing') is not null then raise exception 'unknown member accepted';end if;
 if public.s4_open_session(sid,'m','wrong-uid',repeat('a',64),now()+interval '7 days') is not null then raise exception 'identity bypass';end if;
 perform public.s4_open_session(sid,'m','synthetic-uid',repeat('a',64),now()+interval '7 days');
 perform public.s4_open_session(sid,'m','synthetic-uid',repeat('b',64),now()+interval '7 days');
 select data,revision into r,rev from public.s4_schools where id=sid;
 if jsonb_array_length(r->'sessions')<>2 or rev<>3 or (r-'sessions')<>(before_data-'sessions') then raise exception 'session changed marks/attestation or lost session';end if;
 update public.s4_schools set enabled=false where id=sid;
 if public.s4_open_session(sid,'m','synthetic-uid',repeat('c',64),now()+interval '7 days') is not null then raise exception 'disabled school accepted';end if;
 update public.s4_schools set enabled=true,data=jsonb_set(data,'{members,0,active}','0') where id=sid;
 if public.s4_open_session(sid,'m','synthetic-uid',repeat('c',64),now()+interval '7 days') is not null then raise exception 'disabled member accepted';end if;
 update public.s4_schools set data=jsonb_set(data,'{audit}',d->'audit') where id=sid;
 if (select count(*) from public.s4_school_audit where school_id=sid)<>1 then raise exception 'duplicate audit';end if;
 if has_function_privilege('anon','public.s4_open_session(text,text,text,text,timestamptz)','execute') or has_function_privilege('authenticated','public.s4_login_context(text,text)','execute') or has_table_privilege('anon','public.s4_school_audit','select') then raise exception 'public exposure';end if;
end $$;
rollback;

-- Server-only read projection. Audit history remains stored in s4_schools.
create or replace function public.s4_read_school(p_id text)
returns jsonb language sql stable security invoker set search_path = '' as $$
 select jsonb_build_object('id',s.id,'code',s.code,'revision',s.revision,'enabled',s.enabled,'updated_at',s.updated_at,
 'data',(s.data - 'audit') || jsonb_build_object('audit','[]'::jsonb))
 from public.s4_schools s where s.id=p_id;
$$;
revoke all on function public.s4_read_school(text) from public, anon, authenticated;
grant execute on function public.s4_read_school(text) to service_role;

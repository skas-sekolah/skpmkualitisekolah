-- Private owner allowlist. School administrators cannot read or assign it.
create table public.s4_platform_owners (
 id text primary key,
 auth_user_id uuid unique references auth.users(id),
 enabled boolean not null default true,
 must_change_password boolean not null default true,
 bootstrap_hash text,
 bootstrap_salt text,
 check ((bootstrap_hash is null)=(bootstrap_salt is null))
);
alter table public.s4_platform_owners enable row level security;
revoke all on public.s4_platform_owners from public,anon,authenticated;
grant select,insert,update,delete on public.s4_platform_owners to service_role;
create table public.s4_owner_sessions (
 hash text primary key check(hash ~ '^[a-f0-9]{64}$'),
 owner_id text not null references public.s4_platform_owners(id) on delete cascade,
 expires_at timestamptz not null
);
create index s4_owner_sessions_owner_idx on public.s4_owner_sessions(owner_id);
alter table public.s4_owner_sessions enable row level security;
revoke all on public.s4_owner_sessions from public,anon,authenticated;
grant select,insert,update,delete on public.s4_owner_sessions to service_role;
alter table public.s4_schools add constraint s4_schools_reserved_owner_code check(code<>'SUPERADMIN');

-- District monitoring accounts are server-managed, independent of school Admin
-- and Super Admin identities. No browser role can grant or inspect membership.
create table public.s4_ppd_accounts (
 id uuid primary key default gen_random_uuid(),
 username text not null unique check(username=upper(username) and username ~ '^[A-Z0-9][A-Z0-9@._-]{2,63}$'),
 display_name text not null default 'Pegawai PPD',
 auth_user_id uuid unique references auth.users(id),
 enabled boolean not null default false,
 must_change_password boolean not null default true,
 bootstrap_hash text,
 bootstrap_salt text,
 check ((bootstrap_hash is null)=(bootstrap_salt is null))
);
alter table public.s4_ppd_accounts enable row level security;
revoke all on public.s4_ppd_accounts from public,anon,authenticated;
grant select,insert,update,delete on public.s4_ppd_accounts to service_role;
create table public.s4_ppd_sessions (
 hash text primary key check(hash ~ '^[a-f0-9]{64}$'),
 account_id uuid not null references public.s4_ppd_accounts(id) on delete cascade,
 expires_at timestamptz not null
);
create index s4_ppd_sessions_account_idx on public.s4_ppd_sessions(account_id);
alter table public.s4_ppd_sessions enable row level security;
revoke all on public.s4_ppd_sessions from public,anon,authenticated;
grant select,insert,update,delete on public.s4_ppd_sessions to service_role;
alter table public.s4_schools add constraint s4_schools_reserved_ppd_code check(code<>'PPD');

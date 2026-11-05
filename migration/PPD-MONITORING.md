# Pegawai PPD monitoring (draft)

The existing login form accepts reserved access code `PPD` and a server-managed
PPD username (including `@`). The initial requested account is provisioned in the
private allowlist, **disabled pending publication approval**. Its temporary
credential is stored privately as a salted PBKDF2-SHA256 verifier, 600,000
iterations. No password or verifier is included in this repository.

After approved activation, first login verifies the bootstrap credential, links
a dedicated native Supabase Auth identity, clears the verifier, and requires a
different password of at least 10 characters before monitoring can be accessed.
Subsequent requests verify native Auth, the current enabled PPD allowlist and a
separate revocable application capability. Capabilities expire after one hour;
logout and password changes revoke them. School Admin or Super Admin membership,
client flags and user-editable Auth metadata never grant PPD access.

## Scope and data

`/api/ppd` supports GET or the existing transport convention POST `action:load`
for a year. All other actions are denied. The school API still requires its own
school membership; the PPD identity does not gain it. Owner endpoints reject it.
The only credential-management action is changing the PPD account's own password.

The endpoint reads all registered schools in server-side pages of 100 and returns
only school identifiers, name, enabled status, active teacher count and aggregate
progress counts for four modules. It does not expose teacher names/ICs, individual
scores, evidence links, account records, raw documents, tokens or passwords. It
does not initialize or mutate school documents. Deleted schools are absent;
disabled schools remain visible and can be filtered separately.

The frontend has year, module, school-status, progress-state, keyword and sort
filters, four KPIs, stacked school/module charts and per-school module details.
The table paginates at 20 schools, the chart labels its first-10-school limit, and
all metrics use the same filtered records. Data refreshes every 60 seconds while
visible; failures are shown without substituting fake zeros for the KPIs. The
PPD portal does not instantiate the school offline engine or cache monitoring
responses in offline vaults; the existing service worker caches only shell/assets.

## Progress semantics

Percentages measure **form counts, not quality scores**. Expected module forms:
9 Kekuatan aspects, the existing 42 Pengurusan units, 10 Pencapaian items, and
three PdPc records (kendiri/pertama/kedua) per active teacher for the selected
year. AKP are excluded from PdPc. Without active teachers, PdPc percentage is
unknown (`—`), not 100%. Existing assessment/scoring calculations are unchanged.

The existing `scoreEntry` rule counts zero and explicit not-applicable values;
assignment-only module changes remain empty. Persisted PdPc drafts count as
started, as in the existing progress indicator. PdPc duplicates are resolved to
the latest teacher/year/stage record, obsolete v2 epochs are ignored, and legacy
school-level signature confirmation retains its existing verified meaning.
Submitted includes verified when calculating sent/completed counts. Returned
forms remain separately visible. Year-specific inactive rosters are respected.

## Validation

TypeScript, production build and every `scripts/test-*.mjs` check pass. New tests
exercise paginated reads, safe response projection, unknown/zero denominators,
zero/NA/default/assignment-only data, legacy confirmation, year/epoch/stage/roster
isolation, filters, bootstrap and native Auth linking, disabled/expired/forged
sessions, password change, logout, owner denial and write rejection. Existing
HTTP-handler tests verify reserved-code protection and denial of the PPD Auth
identity on all six school data/write routes. Browser review used fictional
schools; filters, detail dialog and previous-year results were checked. A 390px
iframe viewport has no page-wide horizontal overflow; tables scroll internally.

## Publication

The private `ppd-schema.sql` tables and disabled bootstrap account have been
provisioned; RLS is enabled and browser read/write grants are revoked. No school
document was changed. Production is still Edge function version 25 and the
previous Pages frontend; the PPD endpoint/UI are not deployed.

After approval:

1. Recheck main and production Edge source and reconcile later changes.
2. Verify RLS/grants on `s4_ppd_accounts` and `s4_ppd_sessions`. Do not reset or
   reprovision an existing linked account or include its verifier in source.
3. Deploy the updated backend with `ppd-api.ts`, `ppd-model.ts`, `ppd-types.ts`,
   updated `index.ts`, `deno.json` and all existing dependencies. Retain the
   function's own native Auth and application-session validation.
4. Enable only the approved PPD username in the private allowlist; publish this
   frontend through the normal Pages workflow.
5. Verify the common login page with access code PPD and the mandatory personal
   password gate. The officer enters their new personal password themselves.
   Verify monitoring and read-only denials without changing school data.

Rollback by disabling the approved PPD account and removing its application
sessions, then restoring the previous Edge source/frontend. Keep school data and
other roles unchanged. The private PPD tables can remain unused.

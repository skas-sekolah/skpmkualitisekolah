# Permanent school deletion (draft)

Super Admin has a separate red **Padam sekolah & semua data** action on each
registered school. **Nyahaktifkan** remains reversible and preserves data.
The delete dialog lists the scope, requires a checkbox and the exact phrase
`PADAM <current school code>`, and warns that deletion cannot be undone in the
application. Counts come from the displayed school revision; stale revisions
are rejected at deletion time. Opening or cancelling the dialog writes nothing.

Deletion removes the complete school document for every year: school metadata,
members, teachers/AKP, assessments, module values/verification, assignments,
settings, classes/subjects, school audit, invitations and application sessions.
Other schools, the Super Admin identity and shared Auth identities are preserved.
Google Drive originals, exported/downloaded files and encrypted offline vaults
on user devices cannot be remotely removed by this operation. Server-side school
access and sync stop immediately when the school document is deleted.

## Transaction and recovery

`owner-deletion-schema.sql` defines a service-role-only, SECURITY INVOKER RPC.
It verifies a live owner capability again inside the transaction, locks exactly
one school by immutable ID, checks its revision/confirmation, inserts a minimal
receipt/outbox and removes the school document atomically. The receipt contains
only operation ID, school ID/code, actor/time and pending Auth cleanup IDs, with
no school payload, scores, names or passwords. Receipt failure rolls back removal.
Operation IDs make network retries safe even if the code is later re-registered.

The Edge API deletes unshared native Supabase Auth accounts after the commit;
it checks both owner and other-school references first. Missing users are treated
as already cleaned. Failed cleanup is retained and shown as pending in owner
history, with a retry action restricted to the receipt's owner. Auth identifiers
are cleared from the receipt once handled. A native Auth/Storage error must not
be reported as completed cleanup. A minimal deletion history remains available
after the school has gone.

## Validation

- TypeScript, all `scripts/test-*.mjs` checks and production build pass.
- Owner tests deny ordinary Admin and invalid/temporary/expired owner sessions.
- Orchestration tests exercise confirmation, RPC failure, protected identities,
  partial cleanup, retries, missing Auth users and safe response fields.
- `node scripts/owner-deletion-sql-fixture.mjs` emits an isolated PostgreSQL test
  using **only pg_temp tables/functions**, followed by **ROLLBACK**. Executed
  successfully against Postgres; validates authorization, missing/stale revision,
  confirmation, removal of the whole multi-year document, other-school isolation,
  idempotency, code reuse, expiry, function grants and transaction rollback on
  receipt failure. It does not mutate production school tables.
- UI tested with fictional schools: wrong code stays disabled; matching phrase
  plus checkbox enables the button; Cancel closes it without server calls.

## Rollout (requires publication approval)

No production school has been deleted. The new schema/RPC and application code
are not deployed. After approval, apply `owner-deletion-schema.sql` in one
migration; inspect RLS/grants and advisors; deploy the updated backend with both
`owner-api.ts` and `owner-delete.ts` plus all existing dependencies; then publish
the frontend through Pages. Check listing/history and permission denials without
deleting any real school. Actual school removal is performed separately by the
Super Admin through the confirmation dialog.

Rollback the frontend and Edge source to disable future deletion. Leave pending
cleanup receipts intact; rolling back code does not restore deleted school data.

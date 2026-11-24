# Compact school history and login

Apply `sql/compact-audit-login.sql` before deploying the updated Edge API.

The migration copies every existing audit payload into the private
`s4_school_audit` table, then removes the embedded copy only after checking
payload equality and that every non-audit school field is unchanged. An atomic
trigger archives future audit entries from both school and owner writes.
School deletion cascades to its history. Public/anonymous/authenticated database
roles cannot read the archive or execute the login RPCs.

School login now loads only the school, one active member and that member's
linked teacher. Password verification still uses Supabase Auth. The session RPC
rechecks enabled school, active membership and verified Auth identity under a row
lock, appends the session atomically and increments the existing school revision.
All existing access revocation and optimistic concurrency checks remain in use.
Existing assessment workflows are never initialized/reset by login; initialization
is limited to schools without a configuration and without assessments.

This phase retains the session list and operational scores in the school document;
it does not migrate every assessment to a separate table. Sessions are appended
inside the database, without transferring all school scores to/from the Edge API.

Observed BBA8284 document size fell from approximately 12.8 MB to 0.50 MB; about
96% of the operational document was audit history. A representative login context
was 493 bytes. These are payload measurements, not a guarantee of login latency.

Validation: TypeScript, school registration/login recovery, simultaneous login
fixtures, owner access/deletion, read routing and grouped PGB attestation tests.
Run `sql/test-compact-audit-login.sql` for transactional database integration tests;
all test rows roll back. Five actual concurrent session RPCs on an isolated
synthetic school retained all five sessions and unchanged score data, then the
fixture was deleted. No real user's password was used for testing.

Compatibility: the migration is compatible with the previous Edge API, so the
previous function version remains a rollback option. Keep the audit archive and
trigger on rollback; do not delete history or restore an old school snapshot.

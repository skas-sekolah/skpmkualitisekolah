# Super Admin access

The existing login page accepts the reserved school code and username
`SUPERADMIN`. School Admin permissions remain school-scoped. A separate owner
portal lists registrations, supports code correction and reversible school
deactivation, and issues recovery codes for active school Admins. No school
deletion endpoint is provided. School calculations are unchanged.

## Authorization

- The Edge API verifies Supabase Auth with `getUser` and checks a private,
  server-managed owner allowlist on every owner request. User metadata and
  school membership never grant platform privileges.
- Each owner session also requires a random capability stored only as a hash
  server-side. It expires after one hour; logout and password changes revoke it.
- Bootstrap credentials are provisioned privately as a salted PBKDF2-SHA256
  verifier (600,000 iterations), never in source or the browser bundle. On first
  successful login the API creates a native Supabase Auth user, links the private
  allowlist, and clears the bootstrap verifier. Native Auth verifies subsequent
  passwords. Bootstrap is rate-limited and cannot be publicly registered.
- A temporary password must be replaced with a different password of at least
  10 characters before any cross-school read or mutation is allowed.
- Owner data has no offline cache. School listings expose selected metadata and
  Admin identifiers, never passwords, Auth IDs, sessions or assessment scores.
- Mutations require the current school code as confirmation and its current
  revision. A single CAS update writes the school state and audit together.
  Deactivation clears sessions and invitations; assessment data is preserved.
- New tables have RLS enabled and no browser grants. Only the server service
  role can access them; deny-all RLS without browser policies is intentional.

## Deployment status and sequence

Prepared on 2026-10-27. The private owner schema and bootstrap verifier have
been provisioned. No existing school document was changed. Production Edge
function `standard4-api` remains version 23; the new backend and frontend are
not live. Automatic approval review blocked the production replacement pending
explicit rollout approval. Do not merge or deploy this draft until approved.

After approval:

1. Confirm the current production source and main branch have not changed;
   reconcile any newer work before deployment.
2. Verify private table RLS/grants and that exactly the intended owner row is
   provisioned. Do not reset an existing owner or expose its verifier.
3. Deploy `migration/backend` including `owner-api.ts` and existing relative
   dependencies, with `index.ts`, `deno.json`, and existing `verify_jwt=false`
   (the function performs its own Auth and application-session checks).
4. Publish frontend sources through the normal main-branch Pages workflow.
5. Verify the unchanged login page, temporary owner login and mandatory password
   change gate. The owner enters their new personal password themselves.
6. Verify ordinary school Admin login and denied cross-school access. Use
   fixtures, not production school mutations, for destructive-path testing.

Rollback: restore the previous Edge function source and revert the frontend
commit. Private owner tables can remain unused. Do not drop school data or undo
legitimate user updates while rolling back.

## Validation

`npx tsc --noEmit`, every `scripts/test-*.mjs` test, and `npm run build` pass.
`test-owner-access.mjs` covers school Admin denial, identity/capability checks,
bootstrap verification, mandatory password change, session expiry/revocation,
safe response projection, stale revision/confirmation rejection, audited code
correction and status changes with preserved scores. The existing HTTP-handler
registration test also rejects public registration of the reserved owner code.
UI review uses fictional school data. Live owner login is pending deployment.

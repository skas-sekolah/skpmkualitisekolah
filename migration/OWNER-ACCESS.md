# Super Admin access

The existing login page accepts the reserved school code and username
`SUPERADMIN`. School Admin permissions remain school-scoped. A separate owner
portal lists registrations, supports code correction and reversible school
deactivation, and issues recovery codes for active school Admins. No school
deletion endpoint was included in the initial rollout. The draft permanent-deletion extension is documented in OWNER-DELETION.md. School calculations are unchanged.

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

Initial owner login and school management were approved and published through
PR #25, production Edge function version 24 and the Pages workflow. The new
permanent-deletion extension is a separate draft, not deployed; follow
OWNER-DELETION.md for its schema, authorization and rollout requirements.

For future owner deployments, confirm that main and live backend source have not
changed, preserve all existing dependencies, and retain server-side Auth and
application-session checks. The owner enters their personal password themselves.
Never put a bootstrap credential or verifier in source or reset an existing owner
without explicit authorization. Validate ordinary school Admin isolation using
fixtures rather than production school mutations.

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

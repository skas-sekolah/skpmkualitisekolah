# Muat Naik dan Muat Turun SK@S

Admin: sidebar → Pengurusan Admin → Muat Naik dan Muat Turun SK@S.
Super Admin: Pengurusan Admin → Muat Naik dan Muat Turun SK@S → pilih sekolah.

## Muat naik

Accepts SK@S CSV with school/teacher/year/stage metadata, 38-row three-column CSV (`sub_aspek,item,skor`), and recognized Standard 4 `.xlsx` / `.xlsm` workbooks with `MUKA DEPAN` and `STANDARD 4` sheets. Excel macros are never executed. Up to 50 assessments / 15 MB per batch; Excel files individually limited to 5 MB compressed / 30 MB declared expanded content, CSV limited to 2 MB text.

The preview matches stable teacher IDs or an unambiguous normalized name. Users confirm the selected teacher, year, session, scores and warnings. No server write occurs during file parsing or preview. Partial scores remain partial; zero is preserved. All-4 values trigger a warning.

Import is an atomic, online-only draft operation. Active roster, school, epoch, identities, existing write permissions and current revisions are revalidated on the server. Replacement needs an explicit per-record checkbox; submitted/verified records remain locked. Existing notes/evidence are retained. The authenticated actor is recorded in audit, including Super Admin. Observation imports obey existing officer assignments; Super Admin can import self-assessment drafts and export across selected schools.

## Muat turun

Exports saved scores for one teacher or all teachers in a selected year/session. SK@S CSV can be imported back. Excel item reports are for reference, not import. Blank CSV/Excel templates require selection of a teacher; no default scores are prefilled. Transfer CSV uses three columns and requires a single teacher with 38 complete scores plus review confirmation. Its compatibility with a live MOEIS extension is not yet validated.

## Deployment

Deploy `migration/backend/index.ts`, `owner-api.ts`, and new `transfer-api.ts` with all existing Edge Function dependencies before publishing the frontend. This uses the existing service-only `s4_read_school` RPC; no new schema or permission migration is needed. Keep the existing function's JWT gateway setting; authentication and role checks remain in the handler.

Validation: TypeScript, existing test suite, `scripts/test-transfer.mjs`, expanded Admin handler/owner route tests, and production build. Fixtures are fictional and local; no real school marks are changed by tests. Browser access to the local preview was unavailable, so the live Admin/Super Admin UI still needs a signed-in visual check.

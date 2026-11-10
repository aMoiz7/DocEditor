# Ajaia Docs — Submission

## Live product

**URL:** https://ajaia-docs-henna-two.vercel.app

**Deployment:** Vercel + Neon PostgreSQL  
**Status:** Production deployment is ready and publicly accessible.

## Reviewer access

Select a seeded user on the login screen. No password is required.

- **Alex Morgan** — owner account; create, edit, share, restore, and delete documents
- **Priya Shah** — shared-user account
- **Sam Rivera** — shared-user account

Suggested review flow:

1. Sign in as Alex Morgan.
2. Create a document and edit it with headings, bold, italic, underline, and lists.
3. Save, open **History**, and restore a previous version.
4. Import a `.txt` or `.md` file.
5. Export the document as Markdown.
6. Choose Priya or Sam and click **Share**.
7. Click **Switch user**, sign in as the shared user, and reopen the document.
8. Use the `•••` menu to copy the document link or delete an owned document.

## Included deliverables

- `src/` — Next.js frontend and PostgreSQL-backed API
- `database.sql` — PostgreSQL schema and seeded users
- `README.md` — local setup, deployment, scripts, and scope
- `ARCHITECTURE.md` — architecture and prioritization note
- `AI_WORKFLOW.md` — AI usage and verification note
- `package.json` / `package-lock.json` — dependencies and scripts
- `.env.example` — environment variable template
- `test/schema.test.mjs` — automated schema test
- `LIVE_URL.txt` — live deployment URL
- `VIDEO_URL.txt` — walkthrough video URL entry
- `WALKTHROUGH_SCRIPT.md` — ready-to-record 3–5 minute walkthrough script
- `SCREENSHOTS.md` — final screenshot/demo asset checklist
- `RUN.ps1` — Windows one-command local launcher

## Implemented functionality

- User selection with HTTP-only session cookie
- PostgreSQL persistence for users, documents, shares, attachments, and versions
- Create, rename, edit, save, reopen, and delete documents
- Rich text: bold, italic, underline, headings, bulleted lists, numbered lists
- `.txt` and `.md` multipart upload into the active document
- Markdown export download
- PDF export through the browser print dialog
- Owner-only document sharing
- Owned/shared document separation
- Logout and switch user
- Toast feedback for actions and errors
- Version history with owner restore
- Clear validation and access-denied responses

## Verification

The following checks passed:

- `npm test`
- `npm run lint`
- `npm run build`
- Neon-backed end-to-end flow:
  - login
  - create
  - edit/save
  - upload
  - version history
  - restore
  - share
  - logout
  - switch user
  - shared-document visibility
- Live Vercel auth endpoint returned seeded users successfully.

## Deliberate scope cuts

Not included:

- Full email/password or OAuth authentication
- Real-time multi-user editing
- Comments or suggestion mode
- Role-based permissions beyond owner/share access
- DOCX parsing

With another 2–4 hours, I would add full authentication, a structured editor, conflict resolution, and richer attachment management.

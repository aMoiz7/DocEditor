# Ajaia Docs

A focused collaborative document editor built with Next.js, TypeScript, and PostgreSQL. It demonstrates create, rename, rich-text edit, save/reopen, text/Markdown import, and seeded-user sharing.

## Run locally

```bash
npm install
copy .env.example .env.local
npm run dev
```

On Windows, run `.\RUN.ps1` for the same flow. It checks Node.js/npm, creates a missing `.env.local` from the template, installs dependencies when needed, and starts the development server.

Open http://localhost:3000. PostgreSQL is required; the app intentionally fails with a clear error if `DATABASE_URL` is missing. The first request creates the tables and seeds three review users automatically. You can also run `database.sql` manually. Set:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/ajaia_docs
DATABASE_SSL=false
```

Choose a seeded user on the login screen. The selected user is stored in an HTTP-only cookie and every document operation checks ownership or sharing access. Imports support `.txt` and `.md` only, are stored in the `attachments` table, and replace the active document body. Use the Share dropdown to grant access; shared documents are shown separately in the sidebar. Use **Export .md** to download Markdown or **Export PDF** to open the browser print dialog and choose “Save as PDF”. The `•••` menu copies a document link and lets owners delete documents.

## Scripts

- `npm run dev` — local development
- `npm run build` — production build/type check
- `npm run lint` — ESLint
- `npm test` — schema smoke test

## Deploy with Vercel + Neon

1. Create a Neon PostgreSQL database and copy its pooled `DATABASE_URL`.
2. Import this repository into Vercel.
3. In Vercel Project Settings → Environment Variables, add `DATABASE_URL` and set `DATABASE_SSL=true`.
4. Deploy. The first request runs the idempotent schema/seed initialization.
5. Test the login with Alex Morgan, create a document, import a `.txt` file, and share it with Priya Shah.

Do not commit `.env.local` or database credentials. Add the live URL to `SUBMISSION.md` after deployment.

## Scope and next steps

This submission uses seeded users instead of full authentication, HTML content instead of a document AST, and last-write-wins saves instead of real-time collaboration. Next steps would be authentication, a structured editor such as Tiptap, optimistic conflict handling/version history, and hosted Postgres migrations/seeding.

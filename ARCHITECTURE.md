# Architecture note

This is a small Next.js App Router application. The client editor calls `/api/documents` for listing/creating and `/api/documents/[id]` for reading, updating, and sharing. `src/lib/db.ts` uses parameterized PostgreSQL queries when `DATABASE_URL` is present and an isolated in-memory demo store otherwise, keeping the product reviewable before infrastructure setup.

The priority was a coherent end-to-end slice over breadth. Browser editing commands keep the rich-text surface small, while document HTML is persisted unchanged so lists and headings survive reopen. Sharing uses a join table and seeded accounts; the UI visibly separates owned and shared documents. Upload is limited to text and Markdown so it can be validated without a heavyweight parser. Every save snapshots the previous document into `document_versions`, giving owners a useful history panel and restore action.

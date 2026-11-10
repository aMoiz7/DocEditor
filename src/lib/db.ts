import { Pool } from "pg";
import { randomUUID } from "node:crypto";

export type User = { id: string; name: string; email: string };
export type DocumentRecord = { id: string; title: string; content: string; ownerId: string; ownerName: string; updatedAt: string; sharedWith: User[] };
export type DocumentVersion = { id: string; title: string; content: string; createdAt: string; createdBy: string };

const globalDb = globalThis as typeof globalThis & { ajaiaPool?: Pool; ajaiaDbReady?: Promise<void> };
const pool = globalDb.ajaiaPool ?? (globalDb.ajaiaPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
}));

function requireDatabase() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required. Configure PostgreSQL before starting the application.");
  return pool;
}

export async function initializeDatabase() {
  requireDatabase();
  globalDb.ajaiaDbReady ??= pool.query(`
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL);
    CREATE TABLE IF NOT EXISTS documents (id TEXT PRIMARY KEY, title TEXT NOT NULL, content TEXT NOT NULL DEFAULT '', owner_id TEXT NOT NULL REFERENCES users(id), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS document_shares (document_id TEXT REFERENCES documents(id) ON DELETE CASCADE, user_id TEXT REFERENCES users(id) ON DELETE CASCADE, PRIMARY KEY (document_id, user_id));
    CREATE TABLE IF NOT EXISTS attachments (id TEXT PRIMARY KEY, document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE, filename TEXT NOT NULL, mime_type TEXT NOT NULL, size_bytes INTEGER NOT NULL, content TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS document_versions (id TEXT PRIMARY KEY, document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE, title TEXT NOT NULL, content TEXT NOT NULL, created_by TEXT NOT NULL REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    INSERT INTO users (id, name, email) VALUES ('u1','Alex Morgan','alex@ajaia.test'), ('u2','Priya Shah','priya@ajaia.test'), ('u3','Sam Rivera','sam@ajaia.test') ON CONFLICT DO NOTHING;
  `).then(() => undefined);
  await globalDb.ajaiaDbReady;
}

export async function listUsers() {
  await initializeDatabase();
  return (await pool.query<User>("SELECT id, name, email FROM users ORDER BY name")).rows;
}

export async function getUser(id: string) {
  const users = await listUsers();
  return users.find((user) => user.id === id);
}

export async function listDocuments(userId: string): Promise<DocumentRecord[]> {
  await initializeDatabase();
  const result = await pool.query(`SELECT d.id, d.title, d.content, d.owner_id AS "ownerId", u.name AS "ownerName", d.updated_at AS "updatedAt"
    FROM documents d JOIN users u ON u.id = d.owner_id
    WHERE d.owner_id = $1 OR EXISTS (SELECT 1 FROM document_shares s WHERE s.document_id = d.id AND s.user_id = $1)
    ORDER BY d.updated_at DESC`, [userId]);
  return Promise.all(result.rows.map((doc) => addShares(doc)));
}

async function addShares(doc: Omit<DocumentRecord, "sharedWith">): Promise<DocumentRecord> {
  const shares = await pool.query<User>(`SELECT u.id, u.name, u.email FROM document_shares s JOIN users u ON u.id = s.user_id WHERE s.document_id = $1`, [doc.id]);
  return { ...doc, sharedWith: shares.rows };
}

export async function getDocument(id: string, userId: string) {
  await initializeDatabase();
  const result = await pool.query(`SELECT d.id, d.title, d.content, d.owner_id AS "ownerId", u.name AS "ownerName", d.updated_at AS "updatedAt"
    FROM documents d JOIN users u ON u.id = d.owner_id
    WHERE d.id = $1 AND (d.owner_id = $2 OR EXISTS (SELECT 1 FROM document_shares s WHERE s.document_id = d.id AND s.user_id = $2))`, [id, userId]);
  return result.rows[0] ? addShares(result.rows[0]) : undefined;
}

export async function createDocument(title: string, content: string, ownerId: string) {
  await initializeDatabase();
  const id = randomUUID();
  await pool.query("INSERT INTO documents (id, title, content, owner_id) VALUES ($1, $2, $3, $4)", [id, title, content, ownerId]);
  return getDocument(id, ownerId);
}

export async function updateDocument(id: string, userId: string, patch: { title?: string; content?: string }) {
  await initializeDatabase();
  const current = await getDocument(id, userId);
  if (!current) return undefined;
  await pool.query("INSERT INTO document_versions (id, document_id, title, content, created_by) VALUES ($1, $2, $3, $4, $5)", [randomUUID(), id, current.title, current.content, userId]);
  await pool.query(`UPDATE documents SET title = COALESCE($3, title), content = COALESCE($4, content), updated_at = NOW()
    WHERE id = $1 AND (owner_id = $2 OR EXISTS (SELECT 1 FROM document_shares s WHERE s.document_id = id AND s.user_id = $2))`, [id, userId, patch.title, patch.content]);
  return getDocument(id, userId);
}

export async function listVersions(id: string, userId: string): Promise<DocumentVersion[]> {
  const document = await getDocument(id, userId);
  if (!document) return [];
  const result = await pool.query<DocumentVersion>(`SELECT v.id, v.title, v.content, v.created_at AS "createdAt", u.name AS "createdBy"
    FROM document_versions v JOIN users u ON u.id = v.created_by
    WHERE v.document_id = $1 ORDER BY v.created_at DESC LIMIT 20`, [id]);
  return result.rows;
}

export async function restoreVersion(id: string, versionId: string, userId: string) {
  const document = await getDocument(id, userId);
  if (!document || document.ownerId !== userId) return undefined;
  const result = await pool.query<DocumentVersion>("SELECT id, title, content, created_at AS \"createdAt\", created_by AS \"createdBy\" FROM document_versions WHERE id = $1 AND document_id = $2", [versionId, id]);
  if (!result.rows[0]) return undefined;
  return updateDocument(id, userId, { title: result.rows[0].title, content: result.rows[0].content });
}

export async function shareDocument(id: string, ownerId: string, userId: string) {
  await initializeDatabase();
  const result = await pool.query("SELECT id FROM documents WHERE id = $1 AND owner_id = $2", [id, ownerId]);
  if (!result.rowCount) return undefined;
  await pool.query("INSERT INTO document_shares (document_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [id, userId]);
  return getDocument(id, ownerId);
}

export async function deleteDocument(id: string, ownerId: string) {
  await initializeDatabase();
  const result = await pool.query("DELETE FROM documents WHERE id = $1 AND owner_id = $2 RETURNING id", [id, ownerId]);
  return Boolean(result.rowCount);
}

export async function importAttachment(id: string, userId: string, file: { filename: string; mimeType: string; size: number; content: string }) {
  await initializeDatabase();
  const doc = await getDocument(id, userId);
  if (!doc) return undefined;
  await pool.query("INSERT INTO attachments (id, document_id, filename, mime_type, size_bytes, content) VALUES ($1, $2, $3, $4, $5, $6)", [randomUUID(), id, file.filename, file.mimeType, file.size, file.content]);
  const safe = file.content.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>");
  return updateDocument(id, userId, { content: `<h2>${file.filename.replace(/\.(txt|md)$/i, "")}</h2><p>${safe}</p>` });
}

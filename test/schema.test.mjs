import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

test("database schema supports documents, owners, sharing, and attachments", () => {
  const directory = path.dirname(fileURLToPath(import.meta.url));
  const schema = fs.readFileSync(path.join(directory, "..", "database.sql"), "utf8");
  assert.match(schema, /CREATE TABLE IF NOT EXISTS users/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS documents/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS document_shares/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS attachments/);
  assert.match(schema, /owner_id TEXT NOT NULL REFERENCES users/);
});

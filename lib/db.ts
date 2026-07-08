import { createClient } from '@libsql/client';

let db: ReturnType<typeof createClient> | null = null;

export function getDB() {
  if (!db) {
    // Use Turso cloud DB in production/when env vars are set,
    // fall back to local SQLite file for local dev without .env.local
    const url = process.env.TURSO_URL;
    const authToken = process.env.TURSO_TOKEN;

    if (url && authToken) {
      db = createClient({ url, authToken });
    } else {
      // Local development fallback
      db = createClient({ url: 'file:./quiz.db' });
    }
  }
  return db;
}

export async function initDB() {
  const client = getDB();

  await client.execute(`
    CREATE TABLE IF NOT EXISTS quizzes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      quiz_id TEXT NOT NULL,
      text TEXT NOT NULL,
      option_a TEXT NOT NULL,
      option_b TEXT NOT NULL,
      option_c TEXT NOT NULL,
      option_d TEXT NOT NULL,
      correct_answer TEXT NOT NULL DEFAULT 'A',
      position INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS quiz_attempts (
      id TEXT PRIMARY KEY,
      quiz_id TEXT NOT NULL,
      score INTEGER NOT NULL DEFAULT 0,
      total INTEGER NOT NULL DEFAULT 0,
      time_taken INTEGER NOT NULL DEFAULT 0,
      answers TEXT NOT NULL DEFAULT '{}',
      bookmarks TEXT NOT NULL DEFAULT '[]',
      completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
    )
  `);
}

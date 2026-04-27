import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const IS_VERCEL = !!process.env.VERCEL;
const DB_DIR = IS_VERCEL ? "/tmp/one-psv-data" : path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "one-psv.db");
const SEED_PATH = path.join(process.cwd(), "data", "seed.json");

let _db: Database.Database | null = null;

type SeedFolder = { id: string; name: string; created_at: number; image: string | null };
type SeedMemo = { id: string; folder_id: string | null; date: string; text: string; created_at: number; color: string | null; image: string | null; note: string | null };
type SeedData = { folders: SeedFolder[]; memos: SeedMemo[] };

function loadSeed(): SeedData | null {
  try {
    if (fs.existsSync(SEED_PATH)) {
      return JSON.parse(fs.readFileSync(SEED_PATH, "utf-8")) as SeedData;
    }
  } catch {}
  return null;
}

function seedIfEmpty(db: Database.Database) {
  const folderCount = (db.prepare("SELECT COUNT(*) as c FROM folders").get() as { c: number }).c;
  const memoCount = (db.prepare("SELECT COUNT(*) as c FROM memos").get() as { c: number }).c;
  if (folderCount > 0 || memoCount > 0) return;

  const seed = loadSeed();
  if (!seed) return;

  const insertFolder = db.prepare(
    "INSERT OR IGNORE INTO folders (id, name, created_at, image) VALUES (?, ?, ?, ?)"
  );
  const insertMemo = db.prepare(
    "INSERT OR IGNORE INTO memos (id, folder_id, date, text, created_at, color, image, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );

  const seedAll = db.transaction(() => {
    for (const f of seed.folders) insertFolder.run(f.id, f.name, f.created_at, f.image);
    for (const m of seed.memos) insertMemo.run(m.id, m.folder_id, m.date, m.text, m.created_at, m.color, m.image, m.note);
  });
  seedAll();
}

function ensureColumn(db: Database.Database, table: string, column: string, definition: string) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!columns.some((item) => item.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

export function getDb(): Database.Database {
  if (_db) return _db;
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");

  _db.exec(`
    CREATE TABLE IF NOT EXISTS folders (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
    );

    CREATE TABLE IF NOT EXISTS memos (
      id         TEXT PRIMARY KEY,
      folder_id  TEXT REFERENCES folders(id) ON DELETE SET NULL,
      date       TEXT NOT NULL,
      text       TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
    );

    CREATE TABLE IF NOT EXISTS app_meta (
      key   TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_memos_date      ON memos(date);
    CREATE INDEX IF NOT EXISTS idx_memos_folder_id ON memos(folder_id);
  `);

  ensureColumn(_db, "folders", "image", "TEXT");
  ensureColumn(_db, "memos", "color", "TEXT");
  ensureColumn(_db, "memos", "image", "TEXT");
  ensureColumn(_db, "memos", "note", "TEXT");

  seedIfEmpty(_db);

  return _db;
}

export type FolderRow = {
  id: string;
  name: string;
  created_at: number;
  memo_count: number;
  image: string | null;
};

export type MemoRow = {
  id: string;
  folder_id: string | null;
  date: string;
  text: string;
  created_at: number;
  color: string | null;
  image: string | null;
  note: string | null;
};

export function getAppTitle(): string {
  const row = getDb()
    .prepare(`SELECT value FROM app_meta WHERE key = 'app_title'`)
    .get() as { value: string | null } | undefined;
  return row?.value?.trim() || "One";
}

export function setAppTitle(value: string) {
  getDb()
    .prepare(`
      INSERT INTO app_meta (key, value)
      VALUES ('app_title', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `)
    .run(value.trim() || "One");
}

export function getAllFolders(): FolderRow[] {
  return getDb()
    .prepare(`
      SELECT f.id, f.name, f.created_at, f.image,
             COUNT(m.id) AS memo_count
        FROM folders f
        LEFT JOIN memos m ON m.folder_id = f.id
       GROUP BY f.id
       ORDER BY COALESCE(MAX(m.created_at), f.created_at) DESC
    `)
    .all() as FolderRow[];
}

export function createFolder(id: string, name: string, image: string | null = null) {
  getDb()
    .prepare(`
      INSERT INTO folders (id, name, image)
      VALUES (?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        image = COALESCE(excluded.image, folders.image)
    `)
    .run(id, name, image);
}

export function updateFolder(id: string, data: { name?: string; image?: string | null }) {
  const db = getDb();
  if (data.name !== undefined) {
    db.prepare(`UPDATE folders SET name = ? WHERE id = ?`).run(data.name, id);
  }
  if (data.image !== undefined) {
    db.prepare(`UPDATE folders SET image = ? WHERE id = ?`).run(data.image, id);
  }
}

export function deleteFolder(id: string) {
  getDb().prepare(`DELETE FROM folders WHERE id = ?`).run(id);
}

export function getMemos(folderId?: string): MemoRow[] {
  if (folderId) {
    return getDb()
      .prepare(`
        SELECT id, folder_id, date, text, created_at, color, image, note
        FROM memos
        WHERE folder_id = ?
        ORDER BY date DESC, created_at ASC
      `)
      .all(folderId) as MemoRow[];
  }
  return getDb()
    .prepare(`
      SELECT id, folder_id, date, text, created_at, color, image, note
      FROM memos
      ORDER BY date DESC, created_at ASC
    `)
    .all() as MemoRow[];
}

export function createMemo(data: {
  id: string;
  folderId: string | null;
  date: string;
  text: string;
  createdAt?: number;
  color?: string | null;
  image?: string | null;
  note?: string | null;
}) {
  getDb()
    .prepare(`
      INSERT INTO memos (id, folder_id, date, text, created_at, color, image, note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        folder_id = excluded.folder_id,
        date = excluded.date,
        text = excluded.text,
        created_at = excluded.created_at,
        color = COALESCE(excluded.color, memos.color),
        image = COALESCE(excluded.image, memos.image),
        note = COALESCE(excluded.note, memos.note)
    `)
    .run(
      data.id,
      data.folderId ?? null,
      data.date,
      data.text,
      data.createdAt ?? Date.now(),
      data.color ?? null,
      data.image ?? null,
      data.note ?? null
    );
}

export function updateMemo(id: string, data: {
  text?: string;
  folderId?: string | null;
  date?: string;
  color?: string | null;
  image?: string | null;
  note?: string | null;
}) {
  const db = getDb();
  if (data.text !== undefined) {
    db.prepare(`UPDATE memos SET text = ? WHERE id = ?`).run(data.text, id);
  }
  if (data.folderId !== undefined) {
    db.prepare(`UPDATE memos SET folder_id = ? WHERE id = ?`).run(data.folderId, id);
  }
  if (data.date !== undefined) {
    db.prepare(`UPDATE memos SET date = ? WHERE id = ?`).run(data.date, id);
  }
  if (data.color !== undefined) {
    db.prepare(`UPDATE memos SET color = ? WHERE id = ?`).run(data.color, id);
  }
  if (data.image !== undefined) {
    db.prepare(`UPDATE memos SET image = ? WHERE id = ?`).run(data.image, id);
  }
  if (data.note !== undefined) {
    db.prepare(`UPDATE memos SET note = ? WHERE id = ?`).run(data.note, id);
  }
}

export function deleteMemo(id: string) {
  getDb().prepare(`DELETE FROM memos WHERE id = ?`).run(id);
}

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "one-psv.db");

let _db: Database.Database | null = null;

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


function seedIfEmpty(db) {
  const row = db.prepare('SELECT COUNT(*) as count FROM memos').get();
  if (row.count > 0) return;

  const folderId = 'seed-folder-quotes';
  db.prepare('INSERT OR IGNORE INTO folders (id, name, created_at) VALUES (?, ?, ?)').run(folderId, 'Quotes', Date.now());

  const insertMemo = db.prepare('INSERT INTO memos (id, folder_id, date, text, color, created_at) VALUES (?, ?, ?, ?, ?, ?)');
  let ts = 1745280000000;
  const add = (date, text, color = null) => insertMemo.run('seed-' + (ts).toString(36), folderId, date, text, color, ts++);

  db.transaction(() => {
    add('2026-04-01', 'The only way to do great work is to love what you do. — Steve Jobs', '#FFFF00');
    add('2026-04-01', 'Stay hungry. Stay foolish. — Steve Jobs', null);
    add('2026-04-01', 'Design is not just what it looks like. Design is how it works. — Steve Jobs', '#FFFF00');
    add('2026-04-01', 'Your time is limited, don't waste it living someone else's life. — Steve Jobs', null);
    add('2026-04-01', 'Innovation distinguishes between a leader and a follower. — Steve Jobs', null);
    add('2026-04-02', 'In the middle of difficulty lies opportunity. — Albert Einstein', null);
    add('2026-04-03', 'Imagination is more important than knowledge. — Albert Einstein', '#90EE90');
    add('2026-04-03', 'Life is like riding a bicycle. To keep your balance, you must keep moving. — Einstein', null);
    add('2026-04-03', 'A person who never made a mistake never tried anything new. — Einstein', null);
    add('2026-04-04', 'Simplicity is the ultimate sophistication. — Leonardo da Vinci', null);
    add('2026-04-05', 'Art is never finished, only abandoned. — Leonardo da Vinci', '#FFB6C1');
    add('2026-04-05', 'The noblest pleasure is the joy of understanding. — Leonardo da Vinci', null);
    add('2026-04-05', 'Learning never exhausts the mind. — Leonardo da Vinci', '#90EE90');
    add('2026-04-05', 'Details make perfection, and perfection is not a detail. — Leonardo da Vinci', null);
    add('2026-04-05', 'He who is fixed to a star does not change his mind. — Leonardo da Vinci', null);
    add('2026-04-06', 'Two things are infinite: the universe and human stupidity. — Albert Einstein', null);
    add('2026-04-06', 'Logic will get you from A to Z; imagination will get you everywhere. — Einstein', '#87CEEB');
    add('2026-04-07', 'The people who are crazy enough to think they can change the world are the ones who do. — Steve Jobs', null);
    add('2026-04-07', 'Creativity is just connecting things. — Steve Jobs', '#FFFF00');
    add('2026-04-07', 'Real artists ship. — Steve Jobs', null);
    add('2026-04-08', 'The secret of getting ahead is getting started. — Mark Twain', null);
    add('2026-04-09', 'It does not matter how slowly you go as long as you do not stop. — Confucius', null);
    add('2026-04-09', 'Everything should be made as simple as possible, but not simpler. — Einstein', '#87CEEB');
    add('2026-04-09', 'The world is a book, and those who do not travel read only one page. — Augustine', null);
    add('2026-04-09', 'Be the change you wish to see in the world. — Gandhi', '#90EE90');
    add('2026-04-10', 'Everything is designed. Few things are designed well. — Brian Reed', null);
    add('2026-04-11', 'Whether you think you can or you think you can't, you're right. — Henry Ford', null);
    add('2026-04-11', 'The best time to plant a tree was 20 years ago. The second best time is now. — Chinese Proverb', '#FFFF00');
    add('2026-04-12', 'First, solve the problem. Then, write the code. — John Johnson', null);
    add('2026-04-12', 'Talk is cheap. Show me the code. — Linus Torvalds', null);
    add('2026-04-12', 'Any fool can write code that a computer can understand. Good programmers write code that humans can understand. — Martin Fowler', '#FFB6C1');
    add('2026-04-13', 'The measure of intelligence is the ability to change. — Albert Einstein', null);
  })();
}

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

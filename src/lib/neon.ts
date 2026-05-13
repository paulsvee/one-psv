import { neon } from "@neondatabase/serverless";
import fs from "fs";
import path from "path";

function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  return neon(url);
}

type SeedFolder = { id: string; name: string; created_at: number; image: string | null };
type SeedMemo = {
  id: string; folder_id: string | null; date: string; text: string;
  created_at: number; color: string | null; image: string | null; note: string | null;
};
type SeedData = { folders: SeedFolder[]; memos: SeedMemo[] };

function loadSeed(): SeedData | null {
  try {
    const p = path.join(process.cwd(), "data", "seed.json");
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf-8")) as SeedData;
  } catch {}
  return null;
}

export function getSeedData(): SeedData {
  return loadSeed() ?? { folders: [], memos: [] };
}

export async function initNeonTables() {
  const db = sql();
  await db`
    CREATE TABLE IF NOT EXISTS one_folders (
      id TEXT PRIMARY KEY,
      owner_email TEXT NOT NULL,
      name TEXT NOT NULL,
      image TEXT,
      created_at BIGINT NOT NULL
    )
  `;
  await db`
    CREATE INDEX IF NOT EXISTS idx_one_folders_owner ON one_folders(owner_email)
  `;
  await db`
    CREATE TABLE IF NOT EXISTS one_memos (
      id TEXT PRIMARY KEY,
      owner_email TEXT NOT NULL,
      folder_id TEXT,
      date TEXT NOT NULL,
      text TEXT NOT NULL,
      color TEXT,
      image TEXT,
      note TEXT,
      created_at BIGINT NOT NULL
    )
  `;
  await db`
    CREATE INDEX IF NOT EXISTS idx_one_memos_owner_date ON one_memos(owner_email, date DESC)
  `;
  await db`
    CREATE TABLE IF NOT EXISTS one_settings (
      owner_email TEXT PRIMARY KEY,
      app_title TEXT NOT NULL DEFAULT 'One'
    )
  `;
}

export async function getNeonFolders(ownerEmail: string) {
  await initNeonTables();
  const db = sql();
  const rows = await db`
    SELECT f.id, f.name, f.image, f.created_at,
           COUNT(m.id) AS memo_count
      FROM one_folders f
      LEFT JOIN one_memos m ON m.folder_id = f.id AND m.owner_email = f.owner_email
     WHERE f.owner_email = ${ownerEmail}
     GROUP BY f.id, f.name, f.image, f.created_at
     ORDER BY f.created_at DESC
  `;
  return rows;
}

export async function getNeonMemos(ownerEmail: string, folderId?: string | null) {
  await initNeonTables();
  const db = sql();
  if (folderId) {
    return await db`
      SELECT id, folder_id, date, text, created_at, color, image, note
        FROM one_memos
       WHERE owner_email = ${ownerEmail} AND folder_id = ${folderId}
       ORDER BY date DESC, created_at ASC
    `;
  }
  return await db`
    SELECT id, folder_id, date, text, created_at, color, image, note
      FROM one_memos
     WHERE owner_email = ${ownerEmail}
     ORDER BY date DESC, created_at ASC
  `;
}

export async function getNeonAppTitle(ownerEmail: string): Promise<string> {
  await initNeonTables();
  const db = sql();
  const rows = await db`
    SELECT app_title FROM one_settings WHERE owner_email = ${ownerEmail}
  `;
  return (rows[0]?.app_title as string | undefined) ?? "One";
}

export async function upsertNeonFolder(
  ownerEmail: string,
  id: string,
  name: string,
  image: string | null,
  createdAt: number
) {
  await initNeonTables();
  const db = sql();
  await db`
    INSERT INTO one_folders (id, owner_email, name, image, created_at)
    VALUES (${id}, ${ownerEmail}, ${name}, ${image}, ${createdAt})
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      image = COALESCE(EXCLUDED.image, one_folders.image)
  `;
}

export async function updateNeonFolder(
  ownerEmail: string,
  id: string,
  data: { name?: string; image?: string | null }
) {
  await initNeonTables();
  const db = sql();
  if (data.name !== undefined) {
    await db`UPDATE one_folders SET name = ${data.name} WHERE id = ${id} AND owner_email = ${ownerEmail}`;
  }
  if (data.image !== undefined) {
    await db`UPDATE one_folders SET image = ${data.image} WHERE id = ${id} AND owner_email = ${ownerEmail}`;
  }
}

export async function deleteNeonFolder(ownerEmail: string, id: string) {
  await initNeonTables();
  const db = sql();
  await db`DELETE FROM one_folders WHERE id = ${id} AND owner_email = ${ownerEmail}`;
}

export async function upsertNeonMemo(
  ownerEmail: string,
  data: {
    id: string; folderId: string | null; date: string; text: string;
    createdAt: number; color?: string | null; image?: string | null; note?: string | null;
  }
) {
  await initNeonTables();
  const db = sql();
  await db`
    INSERT INTO one_memos (id, owner_email, folder_id, date, text, created_at, color, image, note)
    VALUES (
      ${data.id}, ${ownerEmail}, ${data.folderId ?? null}, ${data.date}, ${data.text},
      ${data.createdAt}, ${data.color ?? null}, ${data.image ?? null}, ${data.note ?? null}
    )
    ON CONFLICT (id) DO UPDATE SET
      folder_id = EXCLUDED.folder_id,
      date = EXCLUDED.date,
      text = EXCLUDED.text,
      color = COALESCE(EXCLUDED.color, one_memos.color),
      image = COALESCE(EXCLUDED.image, one_memos.image),
      note = COALESCE(EXCLUDED.note, one_memos.note)
  `;
}

export async function updateNeonMemo(
  ownerEmail: string,
  id: string,
  data: {
    text?: string; folderId?: string | null; date?: string;
    color?: string | null; image?: string | null; note?: string | null;
  }
) {
  await initNeonTables();
  const db = sql();
  if (data.text !== undefined) {
    await db`UPDATE one_memos SET text = ${data.text} WHERE id = ${id} AND owner_email = ${ownerEmail}`;
  }
  if (data.folderId !== undefined) {
    await db`UPDATE one_memos SET folder_id = ${data.folderId} WHERE id = ${id} AND owner_email = ${ownerEmail}`;
  }
  if (data.date !== undefined) {
    await db`UPDATE one_memos SET date = ${data.date} WHERE id = ${id} AND owner_email = ${ownerEmail}`;
  }
  if (data.color !== undefined) {
    await db`UPDATE one_memos SET color = ${data.color} WHERE id = ${id} AND owner_email = ${ownerEmail}`;
  }
  if (data.image !== undefined) {
    await db`UPDATE one_memos SET image = ${data.image} WHERE id = ${id} AND owner_email = ${ownerEmail}`;
  }
  if (data.note !== undefined) {
    await db`UPDATE one_memos SET note = ${data.note} WHERE id = ${id} AND owner_email = ${ownerEmail}`;
  }
}

export async function deleteNeonMemo(ownerEmail: string, id: string) {
  await initNeonTables();
  const db = sql();
  await db`DELETE FROM one_memos WHERE id = ${id} AND owner_email = ${ownerEmail}`;
}

export async function setNeonAppTitle(ownerEmail: string, appTitle: string) {
  await initNeonTables();
  const db = sql();
  await db`
    INSERT INTO one_settings (owner_email, app_title)
    VALUES (${ownerEmail}, ${appTitle})
    ON CONFLICT (owner_email) DO UPDATE SET app_title = EXCLUDED.app_title
  `;
}

export async function seedPersonalData(ownerEmail: string) {
  const seed = loadSeed();
  if (!seed) return;
  const now = Date.now();
  for (const f of seed.folders) {
    await upsertNeonFolder(ownerEmail, f.id, f.name, f.image, f.created_at ?? now);
  }
  for (const m of seed.memos) {
    await upsertNeonMemo(ownerEmail, {
      id: m.id, folderId: m.folder_id, date: m.date, text: m.text,
      createdAt: m.created_at ?? now, color: m.color, image: m.image, note: m.note,
    });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getNeonFolders, upsertNeonFolder, seedPersonalData, getSeedData } from "@/lib/neon";
import { randomUUID } from "crypto";

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const email = token?.email as string | undefined;

    if (email) {
      let folders = await getNeonFolders(email);
      if (folders.length === 0) {
        await seedPersonalData(email);
        folders = await getNeonFolders(email);
      }
      return NextResponse.json({ folders });
    }

    // 비로그인: 공용 샘플
    const seed = getSeedData();
    const folders = seed.folders.map((f) => ({
      id: f.id,
      name: f.name,
      image: f.image,
      created_at: f.created_at,
      memo_count: seed.memos.filter((m) => m.folder_id === f.id).length,
    }));
    return NextResponse.json({ folders });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const email = token?.email as string | undefined;

    const body = await req.json();
    const { name, id: clientId, image = null } = body;
    if (!name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });
    const id = clientId ?? randomUUID();

    if (email) {
      await upsertNeonFolder(email, id, name.trim(), image, Date.now());
    }
    return NextResponse.json({ id, name: name.trim(), image });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

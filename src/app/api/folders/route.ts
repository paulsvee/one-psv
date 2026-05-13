import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getNeonFolders, upsertNeonFolder, seedPersonalData, getSeedData } from "@/lib/neon";
import { randomUUID } from "crypto";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
      const email = session.user.email;
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
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const { name, id: clientId, image = null } = body;
    if (!name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });
    const id = clientId ?? randomUUID();

    if (session?.user?.email) {
      await upsertNeonFolder(session.user.email, id, name.trim(), image, Date.now());
    }
    // 비로그인: 저장 안 하고 OK만 반환 (클라이언트 상태에만 존재)
    return NextResponse.json({ id, name: name.trim(), image });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getNeonMemos, upsertNeonMemo, getSeedData } from "@/lib/neon";
import { randomUUID } from "crypto";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const folderId = searchParams.get("folderId");

    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
      const memos = await getNeonMemos(
        session.user.email,
        folderId && folderId !== "all" ? folderId : null
      );
      return NextResponse.json({ memos });
    }

    // 비로그인: 공용 샘플
    const seed = getSeedData();
    const memos =
      folderId && folderId !== "all"
        ? seed.memos.filter((m) => m.folder_id === folderId)
        : seed.memos;
    return NextResponse.json({ memos });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const {
      folderId,
      date,
      text,
      id: clientId,
      createdAt,
      color = null,
      image = null,
      note = null,
    } = body;

    if (!date || !text?.trim()) {
      return NextResponse.json({ error: "date and text required" }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "invalid date format" }, { status: 400 });
    }

    const id = clientId ?? randomUUID();
    const now = typeof createdAt === "number" ? createdAt : Date.now();

    if (session?.user?.email) {
      await upsertNeonMemo(session.user.email, {
        id, folderId: folderId ?? null, date, text: text.trim(), createdAt: now,
        color, image, note,
      });
    }
    // 비로그인: 저장 안 하고 OK만 반환
    return NextResponse.json({
      id, folder_id: folderId ?? null, date, text: text.trim(),
      created_at: now, color, image, note,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

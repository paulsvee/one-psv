import { NextRequest, NextResponse } from "next/server";
import { getMemos, createMemo } from "@/lib/db";
import { randomUUID } from "crypto";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const folderId = searchParams.get("folderId");
    const memos = getMemos(folderId && folderId !== "all" ? folderId : undefined);
    return NextResponse.json({ memos });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
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
    createMemo({
      id,
      folderId: folderId ?? null,
      date,
      text: text.trim(),
      createdAt: typeof createdAt === "number" ? createdAt : undefined,
      color,
      image,
      note,
    });

    return NextResponse.json({
      id,
      folder_id: folderId ?? null,
      date,
      text: text.trim(),
      created_at: createdAt ?? Date.now(),
      color,
      image,
      note,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

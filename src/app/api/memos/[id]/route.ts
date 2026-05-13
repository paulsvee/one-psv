import { NextRequest, NextResponse } from "next/server";
import { getOwnerEmail } from "@/lib/getAuthToken";
import { updateNeonMemo, deleteNeonMemo } from "@/lib/neon";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const email = await getOwnerEmail(req);
    const body = await req.json();
    const next: { text?: string; folderId?: string | null; date?: string; color?: string | null; image?: string | null; note?: string | null } = {};
    if (body.text !== undefined) {
      if (!body.text?.trim()) return NextResponse.json({ error: "text required" }, { status: 400 });
      next.text = body.text.trim();
    }
    if ("folderId" in body) next.folderId = body.folderId ?? null;
    if (body.date !== undefined) next.date = body.date;
    if ("color" in body) next.color = body.color ?? null;
    if ("image" in body) next.image = body.image ?? null;
    if ("note" in body) next.note = body.note ?? null;
    if (email) await updateNeonMemo(email, params.id, next);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const email = await getOwnerEmail(req);
    if (email) await deleteNeonMemo(email, params.id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getOwnerEmail } from "@/lib/getAuthToken";
import { updateNeonFolder, deleteNeonFolder } from "@/lib/neon";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const email = await getOwnerEmail(req);
    const body = await req.json();
    const next: { name?: string; image?: string | null } = {};
    if (body.name !== undefined) {
      if (!body.name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });
      next.name = body.name.trim();
    }
    if ("image" in body) next.image = body.image ?? null;
    if (email) await updateNeonFolder(email, params.id, next);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const email = await getOwnerEmail(req);
    if (email) await deleteNeonFolder(email, params.id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

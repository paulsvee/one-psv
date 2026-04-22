import { NextRequest, NextResponse } from "next/server";
import { updateFolder, deleteFolder } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const next: { name?: string; image?: string | null } = {};

    if (body.name !== undefined) {
      if (!body.name?.trim()) {
        return NextResponse.json({ error: "name required" }, { status: 400 });
      }
      next.name = body.name.trim();
    }
    if ("image" in body) next.image = body.image ?? null;

    updateFolder(params.id, next);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    deleteFolder(params.id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

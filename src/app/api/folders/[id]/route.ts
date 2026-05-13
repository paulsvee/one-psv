import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { updateNeonFolder, deleteNeonFolder } from "@/lib/neon";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const email = token?.email as string | undefined;

    const body = await req.json();
    const next: { name?: string; image?: string | null } = {};
    if (body.name !== undefined) {
      if (!body.name?.trim()) {
        return NextResponse.json({ error: "name required" }, { status: 400 });
      }
      next.name = body.name.trim();
    }
    if ("image" in body) next.image = body.image ?? null;

    if (email) {
      await updateNeonFolder(email, params.id, next);
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const email = token?.email as string | undefined;

    if (email) {
      await deleteNeonFolder(email, params.id);
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

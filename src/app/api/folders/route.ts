import { NextRequest, NextResponse } from "next/server";
import { getAllFolders, createFolder } from "@/lib/db";
import { randomUUID } from "crypto";

export async function GET() {
  try {
    const folders = getAllFolders();
    return NextResponse.json({ folders });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, id: clientId, image = null } = body;
    if (!name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });
    const id = clientId ?? randomUUID();
    createFolder(id, name.trim(), image);
    return NextResponse.json({ id, name: name.trim(), image });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

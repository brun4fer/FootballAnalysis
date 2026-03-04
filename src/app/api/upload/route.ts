export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "Ficheiro em falta" }, { status: 400 });
    }

    const originalName = file.name || "upload";
    const extMatch = originalName.match(/\.[a-zA-Z0-9]+$/);
    const ext = extMatch?.[0] ?? "";
    const baseName = ext ? originalName.slice(0, -ext.length) : originalName;
    const base = baseName.replace(/[^a-zA-Z0-9-_]/g, "_") || "upload";
    const filename = `uploads/${Date.now()}-${base}${ext}`;

    const blob = await put(filename, file, {
      access: "public",
      addRandomSuffix: true,
      contentType: file.type || undefined
    });

    // Keep `path` for compatibility with existing frontend code.
    return NextResponse.json({ path: blob.url, url: blob.url, pathname: blob.pathname });
  } catch (error: any) {
    console.error("[upload]", error);
    return NextResponse.json({ error: "Falha no upload" }, { status: 500 });
  }
}

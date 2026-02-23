import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "Ficheiro em falta" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadsDir, { recursive: true });

    const originalName = file.name || "upload";
    const ext = path.extname(originalName);
    const base = path.basename(originalName, ext).replace(/[^a-zA-Z0-9-_]/g, "_");
    const filename = `${Date.now()}-${base}${ext || ""}`;

    const filePath = path.join(uploadsDir, filename);
    await fs.writeFile(filePath, buffer);

    const publicPath = `/uploads/${filename}`;
    return NextResponse.json({ path: publicPath });
  } catch (error: any) {
    console.error("[upload]", error);
    return NextResponse.json({ error: "Falha no upload" }, { status: 500 });
  }
}

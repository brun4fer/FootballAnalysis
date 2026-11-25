import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = (await req.json().catch(() => null)) as { filename?: unknown } | null;
    const originalName = typeof body?.filename === "string" ? body.filename : "upload";
    const extMatch = originalName.match(/\.[a-zA-Z0-9]+$/);
    const ext = extMatch?.[0] ?? "";
    const baseName = ext ? originalName.slice(0, -ext.length) : originalName;
    const base = baseName.replace(/[^a-zA-Z0-9-_]/g, "_") || "upload";

    return NextResponse.json({
      pathname: `workspaces/${user.workspaceId}/uploads/${Date.now()}-${base}${ext}`
    });
  } catch (error) {
    console.error("[upload-target]", error);
    return NextResponse.json({ error: "Could not prepare the upload." }, { status: 401 });
  }
}

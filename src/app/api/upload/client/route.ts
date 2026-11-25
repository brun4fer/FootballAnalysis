import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";

const ALLOWED_CONTENT_TYPES = ["image/*", "application/pdf", "video/*"];

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as HandleUploadBody;
    const response = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        const user = await requireUser();
        const workspacePrefix = `workspaces/${user.workspaceId}/uploads/`;

        if (!pathname.startsWith(workspacePrefix)) {
          throw new Error("Upload destination is not authorized.");
        }

        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          addRandomSuffix: false,
          tokenPayload: JSON.stringify({ workspaceId: user.workspaceId })
        };
      }
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("[client-upload]", error);
    return NextResponse.json(
      { error: "Could not prepare the direct upload." },
      { status: 503 }
    );
  }
}

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getLookups } from "@/server/lookups";

export async function GET() {
  const data = await getLookups();
  return NextResponse.json(data);
}


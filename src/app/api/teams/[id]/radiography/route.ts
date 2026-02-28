export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getRadiography, type RadiographyBpoCategory } from "@/server/radiography";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const teamId = Number(params.id);
  if (Number.isNaN(teamId)) return NextResponse.json({ error: "Invalid team id" }, { status: 400 });
  try {
    const url = new URL(_.url);
    const rawMomentId = url.searchParams.get("momentId");
    let momentId: number | undefined;
    if (rawMomentId !== null && rawMomentId.trim() !== "") {
      const parsedMomentId = Number(rawMomentId);
      if (Number.isNaN(parsedMomentId)) {
        return NextResponse.json({ error: "Invalid moment id" }, { status: 400 });
      }
      momentId = parsedMomentId;
    }
    const rawBpoCategory = url.searchParams.get("bpoCategory");
    const validBpoCategories: RadiographyBpoCategory[] = [
      "corners",
      "free_kicks",
      "direct_free_kicks",
      "throw_ins"
    ];
    let bpoCategory: RadiographyBpoCategory | undefined;
    if (rawBpoCategory !== null && rawBpoCategory.trim() !== "") {
      if (!validBpoCategories.includes(rawBpoCategory as RadiographyBpoCategory)) {
        return NextResponse.json({ error: "Invalid bpo category" }, { status: 400 });
      }
      bpoCategory = rawBpoCategory as RadiographyBpoCategory;
    }
    const data = await getRadiography(teamId, { momentId, bpoCategory });
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}


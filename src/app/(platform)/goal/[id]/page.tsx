import { notFound } from "next/navigation";
import { getGoalById } from "@/server/goals";
import GoalDetailContent from "./goal-detail-client";

export const dynamic = "force-dynamic";

export default async function GoalDetailPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (Number.isNaN(id)) return notFound();

  const goal = await getGoalById(id);
  if (!goal) return notFound();

  return <GoalDetailContent goal={goal} />;
}

import { redirect } from "next/navigation";

export default function HomePage() {
  // Statistics is the operational entry point for Goals Scored.
  redirect("/teams");
}

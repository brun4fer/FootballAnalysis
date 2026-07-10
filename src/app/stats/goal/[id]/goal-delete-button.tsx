"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function GoalDeleteButton({ goalId }: { goalId: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/goals/${goalId}`, { method: "DELETE" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Could not delete the goal.");
      router.push("/teams");
      router.refresh();
    } catch (error: any) {
      setMessage(error?.message ?? "Could not delete the goal.");
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-2">
      {message && <div className="text-sm text-rose-200">{message}</div>}
      <Button
        variant="ghost"
        className="border border-rose-400/40 text-rose-200 hover:bg-rose-500/15"
        onClick={() => {
          setMessage(null);
          setOpen(true);
        }}
      >
        <Trash2 className="mr-2 h-4 w-4" /> Delete Goal
      </Button>
      <ConfirmDialog
        open={open}
        title="Delete Goal"
        description="Are you sure you want to delete this goal?"
        cancelLabel="Cancel"
        confirmLabel="Confirm deletion"
        loading={isDeleting}
        onCancel={() => {
          if (isDeleting) return;
          setOpen(false);
        }}
        onConfirm={handleDelete}
      />
    </div>
  );
}


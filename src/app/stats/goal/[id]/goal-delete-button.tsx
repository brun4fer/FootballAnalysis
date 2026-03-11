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
      if (!res.ok) throw new Error(json?.error ?? "Erro ao eliminar o golo.");
      router.push("/teams");
      router.refresh();
    } catch (error: any) {
      setMessage(error?.message ?? "Erro ao eliminar o golo.");
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
        <Trash2 className="mr-2 h-4 w-4" /> Eliminar Golo
      </Button>
      <ConfirmDialog
        open={open}
        title="Eliminar Golo"
        description="Tem a certeza de que pretende eliminar este golo?"
        cancelLabel="Cancelar"
        confirmLabel="Confirmar eliminação"
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


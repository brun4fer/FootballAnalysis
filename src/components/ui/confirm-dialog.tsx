"use client";

import { Button } from "@/components/ui/button";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  cancelLabel?: string;
  confirmLabel?: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  cancelLabel = "Cancelar",
  confirmLabel = "Confirmar",
  loading = false,
  onCancel,
  onConfirm
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-[#0b1220] p-5 shadow-2xl">
        <div className="space-y-2">
          <h3 className="text-base font-semibold text-white">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant="ghost"
            className="border border-rose-400/50 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "A eliminar..." : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}


"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type RankingModalItem = {
  id: number | string;
  name: string;
  value: number;
};

type RankingModalProps = {
  open: boolean;
  title: string;
  items: RankingModalItem[];
  singularLabel: string;
  pluralLabel: string;
  onOpenChange: (open: boolean) => void;
};

const metricLabel = (value: number, singularLabel: string, pluralLabel: string) =>
  `${value} ${value === 1 ? singularLabel : pluralLabel}`;

export function RankingModal({
  open,
  title,
  items,
  singularLabel,
  pluralLabel,
  onOpenChange
}: RankingModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[91] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border/60 bg-[#0b1220] p-5 shadow-2xl">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <Dialog.Title className="text-base font-semibold text-white">{title}</Dialog.Title>
              <Dialog.Description className="text-sm text-muted-foreground">
                Ranking completo ordenado por desempenho.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>

          <div className="mt-4 max-h-[65vh] overflow-y-auto pr-1">
            {items.length === 0 ? (
              <div className="rounded-xl border border-border/60 bg-white/5 px-3 py-4 text-sm text-muted-foreground">
                Sem dados para este ranking.
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((entry, idx) => (
                  <div
                    key={`${entry.id}-${idx}`}
                    className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-white/5 px-3 py-2"
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <span className="w-8 shrink-0 text-center text-xs font-semibold text-cyan-200">#{idx + 1}</span>
                      <span className="line-clamp-2 min-w-0 text-sm font-medium leading-snug text-white break-words whitespace-normal">
                        {entry.name}
                      </span>
                    </div>
                    <span className="shrink-0 pl-2 text-sm font-semibold text-emerald-200">
                      {metricLabel(entry.value, singularLabel, pluralLabel)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

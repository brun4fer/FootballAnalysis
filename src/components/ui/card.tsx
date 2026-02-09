import { cn } from "@/lib/utils";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("rounded-xl border border-border bg-card shadow-sm", className)}>{children}</div>;
}

export function CardHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="border-b border-border px-4 py-3 flex flex-col gap-1">
      <div className="text-sm font-semibold">{title}</div>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}

export function CardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("p-4", className)}>{children}</div>;
}


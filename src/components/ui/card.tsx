import { cn } from "@/lib/utils";

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
};

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div className={cn("rounded-xl border border-border/60 bg-card/80 glass", className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/60 px-4 py-3">
      <div className="flex flex-col gap-1">
        <div className="text-sm font-semibold text-white">{title}</div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function CardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("p-4", className)}>{children}</div>;
}

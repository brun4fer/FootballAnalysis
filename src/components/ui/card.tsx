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

export function CardHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="border-b border-border/60 px-4 py-3 flex flex-col gap-1">
      <div className="text-sm font-semibold text-white">{title}</div>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}

export function CardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("p-4", className)}>{children}</div>;
}

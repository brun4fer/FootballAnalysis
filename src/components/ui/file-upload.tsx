"use client";

import { useRef, useState } from "react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  accept?: string;
  value?: string;
  onChange?: (path: string) => void;
  helperText?: string;
  className?: string;
};

export function FileUpload({ label, accept, value, onChange, helperText, className }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelect = () => inputRef.current?.click();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Falha no upload");
      }
      const data = (await res.json()) as { path: string };
      onChange?.(data.path);
    } catch (err: any) {
      setError(err?.message ?? "Falha no upload");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={handleSelect} disabled={uploading}>
          {uploading ? "A carregar..." : label}
        </Button>
        {value && (
          <span className="text-xs text-muted-foreground break-all">
            {value}
          </span>
        )}
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange?.("")} disabled={uploading}>
            Remover
          </Button>
        )}
      </div>
      {helperText && <p className="text-xs text-muted-foreground">{helperText}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleFile} />
    </div>
  );
}

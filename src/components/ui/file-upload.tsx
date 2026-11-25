"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { Button } from "./button";
import { cn } from "@/lib/utils";

const RETRYABLE_UPLOAD_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);
const UPLOAD_ATTEMPTS = 3;
const SERVER_UPLOAD_LIMIT_BYTES = 4 * 1024 * 1024;

class UploadError extends Error {
  constructor(message: string, readonly retryable: boolean) {
    super(message);
  }
}

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function createUploadPath(file: File) {
  const response = await fetch("/api/upload/target", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name }),
    cache: "no-store"
  });
  const body = (await response.json().catch(() => ({}))) as { pathname?: string; error?: string };
  if (!response.ok || !body.pathname) {
    throw new UploadError(body.error || "Could not prepare the upload.", false);
  }
  return body.pathname;
}

async function uploadFromBrowser(file: File) {
  const pathname = await createUploadPath(file);
  const blob = await upload(pathname, file, {
    access: "public",
    contentType: file.type || undefined,
    handleUploadUrl: "/api/upload/client",
    multipart: file.size > SERVER_UPLOAD_LIMIT_BYTES
  });
  return blob.url;
}

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
      let uploadPath: string | null = null;

      try {
        uploadPath = await uploadFromBrowser(file);
      } catch {
        // Smaller files can still use the existing server route when a legacy
        // Blob configuration does not yet have a client-upload token.
        if (file.size > SERVER_UPLOAD_LIMIT_BYTES) {
          throw new Error(
            "The direct upload could not start. Please try again or ask an administrator to check file storage."
          );
        }

        for (let attempt = 0; attempt < UPLOAD_ATTEMPTS; attempt += 1) {
          try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch("/api/upload", {
              method: "POST",
              body: formData,
              cache: "no-store"
            });

            if (!res.ok) {
              const body = await res.json().catch(() => ({}));
              throw new UploadError(
                body.error || "Upload failed",
                RETRYABLE_UPLOAD_STATUSES.has(res.status)
              );
            }

            const data = (await res.json()) as { path?: string };
            if (!data.path) throw new UploadError("The upload did not return a file URL.", true);
            uploadPath = data.path;
            break;
          } catch (attemptError) {
            const retryable = attemptError instanceof UploadError ? attemptError.retryable : true;
            if (!retryable || attempt === UPLOAD_ATTEMPTS - 1) throw attemptError;
            await wait(350 * (attempt + 1));
          }
        }
      }

      if (!uploadPath) throw new Error("Upload failed after several attempts.");
      onChange?.(uploadPath);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={handleSelect} disabled={uploading}>
          {uploading ? "Loading..." : label}
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

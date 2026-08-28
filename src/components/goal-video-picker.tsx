"use client";

import { useRef, useState } from "react";
import { Cloud, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type MediaAsset = {
  id: string;
  fileName: string;
  fileSize: string;
  durationSeconds: number;
  mimeType: string;
  uploadedAt: string | null;
};

type VideoSelection = {
  mediaAssetId: string | null;
  legacyPath: string;
};

type Props = {
  mediaAssetId?: string | null;
  legacyPath?: string;
  onChange: (selection: VideoSelection) => void;
};

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: init?.body ? { "Content-Type": "application/json", ...init.headers } : init?.headers
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Request failed.");
  return payload as T;
}

function videoDuration(file: File) {
  return new Promise<number>((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    const finish = (value: number) => {
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
      video.load();
      resolve(Number.isFinite(value) && value >= 0 ? value : 0);
    };
    video.preload = "metadata";
    video.onloadedmetadata = () => finish(video.duration);
    video.onerror = () => finish(0);
    video.src = url;
  });
}

function putFile(url: string, file: File, onProgress: (progress: number) => void, setRequest: (request: XMLHttpRequest | null) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    setRequest(xhr);
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    xhr.onload = () => {
      setRequest(null);
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Cloud upload failed (${xhr.status}).`));
    };
    xhr.onerror = () => {
      setRequest(null);
      reject(new Error("A network error interrupted the cloud upload."));
    };
    xhr.onabort = () => {
      setRequest(null);
      reject(new Error("Upload cancelled."));
    };
    xhr.send(file);
  });
}

function formatBytes(value: string) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatDuration(value: number) {
  const seconds = Math.max(0, Math.round(value));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

export function GoalVideoPicker({ mediaAssetId, legacyPath = "", onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [selectedName, setSelectedName] = useState<string | null>(null);

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    setProgress(0);
    try {
      if (!file.type.startsWith("video/")) throw new Error("Select a video file.");
      const durationSeconds = await videoDuration(file);
      const created = await requestJson<{ asset: MediaAsset; uploadUrl: string }>("/api/media/uploads", {
        method: "POST",
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          durationSeconds,
          mimeType: file.type,
          lastModified: file.lastModified
        })
      });
      await putFile(created.uploadUrl, file, setProgress, (request) => { xhrRef.current = request; });
      const completed = await requestJson<{ asset: MediaAsset }>(`/api/media/uploads/${encodeURIComponent(created.asset.id)}/complete`, { method: "POST" });
      setSelectedName(completed.asset.fileName);
      onChange({ mediaAssetId: completed.asset.id, legacyPath: "" });
      setProgress(1);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Could not upload the video.");
    } finally {
      setUploading(false);
      xhrRef.current = null;
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function openLibrary() {
    setLibraryOpen(true);
    setLibraryLoading(true);
    setError(null);
    try {
      const result = await requestJson<{ assets: MediaAsset[] }>("/api/media-library");
      setAssets(result.assets);
    } catch (libraryError) {
      setError(libraryError instanceof Error ? libraryError.message : "Could not load the cloud library.");
    } finally {
      setLibraryLoading(false);
    }
  }

  const attached = Boolean(mediaAssetId || legacyPath);
  const label = selectedName || (mediaAssetId ? "Private cloud video attached" : legacyPath ? legacyPath.split("/").pop() : "");

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
          {uploading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Upload className="mr-1 h-4 w-4" />}
          {uploading ? `Uploading ${Math.round(progress * 100)}%` : attached ? "Upload replacement" : "Upload new"}
        </Button>
        <Button type="button" variant="secondary" size="sm" disabled={uploading} onClick={() => void openLibrary()}>
          <Cloud className="mr-1 h-4 w-4" /> Cloud library
        </Button>
        {attached && <Button type="button" variant="ghost" size="sm" disabled={uploading} onClick={() => { setSelectedName(null); onChange({ mediaAssetId: null, legacyPath: "" }); }}><X className="mr-1 h-4 w-4" />Remove</Button>}
      </div>
      {label && <p className="break-all text-xs text-muted-foreground">{label}</p>}
      <p className="text-xs text-muted-foreground">Videos are stored privately in Cloudflare R2. Selecting a cloud video does not upload another copy.</p>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={handleFile} />

      {libraryOpen && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/80 p-4" onMouseDown={() => setLibraryOpen(false)}>
          <div className="max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-[#0b1220] shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border/60 p-5">
              <div><p className="text-xs uppercase tracking-[.2em] text-cyan-300">Shared cloud library</p><h3 className="mt-1 text-lg font-semibold">Choose an existing video</h3><p className="mt-1 text-xs text-muted-foreground">Only videos belonging to this linked workspace are shown.</p></div>
              <button type="button" className="rounded-lg p-2 text-muted-foreground hover:bg-white/5 hover:text-white" onClick={() => setLibraryOpen(false)} aria-label="Close"><X className="h-5 w-5" /></button>
            </div>
            <div className="max-h-[58vh] overflow-y-auto p-4">
              {libraryLoading ? <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Loading videos…</div> : assets.length === 0 ? <div className="py-16 text-center text-sm text-muted-foreground">No shared videos yet. Use Upload new to add the first one.</div> : <div className="space-y-2">{assets.map((asset) => <button type="button" key={asset.id} className="flex w-full items-center justify-between gap-4 rounded-xl border border-border/60 bg-white/[.03] p-4 text-left hover:border-cyan-300/40 hover:bg-cyan-300/[.06]" onClick={() => { setSelectedName(asset.fileName); onChange({ mediaAssetId: asset.id, legacyPath: "" }); setLibraryOpen(false); }}><span className="min-w-0"><span className="block truncate text-sm font-semibold">{asset.fileName}</span><span className="mt-1 block text-xs text-muted-foreground">{formatBytes(asset.fileSize)} · {formatDuration(asset.durationSeconds)}</span></span><Cloud className="h-4 w-4 shrink-0 text-cyan-300" /></button>)}</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

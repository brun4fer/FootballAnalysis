"use client";

import { useEffect, useState } from "react";
import { Check, Cloud, Copy, Link2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type LinkStatus = { linked: boolean; linkedApps: string[] };
type LinkToken = { token: string; expiresAt: string };

const appLabels: Record<string, string> = {
  "player-analysis": "Player Analysis",
  "team-analysis": "Team Analysis",
  "opponent-analysis": "Opponent Analysis",
  "goals-scored-analysis": "Goals Scored"
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

export function MediaLibraryLinkPanel() {
  const [status, setStatus] = useState<LinkStatus | null>(null);
  const [token, setToken] = useState("");
  const [generated, setGenerated] = useState<LinkToken | null>(null);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    requestJson<LinkStatus>("/api/media-library/link").then(setStatus).catch((error: Error) => setMessage(error.message));
  }, []);

  async function createCode() {
    setWorking(true);
    setMessage(null);
    try {
      setGenerated(await requestJson<LinkToken>("/api/media-library/link", { method: "POST", body: JSON.stringify({ action: "create" }) }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create a linking code.");
    } finally {
      setWorking(false);
    }
  }

  async function linkWorkspace() {
    if (!token.trim()) return;
    setWorking(true);
    setMessage(null);
    try {
      const next = await requestJson<LinkStatus>("/api/media-library/link", { method: "POST", body: JSON.stringify({ action: "claim", token }) });
      setStatus(next);
      setToken("");
      setGenerated(null);
      setMessage("The shared cloud library is now linked.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not link the cloud library.");
    } finally {
      setWorking(false);
    }
  }

  async function copyCode() {
    if (!generated) return;
    await navigator.clipboard.writeText(generated.token);
    setMessage("Linking code copied.");
  }

  return (
    <section className="glass overflow-hidden rounded-2xl border border-border/60">
      <div className="flex items-start justify-between gap-4 border-b border-border/60 p-5">
        <div>
          <div className="flex items-center gap-2 font-semibold"><Cloud className="h-4 w-4 text-cyan-300" />Shared cloud library</div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">Link this workspace to the same client in Player, Team and Opponent Analysis. The linking code, not the username, determines access.</p>
        </div>
        {status?.linked && <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-1 text-[10px] font-semibold text-emerald-200"><Check className="h-3 w-3" />Linked</span>}
      </div>
      <div className="space-y-4 p-5">
        {status?.linkedApps.length ? <p className="text-xs text-muted-foreground">Connected applications: <strong className="text-foreground">{status.linkedApps.map((app) => appLabels[app] || app).join(", ")}</strong></p> : null}
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-border/60 bg-background/40 p-4">
            <p className="text-sm font-semibold">Link this application</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Paste a code created in another application for this client. It expires after 30 minutes and can only be used once.</p>
            <div className="mt-3 flex gap-2"><input value={token} onChange={(event) => setToken(event.target.value)} placeholder="Paste linking code" autoComplete="off" className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-background/80 px-3 text-sm" /><Button type="button" disabled={working || !token.trim()} onClick={() => void linkWorkspace()}>{working ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Link2 className="mr-1 h-4 w-4" />}Link</Button></div>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/40 p-4">
            <p className="text-sm font-semibold">Connect another application</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Create a temporary code and paste it into the other application while signed in to the same client.</p>
            {generated ? <div className="mt-3 flex gap-2"><input readOnly value={generated.token} className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-background/80 px-3 font-mono text-xs" /><Button type="button" variant="secondary" onClick={() => void copyCode()}><Copy className="mr-1 h-4 w-4" />Copy</Button></div> : <Button type="button" variant="secondary" className="mt-3" disabled={working} onClick={() => void createCode()}>{working ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Link2 className="mr-1 h-4 w-4" />}Create linking code</Button>}
          </div>
        </div>
        {message && <p className="text-xs text-cyan-100">{message}</p>}
      </div>
    </section>
  );
}

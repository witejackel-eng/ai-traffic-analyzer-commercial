"use client";

import { useCallback, useRef, useState } from "react";
import { useNav } from "./nav-context";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { UploadCloud, FileVideo, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { config } from "@/lib/config";

interface UploadState {
  status: "idle" | "uploading" | "success" | "error";
  progress: number;
  filename?: string;
  error?: string;
  videoId?: string;
}

export function UploadDropzone({ projectId, onUploaded }: { projectId: string; onUploaded?: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [state, setState] = useState<UploadState>({ status: "idle", progress: 0 });
  const { openAnalysis } = useNav();

  const accept = ".mp4,.mov,.avi,.mkv,.webm,.m4v";
  const maxMb = config.maxUploadMb;

  const handleFile = useCallback(
    async (file: File) => {
      // client-side validation
      const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
      const allowed = accept.split(",");
      if (!allowed.includes(ext)) {
        setState({ status: "error", error: `Unsupported format. Allowed: ${allowed.join(", ")}` });
        toast.error(`Unsupported format: ${ext}`);
        return;
      }
      if (file.size > maxMb * 1024 * 1024) {
        setState({ status: "error", error: `File exceeds ${maxMb}MB limit` });
        toast.error(`File too large (max ${maxMb}MB)`);
        return;
      }
      if (file.size === 0) {
        setState({ status: "error", error: "File is empty" });
        toast.error("File is empty");
        return;
      }

      setState({ status: "uploading", progress: 0, filename: file.name });

      const formData = new FormData();
      formData.append("file", file);
      formData.append("projectId", projectId);

      try {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/upload");
        // Track whether onload has fired to prevent onprogress from
        // overwriting the "success" state (race condition fix).
        let onloadFired = false;

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            // Only update to "processing" if onload hasn't already set "success"
            if (pct >= 100 && !onloadFired) {
              // Keep showing "uploading" at 100% — the server response
              // (onload) will transition to "success" in <100ms.
              // No "processing" state — it can get stuck if the server crashes.
              setState((s) => ({ ...s, progress: 100 }));
            } else if (pct < 100) {
              setState((s) => ({ ...s, progress: pct }));
            }
          }
        };
        xhr.onload = () => {
          onloadFired = true;
          if (xhr.status === 201) {
            const data = JSON.parse(xhr.responseText);
            setState({ status: "success", progress: 100, filename: file.name, videoId: data.video.id });
            const sizeMb = data.uploadStats?.sizeMb;
            const sizeStr = sizeMb ? ` (${sizeMb}MB)` : "";
            toast.success(`Video saved${sizeStr} — ready to analyze!`);
            onUploaded?.();
            // Poll for metadata in the background
            if (data.uploadStats?.backgroundProbe && data.video?.id) {
              const pollCount = { n: 0 };
              const poll = async () => {
                if (pollCount.n++ > 15) return; // 15 attempts over 15s
                try {
                  const r = await fetch(`/api/videos?projectId=${projectId}`);
                  const vdata = await r.json();
                  const v = vdata.videos?.find((vv: { id: string }) => vv.id === data.video.id);
                  if (v && v.width > 0) {
                    toast.info(`Metadata ready: ${v.width}×${v.height}, ${v.duration?.toFixed(1)}s`);
                  } else {
                    setTimeout(poll, 1000);
                  }
                } catch { /* ignore */ }
              };
              setTimeout(poll, 1500);
            }
          } else {
            const err = JSON.parse(xhr.responseText || "{}");
            setState({ status: "error", error: err.error || `HTTP ${xhr.status}` });
            toast.error(err.error || `Upload failed (HTTP ${xhr.status})`);
          }
        };
        xhr.onerror = () => {
          onloadFired = true;
          setState({ status: "error", error: "Network error during upload" });
          toast.error("Network error during upload");
        };
        xhr.ontimeout = () => {
          onloadFired = true;
          setState({ status: "error", error: "Upload timed out (the file may be too large)" });
          toast.error("Upload timed out — try a smaller video");
        };
        xhr.timeout = 280_000;
        xhr.send(formData);
      } catch (e) {
        setState({ status: "error", error: (e as Error).message });
        toast.error((e as Error).message);
      }
    },
    [projectId, maxMb, onUploaded],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const reset = () => setState({ status: "idle", progress: 0 });

  return (
    <Card
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      className={cn(
        "border-2 border-dashed transition-all",
        dragOver ? "border-primary bg-primary/5 scale-[1.01]" : "border-border/60",
        state.status === "success" && "border-emerald-500/40",
        state.status === "error" && "border-destructive/40",
      )}
    >
      <CardContent className="p-6">
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />

        {state.status === "idle" && (
          <button
            onClick={() => inputRef.current?.click()}
            className="flex w-full flex-col items-center justify-center gap-3 py-6 text-center"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UploadCloud className="h-6 w-6" />
            </div>
            <div>
              <div className="text-sm font-semibold">Drop a traffic video here</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                or <span className="text-primary hover:underline">browse files</span> — MP4, MOV, AVI, MKV, WEBM (max {maxMb}MB)
              </div>
            </div>
          </button>
        )}

        {state.status === "uploading" && (
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{state.filename}</div>
                <div className="text-xs text-muted-foreground">Uploading… {state.progress}%</div>
              </div>
            </div>
            <Progress value={state.progress} className="h-1.5" />
          </div>
        )}

        {state.status === "success" && (
          <div className="flex items-center gap-3 py-2">
            <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-500" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{state.filename}</div>
              <div className="text-xs text-muted-foreground">Uploaded. Probed with FFmpeg — real metadata extracted.</div>
            </div>
            <Button
              size="sm"
              onClick={() => {
                // create an analysis + run real inference
                fetch("/api/analysis", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ projectId, videoId: state.videoId, provider: "real-vision", frameRate: 2, confidence: 0.4, maxFrames: 30 }),
                })
                  .then((r) => r.json())
                  .then((a) => {
                    toast.info("Running real AI inference…");
                    return fetch(`/api/analysis/${a.analysis.id}/analyze-real`, { method: "POST" });
                  })
                  .then((r) => {
                    if (r.ok) {
                      toast.success("Analysis complete — view the results!");
                      openAnalysis(state.videoId!, projectId);
                    } else {
                      toast.error("Analysis failed — check Settings → Provider");
                    }
                  });
              }}
              className="gap-1.5"
            >
              <FileVideo className="h-3.5 w-3.5" /> Analyze now
            </Button>
            <Button size="sm" variant="ghost" onClick={reset}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {state.status === "error" && (
          <div className="flex items-center gap-3 py-2">
            <AlertCircle className="h-6 w-6 shrink-0 text-destructive" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-destructive">Upload failed</div>
              <div className="text-xs text-muted-foreground">{state.error}</div>
            </div>
            <Button size="sm" variant="outline" onClick={reset}>
              Try again
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

void useRouter;

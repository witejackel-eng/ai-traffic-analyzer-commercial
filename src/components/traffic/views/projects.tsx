"use client";

import { useState } from "react";
import { useFetch, postJSON, delJSON } from "../use-fetch";
import { useNav } from "../nav-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, fmtDate, EmptyState } from "../shared";
import { UploadDropzone } from "../upload-dropzone";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { FolderKanban, Plus, MapPin, Video, BarChart3, Trash2, ArrowRight, Loader2, UploadCloud, Film } from "lucide-react";
import { toast } from "sonner";

interface ProjectList {
  projects: {
    id: string;
    name: string;
    description: string | null;
    location: string | null;
    createdAt: string;
    updatedAt: string;
    _count: { videos: number; analyses: number };
  }[];
}

export function ProjectsView() {
  const { data, loading, refresh } = useFetch<ProjectList>("/api/projects");
  const { openProject } = useNav();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", location: "" });
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!form.name.trim()) {
      toast.error("Project name is required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await postJSON<{ project: { id: string } }>("/api/projects", form);
      toast.success("Project created");
      setCreating(false);
      setForm({ name: "", description: "", location: "" });
      refresh();
      openProject(res.project.id, "workspace");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id: string, name: string) {
    if (!confirm(`Delete project "${name}"? This removes all its videos, analyses and events.`)) return;
    try {
      await delJSON(`/api/projects/${id}`);
      toast.success("Project deleted");
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  if (loading) return <SkeletonGrid />;

  const hasProjects = data && data.projects.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Analysis Projects</h2>
          <p className="text-sm text-muted-foreground">Organize traffic video analyses by location or study.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* PROMINENT Upload Video button — the primary action */}
          <UploadVideoDialog projects={data?.projects ?? []} onDone={refresh} />
          <Dialog open={creating} onOpenChange={setCreating}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Plus className="h-4 w-4" /> New Project
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Analysis Project</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">Project name</Label>
                <Input id="name" placeholder="e.g. Central Ave & 5th St Survey" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="location">Location</Label>
                <Input id="location" placeholder="e.g. Downtown, City" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="desc">Description</Label>
                <Textarea id="desc" placeholder="What is this study for?" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
              <Button onClick={submit} disabled={submitting} className="gap-2">
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Project
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {!data || data.projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Create your first analysis project to upload video and run traffic analysis."
          icon={<FolderKanban className="h-8 w-8" />}
          action={<Button className="gap-2" onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> Create Project</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.projects.map((p) => (
            <ProjectCard key={p.id} p={p} onRemove={remove} onUploaded={refresh} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectCard({ p, onRemove, onUploaded }: {
  p: { id: string; name: string; description: string | null; location: string | null; updatedAt: string; _count: { videos: number; analyses: number } };
  onRemove: (id: string, name: string) => void;
  onUploaded: () => void;
}) {
  const { openProject } = useNav();
  const [uploading, setUploading] = useState(false);
  return (
    <Card className="group relative overflow-hidden transition-all hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold">{p.name}</h3>
            {p.location && (
              <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" /> {p.location}
              </div>
            )}
          </div>
          <button
            onClick={() => onRemove(p.id, p.name)}
            className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
            title="Delete project"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
        {p.description && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{p.description}</p>}
        <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Video className="h-3.5 w-3.5" /> {p._count.videos} videos</span>
          <span className="flex items-center gap-1"><BarChart3 className="h-3.5 w-3.5" /> {p._count.analyses} analyses</span>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">Updated {fmtDate(p.updatedAt)}</span>
          <div className="flex gap-1.5">
            <Button size="sm" variant="ghost" className="gap-1.5 px-2" onClick={() => setUploading((u) => !u)} title="Upload video to this project">
              <UploadCloud className="h-3.5 w-3.5" /> Upload
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => openProject(p.id, "workspace")}>
              Open <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
        {uploading && (
          <div className="mt-4">
            <UploadDropzone projectId={p.id} onUploaded={() => { onUploaded(); setUploading(false); }} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-44 rounded-xl" />
      ))}
    </div>
  );
}

/**
 * Upload Video dialog — the primary "import a video" entry point.
 * Shows a project picker (or auto-creates one) + the drag-drop zone.
 */
function UploadVideoDialog({
  projects,
  onDone,
}: {
  projects: { id: string; name: string }[];
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [creatingNew, setCreatingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const { openProject } = useNav();

  const activeProjectId = creatingNew ? null : selectedProject || projects[0]?.id;

  async function createAndUpload() {
    if (!newName.trim()) {
      toast.error("Enter a project name first");
      return;
    }
    try {
      const res = await postJSON<{ project: { id: string } }>("/api/projects", { name: newName });
      setSelectedProject(res.project.id);
      setCreatingNew(false);
      toast.success("Project created — drop your video now");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setCreatingNew(false); setNewName(""); } }}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <UploadCloud className="h-4 w-4" /> Upload Video
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Film className="h-4 w-4 text-primary" /> Import a traffic video
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {projects.length === 0 && !creatingNew && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400">
              You need a project to upload into. <button onClick={() => setCreatingNew(true)} className="font-semibold underline">Create one now →</button>
            </div>
          )}

          {projects.length > 0 && !creatingNew && (
            <div className="space-y-1.5">
              <Label>Upload to project</Label>
              <select
                value={selectedProject || projects[0]?.id || ""}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:ring-1 focus-visible:ring-ring"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <button onClick={() => setCreatingNew(true)} className="text-xs text-primary hover:underline">
                + Create new project instead
              </button>
            </div>
          )}

          {creatingNew && (
            <div className="space-y-2">
              <Label htmlFor="newproj">New project name</Label>
              <div className="flex gap-2">
                <Input id="newproj" placeholder="e.g. Main Street Survey" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") createAndUpload(); }} />
                <Button size="sm" onClick={createAndUpload} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Create
                </Button>
              </div>
              {projects.length > 0 && (
                <button onClick={() => setCreatingNew(false)} className="text-xs text-muted-foreground hover:underline">
                  ← Use an existing project
                </button>
              )}
            </div>
          )}

          {activeProjectId && !creatingNew && (
            <UploadDropzone
              projectId={activeProjectId}
              onUploaded={() => {
                onDone();
                setTimeout(() => setOpen(false), 600);
              }}
            />
          )}

          <p className="text-[11px] text-muted-foreground">
            Accepted: MP4, MOV, AVI, MKV, WEBM (max 1024MB). The video is probed with FFmpeg to extract real metadata, then you can run real AI analysis.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

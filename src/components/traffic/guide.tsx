"use client";

import { useEffect, useState, useCallback } from "react";
import { useNav, type ViewId } from "./nav-context";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  HelpCircle,
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  RotateCcw,
  LayoutDashboard,
  FolderKanban,
  Play,
  Video,
  Spline,
  PenTool,
  BarChart3,
  AlertTriangle,
  FileText,
  Settings,
  Sparkles,
  MousePointerClick,
  ArrowRight,
} from "lucide-react";
import { brand } from "@/lib/brand";

const STORAGE_KEY = "ai-traffic-guide-dismissed-v1";

interface GuideStep {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  view?: ViewId;
  short: string;
  body: React.ReactNode;
}

const STEPS: GuideStep[] = [
  {
    id: "welcome",
    title: "Welcome",
    icon: Sparkles,
    short: "What this product is",
    body: (
      <div className="space-y-2">
        <p>
          <strong>{brand.name}</strong> turns traffic video into structured data: vehicle counts,
          classifications, directional flow, zone occupancy, line crossings, configurable events,
          and professional reports.
        </p>
        <p className="text-muted-foreground">
          This guide walks you through every function in &lt; 5 minutes. You can close it any time
          and reopen it from the <HelpCircle className="inline h-3 w-3" /> button in the top bar.
        </p>
      </div>
    ),
  },
  {
    id: "overview",
    title: "Overview dashboard",
    icon: LayoutDashboard,
    view: "overview",
    short: "Cross-project KPIs and charts",
    body: (
      <div className="space-y-2">
        <p>
          The <strong>Overview</strong> is your home base. It aggregates metrics across every
          project: total vehicles, tracks, events, analyses, and the active AI provider.
        </p>
        <ul className="ml-4 list-disc space-y-1 text-muted-foreground">
          <li><strong>KPI cards</strong> — at-a-glance totals.</li>
          <li><strong>Vehicle classification chart</strong> — cars / motorcycles / trucks / buses.</li>
          <li><strong>Directional flow chart</strong> — N/S/E/W + diagonals.</li>
          <li><strong>Recent analyses</strong> — click any to open its workspace.</li>
          <li><strong>Recent events</strong> — latest detections across projects.</li>
        </ul>
        <p className="flex items-center gap-1.5 text-primary">
          <MousePointerClick className="h-3.5 w-3.5" /> Clicking a recent analysis jumps straight to the workspace.
        </p>
      </div>
    ),
  },
  {
    id: "projects",
    title: "Projects",
    icon: FolderKanban,
    view: "projects",
    short: "Organize traffic studies",
    body: (
      <div className="space-y-2">
        <p>
          <strong>Projects</strong> group related videos, zones, rules, and analyses by location or
          study. Each project is fully isolated — data never leaks between projects.
        </p>
        <ul className="ml-4 list-disc space-y-1 text-muted-foreground">
          <li><strong>New Project</strong> — name, location, description.</li>
          <li>Each project shows video count + analysis count.</li>
          <li><strong>Open</strong> launches the Analysis Workspace.</li>
          <li><strong>Delete</strong> cascades (removes all child videos/analyses/events).</li>
        </ul>
      </div>
    ),
  },
  {
    id: "demo",
    title: "Demo Mode",
    icon: Play,
    view: "demo",
    short: "Explore without setup",
    body: (
      <div className="space-y-2">
        <p>
          <strong>Demo Mode</strong> opens a pre-loaded sample project ("Downtown Intersection
          Demo") with a completed analysis — no upload, no API key, no waiting.
        </p>
        <p className="text-muted-foreground">
          It uses the deterministic <strong>mock provider</strong>, so every demo run produces
          identical results. Perfect for evaluating the product before connecting a real AI.
        </p>
        <p className="flex items-center gap-1.5 text-primary">
          <MousePointerClick className="h-3.5 w-3.5" /> Use this to explore every feature below.
        </p>
      </div>
    ),
  },
  {
    id: "workspace",
    title: "Analysis Workspace",
    icon: Video,
    view: "workspace",
    short: "Video viewer with overlays",
    body: (
      <div className="space-y-2">
        <p>
          The <strong>Workspace</strong> is the analysis cockpit — a canvas-rendered video viewer
          with live overlays:
        </p>
        <ul className="ml-4 list-disc space-y-1 text-muted-foreground">
          <li><strong>Play / Pause</strong> + timeline scrubber.</li>
          <li><strong>Playback speed</strong> — 0.5x / 1x / 2x / 4x.</li>
          <li><strong>Overlay toggles</strong> — bounding boxes, trajectories, zones, count lines, labels.</li>
          <li><strong>Event timeline strip</strong> — dots mark every event; click to seek.</li>
          <li><strong>Event list</strong> — chronological, clickable to seek the video.</li>
          <li><strong>Prev / Next event</strong> buttons jump between events.</li>
        </ul>
        <p className="text-muted-foreground">
          The canvas draws a synthetic road scene + the real (or mock) tracked vehicles moving in
          real time. This is where you inspect what happened.
        </p>
      </div>
    ),
  },
  {
    id: "zones",
    title: "Zone Editor",
    icon: Spline,
    view: "zones",
    short: "Draw polygon zones",
    body: (
      <div className="space-y-2">
        <p>
          <strong>Zones</strong> are polygonal regions you draw over the scene. The engine tracks,
          per zone: entries, exits, current occupancy, max occupancy, average dwell time, and
          class breakdown.
        </p>
        <ul className="ml-4 list-disc space-y-1 text-muted-foreground">
          <li>Click on the scene to add polygon vertices (minimum 3 points).</li>
          <li>Name the zone, pick a type (lane / entrance / intersection / restricted / parking / loading), and a color.</li>
          <li><strong>Undo</strong> removes the last point; <strong>Clear</strong> starts over.</li>
          <li>Existing zones are listed on the right — hover to highlight, trash to delete.</li>
        </ul>
        <p className="text-muted-foreground">
          Zone types are labels — they don't change the math, but they organize reports.
        </p>
      </div>
    ),
  },
  {
    id: "lines",
    title: "Line Editor",
    icon: PenTool,
    view: "lines",
    short: "Draw counting lines",
    body: (
      <div className="space-y-2">
        <p>
          <strong>Counting lines</strong> are virtual tripwires. Each time a tracked vehicle
          crosses the line, a <code className="rounded bg-muted px-1">count_crossing</code> event
          is generated with an inbound/outbound label.
        </p>
        <ul className="ml-4 list-disc space-y-1 text-muted-foreground">
          <li>Click two points on the scene to define start + end.</li>
          <li>Configure inbound + outbound labels (e.g. "West→East" / "East→West").</li>
          <li>Jitter dedup: a single vehicle crossing the same line only counts once.</li>
          <li>Lines are stored as <code className="rounded bg-muted px-1">COUNT_CROSSING</code> rules.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "results",
    title: "Results & Analytics",
    icon: BarChart3,
    view: "results",
    short: "KPIs + charts + zone stats",
    body: (
      <div className="space-y-2">
        <p>
          <strong>Results</strong> is the analytics dashboard for a single analysis:
        </p>
        <ul className="ml-4 list-disc space-y-1 text-muted-foreground">
          <li><strong>KPI cards</strong> — total vehicles, peak volume, inbound/outbound, occupancy, congestion.</li>
          <li><strong>Traffic volume over time</strong> — area chart, 10s buckets.</li>
          <li><strong>Vehicle classification</strong> — pie chart.</li>
          <li><strong>Directional breakdown</strong> — horizontal bar chart.</li>
          <li><strong>Congestion over time</strong> — step area chart, 30s snapshots.</li>
          <li><strong>Zone statistics table</strong> — entered / exited / dwell / class breakdown per zone.</li>
          <li><strong>Recent tracks table</strong> — sample of tracked vehicles with speeds.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "events",
    title: "Events timeline",
    icon: AlertTriangle,
    view: "events",
    short: "Filter + inspect detections",
    body: (
      <div className="space-y-2">
        <p>
          <strong>Events</strong> lists every rule-triggered detection chronologically:
        </p>
        <ul className="ml-4 list-disc space-y-1 text-muted-foreground">
          <li>Filter by type (count_crossing, zone_entry, wrong_way, …) and severity (info → critical).</li>
          <li>Search by track ID or event type.</li>
          <li>Click any row to seek the workspace video to that moment.</li>
          <li>Events are persisted in the DB and exported to CSV/JSON/HTML.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "reports",
    title: "Reports & Exports",
    icon: FileText,
    view: "reports",
    short: "CSV / JSON / HTML report",
    body: (
      <div className="space-y-2">
        <p>
          <strong>Reports</strong> turns an analysis into shareable outputs:
        </p>
        <ul className="ml-4 list-disc space-y-1 text-muted-foreground">
          <li><strong>HTML report</strong> — 14-section professional report (cover, methodology, executive summary, charts, zone analysis, events, key findings, limitations, appendix). Print → Save as PDF.</li>
          <li><strong>CSV export</strong> — tracks + events + summary as a spreadsheet.</li>
          <li><strong>JSON export</strong> — full machine-readable result.</li>
          <li><strong>Branding</strong> — set report title, author, company name.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "settings",
    title: "Settings — AI Provider",
    icon: Settings,
    view: "settings",
    short: "Configure the vision engine",
    body: (
      <div className="space-y-2">
        <p>
          <strong>Settings</strong> configures the AI vision provider:
        </p>
        <ul className="ml-4 list-disc space-y-1 text-muted-foreground">
          <li><strong>Provider</strong> — mock (demo), generic-http (external API), or local-inference (Python worker).</li>
          <li><strong>API base URL + key + model</strong> — stored server-side, never sent to the browser.</li>
          <li><strong>Frame sampling rate</strong> — lower = cheaper, higher = denser.</li>
          <li><strong>Confidence threshold</strong> — detections below this are discarded.</li>
          <li><strong>Max frames per job</strong> — cost cap.</li>
          <li><strong>Health check</strong> — test the connection.</li>
        </ul>
        <p className="text-muted-foreground">
          API keys are masked as <code className="rounded bg-muted px-1">(set)</code> in every API
          response and never appear in client logs or exports.
        </p>
      </div>
    ),
  },
  {
    id: "done",
    title: "You're ready",
    icon: Check,
    short: "Where to go next",
    body: (
      <div className="space-y-2">
        <p>That's every function. You're ready to analyze real traffic.</p>
        <ul className="ml-4 list-disc space-y-1 text-muted-foreground">
          <li>Open <strong>Demo Mode</strong> to see a completed analysis end-to-end.</li>
          <li>Read the <strong>Documentation</strong> page for architecture, API reference, rules, and troubleshooting.</li>
          <li>Reopen this guide any time from the <HelpCircle className="inline h-3 w-3" /> button in the top bar.</li>
        </ul>
      </div>
    ),
  },
];

export function Guide() {
  const { navigate } = useNav();
  const [step, setStep] = useState(0);
  // Derive dismissed state from localStorage synchronously via a lazy
  // initializer (avoids setState-in-effect cascading-render rule). SSR-safe.
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return true; // never auto-open on SSR
    try {
      return !!localStorage.getItem(STORAGE_KEY);
    } catch {
      return true;
    }
  });
  const [open, setOpen] = useState(false);

  // Auto-open on first visit (unless dismissed before).
  useEffect(() => {
    if (dismissed) return;
    const t = setTimeout(() => setOpen(true), 600);
    return () => clearTimeout(t);
  }, [dismissed]);

  const goStep = useCallback(
    (i: number) => {
      const clamped = Math.max(0, Math.min(STEPS.length - 1, i));
      setStep(clamped);
      const s = STEPS[clamped];
      if (s.view) navigate(s.view);
    },
    [navigate],
  );

  const close = useCallback(() => setOpen(false), []);

  const dismissForever = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    setDismissed(true);
    setOpen(false);
  }, []);

  const reopen = useCallback(() => {
    setDismissed(false);
    setStep(0);
    setOpen(true);
  }, []);

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <>
      {/* Floating help button — always visible */}
      {!open && (
        <button
          onClick={() => (dismissed ? reopen() : setOpen(true))}
          className="fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:scale-105 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="Open interactive guide"
          title="Interactive guide"
        >
          <HelpCircle className="h-5 w-5" />
          {!dismissed && (
            <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
            </span>
          )}
        </button>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
          onEscapeKeyDown={close}
          // Hide the radix default close so we render our own prominent one.
          showClose={false}
        >
          {/* Header — single prominent close button top-right */}
          <SheetHeader className="relative border-b px-5 py-4">
            <SheetTitle className="flex items-center gap-2 pr-10 text-base">
              <HelpCircle className="h-4 w-4 text-primary" />
              Interactive Guide
            </SheetTitle>
            <SheetDescription className="text-xs">
              Step {step + 1} of {STEPS.length} — {current.short}
            </SheetDescription>
            {/* progress bar */}
            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
              />
            </div>
            {/* Single prominent close button — absolute top-right, solid + visible */}
            <button
              onClick={close}
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-all hover:scale-110 hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Close guide"
              title="Close guide (Esc)"
            >
              <X className="h-4 w-4" strokeWidth={3} />
            </button>
          </SheetHeader>

          {/* Step body */}
          <ScrollArea className="flex-1">
            <div className="space-y-4 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold leading-tight">{current.title}</h3>
                  {current.view && (
                    <button
                      onClick={() => navigate(current.view!)}
                      className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      Open this view <ArrowRight className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
              <div className="text-sm leading-relaxed text-muted-foreground">{current.body}</div>
            </div>
          </ScrollArea>

          {/* Step dots + nav */}
          <div className="border-t px-5 py-3">
            <div className="mb-3 flex flex-wrap gap-1.5">
              {STEPS.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => goStep(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === step ? "w-6 bg-primary" : i < step ? "w-1.5 bg-primary/60" : "w-1.5 bg-muted-foreground/30"
                  }`}
                  aria-label={`Go to step ${i + 1}: ${s.title}`}
                  title={`${i + 1}. ${s.title}`}
                />
              ))}
            </div>
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={dismissForever}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Don't show again
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goStep(step - 1)}
                  disabled={step === 0}
                  className="gap-1"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Back
                </Button>
                {isLast ? (
                  <Button size="sm" onClick={close} className="gap-1.5">
                    <Check className="h-3.5 w-3.5" /> Finish
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => goStep(step + 1)} className="gap-1.5">
                    Next <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
            {step > 0 && (
              <button
                onClick={() => goStep(0)}
                className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3 w-3" /> Restart guide
              </button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useNav } from "../nav-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Search,
  ExternalLink,
  Rocket,
  Layers,
  Cpu,
  PenTool,
  Spline,
  Video,
  BarChart3,
  AlertTriangle,
  FileText,
  Settings,
  Shield,
  Download,
  Lightbulb,
  Keyboard,
  HelpCircle,
  Terminal,
  Boxes,
  GitBranch,
  Gauge,
  ArrowRight,
  CheckCircle2,
  XCircle,
} from "lucide-react";

/* ----------------------------- doc sections ------------------------------ */
interface DocSection {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  keywords: string[];
  render: () => React.ReactNode;
}

const SECTIONS: DocSection[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: Rocket,
    keywords: ["install", "setup", "start", "run", "begin", "quickstart"],
    render: () => <GettingStarted />,
  },
  {
    id: "how-it-works",
    title: "How It Works",
    icon: Layers,
    keywords: ["pipeline", "architecture", "flow", "process", "overview"],
    render: () => <HowItWorks />,
  },
  {
    id: "features",
    title: "Feature Walkthrough",
    icon: Boxes,
    keywords: ["feature", "page", "view", "workspace", "zones", "lines", "results", "events", "reports"],
    render: () => <Features />,
  },
  {
    id: "rules",
    title: "Rules Reference",
    icon: AlertTriangle,
    keywords: ["rule", "count_crossing", "zone_entry", "zone_exit", "stopped", "wrong_way", "congestion", "dwell"],
    render: () => <RulesReference />,
  },
  {
    id: "providers",
    title: "AI Providers",
    icon: Cpu,
    keywords: ["provider", "mock", "generic-http", "local-inference", "model", "ssd", "mobilenet", "onnx"],
    render: () => <Providers />,
  },
  {
    id: "api",
    title: "API Reference",
    icon: Terminal,
    keywords: ["api", "endpoint", "route", "rest", "http", "request"],
    render: () => <ApiReference />,
  },
  {
    id: "data-model",
    title: "Data Model",
    icon: GitBranch,
    keywords: ["database", "schema", "prisma", "model", "table", "entity"],
    render: () => <DataModel />,
  },
  {
    id: "deployment",
    title: "Deployment",
    icon: Download,
    keywords: ["deploy", "docker", "production", "host", "server"],
    render: () => <Deployment />,
  },
  {
    id: "customization",
    title: "Customization",
    icon: Settings,
    keywords: ["brand", "customize", "white-label", "logo", "color", "rebrand"],
    render: () => <Customization />,
  },
  {
    id: "security",
    title: "Security & Privacy",
    icon: Shield,
    keywords: ["security", "privacy", "api key", "secret", "data", "gdpr"],
    render: () => <Security />,
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    icon: HelpCircle,
    keywords: ["troubleshoot", "error", "fix", "problem", "issue", "broken"],
    render: () => <Troubleshooting />,
  },
  {
    id: "shortcuts",
    title: "Keyboard Shortcuts",
    icon: Keyboard,
    keywords: ["keyboard", "shortcut", "hotkey", "accessibility"],
    render: () => <Shortcuts />,
  },
  {
    id: "faq",
    title: "FAQ",
    icon: Lightbulb,
    keywords: ["faq", "question", "help", "common"],
    render: () => <Faq />,
  },
  {
    id: "glossary",
    title: "Glossary",
    icon: BookOpen,
    keywords: ["glossary", "term", "definition", "concept", "vocabulary"],
    render: () => <Glossary />,
  },
];

const MARKDOWN_DOCS = [
  { icon: FileText, title: "Getting Started", file: "GETTING_STARTED", desc: "Install + run in minutes" },
  { icon: Layers, title: "Architecture", file: "ARCHITECTURE", desc: "Full architecture diagram + design" },
  { icon: Cpu, title: "AI Providers", file: "AI_PROVIDERS", desc: "VisionProvider interface + adapters" },
  { icon: Download, title: "Deployment", file: "DEPLOYMENT", desc: "Docker, native, env vars" },
  { icon: HelpCircle, title: "Troubleshooting", file: "TROUBLESHOOTING", desc: "Common issues + fixes" },
  { icon: Settings, title: "Customization", file: "CUSTOMIZATION", desc: "Branding + white-label" },
  { icon: Shield, title: "Licensing", file: "LICENSING", desc: "4 license tiers" },
  { icon: Shield, title: "Security", file: "SECURITY", desc: "Security checklist" },
  { icon: FileText, title: "Third-Party Licenses", file: "THIRD_PARTY_LICENSES", desc: "Dependency inventory" },
  { icon: Cpu, title: "Model License", file: "MODEL_LICENSE", desc: "SSD MobileNet v1 COCO (Apache-2.0)" },
];

export function DocsView() {
  const { navigate } = useNav();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string>("getting-started");

  const filtered = useMemo(() => {
    if (!query.trim()) return SECTIONS;
    const q = query.toLowerCase();
    return SECTIONS.filter((s) => s.keywords.some((k) => k.includes(q)) || s.title.toLowerCase().includes(q));
  }, [query]);

  const activeSection = SECTIONS.find((s) => s.id === active) ?? SECTIONS[0];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
      {/* Left nav */}
      <aside className="lg:sticky lg:top-0 lg:h-[calc(100vh-7rem)]">
        <div className="scroll-thin mb-3 max-h-12 lg:max-h-full lg:overflow-y-auto">
          <div className="relative mb-3">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search docs…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-8 pl-7 text-xs"
            />
          </div>
          <nav className="flex flex-row flex-wrap gap-1 lg:flex-col">
            {filtered.map((s) => {
              const Icon = s.icon;
              const isActive = active === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    setActive(s.id);
                    if (typeof document !== "undefined") {
                      document.getElementById(`doc-${s.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }
                  }}
                  className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors ${
                    isActive ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{s.title}</span>
                </button>
              );
            })}
            {filtered.length === 0 && <p className="px-2 py-1 text-xs text-muted-foreground">No matches</p>}
          </nav>
        </div>
      </aside>

      {/* Content */}
      <div className="scroll-thin max-w-3xl space-y-8">
        <div className="rounded-xl border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <BookOpen className="h-3.5 w-3.5" /> Documentation
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">How AI Traffic Analyzer works</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Everything you need to understand, configure, and customize the product — from your first
            upload to white-labeling for a client. New here? Start with{" "}
            <button onClick={() => setActive("getting-started")} className="text-primary hover:underline">
              Getting Started
            </button>
            .
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => navigate("demo")} className="gap-1.5">
              <Video className="h-3.5 w-3.5" /> Try Demo
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate("onboarding")} className="gap-1.5">
              <Rocket className="h-3.5 w-3.5" /> Onboarding Tour
            </Button>
            <Button size="sm" onClick={() => navigate("overview")} className="gap-1.5">
              Go to Dashboard <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {filtered.map((s) => (
          <section key={s.id} id={`doc-${s.id}`} className="scroll-mt-4">
            {s.render()}
          </section>
        ))}

        {/* Markdown docs reference */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" /> Markdown Documentation Files
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-xs text-muted-foreground">
              The full documentation also ships as Markdown files in the <code className="rounded bg-muted px-1 py-0.5">docs/</code> folder. Open any in a new tab:
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {MARKDOWN_DOCS.map((d) => {
                const Icon = d.icon;
                return (
                  <a
                    key={d.file}
                    href={`/docs/${d.file}.md`}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex flex-col gap-1.5 rounded-lg border bg-card p-3 transition-all hover:border-primary/40 hover:shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <Icon className="h-4 w-4 text-primary" />
                      <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                    <div className="text-xs font-semibold">{d.title}</div>
                    <div className="text-[11px] text-muted-foreground">{d.desc}</div>
                    <code className="text-[10px] text-muted-foreground">docs/{d.file}.md</code>
                  </a>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ====================== SECTION: Getting Started ====================== */
function GettingStarted() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2"><Rocket className="h-4 w-4 text-primary" /> Getting Started</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-muted-foreground">
          AI Traffic Analyzer is a self-hosted, source-code-first product. It runs entirely on your
          machine — no cloud account, no phone-home, no recurring fees. Here's the fastest path from
          clone to first analysis.
        </p>
        <Step n={1} title="Install dependencies">
          <CodeBlock>bun install</CodeBlock>
          <p className="mt-1 text-xs text-muted-foreground">Requires Node.js 20+ or Bun. Installs all JavaScript dependencies.</p>
        </Step>
        <Step n={2} title="Set up the database (zero-config SQLite)">
          <CodeBlock>bun run db:push  # create the schema
bun run db:seed  # load the demo project</CodeBlock>
          <p className="mt-1 text-xs text-muted-foreground">The database is a single file at <code className="rounded bg-muted px-1">db/custom.db</code>. No server to install.</p>
        </Step>
        <Step n={3} title="Start the app">
          <CodeBlock>bun run dev</CodeBlock>
          <p className="mt-1 text-xs text-muted-foreground">Open <code className="rounded bg-muted px-1">http://localhost:3000</code>. The mock provider runs without any API key — you can explore everything in Demo Mode.</p>
        </Step>
        <Step n={4} title="(Optional) Enable real AI inference">
          <p className="text-xs">To analyze real video with a real model:</p>
          <CodeBlock>cd mini-services/vision-worker
pip install -r requirements.txt   # cv2 + onnxruntime + fastapi
# The ONNX model ships at models/ssd_mobilenet_v1_coco.onnx</CodeBlock>
          <p className="mt-1 text-xs text-muted-foreground">
            Set <code className="rounded bg-muted px-1">PYTHON_BIN</code> in <code className="rounded bg-muted px-1">.env</code> to point at the Python with those packages, then use <strong>Run Real Analysis</strong> on any uploaded video.
          </p>
        </Step>
        <Step n={5} title="Upload + analyze">
          <p className="text-xs text-muted-foreground">
            Create a project → upload an MP4 → (optionally) draw zones + counting lines →{" "}
            <strong>Run Analysis</strong>. Results persist to the database and survive restarts.
          </p>
        </Step>
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-emerald-700 dark:text-emerald-400">
          <strong>Tip:</strong> Never used the product? Click <HelpCircle className="inline h-3 w-3" /> at the bottom-right to open the interactive guide — it walks you through every screen.
        </div>
      </CardContent>
    </Card>
  );
}

/* ====================== SECTION: How It Works ====================== */
function HowItWorks() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2"><Layers className="h-4 w-4 text-primary" /> How It Works</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-muted-foreground">
          The product is split into three layers: a Next.js web app, a REST API, and a pluggable
          AI vision layer. The application never calls a specific AI provider directly — it always
          goes through the <code className="rounded bg-muted px-1">VisionProvider</code> interface,
          so analysis can come from a mock simulator, an external API, or a local model.
        </p>
        <div className="overflow-x-auto rounded-lg border bg-slate-950 p-4">
          <pre className="text-[11px] leading-relaxed text-slate-200">{`REAL MP4  (upload or sample)
   │
   ▼
┌─────────────────────────────────────────────┐
│  Next.js API Route  (/api/analysis/[id])    │
│  • ffprobe → real duration/fps/dims         │
│  • frame sampling at configurable FPS       │
└─────────────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────────────┐
│  VisionProvider interface (pluggable)        │
│  ├─ mock            (deterministic demo)     │
│  ├─ generic-http    (external API)           │
│  └─ local-inference (Python worker + ONNX)   │
└─────────────────────────────────────────────┘
   │  detections: class + confidence + bbox
   ▼
┌─────────────────────────────────────────────┐
│  IoU Tracker  →  stable track IDs           │
│  Trajectory + direction calculation         │
└─────────────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────────────┐
│  Rule Engine (zones + lines + thresholds)   │
│  → count_crossing, zone_entry/exit,         │
│    stopped_vehicle, wrong_way, congestion,  │
│    dwell_time                               │
└─────────────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────────────┐
│  SQLite persistence                         │
│  Detection + Track + Event + Report rows    │
└─────────────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────────────┐
│  Dashboard + Charts + CSV/JSON/HTML report  │
└─────────────────────────────────────────────┘`}</pre>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Concept term="Deterministic mock" desc="The mock provider uses a seeded RNG so the same videoId always produces identical results — demos and tests are reproducible." />
          <Concept term="Real model" desc="The local-inference provider runs an ONNX SSD MobileNet v1 (Apache-2.0) via a Python subprocess — no GPU required." />
          <Concept term="Per-frame detection" desc="The model inspects sampled frames and returns bounding boxes for car / motorcycle / truck / bus / bicycle." />
          <Concept term="IoU tracking" desc="Detections across frames are linked into tracks by bounding-box overlap — each vehicle keeps a stable ID." />
        </div>
      </CardContent>
    </Card>
  );
}

/* ====================== SECTION: Features ====================== */
function Features() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2"><Boxes className="h-4 w-4 text-primary" /> Feature Walkthrough</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <FeatureRow icon={Video} name="Analysis Workspace" where="Sidebar → Analysis Workspace">
          A canvas-rendered video viewer with live overlays (bounding boxes, trajectories, zones,
          counting lines, labels). Play/pause, timeline scrubber, 0.5×–4× playback speed, prev/next
          event jumpers, and an event timeline strip with click-to-seek.
        </FeatureRow>
        <FeatureRow icon={Spline} name="Zone Editor" where="Sidebar → Zone Editor">
          Click to add polygon vertices over the scene. Each zone tracks entries, exits, current
          occupancy, max occupancy, average dwell time, and per-class breakdown. Min 3 points.
        </FeatureRow>
        <FeatureRow icon={PenTool} name="Line Editor" where="Sidebar → Line Editor">
          Draw a virtual counting line (2 points). Each tracked vehicle crossing it generates a
          <code className="rounded bg-muted px-1">count_crossing</code> event with inbound/outbound
          labels. Jitter dedup prevents double-counts.
        </FeatureRow>
        <FeatureRow icon={BarChart3} name="Results & Analytics" where="Sidebar → Results">
          KPI cards (total vehicles, peak volume, in/out bound, occupancy, congestion), a time-series
          area chart, classification pie, directional bar chart, congestion step-chart, zone stats
          table, and a tracks sample table.
        </FeatureRow>
        <FeatureRow icon={AlertTriangle} name="Events Timeline" where="Sidebar → Events">
          Chronological list of every rule-triggered event. Filter by type + severity, search by
          track ID. Click any row to seek the workspace video to that moment.
        </FeatureRow>
        <FeatureRow icon={FileText} name="Reports & Exports" where="Sidebar → Reports">
          Generate a 14-section professional HTML report (print → Save as PDF), CSV (tracks + events
          + summary), or full JSON. Brand it with a title, author, and company name.
        </FeatureRow>
        <FeatureRow icon={Settings} name="Provider Settings" where="Sidebar → Settings">
          Switch between mock / generic-http / local-inference. Configure API URL + key + model,
          frame sampling rate, confidence threshold, max frames, timeout, retries. API keys are
          masked in every response.
        </FeatureRow>
        <FeatureRow icon={Rocket} name="Onboarding" where="Sidebar → Onboarding">
          A 4-step first-run walkthrough: choose mode → sample project → draw a line → read results.
        </FeatureRow>
      </CardContent>
    </Card>
  );
}

/* ====================== SECTION: Rules Reference ====================== */
function RulesReference() {
  const rules = [
    { type: "COUNT_CROSSING", icon: PenTool, severity: "info", desc: "A tracked vehicle crosses a user-drawn counting line. Generates an event with the inbound/outbound label. One event per track per line (jitter dedup)." },
    { type: "ZONE_ENTRY", icon: Spline, severity: "info", desc: "A vehicle moves from outside a zone to inside. Captures zone, vehicle, and timestamp." },
    { type: "ZONE_EXIT", icon: Spline, severity: "info", desc: "A vehicle moves from inside a zone to outside. Includes the dwell duration (time inside)." },
    { type: "STOPPED_VEHICLE", icon: AlertTriangle, severity: "medium", desc: "A track's end-to-end movement is below ~5% of frame width AND presence ≥ 3 seconds. Tunable via the real-analysis-service threshold." },
    { type: "WRONG_WAY", icon: AlertTriangle, severity: "high", desc: "A vehicle moves opposite to the dominant flow direction (computed from all tracks). For example, southbound traffic when everyone else is northbound." },
    { type: "CONGESTION", icon: Gauge, severity: "high/critical", desc: "Occupancy exceeds a threshold. LOW (<25%), MODERATE (25–50%), HIGH (50–75%), SEVERE (>75%). Computed from active vehicles / 10." },
    { type: "DWELL_TIME", icon: Spline, severity: "low", desc: "A vehicle remains inside a zone longer than a configurable dwell threshold (default 3s in the real pipeline)." },
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-primary" /> Rules Reference</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="mb-3 text-muted-foreground">
          Every event in the system is produced by one of these rules. Each has a type, a severity,
          and a human-readable configuration. All rules are evaluated against <strong>real</strong>{" "}
          tracks and geometry — never against synthetic data on the production path.
        </p>
        {rules.map((r) => {
          const Icon = r.icon;
          return (
            <div key={r.type} className="rounded-lg border bg-card p-3">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-primary" />
                <code className="font-mono text-xs font-semibold">{r.type}</code>
                <Badge variant="outline" className="ml-auto text-[10px]">{r.severity}</Badge>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">{r.desc}</p>
            </div>
          );
        })}
        <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400">
          <strong>Note on severity:</strong> severities are <em>defaults</em>. A wrong-way vehicle on
          a one-way road is high; congestion that reaches SEVERE is critical. You can tune thresholds
          in <code className="rounded bg-muted px-1">src/lib/real-analysis-service.ts</code> and{" "}
          <code className="rounded bg-muted px-1">src/providers/mock/index.ts</code>.
        </div>
      </CardContent>
    </Card>
  );
}

/* ====================== SECTION: AI Providers ====================== */
function Providers() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2"><Cpu className="h-4 w-4 text-primary" /> AI Providers</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-muted-foreground">
          The product ships with three provider adapters, all implementing the{" "}
          <code className="rounded bg-muted px-1">VisionProvider</code> interface. Switch between
          them in <strong>Settings</strong> — no code changes required.
        </p>
        <Accordion type="single" collapsible defaultValue="mock">
          <AccordionItem value="mock">
            <AccordionTrigger className="text-xs"><span className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> mock (default, demo)</span></AccordionTrigger>
            <AccordionContent className="text-xs text-muted-foreground">
              <p>Deterministic simulator. No API key, no video file required. Generates realistic vehicles, tracks, directions, events from a seeded RNG. Powers Demo Mode. Used for tests and demos.</p>
              <p className="mt-1"><strong>License:</strong> N/A (synthetic).</p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="generic-http">
            <AccordionTrigger className="text-xs"><span className="flex items-center gap-2"><Cpu className="h-3.5 w-3.5" /> generic-http (external API)</span></AccordionTrigger>
            <AccordionContent className="text-xs text-muted-foreground">
              <p>Adapter for any external AI/vision API that accepts a frame and returns detection boxes. Configure base URL, API key, model. Retries on failure, clamps confidence, rejects malformed responses.</p>
              <p className="mt-1"><strong>Use when:</strong> you have a cloud vision API (Roboflow, custom endpoint, etc.).</p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="local-inference">
            <AccordionTrigger className="text-xs"><span className="flex items-center gap-2"><Cpu className="h-3.5 w-3.5 text-emerald-500" /> local-inference (Python worker)</span></AccordionTrigger>
            <AccordionContent className="text-xs text-muted-foreground">
              <p>Runs a real ONNX model via a Python subprocess (<code className="rounded bg-muted px-1">mini-services/vision-worker/infer.py</code>). No GPU required — runs on CPU with ONNX Runtime.</p>
              <p className="mt-1"><strong>Model:</strong> SSD MobileNet v1 trained on COCO.</p>
              <p className="mt-1"><strong>License:</strong> Apache-2.0 (commercially usable, no AGPL).</p>
              <p className="mt-1"><strong>Install:</strong> <code className="rounded bg-muted px-1">pip install -r mini-services/vision-worker/requirements.txt</code> + set <code className="rounded bg-muted px-1">PYTHON_BIN</code> in <code className="rounded bg-muted px-1">.env</code>.</p>
              <p className="mt-1">See <a href="/docs/MODEL_LICENSE.md" target="_blank" rel="noreferrer" className="text-primary hover:underline">docs/MODEL_LICENSE.md <ExternalLink className="inline h-3 w-3" /></a> for full license evidence.</p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="font-mono text-xs font-semibold">VisionProvider interface</div>
          <CodeBlock>{`interface VisionProvider {
  detectObjects(opts): Promise<Detection[]>;
  classifyObjects(detections): Promise<Detection[]>;
  analyzeFrame(frameIndex, opts): Promise<Detection[]>;
  processSequence(opts): Promise<{ detections, tracks }>;
  healthCheck(): Promise<ProviderHealth>;
}`}</CodeBlock>
          <p className="mt-1 text-xs text-muted-foreground">To add a new provider, implement this interface in <code className="rounded bg-muted px-1">src/providers/&lt;name&gt;/</code> and register it in <code className="rounded bg-muted px-1">src/providers/registry.ts</code>.</p>
        </div>
      </CardContent>
    </Card>
  );
}

/* ====================== SECTION: API Reference ====================== */
function ApiReference() {
  const routes = [
    { m: "GET", p: "/api", d: "Health check" },
    { m: "GET/POST", p: "/api/projects", d: "List / create projects" },
    { m: "GET/PATCH/DELETE", p: "/api/projects/[id]", d: "Read / update / delete a project" },
    { m: "GET/POST", p: "/api/projects/[id]/zones", d: "List / create zones" },
    { m: "GET/POST", p: "/api/projects/[id]/rules", d: "List / create rules" },
    { m: "PATCH/DELETE", p: "/api/zones/[id]", d: "Update / delete a zone" },
    { m: "PATCH/DELETE", p: "/api/rules/[id]", d: "Update / delete a rule" },
    { m: "GET/POST", p: "/api/analysis", d: "List / create analysis runs" },
    { m: "GET", p: "/api/analysis/[id]", d: "Analysis detail (tracks + events)" },
    { m: "POST", p: "/api/analysis/[id]/start", d: "Run mock analysis" },
    { m: "POST", p: "/api/analysis/[id]/analyze-real", d: "Run REAL model inference" },
    { m: "GET", p: "/api/analysis/[id]/result", d: "Full analysis result JSON" },
    { m: "GET", p: "/api/stats/overview", d: "Cross-project KPIs" },
    { m: "GET", p: "/api/provider/health", d: "Provider health check" },
    { m: "GET/PATCH", p: "/api/provider/config", d: "Read / update provider config" },
    { m: "GET", p: "/api/videos", d: "List videos" },
    { m: "POST", p: "/api/upload", d: "Upload MP4 (multipart)" },
    { m: "GET", p: "/api/exports/csv", d: "CSV export" },
    { m: "GET", p: "/api/exports/json", d: "JSON export" },
    { m: "GET", p: "/api/exports/report", d: "HTML report" },
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2"><Terminal className="h-4 w-4 text-primary" /> API Reference</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground">
          All routes are REST-style under <code className="rounded bg-muted px-1">/api</code>. They
          accept + return JSON (except <code className="rounded bg-muted px-1">/api/upload</code>{" "}
          which is multipart, and the export routes which return their respective formats).
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-3 font-medium">Method</th>
                <th className="py-2 pr-3 font-medium">Route</th>
                <th className="py-2 font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              {routes.map((r, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-1.5 pr-3"><code className="rounded bg-muted px-1.5 py-0.5 text-[10px]">{r.m}</code></td>
                  <td className="py-1.5 pr-3 font-mono text-[11px]">{r.p}</td>
                  <td className="py-1.5 text-muted-foreground">{r.d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          <strong>Example:</strong> create a project →
        </p>
        <CodeBlock>{`POST /api/projects
Content-Type: application/json

{ "name": "Central Ave Survey", "location": "Downtown" }

→ 201 Created
{ "project": { "id": "cmt...", "name": "...", ... } }`}</CodeBlock>
      </CardContent>
    </Card>
  );
}

/* ====================== SECTION: Data Model ====================== */
function DataModel() {
  const tables = [
    { name: "Project", fields: "id, name, description, location, createdAt, updatedAt", desc: "A traffic study. Has many videos, zones, rules, analyses, reports." },
    { name: "VideoAsset", fields: "id, projectId, filename, filePath, duration, width, height, fps, frameCount, status", desc: "An uploaded (or sample) video. Real metadata extracted via ffprobe." },
    { name: "AnalysisRun", fields: "id, projectId, videoId, provider, status, startedAt, completedAt, configurationJson", desc: "A single analysis pass over a video. Status: QUEUED → PROCESSING → COMPLETED/FAILED." },
    { name: "Detection", fields: "id, analysisId, objectId, objectType, confidence, frameIndex, timestamp, x, y, width, height", desc: "One detected object in one frame. Persisted for real analyses." },
    { name: "Track", fields: "id, analysisId, trackId, objectType, firstSeen, lastSeen, direction, estimatedSpeed", desc: "A vehicle tracked across multiple frames with a stable ID." },
    { name: "Zone", fields: "id, projectId, name, polygon (JSON), zoneType, color", desc: "A user-drawn polygonal region." },
    { name: "Rule", fields: "id, projectId, name, ruleType, parametersJson, enabled", desc: "A configured rule (COUNT_CROSSING, STOPPED_VEHICLE, etc.)." },
    { name: "Event", fields: "id, analysisId, ruleId, eventType, severity, timestamp, trackId, metadataJson", desc: "A rule-triggered event. Exported to CSV/JSON/HTML." },
    { name: "Report", fields: "id, projectId, analysisId, format, path, title, author, companyName", desc: "A generated report (HTML/CSV/JSON)." },
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2"><GitBranch className="h-4 w-4 text-primary" /> Data Model</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="text-muted-foreground">
          Schema is defined in <code className="rounded bg-muted px-1">prisma/schema.prisma</code>{" "}
          and stored in SQLite by default (a single file at <code className="rounded bg-muted px-1">db/custom.db</code>). PostgreSQL is supported via the <code className="rounded bg-muted px-1">DATABASE_URL</code> env var.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-3 font-medium">Table</th>
                <th className="py-2 pr-3 font-medium">Key fields</th>
                <th className="py-2 font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              {tables.map((t) => (
                <tr key={t.name} className="border-b last:border-0 align-top">
                  <td className="py-1.5 pr-3 font-mono font-semibold">{t.name}</td>
                  <td className="py-1.5 pr-3 font-mono text-[11px] text-muted-foreground">{t.fields}</td>
                  <td className="py-1.5 text-muted-foreground">{t.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Cascade behavior: deleting a project removes its videos, analyses, zones, rules, events, tracks, and reports. Deleting an analysis removes its tracks and events.
        </p>
      </CardContent>
    </Card>
  );
}

/* ====================== SECTION: Deployment ====================== */
function Deployment() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2"><Download className="h-4 w-4 text-primary" /> Deployment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <Accordion type="single" collapsible defaultValue="native">
          <AccordionItem value="native">
            <AccordionTrigger className="text-xs">Native (development / production)</AccordionTrigger>
            <AccordionContent className="text-xs text-muted-foreground">
              <CodeBlock>bun install
bun run db:push
bun run db:seed
bun run dev      # development, port 3000
bun run build   # production build
bun run start   # production server</CodeBlock>
              <p className="mt-1">For real AI inference: <code className="rounded bg-muted px-1">pip install -r mini-services/vision-worker/requirements.txt</code> + set <code className="rounded bg-muted px-1">PYTHON_BIN</code>.</p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="docker">
            <AccordionTrigger className="text-xs">Docker Compose</AccordionTrigger>
            <AccordionContent className="text-xs text-muted-foreground">
              <CodeBlock>docker compose up --build</CodeBlock>
              <p className="mt-1">Mounts persistent volumes for the database + uploaded videos + outputs. The Dockerfile is multi-stage. See <code className="rounded bg-muted px-1">docker-compose.yml</code> + <code className="rounded bg-muted px-1">Dockerfile</code>.</p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="env">
            <AccordionTrigger className="text-xs">Environment variables</AccordionTrigger>
            <AccordionContent className="text-xs text-muted-foreground">
              <div className="font-mono text-[11px] leading-relaxed">
                <div><span className="text-primary">AI_PROVIDER</span>=mock <span className="text-muted-foreground"># mock | generic-http | local-inference</span></div>
                <div><span className="text-primary">AI_API_BASE_URL</span>= <span className="text-muted-foreground"># for generic-http</span></div>
                <div><span className="text-primary">AI_API_KEY</span>= <span className="text-muted-foreground"># stored server-side only</span></div>
                <div><span className="text-primary">PYTHON_BIN</span>=python3 <span className="text-muted-foreground"># for real inference</span></div>
                <div><span className="text-primary">DATABASE_URL</span>=file:./db/custom.db</div>
                <div><span className="text-primary">VIDEO_STORAGE_PATH</span>=./storage/videos</div>
                <div><span className="text-primary">MAX_UPLOAD_MB</span>=1024</div>
                <div><span className="text-primary">DEFAULT_FRAME_RATE</span>=2</div>
              </div>
              <p className="mt-1">Full list in <code className="rounded bg-muted px-1">.env.example</code>.</p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}

/* ====================== SECTION: Customization ====================== */
function Customization() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2"><Settings className="h-4 w-4 text-primary" /> Customization (white-label)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="text-muted-foreground">Agencies can rebrand the entire product from a single file — no need to hunt through components.</p>
        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="font-mono text-xs font-semibold">src/lib/brand.ts</div>
          <CodeBlock>{`export const brand = {
  name: "AI Traffic Analyzer",
  shortName: "Traffic AI",
  tagline: "Self-hosted AI traffic intelligence",
  logo: "/brand/logo.svg",
  primaryColor: "#0f766e",
  supportEmail: "support@example.com",
  reportFooter: "Generated by …",
  showPoweredBy: false,
};`}</CodeBlock>
        </div>
        <ul className="ml-4 list-disc space-y-1 text-xs text-muted-foreground">
          <li><strong>Logo / favicon</strong> → <code className="rounded bg-muted px-1">public/brand/</code></li>
          <li><strong>Colors / theme</strong> → <code className="rounded bg-muted px-1">src/app/globals.css</code> (CSS variables)</li>
          <li><strong>Default rules / zones</strong> → <code className="rounded bg-muted px-1">prisma/seed.ts</code></li>
          <li><strong>Navigation labels</strong> → <code className="rounded bg-muted px-1">src/components/traffic/app-shell.tsx</code> (<code>NAV_GROUPS</code>)</li>
          <li><strong>Feature flags</strong> → <code className="rounded bg-muted px-1">src/lib/feature-flags.ts</code></li>
          <li><strong>Report template</strong> → <code className="rounded bg-muted px-1">src/lib/report-generator.ts</code></li>
        </ul>
      </CardContent>
    </Card>
  );
}

/* ====================== SECTION: Security ====================== */
function Security() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> Security & Privacy</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <ul className="space-y-1.5 text-xs">
          <SecurityItem ok>API keys stored server-side, never sent to the browser (masked as <code className="rounded bg-muted px-1">(set)</code> in every response)</SecurityItem>
          <SecurityItem ok>Upload route sanitizes filenames (basename extraction + <code className="rounded bg-muted px-1">..</code> collapse) — path-traversal safe</SecurityItem>
          <SecurityItem ok>Upload validates extension (never trusts browser MIME type)</SecurityItem>
          <SecurityItem ok>Upload enforces size limit (<code className="rounded bg-muted px-1">MAX_UPLOAD_MB</code>)</SecurityItem>
          <SecurityItem ok>DELETE routes return 404 (not stack traces) for nonexistent IDs</SecurityItem>
          <SecurityItem ok>Prisma parameterizes all queries — no SQL injection surface</SecurityItem>
          <SecurityItem ok>No FFmpeg shell strings — args passed as an array</SecurityItem>
          <SecurityItem ok>No facial recognition, no biometric ID, no person re-identification (by design)</SecurityItem>
          <SecurityItem ok>Videos stay on your machine — external AI APIs are opt-in only</SecurityItem>
        </ul>
        <p className="mt-2 text-xs text-muted-foreground">
          Full checklist in <a href="/docs/SECURITY.md" target="_blank" rel="noreferrer" className="text-primary hover:underline">docs/SECURITY.md <ExternalLink className="inline h-3 w-3" /></a>.
        </p>
      </CardContent>
    </Card>
  );
}

/* ====================== SECTION: Troubleshooting ====================== */
function Troubleshooting() {
  const issues = [
    { q: "The page is blank / nothing loads", a: "Check the dev server is running (bun run dev) on port 3000. Open the browser console — most issues show a clear error. The mock provider needs no API key." },
    { q: "Upload fails with 415 Unsupported Media Type", a: "The file extension isn't allowed. Accepted: .mp4, .mov, .avi, .mkv, .webm, .m4v. Convert to H.264 MP4 with: ffmpeg -i input.avi -c:v libx264 output.mp4" },
    { q: "Upload fails with 413 Payload Too Large", a: "The file exceeds MAX_UPLOAD_MB (default 1024). Increase it in .env or split the video." },
    { q: "Real analysis fails with 'python3: No module named cv2'", a: "The PYTHON_BIN env var points at a Python without the vision packages. Run: pip install -r mini-services/vision-worker/requirements.txt (use the same Python that PYTHON_BIN points to)." },
    { q: "Real analysis fails with 'Vision worker error: ... not found'", a: "The ONNX model file is missing. It ships at mini-services/vision-worker/models/ssd_mobilenet_v1_coco.onnx — re-download from the ONNX Model Zoo (see docs/MODEL_LICENSE.md)." },
    { q: "0 detections on a real video", a: "The SSD MobileNet v1 model struggles with aerial angles, very distant vehicles, and heavy occlusion. Lower the confidence threshold in Settings (e.g. 0.3) or swap to a heavier model via the VisionProvider interface." },
    { q: "Provider health shows Offline", a: "For generic-http: verify AI_API_BASE_URL + AI_API_KEY are set and the endpoint is reachable. For local-inference: the Python worker isn't running (it's a subprocess — start it via a real analysis run)." },
    { q: "Database is locked (SQLite)", a: "Another process holds the DB. Stop duplicate dev servers. SQLite supports one writer; for multi-process deployments, switch to PostgreSQL via DATABASE_URL." },
    { q: "Hydration mismatch in console", a: "Already fixed — the theme toggle renders both icons and toggles via CSS. If you see it, clear your browser cache and hard-reload." },
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2"><HelpCircle className="h-4 w-4 text-primary" /> Troubleshooting</CardTitle>
      </CardHeader>
      <CardContent className="text-sm">
        <Accordion type="single" collapsible className="w-full">
          {issues.map((it, i) => (
            <AccordionItem key={i} value={`q${i}`}>
              <AccordionTrigger className="text-xs text-left">{it.q}</AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground">{it.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <p className="mt-3 text-xs text-muted-foreground">
          Full guide in <a href="/docs/TROUBLESHOOTING.md" target="_blank" rel="noreferrer" className="text-primary hover:underline">docs/TROUBLESHOOTING.md <ExternalLink className="inline h-3 w-3" /></a>.
        </p>
      </CardContent>
    </Card>
  );
}

/* ====================== SECTION: Shortcuts ====================== */
function Shortcuts() {
  const rows = [
    { k: "Click sidebar items", d: "Switch between Overview / Projects / Workspace / etc." },
    { k: "Click a recent analysis", d: "Jump straight to its workspace" },
    { k: "Click an event row", d: "Seek the workspace video to that event's timestamp" },
    { k: "Play / Pause", d: "Toggle playback in the workspace" },
    { k: "Prev / Next event", d: "Jump between events in the timeline" },
    { k: "Canvas click (Zone Editor)", d: "Add a polygon vertex" },
    { k: "Canvas click (Line Editor)", d: "Set start then end point" },
    { k: "Bottom-right ? button", d: "Open / reopen the interactive guide" },
    { k: "Top-bar Docs button", d: "Jump to this documentation page" },
    { k: "Esc", d: "Close the guide panel / dialogs" },
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2"><Keyboard className="h-4 w-4 text-primary" /> Keyboard & Interaction Shortcuts</CardTitle>
      </CardHeader>
      <CardContent className="text-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-3 font-medium">Action</th>
                <th className="py-2 font-medium">What it does</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-1.5 pr-3 font-mono text-[11px]">{r.k}</td>
                  <td className="py-1.5 text-muted-foreground">{r.d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

/* ====================== SECTION: FAQ ====================== */
function Faq() {
  const faqs = [
    { q: "Do I need a GPU?", a: "No. The default ONNX SSD MobileNet v1 model runs on CPU (~5 frames/sec on a typical laptop). GPU support is available by swapping to a GPU ONNX Runtime build." },
    { q: "Do I need an internet connection?", a: "Only for installation. Once installed, the product runs entirely offline. The mock provider needs no external service. Real inference uses a local model file." },
    { q: "Can I use my own AI model?", a: "Yes. Implement the VisionProvider interface in src/providers/<your-name>/ and register it in src/providers/registry.ts. Any model that returns bounding boxes (car/motorcycle/truck/bus/bicycle) works." },
    { q: "Is the model license commercially usable?", a: "Yes. SSD MobileNet v1 COCO weights are Apache-2.0. ONNX Runtime is MIT. OpenCV is Apache-2.0. No AGPL contamination. See docs/MODEL_LICENSE.md for the full license text." },
    { q: "How accurate is the detection?", a: "On a validation corpus of 5 real traffic videos at confidence 0.4: precision 100%, recall ~40%, F1 ~58%. The model is conservative (no false positives) but misses distant/small vehicles. Swap to a heavier model for higher recall." },
    { q: "Can I use this for enforcement / speeding fines?", a: "No. Speed is explicitly labeled 'Estimated Speed' and is NOT legally certified. The product is for traffic analytics, not enforcement." },
    { q: "Does it support live RTSP cameras?", a: "Architecturally yes (Camera model + connection-test fields exist), but live streaming is not wired in V1. The pipeline processes uploaded MP4 files." },
    { q: "Where is my data stored?", a: "SQLite at db/custom.db, uploaded videos at storage/videos/, outputs at storage/outputs/. All on your machine. Nothing is sent anywhere unless you configure an external AI provider." },
    { q: "Can I run multiple projects?", a: "Yes, unlimited. Each project is fully isolated — its videos, zones, rules, analyses, and events never leak into other projects." },
    { q: "How do I generate a PDF report?", a: "Open the HTML report and use your browser's Print → Save as PDF. A native PDF engine is not bundled in V1." },
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2"><Lightbulb className="h-4 w-4 text-primary" /> Frequently Asked Questions</CardTitle>
      </CardHeader>
      <CardContent className="text-sm">
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((f, i) => (
            <AccordionItem key={i} value={`f${i}`}>
              <AccordionTrigger className="text-xs text-left">{f.q}</AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}

/* ====================== SECTION: Glossary ====================== */
function Glossary() {
  const terms = [
    { t: "Analysis Run", d: "A single processing pass over a video. Produces detections, tracks, events, and a result summary." },
    { t: "Bounding box", d: "A rectangle (x, y, width, height) around a detected vehicle in a frame. Normalized to 0–1 relative to frame size." },
    { t: "Confidence threshold", d: "Detections below this score (0–1) are discarded. Default 0.4. Lower = more detections (more false positives); higher = fewer (more misses)." },
    { t: "Congestion level", d: "LOW / MODERATE / HIGH / SEVERE. Derived from active-vehicle occupancy: &lt;25% / 25–50% / 50–75% / &gt;75%." },
    { t: "Counting line", d: "A user-drawn virtual line. Each tracked vehicle crossing it generates a count_crossing event." },
    { t: "Detection", d: "One vehicle sighting in one frame: class + confidence + bounding box + timestamp." },
    { t: "Dwell time", d: "How long a vehicle stayed inside a zone. lastSeen − firstSeen while inside." },
    { t: "Estimated Speed", d: "A relative speed metric derived from trajectory displacement. NOT certified km/h. Labeled 'Estimated' in the UI and reports." },
    { t: "Frame sampling", d: "Analyzing every Nth frame (e.g. 2 FPS = every 15th frame of a 30fps video). Lower = cheaper, higher = denser." },
    { t: "IoU (Intersection over Union)", d: "The overlap metric used by the tracker to decide if two detections in consecutive frames are the same vehicle." },
    { t: "Mock provider", d: "The deterministic simulator. No API key, no real video. Powers Demo Mode." },
    { t: "Provider", d: "A pluggable AI backend implementing VisionProvider. Mock / generic-http / local-inference." },
    { t: "Rule", d: "A configured trigger: COUNT_CROSSING, ZONE_ENTRY, ZONE_EXIT, STOPPED_VEHICLE, WRONG_WAY, CONGESTION, DWELL_TIME." },
    { t: "Track", d: "A vehicle followed across multiple frames with a stable ID. Has a trajectory, direction, and estimated speed." },
    { t: "Trajectory", d: "The sequence of (x, y, timestamp) points a track moved through. Used for direction + line-crossing tests." },
    { t: "Zone", d: "A user-drawn polygon. The engine tracks entries, exits, occupancy, and dwell per zone." },
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" /> Glossary</CardTitle>
      </CardHeader>
      <CardContent className="text-sm">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {terms.map((g) => (
            <div key={g.t} className="rounded-lg border bg-muted/30 p-2.5">
              <div className="font-mono text-xs font-semibold">{g.t}</div>
              <div className="mt-0.5 text-xs text-muted-foreground" dangerouslySetInnerHTML={{ __html: g.d }} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------ helpers ---------------------------------- */
function Concept({ term, desc }: { term: string; desc: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="font-mono text-xs font-semibold text-foreground">{term}</div>
      <div className="mt-1 text-xs text-muted-foreground">{desc}</div>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{n}</div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{title}</div>
        <div className="mt-1">{children}</div>
      </div>
    </div>
  );
}

function FeatureRow({ icon: Icon, name, where, children }: { icon: React.ComponentType<{ className?: string }>; name: string; where: string; children: React.ReactNode }) {
  const { navigate } = useNav();
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">{name}</span>
        <Badge variant="outline" className="ml-auto text-[10px]">{where}</Badge>
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">{children}</p>
      <button onClick={() => navigate(name.toLowerCase().includes("workspace") ? "workspace" : name.toLowerCase().includes("zone") ? "zones" : name.toLowerCase().includes("line") ? "lines" : name.toLowerCase().includes("result") ? "results" : name.toLowerCase().includes("event") ? "events" : name.toLowerCase().includes("report") ? "reports" : name.toLowerCase().includes("setting") ? "settings" : name.toLowerCase().includes("onboard") ? "onboarding" : "overview")} className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline">
        Open <ArrowRight className="h-3 w-3" />
      </button>
    </div>
  );
}

function SecurityItem({ ok, children }: { ok?: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      {ok ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" /> : <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />}
      <span className="text-muted-foreground">{children}</span>
    </li>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="mt-1 overflow-x-auto rounded-md border bg-slate-950 p-3 text-[11px] leading-relaxed text-slate-200">
      <code>{children}</code>
    </pre>
  );
}

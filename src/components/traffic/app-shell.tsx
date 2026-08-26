"use client";

import { useNav, type ViewId } from "./nav-context";
import { brand } from "@/lib/brand";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  FolderKanban,
  Video,
  PenTool,
  Spline,
  BarChart3,
  AlertTriangle,
  FileText,
  Settings,
  GraduationCap,
  Play,
  BookOpen,
  Moon,
  Sun,
  Activity,
  Menu,
  Search,
  Bell,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

const NAV_GROUPS: { label: string; items: { id: ViewId; label: string; icon: React.ComponentType<{ className?: string }>; desc?: string }[] }[] = [
  {
    label: "Dashboard",
    items: [
      { id: "overview", label: "Overview", icon: LayoutDashboard, desc: "All-projects summary" },
      { id: "projects", label: "Projects", icon: FolderKanban, desc: "Manage analysis projects" },
      { id: "demo", label: "Demo Mode", icon: Play, desc: "Pre-loaded sample" },
    ],
  },
  {
    label: "Analysis",
    items: [
      { id: "workspace", label: "Analysis Workspace", icon: Video, desc: "Video viewer + overlays" },
      { id: "zones", label: "Zone Editor", icon: Spline, desc: "Polygon zones" },
      { id: "lines", label: "Line Editor", icon: PenTool, desc: "Counting lines" },
      { id: "results", label: "Results", icon: BarChart3, desc: "Counts & breakdowns" },
      { id: "events", label: "Events", icon: AlertTriangle, desc: "Timeline of detections" },
    ],
  },
  {
    label: "Output",
    items: [
      { id: "reports", label: "Reports", icon: FileText, desc: "HTML / PDF / CSV" },
      { id: "settings", label: "Settings", icon: Settings, desc: "AI provider config" },
      { id: "onboarding", label: "Onboarding", icon: GraduationCap, desc: "First-run guide" },
      { id: "docs", label: "Documentation", icon: BookOpen, desc: "In-app docs" },
    ],
  },
];

type SidebarState = "full" | "collapsed" | "hidden";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { view, navigate } = useNav();
  const { theme, setTheme } = useTheme();
  const [sidebarState, setSidebarState] = useState<SidebarState>("full");
  const [hovered, setHovered] = useState(false);
  // isMobile defaults to false (desktop) to match SSR — updated in useEffect.
  // suppressHydrationWarning on the aside handles the class change.
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < 768);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Effective sidebar width
  const sidebarWidth = isMobile
    ? "0"
    : sidebarState === "hidden"
      ? "0"
      : sidebarState === "collapsed" && !hovered
        ? "4rem"
        : "16rem";

  const toggleSidebar = () => {
    if (isMobile) {
      setMobileOpen((o) => !o);
      return;
    }
    setSidebarState((s) => (s === "full" ? "collapsed" : s === "collapsed" ? "hidden" : "full"));
  };

  // Breadcrumb
  const breadcrumb = viewBreadcrumb(view);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background" suppressHydrationWarning>
      {/* === SIDEBAR === */}
      {/* Mobile overlay */}
      {isMobile && mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        suppressHydrationWarning
        onMouseEnter={() => !isMobile && setHovered(true)}
        onMouseLeave={() => !isMobile && setHovered(false)}
        className={cn(
          "flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out",
          isMobile
            ? mobileOpen
              ? "fixed inset-y-0 left-0 z-50 w-64"
              : "fixed inset-y-0 left-0 z-50 -translate-x-full w-64"
            : "relative shrink-0",
        )}
        style={{ width: isMobile ? undefined : sidebarWidth }}
      >
        {/* Logo header */}
        <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-sidebar-border px-4">
          <img src={brand.logoMark} alt="" className="h-8 w-8 shrink-0 rounded-md" />
          <span className={cn("min-w-0 overflow-hidden transition-opacity", sidebarWidth === "4rem" && !hovered ? "opacity-0" : "opacity-100")}>
            <div className="truncate text-sm font-semibold leading-tight">{brand.name}</div>
            <div className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">{brand.tagline}</div>
          </span>
        </div>

        {/* Nav */}
        <nav className="scroll-thin flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-4">
              <div className={cn("px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 transition-opacity", sidebarWidth === "4rem" && !hovered ? "opacity-0" : "opacity-100")}>
                {group.label}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = view === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        navigate(item.id);
                        if (isMobile) setMobileOpen(false);
                      }}
                      title={sidebarWidth === "4rem" && !hovered ? item.label : undefined}
                      className={cn(
                        "group flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                      )}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-muted-foreground group-hover:text-sidebar-foreground")} />
                      <span className={cn("min-w-0 flex-1 overflow-hidden transition-opacity", sidebarWidth === "4rem" && !hovered ? "opacity-0" : "opacity-100")}>
                        <span className="block truncate font-medium leading-tight">{item.label}</span>
                        {item.desc && <span className="block truncate text-[10px] text-muted-foreground">{item.desc}</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-2.5">
          <div className={cn("flex items-center gap-2 rounded-lg bg-sidebar-accent/40 px-2.5 py-2 transition-opacity", sidebarWidth === "4rem" && !hovered ? "opacity-0" : "opacity-100")}>
            <Activity className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
            <span className="text-[11px] font-medium">Mock provider</span>
            <Badge variant="outline" className="ml-auto border-emerald-500/30 text-[9px] text-emerald-400">DEMO</Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="mt-1.5 w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="hidden h-3.5 w-3.5 dark:inline" />
            <Moon className="inline h-3.5 w-3.5 dark:hidden" />
            <span className={cn("transition-opacity", sidebarWidth === "4rem" && !hovered ? "opacity-0" : "opacity-100")}>Toggle theme</span>
          </Button>
        </div>
      </aside>

      {/* === MAIN === */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top nav — breadcrumbs + search + actions */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={toggleSidebar} className="gap-1.5 p-2" title="Toggle sidebar">
              {sidebarState === "hidden" && !isMobile ? <PanelLeftOpen className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-sm">
              <button onClick={() => navigate("overview")} className="text-muted-foreground hover:text-foreground">
                Home
              </button>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
              <span className="font-medium text-foreground">{breadcrumb}</span>
            </nav>
          </div>

          {/* Search (desktop) */}
          <div className="hidden flex-1 max-w-xs md:flex">
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search…"
                className="h-8 bg-muted/50 pl-8 text-xs"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const q = (e.target as HTMLInputElement).value.toLowerCase();
                    if (q.includes("project")) navigate("projects");
                    else if (q.includes("demo")) navigate("demo");
                    else if (q.includes("report")) navigate("reports");
                    else if (q.includes("setting")) navigate("settings");
                    else if (q.includes("doc")) navigate("docs");
                    else if (q.includes("event")) navigate("events");
                    else if (q.includes("zone")) navigate("zones");
                    else if (q.includes("line")) navigate("lines");
                    else if (q.includes("result")) navigate("results");
                    else if (q.includes("work")) navigate("workspace");
                    else navigate("overview");
                  }
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="hidden text-xs text-muted-foreground lg:inline">v1.0.0</span>
            <span className="hidden h-1.5 w-1.5 rounded-full bg-emerald-500 lg:inline" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("docs")}
              className="gap-1.5 px-2"
              title="Documentation"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Docs</span>
            </Button>
            <Button variant="ghost" size="sm" className="relative p-2" title="Notifications">
              <Bell className="h-3.5 w-3.5" />
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="scroll-thin flex-1 overflow-y-auto bg-muted/30 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

function viewBreadcrumb(view: ViewId): string {
  const titles: Record<ViewId, string> = {
    overview: "Overview",
    projects: "Projects",
    workspace: "Analysis Workspace",
    zones: "Zone Editor",
    lines: "Line Editor",
    results: "Results & Analytics",
    events: "Events Timeline",
    reports: "Reports & Exports",
    settings: "Settings — AI Provider",
    onboarding: "Onboarding",
    demo: "Demo Mode",
    docs: "Documentation",
  };
  return titles[view] ?? "Dashboard";
}

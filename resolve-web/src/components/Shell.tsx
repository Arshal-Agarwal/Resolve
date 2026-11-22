import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Activity,
  ScrollText,
  Building2,
  ChevronDown,
  LayoutDashboard,
  Menu,
  RotateCcw,
  Search,
  ShieldCheck,
  Users,
  Workflow,
  X,
} from "lucide-react";
import { timeAgo, useResolve } from "@/lib/resolve-store";

function NavItem({ to, label, icon }: { to: string; label: string; icon: ReactNode }) {
  return (
    <Link
      to={to}
      activeOptions={{ exact: to === "/" }}
      className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium text-foreground/70 hover:bg-foreground/5 transition-colors"
      activeProps={{
        className:
          "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium bg-primary/10 text-primary ring-1 ring-primary/20",
      }}
    >
      <span className="size-4 grid place-items-center text-muted [&>*]:size-4">{icon}</span>
      {label}
    </Link>
  );
}

function NavGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="px-2 pb-1 pt-3 text-[10px] font-mono uppercase tracking-[0.15em] text-muted">
        {label}
      </p>
      {children}
    </div>
  );
}

function NotificationBell() {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useResolve();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const unread = notifications.filter((n) => !n.isRead);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative size-8 rounded-lg hover:bg-foreground/5 grid place-items-center text-muted hover:text-foreground transition-colors"
        aria-label="Notifications"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unread.length > 0 && (
          <span className="absolute top-1 right-1 size-2 rounded-full bg-danger ring-2 ring-background" />
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-10 w-80 rounded-xl border border-border bg-surface-solid backdrop-blur-2xl shadow-xl z-50 overflow-hidden rise">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <p className="text-sm font-semibold">Notifications</p>
            {unread.length > 0 && (
              <button
                onClick={() => markAllNotificationsRead()}
                className="text-[11px] font-mono text-primary hover:text-primary/80"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 && (
              <p className="px-4 py-6 text-sm text-muted text-center">No notifications</p>
            )}
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => markNotificationRead(n.id)}
                className={`w-full text-left px-4 py-3 border-b border-border last:border-0 hover:bg-foreground/5 transition-colors ${!n.isRead ? "bg-primary/5" : ""}`}
              >
                <div className="flex items-center gap-2">
                  {!n.isRead && <span className="size-1.5 rounded-full bg-primary shrink-0" />}
                  <p className={`text-sm font-medium ${!n.isRead ? "" : "text-muted"}`}>
                    {n.title}
                  </p>
                </div>
                <p className="text-xs text-muted mt-1 line-clamp-2">{n.body}</p>
                <p className="text-[10px] font-mono text-muted mt-1">{timeAgo(n.createdAt)}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PrototypeToast() {
  const { toast, clearToast } = useResolve();

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(clearToast, 4200);
    return () => window.clearTimeout(timeout);
  }, [toast, clearToast]);

  if (!toast) return null;

  const tone =
    toast.tone === "danger"
      ? "border-danger/30 bg-danger/10"
      : toast.tone === "info"
        ? "border-primary/30 bg-primary/10"
        : "border-success/30 bg-success/10";

  return (
    <div
      className={`fixed bottom-4 right-4 z-[70] w-[min(380px,calc(100vw-32px))] rounded-xl border ${tone} bg-surface-solid p-4 shadow-xl backdrop-blur-xl rise`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 size-2 rounded-full bg-current text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{toast.title}</p>
          {toast.description && <p className="mt-1 text-xs text-muted">{toast.description}</p>}
        </div>
        <button
          onClick={clearToast}
          className="text-muted hover:text-foreground"
          aria-label="Dismiss notification"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}

export function Shell({
  breadcrumb,
  actions,
  children,
  drawer,
}: {
  breadcrumb: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  drawer?: ReactNode;
}) {
  const {
    workflows,
    cases,
    users,
    teams,
    roles,
    tasks,
    organizations,
    selectedOrganizationId,
    selectOrganization,
    resetDemo,
    notify,
  } = useResolve();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [tenantOpen, setTenantOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedOrganization =
    organizations.find((organization) => organization.id === selectedOrganizationId) ??
    organizations[0];
  const pending = cases.filter(
    (caseRecord) => caseRecord.status === "in_review" || caseRecord.status === "blocked",
  ).length;

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];

    const caseMatches = cases
      .filter(
        (caseRecord) =>
          caseRecord.ref.toLowerCase().includes(query) ||
          caseRecord.title.toLowerCase().includes(query) ||
          caseRecord.summary.toLowerCase().includes(query),
      )
      .slice(0, 5)
      .map((caseRecord) => ({
        id: caseRecord.id,
        label: caseRecord.title,
        meta: `${caseRecord.ref} · Case`,
        to: `/cases/${caseRecord.id}`,
      }));

    const workflowMatches = workflows
      .filter(
        (workflow) =>
          workflow.name.toLowerCase().includes(query) ||
          workflow.description.toLowerCase().includes(query),
      )
      .slice(0, 4)
      .map((workflow) => ({
        id: workflow.id,
        label: workflow.name,
        meta: "Workflow",
        to: `/workflows/${workflow.id}`,
      }));

    const entityMatches = [
      ...users
        .filter((user) => `${user.name} ${user.email}`.toLowerCase().includes(query))
        .slice(0, 3)
        .map((user) => ({ id: user.id, label: user.name, meta: "User", to: "/users" })),
      ...teams
        .filter((team) => team.name.toLowerCase().includes(query))
        .slice(0, 2)
        .map((team) => ({ id: team.id, label: team.name, meta: "Team", to: "/teams" })),
      ...roles
        .filter((role) => role.name.toLowerCase().includes(query))
        .slice(0, 2)
        .map((role) => ({ id: role.id, label: role.name, meta: "Role", to: "/rbac/roles" })),
      ...tasks
        .filter((task) => task.title.toLowerCase().includes(query))
        .slice(0, 3)
        .map((task) => ({ id: task.id, label: task.title, meta: "Task", to: "/tasks" })),
    ];

    return [...caseMatches, ...workflowMatches, ...entityMatches].slice(0, 10);
  }, [cases, workflows, users, teams, roles, tasks, searchQuery]);

  const openSearch = () => {
    setSearchOpen(true);
    setSearchQuery("");
  };

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <aside
      className={`${mobile ? "flex" : "hidden md:flex"} rise h-screen w-64 shrink-0 flex-col border-r border-border bg-surface backdrop-blur-xl ${mobile ? "fixed inset-y-0 left-0 z-50 shadow-2xl" : "sticky top-0"}`}
    >
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="grid size-8 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
          R
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-none tracking-tight">Resolve</p>
          <p className="mt-1 font-mono text-[10px] text-muted">CASE OPS</p>
        </div>
        {mobile && (
          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto rounded-md p-1.5 text-muted hover:bg-foreground/5 hover:text-foreground"
            aria-label="Close navigation"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <nav className="mt-1 flex-1 overflow-y-auto px-3 pb-4">
        <NavGroup label="Overview">
          <NavItem to="/" label="Dashboard" icon={<LayoutDashboard />} />
        </NavGroup>
        <NavGroup label="Operations">
          <NavItem to="/cases" label="Cases" icon={<Activity />} />
          <NavItem to="/tasks" label="Tasks" icon={<Workflow />} />
          <NavItem to="/approvals" label="Approvals" icon={<ShieldCheck />} />
          <NavItem to="/documents" label="Documents" icon={<Activity />} />
          <NavItem to="/workflows" label="Workflows" icon={<Workflow />} />
        </NavGroup>
        <NavGroup label="Access & Identity">
          <NavItem to="/organization" label="Organization" icon={<Building2 />} />
          <NavItem to="/users" label="Users" icon={<Users />} />
          <NavItem to="/teams" label="Teams" icon={<Users />} />
        </NavGroup>
        <NavGroup label="Security & Compliance">
          <NavItem to="/rbac/roles" label="Roles & Permissions" icon={<ShieldCheck />} />
          <NavItem to="/audit" label="Audit Log" icon={<ScrollText />} />
        </NavGroup>
      </nav>

      <div className="p-3">
        <div className="rounded-xl border border-border bg-surface-solid p-3 backdrop-blur-xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
            Active workflows
          </p>
          <p className="mt-1 text-2xl font-bold tracking-tight">
            {workflows.filter((workflow) => workflow.status === "active").length}
          </p>
          <p className="mt-0.5 text-[11px] text-muted">{pending} awaiting attention</p>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -left-32 -top-40 size-[520px] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute right-[-160px] top-1/3 size-[460px] rounded-full bg-sky-400/15 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 size-[420px] rounded-full bg-indigo-300/10 blur-[120px]" />
      </div>

      {mobileOpen && (
        <button
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation overlay"
        />
      )}

      <div className="flex min-h-screen">
        <Sidebar />
        {mobileOpen && <Sidebar mobile />}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-border bg-surface backdrop-blur-xl">
            <div className="flex items-center gap-2 px-3 py-3 sm:px-6">
              <button
                onClick={() => setMobileOpen(true)}
                className="grid size-8 place-items-center rounded-lg text-muted hover:bg-foreground/5 hover:text-foreground md:hidden"
                aria-label="Open navigation"
              >
                <Menu className="size-4" />
              </button>

              <div className="hidden min-w-0 items-center gap-2 text-sm sm:flex">{breadcrumb}</div>

              <div className="relative ml-auto">
                <button
                  onClick={() => setTenantOpen((value) => !value)}
                  className="flex max-w-[180px] items-center gap-2 rounded-lg border border-border bg-surface-solid px-2.5 py-1.5 text-sm hover:bg-foreground/5"
                  aria-expanded={tenantOpen}
                >
                  <Building2 className="size-4 shrink-0 text-muted" />
                  <span className="truncate">{selectedOrganization?.name ?? "Select tenant"}</span>
                  <ChevronDown className="size-3 shrink-0 text-muted" />
                </button>
                {tenantOpen && (
                  <div className="absolute right-0 top-10 z-50 w-64 rounded-xl border border-border bg-surface-solid p-1.5 shadow-xl rise">
                    {organizations.map((organization) => (
                      <button
                        key={organization.id}
                        onClick={() => {
                          selectOrganization(organization.id);
                          setTenantOpen(false);
                          notify("Organization context changed", organization.name, "info");
                        }}
                        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-foreground/5 ${organization.id === selectedOrganizationId ? "bg-primary/5 text-primary" : ""}`}
                      >
                        <span className="min-w-0 flex-1 truncate">{organization.name}</span>
                        <span
                          className={`size-2 rounded-full ${organization.status === "ACTIVE" ? "bg-success" : "bg-danger"}`}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={openSearch}
                className="grid size-8 place-items-center rounded-lg text-muted hover:bg-foreground/5 hover:text-foreground"
                aria-label="Search Resolve"
              >
                <Search className="size-4" />
              </button>

              {actions}
              <NotificationBell />

              <div className="relative">
                <button
                  onClick={() => setProfileOpen((value) => !value)}
                  className="grid size-8 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary ring-1 ring-primary/20"
                  aria-label="Open user menu"
                >
                  RO
                </button>
                {profileOpen && (
                  <div className="absolute right-0 top-10 z-50 w-56 rounded-xl border border-border bg-surface-solid p-2 shadow-xl rise">
                    <div className="border-b border-border px-2 py-2">
                      <p className="text-sm font-medium">R. Okafor</p>
                      <p className="text-xs text-muted">Administrator · Demo mode</p>
                    </div>
                    <button
                      onClick={() => {
                        resetDemo();
                        setProfileOpen(false);
                        notify(
                          "Demo data reset",
                          "The prototype workspace has been restored.",
                          "success",
                        );
                      }}
                      className="mt-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-muted hover:bg-foreground/5 hover:text-foreground"
                    >
                      <RotateCcw className="size-4" />
                      Reset demo state
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          <div className="flex min-h-0 flex-1">
            <main className="min-w-0 flex-1 overflow-x-auto">{children}</main>
            {drawer}
          </div>
        </div>
      </div>

      {searchOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center bg-foreground/20 px-4 pt-[10vh] backdrop-blur-sm"
          onMouseDown={() => setSearchOpen(false)}
        >
          <div
            className="w-full max-w-xl overflow-hidden rounded-xl border border-border bg-surface-solid shadow-2xl rise"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <Search className="size-4 text-muted" />
              <input
                autoFocus
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search cases and workflows..."
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
              <button
                onClick={() => setSearchOpen(false)}
                className="rounded-md px-2 py-1 font-mono text-[10px] text-muted hover:bg-foreground/5"
              >
                ESC
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto p-2">
              {searchQuery && searchResults.length === 0 && (
                <p className="px-3 py-8 text-center text-sm text-muted">No matches found</p>
              )}
              {!searchQuery && (
                <p className="px-3 py-8 text-center text-sm text-muted">
                  Type a case reference or workflow name
                </p>
              )}
              {searchResults.map((result) => (
                <button
                  key={`${result.meta}-${result.id}`}
                  onClick={() => {
                    setSearchOpen(false);
                    window.location.assign(result.to);
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-foreground/5"
                >
                  <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Search className="size-3.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{result.label}</span>
                    <span className="block font-mono text-[10px] text-muted">{result.meta}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <PrototypeToast />
    </div>
  );
}

export function Crumb({ parts }: { parts: string[] }) {
  return (
    <>
      {parts.map((p, i) => (
        <span key={p + i} className="flex items-center gap-2">
          {i > 0 && <span className="text-muted/50">/</span>}
          <span className={i === parts.length - 1 ? "font-medium" : "text-muted"}>{p}</span>
        </span>
      ))}
    </>
  );
}

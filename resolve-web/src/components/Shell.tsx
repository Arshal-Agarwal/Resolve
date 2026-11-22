import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { timeAgo, useResolve } from "@/lib/resolve-store";

function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      activeOptions={{ exact: to === "/" }}
      className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium text-foreground/70 hover:bg-foreground/5"
      activeProps={{
        className:
          "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium bg-primary/10 text-primary ring-1 ring-primary/20",
      }}
    >
      {({ isActive }: { isActive: boolean }) => (
        <>
          <span className={`size-1.5 rounded-full ${isActive ? "bg-primary" : "bg-muted/40"}`} />
          {label}
        </>
      )}
    </Link>
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
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                  <p className={`text-sm font-medium ${!n.isRead ? "" : "text-muted"}`}>{n.title}</p>
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
  const { workflows, cases } = useResolve();
  const pending = cases.filter((c) => c.status === "in_review" || c.status === "blocked").length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 -left-32 size-[520px] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute top-1/3 -right-40 size-[460px] rounded-full bg-sky-400/15 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 size-[420px] rounded-full bg-indigo-300/10 blur-[120px]" />
      </div>

      <div className="flex min-h-screen">
        <aside className="rise sticky top-0 h-screen w-60 shrink-0 border-r border-border bg-surface backdrop-blur-xl flex flex-col">
          <div className="px-5 py-5 flex items-center gap-2.5">
            <div className="size-7 rounded-lg bg-primary grid place-items-center text-primary-foreground font-bold text-sm">
              R
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight leading-none">Resolve</p>
              <p className="text-[10px] font-mono text-muted mt-1">CASE OPS</p>
            </div>
          </div>
          <nav className="px-3 space-y-0.5 mt-2">
            <p className="px-2 pb-1 text-[10px] font-mono uppercase tracking-[0.15em] text-muted">
              Workspace
            </p>
            <NavItem to="/" label="Dashboard" />
            <NavItem to="/workflows" label="Workflows" />
            <NavItem to="/cases" label="Cases" />
            <NavItem to="/organization" label="Organization" />
          </nav>
          <div className="mt-auto p-3">
            <div className="rounded-xl bg-surface-solid backdrop-blur-xl border border-border p-3">
              <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted">
                Active workflows
              </p>
              <p className="text-2xl font-bold tracking-tight mt-1">
                {workflows.filter((w) => w.status === "active").length}
              </p>
              <p className="text-[11px] text-muted mt-0.5">{pending} awaiting approval</p>
            </div>
          </div>
        </aside>

        <div className="flex-1 min-w-0 flex flex-col">
          <header className="sticky top-0 z-10 border-b border-border bg-surface backdrop-blur-xl">
            <div className="flex items-center gap-4 px-6 py-3.5">
              <div className="flex items-center gap-2 text-sm">{breadcrumb}</div>
              <div className="ml-auto flex items-center gap-2">
                {actions}
                <NotificationBell />
              </div>
            </div>
          </header>

          <div className="flex-1 flex min-h-0">
            <main className="flex-1 min-w-0 overflow-x-auto">{children}</main>
            {drawer}
          </div>
        </div>
      </div>
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

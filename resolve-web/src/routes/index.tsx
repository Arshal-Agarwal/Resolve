import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Crumb, Shell } from "@/components/Shell";
import { Tag } from "@/components/bits";
import { countNodes, statusLabel, timeAgo, useResolve, type CaseRecord } from "@/lib/resolve-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Resolve" },
      {
        name: "description",
        content: "Operations dashboard with case stats, charts and recent activity.",
      },
    ],
  }),
  component: DashboardPage,
});

function StatCard({
  label,
  value,
  sublabel,
  tone,
  delay,
}: {
  label: string;
  value: number | string;
  sublabel: string;
  tone: "primary" | "success" | "warn" | "danger";
  delay: number;
}) {
  const tones: Record<string, string> = {
    primary: "text-primary",
    success: "text-success",
    warn: "text-warn",
    danger: "text-danger",
  };
  return (
    <div
      className="rise rounded-xl bg-surface backdrop-blur-xl border border-border p-4"
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted">{label}</p>
      <p className={`text-3xl font-bold tracking-tight mt-1 ${tones[tone]}`}>{value}</p>
      <p className="text-[11px] text-muted mt-0.5">{sublabel}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: CaseRecord["status"] }) {
  const tones: Record<string, "primary" | "warn" | "danger" | "success"> = {
    open: "primary",
    in_review: "warn",
    blocked: "danger",
    resolved: "success",
  };
  return <Tag tone={tones[status] ?? "primary"}>{statusLabel[status]}</Tag>;
}

function DashboardPage() {
  const {
    workflows,
    cases,
    auditEvents,
    approvals,
    users,
    teams,
    documents,
    notifications,
    organizations,
    selectedOrganizationId,
    serviceStatuses,
    ready,
  } = useResolve();
  void useNavigate();

  if (!ready) return null;

  const openCases = cases.filter((c) => c.status === "open").length;
  const reviewCases = cases.filter((c) => c.status === "in_review").length;
  const blockedCases = cases.filter((c) => c.status === "blocked").length;
  const resolvedCases = cases.filter((c) => c.status === "resolved").length;
  const pendingApprovals = approvals.filter((a) => a.status === "pending").length;
  const activeWorkflows = workflows.filter((w) => w.status === "active").length;
  const activeUsers = users.filter((user) => user.status === "active").length;
  const unreadNotifications = notifications.filter((notification) => !notification.isRead).length;
  const pendingDocuments = documents.filter((document) => document.scanStatus === "pending").length;
  const selectedOrganization =
    organizations.find((organization) => organization.id === selectedOrganizationId) ??
    organizations[0];

  // status breakdown for the mini bar chart
  const statusData = [
    { label: "Open", count: openCases, color: "bg-primary" },
    { label: "In Review", count: reviewCases, color: "bg-warn" },
    { label: "Blocked", count: blockedCases, color: "bg-danger" },
    { label: "Resolved", count: resolvedCases, color: "bg-success" },
  ];
  const totalStatus = statusData.reduce((s, d) => s + d.count, 0) || 1;

  // priority breakdown
  const highP = cases.filter((c) => c.priority === "high").length;
  const medP = cases.filter((c) => c.priority === "medium").length;
  const lowP = cases.filter((c) => c.priority === "low").length;

  const recentActivity = [...auditEvents]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 8);
  const recentCases = [...cases]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <Shell breadcrumb={<Crumb parts={["Workspace", "Dashboard"]} />}>
      <div className="px-6 py-6 max-w-[1100px]">
        <div className="rise">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
              <p className="mt-1 text-sm text-muted">
                Operations overview across Resolve workflows, cases and identity.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-surface px-3 py-2 text-right">
              <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted">
                Tenant context
              </p>
              <p className="mt-0.5 text-xs font-semibold">
                {selectedOrganization?.name ?? "Unselected"}
              </p>
            </div>
          </div>
        </div>

        {/* Stat cards */}
        <div
          className="rise mt-6 grid grid-cols-2 gap-3 md:grid-cols-4"
          style={{ animationDelay: "40ms" }}
        >
          <StatCard
            label="Total cases"
            value={cases.length}
            sublabel={`${activeWorkflows} active workflows`}
            tone="primary"
            delay={40}
          />
          <StatCard
            label="Open"
            value={openCases}
            sublabel={`${reviewCases} in review`}
            tone="warn"
            delay={80}
          />
          <StatCard
            label="Blocked"
            value={blockedCases}
            sublabel={`${pendingApprovals} pending approvals`}
            tone="danger"
            delay={120}
          />
          <StatCard
            label="Resolved"
            value={resolvedCases}
            sublabel="Completed this period"
            tone="success"
            delay={160}
          />
          <StatCard
            label="Active users"
            value={activeUsers}
            sublabel={`${teams.length} teams`}
            tone="primary"
            delay={200}
          />
          <StatCard
            label="Approvals"
            value={pendingApprovals}
            sublabel="Pending decisions"
            tone="warn"
            delay={240}
          />
          <StatCard
            label="Documents"
            value={documents.length}
            sublabel={`${pendingDocuments} awaiting scan`}
            tone="success"
            delay={280}
          />
          <StatCard
            label="Notifications"
            value={unreadNotifications}
            sublabel="Unread"
            tone="danger"
            delay={320}
          />
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Status breakdown */}
          <div
            className="rise rounded-xl bg-surface backdrop-blur-xl border border-border p-4"
            style={{ animationDelay: "200ms" }}
          >
            <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.15em] text-muted mb-3">
              <span className="size-1.5 rounded-full bg-primary animate-pulse" /> Cases by Status
            </div>
            <div className="space-y-3">
              {statusData.map((s) => (
                <div key={s.label}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium">{s.label}</span>
                    <span className="font-mono text-muted">{s.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-foreground/5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${s.color} transition-all`}
                      style={{ width: `${(s.count / totalStatus) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Priority breakdown */}
          <div
            className="rise rounded-xl bg-surface backdrop-blur-xl border border-border p-4"
            style={{ animationDelay: "260ms" }}
          >
            <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.15em] text-muted mb-3">
              <span className="size-1.5 rounded-full bg-primary animate-pulse" /> Cases by Priority
            </div>
            <div className="flex items-center gap-6 justify-center py-2">
              <div className="text-center">
                <p className="text-3xl font-bold text-danger">{highP}</p>
                <p className="text-[10px] font-mono uppercase tracking-wider text-muted mt-1">
                  High
                </p>
              </div>
              <div className="w-px h-12 bg-border" />
              <div className="text-center">
                <p className="text-3xl font-bold text-warn">{medP}</p>
                <p className="text-[10px] font-mono uppercase tracking-wider text-muted mt-1">
                  Medium
                </p>
              </div>
              <div className="w-px h-12 bg-border" />
              <div className="text-center">
                <p className="text-3xl font-bold text-muted">{lowP}</p>
                <p className="text-[10px] font-mono uppercase tracking-wider text-muted mt-1">
                  Low
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3">
              <div
                className="h-1.5 flex-1 rounded-l-full bg-danger"
                style={{ flex: highP || 0.001 }}
              />
              <div className="h-1.5 flex-1 rounded-none bg-warn" style={{ flex: medP || 0.001 }} />
              <div
                className="h-1.5 flex-1 rounded-r-full bg-muted/40"
                style={{ flex: lowP || 0.001 }}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div
            className="rise rounded-xl border border-border bg-surface p-4 backdrop-blur-xl"
            style={{ animationDelay: "300ms" }}
          >
            <div className="mb-3 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
              <span className="size-1.5 animate-pulse rounded-full bg-success" /> Identity & Access
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <p className="text-xl font-bold">{organizations.length}</p>
                <p className="text-[10px] text-muted">Tenants</p>
              </div>
              <div>
                <p className="text-xl font-bold">{users.length}</p>
                <p className="text-[10px] text-muted">Users</p>
              </div>
              <div>
                <p className="text-xl font-bold">{teams.length}</p>
                <p className="text-[10px] text-muted">Teams</p>
              </div>
            </div>
          </div>

          <div
            className="rise rounded-xl border border-border bg-surface p-4 backdrop-blur-xl"
            style={{ animationDelay: "340ms" }}
          >
            <div className="mb-3 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
              <span className="size-1.5 animate-pulse rounded-full bg-primary" /> Security & Audit
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold text-primary">{auditEvents.length}</p>
                <p className="mt-0.5 text-[10px] text-muted">Recorded events</p>
              </div>
              <Link to="/cases" className="text-xs font-medium text-primary">
                Case timeline
              </Link>
            </div>
          </div>

          <div
            className="rise rounded-xl border border-border bg-surface p-4 backdrop-blur-xl"
            style={{ animationDelay: "380ms" }}
          >
            <div className="mb-3 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
              <span className="size-1.5 animate-pulse rounded-full bg-warn" /> Service state
            </div>
            <div className="space-y-1.5">
              {serviceStatuses.slice(0, 4).map((service) => (
                <div key={service.name} className="flex items-center gap-2 text-xs">
                  <span
                    className={`size-1.5 rounded-full ${service.status === "operational" ? "bg-success" : service.status === "degraded" ? "bg-warn" : "bg-danger"}`}
                  />
                  <span className="min-w-0 flex-1 truncate">{service.name}</span>
                  <span className="font-mono text-[9px] uppercase text-muted">
                    {service.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent activity + recent cases */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recent activity */}
          <div
            className="rise rounded-xl bg-surface backdrop-blur-xl border border-border p-4"
            style={{ animationDelay: "320ms" }}
          >
            <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.15em] text-muted mb-3">
              <span className="size-1.5 rounded-full bg-primary animate-pulse" /> Recent Activity
            </div>
            <div className="space-y-0">
              {recentActivity.map((ae) => (
                <div
                  key={ae.id}
                  className="flex items-start gap-3 py-2 border-b border-border last:border-0"
                >
                  <div className="size-6 rounded-full bg-foreground/5 grid place-items-center shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-muted">
                      {ae.actor
                        .split(" ")
                        .map((w) => w[0])
                        .join("")
                        .slice(0, 2)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span className="font-medium">{ae.actor}</span>{" "}
                      <span className="text-muted">{ae.action.toLowerCase()}</span>
                    </p>
                    <p className="text-[11px] text-muted truncate">{ae.details}</p>
                  </div>
                  <span className="text-[10px] font-mono text-muted shrink-0">
                    {timeAgo(ae.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent cases */}
          <div
            className="rise rounded-xl bg-surface backdrop-blur-xl border border-border p-4"
            style={{ animationDelay: "380ms" }}
          >
            <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.15em] text-muted mb-3">
              <span className="size-1.5 rounded-full bg-primary animate-pulse" /> Recent Cases
            </div>
            <div className="space-y-0">
              {recentCases.map((c) => {
                const wf = workflows.find((w) => w.id === c.workflowId);
                return (
                  <Link
                    key={c.id}
                    to="/cases/$id"
                    params={{ id: c.id }}
                    className="flex items-center gap-3 py-2 border-b border-border last:border-0 hover:bg-foreground/5 -mx-2 px-2 rounded-lg transition-colors"
                  >
                    <span className="text-xs font-mono text-muted shrink-0 w-20">{c.ref}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{c.title}</p>
                      <p className="text-[11px] text-muted">
                        {wf?.name || "Deleted"} · {c.owner}
                      </p>
                    </div>
                    <StatusBadge status={c.status} />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

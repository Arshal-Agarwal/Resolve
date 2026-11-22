import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Crumb, Shell } from "@/components/Shell";
import { Select, Tag, TextInput } from "@/components/bits";
import { timeAgo, useResolve } from "@/lib/resolve-store";

export const Route = createFileRoute("/audit/")({ component: AuditPage });

export default function AuditPage() {
  const { auditEvents, ready } = useResolve();
  const [query, setQuery] = useState("");
  const [resource, setResource] = useState("all");

  const filtered = useMemo(
    () =>
      auditEvents
        .filter((event) => {
          if (resource !== "all" && event.resourceType !== resource) return false;
          const text =
            `${event.actor} ${event.action} ${event.details} ${event.resourceType}`.toLowerCase();
          return text.includes(query.toLowerCase());
        })
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [auditEvents, query, resource],
  );

  if (!ready) return null;

  return (
    <Shell breadcrumb={<Crumb parts={["Security & Compliance", "Audit"]} />}>
      <div className="mx-auto max-w-[1100px] px-6 py-6">
        <div className="rise">
          <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
          <p className="mt-1 text-sm text-muted">
            Immutable prototype activity across Resolve resources.
          </p>
        </div>
        <div className="rise mt-5 flex flex-wrap gap-2">
          <TextInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search actor, action or details"
            className="min-w-[240px] flex-1"
          />
          <Select value={resource} onChange={(event) => setResource(event.target.value)}>
            <option value="all">All resource types</option>
            {[
              "case",
              "task",
              "approval",
              "document",
              "comment",
              "stage",
              "organization",
              "user",
              "team",
              "role",
            ].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </div>
        <div className="mt-4 overflow-hidden rounded-xl border border-border bg-surface">
          <div className="divide-y divide-border">
            {filtered.map((event) => (
              <div
                key={event.id}
                className="grid gap-3 px-4 py-3 sm:grid-cols-[150px_150px_1fr_auto]"
              >
                <div>
                  <p className="text-sm font-medium">{event.actor}</p>
                  <p className="font-mono text-[10px] text-muted">{timeAgo(event.timestamp)}</p>
                </div>
                <Tag tone="primary">{event.resourceType.toUpperCase()}</Tag>
                <div>
                  <p className="text-sm font-medium">{event.action}</p>
                  <p className="mt-0.5 text-xs text-muted">{event.details}</p>
                </div>
                <span className="font-mono text-[10px] text-muted">
                  {event.resourceId.slice(0, 8)}
                </span>
              </div>
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="p-10 text-center text-sm text-muted">
              No audit events match the current filters.
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}

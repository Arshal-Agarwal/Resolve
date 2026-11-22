import { createFileRoute } from "@tanstack/react-router";
import { Crumb, Shell } from "@/components/Shell";
import { Tag } from "@/components/bits";
import { useResolve, type User } from "@/lib/resolve-store";

export const Route = createFileRoute("/organization")({
  head: () => ({
    meta: [
      { title: "Organization — Resolve" },
      {
        name: "description",
        content: "Organization overview — users, teams and role distribution.",
      },
    ],
  }),
  component: OrganizationPage,
});

const roleTone: Record<User["role"], "primary" | "warn" | "success" | "muted"> = {
  Administrator: "primary",
  Manager: "warn",
  Investigator: "success",
  Reviewer: "muted",
};

const statusTone: Record<User["status"], "success" | "muted"> = {
  active: "success",
  disabled: "muted",
};

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function OrganizationPage() {
  const { users, teams, ready } = useResolve();

  if (!ready) return null;

  const teamById = new Map(teams.map((t) => [t.id, t]));
  const memberCount = (teamId: string) => users.filter((u) => u.teamId === teamId).length;

  const roles: User["role"][] = ["Administrator", "Manager", "Investigator", "Reviewer"];
  const countByRole = (role: User["role"]) => users.filter((u) => u.role === role).length;

  return (
    <Shell breadcrumb={<Crumb parts={["Workspace", "Organization"]} />}>
      <div className="px-6 py-6 max-w-[1100px]">
        <div className="rise">
          <h1 className="text-2xl font-bold tracking-tight">Organization</h1>
          <p className="text-sm text-muted mt-1">
            Users, teams and role distribution across the workspace.
          </p>
        </div>

        {/* Roles overview */}
        <div
          className="rise mt-6 grid grid-cols-2 md:grid-cols-4 gap-3"
          style={{ animationDelay: "40ms" }}
        >
          {roles.map((role) => (
            <div
              key={role}
              className="rise rounded-xl bg-surface backdrop-blur-xl border border-border p-4"
              style={{ animationDelay: `${40 + roles.indexOf(role) * 40}ms` }}
            >
              <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted">
                {role}
              </p>
              <p className="text-3xl font-bold tracking-tight mt-1">{countByRole(role)}</p>
              <p className="text-[11px] text-muted mt-0.5">
                {countByRole(role) === 1 ? "user" : "users"}
              </p>
            </div>
          ))}
        </div>

        {/* Users table */}
        <div
          className="rise mt-6 rounded-xl bg-surface backdrop-blur-xl border border-border p-4"
          style={{ animationDelay: "200ms" }}
        >
          <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.15em] text-muted mb-3">
            <span className="size-1.5 rounded-full bg-primary animate-pulse" /> Users
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-border">
                  <th className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted font-medium py-2 pr-4">
                    Name
                  </th>
                  <th className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted font-medium py-2 pr-4">
                    Email
                  </th>
                  <th className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted font-medium py-2 pr-4">
                    Role
                  </th>
                  <th className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted font-medium py-2 pr-4">
                    Team
                  </th>
                  <th className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted font-medium py-2">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-border last:border-0">
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2.5">
                        <div className="size-7 rounded-full bg-foreground/5 grid place-items-center shrink-0">
                          <span className="text-[10px] font-bold text-muted">
                            {initials(u.name)}
                          </span>
                        </div>
                        <span className="font-medium">{u.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-4 text-muted">{u.email}</td>
                    <td className="py-2.5 pr-4">
                      <Tag tone={roleTone[u.role]}>{u.role}</Tag>
                    </td>
                    <td className="py-2.5 pr-4 text-muted">
                      {u.teamId ? teamById.get(u.teamId)?.name ?? "—" : "—"}
                    </td>
                    <td className="py-2.5">
                      <Tag tone={statusTone[u.status]}>
                        {u.status === "active" ? "Active" : "Disabled"}
                      </Tag>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Teams grid */}
        <div
          className="rise mt-6 grid grid-cols-1 md:grid-cols-3 gap-4"
          style={{ animationDelay: "260ms" }}
        >
          {teams.map((team, i) => (
            <div
              key={team.id}
              className="rise rounded-xl bg-surface backdrop-blur-xl border border-border p-4"
              style={{ animationDelay: `${260 + i * 60}ms` }}
            >
              <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted">
                Team
              </p>
              <p className="text-base font-semibold tracking-tight mt-1">{team.name}</p>
              <p className="text-sm text-muted mt-1.5">{team.description}</p>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                <span className="text-2xl font-bold tracking-tight">
                  {memberCount(team.id)}
                </span>
                <span className="text-[11px] text-muted">
                  {memberCount(team.id) === 1 ? "member" : "members"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}

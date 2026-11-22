import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Crumb, Shell } from "@/components/Shell";
import { Field, Modal, PrimaryButton, Select, Tag, TextInput } from "@/components/bits";
import { useResolve, type User } from "@/lib/resolve-store";

export const Route = createFileRoute("/users/")({ component: UsersPage });

export default function UsersPage() {
  const {
    users,
    teams,
    roles,
    userRoleAssignments,
    updateUserStatus,
    createUser,
    assignRole,
    simulateAction,
    ready,
  } = useResolve();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [team, setTeam] = useState("all");
  const [selected, setSelected] = useState<User | null>(null);
  const [formStatus, setFormStatus] = useState<User["status"]>("active");
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("role-investigator");
  const [newTeam, setNewTeam] = useState("");

  const teamById = new Map(teams.map((item) => [item.id, item]));
  const filtered = useMemo(
    () =>
      users.filter((user) => {
        if (status !== "all" && user.status !== status) return false;
        if (team !== "all" && user.teamId !== team) return false;
        const text = `${user.name} ${user.email} ${user.role}`.toLowerCase();
        return text.includes(query.toLowerCase());
      }),
    [users, status, team, query],
  );

  const roleName = (userId: string) => {
    const assignment = userRoleAssignments.find((item) => item.userId === userId);
    return roles.find((role) => role.id === assignment?.roleId)?.name ?? "No role assigned";
  };

  if (!ready) return null;

  return (
    <Shell
      breadcrumb={<Crumb parts={["Access & Identity", "Users"]} />}
      actions={<PrimaryButton onClick={() => setCreateOpen(true)}>+ New user</PrimaryButton>}
    >
      <div className="mx-auto max-w-[1100px] px-6 py-6">
        <div className="rise">
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="mt-1 text-sm text-muted">
            Manage tenant users, status and team membership.
          </p>
        </div>

        <div className="rise mt-5 flex flex-wrap gap-2">
          <TextInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, email or role"
            className="min-w-[240px] flex-1"
          />
          <Select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </Select>
          <Select value={team} onChange={(event) => setTeam(event.target.value)}>
            <option value="all">All teams</option>
            {teams.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="rise mt-4 overflow-hidden rounded-xl border border-border bg-surface backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[10px] font-mono uppercase tracking-[0.15em] text-muted">
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Team</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-border last:border-0 hover:bg-foreground/[0.025]"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">{user.name}</div>
                      <div className="text-xs text-muted">{user.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Tag tone="primary">{roleName(user.id)}</Tag>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {user.teamId ? teamById.get(user.teamId)?.name : "No team"}
                    </td>
                    <td className="px-4 py-3">
                      <Tag tone={user.status === "active" ? "success" : "muted"}>
                        {user.status === "active" ? "ACTIVE" : "DISABLED"}
                      </Tag>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          setSelected(user);
                          setFormStatus(user.status);
                        }}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="p-10 text-center text-sm text-muted">
              No users match the current filters.
            </div>
          )}
        </div>
      </div>

      <Modal open={createOpen} title="Create user" onClose={() => setCreateOpen(false)}>
        <Field label="Full name">
          <TextInput
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="Morgan Price"
          />
        </Field>
        <Field label="Email">
          <TextInput
            type="email"
            value={newEmail}
            onChange={(event) => setNewEmail(event.target.value)}
            placeholder="morgan.price@resolve.io"
          />
        </Field>
        <Field label="Role">
          <Select value={newRole} onChange={(event) => setNewRole(event.target.value)}>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Team">
          <Select value={newTeam} onChange={(event) => setNewTeam(event.target.value)}>
            <option value="">No team</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex justify-end gap-2">
          <button onClick={() => setCreateOpen(false)} className="px-3 py-2 text-sm text-muted">
            Cancel
          </button>
          <PrimaryButton
            disabled={!newName.trim() || !newEmail.includes("@")}
            onClick={() => {
              const role = roles.find((item) => item.id === newRole);
              void simulateAction(
                () => {
                  const user = createUser({
                    name: newName.trim(),
                    email: newEmail.trim(),
                    role:
                      role?.name === "CASE_MANAGER"
                        ? "Manager"
                        : role?.name === "ORG_ADMIN"
                          ? "Administrator"
                          : role?.name === "INVESTIGATOR"
                            ? "Investigator"
                            : "Reviewer",
                    status: "active",
                    teamId: newTeam || null,
                  });
                  assignRole(user.id, newRole);
                },
                "User created",
                `${newName.trim()} was provisioned.`,
              ).then(() => {
                setCreateOpen(false);
                setNewName("");
                setNewEmail("");
                setNewTeam("");
              });
            }}
          >
            Create user
          </PrimaryButton>
        </div>
      </Modal>

      <Modal open={!!selected} title="Manage user" onClose={() => setSelected(null)}>
        {selected && (
          <>
            <Field label="User">
              <TextInput value={selected.name} readOnly />
            </Field>
            <Field label="Status">
              <Select
                value={formStatus}
                onChange={(event) => setFormStatus(event.target.value as User["status"])}
              >
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
              </Select>
            </Field>
            <div className="flex justify-end gap-2">
              <button onClick={() => setSelected(null)} className="px-3 py-2 text-sm text-muted">
                Cancel
              </button>
              <PrimaryButton
                onClick={() =>
                  void simulateAction(
                    () => updateUserStatus(selected.id, formStatus),
                    "User status updated",
                    `${selected.name} is now ${formStatus}.`,
                  ).then(() => setSelected(null))
                }
              >
                Save
              </PrimaryButton>
            </div>
          </>
        )}
      </Modal>
    </Shell>
  );
}

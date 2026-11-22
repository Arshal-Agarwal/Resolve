import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Crumb, Shell } from "@/components/Shell";
import {
  DangerButton,
  Field,
  Modal,
  PrimaryButton,
  Tag,
  TextArea,
  TextInput,
} from "@/components/bits";
import { useResolve, type RoleRecord } from "@/lib/resolve-store";

export const Route = createFileRoute("/rbac/roles/")({ component: RolesPage });

export default function RolesPage() {
  const {
    roles,
    permissions,
    users,
    userRoleAssignments,
    createRole,
    updateRole,
    deleteRole,
    assignRole,
    revokeRole,
    simulateAction,
    ready,
  } = useResolve();
  const [selectedId, setSelectedId] = useState(roles[0]?.id ?? "");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<RoleRecord | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [permissionIds, setPermissionIds] = useState<string[]>([]);
  const [assignedUserId, setAssignedUserId] = useState("");

  const selected = roles.find((role) => role.id === selectedId) ?? roles[0];
  const openCreate = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setPermissionIds([]);
    setCreateOpen(true);
  };
  const openEdit = (role: RoleRecord) => {
    setEditing(role);
    setName(role.name);
    setDescription(role.description);
    setPermissionIds(role.permissionIds);
    setCreateOpen(true);
  };
  const save = () => {
    if (!name.trim()) return;
    if (editing)
      void simulateAction(
        () =>
          updateRole(editing.id, {
            name: name.trim(),
            description: description.trim(),
            permissionIds,
          }),
        "Role updated",
        `${name.trim()} permissions were saved.`,
      ).then(() => setCreateOpen(false));
    else
      void simulateAction(
        () => createRole({ name: name.trim(), description: description.trim(), permissionIds }),
        "Role created",
        `${name.trim()} is available for assignment.`,
      ).then(() => setCreateOpen(false));
  };

  if (!ready) return null;

  return (
    <Shell
      breadcrumb={<Crumb parts={["Security & Compliance", "Roles"]} />}
      actions={<PrimaryButton onClick={openCreate}>+ New role</PrimaryButton>}
    >
      <div className="mx-auto max-w-[1100px] px-6 py-6">
        <div className="rise">
          <h1 className="text-2xl font-bold tracking-tight">Roles & Permissions</h1>
          <p className="mt-1 text-sm text-muted">
            Manage permission collections and user assignments.
          </p>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-[280px_1fr]">
          <div className="space-y-2">
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => setSelectedId(role.id)}
                className={`w-full rounded-xl border p-3 text-left ${selected?.id === role.id ? "border-primary/30 bg-primary/5" : "border-border bg-surface"}`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold">{role.name}</span>
                  {role.isSystemRole && <Tag tone="muted">SYSTEM</Tag>}
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted">{role.description}</p>
              </button>
            ))}
          </div>
          {selected && (
            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-start justify-between border-b border-border pb-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
                    Role
                  </p>
                  <h2 className="mt-1 text-lg font-semibold">{selected.name}</h2>
                  <p className="mt-1 text-sm text-muted">{selected.description}</p>
                </div>
                {!selected.isSystemRole && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEdit(selected)}
                      className="px-3 py-1.5 text-sm text-muted"
                    >
                      Edit
                    </button>
                    <DangerButton
                      onClick={() =>
                        void simulateAction(
                          () => deleteRole(selected.id),
                          "Role deleted",
                          `${selected.name} was removed.`,
                        )
                      }
                    >
                      Delete
                    </DangerButton>
                  </div>
                )}
              </div>
              <div className="mt-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
                  Permissions
                </p>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {permissions
                    .filter((permission) => selected.permissionIds.includes(permission.id))
                    .map((permission) => (
                      <div
                        key={permission.id}
                        className="rounded-lg border border-border px-3 py-2"
                      >
                        <p className="font-mono text-xs font-semibold text-primary">
                          {permission.code}
                        </p>
                        <p className="mt-0.5 text-xs text-muted">{permission.description}</p>
                      </div>
                    ))}
                </div>
              </div>
              <div className="mt-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
                  Assigned users
                </p>
                <div className="mt-2 space-y-2">
                  {userRoleAssignments
                    .filter((assignment) => assignment.roleId === selected.id)
                    .map((assignment) => {
                      const user = users.find((item) => item.id === assignment.userId);
                      return user ? (
                        <div
                          key={assignment.userId}
                          className="flex items-center rounded-lg border border-border px-3 py-2"
                        >
                          <div>
                            <p className="text-sm font-medium">{user.name}</p>
                            <p className="text-xs text-muted">{user.email}</p>
                          </div>
                          <button
                            onClick={() =>
                              void simulateAction(
                                () => revokeRole(user.id, selected.id),
                                "Role revoked",
                                `${selected.name} was revoked from ${user.name}.`,
                              )
                            }
                            className="ml-auto text-xs text-danger"
                          >
                            Revoke
                          </button>
                        </div>
                      ) : null;
                    })}
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                  <select
                    className="w-full rounded-lg border border-border bg-white/70 px-3 py-2 text-sm"
                    value={assignedUserId}
                    onChange={(event) => setAssignedUserId(event.target.value)}
                  >
                    <option value="">Select user</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                  <PrimaryButton
                    onClick={() => {
                      if (assignedUserId)
                        void simulateAction(
                          () => assignRole(assignedUserId, selected.id),
                          "Role assigned",
                          `${selected.name} was assigned.`,
                        ).then(() => setAssignedUserId(""));
                    }}
                    disabled={!assignedUserId}
                  >
                    Assign
                  </PrimaryButton>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <Modal
        open={createOpen}
        title={editing ? "Edit role" : "Create role"}
        onClose={() => setCreateOpen(false)}
      >
        <Field label="Role name">
          <TextInput
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="SENIOR_INVESTIGATOR"
          />
        </Field>
        <Field label="Description">
          <TextArea value={description} onChange={(event) => setDescription(event.target.value)} />
        </Field>
        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
            Permissions
          </p>
          <div className="max-h-52 space-y-1 overflow-y-auto">
            {permissions.map((permission) => (
              <label
                key={permission.id}
                className="flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-foreground/5"
              >
                <input
                  type="checkbox"
                  checked={permissionIds.includes(permission.id)}
                  onChange={(event) =>
                    setPermissionIds((current) =>
                      event.target.checked
                        ? [...current, permission.id]
                        : current.filter((id) => id !== permission.id),
                    )
                  }
                />
                <span>
                  <span className="block text-xs font-semibold">{permission.code}</span>
                  <span className="block text-[11px] text-muted">{permission.description}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={() => setCreateOpen(false)} className="px-3 py-2 text-sm text-muted">
            Cancel
          </button>
          <PrimaryButton disabled={!name.trim()} onClick={save}>
            {editing ? "Save changes" : "Create role"}
          </PrimaryButton>
        </div>
      </Modal>
    </Shell>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Crumb, Shell } from "@/components/Shell";
import {
  DangerButton,
  Field,
  Modal,
  PrimaryButton,
  Select,
  Tag,
  TextArea,
  TextInput,
} from "@/components/bits";
import { useResolve, type Team } from "@/lib/resolve-store";

export const Route = createFileRoute("/teams/")({ component: TeamsPage });

export default function TeamsPage() {
  const {
    teams,
    users,
    createTeam,
    updateTeam,
    deleteTeam,
    addTeamMember,
    removeTeamMember,
    simulateAction,
    ready,
  } = useResolve();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Team | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState(teams[0]?.id ?? "");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [memberId, setMemberId] = useState("");

  const selectedTeam = teams.find((team) => team.id === selectedTeamId) ?? teams[0];
  const memberCount = (teamId: string) => users.filter((user) => user.teamId === teamId).length;

  const openCreate = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setCreateOpen(true);
  };
  const openEdit = (team: Team) => {
    setEditing(team);
    setName(team.name);
    setDescription(team.description);
    setCreateOpen(true);
  };
  const save = () => {
    if (!name.trim()) return;
    if (editing)
      void simulateAction(
        () => updateTeam(editing.id, { name: name.trim(), description: description.trim() }),
        "Team updated",
        `${name.trim()} was saved.`,
      ).then(() => setCreateOpen(false));
    else
      void simulateAction(
        () => createTeam(name.trim(), description.trim()),
        "Team created",
        `${name.trim()} is ready for members.`,
      ).then(() => setCreateOpen(false));
  };

  if (!ready) return null;

  return (
    <Shell
      breadcrumb={<Crumb parts={["Access & Identity", "Teams"]} />}
      actions={<PrimaryButton onClick={openCreate}>+ New team</PrimaryButton>}
    >
      <div className="mx-auto max-w-[1100px] px-6 py-6">
        <div className="rise">
          <h1 className="text-2xl font-bold tracking-tight">Teams</h1>
          <p className="mt-1 text-sm text-muted">Organize users and assign operational work.</p>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-[280px_1fr]">
          <div className="space-y-2">
            {teams.map((team) => (
              <button
                key={team.id}
                onClick={() => setSelectedTeamId(team.id)}
                className={`w-full rounded-xl border p-3 text-left ${selectedTeam?.id === team.id ? "border-primary/30 bg-primary/5" : "border-border bg-surface hover:border-primary/20"}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{team.name}</span>
                  <Tag tone="muted">{memberCount(team.id)}</Tag>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted">{team.description}</p>
              </button>
            ))}
          </div>

          {selectedTeam && (
            <div className="rounded-xl border border-border bg-surface p-4 backdrop-blur-xl">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
                    Team
                  </p>
                  <h2 className="mt-1 text-lg font-semibold">{selectedTeam.name}</h2>
                  <p className="mt-1 text-sm text-muted">{selectedTeam.description}</p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(selectedTeam)}
                    className="rounded-lg px-3 py-1.5 text-sm text-muted hover:bg-foreground/5"
                  >
                    Edit
                  </button>
                  <DangerButton
                    onClick={() =>
                      void simulateAction(
                        () => deleteTeam(selectedTeam.id),
                        "Team deleted",
                        `${selectedTeam.name} was deleted.`,
                      )
                    }
                  >
                    Delete
                  </DangerButton>
                </div>
              </div>
              <div className="mt-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
                  Members
                </p>
                <div className="mt-2 space-y-2">
                  {users
                    .filter((user) => user.teamId === selectedTeam.id)
                    .map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center rounded-lg border border-border px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-medium">{user.name}</p>
                          <p className="text-xs text-muted">{user.email}</p>
                        </div>
                        <button
                          onClick={() =>
                            void simulateAction(
                              () => removeTeamMember(selectedTeam.id, user.id),
                              "Member removed",
                              `${user.name} was removed from ${selectedTeam.name}.`,
                            )
                          }
                          className="ml-auto text-xs text-danger"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <Select value={memberId} onChange={(event) => setMemberId(event.target.value)}>
                    <option value="">Select a user</option>
                    {users
                      .filter((user) => user.teamId !== selectedTeam.id)
                      .map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name}
                        </option>
                      ))}
                  </Select>
                  <PrimaryButton
                    disabled={!memberId}
                    onClick={() => {
                      void simulateAction(
                        () => addTeamMember(selectedTeam.id, memberId),
                        "Member added",
                        `A user was added to ${selectedTeam.name}.`,
                      ).then(() => setMemberId(""));
                    }}
                  >
                    Add
                  </PrimaryButton>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <Modal
        open={createOpen}
        title={editing ? "Edit team" : "Create team"}
        onClose={() => setCreateOpen(false)}
      >
        <Field label="Name">
          <TextInput
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Operations Review"
          />
        </Field>
        <Field label="Description">
          <TextArea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Purpose of this team"
          />
        </Field>
        <div className="flex justify-end gap-2">
          <button onClick={() => setCreateOpen(false)} className="px-3 py-2 text-sm text-muted">
            Cancel
          </button>
          <PrimaryButton disabled={!name.trim()} onClick={save}>
            {editing ? "Save changes" : "Create team"}
          </PrimaryButton>
        </div>
      </Modal>
    </Shell>
  );
}

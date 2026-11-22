import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Crumb, Shell } from "@/components/Shell";
import { Field, Modal, PrimaryButton, Select, Tag, TextArea, TextInput } from "@/components/bits";
import { useResolve, type TaskRecord, type TaskStatus } from "@/lib/resolve-store";

export const Route = createFileRoute("/tasks/")({ component: TasksPage });

export default function TasksPage() {
  const {
    tasks,
    cases,
    users,
    teams,
    createTask,
    updateTask,
    deleteTask,
    completeTask,
    simulateAction,
    ready,
  } = useResolve();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [assignee, setAssignee] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<TaskRecord | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    caseId: "",
    assignee: "",
    status: "pending" as TaskStatus,
    priority: "medium",
    dueDate: "",
    requiredForStage: false,
    dependsOnTaskId: "",
  });

  const caseById = new Map(cases.map((item) => [item.id, item]));
  const teamById = new Map(teams.map((item) => [item.id, item]));
  const filtered = useMemo(
    () =>
      tasks
        .filter((task) => {
          if (status !== "all" && task.status !== status) return false;
          if (assignee !== "all" && task.assignee !== assignee) return false;
          const text = `${task.title} ${task.description} ${task.assignee}`.toLowerCase();
          return text.includes(query.toLowerCase());
        })
        .filter((task) =>
          `${task.title} ${task.description} ${task.assignee}`
            .toLowerCase()
            .includes(query.toLowerCase()),
        ),
    [tasks, status, assignee, query],
  );

  const openCreate = () => {
    setEditing(null);
    setForm({
      title: "",
      description: "",
      caseId: cases[0]?.id ?? "",
      assignee: users[0]?.name ?? "",
      status: "pending",
      priority: "medium",
      dueDate: "",
      requiredForStage: false,
      dependsOnTaskId: "",
    });
    setCreateOpen(true);
  };
  const openEdit = (task: TaskRecord) => {
    setEditing(task);
    setForm({
      title: task.title,
      description: task.description,
      caseId: task.caseId,
      assignee: task.assignee,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "",
      requiredForStage: task.requiredForStage,
      dependsOnTaskId: task.dependsOnTaskId ?? "",
    });
    setCreateOpen(true);
  };
  const save = () => {
    if (!form.title.trim() || !form.caseId) return;
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      caseId: form.caseId,
      assignee: form.assignee,
      status: form.status,
      priority: form.priority as TaskRecord["priority"],
      dueDate: form.dueDate ? new Date(`${form.dueDate}T12:00:00`).toISOString() : null,
      requiredForStage: form.requiredForStage,
      dependsOnTaskId: form.dependsOnTaskId || null,
      assigneeTeamId: teams.find((team) => team.name === form.assignee)?.id ?? null,
    };
    if (editing)
      void simulateAction(
        () => updateTask(editing.id, payload),
        "Task updated",
        `${form.title.trim()} was saved.`,
      ).then(() => setCreateOpen(false));
    else
      void simulateAction(
        () => createTask(payload),
        "Task created",
        `${form.title.trim()} was added to the case.`,
      ).then(() => setCreateOpen(false));
  };

  if (!ready) return null;

  const toneForStatus = (value: TaskStatus) =>
    value === "completed"
      ? "success"
      : value === "in_progress"
        ? "primary"
        : value === "cancelled"
          ? "danger"
          : "muted";

  return (
    <Shell
      breadcrumb={<Crumb parts={["Operations", "Tasks"]} />}
      actions={<PrimaryButton onClick={openCreate}>+ New task</PrimaryButton>}
    >
      <div className="mx-auto max-w-[1100px] px-6 py-6">
        <div className="rise">
          <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
          <p className="mt-1 text-sm text-muted">
            Track work, dependencies and required-stage assignments.
          </p>
        </div>
        <div className="rise mt-5 flex flex-wrap gap-2">
          <TextInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search tasks or assignees"
            className="min-w-[240px] flex-1"
          />
          <Select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </Select>
          <Select value={assignee} onChange={(event) => setAssignee(event.target.value)}>
            <option value="all">All assignees</option>
            {users.map((user) => (
              <option key={user.id} value={user.name}>
                {user.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="mt-4 space-y-2">
          {filtered.map((task) => (
            <div
              key={task.id}
              className="rise rounded-xl border border-border bg-surface px-4 py-3"
            >
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{task.title}</p>
                    <Tag tone={toneForStatus(task.status)}>
                      {task.status.replace("_", " ").toUpperCase()}
                    </Tag>
                    {task.requiredForStage && <Tag tone="warn">REQUIRED</Tag>}
                  </div>
                  <p className="mt-1 text-sm text-muted">{task.description}</p>
                  <div className="mt-2 flex flex-wrap gap-3 font-mono text-[10px] text-muted">
                    <span>{caseById.get(task.caseId)?.ref ?? "Unlinked case"}</span>
                    <span>Assignee: {task.assignee}</span>
                    {task.assigneeTeamId && (
                      <span>Team: {teamById.get(task.assigneeTeamId)?.name}</span>
                    )}
                    {task.dependsOnTaskId && (
                      <span>
                        Depends on: {tasks.find((item) => item.id === task.dependsOnTaskId)?.title}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(task)}
                    className="rounded-lg px-3 py-1.5 text-sm text-muted hover:bg-foreground/5"
                  >
                    Edit
                  </button>
                  {task.status !== "completed" && (
                    <PrimaryButton
                      onClick={() =>
                        void simulateAction(
                          () => completeTask(task.id),
                          "Task completed",
                          `${task.title} is complete.`,
                        )
                      }
                      className="text-xs"
                    >
                      Complete
                    </PrimaryButton>
                  )}
                  <button
                    onClick={() =>
                      void simulateAction(
                        () => deleteTask(task.id),
                        "Task deleted",
                        `${task.title} was removed.`,
                      )
                    }
                    className="rounded-lg px-2 py-1.5 text-xs text-danger"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="mt-4 rounded-xl border border-border bg-surface p-10 text-center text-sm text-muted">
            No tasks match the current filters.
          </div>
        )}
      </div>
      <Modal
        open={createOpen}
        title={editing ? "Edit task" : "Create task"}
        onClose={() => setCreateOpen(false)}
      >
        <Field label="Title">
          <TextInput
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
          />
        </Field>
        <Field label="Description">
          <TextArea
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
          />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Case">
            <Select
              value={form.caseId}
              onChange={(event) => setForm({ ...form, caseId: event.target.value })}
            >
              <option value="">Select case</option>
              {cases.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.ref} · {item.title}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Assignee">
            <Select
              value={form.assignee}
              onChange={(event) => setForm({ ...form, assignee: event.target.value })}
            >
              {users.map((user) => (
                <option key={user.id} value={user.name}>
                  {user.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status">
            <Select
              value={form.status}
              onChange={(event) => setForm({ ...form, status: event.target.value as TaskStatus })}
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </Field>
          <Field label="Priority">
            <Select
              value={form.priority}
              onChange={(event) => setForm({ ...form, priority: event.target.value })}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </Select>
          </Field>
          <Field label="Due date">
            <TextInput
              type="date"
              value={form.dueDate}
              onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
            />
          </Field>
          <Field label="Depends on">
            <Select
              value={form.dependsOnTaskId}
              onChange={(event) => setForm({ ...form, dependsOnTaskId: event.target.value })}
            >
              <option value="">No dependency</option>
              {tasks
                .filter((task) => task.id !== editing?.id)
                .map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.title}
                  </option>
                ))}
            </Select>
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.requiredForStage}
            onChange={(event) => setForm({ ...form, requiredForStage: event.target.checked })}
          />
          Required for stage advancement
        </label>
        <div className="flex justify-end gap-2">
          <button onClick={() => setCreateOpen(false)} className="px-3 py-2 text-sm text-muted">
            Cancel
          </button>
          <PrimaryButton disabled={!form.title.trim() || !form.caseId} onClick={save}>
            {editing ? "Save changes" : "Create task"}
          </PrimaryButton>
        </div>
      </Modal>
    </Shell>
  );
}

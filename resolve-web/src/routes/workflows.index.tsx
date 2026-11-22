import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
import { countNodes, useResolve, type Workflow } from "@/lib/resolve-store";

export const Route = createFileRoute("/workflows/")({
  head: () => ({
    meta: [
      { title: "Workflows — Resolve" },
      { name: "description", content: "Create, edit and delete custom workflows." },
    ],
  }),
  component: WorkflowsPage,
});

const toneFor = (s: Workflow["status"]) =>
  s === "active" ? "success" : s === "draft" ? "warn" : "muted";

function WorkflowsPage() {
  const { workflows, cases, createWorkflow, updateWorkflow, deleteWorkflow, ready } = useResolve();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Workflow | null>(null);
  const [confirm, setConfirm] = useState<Workflow | null>(null);
  const [form, setForm] = useState({ name: "", description: "", status: "draft" });

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", description: "", status: "draft" });
    setOpen(true);
  };

  const openEdit = (w: Workflow) => {
    setEditing(w);
    setForm({ name: w.name, description: w.description, status: w.status });
    setOpen(true);
  };

  const submit = () => {
    if (!form.name.trim()) return;
    if (editing) {
      updateWorkflow(editing.id, { name: form.name, description: form.description, status: form.status as Workflow["status"] });
      setOpen(false);
      return;
    }
    const wf = createWorkflow({ name: form.name, description: form.description, status: form.status as Workflow["status"] });
    setOpen(false);
    navigate({ to: "/workflows/$id", params: { id: wf.id } });
  };

  return (
    <Shell breadcrumb={<Crumb parts={["Workspace", "Workflows"]} />} actions={<PrimaryButton onClick={openCreate}>+ New workflow</PrimaryButton>}>
      <div className="px-6 py-6 max-w-[1100px]">
        <div className="rise">
          <h1 className="text-2xl font-bold tracking-tight">Workflows</h1>
          <p className="text-sm text-muted mt-1">{workflows.length} workflows · {cases.length} cases running on them</p>
        </div>

        <div className="rise mt-6 space-y-2.5" style={{ animationDelay: "60ms" }}>
          {ready && workflows.length === 0 && (
            <div className="rounded-xl bg-surface backdrop-blur-xl border border-border p-8 text-center">
              <p className="text-sm font-medium">No workflows yet</p>
              <p className="text-sm text-muted mt-1">Create one to define stages, tasks and approval gates.</p>
            </div>
          )}

          {workflows.map((w) => {
            const { tasks, gates } = countNodes(w);
            const running = cases.filter((c) => c.workflowId === w.id).length;
            return (
              <div key={w.id} className="rounded-xl bg-surface backdrop-blur-xl border border-border px-4 py-3.5 flex items-center gap-4 hover:border-primary/30 transition-colors">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Link to="/workflows/$id" params={{ id: w.id }} className="text-sm font-semibold tracking-tight hover:text-primary">{w.name}</Link>
                    <Tag tone={toneFor(w.status)}>{w.status.toUpperCase()}</Tag>
                  </div>
                  <p className="text-sm text-muted mt-0.5 truncate">{w.description || "—"}</p>
                  <p className="text-[11px] font-mono text-muted mt-1">{w.stages.length} stages · {tasks} tasks · {gates} gates · {running} cases</p>
                </div>
                <div className="ml-auto flex items-center gap-1 shrink-0">
                  <Link to="/workflows/$id" params={{ id: w.id }} className="px-3 py-1.5 rounded-lg text-sm font-medium text-foreground/70 hover:bg-foreground/5">Open</Link>
                  <button onClick={() => openEdit(w)} className="px-3 py-1.5 rounded-lg text-sm font-medium text-foreground/70 hover:bg-foreground/5">Rename</button>
                  <DangerButton onClick={() => setConfirm(w)}>Delete</DangerButton>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Modal open={open} title={editing ? "Edit workflow" : "New workflow"} onClose={() => setOpen(false)}>
        <Field label="Name"><TextInput value={form.name} autoFocus placeholder="Investigation" onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Description"><TextArea value={form.description} placeholder="What this workflow is used for" onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        <Field label="Status"><Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="draft">Draft</option><option value="active">Active</option><option value="archived">Archived</option></Select></Field>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={() => setOpen(false)} className="px-3 py-2 rounded-lg text-sm font-medium text-foreground/70 hover:bg-foreground/5">Cancel</button>
          <PrimaryButton onClick={submit}>{editing ? "Save" : "Create"}</PrimaryButton>
        </div>
      </Modal>

      <Modal open={!!confirm} title="Delete workflow" onClose={() => setConfirm(null)}>
        <p className="text-sm text-muted">Deleting <span className="text-foreground font-medium">{confirm?.name}</span> also removes every case running on it. This cannot be undone.</p>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={() => setConfirm(null)} className="px-3 py-2 rounded-lg text-sm font-medium text-foreground/70 hover:bg-foreground/5">Cancel</button>
          <button onClick={() => { if (confirm) deleteWorkflow(confirm.id); setConfirm(null); }} className="px-3.5 py-2 rounded-lg text-sm font-semibold bg-danger text-primary-foreground hover:bg-danger/90">Delete</button>
        </div>
      </Modal>
    </Shell>
  );
}

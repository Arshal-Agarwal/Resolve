import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Crumb, Shell } from "@/components/Shell";
import {
  DangerButton,
  Field,
  GhostButton,
  Modal,
  PrimaryButton,
  Select,
  Tag,
  TextArea,
  TextInput,
} from "@/components/bits";
import {
  countNodes,
  uid,
  useResolve,
  type NodeKind,
  type Workflow,
  type WorkflowNode,
  type WorkflowStage,
} from "@/lib/resolve-store";

export const Route = createFileRoute("/workflows/$id")({
  head: () => ({
    meta: [
      { title: "Workflow builder — Resolve" },
      {
        name: "description",
        content: "Edit stages, nested tasks and approval gates for a custom workflow.",
      },
      { property: "og:title", content: "Workflow builder — Resolve" },
      {
        property: "og:description",
        content: "Edit stages, nested tasks and approval gates for a custom workflow.",
      },
    ],
  }),
  component: WorkflowBuilder,
});

function NodeTree({
  nodes,
  parentId,
  depth,
  onAddChild,
  onRename,
  onDelete,
}: {
  nodes: WorkflowNode[];
  parentId: string | null;
  depth: number;
  onAddChild: (parentId: string) => void;
  onRename: (node: WorkflowNode) => void;
  onDelete: (nodeId: string) => void;
}) {
  const children = nodes.filter((n) => n.parentId === parentId);
  if (children.length === 0) return null;
  return (
    <div
      className={`space-y-2 py-2 ${depth > 0 ? "ml-4 pl-4 border-l border-dashed border-border" : "ml-4 pl-4 border-l border-border"}`}
    >
      {children.map((n) => (
        <div key={n.id}>
          <div className="group flex items-center gap-2.5">
            {n.kind === "approval" ? (
              <span className="size-4 rounded bg-warn/15 text-warn grid place-items-center text-[9px] font-bold ring-1 ring-warn/30">
                A
              </span>
            ) : (
              <span className="size-4 rounded border border-border bg-surface-solid" />
            )}
            <span className={`text-sm ${n.kind === "approval" ? "font-medium" : ""}`}>
              {n.title}
            </span>
            <span className="text-[11px] font-mono text-muted">
              {n.kind === "approval" ? "gate" : "task"}
            </span>
            <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onAddChild(n.id)}
                className="text-[11px] font-mono text-muted hover:text-primary px-1.5 py-0.5 rounded"
              >
                + sub
              </button>
              <button
                onClick={() => onRename(n)}
                className="text-[11px] font-mono text-muted hover:text-foreground px-1.5 py-0.5 rounded"
              >
                edit
              </button>
              <button
                onClick={() => onDelete(n.id)}
                className="text-[11px] font-mono text-muted hover:text-danger px-1.5 py-0.5 rounded"
              >
                del
              </button>
            </div>
          </div>
          <NodeTree
            nodes={nodes}
            parentId={n.id}
            depth={depth + 1}
            onAddChild={onAddChild}
            onRename={onRename}
            onDelete={onDelete}
          />
        </div>
      ))}
    </div>
  );
}

function WorkflowBuilder() {
  const { id } = Route.useParams();
  const { workflows, cases, updateWorkflow, deleteWorkflow, ready } = useResolve();
  const navigate = useNavigate();
  const wf = workflows.find((w) => w.id === id);

  const [stageModal, setStageModal] = useState<{ open: boolean; stage: WorkflowStage | null }>({
    open: false,
    stage: null,
  });
  const [stageForm, setStageForm] = useState({ name: "", description: "" });
  const [nodeModal, setNodeModal] = useState<{
    open: boolean;
    stageId: string;
    parentId: string | null;
    node: WorkflowNode | null;
  }>({ open: false, stageId: "", parentId: null, node: null });
  const [nodeForm, setNodeForm] = useState<{ title: string; kind: NodeKind }>({
    title: "",
    kind: "task",
  });
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!ready) return null;

  if (!wf) {
    return (
      <Shell breadcrumb={<Crumb parts={["Workflows", "Unknown"]} />}>
        <div className="px-6 py-10">
          <p className="text-sm font-medium">This workflow no longer exists.</p>
          <Link to="/" className="text-sm text-primary mt-2 inline-block">
            Back to workflows
          </Link>
        </div>
      </Shell>
    );
  }

  const setStages = (stages: WorkflowStage[]) => updateWorkflow(wf.id, { stages });
  const { tasks, gates } = countNodes(wf);
  const running = cases.filter((c) => c.workflowId === wf.id);

  const saveStage = () => {
    if (!stageForm.name.trim()) return;
    if (stageModal.stage) {
      setStages(
        wf.stages.map((s) =>
          s.id === stageModal.stage!.id
            ? { ...s, name: stageForm.name, description: stageForm.description }
            : s,
        ),
      );
    } else {
      setStages([
        ...wf.stages,
        { id: uid(), name: stageForm.name, description: stageForm.description, nodes: [] },
      ]);
    }
    setStageModal({ open: false, stage: null });
  };

  const moveStage = (index: number, dir: -1 | 1) => {
    const next = [...wf.stages];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index]!, next[target]!] = [next[target]!, next[index]!];
    setStages(next);
  };

  const deleteStage = (stageId: string) => setStages(wf.stages.filter((s) => s.id !== stageId));

  const saveNode = () => {
    if (!nodeForm.title.trim()) return;
    setStages(
      wf.stages.map((s) => {
        if (s.id !== nodeModal.stageId) return s;
        if (nodeModal.node) {
          return {
            ...s,
            nodes: s.nodes.map((n) =>
              n.id === nodeModal.node!.id
                ? { ...n, title: nodeForm.title, kind: nodeForm.kind }
                : n,
            ),
          };
        }
        return {
          ...s,
          nodes: [
            ...s.nodes,
            { id: uid(), title: nodeForm.title, kind: nodeForm.kind, parentId: nodeModal.parentId },
          ],
        };
      }),
    );
    setNodeModal({ open: false, stageId: "", parentId: null, node: null });
  };

  const deleteNode = (stageId: string, nodeId: string) => {
    setStages(
      wf.stages.map((s) => {
        if (s.id !== stageId) return s;
        const doomed = new Set([nodeId]);
        let changed = true;
        while (changed) {
          changed = false;
          for (const n of s.nodes) {
            if (n.parentId && doomed.has(n.parentId) && !doomed.has(n.id)) {
              doomed.add(n.id);
              changed = true;
            }
          }
        }
        return { ...s, nodes: s.nodes.filter((n) => !doomed.has(n.id)) };
      }),
    );
  };

  const toneFor = (s: Workflow["status"]) =>
    s === "active" ? "success" : s === "draft" ? "warn" : "muted";

  return (
    <Shell
      breadcrumb={<Crumb parts={["Workflows", wf.name]} />}
      actions={
        <>
          <Select
            value={wf.status}
            onChange={(e) =>
              updateWorkflow(wf.id, { status: e.target.value as Workflow["status"] })
            }
            className="rounded-lg border border-border bg-white/70 px-2.5 py-1.5 text-sm outline-none"
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </Select>
          <GhostButton
            onClick={() => {
              setStageForm({ name: "", description: "" });
              setStageModal({ open: true, stage: null });
            }}
          >
            + Stage
          </GhostButton>
          <DangerButton onClick={() => setConfirmDelete(true)}>Delete workflow</DangerButton>
        </>
      }
    >
      <div className="px-6 py-6 max-w-[1100px]">
        <div className="rise flex items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{wf.name}</h1>
              <Tag tone={toneFor(wf.status)}>{wf.status.toUpperCase()}</Tag>
            </div>
            <p className="text-sm text-muted mt-1">
              {wf.stages.length} stages · {gates} approval gates · {tasks} tasks · {running.length}{" "}
              cases
            </p>
          </div>
          <PrimaryButton
            className="shrink-0"
            onClick={() => {
              setStageForm({ name: "", description: "" });
              setStageModal({ open: true, stage: null });
            }}
          >
            + New stage
          </PrimaryButton>
        </div>

        {wf.stages.length > 0 && (
          <div
            className="rise mt-6 rounded-xl bg-surface backdrop-blur-xl border border-border p-4"
            style={{ animationDelay: "60ms" }}
          >
            <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.15em] text-muted mb-3">
              <span className="size-1.5 rounded-full bg-primary animate-pulse" /> Conveyor · gates
              must be unlatched in order
            </div>
            <div className="flex items-center overflow-x-auto pb-1">
              {wf.stages.map((s, i) => (
                <div key={s.id} className="flex items-center shrink-0">
                  {i > 0 && <div className="w-8 h-px bg-border shrink-0" />}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="size-7 rounded-full bg-surface-solid border border-border grid place-items-center text-xs font-bold text-muted">
                      {i + 1}
                    </div>
                    <span className="text-xs font-medium">{s.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 space-y-2.5">
          {wf.stages.length === 0 && (
            <div className="rounded-xl bg-surface backdrop-blur-xl border border-border p-8 text-center">
              <p className="text-sm font-medium">No stages yet</p>
              <p className="text-sm text-muted mt-1">
                Add a stage, then nest tasks and approval gates inside it.
              </p>
            </div>
          )}

          {wf.stages.map((s, i) => (
            <div
              key={s.id}
              className="rise rounded-xl bg-surface backdrop-blur-xl border border-border overflow-hidden"
              style={{ animationDelay: `${120 + i * 60}ms` }}
            >
              <div className="flex items-center gap-3 px-4 py-3">
                <span className="size-6 rounded-full bg-surface-solid border border-border grid place-items-center text-[11px] font-bold text-muted">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{s.name}</p>
                  {s.description && <p className="text-[11px] text-muted">{s.description}</p>}
                </div>
                <span className="text-[11px] font-mono text-muted">{s.nodes.length} items</span>
                <div className="ml-auto flex items-center gap-1">
                  <button
                    onClick={() => moveStage(i, -1)}
                    className="text-[11px] font-mono text-muted hover:text-foreground px-1.5 py-0.5 rounded"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveStage(i, 1)}
                    className="text-[11px] font-mono text-muted hover:text-foreground px-1.5 py-0.5 rounded"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => {
                      setNodeForm({ title: "", kind: "task" });
                      setNodeModal({ open: true, stageId: s.id, parentId: null, node: null });
                    }}
                    className="text-[11px] font-mono text-muted hover:text-primary px-1.5 py-0.5 rounded"
                  >
                    + item
                  </button>
                  <button
                    onClick={() => {
                      setStageForm({ name: s.name, description: s.description });
                      setStageModal({ open: true, stage: s });
                    }}
                    className="text-[11px] font-mono text-muted hover:text-foreground px-1.5 py-0.5 rounded"
                  >
                    edit
                  </button>
                  <button
                    onClick={() => deleteStage(s.id)}
                    className="text-[11px] font-mono text-muted hover:text-danger px-1.5 py-0.5 rounded"
                  >
                    del
                  </button>
                </div>
              </div>
              {s.nodes.length > 0 && (
                <div className="px-4 pb-3 pt-1 border-t border-border">
                  <NodeTree
                    nodes={s.nodes}
                    parentId={null}
                    depth={0}
                    onAddChild={(parentId) => {
                      setNodeForm({ title: "", kind: "task" });
                      setNodeModal({ open: true, stageId: s.id, parentId, node: null });
                    }}
                    onRename={(node) => {
                      setNodeForm({ title: node.title, kind: node.kind });
                      setNodeModal({
                        open: true,
                        stageId: s.id,
                        parentId: node.parentId,
                        node,
                      });
                    }}
                    onDelete={(nodeId) => deleteNode(s.id, nodeId)}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <Modal
        open={stageModal.open}
        title={stageModal.stage ? "Edit stage" : "New stage"}
        onClose={() => setStageModal({ open: false, stage: null })}
      >
        <Field label="Stage name">
          <TextInput
            autoFocus
            value={stageForm.name}
            placeholder="Investigation"
            onChange={(e) => setStageForm({ ...stageForm, name: e.target.value })}
          />
        </Field>
        <Field label="Description">
          <TextArea
            value={stageForm.description}
            placeholder="What happens in this stage"
            onChange={(e) => setStageForm({ ...stageForm, description: e.target.value })}
          />
        </Field>
        <div className="flex justify-end gap-2 pt-1">
          <GhostButton onClick={() => setStageModal({ open: false, stage: null })}>
            Cancel
          </GhostButton>
          <PrimaryButton onClick={saveStage}>{stageModal.stage ? "Save" : "Add"}</PrimaryButton>
        </div>
      </Modal>

      <Modal
        open={nodeModal.open}
        title={nodeModal.node ? "Edit item" : nodeModal.parentId ? "New sub-item" : "New item"}
        onClose={() => setNodeModal({ open: false, stageId: "", parentId: null, node: null })}
      >
        <Field label="Title">
          <TextInput
            autoFocus
            value={nodeForm.title}
            placeholder="Collect evidence logs"
            onChange={(e) => setNodeForm({ ...nodeForm, title: e.target.value })}
          />
        </Field>
        <Field label="Type">
          <Select
            value={nodeForm.kind}
            onChange={(e) => setNodeForm({ ...nodeForm, kind: e.target.value as NodeKind })}
          >
            <option value="task">Task</option>
            <option value="approval">Approval gate</option>
          </Select>
        </Field>
        <div className="flex justify-end gap-2 pt-1">
          <GhostButton
            onClick={() => setNodeModal({ open: false, stageId: "", parentId: null, node: null })}
          >
            Cancel
          </GhostButton>
          <PrimaryButton onClick={saveNode}>{nodeModal.node ? "Save" : "Add"}</PrimaryButton>
        </div>
      </Modal>

      <Modal open={confirmDelete} title="Delete workflow" onClose={() => setConfirmDelete(false)}>
        <p className="text-sm text-muted">
          Deleting <span className="text-foreground font-medium">{wf.name}</span> also removes{" "}
          {running.length} case{running.length === 1 ? "" : "s"} running on it.
        </p>
        <div className="flex justify-end gap-2 pt-1">
          <GhostButton onClick={() => setConfirmDelete(false)}>Cancel</GhostButton>
          <button
            onClick={() => {
              deleteWorkflow(wf.id);
              navigate({ to: "/" });
            }}
            className="px-3.5 py-2 rounded-lg text-sm font-semibold bg-danger text-primary-foreground hover:bg-danger/90"
          >
            Delete
          </button>
        </div>
      </Modal>
    </Shell>
  );
}

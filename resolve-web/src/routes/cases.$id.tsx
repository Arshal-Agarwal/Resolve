import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
  formatBytes,
  statusLabel,
  timeAgo,
  useResolve,
  type ApprovalRequest,
  type CaseRecord,
  type WorkflowNode,
} from "@/lib/resolve-store";

export const Route = createFileRoute("/cases/$id")({
  head: () => ({
    meta: [
      { title: "Case detail — Resolve" },
      { name: "description", content: "View and progress an operational case." },
    ],
  }),
  component: CaseDetail,
});

// ---------------------------------------------------------------------------
// Tone helpers
// ---------------------------------------------------------------------------

const toneForStatus = (s: CaseRecord["status"]) => {
  switch (s) {
    case "open":
      return "primary";
    case "in_review":
      return "warn";
    case "blocked":
      return "danger";
    case "resolved":
      return "success";
    default:
      return "muted";
  }
};

const toneForPriority = (p: CaseRecord["priority"]) => {
  switch (p) {
    case "high":
      return "danger";
    case "medium":
      return "warn";
    case "low":
      return "muted";
    default:
      return "muted";
  }
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

// ---------------------------------------------------------------------------
// Checklist tree (existing component, unchanged)
// ---------------------------------------------------------------------------

function ChecklistTree({
  nodes,
  parentId,
  depth,
  caseRecord,
  onToggle,
}: {
  nodes: WorkflowNode[];
  parentId: string | null;
  depth: number;
  caseRecord: CaseRecord;
  onToggle: (nodeId: string) => void;
}) {
  const children = nodes.filter((n) => n.parentId === parentId);
  if (children.length === 0) return null;
  return (
    <div
      className={`space-y-1 py-1 ${depth > 0 ? "ml-4 pl-4 border-l border-dashed border-border" : "ml-4 pl-4 border-l border-border"}`}
    >
      {children.map((n) => {
        const isDone = caseRecord.completed.includes(n.id);
        return (
          <div key={n.id}>
            <div
              className="group flex items-center gap-2.5 cursor-pointer hover:bg-foreground/5 p-1.5 -ml-1.5 rounded transition-colors"
              onClick={() => onToggle(n.id)}
            >
              {n.kind === "approval" ? (
                <span
                  className={`size-4 rounded grid place-items-center text-[9px] font-bold ring-1 shrink-0 ${isDone ? "bg-success/15 text-success ring-success/30" : "bg-warn/15 text-warn ring-warn/30"}`}
                >
                  {isDone ? "✓" : "A"}
                </span>
              ) : (
                <span
                  className={`size-4 rounded border flex items-center justify-center text-[10px] shrink-0 ${isDone ? "bg-primary border-primary text-primary-foreground" : "border-border bg-surface-solid"}`}
                >
                  {isDone ? "✓" : ""}
                </span>
              )}
              <span
                className={`text-sm select-none ${n.kind === "approval" ? "font-medium" : ""} ${isDone ? "text-muted line-through opacity-70" : ""}`}
              >
                {n.title}
              </span>
              <span className="text-[11px] font-mono text-muted select-none shrink-0">
                {n.kind === "approval" ? "gate" : "task"}
              </span>
            </div>
            <ChecklistTree
              nodes={nodes}
              parentId={n.id}
              depth={depth + 1}
              caseRecord={caseRecord}
              onToggle={onToggle}
            />
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

type TabKey = "overview" | "comments" | "audit" | "documents" | "approvals";

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "comments", label: "Comments" },
  { key: "audit", label: "Audit" },
  { key: "documents", label: "Documents" },
  { key: "approvals", label: "Approvals" },
];

// ---------------------------------------------------------------------------
// Comments tab
// ---------------------------------------------------------------------------

function CommentsTab({ caseId }: { caseId: string }) {
  const { comments, addComment, addAuditEvent } = useResolve();
  const [body, setBody] = useState("");

  const caseComments = useMemo(
    () =>
      comments
        .filter((c) => c.caseId === caseId)
        .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)),
    [comments, caseId],
  );

  const submit = () => {
    const text = body.trim();
    if (!text) return;
    addComment(caseId, "R. Okafor", text);
    addAuditEvent(
      caseId,
      "R. Okafor",
      "Comment added",
      "comment",
      text.length > 60 ? `${text.slice(0, 60)}…` : text,
    );
    setBody("");
  };

  const renderThread = (parentId: string | null, depth: number) => {
    const items = caseComments.filter((c) => c.parentId === parentId);
    if (items.length === 0) return null;
    return items.map((c) => (
      <div key={c.id} className={depth > 0 ? "ml-9 pl-3 border-l border-border" : ""}>
        <div className="flex gap-2.5 py-2">
          <span className="size-6 rounded-full bg-primary/10 text-primary grid place-items-center text-[10px] font-bold shrink-0">
            {initials(c.author)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{c.author}</span>
              <span className="text-[10px] font-mono text-muted">{timeAgo(c.createdAt)}</span>
              {c.isEdited && (
                <span className="text-[10px] font-mono text-muted">(edited)</span>
              )}
            </div>
            <p className="text-sm text-foreground/80 mt-0.5 whitespace-pre-wrap break-words">
              {c.body}
            </p>
          </div>
        </div>
        {renderThread(c.id, depth + 1)}
      </div>
    ));
  };

  return (
    <div
      className="rise rounded-xl bg-surface backdrop-blur-xl border border-border overflow-hidden"
      style={{ animationDelay: "120ms" }}
    >
      <div className="px-4 py-3 border-b border-border">
        <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted">Discussion</p>
      </div>
      <div className="px-4 py-2 max-h-[460px] overflow-y-auto">
        {caseComments.length === 0 ? (
          <p className="text-sm text-muted text-center py-10">
            No comments yet. Start the conversation below.
          </p>
        ) : (
          renderThread(null, 0)
        )}
      </div>
      <div className="px-4 py-3 border-t border-border space-y-2">
        <TextArea
          value={body}
          placeholder="Add a comment…  (⌘/Ctrl + Enter to post)"
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <div className="flex justify-end">
          <PrimaryButton onClick={submit} disabled={!body.trim()}>
            Comment
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Audit tab
// ---------------------------------------------------------------------------

function AuditTab({ caseId }: { caseId: string }) {
  const { auditEvents } = useResolve();

  const events = useMemo(
    () =>
      auditEvents
        .filter((e) => e.caseId === caseId)
        .sort((a, b) => +new Date(a.timestamp) - +new Date(b.timestamp)),
    [auditEvents, caseId],
  );

  return (
    <div
      className="rise rounded-xl bg-surface backdrop-blur-xl border border-border overflow-hidden"
      style={{ animationDelay: "120ms" }}
    >
      <div className="px-4 py-3 border-b border-border">
        <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted">
          Audit Timeline
        </p>
      </div>
      <div className="px-4 py-4">
        {events.length === 0 ? (
          <p className="text-sm text-muted text-center py-10">No activity recorded yet.</p>
        ) : (
          <div className="relative">
            <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />
            <div className="space-y-4">
              {events.map((e) => (
                <div key={e.id} className="relative flex gap-3">
                  <span className="size-6 rounded-full bg-surface-solid border border-border text-muted grid place-items-center text-[10px] font-bold shrink-0 z-10">
                    {initials(e.actor)}
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{e.actor}</span>
                      <span className="text-sm text-foreground/80">{e.action}</span>
                    </div>
                    <p className="text-[11px] text-muted mt-0.5">{e.details}</p>
                    <p className="text-[10px] font-mono text-muted mt-0.5">
                      {timeAgo(e.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Documents tab
// ---------------------------------------------------------------------------

const MIME_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  csv: "text/csv",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  txt: "text/plain",
};

function mimeFor(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
}

function DocumentsTab({ caseId }: { caseId: string }) {
  const { documents, addDocument, addAuditEvent } = useResolve();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [filename, setFilename] = useState("");
  const [sizeKb, setSizeKb] = useState("");

  const caseDocs = useMemo(
    () =>
      documents
        .filter((d) => d.caseId === caseId)
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [documents, caseId],
  );

  const submitUpload = () => {
    const name = filename.trim();
    if (!name) return;
    const kb = Number(sizeKb) || 1;
    const bytes = Math.max(1, Math.round(kb * 1024));
    addDocument(caseId, name, mimeFor(name), bytes, "R. Okafor");
    addAuditEvent(
      caseId,
      "R. Okafor",
      "Document uploaded",
      "document",
      `${name} (${formatBytes(bytes)})`,
    );
    setFilename("");
    setSizeKb("");
    setUploadOpen(false);
  };

  return (
    <>
      <div
        className="rise rounded-xl bg-surface backdrop-blur-xl border border-border overflow-hidden"
        style={{ animationDelay: "120ms" }}
      >
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted">
            Documents
          </p>
          <GhostButton onClick={() => setUploadOpen(true)} className="text-xs">
            + Upload
          </GhostButton>
        </div>
        {caseDocs.length === 0 ? (
          <p className="text-sm text-muted text-center py-10">No documents uploaded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted text-left">
                  <th className="px-4 py-2 font-normal">Filename</th>
                  <th className="px-4 py-2 font-normal">Size</th>
                  <th className="px-4 py-2 font-normal">Uploaded by</th>
                  <th className="px-4 py-2 font-normal">Scan</th>
                  <th className="px-4 py-2 font-normal text-right">Added</th>
                </tr>
              </thead>
              <tbody>
                {caseDocs.map((d) => (
                  <tr key={d.id} className="border-t border-border hover:bg-foreground/5">
                    <td className="px-4 py-2.5 font-medium">{d.filename}</td>
                    <td className="px-4 py-2.5 text-muted font-mono text-xs">
                      {formatBytes(d.sizeBytes)}
                    </td>
                    <td className="px-4 py-2.5 text-muted">{d.uploadedBy}</td>
                    <td className="px-4 py-2.5">
                      <Tag tone={d.scanStatus === "clean" ? "success" : "warn"}>
                        {d.scanStatus}
                      </Tag>
                    </td>
                    <td className="px-4 py-2.5 text-muted font-mono text-xs text-right">
                      {timeAgo(d.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={uploadOpen} title="Upload document" onClose={() => setUploadOpen(false)}>
        <Field label="Filename">
          <TextInput
            value={filename}
            autoFocus
            placeholder="evidence_package.pdf"
            onChange={(e) => setFilename(e.target.value)}
          />
        </Field>
        <Field label="Size (KB)">
          <TextInput
            type="number"
            min="1"
            value={sizeKb}
            placeholder="250"
            onChange={(e) => setSizeKb(e.target.value)}
          />
        </Field>
        <p className="text-[11px] text-muted">
          File scan runs automatically on upload and reports back as pending.
        </p>
        <div className="flex justify-end gap-2 pt-1">
          <GhostButton onClick={() => setUploadOpen(false)}>Cancel</GhostButton>
          <PrimaryButton onClick={submitUpload} disabled={!filename.trim()}>
            Upload
          </PrimaryButton>
        </div>
      </Modal>
    </>
  );
}

// ---------------------------------------------------------------------------
// Approvals tab
// ---------------------------------------------------------------------------

function ApprovalsTab({ caseId }: { caseId: string }) {
  const { approvals, approveRequest, rejectRequest, addAuditEvent } = useResolve();
  const [notes, setNotes] = useState<Record<string, string>>({});

  const caseApprovals = useMemo(
    () =>
      approvals
        .filter((a) => a.caseId === caseId)
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [approvals, caseId],
  );

  const decide = (a: ApprovalRequest, decision: "approved" | "rejected") => {
    const note = (notes[a.id] ?? "").trim();
    if (decision === "approved") approveRequest(a.id, note);
    else rejectRequest(a.id, note);
    addAuditEvent(
      caseId,
      "R. Okafor",
      decision === "approved" ? "Approval approved" : "Approval rejected",
      "approval",
      note || (decision === "approved" ? "Approved without notes" : "Rejected without notes"),
    );
    setNotes((n) => ({ ...n, [a.id]: "" }));
  };

  return (
    <div
      className="rise rounded-xl bg-surface backdrop-blur-xl border border-border overflow-hidden"
      style={{ animationDelay: "120ms" }}
    >
      <div className="px-4 py-3 border-b border-border">
        <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted">
          Approval Requests
        </p>
      </div>
      <div className="px-4 py-3 space-y-3">
        {caseApprovals.length === 0 ? (
          <p className="text-sm text-muted text-center py-10">
            No approval requests for this case.
          </p>
        ) : (
          caseApprovals.map((a) => {
            const tone =
              a.status === "approved" ? "success" : a.status === "rejected" ? "danger" : "warn";
            return (
              <div key={a.id} className="rounded-lg border border-border p-3 bg-surface-solid">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{a.reason}</span>
                  <Tag tone={tone}>{a.status}</Tag>
                </div>
                <div className="flex items-center gap-2 mt-1.5 text-[11px] font-mono text-muted flex-wrap">
                  <span>Requester: {a.requestedBy}</span>
                  <span className="text-muted/50">·</span>
                  <span>Approver: {a.approver}</span>
                  <span className="text-muted/50">·</span>
                  <span>{timeAgo(a.createdAt)}</span>
                </div>

                {a.status === "pending" ? (
                  <div className="mt-3 space-y-2">
                    <TextArea
                      value={notes[a.id] ?? ""}
                      placeholder="Decision notes (optional)…"
                      onChange={(e) =>
                        setNotes((n) => ({ ...n, [a.id]: e.target.value }))
                      }
                    />
                    <div className="flex gap-2">
                      <PrimaryButton onClick={() => decide(a, "approved")}>
                        Approve
                      </PrimaryButton>
                      <DangerButton onClick={() => decide(a, "rejected")}>
                        Reject
                      </DangerButton>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 rounded-md bg-foreground/5 px-3 py-2">
                    <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted">
                      Decision notes
                    </p>
                    <p className="text-sm mt-1">{a.decisionNotes || "No notes provided."}</p>
                    {a.decidedAt && (
                      <p className="text-[10px] font-mono text-muted mt-1">
                        Decided {timeAgo(a.decidedAt)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Case detail
// ---------------------------------------------------------------------------

function CaseDetail() {
  const { id } = Route.useParams();
  const {
    workflows,
    cases,
    comments,
    auditEvents,
    documents,
    approvals,
    updateCase,
    deleteCase,
    toggleNode,
    ready,
  } = useResolve();
  const navigate = useNavigate();
  const caseRecord = cases.find((c) => c.id === id);
  const workflow = workflows.find((w) => w.id === caseRecord?.workflowId);

  const [editModal, setEditModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  const [form, setForm] = useState({
    title: "",
    summary: "",
    priority: "medium",
    owner: "",
  });

  if (!ready) return null;

  if (!caseRecord) {
    return (
      <Shell breadcrumb={<Crumb parts={["Cases", "Unknown"]} />}>
        <div className="px-6 py-10">
          <p className="text-sm font-medium">This case no longer exists.</p>
          <Link to="/cases" className="text-sm text-primary mt-2 inline-block">
            Back to cases
          </Link>
        </div>
      </Shell>
    );
  }

  const openEdit = () => {
    setForm({
      title: caseRecord.title,
      summary: caseRecord.summary,
      priority: caseRecord.priority,
      owner: caseRecord.owner,
    });
    setEditModal(true);
  };

  const saveEdit = () => {
    if (!form.title.trim()) return;
    updateCase(caseRecord.id, {
      title: form.title,
      summary: form.summary,
      priority: form.priority as CaseRecord["priority"],
      owner: form.owner,
    });
    setEditModal(false);
  };

  const advanceStage = (dir: 1 | -1) => {
    if (!workflow) return;
    const newIdx = caseRecord.stageIndex + dir;
    if (newIdx >= 0 && newIdx < workflow.stages.length) {
      updateCase(caseRecord.id, { stageIndex: newIdx });
    }
  };

  // Counts for tab badges
  const commentCount = comments.filter((c) => c.caseId === caseRecord.id).length;
  const auditCount = auditEvents.filter((e) => e.caseId === caseRecord.id).length;
  const docCount = documents.filter((d) => d.caseId === caseRecord.id).length;
  const pendingApprovals = approvals.filter(
    (a) => a.caseId === caseRecord.id && a.status === "pending",
  ).length;

  const countFor = (key: TabKey): number | null => {
    switch (key) {
      case "comments":
        return commentCount;
      case "audit":
        return auditCount;
      case "documents":
        return docCount;
      case "approvals":
        return pendingApprovals;
      default:
        return null;
    }
  };

  return (
    <Shell
      breadcrumb={<Crumb parts={["Cases", caseRecord.ref]} />}
      actions={
        <>
          <Select
            value={caseRecord.status}
            onChange={(e) =>
              updateCase(caseRecord.id, { status: e.target.value as CaseRecord["status"] })
            }
            className="rounded-lg border border-border bg-white/70 px-2.5 py-1.5 text-sm outline-none"
          >
            <option value="open">Open</option>
            <option value="in_review">In Review</option>
            <option value="blocked">Blocked</option>
            <option value="resolved">Resolved</option>
          </Select>
          <GhostButton onClick={openEdit}>Edit</GhostButton>
          <DangerButton onClick={() => setConfirmDelete(true)}>Delete case</DangerButton>
        </>
      }
    >
      <div className="px-6 py-6 max-w-[1100px]">
        {/* Header / case info */}
        <div className="rise flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{caseRecord.title}</h1>
              <Tag tone={toneForStatus(caseRecord.status)}>{statusLabel[caseRecord.status]}</Tag>
            </div>
            <p className="text-sm text-muted mt-1 max-w-2xl">
              {caseRecord.summary || "No summary provided."}
            </p>
            <div className="flex items-center gap-3 mt-3">
              <div className="text-[11px] font-mono text-muted uppercase tracking-[0.05em]">
                Workflow:{" "}
                <span className="font-medium text-foreground">
                  {workflow?.name || "Deleted Workflow"}
                </span>
              </div>
              <div className="text-[11px] font-mono text-muted uppercase tracking-[0.05em]">
                Priority:{" "}
                <span className={`font-medium text-${toneForPriority(caseRecord.priority)}`}>
                  {caseRecord.priority}
                </span>
              </div>
              <div className="text-[11px] font-mono text-muted uppercase tracking-[0.05em]">
                Owner:{" "}
                <span className="font-medium text-foreground">
                  {caseRecord.owner || "Unassigned"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Conveyor */}
        {workflow && workflow.stages.length > 0 && (
          <div
            className="rise mt-6 rounded-xl bg-surface backdrop-blur-xl border border-border p-4"
            style={{ animationDelay: "60ms" }}
          >
            <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.15em] text-muted mb-3">
              <span className="size-1.5 rounded-full bg-primary animate-pulse" /> Case Progress
            </div>
            <div className="flex items-center overflow-x-auto pb-1">
              {workflow.stages.map((s, i) => {
                const isActive = i === caseRecord.stageIndex;
                const isPast = i < caseRecord.stageIndex;

                return (
                  <div key={s.id} className="flex items-center shrink-0">
                    {i > 0 && (
                      <div
                        className={`w-8 h-px shrink-0 ${isPast || isActive ? "bg-primary/50" : "bg-border"}`}
                      />
                    )}
                    <div className="flex items-center gap-2 shrink-0">
                      <div
                        className={`size-7 rounded-full grid place-items-center text-xs font-bold transition-colors ${
                          isActive
                            ? "bg-primary text-primary-foreground shadow-sm ring-4 ring-primary/10"
                            : isPast
                              ? "bg-success text-primary-foreground"
                              : "bg-surface-solid border border-border text-muted"
                        }`}
                      >
                        {isPast ? "✓" : i + 1}
                      </div>
                      <span
                        className={`text-xs ${isActive ? "font-bold text-foreground" : "font-medium text-muted"}`}
                      >
                        {s.name}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab bar */}
        <div className="rise mt-6" style={{ animationDelay: "100ms" }}>
          <div className="flex items-center gap-1 border-b border-border overflow-x-auto">
            {TABS.map((t) => {
              const active = activeTab === t.key;
              const count = countFor(t.key);
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2 whitespace-nowrap ${
                    active
                      ? "border-primary text-primary"
                      : "border-transparent text-muted hover:text-foreground"
                  }`}
                >
                  {t.label}
                  {count !== null && count > 0 && (
                    <span
                      className={`text-[10px] font-mono ${active ? "text-primary/60" : "text-muted/60"}`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div className="mt-4">
            {activeTab === "overview" &&
              (workflow ? (
                <div
                  className="rise rounded-xl bg-surface backdrop-blur-xl border border-border overflow-hidden"
                  style={{ animationDelay: "120ms" }}
                >
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-surface-solid">
                    <span className="size-6 rounded-full bg-primary text-primary-foreground grid place-items-center text-[11px] font-bold">
                      {caseRecord.stageIndex + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">
                        {workflow.stages[caseRecord.stageIndex]?.name || "Unknown stage"}
                      </p>
                      {workflow.stages[caseRecord.stageIndex]?.description && (
                        <p className="text-[11px] text-muted">
                          {workflow.stages[caseRecord.stageIndex]?.description}
                        </p>
                      )}
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      <button
                        onClick={() => advanceStage(-1)}
                        disabled={caseRecord.stageIndex === 0}
                        className="text-[11px] font-mono text-muted hover:text-foreground px-2 py-1 rounded disabled:opacity-30 disabled:hover:text-muted bg-foreground/5 hover:bg-foreground/10 transition-colors"
                      >
                        ← Prev stage
                      </button>
                      <button
                        onClick={() => advanceStage(1)}
                        disabled={caseRecord.stageIndex === workflow.stages.length - 1}
                        className="text-[11px] font-mono text-primary hover:text-primary px-2 py-1 rounded disabled:opacity-30 disabled:hover:text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
                      >
                        Next stage →
                      </button>
                    </div>
                  </div>
                  <div className="px-4 pb-4 pt-2 min-h-[200px]">
                    {workflow.stages[caseRecord.stageIndex]?.nodes.length === 0 ? (
                      <p className="text-sm text-muted text-center mt-8">
                        No items in this stage.
                      </p>
                    ) : (
                      <ChecklistTree
                        nodes={workflow.stages[caseRecord.stageIndex]?.nodes || []}
                        parentId={null}
                        depth={0}
                        caseRecord={caseRecord}
                        onToggle={(nodeId) => toggleNode(caseRecord.id, nodeId)}
                      />
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-surface backdrop-blur-xl border border-border p-8 text-center">
                  <p className="text-sm font-medium">Workflow missing</p>
                  <p className="text-sm text-muted mt-1">
                    The workflow for this case has been deleted.
                  </p>
                </div>
              ))}

            {activeTab === "comments" && <CommentsTab caseId={caseRecord.id} />}
            {activeTab === "audit" && <AuditTab caseId={caseRecord.id} />}
            {activeTab === "documents" && <DocumentsTab caseId={caseRecord.id} />}
            {activeTab === "approvals" && <ApprovalsTab caseId={caseRecord.id} />}
          </div>
        </div>
      </div>

      {/* Edit modal */}
      <Modal open={editModal} title="Edit case" onClose={() => setEditModal(false)}>
        <Field label="Title">
          <TextInput
            value={form.title}
            autoFocus
            placeholder="Case title"
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </Field>
        <Field label="Summary">
          <TextArea
            value={form.summary}
            placeholder="Brief description"
            onChange={(e) => setForm({ ...form, summary: e.target.value })}
          />
        </Field>
        <Field label="Priority">
          <Select
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value })}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </Select>
        </Field>
        <Field label="Owner">
          <TextInput
            value={form.owner}
            placeholder="Unassigned"
            onChange={(e) => setForm({ ...form, owner: e.target.value })}
          />
        </Field>
        <div className="flex justify-end gap-2 pt-1">
          <GhostButton onClick={() => setEditModal(false)}>Cancel</GhostButton>
          <PrimaryButton onClick={saveEdit}>Save</PrimaryButton>
        </div>
      </Modal>

      {/* Delete modal */}
      <Modal open={confirmDelete} title="Delete case" onClose={() => setConfirmDelete(false)}>
        <p className="text-sm text-muted">
          Deleting case <span className="text-foreground font-medium">{caseRecord.ref}</span> cannot
          be undone.
        </p>
        <div className="flex justify-end gap-2 pt-1">
          <GhostButton onClick={() => setConfirmDelete(false)}>Cancel</GhostButton>
          <button
            onClick={() => {
              deleteCase(caseRecord.id);
              navigate({ to: "/cases" });
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

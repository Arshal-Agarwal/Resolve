import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
import { statusLabel, timeAgo, useResolve, type CaseRecord } from "@/lib/resolve-store";

export const Route = createFileRoute("/cases/")({
  head: () => ({
    meta: [
      { title: "Cases — Resolve" },
      { name: "description", content: "Manage and track all operational cases." },
    ],
  }),
  component: CasesPage,
});

const toneForStatus = (s: CaseRecord["status"]) => {
  switch (s) {
    case "open": return "primary" as const;
    case "in_review": return "warn" as const;
    case "blocked": return "danger" as const;
    case "resolved": return "success" as const;
    default: return "muted" as const;
  }
};

const toneForPriority = (p: CaseRecord["priority"]) => {
  switch (p) {
    case "high": return "danger" as const;
    case "medium": return "warn" as const;
    case "low": return "muted" as const;
    default: return "muted" as const;
  }
};

const STATUS_TABS = ["all", "open", "in_review", "blocked", "resolved"] as const;
type StatusTab = (typeof STATUS_TABS)[number];

function CasesPage() {
  const { workflows, cases, createCase, updateCase, deleteCase, ready } = useResolve();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CaseRecord | null>(null);
  const [confirm, setConfirm] = useState<CaseRecord | null>(null);

  const [form, setForm] = useState({ title: "", summary: "", workflowId: "", priority: "medium", owner: "" });

  // Filters
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [workflowFilter, setWorkflowFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    return cases.filter((c) => {
      if (statusTab !== "all" && c.status !== statusTab) return false;
      if (priorityFilter !== "all" && c.priority !== priorityFilter) return false;
      if (workflowFilter !== "all" && c.workflowId !== workflowFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!c.ref.toLowerCase().includes(q) && !c.title.toLowerCase().includes(q) && !c.summary.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [cases, statusTab, priorityFilter, workflowFilter, search]);

  const openCreate = () => {
    setEditing(null);
    setForm({ title: "", summary: "", workflowId: workflows.length > 0 ? workflows[0]?.id ?? "" : "", priority: "medium", owner: "" });
    setOpen(true);
  };

  const openEdit = (c: CaseRecord) => {
    setEditing(c);
    setForm({ title: c.title, summary: c.summary, workflowId: c.workflowId, priority: c.priority, owner: c.owner });
    setOpen(true);
  };

  const submit = () => {
    if (!form.title.trim() || !form.workflowId) return;
    if (editing) {
      updateCase(editing.id, { title: form.title, summary: form.summary, workflowId: form.workflowId, priority: form.priority as CaseRecord["priority"], owner: form.owner });
      setOpen(false);
      return;
    }
    const newCase = createCase({ title: form.title, summary: form.summary, workflowId: form.workflowId, priority: form.priority as CaseRecord["priority"], owner: form.owner });
    setOpen(false);
    navigate({ to: "/cases/$id", params: { id: newCase.id } });
  };

  const tabCount = (tab: StatusTab) => tab === "all" ? cases.length : cases.filter((c) => c.status === tab).length;

  return (
    <Shell breadcrumb={<Crumb parts={["Workspace", "Cases"]} />} actions={<PrimaryButton onClick={openCreate} disabled={workflows.length === 0}>+ New case</PrimaryButton>}>
      <div className="px-6 py-6 max-w-[1100px]">
        <div className="rise">
          <h1 className="text-2xl font-bold tracking-tight">Cases</h1>
          <p className="text-sm text-muted mt-1">{cases.length} cases total · {filtered.length} shown</p>
        </div>

        {/* Search + filters */}
        <div className="rise mt-4 flex flex-wrap items-center gap-2" style={{ animationDelay: "40ms" }}>
          <div className="relative flex-1 min-w-[200px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ref, title or summary..."
              className="w-full rounded-lg border border-border bg-white/70 pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40"
            />
          </div>
          <Select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="rounded-lg border border-border bg-white/70 px-2.5 py-2 text-sm outline-none min-w-[110px]">
            <option value="all">All priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </Select>
          <Select value={workflowFilter} onChange={(e) => setWorkflowFilter(e.target.value)} className="rounded-lg border border-border bg-white/70 px-2.5 py-2 text-sm outline-none min-w-[130px]">
            <option value="all">All workflows</option>
            {workflows.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </Select>
        </div>

        {/* Status tabs */}
        <div className="rise mt-3 flex items-center gap-1 border-b border-border" style={{ animationDelay: "80ms" }}>
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusTab(tab)}
              className={`px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${statusTab === tab ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"}`}
            >
              {tab === "all" ? "All" : statusLabel[tab].replace("_", " ")}
              <span className="ml-1.5 text-[10px] font-mono text-muted">{tabCount(tab)}</span>
            </button>
          ))}
        </div>

        {/* Case list */}
        <div className="mt-4 space-y-2.5">
          {ready && filtered.length === 0 && (
            <div className="rounded-xl bg-surface backdrop-blur-xl border border-border p-8 text-center">
              <p className="text-sm font-medium">{cases.length === 0 ? "No cases yet" : "No cases match your filters"}</p>
              <p className="text-sm text-muted mt-1">{cases.length === 0 ? "Create one to start tracking a workflow instance." : "Try adjusting your search or filters."}</p>
            </div>
          )}

          {filtered.map((c) => {
            const workflow = workflows.find((w) => w.id === c.workflowId);
            const stageName = workflow?.stages[c.stageIndex]?.name || "Unknown";
            return (
              <div key={c.id} className="rise rounded-xl bg-surface backdrop-blur-xl border border-border px-4 py-3.5 flex items-center gap-4 hover:border-primary/30 transition-colors">
                <div className="w-24 shrink-0 text-sm font-mono font-medium text-muted">{c.ref}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link to="/cases/$id" params={{ id: c.id }} className="text-sm font-semibold tracking-tight hover:text-primary">{c.title}</Link>
                    <Tag tone={toneForStatus(c.status)}>{statusLabel[c.status]}</Tag>
                    <Tag tone={toneForPriority(c.priority)}>{c.priority.toUpperCase()}</Tag>
                  </div>
                  <p className="text-sm text-muted mt-0.5 truncate">{c.summary || "—"}</p>
                  <p className="text-[11px] font-mono text-muted mt-1">{workflow?.name || "Deleted"} · {stageName} · {c.owner || "Unassigned"} · {timeAgo(c.createdAt)}</p>
                </div>
                <div className="ml-auto flex items-center gap-1 shrink-0">
                  <Link to="/cases/$id" params={{ id: c.id }} className="px-3 py-1.5 rounded-lg text-sm font-medium text-foreground/70 hover:bg-foreground/5">Open</Link>
                  <button onClick={() => openEdit(c)} className="px-3 py-1.5 rounded-lg text-sm font-medium text-foreground/70 hover:bg-foreground/5">Edit</button>
                  <DangerButton onClick={() => setConfirm(c)}>Delete</DangerButton>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Modal open={open} title={editing ? "Edit case" : "New case"} onClose={() => setOpen(false)}>
        <Field label="Title"><TextInput value={form.title} autoFocus placeholder="Case title" onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
        <Field label="Summary"><TextArea value={form.summary} placeholder="Brief description" onChange={(e) => setForm({ ...form, summary: e.target.value })} /></Field>
        <Field label="Workflow"><Select value={form.workflowId} onChange={(e) => setForm({ ...form, workflowId: e.target.value })} disabled={!!editing}>{workflows.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</Select></Field>
        <Field label="Priority"><Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></Select></Field>
        <Field label="Owner"><TextInput value={form.owner} placeholder="Unassigned" onChange={(e) => setForm({ ...form, owner: e.target.value })} /></Field>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={() => setOpen(false)} className="px-3 py-2 rounded-lg text-sm font-medium text-foreground/70 hover:bg-foreground/5">Cancel</button>
          <PrimaryButton onClick={submit}>{editing ? "Save" : "Create"}</PrimaryButton>
        </div>
      </Modal>

      <Modal open={!!confirm} title="Delete case" onClose={() => setConfirm(null)}>
        <p className="text-sm text-muted">Deleting case <span className="text-foreground font-medium">{confirm?.ref}</span> cannot be undone.</p>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={() => setConfirm(null)} className="px-3 py-2 rounded-lg text-sm font-medium text-foreground/70 hover:bg-foreground/5">Cancel</button>
          <button onClick={() => { if (confirm) deleteCase(confirm.id); setConfirm(null); }} className="px-3.5 py-2 rounded-lg text-sm font-semibold bg-danger text-primary-foreground hover:bg-danger/90">Delete</button>
        </div>
      </Modal>
    </Shell>
  );
}

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NodeKind = "task" | "approval";

export interface WorkflowNode {
  id: string;
  kind: NodeKind;
  title: string;
  parentId: string | null;
}

export interface WorkflowStage {
  id: string;
  name: string;
  description: string;
  nodes: WorkflowNode[];
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  status: "active" | "draft" | "archived";
  stages: WorkflowStage[];
  createdAt: string;
}

export type CaseStatus = "open" | "in_review" | "blocked" | "resolved";

export interface CaseRecord {
  id: string;
  ref: string;
  title: string;
  summary: string;
  workflowId: string;
  stageIndex: number;
  status: CaseStatus;
  priority: "low" | "medium" | "high";
  owner: string;
  completed: string[];
  createdAt: string;
}

export interface Comment {
  id: string;
  caseId: string;
  author: string;
  body: string;
  parentId: string | null;
  createdAt: string;
  isEdited: boolean;
}

export interface AuditEvent {
  id: string;
  caseId: string;
  actor: string;
  action: string;
  resourceType: "case" | "task" | "approval" | "document" | "comment" | "stage";
  details: string;
  timestamp: string;
}

export interface DocumentRecord {
  id: string;
  caseId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string;
  createdAt: string;
  scanStatus: "clean" | "pending";
}

export interface Notification {
  id: string;
  type: "case_assigned" | "approval_requested" | "case_resolved" | "mention";
  title: string;
  body: string;
  relatedResourceId: string;
  isRead: boolean;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: "Administrator" | "Manager" | "Investigator" | "Reviewer";
  status: "active" | "disabled";
  teamId: string | null;
}

export interface Team {
  id: string;
  name: string;
  description: string;
}

export interface ApprovalRequest {
  id: string;
  caseId: string;
  requestedBy: string;
  approver: string;
  status: "pending" | "approved" | "rejected";
  reason: string;
  decisionNotes: string | null;
  createdAt: string;
  decidedAt: string | null;
}

// ---------------------------------------------------------------------------
// Store shape
// ---------------------------------------------------------------------------

interface StoreShape {
  workflows: Workflow[];
  cases: CaseRecord[];
  comments: Comment[];
  auditEvents: AuditEvent[];
  documents: DocumentRecord[];
  notifications: Notification[];
  users: User[];
  teams: Team[];
  approvals: ApprovalRequest[];
}

const KEY = "resolve.store.v2";

export const uid = () => Math.random().toString(36).slice(2, 10);

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

function seed(): StoreShape {
  const now = Date.now();
  const iso = (offsetMin: number) => new Date(now - offsetMin * 60_000).toISOString();

  const users: User[] = [
    { id: "u-1", name: "R. Okafor", email: "okafor@resolve.io", role: "Administrator", status: "active", teamId: "t-1" },
    { id: "u-2", name: "M. Silva", email: "silva@resolve.io", role: "Investigator", status: "active", teamId: "t-2" },
    { id: "u-3", name: "A. Kul", email: "kul@resolve.io", role: "Reviewer", status: "active", teamId: "t-1" },
    { id: "u-4", name: "J. Reyes", email: "reyes@resolve.io", role: "Manager", status: "active", teamId: "t-3" },
    { id: "u-5", name: "D. Patel", email: "patel@resolve.io", role: "Investigator", status: "active", teamId: "t-2" },
    { id: "u-6", name: "L. Chen", email: "chen@resolve.io", role: "Reviewer", status: "active", teamId: "t-3" },
    { id: "u-7", name: "S. Muller", email: "mueller@resolve.io", role: "Investigator", status: "disabled", teamId: null },
  ];

  const teams: Team[] = [
    { id: "t-1", name: "Fraud & Compliance", description: "Handles regulatory and fraud cases." },
    { id: "t-2", name: "Field Investigations", description: "Front-line investigation team." },
    { id: "t-3", name: "Management Review", description: "Final approval and sign-off authority." },
  ];

  const wf1: Workflow = {
    id: "wf-investigation", name: "Investigation",
    description: "Standard investigation flow with lead sign-off before review.",
    status: "active", createdAt: iso(60000),
    stages: [
      { id: "st-1", name: "Created", description: "Case opened and triaged", nodes: [
        { id: "n-1", kind: "task", title: "Log incident details", parentId: null },
        { id: "n-2", kind: "task", title: "Tag severity level", parentId: "n-1" },
      ]},
      { id: "st-2", name: "Assigned to Investigator", description: "Ownership and SLA set", nodes: [
        { id: "n-3", kind: "task", title: "Select lead investigator", parentId: null },
        { id: "n-4", kind: "task", title: "Set SLA deadline", parentId: null },
      ]},
      { id: "st-3", name: "Investigation", description: "Evidence gathering and findings", nodes: [
        { id: "n-5", kind: "task", title: "Collect evidence logs", parentId: null },
        { id: "n-6", kind: "task", title: "Interview subject", parentId: "n-5" },
        { id: "n-7", kind: "approval", title: "Lead sign-off", parentId: null },
      ]},
      { id: "st-4", name: "Submitted for Review", description: "Packaged for manager review", nodes: [
        { id: "n-8", kind: "approval", title: "Manager approval", parentId: null },
      ]},
      { id: "st-5", name: "Resolved", description: "Audit trail sealed", nodes: [
        { id: "n-9", kind: "task", title: "Archive case file", parentId: null },
      ]},
    ],
  };

  const wf2: Workflow = {
    id: "wf-dispute", name: "Payment Dispute",
    description: "Chargeback handling with finance approval.",
    status: "draft", createdAt: iso(50000),
    stages: [
      { id: "st-d1", name: "Intake", description: "Dispute logged", nodes: [
        { id: "n-d1", kind: "task", title: "Capture transaction reference", parentId: null },
      ]},
      { id: "st-d2", name: "Finance Review", description: "Amount verified", nodes: [
        { id: "n-d2", kind: "task", title: "Verify ledger entry", parentId: null },
        { id: "n-d3", kind: "approval", title: "Finance sign-off", parentId: null },
      ]},
      { id: "st-d3", name: "Closed", description: "Outcome recorded", nodes: [
        { id: "n-d4", kind: "task", title: "Notify customer", parentId: null },
      ]},
    ],
  };

  const wf3: Workflow = {
    id: "wf-audit", name: "Compliance Audit",
    description: "Quarterly compliance audit with multi-stage sign-off.",
    status: "active", createdAt: iso(40000),
    stages: [
      { id: "st-a1", name: "Planning", description: "Scope and timeline", nodes: [
        { id: "n-a1", kind: "task", title: "Define audit scope", parentId: null },
        { id: "n-a2", kind: "task", title: "Assign audit team", parentId: null },
      ]},
      { id: "st-a2", name: "Fieldwork", description: "Evidence collection", nodes: [
        { id: "n-a3", kind: "task", title: "Collect control evidence", parentId: null },
        { id: "n-a4", kind: "task", title: "Interview process owners", parentId: null },
        { id: "n-a5", kind: "approval", title: "Lead auditor sign-off", parentId: null },
      ]},
      { id: "st-a3", name: "Reporting", description: "Findings and recommendations", nodes: [
        { id: "n-a6", kind: "task", title: "Draft audit report", parentId: null },
        { id: "n-a7", kind: "approval", title: "Committee approval", parentId: null },
      ]},
      { id: "st-a4", name: "Closed", description: "Remediation tracked", nodes: [
        { id: "n-a8", kind: "task", title: "Log remediation actions", parentId: null },
      ]},
    ],
  };

  const cases: CaseRecord[] = [
    { id: "c-1", ref: "CASE-2041", title: "Vendor dispute — Acme Corp invoice #4421",
      summary: "Supplier invoice mismatch flagged by finance ops. Amount: $48,200.",
      workflowId: wf1.id, stageIndex: 2, status: "in_review", priority: "high",
      owner: "R. Okafor", completed: ["n-1","n-2","n-3","n-4","n-5"], createdAt: iso(4320) },
    { id: "c-2", ref: "CASE-2042", title: "Server breach — region eu-west",
      summary: "Unusual access pattern detected on production cluster at 03:14 UTC.",
      workflowId: wf1.id, stageIndex: 1, status: "open", priority: "high",
      owner: "M. Silva", completed: ["n-1","n-2"], createdAt: iso(2880) },
    { id: "c-3", ref: "CASE-2043", title: "Duplicate card charge — order #88231",
      summary: "Customer charged twice for a single order. Refund pending finance approval.",
      workflowId: wf2.id, stageIndex: 1, status: "blocked", priority: "medium",
      owner: "A. Kul", completed: ["n-d1"], createdAt: iso(1440) },
    { id: "c-4", ref: "CASE-2044", title: "Q3 compliance audit — vendor onboarding",
      summary: "Quarterly compliance audit of new vendor onboarding procedures.",
      workflowId: wf3.id, stageIndex: 1, status: "open", priority: "medium",
      owner: "D. Patel", completed: ["n-a1"], createdAt: iso(720) },
    { id: "c-5", ref: "CASE-2045", title: "Phishing report — finance department",
      summary: "Three employees reported receiving phishing emails impersonating the CFO.",
      workflowId: wf1.id, stageIndex: 0, status: "open", priority: "high",
      owner: "M. Silva", completed: [], createdAt: iso(180) },
    { id: "c-6", ref: "CASE-2040", title: "Insider trading allegation — Q2",
      summary: "Flagged by surveillance system. Investigation completed, case archived.",
      workflowId: wf1.id, stageIndex: 4, status: "resolved", priority: "high",
      owner: "R. Okafor", completed: ["n-1","n-2","n-3","n-4","n-5","n-6","n-7","n-8","n-9"], createdAt: iso(10000) },
  ];

  const comments: Comment[] = [
    { id: "cm-1", caseId: "c-1", author: "R. Okafor", body: "Finance confirmed the invoice discrepancy. Vendor was overcharging for Q3 services.", parentId: null, createdAt: iso(3000), isEdited: false },
    { id: "cm-2", caseId: "c-1", author: "J. Reyes", body: "Good catch. Let's escalate this to the vendor relationship team after sign-off.", parentId: "cm-1", createdAt: iso(2880), isEdited: false },
    { id: "cm-3", caseId: "c-1", author: "R. Okafor", body: "Evidence package is ready for review. Includes email trail and ledger screenshots.", parentId: null, createdAt: iso(1200), isEdited: false },
    { id: "cm-4", caseId: "c-2", author: "M. Silva", body: "IP addresses trace to a known botnet range. Isolating the affected nodes now.", parentId: null, createdAt: iso(2400), isEdited: false },
    { id: "cm-5", caseId: "c-2", author: "D. Patel", body: "I can help with the forensic analysis. Sending you the log extraction tool.", parentId: "cm-4", createdAt: iso(2100), isEdited: false },
    { id: "cm-6", caseId: "c-3", author: "A. Kul", body: "Blocked on finance sign-off. The ledger entry has a discrepancy of $89.50 that needs clarification first.", parentId: null, createdAt: iso(600), isEdited: false },
    { id: "cm-7", caseId: "c-5", author: "M. Silva", body: "Initial triage: all three emails share the same sender domain. Likely a coordinated campaign.", parentId: null, createdAt: iso(90), isEdited: false },
  ];

  const auditEvents: AuditEvent[] = [
    { id: "ae-1", caseId: "c-1", actor: "R. Okafor", action: "Case created", resourceType: "case", resourceId: "c-1", details: "Case opened with priority HIGH", timestamp: iso(4320) },
    { id: "ae-2", caseId: "c-1", actor: "R. Okafor", action: "Task completed", resourceType: "task", resourceId: "n-1", details: "Log incident details", timestamp: iso(4200) },
    { id: "ae-3", caseId: "c-1", actor: "R. Okafor", action: "Task completed", resourceType: "task", resourceId: "n-2", details: "Tag severity level", timestamp: iso(4150) },
    { id: "ae-4", caseId: "c-1", actor: "R. Okafor", action: "Stage advanced", resourceType: "stage", resourceId: "st-2", details: "Moved to: Assigned to Investigator", timestamp: iso(4000) },
    { id: "ae-5", caseId: "c-1", actor: "R. Okafor", action: "Task completed", resourceType: "task", resourceId: "n-3", details: "Select lead investigator", timestamp: iso(3800) },
    { id: "ae-6", caseId: "c-1", actor: "R. Okafor", action: "Stage advanced", resourceType: "stage", resourceId: "st-3", details: "Moved to: Investigation", timestamp: iso(3500) },
    { id: "ae-7", caseId: "c-1", actor: "R. Okafor", action: "Task completed", resourceType: "task", resourceId: "n-5", details: "Collect evidence logs", timestamp: iso(3000) },
    { id: "ae-8", caseId: "c-1", actor: "R. Okafor", action: "Comment added", resourceType: "comment", resourceId: "cm-1", details: "Finance confirmed the invoice discrepancy", timestamp: iso(3000) },
    { id: "ae-9", caseId: "c-1", actor: "J. Reyes", action: "Comment added", resourceType: "comment", resourceId: "cm-2", details: "Escalate to vendor relationship team", timestamp: iso(2880) },
    { id: "ae-10", caseId: "c-1", actor: "R. Okafor", action: "Approval requested", resourceType: "approval", resourceId: "ap-1", details: "Lead sign-off requested from J. Reyes", timestamp: iso(2400) },
    { id: "ae-11", caseId: "c-1", actor: "R. Okafor", action: "Status changed", resourceType: "case", resourceId: "c-1", details: "open -> in_review", timestamp: iso(2400) },
    { id: "ae-12", caseId: "c-1", actor: "R. Okafor", action: "Document uploaded", resourceType: "document", resourceId: "d-1", details: "evidence_package.pdf (2.4 MB)", timestamp: iso(1200) },
    { id: "ae-13", caseId: "c-2", actor: "M. Silva", action: "Case created", resourceType: "case", resourceId: "c-2", details: "Case opened with priority HIGH", timestamp: iso(2880) },
    { id: "ae-14", caseId: "c-2", actor: "M. Silva", action: "Task completed", resourceType: "task", resourceId: "n-1", details: "Log incident details", timestamp: iso(2800) },
    { id: "ae-15", caseId: "c-2", actor: "M. Silva", action: "Stage advanced", resourceType: "stage", resourceId: "st-2", details: "Moved to: Assigned to Investigator", timestamp: iso(2500) },
    { id: "ae-16", caseId: "c-2", actor: "M. Silva", action: "Comment added", resourceType: "comment", resourceId: "cm-4", details: "IP addresses trace to botnet range", timestamp: iso(2400) },
    { id: "ae-17", caseId: "c-3", actor: "A. Kul", action: "Case created", resourceType: "case", resourceId: "c-3", details: "Case opened with priority MEDIUM", timestamp: iso(1440) },
    { id: "ae-18", caseId: "c-3", actor: "A. Kul", action: "Task completed", resourceType: "task", resourceId: "n-d1", details: "Capture transaction reference", timestamp: iso(1300) },
    { id: "ae-19", caseId: "c-3", actor: "A. Kul", action: "Status changed", resourceType: "case", resourceId: "c-3", details: "open -> blocked", timestamp: iso(600) },
    { id: "ae-20", caseId: "c-5", actor: "M. Silva", action: "Case created", resourceType: "case", resourceId: "c-5", details: "Case opened with priority HIGH", timestamp: iso(180) },
    { id: "ae-21", caseId: "c-6", actor: "R. Okafor", action: "Case resolved", resourceType: "case", resourceId: "c-6", details: "All stages completed. Audit trail sealed.", timestamp: iso(8000) },
    { id: "ae-22", caseId: "c-4", actor: "D. Patel", action: "Case created", resourceType: "case", resourceId: "c-4", details: "Case opened with priority MEDIUM", timestamp: iso(720) },
    { id: "ae-23", caseId: "c-4", actor: "D. Patel", action: "Task completed", resourceType: "task", resourceId: "n-a1", details: "Define audit scope", timestamp: iso(600) },
  ];

  const documents: DocumentRecord[] = [
    { id: "d-1", caseId: "c-1", filename: "evidence_package.pdf", mimeType: "application/pdf", sizeBytes: 2412544, uploadedBy: "R. Okafor", createdAt: iso(1200), scanStatus: "clean" },
    { id: "d-2", caseId: "c-1", filename: "invoice_4421_discrepancy.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", sizeBytes: 184320, uploadedBy: "R. Okafor", createdAt: iso(1100), scanStatus: "clean" },
    { id: "d-3", caseId: "c-2", filename: "access_logs_eu_west.csv", mimeType: "text/csv", sizeBytes: 5120000, uploadedBy: "M. Silva", createdAt: iso(2400), scanStatus: "clean" },
    { id: "d-4", caseId: "c-2", filename: "incident_report_draft.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", sizeBytes: 45056, uploadedBy: "M. Silva", createdAt: iso(200), scanStatus: "pending" },
    { id: "d-5", caseId: "c-3", filename: "transaction_88231_receipt.pdf", mimeType: "application/pdf", sizeBytes: 88064, uploadedBy: "A. Kul", createdAt: iso(1300), scanStatus: "clean" },
    { id: "d-6", caseId: "c-4", filename: "audit_scope_q3.pdf", mimeType: "application/pdf", sizeBytes: 312448, uploadedBy: "D. Patel", createdAt: iso(600), scanStatus: "clean" },
  ];

  const notifications: Notification[] = [
    { id: "nt-1", type: "approval_requested", title: "Approval needed: Lead sign-off", body: "R. Okafor requested your sign-off on CASE-2041 (Vendor dispute).", relatedResourceId: "c-1", isRead: false, createdAt: iso(2400) },
    { id: "nt-2", type: "case_assigned", title: "New case assigned", body: "You have been assigned to CASE-2045 (Phishing report — finance department).", relatedResourceId: "c-5", isRead: false, createdAt: iso(180) },
    { id: "nt-3", type: "mention", title: "You were mentioned", body: "J. Reyes mentioned you in a comment on CASE-2041.", relatedResourceId: "c-1", isRead: false, createdAt: iso(2880) },
    { id: "nt-4", type: "case_resolved", title: "Case resolved", body: "CASE-2040 (Insider trading allegation — Q2) has been resolved.", relatedResourceId: "c-6", isRead: true, createdAt: iso(8000) },
  ];

  const approvals: ApprovalRequest[] = [
    { id: "ap-1", caseId: "c-1", requestedBy: "R. Okafor", approver: "J. Reyes", status: "pending", reason: "Lead investigator sign-off required before manager review.", decisionNotes: null, createdAt: iso(2400), decidedAt: null },
    { id: "ap-2", caseId: "c-3", requestedBy: "A. Kul", approver: "J. Reyes", status: "pending", reason: "Finance sign-off needed to unblock duplicate charge refund.", decisionNotes: null, createdAt: iso(600), decidedAt: null },
    { id: "ap-3", caseId: "c-6", requestedBy: "R. Okafor", approver: "J. Reyes", status: "approved", reason: "All evidence reviewed and findings confirmed.", decisionNotes: "Approved — no further action required.", createdAt: iso(9000), decidedAt: iso(8500) },
  ];

  return { workflows: [wf1, wf2, wf3], cases, comments, auditEvents, documents, notifications, users, teams, approvals };
}

// ---------------------------------------------------------------------------
// Store API
// ---------------------------------------------------------------------------

interface StoreApi extends StoreShape {
  ready: boolean;
  createWorkflow: (input: Pick<Workflow, "name" | "description" | "status">) => Workflow;
  updateWorkflow: (id: string, patch: Partial<Workflow>) => void;
  deleteWorkflow: (id: string) => void;
  createCase: (input: Pick<CaseRecord, "title" | "summary" | "workflowId" | "priority" | "owner">) => CaseRecord;
  updateCase: (id: string, patch: Partial<CaseRecord>) => void;
  deleteCase: (id: string) => void;
  toggleNode: (caseId: string, nodeId: string) => void;
  addComment: (caseId: string, author: string, body: string, parentId?: string | null) => void;
  addAuditEvent: (caseId: string, actor: string, action: string, resourceType: AuditEvent["resourceType"], details: string) => void;
  addDocument: (caseId: string, filename: string, mimeType: string, sizeBytes: number, uploadedBy: string) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  approveRequest: (id: string, notes: string) => void;
  rejectRequest: (id: string, notes: string) => void;
}

const Ctx = createContext<StoreApi | null>(null);

export function ResolveProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoreShape>({
    workflows: [], cases: [], comments: [], auditEvents: [], documents: [],
    notifications: [], users: [], teams: [], approvals: [],
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<StoreShape>;
        setState({
          workflows: parsed.workflows ?? [],
          cases: parsed.cases ?? [],
          comments: parsed.comments ?? [],
          auditEvents: parsed.auditEvents ?? [],
          documents: parsed.documents ?? [],
          notifications: parsed.notifications ?? [],
          users: parsed.users ?? [],
          teams: parsed.teams ?? [],
          approvals: parsed.approvals ?? [],
        });
      } else {
        setState(seed());
      }
    } catch {
      setState(seed());
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(KEY, JSON.stringify(state));
  }, [state, ready]);

  const createWorkflow: StoreApi["createWorkflow"] = useCallback((input) => {
    const wf: Workflow = { id: uid(), ...input, stages: [], createdAt: new Date().toISOString() };
    setState((s) => ({ ...s, workflows: [wf, ...s.workflows] }));
    return wf;
  }, []);

  const updateWorkflow: StoreApi["updateWorkflow"] = useCallback((id, patch) => {
    setState((s) => ({ ...s, workflows: s.workflows.map((w) => (w.id === id ? { ...w, ...patch } : w)) }));
  }, []);

  const deleteWorkflow: StoreApi["deleteWorkflow"] = useCallback((id) => {
    setState((s) => ({
      ...s,
      workflows: s.workflows.filter((w) => w.id !== id),
      cases: s.cases.filter((c) => c.workflowId !== id),
    }));
  }, []);

  const createCase: StoreApi["createCase"] = useCallback((input) => {
    const rec: CaseRecord = {
      id: uid(), ref: `CASE-${Math.floor(2046 + Math.random() * 8000)}`,
      stageIndex: 0, status: "open", completed: [], createdAt: new Date().toISOString(),
      ...input,
    };
    setState((s) => ({ ...s, cases: [rec, ...s.cases] }));
    return rec;
  }, []);

  const updateCase: StoreApi["updateCase"] = useCallback((id, patch) => {
    setState((s) => ({ ...s, cases: s.cases.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  }, []);

  const deleteCase: StoreApi["deleteCase"] = useCallback((id) => {
    setState((s) => ({ ...s, cases: s.cases.filter((c) => c.id !== id) }));
  }, []);

  const toggleNode: StoreApi["toggleNode"] = useCallback((caseId, nodeId) => {
    setState((s) => ({
      ...s,
      cases: s.cases.map((c) =>
        c.id === caseId
          ? { ...c, completed: c.completed.includes(nodeId) ? c.completed.filter((n) => n !== nodeId) : [...c.completed, nodeId] }
          : c,
      ),
    }));
  }, []);

  const addComment: StoreApi["addComment"] = useCallback((caseId, author, body, parentId = null) => {
    const c: Comment = { id: uid(), caseId, author, body, parentId, createdAt: new Date().toISOString(), isEdited: false };
    setState((s) => ({ ...s, comments: [...s.comments, c] }));
  }, []);

  const addAuditEvent: StoreApi["addAuditEvent"] = useCallback((caseId, actor, action, resourceType, details) => {
    const ae: AuditEvent = { id: uid(), caseId, actor, action, resourceType, resourceId: caseId, details, timestamp: new Date().toISOString() };
    setState((s) => ({ ...s, auditEvents: [...s.auditEvents, ae] }));
  }, []);

  const addDocument: StoreApi["addDocument"] = useCallback((caseId, filename, mimeType, sizeBytes, uploadedBy) => {
    const d: DocumentRecord = { id: uid(), caseId, filename, mimeType, sizeBytes, uploadedBy, createdAt: new Date().toISOString(), scanStatus: "pending" };
    setState((s) => ({ ...s, documents: [...s.documents, d] }));
  }, []);

  const markNotificationRead: StoreApi["markNotificationRead"] = useCallback((id) => {
    setState((s) => ({ ...s, notifications: s.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)) }));
  }, []);

  const markAllNotificationsRead: StoreApi["markAllNotificationsRead"] = useCallback(() => {
    setState((s) => ({ ...s, notifications: s.notifications.map((n) => ({ ...n, isRead: true })) }));
  }, []);

  const approveRequest: StoreApi["approveRequest"] = useCallback((id, notes) => {
    setState((s) => ({
      ...s,
      approvals: s.approvals.map((a) => (a.id === id ? { ...a, status: "approved", decisionNotes: notes, decidedAt: new Date().toISOString() } : a)),
    }));
  }, []);

  const rejectRequest: StoreApi["rejectRequest"] = useCallback((id, notes) => {
    setState((s) => ({
      ...s,
      approvals: s.approvals.map((a) => (a.id === id ? { ...a, status: "rejected", decisionNotes: notes, decidedAt: new Date().toISOString() } : a)),
    }));
  }, []);

  const value = useMemo<StoreApi>(
    () => ({
      ...state, ready,
      createWorkflow, updateWorkflow, deleteWorkflow,
      createCase, updateCase, deleteCase, toggleNode,
      addComment, addAuditEvent, addDocument,
      markNotificationRead, markAllNotificationsRead,
      approveRequest, rejectRequest,
    }),
    [state, ready, createWorkflow, updateWorkflow, deleteWorkflow, createCase, updateCase, deleteCase, toggleNode, addComment, addAuditEvent, addDocument, markNotificationRead, markAllNotificationsRead, approveRequest, rejectRequest],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useResolve() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useResolve must be used inside ResolveProvider");
  return ctx;
}

export const statusLabel: Record<CaseStatus, string> = {
  open: "OPEN",
  in_review: "IN REVIEW",
  blocked: "BLOCKED",
  resolved: "RESOLVED",
};

export function countNodes(wf: Workflow | undefined) {
  if (!wf) return { tasks: 0, gates: 0 };
  let tasks = 0;
  let gates = 0;
  for (const st of wf.stages) for (const n of st.nodes) n.kind === "approval" ? gates++ : tasks++;
  return { tasks, gates };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}

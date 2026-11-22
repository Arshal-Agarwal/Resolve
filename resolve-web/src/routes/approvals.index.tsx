import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Crumb, Shell } from "@/components/Shell";
import { DangerButton, PrimaryButton, Select, Tag, TextArea } from "@/components/bits";
import { useResolve, type ApprovalRequest } from "@/lib/resolve-store";

export const Route = createFileRoute("/approvals/")({ component: ApprovalsPage });

export default function ApprovalsPage() {
  const { approvals, cases, approveRequest, rejectRequest, simulateAction, ready } = useResolve();
  const [status, setStatus] = useState("all");
  const [caseId, setCaseId] = useState("all");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const filtered = useMemo(
    () =>
      approvals
        .filter((approval) => {
          if (status !== "all" && approval.status !== status) return false;
          if (caseId !== "all" && approval.caseId !== caseId) return false;
          return true;
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [approvals, status, caseId],
  );

  const decide = (approval: ApprovalRequest, decision: "approved" | "rejected") => {
    const note = notes[approval.id]?.trim() ?? "";
    void simulateAction(
      () =>
        decision === "approved"
          ? approveRequest(approval.id, note)
          : rejectRequest(approval.id, note),
      decision === "approved" ? "Approval approved" : "Approval rejected",
      `The request was ${decision}.`,
    ).then(() => setNotes((current) => ({ ...current, [approval.id]: "" })));
  };

  if (!ready) return null;

  return (
    <Shell breadcrumb={<Crumb parts={["Operations", "Approvals"]} />}>
      <div className="mx-auto max-w-[1100px] px-6 py-6">
        <div className="rise">
          <h1 className="text-2xl font-bold tracking-tight">Approvals</h1>
          <p className="mt-1 text-sm text-muted">Review pending decisions and approval history.</p>
        </div>
        <div className="rise mt-5 flex flex-wrap gap-2">
          <Select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="expired">Expired</option>
          </Select>
          <Select value={caseId} onChange={(event) => setCaseId(event.target.value)}>
            <option value="all">All cases</option>
            {cases.map((item) => (
              <option key={item.id} value={item.id}>
                {item.ref}
              </option>
            ))}
          </Select>
        </div>
        <div className="mt-4 space-y-3">
          {filtered.map((approval) => {
            const caseRecord = cases.find((item) => item.id === approval.caseId);
            const tone =
              approval.status === "approved"
                ? "success"
                : approval.status === "rejected"
                  ? "danger"
                  : approval.status === "expired"
                    ? "muted"
                    : "warn";
            return (
              <div key={approval.id} className="rounded-xl border border-border bg-surface p-4">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Tag tone={tone}>{approval.status.toUpperCase()}</Tag>
                      {approval.expiresAt && approval.status === "pending" && (
                        <span className="font-mono text-[10px] text-muted">
                          Expires {new Date(approval.expiresAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 font-medium">{approval.reason}</p>
                    <p className="mt-1 text-xs text-muted">
                      Requested by {approval.requestedBy} · Approver {approval.approver}
                    </p>
                    {caseRecord && (
                      <Link
                        to="/cases/$id"
                        params={{ id: caseRecord.id }}
                        className="mt-2 inline-block text-xs font-medium text-primary hover:underline"
                      >
                        Open {caseRecord.ref}
                      </Link>
                    )}
                  </div>
                </div>
                {approval.status === "pending" ? (
                  <div className="mt-3 space-y-2">
                    <TextArea
                      value={notes[approval.id] ?? ""}
                      onChange={(event) =>
                        setNotes((current) => ({ ...current, [approval.id]: event.target.value }))
                      }
                      placeholder="Decision notes (optional)"
                    />
                    <div className="flex gap-2">
                      <PrimaryButton onClick={() => decide(approval, "approved")}>
                        Approve
                      </PrimaryButton>
                      <DangerButton onClick={() => decide(approval, "rejected")}>
                        Reject
                      </DangerButton>
                    </div>
                  </div>
                ) : (
                  approval.decisionNotes && (
                    <div className="mt-3 rounded-lg bg-foreground/5 px-3 py-2 text-xs text-muted">
                      Decision: {approval.decisionNotes}
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>
        {filtered.length === 0 && (
          <div className="mt-4 rounded-xl border border-border bg-surface p-10 text-center text-sm text-muted">
            No approvals match the current filters.
          </div>
        )}
      </div>
    </Shell>
  );
}

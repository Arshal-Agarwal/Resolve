import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { Crumb, Shell } from "@/components/Shell";
import { Field, Modal, PrimaryButton, Select, Tag, TextInput } from "@/components/bits";
import { formatBytes, timeAgo, useResolve } from "@/lib/resolve-store";

export const Route = createFileRoute("/documents/")({ component: DocumentsPage });

export default function DocumentsPage() {
  const { documents, cases, uploadDocument, recordAuditEvent, simulateAction, ready } =
    useResolve();
  const [query, setQuery] = useState("");
  const [scan, setScan] = useState("all");
  const [caseFilter, setCaseFilter] = useState("all");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [filename, setFilename] = useState("");
  const [size, setSize] = useState("250");
  const [caseId, setCaseId] = useState(cases[0]?.id ?? "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelected = (file: File | undefined) => {
    if (!file) return;
    setFilename(file.name);
    setSize(Math.max(1, Math.ceil(file.size / 1024)).toString());
    setUploadOpen(true);
  };

  const filtered = useMemo(
    () =>
      documents.filter((document) => {
        if (scan !== "all" && document.scanStatus !== scan) return false;
        if (caseFilter !== "all" && document.caseId !== caseFilter) return false;
        return document.filename.toLowerCase().includes(query.toLowerCase());
      }),
    [documents, query, scan, caseFilter],
  );

  if (!ready) return null;

  return (
    <Shell
      breadcrumb={<Crumb parts={["Operations", "Documents"]} />}
      actions={
        <>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(event) => handleFileSelected(event.target.files?.[0])}
          />
          <PrimaryButton onClick={() => fileInputRef.current?.click()}>
            + Upload document
          </PrimaryButton>
        </>
      }
    >
      <div className="mx-auto max-w-[1100px] px-6 py-6">
        <div className="rise">
          <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
          <p className="mt-1 text-sm text-muted">
            Case files, scan states and mock version metadata.
          </p>
        </div>
        <div className="rise mt-5 flex flex-wrap gap-2">
          <TextInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search filename"
            className="min-w-[240px] flex-1"
          />
          <Select value={scan} onChange={(event) => setScan(event.target.value)}>
            <option value="all">All scan states</option>
            <option value="pending">Pending</option>
            <option value="clean">Clean</option>
            <option value="infected">Infected</option>
            <option value="failed">Failed</option>
          </Select>
          <Select value={caseFilter} onChange={(event) => setCaseFilter(event.target.value)}>
            <option value="all">All cases</option>
            {cases.map((item) => (
              <option key={item.id} value={item.id}>
                {item.ref}
              </option>
            ))}
          </Select>
        </div>
        <div className="mt-4 overflow-hidden rounded-xl border border-border bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[10px] font-mono uppercase tracking-[0.15em] text-muted">
                  <th className="px-4 py-3">Filename</th>
                  <th className="px-4 py-3">Case</th>
                  <th className="px-4 py-3">Size</th>
                  <th className="px-4 py-3">Scan</th>
                  <th className="px-4 py-3">Uploaded</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((document) => {
                  const caseRecord = cases.find((item) => item.id === document.caseId);
                  return (
                    <tr key={document.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-medium">{document.filename}</td>
                      <td className="px-4 py-3">
                        {caseRecord ? (
                          <Link
                            to="/cases/$id"
                            params={{ id: caseRecord.id }}
                            className="text-primary"
                          >
                            {caseRecord.ref}
                          </Link>
                        ) : (
                          "Unlinked"
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted">{formatBytes(document.sizeBytes)}</td>
                      <td className="px-4 py-3">
                        <Tag
                          tone={
                            document.scanStatus === "clean"
                              ? "success"
                              : document.scanStatus === "infected" ||
                                  document.scanStatus === "failed"
                                ? "danger"
                                : "warn"
                          }
                        >
                          {document.scanStatus.toUpperCase()}
                        </Tag>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted">
                        {timeAgo(document.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="p-10 text-center text-sm text-muted">
              No documents match the current filters.
            </div>
          )}
        </div>
      </div>
      <Modal open={uploadOpen} title="Upload document" onClose={() => setUploadOpen(false)}>
        <Field label="Filename">
          <TextInput
            value={filename}
            onChange={(event) => setFilename(event.target.value)}
            placeholder="evidence-package.pdf"
          />
        </Field>
        <Field label="Size (KB)">
          <TextInput
            type="number"
            min="1"
            value={size}
            onChange={(event) => setSize(event.target.value)}
          />
        </Field>
        <Field label="Case">
          <Select value={caseId} onChange={(event) => setCaseId(event.target.value)}>
            {cases.map((item) => (
              <option key={item.id} value={item.id}>
                {item.ref} · {item.title}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex justify-end gap-2">
          <button onClick={() => setUploadOpen(false)} className="px-3 py-2 text-sm text-muted">
            Cancel
          </button>
          <PrimaryButton
            disabled={!filename.trim() || !caseId}
            onClick={() => {
              const bytes = Math.max(1, Number(size) || 1) * 1024;
              const mimeType = filename.toLowerCase().endsWith(".pdf")
                ? "application/pdf"
                : "application/octet-stream";
              void simulateAction(
                () => {
                  uploadDocument({
                    caseId,
                    filename: filename.trim(),
                    mimeType,
                    sizeBytes: bytes,
                    uploadedBy: "R. Okafor",
                  });
                  recordAuditEvent({
                    caseId,
                    actor: "R. Okafor",
                    action: "Document uploaded",
                    resourceType: "document",
                    resourceId: caseId,
                    details: `${filename.trim()} was uploaded and queued for scanning`,
                  });
                },
                "Document uploaded",
                `${filename.trim()} is pending scan.`,
              ).then(() => {
                setUploadOpen(false);
                setFilename("");
              });
            }}
          >
            Upload
          </PrimaryButton>
        </div>
      </Modal>
    </Shell>
  );
}

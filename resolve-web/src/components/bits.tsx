import type { ReactNode } from "react";

export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="rise relative w-full max-w-md rounded-xl border border-border bg-surface-solid backdrop-blur-2xl shadow-xl">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <p className="text-sm font-semibold tracking-tight">{title}</p>
          <button
            onClick={onClose}
            className="text-sm text-muted hover:text-foreground px-2 rounded-md"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

const inputCls =
  "w-full rounded-lg border border-border bg-white/70 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40";

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={inputCls} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} rows={3} className={inputCls} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={inputCls} />;
}

export function PrimaryButton({
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`px-3.5 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 ring-1 ring-primary/30 ${className}`}
    />
  );
}

export function DarkButton({
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold bg-foreground text-background hover:bg-foreground/90 ${className}`}
    />
  );
}

export function GhostButton({
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium text-foreground/70 hover:bg-foreground/5 ${className}`}
    />
  );
}

export function DangerButton({
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium text-danger/90 hover:bg-danger/10 ${className}`}
    />
  );
}

export function Tag({
  tone = "muted",
  children,
}: {
  tone?: "muted" | "primary" | "success" | "warn" | "danger";
  children: ReactNode;
}) {
  const tones: Record<string, string> = {
    muted: "bg-foreground/5 text-muted ring-foreground/10",
    primary: "bg-primary/10 text-primary ring-primary/20",
    success: "bg-success/10 text-success ring-success/20",
    warn: "bg-warn/10 text-warn ring-warn/20",
    danger: "bg-danger/10 text-danger ring-danger/20",
  };
  return (
    <span
      className={`text-[11px] font-mono px-2 py-0.5 rounded-md ring-1 whitespace-nowrap ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

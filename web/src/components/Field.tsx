import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

interface FieldShellProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  suffix?: string;
  invalid?: boolean;
  compact?: boolean;
}

export function FieldShell({ id, label, error, hint, children, suffix, invalid, compact }: FieldShellProps) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className={["inp", compact ? "txt" : "", invalid ? "invalid" : ""].filter(Boolean).join(" ")}>
        {children}
        {suffix ? <span className="u" aria-hidden="true">{suffix}</span> : null}
      </div>
      {hint ? <p id={hintId} className="field-hint">{hint}</p> : null}
      {error ? <p id={errorId} className="field-error" role="alert">{error}</p> : null}
    </div>
  );
}

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  suffix?: string;
  compact?: boolean;
};

export function Field({ id, label, error, hint, suffix, compact, ...input }: InputProps) {
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(" ") || undefined;
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} suffix={suffix} invalid={Boolean(error)} compact={compact}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...input}
      />
    </FieldShell>
  );
}

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> & {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  compact?: boolean;
  children: ReactNode;
};

export function SelectField({ id, label, error, hint, compact, children, ...sel }: SelectProps) {
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(" ") || undefined;
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} invalid={Boolean(error)} compact={compact}>
      <select id={id} aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...sel}>
        {children}
      </select>
    </FieldShell>
  );
}

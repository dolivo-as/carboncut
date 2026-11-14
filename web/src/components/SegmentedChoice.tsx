import { useRef, type KeyboardEvent, type ReactNode } from "react";

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
  description?: string;
  icon?: ReactNode;
  disabled?: boolean;
}

type Layout = "segmented" | "cards" | "tiles" | "tiles3" | "purpose";

export function SegmentedChoice<T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
  layout = "segmented",
}: {
  legend: string;
  name: string;
  value: T | null;
  options: ChoiceOption<T>[];
  onChange: (v: T) => void;
  layout?: Layout;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const enabled = options.map((o, i) => (o.disabled ? -1 : i)).filter((i) => i >= 0);

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    const current = Math.max(0, enabled.findIndex((i) => options[i].value === value));
    const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1;
    const next = enabled[(current + dir + enabled.length) % enabled.length];
    const opt = options[next];
    onChange(opt.value);
    refs.current[next]?.focus();
  }

  const cls = layout === "purpose" ? "pgrid" : layout === "tiles3" ? "grid3" : layout === "tiles" ? "grid2" : layout === "cards" ? "choice-grid" : "seg";
  const btnCls = layout === "purpose" ? "pbtn" : layout === "tiles" || layout === "tiles3" ? "tile compact" : undefined;

  return (
    <div role="radiogroup" aria-label={legend} className={cls} onKeyDown={onKey}>
      {options.map((o, i) => (
        <button
          key={o.value}
          ref={(el) => { refs.current[i] = el; }}
          type="button"
          role="radio"
          name={name}
          className={btnCls}
          aria-checked={value === o.value}
          aria-disabled={o.disabled || undefined}
          disabled={o.disabled}
          tabIndex={o.disabled ? -1 : value === o.value || (value == null && i === enabled[0]) ? 0 : -1}
          onClick={() => { if (!o.disabled) onChange(o.value); }}
        >
          {o.icon}
          {layout === "purpose" || layout === "tiles" || layout === "tiles3" ? (
            <>
              <span className="name">{o.label}</span>
              {o.description ? <span className="sub">{o.description}</span> : null}
            </>
          ) : o.description ? (
            <span>{o.label}<span className="sr">. {o.description}</span></span>
          ) : o.label}
        </button>
      ))}
    </div>
  );
}

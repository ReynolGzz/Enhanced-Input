import { useEffect, useState, type ReactNode } from "react";

export function Toggle({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      className={`toggle ${on ? "on" : ""}`}
      onClick={() => onChange(!on)}
      aria-pressed={on}
    >
      <span className="knob" />
    </button>
  );
}

export function Slider({
  value,
  min,
  max,
  step = 0.01,
  onChange,
  format,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  return (
    <div className="slider-row">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
      <span className="sval">{format ? format(value) : value.toFixed(2)}</span>
    </div>
  );
}

/// Slider paired with an editable numeric box. Both operate in the same units
/// (use `suffix` for "%", "x", "/s"...). The text box rejects letters and
/// negatives, allows up to `decimals` decimal places, clamps to [min, max], and
/// reverts to the last valid value on bad input.
export function NumberSlider({
  value,
  min,
  max,
  step = 1,
  decimals = 10,
  suffix = "",
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  decimals?: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  const trim = (n: number) => String(parseFloat(n.toFixed(decimals)));
  const [text, setText] = useState(() => trim(value));

  // Resync the box when the value changes from outside (e.g. profile load).
  useEffect(() => setText(trim(value)), [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const commit = (raw: string) => {
    const cleaned = raw.trim();
    // Non-negative decimal only — no sign, no letters.
    if (!/^\d*\.?\d*$/.test(cleaned) || cleaned === "" || cleaned === ".") {
      setText(trim(value)); // revert to last valid
      return;
    }
    let n = parseFloat(cleaned);
    if (!isFinite(n)) {
      setText(trim(value));
      return;
    }
    n = Math.min(max, Math.max(min, n));
    n = parseFloat(n.toFixed(decimals));
    onChange(n);
    setText(trim(n));
  };

  return (
    <div className="slider-row">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
      <input
        className="snum"
        inputMode="decimal"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit((e.target as HTMLInputElement).value);
        }}
      />
      {suffix && <span className="suffix">{suffix}</span>}
    </div>
  );
}

export function Select({
  value,
  options,
  onChange,
  className = "input",
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <select
      className={className}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function AdvField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="adv-field">
      <span className="lbl">{label}</span>
      {children}
    </div>
  );
}

export function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

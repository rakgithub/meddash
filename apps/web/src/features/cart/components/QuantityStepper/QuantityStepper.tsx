import { useState, type KeyboardEvent } from "react";
import styles from "./QuantityStepper.module.css";

interface QuantityStepperProps {
  value: number;
  max: number;
  onChange: (quantity: number) => void;
  /** Accessible name of the group and the input; name the product when there are several. */
  label?: string;
  disabled?: boolean;
}

const MIN = 1;

/** − / number / +. Typed values are applied on blur or Enter, clamped to 1…max. */
export function QuantityStepper({
  value,
  max,
  onChange,
  label = "Quantity",
  disabled = false,
}: QuantityStepperProps) {
  // Only set while the user is typing, so a new `value` from the parent shows without an effect.
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    if (draft === null) return;
    setDraft(null);
    const parsed = Number.parseInt(draft, 10);
    if (Number.isNaN(parsed)) return;
    const next = Math.min(max, Math.max(MIN, parsed));
    if (next !== value) onChange(next);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") commit();
    if (event.key === "Escape") setDraft(null);
  };

  return (
    <div className={styles.stepper} role="group" aria-label={label}>
      <button
        type="button"
        className={styles.button}
        aria-label="Decrease quantity"
        disabled={disabled || value <= MIN}
        onClick={() => onChange(value - 1)}
      >
        −
      </button>
      <input
        className={styles.input}
        type="number"
        inputMode="numeric"
        aria-label={label}
        min={MIN}
        max={max}
        value={draft ?? value}
        disabled={disabled}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={onKeyDown}
      />
      <button
        type="button"
        className={styles.button}
        aria-label="Increase quantity"
        disabled={disabled || value >= max}
        onClick={() => onChange(value + 1)}
      >
        +
      </button>
    </div>
  );
}

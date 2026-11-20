import { useId, useState } from "react";
import styles from "./QuantityStepper.module.css";

interface QuantityStepperProps {
  value: number;
  /** Highest allowed quantity; the lowest is always 1. */
  max: number;
  onChange: (quantity: number) => void;
  disabled?: boolean;
}

/** − / number / +, kept between 1 and `max`. */
export function QuantityStepper({ value, max, onChange, disabled = false }: QuantityStepperProps) {
  const id = useId();
  // What the user is typing; null shows `value`. Lets the field be empty mid-edit without
  // reporting an invalid quantity; blurring snaps back to the last valid one.
  const [draft, setDraft] = useState<string | null>(null);

  function handleInput(text: string) {
    setDraft(text);
    const quantity = Number(text);
    if (text !== "" && Number.isInteger(quantity) && quantity >= 1 && quantity <= max) {
      onChange(quantity);
    }
  }

  return (
    <div className={styles.stepper}>
      <label className="visually-hidden" htmlFor={id}>
        Quantity
      </label>
      <button
        type="button"
        className={styles.step}
        aria-label="Decrease quantity"
        disabled={disabled || value <= 1}
        onClick={() => onChange(value - 1)}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M3.5 8h9" />
        </svg>
      </button>
      <input
        id={id}
        className={styles.input}
        type="number"
        inputMode="numeric"
        min={1}
        max={max}
        step={1}
        value={draft ?? String(value)}
        disabled={disabled}
        onChange={(event) => handleInput(event.target.value)}
        onBlur={() => setDraft(null)}
      />
      <button
        type="button"
        className={styles.step}
        aria-label="Increase quantity"
        disabled={disabled || value >= max}
        onClick={() => onChange(value + 1)}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M3.5 8h9M8 3.5v9" />
        </svg>
      </button>
    </div>
  );
}

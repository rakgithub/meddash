import { useId, useState, type KeyboardEvent } from "react";
import styles from "./QuantityStepper.module.css";

interface QuantityStepperProps {
  value: number;
  /** Highest allowed quantity; the lowest is always 1. */
  max: number;
  onChange: (quantity: number) => void;
  /** Accessible name of the input; name the product when a page has several steppers. */
  label?: string;
  disabled?: boolean;
}

/** − / number / +, kept between 1 and `max`. */
export function QuantityStepper({
  value,
  max,
  onChange,
  label = "Quantity",
  disabled = false,
}: QuantityStepperProps) {
  const id = useId();
  // What the user is typing; null shows `value`. A typed quantity is reported on blur or
  // Enter, not per keystroke: on the cart page each change is a request, so typing "10"
  // must not send 1 first. An invalid entry snaps back to the last valid one.
  const [draft, setDraft] = useState<string | null>(null);

  function commit() {
    if (draft === null) return;
    setDraft(null);
    const quantity = Number(draft);
    const valid = draft !== "" && Number.isInteger(quantity) && quantity >= 1 && quantity <= max;
    if (valid && quantity !== value) onChange(quantity);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") commit();
    if (event.key === "Escape") setDraft(null);
  }

  return (
    <div className={styles.stepper}>
      <label className="visually-hidden" htmlFor={id}>
        {label}
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
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
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

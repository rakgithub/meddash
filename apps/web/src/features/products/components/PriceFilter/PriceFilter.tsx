import { useState, type FormEvent } from "react";
import type { Facets } from "../../types";
import { PriceHistogram } from "../PriceHistogram/PriceHistogram";
import styles from "./PriceFilter.module.css";

interface PriceFilterProps {
  min: string;
  max: string;
  onApply: (min: string, max: string) => void;
  /** Where the prices sit, drawn above the bands. Left out, there is no chart. */
  spread?: Facets["price"];
}

// Most products cost 1–20 €, so three bands cover the range with one tap each.
const PRESETS = [
  { label: "Up to 5 €", min: "", max: "5" },
  { label: "5–10 €", min: "5", max: "10" },
  { label: "10 € and up", min: "10", max: "" },
];

function rangeError(min: string, max: string): string {
  const low = min === "" ? undefined : Number(min);
  const high = max === "" ? undefined : Number(max);
  if ((low ?? 0) < 0 || (high ?? 0) < 0) return "Enter a price of 0 or more.";
  if (low !== undefined && high !== undefined && low > high) {
    return "Minimum price can't be higher than maximum price.";
  }
  return "";
}

/** One-tap price bands, plus a custom range that applies on "Apply". */
export function PriceFilter({ min, max, onApply, spread }: PriceFilterProps) {
  return (
    <fieldset className={styles.price}>
      <legend className={styles.legend}>Price</legend>
      {spread && <PriceHistogram spread={spread} min={min} max={max} />}
      <div className={styles.presets}>
        {PRESETS.map((p) => {
          const active = p.min === min && p.max === max;
          return (
            <button
              key={p.label}
              type="button"
              className={styles.preset}
              aria-pressed={active}
              // Tapping the picked band again removes it.
              onClick={() => (active ? onApply("", "") : onApply(p.min, p.max))}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      {/* Keyed by the applied range, so a preset or "Clear filters" resets what's typed here. */}
      <CustomRange key={`${min}-${max}`} min={min} max={max} onApply={onApply} />
    </fieldset>
  );
}

function CustomRange({ min, max, onApply }: PriceFilterProps) {
  const [draft, setDraft] = useState({ min, max });
  const [showError, setShowError] = useState(false);
  const error = rangeError(draft.min, draft.max);
  const invalid = showError && Boolean(error);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (error) {
      setShowError(true);
      return;
    }
    onApply(draft.min, draft.max);
  }

  return (
    <form aria-label="Price range" className={styles.custom} onSubmit={handleSubmit} noValidate>
      <div className={styles.range}>
        <input
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          placeholder="Min €"
          aria-label="Minimum price"
          aria-invalid={invalid}
          value={draft.min}
          onChange={(e) => setDraft((d) => ({ ...d, min: e.target.value }))}
        />
        <span aria-hidden="true">–</span>
        <input
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          placeholder="Max €"
          aria-label="Maximum price"
          aria-invalid={invalid}
          value={draft.max}
          onChange={(e) => setDraft((d) => ({ ...d, max: e.target.value }))}
        />
        <button type="submit" className={styles.apply}>
          Apply
        </button>
      </div>
      {invalid && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </form>
  );
}

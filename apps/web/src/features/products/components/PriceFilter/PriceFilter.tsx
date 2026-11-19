import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { formatPriceRange } from "../../utils/formatPriceRange";
import styles from "./PriceFilter.module.css";

interface PriceFilterProps {
  min: string;
  max: string;
  onApply: (min: string, max: string) => void;
}

/** Pill button that opens a small min/max form; the range only applies on "Apply". */
export function PriceFilter({ min, max, onApply }: PriceFilterProps) {
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ min, max });
  const [showError, setShowError] = useState(false);

  const draftMin = draft.min === "" ? undefined : Number(draft.min);
  const draftMax = draft.max === "" ? undefined : Number(draft.max);
  const error =
    (draftMin ?? 0) < 0 || (draftMax ?? 0) < 0
      ? "Enter a price of 0 or more."
      : draftMin !== undefined && draftMax !== undefined && draftMin > draftMax
        ? "Minimum price can't be higher than maximum price."
        : "";
  const active = Boolean(min || max);

  // Close on Escape, or when the user clicks anywhere outside the pill and its panel.
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      if (e.target instanceof Node && !rootRef.current?.contains(e.target)) setOpen(false);
    }
    function handleKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function toggle() {
    // Start from the applied range each time, so abandoned edits don't linger.
    if (!open) {
      setDraft({ min, max });
      setShowError(false);
    }
    setOpen(!open);
  }

  function close() {
    setOpen(false);
    buttonRef.current?.focus();
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (error) {
      setShowError(true);
      return;
    }
    onApply(draft.min, draft.max);
    close();
  }

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className={active ? `${styles.pill} ${styles.active}` : styles.pill}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
      >
        {formatPriceRange(min, max)}
      </button>

      <form
        id={panelId}
        aria-label="Price range"
        className={styles.panel}
        hidden={!open}
        onSubmit={handleSubmit}
        noValidate
      >
        <div className={styles.range}>
          <input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            placeholder="Min €"
            aria-label="Minimum price"
            aria-invalid={showError && Boolean(error)}
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
            aria-invalid={showError && Boolean(error)}
            value={draft.max}
            onChange={(e) => setDraft((d) => ({ ...d, max: e.target.value }))}
          />
        </div>
        {showError && error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        <button type="submit" className={styles.apply}>
          Apply
        </button>
      </form>
    </div>
  );
}

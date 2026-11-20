import { useEffect, useRef } from "react";
import { BRANDS } from "../../filterOptions";
import type { ProductFilters } from "../../types";
import { PriceFilter } from "../PriceFilter/PriceFilter";
import styles from "./RefinePanel.module.css";

interface RefinePanelProps {
  id: string;
  filters: ProductFilters;
  onChange: (filters: ProductFilters) => void;
  /** Narrow screens: a modal bottom sheet shown while `open`. Wide screens: a column, always shown. */
  sheet: boolean;
  open: boolean;
  onClose: () => void;
}

const BRAND_OPTIONS = [
  { value: "", label: "Any brand" },
  ...BRANDS.map((b) => ({ value: b, label: b })),
];

/** The filters that narrow a category down. New filters go in here as another section. */
export function RefinePanel({ id, filters, onChange, sheet, open, onClose }: RefinePanelProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Keep the native dialog in step with `open`. showModal gives focus handling, Escape and an inert page.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open, sheet]);

  const titleId = `${id}-title`;
  const content = (
    <>
      <h2 id={titleId} className={styles.title}>
        Refine
      </h2>

      <PriceFilter
        min={filters.minPrice}
        max={filters.maxPrice}
        onApply={(minPrice, maxPrice) => onChange({ ...filters, minPrice, maxPrice })}
      />

      <fieldset className={styles.section}>
        <legend className={styles.legend}>Brand</legend>
        <div className={styles.options}>
          {BRAND_OPTIONS.map(({ value, label }) => (
            <label key={value} className={styles.option}>
              <input
                type="radio"
                name={`${id}-brand`}
                value={value}
                checked={filters.brand === value}
                onChange={() => onChange({ ...filters, brand: value })}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
    </>
  );

  if (!sheet) {
    return (
      <aside id={id} aria-labelledby={titleId} className={styles.panel}>
        {content}
      </aside>
    );
  }

  return (
    <dialog
      ref={dialogRef}
      id={id}
      aria-labelledby={titleId}
      className={styles.sheet}
      // Fires for Escape too, so the parent's state follows however the sheet was closed.
      onClose={onClose}
    >
      <div className={styles.body}>
        {content}
        <button type="button" className={styles.done} onClick={onClose}>
          Show results
        </button>
      </div>
    </dialog>
  );
}

import { useEffect, useId, useRef } from "react";
import { BRANDS } from "../../filterOptions";
import type { Facets, ProductFilters } from "../../types";
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
  /** Counts and price spread for the current filters; the panel works without them. */
  facets?: Facets | null;
}

const BRAND_OPTIONS = [
  { value: "", label: "Any brand" },
  ...BRANDS.map((b) => ({ value: b, label: b })),
];

/** The filters that narrow a category down. New filters go in here as another section. */
export function RefinePanel({
  id,
  filters,
  onChange,
  sheet,
  open,
  onClose,
  facets,
}: RefinePanelProps) {
  const countId = useId();
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
        spread={facets?.price}
        onApply={(minPrice, maxPrice) => onChange({ ...filters, minPrice, maxPrice })}
      />

      <fieldset className={styles.section}>
        <legend className={styles.legend}>Brand</legend>
        <div className={styles.options}>
          {BRAND_OPTIONS.map(({ value, label }) => {
            // "Any brand" has no count of its own; a brand missing from the facets matches nothing.
            const count =
              value && facets ? (facets.brands.find((b) => b.value === value)?.count ?? 0) : null;
            return (
              <div key={value} className={styles.optionRow}>
                <label className={styles.option}>
                  <input
                    type="radio"
                    name={`${id}-brand`}
                    value={value}
                    checked={filters.brand === value}
                    aria-describedby={count === null ? undefined : `${countId}-${value}`}
                    onChange={() => onChange({ ...filters, brand: value })}
                  />
                  {label}
                </label>
                {count !== null && (
                  <span id={`${countId}-${value}`} className={styles.count}>
                    {count}
                  </span>
                )}
              </div>
            );
          })}
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

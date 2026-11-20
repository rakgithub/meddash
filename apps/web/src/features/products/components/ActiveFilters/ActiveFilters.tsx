import type { ProductFilters } from "../../types";
import { formatCategory } from "../../utils/formatCategory";
import { formatPriceRange } from "../../utils/formatPriceRange";
import styles from "./ActiveFilters.module.css";

interface ActiveFiltersProps {
  filters: ProductFilters;
  onChange: (filters: ProductFilters) => void;
}

/** The applied filters as chips; each one removes itself. The search term is not a filter here. */
export function ActiveFilters({ filters, onChange }: ActiveFiltersProps) {
  const { category, brand, minPrice, maxPrice } = filters;
  const chips: { label: string; clear: Partial<ProductFilters> }[] = [];
  if (category) chips.push({ label: formatCategory(category), clear: { category: "" } });
  if (brand) chips.push({ label: brand, clear: { brand: "" } });
  if (minPrice || maxPrice) {
    chips.push({
      label: formatPriceRange(minPrice, maxPrice),
      clear: { minPrice: "", maxPrice: "" },
    });
  }

  if (chips.length === 0) return null;

  return (
    <ul aria-label="Applied filters" className={styles.chips}>
      {chips.map(({ label, clear }) => (
        <li key={label}>
          <button
            type="button"
            className={styles.chip}
            aria-label={`Remove ${label}`}
            onClick={() => onChange({ ...filters, ...clear })}
          >
            {label}
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" />
            </svg>
          </button>
        </li>
      ))}
      <li>
        <button
          type="button"
          className={styles.clear}
          onClick={() =>
            onChange({ ...filters, category: "", brand: "", minPrice: "", maxPrice: "" })
          }
        >
          Clear filters
        </button>
      </li>
    </ul>
  );
}

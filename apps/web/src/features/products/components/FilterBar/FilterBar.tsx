import { BRANDS, CATEGORIES } from "../../filterOptions";
import type { ProductFilters } from "../../types";
import { formatCategory } from "../../utils/formatCategory";
import { PriceFilter } from "../PriceFilter/PriceFilter";
import styles from "./FilterBar.module.css";

interface FilterBarProps {
  filters: ProductFilters;
  onChange: (filters: ProductFilters) => void;
}

/** Row of filter pills under the results heading. Each change applies straight away. */
export function FilterBar({ filters, onChange }: FilterBarProps) {
  const hasFilters = Boolean(
    filters.category || filters.brand || filters.minPrice || filters.maxPrice,
  );
  const pill = (active: boolean) => (active ? `${styles.pill} ${styles.active}` : styles.pill);

  return (
    <div role="group" aria-label="Filters" className={styles.bar}>
      <select
        aria-label="Category"
        className={pill(Boolean(filters.category))}
        value={filters.category}
        onChange={(e) => onChange({ ...filters, category: e.target.value })}
      >
        <option value="">All categories</option>
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {formatCategory(c)}
          </option>
        ))}
      </select>

      <select
        aria-label="Brand"
        className={pill(Boolean(filters.brand))}
        value={filters.brand}
        onChange={(e) => onChange({ ...filters, brand: e.target.value })}
      >
        <option value="">All brands</option>
        {BRANDS.map((b) => (
          <option key={b} value={b}>
            {b}
          </option>
        ))}
      </select>

      <PriceFilter
        min={filters.minPrice}
        max={filters.maxPrice}
        onApply={(minPrice, maxPrice) => onChange({ ...filters, minPrice, maxPrice })}
      />

      {hasFilters && (
        <button
          type="button"
          className={styles.clear}
          onClick={() =>
            onChange({ ...filters, category: "", brand: "", minPrice: "", maxPrice: "" })
          }
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

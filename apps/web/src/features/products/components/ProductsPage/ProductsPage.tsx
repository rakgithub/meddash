import { useProductSearch } from "../../hooks/useProductSearch";
import { formatResultRange } from "../../utils/formatResultRange";
import { looksLikeSymptom } from "../../utils/looksLikeSymptom";
import { FilterBar } from "../FilterBar/FilterBar";
import { Pagination } from "../Pagination/Pagination";
import { ProductList } from "../ProductList/ProductList";
import { SymptomNudge } from "../SymptomNudge/SymptomNudge";
import { SymptomStarters } from "../SymptomStarters/SymptomStarters";
import styles from "./ProductsPage.module.css";

// Someone who already named a product doesn't need the assistant; someone describing how they feel, or stuck, does.
function nudgeReasonFor(query: string, noResults: boolean) {
  if (!query) return null;
  if (looksLikeSymptom(query)) return "symptom";
  if (noResults) return "noResults";
  return null;
}

export function ProductsPage() {
  const { products, pagination, status, filters, search, goToPage } = useProductSearch();

  const range = status === "success" && pagination ? formatResultRange(pagination) : "";
  const query = filters.q.trim();
  const noResults = status === "success" && pagination?.total === 0;
  const nudgeReason = nudgeReasonFor(query, noResults);

  return (
    <div className={styles.page}>
      <div className={styles.resultsHead}>
        <header className={styles.header}>
          <h1>Products</h1>
          {range && <p>{range}</p>}
        </header>
        <FilterBar filters={filters} onChange={search} />
      </div>

      {!query && <SymptomStarters />}
      {nudgeReason && <SymptomNudge query={query} reason={nudgeReason} />}

      <section aria-label="Results" className={styles.results}>
        <ProductList products={products} status={status} />
        {status === "success" && pagination && (
          <Pagination pagination={pagination} onPageChange={goToPage} />
        )}
      </section>
    </div>
  );
}

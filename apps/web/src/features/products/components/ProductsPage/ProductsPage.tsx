import { Link } from "react-router-dom";
import { useProductSearch } from "../../hooks/useProductSearch";
import { formatResultRange } from "../../utils/formatResultRange";
import { FilterBar } from "../FilterBar/FilterBar";
import { Pagination } from "../Pagination/Pagination";
import { ProductList } from "../ProductList/ProductList";
import styles from "./ProductsPage.module.css";

export function ProductsPage() {
  const { products, pagination, status, filters, search, goToPage } = useProductSearch();

  const range = status === "success" && pagination ? formatResultRange(pagination) : "";
  // Carries the search text over, so the assistant starts from what the user already typed.
  const assistantSearch = filters.q ? `?${new URLSearchParams({ q: filters.q })}` : "";

  return (
    <div className={styles.page}>
      <div className={styles.resultsHead}>
        <header className={styles.header}>
          <h1>Products</h1>
          <div className={styles.headerAside}>
            {range && <p>{range}</p>}
            <Link
              className={styles.assistantLink}
              to={{ pathname: "/assistant", search: assistantSearch }}
            >
              Not sure what you need?
            </Link>
          </div>
        </header>
        <FilterBar filters={filters} onChange={search} />
      </div>

      <section aria-label="Results" className={styles.results}>
        <ProductList products={products} status={status} />
        {status === "success" && pagination && (
          <Pagination pagination={pagination} onPageChange={goToPage} />
        )}
      </section>
    </div>
  );
}

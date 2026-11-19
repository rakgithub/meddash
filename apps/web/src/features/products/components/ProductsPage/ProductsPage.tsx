import { useProductSearch } from "../../hooks/useProductSearch";
import { formatResultRange } from "../../utils/formatResultRange";
import { FilterBar } from "../FilterBar/FilterBar";
import { Pagination } from "../Pagination/Pagination";
import { ProductList } from "../ProductList/ProductList";
import { SearchBar } from "../SearchBar/SearchBar";
import { UploadPrescriptionButton } from "../UploadPrescriptionButton/UploadPrescriptionButton";
import styles from "./ProductsPage.module.css";

export function ProductsPage() {
  const { products, pagination, status, filters, search, goToPage } = useProductSearch();

  const range = status === "success" && pagination ? formatResultRange(pagination) : "";

  return (
    <div className={styles.page}>
      <div className={styles.searchRow}>
        <SearchBar
          onSearch={(q) => search({ ...filters, q })}
          onSelectCategory={(category) => search({ ...filters, q: "", category })}
        />
        <UploadPrescriptionButton />
      </div>

      <div className={styles.resultsHead}>
        <header className={styles.header}>
          <h1>Products</h1>
          {range && <p>{range}</p>}
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

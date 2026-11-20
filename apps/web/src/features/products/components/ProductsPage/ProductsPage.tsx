import { useRef, useState } from "react";
import { useMediaQuery } from "../../../../lib/useMediaQuery";
import { AssistantLauncher } from "../../../assistant";
import { useFacets } from "../../hooks/useFacets";
import { useProductSearch } from "../../hooks/useProductSearch";
import { formatResultRange } from "../../utils/formatResultRange";
import { looksLikeSymptom } from "../../utils/looksLikeSymptom";
import { ActiveFilters } from "../ActiveFilters/ActiveFilters";
import { CategoryAisles } from "../CategoryAisles/CategoryAisles";
import { Pagination } from "../Pagination/Pagination";
import { ProductList } from "../ProductList/ProductList";
import { RefinePanel } from "../RefinePanel/RefinePanel";
import { SymptomNudge } from "../SymptomNudge/SymptomNudge";
import styles from "./ProductsPage.module.css";

const REFINE_ID = "refine-panel";
// Below this width the Refine panel moves out of the layout into a bottom sheet.
const NARROW = "(max-width: 860px)";

// Someone who already named a product doesn't need the assistant; someone describing how they feel, or stuck, does.
function nudgeReasonFor(query: string, noResults: boolean) {
  if (!query) return null;
  if (looksLikeSymptom(query)) return "symptom";
  if (noResults) return "noResults";
  return null;
}

export function ProductsPage() {
  const { products, pagination, status, filters, search, goToPage } = useProductSearch();
  const facets = useFacets(filters);
  const narrow = useMediaQuery(NARROW);
  const [refineOpen, setRefineOpen] = useState(false);
  const refineButtonRef = useRef<HTMLButtonElement>(null);

  const range = status === "success" && pagination ? formatResultRange(pagination) : "";
  const query = filters.q.trim();
  const noResults = status === "success" && pagination?.total === 0;
  const nudgeReason = nudgeReasonFor(query, noResults);
  // The Refine button counts what's inside the panel; the category shows on the aisles.
  const refineCount =
    Number(Boolean(filters.brand)) + Number(Boolean(filters.minPrice || filters.maxPrice));

  function closeRefine() {
    setRefineOpen(false);
    refineButtonRef.current?.focus();
  }

  return (
    <div className={styles.page}>
      <div className={styles.resultsHead}>
        <header className={styles.header}>
          <h1>Products</h1>
          {range && <p>{range}</p>}
        </header>
        <CategoryAisles
          value={filters.category}
          onChange={(category) => search({ ...filters, category })}
          counts={facets?.categories}
        />
      </div>

      {nudgeReason && <SymptomNudge query={query} reason={nudgeReason} />}

      <div className={styles.body}>
        <RefinePanel
          id={REFINE_ID}
          filters={filters}
          onChange={search}
          facets={facets}
          sheet={narrow}
          open={refineOpen}
          onClose={closeRefine}
        />

        <div className={styles.main}>
          <div className={styles.toolbar}>
            {narrow && (
              <button
                ref={refineButtonRef}
                type="button"
                className={styles.refine}
                aria-expanded={refineOpen}
                aria-controls={REFINE_ID}
                aria-label={refineCount > 0 ? `Refine, ${refineCount} applied` : "Refine"}
                onClick={() => setRefineOpen(true)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
                  <circle cx="16" cy="7" r="2" />
                  <circle cx="10" cy="17" r="2" />
                </svg>
                Refine
                {refineCount > 0 && <span className={styles.count}>{refineCount}</span>}
              </button>
            )}
            <ActiveFilters filters={filters} onChange={search} />
          </div>

          <section aria-label="Results" className={styles.results}>
            <ProductList products={products} status={status} />
            {status === "success" && pagination && (
              <Pagination pagination={pagination} onPageChange={goToPage} />
            )}
          </section>
        </div>
      </div>

      <AssistantLauncher />
    </div>
  );
}

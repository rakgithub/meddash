import { useState, type FormEvent } from "react";
import type { Category } from "../../filterOptions";
import type { SuggestOption } from "../../types";
import { SearchSuggest } from "../SearchSuggest/SearchSuggest";
import styles from "./SearchBar.module.css";

interface SearchBarProps {
  /** The current search term from the URL; the box shows it and follows it on Back/Forward. */
  query?: string;
  onSearch: (q: string) => void;
  onSelectCategory: (category: Category) => void;
}

/** The single search box: free text, a product suggestion, or a category suggestion. */
export function SearchBar({ query = "", onSearch, onSelectCategory }: SearchBarProps) {
  const [q, setQ] = useState(query);
  // Adjust state during render when the URL term changes (not in an effect, and not by
  // remounting, which would drop focus from the box after every search).
  const [syncedQuery, setSyncedQuery] = useState(query);
  if (query !== syncedQuery) {
    setSyncedQuery(query);
    setQ(query);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSearch(q);
  }

  function handleSelect(option: SuggestOption) {
    // A category is a filter, not text: clear the box so the results aren't narrowed twice.
    if (option.kind === "category") {
      setQ("");
      onSelectCategory(option.slug);
      return;
    }
    setQ(option.product.name);
    onSearch(option.product.name);
  }

  return (
    <form role="search" className={styles.bar} onSubmit={handleSubmit}>
      <SearchSuggest
        label="Search products"
        placeholder="Search medicines, brands or symptoms"
        value={q}
        onChange={setQ}
        onSelect={handleSelect}
      />
      <button type="submit" className={styles.submit} aria-label="Search">
        <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </button>
    </form>
  );
}

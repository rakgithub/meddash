import { useState, type FormEvent } from "react";
import type { Category } from "../../filterOptions";
import type { SuggestOption } from "../../types";
import { SearchSuggest } from "../SearchSuggest/SearchSuggest";
import styles from "./SearchBar.module.css";

interface SearchBarProps {
  onSearch: (q: string) => void;
  onSelectCategory: (category: Category) => void;
}

/** The single search box: free text, a product suggestion, or a category suggestion. */
export function SearchBar({ onSearch, onSelectCategory }: SearchBarProps) {
  const [q, setQ] = useState("");

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
      <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <SearchSuggest
        label="Search products"
        placeholder="Search medicines, brands or symptoms"
        value={q}
        onChange={setQ}
        onSelect={handleSelect}
      />
      <button type="submit" className={styles.submit}>
        Search
      </button>
    </form>
  );
}

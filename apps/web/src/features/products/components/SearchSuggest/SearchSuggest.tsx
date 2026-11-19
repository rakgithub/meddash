import { useId, useState, type KeyboardEvent, type ReactNode } from "react";
import { SUGGEST_MIN_LENGTH, useSuggestions, type SuggestStatus } from "../../hooks/useSuggestions";
import type { SuggestOption } from "../../types";
import { formatCategory } from "../../utils/formatCategory";
import { matchCategories } from "../../utils/matchCategories";
import styles from "./SearchSuggest.module.css";

interface SearchSuggestProps {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  onSelect: (option: SuggestOption) => void;
}

const keyOf = (o: SuggestOption) =>
  o.kind === "category" ? `category-${o.slug}` : `product-${o.product.id}`;

/**
 * Text input with a grouped autocomplete listbox (WAI-ARIA 1.2 combobox, list autocomplete):
 * matching categories first, then products from the API.
 */
export function SearchSuggest({
  label,
  value,
  placeholder,
  onChange,
  onSelect,
}: SearchSuggestProps) {
  const listboxId = useId();
  const { suggestions, status } = useSuggestions(value);
  const [open, setOpen] = useState(false);
  // Tracked by key, not index, so a list that changes under the user never highlights the wrong option.
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const term = value.trim();
  const categories: SuggestOption[] =
    term.length >= SUGGEST_MIN_LENGTH
      ? matchCategories(term).map((m) => ({ kind: "category", ...m }))
      : [];
  const products: SuggestOption[] = suggestions.map((product) => ({ kind: "product", product }));
  const options = [...categories, ...products];

  const activeIndex = options.findIndex((o) => keyOf(o) === activeKey);
  const expanded = open && options.length > 0;
  const message = open && !options.length ? statusMessage(status) : "";
  const optionId = (o: SuggestOption) => `${listboxId}-${keyOf(o)}`;

  function select(o: SuggestOption) {
    setOpen(false);
    setActiveKey(null);
    onSelect(o);
  }

  function move(step: 1 | -1) {
    if (!options.length) return;
    setOpen(true);
    // From "nothing active", Down goes to the first option and Up to the last.
    const from = activeIndex === -1 ? (step === 1 ? -1 : 0) : activeIndex;
    const next = (from + step + options.length) % options.length;
    setActiveKey(keyOf(options[next]));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    switch (e.key) {
      case "ArrowDown":
      case "ArrowUp":
        e.preventDefault(); // keep the caret where it is
        move(e.key === "ArrowDown" ? 1 : -1);
        return;
      case "Enter":
        if (expanded && activeIndex !== -1) {
          e.preventDefault(); // pick the option instead of submitting the form
          select(options[activeIndex]);
          return;
        }
        setOpen(false); // let the form submit the typed text
        return;
      case "Escape":
        if (!open) return; // let the browser clear a closed search field
        e.preventDefault();
        setOpen(false);
        setActiveKey(null);
        return;
    }
  }

  function renderOption(o: SuggestOption) {
    const active = activeIndex !== -1 && keyOf(options[activeIndex]) === keyOf(o);
    return (
      <div
        key={keyOf(o)}
        id={optionId(o)}
        role="option"
        // Focusable only programmatically: focus stays in the input (aria-activedescendant).
        tabIndex={-1}
        aria-selected={active}
        className={styles.option}
        // Select on mousedown and cancel it, so the input never blurs (which would close the list
        // first). Keyboard users never focus options: the input handles keys via aria-activedescendant.
        onMouseDown={(e) => {
          e.preventDefault();
          select(o);
        }}
      >
        {o.kind === "category" ? (
          <>
            <span className={styles.name}>
              <HighlightPrefix text={formatCategory(o.slug)} prefix={term} />
            </span>
            {o.hint && <span className={styles.meta}>for {o.hint}</span>}
          </>
        ) : (
          <>
            <span className={styles.name}>
              <HighlightPrefix text={o.product.name} prefix={term} />
            </span>
            <span className={styles.meta}>{o.product.brand}</span>
          </>
        )}
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <input
        type="search"
        role="combobox"
        autoComplete="off"
        aria-label={label}
        placeholder={placeholder}
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listboxId}
        aria-activedescendant={
          expanded && activeIndex !== -1 ? optionId(options[activeIndex]) : undefined
        }
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActiveKey(null);
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => setOpen(false)}
      />

      {/* Always rendered so aria-controls points at a real element. */}
      <div
        id={listboxId}
        role="listbox"
        aria-label="Suggestions"
        aria-busy={status === "loading"}
        className={styles.listbox}
        hidden={!expanded}
      >
        <OptionGroup label="Categories" listboxId={listboxId}>
          {categories.map(renderOption)}
        </OptionGroup>
        <OptionGroup label="Products" listboxId={listboxId}>
          {products.map(renderOption)}
        </OptionGroup>
      </div>

      {message && (
        <p className={styles.message} aria-hidden="true">
          {message}
        </p>
      )}

      <p role="status" className={styles.srOnly}>
        {expanded
          ? `${options.length} ${options.length === 1 ? "suggestion" : "suggestions"} available. Use up and down arrows to choose.`
          : message}
      </p>
    </div>
  );
}

function OptionGroup({
  label,
  listboxId,
  children,
}: {
  label: string;
  listboxId: string;
  children: ReactNode[];
}) {
  if (!children.length) return null;
  const labelId = `${listboxId}-${label}`;
  return (
    <div role="group" aria-labelledby={labelId} className={styles.group}>
      <div id={labelId} role="presentation" className={styles.groupLabel}>
        {label}
      </div>
      {children}
    </div>
  );
}

function statusMessage(status: SuggestStatus) {
  if (status === "error") return "Suggestions unavailable. Press Enter to search.";
  if (status === "success") return "No matching products";
  return "";
}

function HighlightPrefix({ text, prefix }: { text: string; prefix: string }) {
  if (!prefix || !text.toLowerCase().startsWith(prefix.toLowerCase())) return <>{text}</>;
  return (
    <>
      <strong>{text.slice(0, prefix.length)}</strong>
      {text.slice(prefix.length)}
    </>
  );
}

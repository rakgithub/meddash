import { useId, useState, type KeyboardEvent } from "react";
import { useSuggestions, type SuggestStatus } from "../../hooks/useSuggestions";
import type { Suggestion } from "../../types";
import styles from "./SearchSuggest.module.css";

interface SearchSuggestProps {
  id: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  onSelect: (suggestion: Suggestion) => void;
}

/** Text input with an autocomplete listbox (WAI-ARIA 1.2 combobox, list autocomplete). */
export function SearchSuggest({ id, value, placeholder, onChange, onSelect }: SearchSuggestProps) {
  const listboxId = useId();
  const { suggestions, status } = useSuggestions(value);
  const [open, setOpen] = useState(false);
  // Tracked by id, not index, so a list that changes under the user never highlights the wrong product.
  const [activeId, setActiveId] = useState<string | null>(null);

  const activeIndex = suggestions.findIndex((s) => s.id === activeId);
  const expanded = open && suggestions.length > 0;
  const message = open ? statusMessage(status, suggestions.length) : "";
  const optionId = (s: Suggestion) => `${listboxId}-${s.id}`;

  function select(s: Suggestion) {
    setOpen(false);
    setActiveId(null);
    onSelect(s);
  }

  function move(step: 1 | -1) {
    if (!suggestions.length) return;
    setOpen(true);
    // From "nothing active", Down goes to the first option and Up to the last.
    const from = activeIndex === -1 ? (step === 1 ? -1 : 0) : activeIndex;
    const next = (from + step + suggestions.length) % suggestions.length;
    setActiveId(suggestions[next].id);
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
          select(suggestions[activeIndex]);
          return;
        }
        setOpen(false); // let the form submit the typed text
        return;
      case "Escape":
        if (!open) return; // let the browser clear a closed search field
        e.preventDefault();
        setOpen(false);
        setActiveId(null);
        return;
    }
  }

  return (
    <div className={styles.root}>
      <input
        id={id}
        type="search"
        role="combobox"
        autoComplete="off"
        placeholder={placeholder}
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listboxId}
        aria-activedescendant={
          expanded && activeIndex !== -1 ? optionId(suggestions[activeIndex]) : undefined
        }
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActiveId(null);
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => setOpen(false)}
      />

      {/* Always rendered so aria-controls points at a real element. */}
      <ul
        id={listboxId}
        role="listbox"
        aria-label="Suggestions"
        aria-busy={status === "loading"}
        className={styles.listbox}
        hidden={!expanded}
      >
        {suggestions.map((s, i) => (
          <li
            key={s.id}
            id={optionId(s)}
            role="option"
            aria-selected={i === activeIndex}
            className={styles.option}
            // Select on mousedown and cancel it, so the input never blurs (which would close the list
            // first). Keyboard users never focus options: the input handles keys via aria-activedescendant.
            onMouseDown={(e) => {
              e.preventDefault();
              select(s);
            }}
          >
            <span className={styles.name}>
              <HighlightPrefix text={s.name} prefix={value.trim()} />
            </span>
            <span className={styles.brand}>{s.brand}</span>
          </li>
        ))}
      </ul>

      {message && (
        <p className={styles.message} aria-hidden="true">
          {message}
        </p>
      )}

      <p role="status" className={styles.srOnly}>
        {expanded
          ? `${suggestions.length} ${suggestions.length === 1 ? "suggestion" : "suggestions"} available. Use up and down arrows to choose.`
          : message}
      </p>
    </div>
  );
}

function statusMessage(status: SuggestStatus, count: number) {
  if (status === "error") return "Suggestions unavailable. Press Enter to search.";
  if (status === "success" && count === 0) return "No matching products";
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

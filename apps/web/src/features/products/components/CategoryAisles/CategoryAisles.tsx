import { useEffect, useRef, type ReactNode } from "react";
import { CATEGORIES, type Category } from "../../filterOptions";
import { formatCategory } from "../../utils/formatCategory";
import styles from "./CategoryAisles.module.css";

interface CategoryAislesProps {
  /** Category slug, or "" for all products. */
  value: string;
  onChange: (category: string) => void;
}

// What people come to each aisle for, so the tile reads like the sign above a pharmacy shelf.
const HINTS: Record<Category, string> = {
  "cold-flu": "Cough, sore throat, blocked nose",
  "pain-relief": "Headache, fever, back pain",
  "skin-care": "Dry skin, sun, eczema",
  vitamins: "Immunity, energy, minerals",
};

const ICONS: Record<Category | "", ReactNode> = {
  "": (
    <>
      <rect x="4" y="4" width="7" height="7" rx="2" />
      <rect x="13" y="4" width="7" height="7" rx="2" />
      <rect x="4" y="13" width="7" height="7" rx="2" />
      <rect x="13" y="13" width="7" height="7" rx="2" />
    </>
  ),
  "cold-flu": (
    <>
      <path d="M10 13.5V5a2 2 0 0 1 4 0v8.5a4 4 0 1 1-4 0Z" />
      <path d="M12 9v6" />
    </>
  ),
  "pain-relief": (
    <>
      <rect x="3" y="8.5" width="18" height="7" rx="3.5" transform="rotate(-45 12 12)" />
      <path d="M9.5 9.5l5 5" />
    </>
  ),
  "skin-care": <path d="M12 3.5s6 6.4 6 10.5a6 6 0 0 1-12 0c0-4.1 6-10.5 6-10.5Z" />,
  vitamins: (
    <>
      <path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14" />
      <path d="M5 19l8-8" />
    </>
  ),
};

const AISLES = [
  { slug: "", name: "All products", hint: "Browse the whole range" },
  ...CATEGORIES.map((slug) => ({ slug, name: formatCategory(slug), hint: HINTS[slug] })),
] as const;

/** Categories as big tiles you can see at a glance, instead of a dropdown. One is always picked. */
export function CategoryAisles({ value, onChange }: CategoryAislesProps) {
  const groupRef = useRef<HTMLDivElement>(null);

  // On narrow screens the row scrolls sideways; bring the picked aisle into view if it's off-screen.
  useEffect(() => {
    const group = groupRef.current;
    const tile = group?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!group || !tile) return;
    const hidden =
      tile.offsetLeft < group.scrollLeft ||
      tile.offsetLeft + tile.offsetWidth > group.scrollLeft + group.clientWidth;
    if (hidden) group.scrollLeft = tile.offsetLeft - 20;
  }, [value]);

  return (
    <div ref={groupRef} role="group" aria-label="Category" className={styles.aisles}>
      {AISLES.map(({ slug, name, hint }) => (
        <button
          key={slug}
          type="button"
          className={styles.tile}
          aria-pressed={value === slug}
          onClick={() => onChange(slug)}
        >
          <span className={styles.icon}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              {ICONS[slug]}
            </svg>
          </span>
          <span className={styles.name}>{name}</span>
          <span className={styles.hint}>{hint}</span>
        </button>
      ))}
    </div>
  );
}

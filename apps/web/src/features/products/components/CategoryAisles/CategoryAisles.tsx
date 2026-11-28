import { Chip } from "@meddash/design-system/components";
import { useEffect, useRef, type ReactNode } from "react";
import { CATEGORIES, type Category } from "../../filterOptions";
import type { FacetValue } from "../../types";
import { formatCategory } from "../../utils/formatCategory";
import styles from "./CategoryAisles.module.css";

interface CategoryAislesProps {
  /** Category slug, or "" for all products. */
  value: string;
  onChange: (category: string) => void;
  /** How many products each category holds under the other filters. Left out, no counts show. */
  counts?: FacetValue[];
}

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
  { slug: "", name: "All products" },
  ...CATEGORIES.map((slug) => ({ slug, name: formatCategory(slug) })),
] as const;

/** Categories as one row of pills you can see at a glance, instead of a dropdown. One is always picked. */
export function CategoryAisles({ value, onChange, counts }: CategoryAislesProps) {
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

  const countOf = (slug: string) =>
    slug === ""
      ? (counts ?? []).reduce((sum, c) => sum + c.count, 0)
      : (counts?.find((c) => c.value === slug)?.count ?? 0);

  return (
    <div ref={groupRef} role="group" aria-label="Category" className={styles.aisles}>
      {AISLES.map(({ slug, name }) => (
        <Chip
          key={slug}
          pressed={value === slug}
          onClick={() => onChange(slug)}
          meta={counts ? countOf(slug) : undefined}
          icon={
            <svg viewBox="0 0 24 24" aria-hidden="true">
              {ICONS[slug]}
            </svg>
          }
        >
          {name}
        </Chip>
      ))}
    </div>
  );
}

// Slugs that don't read well with the dashes simply turned into spaces.
const LABELS: Record<string, string> = { "cold-flu": "Cold and flu" };

/** "pain-relief" -> "Pain relief" */
export function formatCategory(slug: string): string {
  const label = LABELS[slug];
  if (label) return label;
  const text = slug.replace(/-/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

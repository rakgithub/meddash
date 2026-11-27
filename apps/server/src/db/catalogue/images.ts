// Same URL format as the seed: a fixed crop so every card has the same aspect ratio.
const unsplash = (photoId: string) =>
  `https://images.unsplash.com/photo-${photoId}?w=600&h=450&fit=crop&q=75`;

// Unsplash photo ids by image key, "<category>/<form>" or a more specific "<type>-<form>". Photos are
// picked by hand to show the product kind; they repeat across similar products. We only link to the
// CDN, so no API key is needed. `pnpm catalogue:check-images` finds ids that have gone dead.
// Categories not listed here fall back to photos of the same form from other categories.
const photos: Record<string, string[]> = {
  "pain-relief/tablet": ["1584308666744-24d5c474f2ae", "1631549916768-4119b2e5f926"],
  "pain-relief/gel": ["1576602976047-174e57a47881"],
  "cold-flu/spray": ["1585435557343-3b092031a831"],
  "cold-flu/syrup": ["1617897903246-719242758050"],
  "cold-flu/lozenge": ["1471864190281-a93a3070b6de"],
  "skin-care/sunscreen": ["1556228720-195a672e8a03"],
  "skin-care/cream": ["1612817288484-6f916006741a", "1611930022073-b7a4ba5fcccd"],
  "vitamins/capsule": ["1587854692152-cbe660dbde88"],
  "vitamins/tablet": ["1628771065518-0d82f1938462", "1607619056574-7b8d3ee536b2"],
};

/** Every photo URL once, for the dead-link check. */
export function allImageUrls(): string[] {
  return [...new Set(Object.values(photos).flat())].map(unsplash);
}

/**
 * The most specific key that has photos wins: `ibuprofen-tablet`, then `pain-relief/tablet`, then
 * any photo of the category, then any photo of the same form. With several photos the hash picks one, so neighbours in a result
 * list don't all show the same picture. Throws when nothing matches, so a missing photo is
 * caught before it reaches the database.
 */
export function imageUrlFor(
  imageKey: string,
  category: string,
  imageForm: string,
  hash: number,
): string {
  const candidates = [
    photos[`${imageKey}-${imageForm}`],
    photos[`${category}/${imageForm}`],
    Object.entries(photos)
      .filter(([key]) => key.startsWith(`${category}/`))
      .flatMap(([, ids]) => ids),
    // A category with no photos of its own reuses another category's photos of the same form
    // (a tablet looks like a tablet in any category). Demo catalogue: photos repeat on purpose.
    Object.entries(photos)
      .filter(([key]) => key.endsWith(`/${imageForm}`))
      .flatMap(([, ids]) => ids),
  ];
  const ids = candidates.find((c) => c !== undefined && c.length > 0);
  if (!ids) throw new Error(`No photo for ${imageKey}-${imageForm} (${category})`);
  return unsplash(ids[hash % ids.length]);
}

import { formatPrice } from "./formatPrice";

/** Pill label for a price filter: "Price" when unset, otherwise the range in words. */
export function formatPriceRange(min: string, max: string): string {
  if (min && max) return `${formatPrice(Number(min))} – ${formatPrice(Number(max))}`;
  if (min) return `From ${formatPrice(Number(min))}`;
  if (max) return `Up to ${formatPrice(Number(max))}`;
  return "Price";
}

export const LOW_STOCK_THRESHOLD = 5;

export function formatStock(quantity: number): string {
  if (quantity <= 0) return "Out of stock";
  if (quantity <= LOW_STOCK_THRESHOLD) return `Only ${quantity} left`;
  return "In stock";
}

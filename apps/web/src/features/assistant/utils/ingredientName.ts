/** "Ibuprofen 400 mg" -> "Ibuprofen"; "Cholecalciferol 25 µg (1000 IU)" -> "Cholecalciferol". */
export function ingredientName(ingredient: string): string {
  return ingredient.replace(/\s+[\d.,]+\s*(mg|µg|g|ml|%|IU)(\s.*)?$/i, "").trim();
}

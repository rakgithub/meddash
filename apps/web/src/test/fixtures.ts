import type { Product } from "../features/products/types";

export const ibuprofen: Product = {
  id: "1",
  name: "Ibuprofen 400mg",
  description: "Pain relief tablets for headaches and fever",
  category: "pain-relief",
  brand: "Nurofen",
  price: 6.49,
  imageUrl: "https://images.unsplash.com/photo-ibuprofen?w=600&h=450&fit=crop&q=75",
};

export const vitaminD: Product = {
  id: "3",
  name: "Vitamin D3 1000 IU",
  description: "Daily vitamin D supplement capsules",
  category: "vitamins",
  brand: "Doppelherz",
  price: 8.95,
  imageUrl: null,
};

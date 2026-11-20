import type { Product, ProductDetail } from "../features/products/types";
import type { User } from "../features/auth/types";
import type { Cart } from "../features/cart/types";

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

export const ibuprofenDetail: ProductDetail = {
  ...ibuprofen,
  sku: "MD-0001",
  pzn: "04875159",
  packSize: "20 tablets",
  dosageForm: "Film-coated tablet",
  activeIngredients: ["Ibuprofen 400 mg"],
  usageInstructions: "1 tablet with water, up to 3 times a day.",
  warnings: "Do not use with stomach ulcers.",
  requiresPrescription: false,
  stockQuantity: 120,
  manufacturer: "Reckitt",
};

export const paracetamolDetail: ProductDetail = {
  id: "2",
  name: "Paracetamol 500mg",
  description: "Gentle pain and fever relief",
  category: "pain-relief",
  brand: "ratiopharm",
  price: 2.99,
  imageUrl: null,
  sku: "MD-0002",
  pzn: "01126186",
  packSize: "20 tablets",
  dosageForm: "Tablet",
  activeIngredients: ["Paracetamol 500 mg"],
  usageInstructions: "1 to 2 tablets, up to 4 times a day.",
  warnings: "Do not combine with other paracetamol-containing medicines.",
  requiresPrescription: false,
  stockQuantity: 3,
  manufacturer: "ratiopharm",
};

export const coughSyrupDetail: ProductDetail = {
  id: "7",
  name: "Cough Syrup",
  description: "Soothing syrup for dry cough",
  category: "cold-flu",
  brand: "Prospan",
  price: 9.99,
  imageUrl: null,
  sku: "MD-0007",
  pzn: "04337311",
  packSize: "200 ml",
  dosageForm: "Syrup",
  activeIngredients: ["Ivy leaf dry extract"],
  usageInstructions: "5 ml 3 times a day.",
  warnings: "Contains sorbitol.",
  requiresPrescription: true,
  stockQuantity: 25,
  manufacturer: "Engelhard Arzneimittel",
};

export const ana: User = {
  id: "1",
  email: "ana@example.com",
  name: "Ana Weber",
  role: "customer",
};

export const cartWithIbuprofen: Cart = {
  items: [{ product: ibuprofen, quantity: 2, lineTotal: 12.98 }],
  itemCount: 2,
  subtotal: 12.98,
};

export const cartWithTwoLines: Cart = {
  items: [
    { product: ibuprofen, quantity: 2, lineTotal: 12.98 },
    { product: vitaminD, quantity: 1, lineTotal: 8.95 },
  ],
  itemCount: 3,
  subtotal: 21.93,
};

export const emptyCart: Cart = { items: [], itemCount: 0, subtotal: 0 };

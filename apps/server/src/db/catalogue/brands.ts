export type PriceTier = "budget" | "standard" | "premium";

export interface Brand {
  /** Four letters, last part of every SKU. Never change one: SKUs are how a re-run finds its rows. */
  code: string;
  name: string;
  manufacturer: string;
  tier: PriceTier;
}

// Invented names on purpose: pairing real brands with products they don't make would misrepresent
// them. The 12 seed products keep their real brands.
export const brands: Brand[] = [
  { code: "MEDI", name: "Medilo", manufacturer: "Medilo Pharma", tier: "standard" },
  { code: "VITA", name: "Vitara", manufacturer: "Vitara Health", tier: "premium" },
  { code: "CURA", name: "Curalis", manufacturer: "Curalis Pharma", tier: "standard" },
  { code: "PHAR", name: "Pharmeo", manufacturer: "Pharmeo Labs", tier: "budget" },
  { code: "NUVE", name: "Nuvella", manufacturer: "Nuvella Consumer Health", tier: "premium" },
  { code: "HELI", name: "Heliox", manufacturer: "Heliox Pharma", tier: "standard" },
  { code: "APOT", name: "Apotia", manufacturer: "Apotia Generics", tier: "budget" },
  { code: "ZENO", name: "Zenova", manufacturer: "Zenova Health", tier: "standard" },
  { code: "LUME", name: "Lumera", manufacturer: "Lumera Care", tier: "premium" },
  { code: "ORVI", name: "Orvita", manufacturer: "Orvita Pharma", tier: "standard" },
  { code: "BELM", name: "Belmora", manufacturer: "Belmora Laboratories", tier: "standard" },
  { code: "KARE", name: "Kareva", manufacturer: "Kareva Health", tier: "budget" },
  { code: "TOLV", name: "Tolvia", manufacturer: "Tolvia Pharma", tier: "standard" },
  { code: "SALV", name: "Salvena", manufacturer: "Salvena Consumer Health", tier: "premium" },
  { code: "NOVA", name: "Novacur", manufacturer: "Novacur Pharma", tier: "standard" },
  { code: "REME", name: "Remedia", manufacturer: "Remedia Generics", tier: "budget" },
  { code: "SANO", name: "Sanora", manufacturer: "Sanora Health", tier: "standard" },
  { code: "VITE", name: "Viteo", manufacturer: "Viteo Nutrition", tier: "premium" },
  { code: "AURE", name: "Aurelia", manufacturer: "Aurelia Pharma", tier: "standard" },
  { code: "BENA", name: "Benavo", manufacturer: "Benavo Labs", tier: "budget" },
  { code: "CERE", name: "Cerelia", manufacturer: "Cerelia Care", tier: "standard" },
  { code: "DERM", name: "Dermano", manufacturer: "Dermano Skin Science", tier: "premium" },
  { code: "ELVI", name: "Elvira", manufacturer: "Elvira Health", tier: "standard" },
  { code: "FARM", name: "Farmida", manufacturer: "Farmida Generics", tier: "budget" },
  { code: "GENE", name: "Genera", manufacturer: "Genera Pharma", tier: "budget" },
  { code: "HEXO", name: "Hexora", manufacturer: "Hexora Laboratories", tier: "standard" },
  { code: "IRAV", name: "Iravo", manufacturer: "Iravo Consumer Health", tier: "standard" },
  { code: "JANO", name: "Janova", manufacturer: "Janova Pharma", tier: "premium" },
  { code: "KELV", name: "Kelvia", manufacturer: "Kelvia Health", tier: "standard" },
  { code: "LORV", name: "Lorvita", manufacturer: "Lorvita Nutrition", tier: "premium" },
  { code: "MAVI", name: "Mavira", manufacturer: "Mavira Pharma", tier: "budget" },
  { code: "NEXO", name: "Nexora", manufacturer: "Nexora Labs", tier: "standard" },
  { code: "OLVI", name: "Olvia", manufacturer: "Olvia Care", tier: "standard" },
  { code: "PURA", name: "Puramed", manufacturer: "Puramed Generics", tier: "budget" },
  { code: "QUIL", name: "Quilena", manufacturer: "Quilena Health", tier: "premium" },
  { code: "ROVI", name: "Rovita", manufacturer: "Rovita Pharma", tier: "standard" },
  { code: "SYLV", name: "Sylvana", manufacturer: "Sylvana Naturals", tier: "premium" },
  { code: "TREV", name: "Trevia", manufacturer: "Trevia Pharma", tier: "budget" },
  { code: "ULME", name: "Ulmera", manufacturer: "Ulmera Consumer Health", tier: "standard" },
  { code: "VALO", name: "Valora", manufacturer: "Valora Laboratories", tier: "standard" },
];

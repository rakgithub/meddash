export interface Form {
  /** Part of the SKU. Never change one. */
  code: string;
  /** Lower-case, goes into the product name: "film-coated tablets". */
  label: string;
  /** The product's dosageForm column. */
  dosageForm: string;
  /** Pack sizes read "<pack> <unit>", e.g. "20 tablets". */
  unit: string;
  /** One entry per strength; [""] when the product has no strength. */
  strengths: string[];
  packs: number[];
  /** Standard-tier price of the first strength in the smallest pack, in euros. */
  basePrice: number;
  usage: string;
  /** Picks the photo: see images.ts. */
  imageForm: string;
}

export interface ProductType {
  /** Part of the SKU. Never change one. */
  code: string;
  category: string;
  /** Product name noun, e.g. "Ibuprofen" gives "Medilo Ibuprofen 400 mg film-coated tablets". */
  name: string;
  /** The first one carries the strength ("Ibuprofen 400 mg"). Empty for products with no active ingredient. */
  activeIngredients: string[];
  imageKey: string;
  description: string;
  warnings: string;
  requiresPrescription?: boolean;
  forms: Form[];
}

// Usage and warnings are written once per type from standard over-the-counter label wording, not made
// up per product: the assistant recommends these products. They deliberately point to the package
// leaflet for doses instead of inventing numbers.
const FOOD_SUPPLEMENT =
  "Food supplements should not replace a varied diet. Do not exceed the recommended daily dose. Keep out of the reach of young children.";

export const productTypes: ProductType[] = [
  // pain-relief
  {
    code: "IBU",
    category: "pain-relief",
    name: "Ibuprofen",
    activeIngredients: ["Ibuprofen"],
    imageKey: "ibuprofen",
    description:
      "Relieves mild to moderate pain such as headache, toothache and period pain, and lowers fever.",
    warnings:
      "Do not use with stomach or intestinal ulcers, severe heart, liver or kidney disease, or in the last 3 months of pregnancy. Do not use if you are allergic to ibuprofen or other NSAIDs. Ask a doctor or pharmacist before use if you take blood thinners. Seek medical advice if fever lasts more than 3 days or pain more than 4 days.",
    forms: [
      {
        code: "TAB",
        label: "film-coated tablets",
        dosageForm: "Film-coated tablet",
        unit: "tablets",
        strengths: ["200 mg", "400 mg"],
        packs: [10, 20, 50],
        basePrice: 3.49,
        usage:
          "Adults and adolescents from 12 years: swallow whole with water, preferably with food. Use the lowest dose that works for the shortest time. Do not exceed the maximum daily dose in the package leaflet.",
        imageForm: "tablet",
      },
      {
        code: "CAP",
        label: "soft capsules",
        dosageForm: "Soft capsule",
        unit: "capsules",
        strengths: ["200 mg"],
        packs: [10, 20],
        basePrice: 4.99,
        usage:
          "Adults and adolescents from 12 years: swallow whole with water, preferably with food. Use the lowest dose that works for the shortest time. Do not exceed the maximum daily dose in the package leaflet.",
        imageForm: "capsule",
      },
    ],
  },
  {
    code: "IBG",
    category: "pain-relief",
    name: "Ibuprofen",
    activeIngredients: ["Ibuprofen"],
    imageKey: "ibuprofen",
    description: "Pain-relieving gel for sore muscles, sprains and bruises.",
    warnings:
      "For external use only. Do not apply to broken skin, the eyes or mucous membranes. Do not use if you are allergic to ibuprofen or other NSAIDs, or in the last 3 months of pregnancy. Wash your hands after use. Seek medical advice if there is no improvement after 1 week.",
    forms: [
      {
        code: "GEL",
        label: "gel",
        dosageForm: "Gel",
        unit: "g",
        strengths: ["5 %"],
        packs: [50, 100],
        basePrice: 5.99,
        usage:
          "Adults and adolescents from 12 years: apply a thin layer to the affected area up to 3 times a day and rub in gently. Do not use under airtight dressings.",
        imageForm: "gel",
      },
    ],
  },
  {
    code: "PAR",
    category: "pain-relief",
    name: "Paracetamol",
    activeIngredients: ["Paracetamol"],
    imageKey: "paracetamol",
    description: "Gentle relief from mild to moderate pain and fever.",
    warnings:
      "Do not take with other medicines that contain paracetamol. Exceeding the dose can cause serious liver damage. Ask a doctor or pharmacist before use if you have liver or kidney problems or drink alcohol regularly. Seek medical advice if symptoms last more than 3 days.",
    forms: [
      {
        code: "TAB",
        label: "tablets",
        dosageForm: "Tablet",
        unit: "tablets",
        strengths: ["500 mg"],
        packs: [10, 20, 50],
        basePrice: 2.29,
        usage:
          "Adults: swallow with water. Leave at least 6 hours between doses and do not exceed the maximum daily dose in the package leaflet.",
        imageForm: "tablet",
      },
    ],
  },
  {
    code: "ASA",
    category: "pain-relief",
    name: "Acetylsalicylic acid",
    activeIngredients: ["Acetylsalicylic acid"],
    imageKey: "acetylsalicylic-acid",
    description: "Relieves mild to moderate pain and lowers fever.",
    warnings:
      "Not for children and adolescents with fever or flu symptoms (risk of Reye's syndrome). Do not use with stomach ulcers or bleeding disorders, or in the last 3 months of pregnancy. Ask a doctor before use if you take blood thinners. Seek medical advice if symptoms last more than 3 days.",
    forms: [
      {
        code: "TAB",
        label: "tablets",
        dosageForm: "Tablet",
        unit: "tablets",
        strengths: ["500 mg"],
        packs: [10, 20],
        basePrice: 3.19,
        usage:
          "Adults: swallow with plenty of water, preferably after a meal. Do not exceed the maximum daily dose in the package leaflet.",
        imageForm: "tablet",
      },
    ],
  },
  {
    code: "DCG",
    category: "pain-relief",
    name: "Diclofenac",
    activeIngredients: ["Diclofenac"],
    imageKey: "diclofenac",
    description: "Gel for pain and swelling from sprains, strains and bruises.",
    warnings:
      "For external use only. Use on intact skin only and keep away from the eyes and mucous membranes. Do not use if you are allergic to diclofenac or other NSAIDs, or in the last 3 months of pregnancy. Seek medical advice if there is no improvement after 1 week.",
    forms: [
      {
        code: "GEL",
        label: "gel",
        dosageForm: "Gel",
        unit: "g",
        strengths: ["1 %"],
        packs: [50, 100],
        basePrice: 6.49,
        usage:
          "Adults and adolescents from 14 years: apply a thin layer to the affected area and rub in gently, as often as the package leaflet allows. Wash your hands afterwards.",
        imageForm: "gel",
      },
    ],
  },

  // cold-flu
  {
    code: "XYL",
    category: "cold-flu",
    name: "Xylometazoline nasal spray",
    activeIngredients: ["Xylometazoline"],
    imageKey: "xylometazoline",
    description: "Quickly relieves a blocked nose caused by a cold or hay fever.",
    warnings:
      "Do not use for more than 7 days in a row: longer use can damage the nasal lining and cause rebound congestion. Do not use with narrow-angle glaucoma or after surgery through the nose. Ask a doctor first if you have high blood pressure, heart disease or thyroid problems.",
    forms: [
      {
        code: "SPR",
        label: "",
        dosageForm: "Nasal spray",
        unit: "ml",
        strengths: ["0.05 %", "0.1 %"],
        packs: [10, 15],
        basePrice: 3.29,
        usage:
          "Use the strength recommended on the package for your age. Spray into each nostril as directed in the package leaflet, no more than 3 times a day.",
        imageForm: "spray",
      },
    ],
  },
  {
    code: "NAC",
    category: "cold-flu",
    name: "Sodium chloride nasal spray",
    activeIngredients: ["Sodium chloride"],
    imageKey: "sodium-chloride",
    description: "Moistens and cleans dry or blocked nasal passages without medication.",
    warnings:
      "Do not share the bottle. Do not use if you are allergic to any ingredient. Seek medical advice if symptoms last longer than a week or get worse.",
    forms: [
      {
        code: "SPR",
        label: "",
        dosageForm: "Nasal spray",
        unit: "ml",
        strengths: ["0.9 %"],
        packs: [20, 30],
        basePrice: 2.99,
        usage: "Spray into each nostril as often as needed.",
        imageForm: "spray",
      },
    ],
  },
  {
    code: "IVY",
    category: "cold-flu",
    name: "Ivy leaf cough syrup",
    activeIngredients: ["Ivy leaf dry extract"],
    imageKey: "ivy-leaf",
    description: "Herbal syrup that helps loosen mucus and ease a chesty cough.",
    warnings:
      "Do not use if you are allergic to ivy leaf extract. Ask a doctor before use in children under 2 years, in pregnancy or when breastfeeding. Seek medical advice if the cough lasts more than a week or comes with fever, shortness of breath or purulent or bloody sputum. Some syrups contain sorbitol.",
    forms: [
      {
        code: "SYR",
        label: "",
        dosageForm: "Syrup",
        unit: "ml",
        strengths: [""],
        packs: [100, 200],
        basePrice: 6.99,
        usage:
          "Shake before use. Use the measuring cup supplied and follow the dose for your age in the package leaflet.",
        imageForm: "syrup",
      },
    ],
  },
  {
    code: "MEN",
    category: "cold-flu",
    name: "Menthol and eucalyptus lozenges",
    activeIngredients: ["Menthol", "Eucalyptus oil"],
    imageKey: "menthol",
    description: "Soothing lozenges for a sore throat and irritated mouth.",
    warnings:
      "Not suitable for children under 6 years. Do not use if you are allergic to menthol or eucalyptus oil. Seek medical advice if a sore throat lasts more than 3 days or comes with high fever.",
    forms: [
      {
        code: "LOZ",
        label: "",
        dosageForm: "Lozenge",
        unit: "lozenges",
        strengths: [""],
        packs: [24, 36],
        basePrice: 3.99,
        usage:
          "Let one lozenge dissolve slowly in the mouth; do not chew. Do not exceed the maximum number per day in the package leaflet.",
        imageForm: "lozenge",
      },
    ],
  },

  // skin-care
  {
    code: "DEX",
    category: "skin-care",
    name: "Dexpanthenol",
    activeIngredients: ["Dexpanthenol"],
    imageKey: "dexpanthenol",
    description: "Cream that soothes and helps repair dry, chapped or irritated skin.",
    warnings:
      "For external use only. Keep away from the eyes. Do not use if you are allergic to dexpanthenol or any other ingredient. Seek medical advice if the skin does not improve within a week or gets worse.",
    forms: [
      {
        code: "CRM",
        label: "cream",
        dosageForm: "Cream",
        unit: "g",
        strengths: ["5 %"],
        packs: [30, 50, 100],
        basePrice: 3.99,
        usage: "Apply a thin layer to clean skin 1 to 3 times a day.",
        imageForm: "cream",
      },
    ],
  },
  {
    code: "URE",
    category: "skin-care",
    name: "Urea",
    activeIngredients: ["Urea"],
    imageKey: "urea",
    description: "Intensive cream for very dry, rough skin.",
    warnings:
      "For external use only. Avoid the eyes and broken or inflamed skin, where it can sting. Do not use if you are allergic to urea. Seek medical advice if the skin does not improve.",
    forms: [
      {
        code: "CRM",
        label: "cream",
        dosageForm: "Cream",
        unit: "g",
        strengths: ["5 %", "10 %"],
        packs: [50, 100],
        basePrice: 4.49,
        usage: "Apply to clean, dry skin once or twice a day and rub in well.",
        imageForm: "cream",
      },
    ],
  },
  {
    code: "HYC",
    category: "skin-care",
    name: "Hydrocortisone",
    activeIngredients: ["Hydrocortisone"],
    imageKey: "hydrocortisone",
    description:
      "Cream for itching and redness from mild eczema, insect bites and contact dermatitis.",
    warnings:
      "For external use only. Do not use on open wounds, on skin infections (fungal, viral or bacterial), on acne or rosacea, or for long on the face. Do not use for more than 1 week without medical advice. Ask a doctor before use in children or during pregnancy.",
    forms: [
      {
        code: "CRM",
        label: "cream",
        dosageForm: "Cream",
        unit: "g",
        strengths: ["0.5 %"],
        packs: [15, 30],
        basePrice: 5.49,
        usage:
          "Apply a thin layer to the affected area once or twice a day, as the package leaflet directs.",
        imageForm: "cream",
      },
    ],
  },
  {
    code: "SUN",
    category: "skin-care",
    name: "Sunscreen",
    activeIngredients: [],
    imageKey: "sunscreen",
    description: "Broad-spectrum UVA and UVB protection for everyday sun exposure.",
    warnings:
      "For external use only. Avoid the eyes and do not apply to broken or irritated skin. Sunscreen does not give complete protection: avoid the midday sun and keep babies and infants out of direct sunlight.",
    forms: [
      {
        code: "LOT",
        label: "lotion",
        dosageForm: "Lotion",
        unit: "ml",
        strengths: ["SPF 30", "SPF 50"],
        packs: [100, 200],
        basePrice: 8.99,
        usage:
          "Apply generously 15 to 30 minutes before sun exposure. Reapply at least every 2 hours and after swimming or towelling.",
        imageForm: "sunscreen",
      },
      {
        code: "CRM",
        label: "face cream",
        dosageForm: "Cream",
        unit: "ml",
        strengths: ["SPF 30", "SPF 50"],
        packs: [50],
        basePrice: 9.99,
        usage:
          "Apply generously to the face 15 to 30 minutes before sun exposure. Reapply at least every 2 hours.",
        imageForm: "sunscreen",
      },
    ],
  },
  {
    code: "MOI",
    category: "skin-care",
    name: "Moisturising",
    activeIngredients: [],
    imageKey: "moisturiser",
    description: "Daily moisturiser that keeps normal to dry skin soft.",
    warnings:
      "For external use only. Stop use if irritation develops. Do not apply to broken skin.",
    forms: [
      {
        code: "CRM",
        label: "cream",
        dosageForm: "Cream",
        unit: "ml",
        strengths: [""],
        packs: [50, 100, 250],
        basePrice: 3.99,
        usage: "Apply to clean skin as often as needed.",
        imageForm: "cream",
      },
      {
        code: "LOT",
        label: "body lotion",
        dosageForm: "Lotion",
        unit: "ml",
        strengths: [""],
        packs: [200, 400],
        basePrice: 4.49,
        usage: "Apply to clean skin as often as needed.",
        imageForm: "cream",
      },
    ],
  },

  // vitamins
  {
    code: "VD3",
    category: "vitamins",
    name: "Vitamin D3",
    activeIngredients: ["Vitamin D3"],
    imageKey: "vitamin-d3",
    description: "Daily vitamin D3 supplement for normal bones, teeth and muscle function.",
    warnings: `${FOOD_SUPPLEMENT} Ask a doctor before use if you take calcium or vitamin D medicines, or have kidney disease or high blood calcium.`,
    forms: [
      {
        code: "CAP",
        label: "capsules",
        dosageForm: "Capsule",
        unit: "capsules",
        strengths: ["1000 IU", "2000 IU"],
        packs: [60, 120],
        basePrice: 6.99,
        usage: "Adults: take 1 capsule a day with a meal and a glass of water.",
        imageForm: "capsule",
      },
      {
        code: "TAB",
        label: "tablets",
        dosageForm: "Tablet",
        unit: "tablets",
        strengths: ["1000 IU"],
        packs: [60, 120],
        basePrice: 5.99,
        usage: "Adults: take 1 tablet a day with a meal and a glass of water.",
        imageForm: "tablet",
      },
    ],
  },
  {
    code: "VC",
    category: "vitamins",
    name: "Vitamin C",
    activeIngredients: ["Vitamin C"],
    imageKey: "vitamin-c",
    description: "Vitamin C supplement that supports the immune system and reduces tiredness.",
    warnings: `${FOOD_SUPPLEMENT} Ask a doctor before use if you are prone to kidney stones or have iron overload (haemochromatosis).`,
    forms: [
      {
        code: "TAB",
        label: "tablets",
        dosageForm: "Tablet",
        unit: "tablets",
        strengths: ["500 mg"],
        packs: [60, 120],
        basePrice: 5.49,
        usage: "Adults: take 1 tablet a day with a meal and a glass of water.",
        imageForm: "tablet",
      },
      {
        code: "EFF",
        label: "effervescent tablets",
        dosageForm: "Effervescent tablet",
        unit: "tablets",
        strengths: ["1000 mg"],
        packs: [20, 60],
        basePrice: 4.99,
        usage:
          "Adults: dissolve 1 tablet in a glass of water (about 200 ml) and drink at once, once a day.",
        imageForm: "tablet",
      },
    ],
  },
  {
    code: "MAG",
    category: "vitamins",
    name: "Magnesium",
    activeIngredients: ["Magnesium"],
    imageKey: "magnesium",
    description: "Magnesium supplement for normal muscle and nerve function and less tiredness.",
    warnings: `${FOOD_SUPPLEMENT} Ask a doctor before use if you have kidney disease. High doses can cause diarrhoea.`,
    forms: [
      {
        code: "TAB",
        label: "tablets",
        dosageForm: "Tablet",
        unit: "tablets",
        strengths: ["300 mg", "400 mg"],
        packs: [60, 100],
        basePrice: 5.99,
        usage: "Adults: take 1 tablet a day with plenty of water.",
        imageForm: "tablet",
      },
      {
        code: "CAP",
        label: "capsules",
        dosageForm: "Capsule",
        unit: "capsules",
        strengths: ["300 mg"],
        packs: [60, 120],
        basePrice: 6.49,
        usage: "Adults: take 1 capsule a day with plenty of water.",
        imageForm: "capsule",
      },
    ],
  },
  {
    code: "ZNC",
    category: "vitamins",
    name: "Zinc",
    activeIngredients: ["Zinc"],
    imageKey: "zinc",
    description: "Zinc supplement that supports the immune system and normal skin.",
    warnings: `${FOOD_SUPPLEMENT} Taking zinc in high doses over a long time can cause copper deficiency.`,
    forms: [
      {
        code: "TAB",
        label: "tablets",
        dosageForm: "Tablet",
        unit: "tablets",
        strengths: ["10 mg"],
        packs: [30, 60, 120],
        basePrice: 3.99,
        usage: "Adults: take 1 tablet a day with a meal and a glass of water.",
        imageForm: "tablet",
      },
    ],
  },
  // allergy
  {
    code: "CET",
    category: "allergy",
    name: "Cetirizine",
    activeIngredients: ["Cetirizine"],
    imageKey: "cetirizine",
    description:
      "Antihistamine for hay fever, dust mite and pet allergy: sneezing, runny nose, itchy watery eyes and hives.",
    warnings:
      "Can cause drowsiness; take care when driving. Avoid alcohol. Ask a doctor before use if you have kidney disease, are pregnant or breastfeeding. Not for children under 6 years unless a doctor advises it.",
    forms: [
      {
        code: "TAB",
        label: "film-coated tablets",
        dosageForm: "Film-coated tablet",
        unit: "tablets",
        strengths: ["10 mg"],
        packs: [7, 20, 50],
        basePrice: 3.99,
        usage:
          "Adults and children from 12 years: swallow 1 tablet once a day with water. Follow the package leaflet.",
        imageForm: "tablet",
      },
      {
        code: "SYR",
        label: "oral solution",
        dosageForm: "Oral solution",
        unit: "ml",
        strengths: ["1 mg/ml"],
        packs: [75, 150],
        basePrice: 5.49,
        usage:
          "Children from 2 years: measure the dose with the supplied spoon according to age, as in the package leaflet.",
        imageForm: "syrup",
      },
    ],
  },
  {
    code: "LOR",
    category: "allergy",
    name: "Loratadine",
    activeIngredients: ["Loratadine"],
    imageKey: "loratadine",
    description:
      "Non-drowsy antihistamine for seasonal allergies: hay fever, itchy eyes, sneezing and allergic skin rashes.",
    warnings:
      "Ask a doctor before use if you have severe liver disease, are pregnant or breastfeeding. Stop and see a doctor if symptoms get worse or last more than a few days.",
    forms: [
      {
        code: "TAB",
        label: "tablets",
        dosageForm: "Tablet",
        unit: "tablets",
        strengths: ["10 mg"],
        packs: [10, 20, 50],
        basePrice: 4.49,
        usage:
          "Adults and children over 30 kg: swallow 1 tablet once a day with water. Follow the package leaflet.",
        imageForm: "tablet",
      },
    ],
  },
  {
    code: "CRO",
    category: "allergy",
    name: "Cromoglicate nasal spray",
    activeIngredients: ["Cromoglicic acid"],
    imageKey: "cromoglicate",
    description:
      "Allergy nasal spray that prevents hay fever symptoms such as a blocked, runny or itchy nose when used regularly.",
    warnings:
      "Works best when started before the pollen season and used regularly. Do not use if you are allergic to any ingredient. Ask a doctor if you are pregnant. See a doctor if symptoms do not improve after 2 weeks.",
    forms: [
      {
        code: "SPR",
        label: "nasal spray",
        dosageForm: "Nasal spray",
        unit: "ml",
        strengths: ["2 %"],
        packs: [15, 30],
        basePrice: 5.99,
        usage:
          "Adults and children from 5 years: spray into each nostril as in the package leaflet. Do not share the bottle.",
        imageForm: "spray",
      },
    ],
  },
  // digestion
  {
    code: "LOP",
    category: "digestion",
    name: "Loperamide",
    activeIngredients: ["Loperamide"],
    imageKey: "loperamide",
    description: "Slows acute diarrhoea in adults and adolescents; drink plenty of fluids with it.",
    warnings:
      "Not for children under 12 years, or if there is blood in the stool or a high fever. Do not use for more than 2 days without medical advice. Drink plenty of fluids, as diarrhoea causes fluid loss.",
    forms: [
      {
        code: "CAP",
        label: "hard capsules",
        dosageForm: "Hard capsule",
        unit: "capsules",
        strengths: ["2 mg"],
        packs: [6, 12, 20],
        basePrice: 3.99,
        usage:
          "Adults and adolescents from 12 years: swallow with water. Do not exceed the maximum daily dose in the package leaflet.",
        imageForm: "capsule",
      },
    ],
  },
  {
    code: "SIM",
    category: "digestion",
    name: "Simeticone",
    activeIngredients: ["Simeticone"],
    imageKey: "simeticone",
    description: "Relieves bloating, trapped wind and stomach cramps caused by gas.",
    warnings:
      "See a doctor if complaints last more than a few days, or if you have severe stomach pain, vomiting or blood in the stool.",
    forms: [
      {
        code: "CAP",
        label: "soft capsules",
        dosageForm: "Soft capsule",
        unit: "capsules",
        strengths: ["80 mg", "120 mg"],
        packs: [20, 50],
        basePrice: 5.49,
        usage: "Adults: swallow 1 capsule with water after meals and at bedtime if needed.",
        imageForm: "capsule",
      },
      {
        code: "TAB",
        label: "chewable tablets",
        dosageForm: "Chewable tablet",
        unit: "tablets",
        strengths: ["80 mg"],
        packs: [20, 50],
        basePrice: 4.99,
        usage: "Adults: chew 1 tablet thoroughly after meals if needed.",
        imageForm: "tablet",
      },
    ],
  },
  {
    code: "CAC",
    category: "digestion",
    name: "Calcium carbonate antacid",
    activeIngredients: ["Calcium carbonate"],
    imageKey: "antacid",
    description: "Fast relief from heartburn, acid indigestion and a sour stomach.",
    warnings:
      "Ask a doctor before use if you have kidney disease or take other medicines. See a doctor if heartburn lasts more than 2 weeks, or if you have difficulty swallowing or unexplained weight loss.",
    forms: [
      {
        code: "TAB",
        label: "chewable tablets",
        dosageForm: "Chewable tablet",
        unit: "tablets",
        strengths: ["680 mg", "1000 mg"],
        packs: [24, 48, 96],
        basePrice: 3.49,
        usage: "Adults: chew 1 to 2 tablets when symptoms occur. Follow the package leaflet.",
        imageForm: "tablet",
      },
    ],
  },
  {
    code: "MAC",
    category: "digestion",
    name: "Macrogol",
    activeIngredients: ["Macrogol 3350"],
    imageKey: "macrogol",
    description:
      "Gentle osmotic laxative for occasional constipation; softens the stool and makes it easier to pass.",
    warnings:
      "Do not use with intestinal obstruction or inflammatory bowel disease. Drink plenty of fluids. See a doctor if constipation lasts more than 2 weeks or there is blood in the stool.",
    forms: [
      {
        code: "SAC",
        label: "powder sachets",
        dosageForm: "Powder for oral solution",
        unit: "sachets",
        strengths: ["13.8 g"],
        packs: [10, 20, 30],
        basePrice: 6.99,
        usage:
          "Adults: dissolve 1 sachet in a glass of water (125 ml) and drink once or twice a day.",
        imageForm: "tablet",
      },
    ],
  },
  {
    code: "PRO",
    category: "digestion",
    name: "Probiotic",
    activeIngredients: ["Lactobacillus rhamnosus"],
    imageKey: "probiotic",
    description:
      "Live bacteria cultures food supplement that supports a healthy gut flora, for example after antibiotics.",
    warnings: `${FOOD_SUPPLEMENT} Ask a doctor before use if your immune system is weakened.`,
    forms: [
      {
        code: "CAP",
        label: "capsules",
        dosageForm: "Capsule",
        unit: "capsules",
        strengths: ["10 billion CFU", "20 billion CFU"],
        packs: [14, 30, 60],
        basePrice: 9.99,
        usage: "Adults: take 1 capsule a day with a glass of water, preferably with a meal.",
        imageForm: "capsule",
      },
    ],
  },
  // first-aid
  {
    code: "PVI",
    category: "first-aid",
    name: "Povidone-iodine",
    activeIngredients: ["Povidone-iodine"],
    imageKey: "povidone",
    description: "Antiseptic for cuts, grazes, scrapes and minor burns to help prevent infection.",
    warnings:
      "Do not use if you have a thyroid disorder, are allergic to iodine, or are pregnant or breastfeeding, unless a doctor advises it. Do not use on large wounds or for long periods. For external use only.",
    forms: [
      {
        code: "OIN",
        label: "ointment",
        dosageForm: "Ointment",
        unit: "g",
        strengths: ["10 %"],
        packs: [20, 30, 100],
        basePrice: 4.99,
        usage: "Clean the wound, then apply a thin layer once or twice a day. Cover if needed.",
        imageForm: "cream",
      },
      {
        code: "SOL",
        label: "antiseptic solution",
        dosageForm: "Cutaneous solution",
        unit: "ml",
        strengths: ["10 %"],
        packs: [30, 100, 250],
        basePrice: 4.49,
        usage: "Apply undiluted to the skin around the wound with a swab. Let it dry.",
        imageForm: "syrup",
      },
    ],
  },
  {
    code: "ARN",
    category: "first-aid",
    name: "Arnica",
    activeIngredients: ["Arnica extract"],
    imageKey: "arnica",
    description:
      "Cooling gel for bruises, sprains, strains and sore muscles after a knock or a fall.",
    warnings:
      "For external use only. Do not apply to broken skin or near the eyes. Stop if a rash appears. Do not use if you are allergic to daisy-family plants.",
    forms: [
      {
        code: "GEL",
        label: "gel",
        dosageForm: "Gel",
        unit: "g",
        strengths: ["25 mg/g", "50 mg/g"],
        packs: [50, 100, 150],
        basePrice: 6.49,
        usage: "Apply to the affected area 2 to 3 times a day and rub in gently.",
        imageForm: "gel",
      },
    ],
  },
  {
    code: "DIM",
    category: "first-aid",
    name: "Dimetindene insect bite",
    activeIngredients: ["Dimetindene"],
    imageKey: "dimetindene",
    description:
      "Cooling gel that relieves itching and swelling from insect bites, stings and sunburn.",
    warnings:
      "For external use only. Do not apply to large areas of skin, broken skin or near the eyes. See a doctor if a sting causes swelling of the face or breathing trouble.",
    forms: [
      {
        code: "GEL",
        label: "gel",
        dosageForm: "Gel",
        unit: "g",
        strengths: ["1 mg/g"],
        packs: [20, 50, 100],
        basePrice: 5.99,
        usage: "Apply to the affected skin 2 to 4 times a day. Do not use for more than 10 days.",
        imageForm: "gel",
      },
    ],
  },
  // eye-ear
  {
    code: "HYA",
    category: "eye-ear",
    name: "Hyaluronic acid eye drops",
    activeIngredients: ["Sodium hyaluronate"],
    imageKey: "hyaluronate",
    description:
      "Lubricating drops for dry, tired or irritated eyes, for example from screens or air conditioning.",
    warnings:
      "Remove contact lenses unless the leaflet says otherwise. Do not touch the eye with the tip. Use within the time stated after opening. See a doctor if eye pain, vision changes or redness occur.",
    forms: [
      {
        code: "DRP",
        label: "eye drops",
        dosageForm: "Eye drops",
        unit: "ml",
        strengths: ["0.1 %", "0.2 %", "0.3 %"],
        packs: [10, 15],
        basePrice: 7.99,
        usage: "Put 1 drop into each eye 3 to 5 times a day, or as needed.",
        imageForm: "spray",
      },
    ],
  },
  {
    code: "TET",
    category: "eye-ear",
    name: "Tetryzoline eye drops",
    activeIngredients: ["Tetryzoline"],
    imageKey: "tetryzoline",
    description: "Eye drops that reduce redness and itching from irritation, pollen or smoke.",
    warnings:
      "Do not use with glaucoma, or for more than a few days. Not for children under 2 years. See a doctor if redness continues, or if there is pain or sensitivity to light.",
    forms: [
      {
        code: "DRP",
        label: "eye drops",
        dosageForm: "Eye drops",
        unit: "ml",
        strengths: ["0.5 mg/ml"],
        packs: [10, 15],
        basePrice: 5.49,
        usage: "Adults and children from 6 years: put 1 drop into each eye up to 3 times a day.",
        imageForm: "spray",
      },
    ],
  },
  {
    code: "EAR",
    category: "eye-ear",
    name: "Earwax removal drops",
    activeIngredients: ["Carbamide peroxide"],
    imageKey: "earwax",
    description: "Ear drops that soften and loosen hardened earwax so it can come out by itself.",
    warnings:
      "Do not use with ear pain, discharge, a perforated eardrum or ear tubes. See a doctor if your hearing is reduced suddenly.",
    forms: [
      {
        code: "DRP",
        label: "ear drops",
        dosageForm: "Ear drops",
        unit: "ml",
        strengths: ["6.5 %"],
        packs: [10, 15, 30],
        basePrice: 5.99,
        usage: "Tilt the head and put 5 drops into the ear twice a day for up to 4 days.",
        imageForm: "spray",
      },
    ],
  },
  // oral-care
  {
    code: "CHX",
    category: "oral-care",
    name: "Chlorhexidine mouthwash",
    activeIngredients: ["Chlorhexidine"],
    imageKey: "chlorhexidine",
    description: "Antiseptic mouthwash for gum inflammation, bleeding gums and mouth ulcers.",
    warnings:
      "Can stain teeth and the tongue temporarily. Do not swallow. Do not use for more than 2 weeks without advice from a dentist.",
    forms: [
      {
        code: "LIQ",
        label: "mouthwash",
        dosageForm: "Mouthwash",
        unit: "ml",
        strengths: ["0.12 %", "0.2 %"],
        packs: [150, 300, 500],
        basePrice: 4.99,
        usage: "Rinse the mouth with 10 ml for 30 seconds twice a day, then spit out.",
        imageForm: "syrup",
      },
    ],
  },
  {
    code: "FLT",
    category: "oral-care",
    name: "Fluoride toothpaste",
    activeIngredients: ["Sodium fluoride"],
    imageKey: "toothpaste",
    description: "Daily toothpaste that protects against tooth decay and strengthens enamel.",
    warnings:
      "Do not swallow. Children under 6 years should use only a pea-sized amount, under adult supervision.",
    forms: [
      {
        code: "PST",
        label: "toothpaste",
        dosageForm: "Toothpaste",
        unit: "ml",
        strengths: ["1000 ppm", "1450 ppm", "5000 ppm"],
        packs: [75, 100],
        basePrice: 2.99,
        usage: "Brush for 2 minutes twice a day, morning and evening, then spit out.",
        imageForm: "cream",
      },
    ],
  },
  {
    code: "BZY",
    category: "oral-care",
    name: "Benzydamine mouth spray",
    activeIngredients: ["Benzydamine"],
    imageKey: "benzydamine",
    description:
      "Numbs and soothes pain and inflammation in the mouth and throat, for example after dental work.",
    warnings:
      "Not for children under 6 years. Do not use if you are allergic to benzydamine or aspirin. See a doctor if pain lasts more than 3 days.",
    forms: [
      {
        code: "SPR",
        label: "mouth and throat spray",
        dosageForm: "Oromucosal spray",
        unit: "ml",
        strengths: ["0.15 %"],
        packs: [15, 30],
        basePrice: 6.49,
        usage: "Adults: spray 4 to 8 times into the mouth or throat, 2 to 6 times a day.",
        imageForm: "spray",
      },
    ],
  },
  // sleep-stress
  {
    code: "MEL",
    category: "sleep-stress",
    name: "Melatonin",
    activeIngredients: ["Melatonin"],
    imageKey: "melatonin",
    description: "Food supplement that helps you fall asleep faster and eases jet lag.",
    warnings: `${FOOD_SUPPLEMENT} Can cause drowsiness; do not drive afterwards. Ask a doctor before use if you take sleeping tablets or other regular medicines.`,
    forms: [
      {
        code: "TAB",
        label: "tablets",
        dosageForm: "Tablet",
        unit: "tablets",
        strengths: ["1 mg", "1.9 mg", "3 mg"],
        packs: [30, 60, 90],
        basePrice: 5.99,
        usage: "Adults: take 1 tablet shortly before going to bed.",
        imageForm: "tablet",
      },
    ],
  },
  {
    code: "VAL",
    category: "sleep-stress",
    name: "Valerian",
    activeIngredients: ["Valerian root extract"],
    imageKey: "valerian",
    description: "Herbal remedy for nervous restlessness and difficulty falling asleep.",
    warnings:
      "Can cause drowsiness. Not for children under 12 years. Ask a doctor before use if you are pregnant or breastfeeding. See a doctor if sleep problems last more than 2 weeks.",
    forms: [
      {
        code: "TAB",
        label: "coated tablets",
        dosageForm: "Coated tablet",
        unit: "tablets",
        strengths: ["225 mg", "450 mg"],
        packs: [30, 60, 100],
        basePrice: 6.99,
        usage: "Adults: take 1 to 2 tablets in the evening with water.",
        imageForm: "tablet",
      },
    ],
  },
  {
    code: "LAV",
    category: "sleep-stress",
    name: "Lavender oil",
    activeIngredients: ["Lavender oil"],
    imageKey: "lavender",
    description:
      "Calms restlessness, anxious moods and mild stress; may help you unwind in the evening.",
    warnings:
      "Not for children under 18 years. Can cause belching with a lavender taste. See a doctor if complaints last more than 2 weeks.",
    forms: [
      {
        code: "CAP",
        label: "soft capsules",
        dosageForm: "Soft capsule",
        unit: "capsules",
        strengths: ["80 mg"],
        packs: [14, 28, 56],
        basePrice: 11.99,
        usage: "Adults: swallow 1 capsule a day with water, not lying down.",
        imageForm: "capsule",
      },
    ],
  },
  {
    code: "ASH",
    category: "sleep-stress",
    name: "Ashwagandha",
    activeIngredients: ["Ashwagandha root extract"],
    imageKey: "ashwagandha",
    description:
      "Plant-based food supplement popular for coping with daily stress and keeping energy up.",
    warnings: `${FOOD_SUPPLEMENT} Not for pregnant or breastfeeding women, or with thyroid disorders, unless a doctor advises it.`,
    forms: [
      {
        code: "CAP",
        label: "capsules",
        dosageForm: "Capsule",
        unit: "capsules",
        strengths: ["300 mg", "600 mg", "900 mg"],
        packs: [30, 60, 120],
        basePrice: 9.49,
        usage: "Adults: take 1 capsule a day with a meal and a glass of water.",
        imageForm: "capsule",
      },
    ],
  },
  // baby-child
  {
    code: "PCK",
    category: "baby-child",
    name: "Paracetamol for children",
    activeIngredients: ["Paracetamol"],
    imageKey: "paracetamol-kids",
    description:
      "Lowers fever and relieves mild pain in babies and children, for example teething or after vaccination.",
    warnings:
      "Dose by weight and age as in the leaflet; never give more than the maximum daily dose. Do not give with other paracetamol medicines. See a doctor if a baby under 3 months has a fever, or fever lasts more than 3 days.",
    forms: [
      {
        code: "SUS",
        label: "oral suspension",
        dosageForm: "Oral suspension",
        unit: "ml",
        strengths: ["120 mg/5 ml", "250 mg/5 ml"],
        packs: [100, 150],
        basePrice: 4.99,
        usage: "Measure the dose with the supplied syringe or spoon according to weight and age.",
        imageForm: "syrup",
      },
    ],
  },
  {
    code: "NAP",
    category: "baby-child",
    name: "Zinc oxide nappy cream",
    activeIngredients: ["Zinc oxide"],
    imageKey: "nappy-cream",
    description: "Protects and soothes a baby's skin against nappy rash and sore bottoms.",
    warnings:
      "For external use only. Do not apply to open or weeping skin. See a doctor if the rash does not improve in a few days or spreads.",
    forms: [
      {
        code: "CRM",
        label: "nappy cream",
        dosageForm: "Cream",
        unit: "g",
        strengths: ["10 %", "20 %"],
        packs: [50, 100, 150],
        basePrice: 3.99,
        usage: "Clean and dry the skin, then apply a thin layer at every nappy change.",
        imageForm: "cream",
      },
    ],
  },
  {
    code: "SAL",
    category: "baby-child",
    name: "Saline nasal spray for babies",
    activeIngredients: ["Sodium chloride"],
    imageKey: "saline-baby",
    description:
      "Gentle salt-water spray that loosens mucus and clears a blocked nose in babies and children.",
    warnings:
      "Use a separate bottle for each child. Do not use for more than a few days without advice. See a doctor if a baby has trouble breathing or feeding.",
    forms: [
      {
        code: "SPR",
        label: "nasal spray",
        dosageForm: "Nasal spray",
        unit: "ml",
        strengths: ["0.9 %", "2.3 %"],
        packs: [20, 50, 100],
        basePrice: 3.49,
        usage: "Spray once into each nostril several times a day, as needed.",
        imageForm: "spray",
      },
    ],
  },
  {
    code: "VDK",
    category: "baby-child",
    name: "Vitamin D drops for babies",
    activeIngredients: ["Vitamin D3"],
    imageKey: "vitamin-d-drops",
    description: "Daily vitamin D drops that support strong bones and teeth in infants.",
    warnings:
      "Give only the stated dose, and do not combine with other vitamin D products without asking a doctor or pharmacist. Keep out of the reach of children.",
    forms: [
      {
        code: "DRP",
        label: "oral drops",
        dosageForm: "Oral drops",
        unit: "ml",
        strengths: ["400 IU", "500 IU", "1000 IU"],
        packs: [10, 20],
        basePrice: 6.49,
        usage: "Give 1 dose (drops or 1 ml as in the leaflet) a day, on a spoon or with food.",
        imageForm: "spray",
      },
    ],
  },
  // womens-health
  {
    code: "FOL",
    category: "womens-health",
    name: "Folic acid",
    activeIngredients: ["Folic acid"],
    imageKey: "folic-acid",
    description:
      "Supplement taken before and during early pregnancy to support the baby's healthy development.",
    warnings: `${FOOD_SUPPLEMENT} Ask a doctor first if you have had a pregnancy affected by a neural tube defect, or take epilepsy medicines.`,
    forms: [
      {
        code: "TAB",
        label: "tablets",
        dosageForm: "Tablet",
        unit: "tablets",
        strengths: ["400 µg", "800 µg"],
        packs: [30, 90, 180],
        basePrice: 3.99,
        usage: "Adults: take 1 tablet a day with water, ideally from before conception.",
        imageForm: "tablet",
      },
    ],
  },
  {
    code: "CLO",
    category: "womens-health",
    name: "Clotrimazole vaginal cream",
    activeIngredients: ["Clotrimazole"],
    imageKey: "clotrimazole",
    description: "Treats vaginal yeast infections: itching, burning and white discharge.",
    warnings:
      "See a doctor if this is your first time, or if you have fever, abdominal pain, or symptoms return within 2 months. Not for girls under 12 years. Do not use tampons during treatment.",
    forms: [
      {
        code: "CRM",
        label: "vaginal cream",
        dosageForm: "Vaginal cream",
        unit: "g",
        strengths: ["1 %", "2 %"],
        packs: [20, 35, 50],
        basePrice: 7.49,
        usage: "Apply with the applicator in the evening as shown in the package leaflet.",
        imageForm: "cream",
      },
    ],
  },
  {
    code: "FER",
    category: "womens-health",
    name: "Iron with vitamin C",
    activeIngredients: ["Iron"],
    imageKey: "iron",
    description:
      "Supports normal red blood cell formation and eases tiredness, for example during periods or pregnancy.",
    warnings: `${FOOD_SUPPLEMENT} Can darken the stool and cause constipation. Accidental overdose of iron is a leading cause of poisoning in children under 6.`,
    forms: [
      {
        code: "CAP",
        label: "capsules",
        dosageForm: "Capsule",
        unit: "capsules",
        strengths: ["14 mg", "28 mg"],
        packs: [30, 60, 120],
        basePrice: 6.99,
        usage: "Adults: take 1 capsule a day with a meal and a glass of water.",
        imageForm: "capsule",
      },
    ],
  },
  {
    code: "CRA",
    category: "womens-health",
    name: "Cranberry",
    activeIngredients: ["Cranberry extract"],
    imageKey: "cranberry",
    description:
      "Food supplement that supports the urinary tract and helps with recurring bladder complaints.",
    warnings: `${FOOD_SUPPLEMENT} It does not treat an infection: see a doctor if you have pain when passing urine, fever or blood in the urine.`,
    forms: [
      {
        code: "CAP",
        label: "capsules",
        dosageForm: "Capsule",
        unit: "capsules",
        strengths: ["400 mg", "500 mg"],
        packs: [30, 60, 90],
        basePrice: 8.49,
        usage: "Adults: take 1 capsule a day with plenty of water.",
        imageForm: "capsule",
      },
    ],
  },
  // more variety for the demo assistant: cough, pain, itch, infections, vitamins
  {
    code: "AMB",
    category: "cold-flu",
    name: "Ambroxol",
    activeIngredients: ["Ambroxol"],
    imageKey: "ambroxol",
    description: "Loosens thick mucus so a chesty, productive cough is easier to bring up.",
    warnings:
      "Ask a doctor before use if you have stomach ulcers or severe liver or kidney disease. Not for children under 2 years. See a doctor if a cough lasts more than a week or comes with fever or breathlessness.",
    forms: [
      {
        code: "SYR",
        label: "cough syrup",
        dosageForm: "Syrup",
        unit: "ml",
        strengths: ["15 mg/5 ml", "30 mg/5 ml"],
        packs: [100, 200],
        basePrice: 6.49,
        usage:
          "Measure the dose with the supplied cup according to age, as in the package leaflet.",
        imageForm: "syrup",
      },
      {
        code: "LOZ",
        label: "lozenges",
        dosageForm: "Lozenge",
        unit: "lozenges",
        strengths: ["15 mg"],
        packs: [20, 50],
        basePrice: 5.49,
        usage: "Adults and children from 12 years: let 1 lozenge dissolve slowly in the mouth.",
        imageForm: "lozenge",
      },
    ],
  },
  {
    code: "DXM",
    category: "cold-flu",
    name: "Dextromethorphan",
    activeIngredients: ["Dextromethorphan"],
    imageKey: "dextromethorphan",
    description: "Calms a dry, irritating cough without phlegm, for example at night.",
    warnings:
      "Not for productive coughs, asthma, or children under 12 years. Do not combine with antidepressants (MAO inhibitors). Can cause drowsiness. See a doctor if a cough lasts more than 7 days.",
    forms: [
      {
        code: "SYR",
        label: "cough syrup",
        dosageForm: "Syrup",
        unit: "ml",
        strengths: ["15 mg/5 ml"],
        packs: [100, 150, 200],
        basePrice: 5.99,
        usage:
          "Adults and adolescents from 12 years: measure with the supplied cup. Do not exceed the daily dose.",
        imageForm: "syrup",
      },
      {
        code: "LOZ",
        label: "lozenges",
        dosageForm: "Lozenge",
        unit: "lozenges",
        strengths: ["10 mg", "15 mg"],
        packs: [12, 24],
        basePrice: 4.99,
        usage: "Adults and adolescents from 12 years: let 1 lozenge dissolve slowly in the mouth.",
        imageForm: "lozenge",
      },
    ],
  },
  {
    code: "ACC",
    category: "cold-flu",
    name: "Acetylcysteine",
    activeIngredients: ["Acetylcysteine"],
    imageKey: "acetylcysteine",
    description: "Thins and loosens mucus in bronchitis, colds and other chesty coughs.",
    warnings:
      "Ask a doctor before use if you have asthma or stomach ulcers. Not for children under 2 years. Drink plenty of fluids. See a doctor if a cough lasts more than a week.",
    forms: [
      {
        code: "TAB",
        label: "effervescent tablets",
        dosageForm: "Effervescent tablet",
        unit: "tablets",
        strengths: ["200 mg", "600 mg"],
        packs: [10, 20, 50],
        basePrice: 5.99,
        usage: "Dissolve 1 tablet in a glass of water and drink it. Follow the package leaflet.",
        imageForm: "tablet",
      },
    ],
  },
  {
    code: "NPX",
    category: "pain-relief",
    name: "Naproxen",
    activeIngredients: ["Naproxen"],
    imageKey: "naproxen",
    description: "Long-lasting relief from period pain, back pain, muscle pain and headache.",
    warnings:
      "Do not use with stomach ulcers, severe heart, liver or kidney disease, or in the last 3 months of pregnancy. Do not use if you are allergic to NSAIDs. Take with food. Seek medical advice if pain lasts more than 4 days.",
    forms: [
      {
        code: "TAB",
        label: "film-coated tablets",
        dosageForm: "Film-coated tablet",
        unit: "tablets",
        strengths: ["250 mg", "500 mg"],
        packs: [10, 20, 30],
        basePrice: 5.49,
        usage:
          "Adults: swallow whole with water and food. Use the lowest dose for the shortest time.",
        imageForm: "tablet",
      },
    ],
  },
  {
    code: "HYD",
    category: "skin-care",
    name: "Hydrocortisone cream",
    activeIngredients: ["Hydrocortisone"],
    imageKey: "hydrocortisone",
    description:
      "Mild steroid cream for itchy, red, inflamed skin: insect bites, eczema flare-ups and allergic rashes.",
    warnings:
      "Do not use on the face for long, on broken or infected skin, or for more than 1 week without advice. Not for children under 2 years. For external use only.",
    forms: [
      {
        code: "CRM",
        label: "cream",
        dosageForm: "Cream",
        unit: "g",
        strengths: ["0.5 %", "1 %"],
        packs: [15, 30, 50],
        basePrice: 4.99,
        usage: "Apply a thin layer to the affected skin once or twice a day and rub in gently.",
        imageForm: "cream",
      },
    ],
  },
  {
    code: "CLF",
    category: "skin-care",
    name: "Clotrimazole skin cream",
    activeIngredients: ["Clotrimazole"],
    imageKey: "clotrimazole-skin",
    description: "Antifungal cream for athlete's foot, ringworm and other fungal skin infections.",
    warnings:
      "For external use only. Keep away from the eyes. Treat for as long as the leaflet says, even when the skin looks better. See a doctor if there is no improvement after 4 weeks.",
    forms: [
      {
        code: "CRM",
        label: "antifungal cream",
        dosageForm: "Cream",
        unit: "g",
        strengths: ["1 %"],
        packs: [20, 30, 50],
        basePrice: 5.49,
        usage: "Apply a thin layer 2 to 3 times a day to the affected area and a little around it.",
        imageForm: "cream",
      },
    ],
  },
  {
    code: "ACV",
    category: "skin-care",
    name: "Aciclovir cold sore cream",
    activeIngredients: ["Aciclovir"],
    imageKey: "aciclovir",
    description: "Treats cold sores on the lips and face when started at the first tingling.",
    warnings:
      "For lips and face only; do not use in the mouth, eyes or on genitals. Wash hands before and after. See a doctor if healing takes longer than 10 days.",
    forms: [
      {
        code: "CRM",
        label: "cold sore cream",
        dosageForm: "Cream",
        unit: "g",
        strengths: ["5 %"],
        packs: [2, 5, 10],
        basePrice: 6.99,
        usage: "Apply 5 times a day, about every 4 hours, for 4 to 5 days. Follow the leaflet.",
        imageForm: "cream",
      },
    ],
  },
  {
    code: "B12",
    category: "vitamins",
    name: "Vitamin B12",
    activeIngredients: ["Vitamin B12"],
    imageKey: "b12",
    description:
      "Supports energy metabolism, the nervous system and less tiredness; useful on a vegan diet.",
    warnings: `${FOOD_SUPPLEMENT} Ask a doctor before use if you have a B12 deficiency of unknown cause.`,
    forms: [
      {
        code: "TAB",
        label: "tablets",
        dosageForm: "Tablet",
        unit: "tablets",
        strengths: ["500 µg", "1000 µg"],
        packs: [60, 100, 180],
        basePrice: 5.99,
        usage: "Adults: take 1 tablet a day with a glass of water.",
        imageForm: "tablet",
      },
    ],
  },
  {
    code: "OM3",
    category: "vitamins",
    name: "Omega-3",
    activeIngredients: ["Fish oil (EPA and DHA)"],
    imageKey: "omega3",
    description: "Fish oil supplement that supports normal heart function, brain and vision.",
    warnings: `${FOOD_SUPPLEMENT} Ask a doctor before use if you take blood thinners or have a fish allergy.`,
    forms: [
      {
        code: "CAP",
        label: "soft capsules",
        dosageForm: "Soft capsule",
        unit: "capsules",
        strengths: ["500 mg", "1000 mg"],
        packs: [60, 120, 180],
        basePrice: 8.99,
        usage: "Adults: take 1 capsule a day with a meal.",
        imageForm: "capsule",
      },
    ],
  },
  {
    code: "AZE",
    category: "allergy",
    name: "Azelastine nasal spray",
    activeIngredients: ["Azelastine"],
    imageKey: "azelastine",
    description:
      "Fast-acting antihistamine nasal spray for hay fever and year-round allergic rhinitis.",
    warnings:
      "Can leave a bitter taste. Ask a doctor before use if you are pregnant or breastfeeding. Not for children under 6 years. See a doctor if symptoms do not improve.",
    forms: [
      {
        code: "SPR",
        label: "nasal spray",
        dosageForm: "Nasal spray",
        unit: "ml",
        strengths: ["1 mg/ml"],
        packs: [10, 20, 30],
        basePrice: 6.99,
        usage: "Adults and children from 6 years: 1 spray into each nostril twice a day.",
        imageForm: "spray",
      },
    ],
  },
  {
    code: "OCT",
    category: "first-aid",
    name: "Octenidine wound spray",
    activeIngredients: ["Octenidine"],
    imageKey: "octenidine",
    description: "Colourless antiseptic spray for cleaning small cuts, grazes and scrapes.",
    warnings:
      "For external use only. Do not use in the eyes, ears or body cavities, or on deep wounds. See a doctor for deep, dirty or animal-bite wounds.",
    forms: [
      {
        code: "SPR",
        label: "wound spray",
        dosageForm: "Cutaneous spray",
        unit: "ml",
        strengths: ["0.05 %", "0.1 %"],
        packs: [50, 100, 250],
        basePrice: 5.99,
        usage: "Spray on the cleaned wound area 2 to 3 times a day.",
        imageForm: "spray",
      },
    ],
  },
  {
    code: "CHS",
    category: "oral-care",
    name: "Mouth ulcer gel",
    activeIngredients: ["Choline salicylate"],
    imageKey: "mouth-ulcer",
    description:
      "Soothing gel that eases the pain of mouth ulcers, denture sores and teething gums.",
    warnings:
      "Not for children under 16 years (contains a salicylate). See a dentist if an ulcer lasts longer than 2 weeks.",
    forms: [
      {
        code: "GEL",
        label: "oral gel",
        dosageForm: "Oral gel",
        unit: "g",
        strengths: ["8.7 %"],
        packs: [10, 15, 25],
        basePrice: 4.99,
        usage: "Dry the area, then apply a small amount with a clean finger up to every 3 hours.",
        imageForm: "gel",
      },
    ],
  },
  {
    code: "NAF",
    category: "oral-care",
    name: "Fluoride mouthwash",
    activeIngredients: ["Sodium fluoride"],
    imageKey: "fluoride-rinse",
    description: "Daily rinse that strengthens enamel and helps protect against cavities.",
    warnings:
      "Do not swallow. Not for children under 6 years. Do not eat or drink for 30 minutes afterwards.",
    forms: [
      {
        code: "LIQ",
        label: "mouthwash",
        dosageForm: "Mouthwash",
        unit: "ml",
        strengths: ["0.05 %", "0.2 %"],
        packs: [250, 500],
        basePrice: 3.99,
        usage: "Rinse with 10 ml for 1 minute once a day after brushing, then spit out.",
        imageForm: "syrup",
      },
    ],
  },
  {
    code: "CAR",
    category: "eye-ear",
    name: "Carbomer eye gel",
    activeIngredients: ["Carbomer"],
    imageKey: "carbomer",
    description: "Long-lasting lubricating gel for very dry eyes, used especially at night.",
    warnings:
      "Can blur vision briefly; do not drive straight after use. Remove contact lenses before use. See a doctor if eye pain or redness occurs.",
    forms: [
      {
        code: "GEL",
        label: "eye gel",
        dosageForm: "Eye gel",
        unit: "g",
        strengths: ["2 mg/g"],
        packs: [10, 30],
        basePrice: 6.99,
        usage: "Put 1 drop into each eye 3 to 4 times a day and before bed.",
        imageForm: "gel",
      },
    ],
  },
  {
    code: "CRE",
    category: "allergy",
    name: "Cromoglicate eye drops",
    activeIngredients: ["Cromoglicic acid"],
    imageKey: "cromoglicate-eyes",
    description: "Eye drops for itchy, watery, red eyes caused by hay fever and other allergies.",
    warnings:
      "Remove contact lenses before use. Works best used regularly before the pollen season. See a doctor if symptoms do not improve in a few days.",
    forms: [
      {
        code: "DRP",
        label: "eye drops",
        dosageForm: "Eye drops",
        unit: "ml",
        strengths: ["2 %"],
        packs: [10, 15, 20],
        basePrice: 5.49,
        usage: "Adults and children from 4 years: put 1 to 2 drops into each eye 4 times a day.",
        imageForm: "spray",
      },
    ],
  },
  {
    code: "LMB",
    category: "sleep-stress",
    name: "Lemon balm",
    activeIngredients: ["Lemon balm extract"],
    imageKey: "lemon-balm",
    description:
      "Herbal remedy for mild nervous tension, restlessness and sleep that is easily disturbed.",
    warnings:
      "Can cause drowsiness. Not for children under 12 years. Ask a doctor before use if you take thyroid medicines. See a doctor if symptoms last more than 2 weeks.",
    forms: [
      {
        code: "TAB",
        label: "coated tablets",
        dosageForm: "Coated tablet",
        unit: "tablets",
        strengths: ["500 mg"],
        packs: [30, 60, 90],
        basePrice: 6.49,
        usage: "Adults: take 1 tablet 1 to 3 times a day with water.",
        imageForm: "tablet",
      },
      {
        code: "CAP",
        label: "capsules",
        dosageForm: "Capsule",
        unit: "capsules",
        strengths: ["300 mg"],
        packs: [30, 60],
        basePrice: 7.49,
        usage: "Adults: take 1 capsule a day with water in the evening.",
        imageForm: "capsule",
      },
    ],
  },
];

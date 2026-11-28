import type { API, Types } from "@opensearch-project/opensearch";

type Property = Types.Common_Mapping.Property;
import type { ProductRow } from "../db/schema.js";
import { synonyms } from "./synonyms.js";

/** Search reads this alias; each reindex points it at a new `products_v<n>` index. */
export const PRODUCTS_ALIAS = "products";

/** Voyage `voyage-3.5-lite` returns 1,024 dimensions (plan decision 3). Changing it needs a reindex. */
export const EMBEDDING_DIMENSION = 1024;

/** What one product looks like in the index. `_id` is the product id, so a re-index overwrites. */
export interface ProductSearchDocument {
  id: number;
  name: string;
  description: string;
  category: string;
  brand: string;
  activeIngredients: string[];
  dosageForm: string | null;
  requiresPrescription: boolean;
  inStock: boolean;
  price: number;
  // Stored so search results can be shown without a Postgres round trip; never searched.
  imageUrl: string | null;
}

export function toSearchDocument(row: ProductRow): ProductSearchDocument {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    brand: row.brand,
    activeIngredients: row.activeIngredients,
    dosageForm: row.dosageForm,
    requiresPrescription: row.requiresPrescription,
    inStock: row.stockQuantity > 0,
    // pg returns numeric as a string; 2-decimal prices fit a JS number.
    price: Number(row.price),
    imageUrl: row.imageUrl,
  };
}

// Index and search analyzers are the same chain except for synonyms, so synonyms live only at search
// time and can change with a settings update instead of a reindex.
const englishChain = ["english_possessive", "lowercase", "english_stop", "english_stemmer"];
const germanChain = ["lowercase", "german_stop", "german_normalization", "german_stemmer"];
const withSynonyms = (chain: string[]) => [
  ...chain.slice(0, chain.indexOf("lowercase") + 1),
  "product_synonyms",
  ...chain.slice(chain.indexOf("lowercase") + 1),
];

const analysis: Types.Indices_Common.IndexSettingsAnalysis = {
  filter: {
    english_possessive: { type: "stemmer", language: "possessive_english" },
    english_stop: { type: "stop", stopwords: "_english_" },
    english_stemmer: { type: "stemmer", language: "english" },
    german_stop: { type: "stop", stopwords: "_german_" },
    german_stemmer: { type: "stemmer", language: "light_german" },
    product_synonyms: { type: "synonym_graph", synonyms: [...synonyms] },
  },
  normalizer: {
    lowercase: { type: "custom", filter: ["lowercase"] },
  },
  analyzer: {
    en_index: { type: "custom", tokenizer: "standard", filter: englishChain },
    en_search: { type: "custom", tokenizer: "standard", filter: withSynonyms(englishChain) },
    de_index: { type: "custom", tokenizer: "standard", filter: germanChain },
    de_search: { type: "custom", tokenizer: "standard", filter: withSynonyms(germanChain) },
  },
};

/** English text with a German subfield, plus an exact `keyword` subfield. */
const bilingualText: Types.Common_Mapping.TextProperty & { fields: Record<string, Property> } = {
  type: "text",
  analyzer: "en_index",
  search_analyzer: "en_search",
  fields: {
    de: { type: "text", analyzer: "de_index", search_analyzer: "de_search" },
    keyword: { type: "keyword", ignore_above: 256 },
  },
};

/** An exact value for filters and facets, with a lower-cased copy: Postgres filters ignore case. */
const lowercaseKeyword: Property = { type: "keyword", normalizer: "lowercase" };
const facetKeyword: Property = {
  type: "keyword",
  fields: { lower: lowercaseKeyword },
};

export const productIndexBody: API.Indices_Create_RequestBody = {
  settings: {
    // One node on the free host and locally: replicas could never be assigned.
    number_of_shards: 1,
    number_of_replicas: 0,
    knn: true,
    analysis,
  },
  mappings: {
    // A typo in a field name should fail the write, not create a new field.
    dynamic: "strict",
    properties: {
      id: { type: "integer" },
      name: {
        ...bilingualText,
        fields: { ...bilingualText.fields, suggest: { type: "search_as_you_type" } },
      },
      description: { type: "text", analyzer: "en_index", search_analyzer: "en_search" },
      activeIngredients: bilingualText,
      brand: {
        ...bilingualText,
        fields: { ...bilingualText.fields, lower: lowercaseKeyword },
      },
      category: facetKeyword,
      dosageForm: facetKeyword,
      requiresPrescription: { type: "boolean" },
      inStock: { type: "boolean" },
      price: { type: "scaled_float", scaling_factor: 100 },
      imageUrl: { type: "keyword", index: false, doc_values: false },
      // Filled by the app from PR 4; documents without it are still valid.
      embedding: {
        type: "knn_vector",
        dimension: EMBEDDING_DIMENSION,
        method: { name: "hnsw", space_type: "cosinesimil", engine: "lucene" },
      },
    },
  },
};

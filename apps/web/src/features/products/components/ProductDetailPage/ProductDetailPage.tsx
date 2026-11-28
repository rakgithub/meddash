import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AddToCart } from "../../../cart";
import { useProduct } from "../../hooks/useProduct";
import { useSearchQuery } from "../../hooks/useSearchQuery";
import type { ProductDetail } from "../../types";
import { formatCategory } from "../../utils/formatCategory";
import { formatPrice } from "../../utils/formatPrice";
import { formatStock } from "../../utils/formatStock";
import { CategoryAisles } from "../CategoryAisles/CategoryAisles";
import styles from "./ProductDetailPage.module.css";
import { PageTitle } from "../../../../lib/PageTitle";

const BackLink = () => (
  <Link className={styles.back} to="/shop">
    ← Back to products
  </Link>
);

export function ProductDetailPage() {
  // The route is `/products/:id`, so id is always present.
  const { id = "" } = useParams();
  const state = useProduct(id);
  const title =
    state.status === "success"
      ? state.product.name
      : state.status === "not-found"
        ? "Product not found"
        : "Product";
  // Searching or filtering from here opens the results on `/`.
  const { filters, search } = useSearchQuery();

  return (
    <div className={styles.page}>
      <PageTitle title={title} />
      <CategoryAisles
        value={filters.category}
        onChange={(category) => search({ ...filters, category })}
      />
      <BackLink />
      {state.status === "loading" && <p className={styles.message}>Loading product...</p>}
      {state.status === "error" && (
        <p className={`${styles.message} ${styles.error}`}>Could not load product</p>
      )}
      {state.status === "not-found" && <p className={styles.message}>Product not found</p>}
      {state.status === "success" && <ProductDetails product={state.product} />}
    </div>
  );
}

function ProductDetails({ product }: { product: ProductDetail }) {
  // Remember which URL failed, so a new imageUrl gets a fresh attempt without an effect.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = product.imageUrl !== null && product.imageUrl !== failedUrl;

  const facts = [
    ["Manufacturer", product.manufacturer],
    ["Dosage form", product.dosageForm],
    ["Pack size", product.packSize],
    ["PZN", product.pzn],
    ["SKU", product.sku],
  ].filter((fact): fact is [string, string] => fact[1] !== null);

  const inStock = product.stockQuantity > 0;
  const hasInfo =
    Boolean(product.warnings) ||
    product.activeIngredients.length > 0 ||
    Boolean(product.usageInstructions);

  return (
    <article className={styles.detail}>
      <div className={styles.media}>
        {showImage ? (
          <img
            className={styles.image}
            src={product.imageUrl ?? undefined}
            alt={product.name}
            width={600}
            height={450}
            onError={() => setFailedUrl(product.imageUrl)}
          />
        ) : (
          <svg className={styles.placeholder} viewBox="0 0 24 24" aria-hidden="true">
            <rect x="3" y="8.5" width="18" height="7" rx="3.5" transform="rotate(-45 12 12)" />
            <path d="M9.5 9.5l5 5" />
          </svg>
        )}
      </div>

      <div className={styles.summary}>
        <div className={styles.top}>
          <span className={styles.category}>
            <span className={styles.capsule} data-category={product.category} aria-hidden="true" />
            {formatCategory(product.category)}
          </span>
          <span className={styles.brand}>{product.brand}</span>
        </div>
        <h1 className={styles.name}>{product.name}</h1>
        <p className={styles.description}>{product.description}</p>

        {facts.length > 0 && (
          <section className={styles.factsSection} aria-labelledby="product-facts">
            <h2 id="product-facts">Product details</h2>
            <dl className={styles.facts}>
              {facts.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}
      </div>

      <section className={styles.buyBox} aria-label="Buy">
        <div className={styles.priceRow}>
          <p className={styles.price}>{formatPrice(product.price)}</p>
          <p className={inStock ? styles.stock : `${styles.stock} ${styles.outOfStock}`}>
            {formatStock(product.stockQuantity)}
          </p>
        </div>
        {product.packSize && <p className={styles.pack}>{product.packSize}</p>}

        {product.requiresPrescription && (
          <div className={styles.rx} role="note">
            <strong>Prescription only</strong>
            <p>
              This medicine can only be supplied with a valid prescription. Prescription upload is
              coming soon, so it cannot be added to your cart yet.
            </p>
          </div>
        )}

        {/* Keyed so quantity and messages start fresh on another product. */}
        <AddToCart key={product.id} product={product} />

        <ul className={styles.service}>
          <li>Delivered in 1 to 3 working days</li>
          <li>Unopened packs can be returned within 14 days</li>
        </ul>
      </section>

      {hasInfo && (
        <div className={styles.info}>
          {/* Safety first: the warnings sit above the rest, where they can't be skipped. */}
          {product.warnings && (
            <section className={styles.warnings} aria-labelledby="product-warnings">
              <h2 id="product-warnings">Warnings</h2>
              <p>{product.warnings}</p>
            </section>
          )}
          {product.activeIngredients.length > 0 && (
            <section className={styles.section} aria-labelledby="product-ingredients">
              <h2 id="product-ingredients">Active ingredients</h2>
              <ul>
                {product.activeIngredients.map((ingredient) => (
                  <li key={ingredient}>{ingredient}</li>
                ))}
              </ul>
            </section>
          )}
          {product.usageInstructions && (
            <section className={styles.section} aria-labelledby="product-usage">
              <h2 id="product-usage">Usage instructions</h2>
              <p>{product.usageInstructions}</p>
            </section>
          )}
        </div>
      )}
    </article>
  );
}

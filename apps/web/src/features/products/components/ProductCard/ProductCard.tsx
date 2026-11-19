import { useState } from "react";
import type { Product } from "../../types";
import { formatCategory } from "../../utils/formatCategory";
import { formatPrice } from "../../utils/formatPrice";
import styles from "./ProductCard.module.css";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  // Remember which URL failed, so a new imageUrl gets a fresh attempt without an effect.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = product.imageUrl !== null && product.imageUrl !== failedUrl;

  return (
    <article className={styles.card}>
      <div className={styles.media}>
        {showImage ? (
          <img
            className={styles.image}
            src={product.imageUrl ?? undefined}
            alt={product.name}
            loading="lazy"
            decoding="async"
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
      <div className={styles.top}>
        <span className={styles.category}>{formatCategory(product.category)}</span>
        <span className={styles.brand}>{product.brand}</span>
      </div>
      <h3 className={styles.name}>{product.name}</h3>
      <p className={styles.description}>{product.description}</p>
      <div className={styles.footer}>
        <span className={styles.price}>{formatPrice(product.price)}</span>
      </div>
    </article>
  );
}

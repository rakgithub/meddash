import { useState, type ReactElement } from "react";
import { Link } from "react-router-dom";
import { formatPrice, formatStock, LOW_STOCK_THRESHOLD } from "../../../products";
import type { Recommendation } from "../../types";
import { dosageFormKind, type DosageFormKind } from "../../utils/dosageFormKind";
import styles from "./ChatProductCard.module.css";

interface ChatProductCardProps {
  recommendation: Recommendation;
}

const ICONS: Record<DosageFormKind, ReactElement> = {
  tablet: (
    <>
      <rect x="3" y="8.5" width="18" height="7" rx="3.5" transform="rotate(-45 12 12)" />
      <path d="M9.5 9.5l5 5" />
    </>
  ),
  liquid: (
    <>
      <path d="M9 3h6M10 3v3l-3 3v10a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9l-3-3V3" />
      <path d="M7 13h10" />
    </>
  ),
  spray: (
    <>
      <path d="M9 9h6v10a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2zM10 9V6h4v3M12 6V3" />
      <path d="M17 4l2-1M17 6h2.5M17 8l2 1" />
    </>
  ),
  cream: <path d="M8 21h8l-1-12H9zM9 9l1-4h4l1 4M10 5V3h4v2" />,
};

/** A suggested product as one compact row: picture, name, why it was picked, price. */
export function ChatProductCard({ recommendation }: ChatProductCardProps) {
  const { product, reason, fit, caution } = recommendation;
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = product.imageUrl !== null && product.imageUrl !== failedUrl;
  const locked = fit === "locked";

  return (
    <article
      className={locked ? `${styles.row} ${styles.locked}` : styles.row}
      aria-label={product.name}
    >
      <span className={styles.thumb}>
        {showImage ? (
          <img
            className={styles.image}
            src={product.imageUrl ?? undefined}
            alt=""
            loading="lazy"
            decoding="async"
            width={48}
            height={48}
            onError={() => setFailedUrl(product.imageUrl)}
          />
        ) : (
          <svg className={styles.placeholder} viewBox="0 0 24 24" aria-hidden="true">
            {ICONS[dosageFormKind(product.dosageForm) ?? "tablet"]}
          </svg>
        )}
      </span>

      <span className={styles.body}>
        <Link className={styles.name} to={`/products/${encodeURIComponent(product.id)}`}>
          {product.name}
        </Link>
        <span className={styles.reason}>{reason}</span>
        {caution && (
          <span className={styles.caution}>
            <span className="visually-hidden">Check first: </span>
            {caution}
          </span>
        )}
      </span>

      <span className={styles.end}>
        {locked ? (
          <span className={styles.rx}>Needs a prescription</span>
        ) : (
          <>
            <span className={styles.price}>{formatPrice(product.price)}</span>
            {/* Low and out of stock are worth a word in a compact row; plain "In stock" is not. */}
            {product.stockQuantity <= LOW_STOCK_THRESHOLD && (
              <span className={styles.stock}>{formatStock(product.stockQuantity)}</span>
            )}
          </>
        )}
      </span>
    </article>
  );
}

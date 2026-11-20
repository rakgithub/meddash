import { useId, useState } from "react";
import { Link } from "react-router-dom";
import { formatPrice } from "../../../products";
import { MAX_QUANTITY_PER_PRODUCT, type CartLine } from "../../types";
import { QuantityStepper } from "../QuantityStepper/QuantityStepper";
import styles from "./CartLineItem.module.css";

export type LinePending = "update" | "remove";

interface CartLineItemProps {
  line: CartLine;
  /** What this line is waiting for, if anything. */
  pending: LinePending | null;
  /** True while another line is saving; mutations run one at a time. */
  locked: boolean;
  error: string | null;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
}

export function CartLineItem({
  line,
  pending,
  locked,
  error,
  onQuantityChange,
  onRemove,
}: CartLineItemProps) {
  const { product, quantity, lineTotal } = line;
  const nameId = useId();
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = product.imageUrl !== null && product.imageUrl !== failedUrl;
  const disabled = pending !== null || locked;

  return (
    <article className={styles.line} aria-labelledby={nameId} aria-busy={pending !== null}>
      <div className={styles.media}>
        {showImage ? (
          <img
            className={styles.image}
            src={product.imageUrl ?? undefined}
            alt=""
            width={96}
            height={96}
            onError={() => setFailedUrl(product.imageUrl)}
          />
        ) : (
          <svg className={styles.placeholder} viewBox="0 0 24 24" aria-hidden="true">
            <rect x="3" y="8.5" width="18" height="7" rx="3.5" transform="rotate(-45 12 12)" />
            <path d="M9.5 9.5l5 5" />
          </svg>
        )}
      </div>

      <div className={styles.info}>
        <h2 className={styles.name} id={nameId}>
          <Link to={`/products/${encodeURIComponent(product.id)}`}>{product.name}</Link>
        </h2>
        <p className={styles.meta}>
          {product.brand} <span aria-hidden="true">/</span> {formatPrice(product.price)} each
        </p>
      </div>

      <div className={styles.controls}>
        <QuantityStepper
          value={quantity}
          // The server also caps at the stock and answers 409, shown as the line's error.
          max={MAX_QUANTITY_PER_PRODUCT}
          label={`Quantity of ${product.name}`}
          disabled={disabled}
          onChange={onQuantityChange}
        />
      </div>
      <button type="button" className={styles.remove} disabled={disabled} onClick={onRemove}>
        {pending === "remove" ? "Removing…" : "Remove"}
      </button>

      <p className={styles.total}>
        <span className="visually-hidden">Line total </span>
        {formatPrice(lineTotal)}
      </p>

      <p className={styles.status} role="status">
        {pending === "update" ? "Updating quantity…" : ""}
      </p>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </article>
  );
}

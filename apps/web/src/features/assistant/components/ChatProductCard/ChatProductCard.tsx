import { useState, type ReactElement } from "react";
import { Link } from "react-router-dom";
import { formatPrice, formatStock, UploadPrescriptionButton } from "../../../products";
import type { Recommendation } from "../../types";
import { DISMISS_REASONS, type DismissReason } from "../../utils/caseFile";
import { dosageFormKind, type DosageFormKind } from "../../utils/dosageFormKind";
import { ingredientName } from "../../utils/ingredientName";
import styles from "./ChatProductCard.module.css";

interface ChatProductCardProps {
  recommendation: Recommendation;
  /** Asks the assistant about an ingredient; leave it out to show the ingredients as plain text. */
  onAskIngredient?: (ingredient: string) => void;
  /** "Not for me" with a reason; leave it out to hide the button, e.g. on an older, read-only reply. */
  onDismiss?: (reason: DismissReason) => void;
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
  cream: (
    <>
      <path d="M8 21h8l-1-12H9zM9 9l1-4h4l1 4M10 5V3h4v2" />
    </>
  ),
};

function stockTone(quantity: number) {
  if (quantity <= 0) return styles.out;
  return quantity <= 5 ? styles.low : styles.inStock;
}

export function ChatProductCard({
  recommendation,
  onAskIngredient,
  onDismiss,
}: ChatProductCardProps) {
  const { product, reason, fit, caution } = recommendation;
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const [choosing, setChoosing] = useState(false);
  const showImage = product.imageUrl !== null && product.imageUrl !== failedUrl;
  const kind = dosageFormKind(product.dosageForm);
  const locked = fit === "locked";
  const className = [styles.card, fit === "best" && styles.best, locked && styles.locked]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={className} aria-label={product.name}>
      <div className={styles.media}>
        {showImage ? (
          <img
            className={styles.image}
            src={product.imageUrl ?? undefined}
            alt=""
            loading="lazy"
            decoding="async"
            width={600}
            height={450}
            onError={() => setFailedUrl(product.imageUrl)}
          />
        ) : (
          <svg className={styles.placeholder} viewBox="0 0 24 24" aria-hidden="true">
            {ICONS[kind ?? "tablet"]}
          </svg>
        )}
      </div>

      <div className={styles.body}>
        {fit === "best" && <p className={styles.flag}>Best fit</p>}
        <p className={styles.brand}>{product.brand}</p>
        <h3 className={styles.name}>
          <Link className={styles.link} to={`/products/${encodeURIComponent(product.id)}`}>
            {product.name}
          </Link>
        </h3>

        {product.dosageForm && (
          <p className={styles.form}>
            {kind && (
              <svg className={styles.formIcon} viewBox="0 0 24 24" aria-hidden="true">
                {ICONS[kind]}
              </svg>
            )}
            {product.dosageForm}
            {product.packSize && <span className={styles.pack}>{product.packSize}</span>}
          </p>
        )}

        <p className={styles.why}>
          <span className={styles.whyLabel}>Why this? </span>
          {reason}
        </p>

        {caution && (
          <p className={styles.caution}>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M8 2l6.5 11.5h-13z" />
              <path d="M8 6.5v3M8 11.5v.5" />
            </svg>
            <span>
              <span className={styles.cautionLabel}>Check first: </span>
              {caution}
            </span>
          </p>
        )}

        {product.activeIngredients.length > 0 && (
          <ul className={styles.ingredients} aria-label="Active ingredients">
            {product.activeIngredients.map((raw) => {
              const name = ingredientName(raw);
              return (
                <li key={raw}>
                  {onAskIngredient ? (
                    <button
                      className={styles.pill}
                      type="button"
                      aria-label={`Ask about ${name}`}
                      onClick={() => onAskIngredient(name)}
                    >
                      {name}
                    </button>
                  ) : (
                    <span className={styles.pill}>{name}</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <div className={styles.footer}>
          <span className={styles.price}>{formatPrice(product.price)}</span>
          {locked ? (
            <span className={styles.rx}>
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <rect x="3" y="7" width="10" height="7" rx="1.5" />
                <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
              </svg>
              Needs a prescription
            </span>
          ) : (
            <span className={`${styles.stock} ${stockTone(product.stockQuantity)}`}>
              {formatStock(product.stockQuantity)}
            </span>
          )}
        </div>
        {locked && (
          <div className={styles.upload}>
            <UploadPrescriptionButton />
          </div>
        )}

        {onDismiss && (
          <div className={styles.dismiss}>
            <button
              className={styles.dismissToggle}
              type="button"
              aria-expanded={choosing}
              onClick={() => setChoosing(!choosing)}
            >
              Not for me
            </button>
            {choosing && (
              <ul className={styles.reasons} aria-label="Why not?">
                {DISMISS_REASONS.map((reason) => (
                  <li key={reason}>
                    <button
                      className={styles.reason}
                      type="button"
                      onClick={() => onDismiss(reason)}
                    >
                      {reason}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

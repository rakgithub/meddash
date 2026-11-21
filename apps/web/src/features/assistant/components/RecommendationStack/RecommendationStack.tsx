import { useEffect, useId, useRef, useState } from "react";
import type { ProductDetail } from "../../../products";
import type { Recommendation } from "../../types";
import type { DismissReason } from "../../utils/caseFile";
import { ChatProductCard } from "../ChatProductCard/ChatProductCard";
import { CompareDrawer } from "../CompareDrawer/CompareDrawer";
import { PharmacistContact } from "../PharmacistContact/PharmacistContact";
import styles from "./RecommendationStack.module.css";

interface RecommendationStackProps {
  /** The heading over the shortlist, e.g. "My suggestions for a sore throat". */
  title?: string;
  items: Recommendation[];
  /** Cards still loading, shown as skeletons. */
  loading?: number;
  /** Suggestions that couldn't be loaded. */
  unavailable?: number;
  /** Suggestions left out because the user ruled them out. */
  ruledOut?: number;
  onAskIngredient?: (ingredient: string) => void;
  /** "Not for me"; the card slides out first. Leave it out to make the stack read-only. */
  onDismiss?: (product: ProductDetail, reason: DismissReason) => void;
}

/** The shortlist worth comparing is the top three; prescription-only products aren't options yet. */
const COMPARE_MAX = 3;

/** Matches the `leave` animation in the stylesheet, i.e. --duration-base. */
const LEAVE_MS = 220;

/** The suggested products under a reply: a grid on desktop, a swipeable row on mobile. */
export function RecommendationStack({
  title = "My suggestions",
  items,
  loading = 0,
  unavailable = 0,
  ruledOut = 0,
  onAskIngredient,
  onDismiss,
}: RecommendationStackProps) {
  const [leavingId, setLeavingId] = useState<string | null>(null);
  const [comparing, setComparing] = useState(false);
  const timerRef = useRef<number>();
  const lockedId = useId();

  // Starting over while a card is leaving must not dismiss it in the fresh conversation.
  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  function dismiss(product: ProductDetail, reason: DismissReason) {
    if (!onDismiss) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onDismiss(product, reason);
      return;
    }
    setLeavingId(product.id);
    timerRef.current = window.setTimeout(() => onDismiss(product, reason), LEAVE_MS);
  }

  if (loading > 0) {
    return (
      <div className={styles.stack} role="status" aria-label="Loading suggestions">
        {Array.from({ length: loading }, (_, i) => (
          <div key={i} className={i === 0 ? `${styles.skeleton} ${styles.wide}` : styles.skeleton}>
            <div className={styles.skeletonMedia} />
            <div className={styles.skeletonLine} />
            <div className={`${styles.skeletonLine} ${styles.short}`} />
          </div>
        ))}
      </div>
    );
  }

  const note =
    unavailable > 0 &&
    `${unavailable} ${unavailable === 1 ? "suggestion" : "suggestions"} unavailable`;
  const comparable = items
    .filter((item) => item.fit !== "locked")
    .slice(0, COMPARE_MAX)
    .map((item) => item.product);
  const allRuledOut = items.length === 0 && ruledOut > 0;

  // Prescription-only products can't be bought here yet, so they sit apart from the real options.
  const options = items.filter((item) => item.fit !== "locked");
  const locked = items.filter((item) => item.fit === "locked");

  function card(item: Recommendation) {
    return (
      <li
        key={item.product.id}
        className={[
          styles.item,
          item.fit === "best" && styles.wide,
          item.product.id === leavingId && styles.leaving,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <ChatProductCard
          recommendation={item}
          onAskIngredient={onAskIngredient}
          onDismiss={onDismiss && ((reason) => dismiss(item.product, reason))}
        />
      </li>
    );
  }

  return (
    <div className={styles.root}>
      {items.length > 0 && <h3 className={styles.title}>{title}</h3>}
      {options.length > 0 && (
        <ol className={styles.stack} aria-label="Suggested products">
          {options.map(card)}
        </ol>
      )}
      {locked.length > 0 && (
        <section className={styles.locked} aria-labelledby={lockedId}>
          <h4 id={lockedId} className={styles.lockedTitle}>
            Also used for this, with a prescription
          </h4>
          <ul className={styles.stack}>{locked.map(card)}</ul>
        </section>
      )}
      {note && <p className={styles.note}>{note}</p>}
      {allRuledOut && (
        <p className={styles.note}>
          You’ve ruled out every suggestion here. A pharmacist can suggest others.
        </p>
      )}
      {(comparable.length >= 2 || items.length > 0 || allRuledOut) && (
        <div className={styles.actions}>
          {comparable.length >= 2 && (
            <button className={styles.compare} type="button" onClick={() => setComparing(true)}>
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M2 4h8M2 8h12M2 12h6" />
              </svg>
              Compare
            </button>
          )}
          {(items.length > 0 || allRuledOut) && <PharmacistContact />}
        </div>
      )}
      {comparing && <CompareDrawer products={comparable} onClose={() => setComparing(false)} />}
    </div>
  );
}

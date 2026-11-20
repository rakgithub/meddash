import { useEffect, useRef, useState } from "react";
import type { ProductDetail } from "../../../products";
import type { Recommendation } from "../../types";
import type { DismissReason } from "../../utils/caseFile";
import { ChatProductCard } from "../ChatProductCard/ChatProductCard";
import { CompareDrawer } from "../CompareDrawer/CompareDrawer";
import { PharmacistContact } from "../PharmacistContact/PharmacistContact";
import styles from "./RecommendationStack.module.css";

interface RecommendationStackProps {
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

/** Matches the `leave` animation in the stylesheet. */
const LEAVE_MS = 220;

/** The suggested products under a reply: a grid on desktop, a swipeable row on mobile. */
export function RecommendationStack({
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

  return (
    <div className={styles.root}>
      {items.length > 0 && (
        <ol className={styles.stack} aria-label="Suggested products">
          {items.map((item) => (
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
          ))}
        </ol>
      )}
      {note && <p className={styles.note}>{note}</p>}
      {allRuledOut && (
        <p className={styles.note}>
          You’ve ruled out every suggestion here. A pharmacist can suggest others.
        </p>
      )}
      {comparable.length >= 2 && (
        <button className={styles.compare} type="button" onClick={() => setComparing(true)}>
          Compare
        </button>
      )}
      {comparing && <CompareDrawer products={comparable} onClose={() => setComparing(false)} />}
      {(items.length > 0 || allRuledOut) && <PharmacistContact />}
    </div>
  );
}

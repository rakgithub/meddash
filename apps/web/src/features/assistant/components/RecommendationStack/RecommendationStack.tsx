import type { Recommendation } from "../../types";
import { ChatProductCard } from "../ChatProductCard/ChatProductCard";
import styles from "./RecommendationStack.module.css";

interface RecommendationStackProps {
  items: Recommendation[];
  /** Cards still loading, shown as skeletons. */
  loading?: number;
  /** Suggestions that couldn't be loaded. */
  unavailable?: number;
  onAskIngredient?: (ingredient: string) => void;
}

/** The suggested products under a reply: a grid on desktop, a swipeable row on mobile. */
export function RecommendationStack({
  items,
  loading = 0,
  unavailable = 0,
  onAskIngredient,
}: RecommendationStackProps) {
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

  return (
    <div className={styles.root}>
      {items.length > 0 && (
        <ol className={styles.stack} aria-label="Suggested products">
          {items.map((item) => (
            <li
              key={item.product.id}
              className={item.fit === "best" ? `${styles.item} ${styles.wide}` : styles.item}
            >
              <ChatProductCard recommendation={item} onAskIngredient={onAskIngredient} />
            </li>
          ))}
        </ol>
      )}
      {note && <p className={styles.note}>{note}</p>}
    </div>
  );
}

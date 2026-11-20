import { useId, useState } from "react";
import type { ConsultationState } from "../../utils/consultationReducer";
import { loadSaved, removeSaved, summaryLine } from "../../utils/savedConsultations";
import styles from "./SavedConsultations.module.css";

interface SavedConsultationsProps {
  userId: string;
  onReopen: (state: ConsultationState) => void;
}

const dateFormat = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" });

/** The signed-in user's saved consultations, as summary cards on the start screen. */
export function SavedConsultations({ userId, onReopen }: SavedConsultationsProps) {
  const [items, setItems] = useState(() => loadSaved(userId));
  const [failed, setFailed] = useState(false);
  const headingId = useId();

  if (items.length === 0) return null;

  function remove(id: string) {
    try {
      setItems(removeSaved(userId, id));
      setFailed(false);
    } catch (err) {
      console.error("Could not remove the saved consultation", err);
      setFailed(true);
    }
  }

  return (
    <section className={styles.saved} aria-labelledby={headingId}>
      <h3 id={headingId}>Your consultations</h3>
      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item.id} className={styles.card}>
            <p className={styles.summary}>{summaryLine(item)}</p>
            <p className={styles.date}>Saved {dateFormat.format(new Date(item.savedAt))}</p>
            <div className={styles.actions}>
              {/* The title in the name tells one card's buttons from the next. */}
              <button
                className={styles.reopen}
                type="button"
                aria-label={`Reopen ${item.title}`}
                onClick={() => onReopen(item.state)}
              >
                Reopen
              </button>
              <button
                className={styles.remove}
                type="button"
                aria-label={`Remove ${item.title}`}
                onClick={() => remove(item.id)}
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
      {failed && (
        <p className={styles.error} role="alert">
          Couldn’t remove it. Your browser’s storage may be blocked.
        </p>
      )}
    </section>
  );
}

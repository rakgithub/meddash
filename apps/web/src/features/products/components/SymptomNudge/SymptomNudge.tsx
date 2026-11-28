import { Link } from "react-router-dom";
import { ASK_PARAM } from "../../../assistant";
import styles from "./SymptomNudge.module.css";

interface SymptomNudgeProps {
  query: string;
  reason: "symptom" | "noResults";
}

/** Points a search that reads like a symptom, or found nothing, to the assistant. */
export function SymptomNudge({ query, reason }: SymptomNudgeProps) {
  const title =
    reason === "symptom" ? `“${query}” sounds like a symptom` : `Nothing matches “${query}”`;

  return (
    <aside aria-label="Symptom assistant" className={styles.nudge}>
      <div className={styles.text}>
        <p className={styles.title}>{title}</p>
        <p className={styles.body}>
          Answer a few questions and we'll suggest products that fit how you feel.
        </p>
      </div>
      <Link
        className={styles.action}
        to={{ pathname: "/", search: `?${new URLSearchParams({ [ASK_PARAM]: query })}` }}
      >
        Ask the assistant
      </Link>
    </aside>
  );
}

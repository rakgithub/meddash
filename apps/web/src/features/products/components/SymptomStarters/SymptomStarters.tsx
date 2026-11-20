import { Link } from "react-router-dom";
import styles from "./SymptomStarters.module.css";

// Each one opens a different assistant flow, so the examples show how much it covers.
const STARTERS = [
  "Sore throat and a temperature",
  "Headache that won't go away",
  "Sneezing and itchy eyes",
  "Can't fall asleep",
];

/** Invites people who can't name a product to start from how they feel. */
export function SymptomStarters() {
  return (
    <section aria-labelledby="symptom-starters-title" className={styles.banner}>
      <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 4H5a2 2 0 0 0-2 2v3.5a5.5 5.5 0 0 0 11 0V6a2 2 0 0 0-2-2h-1" />
        <path d="M8 15a6 6 0 1 0 12 0v-3M11 3v2M6 3v2" />
        <circle cx="20" cy="10" r="2" />
      </svg>
      <div className={styles.content}>
        <h2 id="symptom-starters-title" className={styles.title}>
          Not sure what you need? Start with how you feel.
        </h2>
        <ul className={styles.starters}>
          {STARTERS.map((text) => (
            <li key={text}>
              <Link
                className={styles.starter}
                to={{ pathname: "/assistant", search: `?${new URLSearchParams({ q: text })}` }}
              >
                {text}
                <svg className={styles.arrow} viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 12h14M13 18l6-6M13 6l6 6" />
                </svg>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

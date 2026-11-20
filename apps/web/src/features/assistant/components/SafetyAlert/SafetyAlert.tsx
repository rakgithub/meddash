import styles from "./SafetyAlert.module.css";

interface SafetyAlertProps {
  level: "urgent" | "caution";
  title: string;
  body: string;
}

/**
 * A full-width card for when the assistant should not recommend. Calm on purpose: it says what to do,
 * not how worried to be. `role="alert"` so a screen reader announces it as soon as it appears.
 */
export function SafetyAlert({ level, title, body }: SafetyAlertProps) {
  return (
    <section
      className={`${styles.alert} ${level === "urgent" ? styles.urgent : styles.caution}`}
      role="alert"
      aria-label={title}
    >
      <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
        {level === "urgent" ? (
          // A phone: the one thing to do next.
          <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
        ) : (
          <>
            <path d="M12 3l9.5 17h-19z" />
            <path d="M12 10v4M12 17v.5" />
          </>
        )}
      </svg>
      <div className={styles.text}>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.body}>{body}</p>
      </div>
    </section>
  );
}

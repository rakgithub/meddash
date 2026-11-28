import { Notice } from "@meddash/design-system/components";
import { useId } from "react";
import styles from "./SafetyAlert.module.css";

interface SafetyAlertProps {
  level: "urgent" | "caution";
  title: string;
  body: string;
}

// A phone for urgent: the one thing to do next.
const PHONE = (
  <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
);

/**
 * For when the assistant should not simply recommend. Urgent gets a full notice; a caution is one line
 * in the caution colour, part of the reply. Calm on purpose: it says what to do, not how worried to be.
 * `role="alert"` so a screen reader announces either as soon as it appears.
 */
export function SafetyAlert({ level, title, body }: SafetyAlertProps) {
  const titleId = useId();

  if (level === "caution") {
    return (
      <div className={`${styles.appear} ${styles.caution}`} role="alert" aria-labelledby={titleId}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3 2 20h20z" />
          <path d="M12 10v4M12 17h.01" />
        </svg>
        <p>
          <strong id={titleId}>{title}</strong> {body}
        </p>
      </div>
    );
  }

  return (
    <div className={styles.appear}>
      <Notice tone="danger" icon={PHONE} title={title} headingLevel={3} role="alert">
        {body}
      </Notice>
    </div>
  );
}

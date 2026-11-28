import { Notice } from "@meddash/design-system/components";
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
 * For when the assistant should not recommend. Calm on purpose: it says what to do, not how worried
 * to be. `role="alert"` so a screen reader announces it as soon as it appears.
 */
export function SafetyAlert({ level, title, body }: SafetyAlertProps) {
  const urgent = level === "urgent";
  return (
    <div className={styles.appear}>
      <Notice
        tone={urgent ? "danger" : "caution"}
        icon={urgent ? PHONE : undefined}
        title={title}
        headingLevel={3}
        role="alert"
      >
        {body}
      </Notice>
    </div>
  );
}

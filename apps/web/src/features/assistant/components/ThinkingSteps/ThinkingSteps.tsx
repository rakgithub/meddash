import type { ThinkingStep } from "../../types";
import styles from "./ThinkingSteps.module.css";

interface ThinkingStepsProps {
  steps: ThinkingStep[];
  /** False once the reply stopped or failed: nothing is being worked on any more. */
  active: boolean;
}

/**
 * Three dots while the assistant works, with the check it is on beside them. Gone once every step is
 * done or the reply ended, since the answer itself is what matters then.
 */
export function ThinkingSteps({ steps, active }: ThinkingStepsProps) {
  const current = steps.find((step) => !step.done);
  if (!active || (steps.length > 0 && !current)) return null;

  return (
    <p className={styles.typing}>
      <span className={styles.dots} aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      {current ? (
        <span className={styles.label}>{current.label}</span>
      ) : (
        <span className="visually-hidden">Thinking…</span>
      )}
    </p>
  );
}

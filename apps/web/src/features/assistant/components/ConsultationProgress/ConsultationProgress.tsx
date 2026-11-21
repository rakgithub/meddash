import type { ConsultationStage } from "../../utils/consultationStage";
import styles from "./ConsultationProgress.module.css";

const STEPS: { stage: ConsultationStage; label: string }[] = [
  { stage: "symptoms", label: "Symptoms" },
  { stage: "questions", label: "A few questions" },
  { stage: "suggestions", label: "Suggestions" },
];

/** How far the consultation has come, so people can see how close the answer is. */
export function ConsultationProgress({ stage }: { stage: ConsultationStage }) {
  const current = STEPS.findIndex((step) => step.stage === stage);

  return (
    <ol className={styles.steps} aria-label="Progress">
      {STEPS.map((step, i) => {
        const state = i < current ? styles.done : i === current ? styles.current : undefined;
        return (
          <li key={step.stage} className={state} aria-current={i === current ? "step" : undefined}>
            <span className={styles.dot} aria-hidden="true" />
            <span className={styles.label}>{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

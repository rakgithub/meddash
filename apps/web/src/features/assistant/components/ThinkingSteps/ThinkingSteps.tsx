import { useId, useState } from "react";
import type { ThinkingStep } from "../../types";
import styles from "./ThinkingSteps.module.css";

interface ThinkingStepsProps {
  steps: ThinkingStep[];
  /** False once the reply stopped or failed, so an unfinished step no longer looks busy. */
  active: boolean;
}

function StepList({ id, steps, active }: ThinkingStepsProps & { id?: string }) {
  const current = active ? steps.findIndex((step) => !step.done) : -1;
  return (
    <ol className={styles.list} id={id}>
      {steps.map((step, i) => {
        const state = step.done ? "done" : i === current ? "current" : "pending";
        return (
          <li key={step.label} className={styles[state]}>
            <span className={styles.marker} aria-hidden="true">
              {step.done && (
                <svg viewBox="0 0 12 12">
                  <path d="M2.5 6.2 5 8.5l4.5-5" />
                </svg>
              )}
            </span>
            {step.label}
            {state === "current" && <span className="visually-hidden"> (in progress)</span>}
          </li>
        );
      })}
    </ol>
  );
}

/** The assistant's checks tick off one by one, then fold into one line the user can expand. */
export function ThinkingSteps({ steps, active }: ThinkingStepsProps) {
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  const finished = steps.length > 0 && steps.every((step) => step.done);

  if (!finished) return <StepList steps={steps} active={active} />;

  return (
    <div className={styles.summary}>
      <button
        className={styles.toggle}
        type="button"
        aria-expanded={expanded}
        aria-controls={listId}
        onClick={() => setExpanded(!expanded)}
      >
        <svg className={styles.chevron} viewBox="0 0 12 12" aria-hidden="true">
          <path d="m4.5 2.5 3.5 3.5-3.5 3.5" />
        </svg>
        {steps.at(-1)?.label}{" "}
        <span className={styles.count}>
          {steps.length} {steps.length === 1 ? "step" : "steps"}
        </span>
      </button>
      {expanded && <StepList id={listId} steps={steps} active={false} />}
    </div>
  );
}

import { useId } from "react";
import type { QuickReply } from "../../types";
import styles from "./QuickReplies.module.css";

interface QuickRepliesProps {
  question: string;
  options: QuickReply[];
  /** The label of the option the user picked, once answered. */
  selected?: string;
  /** Without it the options are read-only: answered, or no longer the current question. */
  onAnswer?: (option: QuickReply) => void;
}

export function QuickReplies({ question, options, selected, onAnswer }: QuickRepliesProps) {
  const questionId = useId();

  // Once answered, the question folds to one line: the options have done their job.
  if (!onAnswer && selected) {
    return (
      <p className={styles.folded}>
        <svg className={styles.tick} viewBox="0 0 12 12" aria-hidden="true">
          <path d="M2.5 6.2 5 8.5l4.5-5" />
        </svg>
        <span className={styles.foldedQuestion}>{question}</span>
        <strong>{selected}</strong>
      </p>
    );
  }

  return (
    <div className={styles.root}>
      <p className={styles.question} id={questionId}>
        {question}
      </p>
      <ul className={styles.options} aria-labelledby={questionId}>
        {options.map((option) => {
          const chosen = option.label === selected;
          return (
            <li key={option.value}>
              {onAnswer ? (
                <button className={styles.option} type="button" onClick={() => onAnswer(option)}>
                  {option.label}
                </button>
              ) : (
                <span className={chosen ? `${styles.answered} ${styles.chosen}` : styles.answered}>
                  {option.label}
                  {chosen && <span className="visually-hidden"> (your answer)</span>}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

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

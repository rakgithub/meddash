import { useId, useState, type ReactNode } from "react";
import type { CaseFile, QuickReply } from "../../types";
import { applyAnswer, DURATION_OPTIONS, FOR_WHOM_OPTIONS } from "../../utils/caseFile";
import { SymptomChips } from "../SymptomChips/SymptomChips";
import styles from "./CaseFilePanel.module.css";

interface CaseFilePanelProps {
  caseFile: CaseFile;
  /**
   * An edit: the new case file and a sentence describing it, which is sent as the user's message.
   * Without it the panel is read-only, e.g. while a reply streams.
   */
  onRefine?: (caseFile: CaseFile, text: string) => void;
  /** The clear-conversation control, shown at the bottom of the panel. */
  footer?: ReactNode;
}

function labelOf(options: QuickReply[], value: string | null) {
  return options.find((o) => o.value === value)?.label;
}

/** One line for the collapsed bar on a phone. */
function summary({ symptoms, duration, forWhom }: CaseFile) {
  const parts = [
    symptoms.join(", "),
    // The assistant can word the duration its own way, e.g. "1 to 3 days".
    labelOf(DURATION_OPTIONS, duration) ?? duration,
    labelOf(FOR_WHOM_OPTIONS, forWhom),
  ];
  return parts.filter(Boolean).join(" · ") || "Nothing noted yet";
}

/**
 * What the assistant has understood so far, editable in place. Every edit asks the assistant for a
 * fresh recommendation. A right-hand panel on desktop, a collapsible bar on a phone.
 */
export function CaseFilePanel({ caseFile, onRefine, footer }: CaseFilePanelProps) {
  const [open, setOpen] = useState(false);
  const bodyId = useId();
  const { symptoms, duration, forWhom, avoid } = caseFile;

  function changeSymptoms(next: string[]) {
    if (next.length === symptoms.length) return;
    const added = next.find((s) => !symptoms.includes(s));
    onRefine?.(
      { ...caseFile, symptoms: next },
      added ? `Added symptom: ${added}` : "Removed a symptom",
    );
  }

  return (
    <aside className={styles.panel} aria-label="Case file">
      <button
        className={styles.toggle}
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen(!open)}
      >
        <span className={styles.toggleTitle}>Case file</span>
        <span className={styles.summary}>{summary(caseFile)}</span>
        <svg className={styles.chevron} viewBox="0 0 12 12" aria-hidden="true">
          <path d="M2.5 4.5l3.5 3.5 3.5-3.5" />
        </svg>
      </button>

      <div id={bodyId} className={open ? `${styles.body} ${styles.open}` : styles.body}>
        <h2 className={styles.heading}>Case file</h2>

        <SymptomChips symptoms={symptoms} label="Symptoms" onChange={onRefine && changeSymptoms} />

        <label className={styles.field}>
          <span className={styles.label}>How long</span>
          <select
            className={styles.select}
            value={duration ?? ""}
            disabled={!onRefine}
            onChange={(event) => {
              const option = DURATION_OPTIONS.find((o) => o.value === event.target.value);
              if (option)
                onRefine?.(
                  applyAnswer(caseFile, "duration", option.value),
                  `Changed duration to ${option.label}`,
                );
            }}
          >
            {duration === null && (
              <option value="" disabled>
                Not asked yet
              </option>
            )}
            {/* The assistant's own wording, so the select shows it instead of falling back to the first option. */}
            {duration !== null && !labelOf(DURATION_OPTIONS, duration) && (
              <option value={duration}>{duration}</option>
            )}
            {DURATION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Who it’s for</span>
          <select
            className={styles.select}
            value={forWhom ?? ""}
            disabled={!onRefine}
            onChange={(event) => {
              const option = FOR_WHOM_OPTIONS.find((o) => o.value === event.target.value);
              if (option)
                onRefine?.(
                  applyAnswer(caseFile, "forWhom", option.value),
                  `Changed who it’s for to ${option.label}`,
                );
            }}
          >
            {forWhom === null && (
              <option value="" disabled>
                Not asked yet
              </option>
            )}
            {FOR_WHOM_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <div className={styles.field}>
          <p className={styles.label} id={`${bodyId}-avoid`}>
            Avoiding
          </p>
          <ul className={styles.chips} aria-labelledby={`${bodyId}-avoid`}>
            {avoid.map((item) => (
              <li key={item} className={styles.chip}>
                {item}
                {onRefine && (
                  <button
                    className={styles.remove}
                    type="button"
                    aria-label={`Stop avoiding ${item}`}
                    onClick={() =>
                      onRefine(
                        { ...caseFile, avoid: avoid.filter((a) => a !== item) },
                        "Updated what to avoid",
                      )
                    }
                  >
                    <svg viewBox="0 0 12 12" aria-hidden="true">
                      <path d="M3 3l6 6M9 3l-6 6" />
                    </svg>
                  </button>
                )}
              </li>
            ))}
            {avoid.length === 0 && (
              <li className={styles.none}>Nothing, use “Not for me” on a card</li>
            )}
          </ul>
        </div>

        {footer}
      </div>
    </aside>
  );
}

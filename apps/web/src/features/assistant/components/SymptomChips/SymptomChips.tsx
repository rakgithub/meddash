import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { mergeUnique } from "../../utils/caseFile";
import styles from "./SymptomChips.module.css";

interface SymptomChipsProps {
  symptoms: string[];
  /** The group's heading; the case file panel calls it "Symptoms". */
  label?: string;
  /** Without it the chips are read-only, e.g. on an older message or while a reply streams. */
  onChange?: (symptoms: string[]) => void;
}

/** The symptoms the assistant noted. The user can remove one (×) or add their own. */
export function SymptomChips({ symptoms, label = "What I noted", onChange }: SymptomChipsProps) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const addRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const labelId = useId();

  // The field opens because the user asked for it, so it takes focus.
  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  function close() {
    setAdding(false);
    setDraft("");
  }

  function remove(symptom: string) {
    onChange?.(symptoms.filter((s) => s !== symptom));
    // The removed chip's button is gone; keep the keyboard user in the group.
    addRef.current?.focus();
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (draft.trim()) onChange?.(mergeUnique(symptoms, [draft]));
    close();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") close();
  }

  return (
    <div className={styles.root}>
      <p className={styles.label} id={labelId}>
        {label}
      </p>
      <ul className={styles.chips} aria-labelledby={labelId}>
        {symptoms.map((symptom) => (
          <li key={symptom} className={styles.chip}>
            {symptom}
            {onChange && (
              <button
                className={styles.remove}
                type="button"
                aria-label={`Remove ${symptom}`}
                onClick={() => remove(symptom)}
              >
                <svg viewBox="0 0 12 12" aria-hidden="true">
                  <path d="M3 3l6 6M9 3l-6 6" />
                </svg>
              </button>
            )}
          </li>
        ))}
        {symptoms.length === 0 && <li className={styles.none}>No symptoms yet</li>}
        {onChange && (
          <li>
            {adding ? (
              <form className={styles.form} onSubmit={handleSubmit}>
                <input
                  className={styles.input}
                  aria-label="Add a symptom"
                  placeholder="e.g. Cough"
                  ref={inputRef}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={() => !draft.trim() && close()}
                />
              </form>
            ) : (
              <button
                ref={addRef}
                className={styles.add}
                type="button"
                onClick={() => setAdding(true)}
              >
                + Add
              </button>
            )}
          </li>
        )}
      </ul>
    </div>
  );
}

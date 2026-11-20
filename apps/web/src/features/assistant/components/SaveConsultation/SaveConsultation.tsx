import { useState } from "react";
import type { ConsultationState } from "../../utils/consultationReducer";
import { storeSaved, summarize } from "../../utils/savedConsultations";
import styles from "./SaveConsultation.module.css";

interface SaveConsultationProps {
  userId: string;
  consultation: ConsultationState;
}

/** Saves the consultation in this browser for the signed-in user, once it has suggestions. */
export function SaveConsultation({ userId, consultation }: SaveConsultationProps) {
  // The state that was saved; any change to the conversation after that makes it unsaved again.
  const [saved, setSaved] = useState<ConsultationState | null>(null);
  const [failed, setFailed] = useState(false);

  const entry = summarize(consultation);
  if (!entry) return null;

  function save() {
    if (!entry) return;
    try {
      storeSaved(userId, entry);
      setSaved(consultation);
      setFailed(false);
    } catch (err) {
      console.error("Could not save the consultation", err);
      setFailed(true);
    }
  }

  return (
    <div className={styles.save}>
      <button className={styles.button} type="button" onClick={save}>
        Save consultation
      </button>
      <p className={styles.note} role="status">
        {saved === consultation && "Saved. Reopen it from the assistant’s start screen."}
      </p>
      {failed && (
        <p className={styles.error} role="alert">
          Couldn’t save it. Your browser’s storage may be full or blocked.
        </p>
      )}
    </div>
  );
}

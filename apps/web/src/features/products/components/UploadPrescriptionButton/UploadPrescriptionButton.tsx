import { useState } from "react";
import styles from "./UploadPrescriptionButton.module.css";

// Placeholder until prescription upload exists: tells the user instead of doing nothing.
export function UploadPrescriptionButton() {
  const [clicked, setClicked] = useState(false);

  return (
    <div className={styles.root}>
      <button type="button" className={styles.button} onClick={() => setClicked(true)}>
        <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
          <path d="M14 3v5h5M12 18v-6M9 15l3-3 3 3" />
        </svg>
        Upload prescription
      </button>
      <p role="status" className={styles.note}>
        {clicked ? "Prescription upload is coming soon." : ""}
      </p>
    </div>
  );
}

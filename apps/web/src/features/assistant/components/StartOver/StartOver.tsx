import { useEffect, useRef, useState } from "react";
import styles from "./StartOver.module.css";

interface StartOverProps {
  /** Ask first when the conversation has something worth keeping. */
  confirm: boolean;
  onStartOver: () => void;
  /** Overrides the default look, e.g. for the primary button in the paused state. */
  className?: string;
}

export function StartOver({ confirm, onStartOver, className }: StartOverProps) {
  const [asking, setAsking] = useState(false);
  const startRef = useRef<HTMLButtonElement>(null);
  const keepRef = useRef<HTMLButtonElement>(null);

  const cancelledRef = useRef(false);

  // The question opens because the user asked for it, so keyboard focus goes with it. When they
  // change their mind it is gone, so they go back to the button that opened it.
  useEffect(() => {
    if (asking) keepRef.current?.focus();
    else if (cancelledRef.current) startRef.current?.focus();
    cancelledRef.current = false;
  }, [asking]);

  function cancel() {
    cancelledRef.current = true;
    setAsking(false);
  }

  if (!asking) {
    return (
      <button
        ref={startRef}
        className={className ?? styles.start}
        type="button"
        onClick={() => (confirm ? setAsking(true) : onStartOver())}
      >
        Start over
      </button>
    );
  }

  return (
    <div className={styles.confirm} role="group" aria-label="Start over?">
      <p>Clear this conversation and your case file?</p>
      <div className={styles.actions}>
        <button className={styles.danger} type="button" onClick={onStartOver}>
          Yes, clear it
        </button>
        <button ref={keepRef} className={styles.keep} type="button" onClick={cancel}>
          Keep chatting
        </button>
      </div>
    </div>
  );
}

import { useState, type FormEvent, type KeyboardEvent } from "react";
import styles from "./Composer.module.css";

interface ComposerProps {
  initialValue?: string;
  isStreaming: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
}

/**
 * The message box. Typing stays possible while a reply streams (so focus is never lost), but sending
 * waits until the reply ends or is stopped.
 */
export function Composer({ initialValue = "", isStreaming, onSend, onStop }: ComposerProps) {
  const [value, setValue] = useState(initialValue);
  const canSend = !isStreaming && value.trim() !== "";

  function send() {
    if (!canSend) return;
    onSend(value);
    setValue("");
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    send();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Shift+Enter adds a line; Enter while an IME is composing confirms the composition instead.
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    send();
  }

  return (
    <form className={styles.composer} onSubmit={handleSubmit}>
      {/* The hidden copy of the text sizes the grid cell, so the textarea grows without script. */}
      <div className={styles.grow} data-value={value}>
        <textarea
          className={styles.input}
          aria-label="Describe your symptoms"
          placeholder="Describe how you feel…"
          rows={1}
          // The API rejects longer messages.
          maxLength={1000}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>
      {isStreaming ? (
        <button className={styles.stop} type="button" onClick={onStop}>
          <svg className={styles.icon} viewBox="0 0 16 16" aria-hidden="true">
            <rect x="4" y="4" width="8" height="8" rx="1.5" />
          </svg>
          Stop
        </button>
      ) : (
        <button className={styles.send} type="submit" disabled={!canSend}>
          Send
        </button>
      )}
    </form>
  );
}

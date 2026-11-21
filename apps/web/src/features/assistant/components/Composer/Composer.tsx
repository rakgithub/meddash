import { useState, type FormEvent, type KeyboardEvent } from "react";
import styles from "./Composer.module.css";

interface ComposerProps {
  initialValue?: string;
  /** Changes with the stage of the consultation, e.g. "Ask about these suggestions…". */
  placeholder?: string;
  isStreaming: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
}

/**
 * The message box. Typing stays possible while a reply streams (so focus is never lost), but sending
 * waits until the reply ends or is stopped.
 */
/** The API rejects longer messages (`MAX_USER_TEXT` on the server). */
const MAX_MESSAGE_LENGTH = 1000;

export function Composer({
  initialValue = "",
  placeholder = "Describe how you feel…",
  isStreaming,
  onSend,
  onStop,
}: ComposerProps) {
  // A ?q= prefill can be longer than typing allows.
  const [value, setValue] = useState(initialValue.slice(0, MAX_MESSAGE_LENGTH));
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
          placeholder={placeholder}
          rows={1}
          maxLength={MAX_MESSAGE_LENGTH}
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
        <button className={styles.send} type="submit" disabled={!canSend} aria-label="Send">
          <svg className={styles.arrow} viewBox="0 0 20 20" aria-hidden="true">
            <path d="M10 16V4M5 9l5-5 5 5" />
          </svg>
        </button>
      )}
    </form>
  );
}

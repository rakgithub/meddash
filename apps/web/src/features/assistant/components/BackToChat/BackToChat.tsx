import { Link } from "react-router-dom";
import { useConsultationContext } from "../../hooks/useConsultationContext";
import styles from "./BackToChat.module.css";

/** "Back to your chat" at the top of another page, only while there is a conversation to go back to. */
export function BackToChat() {
  const { messages } = useConsultationContext();
  if (messages.length === 0) return null;

  return (
    <div className={styles.bar}>
      <Link className={styles.link} to="/">
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M10 3.5 5.5 8l4.5 4.5" />
        </svg>
        Back to your chat
      </Link>
    </div>
  );
}

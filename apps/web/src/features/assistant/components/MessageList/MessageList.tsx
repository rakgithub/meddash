import { useEffect, useRef } from "react";
import type { Message, MessagePart } from "../../types";
import { messageText } from "../../utils/consultationReducer";
import { ThinkingSteps } from "../ThinkingSteps/ThinkingSteps";
import styles from "./MessageList.module.css";

interface MessageListProps {
  messages: Message[];
  onRetry: () => void;
}

/** How close to the bottom still counts as "following the conversation". */
const STICK_THRESHOLD = 80;

function isNearBottom() {
  const { scrollHeight } = document.documentElement;
  return window.innerHeight + window.scrollY >= scrollHeight - STICK_THRESHOLD;
}

function Part({ part, active }: { part: MessagePart; active: boolean }) {
  if (part.kind === "thinking") return <ThinkingSteps steps={part.steps} active={active} />;
  return (
    <div className={styles.text}>
      {part.text.split(/\n{2,}/).map((paragraph, i) => (
        <p key={i}>{paragraph}</p>
      ))}
    </div>
  );
}

function AssistantMessage({
  message,
  isLast,
  onRetry,
}: {
  message: Message;
  isLast: boolean;
  onRetry: () => void;
}) {
  const streaming = message.status === "streaming";
  return (
    <div className={streaming ? `${styles.reply} ${styles.streaming}` : styles.reply}>
      {message.parts.map((part, i) => (
        <Part key={i} part={part} active={streaming} />
      ))}
      {streaming && message.parts.length === 0 && <p className={styles.waiting}>Thinking…</p>}
      {message.status === "stopped" && <p className={styles.note}>Stopped</p>}
      {message.status === "error" && (
        <div className={styles.error} role="alert">
          <p>Something went wrong and the reply didn’t finish.</p>
          {isLast && (
            <button className={styles.retry} type="button" onClick={onRetry}>
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function MessageList({ messages, onRetry }: MessageListProps) {
  // A ref, not state: following the conversation never needs a re-render of its own.
  const stickRef = useRef(true);
  const countRef = useRef(messages.length);

  useEffect(() => {
    const onScroll = () => {
      stickRef.current = isNearBottom();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    // A new turn always comes into view; streamed updates only while the user hasn't scrolled up.
    const newTurn = messages.length > countRef.current;
    countRef.current = messages.length;
    if (!newTurn && !stickRef.current) return;
    stickRef.current = true;
    window.scrollTo({ top: document.documentElement.scrollHeight });
  }, [messages]);

  const last = messages.at(-1);
  // Announced once the reply is complete, not word by word.
  const announcement =
    last?.role === "assistant" && last.status === "done" ? messageText(last) : "";

  return (
    <>
      <ol className={styles.list}>
        {messages.map((message) => (
          <li key={message.id} className={message.role === "user" ? styles.fromUser : undefined}>
            <span className="visually-hidden">
              {message.role === "user" ? "You said:" : "Assistant:"}
            </span>
            {message.role === "user" ? (
              <p className={styles.bubble}>{messageText(message)}</p>
            ) : (
              <AssistantMessage message={message} isLast={message === last} onRetry={onRetry} />
            )}
          </li>
        ))}
      </ol>
      <div className="visually-hidden" role="status">
        {announcement}
      </div>
    </>
  );
}

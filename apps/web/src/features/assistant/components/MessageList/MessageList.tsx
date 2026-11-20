import { useEffect, useRef } from "react";
import type { ProductDetail } from "../../../products";
import type { CaseField, Message, MessagePart, QuickReply } from "../../types";
import type { DismissReason } from "../../utils/caseFile";
import { messageText } from "../../utils/consultationReducer";
import { QuickReplies } from "../QuickReplies/QuickReplies";
import { RecommendationStack } from "../RecommendationStack/RecommendationStack";
import { SafetyAlert } from "../SafetyAlert/SafetyAlert";
import { SymptomChips } from "../SymptomChips/SymptomChips";
import { ThinkingSteps } from "../ThinkingSteps/ThinkingSteps";
import styles from "./MessageList.module.css";

/** What the user can still do with the parts of one reply; a missing handler makes that part read-only. */
interface PartActions {
  /** The case file's current symptoms, shown on the latest symptoms part. */
  symptoms?: string[];
  onAnswer?: (field: CaseField, option: QuickReply) => void;
  onAskIngredient?: (ingredient: string) => void;
  onDismiss?: (product: ProductDetail, reason: DismissReason) => void;
  /** The option the user picked for this reply's question, i.e. their next message. */
  selected?: string;
}

interface MessageListProps extends Omit<PartActions, "selected"> {
  messages: Message[];
  onRetry: () => void;
}

/** How close to the bottom still counts as "following the conversation". */
const STICK_THRESHOLD = 80;

function isNearBottom() {
  const { scrollHeight } = document.documentElement;
  return window.innerHeight + window.scrollY >= scrollHeight - STICK_THRESHOLD;
}

function Part({
  part,
  active,
  actions,
}: {
  part: MessagePart;
  active: boolean;
  actions: PartActions;
}) {
  switch (part.kind) {
    case "thinking":
      return <ThinkingSteps steps={part.steps} active={active} />;
    case "symptoms":
      return <SymptomChips symptoms={actions.symptoms ?? part.symptoms} />;
    case "quickReplies": {
      const { onAnswer } = actions;
      return (
        <QuickReplies
          question={part.question}
          options={part.options}
          selected={actions.selected}
          onAnswer={onAnswer && ((option) => onAnswer(part.field, option))}
        />
      );
    }
    case "products":
      return (
        <RecommendationStack
          items={part.items}
          loading={part.loading}
          unavailable={part.unavailable}
          ruledOut={part.ruledOut}
          onAskIngredient={actions.onAskIngredient}
          onDismiss={actions.onDismiss}
        />
      );
    case "alert":
      return <SafetyAlert level={part.level} title={part.title} body={part.body} />;
    case "text":
      return (
        <div className={styles.text}>
          {part.text.split(/\n{2,}/).map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      );
  }
}

function AssistantMessage({
  message,
  isLast,
  onRetry,
  actions,
}: {
  message: Message;
  isLast: boolean;
  onRetry: () => void;
  actions: PartActions;
}) {
  const streaming = message.status === "streaming";
  return (
    <div className={streaming ? `${styles.reply} ${styles.streaming}` : styles.reply}>
      {message.parts.map((part, i) => (
        <Part key={i} part={part} active={streaming} actions={actions} />
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

/**
 * What the live region says about a reply: a short cue while it streams, then the whole reply at once,
 * not word by word. Alerts and errors are left out because they announce themselves (`role="alert"`).
 */
function announcementFor(message: Message): string {
  if (message.status === "streaming") return "Assistant is replying…";
  if (message.status === "error") return "";
  const said = message.parts.flatMap((part) => {
    switch (part.kind) {
      case "text":
        return [part.text.trim()];
      case "quickReplies":
        return [`${part.question} Options: ${part.options.map((o) => o.label).join(", ")}.`];
      case "products": {
        const names = part.items.filter((i) => i.fit !== "locked").map((i) => i.product.name);
        if (names.length === 0) return [];
        const count = `${names.length} ${names.length === 1 ? "suggestion" : "suggestions"}`;
        return [`${count}: ${names.join(", ")}.`];
      }
      default:
        return [];
    }
  });
  if (message.status === "stopped") said.push("Reply stopped.");
  return said.filter(Boolean).join(" ");
}

export function MessageList({
  messages,
  onRetry,
  symptoms,
  onAnswer,
  onAskIngredient,
  onDismiss,
}: MessageListProps) {
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
  const idle = last?.status !== "streaming";
  // Only the most recent list of symptoms follows the case file; older ones are a record.
  const latestSymptoms = [...messages]
    .reverse()
    .find((m) => m.parts.some((p) => p.kind === "symptoms"));

  function actionsFor(message: Message, index: number): PartActions {
    const next = messages[index + 1];
    const isLatestSymptoms = message === latestSymptoms;
    return {
      symptoms: isLatestSymptoms ? symptoms : undefined,
      // A question can be answered only while it is the last thing said and the reply has finished.
      onAnswer: message === last && message.status === "done" ? onAnswer : undefined,
      onAskIngredient: idle ? onAskIngredient : undefined,
      onDismiss: idle ? onDismiss : undefined,
      selected: next?.role === "user" ? messageText(next) : undefined,
    };
  }
  const announcement = last?.role === "assistant" ? announcementFor(last) : "";

  return (
    <>
      <ol className={styles.list} aria-label="Conversation">
        {messages.map((message, index) => (
          <li key={message.id} className={message.role === "user" ? styles.fromUser : undefined}>
            <span className="visually-hidden">
              {message.role === "user" ? "You said:" : "Assistant:"}
            </span>
            {message.role === "user" ? (
              <p className={styles.bubble}>{messageText(message)}</p>
            ) : (
              <AssistantMessage
                message={message}
                isLast={message === last}
                onRetry={onRetry}
                actions={actionsFor(message, index)}
              />
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

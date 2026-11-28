import { Button } from "@meddash/design-system/components";
import { useEffect, useRef } from "react";
import { formatCategory, SHOP_PATH } from "../../../products";
import type { CaseField, Message, MessagePart, QuickReply, Recommendation } from "../../types";
import { messageText } from "../../utils/consultationReducer";
import { ChatProductCard } from "../ChatProductCard/ChatProductCard";
import { PharmacistContact } from "../PharmacistContact/PharmacistContact";
import { QuickReplies } from "../QuickReplies/QuickReplies";
import { SafetyAlert } from "../SafetyAlert/SafetyAlert";
import { ThinkingSteps } from "../ThinkingSteps/ThinkingSteps";
import styles from "./MessageList.module.css";

/** What the user can still do with the parts of one reply; a missing handler makes that part read-only. */
interface PartActions {
  onAnswer?: (field: CaseField, option: QuickReply) => void;
  /** The option the user picked for this reply's question, i.e. their next message. */
  selected?: string;
}

interface MessageListProps {
  messages: Message[];
  onRetry: () => void;
  onAnswer?: PartActions["onAnswer"];
}

/** A paragraph that tells people when to get medical help; it is set apart so it isn't skimmed past. */
const DOCTOR_ADVICE = /^(see|call|talk to|contact|ask) (a|your) (doctor|gp)\b/i;

/** How close to the bottom still counts as "following the conversation". */
const STICK_THRESHOLD = 80;

function isNearBottom() {
  const { scrollHeight } = document.documentElement;
  return window.innerHeight + window.scrollY >= scrollHeight - STICK_THRESHOLD;
}

/** Prescription-only products can't be bought here yet, so they come after the real options. */
function byBuyable(items: Recommendation[]) {
  return [
    ...items.filter((item) => item.fit !== "locked"),
    ...items.filter((item) => item.fit === "locked"),
  ];
}

/** The shelf of the top buyable suggestion, for "More in <aisle>". */
function aisleOf(items: Recommendation[]): string | null {
  return items.find((item) => item.fit !== "locked")?.product.category ?? null;
}

function Products({ part }: { part: Extract<MessagePart, { kind: "products" }> }) {
  const loading = part.loading ?? 0;
  const unavailable = part.unavailable ?? 0;
  const aisle = aisleOf(part.items);
  if (loading > 0) {
    return (
      <div className={styles.products} role="status" aria-label="Loading suggestions">
        {Array.from({ length: loading }, (_, i) => (
          <div key={i} className={styles.skeleton} />
        ))}
      </div>
    );
  }
  return (
    <>
      {part.items.length > 0 && (
        <ul className={styles.products} aria-label="Suggested products">
          {byBuyable(part.items).map((item) => (
            <li key={item.product.id}>
              <ChatProductCard recommendation={item} />
            </li>
          ))}
        </ul>
      )}
      {unavailable > 0 && (
        <p className={styles.note}>
          {unavailable} {unavailable === 1 ? "suggestion" : "suggestions"} unavailable
        </p>
      )}
      {aisle && (
        // A block around the inline button, so the reply's column doesn't stretch it.
        <div>
          <Button
            variant="secondary"
            href={`${SHOP_PATH}?${new URLSearchParams({ category: aisle })}`}
          >
            More in {formatCategory(aisle)}
          </Button>
        </div>
      )}
      {part.items.length > 0 && <PharmacistContact />}
    </>
  );
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
      // Noted in the case file for the assistant's questions; the chat itself doesn't list them.
      return null;
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
      return <Products part={part} />;
    case "alert":
      return <SafetyAlert level={part.level} title={part.title} body={part.body} />;
    case "text":
      return (
        <div className={styles.text}>
          {part.text.split(/\n{2,}/).map((paragraph, i) =>
            DOCTOR_ADVICE.test(paragraph) ? (
              <p key={i} className={styles.doctor}>
                <strong>When to see a doctor: </strong>
                {paragraph}
              </p>
            ) : (
              <p key={i}>{paragraph}</p>
            ),
          )}
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
      {streaming && message.parts.length === 0 && <ThinkingSteps steps={[]} active />}
      {message.status === "stopped" && <p className={styles.note}>Stopped</p>}
      {message.status === "error" && (
        <div className={styles.error} role="alert">
          <p>{message.error ?? "Something went wrong and the reply didn’t finish."}</p>
          {isLast && (
            <Button variant="secondary" onClick={onRetry}>
              Retry
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/** A user message that only repeats an answer tapped on the question above it. */
function echoesAnswer(message: Message, previous: Message | undefined) {
  if (message.role !== "user" || previous?.role !== "assistant") return false;
  const text = messageText(message);
  return previous.parts.some(
    (p) => p.kind === "quickReplies" && p.options.some((o) => o.label === text),
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

export function MessageList({ messages, onRetry, onAnswer }: MessageListProps) {
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

  function actionsFor(message: Message, index: number): PartActions {
    const next = messages[index + 1];
    return {
      // A question can be answered only while it is the last thing said and the reply has finished.
      onAnswer: message === last && message.status === "done" ? onAnswer : undefined,
      selected: next?.role === "user" ? messageText(next) : undefined,
    };
  }
  const announcement = last?.role === "assistant" ? announcementFor(last) : "";

  return (
    <>
      <ol className={styles.list} aria-label="Conversation">
        {messages.map((message, index) => (
          <li
            key={message.id}
            className={
              echoesAnswer(message, messages[index - 1])
                ? "visually-hidden"
                : message.role === "user"
                  ? styles.fromUser
                  : undefined
            }
          >
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

import { useSearchParams } from "react-router-dom";
import { useConsultation } from "../../hooks/useConsultation";
import { Composer } from "../Composer/Composer";
import { MessageList } from "../MessageList/MessageList";
import styles from "./AssistantPage.module.css";

const STARTERS = ["Sore throat and fever", "Can't sleep", "Hay fever", "Upset stomach"];

/** `/assistant?q=…` pre-fills the message box, e.g. with the search text from the products page. */
export function AssistantPage() {
  const [searchParams] = useSearchParams();
  const { messages, isStreaming, send, stop, retry } = useConsultation();

  return (
    <div className={styles.page}>
      <h1 className="visually-hidden">Symptom assistant</h1>

      <div className={styles.conversation}>
        {messages.length === 0 ? (
          <section className={styles.empty} aria-labelledby="assistant-greeting">
            <h2 id="assistant-greeting">What’s bothering you?</h2>
            <p>
              Describe how you feel in your own words. I’ll ask a few questions and suggest
              over-the-counter products from our pharmacy.
            </p>
            <ul className={styles.starters} aria-label="Start with">
              {STARTERS.map((starter) => (
                <li key={starter}>
                  <button className={styles.starter} type="button" onClick={() => send(starter)}>
                    {starter}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <MessageList messages={messages} onRetry={retry} />
        )}
      </div>

      <div className={styles.dock}>
        <Composer
          initialValue={searchParams.get("q") ?? ""}
          isStreaming={isStreaming}
          onSend={send}
          onStop={stop}
        />
        <p className={styles.disclaimer}>Suggestions, not a diagnosis. Ask a pharmacist.</p>
      </div>
    </div>
  );
}

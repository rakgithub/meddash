import { Button, Chip } from "@meddash/design-system/components";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../../auth";
import { PageTitle } from "../../../../lib/PageTitle";
import { useConsultation } from "../../hooks/useConsultation";
import { consultationStage, type ConsultationStage } from "../../utils/consultationStage";
import { Composer } from "../Composer/Composer";
import { MessageList } from "../MessageList/MessageList";
import styles from "./AssistantPage.module.css";

const STARTERS = ["Hay fever", "Dry cough", "Can't sleep"];

const PLACEHOLDERS: Record<ConsultationStage, string> = {
  symptoms: "Describe how you feel…",
  questions: "Reply, or type your own answer…",
  suggestions: "Reply, or ask something else…",
};

function Disclaimer() {
  return (
    <p className={styles.disclaimer}>
      Reviewed by pharmacists. Not a substitute for a doctor — in an emergency, call 112.
    </p>
  );
}

/** `/assistant?q=…` pre-fills the message box, e.g. with the search text from the shop. */
export function AssistantPage() {
  const [searchParams] = useSearchParams();
  const { sessionEnded } = useAuth();
  const { messages, caseFile, isStreaming, paused, send, answer, stop, retry, startOver } =
    useConsultation({ onSessionEnded: sessionEnded });

  const composer = (
    <Composer
      initialValue={searchParams.get("q") ?? ""}
      isStreaming={isStreaming}
      placeholder={PLACEHOLDERS[consultationStage(messages, caseFile)]}
      onSend={send}
      onStop={stop}
    />
  );

  if (messages.length === 0) {
    return (
      <div className={`${styles.page} ${styles.welcome}`}>
        <PageTitle title="Symptom assistant" />
        <div className={styles.column}>
          <p className={styles.hello}>Hi, I’m your MedDash assistant.</p>
          <h1 className={styles.question}>How are you feeling today?</h1>
          {composer}
          <ul className={styles.starters} aria-label="Start with">
            {STARTERS.map((starter) => (
              <li key={starter}>
                <Chip onClick={() => send(starter)}>{starter}</Chip>
              </li>
            ))}
          </ul>
          <Disclaimer />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PageTitle title="Symptom assistant" />
      <h1 className="visually-hidden">Symptom assistant</h1>

      <div className={`${styles.column} ${styles.conversation}`}>
        <MessageList
          messages={messages}
          onRetry={retry}
          // After an urgent alert everything earlier is a read-only record.
          onAnswer={paused ? undefined : answer}
        />
      </div>

      <div className={styles.dock}>
        <div className={styles.column}>
          {paused ? (
            <div className={styles.paused}>
              <p>I’ve stopped suggesting products so you can get help first.</p>
              <Button onClick={startOver}>Start over</Button>
            </div>
          ) : (
            composer
          )}
          <Disclaimer />
        </div>
      </div>
    </div>
  );
}

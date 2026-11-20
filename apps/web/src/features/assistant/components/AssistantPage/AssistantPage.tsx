import { useSearchParams } from "react-router-dom";
import { useConsultation } from "../../hooks/useConsultation";
import { CaseFilePanel } from "../CaseFilePanel/CaseFilePanel";
import { Composer } from "../Composer/Composer";
import { MessageList } from "../MessageList/MessageList";
import { StartOver } from "../StartOver/StartOver";
import styles from "./AssistantPage.module.css";

const STARTERS = ["Sore throat and fever", "Can't sleep", "Hay fever", "Upset stomach"];

/** `/assistant?q=…` pre-fills the message box, e.g. with the search text from the products page. */
export function AssistantPage() {
  const [searchParams] = useSearchParams();
  const {
    messages,
    caseFile,
    isStreaming,
    paused,
    send,
    answer,
    refine,
    dismiss,
    stop,
    retry,
    startOver,
  } = useConsultation();

  const started = messages.length > 0;

  return (
    <div className={styles.page}>
      <h1 className="visually-hidden">Symptom assistant</h1>

      <div className={started ? styles.layout : undefined}>
        {started && (
          <div className={styles.side}>
            <CaseFilePanel
              caseFile={caseFile}
              // Edits wait for the reply to finish, and stop for good after an urgent alert.
              onRefine={isStreaming || paused ? undefined : refine}
              footer={paused ? undefined : <StartOver confirm onStartOver={startOver} />}
            />
          </div>
        )}

        <div className={styles.main}>
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
                      <button
                        className={styles.starter}
                        type="button"
                        onClick={() => send(starter)}
                      >
                        {starter}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : (
              <MessageList
                messages={messages}
                onRetry={retry}
                symptoms={caseFile.symptoms}
                // After an urgent alert everything earlier is a read-only record.
                onAnswer={paused ? undefined : answer}
                onAskIngredient={
                  paused ? undefined : (ingredient) => send(`Tell me about ${ingredient}`)
                }
                onDismiss={paused ? undefined : dismiss}
              />
            )}
          </div>

          <div className={styles.dock}>
            {paused ? (
              <div className={styles.paused}>
                <p>I’ve stopped suggesting products so you can get help first.</p>
                <StartOver confirm className={styles.startOver} onStartOver={startOver} />
              </div>
            ) : (
              <Composer
                initialValue={searchParams.get("q") ?? ""}
                isStreaming={isStreaming}
                onSend={send}
                onStop={stop}
              />
            )}
            <p className={styles.disclaimer}>Suggestions, not a diagnosis. Ask a pharmacist.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

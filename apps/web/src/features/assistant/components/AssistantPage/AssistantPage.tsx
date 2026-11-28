import { Button } from "@meddash/design-system/components";
import type { ReactNode } from "react";
import { PageTitle } from "../../../../lib/PageTitle";
import { useConsultationContext } from "../../hooks/useConsultationContext";
import { CartBar } from "../CartBar/CartBar";
import { MessageList } from "../MessageList/MessageList";
import styles from "./AssistantPage.module.css";

interface AssistantPageProps {
  /** The message box, shared with the intro so a half-typed message isn't lost between the two. */
  composer: ReactNode;
  footnote: ReactNode;
}

/** The conversation, once it has started: one centred column with the message box docked under it. */
export function AssistantPage({ composer, footnote }: AssistantPageProps) {
  const { messages, paused, answer, retry, startOver } = useConsultationContext();

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
          <CartBar />
          {paused ? (
            <div className={styles.paused}>
              <p>I’ve stopped suggesting products so you can get help first.</p>
              <Button onClick={startOver}>Start over</Button>
            </div>
          ) : (
            composer
          )}
          {footnote}
        </div>
      </div>
    </div>
  );
}

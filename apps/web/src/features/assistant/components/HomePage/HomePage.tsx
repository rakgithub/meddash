import { useEffect } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../../auth";
import { PageTitle } from "../../../../lib/PageTitle";
import { useConsultationContext } from "../../hooks/useConsultationContext";
import { consultationStage, type ConsultationStage } from "../../utils/consultationStage";
import { LOGIN_THEN_HOME, savePendingMessage, takePendingMessage } from "../../utils/sessionFlags";
import { AssistantPage } from "../AssistantPage/AssistantPage";
import { Composer } from "../Composer/Composer";
import { Intro } from "../Intro/Intro";
import styles from "./HomePage.module.css";

/** `/?ask=…` pre-fills the message box, e.g. with the search text from the shop. */
export const ASK_PARAM = "ask";

const PLACEHOLDERS: Record<ConsultationStage, string> = {
  symptoms: "Describe how you feel…",
  questions: "Reply, or type your own answer…",
  suggestions: "Reply, or ask something else…",
};

/**
 * `/`: the intro, then the chat in the same place. The intro is public; the chat calls a paid model,
 * so a signed-out visitor's first message waits in the tab while they log in, and is sent on return.
 */
export function HomePage() {
  const { messages, caseFile, isStreaming, send, stop } = useConsultationContext();
  const { state } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const signedIn = state.status === "signed-in";

  useEffect(() => {
    if (!signedIn) return;
    const pending = takePendingMessage();
    if (pending) send(pending);
  }, [signedIn, send]);

  function submit(text: string) {
    if (signedIn) {
      send(text);
      return;
    }
    savePendingMessage(text.trim());
    navigate(LOGIN_THEN_HOME);
  }

  const composer = (
    <Composer
      initialValue={searchParams.get(ASK_PARAM) ?? ""}
      isStreaming={isStreaming}
      placeholder={PLACEHOLDERS[consultationStage(messages, caseFile)]}
      onSend={submit}
      onStop={stop}
    />
  );
  const footnote = (
    <p className={styles.disclaimer}>
      Reviewed by pharmacists. Not a substitute for a doctor — in an emergency, call 112.
    </p>
  );

  if (messages.length > 0) return <AssistantPage composer={composer} footnote={footnote} />;

  return (
    <>
      <PageTitle title="Symptom assistant" />
      {/* A new entry (the logo) mounts a new intro, which decides afresh whether to play. */}
      <Intro key={location.key} composer={composer} onStarter={submit} footnote={footnote} />
    </>
  );
}

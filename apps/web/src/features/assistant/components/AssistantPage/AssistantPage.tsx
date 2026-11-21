import { useId, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../../auth";
import { useConsultation } from "../../hooks/useConsultation";
import { BODY_REGIONS, regionMessage, type BodyRegion } from "../../utils/bodyRegions";
import { consultationStage, type ConsultationStage } from "../../utils/consultationStage";
import { AssistantAvatar } from "../AssistantAvatar/AssistantAvatar";
import { CaseFilePanel } from "../CaseFilePanel/CaseFilePanel";
import { Composer } from "../Composer/Composer";
import { ConsultationProgress } from "../ConsultationProgress/ConsultationProgress";
import { MessageList } from "../MessageList/MessageList";
import { SaveConsultation } from "../SaveConsultation/SaveConsultation";
import { SavedConsultations } from "../SavedConsultations/SavedConsultations";
import { StartOver } from "../StartOver/StartOver";
import styles from "./AssistantPage.module.css";

const STARTERS = [
  { label: "Sore throat and fever", hint: "Colds, flu, a temperature", icon: "thermometer" },
  { label: "Can't sleep", hint: "Falling or staying asleep", icon: "moon" },
  { label: "Hay fever", hint: "Sneezing, itchy eyes, runny nose", icon: "flower" },
  { label: "Upset stomach", hint: "Nausea, heartburn, diarrhoea", icon: "stomach" },
] as const;

type IconName = (typeof STARTERS)[number]["icon"] | BodyRegion["id"];

/** Line icons for the starters and body areas, drawn on a 24px grid like the rest of the app. */
const ICONS: Record<IconName, ReactNode> = {
  thermometer: <path d="M10 13.5V5a2 2 0 0 1 4 0v8.5a4 4 0 1 1-4 0ZM12 9v6" />,
  moon: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />,
  flower: (
    <>
      <circle cx="12" cy="9" r="2.5" />
      <path d="M12 6.5a3 3 0 1 1 2.4-4.4M12 6.5a3 3 0 1 0-2.4-4.4M14.5 9a3 3 0 1 1 1 4.6M9.5 9a3 3 0 1 0-1 4.6M12 11.5V22M12 18c-2 0-4-1.5-4-3.5M12 18c2 0 4-1.5 4-3.5" />
    </>
  ),
  stomach: <path d="M9 3v4c0 2-3 3-3 7a6 6 0 0 0 12 0c0-3-2-4-4-4s-2 2-4 2M15 3v3" />,
  head: (
    <>
      <circle cx="12" cy="9" r="6" />
      <path d="M8 15v6M16 15v6" />
    </>
  ),
  eyes: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  throat: <path d="M9 3c0 3-3 4-3 8 0 2 1.5 3 3 3v7M15 3c0 2 1 3 1 5M15 14v7M12 14v4" />,
  chest: (
    <path d="M12 4v16M12 8c-2-3-7-3-7 2v5c0 3 3 4 5 3l2-1M12 8c2-3 7-3 7 2v5c0 3-3 4-5 3l-2-1" />
  ),
  skin: <path d="M12 3.5s6 6.4 6 10.5a6 6 0 0 1-12 0c0-4.1 6-10.5 6-10.5Z" />,
  joints: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M10 10 5 5M14 14l5 5M5 5H3M5 5V3M19 19h2M19 19v2" />
    </>
  ),
  mind: (
    <>
      <path d="M12 21v-4M9 17h6" />
      <path d="M8.5 17A6.5 6.5 0 1 1 15.5 17" />
      <path d="M10 9.5a2 2 0 1 1 3 1.7c-.6.4-1 .8-1 1.3" />
    </>
  ),
};

function Icon({ name }: { name: IconName }) {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

const PLACEHOLDERS: Record<ConsultationStage, string> = {
  symptoms: "Describe how you feel…",
  questions: "Or type your own answer…",
  suggestions: "Ask about these suggestions…",
};

/** "Suggestions, not a diagnosis", behind an info button so it doesn't sit under every message. */
function Disclaimer() {
  const [open, setOpen] = useState(false);
  const noteId = useId();
  return (
    <div className={styles.disclaimer}>
      <button
        className={styles.info}
        type="button"
        aria-expanded={open}
        aria-controls={noteId}
        onClick={() => setOpen(!open)}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="8" cy="8" r="6.5" />
          <path d="M8 7v4.5M8 4.8v.2" />
        </svg>
        Suggestions, not a diagnosis
      </button>
      {open && (
        <p id={noteId} className={styles.infoNote}>
          MedDash suggests over-the-counter products based on what you tell it. It can’t examine
          you. If you’re unsure, or symptoms get worse, ask a pharmacist or see a doctor.
        </p>
      )}
    </div>
  );
}

/** `/assistant?q=…` pre-fills the message box, e.g. with the search text from the products page. */
export function AssistantPage() {
  const [searchParams] = useSearchParams();
  const { state: auth, sessionEnded } = useAuth();
  const userId = auth.status === "signed-in" ? auth.user.id : null;
  const {
    snapshot,
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
    restore,
  } = useConsultation({ onSessionEnded: sessionEnded });

  const started = messages.length > 0;
  const stage = consultationStage(messages, caseFile);
  const composer = (
    <Composer
      initialValue={searchParams.get("q") ?? ""}
      isStreaming={isStreaming}
      placeholder={PLACEHOLDERS[stage]}
      onSend={send}
      onStop={stop}
    />
  );

  if (!started) {
    return (
      <div className={`${styles.page} ${styles.welcome}`}>
        <h1 className="visually-hidden">Symptom assistant</h1>
        <section className={styles.hero} aria-labelledby="assistant-greeting">
          <AssistantAvatar size="large" />
          <p className={styles.hello}>Hi, I’m MedDash, your pharmacy assistant.</p>
          <h2 id="assistant-greeting">What’s bothering you today?</h2>
          <p className={styles.lead}>
            Describe it in your own words. I’ll ask a couple of questions, then suggest
            over-the-counter products from our pharmacy.
          </p>
          <div className={styles.heroComposer}>{composer}</div>
          <Disclaimer />
        </section>

        <section className={styles.startWith} aria-labelledby="assistant-starters">
          <h3 id="assistant-starters" className={styles.sectionHeading}>
            Common reasons people ask
          </h3>
          <ul className={styles.starterGrid}>
            {STARTERS.map((starter) => (
              <li key={starter.label}>
                <button
                  className={styles.starter}
                  type="button"
                  aria-label={starter.label}
                  aria-describedby={`starter-${starter.icon}`}
                  onClick={() => send(starter.label)}
                >
                  <Icon name={starter.icon} />
                  <span className={styles.starterLabel}>{starter.label}</span>
                  <span id={`starter-${starter.icon}`} className={styles.starterHint}>
                    {starter.hint}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        {/* For when the words for a symptom don't come: start from the part of the body. */}
        <section className={styles.startWith} aria-labelledby="assistant-areas">
          <h3 id="assistant-areas" className={styles.sectionHeading}>
            Or start from where it bothers you
          </h3>
          <ul className={styles.regionGrid}>
            {BODY_REGIONS.map((region) => (
              <li key={region.id}>
                <button
                  className={styles.region}
                  type="button"
                  onClick={() => send(regionMessage(region))}
                >
                  <Icon name={region.id} />
                  {region.label}
                </button>
              </li>
            ))}
          </ul>
        </section>

        {/* Keyed by user, so signing in as someone else shows their list, not the last one. */}
        {userId && <SavedConsultations key={userId} userId={userId} onReopen={restore} />}
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className="visually-hidden">Symptom assistant</h1>

      <div className={styles.layout}>
        <div className={styles.side}>
          <CaseFilePanel
            caseFile={caseFile}
            // Edits wait for the reply to finish, and stop for good after an urgent alert.
            onRefine={isStreaming || paused ? undefined : refine}
            footer={
              paused ? undefined : (
                <>
                  {userId && !isStreaming && (
                    <SaveConsultation key={userId} userId={userId} consultation={snapshot} />
                  )}
                  <StartOver confirm className={styles.quiet} onStartOver={startOver} />
                </>
              )
            }
          />
        </div>

        <div className={styles.main}>
          <header className={styles.bar}>
            <AssistantAvatar />
            <div className={styles.who}>
              <p className={styles.name}>MedDash assistant</p>
              <p className={styles.status}>
                <span className={styles.online} aria-hidden="true" />
                Available
              </p>
            </div>
            <ConsultationProgress stage={stage} />
          </header>

          <div className={styles.conversation}>
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
          </div>

          <div className={styles.dock}>
            {paused ? (
              <div className={styles.paused}>
                <p>I’ve stopped suggesting products so you can get help first.</p>
                <StartOver confirm className={styles.startOver} onStartOver={startOver} />
              </div>
            ) : (
              composer
            )}
            <Disclaimer />
          </div>
        </div>
      </div>
    </div>
  );
}

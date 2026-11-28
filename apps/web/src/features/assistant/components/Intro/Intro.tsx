import { Chip } from "@meddash/design-system/components";
import { Fragment, useEffect, useState, type AnimationEvent, type ReactNode } from "react";
import { introSeen, markIntroSeen } from "../../utils/sessionFlags";
import styles from "./Intro.module.css";

/** v5's starters: the chip names the complaint, the message says it the way a visitor would. */
const STARTERS = [
  { label: "Hay fever", message: "Sneezing and itchy eyes every morning since spring started." },
  { label: "Dry cough", message: "Dry, tickly cough for three days. It keeps me up at night." },
  {
    label: "Can't sleep",
    message: "Just flew in from Singapore and I can't fall asleep at night.",
  },
];

const QUESTION = ["How", "are", "you", "feeling", "today?"];
const CAPSULES = 14;

function shouldPlay() {
  return !introSeen() && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

interface IntroProps {
  /** The message box; the capsules gather into it. */
  composer: ReactNode;
  onStarter: (message: string) => void;
  footnote: ReactNode;
}

/**
 * The front door: capsules spiral into the centre and become the message box while the question
 * arrives word by word. It plays once per tab (the logo plays it again); after that, and under reduced
 * motion, everything is simply there. The text is real text throughout, and the box can be typed into
 * at once.
 */
export function Intro({ composer, onStarter, footnote }: IntroProps) {
  // Decided once per mount, so marking it seen below doesn't stop the run that is playing.
  const [playing, setPlaying] = useState(shouldPlay);

  useEffect(markIntroSeen, []);

  // The starters arrive last; their entrance ending means the intro has finished.
  function handleAnimationEnd(event: AnimationEvent) {
    if (event.target === event.currentTarget) setPlaying(false);
  }

  return (
    <section
      className={playing ? `${styles.intro} ${styles.playing}` : styles.intro}
      aria-labelledby="intro-question"
      aria-busy={playing}
    >
      <div className={styles.column}>
        <p className={styles.hello}>Hi, I’m your MedDash assistant.</p>
        <h1 id="intro-question" className={styles.question}>
          {QUESTION.map((word, index) => (
            <Fragment key={word}>
              {index > 0 && " "}
              <span className={index >= 3 ? `${styles.word} ${styles.accent}` : styles.word}>
                {word}
              </span>
            </Fragment>
          ))}
        </h1>

        <div className={styles.stage}>
          {playing && (
            <div className={styles.swarm} aria-hidden="true">
              {Array.from({ length: CAPSULES }, (_, i) => (
                <span key={i} className={styles.capsule} />
              ))}
              <span className={styles.wave} />
              <span className={styles.wave} />
              <span className={styles.seed} />
            </div>
          )}
          <div className={styles.box}>{composer}</div>
        </div>

        <ul className={styles.starters} aria-label="Start with" onAnimationEnd={handleAnimationEnd}>
          {STARTERS.map(({ label, message }) => (
            <li key={label}>
              <Chip onClick={() => onStarter(message)}>{label}</Chip>
            </li>
          ))}
        </ul>
        <div className={styles.footnote}>{footnote}</div>
      </div>
    </section>
  );
}

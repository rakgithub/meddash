import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
// 3D doctor by Pietro Digital, from LottieFiles ("Tape Medical"), free under the Lottie Simple License.
import doctorAvatar from "../../assets/doctor-avatar.webp";
import styles from "./AssistantLauncher.module.css";

/** How long the full greeting shows before it shrinks to the short label. */
export const GREETING_MS = 6000;

/**
 * A floating doctor in the corner that opens the assistant. It greets in full on arrival, then keeps a short
 * label beside it, and greets again on hover or focus.
 */
export function AssistantLauncher() {
  const [greeting, setGreeting] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setGreeting(false), GREETING_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Link
      className={styles.root}
      to="/assistant"
      aria-label="Ask MedDash assistant"
      data-greeting={greeting}
      onMouseEnter={() => setGreeting(true)}
      onMouseLeave={() => setGreeting(false)}
      onFocus={() => setGreeting(true)}
      onBlur={() => setGreeting(false)}
    >
      <span className={styles.bubble}>
        {greeting ? (
          <span key="greeting" className={styles.greeting}>
            <strong>Hi! Not feeling great?</strong>
            <span>Tell me how you feel and I’ll find what helps.</span>
          </span>
        ) : (
          <span key="label" className={styles.label}>
            Ask MedDash
          </span>
        )}
      </span>
      <span className={styles.avatar}>
        <span className={styles.disc}>
          <img className={styles.doctor} src={doctorAvatar} alt="" width={84} height={98} />
        </span>
        <svg className={styles.sparkles} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M19 2l.9 2.1L22 5l-2.1.9L19 8l-.9-2.1L16 5l2.1-.9z" />
          <path d="M4 14l.6 1.4L6 16l-1.4.6L4 18l-.6-1.4L2 16l1.4-.6z" />
        </svg>
      </span>
    </Link>
  );
}

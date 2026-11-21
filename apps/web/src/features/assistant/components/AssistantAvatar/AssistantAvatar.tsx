// 3D doctor by Pietro Digital, from LottieFiles ("Tape Medical"), free under the Lottie Simple License.
import doctorAvatar from "../../assets/doctor-avatar.webp";
import styles from "./AssistantAvatar.module.css";

interface AssistantAvatarProps {
  size?: "small" | "large";
}

/** The doctor from the launcher, so the assistant has the same face in the chat as on the button. */
export function AssistantAvatar({ size = "small" }: AssistantAvatarProps) {
  return (
    <span className={size === "large" ? `${styles.disc} ${styles.large}` : styles.disc}>
      <img className={styles.doctor} src={doctorAvatar} alt="" width={84} height={98} />
    </span>
  );
}

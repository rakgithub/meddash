import type { ReactNode } from "react";
import styles from "./Notice.module.css";

type Tone = "info" | "caution" | "danger";

const ICONS: Record<Tone, ReactNode> = {
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8v.5" />
    </>
  ),
  caution: (
    <>
      <path d="M12 3l9.5 17h-19z" />
      <path d="M12 10v4M12 17v.5" />
    </>
  ),
  danger: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v6M12 16v.5" />
    </>
  ),
};

interface NoticeProps {
  tone: Tone;
  title?: string;
  /** Renders the title as a heading at this level, when the notice is a section of the page. */
  headingLevel?: 2 | 3 | 4;
  children: ReactNode;
  /** Replaces the tone's icon with a more specific one (paths for a 24×24 viewBox). */
  icon?: ReactNode;
  /** `alert` when it appears in response to something and must be announced at once. */
  role?: "alert" | "status";
}

/** A message set apart from the content: what to know or do, with its tone shown by colour and icon. */
export function Notice({ tone, title, headingLevel, children, icon, role }: NoticeProps) {
  const Title = headingLevel ? (`h${headingLevel}` as const) : "p";
  return (
    <div className={`${styles.notice} ${styles[tone]}`} role={role} aria-label={title}>
      <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
        {icon ?? ICONS[tone]}
      </svg>
      <div className={styles.text}>
        {title && <Title className={styles.title}>{title}</Title>}
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}

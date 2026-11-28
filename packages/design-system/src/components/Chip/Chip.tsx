import { useId, type ButtonHTMLAttributes, type ReactNode } from "react";
import styles from "./Chip.module.css";

type ChipProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "className" | "style" | "aria-pressed" | "aria-describedby" | "children"
> & {
  /** Set for a toggle (a category filter); leave out for a one-shot choice (a quick reply). */
  pressed?: boolean;
  /** `neutral` for filters, `accent` for choices the conversation offers. */
  variant?: "neutral" | "accent";
  /** A decorative icon before the label. */
  icon?: ReactNode;
  /** Muted extra text after the label, such as a count; read as the description, not the name. */
  meta?: ReactNode;
  children: ReactNode;
};

export function Chip({
  pressed,
  variant = "neutral",
  icon,
  meta,
  type = "button",
  children,
  ...rest
}: ChipProps) {
  const metaId = useId();
  const hasMeta = meta !== undefined;
  return (
    <button
      {...rest}
      type={type}
      aria-pressed={pressed}
      aria-describedby={hasMeta ? metaId : undefined}
      className={`${styles.chip} ${styles[variant]}`}
    >
      {icon}
      {children}
      {hasMeta && (
        <span id={metaId} className={styles.meta} aria-hidden="true">
          {meta}
        </span>
      )}
    </button>
  );
}

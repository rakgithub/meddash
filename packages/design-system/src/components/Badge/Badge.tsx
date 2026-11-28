import type { ReactNode } from "react";
import styles from "./Badge.module.css";

type BadgeProps =
  | {
      variant?: "status";
      tone?: "neutral" | "accent" | "caution" | "danger";
      children: ReactNode;
    }
  | {
      /** A small filled count, e.g. items in the cart. */
      variant: "count";
      children: number;
      /** Read instead of the bare number, e.g. "3 items in cart". */
      label: string;
    };

export function Badge(props: BadgeProps) {
  if (props.variant === "count") {
    return (
      <span className={`${styles.badge} ${styles.count}`}>
        <span aria-hidden="true">{props.children > 99 ? "99+" : props.children}</span>
        <span className="visually-hidden">{props.label}</span>
      </span>
    );
  }
  return (
    <span className={`${styles.badge} ${styles[props.tone ?? "neutral"]}`}>{props.children}</span>
  );
}

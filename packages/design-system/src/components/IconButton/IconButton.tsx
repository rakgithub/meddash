import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./IconButton.module.css";

type IconButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "className" | "style" | "children" | "aria-label"
> & {
  /** The accessible name; the icon itself is decorative. */
  label: string;
  /** An `aria-hidden` SVG, sized by the button. */
  icon: ReactNode;
  variant?: "primary" | "ghost";
  size?: "sm" | "md";
};

export function IconButton({
  label,
  icon,
  variant = "ghost",
  size = "md",
  type = "button",
  ...rest
}: IconButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      aria-label={label}
      className={`${styles.button} ${styles[variant]} ${styles[size]}`}
    >
      {icon}
    </button>
  );
}

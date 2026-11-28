import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useLinkComponent } from "../LinkProvider/LinkProvider";
import styles from "./Button.module.css";

interface CommonProps {
  variant?: "primary" | "secondary" | "ghost";
  size?: "md" | "lg";
  /** Stretches to the width of its container. */
  block?: boolean;
  children: ReactNode;
}

type ButtonProps = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "style" | "children"> & {
    href?: undefined;
    /** Disables the button and marks it busy while an action it started is running. */
    busy?: boolean;
  };

type LinkProps = CommonProps & {
  /** Renders the app's router link (see `LinkProvider`) styled as a button. */
  href: string;
};

export function Button(props: ButtonProps | LinkProps) {
  const LinkComponent = useLinkComponent();
  const { variant = "primary", size = "md", block = false } = props;
  const className = [styles.button, styles[variant], styles[size], block ? styles.block : ""]
    .filter(Boolean)
    .join(" ");

  if (props.href !== undefined) {
    return (
      <LinkComponent href={props.href} className={className}>
        {props.children}
      </LinkComponent>
    );
  }

  const {
    variant: _variant,
    size: _size,
    block: _block,
    busy = false,
    disabled,
    type = "button",
    children,
    ...rest
  } = props;
  return (
    <button
      {...rest}
      type={type}
      className={className}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
    >
      {children}
    </button>
  );
}

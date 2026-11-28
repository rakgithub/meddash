import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import styles from "./TextField.module.css";

export type TextFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "className" | "style" | "id" | "aria-describedby" | "aria-invalid"
> & {
  label: string;
  /** Shown under the field until there is an error. */
  hint?: string;
  /** Replaces the hint and marks the field invalid. */
  error?: string;
  /** A decorative icon at the start of the field. */
  icon?: ReactNode;
};

/** A labelled input whose hint or error is read out with it (`aria-describedby`). */
export function TextField({ label, hint, error, icon, type = "text", ...rest }: TextFieldProps) {
  const id = useId();
  const noteId = `${id}-note`;
  const note = error ?? hint;

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <div className={`${styles.control} ${error ? styles.invalid : ""}`}>
        {icon}
        <input
          {...rest}
          id={id}
          type={type}
          className={styles.input}
          aria-invalid={error ? true : undefined}
          aria-describedby={note ? noteId : undefined}
        />
      </div>
      {note && (
        <p id={noteId} className={error ? styles.error : styles.hint}>
          {note}
        </p>
      )}
    </div>
  );
}

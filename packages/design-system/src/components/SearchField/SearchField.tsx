import { TextField, type TextFieldProps } from "../TextField/TextField";

type SearchFieldProps = Omit<TextFieldProps, "type" | "icon" | "inputMode">;

/** A `TextField` of type search, with a magnifier. */
export function SearchField(props: SearchFieldProps) {
  return (
    <TextField
      {...props}
      type="search"
      icon={
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <circle cx="9" cy="9" r="5.5" />
          <path d="M13 13l3.5 3.5" />
        </svg>
      }
    />
  );
}

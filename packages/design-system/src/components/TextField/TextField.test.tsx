import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TextField } from "./TextField";

describe("TextField", () => {
  it("is labelled and takes typing", async () => {
    const onChange = vi.fn();
    render(<TextField label="Email" onChange={onChange} />);

    await userEvent.type(screen.getByLabelText("Email"), "a@b.c");

    expect(screen.getByLabelText("Email")).toHaveValue("a@b.c");
    expect(onChange).toHaveBeenCalledTimes(5);
  });

  it("reads the hint with the field", () => {
    render(<TextField label="Password" hint="At least 8 characters" />);
    const input = screen.getByLabelText("Password");
    expect(input).toHaveAccessibleDescription("At least 8 characters");
    expect(input).not.toBeInvalid();
  });

  it("replaces the hint with the error and marks the field invalid", () => {
    render(<TextField label="Password" hint="At least 8 characters" error="Too short" />);
    const input = screen.getByLabelText("Password");
    expect(input).toHaveAccessibleDescription("Too short");
    expect(input).toBeInvalid();
    expect(screen.queryByText("At least 8 characters")).not.toBeInTheDocument();
  });

  it("has no description without a hint or error", () => {
    render(<TextField label="Name" />);
    expect(screen.getByLabelText("Name")).not.toHaveAttribute("aria-describedby");
  });

  it("keeps two fields' ids apart", () => {
    render(
      <>
        <TextField label="First" hint="One" />
        <TextField label="Second" hint="Two" />
      </>,
    );
    expect(screen.getByLabelText("First")).toHaveAccessibleDescription("One");
    expect(screen.getByLabelText("Second")).toHaveAccessibleDescription("Two");
  });
});

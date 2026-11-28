import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Chip } from "./Chip";

function Toggle() {
  const [on, setOn] = useState(false);
  return (
    <Chip pressed={on} onClick={() => setOn(!on)}>
      Allergy
    </Chip>
  );
}

describe("Chip", () => {
  it("toggles aria-pressed from a click and the keyboard", async () => {
    render(<Toggle />);
    const chip = screen.getByRole("button", { name: "Allergy" });
    expect(chip).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(chip);
    expect(chip).toHaveAttribute("aria-pressed", "true");

    await userEvent.keyboard(" ");
    expect(chip).toHaveAttribute("aria-pressed", "false");
  });

  it("is a plain button without pressed, for a one-shot choice", async () => {
    const onClick = vi.fn();
    render(
      <Chip variant="accent" onClick={onClick}>
        A few days
      </Chip>,
    );
    const chip = screen.getByRole("button", { name: "A few days" });

    await userEvent.click(chip);

    expect(chip).not.toHaveAttribute("aria-pressed");
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("reads its meta text as the description, keeping the name to the label", () => {
    render(
      <Chip pressed={false} meta={12}>
        Vitamins
      </Chip>,
    );
    expect(screen.getByRole("button", { name: "Vitamins" })).toHaveAccessibleDescription("12");
  });
});

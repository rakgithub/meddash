import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ThinkingSteps } from "./ThinkingSteps";

const steps = [
  { label: "Understanding symptoms", done: true },
  { label: "Checking catalogue", done: false },
  { label: "3 matches", done: false },
];

describe("ThinkingSteps", () => {
  it("lists every step and marks the current one while working", () => {
    render(<ThinkingSteps steps={steps} active />);

    const items = screen.getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual([
      "Understanding symptoms",
      "Checking catalogue (in progress)",
      "3 matches",
    ]);
  });

  it("marks no step as in progress once the reply stopped", () => {
    render(<ThinkingSteps steps={steps} active={false} />);

    expect(screen.queryByText(/in progress/)).not.toBeInTheDocument();
  });

  it("folds into the last step's label when all are done, and expands on click", async () => {
    render(<ThinkingSteps steps={steps.map((s) => ({ ...s, done: true }))} active={false} />);

    const toggle = screen.getByRole("button", { name: "3 matches 3 steps" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("list")).not.toBeInTheDocument();

    await userEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("says step, not steps, for one", () => {
    render(
      <ThinkingSteps steps={[{ label: "Understanding symptoms", done: true }]} active={false} />,
    );

    expect(
      screen.getByRole("button", { name: "Understanding symptoms 1 step" }),
    ).toBeInTheDocument();
  });
});

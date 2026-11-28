import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ThinkingSteps } from "./ThinkingSteps";

const steps = [
  { label: "Understanding symptoms", done: true },
  { label: "Checking catalogue", done: false },
  { label: "3 matches", done: false },
];

describe("ThinkingSteps", () => {
  it("shows the dots with the step being worked on", () => {
    render(<ThinkingSteps steps={steps} active />);

    expect(screen.getByText("Checking catalogue")).toBeInTheDocument();
    expect(screen.queryByText("Understanding symptoms")).not.toBeInTheDocument();
  });

  it("shows just the dots before any step is known", () => {
    render(<ThinkingSteps steps={[]} active />);

    expect(screen.getByText("Thinking…")).toBeInTheDocument();
  });

  it("is gone once every step is done", () => {
    const { container } = render(
      <ThinkingSteps steps={steps.map((step) => ({ ...step, done: true }))} active />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("is gone once the reply stopped", () => {
    const { container } = render(<ThinkingSteps steps={steps} active={false} />);

    expect(container).toBeEmptyDOMElement();
  });
});

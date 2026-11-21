import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ConsultationProgress } from "./ConsultationProgress";

describe("ConsultationProgress", () => {
  it("names every step and marks the current one", () => {
    render(<ConsultationProgress stage="questions" />);

    const steps = screen.getAllByRole("listitem");
    expect(steps.map((s) => s.textContent)).toEqual(["Symptoms", "A few questions", "Suggestions"]);
    expect(steps[1]).toHaveAttribute("aria-current", "step");
    expect(steps[0]).not.toHaveAttribute("aria-current");
  });
});

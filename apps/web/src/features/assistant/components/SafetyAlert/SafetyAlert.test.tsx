import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SafetyAlert } from "./SafetyAlert";

describe("SafetyAlert", () => {
  it("announces the alert with its title and what to do", () => {
    render(
      <SafetyAlert level="urgent" title="This needs a doctor now" body="Call 112 or your GP." />,
    );

    const alert = screen.getByRole("alert", { name: "This needs a doctor now" });
    expect(alert).toHaveTextContent("Call 112 or your GP.");
    expect(screen.getByRole("heading", { name: "This needs a doctor now" })).toBeInTheDocument();
  });

  it("shows a caution the same way", () => {
    render(<SafetyAlert level="caution" title="Check first" body="Ask a pharmacist." />);

    expect(screen.getByRole("alert", { name: "Check first" })).toHaveTextContent(
      "Ask a pharmacist.",
    );
  });
});

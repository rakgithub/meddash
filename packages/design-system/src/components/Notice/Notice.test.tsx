import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Notice } from "./Notice";

describe("Notice", () => {
  it("is announced as an alert, named by its title", () => {
    render(
      <Notice tone="danger" title="Call 112 now" role="alert">
        Chest pain with breathlessness needs help straight away.
      </Notice>,
    );
    const alert = screen.getByRole("alert", { name: "Call 112 now" });
    expect(alert).toHaveTextContent("Chest pain with breathlessness needs help straight away.");
  });

  it("renders its title as a heading when given a level", () => {
    render(
      <Notice tone="caution" title="Check first" headingLevel={3}>
        Ask a pharmacist.
      </Notice>,
    );
    expect(screen.getByRole("heading", { level: 3, name: "Check first" })).toBeInTheDocument();
  });

  it("keeps the title out of the outline by default", () => {
    render(
      <Notice tone="info" title="Good to know">
        Take with food.
      </Notice>,
    );
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(screen.getByText("Good to know")).toBeInTheDocument();
  });

  it("can be a polite status", () => {
    render(
      <Notice tone="info" role="status">
        Saved.
      </Notice>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Saved.");
  });

  it("is plain content without a role", () => {
    render(<Notice tone="caution">Not for children under 12.</Notice>);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("Not for children under 12.")).toBeInTheDocument();
  });
});

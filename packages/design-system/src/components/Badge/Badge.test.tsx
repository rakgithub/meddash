import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "./Badge";

describe("Badge", () => {
  it("shows a status", () => {
    render(<Badge tone="caution">Awaiting payment</Badge>);
    expect(screen.getByText("Awaiting payment")).toBeInTheDocument();
  });

  it("reads a count by its label, not the bare number", () => {
    render(
      <p>
        Cart{" "}
        <Badge variant="count" label="3 items">
          {3}
        </Badge>
      </p>,
    );
    expect(screen.getByText("3 items")).toBeInTheDocument();
    expect(screen.getByText("3")).toHaveAttribute("aria-hidden", "true");
  });

  it("caps a large count", () => {
    render(
      <Badge variant="count" label="120 items">
        {120}
      </Badge>,
    );
    expect(screen.getByText("99+")).toBeInTheDocument();
  });
});

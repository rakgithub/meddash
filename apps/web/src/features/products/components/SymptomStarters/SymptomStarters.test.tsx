import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SymptomStarters } from "./SymptomStarters";
import { renderWithRouter } from "../../../../test/renderWithRouter";

describe("SymptomStarters", () => {
  it("opens the assistant with the chosen starter as the question", () => {
    renderWithRouter(<SymptomStarters />);

    expect(screen.getByRole("link", { name: "Sore throat and a temperature" })).toHaveAttribute(
      "href",
      "/assistant?q=Sore+throat+and+a+temperature",
    );
  });

  it("offers several starters under a heading", () => {
    renderWithRouter(<SymptomStarters />);

    const region = screen.getByRole("region", { name: /Start with how you feel/ });
    expect(region).toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(4);
  });
});

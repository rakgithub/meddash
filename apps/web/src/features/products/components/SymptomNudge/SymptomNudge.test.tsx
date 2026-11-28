import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SymptomNudge } from "./SymptomNudge";
import { renderWithRouter } from "../../../../test/renderWithRouter";

describe("SymptomNudge", () => {
  it("names the symptom and opens the assistant with it", () => {
    renderWithRouter(<SymptomNudge query="sore throat" reason="symptom" />);

    expect(screen.getByText("“sore throat” sounds like a symptom")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ask the assistant" })).toHaveAttribute(
      "href",
      "/?ask=sore+throat",
    );
  });

  it("explains an empty search", () => {
    renderWithRouter(<SymptomNudge query="xyz" reason="noResults" />);

    expect(screen.getByText("Nothing matches “xyz”")).toBeInTheDocument();
  });
});

import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { coughSyrupDetail, ibuprofenDetail } from "../../../../test/fixtures";
import { renderWithRouter } from "../../../../test/renderWithRouter";
import { RecommendationStack } from "./RecommendationStack";

const items = [
  { product: ibuprofenDetail, reason: "Brings fever down", fit: "best" as const },
  { product: coughSyrupDetail, reason: "Loosens a cough", fit: "locked" as const },
];

describe("RecommendationStack", () => {
  it("lists the suggested products in order", () => {
    renderWithRouter(<RecommendationStack items={items} />);

    const list = screen.getByRole("list", { name: "Suggested products" });
    expect(
      within(list)
        .getAllByRole("article")
        .map((a) => a.getAttribute("aria-label")),
    ).toEqual(["Ibuprofen 400mg", "Cough Syrup"]);
  });

  it("shows skeletons while the products load", () => {
    renderWithRouter(<RecommendationStack items={[]} loading={3} />);

    expect(screen.getByRole("status", { name: "Loading suggestions" })).toBeInTheDocument();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });

  it("notes suggestions that couldn't be loaded", () => {
    renderWithRouter(<RecommendationStack items={items.slice(0, 1)} unavailable={1} />);

    expect(screen.getByText("1 suggestion unavailable")).toBeInTheDocument();
  });

  it("shows only the note when nothing loaded", () => {
    renderWithRouter(<RecommendationStack items={[]} unavailable={2} />);

    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.getByText("2 suggestions unavailable")).toBeInTheDocument();
  });
});

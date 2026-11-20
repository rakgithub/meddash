import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
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

  it("offers to talk to a pharmacist under the suggestions", () => {
    renderWithRouter(<RecommendationStack items={items} />);

    expect(screen.getByText("Talk to a pharmacist")).toBeInTheDocument();
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

  it("slides a card out, then reports which product was ruled out and why", async () => {
    const onDismiss = vi.fn();
    renderWithRouter(<RecommendationStack items={items} onDismiss={onDismiss} />);
    const card = screen.getByRole("article", { name: "Ibuprofen 400mg" });

    await userEvent.click(within(card).getByRole("button", { name: "Not for me" }));
    await userEvent.click(within(card).getByRole("button", { name: "Already tried" }));

    expect(card.closest("li")?.className).toContain("leaving");
    await waitFor(() => expect(onDismiss).toHaveBeenCalledWith(ibuprofenDetail, "Already tried"));
  });

  it("removes the card at once when the user prefers reduced motion", async () => {
    vi.spyOn(window, "matchMedia").mockReturnValue({ matches: true } as MediaQueryList);
    const onDismiss = vi.fn();
    renderWithRouter(<RecommendationStack items={items} onDismiss={onDismiss} />);
    const card = screen.getByRole("article", { name: "Ibuprofen 400mg" });

    await userEvent.click(within(card).getByRole("button", { name: "Not for me" }));
    await userEvent.click(within(card).getByRole("button", { name: "Too expensive" }));

    expect(onDismiss).toHaveBeenCalledWith(ibuprofenDetail, "Too expensive");
  });

  it("says so when every suggestion was ruled out, and still offers a pharmacist", () => {
    renderWithRouter(<RecommendationStack items={[]} ruledOut={2} />);

    expect(screen.getByText(/ruled out every suggestion/)).toBeInTheDocument();
    expect(screen.getByText("Talk to a pharmacist")).toBeInTheDocument();
  });
});

import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { coughSyrupDetail, ibuprofenDetail, paracetamolDetail } from "../../../../test/fixtures";
import { renderWithRouter } from "../../../../test/renderWithRouter";
import { RecommendationStack } from "./RecommendationStack";

const items = [
  { product: ibuprofenDetail, reason: "Brings fever down", fit: "best" as const },
  { product: coughSyrupDetail, reason: "Loosens a cough", fit: "locked" as const },
];

describe("RecommendationStack", () => {
  it("lists the suggestions under a heading, with prescription-only products set apart", () => {
    renderWithRouter(<RecommendationStack title="My suggestions for a cough" items={items} />);

    expect(screen.getByRole("heading", { name: "My suggestions for a cough" })).toBeInTheDocument();
    const list = screen.getByRole("list", { name: "Suggested products" });
    expect(
      within(list)
        .getAllByRole("article")
        .map((a) => a.getAttribute("aria-label")),
    ).toEqual(["Ibuprofen 400mg"]);
    const prescription = screen.getByRole("region", {
      name: "Also used for this, with a prescription",
    });
    expect(within(prescription).getByRole("article", { name: "Cough Syrup" })).toBeInTheDocument();
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

  describe("compare", () => {
    const shortlist = [
      { product: ibuprofenDetail, reason: "Brings fever down", fit: "best" as const },
      { product: paracetamolDetail, reason: "Gentle on the stomach", fit: "good" as const },
      { product: coughSyrupDetail, reason: "Loosens a cough", fit: "locked" as const },
    ];

    it("opens a drawer comparing the suggestions, leaving out prescription-only ones", async () => {
      renderWithRouter(<RecommendationStack items={shortlist} />);

      await userEvent.click(screen.getByRole("button", { name: "Compare" }));

      const dialog = screen.getByRole("dialog", { name: "Compare products" });
      expect(
        within(dialog)
          .getAllByRole("columnheader")
          .map((h) => h.textContent),
      ).toEqual(["Feature", "Ibuprofen 400mgNurofen", "Paracetamol 500mgratiopharm"]);
    });

    it("compares at most the top three", async () => {
      const four = [
        ...shortlist.slice(0, 2),
        {
          product: { ...ibuprofenDetail, id: "9", name: "Third" },
          reason: "",
          fit: "good" as const,
        },
        {
          product: { ...ibuprofenDetail, id: "10", name: "Fourth" },
          reason: "",
          fit: "good" as const,
        },
      ];
      renderWithRouter(<RecommendationStack items={four} />);

      await userEvent.click(screen.getByRole("button", { name: "Compare" }));

      expect(within(screen.getByRole("table")).getAllByRole("columnheader")).toHaveLength(4);
    });

    it("closes the drawer and returns focus to the Compare button", async () => {
      renderWithRouter(<RecommendationStack items={shortlist} />);
      const compare = screen.getByRole("button", { name: "Compare" });
      await userEvent.click(compare);

      await userEvent.click(screen.getByRole("button", { name: "Close" }));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(compare).toHaveFocus();
    });

    it("is not offered for fewer than two options to choose between", () => {
      renderWithRouter(<RecommendationStack items={[shortlist[0], shortlist[2]]} />);

      expect(screen.queryByRole("button", { name: "Compare" })).not.toBeInTheDocument();
    });

    it("is not offered while the suggestions load", () => {
      renderWithRouter(<RecommendationStack items={[]} loading={3} />);

      expect(screen.queryByRole("button", { name: "Compare" })).not.toBeInTheDocument();
    });
  });
});

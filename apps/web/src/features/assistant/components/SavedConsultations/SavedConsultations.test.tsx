import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initialConsultation } from "../../utils/consultationReducer";
import { storeSaved, type SavedConsultation } from "../../utils/savedConsultations";
import { SavedConsultations } from "./SavedConsultations";

const saved = (id: string, title: string): SavedConsultation => ({
  id,
  savedAt: "2026-11-18T09:00:00.000Z",
  title,
  suggestions: 3,
  state: { ...initialConsultation, dismissed: [id] },
});

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("SavedConsultations", () => {
  it("shows nothing when the user has saved nothing", () => {
    render(<SavedConsultations userId="1" onReopen={() => {}} />);
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });

  it("lists the user's consultations as summary cards and reopens one", async () => {
    storeSaved("1", saved("a", "Sore throat, 2–3 days"));
    storeSaved("2", saved("b", "Someone else's"));
    const onReopen = vi.fn();
    render(<SavedConsultations userId="1" onReopen={onReopen} />);

    const list = screen.getByRole("region", { name: "Your consultations" });
    const [card] = within(list).getAllByRole("listitem");
    expect(card).toHaveTextContent("Sore throat, 2–3 days → 3 suggestions");
    expect(screen.queryByText(/Someone else/)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Reopen Sore throat, 2–3 days" }));
    expect(onReopen).toHaveBeenCalledWith(expect.objectContaining({ dismissed: ["a"] }));
  });

  it("removes one, and hides the list when none are left", async () => {
    storeSaved("1", saved("a", "Headache"));
    render(<SavedConsultations userId="1" onReopen={() => {}} />);

    await userEvent.click(screen.getByRole("button", { name: "Remove Headache" }));

    expect(screen.queryByRole("region")).not.toBeInTheDocument();
    expect(localStorage.getItem("meddash-consultations-1")).toBe("[]");
  });

  it("reports a removal that storage refused", async () => {
    storeSaved("1", saved("a", "Headache"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    render(<SavedConsultations userId="1" onReopen={() => {}} />);

    await userEvent.click(screen.getByRole("button", { name: "Remove Headache" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Couldn’t remove it.");
    expect(screen.getByText("Headache → 3 suggestions")).toBeInTheDocument();
  });
});

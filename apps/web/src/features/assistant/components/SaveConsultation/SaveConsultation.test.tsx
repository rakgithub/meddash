import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ibuprofenDetail } from "../../../../test/fixtures";
import type { Message } from "../../types";
import { initialConsultation, type ConsultationState } from "../../utils/consultationReducer";
import { loadSaved } from "../../utils/savedConsultations";
import { SaveConsultation } from "./SaveConsultation";

const withSuggestions: ConsultationState = {
  ...initialConsultation,
  caseFile: { ...initialConsultation.caseFile, symptoms: ["Headache"] },
  messages: [
    { id: "u1", role: "user", parts: [{ kind: "text", text: "Headache" }], status: "done" },
    {
      id: "a1",
      role: "assistant",
      status: "done",
      parts: [
        { kind: "products", items: [{ product: ibuprofenDetail, reason: "x", fit: "best" }] },
      ],
    } satisfies Message,
  ],
};

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("SaveConsultation", () => {
  it("shows nothing before there are suggestions", () => {
    render(<SaveConsultation userId="1" consultation={initialConsultation} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("saves the consultation for the user and says so until it changes", async () => {
    const { rerender } = render(<SaveConsultation userId="1" consultation={withSuggestions} />);

    await userEvent.click(screen.getByRole("button", { name: "Save consultation" }));

    expect(screen.getByRole("status")).toHaveTextContent("Saved.");
    expect(loadSaved("1").map((s) => s.title)).toEqual(["Headache"]);

    const changed = { ...withSuggestions, dismissed: ["1"] };
    rerender(<SaveConsultation userId="1" consultation={changed} />);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("reports a save that storage refused", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    render(<SaveConsultation userId="1" consultation={withSuggestions} />);

    await userEvent.click(screen.getByRole("button", { name: "Save consultation" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Couldn’t save it.");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });
});

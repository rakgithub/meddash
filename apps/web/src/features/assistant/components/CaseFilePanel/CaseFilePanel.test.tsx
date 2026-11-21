import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { CaseFile } from "../../types";
import { CaseFilePanel } from "./CaseFilePanel";

const caseFile: CaseFile = {
  symptoms: ["Sore throat", "Fever"],
  duration: "2-3 days",
  forWhom: "me",
  avoid: ["Tablets"],
};

describe("CaseFilePanel", () => {
  it("shows what the assistant understood", () => {
    render(<CaseFilePanel caseFile={caseFile} />);

    expect(screen.getByRole("list", { name: "Symptoms" })).toHaveTextContent("Sore throatFever");
    expect(screen.getByRole("combobox", { name: "How long" })).toHaveDisplayValue("2–3 days");
    expect(screen.getByRole("combobox", { name: "Who it’s for" })).toHaveDisplayValue("Me");
    expect(screen.getByRole("list", { name: "Avoiding" })).toHaveTextContent("Tablets");
  });

  it("summarises the case in the bar that opens it on a phone", async () => {
    render(<CaseFilePanel caseFile={caseFile} />);

    const toggle = screen.getByRole("button", { name: /Your consultation/ });
    expect(toggle).toHaveTextContent("Sore throat, Fever · 2–3 days · Me");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  it("shows a duration in the assistant's own wording as it is", () => {
    render(<CaseFilePanel caseFile={{ ...caseFile, duration: "1 to 3 days" }} />);

    expect(screen.getByRole("combobox", { name: "How long" })).toHaveDisplayValue("1 to 3 days");
    expect(screen.getByRole("button", { name: /Your consultation/ })).toHaveTextContent(
      "Sore throat, Fever · 1 to 3 days · Me",
    );
  });

  it("says so when nothing is known yet", () => {
    render(<CaseFilePanel caseFile={{ symptoms: [], duration: null, forWhom: null, avoid: [] }} />);

    expect(screen.getByRole("button", { name: /Your consultation/ })).toHaveTextContent(
      "Nothing noted yet",
    );
    expect(screen.getByRole("combobox", { name: "How long" })).toHaveDisplayValue("Not asked yet");
  });

  it("asks for a fresh recommendation when who it is for changes", async () => {
    const onRefine = vi.fn();
    render(<CaseFilePanel caseFile={caseFile} onRefine={onRefine} />);

    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Who it’s for" }),
      "A child",
    );

    expect(onRefine).toHaveBeenCalledWith(
      { ...caseFile, forWhom: "child" },
      "Changed who it’s for to A child",
    );
  });

  it("asks for a fresh recommendation when the duration changes", async () => {
    const onRefine = vi.fn();
    render(<CaseFilePanel caseFile={caseFile} onRefine={onRefine} />);

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "How long" }), "Longer");

    expect(onRefine).toHaveBeenCalledWith(
      { ...caseFile, duration: "longer" },
      "Changed duration to Longer",
    );
  });

  it("describes an added symptom by name so it is screened like typed text", async () => {
    const onRefine = vi.fn();
    const user = userEvent.setup();
    render(<CaseFilePanel caseFile={caseFile} onRefine={onRefine} />);

    await user.click(screen.getByRole("button", { name: "+ Add" }));
    await user.keyboard("Cough{Enter}");

    expect(onRefine).toHaveBeenCalledWith(
      { ...caseFile, symptoms: ["Sore throat", "Fever", "Cough"] },
      "Added symptom: Cough",
    );
  });

  it("does not name a removed symptom, so it can't be read as a new one", async () => {
    const onRefine = vi.fn();
    render(<CaseFilePanel caseFile={caseFile} onRefine={onRefine} />);

    await userEvent.click(screen.getByRole("button", { name: "Remove Fever" }));

    expect(onRefine).toHaveBeenCalledWith(
      { ...caseFile, symptoms: ["Sore throat"] },
      "Removed a symptom",
    );
  });

  it("does nothing when the symptom is already there", async () => {
    const onRefine = vi.fn();
    const user = userEvent.setup();
    render(<CaseFilePanel caseFile={caseFile} onRefine={onRefine} />);

    await user.click(screen.getByRole("button", { name: "+ Add" }));
    await user.keyboard("fever{Enter}");

    expect(onRefine).not.toHaveBeenCalled();
  });

  it("lets the user stop avoiding something", async () => {
    const onRefine = vi.fn();
    render(<CaseFilePanel caseFile={caseFile} onRefine={onRefine} />);

    await userEvent.click(screen.getByRole("button", { name: "Stop avoiding Tablets" }));

    expect(onRefine).toHaveBeenCalledWith({ ...caseFile, avoid: [] }, "Updated what to avoid");
  });

  it("is read-only without a way to refine", () => {
    render(<CaseFilePanel caseFile={caseFile} />);

    expect(screen.getByRole("combobox", { name: "How long" })).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "Who it’s for" })).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: /Remove|Stop avoiding|Add/ }),
    ).not.toBeInTheDocument();
  });

  it("shows the footer", () => {
    render(
      <CaseFilePanel caseFile={caseFile} footer={<button type="button">Start over</button>} />,
    );

    expect(screen.getByRole("button", { name: "Start over" })).toBeInTheDocument();
  });
});

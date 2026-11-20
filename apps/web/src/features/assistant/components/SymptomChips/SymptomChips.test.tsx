import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SymptomChips } from "./SymptomChips";

const symptoms = ["Sore throat", "Fever"];

describe("SymptomChips", () => {
  it("lists the noted symptoms", () => {
    render(<SymptomChips symptoms={symptoms} />);

    const list = screen.getByRole("list", { name: "What I noted" });
    expect(list).toHaveTextContent("Sore throat");
    expect(list).toHaveTextContent("Fever");
  });

  it("is read-only without onChange", () => {
    render(<SymptomChips symptoms={symptoms} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("removes a symptom and moves focus to Add", async () => {
    const onChange = vi.fn();
    render(<SymptomChips symptoms={symptoms} onChange={onChange} />);

    await userEvent.click(screen.getByRole("button", { name: "Remove Fever" }));

    expect(onChange).toHaveBeenCalledWith(["Sore throat"]);
    expect(screen.getByRole("button", { name: "+ Add" })).toHaveFocus();
  });

  it("adds a typed symptom, skipping one that is already there", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<SymptomChips symptoms={symptoms} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "+ Add" }));
    expect(screen.getByRole("textbox", { name: "Add a symptom" })).toHaveFocus();
    await user.keyboard("Cough{Enter}");

    expect(onChange).toHaveBeenLastCalledWith(["Sore throat", "Fever", "Cough"]);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("closes the field on Escape without changing anything", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<SymptomChips symptoms={symptoms} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "+ Add" }));
    await user.keyboard("Cou{Escape}");

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "+ Add" })).toBeInTheDocument();
  });

  it("says so when every symptom was removed", () => {
    render(<SymptomChips symptoms={[]} onChange={() => {}} />);

    expect(screen.getByText("No symptoms yet")).toBeInTheDocument();
  });
});

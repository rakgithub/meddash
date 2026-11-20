import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { QuickReplies } from "./QuickReplies";

const options = [
  { label: "Since today", value: "today" },
  { label: "2–3 days", value: "2-3 days" },
];

describe("QuickReplies", () => {
  it("asks the question with one button per option", () => {
    render(<QuickReplies question="How long?" options={options} onAnswer={() => {}} />);

    const list = screen.getByRole("list", { name: "How long?" });
    expect(list).toBeInTheDocument();
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual([
      "Since today",
      "2–3 days",
    ]);
  });

  it("answers with the chosen option, by keyboard too", async () => {
    const onAnswer = vi.fn();
    const user = userEvent.setup();
    render(<QuickReplies question="How long?" options={options} onAnswer={onAnswer} />);

    await user.tab();
    await user.tab();
    await user.keyboard("{Enter}");

    expect(onAnswer).toHaveBeenCalledWith({ label: "2–3 days", value: "2-3 days" });
  });

  it("shows the options read-only once answered, marking the answer", () => {
    render(<QuickReplies question="How long?" options={options} selected="2–3 days" />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("(your answer)")).toBeInTheDocument();
    expect(screen.getByText("2–3 days")).toHaveTextContent("2–3 days (your answer)");
  });
});

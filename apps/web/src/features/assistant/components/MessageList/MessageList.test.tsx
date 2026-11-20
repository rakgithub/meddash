import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Message } from "../../types";
import { MessageList } from "./MessageList";

const question: Message = {
  id: "u1",
  role: "user",
  parts: [{ kind: "text", text: "Hay fever" }],
  status: "done",
};

function answer(status: Message["status"], text = "Try an antihistamine.\n\nOr a spray."): Message {
  return { id: "a1", role: "assistant", parts: text ? [{ kind: "text", text }] : [], status };
}

afterEach(() => vi.restoreAllMocks());

describe("MessageList", () => {
  it("shows who said what, with the reply split into paragraphs", () => {
    render(<MessageList messages={[question, answer("done")]} onRetry={() => {}} />);

    const [mine, theirs] = screen.getAllByRole("listitem");
    expect(mine).toHaveTextContent("You said:Hay fever");
    expect(theirs).toHaveTextContent("Assistant:");
    expect(screen.getByText("Try an antihistamine.")).toBeInTheDocument();
    expect(screen.getByText("Or a spray.")).toBeInTheDocument();
  });

  it("announces a reply only once it is complete", () => {
    const { rerender } = render(
      <MessageList messages={[question, answer("streaming", "Try an")]} onRetry={() => {}} />,
    );
    const live = screen.getByRole("status");
    expect(live).toHaveTextContent("");

    rerender(<MessageList messages={[question, answer("done")]} onRetry={() => {}} />);

    expect(live).toHaveTextContent("Try an antihistamine. Or a spray.");
  });

  it("shows the thinking steps of a reply", () => {
    const thinking: Message = {
      ...answer("streaming", ""),
      parts: [{ kind: "thinking", steps: [{ label: "Checking catalogue", done: false }] }],
    };
    render(<MessageList messages={[question, thinking]} onRetry={() => {}} />);

    expect(screen.getByText("Checking catalogue")).toBeInTheDocument();
  });

  it("shows a waiting line before the first part arrives", () => {
    render(<MessageList messages={[question, answer("streaming", "")]} onRetry={() => {}} />);

    expect(screen.getByText("Thinking…")).toBeInTheDocument();
  });

  it("notes a stopped reply", () => {
    render(<MessageList messages={[question, answer("stopped", "Try")]} onRetry={() => {}} />);

    expect(screen.getByText("Stopped")).toBeInTheDocument();
  });

  it("shows an error with Retry on a failed last reply", async () => {
    const onRetry = vi.fn();
    render(<MessageList messages={[question, answer("error", "")]} onRetry={onRetry} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong");
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("offers no Retry on an older failed reply", () => {
    const later: Message[] = [
      { ...question, id: "u2" },
      { ...answer("done"), id: "a2" },
    ];
    render(<MessageList messages={[question, answer("error", ""), ...later]} onRetry={() => {}} />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
  });

  it("follows new text, but not after the user scrolls up, until the next turn", () => {
    const scrollTo = vi.spyOn(window, "scrollTo");
    const { rerender } = render(
      <MessageList messages={[question, answer("streaming", "Try")]} onRetry={() => {}} />,
    );
    scrollTo.mockClear();

    rerender(
      <MessageList messages={[question, answer("streaming", "Try an")]} onRetry={() => {}} />,
    );
    expect(scrollTo).toHaveBeenCalledOnce();

    // Scrolled far from the bottom of a long page.
    vi.spyOn(document.documentElement, "scrollHeight", "get").mockReturnValue(5000);
    window.dispatchEvent(new Event("scroll"));
    scrollTo.mockClear();
    rerender(
      <MessageList messages={[question, answer("streaming", "Try an anti")]} onRetry={() => {}} />,
    );
    expect(scrollTo).not.toHaveBeenCalled();

    rerender(
      <MessageList
        messages={[question, answer("done"), { ...question, id: "u2" }]}
        onRetry={() => {}}
      />,
    );
    expect(scrollTo).toHaveBeenCalledOnce();
  });
});

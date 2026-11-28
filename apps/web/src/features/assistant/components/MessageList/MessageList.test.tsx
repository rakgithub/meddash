import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ibuprofenDetail } from "../../../../test/fixtures";
import { endAnimation } from "../../../../test/endAnimation";
import { renderWithRouter } from "../../../../test/renderWithRouter";
import type { Message, MessagePart } from "../../types";
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
    expect(live).toHaveTextContent("Assistant is replying…");

    rerender(<MessageList messages={[question, answer("done")]} onRetry={() => {}} />);

    expect(live).toHaveTextContent("Try an antihistamine. Or a spray.");
  });

  it("announces a question with its options and the suggestions by name", () => {
    const reply: Message = {
      id: "a1",
      role: "assistant",
      status: "done",
      parts: [
        { kind: "text", text: "Here is what I'd try." },
        {
          kind: "products",
          items: [
            { product: ibuprofenDetail, reason: "Eases pain", fit: "best" },
            { product: { ...ibuprofenDetail, id: "rx" }, reason: "Rx", fit: "locked" },
          ],
        },
        {
          kind: "quickReplies",
          question: "Who is it for?",
          field: "forWhom",
          options: [
            { label: "Me", value: "me" },
            { label: "A child", value: "child" },
          ],
        },
      ],
    };
    renderWithRouter(<MessageList messages={[question, reply]} onRetry={() => {}} />);

    // Prescription-only products are not offered, so they are not announced either.
    const live = screen.getByText(
      `Here is what I'd try. 1 suggestion: ${ibuprofenDetail.name}. Who is it for? Options: Me, A child.`,
    );
    expect(live).toHaveAttribute("role", "status");
  });

  it("announces a stopped reply, keeping what was said", () => {
    render(<MessageList messages={[question, answer("stopped", "Try an")]} onRetry={() => {}} />);
    expect(screen.getByRole("status")).toHaveTextContent("Try an Reply stopped.");
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

  it("says why a reply failed when it knows", () => {
    const failed: Message = { ...answer("error", ""), error: "Please try again in a few minutes." };
    render(<MessageList messages={[question, failed]} onRetry={() => {}} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Please try again in a few minutes.");
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
    // Spied on the prototype that owns the getter: restoring an instance spy of an inherited getter recurses.
    vi.spyOn(Element.prototype, "scrollHeight", "get").mockReturnValue(5000);
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

  describe("structured parts", () => {
    const reply = (
      id: string,
      parts: MessagePart[],
      status: Message["status"] = "done",
    ): Message => ({
      id,
      role: "assistant",
      parts,
      status,
    });
    const said = (id: string, text: string): Message => ({
      id,
      role: "user",
      parts: [{ kind: "text", text }],
      status: "done",
    });
    const durationQuestion: MessagePart = {
      kind: "quickReplies",
      question: "How long?",
      field: "duration",
      options: [
        { label: "Since today", value: "today" },
        { label: "Longer", value: "longer" },
      ],
    };

    it("shows the case file's symptoms on the latest symptom list, read-only", () => {
      render(
        <MessageList
          messages={[
            question,
            reply("a1", [{ kind: "symptoms", symptoms: ["Old"] }]),
            said("u2", "Cough too"),
            reply("a2", [{ kind: "symptoms", symptoms: ["Cough"] }]),
          ]}
          symptoms={["Sneezing", "Cough"]}
          onRetry={() => {}}
        />,
      );

      const [older, latest] = screen.getAllByRole("list", { name: "What I noted" });
      expect(older).toHaveTextContent("Old");
      expect(latest).toHaveTextContent("SneezingCough");
      // Edits happen in the case file panel, which asks for a fresh recommendation.
      expect(screen.queryByRole("button", { name: /^Remove/ })).not.toBeInTheDocument();
    });

    const products: MessagePart = {
      kind: "products",
      items: [{ product: ibuprofenDetail, reason: "Brings fever down", fit: "best" }],
    };

    it("lets the user rule out a suggestion once the reply has finished", async () => {
      const onDismiss = vi.fn();
      renderWithRouter(
        <MessageList
          messages={[question, reply("a1", [products])]}
          onDismiss={onDismiss}
          onRetry={() => {}}
        />,
      );

      await userEvent.click(screen.getByRole("button", { name: "Not for me" }));
      await userEvent.click(screen.getByRole("button", { name: "Already tried" }));
      endAnimation(screen.getByRole("article", { name: "Ibuprofen 400mg" }).closest("li"));

      expect(onDismiss).toHaveBeenCalledWith(ibuprofenDetail, "Already tried");
    });

    it("keeps suggestions read-only while a reply streams", () => {
      renderWithRouter(
        <MessageList
          messages={[question, reply("a1", [products], "streaming")]}
          onDismiss={() => {}}
          onRetry={() => {}}
        />,
      );

      expect(screen.queryByRole("button", { name: "Not for me" })).not.toBeInTheDocument();
    });

    it("lets the user answer the last question", async () => {
      const onAnswer = vi.fn();
      render(
        <MessageList
          messages={[question, reply("a1", [durationQuestion])]}
          onAnswer={onAnswer}
          onRetry={() => {}}
        />,
      );

      await userEvent.click(screen.getByRole("button", { name: "Longer" }));

      expect(onAnswer).toHaveBeenCalledWith("duration", { label: "Longer", value: "longer" });
    });

    it("folds an answered question into one line with the answer, and hides the echoed answer", () => {
      render(
        <MessageList
          messages={[
            question,
            reply("a1", [durationQuestion]),
            said("u2", "Longer"),
            reply("a2", [], "streaming"),
          ]}
          onAnswer={() => {}}
          onRetry={() => {}}
        />,
      );

      expect(screen.queryByRole("button", { name: "Longer" })).not.toBeInTheDocument();
      expect(screen.getByText("How long?").closest("p")).toHaveTextContent("How long?Longer");
      // The tapped answer is already on the question, so its own bubble is only for screen readers.
      const [, , echoed] = within(screen.getByRole("list", { name: "Conversation" })).getAllByRole(
        "listitem",
      );
      expect(echoed).toHaveClass("visually-hidden");
      expect(echoed).toHaveTextContent("You said:Longer");
    });

    it("sets the advice on when to see a doctor apart from the rest of the reply", () => {
      render(
        <MessageList
          messages={[
            question,
            reply("a1", [
              { kind: "text", text: "Rest helps.\n\nSee a doctor if it lasts more than a week." },
            ]),
          ]}
          onRetry={() => {}}
        />,
      );

      expect(screen.getByText("When to see a doctor").parentElement).toHaveTextContent(
        "See a doctor if it lasts more than a week.",
      );
    });

    it("shows product cards and asks about an ingredient only when idle", async () => {
      const onAskIngredient = vi.fn();
      const products: MessagePart = {
        kind: "products",
        items: [{ product: ibuprofenDetail, reason: "Brings fever down", fit: "best" }],
      };
      const { rerender } = renderWithRouter(
        <MessageList
          messages={[question, reply("a1", [products])]}
          onAskIngredient={onAskIngredient}
          onRetry={() => {}}
        />,
      );

      await userEvent.click(screen.getByRole("button", { name: "Ask about Ibuprofen" }));
      expect(onAskIngredient).toHaveBeenCalledWith("Ibuprofen");

      rerender(
        <MessageList
          messages={[
            question,
            reply("a1", [products]),
            said("u2", "Hi"),
            reply("a2", [], "streaming"),
          ]}
          onAskIngredient={onAskIngredient}
          onRetry={() => {}}
        />,
      );
      expect(screen.queryByRole("button", { name: "Ask about Ibuprofen" })).not.toBeInTheDocument();
    });
  });
});

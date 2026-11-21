import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ibuprofenDetail, paracetamolDetail } from "../../../../test/fixtures";
import { renderWithRouter } from "../../../../test/renderWithRouter";
import { askCompare } from "../../api/askCompare";
import { AssistantError } from "../../api/streamEngine";
import type { CompareEvent } from "../../types";
import { CompareDrawer } from "./CompareDrawer";

vi.mock("../../api/askCompare", () => ({ askCompare: vi.fn() }));

/** Makes the next question answered with these events, as the server would stream them. */
function answers(...events: CompareEvent[]) {
  vi.mocked(askCompare).mockImplementation(async function* () {
    yield* events;
  });
}

function setup() {
  const onClose = vi.fn();
  renderWithRouter(
    <CompareDrawer products={[ibuprofenDetail, paracetamolDetail]} onClose={onClose} />,
  );
  return { onClose, user: userEvent.setup() };
}

describe("CompareDrawer", () => {
  beforeEach(() => vi.mocked(askCompare).mockReset());

  it("is a modal dialog with the first control focused", () => {
    setup();

    expect(screen.getByRole("dialog", { name: "Compare products" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
  });

  it("lays the products out as a table with column and row headers", () => {
    setup();
    const table = screen.getByRole("table");

    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((h) => h.textContent),
    ).toEqual(["Feature", "Ibuprofen 400mgNurofen", "Paracetamol 500mgratiopharm"]);
    const row = within(table).getByRole("row", { name: /Dosage form/ });
    expect(within(row).getByRole("rowheader")).toHaveTextContent("Dosage form");
    expect(
      within(row)
        .getAllByRole("cell")
        .map((c) => c.textContent),
    ).toEqual(["Film-coated tablet", "Tablet"]);
  });

  it("marks the rows that differ with a text badge and not the ones that match", () => {
    setup();

    expect(
      within(screen.getByRole("row", { name: /Dosage form/ })).getByText("Differs"),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("row", { name: /Pack size/ })).queryByText("Differs"),
    ).not.toBeInTheDocument();
  });

  it("links each product to its page", () => {
    setup();

    expect(screen.getByRole("link", { name: "Ibuprofen 400mg" })).toHaveAttribute(
      "href",
      "/products/1",
    );
  });

  it("answers a suggested question and highlights the row it is about", async () => {
    answers(
      { kind: "text", text: "Paracetamol 500mg" },
      { kind: "text", text: " is gentler." },
      { kind: "row", row: "warnings" },
    );
    const { user } = setup();

    await user.click(screen.getByRole("button", { name: "Which is gentler on the stomach?" }));

    expect(askCompare).toHaveBeenCalledWith(
      ["1", "2"],
      "Which is gentler on the stomach?",
      expect.any(AbortSignal),
    );
    expect(screen.getByRole("status")).toHaveTextContent("Paracetamol 500mg is gentler.");
    expect(screen.getByRole("row", { name: /Warnings/ })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("row", { name: /Stock/ })).not.toHaveAttribute("aria-current");
  });

  it("answers a typed question with Enter, clears the box and moves the highlight", async () => {
    const { user } = setup();
    const box = screen.getByRole("textbox", { name: "Ask about these products" });

    answers({ kind: "text", text: "Paracetamol is cheapest." }, { kind: "row", row: "unitPrice" });
    await user.type(box, "Which is cheapest?{Enter}");

    expect(screen.getByRole("status")).toHaveTextContent("Paracetamol is cheapest.");
    expect(box).toHaveValue("");
    expect(screen.getByRole("row", { name: /Price per unit/ })).toHaveAttribute(
      "aria-current",
      "true",
    );

    answers({ kind: "text", text: "Both are in stock." }, { kind: "row", row: "stock" });
    await user.type(box, "How is the stock?{Enter}");

    expect(screen.getByRole("status")).toHaveTextContent("Both are in stock.");
    expect(screen.getByRole("row", { name: /Stock/ })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("row", { name: /Price per unit/ })).not.toHaveAttribute("aria-current");
  });

  it("says it is thinking until the first words arrive", async () => {
    let finish = () => {};
    vi.mocked(askCompare).mockImplementation(async function* () {
      await new Promise<void>((resolve) => (finish = resolve));
      yield { kind: "text", text: "Done." };
    });
    const { user } = setup();

    await user.click(screen.getByRole("button", { name: "Which is cheapest?" }));
    expect(screen.getByRole("status")).toHaveTextContent("Thinking…");

    finish();
    expect(await screen.findByText("Done.")).toBeInTheDocument();
  });

  it("shows an urgent alert from the question as the answer", async () => {
    answers({
      kind: "alert",
      level: "urgent",
      title: "This needs a doctor now",
      body: "Call 112.",
    });
    const { user } = setup();

    await user.type(screen.getByRole("textbox"), "chest pain{Enter}");

    expect(screen.getByRole("status")).toHaveTextContent("This needs a doctor now. Call 112.");
  });

  it("shows the assistant's message when the answer fails", async () => {
    vi.mocked(askCompare).mockImplementation(async function* () {
      yield { kind: "text", text: "Partial" };
      throw new AssistantError("Please try again in a few minutes.");
    });
    const { user } = setup();

    await user.click(screen.getByRole("button", { name: "Which is cheapest?" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Please try again in a few minutes.");
  });

  it("shows a general message for an unexpected failure", async () => {
    vi.mocked(askCompare).mockImplementation(async function* () {
      yield* [];
      throw new TypeError("Failed to fetch");
    });
    const { user } = setup();

    await user.click(screen.getByRole("button", { name: "Which is cheapest?" }));

    expect(screen.getByRole("alert")).toHaveTextContent("The assistant could not answer.");
  });

  it("cancels the answer when the drawer closes", async () => {
    let signal: AbortSignal | undefined;
    vi.mocked(askCompare).mockImplementation(async function* (_ids, _question, s) {
      signal = s;
      yield* [];
      await new Promise(() => {});
    });
    const { user } = setup();

    await user.click(screen.getByRole("button", { name: "Which is cheapest?" }));
    // Unmounting is what closing the drawer does to it.
    cleanup();

    expect(signal?.aborted).toBe(true);
  });

  it("drops what is still arriving for a question asked over", async () => {
    let release = () => {};
    vi.mocked(askCompare)
      .mockImplementationOnce(async function* () {
        yield { kind: "text", text: "Old start." };
        await new Promise<void>((resolve) => (release = resolve));
        // Already received before the cancel, so the stream still hands them over.
        yield { kind: "text", text: " Old end." };
        yield { kind: "row", row: "stock" };
      })
      .mockImplementationOnce(async function* () {
        yield { kind: "text", text: "New answer." };
        yield { kind: "row", row: "warnings" };
      });
    const { user } = setup();

    await user.click(screen.getByRole("button", { name: "Which is cheapest?" }));
    expect(await screen.findByText("Old start.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Which is gentler on the stomach?" }));
    release();

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("New answer."));
    expect(screen.getByRole("status")).not.toHaveTextContent("Old");
    expect(screen.getByRole("row", { name: /Warnings/ })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("row", { name: /Stock/ })).not.toHaveAttribute("aria-current");
  });

  it("says so when the answer ends without any words", async () => {
    answers({ kind: "row", row: "price" });
    const { user } = setup();

    await user.click(screen.getByRole("button", { name: "Which is cheapest?" }));

    expect(screen.getByRole("alert")).toHaveTextContent("had no answer to that");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("ignores an empty question", async () => {
    const { user } = setup();

    await user.click(screen.getByRole("button", { name: "Ask" }));

    expect(askCompare).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("closes from the Close button", async () => {
    const { user, onClose } = setup();

    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("gives focus back to the button that opened it", () => {
    const opener = document.createElement("button");
    document.body.append(opener);
    opener.focus();

    const { unmount } = renderWithRouter(
      <CompareDrawer products={[ibuprofenDetail, paracetamolDetail]} onClose={() => {}} />,
    );
    expect(opener).not.toHaveFocus();
    unmount();

    expect(opener).toHaveFocus();
    opener.remove();
  });
});

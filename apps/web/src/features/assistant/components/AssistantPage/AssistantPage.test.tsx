import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as engineModule from "../../api/mockEngine";
import { ibuprofenDetail } from "../../../../test/fixtures";
import { renderWithRouter } from "../../../../test/renderWithRouter";
import { AssistantPage } from "./AssistantPage";

vi.mock("../../api/mockEngine");
const engine = vi.mocked(engineModule.mockEngine);

beforeEach(() => {
  vi.resetAllMocks();
  engine.mockImplementation(async function* () {
    yield { kind: "thinking", steps: [{ label: "3 matches", done: true }] };
    yield { kind: "text", text: "Try an " };
    yield { kind: "text", text: "antihistamine." };
  });
});

describe("AssistantPage", () => {
  it("greets with starter prompts and the disclaimer", () => {
    renderWithRouter(<AssistantPage />, "/assistant");

    expect(screen.getByRole("heading", { name: "What’s bothering you?" })).toBeInTheDocument();
    for (const starter of ["Sore throat and fever", "Can't sleep", "Hay fever", "Upset stomach"]) {
      expect(screen.getByRole("button", { name: starter })).toBeInTheDocument();
    }
    expect(screen.getByText("Suggestions, not a diagnosis. Ask a pharmacist.")).toBeInTheDocument();
  });

  it("sends a starter prompt and renders the streamed reply", async () => {
    renderWithRouter(<AssistantPage />, "/assistant");

    await userEvent.click(screen.getByRole("button", { name: "Hay fever" }));

    // The finished reply is announced, and shown under the question.
    expect(await screen.findByRole("status")).toHaveTextContent("Try an antihistamine.");
    const [question, reply] = screen.getAllByRole("listitem");
    expect(question).toHaveTextContent("Hay fever");
    expect(reply).toHaveTextContent("Try an antihistamine.");
    expect(screen.getByRole("button", { name: "3 matches 1 step" })).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "What’s bothering you?" }),
    ).not.toBeInTheDocument();
  });

  it("pre-fills the message box from the link", () => {
    renderWithRouter(<AssistantPage />, "/assistant?q=ibuprofen");

    expect(screen.getByRole("textbox", { name: "Describe your symptoms" })).toHaveValue(
      "ibuprofen",
    );
  });

  it("can be used by keyboard alone: answer a question, then open a suggested product", async () => {
    engine
      .mockImplementationOnce(async function* () {
        yield { kind: "symptoms", symptoms: ["Sore throat"] };
        yield {
          kind: "quickReplies",
          question: "How long has it been going on?",
          field: "duration",
          options: [
            { label: "Since today", value: "today" },
            { label: "2–3 days", value: "2-3 days" },
          ],
        };
      })
      .mockImplementationOnce(async function* () {
        yield {
          kind: "products",
          items: [{ product: ibuprofenDetail, reason: "Brings fever down", fit: "best" }],
        };
      });
    const user = userEvent.setup();
    renderWithRouter(<AssistantPage />, "/assistant");

    await user.click(screen.getByRole("textbox", { name: "Describe your symptoms" }));
    await user.keyboard("Sore throat{Enter}");
    const option = await screen.findByRole("button", { name: "2–3 days" });

    // Tab from the message box back to the answer, then press it.
    while (document.activeElement !== option) await user.tab({ shift: true });
    await user.keyboard("{Enter}");

    expect(engine).toHaveBeenLastCalledWith(
      expect.objectContaining({
        userText: "2–3 days",
        caseFile: expect.objectContaining({ duration: "2-3 days" }),
      }),
    );
    const link = await screen.findByRole("link", { name: "Ibuprofen 400mg" });
    expect(screen.queryByRole("button", { name: "2–3 days" })).not.toBeInTheDocument();
    while (document.activeElement !== link) await user.tab({ shift: true });
    expect(link).toHaveAttribute("href", "/products/1");
  });

  it("pauses after an urgent alert until the user starts over", async () => {
    engine.mockImplementationOnce(async function* () {
      yield {
        kind: "alert",
        level: "urgent",
        title: "This needs a doctor now: you mentioned chest pain",
        body: "Call 112.",
      };
      // A misbehaving engine still can't recommend after the alert.
      yield {
        kind: "products",
        items: [{ product: ibuprofenDetail, reason: "", fit: "best" }],
      };
    });
    const user = userEvent.setup();
    renderWithRouter(<AssistantPage />, "/assistant");

    await user.type(
      screen.getByRole("textbox", { name: "Describe your symptoms" }),
      "Chest pain{Enter}",
    );

    expect(await screen.findByRole("alert", { name: /This needs a doctor now/ })).toHaveTextContent(
      "Call 112.",
    );
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Start over" }));

    expect(screen.getByRole("heading", { name: "What’s bothering you?" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Describe your symptoms" })).toBeInTheDocument();
  });
});

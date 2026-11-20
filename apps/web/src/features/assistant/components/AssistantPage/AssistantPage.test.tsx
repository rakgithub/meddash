import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as engineModule from "../../api/mockEngine";
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
});

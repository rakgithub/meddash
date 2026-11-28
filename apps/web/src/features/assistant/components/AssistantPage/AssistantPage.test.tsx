import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as engineModule from "../../api/streamEngine";
import { AuthProvider } from "../../../auth";
import { ibuprofenDetail } from "../../../../test/fixtures";
import { renderWithRouter } from "../../../../test/renderWithRouter";
import { AssistantPage } from "./AssistantPage";

vi.mock("../../api/streamEngine");
const engine = vi.mocked(engineModule.streamEngine);

/** Answers the session check (GET /api/auth/me), the only request the page makes with the engine mocked. */
function signedOut() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ error: { message: "No" } }, { status: 401 })),
  );
}

const renderPage = (url: string) =>
  renderWithRouter(
    <AuthProvider>
      <AssistantPage />
    </AuthProvider>,
    url,
  );

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  signedOut();
  engine.mockImplementation(async function* () {
    yield { kind: "thinking", steps: [{ label: "3 matches", done: true }] };
    yield { kind: "text", text: "Try an " };
    yield { kind: "text", text: "antihistamine." };
  });
});

afterEach(() => vi.unstubAllGlobals());

describe("AssistantPage", () => {
  it("asks how you are, with three starters and the pharmacist line", () => {
    renderPage("/assistant");

    expect(
      screen.getByRole("heading", { level: 1, name: "How are you feeling today?" }),
    ).toBeVisible();
    const starters = screen.getByRole("list", { name: "Start with" });
    expect(
      within(starters)
        .getAllByRole("button")
        .map((b) => b.textContent),
    ).toEqual(["Hay fever", "Dry cough", "Can't sleep"]);
    expect(screen.getByRole("textbox", { name: "Describe your symptoms" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Reviewed by pharmacists. Not a substitute for a doctor — in an emergency, call 112.",
      ),
    ).toBeInTheDocument();
  });

  it("sends a starter and renders the streamed reply in place of the greeting", async () => {
    renderPage("/assistant");

    await userEvent.click(screen.getByRole("button", { name: "Hay fever" }));

    // The finished reply is announced, and shown under the question.
    expect(await screen.findByRole("status")).toHaveTextContent("Try an antihistamine.");
    const [question, reply] = within(
      screen.getByRole("list", { name: "Conversation" }),
    ).getAllByRole("listitem");
    expect(question).toHaveTextContent("Hay fever");
    expect(reply).toHaveTextContent("Try an antihistamine.");
    // The finished checks fold away; only the answer stays.
    expect(reply).not.toHaveTextContent("3 matches");
    expect(
      screen.getByRole("heading", { level: 1, name: "Symptom assistant" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "How are you feeling today?" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/Reviewed by pharmacists/)).toBeInTheDocument();
  });

  it("changes the message box's hint once suggestions are shown", async () => {
    engine.mockImplementationOnce(async function* () {
      yield {
        kind: "products",
        items: [{ product: ibuprofenDetail, reason: "Eases it", fit: "best" }],
      };
    });
    renderPage("/assistant");

    await userEvent.click(screen.getByRole("button", { name: "Dry cough" }));

    expect(await screen.findByRole("article", { name: "Ibuprofen 400mg" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Describe your symptoms" })).toHaveAttribute(
      "placeholder",
      "Reply, or ask something else…",
    );
  });

  it("pre-fills the message box from the link", () => {
    renderPage("/assistant?q=ibuprofen");

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
    renderPage("/assistant");

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
    renderPage("/assistant");

    await user.type(
      screen.getByRole("textbox", { name: "Describe your symptoms" }),
      "Chest pain{Enter}",
    );

    expect(await screen.findByRole("alert", { name: /This needs a doctor now/ })).toHaveTextContent(
      "Call 112.",
    );
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();

    expect(screen.getByText(/Not a substitute for a doctor/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Start over" }));

    expect(screen.getByRole("heading", { name: "How are you feeling today?" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Describe your symptoms" })).toBeInTheDocument();
  });
});

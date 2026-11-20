import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as engineModule from "../../api/mockEngine";
import { AuthProvider } from "../../../auth";
import { ana, ibuprofenDetail } from "../../../../test/fixtures";
import { renderWithRouter } from "../../../../test/renderWithRouter";
import type { MessagePart } from "../../types";
import { BODY_REGIONS } from "../../utils/bodyRegions";
import { AssistantPage } from "./AssistantPage";

vi.mock("../../api/mockEngine");
const engine = vi.mocked(engineModule.mockEngine);

/** Answers the session check (GET /api/auth/me), the only request the page makes with the engine mocked. */
function signedIn(user: typeof ana | null) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      user ? Response.json(user) : Response.json({ error: { message: "No" } }, { status: 401 }),
    ),
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
  signedIn(null);
  engine.mockImplementation(async function* () {
    yield { kind: "thinking", steps: [{ label: "3 matches", done: true }] };
    yield { kind: "text", text: "Try an " };
    yield { kind: "text", text: "antihistamine." };
  });
});

afterEach(() => vi.unstubAllGlobals());

describe("AssistantPage", () => {
  it("greets with starter prompts and the disclaimer", () => {
    renderPage("/assistant");

    expect(screen.getByRole("heading", { name: "What’s bothering you?" })).toBeInTheDocument();
    for (const starter of ["Sore throat and fever", "Can't sleep", "Hay fever", "Upset stomach"]) {
      expect(screen.getByRole("button", { name: starter })).toBeInTheDocument();
    }
    expect(screen.getByText("Suggestions, not a diagnosis. Ask a pharmacist.")).toBeInTheDocument();
  });

  it("sends a starter prompt and renders the streamed reply", async () => {
    renderPage("/assistant");

    await userEvent.click(screen.getByRole("button", { name: "Hay fever" }));

    // The finished reply is announced, and shown under the question.
    expect(await screen.findByRole("status")).toHaveTextContent("Try an antihistamine.");
    const [question, reply] = within(
      screen.getByRole("list", { name: "Conversation" }),
    ).getAllByRole("listitem");
    expect(question).toHaveTextContent("Hay fever");
    expect(reply).toHaveTextContent("Try an antihistamine.");
    expect(screen.getByRole("button", { name: "3 matches 1 step" })).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "What’s bothering you?" }),
    ).not.toBeInTheDocument();
  });

  it("offers every body area as a chip", () => {
    renderPage("/assistant");

    const areas = screen.getByRole("region", { name: "Or start from where it bothers you" });
    expect(
      within(areas)
        .getAllByRole("button")
        .map((b) => b.textContent),
    ).toEqual(BODY_REGIONS.map((region) => region.label));
  });

  it("starts from a body area: the area is sent, then a picked symptom seeds the case file", async () => {
    engine
      .mockImplementationOnce(async function* () {
        yield {
          kind: "quickReplies",
          question: "What’s going on with your nose and throat?",
          field: "symptoms",
          options: [
            { label: "Sore throat", value: "Sore throat" },
            { label: "Cough", value: "Cough" },
          ],
        };
      })
      .mockImplementationOnce(async function* () {
        yield { kind: "symptoms", symptoms: ["Sore throat"] };
      });
    const user = userEvent.setup();
    renderPage("/assistant");

    await user.click(screen.getByRole("button", { name: "Nose and throat" }));

    expect(engine).toHaveBeenLastCalledWith(
      expect.objectContaining({ userText: "My nose and throat" }),
    );
    expect(screen.queryByRole("region", { name: /where it bothers you/i })).not.toBeInTheDocument();

    await user.click(await screen.findByRole("button", { name: "Sore throat" }));

    expect(engine).toHaveBeenLastCalledWith(
      expect.objectContaining({
        userText: "Sore throat",
        caseFile: expect.objectContaining({ symptoms: ["Sore throat"] }),
      }),
    );
    const panel = await screen.findByRole("complementary", { name: "Case file" });
    expect(within(panel).getByRole("list", { name: "Symptoms" })).toHaveTextContent("Sore throat");
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

    await user.click(screen.getByRole("button", { name: "Start over" }));
    await user.click(screen.getByRole("button", { name: "Yes, clear it" }));

    expect(screen.getByRole("heading", { name: "What’s bothering you?" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Describe your symptoms" })).toBeInTheDocument();
  });

  describe("case file", () => {
    const products = async function* (): AsyncGenerator<MessagePart> {
      yield { kind: "symptoms", symptoms: ["Sore throat"] };
      yield {
        kind: "products",
        items: [{ product: ibuprofenDetail, reason: "Brings fever down", fit: "best" }],
      };
    };

    it("is hidden until the conversation starts", async () => {
      renderPage("/assistant");
      expect(screen.queryByRole("complementary", { name: "Case file" })).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole("button", { name: "Hay fever" }));

      expect(await screen.findByRole("complementary", { name: "Case file" })).toBeInTheDocument();
    });

    it("re-runs the engine with the edited case file", async () => {
      engine.mockImplementation(products);
      renderPage("/assistant");
      await userEvent.click(screen.getByRole("button", { name: "Hay fever" }));
      await screen.findByRole("article", { name: "Ibuprofen 400mg" });

      await userEvent.selectOptions(
        screen.getByRole("combobox", { name: "Who it’s for" }),
        "A child",
      );

      expect(engine).toHaveBeenLastCalledWith(
        expect.objectContaining({
          userText: "Changed who it’s for to A child",
          caseFile: expect.objectContaining({ forWhom: "child", symptoms: ["Sore throat"] }),
        }),
      );
      expect(await screen.findAllByRole("article", { name: "Ibuprofen 400mg" })).toHaveLength(2);
    });

    it("drops a card the user says is not for them and does not bring it back", async () => {
      engine.mockImplementation(products);
      renderPage("/assistant");
      await userEvent.click(screen.getByRole("button", { name: "Hay fever" }));
      const card = await screen.findByRole("article", { name: "Ibuprofen 400mg" });

      await userEvent.click(within(card).getByRole("button", { name: "Not for me" }));
      await userEvent.click(within(card).getByRole("button", { name: "Too expensive" }));

      await waitFor(() => expect(screen.queryByRole("article")).not.toBeInTheDocument());
      expect(screen.getByRole("list", { name: "Avoiding" })).toHaveTextContent("Expensive options");
      expect(engine).toHaveBeenCalledTimes(1);

      // The same engine answer again: the dismissed product is left out.
      await userEvent.selectOptions(screen.getByRole("combobox", { name: "How long" }), "Longer");
      await waitFor(() => expect(engine).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(screen.getByRole("status")).toBeEmptyDOMElement());
      expect(screen.queryByRole("article")).not.toBeInTheDocument();
    });

    it("asks before clearing a conversation, then returns to the greeting", async () => {
      renderPage("/assistant");
      await userEvent.click(screen.getByRole("button", { name: "Hay fever" }));
      await screen.findByRole("status");

      await userEvent.click(screen.getByRole("button", { name: "Start over" }));
      await userEvent.click(screen.getByRole("button", { name: "Keep chatting" }));
      expect(
        screen.queryByRole("heading", { name: "What’s bothering you?" }),
      ).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole("button", { name: "Start over" }));
      await userEvent.click(screen.getByRole("button", { name: "Yes, clear it" }));

      expect(screen.getByRole("heading", { name: "What’s bothering you?" })).toBeInTheDocument();
      expect(screen.queryByRole("complementary", { name: "Case file" })).not.toBeInTheDocument();
    });

    it("is read-only after an urgent alert", async () => {
      engine.mockImplementationOnce(async function* () {
        yield { kind: "symptoms", symptoms: ["Chest pain"] };
        yield {
          kind: "alert",
          level: "urgent",
          title: "This needs a doctor now",
          body: "Call 112.",
        };
      });
      renderPage("/assistant");
      await userEvent.click(screen.getByRole("button", { name: "Hay fever" }));
      await screen.findByRole("alert", { name: /doctor now/ });

      expect(screen.getByRole("combobox", { name: "How long" })).toBeDisabled();
      expect(screen.queryByRole("button", { name: "Remove Chest pain" })).not.toBeInTheDocument();
    });
  });
  describe("saved consultations", () => {
    const products = async function* (): AsyncGenerator<MessagePart> {
      yield { kind: "symptoms", symptoms: ["Sore throat"] };
      yield {
        kind: "products",
        items: [{ product: ibuprofenDetail, reason: "Brings fever down", fit: "best" }],
      };
    };

    it("are only offered when signed in", async () => {
      engine.mockImplementation(products);
      renderPage("/assistant");
      await userEvent.click(screen.getByRole("button", { name: "Sore throat and fever" }));
      await screen.findByRole("article", { name: ibuprofenDetail.name });

      expect(screen.queryByRole("button", { name: "Save consultation" })).not.toBeInTheDocument();
    });

    it("can be saved, then reopened from the start screen after starting over", async () => {
      signedIn(ana);
      engine.mockImplementation(products);
      const user = userEvent.setup();
      renderPage("/assistant");
      await user.click(screen.getByRole("button", { name: "Sore throat and fever" }));
      await screen.findByRole("article", { name: ibuprofenDetail.name });

      await user.click(await screen.findByRole("button", { name: "Save consultation" }));
      expect(screen.getByText(/^Saved\./)).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Start over" }));
      await user.click(screen.getByRole("button", { name: "Yes, clear it" }));
      const saved = screen.getByRole("region", { name: "Your consultations" });
      expect(saved).toHaveTextContent("Sore throat → 1 suggestion");

      await user.click(within(saved).getByRole("button", { name: "Reopen Sore throat" }));

      expect(screen.getByRole("article", { name: ibuprofenDetail.name })).toBeInTheDocument();
      expect(screen.getByRole("complementary", { name: "Case file" })).toHaveTextContent(
        "Sore throat",
      );
    });
  });
});

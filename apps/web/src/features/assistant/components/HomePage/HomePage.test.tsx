import { LinkProvider } from "@meddash/design-system/components";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RouterLink } from "../../../../lib/RouterLink";
import { ana, ibuprofenDetail } from "../../../../test/fixtures";
import { AuthProvider, LoginPage } from "../../../auth";
import * as authApi from "../../../auth/api/authApi";
import * as engineModule from "../../api/streamEngine";
import { ConsultationProvider } from "../ConsultationProvider/ConsultationProvider";
import { HomePage } from "./HomePage";

vi.mock("../../api/streamEngine");
vi.mock("../../../auth/api/authApi");
const engine = vi.mocked(engineModule.streamEngine);

function Where() {
  const { pathname, search } = useLocation();
  return <p>At {pathname + search}</p>;
}

/** `/` and the real login page, under the providers the app puts above its routes. */
async function renderHome(url = "/") {
  render(
    <MemoryRouter initialEntries={[url]}>
      <LinkProvider component={RouterLink}>
        <AuthProvider>
          <ConsultationProvider>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
            </Routes>
            <Where />
          </ConsultationProvider>
        </AuthProvider>
      </LinkProvider>
    </MemoryRouter>,
  );
  // Let the session check (GET /auth/me) settle, as it does long before anyone types.
  await act(async () => {});
}

const messageBox = () => screen.getByRole("textbox", { name: "Describe your symptoms" });

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(ana);
  engine.mockImplementation(async function* () {
    yield { kind: "thinking", steps: [{ label: "3 matches", done: true }] };
    yield { kind: "text", text: "Try an " };
    yield { kind: "text", text: "antihistamine." };
  });
});

describe("HomePage", () => {
  it("asks how you are, with three starters and the pharmacist line", async () => {
    await renderHome();

    expect(screen.getByText("Hi, I’m your MedDash assistant.")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "How are you feeling today?" }),
    ).toBeVisible();
    const starters = screen.getByRole("list", { name: "Start with" });
    expect(
      within(starters)
        .getAllByRole("button")
        .map((b) => b.textContent),
    ).toEqual(["Hay fever", "Dry cough", "Can't sleep"]);
    expect(messageBox()).toBeInTheDocument();
    expect(
      screen.getByText(
        "Reviewed by pharmacists. Not a substitute for a doctor — in an emergency, call 112.",
      ),
    ).toBeInTheDocument();
  });

  it("sends a starter's message and shows the streamed reply in place of the intro", async () => {
    await renderHome();

    await userEvent.click(screen.getByRole("button", { name: "Hay fever" }));

    // The finished reply is announced, and shown under the question.
    expect(await screen.findByRole("status")).toHaveTextContent("Try an antihistamine.");
    const [question, reply] = within(
      screen.getByRole("list", { name: "Conversation" }),
    ).getAllByRole("listitem");
    expect(question).toHaveTextContent(
      "Sneezing and itchy eyes every morning since spring started.",
    );
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
    // In place: no route change.
    expect(screen.getByText("At /")).toBeInTheDocument();
  });

  it("changes the message box's hint once suggestions are shown", async () => {
    engine.mockImplementationOnce(async function* () {
      yield {
        kind: "products",
        items: [{ product: ibuprofenDetail, reason: "Eases it", fit: "best" }],
      };
    });
    await renderHome();

    await userEvent.click(screen.getByRole("button", { name: "Dry cough" }));

    expect(await screen.findByRole("article", { name: "Ibuprofen 400mg" })).toBeInTheDocument();
    expect(messageBox()).toHaveAttribute("placeholder", "Reply, or ask something else…");
  });

  it("pre-fills the message box from the link", async () => {
    await renderHome("/?ask=ibuprofen");

    expect(messageBox()).toHaveValue("ibuprofen");
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
    await renderHome();

    await user.click(messageBox());
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
    await renderHome();

    await user.type(messageBox(), "Chest pain{Enter}");

    expect(await screen.findByRole("alert", { name: /This needs a doctor now/ })).toHaveTextContent(
      "Call 112.",
    );
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByText(/Not a substitute for a doctor/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Start over" }));

    expect(screen.getByRole("heading", { name: "How are you feeling today?" })).toBeInTheDocument();
    expect(messageBox()).toBeInTheDocument();
  });

  describe("signed out", () => {
    beforeEach(() => {
      vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(null);
      vi.mocked(authApi.login).mockResolvedValue(ana);
    });

    it("shows the intro to anyone", async () => {
      await renderHome();

      expect(
        screen.getByRole("heading", { level: 1, name: "How are you feeling today?" }),
      ).toBeInTheDocument();
    });

    it("keeps the first message while the visitor logs in, then sends it once", async () => {
      const user = userEvent.setup();
      await renderHome();

      await user.type(messageBox(), "Itchy eyes{Enter}");

      // The paid model is never called for a signed-out visitor.
      expect(engine).not.toHaveBeenCalled();
      expect(screen.getByText("At /login?returnTo=%2F")).toBeInTheDocument();

      await user.type(screen.getByLabelText("Email"), ana.email);
      await user.type(screen.getByLabelText("Password"), "secret123");
      await user.click(screen.getByRole("button", { name: "Log in" }));

      expect(await screen.findByRole("status")).toHaveTextContent("Try an antihistamine.");
      expect(screen.getByText("At /")).toBeInTheDocument();
      expect(screen.getByRole("list", { name: "Conversation" })).toHaveTextContent("Itchy eyes");
      expect(engine).toHaveBeenCalledTimes(1);
      expect(engine).toHaveBeenCalledWith(expect.objectContaining({ userText: "Itchy eyes" }));
    });

    it("sends a starter to log in too", async () => {
      await renderHome();

      await userEvent.click(screen.getByRole("button", { name: "Can't sleep" }));

      expect(screen.getByText("At /login?returnTo=%2F")).toBeInTheDocument();
      expect(engine).not.toHaveBeenCalled();
    });
  });
});

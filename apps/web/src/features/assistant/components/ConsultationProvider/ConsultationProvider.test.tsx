import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ana } from "../../../../test/fixtures";
import { renderWithRouter } from "../../../../test/renderWithRouter";
import { AuthProvider, useAuth } from "../../../auth";
import * as authApi from "../../../auth/api/authApi";
import * as engineModule from "../../api/streamEngine";
import { useConsultationContext } from "../../hooks/useConsultationContext";
import type { Message } from "../../types";
import { emptyCaseFile } from "../../utils/caseFile";
import { saveConsultation } from "../../utils/consultationStorage";
import { introSeen, markIntroSeen } from "../../utils/sessionFlags";
import { ConsultationProvider } from "./ConsultationProvider";

vi.mock("../../../auth/api/authApi");
vi.mock("../../api/streamEngine", async (importOriginal) => ({
  ...(await importOriginal<typeof engineModule>()),
  streamEngine: vi.fn(),
}));
const engine = vi.mocked(engineModule.streamEngine);

const stored: Message = {
  id: "1",
  role: "user",
  parts: [{ kind: "text", text: "Headache" }],
  status: "done",
};

/** Shows how many messages the shared conversation holds, with the controls around it. */
function Probe() {
  const { messages, send, restart } = useConsultationContext();
  const { signOut } = useAuth();
  return (
    <>
      <p>{messages.length} messages</p>
      <button onClick={() => send("Cough")}>Send</button>
      <button onClick={restart}>Restart</button>
      <button onClick={() => void signOut()}>Sign out</button>
    </>
  );
}

async function renderProvider() {
  renderWithRouter(
    <AuthProvider>
      <ConsultationProvider>
        <Probe />
      </ConsultationProvider>
    </AuthProvider>,
  );
  await act(async () => {});
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(ana);
  vi.mocked(authApi.logout).mockResolvedValue();
  saveConsultation({ messages: [stored], caseFile: emptyCaseFile });
});

describe("ConsultationProvider", () => {
  it("restores the conversation of this tab", async () => {
    await renderProvider();

    expect(screen.getByText("1 messages")).toBeInTheDocument();
  });

  it("clears the conversation when the user signs out", async () => {
    await renderProvider();

    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));

    expect(await screen.findByText("0 messages")).toBeInTheDocument();
    expect(sessionStorage.getItem("meddash-consultation")).toBeNull();
  });

  it("drops a stored conversation when nobody is signed in", async () => {
    vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(null);
    await renderProvider();

    expect(screen.getByText("0 messages")).toBeInTheDocument();
  });

  it("restarts with a new conversation and the intro", async () => {
    markIntroSeen();
    await renderProvider();

    await userEvent.click(screen.getByRole("button", { name: "Restart" }));

    expect(screen.getByText("0 messages")).toBeInTheDocument();
    expect(introSeen()).toBe(false);
  });

  it("keeps a message the server refused for an ended session, to send after logging in", async () => {
    engine.mockImplementation(async function* () {
      yield* [];
      throw new engineModule.AssistantError("Your session has ended.", 401);
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    await renderProvider();

    await userEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByText("0 messages")).toBeInTheDocument();
    expect(sessionStorage.getItem("meddash-pending-message")).toBe("Cough");
  });
});

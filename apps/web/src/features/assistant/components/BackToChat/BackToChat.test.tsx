import { act, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ana } from "../../../../test/fixtures";
import { renderWithRouter } from "../../../../test/renderWithRouter";
import { AuthProvider } from "../../../auth";
import * as authApi from "../../../auth/api/authApi";
import { emptyCaseFile } from "../../utils/caseFile";
import { clearConsultation, saveConsultation } from "../../utils/consultationStorage";
import { ConsultationProvider } from "../ConsultationProvider/ConsultationProvider";
import { BackToChat } from "./BackToChat";

vi.mock("../../../auth/api/authApi");

async function renderBar() {
  renderWithRouter(
    <AuthProvider>
      <ConsultationProvider>
        <BackToChat />
      </ConsultationProvider>
    </AuthProvider>,
    "/shop?category=pain-relief",
  );
  await act(async () => {});
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(ana);
});

afterEach(() => clearConsultation());

describe("BackToChat", () => {
  it("links back to the chat while a consultation is live", async () => {
    saveConsultation({
      messages: [
        { id: "1", role: "user", parts: [{ kind: "text", text: "Headache" }], status: "done" },
      ],
      caseFile: emptyCaseFile,
    });
    await renderBar();

    expect(screen.getByRole("link", { name: "Back to your chat" })).toHaveAttribute("href", "/");
  });

  it("shows nothing when there is no conversation", async () => {
    await renderBar();

    expect(screen.queryByRole("link", { name: "Back to your chat" })).not.toBeInTheDocument();
  });
});

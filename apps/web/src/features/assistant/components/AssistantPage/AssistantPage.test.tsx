import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ana } from "../../../../test/fixtures";
import { renderWithRouter } from "../../../../test/renderWithRouter";
import { AuthProvider } from "../../../auth";
import * as authApi from "../../../auth/api/authApi";
import type { Message } from "../../types";
import { emptyCaseFile } from "../../utils/caseFile";
import { saveConsultation } from "../../utils/consultationStorage";
import { ConsultationProvider } from "../ConsultationProvider/ConsultationProvider";
import { AssistantPage } from "./AssistantPage";

vi.mock("../../../auth/api/authApi");

const text = (id: string, role: Message["role"], value: string): Message => ({
  id,
  role,
  parts: [{ kind: "text", text: value }],
  status: "done",
});

/** Renders the chat on a conversation already under way (as the provider restores it). */
async function renderChat(messages: Message[]) {
  saveConsultation({ messages, caseFile: emptyCaseFile });
  renderWithRouter(
    <AuthProvider>
      <ConsultationProvider>
        <AssistantPage composer={<p>The message box</p>} footnote={<p>The footnote</p>} />
      </ConsultationProvider>
    </AuthProvider>,
  );
  await act(async () => {});
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(ana);
});

describe("AssistantPage", () => {
  it("shows the conversation from the provider, with the message box docked under it", async () => {
    await renderChat([text("1", "user", "Headache"), text("2", "assistant", "Drink water.")]);

    expect(
      screen.getByRole("heading", { level: 1, name: "Symptom assistant" }),
    ).toBeInTheDocument();
    const items = within(screen.getByRole("list", { name: "Conversation" })).getAllByRole(
      "listitem",
    );
    expect(items.map((item) => item.textContent)).toEqual(
      expect.arrayContaining([expect.stringContaining("Headache")]),
    );
    expect(screen.getByText("The message box")).toBeInTheDocument();
    expect(screen.getByText("The footnote")).toBeInTheDocument();
  });

  it("replaces the message box with Start over after an urgent alert", async () => {
    await renderChat([
      text("1", "user", "Chest pain"),
      {
        id: "2",
        role: "assistant",
        status: "done",
        parts: [{ kind: "alert", level: "urgent", title: "This needs a doctor now", body: "112" }],
      },
    ]);

    expect(screen.queryByText("The message box")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Start over" }));

    // The conversation is cleared; the home page shows the intro in its place.
    expect(
      within(screen.getByRole("list", { name: "Conversation" })).queryAllByRole("listitem"),
    ).toHaveLength(0);
    expect(screen.getByText("The message box")).toBeInTheDocument();
  });
});

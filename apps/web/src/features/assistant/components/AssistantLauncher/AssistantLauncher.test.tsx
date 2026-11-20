import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithRouter } from "../../../../test/renderWithRouter";
import { AssistantLauncher, GREETING_MS } from "./AssistantLauncher";

describe("AssistantLauncher", () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  function launcher() {
    return screen.getByRole("link", { name: "Ask MedDash assistant" });
  }

  it("opens the assistant", () => {
    renderWithRouter(<AssistantLauncher />);

    expect(launcher()).toHaveAttribute("href", "/assistant");
  });

  it("greets in full, then keeps a short label", () => {
    renderWithRouter(<AssistantLauncher />);
    expect(screen.getByText("Hi! Not feeling great?")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(GREETING_MS));

    expect(screen.queryByText("Hi! Not feeling great?")).not.toBeInTheDocument();
    expect(screen.getByText("Ask MedDash")).toBeInTheDocument();
  });

  it("greets again on hover", async () => {
    const user = userEvent.setup();
    renderWithRouter(<AssistantLauncher />);
    act(() => vi.advanceTimersByTime(GREETING_MS));

    await user.hover(launcher());
    expect(screen.getByText("Hi! Not feeling great?")).toBeInTheDocument();

    await user.unhover(launcher());
    expect(screen.getByText("Ask MedDash")).toBeInTheDocument();
  });

  it("greets again on keyboard focus", async () => {
    const user = userEvent.setup();
    renderWithRouter(<AssistantLauncher />);
    act(() => vi.advanceTimersByTime(GREETING_MS));

    await user.tab();

    expect(launcher()).toHaveFocus();
    expect(screen.getByText("Hi! Not feeling great?")).toBeInTheDocument();
  });
});

import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { endAnimation } from "../../../../test/endAnimation";
import { forgetIntroSeen } from "../../utils/sessionFlags";
import { Intro } from "./Intro";

const renderIntro = (onStarter = vi.fn()) =>
  render(<Intro composer={<input aria-label="Message" />} onStarter={onStarter} footnote={null} />);

const intro = () => screen.getByRole("region", { name: "How are you feeling today?" });

function preferReducedMotion() {
  const matchMedia = window.matchMedia;
  window.matchMedia = (query) => ({
    ...matchMedia(query),
    matches: query === "(prefers-reduced-motion: reduce)",
  });
}

describe("Intro", () => {
  it("plays on the first visit of the tab, and is done when the starters have arrived", () => {
    renderIntro();

    expect(intro()).toHaveAttribute("aria-busy", "true");
    // The headline is real text, and the box can be used while the intro plays.
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "How are you feeling today?",
    );
    expect(screen.getByRole("textbox", { name: "Message" })).toBeEnabled();

    act(() => endAnimation(screen.getByRole("list", { name: "Start with" })));

    expect(intro()).toHaveAttribute("aria-busy", "false");
  });

  it("plays only once per tab", () => {
    const { unmount } = renderIntro();
    unmount();

    renderIntro();

    expect(intro()).toHaveAttribute("aria-busy", "false");
  });

  it("plays again once the logo has forgotten it", () => {
    renderIntro().unmount();
    forgetIntroSeen();

    renderIntro();

    expect(intro()).toHaveAttribute("aria-busy", "true");
  });

  it("does not animate under reduced motion: everything is there at once", () => {
    preferReducedMotion();
    renderIntro();

    expect(intro()).toHaveAttribute("aria-busy", "false");
    expect(screen.getByText("Hi, I’m your MedDash assistant.")).toBeVisible();
    expect(screen.getByRole("heading", { name: "How are you feeling today?" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Hay fever" })).toBeVisible();
  });

  it("sends a starter's message", async () => {
    const onStarter = vi.fn();
    renderIntro(onStarter);

    await userEvent.click(screen.getByRole("button", { name: "Dry cough" }));

    expect(onStarter).toHaveBeenCalledWith(
      "Dry, tickly cough for three days. It keeps me up at night.",
    );
  });
});

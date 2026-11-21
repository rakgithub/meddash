import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Composer } from "./Composer";

function setup(props: Partial<Parameters<typeof Composer>[0]> = {}) {
  const onSend = vi.fn();
  const onStop = vi.fn();
  render(<Composer isStreaming={false} onSend={onSend} onStop={onStop} {...props} />);
  return { onSend, onStop, box: screen.getByRole("textbox", { name: "Describe your symptoms" }) };
}

describe("Composer", () => {
  it("sends on Enter and clears the box", async () => {
    const { onSend, box } = setup();

    await userEvent.type(box, "Headache{Enter}");

    expect(onSend).toHaveBeenCalledWith("Headache");
    expect(box).toHaveValue("");
  });

  it("adds a new line on Shift+Enter instead of sending", async () => {
    const { onSend, box } = setup();

    await userEvent.type(box, "Headache{Shift>}{Enter}{/Shift}since Monday");

    expect(onSend).not.toHaveBeenCalled();
    expect(box).toHaveValue("Headache\nsince Monday");
  });

  it("sends with the Send button", async () => {
    const { onSend, box } = setup();

    await userEvent.type(box, "Cough");
    await userEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(onSend).toHaveBeenCalledWith("Cough");
  });

  it("doesn't send blank text", async () => {
    const { onSend, box } = setup();

    await userEvent.type(box, "   {Enter}");

    expect(onSend).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  });

  it("starts with the pre-filled text", () => {
    const { box } = setup({ initialValue: "ibuprofen" });

    expect(box).toHaveValue("ibuprofen");
  });

  it("cuts a pre-filled text to the length the API accepts", () => {
    const { box } = setup({ initialValue: "a".repeat(1200) });

    expect(box).toHaveValue("a".repeat(1000));
  });

  it("offers Stop instead of Send while a reply streams, and keeps the typed text", async () => {
    const { onSend, onStop, box } = setup({ isStreaming: true });

    await userEvent.type(box, "And a cough{Enter}");
    expect(onSend).not.toHaveBeenCalled();
    expect(box).toHaveValue("And a cough");
    expect(screen.queryByRole("button", { name: "Send" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Stop" }));
    expect(onStop).toHaveBeenCalledOnce();
  });

  it("shows the hint it is given, e.g. for the stage of the consultation", () => {
    const { box } = setup({ placeholder: "Ask about these suggestions…" });
    expect(box).toHaveAttribute("placeholder", "Ask about these suggestions…");
  });
});

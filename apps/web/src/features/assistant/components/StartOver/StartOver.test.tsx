import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { StartOver } from "./StartOver";

describe("StartOver", () => {
  it("starts over at once when there is nothing to lose", async () => {
    const onStartOver = vi.fn();
    render(<StartOver confirm={false} onStartOver={onStartOver} />);

    await userEvent.click(screen.getByRole("button", { name: "Start over" }));

    expect(onStartOver).toHaveBeenCalledOnce();
  });

  it("asks first when the conversation is worth keeping", async () => {
    const onStartOver = vi.fn();
    render(<StartOver confirm onStartOver={onStartOver} />);

    await userEvent.click(screen.getByRole("button", { name: "Start over" }));

    expect(onStartOver).not.toHaveBeenCalled();
    expect(screen.getByRole("group", { name: "Start over?" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Yes, clear it" }));
    expect(onStartOver).toHaveBeenCalledOnce();
  });

  it("keeps the conversation and returns focus when the user changes their mind", async () => {
    const onStartOver = vi.fn();
    render(<StartOver confirm onStartOver={onStartOver} />);
    await userEvent.click(screen.getByRole("button", { name: "Start over" }));

    // Focus moves to the safe choice, so Enter alone can't clear anything.
    expect(screen.getByRole("button", { name: "Keep chatting" })).toHaveFocus();
    await userEvent.keyboard("{Enter}");

    expect(onStartOver).not.toHaveBeenCalled();
    expect(await screen.findByRole("button", { name: "Start over" })).toHaveFocus();
  });
});

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { IconButton } from "./IconButton";

const icon = (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path d="M3.5 8h9" />
  </svg>
);

describe("IconButton", () => {
  it("is named by its label", async () => {
    const onClick = vi.fn();
    render(<IconButton label="Decrease quantity" icon={icon} onClick={onClick} />);

    await userEvent.click(screen.getByRole("button", { name: "Decrease quantity" }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("does not run onClick when disabled", async () => {
    const onClick = vi.fn();
    render(<IconButton label="Send" icon={icon} disabled onClick={onClick} />);

    await userEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(onClick).not.toHaveBeenCalled();
  });

  it("can be a submit button", () => {
    render(<IconButton label="Send" icon={icon} type="submit" />);
    expect(screen.getByRole("button", { name: "Send" })).toHaveAttribute("type", "submit");
  });
});

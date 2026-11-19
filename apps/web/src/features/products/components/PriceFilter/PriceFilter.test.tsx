import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PriceFilter } from "./PriceFilter";

function setup(min = "", max = "") {
  const onApply = vi.fn();
  render(
    <>
      <PriceFilter min={min} max={max} onApply={onApply} />
      <button type="button">Outside</button>
    </>,
  );
  return {
    onApply,
    user: userEvent.setup(),
    pill: screen.getByRole("button", { name: /Price|€/ }),
  };
}

describe("PriceFilter", () => {
  it("opens a min/max form from a collapsed pill", async () => {
    const { pill, user } = setup();
    expect(pill).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("form", { name: "Price range" })).not.toBeInTheDocument();

    await user.click(pill);

    expect(pill).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("form", { name: "Price range" })).toBeVisible();
  });

  it("applies the range, closes, and returns focus to the pill", async () => {
    const { onApply, pill, user } = setup();
    await user.click(pill);

    await user.type(screen.getByLabelText("Minimum price"), "5");
    await user.type(screen.getByLabelText("Maximum price"), "10");
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(onApply).toHaveBeenCalledWith("5", "10");
    expect(pill).toHaveAttribute("aria-expanded", "false");
    expect(pill).toHaveFocus();
  });

  it("shows the applied range on the pill", () => {
    const { pill } = setup("", "10");
    expect(pill).toHaveTextContent(/Up to 10,00/);
  });

  it("blocks a minimum above the maximum", async () => {
    const { onApply, pill, user } = setup();
    await user.click(pill);

    await user.type(screen.getByLabelText("Minimum price"), "20");
    await user.type(screen.getByLabelText("Maximum price"), "5");
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/minimum price/i);
    expect(screen.getByLabelText("Minimum price")).toHaveAttribute("aria-invalid", "true");
    expect(onApply).not.toHaveBeenCalled();
  });

  it("blocks negative prices", async () => {
    const { onApply, pill, user } = setup();
    await user.click(pill);

    await user.type(screen.getByLabelText("Maximum price"), "-1");
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Enter a price of 0 or more.");
    expect(onApply).not.toHaveBeenCalled();
  });

  it("closes on Escape and drops unapplied edits", async () => {
    const { onApply, pill, user } = setup("5", "");
    await user.click(pill);
    await user.clear(screen.getByLabelText("Minimum price"));
    await user.type(screen.getByLabelText("Minimum price"), "8");

    await user.keyboard("{Escape}");
    expect(pill).toHaveAttribute("aria-expanded", "false");
    expect(pill).toHaveFocus();

    await user.click(pill);
    expect(screen.getByLabelText("Minimum price")).toHaveValue(5);
    expect(onApply).not.toHaveBeenCalled();
  });

  it("closes when clicking outside", async () => {
    const { pill, user } = setup();
    await user.click(pill);

    await user.click(screen.getByRole("button", { name: "Outside" }));

    expect(pill).toHaveAttribute("aria-expanded", "false");
  });

  it("toggles closed when the pill is clicked again", async () => {
    const { pill, user } = setup();
    await user.click(pill);
    await user.click(pill);
    expect(pill).toHaveAttribute("aria-expanded", "false");
  });
});

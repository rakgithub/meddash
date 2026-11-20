import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PriceFilter } from "./PriceFilter";

function setup(min = "", max = "") {
  const onApply = vi.fn();
  const view = render(<PriceFilter min={min} max={max} onApply={onApply} />);
  return { onApply, user: userEvent.setup(), view };
}

describe("PriceFilter", () => {
  it("applies a price band in one tap", async () => {
    const { onApply, user } = setup();

    await user.click(screen.getByRole("button", { name: "5–10 €" }));

    expect(onApply).toHaveBeenCalledWith("5", "10");
  });

  it("marks the applied band, and removes it when tapped again", async () => {
    const { onApply, user } = setup("", "5");
    const band = screen.getByRole("button", { name: "Up to 5 €" });
    expect(band).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "10 € and up" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    await user.click(band);

    expect(onApply).toHaveBeenCalledWith("", "");
  });

  it("applies a custom range", async () => {
    const { onApply, user } = setup();

    await user.type(screen.getByLabelText("Minimum price"), "5");
    await user.type(screen.getByLabelText("Maximum price"), "10");
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(onApply).toHaveBeenCalledWith("5", "10");
  });

  it("shows the applied range in the fields, and follows it when it changes", () => {
    const { view } = setup("3", "");
    expect(screen.getByLabelText("Minimum price")).toHaveValue(3);

    view.rerender(<PriceFilter min="" max="" onApply={vi.fn()} />);

    expect(screen.getByLabelText("Minimum price")).toHaveValue(null);
  });

  it("blocks a minimum above the maximum", async () => {
    const { onApply, user } = setup();

    await user.type(screen.getByLabelText("Minimum price"), "20");
    await user.type(screen.getByLabelText("Maximum price"), "5");
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/minimum price/i);
    expect(screen.getByLabelText("Minimum price")).toHaveAttribute("aria-invalid", "true");
    expect(onApply).not.toHaveBeenCalled();
  });

  it("blocks negative prices", async () => {
    const { onApply, user } = setup();

    await user.type(screen.getByLabelText("Maximum price"), "-1");
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Enter a price of 0 or more.");
    expect(onApply).not.toHaveBeenCalled();
  });
});

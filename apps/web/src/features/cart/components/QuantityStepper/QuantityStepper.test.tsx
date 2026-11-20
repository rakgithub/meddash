import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { QuantityStepper } from "./QuantityStepper";

const setup = (props: Partial<Parameters<typeof QuantityStepper>[0]> = {}) => {
  const onChange = vi.fn();
  render(<QuantityStepper value={2} max={5} onChange={onChange} {...props} />);
  return { onChange, input: screen.getByRole("spinbutton", { name: "Quantity" }) };
};

describe("QuantityStepper", () => {
  it("shows the value in a labelled group", () => {
    const { input } = setup();
    expect(screen.getByRole("group", { name: "Quantity" })).toBeVisible();
    expect(input).toHaveValue(2);
  });

  it("steps down and up", async () => {
    const { onChange } = setup();
    await userEvent.click(screen.getByRole("button", { name: "Decrease quantity" }));
    await userEvent.click(screen.getByRole("button", { name: "Increase quantity" }));
    expect(onChange.mock.calls).toEqual([[1], [3]]);
  });

  it("disables − at 1 and + at max", () => {
    render(<QuantityStepper value={1} max={1} onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Decrease quantity" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Increase quantity" })).toBeDisabled();
  });

  it("applies a typed value on Enter", async () => {
    const { onChange, input } = setup();
    await userEvent.clear(input);
    await userEvent.type(input, "4{Enter}");
    expect(onChange.mock.calls).toEqual([[4]]);
  });

  it("clamps a typed value to 1…max on blur", async () => {
    const { onChange, input } = setup();
    await userEvent.clear(input);
    await userEvent.type(input, "99");
    await userEvent.tab();
    expect(onChange.mock.calls).toEqual([[5]]);

    await userEvent.clear(input);
    await userEvent.type(input, "0");
    await userEvent.tab();
    expect(onChange).toHaveBeenLastCalledWith(1);
  });

  it("ignores an empty, unchanged or cancelled entry", async () => {
    const { onChange, input } = setup();
    await userEvent.clear(input);
    await userEvent.tab();
    expect(input).toHaveValue(2);

    await userEvent.type(input, "{Enter}");
    await userEvent.clear(input);
    await userEvent.type(input, "4{Escape}");
    expect(input).toHaveValue(2);
    await userEvent.tab();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("disables everything when disabled", () => {
    const { input } = setup({ disabled: true, label: "Quantity" });
    expect(input).toBeDisabled();
    expect(screen.getByRole("button", { name: "Decrease quantity" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Increase quantity" })).toBeDisabled();
  });
});

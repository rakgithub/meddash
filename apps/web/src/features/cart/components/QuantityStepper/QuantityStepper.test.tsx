import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { QuantityStepper } from "./QuantityStepper";

function Harness({ initial = 1, max = 10, onChange = vi.fn() }) {
  const [value, setValue] = useState(initial);
  return (
    <QuantityStepper
      value={value}
      max={max}
      onChange={(q) => {
        setValue(q);
        onChange(q);
      }}
    />
  );
}

const input = () => screen.getByRole("spinbutton", { name: "Quantity" });

describe("QuantityStepper", () => {
  it("steps up and down", async () => {
    const user = userEvent.setup();
    render(<Harness initial={2} />);

    await user.click(screen.getByRole("button", { name: "Increase quantity" }));
    expect(input()).toHaveValue(3);
    await user.click(screen.getByRole("button", { name: "Decrease quantity" }));
    await user.click(screen.getByRole("button", { name: "Decrease quantity" }));
    expect(input()).toHaveValue(1);
  });

  it("cannot go below 1", () => {
    render(<Harness initial={1} />);
    expect(screen.getByRole("button", { name: "Decrease quantity" })).toBeDisabled();
  });

  it("cannot go above max", async () => {
    const user = userEvent.setup();
    render(<Harness initial={2} max={3} />);

    await user.click(screen.getByRole("button", { name: "Increase quantity" }));
    expect(input()).toHaveValue(3);
    expect(screen.getByRole("button", { name: "Increase quantity" })).toBeDisabled();
  });

  it("takes a typed quantity within the limits", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness max={5} onChange={onChange} />);

    await user.clear(input());
    await user.type(input(), "4");

    expect(onChange).toHaveBeenLastCalledWith(4);
  });

  it("ignores a typed quantity out of range and snaps back on blur", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness initial={2} max={5} onChange={onChange} />);

    await user.clear(input());
    await user.type(input(), "9");
    expect(onChange).not.toHaveBeenCalled();

    await user.tab();
    expect(input()).toHaveValue(2);
  });

  it("disables everything when disabled", () => {
    render(<QuantityStepper value={2} max={5} onChange={vi.fn()} disabled />);

    expect(input()).toBeDisabled();
    expect(screen.getByRole("button", { name: "Increase quantity" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Decrease quantity" })).toBeDisabled();
  });
});

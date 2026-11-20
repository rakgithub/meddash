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

  it("takes a typed quantity on Enter, not per keystroke", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness max={10} onChange={onChange} />);

    await user.clear(input());
    await user.type(input(), "10");
    expect(onChange).not.toHaveBeenCalled();

    await user.keyboard("{Enter}");
    expect(onChange.mock.calls).toEqual([[10]]);
    expect(input()).toHaveValue(10);
  });

  it("takes a typed quantity on blur", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness max={5} onChange={onChange} />);

    await user.clear(input());
    await user.type(input(), "4");
    await user.tab();

    expect(onChange.mock.calls).toEqual([[4]]);
  });

  it("drops a typed quantity on Escape and ignores an unchanged one", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness initial={2} max={5} onChange={onChange} />);

    await user.clear(input());
    await user.type(input(), "4{Escape}");
    expect(input()).toHaveValue(2);
    await user.clear(input());
    await user.type(input(), "2{Enter}");

    expect(onChange).not.toHaveBeenCalled();
  });

  it("can be named for its product", () => {
    render(<QuantityStepper value={2} max={5} onChange={vi.fn()} label="Quantity of Ibuprofen" />);
    expect(screen.getByRole("spinbutton", { name: "Quantity of Ibuprofen" })).toHaveValue(2);
  });

  it("ignores a typed quantity out of range and snaps back on blur", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness initial={2} max={5} onChange={onChange} />);

    await user.clear(input());
    await user.type(input(), "9");
    await user.tab();

    expect(onChange).not.toHaveBeenCalled();
    expect(input()).toHaveValue(2);
  });

  it("disables everything when disabled", () => {
    render(<QuantityStepper value={2} max={5} onChange={vi.fn()} disabled />);

    expect(input()).toBeDisabled();
    expect(screen.getByRole("button", { name: "Increase quantity" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Decrease quantity" })).toBeDisabled();
  });
});

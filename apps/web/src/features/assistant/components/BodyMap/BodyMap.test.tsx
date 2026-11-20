import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BODY_REGIONS } from "../../utils/bodyRegions";
import { BodyMap } from "./BodyMap";

describe("BodyMap", () => {
  it("offers every region as a labelled button", () => {
    render(<BodyMap onSelect={vi.fn()} />);

    const regions = screen.getAllByRole("button");
    expect(regions.map((button) => button.textContent)).toEqual(BODY_REGIONS.map((r) => r.label));
  });

  it("hides the decorative outline from assistive technology", () => {
    const { container } = render(<BodyMap onSelect={vi.fn()} />);

    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("reports the chosen region", async () => {
    const onSelect = vi.fn();
    render(<BodyMap onSelect={onSelect} />);

    await userEvent.click(screen.getByRole("button", { name: "Nose and throat" }));

    expect(onSelect).toHaveBeenCalledWith(BODY_REGIONS.find((r) => r.id === "throat"));
  });

  it("can be used by keyboard", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<BodyMap onSelect={onSelect} />);

    await user.tab();
    expect(screen.getByRole("button", { name: "Head" })).toHaveFocus();
    await user.keyboard("{Enter}");

    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});

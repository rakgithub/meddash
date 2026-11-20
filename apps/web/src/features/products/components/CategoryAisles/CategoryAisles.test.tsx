import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CategoryAisles } from "./CategoryAisles";

describe("CategoryAisles", () => {
  it("shows every category with what it is for, and marks the picked one", () => {
    render(<CategoryAisles value="pain-relief" onChange={vi.fn()} />);

    const tiles = screen.getAllByRole("button");
    expect(tiles.map((t) => t.textContent)).toEqual([
      "All productsBrowse the whole range",
      "Cold and fluCough, sore throat, blocked nose",
      "Pain reliefHeadache, fever, back pain",
      "Skin careDry skin, sun, eczema",
      "VitaminsImmunity, energy, minerals",
    ]);
    expect(screen.getByRole("button", { name: /^Pain relief/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: /^All products/ })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("marks All products when no category is set", () => {
    render(<CategoryAisles value="" onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: /^All products/, pressed: true })).toBeVisible();
  });

  it("picks a category, or all products", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<CategoryAisles value="vitamins" onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: /^Skin care/ }));
    await user.click(screen.getByRole("button", { name: /^All products/ }));

    expect(onChange.mock.calls).toEqual([["skin-care"], [""]]);
  });
});

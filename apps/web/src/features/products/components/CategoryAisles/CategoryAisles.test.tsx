import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CategoryAisles } from "./CategoryAisles";

describe("CategoryAisles", () => {
  it("shows every category and marks the picked one", () => {
    render(<CategoryAisles value="pain-relief" onChange={vi.fn()} />);

    const tiles = screen.getAllByRole("button");
    expect(tiles.map((t) => t.textContent)).toEqual([
      "All products",
      "Cold and flu",
      "Pain relief",
      "Skin care",
      "Vitamins",
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

  it("shows how many products each aisle holds, and the total on All products", () => {
    render(
      <CategoryAisles
        value=""
        onChange={vi.fn()}
        counts={[
          { value: "vitamins", count: 4 },
          { value: "skin-care", count: 2 },
        ]}
      />,
    );

    expect(screen.getByRole("button", { name: /^Vitamins/ })).toHaveAccessibleDescription("4");
    expect(screen.getByRole("button", { name: /^Skin care/ })).toHaveAccessibleDescription("2");
    expect(screen.getByRole("button", { name: /^All products/ })).toHaveAccessibleDescription("6");
  });

  it("shows 0 for an aisle the counts leave out", () => {
    render(
      <CategoryAisles value="" onChange={vi.fn()} counts={[{ value: "vitamins", count: 4 }]} />,
    );

    expect(screen.getByRole("button", { name: /^Pain relief/ })).toHaveAccessibleDescription("0");
  });

  it("shows no counts until they are known", () => {
    render(<CategoryAisles value="" onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: /^Vitamins/ })).not.toHaveAccessibleDescription();
  });
});

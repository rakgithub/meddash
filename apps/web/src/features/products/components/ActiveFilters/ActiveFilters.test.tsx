import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ActiveFilters } from "./ActiveFilters";
import { EMPTY_FILTERS, type ProductFilters } from "../../types";

const all: ProductFilters = {
  q: "gel",
  category: "pain-relief",
  brand: "Nurofen",
  minPrice: "1",
  maxPrice: "9",
};

function setup(filters: ProductFilters) {
  const onChange = vi.fn();
  render(<ActiveFilters filters={filters} onChange={onChange} />);
  return { onChange, user: userEvent.setup() };
}

describe("ActiveFilters", () => {
  it("shows nothing when nothing is filtered, even with a search term", () => {
    setup({ ...EMPTY_FILTERS, q: "ibuprofen" });

    expect(screen.queryByRole("list", { name: "Applied filters" })).not.toBeInTheDocument();
  });

  it("shows a chip for each applied filter", () => {
    setup(all);

    expect(screen.getByRole("button", { name: "Remove Pain relief" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Remove Nurofen" })).toBeVisible();
    expect(screen.getByRole("button", { name: /^Remove 1,00\s€ – 9,00\s€$/ })).toBeVisible();
  });

  it.each([
    ["Remove Pain relief", { category: "" }],
    ["Remove Nurofen", { brand: "" }],
    [/^Remove 1,00/, { minPrice: "", maxPrice: "" }],
  ])("removes only that filter with %s", async (name, cleared) => {
    const { onChange, user } = setup(all);

    await user.click(screen.getByRole("button", { name }));

    expect(onChange).toHaveBeenCalledWith({ ...all, ...cleared });
  });

  it("clears every filter but keeps the search term", async () => {
    const { onChange, user } = setup(all);

    await user.click(screen.getByRole("button", { name: "Clear filters" }));

    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_FILTERS, q: "gel" });
  });
});

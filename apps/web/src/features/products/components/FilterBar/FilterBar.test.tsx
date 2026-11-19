import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FilterBar } from "./FilterBar";
import { EMPTY_FILTERS, type ProductFilters } from "../../types";

function setup(filters: ProductFilters = EMPTY_FILTERS) {
  const onChange = vi.fn();
  render(<FilterBar filters={filters} onChange={onChange} />);
  return { onChange, user: userEvent.setup() };
}

describe("FilterBar", () => {
  it("applies a category straight away, keeping the other filters", async () => {
    const { onChange, user } = setup({ ...EMPTY_FILTERS, q: "cream", brand: "Eucerin" });

    await user.selectOptions(screen.getByRole("combobox", { name: "Category" }), "skin-care");

    expect(onChange).toHaveBeenCalledWith({
      ...EMPTY_FILTERS,
      q: "cream",
      brand: "Eucerin",
      category: "skin-care",
    });
  });

  it("applies a brand straight away", async () => {
    const { onChange, user } = setup();

    await user.selectOptions(screen.getByRole("combobox", { name: "Brand" }), "Nurofen");

    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_FILTERS, brand: "Nurofen" });
  });

  it("applies a price range", async () => {
    const { onChange, user } = setup();

    await user.click(screen.getByRole("button", { name: "Price" }));
    await user.type(screen.getByLabelText("Maximum price"), "7");
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_FILTERS, maxPrice: "7" });
  });

  it("shows the applied values", () => {
    setup({ ...EMPTY_FILTERS, category: "vitamins", brand: "Abtei" });

    expect(screen.getByRole("combobox", { name: "Category" })).toHaveDisplayValue("Vitamins");
    expect(screen.getByRole("combobox", { name: "Brand" })).toHaveDisplayValue("Abtei");
  });

  it("hides Clear filters when nothing is filtered, even with a search term", () => {
    setup({ ...EMPTY_FILTERS, q: "ibuprofen" });
    expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument();
  });

  it("clears every filter but keeps the search term", async () => {
    const { onChange, user } = setup({
      q: "gel",
      category: "pain-relief",
      brand: "Nurofen",
      minPrice: "1",
      maxPrice: "9",
    });

    await user.click(screen.getByRole("button", { name: "Clear filters" }));

    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_FILTERS, q: "gel" });
  });
});

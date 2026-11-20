import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RefinePanel } from "./RefinePanel";
import { EMPTY_FILTERS, type Facets, type ProductFilters } from "../../types";

function setup(
  filters: ProductFilters = EMPTY_FILTERS,
  sheet = { sheet: false, open: false },
  facets?: Facets,
) {
  const onChange = vi.fn();
  const onClose = vi.fn();
  const panel = (open: boolean) => (
    <RefinePanel
      id="refine"
      filters={filters}
      onChange={onChange}
      sheet={sheet.sheet}
      facets={facets}
      open={open}
      onClose={onClose}
    />
  );
  const view = render(panel(sheet.open));
  return {
    onChange,
    onClose,
    user: userEvent.setup(),
    setOpen: (open: boolean) => view.rerender(panel(open)),
  };
}

describe("RefinePanel", () => {
  it("is a column beside the results on wide screens", () => {
    setup();

    expect(screen.getByRole("complementary", { name: "Refine" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Show results" })).not.toBeInTheDocument();
  });

  it("applies a brand straight away, keeping the other filters", async () => {
    const { onChange, user } = setup({ ...EMPTY_FILTERS, q: "gel", category: "pain-relief" });

    await user.click(screen.getByRole("radio", { name: "Nurofen" }));

    expect(onChange).toHaveBeenCalledWith({
      ...EMPTY_FILTERS,
      q: "gel",
      category: "pain-relief",
      brand: "Nurofen",
    });
  });

  it("shows the applied brand, or Any brand", () => {
    setup({ ...EMPTY_FILTERS, brand: "Abtei" });

    expect(screen.getByRole("radio", { name: "Abtei" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Any brand" })).not.toBeChecked();
  });

  it("applies a price band, keeping the other filters", async () => {
    const { onChange, user } = setup({ ...EMPTY_FILTERS, brand: "Abtei" });

    await user.click(screen.getByRole("button", { name: "Up to 5 €" }));

    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_FILTERS, brand: "Abtei", maxPrice: "5" });
  });

  describe("with facets", () => {
    const facets: Facets = {
      categories: [],
      brands: [{ value: "Nurofen", count: 2 }],
      price: { min: 3, max: 11, buckets: [{ from: 3, to: 11, count: 5 }] },
    };

    it("shows how many products each brand has, 0 for a brand with none", () => {
      setup(EMPTY_FILTERS, { sheet: false, open: false }, facets);

      expect(screen.getByRole("radio", { name: "Nurofen" })).toHaveAccessibleDescription("2");
      expect(screen.getByRole("radio", { name: "Abtei" })).toHaveAccessibleDescription("0");
      expect(screen.getByRole("radio", { name: "Any brand" })).not.toHaveAccessibleDescription();
    });

    it("shows the price spread", () => {
      setup(EMPTY_FILTERS, { sheet: false, open: false }, facets);

      expect(screen.getByText(/3,00\s€ – 11,00\s€/)).toBeInTheDocument();
    });
  });

  describe("as a sheet on narrow screens", () => {
    it("opens as a modal dialog only while open", () => {
      const { setOpen } = setup(EMPTY_FILTERS, { sheet: true, open: false });
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      setOpen(true);

      expect(screen.getByRole("dialog", { name: "Refine" })).toBeVisible();
    });

    it("closes from Show results", async () => {
      const { onClose, user } = setup(EMPTY_FILTERS, { sheet: true, open: true });

      await user.click(screen.getByRole("button", { name: "Show results" }));

      expect(onClose).toHaveBeenCalled();
    });

    it("reports a close however it happens, e.g. Escape", () => {
      const { onClose, setOpen } = setup(EMPTY_FILTERS, { sheet: true, open: true });

      // Closing the open dialog fires "close", as Escape does in a browser.
      setOpen(false);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});

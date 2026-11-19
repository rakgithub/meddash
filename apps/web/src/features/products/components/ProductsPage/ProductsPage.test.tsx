import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProductsPage } from "./ProductsPage";
import * as api from "../../api/searchProducts";
import { EMPTY_FILTERS } from "../../types";
import { ibuprofen, vitaminD } from "../../../../test/fixtures";

vi.mock("../../api/searchProducts");
vi.mock("../../api/fetchSuggestions");
const searchProducts = vi.mocked(api.searchProducts);

beforeEach(() => vi.resetAllMocks());

describe("ProductsPage header", () => {
  it("shows the visible result range once loaded", async () => {
    searchProducts.mockResolvedValue({
      items: [ibuprofen, vitaminD],
      pagination: { page: 1, pageSize: 10, total: 12, totalPages: 2 },
    });

    render(<ProductsPage />);

    expect(await screen.findByText("Showing 1–10 of 12 results")).toBeInTheDocument();
  });

  it("shows no range text while loading", () => {
    searchProducts.mockReturnValue(new Promise(() => {}));

    render(<ProductsPage />);

    expect(screen.queryByText(/Showing/)).not.toBeInTheDocument();
  });

  it("renders no empty paragraph in the header when there are no results", async () => {
    searchProducts.mockResolvedValue({
      items: [],
      pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
    });

    render(<ProductsPage />);

    await screen.findByRole("heading", { name: "Products", level: 1 });
    const header = screen.getByRole("banner");
    expect(header.querySelector("p")).toBeNull();
  });
});

describe("ProductsPage search and filters", () => {
  const loaded = {
    items: [ibuprofen],
    pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
  };

  it("keeps the search term when a filter changes", async () => {
    searchProducts.mockResolvedValue(loaded);
    const user = userEvent.setup();
    render(<ProductsPage />);

    await user.type(screen.getByRole("combobox", { name: "Search products" }), "ibu{Enter}");
    await user.selectOptions(screen.getByRole("combobox", { name: "Brand" }), "Nurofen");

    await waitFor(() =>
      expect(searchProducts).toHaveBeenLastCalledWith(
        { ...EMPTY_FILTERS, q: "ibu", brand: "Nurofen" },
        1,
        expect.any(AbortSignal),
      ),
    );
  });

  it("offers prescription upload next to search", () => {
    searchProducts.mockReturnValue(new Promise(() => {}));
    render(<ProductsPage />);

    expect(screen.getByRole("button", { name: "Upload prescription" })).toBeInTheDocument();
  });
});

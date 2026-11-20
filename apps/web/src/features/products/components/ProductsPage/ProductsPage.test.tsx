import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProductsPage } from "./ProductsPage";
import * as api from "../../api/searchProducts";
import { EMPTY_FILTERS } from "../../types";
import { ibuprofen, vitaminD } from "../../../../test/fixtures";
import { renderWithRouter } from "../../../../test/renderWithRouter";

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

    renderWithRouter(<ProductsPage />);

    expect(await screen.findByText("Showing 1–10 of 12 results")).toBeInTheDocument();
  });

  it("shows no range text while loading", () => {
    searchProducts.mockReturnValue(new Promise(() => {}));

    renderWithRouter(<ProductsPage />);

    expect(screen.queryByText(/Showing/)).not.toBeInTheDocument();
  });

  it("renders no empty paragraph in the header when there are no results", async () => {
    searchProducts.mockResolvedValue({
      items: [],
      pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
    });

    renderWithRouter(<ProductsPage />);

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
    renderWithRouter(<ProductsPage />, "/?q=ibu");

    await user.selectOptions(screen.getByRole("combobox", { name: "Brand" }), "Nurofen");

    await waitFor(() =>
      expect(searchProducts).toHaveBeenLastCalledWith(
        { ...EMPTY_FILTERS, q: "ibu", brand: "Nurofen" },
        1,
        expect.any(AbortSignal),
      ),
    );
  });

  it("starts from the search in the URL and shows its filters", async () => {
    searchProducts.mockResolvedValue(loaded);
    renderWithRouter(<ProductsPage />, "/?q=ibu&brand=Nurofen");

    expect(screen.getByRole("combobox", { name: "Brand" })).toHaveValue("Nurofen");
    await waitFor(() =>
      expect(searchProducts).toHaveBeenCalledWith(
        { ...EMPTY_FILTERS, q: "ibu", brand: "Nurofen" },
        1,
        expect.any(AbortSignal),
      ),
    );
  });
});

describe("ProductsPage assistant link", () => {
  // Braces matter: a function returned from beforeEach runs as teardown, and this mock would hang it.
  beforeEach(() => {
    searchProducts.mockReturnValue(new Promise(() => {}));
  });

  it("opens the assistant with the current search text", () => {
    renderWithRouter(<ProductsPage />, "/?q=sore throat");

    expect(screen.getByRole("link", { name: "Not sure what you need?" })).toHaveAttribute(
      "href",
      "/assistant?q=sore+throat",
    );
  });

  it("opens an empty assistant when there is no search", () => {
    renderWithRouter(<ProductsPage />);

    expect(screen.getByRole("link", { name: "Not sure what you need?" })).toHaveAttribute(
      "href",
      "/assistant",
    );
  });
});

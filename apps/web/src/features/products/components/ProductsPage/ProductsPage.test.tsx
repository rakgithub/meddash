import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProductsPage } from "./ProductsPage";
import * as facetsApi from "../../api/fetchFacets";
import * as api from "../../api/searchProducts";
import * as suggestApi from "../../api/fetchSuggestions";
import { EMPTY_FILTERS } from "../../types";
import { ibuprofen, vitaminD } from "../../../../test/fixtures";
import { renderWithRouter } from "../../../../test/renderWithRouter";

vi.mock("../../api/searchProducts");
vi.mock("../../api/fetchFacets");
vi.mock("../../api/fetchSuggestions");
const searchProducts = vi.mocked(api.searchProducts);
const fetchFacets = vi.mocked(facetsApi.fetchFacets);

const facets = {
  categories: [
    { value: "pain-relief", count: 3 },
    { value: "vitamins", count: 2 },
  ],
  brands: [{ value: "Nurofen", count: 2 }],
  price: { min: 3, max: 11, buckets: [{ from: 3, to: 11, count: 5 }] },
};

beforeEach(() => {
  vi.resetAllMocks();
  fetchFacets.mockResolvedValue({ categories: [], brands: [], price: null });
  vi.mocked(suggestApi.fetchSuggestions).mockResolvedValue([]);
});

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

    await screen.findByRole("heading", { name: "Medicines", level: 1 });
    const header = screen.getByRole("banner");
    expect(header.querySelector("p")).toBeNull();
  });
});

describe("ProductsPage search and filters", () => {
  const loaded = {
    items: [ibuprofen],
    pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
  };

  it("searches from the field in the title row and keeps the filters", async () => {
    searchProducts.mockResolvedValue(loaded);
    const user = userEvent.setup();
    renderWithRouter(<ProductsPage />, "/shop?category=vitamins");

    await user.type(screen.getByRole("combobox", { name: "Search products" }), "d3{Enter}");

    await waitFor(() =>
      expect(searchProducts).toHaveBeenLastCalledWith(
        { ...EMPTY_FILTERS, q: "d3", category: "vitamins" },
        1,
        expect.any(AbortSignal),
      ),
    );
  });

  it("shows the search term from the URL in the field", () => {
    searchProducts.mockReturnValue(new Promise(() => {}));
    renderWithRouter(<ProductsPage />, "/shop?q=ibu");

    expect(screen.getByRole("combobox", { name: "Search products" })).toHaveValue("ibu");
  });

  it("keeps the search term when a filter changes", async () => {
    searchProducts.mockResolvedValue(loaded);
    const user = userEvent.setup();
    renderWithRouter(<ProductsPage />, "/?q=ibu");

    await user.click(screen.getByRole("radio", { name: "Nurofen" }));
    await user.click(screen.getByRole("button", { name: /^Pain relief/ }));

    await waitFor(() =>
      expect(searchProducts).toHaveBeenLastCalledWith(
        { ...EMPTY_FILTERS, q: "ibu", brand: "Nurofen", category: "pain-relief" },
        1,
        expect.any(AbortSignal),
      ),
    );
  });

  it("starts from the search in the URL and shows its filters", async () => {
    searchProducts.mockResolvedValue(loaded);
    renderWithRouter(<ProductsPage />, "/?q=ibu&brand=Nurofen");

    expect(screen.getByRole("radio", { name: "Nurofen" })).toBeChecked();
    expect(screen.getByRole("button", { name: "Remove Nurofen" })).toBeVisible();
    await waitFor(() =>
      expect(searchProducts).toHaveBeenCalledWith(
        { ...EMPTY_FILTERS, q: "ibu", brand: "Nurofen" },
        1,
        expect.any(AbortSignal),
      ),
    );
  });
});

describe("ProductsPage facets", () => {
  it("shows counts on the aisles and brands, and the price spread", async () => {
    searchProducts.mockReturnValue(new Promise(() => {}));
    fetchFacets.mockResolvedValue(facets);
    renderWithRouter(<ProductsPage />);

    const painRelief = await screen.findByRole("button", { name: /^Pain relief/ });
    expect(painRelief).toHaveAccessibleDescription("3");
    expect(screen.getByRole("button", { name: /^All products/ })).toHaveAccessibleDescription("5");
    expect(screen.getByRole("radio", { name: "Nurofen" })).toHaveAccessibleDescription("2");
    expect(screen.getByText(/3,00\s€ – 11,00\s€/)).toBeInTheDocument();
  });

  it("asks for the counts of the current filters", async () => {
    searchProducts.mockReturnValue(new Promise(() => {}));
    renderWithRouter(<ProductsPage />, "/?q=gel&category=skin-care");

    await waitFor(() =>
      expect(fetchFacets).toHaveBeenCalledWith(
        { ...EMPTY_FILTERS, q: "gel", category: "skin-care" },
        expect.any(AbortSignal),
      ),
    );
  });

  it("works without counts when they can't be loaded", async () => {
    searchProducts.mockReturnValue(new Promise(() => {}));
    fetchFacets.mockRejectedValue(new Error("boom"));
    renderWithRouter(<ProductsPage />);

    await waitFor(() => expect(fetchFacets).toHaveBeenCalled());
    expect(screen.getByRole("button", { name: /^Pain relief/ })).not.toHaveAccessibleDescription();
    expect(screen.getByRole("radio", { name: "Nurofen" })).toBeVisible();
  });
});

describe("ProductsPage refine panel", () => {
  // Braces matter: a returned function would run as teardown and await the never-ending promise.
  beforeEach(() => {
    searchProducts.mockReturnValue(new Promise(() => {}));
  });

  it("sits beside the results on wide screens, with no Refine button", () => {
    renderWithRouter(<ProductsPage />);

    expect(screen.getByRole("complementary", { name: "Refine" })).toBeVisible();
    expect(screen.queryByRole("button", { name: /^Refine/ })).not.toBeInTheDocument();
  });

  it("on narrow screens opens as a sheet from Refine, which counts what it holds", async () => {
    const setup = window.matchMedia;
    window.matchMedia = (media) => ({ ...setup(media), matches: true });
    const user = userEvent.setup();
    renderWithRouter(<ProductsPage />, "/?category=vitamins&brand=Abtei&maxPrice=5");

    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
    const refine = screen.getByRole("button", { name: "Refine, 2 applied" });
    expect(refine).toHaveAttribute("aria-expanded", "false");

    await user.click(refine);
    expect(refine).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("dialog", { name: "Refine" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Show results" }));
    expect(refine).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(refine).toHaveFocus();
  });
});

describe("ProductsPage assistant entry points", () => {
  const empty = { items: [], pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 } };
  const found = {
    items: [ibuprofen],
    pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
  };

  it("offers the floating assistant launcher", () => {
    searchProducts.mockReturnValue(new Promise(() => {}));
    renderWithRouter(<ProductsPage />);

    expect(screen.getByRole("link", { name: "Ask MedDash assistant" })).toHaveAttribute(
      "href",
      "/assistant",
    );
    expect(screen.queryByRole("link", { name: "Ask the assistant" })).not.toBeInTheDocument();
  });

  it("points a symptom search to the assistant with the search text", () => {
    searchProducts.mockReturnValue(new Promise(() => {}));
    renderWithRouter(<ProductsPage />, "/?q=sore throat");

    expect(screen.getByRole("link", { name: "Ask the assistant" })).toHaveAttribute(
      "href",
      "/assistant?q=sore+throat",
    );
  });

  it("points a search that found nothing to the assistant", async () => {
    searchProducts.mockResolvedValue(empty);
    renderWithRouter(<ProductsPage />, "/?q=xyz");

    expect(await screen.findByText("Nothing matches “xyz”")).toBeInTheDocument();
  });

  it("stays out of the way when a product search finds results", async () => {
    searchProducts.mockResolvedValue(found);
    renderWithRouter(<ProductsPage />, "/?q=ibu");

    await screen.findByText("Showing 1 of 1 result");
    expect(screen.queryByRole("link", { name: "Ask the assistant" })).not.toBeInTheDocument();
  });
});

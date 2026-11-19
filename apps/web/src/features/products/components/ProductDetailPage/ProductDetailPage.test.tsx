import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProductDetailPage } from "./ProductDetailPage";
import * as api from "../../api/fetchProduct";
import { ApiError } from "../../../../lib/apiClient";
import { coughSyrupDetail, ibuprofenDetail } from "../../../../test/fixtures";
import { renderWithRouter } from "../../../../test/renderWithRouter";

vi.mock("../../api/fetchProduct");
vi.mock("../../api/fetchSuggestions");
const fetchProduct = vi.mocked(api.fetchProduct);

// Stands in for the products page, so tests can see where a search lands.
function ResultsUrl() {
  const { pathname, search } = useLocation();
  return <p>Results at {pathname + search}</p>;
}

const renderPage = (id: string) =>
  renderWithRouter(
    <Routes>
      <Route path="/" element={<ResultsUrl />} />
      <Route path="/products/:id" element={<ProductDetailPage />} />
    </Routes>,
    `/products/${id}`,
  );

beforeEach(() => vi.resetAllMocks());

describe("ProductDetailPage states", () => {
  it("shows a loading message while fetching", () => {
    fetchProduct.mockReturnValue(new Promise(() => {}));
    renderPage("1");
    expect(screen.getByText("Loading product...")).toBeInTheDocument();
  });

  it("shows an error message when loading fails", async () => {
    fetchProduct.mockRejectedValue(new ApiError(500, "Internal Server Error"));
    renderPage("1");
    expect(await screen.findByText("Could not load product")).toBeInTheDocument();
  });

  it("shows a not-found message for an unknown product", async () => {
    fetchProduct.mockRejectedValue(new ApiError(404, "Not Found"));
    renderPage("99");
    expect(await screen.findByText("Product not found")).toBeInTheDocument();
  });

  it.each(["loading", "error", "not-found"])(
    "links back to the products in the %s state",
    async (state) => {
      fetchProduct.mockImplementation(() =>
        state === "loading"
          ? new Promise(() => {})
          : Promise.reject(state === "error" ? new Error("x") : new ApiError(404, "Not Found")),
      );
      renderPage("1");
      expect(screen.getByRole("link", { name: /Back to products/ })).toHaveAttribute("href", "/");
      await screen.findByText(/Loading product|Could not load product|Product not found/);
    },
  );
});

describe("ProductDetailPage content", () => {
  it("fetches the product named in the URL", async () => {
    fetchProduct.mockResolvedValue(ibuprofenDetail);
    renderPage("1");
    await screen.findByRole("heading", { name: "Ibuprofen 400mg", level: 1 });
    expect(fetchProduct).toHaveBeenCalledWith("1", expect.any(AbortSignal));
  });

  it("shows the summary: category, brand, description, price, stock and image", async () => {
    fetchProduct.mockResolvedValue(ibuprofenDetail);
    renderPage("1");

    // Scoped to the product: the filter dropdowns also list categories and brands.
    const product = within(await screen.findByRole("article"));
    expect(product.getByText("Pain relief")).toBeInTheDocument();
    expect(product.getByText("Nurofen")).toBeInTheDocument();
    expect(screen.getByText("Pain relief tablets for headaches and fever")).toBeInTheDocument();
    expect(screen.getByText(/6,49\s€/)).toBeInTheDocument();
    expect(screen.getByText("In stock")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Ibuprofen 400mg" })).toHaveAttribute(
      "src",
      ibuprofenDetail.imageUrl,
    );
  });

  it("shows the information sections and product facts", async () => {
    fetchProduct.mockResolvedValue(ibuprofenDetail);
    renderPage("1");

    await screen.findByRole("heading", { name: "Active ingredients" });
    expect(screen.getByText("Ibuprofen 400 mg")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Usage instructions" })).toBeInTheDocument();
    expect(screen.getByText("1 tablet with water, up to 3 times a day.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Warnings" })).toBeInTheDocument();
    expect(screen.getByText("Do not use with stomach ulcers.")).toBeInTheDocument();
    expect(screen.getByText("Reckitt")).toBeInTheDocument();
    expect(screen.getByText("Film-coated tablet")).toBeInTheDocument();
    expect(screen.getByText("20 tablets")).toBeInTheDocument();
    expect(screen.getByText("04875159")).toBeInTheDocument();
    expect(screen.getByText("MD-0001")).toBeInTheDocument();
  });

  it("leaves out sections and facts the product has no data for", async () => {
    fetchProduct.mockResolvedValue({
      ...ibuprofenDetail,
      activeIngredients: [],
      usageInstructions: null,
      warnings: null,
      sku: null,
      pzn: null,
      packSize: null,
      dosageForm: null,
      manufacturer: null,
    });
    renderPage("1");

    await screen.findByRole("heading", { name: "Ibuprofen 400mg", level: 1 });
    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
  });

  it("shows a placeholder when the product has no image or it fails to load", async () => {
    fetchProduct.mockResolvedValue(ibuprofenDetail);
    renderPage("1");

    // A failed load is a browser event, not a user action, so userEvent has no equivalent.
    fireEvent.error(await screen.findByRole("img", { name: "Ibuprofen 400mg" }));

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("flags an out-of-stock product", async () => {
    fetchProduct.mockResolvedValue({ ...ibuprofenDetail, stockQuantity: 0 });
    renderPage("1");
    expect(await screen.findByText("Out of stock")).toBeInTheDocument();
  });

  it("does not show the prescription notice for an over-the-counter product", async () => {
    fetchProduct.mockResolvedValue(ibuprofenDetail);
    renderPage("1");
    await screen.findByRole("heading", { name: "Ibuprofen 400mg", level: 1 });
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add to cart" })).not.toBeInTheDocument();
  });

  it("blocks and explains a prescription-only product", async () => {
    fetchProduct.mockResolvedValue(coughSyrupDetail);
    renderPage("7");

    const note = await screen.findByRole("note");
    expect(note).toHaveTextContent("Prescription only");
    expect(note).toHaveTextContent(/valid prescription/);
    expect(screen.getByRole("button", { name: "Add to cart" })).toBeDisabled();
  });
});

describe("ProductDetailPage filters", () => {
  beforeEach(() => fetchProduct.mockResolvedValue(ibuprofenDetail));

  it("shows the filters", async () => {
    renderPage("1");
    await screen.findByRole("heading", { name: "Ibuprofen 400mg", level: 1 });

    expect(screen.getByRole("group", { name: "Filters" })).toBeInTheDocument();
  });

  it("opens the results for a filter", async () => {
    const user = userEvent.setup();
    renderPage("1");

    await user.selectOptions(screen.getByRole("combobox", { name: "Category" }), "vitamins");

    expect(await screen.findByText("Results at /?category=vitamins")).toBeInTheDocument();
  });
});

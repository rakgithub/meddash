import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import * as detailApi from "./features/products/api/fetchProduct";
import * as searchApi from "./features/products/api/searchProducts";
import { ibuprofen, ibuprofenDetail } from "./test/fixtures";
import { renderWithRouter } from "./test/renderWithRouter";
import userEvent from "@testing-library/user-event";

vi.mock("./features/products/api/searchProducts");
vi.mock("./features/products/api/fetchSuggestions");
vi.mock("./features/products/api/fetchProduct");

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(searchApi.searchProducts).mockResolvedValue({
    items: [ibuprofen],
    pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
  });
  vi.mocked(detailApi.fetchProduct).mockResolvedValue(ibuprofenDetail);
});

describe("App routes", () => {
  it("shows the product search at /", async () => {
    renderWithRouter(<App />, "/");
    expect(await screen.findByRole("heading", { name: "Products", level: 1 })).toBeInTheDocument();
  });

  it("shows the product detail page at /products/:id", async () => {
    renderWithRouter(<App />, "/products/1");
    expect(
      await screen.findByRole("heading", { name: "Ibuprofen 400mg", level: 1 }),
    ).toBeInTheDocument();
  });

  it("shows a not-found page for an unknown route", () => {
    renderWithRouter(<App />, "/nope");
    expect(screen.getByRole("heading", { name: "Page not found" })).toBeInTheDocument();
  });

  it("returns to the product search from the logo", async () => {
    const user = userEvent.setup();
    renderWithRouter(<App />, "/products/1");
    expect(
      await screen.findByRole("heading", { name: "Ibuprofen 400mg", level: 1 }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "MedDash" }));
    expect(await screen.findByRole("heading", { name: "Products", level: 1 })).toBeInTheDocument();
  });

  it("opens a product from the list and goes back to the list", async () => {
    const user = userEvent.setup();
    renderWithRouter(<App />, "/");

    await user.click(await screen.findByRole("link", { name: "Ibuprofen 400mg" }));
    expect(
      await screen.findByRole("heading", { name: "Ibuprofen 400mg", level: 1 }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: /Back to products/ }));
    expect(await screen.findByRole("heading", { name: "Products", level: 1 })).toBeInTheDocument();
  });
});

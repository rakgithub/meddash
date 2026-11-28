import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProductCard } from "./ProductCard";
import { ibuprofen, vitaminD } from "../../../../test/fixtures";
import { renderWithRouter } from "../../../../test/renderWithRouter";

describe("ProductCard", () => {
  it("shows the category, brand, name, description and formatted price", () => {
    renderWithRouter(<ProductCard product={ibuprofen} />);

    expect(screen.getByText("Pain relief")).toBeInTheDocument();
    expect(screen.getByText("Nurofen")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ibuprofen 400mg" })).toBeInTheDocument();
    expect(screen.getByText("Pain relief tablets for headaches and fever")).toBeInTheDocument();
    expect(screen.getByText(/6,49\s€/)).toBeInTheDocument();
  });

  it("links the name to the product detail page", () => {
    renderWithRouter(<ProductCard product={ibuprofen} />);

    expect(screen.getByRole("link", { name: "Ibuprofen 400mg" })).toHaveAttribute(
      "href",
      "/products/1",
    );
  });

  it("offers to ask the assistant about the product, pre-filling the message box", () => {
    renderWithRouter(<ProductCard product={ibuprofen} />);

    const ask = screen.getByRole("link", { name: "Ask the assistant about Ibuprofen 400mg" });
    expect(ask).toHaveTextContent(/^Ask/);
    expect(ask).toHaveAttribute("href", "/?ask=Tell+me+about+Ibuprofen+400mg");
  });

  it("shows the product image, lazily loaded and named after the product", () => {
    renderWithRouter(<ProductCard product={ibuprofen} />);

    const img = screen.getByRole("img", { name: "Ibuprofen 400mg" });
    expect(img).toHaveAttribute("src", ibuprofen.imageUrl);
    expect(img).toHaveAttribute("loading", "lazy");
  });

  it("shows a placeholder instead of an image when the product has none", () => {
    renderWithRouter(<ProductCard product={vitaminD} />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Vitamin D3 1000 IU" })).toBeInTheDocument();
  });

  it("falls back to the placeholder when the image fails to load", () => {
    renderWithRouter(<ProductCard product={ibuprofen} />);

    // A failed load is a browser event, not a user action, so userEvent has no equivalent.
    fireEvent.error(screen.getByRole("img", { name: "Ibuprofen 400mg" }));

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("tries again when the image URL changes after a failure", () => {
    const { rerender } = renderWithRouter(<ProductCard product={ibuprofen} />);
    fireEvent.error(screen.getByRole("img", { name: "Ibuprofen 400mg" }));

    const newUrl = "https://images.unsplash.com/photo-new?w=600";
    rerender(<ProductCard product={{ ...ibuprofen, imageUrl: newUrl }} />);

    expect(screen.getByRole("img", { name: "Ibuprofen 400mg" })).toHaveAttribute("src", newUrl);
  });
});

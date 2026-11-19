import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProductCard } from "./ProductCard";
import { ibuprofen, vitaminD } from "../../../../test/fixtures";

describe("ProductCard", () => {
  it("shows the category, brand, name, description and formatted price", () => {
    render(<ProductCard product={ibuprofen} />);

    expect(screen.getByText("Pain relief")).toBeInTheDocument();
    expect(screen.getByText("Nurofen")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ibuprofen 400mg" })).toBeInTheDocument();
    expect(screen.getByText("Pain relief tablets for headaches and fever")).toBeInTheDocument();
    expect(screen.getByText(/6,49\s€/)).toBeInTheDocument();
  });

  it("shows the product image, lazily loaded and named after the product", () => {
    render(<ProductCard product={ibuprofen} />);

    const img = screen.getByRole("img", { name: "Ibuprofen 400mg" });
    expect(img).toHaveAttribute("src", ibuprofen.imageUrl);
    expect(img).toHaveAttribute("loading", "lazy");
  });

  it("shows a placeholder instead of an image when the product has none", () => {
    render(<ProductCard product={vitaminD} />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Vitamin D3 1000 IU" })).toBeInTheDocument();
  });

  it("falls back to the placeholder when the image fails to load", () => {
    render(<ProductCard product={ibuprofen} />);

    // A failed load is a browser event, not a user action, so userEvent has no equivalent.
    fireEvent.error(screen.getByRole("img", { name: "Ibuprofen 400mg" }));

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("tries again when the image URL changes after a failure", () => {
    const { rerender } = render(<ProductCard product={ibuprofen} />);
    fireEvent.error(screen.getByRole("img", { name: "Ibuprofen 400mg" }));

    const newUrl = "https://images.unsplash.com/photo-new?w=600";
    rerender(<ProductCard product={{ ...ibuprofen, imageUrl: newUrl }} />);

    expect(screen.getByRole("img", { name: "Ibuprofen 400mg" })).toHaveAttribute("src", newUrl);
  });
});

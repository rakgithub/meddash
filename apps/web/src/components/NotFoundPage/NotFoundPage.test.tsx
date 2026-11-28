import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithRouter } from "../../test/renderWithRouter";
import { NotFoundPage } from "./NotFoundPage";

describe("NotFoundPage", () => {
  it("says the page was not found and links back to the products", () => {
    renderWithRouter(<NotFoundPage />);
    expect(screen.getByRole("heading", { name: "Page not found", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to products" })).toHaveAttribute("href", "/");
    expect(document.title).toBe("Page not found | MedDash");
  });
});

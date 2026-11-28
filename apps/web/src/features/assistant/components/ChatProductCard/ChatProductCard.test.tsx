import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { coughSyrupDetail, ibuprofenDetail } from "../../../../test/fixtures";
import { renderWithRouter } from "../../../../test/renderWithRouter";
import { ChatProductCard } from "./ChatProductCard";

const n = (s: string | null) => s?.replace(/\s/g, " ");

describe("ChatProductCard", () => {
  it("shows the product's name as a link, why it was picked and its price", () => {
    renderWithRouter(
      <ChatProductCard
        recommendation={{ product: ibuprofenDetail, reason: "Brings fever down", fit: "best" }}
      />,
    );

    const row = screen.getByRole("article", { name: "Ibuprofen 400mg" });
    expect(row).toHaveTextContent("Brings fever down");
    expect(n(row.textContent)).toContain("6,49 €");
    expect(row).not.toHaveTextContent("In stock");
    expect(screen.getByRole("link", { name: "Ibuprofen 400mg" })).toHaveAttribute(
      "href",
      "/products/1",
    );
  });

  it("shows a caution when a warning concerns who it is for", () => {
    renderWithRouter(
      <ChatProductCard
        recommendation={{
          product: ibuprofenDetail,
          reason: "",
          fit: "good",
          caution: "Not suitable for children under 6 years.",
        }}
      />,
    );

    expect(screen.getByRole("article")).toHaveTextContent(
      "Check first: Not suitable for children under 6 years.",
    );
  });

  it("says when stock is low or gone", () => {
    const { rerender } = renderWithRouter(
      <ChatProductCard
        recommendation={{
          product: { ...ibuprofenDetail, stockQuantity: 3 },
          reason: "",
          fit: "good",
        }}
      />,
    );
    expect(screen.getByRole("article")).toHaveTextContent("Only 3 left");

    rerender(
      <ChatProductCard
        recommendation={{
          product: { ...ibuprofenDetail, stockQuantity: 0 },
          reason: "",
          fit: "good",
        }}
      />,
    );
    expect(screen.getByRole("article")).toHaveTextContent("Out of stock");
  });

  it("shows that a prescription-only product needs a prescription, without a price", () => {
    renderWithRouter(
      <ChatProductCard recommendation={{ product: coughSyrupDetail, reason: "", fit: "locked" }} />,
    );

    const row = screen.getByRole("article", { name: "Cough Syrup" });
    expect(row).toHaveTextContent("Needs a prescription");
    expect(n(row.textContent)).not.toContain("€");
  });
});

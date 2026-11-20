import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { coughSyrupDetail, ibuprofenDetail } from "../../../../test/fixtures";
import { renderWithRouter } from "../../../../test/renderWithRouter";
import { ChatProductCard } from "./ChatProductCard";

const n = (s: string | null) => s?.replace(/\s/g, " ");

describe("ChatProductCard", () => {
  it("shows the product with its form, price, stock and why it was picked", () => {
    renderWithRouter(
      <ChatProductCard
        recommendation={{ product: ibuprofenDetail, reason: "Brings fever down", fit: "best" }}
      />,
    );

    const card = screen.getByRole("article", { name: "Ibuprofen 400mg" });
    expect(card).toHaveTextContent("Best fit");
    expect(card).toHaveTextContent("Nurofen");
    expect(card).toHaveTextContent("Film-coated tablet");
    expect(card).toHaveTextContent("Why this? Brings fever down");
    expect(n(card.textContent)).toContain("6,49 €");
    expect(card).toHaveTextContent("In stock");
    expect(screen.getByRole("link", { name: "Ibuprofen 400mg" })).toHaveAttribute(
      "href",
      "/products/1",
    );
  });

  it("shows a caution row when a warning concerns who it is for", () => {
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

    expect(screen.getByRole("article", { name: "Ibuprofen 400mg" })).toHaveTextContent(
      "Check first: Not suitable for children under 6 years.",
    );
  });

  it("shows low stock", () => {
    renderWithRouter(
      <ChatProductCard
        recommendation={{
          product: { ...ibuprofenDetail, stockQuantity: 2 },
          reason: "",
          fit: "good",
        }}
      />,
    );

    expect(screen.getByText("Only 2 left")).toBeInTheDocument();
    expect(screen.queryByText("Best fit")).not.toBeInTheDocument();
  });

  it("asks about an ingredient when its pill is tapped", async () => {
    const onAskIngredient = vi.fn();
    renderWithRouter(
      <ChatProductCard
        recommendation={{ product: ibuprofenDetail, reason: "", fit: "good" }}
        onAskIngredient={onAskIngredient}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Ask about Ibuprofen" }));

    expect(onAskIngredient).toHaveBeenCalledWith("Ibuprofen");
  });

  it("shows ingredients as plain text when asking isn't possible", () => {
    renderWithRouter(
      <ChatProductCard recommendation={{ product: ibuprofenDetail, reason: "", fit: "good" }} />,
    );

    expect(screen.getByRole("list", { name: "Active ingredients" })).toHaveTextContent("Ibuprofen");
    expect(screen.queryByRole("button", { name: /Ask about/ })).not.toBeInTheDocument();
  });

  it("locks a prescription-only product and offers the prescription upload", () => {
    renderWithRouter(
      <ChatProductCard recommendation={{ product: coughSyrupDetail, reason: "", fit: "locked" }} />,
    );

    expect(screen.getByText("Needs a prescription")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload prescription" })).toBeInTheDocument();
    expect(screen.queryByText("In stock")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cough Syrup" })).toHaveAttribute(
      "href",
      "/products/7",
    );
  });
});

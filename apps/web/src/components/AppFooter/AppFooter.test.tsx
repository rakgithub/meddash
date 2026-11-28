import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithRouter } from "../../test/renderWithRouter";
import { AppFooter } from "./AppFooter";

describe("AppFooter", () => {
  it("links to every aisle and the account pages", () => {
    renderWithRouter(<AppFooter />, "/shop");

    const nav = within(screen.getByRole("navigation", { name: "Footer" }));
    const hrefs = nav
      .getAllByRole("link")
      .map((link) => [link.textContent, link.getAttribute("href")]);
    expect(hrefs).toEqual([
      ["All products", "/shop"],
      ["Cold and flu", "/shop?category=cold-flu"],
      ["Pain relief", "/shop?category=pain-relief"],
      ["Skin care", "/shop?category=skin-care"],
      ["Vitamins", "/shop?category=vitamins"],
      ["Cart", "/cart"],
      ["Orders", "/orders"],
      ["Profile", "/profile"],
    ]);
  });

  it('no longer has an "Ask MedDash" box: the assistant is the home page', () => {
    renderWithRouter(<AppFooter />, "/shop");

    expect(screen.queryByRole("link", { name: "Ask MedDash" })).not.toBeInTheDocument();
  });

  it("shows the safety note and the copyright", () => {
    renderWithRouter(<AppFooter />, "/products/1");

    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expect(screen.getByText(/ask a pharmacist or doctor/)).toBeInTheDocument();
    expect(screen.getByText(`© ${new Date().getFullYear()} MedDash`)).toBeInTheDocument();
  });

  it("stays out of the full-window assistant at /", () => {
    renderWithRouter(<AppFooter />, "/");

    expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
  });
});

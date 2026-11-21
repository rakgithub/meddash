import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithRouter } from "../../test/renderWithRouter";
import { AppFooter } from "./AppFooter";

describe("AppFooter", () => {
  it("links to every aisle and the account pages", () => {
    renderWithRouter(<AppFooter />, "/");

    const nav = within(screen.getByRole("navigation", { name: "Footer" }));
    const hrefs = nav
      .getAllByRole("link")
      .map((link) => [link.textContent, link.getAttribute("href")]);
    expect(hrefs).toEqual([
      ["All products", "/"],
      ["Cold and flu", "/?category=cold-flu"],
      ["Pain relief", "/?category=pain-relief"],
      ["Skin care", "/?category=skin-care"],
      ["Vitamins", "/?category=vitamins"],
      ["Cart", "/cart"],
      ["Orders", "/orders"],
      ["Profile", "/profile"],
    ]);
  });

  it("points people who are unsure to the assistant", () => {
    renderWithRouter(<AppFooter />, "/");

    const ask = within(screen.getByRole("region", { name: "Not sure which medicine fits?" }));
    expect(ask.getByRole("link", { name: "Ask MedDash" })).toHaveAttribute("href", "/assistant");
  });

  it("shows the safety note and the copyright", () => {
    renderWithRouter(<AppFooter />, "/products/1");

    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expect(screen.getByText(/ask a pharmacist or doctor/)).toBeInTheDocument();
    expect(screen.getByText(`© ${new Date().getFullYear()} MedDash`)).toBeInTheDocument();
  });

  it("stays out of the full-window assistant", () => {
    renderWithRouter(<AppFooter />, "/assistant");

    expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
  });
});

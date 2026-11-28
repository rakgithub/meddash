import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderWithRouter } from "../../../../test/renderWithRouter";
import { ComponentGallery } from "./ComponentGallery";

describe("ComponentGallery", () => {
  it("shows every component", () => {
    renderWithRouter(<ComponentGallery />);
    for (const name of [
      "Button",
      "IconButton",
      "Chip",
      "Badge",
      "TextField and SearchField",
      "Notice",
    ]) {
      expect(screen.getByRole("heading", { name, level: 3 })).toBeInTheDocument();
    }
  });

  it("toggles the filter chips like the catalogue does", async () => {
    const user = userEvent.setup();
    renderWithRouter(<ComponentGallery />);

    await user.click(screen.getByRole("button", { name: "Sleep" }));

    expect(screen.getByRole("button", { name: "Sleep", pressed: true })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Allergy", pressed: false })).toBeInTheDocument();
  });

  it("renders the link button through the router", () => {
    renderWithRouter(<ComponentGallery />);
    expect(screen.getByRole("link", { name: "As a link" })).toHaveAttribute("href", "/design");
  });
});

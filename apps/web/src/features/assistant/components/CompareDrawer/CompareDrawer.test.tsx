import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ibuprofenDetail, paracetamolDetail } from "../../../../test/fixtures";
import { renderWithRouter } from "../../../../test/renderWithRouter";
import { CompareDrawer } from "./CompareDrawer";

function setup() {
  const onClose = vi.fn();
  renderWithRouter(
    <CompareDrawer products={[ibuprofenDetail, paracetamolDetail]} onClose={onClose} />,
  );
  return { onClose, user: userEvent.setup() };
}

describe("CompareDrawer", () => {
  it("is a modal dialog with the first control focused", () => {
    setup();

    expect(screen.getByRole("dialog", { name: "Compare products" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
  });

  it("lays the products out as a table with column and row headers", () => {
    setup();
    const table = screen.getByRole("table");

    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((h) => h.textContent),
    ).toEqual(["Feature", "Ibuprofen 400mgNurofen", "Paracetamol 500mgratiopharm"]);
    const row = within(table).getByRole("row", { name: /Dosage form/ });
    expect(within(row).getByRole("rowheader")).toHaveTextContent("Dosage form");
    expect(
      within(row)
        .getAllByRole("cell")
        .map((c) => c.textContent),
    ).toEqual(["Film-coated tablet", "Tablet"]);
  });

  it("marks the rows that differ with a text badge and not the ones that match", () => {
    setup();

    expect(
      within(screen.getByRole("row", { name: /Dosage form/ })).getByText("Differs"),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("row", { name: /Pack size/ })).queryByText("Differs"),
    ).not.toBeInTheDocument();
  });

  it("links each product to its page", () => {
    setup();

    expect(screen.getByRole("link", { name: "Ibuprofen 400mg" })).toHaveAttribute(
      "href",
      "/products/1",
    );
  });

  it("answers a suggested question and highlights the row it is about", async () => {
    const { user } = setup();

    await user.click(screen.getByRole("button", { name: "Which is gentler on the stomach?" }));

    expect(screen.getByRole("status")).toHaveTextContent("Paracetamol 500mg is gentler");
    expect(screen.getByRole("row", { name: /Warnings/ })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("row", { name: /Stock/ })).not.toHaveAttribute("aria-current");
  });

  it("answers a typed question with Enter, clears the box and moves the highlight", async () => {
    const { user } = setup();
    const box = screen.getByRole("textbox", { name: "Ask about these products" });

    await user.type(box, "Which is cheapest?{Enter}");

    expect(screen.getByRole("status")).toHaveTextContent("is cheapest");
    expect(box).toHaveValue("");
    expect(screen.getByRole("row", { name: /Price per unit/ })).toHaveAttribute(
      "aria-current",
      "true",
    );

    await user.type(box, "How is the stock?{Enter}");

    expect(screen.getByRole("row", { name: /Stock/ })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("row", { name: /Price per unit/ })).not.toHaveAttribute("aria-current");
  });

  it("ignores an empty question", async () => {
    const { user } = setup();

    await user.click(screen.getByRole("button", { name: "Ask" }));

    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("closes from the Close button", async () => {
    const { user, onClose } = setup();

    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("gives focus back to the button that opened it", () => {
    const opener = document.createElement("button");
    document.body.append(opener);
    opener.focus();

    const { unmount } = renderWithRouter(
      <CompareDrawer products={[ibuprofenDetail, paracetamolDetail]} onClose={() => {}} />,
    );
    expect(opener).not.toHaveFocus();
    unmount();

    expect(opener).toHaveFocus();
    opener.remove();
  });
});

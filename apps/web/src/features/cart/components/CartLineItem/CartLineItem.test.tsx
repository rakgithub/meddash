import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ibuprofen, vitaminD } from "../../../../test/fixtures";
import { renderWithRouter } from "../../../../test/renderWithRouter";
import { CartLineItem } from "./CartLineItem";

const line = { product: ibuprofen, quantity: 2, lineTotal: 12.98 };

const setup = (props: Partial<Parameters<typeof CartLineItem>[0]> = {}) => {
  const onQuantityChange = vi.fn();
  const onRemove = vi.fn();
  renderWithRouter(
    <CartLineItem
      line={line}
      pending={null}
      locked={false}
      error={null}
      onQuantityChange={onQuantityChange}
      onRemove={onRemove}
      {...props}
    />,
  );
  return { onQuantityChange, onRemove };
};

describe("CartLineItem", () => {
  it("shows the product, unit price, quantity and line total", () => {
    setup();
    const article = screen.getByRole("article", { name: "Ibuprofen 400mg" });
    expect(screen.getByRole("link", { name: "Ibuprofen 400mg" })).toHaveAttribute(
      "href",
      "/products/1",
    );
    expect(article).toHaveTextContent(/6,49\s€ each/);
    expect(article).toHaveTextContent(/Line total 12,98\s€/);
    expect(screen.getByRole("spinbutton", { name: "Quantity of Ibuprofen 400mg" })).toHaveValue(2);
    // Decorative: the name is already in the heading.
    expect(within(article).getByRole("presentation")).toHaveAttribute("src", ibuprofen.imageUrl);
  });

  it("shows a placeholder when the product has no image", () => {
    renderWithRouter(
      <CartLineItem
        line={{ product: vitaminD, quantity: 1, lineTotal: 8.95 }}
        pending={null}
        locked={false}
        error={null}
        onQuantityChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(screen.getByRole("article", { name: "Vitamin D3 1000 IU" })).toBeVisible();
    expect(screen.queryByRole("presentation")).not.toBeInTheDocument();
  });

  it("reports quantity changes and remove clicks", async () => {
    const { onQuantityChange, onRemove } = setup();
    await userEvent.click(screen.getByRole("button", { name: "Increase quantity" }));
    await userEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(onQuantityChange).toHaveBeenCalledWith(3);
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("shows its own pending update and disables its controls", () => {
    setup({ pending: "update" });
    expect(screen.getByRole("status")).toHaveTextContent("Updating quantity…");
    expect(screen.getByRole("button", { name: "Remove" })).toBeDisabled();
    expect(screen.getByRole("spinbutton")).toBeDisabled();
  });

  it("shows a pending removal on the button", () => {
    setup({ pending: "remove" });
    expect(screen.getByRole("button", { name: "Removing…" })).toBeDisabled();
  });

  it("disables its controls while another line saves", () => {
    setup({ locked: true });
    expect(screen.getByRole("button", { name: "Remove" })).toBeDisabled();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("shows its error", () => {
    setup({ error: "Only 3 in stock" });
    expect(screen.getByRole("alert")).toHaveTextContent("Only 3 in stock");
  });
});

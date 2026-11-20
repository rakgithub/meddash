import { expect, test } from "@playwright/test";

// The dev database keeps every account, so each run registers a new email and starts with an empty cart.
const newEmail = () => `e2e-cart-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

test.describe("Cart", () => {
  test("add to cart → change quantity → remove", async ({ page }) => {
    // Registering signs this browser context in; the detail page's Add to cart lands in PR 3,
    // so the product goes in through the API here.
    await page.request.post("/api/auth/register", {
      data: { email: newEmail(), password: "correct horse", name: "Ana" },
    });
    const added = await page.request.post("/api/cart/items", {
      data: { productId: "1", quantity: 2 },
    });
    expect(added.status()).toBe(200);

    await page.goto("/cart");
    await expect(page.getByRole("heading", { name: "Your cart", level: 1 })).toBeVisible();
    const line = page.getByRole("article", { name: "Ibuprofen 400mg" });
    const summary = page.getByRole("region", { name: "Order summary" });
    await expect(line.getByRole("spinbutton")).toHaveValue("2");
    await expect(summary).toContainText("2 items");

    await line.getByRole("button", { name: "Increase quantity" }).click();
    await expect(line.getByRole("spinbutton")).toHaveValue("3");
    await expect(summary).toContainText("3 items");

    // The quantity is stored on the server, not just in the page.
    await page.reload();
    await expect(line.getByRole("spinbutton")).toHaveValue("3");

    await line.getByRole("button", { name: "Remove" }).click();
    await expect(page.getByText("Your cart is empty")).toBeVisible();
    await page.getByRole("link", { name: "Browse products" }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("a signed-out visitor is asked to log in", async ({ page }) => {
    await page.goto("/cart");
    await expect(page).toHaveURL(/\/login$/);
  });
});

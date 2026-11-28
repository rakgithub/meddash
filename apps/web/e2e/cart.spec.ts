import { expect, test } from "@playwright/test";

// The dev database keeps every account, so each run registers a new email.
const newEmail = () => `e2e-cart-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
const password = "correct horse";

test.describe("Add to cart", () => {
  test("a signed-in user adds two to the cart and sees the count and the cart", async ({
    page,
  }) => {
    await page.request.post("/api/auth/register", {
      data: { email: newEmail(), password, name: "Ana Weber" },
    });

    await page.goto("/products/1");
    const banner = page.getByRole("banner");
    await expect(banner.getByRole("link", { name: "Cart, 0 items" })).toBeVisible();

    const buy = page.getByRole("region", { name: "Buy" });
    await buy.getByRole("button", { name: "Increase quantity" }).click();
    await expect(buy.getByRole("spinbutton", { name: "Quantity" })).toHaveValue("2");
    await buy.getByRole("button", { name: "Add to cart" }).click();

    await expect(buy.getByRole("status")).toContainText("Added 2 to cart");
    await expect(banner.getByRole("link", { name: "Cart, 2 items" })).toBeVisible();

    await buy.getByRole("link", { name: "View cart" }).click();
    await expect(page.getByRole("heading", { name: "Your cart", level: 1 })).toBeVisible();
    await expect(
      page.getByRole("list", { name: "Cart items" }).getByRole("listitem"),
    ).toContainText("Ibuprofen 400mg");
  });

  test("a signed-out visitor is sent to log in and comes back to the product", async ({ page }) => {
    const email = newEmail();
    await page.request.post("/api/auth/register", { data: { email, password, name: "Ana" } });
    await page.request.post("/api/auth/logout");

    await page.goto("/products/1");
    await page.getByRole("button", { name: "Add to cart" }).click();

    await expect(page).toHaveURL(/\/login$/);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page).toHaveURL(/\/products\/1$/);
    await expect(page.getByRole("button", { name: "Add to cart" })).toBeEnabled();
  });

  test("the server's stock limit is shown and the quantity is kept", async ({ page }) => {
    await page.request.post("/api/auth/register", {
      data: { email: newEmail(), password, name: "Ana" },
    });

    // Product 4 has 3 in stock; adding 3 twice goes over it.
    await page.goto("/products/4");
    const buy = page.getByRole("region", { name: "Buy" });
    const more = buy.getByRole("button", { name: "Increase quantity" });
    await more.click();
    await more.click();
    await buy.getByRole("button", { name: "Add to cart" }).click();
    await expect(buy.getByRole("status")).toContainText("Added 3 to cart");

    await buy.getByRole("button", { name: "Add to cart" }).click();

    await expect(buy.getByRole("alert")).toBeVisible();
    await expect(buy.getByRole("spinbutton", { name: "Quantity" })).toHaveValue("3");
  });
});

test.describe("Cart page", () => {
  test("change quantity → reload keeps it → remove → empty", async ({ page }) => {
    await page.request.post("/api/auth/register", {
      data: { email: newEmail(), password, name: "Ana" },
    });

    await page.goto("/products/1");
    const buy = page.getByRole("region", { name: "Buy" });
    await buy.getByRole("button", { name: "Increase quantity" }).click();
    await buy.getByRole("button", { name: "Add to cart" }).click();
    await buy.getByRole("link", { name: "View cart" }).click();

    const banner = page.getByRole("banner");
    const line = page.getByRole("article", { name: "Ibuprofen 400mg" });
    const summary = page.getByRole("region", { name: "Order summary" });
    await expect(line.getByRole("spinbutton")).toHaveValue("2");
    await expect(summary).toContainText("2 items");

    await line.getByRole("button", { name: "Increase quantity" }).click();
    await expect(line.getByRole("spinbutton")).toHaveValue("3");
    await expect(summary).toContainText("3 items");
    // The header count follows the cart page.
    await expect(banner.getByRole("link", { name: "Cart, 3 items" })).toBeVisible();

    // The quantity is stored on the server, not just in the page.
    await page.reload();
    await expect(line.getByRole("spinbutton")).toHaveValue("3");

    await line.getByRole("button", { name: "Remove" }).click();
    await expect(page.getByText("Your cart is empty")).toBeVisible();
    await expect(banner.getByRole("link", { name: "Cart, 0 items" })).toBeVisible();
    await page.getByRole("link", { name: "Browse products" }).click();
    await expect(page).toHaveURL(/\/shop$/);
  });
});

test.describe("Orders", () => {
  test("cart → place order → order page → listed in My orders", async ({ page }) => {
    await page.request.post("/api/auth/register", {
      data: { email: newEmail(), password, name: "Ana" },
    });

    await page.goto("/products/1");
    const buy = page.getByRole("region", { name: "Buy" });
    await buy.getByRole("button", { name: "Increase quantity" }).click();
    await buy.getByRole("button", { name: "Add to cart" }).click();
    await buy.getByRole("link", { name: "View cart" }).click();

    await page.getByRole("button", { name: "Place order" }).click();

    await expect(page).toHaveURL(/\/orders\/\d+\?placed=1$/);
    await expect(page.getByRole("heading", { name: "Order placed", level: 1 })).toBeVisible();
    // No conversation to go back to.
    await expect(page.getByRole("link", { name: "Back to the assistant" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /^Order #\d+$/ })).toBeVisible();
    await expect(page.getByRole("list", { name: "Items" })).toContainText("Ibuprofen 400mg");
    await expect(page.getByText("Awaiting payment")).toBeVisible();
    // The cart was emptied.
    await expect(
      page.getByRole("banner").getByRole("link", { name: "Cart, 0 items" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Account menu" }).click();
    await page.getByRole("banner").getByRole("link", { name: "Orders", exact: true }).click();
    const orders = page.getByRole("list", { name: "Orders" });
    await expect(orders.getByRole("link")).toHaveCount(1);
    await expect(orders).toContainText("2 items");
  });
});

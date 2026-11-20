import { expect, test } from "@playwright/test";

test.describe("Product detail", () => {
  test("search → open product → see details, then go back", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("combobox", { name: "Search products" }).fill("ibuprofen");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page.getByRole("listitem")).toHaveCount(2);

    await page.getByRole("link", { name: "Ibuprofen 400mg" }).click();

    await expect(page).toHaveURL(/\/products\/1$/);
    await expect(page.getByRole("heading", { name: "Ibuprofen 400mg", level: 1 })).toBeVisible();
    await expect(page.getByRole("article").getByText("Nurofen")).toBeVisible();
    await expect(page.getByText(/6,49\s€/)).toBeVisible();
    await expect(page.getByText("In stock")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Active ingredients" })).toBeVisible();
    await expect(page.getByText("Ibuprofen 400 mg")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Usage instructions" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Warnings" })).toBeVisible();
    await expect(page.getByText("04875159")).toBeVisible();
    await expect(page.getByRole("note")).toBeHidden();

    await page.getByRole("link", { name: /Back to products/ }).click();

    await expect(page.getByRole("heading", { name: "Products", level: 1 })).toBeVisible();
  });

  test("searching from a product page opens the results, and Back returns to the product", async ({
    page,
  }) => {
    await page.goto("/?q=ibuprofen");
    await expect(page.getByRole("listitem")).toHaveCount(2);
    await page.getByRole("link", { name: "Ibuprofen Gel" }).click();
    await expect(page.getByRole("heading", { name: "Ibuprofen Gel", level: 1 })).toBeVisible();

    await page.getByRole("combobox", { name: "Search products" }).fill("vitamin");
    await page.getByRole("button", { name: "Search" }).click();

    await expect(page).toHaveURL(/\/\?q=vitamin$/);
    await expect(page.getByRole("combobox", { name: "Search products" })).toHaveValue("vitamin");
    await expect(page.getByRole("listitem")).toHaveCount(2);

    await page.goBack();
    await expect(page.getByRole("heading", { name: "Ibuprofen Gel", level: 1 })).toBeVisible();
    await page.goBack();
    await expect(page.getByRole("combobox", { name: "Search products" })).toHaveValue("ibuprofen");
    await expect(page.getByRole("listitem")).toHaveCount(2);
  });

  test("picking a filter on a product page opens the filtered results", async ({ page }) => {
    await page.goto("/products/1");
    await expect(page.getByRole("heading", { name: "Ibuprofen 400mg", level: 1 })).toBeVisible();

    await page.getByLabel("Category").selectOption("skin-care");

    await expect(page).toHaveURL(/\/\?category=skin-care$/);
    await expect(page.getByRole("region", { name: "Results" }).getByRole("listitem")).toHaveCount(
      3,
    );
  });

  test("a card opens the product when clicked anywhere on it", async ({ page }) => {
    await page.goto("/");

    // The link's overlay sits on top of the text, so skip Playwright's "is it hittable" check;
    // the click still lands at the text's coordinates, like a user's would.
    await page.getByText("Pain relief tablets for headaches and fever").click({ force: true });

    await expect(page.getByRole("heading", { name: "Ibuprofen 400mg", level: 1 })).toBeVisible();
  });

  test("a prescription-only product is marked and cannot be added to the cart", async ({
    page,
  }) => {
    await page.goto("/products/7");

    await expect(page.getByRole("heading", { name: "Cough Syrup", level: 1 })).toBeVisible();
    await expect(page.getByRole("note")).toContainText("Prescription only");
    await expect(page.getByRole("button", { name: "Add to cart" })).toBeDisabled();
  });

  test("shows an out-of-stock product as out of stock", async ({ page }) => {
    await page.goto("/products/12");

    await expect(page.getByText("Out of stock")).toBeVisible();
  });

  test("shows a not-found message for an unknown product", async ({ page }) => {
    await page.goto("/products/9999");

    await expect(page.getByText("Product not found")).toBeVisible();
    await expect(page.getByRole("link", { name: /Back to products/ })).toBeVisible();
  });

  test("shows an error message when the API fails", async ({ page }) => {
    await page.route(
      (url) => url.pathname === "/api/products/1",
      (route) => route.fulfill({ status: 500 }),
    );

    await page.goto("/products/1");

    await expect(page.getByText("Could not load product")).toBeVisible();
  });
});

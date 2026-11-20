import { expect, test, type Page } from "@playwright/test";
import { API_URL } from "../playwright.config";

// Scoped to the results, so other lists on the page (like the symptom starters) aren't counted.
const cards = (page: Page) => page.getByRole("region", { name: "Results" }).getByRole("listitem");
const search = (page: Page) => page.getByRole("button", { name: "Search" });
const isSearchCall = (url: string) => new URL(url).pathname === "/api/search";

test.describe("Product browsing", () => {
  test("shows the first page of results from the real API", async ({ page, request }) => {
    const { items, pagination } = await (await request.get(`${API_URL}/search`)).json();

    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Products", level: 1 })).toBeVisible();
    await expect(cards(page)).toHaveCount(items.length);
    await expect(
      page.getByText(`Showing 1–${items.length} of ${pagination.total} results`),
    ).toBeVisible();
    for (const product of items) {
      await expect(page.getByRole("heading", { name: product.name, exact: true })).toBeVisible();
    }
  });

  test("renders a card with category, brand, description and price", async ({ page }) => {
    await page.goto("/");

    const card = cards(page).filter({
      has: page.getByRole("heading", { name: "Ibuprofen 400mg", exact: true }),
    });
    await expect(card).toContainText("Pain relief");
    await expect(card).toContainText("Nurofen");
    await expect(card).toContainText("Pain relief tablets for headaches and fever");
    await expect(card).toContainText(/6,49\s€/);
    await expect(card.getByRole("img", { name: "Ibuprofen 400mg" })).toHaveAttribute(
      "src",
      /^https:\/\/images\.unsplash\.com\//,
    );
  });

  test("paginates through the results", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Page 1 of 2")).toBeVisible();
    await expect(cards(page)).toHaveCount(10);
    await expect(page.getByText("Showing 1–10 of 12 results")).toBeVisible();

    await page.getByRole("button", { name: "Next" }).click();

    await expect(page.getByText("Page 2 of 2")).toBeVisible();
    await expect(page.getByText("Showing 11–12 of 12 results")).toBeVisible();
    await expect(cards(page)).toHaveCount(2);
    await expect(page.getByRole("button", { name: "Next" })).toBeDisabled();
  });
});

const searchBox = (page: Page) => page.getByRole("combobox", { name: "Search products" });

async function setPrice(page: Page, min: string, max: string) {
  await page.getByRole("button", { name: "Price" }).click();
  await page.getByLabel("Minimum price").fill(min);
  await page.getByLabel("Maximum price").fill(max);
  await page.getByRole("button", { name: "Apply" }).click();
}

test.describe("Search and filters", () => {
  test("only calls the search API when the user searches, not while typing", async ({ page }) => {
    await page.goto("/");
    await expect(cards(page).first()).toBeVisible();

    let calls = 0;
    page.on("request", (req) => isSearchCall(req.url()) && calls++);

    await searchBox(page).fill("ibuprofen");
    expect(calls).toBe(0);

    const request = page.waitForRequest((req) => isSearchCall(req.url()));
    await search(page).click();

    expect(new URL((await request).url()).searchParams.get("q")).toBe("ibuprofen");
  });

  test("searches by name", async ({ page }) => {
    await page.goto("/");

    await searchBox(page).fill("ibuprofen");
    await searchBox(page).press("Enter");

    await expect(cards(page)).toHaveCount(2);
    await expect(page.getByText("Showing 1–2 of 2 results")).toBeVisible();
  });

  test("filters by category and brand as soon as they are picked", async ({ page }) => {
    await page.goto("/");

    await page.getByLabel("Category").selectOption("skin-care");
    await page.getByLabel("Brand").selectOption("Eucerin");

    await expect(cards(page)).toHaveCount(2);
    await expect(page.getByRole("heading", { name: "Sunscreen SPF 50" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Moisturising Cream" })).toBeVisible();
  });

  test("filters by price range", async ({ page }) => {
    await page.goto("/");

    await setPrice(page, "5", "7");

    // Ibuprofen 6.49, Vitamin C 5.49, Magnesium 7.25 (out), Throat Lozenges 6.20
    await expect(cards(page)).toHaveCount(3);
    await expect(page.getByRole("heading", { name: "Ibuprofen 400mg", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Magnesium 400" })).toBeHidden();
  });

  test("combines the search term with filters", async ({ page }) => {
    await page.goto("/");

    await searchBox(page).fill("ibuprofen");
    await search(page).click();
    await expect(cards(page)).toHaveCount(2);

    await setPrice(page, "", "7");

    await expect(cards(page)).toHaveCount(1);
    await expect(page.getByRole("heading", { name: "Ibuprofen 400mg", exact: true })).toBeVisible();
  });

  test("shows a message when nothing matches", async ({ page }) => {
    await page.goto("/");

    await searchBox(page).fill("zzzz-no-such-product");
    await search(page).click();

    await expect(page.getByText("No products found")).toBeVisible();
  });

  test("rejects a min price above the max price", async ({ page }) => {
    await page.goto("/");

    await setPrice(page, "20", "5");

    await expect(page.getByRole("alert")).toBeVisible();
    await expect(cards(page)).toHaveCount(10);
  });

  test("Clear filters removes the filters and keeps the search term", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Category").selectOption("pain-relief");
    await expect(cards(page)).toHaveCount(3);

    await page.getByRole("button", { name: "Clear filters" }).click();

    await expect(page.getByLabel("Category")).toHaveValue("");
    await expect(cards(page)).toHaveCount(10);
    await expect(page.getByRole("button", { name: "Clear filters" })).toBeHidden();
  });

  test("Upload prescription says it is coming soon", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Upload prescription" }).click();

    await expect(page.getByText("Prescription upload is coming soon.")).toBeVisible();
  });
});

test.describe("Search suggestions", () => {
  test("suggests products as you type and searches the one picked with the keyboard", async ({
    page,
  }) => {
    await page.goto("/");
    const name = searchBox(page);

    await name.fill("ibu");

    const options = page.getByRole("listbox", { name: "Suggestions" }).getByRole("option");
    await expect(options).toHaveText([/Ibuprofen 400mg/, /Ibuprofen Gel/]);

    await name.press("ArrowDown");
    await name.press("ArrowDown");
    await expect(name).toHaveAttribute(
      "aria-activedescendant",
      (await options.nth(1).getAttribute("id")) ?? "",
    );

    await name.press("Enter");

    await expect(name).toHaveValue("Ibuprofen Gel");
    await expect(name).toHaveAttribute("aria-expanded", "false");
    await expect(cards(page)).toHaveCount(1);
  });

  test("a symptom suggests a category, which filters the results", async ({ page }) => {
    await page.goto("/");

    await searchBox(page).fill("headache");
    await page
      .getByRole("group", { name: "Categories" })
      .getByRole("option", { name: /Pain relief/ })
      .click();

    await expect(searchBox(page)).toHaveValue("");
    await expect(page.getByLabel("Category")).toHaveValue("pain-relief");
    await expect(cards(page)).toHaveCount(3);
  });

  test("Escape closes the suggestions and keeps the text", async ({ page }) => {
    await page.goto("/");
    const name = searchBox(page);
    await name.fill("vit");
    await expect(page.getByRole("listbox", { name: "Suggestions" })).toBeVisible();

    await name.press("Escape");

    await expect(page.getByRole("listbox", { name: "Suggestions" })).toBeHidden();
    await expect(name).toHaveValue("vit");
  });
});

test.describe("Loading, error and empty states", () => {
  test("shows a loading message while the request is pending", async ({ page }) => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    await page.route(
      (url) => isSearchCall(url.href),
      async (route) => {
        await gate;
        await route.continue();
      },
    );

    await page.goto("/");
    await expect(page.getByText("Loading products...")).toBeVisible();

    release();
    await expect(page.getByText("Loading products...")).toBeHidden();
    await expect(cards(page).first()).toBeVisible();
  });

  test("shows an error message when the API fails", async ({ page }) => {
    await page.route(
      (url) => isSearchCall(url.href),
      (route) => route.fulfill({ status: 500 }),
    );

    await page.goto("/");

    await expect(page.getByText("Could not load products")).toBeVisible();
    await expect(cards(page)).toHaveCount(0);
  });
});

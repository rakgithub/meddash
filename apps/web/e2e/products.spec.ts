import { expect, test, type Page } from "@playwright/test";
import { API_URL } from "../playwright.config";

// Scoped to the results, so other lists on the page (like the symptom starters) aren't counted.
const cards = (page: Page) => page.getByRole("region", { name: "Results" }).getByRole("listitem");
const search = (page: Page) => page.getByRole("button", { name: "Search" });
const isSearchCall = (url: string) => new URL(url).pathname === "/api/search";

test.describe("Product browsing", () => {
  test("shows the first page of results from the real API", async ({ page, request }) => {
    const { items, pagination } = await (await request.get(`${API_URL}/search`)).json();

    await page.goto("/shop");

    await expect(page.getByRole("heading", { name: "Medicines", level: 1 })).toBeVisible();
    await expect(cards(page)).toHaveCount(items.length);
    await expect(
      page.getByText(`Showing 1–${items.length} of ${pagination.total} results`),
    ).toBeVisible();
    for (const product of items) {
      await expect(page.getByRole("heading", { name: product.name, exact: true })).toBeVisible();
    }
  });

  test("renders a card with category, brand, description and price", async ({ page }) => {
    await page.goto("/shop");

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
    await page.goto("/shop");
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

const aisle = (page: Page, name: string) =>
  page
    .getByRole("group", { name: "Category" })
    .getByRole("button", { name: new RegExp(`^${name}`) });

async function setPrice(page: Page, min: string, max: string) {
  await page.getByLabel("Minimum price").fill(min);
  await page.getByLabel("Maximum price").fill(max);
  await page.getByRole("button", { name: "Apply" }).click();
}

test.describe("Medicines at /shop", () => {
  test("an old catalogue link on / opens /shop with the same query", async ({ page }) => {
    await page.goto("/?q=ibuprofen&maxPrice=7");

    await expect(page).toHaveURL(/\/shop\?q=ibuprofen&maxPrice=7$/);
    await expect(searchBox(page)).toHaveValue("ibuprofen");
    await expect(cards(page)).toHaveCount(1);
  });

  test("the header menu opens Medicines and marks it as the current page", async ({ page }) => {
    await page.goto("/products/1");
    const medicines = page.getByRole("navigation", { name: "Main" }).getByRole("link", {
      name: "Medicines",
    });

    await medicines.click();

    await expect(page).toHaveURL(/\/shop$/);
    await expect(page.getByRole("heading", { name: "Medicines", level: 1 })).toBeVisible();
    await expect(medicines).toHaveAttribute("aria-current", "page");
  });

  test("the menu fits on one row on a phone, with icon-only links", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto("/shop");
    const nav = page.getByRole("navigation", { name: "Main" });

    await expect(nav.getByRole("link", { name: "Medicines" })).toBeVisible();
    await expect(nav.getByText("Medicines")).toHaveCSS("position", "absolute");
    const header = await page.getByRole("banner").boundingBox();
    expect(header?.height).toBeLessThan(80);
  });
});

test.describe("Search and filters", () => {
  test("only calls the search API when the user searches, not while typing", async ({ page }) => {
    await page.goto("/shop");
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
    await page.goto("/shop");

    await searchBox(page).fill("ibuprofen");
    await searchBox(page).press("Enter");

    await expect(cards(page)).toHaveCount(2);
    await expect(page.getByText("Showing 1–2 of 2 results")).toBeVisible();
  });

  test("filters by category and brand as soon as they are picked", async ({ page }) => {
    await page.goto("/shop");

    await aisle(page, "Skin care").click();
    await page.getByRole("radio", { name: "Eucerin" }).click();
    await expect(page.getByRole("radio", { name: "Eucerin" })).toBeChecked();

    await expect(cards(page)).toHaveCount(2);
    await expect(page.getByRole("heading", { name: "Sunscreen SPF 50" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Moisturising Cream" })).toBeVisible();
  });

  test("shows how many products each category and brand holds", async ({ page }) => {
    await page.goto("/shop");

    await expect(aisle(page, "Pain relief")).toHaveAccessibleDescription("3");
    await expect(aisle(page, "All products")).toHaveAccessibleDescription("12");
    await expect(page.getByRole("radio", { name: "Nurofen" })).toHaveAccessibleDescription("2");

    // Counts follow the other filters, and a category keeps showing what the others hold.
    await page.getByRole("button", { name: "Up to 5 €" }).click();

    await expect(aisle(page, "Pain relief")).toHaveAccessibleDescription("1");
    await expect(aisle(page, "Vitamins")).toHaveAccessibleDescription("0");
  });

  test("filters by price range", async ({ page }) => {
    await page.goto("/shop");

    await setPrice(page, "5", "7");

    // Ibuprofen 6.49, Vitamin C 5.49, Magnesium 7.25 (out), Throat Lozenges 6.20
    await expect(cards(page)).toHaveCount(3);
    await expect(page.getByRole("heading", { name: "Ibuprofen 400mg", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Magnesium 400" })).toBeHidden();
  });

  test("combines the search term with filters", async ({ page }) => {
    await page.goto("/shop");

    await searchBox(page).fill("ibuprofen");
    await search(page).click();
    await expect(cards(page)).toHaveCount(2);

    await setPrice(page, "", "7");

    await expect(cards(page)).toHaveCount(1);
    await expect(page.getByRole("heading", { name: "Ibuprofen 400mg", exact: true })).toBeVisible();
  });

  test("shows a message when nothing matches", async ({ page }) => {
    await page.goto("/shop");

    await searchBox(page).fill("zzzz-no-such-product");
    await search(page).click();

    await expect(page.getByText("No products found")).toBeVisible();
  });

  test("filters by a price band in one tap", async ({ page }) => {
    await page.goto("/shop");

    await page.getByRole("button", { name: "Up to 5 €" }).click();

    await expect(page).toHaveURL(/maxPrice=5/);
    await expect(page.getByRole("button", { name: /^Remove Up to 5,00/ })).toBeVisible();
  });

  test("rejects a min price above the max price", async ({ page }) => {
    await page.goto("/shop");

    await setPrice(page, "20", "5");

    await expect(page.getByRole("alert")).toBeVisible();
    await expect(cards(page)).toHaveCount(10);
  });

  test("Clear filters removes the filters and keeps the search term", async ({ page }) => {
    await page.goto("/shop");
    await aisle(page, "Pain relief").click();
    await expect(cards(page)).toHaveCount(3);

    await page.getByRole("button", { name: "Clear filters" }).click();

    await expect(aisle(page, "All products")).toHaveAttribute("aria-pressed", "true");
    await expect(cards(page)).toHaveCount(10);
    await expect(page.getByRole("button", { name: "Clear filters" })).toBeHidden();
  });
});

test.describe("Search suggestions", () => {
  test("suggests products as you type and searches the one picked with the keyboard", async ({
    page,
  }) => {
    await page.goto("/shop");
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
    await page.goto("/shop");

    await searchBox(page).fill("headache");
    await page
      .getByRole("group", { name: "Categories" })
      .getByRole("option", { name: /Pain relief/ })
      .click();

    await expect(searchBox(page)).toHaveValue("");
    await expect(aisle(page, "Pain relief")).toHaveAttribute("aria-pressed", "true");
    await expect(cards(page)).toHaveCount(3);
  });

  test("Escape closes the suggestions and keeps the text", async ({ page }) => {
    await page.goto("/shop");
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

    await page.goto("/shop");
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

    await page.goto("/shop");

    await expect(page.getByText("Could not load products")).toBeVisible();
    await expect(cards(page)).toHaveCount(0);
  });
});

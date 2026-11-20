import { expect, test } from "@playwright/test";

test.describe("Symptom assistant", () => {
  test("opens from the products page with the search text and answers a starter prompt", async ({
    page,
  }) => {
    await page.goto("/?q=sore%20throat");

    await page.getByRole("link", { name: "Ask the assistant" }).click();

    await expect(page).toHaveURL(/\/assistant\?q=sore\+throat$/);
    await expect(page.getByRole("textbox", { name: "Describe your symptoms" })).toHaveValue(
      "sore throat",
    );

    await page.getByRole("button", { name: "Hay fever" }).click();

    await expect(page.getByRole("list", { name: "What I noted" })).toContainText("Hay fever");
    await expect(page.getByRole("button", { name: "Since today" })).toBeVisible();
  });

  test("asks two questions, then suggests real products that open their page", async ({ page }) => {
    await page.goto("/assistant");

    await page.getByRole("button", { name: "Sore throat and fever" }).click();
    await page.getByRole("button", { name: "2–3 days" }).click();
    await page.getByRole("button", { name: "Me", exact: true }).click();

    const suggestions = page.getByRole("list", { name: "Suggested products" });
    await expect(suggestions.getByRole("article", { name: "Ibuprofen 400mg" })).toContainText(
      "Best fit",
      { timeout: 15_000 },
    );
    await expect(suggestions.getByRole("article", { name: "Cough Syrup" })).toContainText(
      "Needs a prescription",
    );

    await suggestions.getByRole("link", { name: "Ibuprofen 400mg" }).click();

    await expect(page).toHaveURL(/\/products\/1$/);
    await expect(page.getByRole("heading", { name: "Ibuprofen 400mg" })).toBeVisible();
  });

  test("stops a reply that is streaming", async ({ page }) => {
    await page.goto("/assistant");

    const box = page.getByRole("textbox", { name: "Describe your symptoms" });
    await box.fill("Upset stomach");
    await box.press("Enter");
    await page.getByRole("button", { name: "Stop" }).click();

    await expect(page.getByText("Stopped")).toBeVisible();
    await expect(box).toBeEditable();
  });
});

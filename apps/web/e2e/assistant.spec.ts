import { expect, test } from "@playwright/test";

test.describe("Symptom assistant", () => {
  test("opens from the products page with the search text and answers a starter prompt", async ({
    page,
  }) => {
    await page.goto("/?q=sore%20throat");

    await page.getByRole("link", { name: "Not sure what you need?" }).click();

    await expect(page).toHaveURL(/\/assistant\?q=sore\+throat$/);
    await expect(page.getByRole("textbox", { name: "Describe your symptoms" })).toHaveValue(
      "sore throat",
    );

    await page.getByRole("button", { name: "Hay fever" }).click();

    await expect(page.getByRole("button", { name: "Stop" })).toBeVisible();
    await expect(page.getByText(/Hay fever responds well/)).toBeVisible();
    await expect(page.getByRole("button", { name: "3 matches 4 steps" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Send" })).toBeVisible({ timeout: 15_000 });
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

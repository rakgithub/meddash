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

  test("starts from the body map: tap throat, pick a symptom, see suggestions", async ({
    page,
  }) => {
    await page.goto("/assistant");

    await page.getByRole("button", { name: "Nose and throat" }).click();
    await page.getByRole("button", { name: "Sore throat" }).click();
    await expect(page.getByRole("complementary", { name: "Case file" })).toContainText(
      "Sore throat",
    );
    await page.getByRole("button", { name: "2–3 days" }).click();
    await page.getByRole("button", { name: "Me", exact: true }).click();

    await expect(
      page.getByRole("list", { name: "Suggested products" }).getByRole("article", {
        name: "Ibuprofen 400mg",
      }),
    ).toBeVisible({ timeout: 15_000 });
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

  test("refines the suggestions from the case file and rules a product out", async ({ page }) => {
    await page.goto("/assistant");

    await page.getByRole("button", { name: "Sore throat and fever" }).click();
    await page.getByRole("button", { name: "2–3 days" }).click();
    await page.getByRole("button", { name: "Me", exact: true }).click();
    const ibuprofen = page.getByRole("article", { name: "Ibuprofen 400mg" });
    await expect(ibuprofen).toBeVisible({ timeout: 15_000 });

    // Who it is for changes, so the assistant answers again.
    await page.getByRole("combobox", { name: "Who it’s for" }).selectOption("A child");
    await expect(page.getByRole("list", { name: "Conversation" })).toContainText(
      "Changed who it’s for to A child",
    );
    await expect(page.getByRole("article", { name: "Ibuprofen 400mg" })).toHaveCount(2, {
      timeout: 15_000,
    });

    // "Not for me" drops the card and notes the reason in the case file.
    await page
      .getByRole("article", { name: "Ibuprofen 400mg" })
      .last()
      .getByRole("button", { name: "Not for me" })
      .click();
    await page.getByRole("button", { name: "Too expensive" }).click();
    await expect(page.getByRole("article", { name: "Ibuprofen 400mg" })).toHaveCount(0);
    await expect(page.getByRole("list", { name: "Avoiding" })).toContainText("Expensive options");
  });

  test("compares the shortlist in a drawer, answers a question and closes on Escape", async ({
    page,
  }) => {
    await page.goto("/assistant");

    await page.getByRole("button", { name: "Sore throat and fever" }).click();
    await page.getByRole("button", { name: "2–3 days" }).click();
    await page.getByRole("button", { name: "Me", exact: true }).click();
    const compare = page.getByRole("button", { name: "Compare" });
    await expect(compare).toBeVisible({ timeout: 15_000 });

    await compare.click();

    const drawer = page.getByRole("dialog", { name: "Compare products" });
    await expect(drawer.getByRole("columnheader", { name: /Ibuprofen 400mg/ })).toBeVisible();
    await expect(drawer.getByRole("columnheader", { name: /Paracetamol 500mg/ })).toBeVisible();

    await drawer.getByRole("button", { name: "Which is gentler on the stomach?" }).click();
    await expect(drawer.getByRole("status")).toContainText("Ibuprofen 400mg has a stomach warning");
    await expect(drawer.getByRole("row", { name: /Warnings/ })).toHaveAttribute(
      "aria-current",
      "true",
    );

    await page.keyboard.press("Escape");

    await expect(drawer).toHaveCount(0);
    await expect(compare).toBeFocused();
  });

  test("an urgent symptom gets a doctor alert instead of products", async ({ page }) => {
    await page.goto("/assistant");

    const box = page.getByRole("textbox", { name: "Describe your symptoms" });
    await box.fill("Sore throat and chest pain");
    await box.press("Enter");

    await expect(page.getByRole("alert", { name: /This needs a doctor now/ })).toContainText(
      "Call 112",
    );
    await expect(page.getByRole("list", { name: "Suggested products" })).toHaveCount(0);
    await expect(box).toHaveCount(0);

    await page.getByRole("button", { name: "Start over" }).click();
    await page.getByRole("button", { name: "Yes, clear it" }).click();

    await expect(page.getByRole("heading", { name: "What’s bothering you?" })).toBeVisible();
  });

  test("stops a reply that is streaming", async ({ page }) => {
    await page.goto("/assistant");

    const box = page.getByRole("textbox", { name: "Describe your symptoms" });
    await box.fill("Upset stomach");
    await box.press("Enter");
    await page.getByRole("button", { name: "Stop" }).click();

    // Exact: the live region also says "Reply stopped." for screen readers.
    await expect(page.getByText("Stopped", { exact: true })).toBeVisible();
    await expect(box).toBeEditable();
  });
});

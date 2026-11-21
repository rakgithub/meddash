import { expect, test, type Page } from "@playwright/test";
import { DURATION_OPTIONS, FOR_WHOM_OPTIONS } from "../src/features/assistant/utils/caseFile";

// The dev database keeps every account, so each run registers a new email.
const newEmail = () =>
  `e2e-assistant-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
const password = "correct horse";

const sse = (parts: unknown[]) =>
  parts.map((part) => `data: ${JSON.stringify(part)}\n\n`).join("") + "event: done\ndata: {}\n\n";

/**
 * Stands in for the model behind POST /api/assistant/messages and /compare, which cost money per call and need an
 * API key. It answers in the real SSE format with real catalogue products, so everything from the
 * browser's stream parsing to the cards is exercised; the server's own turn logic has its own tests.
 */
async function fakeAssistant(page: Page) {
  await page.route("**/api/assistant/messages", async (route) => {
    const { caseFile, userText } = route.request().postDataJSON();
    const symptoms =
      caseFile.symptoms.length > 0 ? [] : [{ kind: "symptoms", symptoms: [userText] }];
    let parts: unknown[];
    if (!caseFile.duration) {
      parts = [
        ...symptoms,
        {
          kind: "quickReplies",
          question: "How long has it been going on?",
          field: "duration",
          options: DURATION_OPTIONS,
        },
      ];
    } else if (!caseFile.forWhom) {
      parts = [
        {
          kind: "quickReplies",
          question: "Who is it for?",
          field: "forWhom",
          options: FOR_WHOM_OPTIONS,
        },
      ];
    } else {
      const load = async (id: string) => (await page.request.get(`/api/products/${id}`)).json();
      const [ibuprofen, paracetamol, syrup] = await Promise.all(["1", "2", "7"].map(load));
      parts = [
        { kind: "thinking", steps: [{ label: "Searching the catalogue", done: true }] },
        { kind: "text", text: "A pain reliever that also brings fever down usually helps." },
        {
          kind: "products",
          items: [
            { product: ibuprofen, reason: "Brings fever down", fit: "best" },
            { product: paracetamol, reason: "Gentler on the stomach", fit: "good" },
            { product: syrup, reason: "Loosens a cough", fit: "locked" },
          ],
        },
      ];
    }
    await route.fulfill({ contentType: "text/event-stream", body: sse(parts) });
  });
  // Compare questions go to the model too; this answers the stomach question as it would.
  await page.route("**/api/assistant/compare", async (route) => {
    const parts = [
      { kind: "text", text: "Paracetamol 500mg is gentler. " },
      { kind: "text", text: "Ibuprofen 400mg has a stomach warning." },
      { kind: "row", row: "warnings" },
    ];
    await route.fulfill({ contentType: "text/event-stream", body: sse(parts) });
  });
}

test.describe("Symptom assistant", () => {
  let email = "";

  test.beforeEach(async ({ page }) => {
    email = newEmail();
    await page.request.post("/api/auth/register", { data: { email, password, name: "Ana Weber" } });
    await fakeAssistant(page);
  });

  test("a signed-out visitor logs in and comes back to the chat", async ({ page }) => {
    await page.request.post("/api/auth/logout");

    await page.goto("/assistant");
    await expect(page).toHaveURL(/\/login$/);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page).toHaveURL(/\/assistant$/);
    await expect(page.getByRole("heading", { name: "What’s bothering you today?" })).toBeVisible();
  });

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

  test("starts from a body area: tap throat, pick a symptom, see suggestions", async ({ page }) => {
    await page.goto("/assistant");

    await page.getByRole("button", { name: "Nose and throat" }).click();
    await page.getByRole("button", { name: "Sore throat" }).click();
    await expect(page.getByRole("complementary", { name: "Your consultation" })).toContainText(
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
    // Prescription-only products sit apart from the real options.
    await expect(
      page
        .getByRole("region", { name: "Also used for this, with a prescription" })
        .getByRole("article", { name: "Cough Syrup" }),
    ).toContainText("Needs a prescription");

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

    await expect(page.getByRole("heading", { name: "What’s bothering you today?" })).toBeVisible();
  });

  test("stops a reply that is streaming", async ({ page }) => {
    // Never answers, so the reply is still streaming when Stop is pressed.
    await page.route("**/api/assistant/messages", () => {});
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

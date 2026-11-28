import { expect, test, type Page } from "@playwright/test";
import { DURATION_OPTIONS, FOR_WHOM_OPTIONS } from "../src/features/assistant/utils/caseFile";

// The dev database keeps every account, so each run registers a new email.
const newEmail = () =>
  `e2e-assistant-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
const password = "correct horse";

const sse = (parts: unknown[]) =>
  parts.map((part) => `data: ${JSON.stringify(part)}\n\n`).join("") + "event: done\ndata: {}\n\n";

/**
 * Stands in for the model behind POST /api/assistant/messages, which costs money per call and needs an
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
}

test.describe("Symptom assistant", () => {
  let email = "";

  test.beforeEach(async ({ page }) => {
    email = newEmail();
    await page.request.post("/api/auth/register", { data: { email, password, name: "Ana Weber" } });
    await fakeAssistant(page);
  });

  test("a signed-out visitor's first message waits for login, then is sent", async ({ page }) => {
    await page.request.post("/api/auth/logout");

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "How are you feeling today?" })).toBeVisible();
    const box = page.getByRole("textbox", { name: "Describe your symptoms" });
    await box.fill("Itchy eyes");
    await box.press("Enter");

    await expect(page).toHaveURL(/\/login\?returnTo=%2F$/);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("list", { name: "Conversation" })).toContainText("Itchy eyes");
    await expect(page.getByRole("button", { name: "Since today" })).toBeVisible();
  });

  test("opens from the products page with the search text and answers a starter", async ({
    page,
  }) => {
    await page.goto("/shop?q=sore%20throat");

    await page.getByRole("link", { name: "Ask the assistant" }).click();

    await expect(page).toHaveURL(/\/\?ask=sore\+throat$/);
    await expect(page.getByRole("textbox", { name: "Describe your symptoms" })).toHaveValue(
      "sore throat",
    );

    await page.getByRole("button", { name: "Hay fever" }).click();

    await expect(page.getByRole("list", { name: "Conversation" })).toContainText(
      "Sneezing and itchy eyes",
    );
    await expect(page.getByRole("button", { name: "Since today" })).toBeVisible();
  });

  test("the conversation survives Medicines and back, and a reload", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Dry cough" }).click();
    const conversation = page.getByRole("list", { name: "Conversation" });
    await expect(page.getByRole("button", { name: "Since today" })).toBeVisible();

    await page.getByRole("banner").getByRole("link", { name: "Medicines" }).click();
    await expect(page.getByRole("heading", { name: "Medicines", level: 1 })).toBeVisible();
    await page.getByRole("banner").getByRole("link", { name: "Assistant" }).click();
    await expect(conversation).toContainText("Dry, tickly cough");

    await page.reload();
    await expect(conversation).toContainText("Dry, tickly cough");

    // The logo starts a new conversation.
    await page.getByRole("link", { name: "MedDash" }).click();
    await expect(page.getByRole("heading", { name: "How are you feeling today?" })).toBeVisible();
    await expect(conversation).toHaveCount(0);
  });

  test("asks two questions, then suggests real products that open their page", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Dry cough" }).click();
    await page.getByRole("button", { name: "2–3 days" }).click();
    await page.getByRole("button", { name: "Me", exact: true }).click();

    const suggestions = page.getByRole("list", { name: "Suggested products" });
    await expect(suggestions.getByRole("article", { name: "Ibuprofen 400mg" })).toContainText(
      "Brings fever down",
      { timeout: 15_000 },
    );
    // Prescription-only products are listed after the ones that can be bought.
    await expect(suggestions.getByRole("article").last()).toHaveAccessibleName("Cough Syrup");
    await expect(suggestions.getByRole("article", { name: "Cough Syrup" })).toContainText(
      "Needs a prescription",
    );

    await suggestions.getByRole("link", { name: "Ibuprofen 400mg" }).click();

    await expect(page).toHaveURL(/\/products\/1$/);
    await expect(page.getByRole("heading", { name: "Ibuprofen 400mg" })).toBeVisible();
  });

  test("adds a suggestion to the cart, browses its aisle and comes back to the chat", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Dry cough" }).click();
    await page.getByRole("button", { name: "2–3 days" }).click();
    await page.getByRole("button", { name: "Me", exact: true }).click();

    const suggestions = page.getByRole("list", { name: "Suggested products" });
    await suggestions.getByRole("button", { name: /^Add Ibuprofen 400mg/ }).click();

    await expect(suggestions.getByRole("link", { name: "In cart" })).toBeVisible();
    const cartBar = page.getByRole("link", { name: /^Cart: 1 item/ });
    await expect(cartBar).toContainText("Checkout");
    await expect(
      page.getByRole("banner").getByRole("link", { name: "Cart, 1 item" }),
    ).toBeVisible();

    await page.getByRole("link", { name: "More in Pain relief" }).click();

    await expect(page).toHaveURL(/\/shop\?category=pain-relief$/);
    await expect(page.getByRole("heading", { name: "Medicines", level: 1 })).toBeVisible();
    await page.getByRole("link", { name: "Back to your chat" }).click();

    await expect(page.getByRole("list", { name: "Conversation" })).toContainText(
      "Dry, tickly cough",
    );
    await expect(cartBar).toBeVisible();
  });

  test("asks about a product from Medicines", async ({ page }) => {
    await page.goto("/shop?category=pain-relief");
    // No conversation yet, so there is nothing to go back to.
    await expect(page.getByRole("link", { name: "Back to your chat" })).toHaveCount(0);

    await page.getByRole("link", { name: "Ask the assistant about Paracetamol 500mg" }).click();

    await expect(page.getByRole("textbox", { name: "Describe your symptoms" })).toHaveValue(
      "Tell me about Paracetamol 500mg",
    );
  });

  test("an urgent symptom gets a doctor alert instead of products", async ({ page }) => {
    await page.goto("/");

    const box = page.getByRole("textbox", { name: "Describe your symptoms" });
    await box.fill("Sore throat and chest pain");
    await box.press("Enter");

    await expect(page.getByRole("alert", { name: /This needs a doctor now/ })).toContainText(
      "Call 112",
    );
    await expect(page.getByRole("list", { name: "Suggested products" })).toHaveCount(0);
    await expect(box).toHaveCount(0);

    await page.getByRole("button", { name: "Start over" }).click();

    await expect(page.getByRole("heading", { name: "How are you feeling today?" })).toBeVisible();
  });

  test("stops a reply that is streaming", async ({ page }) => {
    // Never answers, so the reply is still streaming when Stop is pressed.
    await page.route("**/api/assistant/messages", () => {});
    await page.goto("/");

    const box = page.getByRole("textbox", { name: "Describe your symptoms" });
    await box.fill("Upset stomach");
    await box.press("Enter");
    await page.getByRole("button", { name: "Stop" }).click();

    // Exact: the live region also says "Reply stopped." for screen readers.
    await expect(page.getByText("Stopped", { exact: true })).toBeVisible();
    await expect(box).toBeEditable();
  });
});

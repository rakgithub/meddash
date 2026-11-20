import { expect, test } from "@playwright/test";

// The dev database keeps every account, so each run registers a new email.
const newEmail = () => `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
const password = "correct horse";

test.describe("Authentication", () => {
  test("register → log out → log in → log out", async ({ page }) => {
    const email = newEmail();
    await page.goto("/");

    await page.getByRole("link", { name: "Log in" }).click();
    await page.getByRole("link", { name: "Create an account" }).click();
    await expect(page.getByRole("heading", { name: "Create an account", level: 1 })).toBeVisible();

    await page.getByLabel("Name").fill("Ana Weber");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Create account" }).click();

    const banner = page.getByRole("banner");
    await expect(page).toHaveURL(/\/$/);
    await expect(banner.getByText("Ana Weber")).toBeVisible();

    // The session survives a reload: it lives in the httpOnly cookie, not in page state.
    await page.reload();
    await expect(banner.getByText("Ana Weber")).toBeVisible();

    await banner.getByRole("button", { name: "Log out" }).click();
    await expect(banner.getByRole("link", { name: "Log in" })).toBeVisible();
    await page.reload();
    await expect(banner.getByRole("link", { name: "Log in" })).toBeVisible();

    await banner.getByRole("link", { name: "Log in" }).click();
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(banner.getByText("Ana Weber")).toBeVisible();

    await banner.getByRole("button", { name: "Log out" }).click();
    await expect(banner.getByRole("link", { name: "Log in" })).toBeVisible();
  });

  test("a wrong password shows an error and keeps the user logged out", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("Email").fill(newEmail());
    await page.getByLabel("Password").fill("wrong password");
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page.getByRole("alert")).toContainText("don't match an account");
    await expect(page.getByRole("banner").getByRole("link", { name: "Log in" })).toBeVisible();
  });

  test("registering an email twice is refused", async ({ page }) => {
    const email = newEmail();
    const res = await page.request.post("/api/auth/register", {
      data: { email, password, name: "First" },
    });
    expect(res.status()).toBe(201);
    // That request signed this browser context in, and /register sends signed-in users home.
    await page.request.post("/api/auth/logout");

    await page.goto("/register");
    await page.getByLabel("Name").fill("Second");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page.getByRole("alert")).toContainText("already exists");
  });

  test("logging in from a product page returns to it", async ({ page }) => {
    const email = newEmail();
    await page.request.post("/api/auth/register", { data: { email, password, name: "Ana" } });
    // That request signed this browser context in; start from a logged-out state.
    await page.request.post("/api/auth/logout");

    await page.goto("/products/1");
    await page.getByRole("banner").getByRole("link", { name: "Log in" }).click();
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page).toHaveURL(/\/products\/1$/);
    await expect(page.getByRole("heading", { name: "Ibuprofen 400mg", level: 1 })).toBeVisible();
  });
});

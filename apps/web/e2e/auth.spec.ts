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
    const accountMenu = banner.getByRole("button", { name: "Account menu" });
    await expect(page).toHaveURL(/\/$/);
    await expect(accountMenu).toHaveText("AW");

    // The session survives a reload: it lives in the httpOnly cookie, not in page state.
    await page.reload();
    await expect(accountMenu).toBeVisible();

    await accountMenu.click();
    await banner.getByRole("button", { name: "Log out" }).click();
    await expect(banner.getByRole("link", { name: "Log in" })).toBeVisible();
    await page.reload();
    await expect(banner.getByRole("link", { name: "Log in" })).toBeVisible();

    await banner.getByRole("link", { name: "Log in" }).click();
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(accountMenu).toBeVisible();

    await accountMenu.click();
    await banner.getByRole("button", { name: "Log out" }).click();
    await expect(banner.getByRole("link", { name: "Log in" })).toBeVisible();
  });

  test("a wrong password shows an error and keeps the user logged out", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("Email").fill(newEmail());
    await page.getByLabel("Password").fill("wrong password");
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page.getByRole("alert")).toContainText("don't match an account");
    await expect(page.getByRole("heading", { name: "Log in", level: 1 })).toBeVisible();
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

  test("the account menu opens the profile and logs out to home", async ({ page }) => {
    const email = newEmail();
    await page.request.post("/api/auth/register", { data: { email, password, name: "Ana Weber" } });

    await page.goto("/");
    const banner = page.getByRole("banner");
    await banner.getByRole("button", { name: "Account menu" }).click();
    await banner.getByRole("link", { name: "Profile" }).click();

    await expect(page).toHaveURL(/\/profile$/);
    await expect(page.getByRole("heading", { name: "Your profile", level: 1 })).toBeVisible();
    const details = page.getByRole("region", { name: "Account details" });
    await expect(details).toContainText("Ana Weber");
    await expect(details).toContainText(email);

    await banner.getByRole("button", { name: "Account menu" }).click();
    await banner.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(banner.getByRole("link", { name: "Log in" })).toBeVisible();
  });

  test("the profile asks a signed-out visitor to log in, then shows it", async ({ page }) => {
    const email = newEmail();
    await page.request.post("/api/auth/register", { data: { email, password, name: "Ana" } });
    await page.request.post("/api/auth/logout");

    await page.goto("/profile");
    await expect(page).toHaveURL(/\/login$/);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page).toHaveURL(/\/profile$/);
    await expect(page.getByRole("heading", { name: "Your profile", level: 1 })).toBeVisible();
  });

  test("the login page has a slim header without search", async ({ page }) => {
    await page.goto("/login");
    const banner = page.getByRole("banner");
    await expect(banner.getByRole("link", { name: "MedDash" })).toBeVisible();
    await expect(banner.getByRole("search")).toHaveCount(0);
  });
});

import { test, expect } from "@playwright/test";

test.describe("Login", () => {
  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("h1, [role='heading']").first()).toBeVisible();
  });
});

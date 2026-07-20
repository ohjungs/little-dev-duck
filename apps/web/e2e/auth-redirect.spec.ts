import { expect, test } from "@playwright/test";

test("비로그인 사용자가 /에 접근하면 /login으로 리다이렉트된다", async ({
  page,
}) => {
  const response = await page.goto("/");
  expect(new URL(page.url()).pathname).toBe("/login");
  expect(response?.status()).toBeLessThan(400);
});

test("/login에 Google/GitHub 로그인 버튼이 보인다", async ({ page }) => {
  await page.goto("/login");
  await expect(
    page.getByRole("button", { name: "Google로 로그인" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "GitHub로 로그인" }),
  ).toBeVisible();
});

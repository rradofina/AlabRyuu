import { test, expect } from "@playwright/test";

async function unlock(page) {
  await page.addInitScript(() => {
    try { localStorage.removeItem("alabryuu-open"); } catch (e) {}
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const lock = page.locator("#kid-lock");
  await expect(lock).toBeVisible();
  for (const key of ["1", "2", "3", "4"]) {
    await lock.locator(`button[data-key="${key}"]`).click();
  }
  await expect(lock).toHaveCount(0);
  await expect(page.locator("html")).not.toHaveClass(/kid-locked/);
}

async function assertClear(locator) {
  await locator.scrollIntoViewIfNeeded();
  const result = await locator.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const x = Math.min(Math.max(r.left + r.width / 2, 1), window.innerWidth - 2);
    const y = Math.min(Math.max(r.top + r.height / 2, 1), window.innerHeight - 2);
    const top = document.elementFromPoint(x, y);
    const cs = getComputedStyle(el);
    const style = top ? getComputedStyle(top) : null;
    return {
      text: (el.innerText || el.getAttribute("placeholder") || el.getAttribute("aria-label") || "").trim().slice(0, 48),
      w: r.width,
      h: r.height,
      visibility: cs.visibility,
      opacity: cs.opacity,
      color: cs.color,
      top: top ? top.tagName + "." + String(top.className || "").slice(0, 40) : "none",
      owned: !!(top && (top === el || el.contains(top))),
      inView: r.top >= -1 && r.bottom <= window.innerHeight + 1 && r.left >= -1 && r.right <= window.innerWidth + 1,
      pe: style ? style.pointerEvents : "",
    };
  });
  expect(result.inView, JSON.stringify(result)).toBeTruthy();
  expect(result.w, result.text).toBeGreaterThan(8);
  expect(result.h, result.text).toBeGreaterThan(8);
  expect(result.visibility, result.text).toBe("visible");
  expect(Number(result.opacity), result.text).toBeGreaterThan(0.9);
  expect(result.owned, result.text + " covered by " + result.top).toBeTruthy();
}

test("hub title, search, and card labels stay visible after unlock", async ({ page }) => {
  await unlock(page);
  await assertClear(page.locator("h1"));
  await page.locator("#find").click();
  await assertClear(page.locator("#q"));
  const names = page.locator(".card .name");
  expect(await names.count()).toBeGreaterThanOrEqual(10);
  for (let i = 0; i < 10; i++) await assertClear(names.nth(i));
});

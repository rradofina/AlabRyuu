import { test, expect } from "@playwright/test";

async function unlock(page) {
  await page.addInitScript(() => {
    try { localStorage.removeItem("alabryuu-open"); } catch (e) {}
  });
  await page.goto("/games/dino-stomp-3d.html", { waitUntil: "domcontentloaded" });
  const lock = page.locator("#kid-lock");
  await expect(lock).toBeVisible();
  for (const key of ["1", "2", "3", "4"]) {
    await lock.locator(`button[data-key="${key}"]`).click();
  }
  await expect(lock).toHaveCount(0);
  await page.locator("#go").click();
  await expect(page.locator("#title")).toHaveClass(/off/);
  await expect(page.locator("#dock")).toHaveClass(/on/);
}

test("dino stomp 3d loads, unlocks, and takes a hop", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (err) => errors.push(String(err)));
  await unlock(page);
  const gl = await page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return { ok: false, why: "no canvas" };
    const ctx = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (!ctx) return { ok: false, why: "no webgl" };
    const w = canvas.width;
    const h = canvas.height;
    return { ok: w > 8 && h > 8, w: w, h: h, version: ctx.getParameter(ctx.VERSION) };
  });
  expect(gl.ok, JSON.stringify(gl)).toBeTruthy();
  await page.locator("#hop").click();
  await expect.poll(() => page.evaluate(() => document.body.dataset.action)).toBe("hop");
  await page.keyboard.press("ArrowDown");
  await expect.poll(() => page.evaluate(() => document.body.dataset.action)).toBe("stomp");
  await page.locator("#restart").click();
  await expect(page.locator("#fl")).toHaveText("Flowers 0 / 12");
  expect(errors, errors.join("\n")).toEqual([]);
});

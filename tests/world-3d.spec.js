import { test, expect } from "@playwright/test";
import { spawn } from "node:child_process";

const PORT = 8791;
const GAME = "/games/world-3d.html?server=ws://127.0.0.1:" + PORT;

let child;

async function waitHealth() {
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch("http://127.0.0.1:" + PORT + "/health");
      if (res.ok) return;
    } catch (e) {}
    await new Promise(function (r) { setTimeout(r, 100); });
  }
  throw new Error("world server did not start");
}

test.beforeAll(async () => {
  child = spawn("node", ["server.js"], {
    cwd: "server/world3d",
    env: Object.assign({}, process.env, { PORT: String(PORT) }),
    stdio: "ignore"
  });
  await waitHealth();
});

test.afterAll(() => {
  if (child) child.kill();
});

async function unlock(page, path) {
  const errors = [];
  page.on("pageerror", function (err) { errors.push(String(err)); });
  await page.addInitScript(function () {
    try { localStorage.removeItem("alabryuu-open"); } catch (e) {}
  });
  await page.goto(path, { waitUntil: "domcontentloaded" });
  const lock = page.locator("#kid-lock");
  await expect(lock).toBeVisible();
  for (const key of ["1", "2", "3", "4"]) {
    await lock.locator('button[data-key="' + key + '"]').click();
  }
  await expect(lock).toHaveCount(0);
  await expect(page.locator("#title")).toBeVisible();
  await expect.poll(function () { return page.evaluate(function () { return document.body.dataset.ready; }); }).toBe("1");
  return errors;
}

test("play alone on the island", async ({ page }, testInfo) => {
  const errors = await unlock(page, "/games/world-3d.html");
  await expect(page.locator("input, textarea")).toHaveCount(0);
  await expect(page.locator("#home")).toBeVisible();
  await page.locator("#alone").click();
  await expect(page.locator("#title")).toHaveClass(/off/);
  await expect.poll(function () { return page.evaluate(function () { return document.body.dataset.mode; }); }).toBe("alone");
  await expect.poll(function () { return page.evaluate(function () { return document.body.dataset.players; }); }).toBe("1");
  await expect.poll(function () { return page.evaluate(function () { return document.body.dataset.you; }); }).toBe("Green Dino");
  const gl = await page.evaluate(function () {
    const canvas = document.querySelector("canvas");
    const ctx = canvas.getContext("webgl2") || canvas.getContext("webgl");
    return { ok: !!(ctx && canvas.width > 8 && canvas.height > 8) };
  });
  expect(gl.ok).toBeTruthy();
  if (testInfo.project.name === "desktop") {
    await page.screenshot({ path: "/opt/cursor/artifacts/island-alone-desk.png" });
  }
  expect(errors, errors.join("\n")).toEqual([]);
});

test("two players share a room and can see each other", async ({ page, browser }, testInfo) => {
  const errors = await unlock(page, GAME);
  await page.locator("#make").click();
  await expect(page.locator("#room")).toBeVisible();
  const code = (await page.locator("#roomCode").innerText()).replace(/\s/g, "");
  expect(code).toMatch(/^[A-HJ-NP-Z]{4}$/);
  if (testInfo.project.name === "desktop") {
    await page.screenshot({ path: "/opt/cursor/artifacts/island-room-desk.png" });
  }
  const ctx2 = await browser.newContext({
    viewport: testInfo.project.use.viewport,
    hasTouch: !!testInfo.project.use.hasTouch,
    isMobile: !!testInfo.project.use.isMobile,
    deviceScaleFactor: 1,
    userAgent: testInfo.project.use.userAgent
  });
  const page2 = await ctx2.newPage();
  const errors2 = await unlock(page2, GAME);
  await page2.locator("#picks button", { hasText: "Cat" }).click();
  await page2.locator("#colors button", { hasText: "Blue" }).click();
  await page2.locator("#join").click();
  await expect(page2.locator("#pad")).toBeVisible();
  for (const ch of code) {
    await page2.locator('#letters button[data-letter="' + ch + '"]').click();
  }
  await expect(page2.locator("#roomCode")).toHaveText(code);
  await page.locator("#room-go").click();
  await page2.locator("#room-go").click();
  await expect.poll(function () { return page.evaluate(function () { return document.body.dataset.players; }); }).toBe("2");
  await expect.poll(function () { return page2.evaluate(function () { return document.body.dataset.players; }); }).toBe("2");
  await expect.poll(function () { return page.evaluate(function () { return document.body.dataset.visible; }); }).toBe("2");
  await expect.poll(function () { return page2.evaluate(function () { return document.body.dataset.visible; }); }).toBe("2");
  await expect.poll(function () { return page2.evaluate(function () { return document.body.dataset.you; }); }).toBe("Blue Cat");
  await expect.poll(function () { return page.evaluate(function () { return Number(document.body.dataset.spread); }); }).toBeGreaterThan(36);
  await expect.poll(function () { return page2.evaluate(function () { return Number(document.body.dataset.spread); }); }).toBeGreaterThan(36);
  if (testInfo.project.name === "phone") {
    await expect(page.locator("#jump")).toBeVisible();
    await expect(page.locator("#stick")).toBeVisible();
    await page.screenshot({ path: "/opt/cursor/artifacts/island-phone.png" });
  } else {
    await page.screenshot({ path: "/opt/cursor/artifacts/island-two-desk.png" });
  }
  const before = await page2.evaluate(function () { return document.body.dataset.friendx; });
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(600);
  await page.keyboard.up("ArrowRight");
  await expect.poll(function () { return page2.evaluate(function () { return document.body.dataset.friendx; }); }).not.toBe(before);
  await page.locator('[data-emote="wave"]').click();
  await expect.poll(function () { return page2.evaluate(function () { return document.body.dataset.emote; }); }).toBe("wave");
  expect(errors, errors.join("\n")).toEqual([]);
  expect(errors2, errors2.join("\n")).toEqual([]);
  await ctx2.close();
});

test("a sleeping server shows waking up, then plays alone", async ({ page }) => {
  const errors = await unlock(page, "/games/world-3d.html?server=ws://127.0.0.1:9&wakeMs=1200");
  await page.locator("#make").click();
  await expect(page.locator("#wake")).toBeVisible();
  await expect(page.locator("#wake")).toContainText("Waking up the world");
  await expect.poll(function () {
    return page.evaluate(function () { return document.body.dataset.mode; });
  }, { timeout: 8000 }).toBe("alone");
  await expect(page.locator("#say")).toContainText("sleepy");
  expect(errors, errors.join("\n")).toEqual([]);
});

test("home returns to the together hub", async ({ page }) => {
  await unlock(page, "/games/world-3d.html?hub=together");
  await expect(page.locator("#home")).toHaveAttribute("href", "/together/");
});

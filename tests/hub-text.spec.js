import { test, expect } from "@playwright/test";
import zlib from "node:zlib";

function pngPixel(buf, x, y) {
  let o = 8;
  const idats = [];
  let w = 0;
  let h = 0;
  while (o < buf.length) {
    const len = buf.readUInt32BE(o);
    const type = buf.toString("ascii", o + 4, o + 8);
    const data = buf.subarray(o + 8, o + 8 + len);
    if (type === "IHDR") {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
    } else if (type === "IDAT") idats.push(data);
    else if (type === "IEND") break;
    o += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idats));
  const stride = w * 4;
  let prev = Buffer.alloc(stride);
  const rows = [];
  for (let row = 0; row < h; row++) {
    const filter = raw[row * (stride + 1)];
    const scan = raw.subarray(row * (stride + 1) + 1, row * (stride + 1) + 1 + stride);
    const cur = Buffer.alloc(stride);
    for (let i = 0; i < stride; i++) {
      const left = i >= 4 ? cur[i - 4] : 0;
      const up = prev[i];
      const ul = i >= 4 ? prev[i - 4] : 0;
      let v = scan[i];
      if (filter === 1) v = (v + left) & 255;
      else if (filter === 2) v = (v + up) & 255;
      else if (filter === 3) v = (v + ((left + up) >> 1)) & 255;
      else if (filter === 4) {
        const p = left + up - ul;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - ul);
        const pr = pa <= pb && pa <= pc ? left : pb <= pc ? up : ul;
        v = (v + pr) & 255;
      }
      cur[i] = v;
    }
    rows.push(cur);
    prev = cur;
  }
  const line = rows[Math.max(0, Math.min(h - 1, y))];
  const i = Math.max(0, Math.min(w - 1, x)) * 4;
  return [line[i], line[i + 1], line[i + 2]];
}

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
  await page.locator("#find-x").click();
  const names = page.locator(".card .name");
  expect(await names.count()).toBeGreaterThanOrEqual(10);
  for (let i = 0; i < 10; i++) await assertClear(names.nth(i));

  const painted = await page.evaluate(() => {
    function box(el) {
      const r = el.getBoundingClientRect();
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
    }
    function hits(a, b) {
      return a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1;
    }
    const title = box(document.querySelector("h1"));
    const labels = [...document.querySelectorAll(".card .name")].slice(0, 10).map(box);
    const leaves = [...document.querySelectorAll(".leaf")].map((el) => {
      const r = box(el);
      const onScreen = r.width > 8 && r.height > 8 && r.bottom > 8 && r.right > 8 && r.top < innerHeight - 8 && r.left < innerWidth - 8;
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const margin = cx < innerWidth * 0.2 || cx > innerWidth * 0.8;
      return { el, r, onScreen, margin, cx, cy };
    });
    const shown = leaves.filter((leaf) => leaf.onScreen);
    const blocked = shown.filter((leaf) => hits(leaf.r, title) || labels.some((label) => hits(leaf.r, label)));
    const side = shown.find((leaf) => leaf.margin && leaf.cy > 0 && leaf.cy < innerHeight);
    let hit = null;
    if (side) {
      const top = document.elementFromPoint(side.cx, side.cy);
      hit = {
        cx: Math.round(side.cx),
        cy: Math.round(side.cy),
        tag: top ? top.tagName : "none",
        leaf: !!(top && top.closest && top.closest(".leaf")),
      };
    }
    return {
      shown: shown.length,
      blocked: blocked.length,
      hit,
    };
  });
  expect(painted.shown, "on-screen leaves").toBeGreaterThanOrEqual(6);
  expect(painted.blocked, "leaves overlapping title or card labels").toBe(0);
  expect(painted.hit && painted.hit.leaf, JSON.stringify(painted.hit)).toBeTruthy();

  const shot = await page.screenshot({
    clip: { x: painted.hit.cx, y: painted.hit.cy, width: 2, height: 2 },
  });
  const [r, g, b] = pngPixel(shot, 0, 0);
  const plainBackground = r < 50 && g < 50 && b < 90;
  expect(plainBackground, `leaf pixel rgb(${r},${g},${b})`).toBeFalsy();
});

import { test, expect } from "@playwright/test";
import fs from "node:fs";
import zlib from "node:zlib";

const errors = [];

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function pngChunk(type, data) {
  const t = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([t, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function solidPng(w, h, r, g, b) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    const row = y * (w * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < w; x++) {
      const i = row + 1 + x * 4;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
      raw[i + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", zlib.deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function touchProject(testInfo) {
  return testInfo.project.name === "phone";
}

async function unlock(page) {
  await page.goto("/games/book-cover.html", { waitUntil: "domcontentloaded" });
  const lock = page.locator("#kid-lock");
  await expect(lock).toBeVisible();
  await lock.locator('button[data-key="0"]').click();
  await lock.locator('button[data-key="0"]').click();
  await lock.locator('button[data-key="0"]').click();
  await lock.locator('button[data-key="0"]').click();
  await expect(lock).toBeVisible();
  await page.waitForTimeout(500);
  for (const key of ["1", "2", "3", "4"]) {
    await lock.locator(`button[data-key="${key}"]`).click();
  }
  await expect(lock).toBeHidden();
  await expect(page.locator("#title-out")).toHaveText("The Hidden Trail");
  await page.evaluate(() => document.fonts.ready);
}

async function centerOf(locator) {
  const box = await locator.boundingBox();
  expect(box, "missing box").toBeTruthy();
  return { x: box.x + box.width / 2, y: box.y + box.height / 2, box };
}

async function settle(page) {
  await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
}

async function drag(page, from, to, touch) {
  if (touch) {
    const client = await page.context().newCDPSession(page);
    const steps = 10;
    await client.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: Math.round(from.x), y: Math.round(from.y), id: 1 }],
    });
    for (let i = 1; i <= steps; i++) {
      await client.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{
          x: Math.round(from.x + (to.x - from.x) * (i / steps)),
          y: Math.round(from.y + (to.y - from.y) * (i / steps)),
          id: 1,
        }],
      });
    }
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await client.detach();
  } else {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 12 });
    await page.mouse.up();
  }
  await settle(page);
}

async function numAttr(locator, name) {
  const raw = await locator.getAttribute(name);
  return Number(raw);
}

async function saveDownload(page) {
  const pending = page.waitForEvent("download");
  await page.locator("#savepng").click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe("book-cover.png");
  const file = await download.path();
  const buf = fs.readFileSync(file);
  expect(buf.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  return buf;
}

async function countPng(page, buf, predSource) {
  const b64 = buf.toString("base64");
  return page.evaluate(async ({ b64, predSource }) => {
    const img = new Image();
    img.src = "data:image/png;base64," + b64;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const pred = new Function("r", "g", "b", "a", "return (" + predSource + ");");
    let n = 0;
    for (let i = 0; i < data.length; i += 16) {
      if (pred(data[i], data[i + 1], data[i + 2], data[i + 3])) n++;
    }
    return n;
  }, { b64, predSource });
}

async function inkOpaque(page) {
  return page.evaluate(() => {
    const canvas = document.getElementById("ink");
    const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
    let n = 0;
    for (let i = 3; i < data.length; i += 16) if (data[i] > 24) n++;
    return n;
  });
}

async function pageBox(page) {
  return page.evaluate(() => ({
    sx: document.documentElement.scrollLeft,
    sy: document.documentElement.scrollTop,
    sw: document.documentElement.scrollWidth,
    sh: document.documentElement.scrollHeight,
    cw: document.documentElement.clientWidth,
    ch: document.documentElement.clientHeight,
  }));
}

test.beforeEach(async ({ page }) => {
  errors.length = 0;
  page.on("pageerror", (err) => errors.push("pageerror: " + err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push("console: " + msg.text());
  });
  page.on("response", (res) => {
    if (res.status() >= 400) errors.push("http " + res.status() + " " + res.url());
  });
});

test.afterEach(() => {
  expect(errors, errors.join("\n")).toEqual([]);
});

test("unlocks with 1234 after a wrong code", async ({ page }) => {
  await unlock(page);
  const body = await page.locator("body").innerText();
  expect(body).not.toContain("\u2014");
  expect(body).not.toContain("\u2013");
  await expect(page.locator("#undo")).toBeDisabled();
  await expect(page.locator("#redo")).toBeDisabled();
  const box = await pageBox(page);
  expect(box.sx).toBe(0);
  expect(box.sy).toBe(0);
  expect(box.sw).toBeLessThanOrEqual(box.cw + 1);
  expect(box.sh).toBeLessThanOrEqual(box.ch + 1);
});

test("top bar switches views, parts, surprise, start over, and saves a png", async ({ page }) => {
  await unlock(page);
  for (const view of ["spine", "back", "wrap", "front"]) {
    await page.locator(`.views [data-view="${view}"]`).click();
    await expect(page.locator("#book")).toHaveAttribute("data-view", view);
    await expect(page.locator(`.views [data-view="${view}"]`)).toHaveClass(/on/);
  }
  await page.locator("#parts-btn").click();
  await expect(page.locator("#parts-btn")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".callout").first()).toBeVisible();
  await page.locator("#parts-btn").click();
  await expect(page.locator("#parts-btn")).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator(".callout")).toHaveCount(0);

  await page.locator("#surprise").click();
  await expect(page.locator("#toast")).toHaveText("A new cover, just for you.");
  await expect(page.locator("#book")).toHaveAttribute("data-view", "front");

  await page.locator("#restart").click();
  await expect(page.locator("#toast")).toHaveText("A fresh cover is ready.");
  await expect(page.locator("#f-title")).toHaveValue("My Book");
  await expect(page.locator("#title-out")).toHaveText("My Book");
  await expect(page.locator(".sticker")).toHaveCount(0);

  const buf = await saveDownload(page);
  expect(buf.length).toBeGreaterThan(1000);
  await expect(page.locator("#toast")).toHaveText("Your cover PNG is ready.");
});

test("text tab edits every field, font, size, and color, and the title drags", async ({ page }, testInfo) => {
  await unlock(page);
  const touch = touchProject(testInfo);
  await page.locator('[data-tab="text"]').click();
  await page.locator("#f-title").fill("River Story");
  await page.locator("#f-title").blur();
  await page.locator("#undo").click();
  await expect(page.locator("#f-title")).not.toHaveValue("River Story");
  await page.locator("#redo").click();
  await expect(page.locator("#f-title")).toHaveValue("River Story");
  await page.locator("#f-author").fill("Nia");
  await page.locator("#f-illus").fill("Omar");
  await page.locator("#f-blurb").fill("A boat finds a quiet island.");
  await expect(page.locator("#title-out")).toHaveText("River Story");
  await expect(page.locator("#by-out")).toHaveText("by Nia");
  await expect(page.locator("#pics-out")).toHaveText("Pictures by Omar");
  await expect(page.locator("#blurb-out")).toHaveText("A boat finds a quiet island.");

  for (const font of ["story", "play", "clean"]) {
    await page.locator(`#fonts [data-font="${font}"]`).click();
    await expect(page.locator("#book")).toHaveClass(new RegExp("font-" + font));
  }
  for (const size of ["s", "m", "l"]) {
    await page.locator(`#sizes [data-size="${size}"]`).click();
    await expect(page.locator("#lockup")).toHaveClass(new RegExp("size-" + size));
  }
  const swatches = page.locator("#text-colors button");
  const n = await swatches.count();
  expect(n).toBeGreaterThan(4);
  for (let i = 0; i < n; i++) {
    await swatches.nth(i).click();
    await expect(swatches.nth(i)).toHaveClass(/on/);
  }

  const title = page.locator("#title-out");
  const front = await centerOf(page.locator("#front-plate"));
  const start = await centerOf(title);
  const before = await numAttr(title, "data-y");
  await drag(page, start, { x: start.x + 24, y: start.y - 36 }, touch);
  const after = await numAttr(title, "data-y");
  expect(after).toBeLessThan(before - 1);
  expect(after).toBeGreaterThanOrEqual(-46);
  expect(await numAttr(title, "data-x")).toBeLessThanOrEqual(40);
  await expect(page.locator("#lockup")).toHaveClass(/on/);
  const handle = await centerOf(page.locator("#lockup .handle.grow"));
  expect(Math.min(handle.box.width, handle.box.height)).toBeGreaterThanOrEqual(36);

  await page.locator('[data-view="back"]').click();
  await page.locator('[data-view="front"]').click();
  await expect(page.locator("#lockup")).toHaveClass(/on/);
  await page.locator('[data-tab="colors"]').click();
  await page.locator('[data-tab="text"]').click();
  await expect(page.locator("#lockup")).toHaveClass(/on/);
  const still = await numAttr(title, "data-y");
  expect(Math.abs(still - after)).toBeLessThan(0.2);

  const again = await centerOf(title);
  await drag(page, again, { x: front.box.x - 80, y: front.box.y - 80 }, touch);
  expect(await numAttr(title, "data-x")).toBeGreaterThanOrEqual(-40);
  expect(await numAttr(title, "data-y")).toBeGreaterThanOrEqual(-46);

  await page.locator("#add-words").click();
  const words = page.locator('.sticker[data-type="text"]');
  await expect(words).toHaveCount(1);
  await expect(words).toContainText("Hello");
  await page.locator("#undo").click();
  await expect(words).toHaveCount(0);
  await page.locator("#redo").click();
  await expect(words).toHaveCount(1);
  const wordBox = await centerOf(words);
  const wx = await numAttr(words, "data-x");
  await drag(page, wordBox, { x: wordBox.x + 40, y: wordBox.y + 16 }, touch);
  expect(await numAttr(words, "data-x")).toBeGreaterThan(wx + 2);
  await words.locator(".handle.grow").click({ force: true });
  const grown = await numAttr(words, "data-s");
  const grow = await centerOf(words.locator(".handle.grow"));
  await drag(page, grow, { x: grow.x + 30, y: grow.y + 30 }, touch);
  expect(await numAttr(words, "data-s")).toBeGreaterThan(grown + 0.04);
  const rot = await centerOf(words.locator(".handle.rot"));
  const angle = await numAttr(words, "data-r");
  await drag(page, rot, { x: rot.x + 40, y: rot.y + 10 }, touch);
  expect(await numAttr(words, "data-r")).not.toBe(angle);
});

test("every sticker can be dragged, resized, rotated, and deleted", async ({ page }, testInfo) => {
  await unlock(page);
  const touch = touchProject(testInfo);
  await page.locator("#restart").click();
  await page.locator('[data-tab="pictures"]').click();
  const kinds = ["dragon", "dino", "fish", "whale", "star", "rocket", "castle", "tree", "moon", "sun", "heart", "duck"];
  const names = ["Dragon", "Dino", "Fish", "Whale", "Star", "Rocket", "Castle", "Tree", "Moon", "Sun", "Heart", "Duck"];
  const front = page.locator("#front-plate");
  for (let i = 0; i < kinds.length; i++) {
    await page.locator("#pic-grid button").filter({ hasText: names[i] }).click();
    const sticker = page.locator(`.sticker[data-kind="${kinds[i]}"]`);
    await expect(sticker).toHaveCount(1);
    await expect(sticker).toHaveClass(/on/);
    const spot = await centerOf(sticker);
    const beforeX = await numAttr(sticker, "data-x");
    const beforeY = await numAttr(sticker, "data-y");
    await drag(page, spot, { x: spot.x + 36, y: spot.y + 18 }, touch);
    const movedX = await numAttr(sticker, "data-x");
    const movedY = await numAttr(sticker, "data-y");
    const plate = await front.boundingBox();
    const expectX = beforeX + (36 / plate.width) * 100;
    const expectY = beforeY + (18 / plate.height) * 100;
    expect(Math.abs(movedX - expectX)).toBeLessThan(6);
    expect(Math.abs(movedY - expectY)).toBeLessThan(6);
    expect(movedX).toBeGreaterThanOrEqual(10);
    expect(movedX).toBeLessThanOrEqual(90);
    expect(movedY).toBeGreaterThanOrEqual(10);
    expect(movedY).toBeLessThanOrEqual(86);

    const grow = await centerOf(sticker.locator(".handle.grow"));
    expect(Math.min(grow.box.width, grow.box.height)).toBeGreaterThanOrEqual(36);
    const sizeBefore = await numAttr(sticker, "data-s");
    await drag(page, grow, { x: grow.x + 28, y: grow.y + 28 }, touch);
    expect(await numAttr(sticker, "data-s")).toBeGreaterThan(sizeBefore + 0.04);

    const rot = await centerOf(sticker.locator(".handle.rot"));
    const rotBefore = await numAttr(sticker, "data-r");
    await drag(page, rot, { x: rot.x + 36, y: rot.y + 8 }, touch);
    expect(await numAttr(sticker, "data-r")).not.toBe(rotBefore);

    await page.locator('[data-view="spine"]').click();
    await page.locator('[data-tab="text"]').click();
    await page.locator('[data-view="front"]').click();
    await page.locator('[data-tab="pictures"]').click();
    await expect(sticker).toHaveClass(/on/);
    const kept = await numAttr(sticker, "data-x");
    expect(Math.abs(kept - movedX)).toBeLessThan(0.2);
    await expect(sticker.locator(".handle.del")).toBeVisible();
    await sticker.locator(".handle.del").click();
    await expect(page.locator(".sticker")).toHaveCount(0);
  }
});

test("colors tab sets every starter, color, pattern, and publisher", async ({ page }) => {
  await unlock(page);
  await page.locator('[data-tab="colors"]').click();
  const starters = {
    adventure: "The Hidden Trail",
    ocean: "Sea of Stars",
    space: "Moon Rocket",
    fairy: "The Kind Castle",
    dinosaur: "Dino Day",
    mystery: "The Quiet Key",
  };
  for (const id of Object.keys(starters)) {
    await page.locator(`#tmpls [data-tmpl="${id}"]`).click();
    await expect(page.locator("#title-out")).toHaveText(starters[id]);
    await expect(page.locator(`#tmpls [data-tmpl="${id}"]`)).toHaveClass(/on/);
  }
  const colors = page.locator("#cover-colors button");
  expect(await colors.count()).toBe(10);
  for (let i = 0; i < 10; i++) {
    const c1 = await colors.nth(i).getAttribute("data-c1");
    await colors.nth(i).click();
    await expect(colors.nth(i)).toHaveClass(/on/);
    await expect.poll(async () => page.evaluate(() => window.bookCover.state().c1)).toBe(c1);
  }
  for (const pattern of ["none", "dots", "stripes", "stars", "waves", "diamonds"]) {
    await page.locator(`#patterns [data-pattern="${pattern}"]`).click();
    await expect(page.locator(`#patterns [data-pattern="${pattern}"]`)).toHaveClass(/on/);
    const cls = await page.locator("#front-pattern").getAttribute("class");
    if (pattern === "none") expect(cls).toBe("pattern");
    else expect(cls).toContain(pattern);
  }
  const pubs = { star: "Star Press", moon: "Moon House", oak: "Oak Books", wave: "Wave Press" };
  for (const id of Object.keys(pubs)) {
    await page.locator(`#pubs [data-pub="${id}"]`).click();
    await expect(page.locator("#pub-name")).toHaveText(pubs[id]);
    await expect(page.locator(`#pubs [data-pub="${id}"]`)).toHaveClass(/on/);
  }
});

test("draw tab tools leave ink that saves into the png", async ({ page }, testInfo) => {
  await unlock(page);
  const touch = touchProject(testInfo);
  await page.locator("#restart").click();
  await page.locator('[data-tab="draw"]').click();
  await expect(page.locator('[data-sheet="draw"]')).toBeVisible();
  await page.locator("#ink-color").evaluate((el) => {
    el.value = "#b91c1c";
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  const brushes = page.locator("#brushes button");
  expect(await brushes.count()).toBe(6);
  for (let i = 0; i < 6; i++) {
    await brushes.nth(i).click();
    await expect(brushes.nth(i)).toHaveClass(/on/);
  }
  await page.locator('#brushes [data-brush="#b91c1c"]').click();
  for (const size of ["0.012", "0.02", "0.034"]) {
    await page.locator(`#brush-sizes [data-bw="${size}"]`).click();
    await expect(page.locator(`#brush-sizes [data-bw="${size}"]`)).toHaveClass(/on/);
  }
  for (const style of ["marker", "crayon", "glitter"]) {
    await page.locator(`#brush-styles [data-style="${style}"]`).click();
    await expect(page.locator(`#brush-styles [data-style="${style}"]`)).toHaveClass(/on/);
  }
  await page.locator('#brush-styles [data-style="marker"]').click();
  await page.locator('#brush-sizes [data-bw="0.034"]').click();

  const plate = await page.locator("#front-plate").boundingBox();
  const tools = ["draw", "line", "circle", "star", "heart", "rect"];
  for (let i = 0; i < tools.length; i++) {
    await page.locator(`#draw-tools [data-tool="${tools[i]}"]`).click();
    await expect(page.locator(`#draw-tools [data-tool="${tools[i]}"]`)).toHaveClass(/on/);
    const x1 = plate.x + plate.width * (0.2 + (i % 3) * 0.2);
    const y1 = plate.y + plate.height * (0.18 + Math.floor(i / 3) * 0.22);
    await drag(page, { x: x1, y: y1 }, { x: x1 + plate.width * 0.16, y: y1 + plate.height * 0.12 }, touch);
  }
  expect(await inkOpaque(page)).toBeGreaterThan(20);

  await page.locator('#draw-tools [data-tool="erase"]').click();
  await drag(
    page,
    { x: plate.x + plate.width * 0.2, y: plate.y + plate.height * 0.18 },
    { x: plate.x + plate.width * 0.4, y: plate.y + plate.height * 0.32 },
    touch
  );
  await page.locator('#draw-tools [data-tool="fill"]').click();
  await drag(
    page,
    { x: plate.x + plate.width * 0.08, y: plate.y + plate.height * 0.08 },
    { x: plate.x + plate.width * 0.08, y: plate.y + plate.height * 0.08 },
    touch
  );
  const strokes = await page.evaluate(() => window.bookCover.state().strokes.map((s) => s.tool));
  expect(strokes).toEqual(expect.arrayContaining(["draw", "line", "circle", "star", "heart", "rect", "erase", "fill"]));

  await page.locator('#draw-tools [data-tool="move"]').click();
  const frame = page.locator("#art-frame");
  await expect(frame).toHaveClass(/on/);
  const origin = await centerOf(page.locator("#front-plate"));
  const ax = await numAttr(frame, "data-x");
  await drag(page, origin, { x: origin.x + 28, y: origin.y - 18 }, touch);
  expect(await numAttr(frame, "data-x")).toBeGreaterThan(ax + 0.02);
  const grow = await centerOf(frame.locator(".handle.grow"));
  const scale = await numAttr(frame, "data-s");
  await drag(page, grow, { x: grow.x + 30, y: grow.y + 8 }, touch);
  expect(await numAttr(frame, "data-s")).toBeGreaterThan(scale + 0.02);
  const rot = await centerOf(frame.locator(".handle.rot"));
  const angle = await numAttr(frame, "data-r");
  await drag(page, rot, { x: rot.x + 30, y: rot.y + 12 }, touch);
  expect(await numAttr(frame, "data-r")).not.toBe(angle);

  await page.locator('[data-tab="text"]').click();
  await page.locator('[data-view="spine"]').click();
  await page.locator('[data-view="front"]').click();
  await page.locator('[data-tab="draw"]').click();
  await expect(frame).toHaveClass(/on/);

  await page.locator("#clear-draw").click();
  expect(await page.evaluate(() => window.bookCover.state().strokes.length)).toBe(0);
  await page.locator("#undo").click();
  expect(await page.evaluate(() => window.bookCover.state().strokes.length)).toBeGreaterThan(0);
  await page.locator('#draw-tools [data-tool="draw"]').click();

  const buf = await saveDownload(page);
  const reds = await countPng(page, buf, "r > 150 && g < 100 && b < 100 && a > 180");
  expect(reds).toBeGreaterThan(8);
});

test("a photo can be placed, filtered, fitted, and saved", async ({ page }, testInfo) => {
  await unlock(page);
  const touch = touchProject(testInfo);
  await page.locator("#restart").click();
  await page.locator('[data-tab="pictures"]').click();
  await expect(page.locator("#photo-file")).toHaveAttribute("accept", "image/*");
  const big = solidPng(800, 500, 255, 0, 128);
  await page.locator("#photo-file").setInputFiles({ name: "snap.png", mimeType: "image/png", buffer: big });
  const photo = page.locator('.sticker[data-type="photo"]');
  await expect(photo).toBeVisible();
  await expect.poll(async () => photo.locator("img").evaluate((img) => img.naturalWidth)).toBeLessThanOrEqual(480);
  await expect.poll(async () => photo.locator("img").evaluate((img) => img.naturalHeight)).toBeLessThanOrEqual(480);

  const spot = await centerOf(photo);
  const before = await numAttr(photo, "data-x");
  await drag(page, spot, { x: spot.x + 30, y: spot.y + 12 }, touch);
  expect(await numAttr(photo, "data-x")).toBeGreaterThan(before + 2);
  const grow = await centerOf(photo.locator(".handle.grow"));
  const size = await numAttr(photo, "data-s");
  await drag(page, grow, { x: grow.x + 26, y: grow.y + 26 }, touch);
  expect(await numAttr(photo, "data-s")).toBeGreaterThan(size);
  const rot = await centerOf(photo.locator(".handle.rot"));
  const angle = await numAttr(photo, "data-r");
  await drag(page, rot, { x: rot.x + 34, y: rot.y + 6 }, touch);
  expect(await numAttr(photo, "data-r")).not.toBe(angle);

  await page.locator('[data-filter="warm"]').click();
  await expect(photo).toHaveClass(/warm/);
  await expect(page.locator('[data-filter="warm"]')).toHaveClass(/on/);
  await page.locator('[data-filter="bw"]').click();
  await expect(photo).toHaveClass(/bw/);
  await page.locator('[data-filter="none"]').click();
  await expect(photo).not.toHaveClass(/warm|bw/);

  await page.locator("#cover-fit").click();
  await expect(page.locator("#toast")).toHaveText("That photo fills the cover.");
  const bg = await page.locator("#cover-photo").evaluate((el) => el.style.backgroundImage);
  expect(bg).toContain("data:image/jpeg");

  await page.evaluate(() => {
    const orig = localStorage.setItem.bind(localStorage);
    let tripped = false;
    localStorage.setItem = function (key, value) {
      if (key === "alabryuu-book-cover" && !tripped) {
        tripped = true;
        const err = new Error("quota");
        err.name = "QuotaExceededError";
        throw err;
      }
      return orig(key, value);
    };
  });
  await page.locator('[data-tab="text"]').click();
  await page.locator("#f-title").fill("Photo Book");
  await expect(page.locator("#toast")).toHaveText("The photo stays for now, but this device could not store it.");
  await expect(photo).toBeVisible();

  const buf = await saveDownload(page);
  const pinks = await countPng(page, buf, "r > 180 && b > 70 && g < 120 && a > 180");
  expect(pinks).toBeGreaterThan(10);

  await photo.locator(".handle.del").click();
  await expect(photo).toHaveCount(0);
});

test("parts explanations and the full quiz", async ({ page }) => {
  await unlock(page);
  await page.locator('[data-tab="parts"]').click();
  await page.locator("#parts-toggle").click();
  await expect(page.locator(".callout").first()).toBeVisible();
  const parts = [
    ["Title", "The title is the name of the book."],
    ["Author", "The author wrote the words."],
    ["Illustrator", "The illustrator drew the pictures."],
    ["Cover Picture", "The cover picture shows what the book is about."],
    ["Spine", "The spine is the thin side that faces out on a shelf."],
    ["Front Cover", "The front cover is the face of the book."],
    ["Back Cover", "The back cover tells a little about the story."],
    ["Blurb", "The blurb is a short note about the story."],
    ["Publisher", "The publisher is the team that made the book."],
    ["Barcode", "The barcode helps a shop find the book."],
  ];
  for (const [name, say] of parts) {
    await page.locator("#part-list button").filter({ hasText: name }).click();
    await expect(page.locator("#explain-text")).toHaveText(say);
    await page.locator("#speak").click();
    await page.locator("#explain-x").click();
    await expect(page.locator("#explain")).toBeHidden();
  }
  await page.locator("#parts-toggle").click();
  await expect(page.locator(".callout")).toHaveCount(0);

  await page.locator('[data-tab="quiz"]').click();
  await expect(page.locator("#ask")).toHaveText("Tap the Title!");
  await page.locator("#ask-hear").click();
  await page.locator('.callout[data-part="spine"]').click();
  await expect(page.locator("#feedback")).toContainText("Look again");
  const order = ["title", "author", "illustrator", "picture", "spine", "front", "back", "blurb", "publisher", "barcode"];
  const asks = [
    "Tap the Title!",
    "Where is the Author?",
    "Where is the Illustrator?",
    "Tap the Cover Picture!",
    "Find the Spine!",
    "Find the Front Cover!",
    "Tap the Back Cover!",
    "Where is the Blurb?",
    "Tap the Publisher!",
    "Find the Barcode!",
  ];
  for (let i = 0; i < order.length; i++) {
    await expect(page.locator("#ask")).toHaveText(asks[i]);
    if (i === 4) {
      const miss = await page.evaluate(() => {
        const stage = document.getElementById("stage");
        const r = stage.getBoundingClientRect();
        const spots = [
          [r.left + 6, r.top + r.height * 0.62],
          [r.right - 8, r.bottom - 12],
          [r.left + 6, r.bottom - 12],
        ];
        for (const [x, y] of spots) {
          const el = document.elementFromPoint(x, y);
          if (el && !el.closest(".hot, .callout, button, a, .panel, .bar")) return { x, y };
        }
        return null;
      });
      expect(miss).toBeTruthy();
      await page.mouse.click(miss.x, miss.y);
      await expect(page.locator("#feedback")).toContainText("Look again");
    }
    const hotPoint = await page.evaluate((part) => {
      const hot = document.querySelector('.hot[data-part="' + part + '"]');
      if (!hot) return null;
      const r = hot.getBoundingClientRect();
      const x = r.left + Math.min(r.width / 2, 24);
      const y = r.top + Math.min(r.height / 2, 24);
      const el = document.elementFromPoint(x, y);
      if (el && el.closest('.hot[data-part="' + part + '"]')) return { x, y };
      return null;
    }, order[i]);
    if (hotPoint) await page.mouse.click(hotPoint.x, hotPoint.y);
    else await page.locator(`.callout[data-part="${order[i]}"]`).click();
    await expect(page.locator("#feedback")).toContainText("Yes!");
    if (i < order.length - 1) await expect(page.locator("#ask")).toHaveText(asks[i + 1]);
  }
  await expect(page.locator("#ask")).toHaveText("All the parts!");
  await expect(page.locator("#feedback")).toHaveText("You found every part. Nice work.");
  await expect(page.locator("#stars i.on")).toHaveCount(10);
  await page.locator("#quiz-again").click();
  await expect(page.locator("#ask")).toHaveText("Tap the Title!");
});

test("autosave keeps the cover after reload", async ({ page }) => {
  await unlock(page);
  await page.locator("#restart").click();
  await page.locator('[data-tab="text"]').click();
  await page.locator("#f-title").fill("Saved Title");
  await page.locator("#f-author").fill("Kept");
  await page.waitForTimeout(250);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("#kid-lock")).toHaveCount(0);
  await expect(page.locator("#f-title")).toHaveValue("Saved Title");
  await expect(page.locator("#title-out")).toHaveText("Saved Title");
  await expect(page.locator("#f-author")).toHaveValue("Kept");
});

test("drags stay inside the cover and do not scroll or stick", async ({ page }, testInfo) => {
  await unlock(page);
  const touch = touchProject(testInfo);
  await page.locator("#restart").click();
  await page.locator('[data-tab="pictures"]').click();
  const star = page.locator("#pic-grid button").filter({ hasText: "Star" });
  for (let i = 0; i < 6; i++) await star.click();
  await expect(page.locator(".sticker")).toHaveCount(6);
  await page.locator("#restart").click();
  await page.locator('[data-tab="pictures"]').click();
  await star.click();
  const sticker = page.locator('.sticker[data-kind="star"]');
  await expect(sticker).toHaveCount(1);
  const spot = await centerOf(sticker);
  const plate = await page.locator("#front-plate").boundingBox();
  await drag(page, spot, { x: plate.x - 120, y: plate.y - 160 }, touch);
  const x = await numAttr(sticker, "data-x");
  const y = await numAttr(sticker, "data-y");
  expect(x).toBeGreaterThanOrEqual(10);
  expect(x).toBeLessThanOrEqual(16);
  expect(y).toBeGreaterThanOrEqual(10);
  expect(y).toBeLessThanOrEqual(16);
  const held = await centerOf(sticker);
  async function readX() {
    return numAttr(page.locator('.sticker[data-kind="star"]').first(), "data-x");
  }
  if (touch) {
    const client = await page.context().newCDPSession(page);
    await client.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: Math.round(held.x), y: Math.round(held.y), id: 1 }],
    });
    await client.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: Math.round(held.x + 24), y: Math.round(held.y), id: 1 }],
    });
    await settle(page);
    await page.evaluate(() => document.querySelector('[data-tab="colors"]').click());
    const mid = await readX();
    expect(Math.abs(mid - x)).toBeGreaterThan(1);
    await client.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: Math.round(held.x + 80), y: Math.round(held.y + 40), id: 1 }],
    });
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await client.detach();
    await settle(page);
    expect(Math.abs((await readX()) - mid)).toBeLessThan(0.6);
  } else {
    await page.mouse.move(held.x, held.y);
    await page.mouse.down();
    await page.mouse.move(held.x + 24, held.y, { steps: 4 });
    await settle(page);
    await page.evaluate(() => document.querySelector('[data-tab="colors"]').click());
    const mid = await readX();
    expect(Math.abs(mid - x)).toBeGreaterThan(1);
    await page.mouse.move(held.x + 90, held.y + 40, { steps: 4 });
    await page.mouse.up();
    await settle(page);
    expect(Math.abs((await readX()) - mid)).toBeLessThan(0.6);
  }
  const box = await pageBox(page);
  expect(box.sx).toBe(0);
  expect(box.sy).toBe(0);
  expect(box.sw).toBeLessThanOrEqual(box.cw + 1);
  expect(box.sh).toBeLessThanOrEqual(box.ch + 1);
});

test("home opens the hub", async ({ page }) => {
  await unlock(page);
  const seen = errors.splice(0, errors.length);
  expect(seen).toEqual([]);
  page.removeAllListeners("console");
  page.removeAllListeners("pageerror");
  page.removeAllListeners("response");
  await page.locator("#home").click();
  await page.waitForURL(/\/index\.html$/);
});

test("screenshots of drawing, photo, and a phone drag", async ({ page }, testInfo) => {
  fs.mkdirSync("/opt/cursor/artifacts", { recursive: true });
  await unlock(page);
  const touch = touchProject(testInfo);
  if (!touch) {
    await page.locator("#restart").click();
    await page.locator('[data-tab="draw"]').click();
    await page.locator('#brushes [data-brush="#1d4ed8"]').click();
    await page.locator('#brush-sizes [data-bw="0.034"]').click();
    await page.locator('#brush-styles [data-style="crayon"]').click();
    const plate = await page.locator("#front-plate").boundingBox();
    await drag(
      page,
      { x: plate.x + plate.width * 0.25, y: plate.y + plate.height * 0.28 },
      { x: plate.x + plate.width * 0.7, y: plate.y + plate.height * 0.48 },
      false
    );
    await page.locator('#draw-tools [data-tool="heart"]').click();
    await drag(
      page,
      { x: plate.x + plate.width * 0.55, y: plate.y + plate.height * 0.22 },
      { x: plate.x + plate.width * 0.78, y: plate.y + plate.height * 0.42 },
      false
    );
    await page.screenshot({ path: "/opt/cursor/artifacts/bookcover2-drawing.png" });

    await page.locator("#restart").click();
    await page.locator('[data-tab="pictures"]').click();
    await page.locator("#photo-file").setInputFiles({
      name: "snap.png",
      mimeType: "image/png",
      buffer: solidPng(240, 180, 255, 0, 128),
    });
    await expect(page.locator('.sticker[data-type="photo"]')).toBeVisible();
    await page.screenshot({ path: "/opt/cursor/artifacts/bookcover2-photo.png" });
  } else {
    await page.locator("#restart").click();
    await page.locator('[data-tab="pictures"]').click();
    await page.locator("#pic-grid button").filter({ hasText: "Duck" }).click();
    const duck = page.locator('.sticker[data-kind="duck"]');
    await expect(duck.locator(".handle.grow")).toBeVisible();
    const spot = await centerOf(duck);
    await drag(page, spot, { x: spot.x + 16, y: spot.y + 8 }, true);
    await expect(duck).toHaveClass(/on/);
    await page.screenshot({ path: "/opt/cursor/artifacts/bookcover2-mobile-drag.png" });
  }
});

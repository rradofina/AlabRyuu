/* Flat 2D sprite loader + draw helpers for AlabRyuu art-sheet assets.
   Games keep canvas 2D (no Three.js). Extend by adding PNGs under assets/sprites/
   and calling kidSprite / kidDraw. */
(function (w) {
  var cache = {};
  function detectBase() {
    if (w.KID_SPRITE_BASE) return w.KID_SPRITE_BASE;
    var scripts = document.getElementsByTagName("script");
    var i, src, dir;
    for (i = 0; i < scripts.length; i++) {
      src = scripts[i].getAttribute("src") || "";
      if (src.indexOf("kid-sprites.js") !== -1) {
        dir = src.replace(/kid-sprites\.js(\?.*)?$/, "");
        return dir + "assets/sprites/";
      }
    }
    return "../assets/sprites/";
  }
  var base = detectBase();

  function pathFor(key) {
    if (!key) return "";
    if (key.indexOf("http") === 0 || key.indexOf("data:") === 0 || key.charAt(0) === "/" || key.indexOf("..") === 0)
      return key;
    return base + key.replace(/^\//, "");
  }

  w.kidSprite = function (key) {
    var p = pathFor(key);
    if (!p) return null;
    if (cache[p]) return cache[p];
    var img = new Image();
    img.decoding = "async";
    img.src = p;
    cache[p] = img;
    return img;
  };

  w.kidSprites = function (keys) {
    var i, out = {};
    for (i = 0; i < keys.length; i++) out[keys[i]] = w.kidSprite(keys[i]);
    return out;
  };

  /** Draw sprite centered at (cx,cy). opts: w,h,rot,flipX,alpha,squashY,squashX */
  w.kidDraw = function (ctx, img, cx, cy, opts) {
    opts = opts || {};
    if (!img || !img.complete || !img.naturalWidth) return false;
    var dw = opts.w || img.naturalWidth;
    var dh = opts.h || img.naturalHeight;
    if (opts.fit) {
      var s = opts.fit / Math.max(img.naturalWidth, img.naturalHeight);
      dw = img.naturalWidth * s;
      dh = img.naturalHeight * s;
    }
    var sx = opts.squashX != null ? opts.squashX : 1;
    var sy = opts.squashY != null ? opts.squashY : 1;
    var rot = opts.rot || 0;
    var alpha = opts.alpha != null ? opts.alpha : 1;
    ctx.save();
    ctx.translate(cx, cy);
    if (rot) ctx.rotate(rot);
    if (opts.flipX) ctx.scale(-1, 1);
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, (-dw / 2) * sx, (-dh / 2) * sy, dw * sx, dh * sy);
    ctx.restore();
    return true;
  };

  /** Bounce/squash motion helpers for hop cycles. */
  w.kidBounce = function (t, amp, speed) {
    return Math.sin(t * (speed || 8)) * (amp || 4);
  };
  w.kidSquash = function (phase) {
    // phase 0..1 land: squash then stretch
    if (phase < 0.5) return { x: 1 + phase * 0.35, y: 1 - phase * 0.3 };
    var p = (phase - 0.5) * 2;
    return { x: 1.175 - p * 0.175, y: 0.85 + p * 0.15 };
  };

  /** Preload list; optional cb when all settle (load or error). */
  /** Draw a mapped sprite, else fall back to the emoji stamp. */
  w.kidStamp = function (ctx, ch, x, y, s, map) {
    var img = map && map[ch];
    if (img) {
      var bob = Math.sin(Date.now() / 220 + (x || 0) * 0.02);
      if (w.kidDraw(ctx, img, x, y, {
        fit: (s || 64) * 1.08,
        squashX: 1 - bob * 0.04,
        squashY: 1 + bob * 0.05
      })) return true;
    }
    ctx.font = (s || 64) + "px Apple Color Emoji,Segoe UI Emoji,Noto Color Emoji,sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(ch, x, y);
    return false;
  };

  /** Swap an element's emoji for a sprite <img> when mapped. */
  w.kidFace = function (el, emoji, px, map) {
    if (!el) return;
    var key = map && map[emoji];
    if (!key) { el.textContent = emoji || ""; return; }
    var img = w.kidSprite(key);
    el.textContent = "";
    var node = document.createElement("img");
    node.alt = "";
    node.src = img.src;
    node.style.width = (px || 88) + "px";
    node.style.height = "auto";
    node.style.display = "block";
    node.style.margin = "0 auto";
    el.appendChild(node);
  };

  w.kidSpriteReady = function (keys, cb) {
    var list = keys || [];
    var left = list.length;
    if (!left) { if (cb) cb(); return; }
    function done() {
      left--;
      if (left <= 0 && cb) cb();
    }
    for (var i = 0; i < list.length; i++) {
      var img = w.kidSprite(list[i]);
      if (img.complete) done();
      else {
        img.addEventListener("load", done);
        img.addEventListener("error", done);
      }
    }
  };
})(window);

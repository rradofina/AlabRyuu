/* Flat 2D sprite loader + draw helpers for AlabRyuu art-sheet assets.
   Games keep canvas 2D (no Three.js). Extend by adding PNGs under assets/sprites/
   and calling kidSprite / kidDraw. */
(function (w) {
  var cache = {};
  var base = w.KID_SPRITE_BASE || "../assets/sprites/";

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

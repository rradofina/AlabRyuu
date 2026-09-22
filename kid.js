/* Shared kid helpers: pointer, juice, canvas, Play chrome.
   CSS pixels from the canvas box, never raw device pixels.
   Games call kidEm / kidFit / kidBegin / kidBind / kidFinish,
   or kidChrome + kidStage + kidTick for a full shell. */
(function (w) {
  var FONT = "Apple Color Emoji,Segoe UI Emoji,Noto Color Emoji,sans-serif";

  w.kidPt = function (e, cv) {
    var el = cv || document.getElementById("c");
    var r = el.getBoundingClientRect();
    var src = e.touches && e.touches[0] ? e.touches[0] : (e.changedTouches && e.changedTouches[0] ? e.changedTouches[0] : e);
    return {
      x: (src.clientX || 0) - r.left,
      y: (src.clientY || 0) - r.top,
      w: r.width,
      h: r.height
    };
  };

  w.kidHit = function (px, py, ox, oy, r) {
    var dx = px - ox, dy = py - oy;
    return dx * dx + dy * dy <= r * r;
  };

  w.kidPing = function (msg) {
    var el = document.getElementById("say");
    if (!el) return;
    if (msg) el.textContent = msg;
    el.classList.remove("ping");
    void el.offsetWidth;
    el.classList.add("ping");
  };

  w.kidSay = function (msg) { w.kidPing(msg); };

  w.kidScore = function (text, id) {
    var el = id ? document.getElementById(id) : (document.getElementById("got") || document.querySelector("#hud b"));
    if (el && text != null) el.textContent = text;
  };

  w.kidBoom = function (emoji, x, y) {
    var layer = document.getElementById("pops");
    if (!layer) {
      layer = document.createElement("div");
      layer.id = "pops";
      document.body.appendChild(layer);
    }
    var s = document.createElement("span");
    s.className = "pop";
    s.textContent = emoji || "⭐";
    s.style.left = (x == null ? innerWidth * 0.5 : x) + "px";
    s.style.top = (y == null ? innerHeight * 0.4 : y) + "px";
    layer.appendChild(s);
    setTimeout(function () { s.remove(); }, 800);
  };

  w.kidBurst = function (emojis, x, y) {
    var list = emojis || ["⭐", "✨", "🎉"];
    for (var i = 0; i < list.length; i++) {
      (function (ch, n) {
        setTimeout(function () {
          w.kidBoom(ch, (x || innerWidth * 0.5) + (n - 1) * 36, (y || innerHeight * 0.38) + (n % 2 ? -20 : 10));
        }, n * 70);
      })(list[i], i);
    }
  };

  w.kidNote = function (freq) {
    try {
      w._ac = w._ac || new (w.AudioContext || w.webkitAudioContext)();
      if (w._ac.state === "suspended") w._ac.resume();
      var o = w._ac.createOscillator(), g = w._ac.createGain();
      o.frequency.value = freq || 523;
      o.type = "triangle";
      g.gain.setValueAtTime(0.09, w._ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, w._ac.currentTime + 0.18);
      o.connect(g); g.connect(w._ac.destination);
      o.start();
      o.stop(w._ac.currentTime + 0.2);
    } catch (e) {}
  };

  w.kidYay = function () {
    w.kidNote(523);
    setTimeout(function () { w.kidNote(659); }, 80);
    setTimeout(function () { w.kidNote(784); }, 160);
    w.kidBurst(["🎉", "⭐", "✨", "💛"], innerWidth * 0.5, innerHeight * 0.32);
  };

  w.kidTap = function (emoji, msg, x, y, freq) {
    w.kidNote(freq);
    w.kidBoom(emoji, x, y);
    if (msg) w.kidPing(msg);
  };

  w.kidMiss = function (emoji, msg, x, y) {
    w.kidTap(emoji || "👆", msg || "Tap the big one!", x, y, 260);
  };

  w.kidFit = function (cv, ctx) {
    cv = cv || document.getElementById("c");
    if (!ctx) ctx = cv.getContext("2d");
    var d = Math.min(w.devicePixelRatio || 1, 2);
    var W = w.innerWidth, H = w.innerHeight;
    cv.width = Math.floor(W * d);
    cv.height = Math.floor(H * d);
    cv.style.width = W + "px";
    cv.style.height = H + "px";
    ctx.setTransform(d, 0, 0, d, 0, 0);
    return { W: W, H: H, d: d, cv: cv, ctx: ctx };
  };

  w.kidEm = function (ctx, ch, px, py, s) {
    ctx.font = (s || 84) + "px " + FONT;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(ch, px, py);
  };

  w.kidStage = function (cv) {
    cv = cv || document.getElementById("c");
    var ctx = cv.getContext("2d");
    var box = { cv: cv, ctx: ctx, W: 1, H: 1 };
    function fit() {
      var b = w.kidFit(cv, ctx);
      box.W = b.W;
      box.H = b.H;
    }
    w.addEventListener("resize", fit);
    fit();
    box.em = function (ch, px, py, s) { w.kidEm(ctx, ch, px, py, s); };
    box.bg = function (color) {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, box.W, box.H);
    };
    box.fit = fit;
    return box;
  };

  w.kidHideCovers = function () {
    ["title", "win", "cut"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.classList.add("off");
    });
  };

  w.kidShow = function (id) {
    var el = document.getElementById(id);
    if (el) el.classList.remove("off");
  };

  w.kidDock = function (on) {
    var nodes = document.querySelectorAll(".dock, .pads, .choice, .keys");
    for (var i = 0; i < nodes.length; i++) nodes[i].classList.toggle("on", !!on);
  };

  w.kidBegin = function (say, score, scoreId) {
    w.kidHideCovers();
    if (say) w.kidSay(say);
    if (score != null) w.kidScore(score, scoreId);
  };

  w.kidFinish = function (line) {
    w.kidYay();
    if (line) {
      var p = document.querySelector("#win p");
      if (p) p.textContent = line;
    }
    w.kidShow("win");
    w.kidDock(false);
  };

  w.kidBind = function (start) {
    var go = document.getElementById("go");
    var again = document.getElementById("again");
    if (go) go.onclick = start;
    if (again) again.onclick = start;
  };

  w.kidNearest = function (px, py, list, radius, xy) {
    var best = -1, bestD = (radius == null ? 120 : radius) * (radius == null ? 120 : radius), i;
    for (i = 0; i < list.length; i++) {
      var p = xy ? xy(list[i], i) : list[i];
      if (!p || p.skip) continue;
      var dx = px - p.x, dy = py - p.y, d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  };

  w.kidShuffle = function (a) {
    var i, j, t;
    for (i = a.length - 1; i > 0; i--) {
      j = (Math.random() * (i + 1)) | 0;
      t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  };

  w.kidTick = function (step) {
    var last = 0;
    function loop(now) {
      if (!last) last = now;
      var dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      step(dt, now);
      w.requestAnimationFrame(loop);
    }
    w.requestAnimationFrame(loop);
  };

  w.kidMark = function (n, need, emoji) {
    w.kidScore((emoji ? emoji + " " : "") + n + "/" + need);
    return n >= need;
  };

  w.kidHold = function (el, handlers) {
    var held = false;
    function down(e) {
      if (e.button != null && e.button !== 0) return;
      held = true;
      if (handlers.down) handlers.down(e);
    }
    function up() {
      if (!held) return;
      held = false;
      if (handlers.up) handlers.up();
    }
    el.addEventListener("pointerdown", down);
    w.addEventListener("pointerup", up);
    w.addEventListener("pointercancel", up);
    return { held: function () { return held; } };
  };

  w.kidChrome = function (o) {
    o = o || {};
    var home = o.home || "../index.html";
    var html = ""
      + '<a class="home" href="' + home + '">← Home</a>'
      + (o.canvas === false ? "" : '<canvas id="c"></canvas>')
      + '<div id="hud"><b id="got">' + (o.hud || "0") + "</b></div>"
      + '<div id="say">' + (o.say || "Tap Play!") + "</div>"
      + (o.extra || "")
      + '<div class="cover" id="title">'
      + '<div class="hero">' + (o.hero || "⭐") + "</div>"
      + "<h1>" + (o.title || "Game") + "</h1>"
      + "<p>" + (o.blurb || "Tap to play!") + "</p>"
      + '<button class="play" id="go" autofocus>' + (o.play || "Play") + "</button>"
      + "</div>"
      + '<div class="cover off" id="win">'
      + '<div class="hero">' + (o.winHero || "🎉") + "</div>"
      + "<h1>" + (o.winTitle || "Yay!") + "</h1>"
      + "<p>" + (o.winText || "You did it!") + "</p>"
      + '<button class="play g" id="again">' + (o.again || "Play again") + "</button>"
      + "</div>";
    document.body.insertAdjacentHTML("afterbegin", html);
    if (o.bg) {
      document.documentElement.style.background = o.bg;
      document.body.style.background = o.bg;
    }
  };

  function armPlay() {
    var go = document.getElementById("go");
    var title = document.getElementById("title");
    if (go) {
      try { go.setAttribute("autofocus", ""); go.focus(); } catch (e) {}
    }
    if (title && go && !title.getAttribute("data-kid-go")) {
      title.setAttribute("data-kid-go", "1");
      title.addEventListener("pointerdown", function (e) {
        if (title.classList.contains("off")) return;
        if (e.target.closest && (e.target.closest("#go") || e.target.closest("a"))) return;
        go.click();
      });
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", armPlay);
  else armPlay();
})(window);

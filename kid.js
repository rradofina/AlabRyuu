/* Shared kid pointer + juice. CSS pixels from the canvas box, never raw device pixels. */
(function (w) {
  w.kidPt = function (e, cv) {
    var el = cv || document.getElementById("c");
    var r = el.getBoundingClientRect();
    return {
      x: (e.clientX || (e.touches && e.touches[0] && e.touches[0].clientX) || 0) - r.left,
      y: (e.clientY || (e.touches && e.touches[0] && e.touches[0].clientY) || 0) - r.top,
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

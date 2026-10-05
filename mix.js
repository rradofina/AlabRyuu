/* Shared helpers for the mix games. Each game keeps its own rules. */
(function (w) {
  function homeLink() {
    var h = document.querySelector("a.home");
    if (!h) return;
    var q = location.search || "";
    if (q.indexOf("hub=alonzo") !== -1) h.setAttribute("href", "/alonzorui/");
    else if (q.indexOf("hub=together") !== -1) h.setAttribute("href", "/together/");
  }

  function fit(cv) {
    var ctx = cv.getContext("2d");
    var rect = cv.getBoundingClientRect();
    var W = rect.width || cv.clientWidth || w.innerWidth || 360;
    var H = rect.height || cv.clientHeight || w.innerHeight || 640;
    var d = Math.min(w.devicePixelRatio || 1, 2);
    var pw = Math.max(2, Math.floor(W * d));
    var ph = Math.max(2, Math.floor(H * d));
    if (cv.width !== pw || cv.height !== ph) {
      cv.width = pw;
      cv.height = ph;
    }
    ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    return { ctx: ctx, W: W, H: H };
  }

  function box(ctx, x, y, bw, bh, r) {
    var rr = Math.max(0, Math.min(r || 0, bw / 2, bh / 2));
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + bw, y, x + bw, y + bh, rr);
    ctx.arcTo(x + bw, y + bh, x, y + bh, rr);
    ctx.arcTo(x, y + bh, x, y, rr);
    ctx.arcTo(x, y, x + bw, y, rr);
    ctx.closePath();
  }

  function ink(ctx) {
    ctx.strokeStyle = "#1e1b4b";
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  function chord() {
    if (!w.kidNote) return;
    w.kidNote(523);
    setTimeout(function () { w.kidNote(659); }, 90);
    setTimeout(function () { w.kidNote(784); }, 180);
  }

  function boot(cv) {
    homeLink();
    var title = document.getElementById("title");
    var win = document.getElementById("win");
    var dock = document.getElementById("dock");
    var playing = false;
    var started = null;
    var reset = null;

    function showPlay() {
      if (title) title.classList.add("off");
      if (win) win.classList.add("off");
      if (dock) dock.classList.add("on");
      playing = true;
      cv.dataset.mode = "play";
    }

    function finish() {
      playing = false;
      cv.dataset.mode = "win";
      if (dock) dock.classList.remove("on");
      if (win) win.classList.remove("off");
      chord();
    }

    var go = document.getElementById("go");
    if (go) {
      go.addEventListener("click", function () {
        showPlay();
        if (started) started();
      });
    }
    var again = document.getElementById("again");
    if (again) {
      again.addEventListener("click", function () {
        showPlay();
        if (reset) reset();
      });
    }

    return {
      on: function () { return playing; },
      finish: finish,
      fit: function () { return fit(cv); },
      begin: function (fn) { started = fn; },
      replay: function (fn) { reset = fn; }
    };
  }

  var holdDir = 0;
  function hold(id, dir, nudge) {
    var b = document.getElementById(id);
    if (!b) return;
    b.addEventListener("pointerdown", function (e) {
      holdDir = dir;
      try { b.setPointerCapture(e.pointerId); } catch (err) {}
    });
    function up() { if (holdDir === dir) holdDir = 0; }
    b.addEventListener("pointerup", up);
    b.addEventListener("pointercancel", up);
    b.addEventListener("click", function () { if (nudge) nudge(dir); });
  }

  w.Mix = {
    boot: boot,
    fit: fit,
    box: box,
    ink: ink,
    hold: hold,
    dir: function () { return holdDir; },
    alonzo: function () { return (location.search || "").indexOf("hub=alonzo") !== -1; }
  };
})(window);

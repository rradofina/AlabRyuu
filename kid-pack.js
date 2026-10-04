/* Shared flat 2D games for the AlabRyuu, AlonzoRui, and Together hubs.
   Canvas shapes only. No fail state: a miss wobbles and play continues. */
(function (w) {
  var cfg, cv, ctx, W = 2, H = 2;
  var started = false, won = false, round = 0, got = 0, goal = 3;
  var items = [], confetti = [], drag = null, turn = 0, scores = [0, 0];
  var scale = 0.4, want = "#fff", last = 0, slow = false;
  var kind = "tap";

  function $(id) { return document.getElementById(id); }

  function note(f) {
    if (w.kidNote) w.kidNote(f);
  }
  function chord() {
    note(523);
    setTimeout(function () { note(659); }, 90);
    setTimeout(function () { note(784); }, 180);
  }

  function pt(e) {
    if (w.kidPt) return w.kidPt(e, cv);
    var r = cv.getBoundingClientRect();
    var src = e.touches && e.touches[0] ? e.touches[0] : e;
    return { x: src.clientX - r.left, y: src.clientY - r.top, w: r.width, h: r.height };
  }

  function hit(x, y, it) {
    var dx = x - it.x, dy = y - it.y;
    var r = it.r * (it.pop ? 1.2 : 1);
    return dx * dx + dy * dy <= r * r;
  }

  function fit() {
    var r = cv.getBoundingClientRect();
    var w0 = Math.max(2, Math.round(r.width));
    var h0 = Math.max(2, Math.round(r.height));
    if (cv.width !== w0 || cv.height !== h0) {
      cv.width = w0;
      cv.height = h0;
    }
    W = w0;
    H = h0;
  }

  function rad() {
    var base = cfg.age === 4 ? 72 : 48;
    return Math.max(base, Math.min(W, H) * (cfg.age === 4 ? 0.16 : 0.09));
  }

  function wanted(it) {
    if (!cfg.match || cfg.age === 4) return true;
    return it.color === want;
  }

  function paint(shape, x, y, s, color, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot || 0);
    ctx.fillStyle = color;
    ctx.strokeStyle = "rgba(15,23,42,.28)";
    ctx.lineWidth = Math.max(3, s * 0.08);
    ctx.lineJoin = "round";
    if (shape === "circle" || shape === "bubble") {
      ctx.beginPath(); ctx.arc(0, 0, s, 0, 6.3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,.55)";
      ctx.beginPath(); ctx.arc(-s * 0.32, -s * 0.32, s * 0.28, 0, 6.3); ctx.fill();
    } else if (shape === "star") {
      ctx.beginPath();
      for (var i = 0; i < 10; i++) {
        var a = -Math.PI / 2 + i * Math.PI / 5;
        var rr = i % 2 ? s * 0.42 : s;
        var px = Math.cos(a) * rr, py = Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if (shape === "heart") {
      ctx.beginPath();
      ctx.moveTo(0, s * 0.85);
      ctx.bezierCurveTo(-s * 1.2, s * 0.15, -s * 0.7, -s * 0.95, 0, -s * 0.35);
      ctx.bezierCurveTo(s * 0.7, -s * 0.95, s * 1.2, s * 0.15, 0, s * 0.85);
      ctx.fill(); ctx.stroke();
    } else if (shape === "cloud") {
      ctx.beginPath();
      ctx.arc(-s * 0.45, s * 0.1, s * 0.42, 0, 6.3);
      ctx.arc(0, -s * 0.2, s * 0.55, 0, 6.3);
      ctx.arc(s * 0.48, s * 0.08, s * 0.4, 0, 6.3);
      ctx.fill();
      ctx.strokeRect(-s * 0.7, 0, s * 1.4, s * 0.45);
    } else if (shape === "fish") {
      ctx.beginPath(); ctx.ellipse(0, 0, s, s * 0.62, 0, 0, 6.3); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-s * 0.85, 0); ctx.lineTo(-s * 1.35, -s * 0.5); ctx.lineTo(-s * 1.35, s * 0.5); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(s * 0.4, -s * 0.12, s * 0.16, 0, 6.3); ctx.fill();
      ctx.fillStyle = "#1e1b4b"; ctx.beginPath(); ctx.arc(s * 0.44, -s * 0.12, s * 0.07, 0, 6.3); ctx.fill();
    } else if (shape === "flower") {
      ctx.fillStyle = color;
      for (var p = 0; p < 6; p++) {
        var ang = p * Math.PI / 3;
        ctx.beginPath(); ctx.arc(Math.cos(ang) * s * 0.48, Math.sin(ang) * s * 0.48, s * 0.38, 0, 6.3); ctx.fill(); ctx.stroke();
      }
      ctx.fillStyle = "#fde047"; ctx.beginPath(); ctx.arc(0, 0, s * 0.28, 0, 6.3); ctx.fill(); ctx.stroke();
    } else if (shape === "balloon") {
      ctx.beginPath(); ctx.ellipse(0, -s * 0.15, s * 0.72, s * 0.88, 0, 0, 6.3); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, s * 0.7); ctx.lineTo(-s * 0.16, s * 0.95); ctx.lineTo(s * 0.16, s * 0.95); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(0, s * 0.95); ctx.quadraticCurveTo(s * 0.3, s * 1.2, 0, s * 1.45); ctx.stroke();
    } else if (shape === "sun") {
      ctx.beginPath(); ctx.arc(0, 0, s * 0.55, 0, 6.3); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = color; ctx.lineWidth = Math.max(4, s * 0.12);
      for (var k = 0; k < 10; k++) {
        var aa = k / 10 * 6.28;
        ctx.beginPath();
        ctx.moveTo(Math.cos(aa) * s * 0.7, Math.sin(aa) * s * 0.7);
        ctx.lineTo(Math.cos(aa) * s, Math.sin(aa) * s);
        ctx.stroke();
      }
    } else if (shape === "moon") {
      ctx.beginPath();
      ctx.arc(0, 0, s, 0.6, Math.PI * 2 - 0.15, false);
      ctx.arc(s * 0.42, -s * 0.08, s * 0.78, -0.2, Math.PI + 0.15, true);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
    } else if (shape === "tree") {
      ctx.fillStyle = "#92400e"; ctx.fillRect(-s * 0.16, s * 0.15, s * 0.32, s * 0.7);
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, -s * 0.15, s * 0.72, 0, 6.3); ctx.fill(); ctx.stroke();
    } else if (shape === "house") {
      ctx.fillStyle = color; ctx.fillRect(-s * 0.7, -s * 0.1, s * 1.4, s * 0.95);
      ctx.fillStyle = "#7f1d1d"; ctx.beginPath(); ctx.moveTo(-s * 0.9, -s * 0.05); ctx.lineTo(0, -s * 0.9); ctx.lineTo(s * 0.9, -s * 0.05); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#fde68a"; ctx.fillRect(-s * 0.16, s * 0.2, s * 0.32, s * 0.62);
    } else if (shape === "car" || shape === "train") {
      ctx.fillStyle = color;
      roundRect(-s, -s * 0.15, s * 2, s * 0.7, s * 0.2);
      ctx.fillStyle = "#e0f2fe"; roundRect(-s * 0.55, -s * 0.62, s * 1.05, s * 0.48, s * 0.12);
      ctx.fillStyle = "#1e293b";
      ctx.beginPath(); ctx.arc(-s * 0.55, s * 0.55, s * 0.28, 0, 6.3); ctx.arc(s * 0.55, s * 0.55, s * 0.28, 0, 6.3); ctx.fill();
    } else if (shape === "bug") {
      ctx.beginPath(); ctx.ellipse(0, s * 0.1, s * 0.7, s * 0.55, 0, 0, 6.3); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, -s * 0.5, s * 0.32, 0, 6.3); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "#1e293b";
      ctx.beginPath(); ctx.moveTo(-s * 0.1, -s * 0.75); ctx.lineTo(-s * 0.45, -s * 1.05); ctx.moveTo(s * 0.1, -s * 0.75); ctx.lineTo(s * 0.45, -s * 1.05); ctx.stroke();
    } else if (shape === "duck" || shape === "bird") {
      ctx.beginPath(); ctx.ellipse(0, s * 0.15, s * 0.85, s * 0.5, 0, 0, 6.3); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(s * 0.55, -s * 0.35, s * 0.38, 0, 6.3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#f59e0b"; ctx.beginPath(); ctx.moveTo(s * 0.85, -s * 0.35); ctx.lineTo(s * 1.25, -s * 0.2); ctx.lineTo(s * 0.85, -s * 0.08); ctx.closePath(); ctx.fill();
      if (shape === "bird") {
        ctx.strokeStyle = color; ctx.beginPath(); ctx.ellipse(-s * 0.2, 0, s * 0.5, s * 0.22, -0.6, 0, 6.3); ctx.stroke();
      }
    } else if (shape === "diamond" || shape === "gem") {
      ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s * 0.75, 0); ctx.lineTo(0, s); ctx.lineTo(-s * 0.75, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,.45)"; ctx.beginPath(); ctx.moveTo(0, -s * 0.7); ctx.lineTo(s * 0.28, -s * 0.15); ctx.lineTo(0, 0); ctx.lineTo(-s * 0.28, -s * 0.15); ctx.closePath(); ctx.fill();
    } else if (shape === "apple") {
      ctx.beginPath(); ctx.arc(0, s * 0.1, s * 0.75, 0, 6.3); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "#166534"; ctx.lineWidth = Math.max(3, s * 0.08);
      ctx.beginPath(); ctx.moveTo(0, -s * 0.55); ctx.quadraticCurveTo(s * 0.1, -s * 1.05, s * 0.15, -s * 0.85); ctx.stroke();
      ctx.fillStyle = "#22c55e"; ctx.beginPath(); ctx.ellipse(s * 0.28, -s * 0.55, s * 0.28, s * 0.14, 0.6, 0, 6.3); ctx.fill();
    } else if (shape === "boat") {
      ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(-s, -s * 0.1); ctx.lineTo(s, -s * 0.1); ctx.lineTo(s * 0.65, s * 0.55); ctx.lineTo(-s * 0.65, s * 0.55); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.moveTo(0, -s * 0.15); ctx.lineTo(0, -s); ctx.lineTo(s * 0.7, -s * 0.15); ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if (shape === "frog") {
      ctx.beginPath(); ctx.ellipse(0, s * 0.15, s * 0.85, s * 0.55, 0, 0, 6.3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(-s * 0.35, -s * 0.45, s * 0.28, 0, 6.3); ctx.arc(s * 0.35, -s * 0.45, s * 0.28, 0, 6.3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#1e293b";
      ctx.beginPath(); ctx.arc(-s * 0.32, -s * 0.42, s * 0.1, 0, 6.3); ctx.arc(s * 0.38, -s * 0.42, s * 0.1, 0, 6.3); ctx.fill();
    } else if (shape === "kite") {
      ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s * 0.7, 0); ctx.lineTo(0, s * 0.85); ctx.lineTo(-s * 0.7, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, s * 0.85); ctx.lineTo(-s * 0.15, s * 1.15); ctx.lineTo(s * 0.2, s * 1.35); ctx.stroke();
    } else if (shape === "butterfly") {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.ellipse(-s * 0.45, -s * 0.25, s * 0.5, s * 0.38, -0.4, 0, 6.3); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(s * 0.45, -s * 0.25, s * 0.5, s * 0.38, 0.4, 0, 6.3); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(-s * 0.4, s * 0.35, s * 0.38, s * 0.3, 0.3, 0, 6.3); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(s * 0.4, s * 0.35, s * 0.38, s * 0.3, -0.3, 0, 6.3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#44403c"; ctx.fillRect(-s * 0.06, -s * 0.55, s * 0.12, s * 1.1);
    } else if (shape === "leaf") {
      ctx.beginPath(); ctx.ellipse(0, 0, s * 0.45, s * 0.9, 0.5, 0, 6.3); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-s * 0.35, s * 0.45); ctx.lineTo(s * 0.4, -s * 0.5); ctx.stroke();
    } else if (shape === "shell") {
      ctx.beginPath(); ctx.arc(0, s * 0.15, s * 0.85, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath();
      for (var t = -2; t <= 2; t++) {
        ctx.moveTo(0, s * 0.15); ctx.lineTo(Math.sin(t * 0.45) * s * 0.8, -s * 0.65);
      }
      ctx.stroke();
    } else if (shape === "cake") {
      ctx.fillStyle = "#f9a8d4"; ctx.fillRect(-s * 0.8, s * 0.05, s * 1.6, s * 0.55);
      ctx.fillStyle = color; ctx.fillRect(-s * 0.65, -s * 0.4, s * 1.3, s * 0.48);
      ctx.fillStyle = "#fff"; ctx.fillRect(-s * 0.65, -s * 0.15, s * 1.3, s * 0.12);
      ctx.fillStyle = "#ef4444"; ctx.beginPath(); ctx.arc(0, -s * 0.55, s * 0.16, 0, 6.3); ctx.fill();
    } else if (shape === "hat") {
      ctx.fillStyle = color; ctx.fillRect(-s * 0.45, -s * 0.7, s * 0.9, s * 0.7);
      ctx.fillStyle = "#1e293b"; ctx.fillRect(-s, s * 0.0, s * 2, s * 0.22);
    } else if (shape === "drum") {
      ctx.fillStyle = color; ctx.fillRect(-s * 0.7, -s * 0.2, s * 1.4, s * 0.85);
      ctx.fillStyle = "#fde68a"; ctx.beginPath(); ctx.ellipse(0, -s * 0.2, s * 0.7, s * 0.22, 0, 0, 6.3); ctx.fill(); ctx.stroke();
    } else if (shape === "egg") {
      ctx.beginPath(); ctx.ellipse(0, 0, s * 0.62, s * 0.85, 0, 0, 6.3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,.5)"; ctx.beginPath(); ctx.ellipse(-s * 0.18, -s * 0.25, s * 0.16, s * 0.28, 0, 0, 6.3); ctx.fill();
    } else if (shape === "drop") {
      ctx.beginPath(); ctx.moveTo(0, -s); ctx.bezierCurveTo(s, -s * 0.1, s * 0.7, s * 0.85, 0, s * 0.85); ctx.bezierCurveTo(-s * 0.7, s * 0.85, -s, -s * 0.1, 0, -s); ctx.fill(); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(0, 0, s, 0, 6.3); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }

  function roundRect(x, y, w0, h0, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w0, y, x + w0, y + h0, r);
    ctx.arcTo(x + w0, y + h0, x, y + h0, r);
    ctx.arcTo(x, y + h0, x, y, r);
    ctx.arcTo(x, y, x + w0, y, r);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  function basket() {
    var bw = Math.min(W * 0.62, 340);
    var bh = Math.max(110, Math.min(H * 0.24, 180));
    return { x: (W - bw) / 2, y: Math.max(78, H * 0.14), w: bw, h: bh };
  }

  function spawnTap(force) {
    var colors = cfg.colors;
    var color = colors[Math.floor(Math.random() * colors.length)];
    var live = items.filter(function (it) { return !it.gone; });
    if (force || (cfg.match && cfg.age !== 4 && !live.some(wanted))) color = want;
    var r = rad();
    var pad = r + 16;
    items.push({
      x: pad + Math.random() * (W - pad * 2),
      y: pad + 40 + Math.random() * (H - pad * 2 - 150),
      vx: (Math.random() < 0.5 ? -1 : 1) * (cfg.age === 4 ? 18 : 36) * (0.6 + Math.random()),
      vy: (Math.random() < 0.5 ? -1 : 1) * (cfg.age === 4 ? 12 : 26) * (0.5 + Math.random()),
      r: r,
      color: color,
      rot: Math.random() * 6,
      bob: Math.random() * 6,
      gone: false,
      pop: 0,
      wobble: 0
    });
  }

  function spawnDrag(i) {
    var r = Math.min(rad() * 0.78, (W / (goal + 1)) * 0.38);
    var y = H - Math.max(210, H * 0.32);
    items.push({
      x: (i + 1) * (W / (goal + 1)),
      y: y,
      homeX: (i + 1) * (W / (goal + 1)),
      homeY: y,
      r: r,
      color: cfg.colors[i % cfg.colors.length],
      rot: 0,
      placed: false,
      dragging: false,
      homing: false,
      bob: i
    });
  }

  function reset(keepPlay) {
    fit();
    round++;
    got = 0;
    won = false;
    turn = 0;
    scores = [0, 0];
    scale = 0.42;
    drag = null;
    confetti = [];
    items = [];
    want = cfg.colors[0];
    goal = cfg.goal || (cfg.age === 4 ? 3 : 6);
    var n = cfg.age === 4 ? 2 : 4;
    if (kind === "tap") {
      for (var i = 0; i < n; i++) spawnTap(i === 0);
    } else if (kind === "drag") {
      for (var j = 0; j < goal; j++) spawnDrag(j);
    }
    var win = $("win");
    if (win) win.classList.add("off");
    if (!keepPlay) return;
  }

  function begin() {
    if (started && !won) return;
    var title = $("title");
    if (title) title.classList.add("off");
    var dock = $("dock");
    if (dock) dock.classList.add("on");
    started = true;
    reset(true);
    note(494);
  }

  function again() {
    var title = $("title");
    if (title) title.classList.add("off");
    var dock = $("dock");
    if (dock) dock.classList.add("on");
    started = true;
    reset(true);
    note(392);
  }

  function celebrate() {
    if (won) return;
    won = true;
    chord();
    var win = $("win");
    if (win) win.classList.remove("off");
    for (var i = 0; i < 28; i++) {
      confetti.push({
        x: W * 0.5, y: H * 0.4,
        vx: (Math.random() - 0.5) * 280,
        vy: -80 - Math.random() * 220,
        s: 8 + Math.random() * 14,
        color: cfg.colors[i % cfg.colors.length],
        shape: cfg.shape,
        rot: Math.random()
      });
    }
  }

  function collect(it) {
    if (!it || it.gone || won) return;
    if (!wanted(it)) {
      it.wobble = 1;
      note(196);
      return;
    }
    it.gone = true;
    it.pop = 1;
    got++;
    note(392 + got * 36);
    if (got >= goal) celebrate();
    else if (kind === "tap") spawnTap(false);
    var r = round;
    setTimeout(function () {
      if (r !== round) return;
      items = items.filter(function (o) { return o !== it; });
    }, 180);
  }

  function place(it) {
    if (!it || it.placed || won) return;
    var b = basket();
    it.placed = true;
    it.dragging = false;
    it.homing = false;
    it.x = b.x + 40 + Math.random() * (b.w - 80);
    it.y = b.y + b.h * 0.55;
    got++;
    note(480 + got * 30);
    if (got >= goal) celebrate();
  }

  function grow() {
    if (won || !started) return;
    got++;
    scale = 0.42 + (got / goal) * 1.25;
    note(311 + got * 42);
    if (got >= goal) celebrate();
  }

  function act() {
    if (!started) return;
    if (won) return again();
    if (kind === "grow") return grow();
    if (kind === "drag") {
      var loose = items.filter(function (it) { return !it.placed; })[0];
      if (loose) place(loose);
      return;
    }
    if (kind === "turns") return scoreTurn();
    var list = items.filter(function (it) { return !it.gone && wanted(it); });
    if (!list.length) list = items.filter(function (it) { return !it.gone; });
    if (list.length) collect(list[0]);
  }

  function center() {
    return { x: W * 0.5, y: H * 0.48, r: Math.max(78, Math.min(W, H) * 0.16) };
  }

  function scoreTurn() {
    if (won) return;
    scores[turn]++;
    note(turn === 0 ? 523 : 659);
    if (scores[0] >= goal && scores[1] >= goal) celebrate();
    else turn = 1 - turn;
  }

  function buddyAt(which) {
    return { x: which === 0 ? W * 0.22 : W * 0.78, y: H * 0.78, r: Math.max(46, rad() * 0.7) };
  }

  function step(dt) {
    var motion = slow ? 0.35 : 1;
    items.forEach(function (it) {
      it.bob += dt * 2;
      if (it.pop > 0) it.pop = Math.max(0, it.pop - dt * 3);
      if (it.wobble > 0) it.wobble = Math.max(0, it.wobble - dt * 2);
      if (kind === "tap" && !it.gone) {
        var sp = (cfg.motion === "still" ? 0.15 : 1) * motion;
        it.x += it.vx * dt * sp;
        it.y += it.vy * dt * sp;
        var r = it.r + 8;
        if (it.x < r || it.x > W - r) it.vx *= -1;
        if (it.y < r + 8 || it.y > H - 190) it.vy *= -1;
        it.x = Math.max(r, Math.min(W - r, it.x));
        it.y = Math.max(r + 8, Math.min(H - 190, it.y));
      }
      if (kind === "drag" && it.homing && !it.placed) {
        it.x += (it.homeX - it.x) * Math.min(1, dt * 8);
        it.y += (it.homeY - it.y) * Math.min(1, dt * 8);
        if (Math.abs(it.x - it.homeX) < 2 && Math.abs(it.y - it.homeY) < 2) it.homing = false;
      }
    });
    confetti.forEach(function (c) {
      c.vy += 420 * dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.rot += dt * 4;
    });
  }

  function sky() {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, cfg.sky || "#7dd3fc");
    g.addColorStop(1, cfg.ground || "#bbf7d0");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    if (cfg.scene === "night" || cfg.scene === "space") {
      ctx.fillStyle = "rgba(255,255,255,.85)";
      for (var i = 0; i < 16; i++) {
        var sx = (i * 97) % W, sy = (i * 53) % (H * 0.7);
        ctx.fillRect(sx, sy, 3, 3);
      }
    }
    if (cfg.scene !== "space" && cfg.scene !== "night") {
      ctx.fillStyle = cfg.scene === "sea" ? "#0284c7" : "#16a34a";
      ctx.beginPath();
      ctx.moveTo(0, H * 0.78);
      ctx.quadraticCurveTo(W * 0.5, H * 0.72, W, H * 0.8);
      ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
    }
  }

  function dots(x, y, n, total, color) {
    var i;
    for (i = 0; i < total; i++) {
      ctx.beginPath();
      ctx.arc(x + i * 22, y, 8, 0, 6.3);
      ctx.fillStyle = i < n ? color : "rgba(255,255,255,.45)";
      ctx.fill();
      ctx.strokeStyle = "rgba(15,23,42,.25)";
      ctx.stroke();
    }
  }

  function drawBuddy(which) {
    var b = buddyAt(which);
    var on = turn === which && !won;
    ctx.save();
    if (on) {
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 8;
      ctx.beginPath(); ctx.arc(b.x, b.y - 10, b.r + 16 + Math.sin(last / 200) * 4, 0, 6.3); ctx.stroke();
    }
    paint("circle", b.x, b.y, b.r * 0.85, which === 0 ? "#7c3aed" : "#fb923c", 0);
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(b.x - 10, b.y - 8, 5, 0, 6.3); ctx.arc(b.x + 12, b.y - 8, 5, 0, 6.3); ctx.fill();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(b.x, b.y + 6, 12, 0.15, Math.PI - 0.15); ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.font = "700 22px Trebuchet MS, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(which === 0 ? "Alab" : "Alon", b.x, b.y + b.r + 28);
    ctx.restore();
    dots(b.x - (goal - 1) * 11, b.y - b.r - 28, scores[which], goal, which === 0 ? "#c4b5fd" : "#fed7aa");
  }

  function draw() {
    sky();
    if (!started) {
      paint(cfg.shape, W * 0.5, H * 0.46, Math.min(W, H) * 0.18, cfg.colors[0], 0);
      return;
    }
    if (kind === "drag") {
      var b = basket();
      ctx.fillStyle = "rgba(255,255,255,.35)";
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.roundRect(b.x, b.y, b.w, b.h, 28);
      ctx.fill(); ctx.stroke();
      paint(cfg.shape, b.x + b.w / 2, b.y + b.h * 0.48, 28, "rgba(255,255,255,.8)", 0);
    }
    if (kind === "grow") {
      var pulse = 1 + Math.sin(last / 220) * 0.04;
      var grown = Math.min(rad() * scale * 2.1 * pulse, Math.min(W, H) * 0.3);
      paint(cfg.shape, W * 0.5, H * 0.5, grown, cfg.colors[0], 0);
      dots(W * 0.5 - (goal - 1) * 11, 36, got, goal, "#fff");
    }
    if (kind === "turns") {
      var c = center();
      var col = turn === 0 ? "#7c3aed" : "#fb923c";
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r + 18 + Math.sin(last / 180) * 6, 0, 6.3);
      ctx.stroke();
      paint(cfg.shape, c.x, c.y, c.r, col, 0);
      drawBuddy(0);
      drawBuddy(1);
    }
    items.forEach(function (it) {
      if (it.gone && it.pop <= 0) return;
      var s = it.r * (it.pop ? 1 + it.pop : 1);
      var rot = (it.rot || 0) + (it.wobble ? Math.sin(it.wobble * 20) * 0.4 : 0);
      if (kind === "tap" && wanted(it) && !it.gone && cfg.match && cfg.age !== 4) {
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(it.x, it.y, s + 12 + Math.sin(last / 160 + it.bob) * 3, 0, 6.3);
        ctx.stroke();
      }
      if (cfg.age === 4 && kind === "tap" && !it.gone) {
        ctx.strokeStyle = "rgba(255,255,255,.9)";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(it.x, it.y, s + 10 + Math.sin(last / 180) * 4, 0, 6.3);
        ctx.stroke();
      }
      paint(cfg.shape, it.x, it.y + Math.sin(it.bob) * (slow ? 1 : 4), s, it.color, rot);
    });
    if (kind === "tap" || kind === "drag") dots(24 + 8, 36, got, goal, "#fff");
    confetti.forEach(function (c) { paint(c.shape, c.x, c.y, c.s, c.color, c.rot); });
  }

  function hitItem(x, y) {
    for (var i = items.length - 1; i >= 0; i--) {
      var it = items[i];
      if (it.gone || it.placed) continue;
      if (hit(x, y, it)) return it;
    }
    return null;
  }

  function onDown(e) {
    if (!started || won) return;
    var p = pt(e);
    if (kind === "grow") { grow(); return; }
    if (kind === "turns") {
      var c = center();
      var dx = p.x - c.x, dy = p.y - c.y;
      if (dx * dx + dy * dy <= (c.r + 20) * (c.r + 20)) { scoreTurn(); return; }
      note(174);
      return;
    }
    var it = hitItem(p.x, p.y);
    if (!it) return;
    if (kind === "drag") {
      drag = it;
      it.dragging = true;
      it.homing = false;
      try { cv.setPointerCapture(e.pointerId); } catch (err) {}
      return;
    }
    collect(it);
  }

  function onMove(e) {
    if (!drag) return;
    var p = pt(e);
    drag.x = p.x;
    drag.y = p.y;
  }

  function onUp() {
    if (!drag) return;
    var it = drag;
    drag = null;
    it.dragging = false;
    var b = basket();
    if (it.x > b.x && it.x < b.x + b.w && it.y > b.y && it.y < b.y + b.h) place(it);
    else {
      it.homing = true;
      note(262);
    }
  }

  function start(c) {
    cfg = c || {};
    cfg.colors = cfg.colors && cfg.colors.length ? cfg.colors : ["#38bdf8", "#f9a8d4", "#fde047"];
    cfg.shape = cfg.shape || "circle";
    cfg.scene = cfg.scene || "sky";
    kind = cfg.kind || "tap";
    goal = cfg.goal || (cfg.age === 4 ? 3 : 6);
    try { slow = w.matchMedia && w.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { slow = false; }
    cv = $("c");
    ctx = cv.getContext("2d");
    var go = $("go"), hop = $("hop"), stomp = $("stomp"), winAgain = $("winAgain");
    if (go) go.addEventListener("click", begin);
    if (hop) hop.addEventListener("click", act);
    if (stomp) stomp.addEventListener("click", again);
    if (winAgain) winAgain.addEventListener("click", again);
    cv.addEventListener("pointerdown", onDown);
    cv.addEventListener("pointermove", onMove);
    w.addEventListener("pointerup", onUp);
    w.addEventListener("pointercancel", onUp);
    w.addEventListener("resize", fit);
    fit();
    requestAnimationFrame(function loop(now) {
      var dt = Math.min(0.034, last ? (now - last) / 1000 : 0.016);
      last = now;
      fit();
      if (started && !won) step(dt);
      else if (started && won) step(dt);
      draw();
      requestAnimationFrame(loop);
    });
  }

  w.KidPack = { start: start };
})(window);

/* Melon World: a flat 2D physics sandbox for kids. */
(function () {
  var MAX = 40;
  var M = Matter;
  var engine = M.Engine.create({ enableSleeping: true });
  engine.gravity.y = 1;
  engine.gravity.scale = 0.00115;
  engine.positionIterations = 10;
  engine.velocityIterations = 8;

  var cv = document.getElementById("c");
  var ctx = cv.getContext("2d");
  var W = 390, H = 700, dpr = 1;
  var things = [];
  var statics = [];
  var waterBody = null;
  var stage = null;
  var stageW = 0, stageFloor = 0;
  var seq = 1;
  var pairSeq = 1;
  var armed = "ball";
  var cat = "fun";
  var tool = "hand";
  var paused = false;
  var soundOn = false;
  var grab = null;
  var grabPtr = null;
  var samples = [];
  var pointer = null;
  var bits = [];
  var clouds = [];
  var undoStack = [];
  var toastTimer = 0;
  var tutorStep = 0;
  var tutorOn = false;
  var playing = false;
  var lastT = 0;
  var acc = 0;
  var splashCd = 0;
  var built = false;

  try { soundOn = localStorage.getItem("alabryuu-melon-sound") === "1"; } catch (e) {}
  var q = location.search || "";
  if (q.indexOf("hub=together") >= 0) document.getElementById("home").href = "/together/";

  var SPEC = {
    kid: { w: 40, h: 54, shape: "rect", chamfer: 16, density: 0.0022, friction: 0.5, restitution: 0.12, air: 0.015, soft: 1, tint: "#38bdf8" },
    kid2: { w: 40, h: 54, shape: "rect", chamfer: 16, density: 0.0022, friction: 0.5, restitution: 0.12, air: 0.015, soft: 1, tint: "#f472b6" },
    kid3: { w: 40, h: 54, shape: "rect", chamfer: 16, density: 0.0022, friction: 0.5, restitution: 0.12, air: 0.015, soft: 1, tint: "#fbbf24" },
    cat: { w: 50, h: 34, shape: "rect", chamfer: 14, density: 0.0018, friction: 0.55, restitution: 0.15, air: 0.02, soft: 1 },
    dog: { w: 54, h: 36, shape: "rect", chamfer: 14, density: 0.002, friction: 0.55, restitution: 0.12, air: 0.02, soft: 1 },
    bird: { w: 32, h: 32, shape: "circle", density: 0.0006, friction: 0.2, restitution: 0.3, air: 0.04, soft: 1, lift: 0.62 },
    duck: { w: 48, h: 32, shape: "rect", chamfer: 12, density: 0.0012, friction: 0.35, restitution: 0.2, air: 0.02, soft: 1, buoyancy: 1.85 },
    fish: { w: 40, h: 40, shape: "circle", density: 0.0009, friction: 0.15, restitution: 0.2, air: 0.03, soft: 1, buoyancy: 2.5 },
    dino: { w: 58, h: 40, shape: "rect", chamfer: 12, density: 0.0024, friction: 0.5, restitution: 0.1, air: 0.015, soft: 1 },
    tree: { w: 48, h: 108, shape: "rect", chamfer: 16, density: 0.0035, friction: 0.7, restitution: 0.05, air: 0.01 },
    rock: { w: 52, h: 52, shape: "circle", density: 0.012, friction: 0.9, restitution: 0.04, air: 0.01 },
    leaf: { w: 28, h: 28, shape: "circle", density: 0.00035, friction: 0.2, restitution: 0.25, air: 0.08, wind: 2.4 },
    cloud: { w: 56, h: 56, shape: "circle", density: 0.00028, friction: 0.01, restitution: 0.2, air: 0.05, lift: 1.05 },
    flower: { w: 28, h: 48, shape: "rect", chamfer: 10, density: 0.001, friction: 0.45, restitution: 0.1, air: 0.02 },
    ball: { w: 38, h: 38, shape: "circle", density: 0.0015, friction: 0.03, restitution: 0.86, air: 0.012 },
    box: { w: 44, h: 44, shape: "rect", chamfer: 5, density: 0.0028, friction: 0.78, restitution: 0.06, air: 0.01 },
    balloon: { w: 36, h: 36, shape: "circle", density: 0.00022, friction: 0.01, restitution: 0.45, air: 0.025, lift: 1.42, wind: 1.8 },
    trampoline: { w: 110, h: 18, shape: "rect", chamfer: 6, density: 0.004, friction: 0.95, restitution: 0.05, pinned: 1 },
    spring: { w: 32, h: 42, shape: "rect", chamfer: 8, density: 0.004, friction: 0.6, restitution: 0.1, pinned: 1, metal: 1 },
    slide: { w: 160, h: 18, shape: "rect", chamfer: 6, density: 0.004, friction: 0.015, restitution: 0.02, pinned: 1 },
    boat: { w: 78, h: 28, shape: "rect", chamfer: 10, density: 0.0011, friction: 0.35, restitution: 0.12, air: 0.02, buoyancy: 2.05 },
    car: { w: 72, h: 32, shape: "rect", chamfer: 8, density: 0.0032, friction: 0.45, restitution: 0.08, air: 0.012, metal: 1 },
    star: { w: 36, h: 36, shape: "circle", density: 0.001, friction: 0.2, restitution: 0.72, air: 0.015, metal: 1 },
    portal: { w: 52, h: 52, shape: "circle", density: 0.001, friction: 0, restitution: 0, pinned: 1, sensor: 1 },
    fan: { w: 44, h: 44, shape: "rect", chamfer: 8, density: 0.004, friction: 0.6, restitution: 0.05, pinned: 1 },
    magnet: { w: 40, h: 36, shape: "rect", chamfer: 8, density: 0.004, friction: 0.6, restitution: 0.05, pinned: 1 }
  };

  var CATS = [
    { id: "people", name: "People", items: [
      ["kid", "Kid"], ["kid2", "Pal"], ["kid3", "Buddy"]
    ]},
    { id: "animals", name: "Animals", items: [
      ["cat", "Cat"], ["dog", "Dog"], ["bird", "Bird"], ["duck", "Duck"], ["fish", "Fish"], ["dino", "Dino"]
    ]},
    { id: "nature", name: "Nature", items: [
      ["tree", "Tree"], ["rock", "Rock"], ["leaf", "Leaf"], ["cloud", "Cloud"], ["flower", "Flower"]
    ]},
    { id: "fun", name: "Fun", items: [
      ["ball", "Ball"], ["box", "Box"], ["balloon", "Balloon"], ["trampoline", "Bounce"], ["spring", "Spring"], ["slide", "Slide"], ["boat", "Boat"], ["car", "Car"]
    ]},
    { id: "magic", name: "Magic", items: [
      ["star", "Star"], ["portal", "Portal"], ["fan", "Fan"], ["magnet", "Magnet"]
    ]}
  ];

  function $(id) { return document.getElementById(id); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function paletteH() {
    var el = $("palette");
    return el ? el.offsetHeight : 160;
  }

  function sfx(kind) {
    if (!soundOn) return;
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      var ac = window._ac || new Ctx();
      window._ac = ac;
      if (ac.state === "suspended") ac.resume();
      var o = ac.createOscillator();
      var g = ac.createGain();
      var now = ac.currentTime;
      o.type = kind === "splash" ? "sine" : "triangle";
      var f = kind === "boing" ? 520 : kind === "splash" ? 220 : kind === "pop" ? 640 : kind === "whoosh" ? 180 : 340;
      o.frequency.setValueAtTime(f, now);
      if (kind === "pop") o.frequency.exponentialRampToValueAtTime(880, now + 0.12);
      if (kind === "boing") o.frequency.exponentialRampToValueAtTime(220, now + 0.16);
      g.gain.setValueAtTime(0.04, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      o.connect(g); g.connect(ac.destination);
      o.start(); o.stop(now + 0.18);
    } catch (e) {}
  }

  function toast(msg) {
    var el = $("toast");
    el.textContent = msg;
    el.classList.remove("off");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.add("off"); }, 1600);
  }

  function resizeCanvas() {
    W = innerWidth; H = innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.floor(W * dpr);
    cv.height = Math.floor(H * dpr);
    cv.style.width = W + "px";
    cv.style.height = H + "px";
  }

  function addStatic(b) {
    statics.push(b);
    M.World.add(engine.world, b);
    return b;
  }

  function buildStage() {
    if (statics.length) M.World.remove(engine.world, statics);
    statics = [];
    var ph = paletteH();
    var depth = clamp((H - ph) * 0.16, 48, 86);
    var floor = H - ph - depth - 18;
    var poolL = clamp(W * 0.05, 16, 48);
    var poolW = clamp(W * 0.32, 120, 300);
    var poolR = poolL + poolW;
    stage = { floor: floor, poolL: poolL, poolR: poolR, poolTop: floor, depth: depth };
    var gh = 120;
    var groundOpt = { isStatic: true, friction: 0.95, restitution: 0, label: "ground" };
    function gnd(x, y, w, h) {
      var b = M.Bodies.rectangle(x, y, w, h, groundOpt);
      b.game = { kind: "ground" };
      return addStatic(b);
    }
    gnd(poolL / 2, floor + gh / 2, poolL + 8, gh);
    gnd((poolR + W) / 2, floor + gh / 2, (W - poolR) + 24, gh);
    gnd((poolL + poolR) / 2, floor + depth + gh / 2 - 8, poolW + 24, gh);
    var wallL = M.Bodies.rectangle(poolL, floor + depth / 2, 14, depth + 8, groundOpt);
    var wallR = M.Bodies.rectangle(poolR, floor + depth / 2, 14, depth + 8, groundOpt);
    wallL.game = { kind: "ground" };
    wallR.game = { kind: "ground" };
    addStatic(wallL); addStatic(wallR);
    waterBody = M.Bodies.rectangle((poolL + poolR) / 2, floor + depth / 2 + 4, poolW - 18, depth, { isStatic: true, isSensor: true, label: "water" });
    waterBody.game = { kind: "water" };
    addStatic(waterBody);
    var side = M.Bodies.rectangle(-20, H / 2, 40, H * 2, groundOpt);
    var side2 = M.Bodies.rectangle(W + 20, H / 2, 40, H * 2, groundOpt);
    side.game = side2.game = { kind: "ground" };
    addStatic(side); addStatic(side2);
    var plank = M.Bodies.rectangle(W * 0.62, floor - Math.min(130, H * 0.18), Math.min(150, W * 0.2), 16, { isStatic: true, friction: 0.7, restitution: 0.05, chamfer: { radius: 4 } });
    plank.game = { kind: "plank" };
    addStatic(plank);
    var plank2 = M.Bodies.rectangle(W * 0.8, floor - Math.min(210, H * 0.3), Math.min(110, W * 0.16), 16, { isStatic: true, friction: 0.7, restitution: 0.05, chamfer: { radius: 4 } });
    plank2.game = { kind: "plank" };
    addStatic(plank2);
    var slide = M.Bodies.rectangle(W * 0.84, floor - 62, Math.min(168, W * 0.28), 16, { isStatic: true, angle: 0.46, friction: 0.02, restitution: 0.02, chamfer: { radius: 5 } });
    slide.game = { kind: "landslide" };
    addStatic(slide);
    stage.slide = slide;
    stage.planks = [plank, plank2];
    if (!clouds.length) {
      for (var i = 0; i < 5; i++) clouds.push({ x: Math.random() * W, y: 30 + Math.random() * 90, s: 0.7 + Math.random() * 0.7, v: 0.12 + Math.random() * 0.18 });
    }
    stageW = W; stageFloor = floor;
  }

  function makeBody(kind, x, y, opt) {
    opt = opt || {};
    var s = SPEC[kind];
    var o = {
      density: s.density,
      friction: s.friction,
      restitution: s.restitution,
      frictionAir: s.air == null ? 0.01 : s.air,
      isStatic: !!s.pinned,
      isSensor: !!s.sensor,
      angle: opt.angle || 0
    };
    if (s.chamfer) o.chamfer = { radius: Math.min(s.chamfer, Math.min(s.w, s.h) / 2 - 1) };
    var b = s.shape === "circle"
      ? M.Bodies.circle(x, y, Math.min(s.w, s.h) / 2, o)
      : M.Bodies.rectangle(x, y, s.w, s.h, o);
    b.game = {
      kind: kind,
      tint: opt.tint || s.tint || "",
      soft: !!s.soft,
      pinned: !!s.pinned,
      lift: s.lift || 0,
      buoyancy: s.buoyancy || 1,
      metal: !!s.metal,
      wind: s.wind || 1,
      dizzy: 0,
      portalCd: 0,
      inWater: false,
      spin: 0,
      id: ++seq,
      pair: opt.pair || 0
    };
    return b;
  }

  function addThing(b) {
    things.push(b);
    M.World.add(engine.world, b);
    updateCount();
    return b;
  }

  function removeBody(b) {
    if (!b) return;
    if (grab === b) grab = null;
    var i = things.indexOf(b);
    if (i >= 0) things.splice(i, 1);
    if (b.game && b.game.mate) b.game.mate.game.mate = null;
    M.World.remove(engine.world, b);
    updateCount();
  }

  function updateCount() {
    $("count").textContent = things.length + " / " + MAX;
  }

  function canSpawn(n) {
    if (things.length + (n || 1) <= MAX) return true;
    toast("World is full!");
    return false;
  }

  function spawn(kind, x, y, opt) {
    opt = opt || {};
    if (kind === "portal") return spawnPortal(x, y);
    if (!canSpawn(1)) return null;
    var s = SPEC[kind];
    var ang = opt.angle;
    if (ang == null && kind === "slide") ang = x > W * 0.62 ? 0.5 : -0.48;
    var b = makeBody(kind, x, y, { tint: opt.tint, angle: ang || 0, pair: opt.pair || 0 });
    if (opt.vx || opt.vy) M.Body.setVelocity(b, { x: opt.vx || 0, y: opt.vy || 0 });
    addThing(b);
    if (!opt.quiet) {
      undoStack.push({ op: "spawn", id: b.game.id });
      if (undoStack.length > 30) undoStack.shift();
    }
    return b;
  }

  function spawnPortal(x, y) {
    if (!canSpawn(2)) return null;
    var pair = ++pairSeq;
    var a = makeBody("portal", x - 36, y, { pair: pair, tint: "#c084fc" });
    var b = makeBody("portal", x + 70, y - 10, { pair: pair, tint: "#22d3ee" });
    a.game.mate = b;
    b.game.mate = a;
    a.game.lead = true;
    addThing(a); addThing(b);
    undoStack.push({ op: "spawn", id: a.game.id, also: b.game.id });
    return a;
  }

  function findById(id) {
    for (var i = 0; i < things.length; i++) if (things[i].game.id === id) return things[i];
    return null;
  }

  function snapshot() {
    return things.map(function (b) {
      return {
        kind: b.game.kind, x: b.position.x, y: b.position.y, a: b.angle,
        vx: b.velocity.x, vy: b.velocity.y, tint: b.game.tint, pair: b.game.pair, lead: !!b.game.lead
      };
    });
  }

  function wipeThings() {
    grab = null;
    M.World.remove(engine.world, things);
    things = [];
    updateCount();
  }

  function restore(list) {
    wipeThings();
    var portals = {};
    list.forEach(function (it) {
      if (it.kind === "portal") {
        var b = makeBody("portal", it.x, it.y, { tint: it.tint, pair: it.pair });
        b.game.lead = !!it.lead;
        addThing(b);
        portals[it.pair] = portals[it.pair] || [];
        portals[it.pair].push(b);
      } else {
        var b2 = spawn(it.kind, it.x, it.y, { tint: it.tint, angle: it.a, vx: it.vx, vy: it.vy, quiet: true });
        if (b2) M.Body.setAngle(b2, it.a || 0);
      }
    });
    Object.keys(portals).forEach(function (k) {
      var arr = portals[k];
      if (arr.length === 2) { arr[0].game.mate = arr[1]; arr[1].game.mate = arr[0]; }
    });
  }

  function burst(x, y, color) {
    for (var i = 0; i < 12; i++) {
      bits.push({
        x: x, y: y,
        vx: (Math.random() - 0.5) * 5,
        vy: -1 - Math.random() * 3.2,
        t: 0, life: 28 + Math.random() * 16,
        color: color || "#fde68a",
        r: 3 + Math.random() * 4
      });
    }
    sfx("pop");
  }

  function ink(ctx, fill) {
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#1e1b4b";
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke();
  }

  function eye(ctx, x, y, dizzy) {
    ctx.save();
    ctx.translate(x, y);
    if (dizzy) {
      ctx.strokeStyle = "#1e1b4b";
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(-4, -4); ctx.lineTo(4, 4);
      ctx.moveTo(4, -4); ctx.lineTo(-4, 4);
      ctx.stroke();
    } else {
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.ellipse(0, 0, 5.2, 6.2, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = "#1e1b4b"; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = "#1e1b4b";
      ctx.beginPath(); ctx.arc(1.2, 0.6, 2.3, 0, 7); ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(0.2, -0.8, 0.9, 0, 7); ctx.fill();
    }
    ctx.restore();
  }

  function smile(ctx, y) {
    ctx.strokeStyle = "#9a3412";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, y, 7, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }

  function drawKind(ctx, kind, opt) {
    opt = opt || {};
    var dizzy = !!opt.dizzy;
    var tint = opt.tint;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    if (kind === "kid" || kind === "kid2" || kind === "kid3") {
      var shirt = tint || "#38bdf8";
      var hair = kind === "kid2" ? "#7c2d12" : kind === "kid3" ? "#1e1b4b" : "#b45309";
      ctx.fillStyle = "#fdba74";
      ctx.fillRect(-6, 16, 5, 12); ctx.fillRect(2, 16, 5, 12);
      ctx.strokeStyle = "#1e1b4b"; ctx.lineWidth = 3; ctx.strokeRect(-6, 16, 5, 12); ctx.strokeRect(2, 16, 5, 12);
      ctx.fillStyle = "#1e293b";
      ctx.beginPath(); ctx.ellipse(-4, 28, 6, 3.5, 0, 0, 7); ctx.ellipse(5, 28, 6, 3.5, 0, 0, 7); ctx.fill();
      ctx.fillStyle = shirt;
      roundRect(ctx, -16, -4, 32, 24, 10); ink(ctx, shirt);
      ctx.strokeStyle = shirt; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(-16, 4); ctx.lineTo(-24, 14); ctx.moveTo(16, 4); ctx.lineTo(24, 12); ctx.stroke();
      ctx.strokeStyle = "#1e1b4b"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-16, 4); ctx.lineTo(-24, 14); ctx.moveTo(16, 4); ctx.lineTo(24, 12); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, -16, 14, 0, 7); ink(ctx, "#fdba74");
      ctx.fillStyle = hair;
      ctx.beginPath(); ctx.arc(0, -18, 14, Math.PI, 0); ctx.fill();
      ctx.fillStyle = "rgba(251,113,133,.45)";
      ctx.beginPath(); ctx.arc(-8, -10, 2.4, 0, 7); ctx.arc(8, -10, 2.4, 0, 7); ctx.fill();
      eye(ctx, -5.5, -16, dizzy); eye(ctx, 5.5, -16, dizzy);
      smile(ctx, -12);
      return;
    }
    if (kind === "cat") {
      ctx.beginPath(); ctx.ellipse(0, 6, 20, 12, 0, 0, 7); ink(ctx, "#fb923c");
      ctx.beginPath(); ctx.moveTo(16, 4); ctx.quadraticCurveTo(30, -8, 22, 14); ctx.strokeStyle = "#fb923c"; ctx.lineWidth = 4; ctx.stroke();
      ctx.strokeStyle = "#1e1b4b"; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.arc(-2, -8, 12, 0, 7); ink(ctx, "#fdba74");
      ctx.fillStyle = "#fb923c";
      ctx.beginPath(); ctx.moveTo(-12, -14); ctx.lineTo(-6, -26); ctx.lineTo(-2, -12); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(2, -14); ctx.lineTo(8, -26); ctx.lineTo(12, -12); ctx.fill(); ctx.stroke();
      eye(ctx, -6, -8, dizzy); eye(ctx, 4, -8, dizzy);
      ctx.fillStyle = "#1e1b4b"; ctx.beginPath(); ctx.arc(-1, -3, 1.6, 0, 7); ctx.fill();
      return;
    }
    if (kind === "dog") {
      ctx.beginPath(); ctx.ellipse(0, 6, 22, 13, 0, 0, 7); ink(ctx, "#b45309");
      ctx.beginPath(); ctx.ellipse(-16, 2, 6, 10, -0.4, 0, 7); ink(ctx, "#92400e");
      ctx.beginPath(); ctx.arc(8, -8, 12, 0, 7); ink(ctx, "#d97706");
      ctx.beginPath(); ctx.ellipse(0, -16, 5, 8, -0.6, 0, 7); ink(ctx, "#92400e");
      ctx.beginPath(); ctx.ellipse(14, -16, 5, 8, 0.5, 0, 7); ink(ctx, "#92400e");
      eye(ctx, 4, -8, dizzy); eye(ctx, 12, -8, dizzy);
      ctx.fillStyle = "#1e1b4b"; ctx.beginPath(); ctx.ellipse(16, -2, 3, 2, 0, 0, 7); ctx.fill();
      ctx.fillStyle = "#fb7185"; ctx.beginPath(); ctx.ellipse(16, 2, 3, 2, 0.4, 0, 7); ctx.fill();
      return;
    }
    if (kind === "bird") {
      ctx.beginPath(); ctx.ellipse(0, 2, 14, 11, 0, 0, 7); ink(ctx, "#38bdf8");
      ctx.beginPath(); ctx.ellipse(-2, 0, 8, 5, -0.6, 0, 7); ink(ctx, "#0ea5e9");
      ctx.beginPath(); ctx.arc(8, -6, 8, 0, 7); ink(ctx, "#7dd3fc");
      ctx.fillStyle = "#f59e0b"; ctx.beginPath(); ctx.moveTo(14, -6); ctx.lineTo(22, -3); ctx.lineTo(14, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      eye(ctx, 8, -8, dizzy);
      return;
    }
    if (kind === "duck") {
      ctx.beginPath(); ctx.ellipse(-2, 6, 20, 12, 0, 0, 7); ink(ctx, "#fde047");
      ctx.beginPath(); ctx.ellipse(4, 2, 9, 6, 0.4, 0, 7); ink(ctx, "#facc15");
      ctx.beginPath(); ctx.arc(12, -6, 10, 0, 7); ink(ctx, "#fde047");
      ctx.fillStyle = "#f97316"; ctx.beginPath(); ctx.ellipse(22, -4, 7, 3.2, 0.1, 0, 7); ctx.fill(); ctx.stroke();
      eye(ctx, 12, -8, dizzy);
      return;
    }
    if (kind === "fish") {
      ctx.beginPath(); ctx.ellipse(2, 0, 16, 10, 0, 0, 7); ink(ctx, "#0284c7");
      ctx.fillStyle = "#38bdf8"; ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(-22, -8); ctx.lineTo(-22, 8); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(4, 2, 5, 3, 0.8, 0, 7); ink(ctx, "#7dd3fc");
      eye(ctx, 10, -2, dizzy);
      return;
    }
    if (kind === "dino") {
      ctx.beginPath(); ctx.ellipse(-2, 4, 22, 14, 0, 0, 7); ink(ctx, "#4ade80");
      ctx.beginPath(); ctx.moveTo(-18, 2); ctx.quadraticCurveTo(-32, 8, -18, 14); ctx.strokeStyle = "#4ade80"; ctx.lineWidth = 6; ctx.stroke();
      ctx.strokeStyle = "#1e1b4b"; ctx.lineWidth = 3; ctx.stroke();
      ctx.beginPath(); ctx.arc(14, -6, 12, 0, 7); ink(ctx, "#86efac");
      ctx.fillStyle = "#166534";
      ctx.beginPath(); ctx.moveTo(-8, -8); ctx.lineTo(-4, -16); ctx.lineTo(0, -8); ctx.fill();
      ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(4, -18); ctx.lineTo(8, -6); ctx.fill();
      eye(ctx, 16, -8, dizzy);
      smile(ctx, -2);
      ctx.fillStyle = "#166534";
      ctx.fillRect(-8, 14, 6, 8); ctx.fillRect(6, 14, 6, 8);
      return;
    }
    if (kind === "tree") {
      ctx.fillStyle = "#92400e"; roundRect(ctx, -8, -6, 16, 52, 4); ink(ctx, "#92400e");
      ctx.beginPath(); ctx.arc(0, -24, 22, 0, 7); ink(ctx, "#16a34a");
      ctx.beginPath(); ctx.arc(-16, -10, 14, 0, 7); ink(ctx, "#22c55e");
      ctx.beginPath(); ctx.arc(16, -8, 14, 0, 7); ink(ctx, "#4ade80");
      return;
    }
    if (kind === "rock") {
      ctx.beginPath();
      ctx.moveTo(-18, 10); ctx.lineTo(-20, -4); ctx.lineTo(-8, -16); ctx.lineTo(8, -14); ctx.lineTo(20, -2); ctx.lineTo(16, 12); ctx.closePath();
      ink(ctx, "#94a3b8");
      ctx.strokeStyle = "#64748b"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-6, -4); ctx.lineTo(2, 4); ctx.stroke();
      return;
    }
    if (kind === "leaf") {
      ctx.beginPath();
      ctx.moveTo(0, -16);
      ctx.bezierCurveTo(14, -8, 14, 8, 0, 16);
      ctx.bezierCurveTo(-14, 8, -14, -8, 0, -16);
      ink(ctx, "#22c55e");
      ctx.strokeStyle = "#14532d"; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(0, 12);
      ctx.moveTo(0, -2); ctx.lineTo(-7, 2); ctx.moveTo(0, -2); ctx.lineTo(7, 2);
      ctx.moveTo(0, 6); ctx.lineTo(-6, 9); ctx.moveTo(0, 6); ctx.lineTo(6, 9);
      ctx.stroke();
      return;
    }
    if (kind === "cloud") {
      ctx.beginPath(); ctx.arc(-10, 4, 12, 0, 7); ctx.arc(6, 2, 14, 0, 7); ctx.arc(16, 8, 9, 0, 7); ink(ctx, "#f8fafc");
      return;
    }
    if (kind === "flower") {
      ctx.strokeStyle = "#166534"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, 4); ctx.lineTo(0, 22); ctx.stroke();
      var cols = ["#fb7185", "#f9a8d4", "#fb7185", "#f9a8d4", "#fb7185"];
      for (var i = 0; i < 5; i++) {
        var a = i / 5 * Math.PI * 2;
        ctx.beginPath(); ctx.arc(Math.cos(a) * 8, -8 + Math.sin(a) * 8, 6, 0, 7); ink(ctx, cols[i]);
      }
      ctx.beginPath(); ctx.arc(0, -8, 4.5, 0, 7); ink(ctx, "#fde047");
      return;
    }
    if (kind === "ball") {
      ctx.beginPath(); ctx.arc(0, 0, 16, 0, 7); ink(ctx, "#ef4444");
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(0, 0, 16, -0.7, 0.7); ctx.arc(0, 0, 16, Math.PI - 0.7, Math.PI + 0.7); ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0, 16, 0, 7); ctx.stroke();
      return;
    }
    if (kind === "box") {
      roundRect(ctx, -20, -20, 40, 40, 5); ink(ctx, "#d97706");
      ctx.strokeStyle = "#fde68a"; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(0, 20); ctx.moveTo(-20, 0); ctx.lineTo(20, 0); ctx.stroke();
      return;
    }
    if (kind === "balloon") {
      ctx.strokeStyle = "#1e1b4b"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, 14); ctx.lineTo(0, 28); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, -2, 16, 20, 0, 0, 7); ink(ctx, tint || "#f472b6");
      ctx.fillStyle = "rgba(255,255,255,.45)";
      ctx.beginPath(); ctx.ellipse(-5, -8, 4, 7, -0.4, 0, 7); ctx.fill();
      ctx.fillStyle = tint || "#f472b6";
      ctx.beginPath(); ctx.moveTo(-4, 16); ctx.lineTo(4, 16); ctx.lineTo(0, 22); ctx.closePath(); ctx.fill(); ctx.stroke();
      return;
    }
    if (kind === "trampoline") {
      ctx.strokeStyle = "#1e1b4b"; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(-40, -2); ctx.lineTo(-46, 14); ctx.moveTo(40, -2); ctx.lineTo(46, 14); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, 0, 48, 10, 0, 0, 7); ink(ctx, "#fb7185");
      ctx.strokeStyle = "#9f1239"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(0, 0, 30, 5, 0, 0, Math.PI); ctx.stroke();
      return;
    }
    if (kind === "spring") {
      ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(-8, 16);
      for (var k = 0; k < 6; k++) ctx.lineTo(k % 2 ? -8 : 8, 14 - k * 5);
      ctx.stroke();
      ctx.fillStyle = "#ef4444"; roundRect(ctx, -12, -18, 24, 10, 3); ink(ctx, "#ef4444");
      return;
    }
    if (kind === "slide" || kind === "landslide") {
      roundRect(ctx, -78, -9, 156, 18, 5); ink(ctx, "#facc15");
      ctx.fillStyle = "#f97316";
      ctx.fillRect(-78, -16, 12, 20);
      ctx.strokeStyle = "#1e1b4b"; ctx.strokeRect(-78, -16, 12, 20);
      return;
    }
    if (kind === "plank") {
      roundRect(ctx, -70, -8, 140, 16, 4); ink(ctx, "#b45309");
      ctx.strokeStyle = "#78350f"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-40, -8); ctx.lineTo(-40, 8); ctx.moveTo(10, -8); ctx.lineTo(10, 8); ctx.stroke();
      return;
    }
    if (kind === "boat") {
      ctx.beginPath(); ctx.moveTo(-36, 0); ctx.lineTo(-24, 12); ctx.lineTo(24, 12); ctx.lineTo(36, 0); ctx.closePath();
      ink(ctx, "#b45309");
      ctx.fillStyle = "#fde68a"; ctx.fillRect(-4, -22, 5, 24);
      ctx.beginPath(); ctx.moveTo(1, -20); ctx.lineTo(22, -6); ctx.lineTo(1, -4); ctx.closePath(); ink(ctx, "#fff");
      return;
    }
    if (kind === "car") {
      roundRect(ctx, -32, -6, 64, 20, 8); ink(ctx, "#ef4444");
      roundRect(ctx, -14, -18, 30, 14, 6); ink(ctx, "#bfdbfe");
      ctx.fillStyle = "#1e293b";
      ctx.beginPath(); ctx.arc(-18, 12, 7, 0, 7); ctx.arc(18, 12, 7, 0, 7); ctx.fill();
      ctx.fillStyle = "#e2e8f0";
      var sp = opt.spin || 0;
      ctx.beginPath(); ctx.arc(-18, 12, 3, sp, sp + 1.2); ctx.arc(18, 12, 3, sp, sp + 1.2); ctx.strokeStyle = "#e2e8f0"; ctx.stroke();
      return;
    }
    if (kind === "star") {
      starPath(ctx, 0, 0, 16, 7);
      ink(ctx, "#fde047");
      return;
    }
    if (kind === "portal") {
      ctx.beginPath(); ctx.arc(0, 0, 20, 0, 7); ink(ctx, tint || "#c084fc");
      ctx.beginPath(); ctx.arc(0, 0, 11, opt.spin || 0, (opt.spin || 0) + 4); ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 5, 0, 7); ctx.fillStyle = "#1e1b4b"; ctx.fill();
      return;
    }
    if (kind === "fan") {
      roundRect(ctx, -18, -16, 36, 32, 6); ink(ctx, "#64748b");
      ctx.save();
      ctx.rotate(opt.spin || 0);
      ctx.fillStyle = "#e2e8f0";
      for (var n = 0; n < 3; n++) {
        ctx.rotate((Math.PI * 2) / 3);
        ctx.beginPath(); ctx.ellipse(8, 0, 10, 4, 0, 0, 7); ctx.fill(); ctx.stroke();
      }
      ctx.restore();
      return;
    }
    if (kind === "magnet") {
      ctx.strokeStyle = "#ef4444"; ctx.lineWidth = 10; ctx.lineCap = "butt";
      ctx.beginPath(); ctx.arc(0, 2, 12, Math.PI, 0); ctx.stroke();
      ctx.strokeStyle = "#e2e8f0"; ctx.lineWidth = 10;
      ctx.beginPath(); ctx.moveTo(-12, 2); ctx.lineTo(-12, 16); ctx.moveTo(12, 2); ctx.lineTo(12, 16); ctx.stroke();
      ctx.strokeStyle = "#1e1b4b"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 2, 12, Math.PI, 0); ctx.moveTo(-12, 2); ctx.lineTo(-12, 16); ctx.moveTo(12, 2); ctx.lineTo(12, 16); ctx.stroke();
      return;
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function starPath(ctx, x, y, r, inner) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var rad = i % 2 ? inner : r;
      var a = -Math.PI / 2 + i * Math.PI / 5;
      var px = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  function drawBackground() {
    var floor = stage.floor;
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#bae6fd");
    g.addColorStop(0.45, "#7dd3fc");
    g.addColorStop(1, "#e0f2fe");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    var sun = ctx.createRadialGradient(W * 0.78, 70, 10, W * 0.78, 70, 90);
    sun.addColorStop(0, "#fef9c3");
    sun.addColorStop(1, "rgba(253,224,71,0)");
    ctx.fillStyle = sun;
    ctx.beginPath(); ctx.arc(W * 0.78, 70, 90, 0, 7); ctx.fill();
    ctx.fillStyle = "#fde047";
    ctx.beginPath(); ctx.arc(W * 0.78, 70, 28, 0, 7); ctx.fill();
    ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = 3; ctx.stroke();
    clouds.forEach(function (c) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.scale(c.s, c.s);
      drawKind(ctx, "cloud");
      ctx.restore();
    });
    hill(floor - 70, "#86efac", 26, 0.4);
    hill(floor - 36, "#4ade80", 34, 1.2);
    ctx.fillStyle = "#65a30d";
    ctx.fillRect(0, floor - 8, W, H - floor + 8);
    ctx.fillStyle = "#166534";
    ctx.fillRect(0, floor - 8, W, 10);
    var px = stage.poolL, pr = stage.poolR, top = stage.poolTop, dep = stage.depth;
    ctx.fillStyle = "#0369a1";
    roundRect(ctx, px + 4, top - 4, pr - px - 8, dep + 8, 8);
    ctx.fill();
    var wg = ctx.createLinearGradient(0, top, 0, top + dep);
    wg.addColorStop(0, "rgba(125,211,252,.95)");
    wg.addColorStop(1, "rgba(3,105,161,.85)");
    ctx.fillStyle = wg;
    roundRect(ctx, px + 8, top, pr - px - 16, dep, 8);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.7)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    var wave = performance.now() / 280;
    ctx.moveTo(px + 12, top + 8);
    for (var x = px + 12; x < pr - 12; x += 10) ctx.lineTo(x, top + 8 + Math.sin(x * 0.08 + wave) * 2.5);
    ctx.stroke();
    stage.planks.forEach(drawBody);
    drawBody(stage.slide);
  }

  function hill(y, color, amp, phase) {
    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(0, y);
    for (var x = 0; x <= W; x += 16) ctx.lineTo(x, y - amp * 0.45 - Math.sin(x * 0.008 + phase) * amp);
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  function drawBody(b) {
    if (!b || !b.game) return;
    var k = b.game.kind;
    if (k === "ground" || k === "water") return;
    ctx.save();
    ctx.translate(b.position.x, b.position.y);
    ctx.rotate(b.angle);
    if (b.game.spin == null) b.game.spin = 0;
    drawKind(ctx, k, { tint: b.game.tint, dizzy: b.game.dizzy > 0, spin: b.game.spin });
    ctx.restore();
    if (b.game.dizzy > 0) {
      ctx.save();
      ctx.translate(b.position.x, b.position.y - 30);
      ctx.fillStyle = "#fde047";
      for (var i = 0; i < 3; i++) {
        var a = performance.now() / 200 + i * 2.1;
        starPath(ctx, Math.cos(a) * 16, Math.sin(a) * 8, 5, 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawBits() {
    bits.forEach(function (p) {
      ctx.globalAlpha = clamp(1 - p.t / p.life, 0, 1);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
    });
  }

  function drawGhost() {
    if (!pointer || !armed || tool !== "hand" || grab) return;
    if (pointer.y > H - paletteH()) return;
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.translate(pointer.x, pointer.y);
    var s = SPEC[armed];
    var sc = 1;
    ctx.scale(sc, sc);
    drawKind(ctx, armed, { tint: SPEC[armed].tint });
    ctx.restore();
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawBackground();
    var drawList = things.slice().sort(function (a, b) { return a.position.y - b.position.y; });
    drawList.forEach(drawBody);
    if (waterBody) {
      ctx.save();
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = "#38bdf8";
      var px = stage.poolL, pr = stage.poolR;
      ctx.fillRect(px + 10, stage.poolTop + 6, pr - px - 20, stage.depth - 6);
      ctx.restore();
    }
    drawBits();
    drawGhost();
    if (paused) {
      ctx.fillStyle = "rgba(15,23,42,.28)";
      ctx.fillRect(0, 0, W, H - paletteH());
      ctx.fillStyle = "#fff";
      ctx.font = "900 42px Trebuchet MS, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Paused", W / 2, 120);
    }
  }

  function gravityForce(body) {
    return engine.gravity.y * engine.gravity.scale * body.mass;
  }

  function inWater(body) {
    if (!stage) return false;
    var top = stage.poolTop;
    var bot = stage.poolTop + stage.depth;
    return body.position.x > stage.poolL + 10 && body.position.x < stage.poolR - 10 && body.bounds.max.y > top && body.position.y < bot + 20;
  }

  function extras() {
    var fans = [];
    var magnets = [];
    var portals = [];
    var lost = [];
    things.forEach(function (b) {
      if (!b.game) return;
      if (b.game.kind === "fan") { b.game.spin += paused ? 0 : 0.35; fans.push(b); }
      if (b.game.kind === "portal") { b.game.spin = (b.game.spin || 0) + (paused ? 0 : 0.08); portals.push(b); }
      if (b.game.kind === "magnet") magnets.push(b);
      if (b.game.kind === "car") b.game.spin = (b.game.spin || 0) + b.velocity.x * 0.08;
      if (b.game.dizzy > 0 && !paused) b.game.dizzy--;
    });
    if (paused) return;
    things.forEach(function (b) {
      if (b.isStatic) return;
      var wet = inWater(b);
      if (b.isSleeping && !wet && b.game.lift <= 1) return;
      if (wet && b.isSleeping) M.Sleeping.set(b, false);
      if (wet && !b.game.inWater) {
        burst(b.position.x, stage.poolTop, "#e0f2fe");
        if (!splashCd) { sfx("splash"); splashCd = 12; }
      }
      b.game.inWater = wet;
      if (wet) {
        var depth = clamp((b.bounds.max.y - stage.poolTop) / Math.max(10, b.bounds.max.y - b.bounds.min.y), 0, 1);
        var g = gravityForce(b);
        M.Body.applyForce(b, b.position, {
          x: -b.velocity.x * b.mass * 0.002,
          y: -g * (b.game.buoyancy || 1.2) * depth
        });
        if (b.game.kind === "fish") {
          M.Body.applyForce(b, b.position, { x: Math.sin(performance.now() / 300 + b.game.id) * b.mass * 0.0008, y: 0 });
        }
      }
      if (b.game.lift) {
        var up = gravityForce(b) * b.game.lift;
        if (b.velocity.y < -3.2 && b.game.lift > 1.1) up *= 0.25;
        if (b.position.y < 64 && b.game.lift > 1) up = -gravityForce(b) * 0.4;
        M.Body.applyForce(b, b.position, { x: 0, y: -up });
      }
      fans.forEach(function (fan) {
        var dx = b.position.x - fan.position.x;
        var dy = b.position.y - fan.position.y;
        if (dx > 8 && dx < 180 && Math.abs(dy) < 52 && b !== fan) {
          M.Body.applyForce(b, b.position, { x: 0.0009 * b.mass * (b.game.wind || 1), y: -0.00015 * b.mass });
          if (b.isSleeping) M.Sleeping.set(b, false);
        }
      });
      magnets.forEach(function (mag) {
        if (!b.game.metal || b === mag) return;
        var dx2 = mag.position.x - b.position.x;
        var dy2 = mag.position.y - b.position.y;
        var dist = Math.hypot(dx2, dy2);
        if (dist < 170 && dist > 24) {
          M.Body.applyForce(b, b.position, { x: dx2 / dist * b.mass * 0.0014, y: dy2 / dist * b.mass * 0.0014 });
          if (b.isSleeping) M.Sleeping.set(b, false);
        }
      });
      if (b.game.portalCd > 0) b.game.portalCd--;
      else if (!b.game.pinned && b.game.kind !== "portal") {
        for (var i = 0; i < portals.length; i++) {
          var p = portals[i];
          if (!p.game.mate) continue;
          if (Math.hypot(b.position.x - p.position.x, b.position.y - p.position.y) < 26) {
            var m = p.game.mate;
            M.Body.setPosition(b, { x: m.position.x + 36, y: m.position.y - 8 });
            M.Body.setVelocity(b, { x: b.velocity.x, y: Math.min(b.velocity.y, 2) });
            b.game.portalCd = 20;
            burst(m.position.x, m.position.y, p.game.tint || "#c084fc");
            break;
          }
        }
      }
      var speed = Math.hypot(b.velocity.x, b.velocity.y);
      if (speed > 26) M.Body.setVelocity(b, { x: b.velocity.x * 26 / speed, y: b.velocity.y * 26 / speed });
      if (!b.isStatic && (b.position.y > H + 80 || b.position.x < -120 || b.position.x > W + 120)) {
        lost.push(b);
      }
    });
    lost.forEach(function (b) {
      var kind = b.game.kind;
      var tint = b.game.tint;
      var pinned = b.game.pinned;
      burst(clamp(b.position.x, 20, W - 20), clamp(b.position.y, 30, stage.floor), "#fde68a");
      removeBody(b);
      if (things.length < MAX && kind !== "portal") {
        var nb = spawn(kind, W * 0.5, 70, { tint: tint, quiet: true });
        if (nb && pinned) { nb.isStatic = true; nb.game.pinned = true; }
      }
    });
    if (splashCd > 0) splashCd--;
    for (var j = bits.length - 1; j >= 0; j--) {
      var p = bits[j];
      p.t++; p.x += p.vx; p.y += p.vy; p.vy += 0.12;
      if (p.t > p.life) bits.splice(j, 1);
    }
    clouds.forEach(function (c) {
      c.x += c.v;
      if (c.x > W + 40) c.x = -40;
    });
  }

  M.Events.on(engine, "beforeUpdate", extras);

  M.Events.on(engine, "collisionStart", function (ev) {
    ev.pairs.forEach(function (pair) {
      var A = pair.bodyA, B = pair.bodyB;
      boost(A, B); boost(B, A);
      var rv = Math.hypot(A.velocity.x - B.velocity.x, A.velocity.y - B.velocity.y);
      if (rv > 3.4) sfx("bounce");
      [A, B].forEach(function (b) {
        if (b.game && b.game.soft && rv > 8) b.game.dizzy = 50;
      });
    });
  });

  function boost(pad, other) {
    if (!pad.game || !other.game || other.isStatic) return;
    if (pad.game.kind === "trampoline" && other.velocity.y > 0.6) {
      M.Body.setVelocity(other, { x: other.velocity.x * 0.92, y: -Math.min(15, Math.abs(other.velocity.y) * 1.15 + 7) });
      M.Sleeping.set(other, false);
      sfx("boing");
    }
    if (pad.game.kind === "spring" && other.velocity.y > 0.4) {
      M.Body.setVelocity(other, { x: other.velocity.x * 0.5, y: -16 });
      M.Sleeping.set(other, false);
      sfx("boing");
    }
  }

  function hitThing(x, y) {
    var hits = M.Query.point(things, { x: x, y: y });
    if (!hits.length) return null;
    hits.sort(function (a, b) { return a.area - b.area; });
    return hits[0];
  }

  function pointerDown(e) {
    if (!playing) return;
    var p = kidPt(e, cv);
    pointer = p;
    if (p.y > H - paletteH() + 4) return;
    cv.setPointerCapture(e.pointerId);
    if (tool === "erase") {
      var target = hitThing(p.x, p.y);
      if (target) {
        undoStack.push({ op: "restore", data: snapshot() });
        burst(target.position.x, target.position.y, "#fde68a");
        if (target.game.mate) removeBody(target.game.mate);
        removeBody(target);
        toast("Poof!");
      }
      return;
    }
    var body = hitThing(p.x, p.y);
    if (body) {
      grab = body;
      grabPtr = e.pointerId;
      samples = [{ x: p.x, y: p.y, t: performance.now() }];
      if (body.isStatic) body.isStatic = false;
      M.Sleeping.set(body, false);
      M.Body.setVelocity(body, { x: 0, y: 0 });
      return;
    }
    if (armed) {
      var dropY = p.y;
      var overBank = p.x < stage.poolL || p.x > stage.poolR;
      if (overBank && dropY > stage.floor - 24) dropY = stage.floor - 36;
      var made = spawn(armed, p.x, dropY);
      if (made) {
        sfx("whoosh");
        advanceTutor(1);
      }
    }
  }

  function pointerMove(e) {
    var p = kidPt(e, cv);
    pointer = p;
    if (!grab || e.pointerId !== grabPtr) return;
    M.Body.setPosition(grab, { x: p.x, y: p.y });
    M.Body.setVelocity(grab, { x: 0, y: 0 });
    samples.push({ x: p.x, y: p.y, t: performance.now() });
    if (samples.length > 6) samples.shift();
  }

  function pointerUp(e) {
    if (!grab || (grabPtr != null && e.pointerId !== grabPtr)) return;
    var now = samples[samples.length - 1];
    var prev = samples[Math.max(0, samples.length - 4)];
    if (now && prev && now.t > prev.t) {
      var scale = 16.6 / (now.t - prev.t);
      var vx = clamp((now.x - prev.x) * scale, -20, 20);
      var vy = clamp((now.y - prev.y) * scale, -20, 20);
      M.Body.setVelocity(grab, { x: vx, y: vy });
      if (Math.hypot(vx, vy) > 3) { sfx("whoosh"); advanceTutor(2); }
    }
    if (grab.game.pinned) {
      grab.isStatic = true;
      M.Body.setVelocity(grab, { x: 0, y: 0 });
    }
    grab = null;
    grabPtr = null;
  }

  function frame(t) {
    var dt = Math.min(34, t - lastT || 16);
    lastT = t;
    if (built && stage && (Math.abs(W - stageW) > 12 || Math.abs(stage.floor - stageFloor) > 20)) {
      var oldF = stageFloor, oldW = stageW || W;
      buildStage();
      var dy = stage.floor - oldF;
      var sx = oldW ? W / oldW : 1;
      things.forEach(function (b) {
        M.Body.setPosition(b, { x: b.position.x * sx, y: b.position.y + dy });
      });
    }
    if (!paused && playing) {
      acc += dt;
      var steps = 0;
      while (acc >= 16.6 && steps < 3) {
        M.Engine.update(engine, 16.6);
        acc -= 16.6;
        steps++;
      }
    }
    if (stage) draw();
    requestAnimationFrame(frame);
  }

  function surprise() {
    undoStack.push({ op: "restore", data: snapshot() });
    wipeThings();
    var floor = stage.floor;
    var scenes = [sceneBounce, scenePond, sceneSky, sceneCars];
    scenes[Math.floor(Math.random() * scenes.length)]();
    toast("Surprise scene!");
    function sceneBounce() {
      spawn("trampoline", W * 0.55, floor - 20, { quiet: true });
      spawn("ball", W * 0.55, floor - 160, { quiet: true });
      spawn("ball", W * 0.48, floor - 200, { quiet: true });
      spawn("kid", W * 0.6, floor - 240, { quiet: true });
      spawn("kid2", W * 0.42, floor - 120, { quiet: true });
      spawn("star", W * 0.7, 80, { quiet: true });
    }
    function scenePond() {
      spawn("boat", (stage.poolL + stage.poolR) / 2, stage.poolTop - 10, { quiet: true });
      spawn("duck", stage.poolL + 40, stage.poolTop + 10, { quiet: true });
      spawn("duck", stage.poolR - 36, stage.poolTop + 16, { quiet: true });
      spawn("fish", stage.poolL + 70, stage.poolTop + stage.depth * 0.6, { quiet: true });
      spawn("fish", stage.poolR - 50, stage.poolTop + stage.depth * 0.7, { quiet: true });
      spawn("tree", stage.poolR + 70, floor - 60, { quiet: true });
      spawn("flower", stage.poolR + 120, floor - 30, { quiet: true });
    }
    function sceneSky() {
      spawn("fan", W * 0.28, floor - 30, { quiet: true });
      spawn("balloon", W * 0.42, floor - 180, { quiet: true, tint: "#f472b6" });
      spawn("balloon", W * 0.55, floor - 220, { quiet: true, tint: "#38bdf8" });
      spawn("balloon", W * 0.66, floor - 160, { quiet: true, tint: "#fde047" });
      spawn("cloud", W * 0.5, 90, { quiet: true });
      spawn("leaf", W * 0.36, floor - 140, { quiet: true });
      spawn("bird", W * 0.72, 110, { quiet: true });
    }
    function sceneCars() {
      spawn("slide", W * 0.58, floor - 90, { quiet: true });
      spawn("car", W * 0.48, floor - 180, { quiet: true });
      spawn("box", W * 0.7, floor - 40, { quiet: true });
      spawn("box", W * 0.7, floor - 90, { quiet: true });
      spawn("dino", W * 0.32, floor - 40, { quiet: true });
      spawn("kid3", W * 0.24, floor - 80, { quiet: true });
      spawn("star", W * 0.4, 70, { quiet: true });
    }
  }

  function doClear() {
    undoStack.push({ op: "restore", data: snapshot() });
    wipeThings();
    toast("All clear");
  }

  function doUndo() {
    var step = undoStack.pop();
    if (!step) { toast("Nothing to undo"); return; }
    if (step.op === "restore") { restore(step.data); toast("Undone"); return; }
    if (step.op === "spawn") {
      var b = findById(step.id);
      if (b) {
        if (b.game.mate) removeBody(b.game.mate);
        removeBody(b);
      }
      if (step.also) { var b2 = findById(step.also); if (b2) removeBody(b2); }
      toast("Undone");
    }
  }

  function doSave() {
    try {
      localStorage.setItem("alabryuu-melon-scene", JSON.stringify(snapshot()));
      toast("Saved");
    } catch (e) { toast("Could not save"); }
  }

  function doLoad() {
    var raw = null;
    try { raw = localStorage.getItem("alabryuu-melon-scene"); } catch (e) {}
    if (!raw) { toast("No saved world yet"); return; }
    try {
      undoStack.push({ op: "restore", data: snapshot() });
      restore(JSON.parse(raw));
      toast("Loaded");
    } catch (e2) { toast("Could not load"); }
  }

  function doRestart() {
    undoStack.push({ op: "restore", data: snapshot() });
    wipeThings();
    toast("Fresh world");
  }

  function setPaused(v) {
    paused = v;
    var btn = document.querySelector('[data-act="pause"]');
    if (btn) btn.textContent = paused ? "Play" : "Pause";
  }

  function setSound(v) {
    soundOn = v;
    try { localStorage.setItem("alabryuu-melon-sound", v ? "1" : "0"); } catch (e) {}
    var btn = document.querySelector('[data-act="sound"]');
    if (btn) btn.textContent = soundOn ? "Sound on" : "Sound off";
    if (v) sfx("pop");
  }

  function selectCat(id) {
    cat = id;
    document.querySelectorAll("#cats button").forEach(function (b) {
      b.classList.toggle("on", b.getAttribute("data-cat") === id);
    });
    var box = $("items");
    box.innerHTML = "";
    var found = CATS.filter(function (c) { return c.id === id; })[0];
    found.items.forEach(function (pair) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.setAttribute("data-item", pair[0]);
      var icon = document.createElement("canvas");
      icon.width = 112; icon.height = 112;
      var label = document.createElement("span");
      label.textContent = pair[1];
      btn.appendChild(icon);
      btn.appendChild(label);
      if (armed === pair[0]) btn.classList.add("on");
      btn.addEventListener("click", function () {
        armed = pair[0];
        tool = "hand";
        markModes();
        document.querySelectorAll("#items button").forEach(function (el) {
          el.classList.toggle("on", el.getAttribute("data-item") === armed);
        });
        advanceTutor(0);
      });
      box.appendChild(btn);
      var ict = icon.getContext("2d");
      ict.setTransform(2, 0, 0, 2, 56, 62);
      var spec = SPEC[pair[0]];
      var sc = 54 / Math.max(spec.w, spec.h);
      ict.scale(sc, sc);
      drawKind(ict, pair[0], { tint: spec.tint });
    });
  }

  function markModes() {
    document.querySelectorAll("[data-tool]").forEach(function (b) {
      b.classList.toggle("on", b.getAttribute("data-tool") === tool);
    });
  }

  function renderTutor() {
    var el = $("tutor");
    if (!tutorOn) { el.classList.add("off"); return; }
    el.classList.remove("off");
    var lines = [
      "Tap a picture in the tray.",
      "Tap the world to drop it in.",
      "Drag a thing to throw it."
    ];
    $("tutor-n").textContent = "Step " + (tutorStep + 1) + " of 3";
    $("tutor-p").textContent = lines[tutorStep] || lines[2];
    $("tutor-next").textContent = tutorStep >= 2 ? "Let's play" : "Next";
  }

  function advanceTutor(step) {
    if (!tutorOn || tutorStep !== step) return;
    tutorStep++;
    if (tutorStep >= 3) finishTutor();
    else renderTutor();
  }

  function finishTutor() {
    tutorOn = false;
    try { localStorage.setItem("alabryuu-melon-tutor", "1"); } catch (e) {}
    renderTutor();
  }

  function bootUI() {
    var tools = $("tools");
    var acts = [
      ["pause", "Pause"], ["clear", "Clear"], ["undo", "Undo"], ["surprise", "Surprise"],
      ["save", "Save"], ["load", "Load"], ["restart", "Restart"], ["sound", soundOn ? "Sound on" : "Sound off"]
    ];
    acts.forEach(function (a) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = a[1];
      b.setAttribute("data-act", a[0]);
      b.addEventListener("click", function () {
        if (a[0] === "pause") setPaused(!paused);
        if (a[0] === "clear") doClear();
        if (a[0] === "undo") doUndo();
        if (a[0] === "surprise") surprise();
        if (a[0] === "save") doSave();
        if (a[0] === "load") doLoad();
        if (a[0] === "restart") doRestart();
        if (a[0] === "sound") setSound(!soundOn);
      });
      tools.appendChild(b);
    });
    var cats = $("cats");
    [["hand", "Hand"], ["erase", "Eraser"]].forEach(function (m) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = m[1];
      b.setAttribute("data-tool", m[0]);
      b.addEventListener("click", function () {
        tool = m[0];
        if (tool === "erase") armed = null;
        markModes();
        document.querySelectorAll("#items button").forEach(function (el) { el.classList.remove("on"); });
      });
      cats.appendChild(b);
    });
    CATS.forEach(function (c) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = c.name;
      b.setAttribute("data-cat", c.id);
      b.addEventListener("click", function () { selectCat(c.id); });
      cats.appendChild(b);
    });
    markModes();
    selectCat("fun");
    document.querySelector('[data-item="ball"]').classList.add("on");
  }

  function paintHero() {
    var h = $("hero-art");
    var c = h.getContext("2d");
    c.setTransform(2, 0, 0, 2, 0, 0);
    c.fillStyle = "#7dd3fc";
    c.fillRect(0, 0, 180, 140);
    c.fillStyle = "#4ade80";
    c.beginPath(); c.ellipse(90, 120, 80, 24, 0, 0, 7); c.fill();
    c.fillStyle = "#38bdf8";
    c.fillRect(16, 100, 54, 22);
    c.save(); c.translate(48, 78); c.scale(0.7, 0.7); drawKind(c, "kid", { tint: "#38bdf8" }); c.restore();
    c.save(); c.translate(100, 88); c.scale(0.9, 0.9); drawKind(c, "ball"); c.restore();
    c.save(); c.translate(140, 46); c.scale(0.8, 0.8); drawKind(c, "balloon", { tint: "#f472b6" }); c.restore();
  }

  cv.addEventListener("pointerdown", pointerDown);
  cv.addEventListener("pointermove", pointerMove);
  cv.addEventListener("pointerup", pointerUp);
  cv.addEventListener("pointercancel", pointerUp);
  cv.addEventListener("contextmenu", function (e) { e.preventDefault(); });

  $("go").addEventListener("click", function () {
    $("title").classList.add("off");
    playing = true;
    var seen = false;
    try { seen = localStorage.getItem("alabryuu-melon-tutor") === "1"; } catch (e) {}
    tutorOn = !seen;
    tutorStep = 0;
    renderTutor();
  });
  $("tutor-next").addEventListener("click", function () {
    if (tutorStep >= 2) finishTutor();
    else { tutorStep++; renderTutor(); }
  });
  $("tutor-skip").addEventListener("click", finishTutor);

  addEventListener("resize", resizeCanvas);

  bootUI();
  paintHero();
  resizeCanvas();
  buildStage();
  built = true;
  updateCount();
  requestAnimationFrame(frame);
})();

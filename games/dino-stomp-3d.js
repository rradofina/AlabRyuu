/* Dino Stomp 3D sample. Primitive placeholders only.
   Color and layout cues: assets/refs/dino-3d/ */
import * as THREE from "three";

const cv = document.getElementById("c");
const sayEl = document.getElementById("say");
const flEl = document.getElementById("fl");
const stEl = document.getElementById("st");
const titleEl = document.getElementById("title");
const winEl = document.getElementById("win");
const dockEl = document.getElementById("dock");

const phone = Math.min(window.innerWidth, window.innerHeight) < 720;
const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: !phone, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, phone ? 1 : 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9fd8f3);

const GOAL = 12;
const DINO_SCALE = 1.7;
const ROCK_SIZE = 0.72;
const FLOWER_SCALE = 1.8;
const RUN = 3.4;

const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 120);
camera.position.set(-6, 3.6, 7.4);
const look = new THREE.Vector3();

scene.add(new THREE.AmbientLight(0xffffff, 0.7));
const sun = new THREE.DirectionalLight(0xfff6e0, 1.3);
sun.position.set(6, 10, 4);
scene.add(sun);

function mat(color) {
  return new THREE.MeshLambertMaterial({ color: color });
}
const green = mat(0x6fc24a);
const belly = mat(0xe4ef7a);
const spike = mat(0x3d8f86);
const orange = mat(0xe8963a);
const wood = mat(0xc4894a);
const leaf = mat(0x3aaa3a);
const sand = mat(0xf0d7a2);
const grass = mat(0x7ed36a);
const water = mat(0x3ec0e0);
const rock = mat(0x9aa0a6);
const lava = mat(0xe25822);
const dark = mat(0x2a2624);

const ocean = new THREE.Mesh(new THREE.CircleGeometry(28, 32), water);
ocean.rotation.x = -Math.PI / 2;
ocean.position.y = -0.35;
scene.add(ocean);

const beach = new THREE.Mesh(new THREE.CylinderGeometry(11, 11.4, 0.3, 28), sand);
beach.position.y = -0.12;
scene.add(beach);

const island = new THREE.Mesh(new THREE.CylinderGeometry(9.2, 9.6, 0.45, 28), grass);
island.position.y = 0.05;
scene.add(island);
const lane = new THREE.Mesh(new THREE.BoxGeometry(72, 0.35, 7), grass);
lane.position.set(32, 0.18, 0);
scene.add(lane);

const river = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.08, 16), water);
river.position.set(2.4, 0.32, -1.2);
river.rotation.y = 0.45;
scene.add(river);

function palm(x, z) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 2.2, 8), wood);
  trunk.position.y = 1.1;
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 6), leaf);
  top.position.y = 2.3;
  g.add(trunk, top);
  g.position.set(x, 0.2, z);
  scene.add(g);
}
[[-7, -1], [8, 3], [6, -3], [-6, 2], [3.5, 4.2], [-2, -5], [5, -5]].forEach(function (p) { palm(p[0], p[1]); });

function boulder(x, z, s) {
  const m = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rock);
  m.position.set(x, 0.25 + s * 0.3, z);
  scene.add(m);
}
[[-5, 1, 0.45], [4, -2, 0.55], [8, 0.5, 0.4], [-3, 3.5, 0.35], [1.5, -4, 0.5]].forEach(function (p) {
  boulder(p[0], p[1], p[2]);
});

function hut(x, z) {
  const g = new THREE.Group();
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.15, 1.3, 12), wood);
  wall.position.y = 0.7;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.5, 1.1, 10), leaf);
  roof.position.y = 1.7;
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 0.08), dark);
  door.position.set(0, 0.4, 1.12);
  g.add(wall, roof, door);
  g.position.set(x, 0.2, z);
  scene.add(g);
}
hut(4.5, -3.5);

function tower(x, z) {
  const g = new THREE.Group();
  [[-0.45, -0.45], [0.45, -0.45], [0.45, 0.45], [-0.45, 0.45]].forEach(function (c) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.6, 6), wood);
    post.position.set(c[0], 1.3, c[1]);
    g.add(post);
  });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.1, 1.3), wood);
  deck.position.y = 2.3;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.9, 0.6, 8), leaf);
  roof.position.y = 2.8;
  const flag = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.02), mat(0xe23b3b));
  flag.position.set(0.35, 3.15, 0);
  g.add(deck, roof, flag);
  g.position.set(x, 0.2, z);
  scene.add(g);
}
tower(-1.2, -4.2);

const volcano = new THREE.Group();
const cone = new THREE.Mesh(new THREE.ConeGeometry(2.2, 2.8, 12), rock);
cone.position.y = 1.4;
const glow = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.5, 8), lava);
glow.position.y = 2.7;
const cave = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), dark);
cave.position.set(0, 0.45, 1.3);
volcano.add(cone, glow, cave);
volcano.position.set(6.5, 0.2, -6.5);
scene.add(volcano);

function makeDino() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 12), green);
  body.scale.set(1.15, 0.9, 0.8);
  body.position.y = 0.7;
  const tum = new THREE.Mesh(new THREE.SphereGeometry(0.38, 12, 10), belly);
  tum.scale.set(0.9, 1.1, 0.7);
  tum.position.set(0.05, 0.62, 0.28);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 14, 12), green);
  head.position.set(0.55, 1.15, 0);
  const snout = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), green);
  snout.position.set(0.88, 1.05, 0);
  const horn = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 8), orange);
  horn.position.set(0.72, 1.48, 0);
  [-0.12, 0.12].forEach(function (z) {
    const eyeW = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), mat(0xfffdf8));
    eyeW.position.set(0.78, 1.22, z);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), mat(0x6b3a1f));
    eye.position.set(0.84, 1.22, z);
    g.add(eyeW, eye);
  });
  for (let i = 0; i < 4; i++) {
    const sp = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 6), spike);
    sp.position.set(-0.15 + i * 0.12, 1.15, 0);
    g.add(sp);
  }
  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), green);
  tail.scale.set(1.8, 0.6, 0.5);
  tail.position.set(-0.7, 0.62, 0);
  [[0.15, 0.22], [0.15, -0.22], [-0.2, 0.2], [-0.2, -0.2]].forEach(function (p) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.4, 8), green);
    leg.position.set(p[0], 0.22, p[1]);
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), orange);
    foot.position.set(p[0], 0.04, p[1]);
    g.add(leg, foot);
  });
  g.add(body, tum, head, snout, horn, tail);
  g.position.set(-2.4, 0.28, 0);
  return g;
}
const dino = makeDino();
scene.add(dino);

const petal = mat(0xf472b6);
const blooms = [];
for (let i = 0; i < 5; i++) {
  const g = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.35, 6), leaf);
  stem.position.y = 0.18;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), petal);
  head.position.y = 0.4;
  g.add(stem, head);
  g.scale.setScalar(FLOWER_SCALE);
  g.position.set(6 + i * 4.2, 0.28, 0.2);
  scene.add(g);
  blooms.push({ mesh: g, got: 0 });
}
const rocks = [];
for (let i = 0; i < 4; i++) {
  const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(ROCK_SIZE, 0), rock);
  mesh.position.set(8 + i * 5.2, ROCK_SIZE, 0);
  scene.add(mesh);
  rocks.push({ mesh: mesh, smash: 0 });
}

let play = false;
let flowers = 0;
let stars = 0;
let pose = "walk";
let poseT = 0;
let hopY = 0;
let vy = 0;
let t = 0;
try {
  const saved = JSON.parse(localStorage.getItem("alabryuu-dino-3d") || "{}");
  if (saved.stars) stars = saved.stars;
} catch (e) {}

function say(msg) { sayEl.textContent = msg; }
function hud() {
  flEl.textContent = "Flowers " + flowers + " / " + GOAL;
  stEl.textContent = "Stars " + stars;
}
function saveStars() {
  try { localStorage.setItem("alabryuu-dino-3d", JSON.stringify({ stars: stars })); } catch (e) {}
}
function running() {
  return play && titleEl.classList.contains("off") && winEl.classList.contains("off");
}
function resetWorld() {
  flowers = 0;
  hopY = 0;
  vy = 0;
  pose = "walk";
  poseT = 0;
  dino.position.x = -2.4;
  rocks.forEach(function (o, i) {
    o.smash = 0;
    o.mesh.visible = true;
    o.mesh.position.x = 8 + i * 5.2;
  });
  blooms.forEach(function (f, i) {
    f.got = 0;
    f.mesh.visible = true;
    f.mesh.position.x = 6 + i * 4.2;
  });
  hud();
}
function start() {
  play = true;
  titleEl.classList.add("off");
  winEl.classList.add("off");
  dockEl.classList.add("on");
  resetWorld();
  say("Get 12 flowers!");
}
function hop() {
  if (!running()) return;
  document.body.dataset.action = "hop";
  if (pose !== "walk") { say("Not yet"); return; }
  pose = "crouch";
  poseT = 0;
  say("Hop!");
}
function stompNow() {
  if (!running()) return;
  document.body.dataset.action = "stomp";
  if (pose !== "walk" && pose !== "land") { say("Not yet"); return; }
  pose = "stomp";
  poseT = 0;
  say("Stomp!");
}
function cheer() {
  if (flowers >= GOAL && play) {
    play = false;
    dockEl.classList.remove("on");
    document.getElementById("winP").textContent = "Flowers " + flowers + " / " + GOAL;
    winEl.classList.remove("off");
    say("Dino did it!");
  }
}

document.getElementById("go").addEventListener("click", start);
document.getElementById("again").addEventListener("click", start);
document.getElementById("hop").addEventListener("click", hop);
document.getElementById("stomp").addEventListener("click", stompNow);
document.getElementById("restart").addEventListener("click", start);
addEventListener("keydown", function (e) {
  if (e.repeat) return;
  const tag = ((e.target && e.target.tagName) || "").toLowerCase();
  if (tag === "input" || tag === "textarea") return;
  if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
    e.preventDefault();
    hop();
  } else if (e.code === "ArrowDown" || e.code === "KeyS") {
    e.preventDefault();
    stompNow();
  } else if (e.code === "KeyR") {
    if (running() || !winEl.classList.contains("off")) start();
  }
});
cv.addEventListener("pointerdown", function (e) {
  if (!running()) return;
  const r = cv.getBoundingClientRect();
  if (e.clientY - r.top > r.height - 130) return;
  if (e.clientX - r.left < r.width * 0.5) hop();
  else stompNow();
});

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / Math.max(1, h);
  camera.updateProjectionMatrix();
  const small = Math.min(w, h) < 720;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1 : 1.5));
  renderer.setSize(w, h, false);
}
addEventListener("resize", resize);
resize();
hud();

let last = 0;
function frame(now) {
  if (!last) last = now;
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  t += dt;
  if (running()) {
    poseT += dt;
    if (pose === "crouch" && poseT > 0.12) { pose = "air"; vy = 6.6; poseT = 0; }
    else if (pose === "air") {
      vy -= 15 * dt;
      hopY += vy * dt;
      if (hopY <= 0) { hopY = 0; vy = 0; pose = "land"; poseT = 0; }
    } else if (pose === "land" && poseT > 0.12) pose = "walk";
    else if (pose === "stomp" && poseT > 0.24) pose = "walk";
    dino.position.x += RUN * dt;
    const ahead = dino.position.x;
    rocks.forEach(function (o) {
      const dx = o.mesh.position.x - ahead;
      const near = dx > 0.15 && dx < 1.35 && !o.smash;
      if (near && pose === "stomp") {
        o.smash = 1;
        o.mesh.visible = false;
        flowers += 1;
        stars += 1;
        saveStars();
        hud();
        say("Stomp!");
        cheer();
      } else if (near && (pose === "air" || pose === "land")) {
        o.mesh.position.x = ahead + 14;
        say("Hop over! Stomp next time.");
      } else if (near && pose === "walk") {
        o.mesh.position.x = ahead + 12;
        say("Oops! Tap Stomp.");
      }
      if (o.mesh.position.x < ahead - 8) {
        o.mesh.position.x = ahead + 12 + Math.random() * 4;
        o.smash = 0;
        o.mesh.visible = true;
      }
    });
    blooms.forEach(function (f) {
      const dx = f.mesh.position.x - ahead;
      if (!f.got && dx > 0.1 && dx < 1.25 && (pose === "air" || pose === "land")) {
        f.got = 1;
        f.mesh.visible = false;
        flowers += 1;
        stars += 1;
        saveStars();
        hud();
        say("Flower!");
        cheer();
      }
      if (f.mesh.position.x < ahead - 8) {
        f.mesh.position.x = ahead + 10 + Math.random() * 3;
        f.got = 0;
        f.mesh.visible = true;
      }
    });
  }
  const bob = pose === "walk" ? Math.sin(t * 6) * 0.04 : 0;
  dino.position.y = 0.28 + hopY + bob;
  const squat = pose === "stomp" || pose === "crouch" ? 0.86 : 1;
  dino.scale.set(DINO_SCALE, DINO_SCALE * squat, DINO_SCALE);
  const follow = 1 - Math.exp(-3.2 * dt);
  camera.position.lerp(look.set(dino.position.x - 4.6, 3.1 + hopY * 0.15, 6.4), follow);
  look.set(dino.position.x + 2.2, 0.9, 0);
  camera.lookAt(look);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

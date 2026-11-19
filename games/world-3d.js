/* Island Friends: smooth high poly island. No chat, no typed names. */
import * as THREE from "three";

const WORLD3D_SERVER = "";

if ((location.search || "").indexOf("hub=together") >= 0) {
  document.getElementById("home").href = "/together/";
}

const KINDS = ["dino", "cat", "bunny", "duck"];
const COLOR_NAMES = ["Green", "Blue", "Pink", "Sunny"];
const COLOR_HEX = [0x3dce6a, 0x3b82f6, 0xf472b6, 0xfbbf24];
const ALPH = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const GEMS = [
  ["s1", 2.2, 0.55, 1.4],
  ["s2", -2.4, 0.55, 2.2],
  ["s3", 4.2, 0.55, -1.6],
  ["s4", -4.6, 0.55, -2.4],
  ["s5", 1.2, 0.55, -4.2],
  ["s6", 6.2, 0.55, 2.6],
  ["s7", -6.4, 0.55, 1.2],
  ["s8", 0.4, 0.55, 5.2]
];
const MUSHROOMS = [
  { x: -5.2, z: 5.6 },
  { x: 4.8, z: 6.6 }
];
const BALLOON = { x: -8.2, z: -4.6 };
const SLIDE = [
  { x: 8.4, y: 2.55, z: -7.4 },
  { x: 8.3, y: 1.85, z: -6.1 },
  { x: 8.05, y: 0.95, z: -4.6 },
  { x: 7.7, y: 0.22, z: -3.0 }
];

const phone = Math.min(window.innerWidth, window.innerHeight) < 800;
const SEG = phone ? 16 : 28;

function serverUrl() {
  const q = new URLSearchParams(location.search).get("server");
  if (q) return q;
  return WORLD3D_SERVER;
}

function nameOf(kind, color) {
  const k = kind.charAt(0).toUpperCase() + kind.slice(1);
  return COLOR_NAMES[color] + " " + k;
}

const cv = document.getElementById("c");
const sayEl = document.getElementById("say");
const whoEl = document.getElementById("who");
const scoreEl = document.getElementById("score");
const titleEl = document.getElementById("title");
const padEl = document.getElementById("pad");
const roomEl = document.getElementById("room");
const wakeEl = document.getElementById("wake");
const WAKE_MS = 30000;
const emotesEl = document.getElementById("emotes");

const renderer = new THREE.WebGLRenderer({
  canvas: cv,
  antialias: !phone,
  alpha: false,
  powerPreference: "high-performance"
});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, phone ? 1 : 1.5));

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8fd4f2);
scene.fog = new THREE.Fog(0xb7e6fb, 18, 42);
const camera = new THREE.PerspectiveCamera(50, 1, 0.08, 80);
const camPos = new THREE.Vector3(0, 4.2, 8);
const lookPos = new THREE.Vector3(0, 0.8, 0);
camera.position.copy(camPos);

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / Math.max(1, h);
  camera.fov = camera.aspect < 1 ? 66 : 50;
  camera.updateProjectionMatrix();
  const small = Math.min(w, h) < 800;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1 : 1.5));
  renderer.setSize(w, h, false);
}
resize();
addEventListener("resize", resize);

const sun = new THREE.DirectionalLight(0xfff6e4, 2.35);
sun.position.set(12, 18, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(phone ? 512 : 1024, phone ? 512 : 1024);
sun.shadow.camera.near = 2;
sun.shadow.camera.far = 40;
sun.shadow.camera.left = -16;
sun.shadow.camera.right = 16;
sun.shadow.camera.top = 16;
sun.shadow.camera.bottom = -16;
sun.shadow.bias = -0.0004;
scene.add(sun);
scene.add(new THREE.HemisphereLight(0xd9f4ff, 0x4d8a45, 0.7));
scene.add(new THREE.AmbientLight(0xffffff, 0.16));

function makeEnv() {
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(
    new THREE.SphereGeometry(20, 24, 16),
    new THREE.MeshBasicMaterial({ color: 0x9ed8f5, side: THREE.BackSide })
  ));
  const ground = new THREE.Mesh(
    new THREE.SphereGeometry(20, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.42),
    new THREE.MeshBasicMaterial({ color: 0x67c06e, side: THREE.BackSide })
  );
  ground.rotation.x = Math.PI;
  env.add(ground);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(env, 0.04).texture;
  pmrem.dispose();
  return tex;
}
scene.environment = makeEnv();

function hash(ix, iz) {
  let n = Math.imul(ix, 374761393) + Math.imul(iz, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}
function noise2(x, z) {
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const fx = x - x0;
  const fz = z - z0;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);
  const a = hash(x0, z0);
  const b = hash(x0 + 1, z0);
  const c = hash(x0, z0 + 1);
  const d = hash(x0 + 1, z0 + 1);
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}
function heightAt(x, z) {
  const r = Math.hypot(x, z);
  let h = (noise2(x * 0.18, z * 0.18) - 0.5) * 0.16;
  if (r > 11) h += (r - 11) * (r - 11) * 0.03;
  if (r > 14.2) h -= (r - 14.2) * 0.55;
  if (Math.abs(x - 6.5) < 1.7 && z < -2.2 && z > -8.1) {
    const u = Math.min(1, Math.max(0, (-2.2 - z) / 5.9));
    const s = u * u * (3 - 2 * u);
    h = Math.max(h, s * 1.65);
  }
  return h;
}

function std(color, rough) {
  return new THREE.MeshStandardMaterial({
    color: color,
    roughness: rough == null ? 0.55 : rough,
    metalness: 0.02
  });
}

function capsuleGeo(radius, length, radial) {
  const pts = [];
  const n = 8;
  const half = length / 2;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 0.5;
    pts.push(new THREE.Vector2(Math.sin(a) * radius, Math.cos(a) * radius + half));
  }
  for (let i = 0; i <= n; i++) {
    const a = Math.PI * 0.5 + (i / n) * Math.PI * 0.5;
    pts.push(new THREE.Vector2(Math.max(0.001, Math.sin(a) * radius), Math.cos(a) * radius - half));
  }
  return new THREE.LatheGeometry(pts, radial || SEG);
}

function bendLeaf() {
  const g = new THREE.PlaneGeometry(0.7, 2.1, 4, 12);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    const t = (y + 1.05) / 2.1;
    p.setZ(i, Math.sin(t * Math.PI) * 0.34);
    p.setX(i, p.getX(i) * (0.28 + Math.sin(t * Math.PI) * 0.9));
  }
  g.computeVertexNormals();
  return g;
}

function boulderGeo() {
  const g = new THREE.SphereGeometry(1, phone ? 24 : 36, phone ? 16 : 24);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const n = noise2(p.getX(i) * 1.4 + 2, p.getZ(i) * 1.4 + p.getY(i));
    const s = 1 + (n - 0.5) * 0.16;
    p.setXYZ(i, p.getX(i) * s, p.getY(i) * s * 0.72, p.getZ(i) * s);
  }
  g.computeVertexNormals();
  return g;
}

const frond = bendLeaf();
const rockGeo = boulderGeo();
const bodyGeo = new THREE.SphereGeometry(0.46, SEG, SEG);
const headGeo = new THREE.SphereGeometry(0.34, SEG, SEG);
const eyeWhite = new THREE.SphereGeometry(0.09, 12, 10);
const pupilGeo = new THREE.SphereGeometry(0.045, 10, 8);
function makeStarGeo() {
  const shape = new THREE.Shape();
  const spikes = 5;
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? 0.36 : 0.15;
    const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: 0.1,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.03,
    bevelSegments: 3
  });
  g.translate(0, 0, -0.09);
  return g;
}
const starGeo = makeStarGeo();

const grass = new THREE.Color(0x3dae4e);
const moss = new THREE.Color(0x1f7a38);
const sand = new THREE.Color(0xf0d7a2);
const shore = new THREE.Color(0xc7e38a);
const cols = TERRAIN_COLORS();

function TERRAIN_COLORS() {
  return null;
}

const TERRAIN_N = phone ? 90 : 130;
const terrainGeo = new THREE.PlaneGeometry(40, 40, TERRAIN_N, TERRAIN_N);
terrainGeo.rotateX(-Math.PI / 2);
const tp = terrainGeo.attributes.position;
const colorArr = new Float32Array(tp.count * 3);
for (let i = 0; i < tp.count; i++) {
  const x = tp.getX(i);
  const z = tp.getZ(i);
  const h = heightAt(x, z);
  const r = Math.hypot(x, z);
  tp.setY(i, r > 18 ? -1.4 : h);
  const col = new THREE.Color();
  if (r > 14.2) col.copy(sand);
  else if (r > 12.2) col.copy(shore).lerp(grass, (14.2 - r) / 2);
  else col.copy(grass).lerp(moss, Math.min(1, Math.max(0, h)));
  colorArr[i * 3] = col.r;
  colorArr[i * 3 + 1] = col.g;
  colorArr[i * 3 + 2] = col.b;
}
terrainGeo.setAttribute("color", new THREE.BufferAttribute(colorArr, 3));
terrainGeo.computeVertexNormals();
const terrain = new THREE.Mesh(
  terrainGeo,
  new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.86, metalness: 0 })
);
terrain.receiveShadow = true;
scene.add(terrain);
void cols;

const water = new THREE.Mesh(
  new THREE.CircleGeometry(26, 64),
  new THREE.MeshStandardMaterial({
    color: 0x3ec4e0,
    roughness: 0.18,
    metalness: 0.08,
    transparent: true,
    opacity: 0.88
  })
);
water.rotation.x = -Math.PI / 2;
water.position.y = -0.42;
scene.add(water);

function addMesh(geo, mat, x, y, z, parent) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  (parent || scene).add(m);
  return m;
}

function palm(x, z) {
  const pts = [];
  for (let i = 0; i <= 18; i++) {
    const t = i / 18;
    const lean = Math.sin(t * Math.PI) * 0.35;
    pts.push(new THREE.Vector2(0.16 * (1.15 - t * 0.55), t * 3.1));
    pts[pts.length - 1].x += lean * 0.15;
  }
  const trunk = new THREE.Mesh(
    new THREE.LatheGeometry(pts, SEG),
    std(0x8a5a32, 0.8)
  );
  trunk.position.set(x, heightAt(x, z), z);
  trunk.castShadow = true;
  scene.add(trunk);
  const topY = heightAt(x, z) + 3.05;
  const leafMat = std(0x22a34a, 0.6);
  for (let i = 0; i < 7; i++) {
    const leaf = new THREE.Mesh(frond, leafMat);
    leaf.position.set(x, topY, z);
    leaf.rotation.y = (i / 7) * Math.PI * 2;
    leaf.rotation.z = 0.9;
    leaf.castShadow = true;
    scene.add(leaf);
  }
}

palm(10.5, 6.2);
palm(-10.2, 5.4);
palm(-9.4, -8.2);
palm(11.2, -2.2);
palm(0.2, -9.5);

const rockMat = std(0x8d8680, 0.92);
[[-6.5, 6.8, 1.1], [7.2, 7.4, 0.8], [12.4, 1.2, 1.4], [-12.2, -1.5, 1.2], [3.4, -8.6, 0.7]].forEach(function (r) {
  const m = addMesh(rockGeo, rockMat, r[0], heightAt(r[0], r[1]) + 0.15, r[1]);
  m.scale.setScalar(r[2]);
});

function cloud(x, y, z, s) {
  const g = new THREE.Group();
  const mat = std(0xffffff, 0.7);
  addMesh(new THREE.SphereGeometry(1, 20, 14), mat, 0, 0, 0, g);
  addMesh(new THREE.SphereGeometry(0.75, 16, 12), mat, 0.9, 0.1, 0.1, g);
  addMesh(new THREE.SphereGeometry(0.62, 16, 12), mat, -0.85, 0.05, 0.15, g);
  g.position.set(x, y, z);
  g.scale.setScalar(s);
  scene.add(g);
}
cloud(-6, 8.5, -4, 1.1);
cloud(7, 9.2, 2, 0.85);
cloud(1, 8.2, 10, 0.7);

const mushCaps = [];
MUSHROOMS.forEach(function (m) {
  const y = heightAt(m.x, m.z);
  const stem = addMesh(capsuleGeo(0.22, 0.55, SEG), std(0xfff3d6, 0.5), m.x, y + 0.48, m.z);
  stem.scale.y = 1.1;
  const cap = addMesh(new THREE.SphereGeometry(0.72, SEG, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), std(0xe23b4a, 0.4), m.x, y + 0.95, m.z);
  cap.scale.y = 0.72;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const spot = addMesh(new THREE.SphereGeometry(0.1, 10, 8), std(0xfff7ea, 0.4), m.x + Math.cos(a) * 0.28, y + 1.12, m.z + Math.sin(a) * 0.28);
    spot.scale.y = 0.45;
  }
  mushCaps.push({ x: m.x, z: m.z, y: y + 0.9 });
});

function curveFrom(points) {
  return new THREE.CatmullRomCurve3(points.map(function (p) {
    return new THREE.Vector3(p.x, p.y, p.z);
  }));
}
const slideCurve = curveFrom(SLIDE);
const slideMat = std(0x3b82f6, 0.32);
const slideMesh = new THREE.Mesh(new THREE.TubeGeometry(slideCurve, 40, 0.42, 16, false), slideMat);
slideMesh.castShadow = true;
slideMesh.receiveShadow = true;
scene.add(slideMesh);
const railMat = std(0xf8fafc, 0.4);
[-0.34, 0.34].forEach(function (side) {
  const pts = SLIDE.map(function (p, i) {
    const n = SLIDE[Math.min(SLIDE.length - 1, i + 1)];
    const dx = n.x - p.x;
    const dz = n.z - p.z;
    const len = Math.hypot(dx, dz) || 1;
    return { x: p.x + (-dz / len) * side, y: p.y + 0.28, z: p.z + (dx / len) * side };
  });
  const rail = new THREE.Mesh(new THREE.TubeGeometry(curveFrom(pts), 24, 0.06, 8, false), railMat);
  scene.add(rail);
});
const stairPts = [];
for (let i = 0; i <= 8; i++) {
  const t = i / 8;
  const z = -2.5 - t * 5.1;
  stairPts.push({ x: 6.5, y: heightAt(6.5, z) + 0.05, z: z });
}
scene.add(new THREE.Mesh(new THREE.TubeGeometry(curveFrom(stairPts), 20, 0.55, 12, false), std(0xf0d7a2, 0.7)));

const balloonGroup = new THREE.Group();
const balloonSkin = new THREE.Mesh(
  new THREE.SphereGeometry(0.85, SEG, SEG),
  new THREE.MeshStandardMaterial({ color: 0xff5d8f, roughness: 0.35, emissive: 0x551122, emissiveIntensity: 0.15 })
);
balloonSkin.scale.set(1, 1.15, 1);
balloonSkin.castShadow = true;
balloonGroup.add(balloonSkin);
balloonGroup.add(new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), std(0xffe08a, 0.4)));
const basket = new THREE.Mesh(capsuleGeo(0.28, 0.2, 16), std(0xc0843a, 0.7));
basket.position.y = -1.35;
balloonGroup.add(basket);
balloonGroup.position.set(BALLOON.x, heightAt(BALLOON.x, BALLOON.z) + 1.7, BALLOON.z);
scene.add(balloonGroup);

function flower(x, z) {
  const y = heightAt(x, z);
  addMesh(capsuleGeo(0.04, 0.35, 8), std(0x166534, 0.6), x, y + 0.2, z);
  for (let i = 0; i < 6; i++) {
    const petal = addMesh(new THREE.SphereGeometry(0.1, 10, 8), std(0xff4fa3, 0.4), x, y + 0.42, z);
    const a = (i / 6) * Math.PI * 2;
    petal.position.x += Math.cos(a) * 0.1;
    petal.position.z += Math.sin(a) * 0.1;
    petal.scale.set(1.3, 0.45, 0.8);
  }
  addMesh(new THREE.SphereGeometry(0.07, 10, 8), std(0xffe14a, 0.35), x, y + 0.46, z);
}
[[1.6, 3.2], [-3.2, -0.6], [3.4, 0.4], [-1.2, 6.2], [9.2, 3.4]].forEach(function (p) { flower(p[0], p[1]); });

const sparkle = (function () {
  const n = phone ? 36 : 80;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 1.5 + Math.random() * 12;
    pos[i * 3] = Math.cos(a) * r;
    pos[i * 3 + 1] = 0.5 + Math.random() * 2.4;
    pos[i * 3 + 2] = Math.sin(a) * r;
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const dot = document.createElement("canvas");
  dot.width = 32;
  dot.height = 32;
  const dg = dot.getContext("2d");
  const glow = dg.createRadialGradient(16, 16, 1, 16, 16, 15);
  glow.addColorStop(0, "rgba(255, 250, 220, 1)");
  glow.addColorStop(1, "rgba(255, 250, 220, 0)");
  dg.fillStyle = glow;
  dg.beginPath();
  dg.arc(16, 16, 15, 0, Math.PI * 2);
  dg.fill();
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({
    map: new THREE.CanvasTexture(dot),
    color: 0xfff6c2,
    size: 0.16,
    transparent: true,
    opacity: 0.9,
    depthWrite: false
  }));
  scene.add(pts);
  return pts;
})();

function namePlate(text) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 64;
  const g = c.getContext("2d");
  g.fillStyle = "rgba(20, 83, 45, 0.88)";
  g.beginPath();
  if (g.roundRect) g.roundRect(8, 8, 240, 48, 16);
  else g.rect(8, 8, 240, 48);
  g.fill();
  g.fillStyle = "#ffffff";
  g.font = "700 28px Nunito, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, 128, 34);
  const tex = new THREE.CanvasTexture(c);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sprite.scale.set(1.7, 0.42, 1);
  sprite.position.y = 1.85;
  return sprite;
}

function emoteTex(kind) {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const g = c.getContext("2d");
  g.fillStyle = "#fffaf0";
  g.beginPath();
  g.arc(64, 64, 54, 0, Math.PI * 2);
  g.fill();
  g.lineWidth = 6;
  g.strokeStyle = "#14532d";
  g.stroke();
  g.font = "700 64px Nunito, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  const glyph = kind === "heart" ? "♥" : kind === "star" ? "★" : kind === "laugh" ? "Ha" : "Hi";
  g.fillStyle = kind === "heart" ? "#e11d48" : "#ca8a04";
  g.fillText(glyph, 64, 70);
  const tex = new THREE.CanvasTexture(c);
  return tex;
}

function buildFriend(kind, color, label) {
  const group = new THREE.Group();
  const fur = std(COLOR_HEX[color], 0.48);
  const belly = std(0xfff6ea, 0.5);
  const body = addMesh(bodyGeo, fur, 0, 0.72, 0, group);
  body.scale.set(1, 1.05, 0.86);
  const tum = addMesh(new THREE.SphereGeometry(0.28, SEG, 16), belly, 0, 0.66, 0.22, group);
  tum.scale.set(0.9, 0.85, 0.55);
  const head = addMesh(headGeo, fur, 0, 1.28, 0.12, group);
  const eyeMat = std(0xfffdf8, 0.3);
  const pupMat = std(0x3a2416, 0.4);
  [-0.12, 0.12].forEach(function (x) {
    addMesh(eyeWhite, eyeMat, x, 1.34, 0.38, group);
    addMesh(pupilGeo, pupMat, x, 1.33, 0.45, group);
  });
  if (kind === "dino") {
    const snout = addMesh(new THREE.SphereGeometry(0.16, 16, 12), fur, 0, 1.2, 0.4, group);
    snout.scale.set(1.1, 0.7, 1.3);
    const tail = addMesh(capsuleGeo(0.13, 0.72, 14), fur, 0, 0.58, -0.78, group);
    tail.rotation.x = Math.PI / 2;
    for (let i = 0; i < 3; i++) {
      addMesh(new THREE.ConeGeometry(0.09, 0.28, 12), std(0x14b8a6, 0.4), 0, 1.22 - i * 0.16, -0.1 - i * 0.14, group);
    }
  } else if (kind === "cat") {
    [-0.16, 0.16].forEach(function (x) {
      const ear = addMesh(new THREE.ConeGeometry(0.12, 0.34, 12), fur, x, 1.66, 0.05, group);
      ear.rotation.x = -0.15;
    });
    const tail = addMesh(capsuleGeo(0.08, 0.7, 12), fur, 0.08, 1.05, -0.42, group);
    tail.rotation.z = 0.55;
    tail.rotation.x = 1.15;
  } else if (kind === "bunny") {
    [-0.1, 0.1].forEach(function (x) {
      const ear = addMesh(capsuleGeo(0.06, 0.42, 10), fur, x, 1.72, 0.05, group);
      const inner = addMesh(capsuleGeo(0.03, 0.28, 8), std(0xfbcfe8, 0.45), x, 1.7, 0.09, group);
      inner.scale.z = 0.4;
    });
    addMesh(new THREE.SphereGeometry(0.08, 10, 8), std(0xfda4af, 0.4), 0, 1.22, 0.42, group);
  } else {
    const bill = addMesh(new THREE.SphereGeometry(0.12, 12, 10), std(0xf59e0b, 0.4), 0, 1.22, 0.4, group);
    bill.scale.set(1.3, 0.55, 1.1);
    [-0.28, 0.28].forEach(function (x) {
      const wing = addMesh(new THREE.SphereGeometry(0.2, 12, 10), fur, x, 0.78, 0.05, group);
      wing.scale.set(0.45, 0.7, 1);
    });
  }
  const legGeo = capsuleGeo(0.08, 0.28, 10);
  const legs = [-0.16, 0.16].map(function (x) {
    return addMesh(legGeo, fur, x, 0.28, 0.05, group);
  });
  group.add(namePlate(label));
  const bubble = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false }));
  bubble.position.y = 2.25;
  bubble.scale.set(0.7, 0.7, 1);
  bubble.visible = false;
  group.add(bubble);
  group.userData.legs = legs;
  group.userData.bubble = bubble;
  group.userData.emote = 0;
  return group;
}

const me = {
  kind: "dino",
  color: 0,
  x: 0,
  y: 0,
  z: 2.2,
  yaw: 0,
  vy: 0,
  onGround: true,
  id: "",
  name: "Green Dino",
  group: null
};
const remotes = new Map();
const gems = new Map();
let score = 0;
let playing = false;
let mode = "menu";
let ws = null;
let roomCode = "";
let sendAt = 0;
let balloonT = 0;
let balloonLock = false;
let riding = false;
let rideU = 0;
let lastEmote = "";
const keys = {};
const stick = { x: 0, y: 0, on: false };
let jumpQueued = false;
const ndc = new THREE.Vector3();

function say(text) {
  sayEl.textContent = text;
  sayEl.classList.remove("ping");
  void sayEl.offsetWidth;
  sayEl.classList.add("ping");
}

function showCover(which) {
  titleEl.classList.toggle("off", which !== "title");
  padEl.classList.toggle("off", which !== "pad");
  roomEl.classList.toggle("off", which !== "room");
  wakeEl.classList.toggle("off", which !== "wake");
}

function wakeLimit() {
  const raw = new URLSearchParams(location.search).get("wakeMs");
  const n = raw ? Number(raw) : WAKE_MS;
  if (!Number.isFinite(n) || n < 400) return WAKE_MS;
  return Math.min(WAKE_MS, n);
}

function placeFriend(group, kindColorName) {
  if (me.group) scene.remove(me.group);
  me.group = buildFriend(kindColorName.kind, kindColorName.color, kindColorName.name);
  me.group.name = "you";
  me.group.position.set(me.x, me.y, me.z);
  scene.add(me.group);
}

function clearRemotes() {
  remotes.forEach(function (r) { scene.remove(r.group); });
  remotes.clear();
}

function upsertRemote(p, snap) {
  let r = remotes.get(p.id);
  if (!r) {
    r = {
      id: p.id,
      name: p.name,
      group: buildFriend(p.kind, p.color, p.name),
      tx: p.x, ty: p.y, tz: p.z, tyaw: p.yaw || 0
    };
    r.group.name = "friend";
    r.group.position.set(p.x, p.y, p.z);
    r.group.rotation.y = p.yaw || 0;
    scene.add(r.group);
    remotes.set(p.id, r);
  } else if (!snap) {
    r.tx = p.x;
    r.ty = p.y;
    r.tz = p.z;
    r.tyaw = p.yaw || 0;
  }
}

function syncGems(list) {
  const keep = {};
  list.forEach(function (g) { keep[g.id] = g; });
  gems.forEach(function (g, id) {
    if (!keep[id]) {
      g.mesh.visible = false;
      g.taken = true;
    }
  });
  list.forEach(function (g) {
    if (gems.has(g.id)) {
      gems.get(g.id).mesh.visible = true;
      gems.get(g.id).taken = false;
      return;
    }
    const starMat = new THREE.MeshStandardMaterial({
      color: 0xffe56a,
      roughness: 0.25,
      metalness: 0.05,
      emissive: 0xffb703,
      emissiveIntensity: 0.45
    });
    const mesh = new THREE.Group();
    const face = new THREE.Mesh(starGeo, starMat);
    const side = new THREE.Mesh(starGeo, starMat);
    side.rotation.y = Math.PI / 2;
    face.castShadow = true;
    side.castShadow = true;
    mesh.add(face, side);
    mesh.position.set(g.x, g.y, g.z);
    scene.add(mesh);
    gems.set(g.id, { id: g.id, x: g.x, y: g.y, z: g.z, mesh: mesh, taken: false, spin: Math.random() });
  });
}

function localGems() {
  return GEMS.map(function (g) { return { id: g[0], x: g[1], y: g[2], z: g[3] }; });
}

function setScore(n) {
  score = n;
  scoreEl.textContent = "Stars together " + n;
}

function showEmote(group, kind) {
  const bubble = group.userData.bubble;
  bubble.material.map = emoteTex(kind);
  bubble.material.needsUpdate = true;
  bubble.visible = true;
  group.userData.emote = 1.7;
  lastEmote = kind;
}

function applyRoom(msg) {
  mode = "room";
  roomCode = msg.code;
  document.getElementById("roomCode").textContent = msg.code;
  document.body.dataset.code = msg.code;
  const you = msg.players.filter(function (p) { return p.id === msg.you; })[0];
  me.id = msg.you;
  me.name = you.name;
  me.kind = you.kind;
  me.color = you.color;
  me.x = you.x;
  me.y = you.y;
  me.z = you.z;
  whoEl.textContent = you.name;
  placeFriend(me.group, me);
  clearRemotes();
  msg.players.forEach(function (p) {
    if (p.id !== msg.you) upsertRemote(p, true);
  });
  syncGems(msg.gems);
  setScore(msg.score || 0);
  showCover("room");
  say("Tell a friend this code.");
}

function onMsg(ev) {
  let msg;
  try { msg = JSON.parse(ev.data); } catch (e) { return; }
  if (!msg || typeof msg.t !== "string") return;
  if (msg.t === "room") { applyRoom(msg); return; }
  if (msg.t === "err") {
    say(msg.msg || "Try again");
    if (typed.length > 0) {
      typed = "";
      codeShow.textContent = "----";
      showCover("pad");
    } else if (!wakeEl.classList.contains("off")) {
      showCover("title");
    }
    return;
  }
  if (msg.t === "join" && msg.player && msg.player.id !== me.id) {
    upsertRemote(msg.player, true);
    say(msg.player.name + " is here");
    return;
  }
  if (msg.t === "move") {
    const r = remotes.get(msg.id);
    if (!r) return;
    r.tx = msg.x;
    r.ty = msg.y;
    r.tz = msg.z;
    r.tyaw = msg.yaw || 0;
    return;
  }
  if (msg.t === "leave") {
    const r = remotes.get(msg.id);
    if (r) {
      scene.remove(r.group);
      remotes.delete(msg.id);
    }
    return;
  }
  if (msg.t === "gem") {
    const g = gems.get(msg.id);
    if (g) {
      g.taken = true;
      g.mesh.visible = false;
    }
    setScore(msg.score || 0);
    say("Star!");
    return;
  }
  if (msg.t === "emote") {
    if (msg.id === me.id && me.group) showEmote(me.group, msg.emote);
    const r = remotes.get(msg.id);
    if (r) showEmote(r.group, msg.emote);
  }
}

let wakeGen = 0;

function connect() {
  const url = serverUrl();
  if (!url) return Promise.reject(new Error("off"));
  if (ws && ws.readyState === 1) return Promise.resolve(ws);
  const gen = ++wakeGen;
  const limit = wakeLimit();
  const started = performance.now();
  showCover("wake");
  document.body.dataset.wake = "1";
  return new Promise(function (resolve, reject) {
    function giveUp() {
      if (gen !== wakeGen) return;
      document.body.dataset.wake = "0";
      reject(new Error("timeout"));
    }
    function attempt() {
      if (gen !== wakeGen) return;
      const left = limit - (performance.now() - started);
      if (left <= 0) { giveUp(); return; }
      let sock;
      let settled = false;
      try { sock = new WebSocket(url); } catch (e) {
        setTimeout(attempt, Math.min(700, left));
        return;
      }
      const timer = setTimeout(function () {
        if (settled || gen !== wakeGen) return;
        settled = true;
        try { sock.close(); } catch (err) {}
        attempt();
      }, Math.min(2000, left));
      function retry() {
        if (settled || gen !== wakeGen) return;
        settled = true;
        clearTimeout(timer);
        try { sock.close(); } catch (err) {}
        const remain = limit - (performance.now() - started);
        if (remain <= 0) giveUp();
        else setTimeout(attempt, Math.min(700, remain));
      }
      sock.onopen = function () {
        if (settled || gen !== wakeGen) {
          try { sock.close(); } catch (err) {}
          return;
        }
        settled = true;
        clearTimeout(timer);
        if (ws && ws !== sock) try { ws.close(); } catch (err) {}
        ws = sock;
        sock.onmessage = onMsg;
        sock.onerror = null;
        sock.onclose = function () {
          if (ws === sock) ws = null;
        };
        document.body.dataset.wake = "0";
        resolve(sock);
      };
      sock.onerror = retry;
      sock.onclose = retry;
    }
    attempt();
  });
}

function send(obj) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj));
}

function beginPlay() {
  playing = true;
  showCover("none");
  emotesEl.classList.add("on");
  whoEl.textContent = me.name;
  document.body.dataset.mode = mode;
  say(mode === "room" ? "Collect stars together!" : "Collect the stars!");
}

function startAlone(note) {
  mode = "alone";
  roomCode = "";
  me.id = "solo";
  me.name = nameOf(me.kind, me.color);
  me.x = 0;
  me.y = heightAt(0, 2.2);
  me.z = 2.2;
  whoEl.textContent = me.name;
  placeFriend(me.group, me);
  clearRemotes();
  syncGems(localGems());
  setScore(0);
  beginPlay();
  if (note) say(note);
}

function countVisible() {
  const list = [];
  if (me.group) list.push(me.group);
  remotes.forEach(function (r) { list.push(r.group); });
  let n = 0;
  let minX = 0;
  let maxX = 0;
  for (let i = 0; i < list.length; i++) {
    ndc.set(list[i].position.x, list[i].position.y + 0.9, list[i].position.z);
    ndc.project(camera);
    const onScreen = ndc.z < 1 && ndc.x > -1.05 && ndc.x < 1.05 && ndc.y > -1.05 && ndc.y < 1.05;
    if (!onScreen) continue;
    const sx = (ndc.x * 0.5 + 0.5) * window.innerWidth;
    if (n === 0) { minX = sx; maxX = sx; }
    else { if (sx < minX) minX = sx; if (sx > maxX) maxX = sx; }
    n++;
  }
  document.body.dataset.spread = String(n >= 2 ? Math.round(maxX - minX) : 0);
  return n;
}

function slideSample(u) {
  const c = slideCurve.getPoint(Math.min(1, Math.max(0, u)));
  return c;
}

const clock = new THREE.Clock();
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(0.033, clock.getDelta());
  const t = clock.elapsedTime;
  water.position.y = -0.42 + Math.sin(t * 1.4) * 0.03;
  sparkle.rotation.y = t * 0.05;
  gems.forEach(function (g) {
    if (!g.mesh.visible) return;
    g.mesh.rotation.y += dt * 1.6;
    g.mesh.position.y = g.y + Math.sin(t * 3 + g.spin) * 0.08;
  });
  balloonGroup.position.y = heightAt(BALLOON.x, BALLOON.z) + 1.7 + Math.sin(t * 1.3) * 0.18;
  if (playing) step(dt);
  else {
    camPos.lerp(new THREE.Vector3(Math.sin(t * 0.25) * 7, 3.4, Math.cos(t * 0.25) * 7), 1 - Math.exp(-2 * dt));
    lookPos.lerp(new THREE.Vector3(0, 0.8, 1), 1 - Math.exp(-2 * dt));
    camera.position.copy(camPos);
    camera.lookAt(lookPos);
  }
  document.body.dataset.mode = playing ? mode : (roomCode ? "lobby" : "menu");
  document.body.dataset.players = String(1 + remotes.size);
  document.body.dataset.code = roomCode;
  document.body.dataset.you = me.name;
  document.body.dataset.x = me.x.toFixed(2);
  document.body.dataset.score = String(score);
  document.body.dataset.visible = String(playing ? countVisible() : 0);
  document.body.dataset.emote = lastEmote;
  let fx = "";
  remotes.forEach(function (r) { fx = r.group.position.x.toFixed(2); });
  document.body.dataset.friendx = fx;
  document.body.dataset.ready = "1";
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);

function step(dt) {
  let ix = 0;
  let iz = 0;
  if (keys.ArrowLeft || keys.a || keys.A) ix -= 1;
  if (keys.ArrowRight || keys.d || keys.D) ix += 1;
  if (keys.ArrowUp || keys.w || keys.W) iz -= 1;
  if (keys.ArrowDown || keys.s || keys.S) iz += 1;
  if (stick.on) {
    ix = stick.x;
    iz = stick.y;
  }
  const mag = Math.hypot(ix, iz);
  const running = !!(keys.Shift || keys.ShiftLeft || mag > 0.82);
  const speed = running ? 8.1 : 4.3;
  const ground = heightAt(me.x, me.z);
  const top = SLIDE[0];
  if (!riding && balloonT <= 0 && Math.hypot(me.x - top.x, me.z - top.z) < 1.05 && me.y < top.y + 0.45) {
    riding = true;
    rideU = 0;
    say("Whee!");
  }
  if (riding) {
    rideU += dt * 0.42;
    const p = slideSample(rideU);
    me.x = p.x;
    me.y = p.y;
    me.z = p.z;
    me.vy = 0;
    me.onGround = false;
    if (rideU >= 1) {
      riding = false;
      me.onGround = true;
      me.y = heightAt(me.x, me.z);
    }
  } else if (balloonT > 0) {
    balloonT -= dt;
    me.x += (BALLOON.x - me.x) * Math.min(1, dt * 4);
    me.z += (BALLOON.z - me.z) * Math.min(1, dt * 4);
    const k = 1 - Math.max(0, balloonT) / 3.2;
    me.y = heightAt(BALLOON.x, BALLOON.z) + 0.2 + Math.sin(k * Math.PI) * 4.2;
    me.vy = 0;
    me.onGround = false;
    balloonGroup.position.x = me.x;
    balloonGroup.position.z = me.z;
    balloonGroup.position.y = me.y + 1.5;
    if (balloonT <= 0) {
      balloonGroup.position.set(BALLOON.x, heightAt(BALLOON.x, BALLOON.z) + 1.7, BALLOON.z);
      me.vy = 0;
    }
  } else {
    if (mag > 0.08) {
      const nx = ix / mag;
      const nz = iz / mag;
      me.yaw = Math.atan2(nx, nz);
      const stepLen = speed * dt * Math.min(1, mag);
      me.x += Math.sin(me.yaw) * stepLen;
      me.z += Math.cos(me.yaw) * stepLen;
    }
    const rr = Math.hypot(me.x, me.z);
    if (rr > 14.6) {
      me.x *= 14.6 / rr;
      me.z *= 14.6 / rr;
    }
    if (jumpQueued && me.onGround) {
      me.vy = 7.1;
      me.onGround = false;
    }
    for (let i = 0; i < mushCaps.length; i++) {
      const m = mushCaps[i];
      if (Math.hypot(me.x - m.x, me.z - m.z) < 0.85 && me.vy <= 0.4) {
        me.vy = 9;
        me.onGround = false;
        say("Boing!");
      }
    }
    if (!balloonLock && Math.hypot(me.x - BALLOON.x, me.z - BALLOON.z) < 1.2 && me.onGround) {
      balloonT = 3.2;
      balloonLock = true;
      say("Up you go!");
    }
    if (Math.hypot(me.x - BALLOON.x, me.z - BALLOON.z) > 2.2) balloonLock = false;
    me.vy -= 20 * dt;
    me.y += me.vy * dt;
    const gnd = heightAt(me.x, me.z);
    if (me.y <= gnd) {
      me.y = gnd;
      me.vy = 0;
      me.onGround = true;
    }
    void ground;
  }
  jumpQueued = false;
  me.group.position.set(me.x, me.y, me.z);
  me.group.rotation.y = me.yaw;
  const bob = mag > 0.08 ? Math.sin(tNow() * (running ? 14 : 9)) : 0;
  me.group.userData.legs.forEach(function (leg, i) {
    leg.rotation.x = bob * (i ? 1 : -1) * 0.7;
  });
  if (me.group.userData.emote > 0) {
    me.group.userData.emote -= dt;
    if (me.group.userData.emote <= 0) me.group.userData.bubble.visible = false;
  }
  gems.forEach(function (g) {
    if (g.taken) return;
    const d = Math.hypot(me.x - g.x, me.y - g.y, me.z - g.z);
    if (d > 1.35) return;
    if (mode === "room") {
      if (g.pending) return;
      g.pending = true;
      send({ t: "gem", id: g.id });
      setTimeout(function () { if (!g.taken) g.pending = false; }, 700);
    }
    else {
      g.taken = true;
      g.mesh.visible = false;
      setScore(score + 1);
      say("Star!");
    }
  });
  let fx = me.x;
  let fz = me.z;
  let near = 1;
  let span = 0;
  remotes.forEach(function (r) {
    const dx = r.group.position.x - me.x;
    const dz = r.group.position.z - me.z;
    const d = Math.hypot(dx, dz);
    if (d < 12) {
      fx += r.group.position.x;
      fz += r.group.position.z;
      near += 1;
      if (d > span) span = d;
    }
  });
  fx /= near;
  fz /= near;
  const back = Math.max(6.6, span * 1.35 + 5.2);
  const want = new THREE.Vector3(
    fx - Math.sin(me.yaw) * back,
    me.y + 3.2 + span * 0.25,
    fz - Math.cos(me.yaw) * back
  );
  camPos.lerp(want, 1 - Math.exp(-4.5 * dt));
  lookPos.lerp(new THREE.Vector3(fx, me.y + 0.9, fz), 1 - Math.exp(-6 * dt));
  camera.position.copy(camPos);
  camera.lookAt(lookPos);
  remotes.forEach(function (r) {
    const k = 1 - Math.exp(-12 * dt);
    r.group.position.x += (r.tx - r.group.position.x) * k;
    r.group.position.y += (r.ty - r.group.position.y) * k;
    r.group.position.z += (r.tz - r.group.position.z) * k;
    let dyaw = r.tyaw - r.group.rotation.y;
    while (dyaw > Math.PI) dyaw -= Math.PI * 2;
    while (dyaw < -Math.PI) dyaw += Math.PI * 2;
    r.group.rotation.y += dyaw * k;
    if (r.group.userData.emote > 0) {
      r.group.userData.emote -= dt;
      if (r.group.userData.emote <= 0) r.group.userData.bubble.visible = false;
    }
  });
  const now = performance.now();
  if (mode === "room" && now - sendAt > 66) {
    sendAt = now;
    send({ t: "move", x: me.x, y: me.y, z: me.z, yaw: me.yaw });
  }
}

function tNow() { return performance.now() / 1000; }

placeFriend(me.group, me);
syncGems(localGems());

const picks = document.getElementById("picks");
KINDS.forEach(function (kind) {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = kind.charAt(0).toUpperCase() + kind.slice(1);
  b.className = kind === me.kind ? "on" : "";
  b.addEventListener("click", function () {
    if (playing) return;
    me.kind = kind;
    me.name = nameOf(me.kind, me.color);
    picks.querySelectorAll("button").forEach(function (x) { x.classList.toggle("on", x === b); });
    placeFriend(me.group, me);
  });
  picks.appendChild(b);
});
const colors = document.getElementById("colors");
COLOR_NAMES.forEach(function (label, i) {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = label;
  b.className = i === me.color ? "on" : "";
  b.style.background = "#" + COLOR_HEX[i].toString(16).padStart(6, "0");
  b.addEventListener("click", function () {
    if (playing) return;
    me.color = i;
    me.name = nameOf(me.kind, me.color);
    colors.querySelectorAll("button").forEach(function (x) { x.classList.toggle("on", x === b); });
    placeFriend(me.group, me);
  });
  colors.appendChild(b);
});

let typed = "";
const letters = document.getElementById("letters");
const codeShow = document.getElementById("codeShow");
ALPH.split("").forEach(function (ch) {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = ch;
  b.dataset.letter = ch;
  b.addEventListener("click", function () {
    if (typed.length >= 4) return;
    typed += ch;
    codeShow.textContent = typed.padEnd(4, "-");
    if (typed.length === 4) tryJoin(typed);
  });
  letters.appendChild(b);
});

document.getElementById("pad-back").addEventListener("click", function () {
  typed = "";
  codeShow.textContent = "----";
  showCover("title");
});

async function tryJoin(code) {
  try {
    await connect();
    send({ t: "join", code: code, kind: me.kind, color: me.color });
  } catch (e) {
    startAlone("The island is still sleepy. Playing alone.");
  }
}

document.getElementById("make").addEventListener("click", async function () {
  try {
    await connect();
    send({ t: "create", kind: me.kind, color: me.color });
  } catch (e) {
    startAlone("The island is still sleepy. Playing alone.");
  }
});
document.getElementById("join").addEventListener("click", function () {
  typed = "";
  codeShow.textContent = "----";
  showCover("pad");
});
document.getElementById("alone").addEventListener("click", function () {
  say("Playing alone. Collect the stars!");
  startAlone();
});
document.getElementById("room-go").addEventListener("click", function () {
  if (mode !== "room") return;
  beginPlay();
});
emotesEl.addEventListener("click", function (ev) {
  const b = ev.target.closest("button");
  if (!b || !playing) return;
  const id = b.dataset.emote;
  if (mode === "room") send({ t: "emote", id: id });
  else if (me.group) showEmote(me.group, id);
});

addEventListener("keydown", function (ev) {
  keys[ev.key] = true;
  if ((ev.key === " " || ev.code === "Space") && !ev.repeat) jumpQueued = true;
});
addEventListener("keyup", function (ev) { keys[ev.key] = false; });

const stickEl = document.getElementById("stick");
const nub = document.getElementById("nub");
let stickId = null;
function stickMove(ev) {
  const rect = stickEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dx = ev.clientX - cx;
  const dy = ev.clientY - cy;
  const max = rect.width * 0.36;
  const len = Math.hypot(dx, dy) || 1;
  const cl = Math.min(max, len);
  const nx = dx / len * cl;
  const ny = dy / len * cl;
  nub.style.left = (rect.width / 2 - 28 + nx) + "px";
  nub.style.top = (rect.height / 2 - 28 + ny) + "px";
  stick.x = nx / max;
  stick.y = ny / max;
  stick.on = true;
}
stickEl.addEventListener("pointerdown", function (ev) {
  stickId = ev.pointerId;
  stickEl.setPointerCapture(ev.pointerId);
  stickMove(ev);
});
stickEl.addEventListener("pointermove", function (ev) {
  if (ev.pointerId !== stickId) return;
  stickMove(ev);
});
function stickEnd(ev) {
  if (ev.pointerId !== stickId) return;
  stickId = null;
  stick.on = false;
  stick.x = 0;
  stick.y = 0;
  nub.style.left = "36px";
  nub.style.top = "36px";
}
stickEl.addEventListener("pointerup", stickEnd);
stickEl.addEventListener("pointercancel", stickEnd);
document.getElementById("jump").addEventListener("pointerdown", function (ev) {
  ev.preventDefault();
  jumpQueued = true;
});

say("Pick a friend.");

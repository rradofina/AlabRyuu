/* Dino Stomp 3D: smooth high-poly island sample. Procedural meshes, no placeholder boxes. */
import * as THREE from "three";

const cv = document.getElementById("c");
const sayEl = document.getElementById("say");
const flEl = document.getElementById("fl");
const stEl = document.getElementById("st");
const titleEl = document.getElementById("title");
const winEl = document.getElementById("win");
const dockEl = document.getElementById("dock");

const phone = Math.min(window.innerWidth, window.innerHeight) < 720;
const SEG = phone ? 18 : 28;
const TERRAIN = phone ? 96 : 140;

const renderer = new THREE.WebGLRenderer({
  canvas: cv,
  antialias: !phone,
  alpha: false,
  powerPreference: "high-performance"
});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, phone ? 1 : 1.5));

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8fd4f2);
scene.fog = new THREE.Fog(0xb7e6fb, 16, 46);

const GOAL = 12;
const RUN = 3.2;
const camera = new THREE.PerspectiveCamera(48, 1, 0.08, 140);
const camTarget = new THREE.Vector3();
const lookTarget = new THREE.Vector3();
camera.position.set(-7.05, 2.75, 5.5);

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / Math.max(1, h);
  camera.updateProjectionMatrix();
  const small = Math.min(w, h) < 720;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1 : 1.5));
  renderer.setSize(w, h, false);
}
resize();
addEventListener("resize", resize);

const sun = new THREE.DirectionalLight(0xfff3d6, 2.4);
sun.position.set(10, 16, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(phone ? 512 : 1024, phone ? 512 : 1024);
sun.shadow.camera.near = 2;
sun.shadow.camera.far = 42;
sun.shadow.camera.left = -14;
sun.shadow.camera.right = 14;
sun.shadow.camera.top = 14;
sun.shadow.camera.bottom = -14;
sun.shadow.bias = -0.00025;
sun.shadow.normalBias = 0.04;
scene.add(sun);
scene.add(new THREE.HemisphereLight(0xd7f3ff, 0x3f6a34, 0.72));
scene.add(new THREE.AmbientLight(0xffffff, 0.18));

function makeEnv() {
  const env = new THREE.Scene();
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(30, 24, 16),
    new THREE.MeshBasicMaterial({ color: 0x9ed8f5, side: THREE.BackSide })
  );
  const ground = new THREE.Mesh(
    new THREE.SphereGeometry(30, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.45),
    new THREE.MeshBasicMaterial({ color: 0x6fbf73, side: THREE.BackSide })
  );
  ground.rotation.x = Math.PI;
  env.add(sky, ground);
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
function fbm(x, z) {
  let v = 0;
  let a = 0.5;
  let f = 1;
  for (let i = 0; i < 5; i++) {
    v += a * noise2(x * f, z * f);
    f *= 2.05;
    a *= 0.5;
  }
  return v;
}
function smoothstep(e0, e1, x) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}
function heightAt(x, z) {
  let h = (fbm(x * 0.07 + 2.2, z * 0.07 - 1.4) - 0.42) * 2.8;
  h += (fbm(x * 0.02, z * 0.02) - 0.5) * 1.4;
  const riverZ = 3.55 + Math.sin(x * 0.11) * 1.15;
  const rd = Math.abs(z - riverZ);
  if (rd < 2.05 && x > -16 && x < 24) {
    const bank = smoothstep(0.35, 2.05, rd);
    const bed = -0.62 + rd * 0.04;
    h = bed * (1 - bank) + h * bank;
  }
  const lane = Math.abs(z);
  if (lane < 1.7 && x > -12 && x < 78) {
    const edge = smoothstep(0.55, 1.7, lane);
    h = h * edge;
  }
  const dx = x - 13.5;
  const dz = z + 8.2;
  const dv = Math.hypot(dx, dz);
  if (dv < 6.5) h += Math.max(0, 6.5 - dv) * 0.22;
  return h;
}

function canvasTex(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}
const woodTex = canvasTex(128, 256, function (g, w, h) {
  g.fillStyle = "#9a6236";
  g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 3) {
    const n = 70 + Math.floor(Math.sin(y * 0.35) * 18);
    g.strokeStyle = "rgba(" + n + "," + (n - 30) + ",20,0.35)";
    g.beginPath();
    g.moveTo(0, y);
    g.bezierCurveTo(w * 0.3, y + 4, w * 0.7, y - 3, w, y + 1);
    g.stroke();
  }
});
const leafTex = canvasTex(128, 128, function (g, w, h) {
  g.fillStyle = "#2f9e45";
  g.fillRect(0, 0, w, h);
  g.strokeStyle = "#14532d";
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(w * 0.5, 8);
  g.lineTo(w * 0.5, h - 8);
  g.stroke();
  for (let i = 0; i < 6; i++) {
    g.beginPath();
    g.moveTo(w * 0.5, 20 + i * 16);
    g.lineTo(w * 0.2, 12 + i * 16);
    g.moveTo(w * 0.5, 20 + i * 16);
    g.lineTo(w * 0.8, 12 + i * 16);
    g.stroke();
  }
});

const skin = new THREE.MeshPhysicalMaterial({
  color: 0x7ed04a,
  roughness: 0.38,
  metalness: 0,
  clearcoat: 0.28,
  clearcoatRoughness: 0.42,
  sheen: 0.45,
  sheenColor: new THREE.Color(0xd9f99d),
  envMapIntensity: 0.7
});
const bellyMat = new THREE.MeshPhysicalMaterial({
  color: 0xf6e7b0,
  roughness: 0.5,
  metalness: 0,
  clearcoat: 0.12,
  sheen: 0.25,
  sheenColor: new THREE.Color(0xfff7d6),
  envMapIntensity: 0.45
});
const hornMat = new THREE.MeshPhysicalMaterial({
  color: 0xf4e4b8,
  roughness: 0.32,
  metalness: 0.02,
  clearcoat: 0.4,
  envMapIntensity: 0.5
});
const eyeWhite = new THREE.MeshPhysicalMaterial({ color: 0xfffdf8, roughness: 0.15, clearcoat: 0.6, envMapIntensity: 0.4 });
const pupilMat = new THREE.MeshStandardMaterial({ color: 0x1a120c, roughness: 0.35 });
const barkMat = new THREE.MeshStandardMaterial({ map: woodTex, color: 0xffffff, roughness: 0.86, metalness: 0.02 });
const leafMat = new THREE.MeshStandardMaterial({
  map: leafTex,
  color: 0xffffff,
  roughness: 0.62,
  metalness: 0,
  side: THREE.DoubleSide
});
const rockMat = new THREE.MeshStandardMaterial({ color: 0x8b8178, roughness: 0.92, metalness: 0.02 });
const darkRock = new THREE.MeshStandardMaterial({ color: 0x3a3432, roughness: 0.88 });
const petalMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.45, metalness: 0 });
const flowerCenter = new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.4 });
const stemMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.7 });
const sandMat = new THREE.MeshStandardMaterial({ color: 0xe7d3a1, roughness: 0.9 });

function capsuleGeo(radius, length, radial) {
  const pts = [];
  const n = 10;
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
  const g = new THREE.PlaneGeometry(0.55, 1.7, 4, 14);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    const t = (y + 0.85) / 1.7;
    p.setZ(i, Math.sin(t * Math.PI) * 0.28);
    p.setX(i, p.getX(i) * (0.35 + Math.sin(t * Math.PI) * 0.85));
  }
  g.computeVertexNormals();
  return g;
}
const frondGeo = bendLeaf();

function rocky(detail, scaleAmp) {
  const g = new THREE.IcosahedronGeometry(1, detail);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const nx = p.getX(i);
    const ny = p.getY(i);
    const nz = p.getZ(i);
    const n = fbm(nx * 2.2 + 4, nz * 2.2 + ny * 2);
    const s = 1 + (n - 0.45) * scaleAmp;
    p.setXYZ(i, nx * s, ny * s, nz * s);
  }
  g.computeVertexNormals();
  return g;
}
const decoRockGeo = rocky(phone ? 2 : 3, 0.35);
const playRockGeo = rocky(phone ? 3 : 4, 0.28);

const terrainGeo = new THREE.PlaneGeometry(96, 64, TERRAIN, Math.max(64, Math.floor(TERRAIN * 0.7)));
terrainGeo.rotateX(-Math.PI / 2);
const tp = terrainGeo.attributes.position;
const colors = new Float32Array(tp.count * 3);
const cSand = new THREE.Color(0xe7d3a1);
const cGrass = new THREE.Color(0x3dae4e);
const cMoss = new THREE.Color(0x1f7a38);
const cStone = new THREE.Color(0x8d847c);
const cBed = new THREE.Color(0xc4a574);
for (let i = 0; i < tp.count; i++) {
  const x = tp.getX(i);
  const z = tp.getZ(i);
  const h = heightAt(x, z);
  tp.setY(i, h);
  const col = new THREE.Color();
  if (h < -0.25) col.copy(cBed);
  else if (h < 0.15) col.copy(cSand).lerp(cGrass, smoothstep(-0.05, 0.18, h));
  else if (h < 1.1) col.copy(cGrass).lerp(cMoss, smoothstep(0.2, 1.1, h));
  else col.copy(cMoss).lerp(cStone, smoothstep(1.1, 2.4, h));
  colors[i * 3] = col.r;
  colors[i * 3 + 1] = col.g;
  colors[i * 3 + 2] = col.b;
}
terrainGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
terrainGeo.computeVertexNormals();
const terrain = new THREE.Mesh(
  terrainGeo,
  new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 })
);
terrain.receiveShadow = true;
scene.add(terrain);

const waterUniforms = { uTime: { value: 0 }, uCam: { value: new THREE.Vector3() } };
const water = new THREE.Mesh(
  new THREE.PlaneGeometry(42, 7.5, phone ? 48 : 90, phone ? 16 : 28),
  new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: waterUniforms,
    vertexShader: [
      "uniform float uTime;",
      "varying vec3 vPos;",
      "varying vec3 vN;",
      "void main() {",
      "  vec3 p = position;",
      "  float w = sin(p.x * 1.6 + uTime * 1.5) * 0.045 + sin(p.y * 2.1 - uTime * 1.1) * 0.03;",
      "  p.z += w;",
      "  vec4 wp = modelMatrix * vec4(p, 1.0);",
      "  vPos = wp.xyz;",
      "  vN = normalize(mat3(modelMatrix) * vec3(-cos(p.x * 1.6 + uTime * 1.5) * 0.08, -cos(p.y * 2.1 - uTime) * 0.06, 1.0));",
      "  gl_Position = projectionMatrix * viewMatrix * wp;",
      "}"
    ].join("\n"),
    fragmentShader: [
      "uniform vec3 uCam;",
      "varying vec3 vPos;",
      "varying vec3 vN;",
      "void main() {",
      "  vec3 V = normalize(uCam - vPos);",
      "  float fres = pow(1.0 - max(dot(normalize(vN), V), 0.0), 2.4);",
      "  vec3 deep = vec3(0.03, 0.38, 0.52);",
      "  vec3 shore = vec3(0.42, 0.82, 0.78);",
      "  vec3 col = mix(deep, shore, fres);",
      "  col += vec3(0.7, 0.9, 0.85) * fres * 0.35;",
      "  gl_FragColor = vec4(col, 0.62 + fres * 0.28);",
      "}"
    ].join("\n")
  })
);
water.rotation.x = -Math.PI / 2;
water.position.set(4, -0.34, 3.55);
scene.add(water);

function volcanoMesh() {
  const pts = [
    [2.8, 0], [2.35, 0.7], [1.85, 1.5], [1.35, 2.35], [0.95, 3.15],
    [0.72, 3.55], [0.42, 3.25], [0.18, 2.85]
  ].map(function (p) { return new THREE.Vector2(p[0], p[1]); });
  const geo = new THREE.LatheGeometry(pts, phone ? 40 : 64);
  const pos = geo.attributes.position;
  const cols = new Float32Array(pos.count * 3);
  const rock = new THREE.Color(0x6b5b54);
  const hot = new THREE.Color(0xe07a32);
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const n = fbm(pos.getX(i) * 1.4, pos.getZ(i) * 1.4 + y);
    const r = 1 + (n - 0.5) * 0.08;
    pos.setX(i, pos.getX(i) * r);
    pos.setZ(i, pos.getZ(i) * r);
    const col = rock.clone().lerp(hot, smoothstep(2.4, 3.5, y));
    cols[i * 3] = col.r;
    cols[i * 3 + 1] = col.g;
    cols[i * 3 + 2] = col.b;
  }
  geo.computeVertexNormals();
  geo.setAttribute("color", new THREE.BufferAttribute(cols, 3));
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0.04 }));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const cave = new THREE.Mesh(new THREE.SphereGeometry(0.7, 24, 16), darkRock);
  cave.scale.set(1, 0.85, 0.7);
  cave.position.set(0, 0.7, 1.7);
  const arch = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.16, 12, 28, Math.PI), rockMat);
  arch.rotation.x = Math.PI * 0.5;
  arch.rotation.z = Math.PI;
  arch.position.set(0, 0.95, 2.05);
  const g = new THREE.Group();
  g.add(mesh, cave, arch);
  return g;
}
const volcano = volcanoMesh();
volcano.position.set(13.2, heightAt(13.2, -8.2) - 0.15, -8.2);
scene.add(volcano);

function hut() {
  const g = new THREE.Group();
  const postGeo = new THREE.CylinderGeometry(0.09, 0.11, 1.7, 12);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.4;
    const post = new THREE.Mesh(postGeo, barkMat);
    post.position.set(Math.cos(a) * 1.15, 0.85, Math.sin(a) * 1.15);
    post.castShadow = true;
    g.add(post);
  }
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.35, 0.16, 24), barkMat);
  floor.position.y = 0.08;
  floor.receiveShadow = true;
  g.add(floor);
  const leaf = frondGeo;
  for (let layer = 0; layer < 2; layer++) {
    const n = layer === 0 ? 10 : 8;
    const y = 1.7 + layer * 0.35;
    const rad = 1.5 - layer * 0.35;
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(leaf, leafMat);
      const a = (i / n) * Math.PI * 2;
      m.position.set(Math.cos(a) * rad * 0.45, y, Math.sin(a) * rad * 0.45);
      m.lookAt(Math.cos(a) * rad, y - 0.2, Math.sin(a) * rad);
      m.scale.setScalar(0.85 - layer * 0.1);
      m.castShadow = !phone;
      g.add(m);
    }
  }
  return g;
}
const hutMesh = hut();
hutMesh.position.set(6.2, heightAt(6.2, -4.6), -4.6);
scene.add(hutMesh);

function tower() {
  const g = new THREE.Group();
  const log = new THREE.CylinderGeometry(0.1, 0.13, 4.4, 12);
  const corners = [[-0.7, -0.7], [0.7, -0.7], [0.7, 0.7], [-0.7, 0.7]];
  corners.forEach(function (c) {
    const m = new THREE.Mesh(log, barkMat);
    m.position.set(c[0], 2.2, c[1]);
    m.castShadow = true;
    g.add(m);
  });
  [1.3, 2.6, 3.9].forEach(function (y) {
    const plat = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.0, 0.1, 20), barkMat);
    plat.position.y = y;
    plat.castShadow = true;
    plat.receiveShadow = true;
    g.add(plat);
    for (let i = 0; i < 8; i++) {
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.45, 6), barkMat);
      const a = (i / 8) * Math.PI * 2;
      rail.position.set(Math.cos(a) * 0.85, y + 0.32, Math.sin(a) * 0.85);
      g.add(rail);
    }
  });
  for (let i = 0; i < 8; i++) {
    const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 6), barkMat);
    rung.rotation.z = Math.PI / 2;
    rung.position.set(0.7, 0.4 + i * 0.42, 0);
    g.add(rung);
  }
  const shade = new THREE.Mesh(frondGeo, leafMat);
  shade.position.y = 4.35;
  shade.scale.setScalar(1.1);
  shade.rotation.x = 0.4;
  g.add(shade);
  return g;
}
const towerMesh = tower();
towerMesh.position.set(1.2, heightAt(1.2, -5.4), -5.4);
scene.add(towerMesh);

const palmTrunkGeo = new THREE.CylinderGeometry(0.16, 0.28, 3.5, SEG, 8);
{
  const p = palmTrunkGeo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    p.setX(i, p.getX(i) + Math.sin((y + 1.7) * 0.85) * 0.14);
  }
  palmTrunkGeo.computeVertexNormals();
}
const palmSpots = [];
for (let i = 0; i < (phone ? 8 : 12); i++) {
  const a = i * 2.399;
  const rad = 6 + (i % 5) * 1.7;
  const x = Math.cos(a) * rad + 2;
  const z = Math.sin(a) * rad * 0.85 - 1.5;
  if (Math.abs(z) < 2.2 && x > -6 && x < 14) continue;
  if (heightAt(x, z) < -0.2) continue;
  palmSpots.push({ x: x, z: z, y: heightAt(x, z), rot: a, s: 0.85 + (i % 3) * 0.12, phase: i });
}
const trunkIM = new THREE.InstancedMesh(palmTrunkGeo, barkMat, palmSpots.length);
const frondIM = new THREE.InstancedMesh(frondGeo, leafMat, palmSpots.length * 7);
trunkIM.castShadow = true;
trunkIM.receiveShadow = true;
const dummy = new THREE.Object3D();
palmSpots.forEach(function (tree, i) {
  dummy.position.set(tree.x, tree.y + 1.75 * tree.s, tree.z);
  dummy.rotation.set(0, tree.rot, 0);
  dummy.scale.setScalar(tree.s);
  dummy.updateMatrix();
  trunkIM.setMatrixAt(i, dummy.matrix);
});
trunkIM.frustumCulled = false;
frondIM.frustumCulled = false;
scene.add(trunkIM);
scene.add(frondIM);

const rockSpots = [];
for (let i = 0; i < 24 && rockSpots.length < (phone ? 10 : 16); i++) {
  const a = i * 1.7;
  const x = Math.cos(a) * (5 + (i % 4)) + 1.5;
  const z = Math.sin(a) * 6 - 1.2;
  if (z > 1.6) continue;
  if (Math.hypot(x + 2.4, z) < 3.2) continue;
  if (Math.abs(z) < 1.3 && x > -4 && x < 12) continue;
  rockSpots.push({ x: x, z: z, a: a, s: 0.38 + (i % 5) * 0.14 });
}
const decoIM = new THREE.InstancedMesh(decoRockGeo, rockMat, Math.max(1, rockSpots.length));
decoIM.castShadow = !phone;
decoIM.receiveShadow = true;
rockSpots.forEach(function (spot, i) {
  dummy.position.set(spot.x, heightAt(spot.x, spot.z) + spot.s * 0.25, spot.z);
  dummy.rotation.set(i, spot.a, i * 0.2);
  dummy.scale.setScalar(spot.s);
  dummy.updateMatrix();
  decoIM.setMatrixAt(i, dummy.matrix);
});
decoIM.frustumCulled = false;
scene.add(decoIM);

function buildDino() {
  const root = new THREE.Group();
  const pivot = new THREE.Group();
  root.add(pivot);

  const bodyGeo = capsuleGeo(0.34, 0.85, SEG);
  const body = new THREE.Mesh(bodyGeo, skin);
  body.rotation.z = Math.PI / 2;
  body.position.set(0, 0.72, 0);
  body.scale.set(1, 1, 0.86);
  pivot.add(body);

  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.26, SEG, 18), bellyMat);
  belly.scale.set(1.05, 0.42, 0.48);
  belly.position.set(0.02, 0.5, 0);
  pivot.add(belly);

  const neck = new THREE.Group();
  neck.position.set(0.48, 0.84, 0);
  pivot.add(neck);
  const neckMesh = new THREE.Mesh(capsuleGeo(0.12, 0.18, 16), skin);
  neckMesh.rotation.z = Math.PI / 2.4;
  neck.add(neckMesh);

  const head = new THREE.Group();
  head.position.set(0.22, 0.12, 0);
  neck.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.28, SEG, 22), skin);
  skull.scale.set(1.05, 0.92, 0.96);
  head.add(skull);
  const snout = new THREE.Mesh(capsuleGeo(0.11, 0.22, 16), skin);
  snout.rotation.z = Math.PI / 2;
  snout.position.set(0.28, -0.04, 0);
  head.add(snout);
  const horn = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.2, 16), hornMat);
  horn.rotation.z = -Math.PI / 2.5;
  horn.position.set(0.34, 0.08, 0);
  head.add(horn);
  const frill = new THREE.Mesh(new THREE.CircleGeometry(0.34, 36), skin);
  frill.position.set(-0.08, 0.06, 0);
  frill.rotation.y = Math.PI / 2;
  head.add(frill);
  const plateGeo = new THREE.ConeGeometry(0.07, 0.16, 10);
  for (let i = 0; i < 7; i++) {
    const plate = new THREE.Mesh(plateGeo, skin);
    const a = -0.9 + (i / 6) * 1.8;
    plate.position.set(-0.12, 0.08 + Math.cos(a) * 0.22, Math.sin(a) * 0.22);
    plate.rotation.z = 0.6;
    plate.rotation.y = a;
    head.add(plate);
  }
  const eyeGeo = new THREE.SphereGeometry(0.075, 18, 14);
  const pupGeo = new THREE.SphereGeometry(0.04, 12, 10);
  [-1, 1].forEach(function (s) {
    const eye = new THREE.Mesh(eyeGeo, eyeWhite);
    eye.position.set(0.12, 0.06, s * 0.16);
    eye.scale.z = 0.8;
    const pup = new THREE.Mesh(pupGeo, pupilMat);
    pup.position.set(0.05, 0, s * 0.02);
    eye.add(pup);
    const shine = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 8), eyeWhite);
    shine.position.set(0.02, 0.02, s * 0.01);
    pup.add(shine);
    head.add(eye);
    const cheek = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xfb7185, transparent: true, opacity: 0.35, roughness: 0.6 })
    );
    cheek.position.set(0.1, -0.04, s * 0.16);
    head.add(cheek);
  });
  const smile = new THREE.Mesh(
    new THREE.TorusGeometry(0.055, 0.012, 8, 14, Math.PI),
    new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.5 })
  );
  smile.position.set(0.36, -0.06, 0);
  smile.rotation.y = Math.PI / 2;
  smile.rotation.z = Math.PI;
  head.add(smile);

  const spikeGeo = new THREE.ConeGeometry(0.055, 0.18, 10);
  for (let i = 0; i < 5; i++) {
    const sp = new THREE.Mesh(spikeGeo, skin);
    sp.position.set(-0.28 + i * 0.16, 1.02, 0);
    sp.rotation.z = -0.4;
    pivot.add(sp);
  }

  const tails = [];
  let tailParent = pivot;
  for (let i = 0; i < 5; i++) {
    const seg = new THREE.Group();
    seg.position.set(i === 0 ? -0.55 : -0.18, i === 0 ? 0.7 : 0, 0);
    const mesh = new THREE.Mesh(capsuleGeo(0.1 - i * 0.014, 0.16, 14), skin);
    mesh.rotation.z = Math.PI / 2;
    mesh.position.x = -0.08;
    seg.add(mesh);
    if (i < 4) {
      const sp = new THREE.Mesh(spikeGeo, skin);
      sp.scale.setScalar(0.7 - i * 0.08);
      sp.position.set(-0.05, 0.12, 0);
      seg.add(sp);
    }
    tailParent.add(seg);
    tails.push(seg);
    tailParent = seg;
  }

  function leg(x, z, phase) {
    const hip = new THREE.Group();
    hip.position.set(x, 0.62, z);
    const thigh = new THREE.Mesh(capsuleGeo(0.09, 0.22, 14), skin);
    thigh.position.y = -0.12;
    hip.add(thigh);
    const knee = new THREE.Group();
    knee.position.y = -0.24;
    hip.add(knee);
    const shin = new THREE.Mesh(capsuleGeo(0.07, 0.18, 12), skin);
    shin.position.y = -0.1;
    knee.add(shin);
    const ankle = new THREE.Group();
    ankle.position.y = -0.2;
    knee.add(ankle);
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 10), bellyMat);
    foot.scale.set(1.3, 0.55, 1.05);
    ankle.add(foot);
    pivot.add(hip);
    return { hip: hip, thigh: thigh, knee: knee, ankle: ankle, phase: phase };
  }
  const legs = [
    leg(0.28, 0.16, 0),
    leg(0.28, -0.16, Math.PI),
    leg(-0.32, 0.16, Math.PI),
    leg(-0.32, -0.16, 0)
  ];

  root.traverse(function (o) {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return { root: root, pivot: pivot, neck: neck, head: head, tails: tails, legs: legs };
}
const dino = buildDino();
dino.root.position.set(-2.45, 0, 0);
scene.add(dino.root);

function makePlayFlower() {
  const g = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 0.42, 8), stemMat);
  stem.position.y = 0.21;
  g.add(stem);
  const petalGeo = new THREE.SphereGeometry(0.09, 12, 10);
  for (let i = 0; i < 6; i++) {
    const petal = new THREE.Mesh(petalGeo, petalMat);
    petal.scale.set(0.55, 1, 0.35);
    petal.position.y = 0.46;
    petal.rotation.y = (i / 6) * Math.PI * 2;
    petal.rotateZ(0.7);
    g.add(petal);
  }
  const center = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 10), flowerCenter);
  center.position.y = 0.48;
  g.add(center);
  return g;
}
const blooms = [];
for (let i = 0; i < 5; i++) {
  const mesh = makePlayFlower();
  mesh.position.set(4.2 + i * 2.7, 0.02, 0.05);
  mesh.scale.setScalar(1.55);
  mesh.traverse(function (o) { if (o.isMesh) o.castShadow = true; });
  scene.add(mesh);
  blooms.push({ mesh: mesh, got: 0 });
}
const rocks = [];
for (let i = 0; i < 4; i++) {
  const mesh = new THREE.Mesh(playRockGeo, rockMat);
  const s = 0.42 + (i % 3) * 0.12;
  mesh.scale.setScalar(s);
  mesh.position.set(6 + i * 3.3, s * 0.55, 0);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  rocks.push({ mesh: mesh, s: s, smash: 0 });
}

let play = false;
let flowers = 0;
let stars = 0;
let pose = "walk";
let poseT = 0;
let hopY = 0;
let vy = 0;
let clockT = 0;
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
  dino.root.position.x = -2.45;
  camera.position.set(dino.root.position.x - 3.4, 3.15, 6.8);
  rocks.forEach(function (o, i) {
    o.smash = 0;
    o.mesh.visible = true;
    o.mesh.scale.setScalar(o.s);
    o.mesh.position.x = 6 + i * 3.3;
  });
  blooms.forEach(function (f, i) {
    f.got = 0;
    f.mesh.visible = true;
    f.mesh.position.x = 4.2 + i * 2.7;
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

function animateDino(t) {
  const cycle = t * 7.2;
  const air = pose === "air" || pose === "crouch";
  dino.legs.forEach(function (leg) {
    const s = Math.sin(cycle + leg.phase);
    if (air) {
      leg.hip.rotation.x = -0.9;
      leg.knee.rotation.x = 1.15;
    } else if (pose === "stomp") {
      leg.hip.rotation.x = 0.35;
      leg.knee.rotation.x = 0.15;
    } else {
      leg.hip.rotation.x = s * 0.62;
      leg.knee.rotation.x = Math.max(0, -s) * 1.05;
    }
    leg.ankle.rotation.x = -leg.knee.rotation.x * 0.45;
  });
  dino.tails.forEach(function (seg, i) {
    seg.rotation.y = Math.sin(t * 3.2 - i * 0.55) * (0.22 - i * 0.02);
    seg.rotation.z = Math.sin(t * 2.2 + i) * 0.06;
  });
  dino.head.rotation.x = air ? -0.28 : Math.sin(t * 1.8) * 0.06;
  dino.head.rotation.y = Math.sin(t * 0.8) * 0.14;
  dino.neck.rotation.x = air ? -0.15 : 0;
  const bob = pose === "walk" ? Math.sin(cycle * 2) * 0.035 : 0;
  const squat = pose === "crouch" || pose === "stomp" ? 0.84 : 1;
  dino.pivot.position.y = hopY + bob;
  dino.pivot.scale.set(pose === "stomp" ? 1.08 : 1, squat, 1);
}

let last = 0;
const fpsSamples = [];
function frame(now) {
  if (!last) last = now;
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  clockT += dt;
  fpsSamples.push(dt);
  if (fpsSamples.length > 90) fpsSamples.shift();
  if (running()) {
    poseT += dt;
    if (pose === "crouch") {
      if (poseT > 0.12) { pose = "air"; vy = 6.8; poseT = 0; }
    } else if (pose === "air") {
      vy -= 15.5 * dt;
      hopY += vy * dt;
      if (hopY <= 0) { hopY = 0; vy = 0; pose = "land"; poseT = 0; }
    } else if (pose === "land") {
      if (poseT > 0.12) pose = "walk";
    } else if (pose === "stomp") {
      if (poseT > 0.24) pose = "walk";
    }
    dino.root.position.x += RUN * dt;
    const ahead = dino.root.position.x;
    rocks.forEach(function (o) {
      o.mesh.rotation.y += dt * 0.4;
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
      f.mesh.rotation.y += dt;
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
  } else {
    hopY += (0 - hopY) * 0.08;
  }
  animateDino(clockT);
  palmSpots.forEach(function (tree, i) {
    for (let k = 0; k < 7; k++) {
      const sway = Math.sin(clockT * 1.4 + tree.phase + k) * 0.12;
      const a = tree.rot + (k / 7) * Math.PI * 2;
      dummy.position.set(
        tree.x + Math.cos(a) * 0.15,
        tree.y + 3.35 * tree.s,
        tree.z + Math.sin(a) * 0.15
      );
      dummy.rotation.set(0.85 + sway, a, 0.15);
      dummy.scale.setScalar(tree.s);
      dummy.updateMatrix();
      frondIM.setMatrixAt(i * 7 + k, dummy.matrix);
    }
  });
  frondIM.instanceMatrix.needsUpdate = true;
  const follow = 1 - Math.exp(-3.2 * dt);
  camTarget.set(dino.root.position.x - 3.4, 3.15 + hopY * 0.12, 6.8);
  camera.position.lerp(camTarget, follow);
  lookTarget.set(dino.root.position.x + 1.6, 0.75, 0);
  camera.lookAt(lookTarget);
  waterUniforms.uTime.value = clockT;
  waterUniforms.uCam.value.copy(camera.position);
  const avg = fpsSamples.reduce(function (s, n) { return s + n; }, 0) / Math.max(1, fpsSamples.length);
  document.body.dataset.fps = String(Math.round(1 / Math.max(0.001, avg)));
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
hud();
requestAnimationFrame(frame);

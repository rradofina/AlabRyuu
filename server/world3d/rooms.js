const KINDS = ["dino", "cat", "bunny", "duck"];
const COLOR_NAMES = ["Green", "Blue", "Pink", "Sunny"];
const EMOTES = ["wave", "heart", "star", "laugh"];
const ALPH = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const MAX_PLAYERS = 6;
const MAX_SPEED = 14;

const GEMS = [
  ["s1", 2.2, 0.6, 1.4],
  ["s2", -2.4, 0.6, 2.2],
  ["s3", 4.2, 0.6, -1.6],
  ["s4", -4.6, 0.6, -2.4],
  ["s5", 1.2, 0.6, -4.2],
  ["s6", 6.2, 0.6, 2.6],
  ["s7", -6.4, 0.6, 1.2],
  ["s8", 0.4, 0.6, 5.2]
];

function num(v) {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function dist(a, b) {
  const dx = a.x - b.x;
  const dy = (a.y || 0) - (b.y || 0);
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function makeCode() {
  let s = "";
  for (let i = 0; i < 4; i++) s += ALPH[Math.floor(Math.random() * ALPH.length)];
  return s;
}

function nameOf(kind, color) {
  return COLOR_NAMES[color] + " " + kind.charAt(0).toUpperCase() + kind.slice(1);
}

function parseWho(msg) {
  if (!msg || typeof msg !== "object") return null;
  if (KINDS.indexOf(msg.kind) < 0) return null;
  const color = msg.color;
  if (typeof color !== "number" || !Number.isInteger(color) || color < 0 || color > 3) return null;
  return { kind: msg.kind, color: color };
}

function gemList() {
  return GEMS.map(function (g) {
    return { id: g[0], x: g[1], y: g[2], z: g[3], taken: false };
  });
}

function publicPlayer(p) {
  return { id: p.id, name: p.name, kind: p.kind, color: p.color, x: p.x, y: p.y, z: p.z, yaw: p.yaw };
}

function snapshot(room, you) {
  return {
    t: "room",
    code: room.code,
    you: you,
    score: room.score,
    players: Array.from(room.players.values()).map(publicPlayer),
    gems: room.gems.filter(function (g) { return !g.taken; }).map(function (g) {
      return { id: g.id, x: g.x, y: g.y, z: g.z };
    })
  };
}

function send(ws, obj) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj));
}

function broadcast(room, obj, exceptId) {
  room.players.forEach(function (p) {
    if (p.id !== exceptId) send(p.ws, obj);
  });
}

function createLobby() {
  return { rooms: new Map(), seq: 1 };
}

function allow(client, now) {
  const t = now || Date.now();
  client.bucket = (client.bucket || []).filter(function (x) { return t - x < 2000; });
  if (client.bucket.length >= 40) return false;
  client.bucket.push(t);
  return true;
}

function addPlayer(room, client, who) {
  const id = "p" + room.code + client.lobby.seq++;
  const player = {
    id: id,
    name: nameOf(who.kind, who.color),
    kind: who.kind,
    color: who.color,
    x: (room.players.size - 0) * 1.5,
    y: 0,
    z: 0,
    yaw: 0,
    ws: client.ws,
    lastPos: null,
    lastAt: 0,
    emoteAt: 0
  };
  player.x = (room.players.size) * 1.5;
  room.players.set(id, player);
  client.id = id;
  client.room = room.code;
  return player;
}

function createRoom(lobby, client, msg) {
  if (client.room) return { t: "err", msg: "Already in a room" };
  const who = parseWho(msg);
  if (!who) return { t: "err", msg: "Pick a friend" };
  let code = makeCode();
  while (lobby.rooms.has(code)) code = makeCode();
  const room = { code: code, players: new Map(), gems: gemList(), score: 0 };
  lobby.rooms.set(code, room);
  client.lobby = lobby;
  const player = addPlayer(room, client, who);
  return snapshot(room, player.id);
}

function joinRoom(lobby, client, msg) {
  if (client.room) return { t: "err", msg: "Already in a room" };
  const who = parseWho(msg);
  if (!who) return { t: "err", msg: "Pick a friend" };
  const code = typeof msg.code === "string" ? msg.code.toUpperCase() : "";
  if (!/^[A-Z]{4}$/.test(code)) return { t: "err", msg: "Use 4 letters" };
  const room = lobby.rooms.get(code);
  if (!room) return { t: "err", msg: "No room" };
  if (room.players.size >= MAX_PLAYERS) return { t: "err", msg: "Room is full" };
  client.lobby = lobby;
  const player = addPlayer(room, client, who);
  broadcast(room, { t: "join", player: publicPlayer(player), score: room.score }, player.id);
  return snapshot(room, player.id);
}

function applyMove(room, player, msg, now) {
  const x = num(msg.x);
  const y = num(msg.y);
  const z = num(msg.z);
  const yaw = num(msg.yaw);
  if (x == null || y == null || z == null || yaw == null) return;
  if (Math.abs(x) > 36 || Math.abs(z) > 36 || y < -1 || y > 18) return;
  const t = now || Date.now();
  const dt = player.lastAt ? Math.max(0.02, (t - player.lastAt) / 1000) : 0.1;
  if (player.lastPos) {
    const d = dist(player.lastPos, { x: x, y: y, z: z });
    if (d > MAX_SPEED * dt + 1.2) return;
  }
  player.x = x;
  player.y = y;
  player.z = z;
  player.yaw = yaw;
  player.lastPos = { x: x, y: y, z: z };
  player.lastAt = t;
  broadcast(room, { t: "move", id: player.id, x: x, y: y, z: z, yaw: yaw }, player.id);
}

function applyGem(room, player, msg) {
  if (!msg || typeof msg.id !== "string") return;
  const gem = room.gems.find(function (g) { return g.id === msg.id && !g.taken; });
  if (!gem) return;
  if (dist(player, gem) > 2.4) return;
  gem.taken = true;
  room.score += 1;
  const news = { t: "gem", id: gem.id, score: room.score };
  broadcast(room, news, null);
  send(player.ws, news);
}

function applyEmote(room, player, msg, now) {
  if (!msg || EMOTES.indexOf(msg.id) < 0) return { t: "err", msg: "No" };
  const t = now || Date.now();
  if (t - player.emoteAt < 400) return;
  player.emoteAt = t;
  const news = { t: "emote", id: player.id, emote: msg.id };
  broadcast(room, news, player.id);
  return news;
}

function disconnect(lobby, client) {
  if (!client.room) return;
  const room = lobby.rooms.get(client.room);
  client.room = null;
  if (!room) return;
  room.players.delete(client.id);
  broadcast(room, { t: "leave", id: client.id }, null);
  if (room.players.size === 0) lobby.rooms.delete(room.code);
}

function handle(lobby, client, msg, now) {
  if (!msg || typeof msg.t !== "string") return { t: "err", msg: "No" };
  if (msg.t === "create") return createRoom(lobby, client, msg);
  if (msg.t === "join") return joinRoom(lobby, client, msg);
  const room = client.room ? lobby.rooms.get(client.room) : null;
  const player = room && client.id ? room.players.get(client.id) : null;
  if (!room || !player) return { t: "err", msg: "Join first" };
  if (msg.t === "move") { applyMove(room, player, msg, now); return null; }
  if (msg.t === "gem") { applyGem(room, player, msg); return null; }
  if (msg.t === "emote") return applyEmote(room, player, msg, now);
  return { t: "err", msg: "No" };
}

module.exports = {
  KINDS: KINDS,
  EMOTES: EMOTES,
  MAX_PLAYERS: MAX_PLAYERS,
  GEMS: GEMS,
  createLobby: createLobby,
  allow: allow,
  handle: handle,
  disconnect: disconnect,
  nameOf: nameOf
};

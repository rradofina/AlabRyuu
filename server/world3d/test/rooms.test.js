const test = require("node:test");
const assert = require("node:assert");
const http = require("http");
const { WebSocket } = require("ws");
const rooms = require("../rooms");
const { createServer } = require("../server");

function client() {
  return { ws: { readyState: 1, sent: [], send: function (s) { this.sent.push(JSON.parse(s)); } }, bucket: [], id: null, room: null };
}

test("create and join share a room and a score", function () {
  const lobby = rooms.createLobby();
  const a = client();
  const made = rooms.handle(lobby, a, { t: "create", kind: "dino", color: 1 });
  assert.equal(made.t, "room");
  assert.equal(made.code.length, 4);
  assert.equal(made.players[0].name, "Blue Dino");
  const b = client();
  const joined = rooms.handle(lobby, b, { t: "join", code: made.code, kind: "cat", color: 2 });
  assert.equal(joined.players.length, 2);
  assert.equal(joined.players[1].name, "Pink Cat");
  assert.equal(a.ws.sent.length, 1);
  assert.equal(a.ws.sent[0].t, "join");
});

test("bad code, full room, and bad character are rejected", function () {
  const lobby = rooms.createLobby();
  const a = client();
  const made = rooms.handle(lobby, a, { t: "create", kind: "bunny", color: 0 });
  assert.equal(rooms.handle(lobby, client(), { t: "join", code: "NOPE", kind: "duck", color: 0 }).msg, "No room");
  assert.equal(rooms.handle(lobby, client(), { t: "create", kind: "person", color: 0 }).msg, "Pick a friend");
  for (let i = 0; i < 5; i++) {
    rooms.handle(lobby, client(), { t: "join", code: made.code, kind: "duck", color: i % 4 });
  }
  const extra = rooms.handle(lobby, client(), { t: "join", code: made.code, kind: "duck", color: 0 });
  assert.equal(extra.msg, "Room is full");
});

test("move, gem distance, emote, and rate limit", function () {
  const lobby = rooms.createLobby();
  const a = client();
  const made = rooms.handle(lobby, a, { t: "create", kind: "duck", color: 3 });
  const room = lobby.rooms.get(made.code);
  const player = room.players.get(made.you);
  rooms.handle(lobby, a, { t: "move", x: 0, y: 0, z: 0, yaw: 0 });
  rooms.handle(lobby, a, { t: "move", x: 80, y: 0, z: 0, yaw: 0 });
  assert.equal(player.x, 0);
  const far = rooms.handle(lobby, a, { t: "gem", id: "s1" });
  assert.equal(far, null);
  assert.equal(room.score, 0);
  player.x = 2.2;
  player.z = 1.4;
  rooms.handle(lobby, a, { t: "gem", id: "s1" });
  assert.equal(room.score, 1);
  const em = rooms.handle(lobby, a, { t: "emote", id: "wave" }, 1000);
  assert.equal(em.emote, "wave");
  const again = rooms.handle(lobby, a, { t: "emote", id: "wave" }, 1100);
  assert.equal(again, undefined);
  const bad = rooms.handle(lobby, a, { t: "emote", id: "hello" }, 2000);
  assert.equal(bad.msg, "No");
  const speedy = { bucket: [] };
  for (let i = 0; i < 40; i++) assert.equal(rooms.allow(speedy, 5000), true);
  assert.equal(rooms.allow(speedy, 5000), false);
});

test("empty room is removed and health responds", async function () {
  const app = createServer();
  await new Promise(function (resolve) { app.server.listen(0, "127.0.0.1", resolve); });
  const port = app.server.address().port;
  const health = await new Promise(function (resolve) {
    http.get({ host: "127.0.0.1", port: port, path: "/health" }, function (res) {
      let body = "";
      res.on("data", function (c) { body += c; });
      res.on("end", function () { resolve(JSON.parse(body)); });
    });
  });
  assert.equal(health.ok, true);
  const ws = new WebSocket("ws://127.0.0.1:" + port);
  const room = await new Promise(function (resolve) {
    ws.on("open", function () { ws.send(JSON.stringify({ t: "create", kind: "dino", color: 0 })); });
    ws.on("message", function (buf) { resolve(JSON.parse(String(buf))); });
  });
  assert.equal(room.players[0].name, "Green Dino");
  ws.close();
  await new Promise(function (r) { setTimeout(r, 40); });
  assert.equal(app.lobby.rooms.size, 0);
  await new Promise(function (resolve) { app.server.close(resolve); });
});

test("idle server does not keep a timer running", async function () {
  const app = createServer();
  await new Promise(function (resolve) { app.server.listen(0, "127.0.0.1", resolve); });
  await new Promise(function (resolve) { setTimeout(resolve, 30); });
  const names = process._getActiveHandles().map(function (h) {
    return h && h.constructor ? h.constructor.name : "";
  });
  assert.equal(names.indexOf("Timeout"), -1);
  await new Promise(function (resolve) { app.server.close(resolve); });
});

/* Island Friends room server.
   Listens on PORT only. No timers and no outbound calls, so Railway
   serverless sleep can shut it down when nobody is connected. */
const http = require("http");
const { WebSocketServer } = require("ws");
const rooms = require("./rooms");

function send(ws, obj) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj));
}

function createServer() {
  const lobby = rooms.createLobby();
  const server = http.createServer(function (req, res) {
    const url = (req.url || "").split("?")[0];
    if (url === "/health" || url === "/") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
      return;
    }
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: false }));
  });
  const wss = new WebSocketServer({
    server: server,
    perMessageDeflate: false,
    maxPayload: 1024
  });
  wss.on("connection", function (ws) {
    const client = { ws: ws, bucket: [], id: null, room: null };
    ws.on("message", function (data) {
      if (!rooms.allow(client)) return;
      if (String(data).length > 800) return;
      let msg;
      try { msg = JSON.parse(String(data)); } catch (e) { return; }
      const reply = rooms.handle(lobby, client, msg);
      if (reply) send(ws, reply);
    });
    ws.on("close", function () { rooms.disconnect(lobby, client); });
  });
  return { server: server, lobby: lobby };
}

function listen(port) {
  const app = createServer();
  const p = Number(port || process.env.PORT || 8787);
  app.server.listen(p);
  return app;
}

if (require.main === module) listen();

module.exports = { createServer: createServer, listen: listen };

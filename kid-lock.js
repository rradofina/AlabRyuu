/* Simple client-side door for the kids hubs. Not real security. */
(function () {
  var KEY = "alabryuu-open";
  var CODE = "1234";

  function savedOpen() {
    try { return localStorage.getItem(KEY) === "1"; } catch (e) { return false; }
  }

  if (savedOpen()) {
    document.documentElement.classList.remove("kid-locked");
    return;
  }

  var path = (location.pathname || "");
  var theme = "alab";
  if (path.indexOf("/alonzorui") === 0) theme = "alonzo";
  else if (path.indexOf("/together") === 0) theme = "together";

  var css = document.createElement("style");
  css.textContent = [
    "#kid-lock{position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;padding:18px;overflow:hidden;font-family:Trebuchet MS,Comic Sans MS,system-ui,sans-serif;touch-action:manipulation;}",
    "#kid-lock.alab{background:radial-gradient(circle at 20% 0%,#5b2cff 0%,transparent 42%),radial-gradient(circle at 90% 12%,#ff4d8d 0%,transparent 36%),#1e1b4b;color:#fff;}",
    "#kid-lock.alonzo{background:radial-gradient(circle at 12% 0%,#fdba74 0%,transparent 42%),radial-gradient(circle at 100% 8%,#86efac 0%,transparent 36%),#fff7ed;color:#7c2d12;}",
    "#kid-lock.together{background:radial-gradient(circle at 0% 0%,#7c3aed 0%,transparent 46%),radial-gradient(circle at 100% 0%,#fb923c 0%,transparent 42%),#1e1b4b;color:#fff;}",
    "#kid-lock .lock-box{width:min(100%,420px);text-align:center;}",
    "#kid-lock h1{font-size:clamp(40px,8vw,64px);margin:8px 0 0;letter-spacing:-1px;}",
    "#kid-lock .alab h1,#kid-lock.alab h1{text-shadow:0 5px 0 #3b1d8f;}",
    "#kid-lock.alonzo h1{color:#9a3412;text-shadow:0 5px 0 #fed7aa;}",
    "#kid-lock p{font-size:22px;font-weight:800;margin:6px 0 14px;opacity:.9;}",
    "#kid-lock .dots{display:flex;justify-content:center;gap:16px;margin:0 0 18px;}",
    "#kid-lock .dot{width:28px;height:28px;border-radius:50%;border:4px solid #ffd166;background:transparent;box-sizing:border-box;}",
    "#kid-lock.alonzo .dot{border-color:#fb7185;}",
    "#kid-lock .dot.on{background:#ffd166;}",
    "#kid-lock.alonzo .dot.on{background:#fb7185;}",
    "#kid-lock .dots.wiggle{animation:kid-lock-wiggle .42s ease;}",
    "@keyframes kid-lock-wiggle{0%,100%{transform:translateX(0)}20%{transform:translateX(-12px)}40%{transform:translateX(12px)}60%{transform:translateX(-7px)}80%{transform:translateX(7px)}}",
    "#kid-lock .pad{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}",
    "#kid-lock button{min-height:84px;border:0;border-radius:22px;font:900 36px Trebuchet MS,Comic Sans MS,system-ui,sans-serif;background:#ffd166;color:#3b2100;box-shadow:0 7px 0 #c98a12;cursor:pointer;-webkit-tap-highlight-color:transparent;}",
    "#kid-lock.alonzo button{background:#fb7185;color:#fff;box-shadow:0 7px 0 #e11d48;}",
    "#kid-lock.together button{background:#ffd166;color:#3b2100;box-shadow:0 7px 0 #c98a12;}",
    "#kid-lock button.back{font-size:26px;display:flex;align-items:center;justify-content:center;gap:6px;}",
    "#kid-lock button:active{transform:translateY(3px);box-shadow:0 4px 0 #c98a12;}",
    "#kid-lock.alonzo button:active{box-shadow:0 4px 0 #e11d48;}",
    "#kid-lock button:focus-visible{outline:5px solid #fff;outline-offset:3px;}",
    "#kid-lock.alonzo button:focus-visible{outline-color:#7c2d12;}",
    "@media (prefers-reduced-motion:reduce){#kid-lock .dots.wiggle{animation:none;}}"
  ].join("");
  document.head.appendChild(css);

  var digits = "";
  var shaking = false;
  var root;

  function note(freq) {
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      var ac = window._ac || new Ctx();
      window._ac = ac;
      if (ac.state === "suspended") ac.resume();
      var o = ac.createOscillator();
      var g = ac.createGain();
      o.type = "triangle";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.05, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.12);
      o.connect(g);
      g.connect(ac.destination);
      o.start();
      o.stop(ac.currentTime + 0.13);
    } catch (e) {}
  }

  function render() {
    var dots = root.querySelectorAll(".dot");
    for (var i = 0; i < dots.length; i++) dots[i].classList.toggle("on", i < digits.length);
  }

  function unlock() {
    try { localStorage.setItem(KEY, "1"); } catch (e) {}
    document.documentElement.classList.remove("kid-locked");
    document.documentElement.style.background = "";
    if (root && root.parentNode) root.parentNode.removeChild(root);
    window.removeEventListener("keydown", onKey, true);
  }

  function shake() {
    shaking = true;
    var row = root.querySelector(".dots");
    row.classList.remove("wiggle");
    void row.offsetWidth;
    row.classList.add("wiggle");
    note(196);
    setTimeout(function () {
      digits = "";
      shaking = false;
      if (root && root.parentNode) render();
    }, 420);
  }

  function press(n) {
    if (shaking || digits.length >= 4) return;
    digits += n;
    render();
    note(480 + digits.length * 36);
    if (digits.length < 4) return;
    if (digits === CODE) unlock();
    else shake();
  }

  function back() {
    if (shaking || !digits.length) return;
    digits = digits.slice(0, -1);
    render();
    note(330);
  }

  function onKey(e) {
    if (!document.documentElement.classList.contains("kid-locked")) return;
    var k = e.key;
    if (k >= "0" && k <= "9") {
      e.preventDefault();
      e.stopPropagation();
      press(k);
    } else if (k === "Backspace" || k === "Delete") {
      e.preventDefault();
      e.stopPropagation();
      back();
    }
  }

  function mount() {
    if (document.getElementById("kid-lock")) return;
    root = document.createElement("div");
    root.id = "kid-lock";
    root.className = theme;
    root.innerHTML = [
      '<div class="lock-box">',
      '<svg width="88" height="88" viewBox="0 0 88 88" aria-hidden="true">',
      '<rect x="18" y="38" width="52" height="38" rx="12" fill="#ffd166" stroke="#3b2100" stroke-width="4"/>',
      '<path d="M30 40 V28 a14 14 0 0 1 28 0 V40" fill="none" stroke="#ffd166" stroke-width="7" stroke-linecap="round"/>',
      '<circle cx="44" cy="54" r="5" fill="#3b2100"/>',
      '<path d="M44 58 v8" stroke="#3b2100" stroke-width="4" stroke-linecap="round"/>',
      '</svg>',
      '<h1>Hello</h1>',
      '<p>Tap the code</p>',
      '<div class="dots" aria-hidden="true"><i class="dot"></i><i class="dot"></i><i class="dot"></i><i class="dot"></i></div>',
      '<div class="pad">',
      keyBtn("1"), keyBtn("2"), keyBtn("3"),
      keyBtn("4"), keyBtn("5"), keyBtn("6"),
      keyBtn("7"), keyBtn("8"), keyBtn("9"),
      '<span></span>',
      keyBtn("0"),
      '<button type="button" class="back" data-key="back" aria-label="Back"><svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><path d="M18 6 L8 14 L18 22" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>Back</button>',
      '</div></div>'
    ].join("");
    document.body.appendChild(root);
    root.addEventListener("click", function (ev) {
      var btn = ev.target.closest ? ev.target.closest("button") : null;
      if (!btn || !root.contains(btn)) return;
      var key = btn.getAttribute("data-key");
      if (key === "back") back();
      else if (key) press(key);
    });
    window.addEventListener("keydown", onKey, true);
  }

  function keyBtn(n) {
    return '<button type="button" data-key="' + n + '">' + n + "</button>";
  }

  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);
})();

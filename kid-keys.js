/* Minimal keyboard → dock-button overlay. Kid-safe; no game-logic changes. */
(function () {
  var KEYS = {
    ArrowLeft: "left",
    KeyA: "left",
    ArrowRight: "right",
    KeyD: "right",
    ArrowUp: "up",
    KeyW: "up",
    Space: "up",
    ArrowDown: "down",
    KeyS: "down"
  };

  function typingTarget(el) {
    if (!el) return false;
    var tag = (el.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return true;
    if (el.isContentEditable) return true;
    return false;
  }

  function titleShowing() {
    var title = document.getElementById("title");
    if (!title) return false;
    if (title.classList.contains("off")) return false;
    var st = window.getComputedStyle(title);
    return st.display !== "none" && st.visibility !== "hidden";
  }

  function playStarted() {
    var title = document.getElementById("title");
    if (title && title.classList.contains("off")) return true;
    var go = document.getElementById("go");
    if (!go) return !titleShowing();
    var cover = go.closest ? go.closest(".cover") : null;
    if (cover && cover.classList.contains("off")) return true;
    if (!titleShowing() && !go.offsetParent) return true;
    return false;
  }

  function visible(el) {
    if (!el || !el.getClientRects) return false;
    if (!el.offsetParent && el !== document.body) {
      var st = window.getComputedStyle(el);
      if (st.display === "none" || st.visibility === "hidden") return false;
    }
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  function textOf(el) {
    return ((el && (el.id || "") + " " + (el.textContent || "")) || "").toLowerCase();
  }

  function findDockBtn(prefs) {
    var buttons = document.querySelectorAll(".dock button, #pads button, #tools button, #dock button");
    var i, b, t;
    for (i = 0; i < prefs.ids.length; i++) {
      b = document.getElementById(prefs.ids[i]);
      if (b && visible(b)) return b;
    }
    for (i = 0; i < buttons.length; i++) {
      b = buttons[i];
      if (!visible(b)) continue;
      t = textOf(b);
      for (var j = 0; j < prefs.needles.length; j++) {
        if (t.indexOf(prefs.needles[j].toLowerCase()) !== -1) return b;
      }
    }
    return null;
  }

  function clickEl(el) {
    if (!el) return false;
    try {
      el.click();
      return true;
    } catch (e) {
      return false;
    }
  }

  function canvasHalf(side) {
    var cv = document.getElementById("c");
    if (!cv || !visible(cv)) return false;
    var r = cv.getBoundingClientRect();
    var x = side === "left" ? r.left + r.width * 0.25 : r.left + r.width * 0.75;
    var y = r.top + r.height * 0.5;
    var opts = { bubbles: true, cancelable: true, clientX: x, clientY: y, view: window };
    try {
      if (typeof PointerEvent === "function") {
        cv.dispatchEvent(new PointerEvent("pointerdown", opts));
        cv.dispatchEvent(new PointerEvent("pointerup", opts));
      }
      cv.dispatchEvent(new MouseEvent("mousedown", opts));
      cv.dispatchEvent(new MouseEvent("mouseup", opts));
      cv.dispatchEvent(new MouseEvent("click", opts));
      return true;
    } catch (e) {
      return false;
    }
  }

  function act(dir) {
    var btn = null;
    if (dir === "left") {
      btn = findDockBtn({ ids: ["L"], needles: ["left", "◀️"] });
      if (clickEl(btn)) return true;
      return canvasHalf("left");
    }
    if (dir === "right") {
      btn = findDockBtn({ ids: ["R"], needles: ["right", "▶️"] });
      if (clickEl(btn)) return true;
      return canvasHalf("right");
    }
    if (dir === "up") {
      btn = findDockBtn({ ids: ["hop"], needles: ["hop", "⬆️"] });
      if (!btn) btn = findDockBtn({ ids: ["flutter"], needles: ["flutter", "🪽"] });
      return clickEl(btn);
    }
    if (dir === "down") {
      btn = findDockBtn({ ids: ["stomp"], needles: ["stomp", "💥"] });
      return clickEl(btn);
    }
    return false;
  }

  function onKey(e) {
    if (e.defaultPrevented) return;
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (typingTarget(e.target)) return;

    var code = e.code || "";
    var isGoKey = code === "Space" || code === "Enter";

    if (titleShowing()) {
      if (isGoKey) {
        var go = document.getElementById("go");
        if (go && visible(go)) {
          e.preventDefault();
          clickEl(go);
        }
      }
      return;
    }

    if (!playStarted()) return;

    var dir = KEYS[code];
    if (!dir) return;

    e.preventDefault();
    act(dir);
  }

  window.addEventListener("keydown", onKey, true);
})();

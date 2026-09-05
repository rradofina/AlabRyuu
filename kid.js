/* Shared kid pointer: CSS pixels from the canvas box, never raw device pixels. */
(function (w) {
  w.kidPt = function (e, cv) {
    var el = cv || document.getElementById("c");
    var r = el.getBoundingClientRect();
    return {
      x: (e.clientX || (e.touches && e.touches[0] && e.touches[0].clientX) || 0) - r.left,
      y: (e.clientY || (e.touches && e.touches[0] && e.touches[0].clientY) || 0) - r.top,
      w: r.width,
      h: r.height
    };
  };
  w.kidHit = function (px, py, ox, oy, r) {
    var dx = px - ox, dy = py - oy;
    return dx * dx + dy * dy <= r * r;
  };
})(window);

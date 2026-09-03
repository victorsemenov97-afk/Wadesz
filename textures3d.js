/* ============================================================================
 * Мандашня · textures3d.js
 * Pure Canvas2D texture generators for the WebGL scene (dice pips, tiles,
 * glow, blob shadow, emoji tokens, arrows). No dependencies. -> window.TEX3D
 * ==========================================================================*/
(function () {
  "use strict";
  function C(w, h) { var c = document.createElement("canvas"); c.width = w; c.height = h || w; return c; }
  function rr(o, x, y, w, h, r) { o.beginPath(); o.moveTo(x + r, y); o.arcTo(x + w, y, x + w, y + h, r); o.arcTo(x + w, y + h, x, y + h, r); o.arcTo(x, y + h, x, y, r); o.arcTo(x, y, x + w, y, r); o.closePath(); }

  var PIP = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  // Vertical atlas of 6 faces. Row order matches engine diceGeo faces:
  // +Z,-Z,+X,-X,+Y,-Y  ->  values 1,6,2,5,3,4
  var FACE_VALUE_BY_ROW = [1, 6, 2, 5, 3, 4];
  function diceAtlas(face, pip) {
    face = face || "#f7f3ea"; pip = pip || "#12243d";
    var s = 256, cv = C(s, s * 6), o = cv.getContext("2d");
    for (var row = 0; row < 6; row++) {
      var oy = row * s, val = FACE_VALUE_BY_ROW[row];
      var g = o.createLinearGradient(0, oy, s, oy + s);
      g.addColorStop(0, "#ffffff"); g.addColorStop(0.5, face); g.addColorStop(1, "#e2d9c6");
      o.fillStyle = g; o.fillRect(0, oy, s, s);
      o.strokeStyle = "rgba(0,0,0,0.12)"; o.lineWidth = 6; o.strokeRect(6, oy + 6, s - 12, s - 12);
      // soft inner vignette for a rounded feel
      var rg = o.createRadialGradient(s * 0.5, oy + s * 0.42, s * 0.1, s * 0.5, oy + s * 0.5, s * 0.72);
      rg.addColorStop(0, "rgba(255,255,255,0.35)"); rg.addColorStop(1, "rgba(0,0,0,0.10)");
      o.fillStyle = rg; o.fillRect(0, oy, s, s);
      var cells = PIP[val], pad = s * 0.22, gap = (s - pad * 2) / 2, rad = s * 0.088;
      o.fillStyle = pip;
      for (var i = 0; i < cells.length; i++) {
        var k = cells[i], cx = pad + (k % 3) * gap, cy = oy + pad + Math.floor(k / 3) * gap;
        o.beginPath(); o.arc(cx, cy, rad, 0, 7); o.fill();
        o.save(); o.globalAlpha = 0.25; o.beginPath(); o.arc(cx - rad * 0.3, cy - rad * 0.3, rad * 0.5, 0, 7); o.fillStyle = "#fff"; o.fill(); o.restore();
        o.fillStyle = pip;
      }
    }
    return cv;
  }
  // Rounded glossy tile (white, tinted at draw time via uColor).
  function tile(border) {
    var s = 128, cv = C(s), o = cv.getContext("2d");
    o.clearRect(0, 0, s, s);
    rr(o, 8, 8, s - 16, s - 16, 26);
    var g = o.createLinearGradient(0, 8, 0, s - 8);
    g.addColorStop(0, "#ffffff"); g.addColorStop(0.55, "#f0f0f0"); g.addColorStop(1, "#cfcfcf");
    o.fillStyle = g; o.fill();
    o.lineWidth = 6; o.strokeStyle = border || "rgba(0,0,0,0.18)"; o.stroke();
    // top gloss
    rr(o, 16, 14, s - 32, (s - 16) * 0.42, 20); o.fillStyle = "rgba(255,255,255,0.5)"; o.fill();
    return cv;
  }
  // Soft round blob shadow.
  function blob() {
    var s = 128, cv = C(s), o = cv.getContext("2d");
    var g = o.createRadialGradient(s / 2, s / 2, 2, s / 2, s / 2, s / 2);
    g.addColorStop(0, "rgba(0,0,0,0.55)"); g.addColorStop(0.6, "rgba(0,0,0,0.32)"); g.addColorStop(1, "rgba(0,0,0,0)");
    o.fillStyle = g; o.beginPath(); o.arc(s / 2, s / 2, s / 2, 0, 7); o.fill();
    return cv;
  }
  // Soft radial glow (tinted via uColor).
  function glow() {
    var s = 128, cv = C(s), o = cv.getContext("2d");
    var g = o.createRadialGradient(s / 2, s / 2, 2, s / 2, s / 2, s / 2);
    g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.45, "rgba(255,255,255,0.55)"); g.addColorStop(1, "rgba(255,255,255,0)");
    o.fillStyle = g; o.fillRect(0, 0, s, s);
    return cv;
  }
  // Ring stroke (for entry cells / base slots), tinted via uColor.
  function ring(lw) {
    var s = 128, cv = C(s), o = cv.getContext("2d");
    o.clearRect(0, 0, s, s); o.strokeStyle = "#fff"; o.lineWidth = lw || 12;
    o.beginPath(); o.arc(s / 2, s / 2, s / 2 - (lw || 12), 0, 7); o.stroke();
    return cv;
  }
  // Filled soft disc (base slot pad), white.
  function disc() {
    var s = 128, cv = C(s), o = cv.getContext("2d");
    var g = o.createRadialGradient(s / 2, s * 0.4, 4, s / 2, s / 2, s / 2);
    g.addColorStop(0, "rgba(255,255,255,0.95)"); g.addColorStop(1, "rgba(255,255,255,0.55)");
    o.fillStyle = g; o.beginPath(); o.arc(s / 2, s / 2, s / 2 - 6, 0, 7); o.fill();
    return cv;
  }
  // Emoji token: rounded coin with an emoji/char centered. good=gold, trap=red.
  function emoji(ch, kind) {
    var s = 160, cv = C(s), o = cv.getContext("2d");
    o.clearRect(0, 0, s, s);
    var edge = kind === "trap" ? "#e0524c" : (kind === "block" ? "#f0872b" : "#f0b02b");
    var mid = kind === "trap" ? "#7a1f1c" : (kind === "block" ? "#8a4a12" : "#8a5f12");
    var g = o.createRadialGradient(s / 2, s * 0.38, 6, s / 2, s / 2, s / 2);
    g.addColorStop(0, "#fff7e0"); g.addColorStop(0.5, edge); g.addColorStop(1, mid);
    o.beginPath(); o.arc(s / 2, s / 2, s / 2 - 8, 0, 7); o.fillStyle = g; o.fill();
    o.lineWidth = 8; o.strokeStyle = "rgba(255,255,255,0.8)"; o.stroke();
    o.font = (s * 0.5) + "px system-ui,-apple-system,\"Noto Color Emoji\",sans-serif";
    o.textAlign = "center"; o.textBaseline = "middle";
    o.fillText(ch || "?", s / 2, s * 0.54);
    return cv;
  }
  // Directional chevron arrow (into home), tinted via uColor. Points "up".
  function arrow() {
    var s = 128, cv = C(s), o = cv.getContext("2d");
    o.clearRect(0, 0, s, s);
    o.fillStyle = "#fff"; o.strokeStyle = "#fff"; o.lineJoin = "round"; o.lineCap = "round";
    o.lineWidth = 20;
    o.beginPath(); o.moveTo(s * 0.5, s * 0.2); o.lineTo(s * 0.5, s * 0.8); o.stroke();
    o.beginPath(); o.moveTo(s * 0.5, s * 0.16); o.lineTo(s * 0.24, s * 0.46); o.lineTo(s * 0.76, s * 0.46); o.closePath(); o.fill();
    return cv;
  }
  // Procedural felt/wood board top if the jpg is missing. tone: 'wood'|'felt'
  function boardTop(tone) {
    var s = 512, cv = C(s), o = cv.getContext("2d");
    if (tone === "felt") {
      o.fillStyle = "#0f2a44"; o.fillRect(0, 0, s, s);
      for (var i = 0; i < 9000; i++) { o.fillStyle = "rgba(255,255,255," + (Math.random() * 0.03) + ")"; o.fillRect(Math.random() * s, Math.random() * s, 1.5, 1.5); }
    } else {
      var g = o.createLinearGradient(0, 0, s, s); g.addColorStop(0, "#caa05a"); g.addColorStop(0.5, "#b6842f"); g.addColorStop(1, "#9a6d28");
      o.fillStyle = g; o.fillRect(0, 0, s, s);
      for (var y = 0; y < s; y += 3) { o.strokeStyle = "rgba(70,42,16," + (0.05 + Math.random() * 0.05) + ")"; o.beginPath(); o.moveTo(0, y); for (var x = 0; x <= s; x += 16) o.lineTo(x, y + Math.sin(x * 0.03 + y * 0.2) * 2.0); o.stroke(); }
    }
    return cv;
  }
  // Radial vignette overlay (dark edges) for the sky background canvas.
  function sky(topHex, botHex) {
    var w = 512, h = 512, cv = C(w, h), o = cv.getContext("2d");
    var g = o.createLinearGradient(0, 0, 0, h); g.addColorStop(0, topHex || "#0a1830"); g.addColorStop(1, botHex || "#04070f");
    o.fillStyle = g; o.fillRect(0, 0, w, h);
    var rg = o.createRadialGradient(w / 2, h * 0.42, 20, w / 2, h * 0.5, h * 0.75);
    rg.addColorStop(0, "rgba(90,140,220,0.22)"); rg.addColorStop(1, "rgba(0,0,0,0)");
    o.fillStyle = rg; o.fillRect(0, 0, w, h);
    for (var i = 0; i < 220; i++) { var a = Math.random() * 0.6; o.fillStyle = "rgba(255,255,255," + a + ")"; var r = Math.random() * 1.4; o.beginPath(); o.arc(Math.random() * w, Math.random() * h * 0.7, r, 0, 7); o.fill(); }
    return cv;
  }

  window.TEX3D = { diceAtlas: diceAtlas, tile: tile, blob: blob, glow: glow, ring: ring, disc: disc, emoji: emoji, arrow: arrow, boardTop: boardTop, sky: sky, FACE_VALUE_BY_ROW: FACE_VALUE_BY_ROW, PIP: PIP };
})();

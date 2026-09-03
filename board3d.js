/* ============================================================================
 * Мандашня · board3d.js
 * Generic 3D board renderer built on top of window.GLB (engine3d.js) and
 * window.TEX3D (textures3d.js). It reads ALL live game state through an
 * adapter object (`api`) of getter closures supplied by game.js, so it stays
 * fully decoupled from the game's internal scope.  ->  window.Board3D
 * ==========================================================================*/
(function () {
  "use strict";

  var R = null, api = null, M = null;
  var TILE = 1.0, TOP = 0.16, half = 9;
  var N = 19, L = 6, W = 7, C = 9, HOME_LEN = 4;

  var tex = {}, pawnTex = {}, bonusTex = {}, digitTex = {}, medalTex = {};
  var woodTex = null, woodIsPhoto = false;
  var staticOps = null, staticWoodPhoto = false;
  var scratch = null;

  var DICE = { value: 1, active: false, t0: 0, dur: 600, ax: 0, ay: 0, az: 0,
               vax: 0, vay: 0, vaz: 0, yaw: 0.5, onDone: null };

  var FUP = { 1: [-Math.PI / 2, 0, 0], 2: [0, 0, Math.PI / 2], 3: [0, 0, 0],
              4: [Math.PI, 0, 0], 5: [0, 0, -Math.PI / 2], 6: [Math.PI / 2, 0, 0] };

  /* ----------------------------- small helpers ---------------------------- */
  function hexRGB(h) {
    h = h || "#ffffff"; if (h[0] === "#") h = h.slice(1);
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16) || 0;
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }
  function lighten(rgb, t) { return [rgb[0] + (1 - rgb[0]) * t, rgb[1] + (1 - rgb[1]) * t, rgb[2] + (1 - rgb[2]) * t]; }
  function darken(rgb, t) { return [rgb[0] * (1 - t), rgb[1] * (1 - t), rgb[2] * (1 - t)]; }
  function W3(r, c) { return [(c - half) * TILE, TOP, (r - half) * TILE]; }
  function now() { return (typeof performance !== "undefined" ? performance.now() : Date.now()); }
  function T(canvas, o) { try { return R.makeTexture(canvas, o); } catch (e) { return null; } }

  // Flat textured quad lying on the board (XZ plane).
  function flat(texture, x, z, size, color, alpha, blend, y, rotY) {
    var m = scratch;
    M.fromTRS(m, x, (y === undefined ? TOP + 0.02 : y), z, 0, rotY || 0, 0, size, 1, size);
    R.draw(R.geo.quad, m, { tex: texture, color: [color[0], color[1], color[2], alpha === undefined ? 1 : alpha],
      ambient: 1.0, blend: blend || "alpha", depthWrite: false, cull: false, alphaTest: 0 });
  }

  /* ------------------------------- textures ------------------------------- */
  function ensureTextures() {
    if (tex._done) return;
    tex.tile = T(TEX3D.tile());
    tex.blob = T(TEX3D.blob());
    tex.glow = T(TEX3D.glow());
    tex.ring = T(TEX3D.ring(13));
    tex.disc = T(TEX3D.disc());
    tex.arrow = T(TEX3D.arrow());
    tex.dice = T(TEX3D.diceAtlas("#f7f3ea", "#12243d"));
    tex.teleport = T(TEX3D.emoji("\u27f3", "block"));
    tex.frost = T(TEX3D.emoji("\u2744\ufe0f", "good"));
    tex.shield = T(TEX3D.emoji("\ud83d\udee1\ufe0f", "good"));
    tex.goal = T(goalTex());
    tex._done = true;
  }
  function bonusTexFor(icon, kind) {
    var k = icon || "?"; if (bonusTex[k]) return bonusTex[k];
    bonusTex[k] = T(TEX3D.emoji(icon, kind || "good")); return bonusTex[k];
  }
  function digitTexFor(d) {
    if (digitTex[d]) return digitTex[d];
    digitTex[d] = T(TEX3D.emoji(String(d), "good")); return digitTex[d];
  }
  function medalTexFor(dir, icon) {
    var k = dir + "|" + icon; if (medalTex[k]) return medalTex[k];
    medalTex[k] = T(TEX3D.emoji(icon, "good")); return medalTex[k];
  }
  function ensureWood() {
    if (woodTex && (woodIsPhoto || !photoWoodAvailable())) return woodTex;
    if (photoWoodAvailable()) {
      var IMG = api.IMG();
      try { woodTex = R.makeTexture(IMG["wood_dark"]); woodIsPhoto = true; return woodTex; } catch (e) {}
    }
    if (!woodTex) { woodTex = T(TEX3D.boardTop("wood")); woodIsPhoto = false; }
    return woodTex;
  }
  function photoWoodAvailable() {
    try {
      var IMG = api.IMG(), RDY = api.IMG_READY();
      return !!(IMG && RDY && RDY["wood_dark"] && IMG["wood_dark"] && IMG["wood_dark"].complete && IMG["wood_dark"].naturalWidth);
    } catch (e) { return false; }
  }
  function pawnTexFor(dir) {
    var COLOR = api.COLOR, key = COLOR[dir].key;
    if (pawnTex[key]) return pawnTex[key];
    try {
      var IMG = api.IMG(), RDY = api.IMG_READY(), im = IMG && IMG["pawn_" + key];
      if (im && RDY["pawn_" + key] && im.complete && im.naturalWidth) { pawnTex[key] = R.makeTexture(im); return pawnTex[key]; }
    } catch (e) {}
    return null;
  }

  function goalTex() {
    var s = 256, cv = document.createElement("canvas"); cv.width = cv.height = s;
    var o = cv.getContext("2d"), COLOR = api.COLOR;
    var cols = [hexHex(COLOR.top.hex), hexHex(COLOR.right.hex), hexHex(COLOR.bottom.hex), hexHex(COLOR.left.hex)];
    var cx = s / 2, cy = s / 2, a0 = -Math.PI / 4;
    for (var i = 0; i < 4; i++) {
      o.beginPath(); o.moveTo(cx, cy);
      o.arc(cx, cy, s * 0.47, a0 + i * Math.PI / 2, a0 + (i + 1) * Math.PI / 2); o.closePath();
      o.fillStyle = cols[i]; o.fill();
    }
    o.globalAlpha = 0.18; o.fillStyle = "#fff";
    o.beginPath(); o.arc(cx, cy, s * 0.47, 0, 7); o.fill(); o.globalAlpha = 1;
    o.beginPath(); o.arc(cx, cy, s * 0.22, 0, 7); o.fillStyle = "rgba(9,13,24,0.9)"; o.fill();
    o.lineWidth = 6; o.strokeStyle = "rgba(255,255,255,0.5)"; o.stroke();
    o.font = (s * 0.26) + "px system-ui,-apple-system,'Noto Color Emoji',sans-serif";
    o.textAlign = "center"; o.textBaseline = "middle"; o.fillText("\ud83c\udfc6", cx, cy + 2);
    return cv;
  }
  function hexHex(h) { return h; }

  /* ------------------------------ static board ---------------------------- */
  function ringIndexOf(r, c) {
    var ring = api.BOARD.ring;
    for (var i = 0; i < ring.length; i++) if (ring[i][0] === r && ring[i][1] === c) return i;
    return -1;
  }
  function entryCellSet() {
    var s = {}, e = api.BOARD.entryIdx, ring = api.BOARD.ring;
    api.DIRS.forEach(function (d) { var idx = e[d]; if (idx >= 0) { var cell = ring[idx]; s[cell[0] + "," + cell[1]] = d; } });
    return s;
  }
  function cornerCellSet() {
    var s = {}, cc = api.CORNER_CELLS;
    Object.keys(cc).forEach(function (k) { s[cc[k][0] + "," + cc[k][1]] = k; });
    return s;
  }
  function centroid(cells) {
    var r = 0, c = 0; cells.forEach(function (x) { r += x[0]; c += x[1]; });
    return [r / cells.length, c / cells.length];
  }

  function buildStatic() {
    staticOps = [];
    var COLOR = api.COLOR, DIRS = api.DIRS, BOARD = api.BOARD, BASE = api.BASE_SLOTS;
    var wood = ensureWood(); staticWoodPhoto = woodIsPhoto;
    var bw = (N + 0.8) * TILE, th = 1.5;

    // rim (dark) + wooden base
    pushBox(0, -th / 2 - 0.16, 0, bw + 0.7, th, bw + 0.7, { color: [0.12, 0.08, 0.05, 1], ambient: 0.45, shininess: 6 });
    pushBox(0, -th / 2, 0, bw, th, bw, { tex: wood, color: [1, 1, 1, 1], ambient: 0.5, shininess: 10 });

    // corner home yards (one per dir, colored by that dir)
    DIRS.forEach(function (d) {
      var ctr = centroid(BASE[d]);
      var col = hexRGB(COLOR[d].hex);
      // big soft pad
      var m1 = M.create(); var p = W3(ctr[0], ctr[1]);
      M.fromTRS(m1, p[0], TOP + 0.005, p[2], 0, 0, 0, (L - 0.4) * TILE, 1, (L - 0.4) * TILE);
      staticOps.push({ mesh: R.geo.quad, model: m1, opts: { tex: tex.tile, color: [col[0], col[1], col[2], 1], ambient: 0.7, blend: "alpha", depthWrite: true, cull: false } });
      // inner lighter square
      var m2 = M.create();
      M.fromTRS(m2, p[0], TOP + 0.012, p[2], 0, 0, 0, (L - 2.1) * TILE, 1, (L - 2.1) * TILE);
      var lc = lighten(col, 0.55);
      staticOps.push({ mesh: R.geo.quad, model: m2, opts: { tex: tex.tile, color: [lc[0], lc[1], lc[2], 1], ambient: 0.85, blend: "alpha", depthWrite: false, cull: false } });
      // base slot discs
      BASE[d].forEach(function (slot) {
        var sp = W3(slot[0], slot[1]); var mm = M.create();
        M.fromTRS(mm, sp[0], TOP + 0.02, sp[2], 0, 0, 0, 0.92 * TILE, 1, 0.92 * TILE);
        staticOps.push({ mesh: R.geo.quad, model: mm, opts: { tex: tex.disc, color: [col[0], col[1], col[2], 1], ambient: 0.9, blend: "alpha", depthWrite: false, cull: false } });
      });
    });

    // ring path tiles
    var entries = entryCellSet(), corners = cornerCellSet();
    BOARD.ring.forEach(function (cell, idx) {
      var r = cell[0], c = cell[1], key = r + "," + c;
      var p = W3(r, c);
      if (corners[key]) {
        // teleport pad
        pushTile(r, c, [0.14, 0.11, 0.2], 0.94, 0.9);
        var mt = M.create();
        M.fromTRS(mt, p[0], TOP + 0.04, p[2], 0, 0, 0, 0.8 * TILE, 1, 0.8 * TILE);
        staticOps.push({ mesh: R.geo.quad, model: mt, opts: { tex: tex.teleport, color: [1, 1, 1, 1], ambient: 1, blend: "alpha", depthWrite: false, cull: false } });
      } else if (entries[key]) {
        var col = lighten(hexRGB(COLOR[entries[key]].hex), 0.25);
        pushTile(r, c, col, 0.94, 0.95);
        // arrow pointing to next ring cell (travel direction)
        var nc = BOARD.ring[(idx + 1) % BOARD.ring.length];
        var ang = Math.atan2((nc[1] - c), -(nc[0] - r));
        var ma = M.create();
        M.fromTRS(ma, p[0], TOP + 0.05, p[2], 0, ang, 0, 0.62 * TILE, 1, 0.62 * TILE);
        staticOps.push({ mesh: R.geo.quad, model: ma, opts: { tex: tex.arrow, color: [1, 1, 1, 0.95], ambient: 1, blend: "add", depthWrite: false, cull: false } });
      } else {
        pushTile(r, c, [0.97, 0.97, 0.99], 0.9, 0.9);
      }
    });

    // home stretch tiles (tinted per dir) + finish star on last cell
    DIRS.forEach(function (d) {
      var hs = BOARD.homeStretches[d], col = hexRGB(COLOR[d].hex);
      hs.forEach(function (cell, i) {
        var lc = lighten(col, 0.12 + i * 0.05);
        pushTile(cell[0], cell[1], lc, 0.9, 0.92);
      });
    });

    // center emblem
    var pc = W3(C, C); var mc = M.create();
    M.fromTRS(mc, pc[0], TOP + 0.02, pc[2], 0, 0, 0, 4.6 * TILE, 1, 4.6 * TILE);
    staticOps.push({ mesh: R.geo.quad, model: mc, opts: { tex: tex.goal, color: [1, 1, 1, 1], ambient: 0.9, blend: "alpha", depthWrite: false, cull: false } });
  }

  function pushBox(x, y, z, sx, sy, sz, opts) {
    var m = M.create(); M.fromTRS(m, x, y, z, 0, 0, 0, sx, sy, sz);
    staticOps.push({ mesh: R.geo.box, model: m, opts: opts });
  }
  function pushTile(r, c, rgb, size, ambient) {
    var p = W3(r, c), m = M.create();
    M.fromTRS(m, p[0], TOP + 0.03, p[2], 0, 0, 0, size * TILE, 1, size * TILE);
    staticOps.push({ mesh: R.geo.quad, model: m, opts: { tex: tex.tile, color: [rgb[0], rgb[1], rgb[2], 1], ambient: ambient || 0.85, shininess: 12, blend: "alpha", depthWrite: true, cull: false } });
  }

  /* ------------------------------- camera --------------------------------- */
  function setupCam() {
    var span = N * TILE;
    var eye = [0, span * 1.06, span * 1.0];
    var center = [0, 0, span * 0.03];
    R.setCamera(eye, center, [0, 1, 0], 40, 0.5, 400);
    R.setLight(0.35, 1.0, 0.5);
  }

  /* ------------------------------- pieces --------------------------------- */
  function drawPieces(t) {
    var players = api.players(); if (!players) return;
    var anim = api.animState();
    var COLOR = api.COLOR;
    var sel = api.selectedPiece(), movable = api.movablePieces() || [];
    var moverP = null; try { moverP = api.mover(); } catch (e) {}
    var crazy = false; try { crazy = api.isCrazy(); } catch (e) {}
    var pulse = 0.5 + 0.5 * Math.sin(t * 0.006);

    for (var pi = 0; pi < players.length; pi++) {
      var p = players[pi]; if (!p || !p.pieces) continue;
      var dir = p.dir, col = hexRGB(api.pieceColorFor(dir).hex);
      for (var i = 0; i < p.pieces.length; i++) {
        var pc = p.pieces[i];
        var cell = api.pieceCell(p, i); if (!cell) continue;
        var wx, wz, wy = TOP, scale = 1;
        if (anim && anim.playerIdx === pi && anim.pieceIdx === i && anim.cells) {
          var tt = Math.min(1, (t - anim.segStart) / anim.segDur);
          var a = anim.cells[anim.idx] || cell, b = anim.cells[anim.idx + 1] || a;
          var wa = W3(a[0], a[1]), wb = W3(b[0], b[1]);
          wx = wa[0] + (wb[0] - wa[0]) * tt; wz = wa[2] + (wb[2] - wa[2]) * tt;
          if (anim.kind === "teleport") { scale = Math.max(0.05, tt < 0.5 ? 1 - tt * 1.7 : (tt - 0.5) * 1.7); }
          else { wy = TOP + Math.sin(Math.PI * tt) * 0.55 * TILE; }
        } else { var w = W3(cell[0], cell[1]); wx = w[0]; wz = w[2]; }

        // shadow
        R.groundBlob(wx, wz, 0.46 * TILE * scale, 0.33, tex.blob, TOP + 0.015);

        // highlight rings under the piece
        var isMover = (moverP && p === moverP);
        var isMovable = isMover && movable.indexOf(i) >= 0;
        var isSel = isMover && sel === i;
        if (crazy) flat(tex.glow, wx, wz, 1.5 * TILE, [0.7, 0.3, 1.0], 0.28 + 0.15 * pulse, "add", TOP + 0.02);
        if (isMovable) flat(tex.glow, wx, wz, 1.7 * TILE, [0.4, 1.0, 0.55], 0.35 + 0.28 * pulse, "add", TOP + 0.025);
        if (isSel) flat(tex.ring, wx, wz, 1.5 * TILE, [1, 1, 1], 0.85, "add", TOP + 0.03);

        // shield ring
        var shieldLeft = 0; try { shieldLeft = api.shieldSecondsLeft(pc) || 0; } catch (e) {}
        if (shieldLeft > 0) flat(tex.ring, wx, wz, 1.35 * TILE, [0.4, 0.85, 1.0], 0.6 + 0.3 * pulse, "add", TOP + 0.035);

        // the pawn
        var pw = pawnTexFor(dir);
        var frozen = pc && pc.frozen > 0;
        var tint = frozen ? [0.6, 0.8, 1.0, 1] : [1, 1, 1, 1];
        if (pw) {
          R.sprite([wx, wy, wz], { tex: pw, color: tint, w: 1.15 * TILE * scale, h: 1.55 * TILE * scale, anchorBottom: true, upright: true, alphaTest: 0.4 });
        } else {
          drawFallbackPawn(dir, wx, wy, wz, scale, col);
        }

        // badges above the pawn
        if (frozen) R.sprite([wx, wy + 1.2 * TILE * scale, wz], { tex: tex.frost, w: 0.8 * TILE, h: 0.8 * TILE, upright: true, blend: "alpha", depthWrite: false, alphaTest: 0 });
        if (shieldLeft > 0) R.sprite([wx, wy + 1.35 * TILE * scale, wz], { tex: tex.shield, w: 0.7 * TILE, h: 0.7 * TILE, upright: true, blend: "alpha", depthWrite: false, alphaTest: 0 });
      }
    }
  }
  function drawFallbackPawn(dir, wx, wy, wz, scale, col) {
    var h = 1.15 * TILE * scale, rad = 0.4 * TILE * scale, m = scratch;
    M.fromTRS(m, wx, wy + h * 0.42, wz, 0, 0, 0, rad * 2, h, rad * 2);
    R.draw(R.geo.cyl, m, { color: [col[0], col[1], col[2], 1], ambient: 0.5, shininess: 16 });
    var m2 = M.create();
    M.fromTRS(m2, wx, wy + h + rad * 0.4, wz, 0, 0, 0, rad * 1.5, rad * 1.5, rad * 1.5);
    R.draw(R.geo.cyl, m2, { color: [lighten(col, 0.1)[0], lighten(col, 0.1)[1], lighten(col, 0.1)[2], 1], ambient: 0.6, shininess: 24 });
  }

  /* ------------------------- yard avatar medallions ----------------------- */
  function drawMedallions(t) {
    var players = api.players(); if (!players) return;
    var COLOR = api.COLOR, BASE = api.BASE_SLOTS;
    var moverP = null; try { moverP = api.mover(); } catch (e) {}
    for (var pi = 0; pi < players.length; pi++) {
      var p = players[pi]; if (!p) continue;
      var dir = p.dir, ctr = centroid(BASE[dir]), wpos = W3(ctr[0], ctr[1]);
      var icon = COLOR[dir].icon;
      try { if (!p.isAI) icon = api.profAvatar() || icon; else if (p.persona && p.persona.icon) icon = p.persona.icon; } catch (e) {}
      var isTurn = moverP && p === moverP;
      var lift = isTurn ? 1.15 + 0.08 * Math.sin(t * 0.006) : 1.0;
      R.sprite([wpos[0], TOP + lift, wpos[2]], { tex: medalTexFor(dir, icon), w: 1.25 * TILE, h: 1.25 * TILE, upright: true, blend: "alpha", depthWrite: false, alphaTest: 0 });
      if (isTurn) flat(tex.glow, wpos[0], wpos[2], 2.4 * TILE, hexRGB(COLOR[dir].hex), 0.4, "add", TOP + 0.04);
    }
  }

  /* ------------------------------- bonuses -------------------------------- */
  function drawBonuses(t) {
    var bonuses = api.bonuses ? api.bonuses() : null;
    if (bonuses) for (var i = 0; i < bonuses.length; i++) {
      var b = bonuses[i]; if (!b || !b.cell) continue;
      var w = W3(b.cell[0], b.cell[1]);
      var bob = 0.35 + 0.08 * Math.sin(t * 0.004 + i);
      var kind = b.type && b.type.kind, icon = b.type && b.type.icon;
      flat(tex.glow, w[0], w[2], 1.3 * TILE, kind === "trap" ? [1, 0.4, 0.3] : [1, 0.85, 0.3], 0.4, "add", TOP + 0.03);
      R.sprite([w[0], TOP + bob, w[2]], { tex: bonusTexFor(icon, kind), w: 0.85 * TILE, h: 0.85 * TILE, upright: true, blend: "alpha", depthWrite: false, alphaTest: 0 });
    }
    var blockades = api.blockades ? api.blockades() : null;
    if (blockades) for (var j = 0; j < blockades.length; j++) {
      var bl = blockades[j]; if (!bl || !bl.cell) continue;
      var wb = W3(bl.cell[0], bl.cell[1]);
      R.sprite([wb[0], TOP + 0.4, wb[2]], { tex: bonusTexFor("\ud83d\udea7", "block"), w: 0.95 * TILE, h: 0.95 * TILE, upright: true, blend: "alpha", depthWrite: false, alphaTest: 0 });
    }
  }

  /* ------------------------------- targets -------------------------------- */
  function drawTargets(t) {
    var vt = api.validTargets(); if (!vt || !vt.length) return;
    var physical = false; try { physical = api.gameMode() === "physical"; } catch (e) {}
    var pulse = 0.5 + 0.5 * Math.sin(t * 0.008);
    for (var i = 0; i < vt.length; i++) {
      var tg = vt[i]; var cell = tg && tg.cell; if (!cell) continue;
      var w = W3(cell[0], cell[1]);
      flat(tex.ring, w[0], w[2], 1.0 * TILE + 0.15 * pulse, [0.5, 1.0, 0.7], 0.55 + 0.3 * pulse, "add", TOP + 0.05);
      if (physical && tg.d) {
        R.sprite([w[0], TOP + 0.55, w[2]], { tex: digitTexFor(tg.d), w: 0.7 * TILE, h: 0.7 * TILE, upright: true, blend: "alpha", depthWrite: false, alphaTest: 0 });
      }
    }
  }

  /* ---------------------------------- dice -------------------------------- */
  function faceRot(V, yaw) {
    var fu = M.create(), e = FUP[V] || FUP[1];
    M.fromTRS(fu, 0, 0, 0, e[0], e[1], e[2], 1, 1, 1);
    var ry = M.create(); M.fromTRS(ry, 0, 0, 0, 0, yaw || 0, 0, 1, 1, 1);
    var out = M.create(); M.mul(out, ry, fu); return out;
  }
  function drawDice(t) {
    var sz = 1.8 * TILE, restY = TOP + sz * 0.5, x = 0, z = 0, y = restY;
    var model = M.create();
    if (DICE.active) {
      var k = (t - DICE.t0) / DICE.dur;
      if (k >= 1) {
        DICE.active = false;
        if (DICE.onDone) { var f = DICE.onDone; DICE.onDone = null; try { f(); } catch (e) {} }
      } else {
        var decay = 1 - k;
        DICE.ax += DICE.vax * decay * 0.016; DICE.ay += DICE.vay * decay * 0.016; DICE.az += DICE.vaz * decay * 0.016;
        y = restY + Math.abs(Math.sin(k * Math.PI * 3)) * 1.7 * TILE * (1 - k * 0.55);
        M.fromTRS(model, x, y, z, DICE.ax, DICE.ay, DICE.az, sz, sz, sz);
        R.draw(R.geo.dice, model, { tex: tex.dice, ambient: 0.5, shininess: 26 });
        return;
      }
    }
    var fr = faceRot(DICE.value, DICE.yaw);
    model[0] = fr[0] * sz; model[1] = fr[1] * sz; model[2] = fr[2] * sz; model[3] = 0;
    model[4] = fr[4] * sz; model[5] = fr[5] * sz; model[6] = fr[6] * sz; model[7] = 0;
    model[8] = fr[8] * sz; model[9] = fr[9] * sz; model[10] = fr[10] * sz; model[11] = 0;
    model[12] = x; model[13] = restY; model[14] = z; model[15] = 1;
    R.draw(R.geo.dice, model, { tex: tex.dice, ambient: 0.55, shininess: 26 });
    // resting glow
    flat(tex.glow, x, z, 2.6 * TILE, [1, 0.95, 0.8], 0.22, "add", TOP + 0.05);
  }

  /* -------------------------------- effects ------------------------------- */
  function pxToWorld(X, Y) {
    var cs = 1; try { cs = api.cellSize() || 1; } catch (e) {}
    var c = X / cs - 0.5, r = Y / cs - 0.5;
    return [(c - half) * TILE, TOP, (r - half) * TILE];
  }
  function cc(hex, a) { var r = hexRGB(hex); return [r[0], r[1], r[2], a]; }
  function drawEffects(t) {
    var parts = null, shocks = null, trails = null, emotes = null;
    try { parts = api.particles(); } catch (e) {}
    try { shocks = api.shocks(); } catch (e) {}
    try { trails = api.trails(); } catch (e) {}
    try { emotes = api.emotes(); } catch (e) {}
    var cs = 1; try { cs = api.cellSize() || 1; } catch (e) {}
    if (trails) for (var i = trails.length - 1; i >= 0; i--) {
      var tr = trails[i], k = (t - tr.start) / 520; if (k >= 1) { trails.splice(i, 1); continue; }
      var w = pxToWorld(tr.x, tr.y);
      flat(tex.glow, w[0], w[2], (tr.r / cs) * TILE * 3 * (1 - k * 0.5), cc(tr.col, 0.4 * (1 - k)).slice(0, 3), 0.4 * (1 - k), "add", TOP + 0.05);
    }
    if (shocks) for (var s = shocks.length - 1; s >= 0; s--) {
      var sh = shocks[s], sk = (t - sh.start) / 540; if (sk < 0) continue; if (sk >= 1) { shocks.splice(s, 1); continue; }
      var ws = pxToWorld(sh.x, sh.y);
      flat(tex.ring, ws[0], ws[2], (0.4 + sk * 3.4) * TILE, cc(sh.col, 1).slice(0, 3), Math.max(0, 1 - sk), "add", TOP + 0.06);
    }
    if (parts) for (var p = parts.length - 1; p >= 0; p--) {
      var pt = parts[p], age = t - pt.start; if (age >= pt.life) { parts.splice(p, 1); continue; }
      var pk = age / pt.life;
      var wp = pxToWorld(pt.x + pt.vx * age * 0.85, pt.y + pt.vy * age * 0.85);
      wp[1] = TOP + 0.2 + pk * 0.9;
      var szp = (pt.r / cs) * TILE * 3.2 * (1 - pk * 0.6);
      R.sprite(wp, { tex: tex.glow, color: cc(pt.col, Math.max(0, 1 - pk)), w: szp, h: szp, blend: "add", depthWrite: false, alphaTest: 0 });
    }
    if (emotes) for (var e2 = emotes.length - 1; e2 >= 0; e2--) {
      var em = emotes[e2], ek = (t - em.start) / 1500; if (ek >= 1) { emotes.splice(e2, 1); continue; }
      var we = pxToWorld(em.x, em.y); we[1] = TOP + 1.5 + ek * 1.2;
      R.sprite(we, { tex: bonusTexFor(em.emoji, "good"), color: [1, 1, 1, Math.max(0, 1 - ek)], w: 1.0 * TILE, h: 1.0 * TILE, upright: true, blend: "alpha", depthWrite: false, alphaTest: 0 });
    }
  }

  /* -------------------------------- render -------------------------------- */
  function render() {
    if (!R || !api) return;
    ensureTextures();
    if (!scratch) scratch = M.create();
    if (!staticOps || (!staticWoodPhoto && photoWoodAvailable())) { woodTex = null; woodIsPhoto = false; buildStatic(); }
    var t = now();
    setupCam();
    R.begin(0.05, 0.07, 0.12, 0);
    for (var i = 0; i < staticOps.length; i++) R.draw(staticOps[i].mesh, staticOps[i].model, staticOps[i].opts);
    drawBonuses(t);
    drawTargets(t);
    drawPieces(t);
    drawMedallions(t);
    drawDice(t);
    drawEffects(t);
  }

  /* ------------------------------ interaction ----------------------------- */
  function screenForCell(r, c) {
    var w = W3(r, c); w[1] = TOP + 0.5;
    var s = R.project(w); return { x: s.x, y: s.y, visible: s.visible };
  }
  function rollDice(value, mode, power, onDone) {
    DICE.value = value; DICE.yaw = (Math.random() * 2 - 1) * 0.7;
    if (mode === "instant") { DICE.active = false; if (onDone) setTimeout(onDone, 60); return; }
    DICE.active = true; DICE.t0 = now(); DICE.onDone = onDone || null;
    var pw = power || 1;
    DICE.dur = mode === "fast" ? 430 : (700 + pw * 380);
    DICE.ax = Math.random() * 6; DICE.ay = Math.random() * 6; DICE.az = Math.random() * 6;
    var sp = (mode === "fast" ? 1.0 : 1.5) * (0.7 + pw);
    DICE.vax = (6 + Math.random() * 8) * sp; DICE.vay = (5 + Math.random() * 7) * sp; DICE.vaz = (6 + Math.random() * 8) * sp;
  }
  function setValue(v) { if (v >= 1 && v <= 6) DICE.value = v; DICE.active = false; }

  /* -------------------------------- exports ------------------------------- */
  var Board3D = {
    ready: false,
    init: function (renderer, adapter) {
      R = renderer; api = adapter; M = GLB.mat4;
      N = api.N; L = api.L; W = api.W; C = api.C; HOME_LEN = api.HOME_LEN; half = (N - 1) / 2;
      staticOps = null; tex = {}; pawnTex = {}; bonusTex = {}; digitTex = {}; medalTex = {}; woodTex = null;
      scratch = M.create();
      this.ready = true;
    },
    render: render,
    onResize: function () { /* projection derives from renderer size; nothing to cache */ },
    screenForCell: screenForCell,
    worldForCell: W3,
    rollDice: rollDice,
    setValue: setValue,
    rebuild: function () { staticOps = null; }
  };
  window.Board3D = Board3D;
})();

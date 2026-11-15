'use strict';
/* 大魔王の絵(boss.js)
   canvas の図形だけで 大魔王ドドンガ・ヤミマックス三世を描く。画像ファイル・ライブラリなし。
   BOSSART.draw(ctx, phase, opts) — ctx はすでに 大魔王の まん中(足から 96px 上)に 移してある前提。
     phase: 0 よゆう(ガウンとスリッパの 小太り魔王) → 1 いらいら → 2 あせり → 3 ほんき(竜と悪魔の まじった 本物の魔物)
     opts: t=時間(秒) mood=気分 hp=のこりHPの割合(0〜1) hurt=いたい瞬間(0〜1) atk=攻撃で前に出る(0〜1)
           morph=変身の進み(0〜1。null なら変身していない) from=変身前の段階 dead=たおされて回る reduced=動きひかえめ
   変身中は「白く光る → 黒い影が ふくらみながら 形を変える → 新しい姿」。
   毎フレーム描くので、グラデーションは少しだけ・影(shadowBlur)は変身中だけ。 */
var BOSSART = (function () {
  var c = null;                       // いま描いている ctx
  var INK = '#1b1430', PI = Math.PI, TAU = PI * 2, GROUND = 96;
  var F = '"Hiragino Maru Gothic ProN","Hiragino Sans","Yu Gothic UI","Meiryo","Noto Sans JP",system-ui,sans-serif';
  var SK = ['#b39ae6', '#a07ad8', '#7f55b8', '#2e1846'];   // はだ(段階ごと。だんだん 暗く)
  var SKL = ['#d2c0f5', '#c3a6ee', '#9d76d4', '#4a2a6a'];  // はだの 明るいところ
  var SKD = ['#8c6cc8', '#7a52b8', '#5a3590', '#170a26'];  // はだの かげ
  var ROBE = ['#e0557a', '#c23a5e', '#8e1f3f'], ROBED = ['#9c2348', '#7d1838', '#3f0a1d'];
  var CREAM = '#fff1d8', CLAW = '#f4ead2', SILC = '#12061f';
  var HT = [178, 214, 240, 250];      // 段階ごとの だいたいの 高さ(変身で ふくらむ割合)
  var off = null, oc = null, OFF_W = 420, OFF_H = 280, OFF_X = 210, OFF_Y = 158, OFF_S = 2;

  /* ---------- 小さな道具 ---------- */
  function cl01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function sm(x) { x = cl01(x); return x * x * (3 - 2 * x); }
  function mix(a, b, k) { return a + (b - a) * k; }
  function hash(n) { var s = Math.sin(n * 12.9898) * 43758.5453; return s - Math.floor(s); }
  function ell(x, y, rx, ry, rot) { c.beginPath(); c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, TAU); }
  function circ(x, y, r) { c.beginPath(); c.arc(x, y, Math.max(0.1, r), 0, TAU); }
  function fs(fill, lw, stroke) { if (fill) { c.fillStyle = fill; c.fill(); } if (lw) { c.lineWidth = lw; c.strokeStyle = stroke || INK; c.stroke(); } }
  function poly(a) { c.beginPath(); c.moveTo(a[0], a[1]); for (var i = 2; i < a.length; i += 2) c.lineTo(a[i], a[i + 1]); c.closePath(); }
  function rr(x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function lin(x0, y0, x1, y1, st) { var g = c.createLinearGradient(x0, y0, x1, y1); for (var i = 0; i < st.length; i += 2) g.addColorStop(st[i], st[i + 1]); return g; }
  function radg(x, y, r0, r1, st) { var g = c.createRadialGradient(x, y, r0, x, y, r1); for (var i = 0; i < st.length; i += 2) g.addColorStop(st[i], st[i + 1]); return g; }
  function word(s, x, y, size, col) { c.font = '900 ' + size + 'px ' + F; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = col || INK; c.fillText(s, x, y); }
  function stroke(col, lw) { c.lineWidth = lw; c.strokeStyle = col; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke(); }
  // 太い線(手足・しっぽ)。外に こげ茶の縁、中に 色。pts は 直線(4)・2次曲線(6)・3次曲線(8)
  function tpath(p) { c.beginPath(); c.moveTo(p[0], p[1]); if (p.length === 4) c.lineTo(p[2], p[3]); else if (p.length === 6) c.quadraticCurveTo(p[2], p[3], p[4], p[5]); else c.bezierCurveTo(p[2], p[3], p[4], p[5], p[6], p[7]); }
  function tube(p, w, col, ol) { c.lineCap = 'round'; c.lineJoin = 'round'; if (ol !== 0) { tpath(p); c.lineWidth = w + (ol || 5); c.strokeStyle = INK; c.stroke(); } tpath(p); c.lineWidth = w; c.strokeStyle = col; c.stroke(); }
  function qpt(p, u) { var a = 1 - u; return [a * a * p[0] + 2 * a * u * p[2] + u * u * p[4], a * a * p[1] + 2 * a * u * p[3] + u * u * p[5]]; }

  // ツノ: 根元 (bx,by) → 曲がり (cx,cy) → 先 (tx,ty)。根元の太さ w。rings=ねじれの すじ
  function horn(bx, by, cx, cy, tx, ty, w, cA, cB, rings, lw) {
    var dx = cx - bx, dy = cy - by, L = Math.sqrt(dx * dx + dy * dy) || 1, nx = -dy / L, ny = dx / L;
    c.beginPath(); c.moveTo(bx + nx * w / 2, by + ny * w / 2);
    c.quadraticCurveTo(cx + nx * w * 0.3, cy + ny * w * 0.3, tx, ty);
    c.quadraticCurveTo(cx - nx * w * 0.3, cy - ny * w * 0.3, bx - nx * w / 2, by - ny * w / 2); c.closePath();
    fs(lin(bx, by, tx, ty, [0, cA, 1, cB]), lw || 3);
    if (rings) {
      var P = [bx, by, cx, cy, tx, ty];
      c.beginPath();
      for (var i = 1; i <= rings; i++) {
        var u = i / (rings + 1), q = qpt(P, u), q2 = qpt(P, Math.min(1, u + 0.02)), ddx = q2[0] - q[0], ddy = q2[1] - q[1], dl = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
        var hw = w * 0.5 * (1 - u) * 0.9, px = -ddy / dl * hw, py = ddx / dl * hw;
        c.moveTo(q[0] + px, q[1] + py); c.quadraticCurveTo(q[0] + ddx / dl * hw * 0.6, q[1] + ddy / dl * hw * 0.6, q[0] - px, q[1] - py);
      }
      stroke('rgba(60,40,30,.55)', Math.max(1.2, w * 0.09));
    }
  }
  // コウモリの羽: 根元 (rx,ry)、横の大きさ sx・たて sy、side -1 左 / 1 右、flap 羽ばたき
  function wing(rx, ry, sx, sy, side, flap, mem, bone, lw) {
    function X(v) { return rx + side * v * sx; } function Y(v) { return ry + v * sy; }
    var wx = X(0.6), wy = Y(-0.62 - flap * 0.1);
    var p1 = [X(1.05), Y(-0.3 - flap * 0.16)], p2 = [X(1.0), Y(0.22 - flap * 0.08)], p3 = [X(0.68), Y(0.6 - flap * 0.03)], pb = [X(0.12), Y(0.42)];
    function sc(a, b) { var mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2; return [mx + (wx - mx) * 0.3, my + (wy - my) * 0.3]; }
    c.beginPath(); c.moveTo(rx, ry); c.lineTo(wx, wy); c.lineTo(p1[0], p1[1]);
    var q = sc(p1, p2); c.quadraticCurveTo(q[0], q[1], p2[0], p2[1]);
    q = sc(p2, p3); c.quadraticCurveTo(q[0], q[1], p3[0], p3[1]);
    q = sc(p3, pb); c.quadraticCurveTo(q[0], q[1], pb[0], pb[1]); c.closePath();
    fs(mem, lw);
    c.beginPath(); c.moveTo(wx, wy); c.lineTo(p1[0], p1[1]); c.moveTo(wx, wy); c.lineTo(p2[0], p2[1]); c.moveTo(wx, wy); c.lineTo(p3[0], p3[1]);
    stroke(INK, lw * 2.2); stroke(bone, lw * 1.0);
    c.beginPath(); c.moveTo(rx, ry); c.lineTo(wx, wy); stroke(INK, lw * 3.6); stroke(bone, lw * 2.2);
    poly([wx - side * 2, wy, wx + side * 4, wy - lw * 4.5, wx + side * 5, wy + 1]); fs(CLAW, 1.5);   // 手首の つめ
    return { w: [wx, wy], p1: p1, p2: p2, p3: p3 };
  }
  function spade(x, y, s, rot, col) { c.save(); c.translate(x, y); c.rotate(rot); poly([0, -s * 1.5, s, s * 0.1, s * 0.3, s * 0.05, 0, s * 0.7, -s * 0.3, s * 0.05, -s, s * 0.1]); fs(col, 2.5); c.restore(); }
  function slipper(x, y, s) {
    c.save(); c.translate(x, y); c.scale(s, s);
    ell(0, 0, 19, 9); fs('#ff9ec7', 2.5); ell(0, -3, 12, 4.5); fs('#ffd0e4');
    circ(0, -7, 6); fs('#fff', 2); c.restore();
  }
  function clawFoot(x, y, s, col) {
    c.save(); c.translate(x, y); c.scale(s, s);
    ell(0, -2, 18, 10); fs(col, 2.5);
    for (var i = -1; i <= 1; i++) { poly([i * 10 - 3.5, 5, i * 10 + 3.5, 5, i * 11.5, 13]); fs(CLAW, 1.8); }
    c.restore();
  }
  // 小さな王冠と ねふだ「三世」(どの段階にも 残る)
  function crown(x, y, s, rot, t, sil) {
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
    poly([-15, 7, -16, -7, -8, 0, 0, -12, 8, 0, 16, -7, 15, 7]); fs(sil ? '#000' : lin(0, -12, 0, 7, [0, '#fff09a', 1, '#d9a400']), 2.2);
    circ(-16, -7, 2.3); fs('#ffd84d', 1.4); circ(0, -12, 2.5); fs('#ffd84d', 1.4); circ(16, -7, 2.3); fs('#ffd84d', 1.4);
    circ(0, 2, 2.6); fs('#e53950'); circ(-9, 3, 1.9); fs('#4fa8d8'); circ(9, 3, 1.9); fs('#5fb84e');
    // ねふだ(ひもで ぶらぶら)
    c.save(); c.translate(15, 3); c.rotate(0.35 + Math.sin(t * 2.1) * 0.22);
    c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 9); stroke(INK, 1.2);
    rr(-10, 9, 20, 12, 2); fs('#fff', 1.5); word('三世', 0, 15.5, 8, INK);
    c.restore();
    c.restore();
  }
  function bandaid(x, y, rot, s) { c.save(); c.translate(x, y); c.rotate(rot); c.scale(s || 1, s || 1); rr(-10, -3.5, 20, 7, 3); fs('#f7c99c', 1.6); rr(-3.5, -3.5, 7, 7, 1); fs('#fde4c8'); c.restore(); }
  function scratch(x, y, rot, len, col) { c.save(); c.translate(x, y); c.rotate(rot); c.beginPath(); for (var i = -1; i <= 1; i++) { c.moveTo(-len / 2, i * 4); c.lineTo(len / 2, i * 4 - 2); } stroke(col || '#7a1430', 2); c.restore(); }
  function crack(x, y, rot, len, col, lw, glow) {
    c.save(); c.translate(x, y); c.rotate(rot); c.beginPath(); c.moveTo(0, 0);
    var n = 5; for (var i = 1; i <= n; i++) c.lineTo(len * i / n, (i % 2 ? 1 : -1) * len * 0.12);
    c.moveTo(len * 0.4, len * 0.05); c.lineTo(len * 0.55, len * 0.3);
    if (glow) stroke('rgba(255,120,40,.35)', lw * 3);
    stroke(col, lw); c.restore();
  }
  function smoke(x, y, t, n, s) {
    for (var i = 0; i < n; i++) {
      var u = (t * 0.45 + i / n) % 1;
      circ(x + Math.sin(i * 2.3 + t * 1.3) * 7 * u, y - u * 42 * s, (4 + u * 10) * s); fs('rgba(150,140,160,' + (0.45 * (1 - u)).toFixed(2) + ')');
    }
  }
  function steam(x, y, t, side) { for (var i = 0; i < 3; i++) { var u = (t * 1.2 + i / 3) % 1; circ(x + side * u * 14, y - u * 18, 3 + u * 6); fs('rgba(255,255,255,' + (0.7 * (1 - u)).toFixed(2) + ')'); } }
  function vein(x, y, s) { c.save(); c.translate(x, y); c.scale(s, s); c.beginPath(); for (var k = 0; k < 4; k++) { c.rotate(PI / 2); c.moveTo(2, -8); c.quadraticCurveTo(2, -2, 8, -2); } stroke('#ff2d4a', 2.6); c.restore(); }
  function drop(x, y, s, col) { c.beginPath(); c.moveTo(x, y - s * 1.6); c.quadraticCurveTo(x + s, y, x, y + s); c.quadraticCurveTo(x - s, y, x, y - s * 1.6); fs(col || '#8fd3ff', 1.4); }

  /* ---------- 顔(段階 0〜2) ---------- */
  var BASE = [
    { eye: 'derp', brow: -0.2, mouth: 'smile', blush: 1, red: 0 },
    { eye: 'round', brow: 1, mouth: 'teeth', blush: 0, red: 0.55, vein: 1 },
    { eye: 'round', brow: -0.9, mouth: 'wavy', blush: 0, red: 0, sweat: 1 },
    { eye: 'glow', brow: 1, mouth: 'roar' }
  ];
  var MF = {
    angry: { brow: 1, mouth: 'teeth', red: 0.85, vein: 1, steam: 1, shake: 1 },
    boast: { eye: 'smug', brow: 0.15, mouth: 'smirk', tilt: -0.08, sparkle: 1 },
    careless: { eye: 'smug', brow: -0.2, mouth: 'smile' },
    cry: { eye: 'teary', brow: -1, mouth: 'wavy', tears: 1, red: 0 },
    sleepy: { eye: 'half', brow: -0.3, mouth: 'o', tilt: 0.06 },
    asleep: { eye: 'closed', brow: -0.2, mouth: 'o', tilt: 0.1, slow: 1 },
    taunt: { eye: 'smug', brow: 0.6, mouth: 'smirk' },
    hungry: { eye: 'round', brow: -0.5, mouth: 'drool' },
    lonely: { eye: 'side', brow: -0.9, mouth: 'frown' },
    laugh: { eye: 'happy', brow: -0.3, mouth: 'open', bounce: 1 },
    charge: { eye: 'glow', brow: 1, mouth: 'teeth', shake: 1, charge: 1 },
    shaken: { eye: 'wide', brow: -0.6, mouth: 'o' }
  };
  function faceFor(ph, o) {
    var b = {}, k, base = BASE[ph], m = MF[o.mood];
    for (k in base) b[k] = base[k];
    if (m) for (k in m) b[k] = m[k];
    if (ph === 3) { b.mouth = 'roar'; b.red = 0; b.vein = 0; b.blush = 0; } // 本物の魔物は いつも こわい口
    if (o.hurt > 0 && Math.floor(o.t * 10) % 2 === 0) { b.eye = 'x'; b.mouth = ph === 3 ? 'roar' : 'wavy'; }
    if (o.dead) { b.eye = 'swirl'; b.mouth = ph === 3 ? 'roar' : 'o'; b.tears = 0; b.steam = 0; }
    b.skin = SK[ph]; b.sil = o.sil;
    return b;
  }
  function eye(cx, cy, er, s, f, iris, lw, t) {
    iris = iris || f.eye === 'glow';
    c.lineCap = 'round';
    switch (f.eye) {
      case 'closed': c.beginPath(); c.arc(cx, cy - er * 0.3, er * 0.85, 0.15 * PI, 0.85 * PI); stroke(INK, lw * 1.2); return;
      case 'happy': c.beginPath(); c.arc(cx, cy + er * 0.45, er * 0.85, 1.15 * PI, 1.85 * PI); stroke(INK, lw * 1.3); return;
      case 'x': c.beginPath(); c.moveTo(cx - s * er * 0.7, cy - er * 0.65); c.lineTo(cx + s * er * 0.55, cy); c.lineTo(cx - s * er * 0.7, cy + er * 0.65); stroke(INK, lw * 1.3); return;
      case 'swirl': c.beginPath(); for (var a = 0; a <= 4 * PI; a += 0.35) { var r = er * a / (4 * PI); var x = cx + Math.cos(a + t * 9) * r, y = cy + Math.sin(a + t * 9) * r; if (a === 0) c.moveTo(x, y); else c.lineTo(x, y); } stroke(INK, lw); return;
    }
    var rx = er, ry = er * 1.08;
    if (f.eye === 'wide') { rx *= 1.18; ry *= 1.18; }
    if (iris && !f.sil) { circ(cx, cy, er * 2.1); fs(radg(cx, cy, er * 0.4, er * 2.1, [0, 'rgba(255,220,60,.6)', 1, 'rgba(255,190,0,0)'])); }
    ell(cx, cy, rx, ry); fs(iris ? (f.charge ? '#fff6a0' : '#ffd23a') : '#fff', lw);
    var pr = er * 0.42, px = 0, py = er * 0.05;
    if (f.eye === 'derp') { px = s < 0 ? -er * 0.18 : er * 0.22; py = s < 0 ? -er * 0.12 : er * 0.16; pr = er * 0.32; }
    else if (f.eye === 'side') { px = er * 0.42; py = er * 0.12; }
    else if (f.eye === 'smug' || f.eye === 'half') py = er * 0.38;
    else if (f.eye === 'wide') pr = er * 0.18;
    else if (f.eye === 'teary') pr = er * 0.56;
    if (iris) { ell(cx + px, cy + py, pr * 0.42, pr * 1.55); fs(INK); }
    else { circ(cx + px, cy + py, pr); fs(INK); circ(cx + px - pr * 0.35, cy + py - pr * 0.4, pr * 0.36); fs('#fff'); }
    if (f.eye === 'teary') { circ(cx + px + pr * 0.3, cy + py + pr * 0.3, pr * 0.18); fs('#fff'); c.beginPath(); c.arc(cx, cy, er * 0.92, 0.2 * PI, 0.8 * PI); stroke('rgba(110,180,255,.95)', lw * 1.1); }
    if (f.eye === 'smug' || f.eye === 'half') { // まぶた(半分 とじる)
      c.save(); ell(cx, cy, rx, ry); c.clip();
      c.fillStyle = f.skin; c.fillRect(cx - rx - 2, cy - ry - 2, rx * 2 + 4, ry * (f.eye === 'half' ? 1.2 : 0.95) + 2);
      c.restore();
      c.beginPath(); c.moveTo(cx - rx, cy - ry + ry * (f.eye === 'half' ? 1.2 : 0.95)); c.lineTo(cx + rx, cy - ry + ry * (f.eye === 'half' ? 1.2 : 0.95)); stroke(INK, lw);
      ell(cx, cy, rx, ry); fs(null, lw);
    }
  }
  function mouth(x, y, r, m, t, ph) {
    var w = r * 0.36, lw = Math.max(2, r * 0.07);
    c.lineCap = 'round'; c.lineJoin = 'round';
    switch (m) {
      case 'smile': case 'drool':
        c.beginPath(); c.arc(x, y - w * 0.6, w * 0.9, 0.2 * PI, 0.8 * PI); stroke(INK, lw);
        poly([x + w * 0.28, y + w * 0.22, x + w * 0.52, y + w * 0.14, x + w * 0.44, y + w * 0.5]); fs('#fff', 1.5);
        if (m === 'drool') drop(x - w * 0.55, y + w * 0.5 + ((t * 0.8) % 1) * w * 0.8, w * 0.22);
        break;
      case 'smirk':
        c.beginPath(); c.moveTo(x - w * 0.75, y + w * 0.05); c.quadraticCurveTo(x + w * 0.1, y + w * 0.5, x + w * 0.85, y - w * 0.3); stroke(INK, lw);
        poly([x + w * 0.35, y + w * 0.22, x + w * 0.58, y + w * 0.1, x + w * 0.5, y + w * 0.48]); fs('#fff', 1.5);
        break;
      case 'teeth':
        rr(x - w, y - w * 0.32, w * 2, w * 0.7, w * 0.22); fs('#fff', lw);
        c.beginPath(); c.moveTo(x - w, y + w * 0.03); c.lineTo(x + w, y + w * 0.03);
        for (var i = -2; i <= 2; i++) { c.moveTo(x + i * w * 0.36, y - w * 0.32); c.lineTo(x + i * w * 0.36, y + w * 0.38); }
        stroke(INK, lw * 0.5);
        poly([x - w * 0.82, y + w * 0.3, x - w * 0.55, y + w * 0.3, x - w * 0.68, y + w * 0.72]); fs('#fff', 1.5);
        poly([x + w * 0.82, y + w * 0.3, x + w * 0.55, y + w * 0.3, x + w * 0.68, y + w * 0.72]); fs('#fff', 1.5);
        break;
      case 'open':
        c.beginPath(); c.moveTo(x - w, y - w * 0.2); c.quadraticCurveTo(x, y - w * 0.02, x + w, y - w * 0.2);
        c.quadraticCurveTo(x + w * 0.85, y + w * 1.2, x, y + w * 1.25); c.quadraticCurveTo(x - w * 0.85, y + w * 1.2, x - w, y - w * 0.2);
        fs('#7a1430', lw); ell(x, y + w * 0.88, w * 0.5, w * 0.28); fs('#ff6f91');
        poly([x - w * 0.6, y - w * 0.12, x - w * 0.35, y - w * 0.08, x - w * 0.48, y + w * 0.25]); fs('#fff', 1.2);
        poly([x + w * 0.6, y - w * 0.12, x + w * 0.35, y - w * 0.08, x + w * 0.48, y + w * 0.25]); fs('#fff', 1.2);
        break;
      case 'wavy':
        c.beginPath(); c.moveTo(x - w, y);
        for (var j = 1; j <= 6; j++) c.lineTo(x - w + j * w / 3, y + (j % 2 ? -w * 0.2 : w * 0.2));
        stroke(INK, lw);
        poly([x - w * 0.72, y + w * 0.02, x - w * 0.46, y - w * 0.06, x - w * 0.58, y + w * 0.4]); fs('#fff', 1.4);
        poly([x + w * 0.72, y + w * 0.02, x + w * 0.46, y - w * 0.06, x + w * 0.58, y + w * 0.4]); fs('#fff', 1.4);
        break;
      case 'frown': c.beginPath(); c.arc(x, y + w * 0.85, w * 0.8, 1.2 * PI, 1.8 * PI); stroke(INK, lw); break;
      case 'o': ell(x, y + w * 0.1, w * 0.32, w * 0.42); fs('#5a1028', lw); break;
    }
  }
  function face(x, y, r, f, ph, t) {
    var ex = r * 0.38, ey = y - r * 0.1, er = r * (ph === 0 ? 0.28 : ph === 1 ? 0.25 : 0.23), lw = Math.max(2, r * 0.065);
    for (var s = -1; s <= 1; s += 2) eye(x + s * ex, ey, er, s, f, ph === 2, lw, t);
    for (s = -1; s <= 1; s += 2) { // まゆ
      var ix = x + s * (ex - er * 0.85), ox = x + s * (ex + er * 1.0);
      var iy = ey - er * 1.6 + f.brow * er * 0.55, oy = ey - er * 1.6 - f.brow * er * 0.3;
      c.beginPath(); c.moveTo(ix, iy); c.lineTo(ox, oy); stroke(INK, r * (ph === 0 ? 0.1 : 0.13));
    }
    if (f.blush) for (s = -1; s <= 1; s += 2) { ell(x + s * r * 0.64, y + r * 0.26, r * 0.15, r * 0.09); fs('rgba(255,120,170,.55)'); }
    mouth(x, y + r * 0.5, r, f.mouth, t, ph);
    if (f.tears) for (s = -1; s <= 1; s += 2) {
      var tx = x + s * ex, ty = ey + er;
      c.beginPath(); c.moveTo(tx, ty); c.quadraticCurveTo(tx + s * r * 0.08, ty + r * 0.35, tx + s * r * 0.02, ty + r * 0.75); stroke('rgba(120,190,255,.85)', er * 0.5);
      var u = (t * 1.4 + (s > 0 ? 0.5 : 0)) % 1; drop(tx + s * r * 0.05, ty + r * 0.75 + u * r * 0.5, er * 0.3);
    }
    if (f.sweat && !f.sil) { var u2 = (t * 0.7) % 1; drop(x + r * 0.92, y - r * 0.45 + u2 * r * 0.45, r * 0.09); drop(x - r * 0.95, y - r * 0.2 + ((u2 + 0.5) % 1) * r * 0.4, r * 0.075); }
    if (f.vein && !f.sil) vein(x + r * 0.5, y - r * 0.62, r * 0.026);
    if (f.steam && !f.sil) { steam(x - r * 0.9, y - r * 0.75, t, -1); steam(x + r * 0.9, y - r * 0.75, t + 0.4, 1); }
  }
  // 顔を 赤くする(頭の形で 切りぬく。呼ぶ前に 頭の形の path を作っておく)
  function redden(a, rx, ry) { if (a <= 0) return; c.save(); c.clip(); c.fillStyle = radg(0, ry * 0.4, ry * 0.1, ry * 1.4, [0, 'rgba(255,50,70,' + (0.5 * a).toFixed(2) + ')', 1, 'rgba(255,50,70,0)']); c.fillRect(-rx, -ry, rx * 2, ry * 2); c.restore(); }
  function dmgIn(ph, hp) { var R = [[1, 0.7], [0.7, 0.4], [0.4, 0.15], [0.15, 0]][ph]; return cl01((R[0] - hp) / (R[0] - R[1])); }
  function hand(x, y, r, col) { circ(x, y, r); fs(col, 2.5); c.beginPath(); c.moveTo(x - r * 0.5, y - r * 0.2); c.lineTo(x - r * 0.5, y + r * 0.3); c.moveTo(x, y - r * 0.3); c.lineTo(x, y + r * 0.3); c.moveTo(x + r * 0.5, y - r * 0.2); c.lineTo(x + r * 0.5, y + r * 0.3); stroke(INK, 1.6); }
  function claws(x, y, side, n, len, w, spread) { // 手の下から 曲がった つめ
    for (var i = 0; i < n; i++) {
      var a = (i - (n - 1) / 2) * spread, bx = x + Math.sin(a) * w, by = y + Math.cos(a) * w * 0.6;
      var tx = bx + Math.sin(a) * len * 0.5 - side * len * 0.15, ty = by + len;
      c.beginPath(); c.moveTo(bx - 3.5, by); c.quadraticCurveTo(bx - 3, by + len * 0.6, tx, ty); c.quadraticCurveTo(bx + 4, by + len * 0.5, bx + 3.5, by); c.closePath();
      fs(CLAW, 1.6);
    }
  }

  /* ========== 段階 0: よゆう(ガウン・スリッパ・マグカップ・新聞) ========== */
  function form0(o, f) {
    var t = o.t, sil = o.sil, br = o.reduced ? 0 : Math.sin(t * (f.slow ? 1.2 : 2.2)), d = dmgIn(0, o.hp);
    if (!sil) { ell(0, GROUND, 60, 8); fs('rgba(0,0,0,.35)'); }
    var wag = o.reduced ? 0 : Math.sin(t * 2.6) * 7;
    tube([30, 66, 72, 80, 78 + wag, 42], 6, SK[0]); spade(78 + wag, 38, 8, 0.25 + wag * 0.03, SK[0]);
    tube([-17, 72, -18, 86], 14, SK[0]); tube([17, 72, 18, 86], 14, SK[0]);
    slipper(-21, 91, 1); slipper(21, 91, 1);
    c.save(); c.translate(0, 88); c.scale(1 + br * 0.01, 1 - br * 0.014); c.translate(0, -88);
    c.beginPath(); c.moveTo(-24, -4); c.bezierCurveTo(-48, 0, -64, 28, -60, 54); c.bezierCurveTo(-58, 72, -52, 84, -40, 87);
    c.quadraticCurveTo(0, 93, 40, 87); c.bezierCurveTo(52, 84, 58, 72, 60, 54); c.bezierCurveTo(64, 28, 48, 0, 24, -4); c.closePath();
    fs(lin(-40, 0, 40, 90, [0, ROBE[0], 1, ROBED[0]]), 3);
    poly([-16, -4, 0, 34, 16, -4]); fs(SK[0], 2.5);
    c.beginPath(); c.moveTo(-2, 9); c.quadraticCurveTo(2, 5, 0, 1); c.moveTo(4, 13); c.quadraticCurveTo(7, 9, 5, 5); stroke(INK, 1.6); // むな毛 ちょろっと
    tube([-17, -5, -8, 16, 0, 36], 7, CREAM, 4); tube([17, -5, 8, 16, 0, 36], 7, CREAM, 4); tube([0, 36, -3, 62, -5, 88], 6, CREAM, 4);
    rr(29, 50, 12, 14, 2); fs('#ffd84d', 2); word('98', 35, 56, 7);       // ポケットの おやつ(98円)
    rr(26, 59, 20, 16, 4); fs(ROBED[0], 2.5);
    tube([-58, 50, 0, 64, 58, 50], 6, '#7d1838', 4);
    ell(-17, 56, 8, 5, -0.5); fs('#7d1838', 2); ell(-7, 56, 8, 5, 0.5); fs('#7d1838', 2); circ(-12, 57, 3.5); fs('#7d1838', 2);
    tube([-13, 60, -16, 72], 4, '#7d1838', 3); tube([-11, 60, -7, 71], 4, '#7d1838', 3);
    c.restore();
    // 左手: 新聞
    c.save(); c.translate(-63, 44); c.rotate(-0.28);
    rr(-15, -27, 30, 43, 2); fs('#f3efe4', 2.5); word('魔界新聞', 0, -20, 6.5);
    c.fillStyle = '#b9b1a0'; for (var i = 0; i < 5; i++) c.fillRect(-11, -12 + i * 5.5, i === 2 ? 13 : 22, 2);
    c.restore();
    tube([-38, 6, -62, 22, -54, 40], 16, ROBE[0]); tube([-59, 37, -50, 40], 6, CREAM, 4);
    circ(-53, 45, 8.5); fs(SK[0], 2.5);
    // 右手: マグカップ(ゆげ)
    tube([38, 6, 62, 18, 56, 32], 16, ROBE[0]);
    rr(55, 14, 23, 25, 5); fs('#fff', 2.5);
    c.beginPath(); c.arc(79, 26, 6, -PI / 2, PI / 2); stroke(INK, 5); stroke('#fff', 2.2);
    ell(66.5, 16, 10, 3); fs('#6b3e1e'); word('魔', 66.5, 28, 10, '#e0405e');
    if (!sil && !o.reduced) for (var k = 0; k < 2; k++) { var u = (t * 0.6 + k * 0.5) % 1; c.beginPath(); c.moveTo(62 + k * 9, 10 - u * 16); c.quadraticCurveTo(66 + k * 9, 6 - u * 16, 62 + k * 9, 2 - u * 16); stroke('rgba(255,255,255,' + (0.7 * (1 - u)).toFixed(2) + ')', 2); }
    tube([51, 29, 59, 32], 6, CREAM, 4); circ(56, 36, 8.5); fs(SK[0], 2.5);
    if (d > 0.5) bandaid(-55, 44, 0.6, 0.8);
    // 頭
    c.save(); c.translate(0, -28 + (f.bounce && !o.reduced ? -Math.abs(Math.sin(t * 9)) * 3 : 0)); if (f.tilt) c.rotate(f.tilt);
    for (var s = -1; s <= 1; s += 2) {
      c.beginPath(); c.moveTo(s * 36, -8); c.quadraticCurveTo(s * 54, -18, s * 62, -27); c.quadraticCurveTo(s * 52, -2, s * 38, 6); c.closePath(); fs(SK[0], 2.5);
      c.beginPath(); c.moveTo(s * 40, -5); c.quadraticCurveTo(s * 50, -12, s * 55, -19); c.quadraticCurveTo(s * 48, -4, s * 40, 1); c.closePath(); fs('#eaa3cc');
      horn(s * 20, -30, s * 32, -44, s * 24, -55, 11, '#fff6e2', '#e0c99a', 0, 2.5);
    }
    ell(0, 0, 42, 38); fs(lin(0, -38, 0, 38, [0, SKL[0], 1, SKD[0]]), 3);
    if (f.red) { ell(0, 0, 42, 38); redden(f.red, 42, 38); }
    face(0, 0, 40, f, 0, t);
    ell(0, 9, 4.5, 3.2); fs(SKD[0]);
    c.beginPath(); for (s = -1; s <= 1; s += 2) { c.moveTo(s * 1, 13); c.bezierCurveTo(s * 8, 8, s * 18, 11, s * 18, 17); c.quadraticCurveTo(s * 17, 21, s * 13, 18); } stroke('#3a2546', 3); // くるんと ひげ
    if (d > 0.15) bandaid(-24, -16, 0.5, 0.9);
    if (d > 0.8) { circ(-14, -36, 7); fs(SKL[0], 2.2); }   // たんこぶ
    crown(6, -36, 1, 0.18, t, sil);
    if (f.sparkle && !sil) sparkle(24, -50, t);
    c.restore();
  }
  function sparkle(x, y, t) { var s = 4 + 3 * Math.abs(Math.sin(t * 5)); poly([x, y - s * 2, x + s * 0.4, y - s * 0.4, x + s * 2, y, x + s * 0.4, y + s * 0.4, x, y + s * 2, x - s * 0.4, y + s * 0.4, x - s * 2, y, x - s * 0.4, y - s * 0.4]); fs('#fff6a0'); }

  /* ========== 段階 1: いらいら(大きく・ガウンが やぶれ・ツノがのび・羽が生えかけ) ========== */
  function form1(o, f) {
    var t = o.t, sil = o.sil, br = o.reduced ? 0 : Math.sin(t * 2.6), d = dmgIn(1, o.hp), up = (o.atk || 0) * 16;
    if (!sil) { ell(0, GROUND, 72, 9); fs('rgba(0,0,0,.38)'); }
    var wag = o.reduced ? 0 : Math.sin(t * 3.4) * 9, flap = o.reduced ? 0 : Math.sin(t * 10) * 0.6;
    for (var s = -1; s <= 1; s += 2) wing(s * 30, -20, 42, 36, s, flap, '#5b3a86', '#3a2358', 2.2);
    tube([40, 60, 94, 76, 102 + wag, 26], 8, SK[1]); spade(102 + wag, 20, 11, 0.2 + wag * 0.02, SK[1]);
    tube([-22, 68, -24, 86], 17, SK[1]); tube([22, 68, 25, 86], 17, SK[1]);
    slipper(-25, 91, 1.12); clawFoot(26, 91, 1.05, SK[1]);         // スリッパが 片方 とんだ
    c.save(); c.translate(0, 88); c.scale(1 + br * 0.012, 1 - br * 0.016); c.translate(0, -88);
    ell(0, 18, 58, 50); fs(SK[1], 3);                                  // むね・おなか(ガウンの下)
    ell(48, -6, 20, 16); fs(SK[1], 3);                                 // 出てしまった 右肩
    c.beginPath(); c.moveTo(4, 2); c.quadraticCurveTo(16, -2, 26, 6); c.moveTo(10, 14); c.quadraticCurveTo(16, 18, 22, 14); stroke(SKD[1], 2.4); // きんにくの すじ
    c.beginPath(); c.moveTo(-20, -22); c.bezierCurveTo(-52, -20, -76, 14, -71, 46); c.bezierCurveTo(-70, 62, -64, 76, -60, 84);
    var zz = [-48, 91, -38, 82, -26, 92, -14, 83, -2, 91, 10, 82, 22, 91, 34, 81, 46, 89, 58, 81];
    for (var i = 0; i < zz.length; i += 2) c.lineTo(zz[i], zz[i + 1]);
    c.bezierCurveTo(66, 64, 70, 44, 64, 26); c.bezierCurveTo(60, 14, 46, 8, 30, 10); c.lineTo(0, 36); c.closePath();
    fs(lin(-50, -10, 40, 90, [0, ROBE[1], 1, ROBED[1]]), 3);
    poly([-64, 38, -55, 31, -50, 42, -57, 52, -62, 47]); fs(SK[1], 2);  // やぶれた穴
    tube([-20, -23, -7, 6, 0, 36], 7, '#eadcc0', 4); tube([0, 36, 14, 20, 30, 10], 7, '#eadcc0', 4); tube([0, 36, -4, 60, -8, 86], 6, '#eadcc0', 4);
    tube([-64, 50, -14, 64, 30, 58], 6, '#6d1430', 4); tube([30, 58, 38, 68, 33, 82], 5, '#6d1430', 3); // ゆるんだ おび
    c.restore();
    var jx = f.shake && !o.reduced ? Math.sin(t * 50) * 1.5 : 0;
    tube([-54, -10, -82, 20 - up * 0.5, -66 + up * 0.3, 48 - up], 19, ROBE[1]);
    poly([-76, 38 - up, -70, 44 - up, -64, 38 - up, -58, 45 - up, -55, 38 - up]); fs('#eadcc0', 2);
    hand(-64 + jx + up * 0.3, 53 - up, 12.5, SK[1]);
    tube([54, -6, 84, 18 - up * 0.5, 68 - up * 0.3, 48 - up], 18, SK[1]);
    hand(66 + jx - up * 0.3, 53 - up, 12.5, SK[1]);
    if (d > 0.45) scratch(76, 22, 0.9, 14);
    // 頭
    c.save(); c.translate(jx, -52 + (f.bounce && !o.reduced ? -Math.abs(Math.sin(t * 9)) * 3 : 0)); if (f.tilt) c.rotate(f.tilt);
    for (s = -1; s <= 1; s += 2) {
      c.beginPath(); c.moveTo(s * 38, -10); c.quadraticCurveTo(s * 58, -22, s * 70, -36); c.quadraticCurveTo(s * 56, -2, s * 40, 6); c.closePath(); fs(SK[1], 2.5);
      c.beginPath(); c.moveTo(s * 42, -6); c.quadraticCurveTo(s * 54, -15, s * 62, -27); c.quadraticCurveTo(s * 52, -4, s * 42, 1); c.closePath(); fs('#d97aa8');
      horn(s * 22, -30, s * 46, -42, s * 40, -64, 15, '#fff2d8', '#cfae78', 2, 2.8);
    }
    ell(0, 0, 44, 39); fs(lin(0, -39, 0, 39, [0, SKL[1], 1, SKD[1]]), 3);
    ell(0, 0, 44, 39); redden(f.red, 44, 39);
    face(0, 0, 41, f, 1, t);
    ell(0, 9, 5, 3.5); fs(SKD[1]);
    c.beginPath(); for (s = -1; s <= 1; s += 2) { c.moveTo(s * 2, 13); c.lineTo(s * 13, 9); c.lineTo(s * 21, 12); c.moveTo(s * 4, 15); c.lineTo(s * 16, 15); } stroke('#3a2546', 3); // ひげが さかだつ
    if (d > 0.2) bandaid(26, 14, -0.5, 0.9);
    if (d > 0.7 && !sil) smoke(-22, -36, t, 3, 0.7);
    crown(-6, -37, 1, -0.32, t, sil);
    if (f.sparkle && !sil) sparkle(30, -54, t);
    c.restore();
  }

  /* ========== 段階 2: あせり(筋肉・大きな羽・つめ・黒いよろい・目が光る。でも汗だく) ========== */
  function form2(o, f) {
    var t = o.t, sil = o.sil, br = o.reduced ? 0 : Math.sin(t * 2.4), d = dmgIn(2, o.hp), up = (o.atk || 0) * 18;
    if (!sil) { ell(0, GROUND, 88, 10); fs('rgba(0,0,0,.4)'); }
    var wag = o.reduced ? 0 : Math.sin(t * 2.8) * 8, flap = o.reduced ? 0 : Math.sin(t * 4) * 0.5;
    for (var s = -1; s <= 1; s += 2) wing(s * 34, -44, 96, 80, s, flap, sil ? '#000' : lin(0, -120, 0, 10, [0, '#5a2a86', 1, '#2a1240']), '#24123a', 2.6);
    // しっぽ(とげつき)
    tube([44, 64, 112, 82, 130 + wag, 30], 12, SK[2]);
    for (var i = 0; i < 3; i++) { var q = qpt([44, 64, 112, 82, 130 + wag, 30], 0.35 + i * 0.2); poly([q[0] - 5, q[1] - 2, q[0] + 2, q[1] - 13, q[0] + 6, q[1] - 1]); fs('#2b2340', 1.8); }
    spade(130 + wag, 24, 14, 0.25, SK[2]);
    // マント(ガウンだったもの)
    c.beginPath(); c.moveTo(-50, -44); c.bezierCurveTo(-88, -30, -98, 36, -94, 90);
    var rg = [-82, 80, -72, 94, -60, 82, -48, 93, 48, 93, 60, 82, 72, 94, 84, 80];
    for (i = 0; i < rg.length; i += 2) c.lineTo(rg[i], rg[i + 1]);
    c.lineTo(94, 90); c.bezierCurveTo(98, 36, 88, -30, 50, -44); c.closePath();
    fs(lin(0, -40, 0, 95, [0, ROBE[2], 1, ROBED[2]]), 3);
    // 足
    tube([-28, 44, -42, 68, -33, 86], 22, SK[2]); tube([28, 44, 42, 68, 33, 86], 22, SK[2]);
    clawFoot(-35, 91, 1.3, SK[2]); slipper(-35, 85, 0.62);              // つま先に 小さすぎる スリッパが 残っている
    clawFoot(35, 91, 1.3, SK[2]);
    // こしの よろい
    poly([-40, 38, 40, 38, 46, 62, 16, 66, 0, 58, -16, 66, -46, 62]); fs('#2b2340', 2.6);
    c.beginPath(); c.moveTo(-16, 40); c.lineTo(-16, 64); c.moveTo(16, 40); c.lineTo(16, 64); stroke('#8f6bd6', 1.4);
    // 体(Vの字)
    c.save(); c.translate(0, 40); c.scale(1 + br * 0.012, 1 - br * 0.012); c.translate(0, -40);
    c.beginPath(); c.moveTo(-58, -42); c.bezierCurveTo(-66, -10, -46, 18, -36, 42); c.lineTo(36, 42); c.bezierCurveTo(46, 18, 66, -10, 58, -42); c.quadraticCurveTo(0, -56, -58, -42); c.closePath();
    fs(lin(0, -50, 0, 42, [0, SKL[2], 1, SKD[2]]), 3);
    c.beginPath(); c.moveTo(-34, -22); c.quadraticCurveTo(-16, -8, 0, -18); c.quadraticCurveTo(16, -8, 34, -22); // むね
    c.moveTo(0, -16); c.lineTo(0, 34);
    for (i = 0; i < 3; i++) { c.moveTo(-15, 0 + i * 11); c.quadraticCurveTo(-8, 3 + i * 11, -2, 0 + i * 11); c.moveTo(15, 0 + i * 11); c.quadraticCurveTo(8, 3 + i * 11, 2, 0 + i * 11); }
    stroke(SKD[2], 2.2);
    poly([-52, -40, -14, -42, -18, -30, -12, -22, -22, -12, -40, -6, -54, -20]); fs(sil ? '#000' : lin(-50, -42, -14, -6, [0, '#4a3d66', 1, '#1f1830']), 2.4); // むねの よろいの かけら
    c.beginPath(); c.moveTo(-50, -38); c.lineTo(-18, -40); stroke('#a98be6', 1.5);
    tube([-38, 40, 38, 40], 6, '#3a2b52', 3); rr(-9, 34, 18, 13, 3); fs('#ffd84d', 2); word('魔', 0, 40.5, 9, '#7d1838');
    c.restore();
    // かたの よろい(とげ)
    for (s = -1; s <= 1; s += 2) {
      poly([s * 44, -50, s * 50, -66, s * 56, -52, s * 64, -68, s * 70, -50, s * 80, -58, s * 82, -38]); fs('#1f1830', 2.2);
      ell(s * 64, -40, 25, 15, s * 0.3); fs(sil ? '#000' : lin(0, -55, 0, -25, [0, '#4a3d66', 1, '#1f1830']), 2.6);
      ell(s * 62, -45, 14, 4, s * 0.3); fs('rgba(169,139,230,.5)');
    }
    // うで(筋肉・つめ)
    var jx = f.shake && !o.reduced ? Math.sin(t * 50) * 1.6 : 0;
    for (s = -1; s <= 1; s += 2) {
      var hx = s * (86 - up * 0.4) + jx, hy = 44 - up;
      tube([s * 66, -30, s * 100, 6 - up * 0.4, hx, hy - 4], 22, SK[2]);
      tube([s * 92, 22 - up * 0.6, hx, hy - 6], 18, '#2b2340', 4);    // うでわ(よろい)
      ell(hx, hy, 13, 12); fs(SK[2], 2.5);
      claws(hx, hy + 6, s, 3, 15, 9, 0.5);
    }
    if (d > 0.15) crack(-46, -30, 0.3, 22, '#0b0816', 2);
    if (d > 0.4) crack(60, -46, 0.8, 18, '#0b0816', 2);
    if (d > 0.6) { scratch(20, -4, -0.6, 16); scratch(-74, 4, 1.1, 12); }
    // 頭
    c.save(); c.translate(jx, -76 + (f.bounce && !o.reduced ? -Math.abs(Math.sin(t * 9)) * 3 : 0)); if (f.tilt) c.rotate(f.tilt);
    tube([0, 20, 0, 30], 30, SK[2]);
    for (s = -1; s <= 1; s += 2) {
      c.beginPath(); c.moveTo(s * 30, -6); c.quadraticCurveTo(s * 52, -20, s * 66, -30); c.quadraticCurveTo(s * 50, -2, s * 32, 8); c.closePath(); fs(SK[2], 2.5);
      horn(s * 18, -24, s * 56, -34, s * 52, -57, 18, '#f3e3c0', '#8a6a44', 3, 3);
    }
    if (d > 0.8) crack(40, -42, -1.2, 10, '#3a2a1a', 1.6);
    c.beginPath(); c.moveTo(-34, -4); c.bezierCurveTo(-36, -40, 36, -40, 34, -4); c.quadraticCurveTo(34, 18, 16, 28); c.lineTo(-16, 28); c.quadraticCurveTo(-34, 18, -34, -4); c.closePath();
    fs(lin(0, -32, 0, 28, [0, SKL[2], 1, SKD[2]]), 3);
    if (f.red) { c.beginPath(); c.moveTo(-34, -4); c.bezierCurveTo(-36, -40, 36, -40, 34, -4); c.quadraticCurveTo(34, 18, 16, 28); c.lineTo(-16, 28); c.quadraticCurveTo(-34, 18, -34, -4); c.closePath(); redden(f.red, 36, 32); }
    face(0, -2, 33, f, 2, t);
    c.beginPath(); for (s = -1; s <= 1; s += 2) { c.moveTo(s * 1, 9); c.bezierCurveTo(s * 7, 6, s * 14, 8, s * 15, 12); } stroke('#2a1838', 2.2); // ひげは ちょっと こげた
    if (d > 0.8 && !sil) smoke(50, -60, t, 3, 0.8);
    crown(6, -30, 0.82, 0.42, t, sil);
    if (f.sparkle && !sil) sparkle(30, -40, t);
    c.restore();
  }

  /* ========== 段階 3: ほんき(竜と悪魔の まじった 魔物。王冠の ねふだだけ 残る) ========== */
  function form3(o, f) {
    var t = o.t, sil = o.sil, rd = o.reduced, d = dmgIn(3, o.hp), up = (o.atk || 0) * 22, chg = !!f.charge;
    var EYE = chg ? '#ffe066' : '#ff2a2a', EYEG = chg ? '255,224,102' : '255,40,40';
    var pulse = rd ? 0.5 : 0.5 + 0.5 * Math.sin(t * 3);
    if (!sil) {
      circ(0, -20, 205); fs(radg(0, -20, 30, 205, [0, 'rgba(130,40,210,' + (0.4 + 0.15 * pulse).toFixed(2) + ')', 0.55, 'rgba(80,0,120,.22)', 1, 'rgba(40,0,60,0)']));
      for (var i = 0; i < 9; i++) { // むらさきの 炎の した
        var th = PI * (1.08 + i * 0.105), bx = Math.cos(th) * 150, by = -6 + Math.sin(th) * 118, h = 34 + (rd ? 0 : 12 * Math.sin(t * 7 + i * 1.7));
        c.save(); c.translate(bx, by); c.rotate(th + PI / 2);
        c.beginPath(); c.moveTo(-13, 0); c.quadraticCurveTo(-10, -h * 0.6, 0, -h); c.quadraticCurveTo(10, -h * 0.6, 13, 0); c.closePath(); fs('rgba(160,60,245,.28)');
        c.restore();
      }
      ell(0, GROUND, 110, 12); fs('rgba(0,0,0,.5)');
    }
    var flap = rd ? 0 : Math.sin(t * 1.7) * 0.5;
    var memG = sil ? '#000' : lin(0, -140, 0, 40, [0, '#4a1a66', 0.6, '#260b36', 1, '#12051c']);
    var WG = [];
    for (var s = -1; s <= 1; s += 2) {
      WG.push(wing(s * 44, -50, 140, 118, s, flap, memG, '#1c0b26', 3));
      if (!sil) { var ww = WG[WG.length - 1]; c.beginPath(); c.moveTo(ww.w[0], ww.w[1]); c.quadraticCurveTo(mix(ww.w[0], ww.p2[0], 0.5) - s * 10, mix(ww.w[1], ww.p2[1], 0.5) + 6, mix(ww.p1[0], ww.p2[0], 0.5), mix(ww.p1[1], ww.p2[1], 0.5) + 12); c.moveTo(ww.w[0], ww.w[1]); c.quadraticCurveTo(mix(ww.w[0], ww.p3[0], 0.5), mix(ww.w[1], ww.p3[1], 0.5) + 10, mix(ww.p2[0], ww.p3[0], 0.5), mix(ww.p2[1], ww.p3[1], 0.5) + 12); stroke('rgba(150,80,200,.35)', 1.4); }
    }
    if (d > 0.7) { crack(-150, -40, 1.0, 26, '#05010a', 2); crack(140, -10, 2.2, 22, '#05010a', 2); }
    // しっぽ(後ろから 右下へ)
    var wag = rd ? 0 : Math.sin(t * 1.9) * 7;
    var TP = [44, 72, 110, 104, 168, 100, 172 + wag, 56];
    tube(TP, 24, SK[3]); tube([150, 98, 166, 96, 172 + wag, 56], 14, SK[3], 0);
    for (i = 0; i < 4; i++) { var u = 0.25 + i * 0.18, a1 = 1 - u, px = a1 * a1 * a1 * TP[0] + 3 * a1 * a1 * u * TP[2] + 3 * a1 * u * u * TP[4] + u * u * u * TP[6], py = a1 * a1 * a1 * TP[1] + 3 * a1 * a1 * u * TP[3] + 3 * a1 * u * u * TP[5] + u * u * u * TP[7]; poly([px - 7, py - 8, px, py - 24, px + 6, py - 9]); fs('#5a2a6e', 2); }
    poly([172 + wag, 18, 186 + wag, 50, 172 + wag, 44, 158 + wag, 50]); fs(sil ? '#000' : lin(172, 18, 172, 50, [0, '#e9dcc0', 1, '#6b5338']), 2.6);
    // 足
    for (s = -1; s <= 1; s += 2) {
      ell(s * 58, 54, 36, 32, s * 0.2); fs(sil ? '#000' : lin(0, 24, 0, 86, [0, SKL[3], 1, SKD[3]]), 3);
      tube([s * 62, 70, s * 68, 88], 24, SK[3]);
      c.save(); c.translate(s * 68, 93); ell(0, -2, 24, 11); fs(SK[3], 3);
      for (var k = -1; k <= 1; k++) { var kx = k * 13; c.beginPath(); c.moveTo(kx - 5, 4); c.quadraticCurveTo(kx - 3, 14, kx + 2 * k, 17); c.quadraticCurveTo(kx + 4, 10, kx + 5, 4); c.closePath(); fs(CLAW, 1.8); }
      c.restore();
    }
    // 体
    var br = rd ? 0 : Math.sin(t * 1.6);
    c.save(); c.translate(0, 78); c.scale(1 + br * 0.012, 1 - br * 0.012); c.translate(0, -78);
    c.beginPath(); c.moveTo(-82, -46); c.bezierCurveTo(-94, 0, -68, 50, -46, 80); c.lineTo(46, 80); c.bezierCurveTo(68, 50, 94, 0, 82, -46); c.quadraticCurveTo(0, -76, -82, -46); c.closePath();
    fs(sil ? '#000' : lin(0, -64, 0, 80, [0, '#45246a', 1, '#1a0b2a']), 3);
    if (!sil) { // うろこ(1回の stroke で まとめて)
      c.beginPath();
      for (var ry = -34; ry <= 64; ry += 11) for (var rx = 0; rx < 3; rx++) for (s = -1; s <= 1; s += 2) {
        var sx = s * (36 + rx * 13 + ((ry / 11) % 2 ? 6 : 0)); if (Math.abs(sx) > 82 - (ry + 46) * 0.25) continue;
        c.moveTo(sx + 6, ry); c.arc(sx, ry, 6, 0, PI);
      }
      stroke('rgba(160,100,220,.45)', 1.5);
    }
    for (i = 0; i < 6; i++) { var pw = 52 - i * 3, py2 = -32 + i * 17; rr(-pw / 2, py2, pw, 14, 6); fs(sil ? '#000' : '#5a2f52', 2.2); c.beginPath(); c.moveTo(-pw / 2 + 6, py2 + 3); c.lineTo(pw / 2 - 6, py2 + 3); stroke('rgba(220,150,200,.45)', 1.6); }
    var nC = d > 0 ? 1 + Math.floor(d * 5) : 0, CR = [[-30, -20, 0.6, 26], [44, 10, 2.3, 24], [-56, 30, 1.2, 20], [10, 46, -0.4, 22], [60, -30, 2.8, 18], [-14, -40, 0.2, 18]];
    for (i = 0; i < Math.min(nC, CR.length); i++) crack(CR[i][0], CR[i][1], CR[i][2], CR[i][3], '#ffb347', 2.2, !sil);
    c.restore();
    // かたの とげ
    for (s = -1; s <= 1; s += 2) { poly([s * 40, -62, s * 46, -84, s * 54, -60]); fs('#2a1240', 2.2); poly([s * 58, -56, s * 68, -78, s * 72, -52]); fs('#2a1240', 2.2); poly([s * 74, -48, s * 90, -66, s * 86, -42]); fs('#2a1240', 2.2); }
    // うで
    var jx = (f.shake || chg) && !rd ? Math.sin(t * 50) * 1.8 : 0;
    for (s = -1; s <= 1; s += 2) {
      var hx = s * (106 - up * 0.6) + jx, hy = 40 - up * 1.4;
      tube([s * 80, -38, s * 128, -6 - up * 0.5, hx, hy - 6], 30, SK[3]);
      poly([s * 120, -14 - up * 0.5, s * 140, -24 - up * 0.5, s * 128, -2 - up * 0.5]); fs('#2a1240', 2);
      ell(hx, hy, 19, 16); fs(SK[3], 3);
      claws(hx, hy + 8, s, 4, 24, 12, 0.42);
    }
    if (d > 0.4 && !sil) { smoke(-70, -56, t, 3, 1); smoke(72, -50, t + 0.7, 3, 1); }
    // 首と頭
    c.save(); c.translate(jx, -90);
    tube([0, 26, 0, 40], 46, SK[3]);
    for (s = -1; s <= 1; s += 2) {
      horn(s * 22, -18, s * 92, -26, s * 66, -47, 25, '#efe2c4', '#5e4630', 4, 3);  // ねじれた 大ツノ
      horn(s * 30, -6, s * 56, -6, s * 62, -16, 10, '#d9c9a6', '#5e4630', 0, 2.2);
      poly([s * 30, 8, s * 60, 18, s * 34, 20]); fs('#2a1240', 2); poly([s * 28, 20, s * 52, 34, s * 26, 30]); fs('#2a1240', 2); // ほおの とげ
    }
    // した あご
    c.beginPath(); c.moveTo(-26, 26); c.quadraticCurveTo(-28, 44, -14, 52); c.quadraticCurveTo(0, 56, 14, 52); c.quadraticCurveTo(28, 44, 26, 26); c.closePath(); fs(SK[3], 3);
    // 口の中(光る)
    c.beginPath(); c.moveTo(-22, 22); c.quadraticCurveTo(0, 30, 22, 22); c.lineTo(18, 40); c.quadraticCurveTo(0, 52, -18, 40); c.closePath();
    var mg = chg ? 1 : 0.55 + 0.25 * pulse;
    fs(sil ? '#000' : radg(0, 34, 2, 24, [0, 'rgba(255,240,170,' + mg.toFixed(2) + ')', 0.45, chg ? '#ffb347' : '#ff5a1f', 1, '#4a0a10']), 2.5);
    for (s = -1; s <= 1; s += 2) { // きば
      poly([s * 20, 22, s * 13, 24, s * 17, 38]); fs(CLAW, 1.6); poly([s * 10, 26, s * 5, 27, s * 8, 34]); fs(CLAW, 1.4);
      poly([s * 16, 44, s * 10, 46, s * 14, 33]); fs(CLAW, 1.4);
    }
    // 頭(上)
    c.beginPath(); c.moveTo(-36, -14); c.quadraticCurveTo(0, -36, 36, -14); c.quadraticCurveTo(44, 0, 34, 14); c.lineTo(20, 26); c.quadraticCurveTo(0, 30, -20, 26); c.lineTo(-34, 14); c.quadraticCurveTo(-44, 0, -36, -14); c.closePath();
    fs(sil ? '#000' : lin(0, -30, 0, 28, [0, '#5a3080', 1, '#22102f']), 3);
    c.beginPath(); c.moveTo(0, -26); c.lineTo(0, -4); stroke('rgba(160,100,220,.5)', 2);
    // はな先
    c.beginPath(); c.moveTo(-16, 8); c.lineTo(16, 8); c.lineTo(13, 24); c.quadraticCurveTo(0, 28, -13, 24); c.closePath(); fs('#3a1d52', 2.4);
    for (s = -1; s <= 1; s += 2) { ell(s * 6, 19, 3, 2, s * 0.4); fs(sil ? '#000' : 'rgb(' + (chg ? '255,200,80' : '255,90,40') + ')'); }
    if (!sil && !rd && (chg || pulse > 0.7)) { smoke(-6, 14, t, 2, 0.5); smoke(6, 14, t + 0.5, 2, 0.5); }
    // 目(光る)と まゆの でっぱり
    for (s = -1; s <= 1; s += 2) {
      var ex = s * 17, ey = -4;
      if (!sil) { circ(ex, ey, 19); fs(radg(ex, ey, 2, 19, [0, 'rgba(' + EYEG + ',.75)', 1, 'rgba(' + EYEG + ',0)'])); }
      if (f.eye === 'closed') { c.beginPath(); c.moveTo(ex - s * 9, ey - 2); c.lineTo(ex + s * 9, ey + 3); stroke(EYE, 3); }
      else if (f.eye === 'swirl') { c.beginPath(); for (var a = 0; a <= 4 * PI; a += 0.4) { var r = 9 * a / (4 * PI); var x = ex + Math.cos(a + t * 9) * r, y = ey + Math.sin(a + t * 9) * r; if (a === 0) c.moveTo(x, y); else c.lineTo(x, y); } stroke(EYE, 2.4); }
      else if (f.eye === 'x') { c.beginPath(); c.moveTo(ex - 7, ey - 6); c.lineTo(ex + 7, ey + 6); c.moveTo(ex + 7, ey - 6); c.lineTo(ex - 7, ey + 6); stroke(EYE, 3); }
      else {
        c.beginPath(); c.moveTo(ex - s * 11, ey - 1); c.quadraticCurveTo(ex, ey - 9, ex + s * 11, ey + 5); c.quadraticCurveTo(ex, ey + 7, ex - s * 11, ey - 1); c.closePath(); fs(EYE, 2);
        ell(ex, ey, 4.5, 3); fs('#fff6c8'); ell(ex, ey, 1.6, 4.5); fs(INK);
      }
      poly([s * 36, -16, s * 6, -10, s * 4, -4, s * 34, -6]); fs('#24102f', 2.2);   // おこった まゆ(内がわが 下がる)
      if (f.tears) { c.beginPath(); c.moveTo(ex, ey + 6); c.quadraticCurveTo(ex + s * 4, ey + 16, ex + s * 2, ey + 26); stroke('rgba(120,190,255,.85)', 4); }
    }
    // 笑いの なごり: 大ツノの先に ちょこんと 王冠と ねふだ「三世」
    crown(70, -46, 0.62, 0.55, t, sil);
    c.restore();
    if (!sil && !rd) for (i = 0; i < 12; i++) { var eu = (t * 0.32 + hash(i) ) % 1; circ(Math.sin(i * 7.7) * 150 + Math.sin(t + i) * 6, 92 - eu * 230, 1.8 + hash(i + 3) * 1.4); fs('rgba(255,160,70,' + (1 - eu).toFixed(2) + ')'); }
    if (chg && !sil && !rd) zap(t, 0.8);
  }
  // 小さな いなずま(ため・変身)
  function zap(t, a) {
    var seed = Math.floor(t * 12);
    c.beginPath();
    for (var i = 0; i < 3; i++) {
      var ang = hash(seed * 3 + i) * TAU, r0 = 70 + hash(seed + i * 7) * 60, x = Math.cos(ang) * r0, y = -20 + Math.sin(ang) * r0 * 0.8;
      c.moveTo(x, y); for (var k = 0; k < 4; k++) { x += (hash(seed + i + k * 13) - 0.5) * 24 + Math.cos(ang) * 10; y += (hash(seed * 7 + k + i) - 0.5) * 24 + Math.sin(ang) * 10; c.lineTo(x, y); }
    }
    stroke('rgba(255,240,140,' + a + ')', 2.4);
  }

  var FORMS = [form0, form1, form2, form3];
  function drawForm(ph, o) {
    ph = ph < 0 ? 0 : ph > 3 ? 3 : ph | 0;
    var f = faceFor(ph, o), jx = 0;
    c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
    if (!o.reduced && o.hurt > 0) jx = Math.sin(o.t * 55) * 3 * o.hurt;
    if (jx) c.translate(jx, 0);
    FORMS[ph](o, f);
    c.restore();
  }

  /* ---------- 変身(影) ---------- */
  function ensureOff() {
    if (oc) return true;
    try { off = document.createElement('canvas'); off.width = OFF_W * OFF_S; off.height = OFF_H * OFF_S; oc = off.getContext('2d'); } catch (e) { off = null; oc = null; }
    return !!oc;
  }
  function silLayer(list) {
    oc.setTransform(1, 0, 0, 1, 0, 0); oc.globalCompositeOperation = 'source-over'; oc.globalAlpha = 1; oc.clearRect(0, 0, off.width, off.height);
    oc.setTransform(OFF_S, 0, 0, OFF_S, OFF_X * OFF_S, OFF_Y * OFF_S);
    var keep = c; c = oc;
    for (var i = 0; i < list.length; i++) {
      var L = list[i]; if (L.a <= 0.01) continue;
      oc.save(); oc.globalAlpha = L.a; oc.translate(0, GROUND); oc.scale(L.sx, L.sy); oc.translate(0, -GROUND); drawForm(L.ph, L.o); oc.restore();
    }
    c = keep;
    oc.setTransform(1, 0, 0, 1, 0, 0); oc.globalAlpha = 1; oc.globalCompositeOperation = 'source-in';
    var g = oc.createLinearGradient(0, 0, 0, off.height); g.addColorStop(0, '#2a0d40'); g.addColorStop(1, SILC); oc.fillStyle = g;
    oc.fillRect(0, 0, off.width, off.height); oc.globalCompositeOperation = 'source-over';
  }
  function blitOff(a, glow) {
    if (a <= 0.01) return;
    c.save(); c.globalAlpha *= a; if (glow) { c.shadowColor = glow; c.shadowBlur = 22; }
    c.drawImage(off, -OFF_X, -OFF_Y, OFF_W, OFF_H); c.restore();
  }
  function copyO(o) { var n = {}; for (var k in o) n[k] = o[k]; n.sil = true; n.morph = null; n.hurt = 0; n.atk = 0; return n; }
  function drawMorph(ph, o) {
    var u = o.morph, A = o.from < 0 ? 0 : o.from > 3 ? 3 : o.from, B = ph, oS = copyO(o);
    if (!ensureOff()) { drawForm(u < 0.5 ? A : B, o); return; }
    if (u < 0.15) { drawForm(A, o); silLayer([{ ph: A, a: 1, sx: 1, sy: 1, o: oS }]); blitOff(sm(u / 0.15), null); return; }
    if (u < 0.72) {
      var k = sm((u - 0.15) / 0.57), r = HT[B] / HT[A], wob = o.reduced ? 0 : Math.sin(u * 46) * 0.045 * (1 - Math.abs(2 * k - 1));
      var sa = mix(1, r, k), sb = mix(1 / r, 1, k), pump = o.reduced ? 1 : 1 + 0.05 * Math.sin(u * PI * 7) * (1 - k);
      silLayer([{ ph: A, a: 1 - k, sx: sa * pump * (1 + wob), sy: sa * pump * (1 - wob), o: oS }, { ph: B, a: k, sx: sb * pump * (1 - wob), sy: sb * pump * (1 + wob), o: oS }]);
      blitOff(1, 'rgba(190,90,255,.95)');
      if (!o.reduced) zap(o.t, 0.9);
      return;
    }
    drawForm(B, o);
    if (u < 0.92) { silLayer([{ ph: B, a: 1, sx: 1, sy: 1, o: oS }]); blitOff(1 - sm((u - 0.72) / 0.2), 'rgba(190,90,255,.6)'); }
  }

  /* ---------- 外から呼ぶ ---------- */
  function draw(ctx, phase, opts) {
    var o = opts || {}, keep = c; c = ctx;
    if (o.t === undefined) o.t = 0; if (o.hp === undefined) o.hp = 1;
    try {
      if (o.morph !== null && o.morph !== undefined && o.from !== undefined && o.from !== null && o.from !== phase && o.morph < 1) drawMorph(phase, o);
      else drawForm(phase, o);
    } finally { c = keep; }
  }
  // 頭の右上(汗の絵文字を置く所)。大魔王の まん中からの ずれ
  var HEAD = [{ x: 44, y: -62 }, { x: 52, y: -88 }, { x: 44, y: -108 }, { x: 40, y: -120 }];
  function head(phase) { return HEAD[phase < 0 ? 0 : phase > 3 ? 3 : phase | 0]; }
  return { draw: draw, head: head, HEIGHT: HT };
})();

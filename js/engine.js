'use strict';
/* 土台: 論理サイズ 390×780 の canvas と、同じ倍率で重ねる DOM(#ui)。
   タップ座標の変換・絵文字アトラス・文字の縁取り・お金の表示・セーブ・場面(scene)の管理。 */
var W = 390, H = 780;
var PAL = { ink: '#1b1430', night: '#140c2a', cream: '#fffaf0', sun: '#ffe066', orange: '#ffb347', sky: '#7fe0ff', leaf: '#9df29d', pink: '#ff7ad0', red: '#ff6a6a', violet: '#8a2be2' };
var cv = document.getElementById('game'), ctx = cv.getContext('2d');
var ui = document.getElementById('ui');
var SC = 1, OX = 0, OY = 0;
var EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
var TEXT_FONT = '"Hiragino Sans","Hiragino Kaku Gothic ProN","Yu Gothic UI","Meiryo","Noto Sans JP",system-ui,sans-serif';

function resize() {
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var vw = window.innerWidth, vh = window.innerHeight;
  SC = Math.min(vw / W, vh / H);
  OX = (vw - W * SC) / 2; OY = (vh - H * SC) / 2;
  cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr);
  cv.style.width = vw + 'px'; cv.style.height = vh + 'px';
  ctx.setTransform(SC * dpr, 0, 0, SC * dpr, OX * dpr, OY * dpr);
  ui.style.transform = 'scale(' + SC + ')';
  ui.style.left = OX + 'px'; ui.style.top = OY + 'px';
  ATL.reset(); BIG.reset();
  if (window.onResized) window.onResized();
}
function baseTransform() {
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  ctx.setTransform(SC * dpr, 0, 0, SC * dpr, OX * dpr, OY * dpr);
}
function toLogical(ev) { return { x: (ev.clientX - OX) / SC, y: (ev.clientY - OY) / SC }; }

/* 絵文字アトラス(1枚にまとめて drawImage。毎フレーム fillText しない。記憶不足で白紙になるのを防ぐ) */
function makeAtlas(cell, glyph, cols) {
  var map = {}, can = null, c2 = null, n = 0, rows = 0;
  function ensure() {
    if (can) return;
    rows = Math.ceil(64 / cols) + 1;
    can = document.createElement('canvas'); can.width = cell * cols; can.height = cell * rows;
    c2 = can.getContext('2d'); map = {}; n = 0;
  }
  function slot(e) {
    ensure();
    if (map[e] !== undefined) return map[e];
    if (n >= cols * rows) { // いっぱいになったら広げる
      var old = can; rows += 4;
      can = document.createElement('canvas'); can.width = cell * cols; can.height = cell * rows;
      c2 = can.getContext('2d'); c2.drawImage(old, 0, 0);
    }
    var i = n++; map[e] = i;
    c2.font = glyph + 'px ' + EMOJI_FONT; c2.textAlign = 'center'; c2.textBaseline = 'middle';
    c2.fillText(e, (i % cols) * cell + cell / 2, Math.floor(i / cols) * cell + cell / 2 + glyph * 0.04);
    return i;
  }
  function draw(e, x, y, size, alpha) {
    if (!e) return;
    var i = slot(e), s = size * cell / glyph;
    if (alpha !== undefined) { ctx.save(); ctx.globalAlpha = alpha; }
    ctx.drawImage(can, (i % cols) * cell, Math.floor(i / cols) * cell, cell, cell, x - s / 2, y - s / 2, s, s);
    if (alpha !== undefined) ctx.restore();
  }
  function reset() { can = null; }
  return { draw: draw, reset: reset };
}
var ATL = makeAtlas(112, 92, 8);   // 普通の大きさ(〜100px)
var BIG = makeAtlas(256, 220, 4);  // 大きい絵文字(ボス・マント・写真)

/* 文字(canvas) 縁取りつき */
function txt(s, x, y, size, color, align, weight, stroke) {
  ctx.font = (weight || 900) + ' ' + size + 'px ' + TEXT_FONT; ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
  if (stroke !== null) { ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(3, size / 5); ctx.strokeStyle = stroke || PAL.ink; ctx.strokeText(s, x, y); }
  ctx.fillStyle = color || '#fff'; ctx.fillText(s, x, y);
}
function rrect(x, y, w, h, r, fill, stroke, lw) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.lineWidth = lw || 3; ctx.strokeStyle = stroke; ctx.stroke(); }
}
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, t) { return a + (b - a) * t; }
function rnd(a, b) { return a + Math.random() * (b - a); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

/* お金の表示: 9,800 G / 12万 3,456 G / 1億 2,345万 G */
function fmtG(n) {
  n = Math.floor(n); var neg = n < 0; n = Math.abs(n); var s;
  if (n >= 100000000) { var oku = Math.floor(n / 100000000), man = Math.floor((n % 100000000) / 10000); s = oku + '億' + (man ? ' ' + man.toLocaleString('ja-JP') + '万' : ''); }
  else if (n >= 10000) { var m = Math.floor(n / 10000), r = n % 10000; s = m.toLocaleString('ja-JP') + '万' + (r ? ' ' + r.toLocaleString('ja-JP') : ''); }
  else s = n.toLocaleString('ja-JP');
  return (neg ? '−' : '') + s + ' G';
}
function fmtBig(n) { // ボスの HP: 9兆2,000億 / 3億 / 12万
  n = Math.max(0, Math.floor(n));
  if (n >= 1e12) { var cho = Math.floor(n / 1e12), oku = Math.floor((n % 1e12) / 1e8); return cho + '兆' + (oku ? oku.toLocaleString('ja-JP') + '億' : ''); }
  if (n >= 1e8) { var o = Math.floor(n / 1e8), man = Math.floor((n % 1e8) / 1e4); return o + '億' + (man ? man.toLocaleString('ja-JP') + '万' : ''); }
  if (n >= 1e4) { return Math.floor(n / 1e4).toLocaleString('ja-JP') + '万' + ((n % 1e4) ? (n % 1e4).toLocaleString('ja-JP') : ''); }
  return n.toLocaleString('ja-JP');
}

/* セーブ */
var SAVE_KEY = 'heppoko-save-v1', SET_KEY = 'heppoko-settings';
function saveGame(slot) {
  try { var d = JSON.stringify(G.save()); localStorage.setItem(SAVE_KEY + (slot ? '-' + slot : ''), d); return true; } catch (e) { return false; }
}
function loadSave() {
  try { var a = localStorage.getItem(SAVE_KEY), b = localStorage.getItem(SAVE_KEY + '-auto');
    var da = a ? JSON.parse(a) : null, db = b ? JSON.parse(b) : null;
    if (da && db) return (db.time || 0) > (da.time || 0) ? db : da; return da || db; } catch (e) { return null; }
}
function clearSave() { try { localStorage.removeItem(SAVE_KEY); localStorage.removeItem(SAVE_KEY + '-auto'); } catch (e) {} }
var SETTINGS = { font: 'normal', dpad: false, speed: 2, textSpeed: 2 };
try { var _s = JSON.parse(localStorage.getItem(SET_KEY) || '{}'); for (var k in _s) SETTINGS[k] = _s[k]; } catch (e) {}
function saveSettings() { try { localStorage.setItem(SET_KEY, JSON.stringify(SETTINGS)); } catch (e) {} document.documentElement.setAttribute('data-font', SETTINGS.font); }
saveSettings();

/* DOM の部品づくり */
function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; }
function btn(label, cls, fn) {
  var b = el('button', cls, label); b.type = 'button';
  var lock = false;
  b.addEventListener('click', function (ev) { ev.stopPropagation(); if (lock) return; lock = true; setTimeout(function () { lock = false; }, 350); AUDIO.sfx('tap'); try { b.blur(); } catch (e) {} fn && fn(ev); });
  return b;
}
function show(node) { node.classList.remove('hidden'); } function hide(node) { node.classList.add('hidden'); }

/* 画面(scene)の管理 */
var SCENES = {};
var G = { scene: 'title', back: [], t: 0, paused: false };
function go(name, arg) {
  var prev = G.scene;
  if (SCENES[prev] && SCENES[prev].leave) SCENES[prev].leave(name);
  G.scene = name;
  if (SCENES[name] && SCENES[name].enter) SCENES[name].enter(arg, prev);
}
function pushScene(name, arg) { G.back.push(G.scene); go(name, arg); }
function popScene(arg) { var n = G.back.pop() || 'town'; go(n, arg); }

/* 入力(タップ) */
cv.addEventListener('pointerdown', function (ev) { var p = toLogical(ev); var s = SCENES[G.scene]; if (s && s.tap) s.tap(p.x, p.y, ev); });
cv.addEventListener('pointerup', function (ev) { var p = toLogical(ev); var s = SCENES[G.scene]; if (s && s.tapUp) s.tapUp(p.x, p.y, ev); });
cv.addEventListener('pointermove', function (ev) { var p = toLogical(ev); var s = SCENES[G.scene]; if (s && s.move) s.move(p.x, p.y, ev); });
var KEYS = {};
addEventListener('keydown', function (ev) { KEYS[ev.key] = true; var s = SCENES[G.scene]; if (s && s.key) s.key(ev.key, ev); if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].indexOf(ev.key) >= 0) ev.preventDefault(); });
addEventListener('keyup', function (ev) { KEYS[ev.key] = false; });

/* メインループ(固定の時間刻み) */
var last = 0, acc = 0, DT = 1 / 60;
function loop(now) {
  var dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (!G.paused) {
    acc += dt; var n = 0;
    while (acc >= DT && n < 4) { G.t += DT; var s = SCENES[G.scene]; if (s && s.update) s.update(DT); acc -= DT; n++; }
    if (acc > DT) acc = 0;
  }
  baseTransform(); ctx.clearRect(-OX / SC, -OY / SC, (W * SC + OX * 2) / SC, (H * SC + OY * 2) / SC);
  var sc = SCENES[G.scene]; if (sc && sc.draw) sc.draw();
  requestAnimationFrame(loop);
}
addEventListener('resize', resize);
addEventListener('orientationchange', function () { setTimeout(resize, 200); });
addEventListener('pageshow', resize);
cv.addEventListener('contextlost', function () { ATL.reset(); BIG.reset(); });
cv.addEventListener('contextrestored', resize);
document.addEventListener('visibilitychange', function () { G.paused = document.hidden; if (!document.hidden) { resize(); AUDIO.unlock(); } });

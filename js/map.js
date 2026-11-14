'use strict';
/* 町のマップ(24×24)。記号の意味は docs/design-ui.md 2-2。裏 canvas に1回描いて、毎フレームは切り出すだけ。 */
var TILE = 44, MAPW = 24, MAPH = 24; // 1マスの大きさ(画面の論理 px)。絵は 32 を基準に描いて、TILE に合わせて広げる
var MAP = [
  'TTTTTTTCCCCCCCCCCTTTTTTT',
  'TT..TTTCccccccccCTTT..TT',
  'T......CccccccccC......T',
  'T.*..*.CWWWWWWWWC.*..*.T',
  'T.*..*.CWWWGGWWWC.*..*.T',
  'TBB.BBB##########BBB.BBT',
  'T.*.....*.####.*.....*.T',
  'TRRRR.RRRR####RRRR.RRRRT',
  'TWSWW.WSWW####W+WW.WSWWT',
  'TWDWW.WDWW####WDWW.WDWWT',
  'T.*.b...*.####.*...b.*.T',
  'T..##################..T',
  'T..#b######FF######b#..T',
  'T..########FF########..T',
  'T..##################..T',
  'T.........####.........T',
  'TRRRR.RRRR####rrrrrrrrrT',
  'TWSWW.WSWW####rrrrrrrrrT',
  'TWDWW.WDWW####WWWWWWWWWT',
  'T.........####WWWWDWWWWT',
  'Ts*~~~sB..####......RRRT',
  'Tss~~~ss..####......WDST',
  'TsbssssB..####.=======.T',
  'TTTTTTTTTT#EE#TTTTTTTTTT'
];
var PASS = { '.': 1, '*': 1, '=': 1, '#': 1, 's': 1, 'D': 2, 'G': 2, 'E': 3 };
/* 扉 → 場所 */
var DOORS = { '2,9': 'weapon', '7,9': 'armor', '15,9': 'church', '20,9': 'inn', '2,18': 'accessory', '7,18': 'zakka', '18,19': 'home', '21,21': 'aunt', '11,4': 'castle', '12,4': 'castle' };
var SIGNS = { '2,8': '⚔️', '7,8': '🛡️', '20,8': '🛏️', '2,17': '💍', '7,17': '🧺', '22,21': '🏡' };
var START = { x: 18, y: 20 };
function tileAt(x, y) { if (x < 0 || y < 0 || x >= MAPW || y >= MAPH) return 'T'; return MAP[y][x]; }
function passable(x, y) { return (PASS[tileAt(x, y)] || 0) > 0; }

/* 経路探索(BFS)。斜めなし。目標が通れない所なら「主人公から一番近い隣の通れる所」に寄る。 */
function findPath(sx, sy, tx, ty, blocked) {
  if (!passable(tx, ty)) {
    var best = null, bd = 1e9;
    for (var yy = 0; yy < MAPH; yy++) for (var xx = 0; xx < MAPW; xx++) {
      if (!passable(xx, yy) || PASS[tileAt(xx, yy)] >= 2) continue; // 扉・出口には「寄せ」で入らない(壁をタップしただけで店に入ってしまうのを防ぐ)
      if (blocked && blocked[xx + ',' + yy]) continue;              // 人が立っている所にも寄せない(何も起きなくなる)
      var d = Math.abs(xx - tx) + Math.abs(yy - ty); if (d > 2) continue;
      var dd = d * 100 + Math.abs(xx - sx) + Math.abs(yy - sy);
      if (dd < bd) { bd = dd; best = { x: xx, y: yy }; }
    }
    if (!best) return null; tx = best.x; ty = best.y;
  }
  var prev = {}, q = [[sx, sy]], key = function (x, y) { return x + ',' + y; };
  prev[key(sx, sy)] = null; var found = false;
  while (q.length) {
    var c = q.shift(); if (c[0] === tx && c[1] === ty) { found = true; break; }
    var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (var i = 0; i < 4; i++) {
      var nx = c[0] + dirs[i][0], ny = c[1] + dirs[i][1], k = key(nx, ny);
      if (prev[k] !== undefined || !passable(nx, ny)) continue;
      if (PASS[tileAt(nx, ny)] >= 2 && !(nx === tx && ny === ty)) continue; // 扉・出口は「通りぬけ」ない(目的地のときだけ入る)
      if (blocked && blocked[k] && !(nx === tx && ny === ty)) continue;
      prev[k] = c; q.push([nx, ny]);
    }
  }
  if (!found) return null;
  var path = [], cur = [tx, ty];
  while (cur && !(cur[0] === sx && cur[1] === sy)) { path.unshift({ x: cur[0], y: cur[1] }); cur = prev[key(cur[0], cur[1])]; }
  return path;
}

/* 起動時のチェック(マップを変えたときの保険) */
(function checkMap() {
  for (var y = 0; y < MAPH; y++) if (MAP[y].length !== MAPW) console.error('マップ ' + y + ' 行目の長さが ' + MAP[y].length);
  for (var k in DOORS) { var p = k.split(',').map(Number); if (!passable(p[0], p[1] + 1)) console.error('扉の前が通れない ' + k); }
  var seen = {}, q = [[START.x, START.y]]; seen[START.x + ',' + START.y] = 1; var n = 0;
  while (q.length) { var c = q.shift(); n++; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { var x = c[0] + d[0], y = c[1] + d[1]; if (passable(x, y) && !seen[x + ',' + y]) { seen[x + ',' + y] = 1; q.push([x, y]); } }); }
  var total = 0; for (var yy = 0; yy < MAPH; yy++) for (var xx = 0; xx < MAPW; xx++) if (passable(xx, yy)) total++;
  if (n !== total) console.error('届かないマスがある: ' + (total - n));
})();

/* 裏 canvas に町を描く。明るくやわらかい色・屋根と壁に こげ茶の縁。
   絵は 1マス=32 の座標で描き、canvas を TILE(44)×画面の細かさ に広げる(拡大してもぼやけない) */
var mapCanvas = null, mapCanvasTop = null, MAP_INK = '#5a3d2b';
var ROOF_LABEL = [ // 屋根に書く名前 [左のマス, 右のマス, 行, 字]
  [1, 4, 7, '⚔️ 武器屋'], [6, 9, 7, '🛡️ 防具屋'], [14, 17, 7, '⛪ 教会'], [19, 22, 7, '🛏️ 宿'],
  [1, 4, 16, '💍 アクセ屋'], [6, 9, 16, '🧺 雑貨屋'], [14, 22, 16.5, '🏠 へっぽこの家'], [20, 22, 20, 'おばさんの家'], [8, 15, 2, '🏰 お城']
];
function buildMap() {
  var B = 32, dpr = Math.min(window.devicePixelRatio || 1, 2);
  var R = Math.min(dpr, 1900 / (MAPW * TILE)) * TILE / B;          // 32 → 画面の px
  mapCanvas = document.createElement('canvas'); mapCanvas.width = Math.round(MAPW * B * R); mapCanvas.height = Math.round(MAPH * B * R);
  mapCanvasTop = document.createElement('canvas'); mapCanvasTop.width = mapCanvas.width; mapCanvasTop.height = mapCanvas.height;
  var c = mapCanvas.getContext('2d'), top = mapCanvasTop.getContext('2d');
  c.scale(R, R); top.scale(R, R);
  var hash = function (x, y) { return ((x * 73856093) ^ (y * 19349663)) >>> 0; };
  var GRASS = '#c4eba6', GRASS_D = '#aedd8e', STONE = '#f3dcb0', STONE_D = '#e6c896';
  function dots(px, py, col, n, h) { c.fillStyle = col; for (var i = 0; i < n; i++) { var hx = (h >> (i * 5)) & 31, hy = (h >> (i * 5 + 3)) & 31; c.beginPath(); c.arc(px + 3 + hx * 0.82, py + 3 + hy * 0.82, 1.8 + ((h >> i) & 1) * 0.8, 0, 7); c.fill(); } }
  var GROUND = { '.': 'g', '*': 'g', 'T': 'g', 'B': 'g', 'h': 'g', '#': 'st', 'E': 'st', 'F': 'st', '=': 'wd', 's': 'gd', '~': 'wa' };
  // 1. 地面
  for (var y = 0; y < MAPH; y++) for (var x = 0; x < MAPW; x++) {
    var ch = MAP[y][x], px = x * B, py = y * B, h = hash(x, y), gk = GROUND[ch];
    if (ch === 'b') gk = y > 19 ? 'gd' : 'st';
    if (!gk) gk = 'g';
    if (gk === 'g') { c.fillStyle = GRASS; c.fillRect(px, py, B, B); if (h % 3 === 0) dots(px, py, GRASS_D, 2, h); }
    else if (gk === 'st') { c.fillStyle = STONE; c.fillRect(px, py, B, B); dots(px, py, STONE_D, 3, h); }
    else if (gk === 'gd') { c.fillStyle = '#d9f2c0'; c.fillRect(px, py, B, B); if (h % 3 === 0) dots(px, py, '#c6e8a8', 2, h); }
    else if (gk === 'wd') { c.fillStyle = '#f5d39b'; c.fillRect(px, py, B, B); c.fillStyle = '#e6bd7c'; c.fillRect(px, py + 15, B, 2); c.fillRect(px + (y % 2 ? 8 : 24), py, 2, 15); c.fillRect(px + (y % 2 ? 22 : 6), py + 17, 2, 15); }
    else if (gk === 'wa') { c.fillStyle = '#9ad8f5'; c.fillRect(px, py, B, B); c.strokeStyle = '#d4f0fc'; c.lineWidth = 2; c.lineCap = 'round'; if (h % 2) { c.beginPath(); c.arc(px + 12, py + 16, 5, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); } }
  }
  // 池のふち
  edgeGroup('~', '#7fbfe0', 2);
  // 2. 建物など
  for (y = 0; y < MAPH; y++) for (x = 0; x < MAPW; x++) {
    ch = MAP[y][x]; px = x * B; py = y * B; h = hash(x, y);
    switch (ch) {
      case '*': if (h % 2 === 0) { c.font = '15px ' + EMOJI_FONT; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(['🌼', '🌷', '🌸'][h % 3], px + 16, py + 17); } break;
      case 'T': c.fillStyle = '#c08a58'; c.fillRect(px + 13, py + 18, 6, 12);
        top.fillStyle = '#8fd477'; top.strokeStyle = MAP_INK; top.lineWidth = 2; top.beginPath(); top.arc(px + 16, py + 11, 13, 0, 7); top.fill(); top.stroke();
        top.fillStyle = '#b4e89c'; top.beginPath(); top.arc(px + 11, py + 7, 5, 0, 7); top.fill(); break;
      case 'h': c.fillStyle = '#9edb84'; rr(c, px + 1, py + 4, 30, 26, 8); break;
      case 'B': c.fillStyle = '#ecc28e'; c.fillRect(px, py + 13, 32, 4); c.fillRect(px + 4, py + 8, 4, 18); c.fillRect(px + 24, py + 8, 4, 18); break;
      case 'W': case 'S': case '+': case 'D': wall(px, py, x, y, ch);
        if (ch === 'S' && SIGNS[x + ',' + y]) { c.fillStyle = '#fff'; c.strokeStyle = MAP_INK; c.lineWidth = 2; rr(c, px + 4, py + 4, 24, 22, 6); c.stroke(); c.font = '16px ' + EMOJI_FONT; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(SIGNS[x + ',' + y], px + 16, py + 16); }
        if (ch === '+') { c.fillStyle = '#ffd84d'; c.fillRect(px + 14, py + 5, 4, 18); c.fillRect(px + 10, py + 10, 12, 4); }
        if (ch === 'D') { c.fillStyle = '#d99a5e'; c.strokeStyle = MAP_INK; c.lineWidth = 2; rr(c, px + 7, py + 7, 18, 25, 9); c.stroke(); c.fillStyle = '#ffd84d'; c.beginPath(); c.arc(px + 20, py + 21, 2, 0, 7); c.fill(); }
        break;
      case 'R': case 'r': c.fillStyle = ch === 'R' ? '#ffa595' : '#94cdf3'; c.fillRect(px, py, 32, 32); c.fillStyle = ch === 'R' ? '#f78f7f' : '#7dbbe6';
        for (var i = 7; i < 32; i += 9) c.fillRect(px, py + i, 32, 2); break;
      case 'C': c.fillStyle = '#ebe6f5'; c.fillRect(px, py, 32, 32); c.fillStyle = '#d8d0e8'; for (i = 0; i < 32; i += 10) c.fillRect(px, py + i + 8, 32, 2);
        if (tileAt(x, y - 1) === 'T' || y === 0) { c.fillStyle = '#d8d0e8'; for (i = 0; i < 32; i += 10) c.fillRect(px + i + 3, py, 5, 5); } break;
      case 'c': c.fillStyle = '#c9b6f2'; c.fillRect(px, py, 32, 32);
        if ((x === 11 || x === 12) && y === 1) { c.font = '20px ' + EMOJI_FONT; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('🚩', px + 16, py + 12); } break;
      case 'G': c.fillStyle = '#ffd84d'; c.fillRect(px, py, 32, 32); c.fillStyle = '#e8b830'; c.fillRect(px + 15, py + 4, 2, 28); break;
      case 'F': c.fillStyle = '#9ad8f5'; c.strokeStyle = '#d4f0fc'; c.lineWidth = 2;
        var fx = (x === 11 ? 32 : 0), fy = (y === 12 ? 32 : 0); c.save(); c.beginPath(); c.rect(px, py, 32, 32); c.clip();
        c.beginPath(); c.arc(px + fx, py + fy, 28, 0, 7); c.fill(); c.strokeStyle = '#e3d2ae'; c.lineWidth = 5; c.stroke(); c.strokeStyle = MAP_INK; c.lineWidth = 2; c.beginPath(); c.arc(px + fx, py + fy, 31, 0, 7); c.stroke(); c.restore(); break;
      case 'b': c.fillStyle = '#e0a868'; c.strokeStyle = MAP_INK; c.lineWidth = 1.5; rr(c, px + 4, py + 12, 24, 9, 3); c.stroke(); c.fillRect(px + 7, py + 21, 3, 6); c.fillRect(px + 22, py + 21, 3, 6); break;
    }
  }
  // 屋根と壁(と お城)に こげ茶の縁
  edgeGroup('R', MAP_INK, 2); edgeGroup('r', MAP_INK, 2); edgeGroup('WS+D', MAP_INK, 2); edgeGroup('Cc', MAP_INK, 2); edgeGroup('G', MAP_INK, 2);
  // 屋根の上に 場所の名前(看板)
  ROOF_LABEL.forEach(function (L) {
    var cx = (L[0] + L[1] + 1) / 2 * B, cy = (L[2] + 0.5) * B, size = 17 * B / TILE;
    c.font = '900 ' + size + 'px ' + TEXT_FONT; c.textAlign = 'center'; c.textBaseline = 'middle';
    var tw = c.measureText(L[3]).width + 10; c.fillStyle = 'rgba(255,246,230,.95)'; c.strokeStyle = MAP_INK; c.lineWidth = 1.6; rr(c, cx - tw / 2, cy - size * 0.75, tw, size * 1.5, 6); c.stroke();
    c.fillStyle = MAP_INK; c.fillText(L[3], cx, cy + 0.5);
  });
  function wall(px, py, x, y, ch) {
    c.fillStyle = '#fff3dc'; c.fillRect(px, py, 32, 32); c.fillStyle = '#f0dcb4'; c.fillRect(px, py + 28, 32, 4);
    if (x % 2 === 0 && ch === 'W') { c.fillStyle = '#bfe7ff'; c.strokeStyle = MAP_INK; c.lineWidth = 1.5; rr(c, px + 10, py + 8, 12, 11, 3); c.stroke(); }
  }
  function edgeGroup(set, col, lw) { // set の字の かたまりの外側だけに線を引く
    c.strokeStyle = col; c.lineWidth = lw; c.lineCap = 'round'; c.beginPath();
    for (var yy = 0; yy < MAPH; yy++) for (var xx = 0; xx < MAPW; xx++) {
      if (set.indexOf(MAP[yy][xx]) < 0) continue;
      var X = xx * B, Y = yy * B, o = lw / 2, isIn = function (a, b) { return a >= 0 && b >= 0 && a < MAPW && b < MAPH && set.indexOf(MAP[b][a]) >= 0; };
      if (!isIn(xx, yy - 1)) { c.moveTo(X, Y + o); c.lineTo(X + B, Y + o); }
      if (!isIn(xx, yy + 1)) { c.moveTo(X, Y + B - o); c.lineTo(X + B, Y + B - o); }
      if (!isIn(xx - 1, yy)) { c.moveTo(X + o, Y); c.lineTo(X + o, Y + B); }
      if (!isIn(xx + 1, yy)) { c.moveTo(X + B - o, Y); c.lineTo(X + B - o, Y + B); }
    }
    c.stroke();
  }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); c.fill(); }
}

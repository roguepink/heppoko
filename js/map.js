'use strict';
/* 町のマップ(24×24)。記号の意味は docs/design-ui.md 2-2。裏 canvas に1回描いて、毎フレームは切り出すだけ。 */
var TILE = 32, MAPW = 24, MAPH = 24;
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
  'Tss~~~ss..####......WDWT',
  'TsbssssB..####.=======.T',
  'TTTTTTTTTT#EE#TTTTTTTTTT'
];
var PASS = { '.': 1, '*': 1, '=': 1, '#': 1, 's': 1, 'D': 2, 'G': 2, 'E': 3 };
/* 扉 → 場所 */
var DOORS = { '2,9': 'weapon', '7,9': 'armor', '15,9': 'church', '20,9': 'inn', '2,18': 'accessory', '7,18': 'zakka', '18,19': 'home', '21,21': 'aunt', '11,4': 'castle', '12,4': 'castle' };
var SIGNS = { '2,8': '⚔️', '7,8': '🛡️', '20,8': '🛏️', '2,17': '💍', '7,17': '🧺' };
var START = { x: 18, y: 20 };
function tileAt(x, y) { if (x < 0 || y < 0 || x >= MAPW || y >= MAPH) return 'T'; return MAP[y][x]; }
function passable(x, y) { return (PASS[tileAt(x, y)] || 0) > 0; }

/* 経路探索(BFS)。斜めなし。目標が通れない所なら「主人公から一番近い隣の通れる所」に寄る。 */
function findPath(sx, sy, tx, ty, blocked) {
  if (!passable(tx, ty)) {
    var best = null, bd = 1e9;
    for (var yy = 0; yy < MAPH; yy++) for (var xx = 0; xx < MAPW; xx++) {
      if (!passable(xx, yy) || PASS[tileAt(xx, yy)] >= 2) continue; // 扉・出口には「寄せ」で入らない(壁をタップしただけで店に入ってしまうのを防ぐ)
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

/* 裏 canvas に町を描く */
var mapCanvas = null, mapCanvasTop = null;
function tileColorBase(ch) {
  switch (ch) {
    case '.': case '*': return '#7ec850'; case '=': return '#d9b36b'; case '#': return '#b9b4a8'; case '~': return '#4aa3df';
    case 'T': case 'h': return '#7ec850'; case 'B': case 'b': return '#7ec850'; case 'W': case 'S': case '+': case 'D': return '#f2e6c9';
    case 'R': return '#c0392b'; case 'r': return '#2f6fb0'; case 'C': return '#9aa5b1'; case 'c': return '#6c4fb0'; case 'G': return '#d4a017';
    case 'F': return '#5dc1e8'; case 's': return '#cfe6a8'; case 'E': return '#b9b4a8';
  }
  return '#7ec850';
}
function buildMap() {
  mapCanvas = document.createElement('canvas'); mapCanvas.width = MAPW * TILE; mapCanvas.height = MAPH * TILE;
  mapCanvasTop = document.createElement('canvas'); mapCanvasTop.width = MAPW * TILE; mapCanvasTop.height = MAPH * TILE;
  var c = mapCanvas.getContext('2d'), top = mapCanvasTop.getContext('2d');
  var hash = function (x, y) { return ((x * 73856093) ^ (y * 19349663)) >>> 0; };
  // 1. 地面
  for (var y = 0; y < MAPH; y++) for (var x = 0; x < MAPW; x++) {
    var ch = MAP[y][x], px = x * TILE, py = y * TILE;
    c.fillStyle = tileColorBase(ch); c.fillRect(px, py, TILE, TILE);
    if (ch === '.' || ch === 'T' || ch === 'B' || ch === 'h' || (ch === 'b' && y > 19)) { if (hash(x, y) % 4 === 0) { c.fillStyle = '#6db644'; c.fillRect(px + 6, py + 8, 3, 3); c.fillRect(px + 20, py + 20, 3, 3); } }
    if (ch === '#' || ch === 'E' || (ch === 'b' && y < 19)) { c.fillStyle = '#b9b4a8'; c.fillRect(px, py, TILE, TILE); c.strokeStyle = '#a39e92'; c.lineWidth = 1; c.beginPath(); c.moveTo(px + 16, py); c.lineTo(px + 16, py + 32); c.moveTo(px, py + 16); c.lineTo(px + 32, py + 16); c.stroke(); }
    if (ch === 's' || (ch === 'b' && y > 19)) { c.fillStyle = '#cfe6a8'; c.fillRect(px, py, TILE, TILE); if (hash(x, y) % 3 === 0) { c.fillStyle = '#bcd994'; c.fillRect(px + 10, py + 14, 3, 3); } }
    if (ch === '=') { c.strokeStyle = '#c9a35b'; c.lineWidth = 1; c.strokeRect(px + .5, py + .5, TILE - 1, TILE - 1); }
  }
  // 2. 建物など
  for (y = 0; y < MAPH; y++) for (x = 0; x < MAPW; x++) {
    ch = MAP[y][x]; px = x * TILE; py = y * TILE;
    switch (ch) {
      case '*': c.font = '18px ' + EMOJI_FONT; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(['🌼', '🌷', '🌸'][hash(x, y) % 3], px + 16, py + 17); break;
      case 'T': c.fillStyle = '#6d4c2a'; c.fillRect(px + 12, py + 18, 8, 12);
        top.fillStyle = '#2e7d32'; top.beginPath(); top.arc(px + 16, py + 10, 15, 0, 7); top.fill();
        top.fillStyle = '#43a047'; top.beginPath(); top.arc(px + 11, py + 5, 6, 0, 7); top.fill(); break;
      case 'h': c.fillStyle = '#3d9140'; rr(c, px + 1, py + 4, 30, 26, 6); c.fillStyle = '#52a858'; c.fillRect(px + 3, py + 4, 26, 4); break;
      case 'B': c.fillStyle = '#a0703a'; c.fillRect(px, py + 10, 32, 4); c.fillRect(px, py + 20, 32, 4); c.fillRect(px + 2, py + 6, 4, 22); c.fillRect(px + 14, py + 6, 4, 22); c.fillRect(px + 26, py + 6, 4, 22); break;
      case 'W': case 'S': case '+': wall(c, px, py, x, y); if (ch === 'S' && SIGNS[x + ',' + y]) { c.fillStyle = '#6d4c2a'; rr(c, px + 3, py + 4, 26, 22, 4); c.font = '18px ' + EMOJI_FONT; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(SIGNS[x + ',' + y], px + 16, py + 16); }
        if (ch === '+') { c.fillStyle = '#d4a017'; c.fillRect(px + 14, py + 5, 4, 18); c.fillRect(px + 10, py + 10, 12, 4); } break;
      case 'D': wall(c, px, py, x, y); c.fillStyle = '#8b5a2b'; rr(c, px + 7, py + 6, 18, 26, 8); c.fillStyle = '#ffd54f'; c.fillRect(px + 19, py + 20, 4, 4); break;
      case 'R': case 'r': c.fillStyle = ch === 'R' ? '#c0392b' : '#2f6fb0'; c.fillRect(px, py, 32, 32); c.strokeStyle = ch === 'R' ? '#a93226' : '#285f99'; c.lineWidth = 1;
        for (var i = 4; i < 32; i += 8) { c.beginPath(); c.moveTo(px, py + i); c.lineTo(px + 32, py + i); c.stroke(); }
        if (tileAt(x, y - 1) !== ch) { c.fillStyle = ch === 'R' ? '#d35400' : '#4a8ad0'; c.fillRect(px, py, 32, 3); } break;
      case 'C': c.fillStyle = '#9aa5b1'; c.fillRect(px, py, 32, 32); c.strokeStyle = '#7f8a96'; c.lineWidth = 1;
        for (i = 0; i < 32; i += 8) { c.beginPath(); c.moveTo(px, py + i + .5); c.lineTo(px + 32, py + i + .5); c.stroke(); var off = (i / 8) % 2 ? 8 : 0; c.beginPath(); c.moveTo(px + off + .5, py + i); c.lineTo(px + off + .5, py + i + 8); c.moveTo(px + off + 16.5, py + i); c.lineTo(px + off + 16.5, py + i + 8); c.stroke(); }
        if (tileAt(x, y - 1) === 'T' || y === 0) { c.fillStyle = '#7f8a96'; for (i = 0; i < 32; i += 8) c.fillRect(px + i + 4, py, 4, 4); } break;
      case 'c': c.fillStyle = '#6c4fb0'; c.fillRect(px, py, 32, 32); c.strokeStyle = '#8565c9'; c.lineWidth = 2; c.beginPath(); c.moveTo(px, py + 32); c.lineTo(px + 32, py); c.stroke();
        if ((x === 11 || x === 12) && y === 1) { c.font = '22px ' + EMOJI_FONT; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('🚩', px + 16, py + 12); } break;
      case 'G': c.fillStyle = '#d4a017'; c.fillRect(px, py + 2, 32, 30); c.fillStyle = '#8a6d0b'; c.fillRect(px + 4, py + 8, 4, 4); c.fillRect(px + 24, py + 8, 4, 4); c.fillRect(px + 4, py + 22, 4, 4); c.fillRect(px + 24, py + 22, 4, 4); c.fillStyle = '#b8901a'; c.fillRect(px, py + 2, 32, 3); break;
      case 'F': c.fillStyle = '#5dc1e8'; c.fillRect(px, py, 32, 32); c.strokeStyle = '#8a8578'; c.lineWidth = 4;
        if (y === 12) { c.beginPath(); c.moveTo(px, py + 2); c.lineTo(px + 32, py + 2); c.stroke(); } if (y === 13) { c.beginPath(); c.moveTo(px, py + 30); c.lineTo(px + 32, py + 30); c.stroke(); }
        if (x === 11) { c.beginPath(); c.moveTo(px + 2, py); c.lineTo(px + 2, py + 32); c.stroke(); } if (x === 12) { c.beginPath(); c.moveTo(px + 30, py); c.lineTo(px + 30, py + 32); c.stroke(); } break;
      case 'b': c.fillStyle = '#a0703a'; c.fillRect(px + 3, py + 12, 26, 10); c.fillRect(px + 6, py + 22, 4, 6); c.fillRect(px + 22, py + 22, 4, 6); break;
      case 'E': c.fillStyle = '#ffe066'; c.beginPath(); c.moveTo(px + 16, py + 28); c.lineTo(px + 6, py + 14); c.lineTo(px + 26, py + 14); c.fill(); break;
    }
  }
  function wall(c, px, py, x, y) {
    c.fillStyle = '#f2e6c9'; c.fillRect(px, py, 32, 32); c.fillStyle = '#c9b891'; c.fillRect(px, py + 28, 32, 4);
    if (x % 2 === 0 && MAP[y][x] === 'W') { c.fillStyle = '#8fd3ff'; c.fillRect(px + 11, py + 8, 10, 10); c.strokeStyle = '#6b5a3a'; c.lineWidth = 1; c.strokeRect(px + 10.5, py + 7.5, 11, 11); }
  }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); c.fill(); }
}

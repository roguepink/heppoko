'use strict';
/* 町: 見下ろしマップを歩く・人と話す・扉に入る・仲間が連なる・「🗺️ いく」で行き先を選んで自動で歩く */
var TOWN = (function () {
  var hero = { x: 0, y: 0, px: 0, py: 0, fx: 0, fy: 0, t: 0, moving: false, path: [], dir: 'down', step: 0, land: 0, intent: null, auto: false, targetP: null };
  var trail = [], cam = { x: 0, y: 0 }, target = null, people = [], bottom = null, tipI = 0, tipKey = '', held = null, justIn = false, hintShown = false;
  var VIEW_Y = 52, VIEW_H = 576, SPEED = 0.18, AUTO_SPEED = 0.12, HALF = TILE / 2;
  var INK = '#5a3d2b';
  var PLACE_NAME = { weapon: '⚔️ 武器屋', armor: '🛡️ 防具屋', accessory: '💍 アクセサリー屋', zakka: '🧺 雑貨屋', church: '⛪ 教会', inn: '🛏️ 宿', home: '🏠 へっぽこの家', aunt: '🏡 隣のおばさんの家', castle: '🏰 お城' };
  /* 「🗺️ いく」の行き先(扉の座標は map.js の DOORS から引く) */
  var GO_PLACES = [['weapon', '⚔️', '武器屋'], ['armor', '🛡️', '防具屋'], ['accessory', '💍', 'アクセ屋'], ['zakka', '🧺', '雑貨屋'], ['castle', '🏰', 'お城'], ['church', '⛪', '教会'],
    ['inn', '🛏️', '宿'], ['home', '🏠', 'へっぽこの家'], ['aunt', '🏡', 'おばさんの家'], ['exit', '🚪', '南の出口']];
  var EXITS = [[11, 23], [12, 23]];

  /* この画面だけの見た目 */
  (function css() {
    if (document.getElementById('css-town')) return;
    var st = document.createElement('style'); st.id = 'css-town';
    st.textContent =
      '#ui #bottom{background:var(--cream,#fff6e6);border-top:3px solid var(--ink,#5a3d2b);padding:9px 8px 0;}' +
      '#ui #bottom .row button{border-radius:22px;}' +
      '#ui #bottom .row button.go{background:var(--gold,#ffd84d);flex:1.3;font-size:18px;}' +
      '#ui #bottom .row button.go span.e{font-size:26px;}' +
      '#ui #bottom .stat{color:var(--ink,#5a3d2b);margin-top:8px;}' +
      '#ui #bottom .stat .gz{color:#e0507a;}' +
      '#ui #bottom .tip{color:var(--ink,#5a3d2b);background:#fff;border:3px solid var(--ink,#5a3d2b);border-radius:16px;margin:5px 2px 0;height:44px;padding:0 8px;display:flex;align-items:center;justify-content:center;gap:6px;font-weight:900;font-size:17px;line-height:1.2;cursor:pointer;opacity:1;-webkit-tap-highlight-color:transparent;}' +
      '#ui #bottom .tip:active{transform:scale(.97);}' +
      '#ui #bottom .tip .nx{flex:none;font-size:15px;opacity:.6;}' +
      '#gobox{position:absolute;left:12px;right:12px;top:58px;bottom:16px;background:var(--cream,#fff6e6);color:var(--ink,#5a3d2b);border:4px solid var(--ink,#5a3d2b);border-radius:24px;z-index:9;display:flex;flex-direction:column;padding:14px 12px 12px;}' +
      '#gobox h3{margin:0 0 6px;font-size:24px;text-align:center;font-weight:900;}' +
      '#gobox .scr{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:2px 2px 8px;}' +
      '#gobox .sec{font-size:18px;font-weight:900;margin:12px 2px 8px;}' +
      '#gobox .note{font-size:17px;font-weight:800;margin:4px 2px;opacity:.85;}' +
      '#gobox .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 8px;}' +
      '#gobox .grid button{min-height:62px;border-radius:22px;font-size:18px;display:flex;align-items:center;gap:6px;justify-content:flex-start;padding:4px 10px;text-align:left;line-height:1.15;}' +
      '#gobox .grid button .e{font-size:28px;flex:none;line-height:1;}' +
      '#gobox .grid button.pl{background:#fff;}' +
      '#gobox .grid button.exit{background:var(--gold,#ffd84d);}' +
      '#gobox .grid button.cp{background:#ffe3f1;}' +
      '#gobox .grid button small{display:block;font-size:15px;opacity:.75;font-weight:800;}' +
      '#gobox .close{margin-top:8px;min-height:58px;border-radius:22px;background:#fff;width:100%;}';
    document.head.appendChild(st);
  })();

  function buildPeople() {
    people = [];
    DATA.NPCS.forEach(function (n) { if (INTERIOR[n.id]) return; people.push({ kind: 'npc', ref: n, id: n.id, x: n.x, y: n.y, hx: n.x, hy: n.y, emoji: n.emoji, wait: rnd(1, 4), fx: 0, fy: 0, t: 0, off: Math.random() * 1.5 }); });
    DATA.COMPANIONS.forEach(function (c) { if (!c.where || P.party.indexOf(c.id) >= 0) return; people.push({ kind: 'comp', ref: c, id: c.id, x: c.where.x, y: c.where.y, hx: c.where.x, hy: c.where.y, emoji: c.emoji, wait: rnd(2, 6), fx: 0, fy: 0, t: 0, off: Math.random() * 1.5 }); });
    hero.targetP = null;
  }
  function personAt(x, y) { for (var i = 0; i < people.length; i++) if (people[i].x === x && people[i].y === y) return people[i]; return null; }
  function occupied(x, y) { return personAt(x, y) || (hero.x === x && hero.y === y); }
  function blockedMap() { var b = {}; people.forEach(function (p) { b[p.x + ',' + p.y] = 1; }); return b; }
  function camTarget(px, py) { return { x: clamp(px * TILE + HALF - W / 2, 0, MAPW * TILE - W), y: clamp(py * TILE + HALF - VIEW_H / 2, 0, MAPH * TILE - VIEW_H) }; }
  function setHero(x, y) { hero.x = x; hero.y = y; hero.px = x; hero.py = y; hero.moving = false; hero.path = []; hero.intent = null; hero.auto = false; trail = []; for (var i = 0; i < 12; i++) trail.push({ x: x, y: y + 1 + i }); var c = camTarget(x, y); cam.x = c.x; cam.y = c.y; }
  function isEntry(x, y) { return PASS[tileAt(x, y)] >= 2; } // 扉・出口

  /* ---------- 下の帯 ---------- */
  function buildBottom() {
    bottom = el('div', ''); bottom.id = 'bottom';
    var row = el('div', 'row');
    row.appendChild(btn('<span class="e">🎽</span>そうび', 'orange', function () { pushScene('equip'); }));
    row.appendChild(btn('<span class="e">👥</span>なかま', 'leaf', function () { pushScene('party'); }));
    row.appendChild(btn('<span class="e">🎒</span>もちもの', 'sky', function () { pushScene('items'); }));
    row.appendChild(btn('<span class="e">🗺️</span>いく', 'go', function () { openGo(); }));
    var tip = el('div', 'tip', '');
    tip.addEventListener('click', function (ev) { ev.stopPropagation(); tipI++; setTip(); });
    bottom.appendChild(row); bottom.appendChild(el('div', 'stat', '')); bottom.appendChild(tip); ui.appendChild(bottom);
  }
  function refreshStat() { if (!bottom) return; var st = heroStats(); var g = roleCounts().guard; bottom.querySelector('.stat').innerHTML = '⚔️攻 ' + st.atk + ' 🛡️守 ' + st.def + ' ❤️HP ' + st.hp + ' 👥 ' + P.party.length + '/10組 <span' + (g ? '' : ' class="gz"') + '>🛡️×' + g + '</span>'; setTip(); }
  /* 今やること(状況から決める。タップで次の案内) */
  function tipList() {
    var L = [], n = P.party.length, rc = roleCounts(), eq = P.equip, on = equippedIds();
    var notWorn = P.items.some(function (id) { return ITEMS[id] && ITEMS[id].slot && on.indexOf(id) < 0; });
    if (notWorn) L.push('買った物は 🎽そうび で つけよう');
    if (!eq.rhand && !eq.lhand) L.push('次は ⚔️武器屋で 武器を 買おう');
    if (n < 3) L.push('次は 仲間を さがそう ' + n + '/10');
    if (!eq.body && !eq.head) L.push('次は 🛡️防具屋で 防具を 買おう');
    if (n > 0 && !rc.guard) L.push('🛡️まもり役の 仲間が いない!');
    if (n >= 3 && n < 10) L.push('仲間は ' + n + '/10。まだ さそえる');
    L.push('じゅんび OK? 🗺️で 南の出口へ!');
    L.push('🗺️いく で 行きたい所へ 自動で 歩くよ');
    L.push('足もとが ピンクの人は 仲間に なってくれる(近づくと 💬)');
    return L;
  }
  function setTip() {
    if (!bottom || !P) return;
    var L = tipList(); if (L[0] !== tipKey) { tipKey = L[0]; tipI = 0; }
    var s = L[tipI % L.length];
    bottom.querySelector('.tip').innerHTML = '<span>👉 ' + esc(s) + '</span><span class="nx">▶</span>';
  }

  /* ---------- 「🗺️ いく」の窓 ---------- */
  function doorOf(place) {
    var best = null, bd = 1e9;
    if (place === 'exit') EXITS.forEach(function (e) { var d = Math.abs(e[0] - hero.x) + Math.abs(e[1] - hero.y); if (d < bd) { bd = d; best = { x: e[0], y: e[1] }; } });
    else for (var k in DOORS) if (DOORS[k] === place) { var p = k.split(',').map(Number), d = Math.abs(p[0] - hero.x) + Math.abs(p[1] - hero.y); if (d < bd) { bd = d; best = { x: p[0], y: p[1] }; } }
    return best;
  }
  function openGo() {
    if (DIALOG.isActive() || document.getElementById('gobox')) return;
    var shade = el('div', ''); shade.id = 'shade'; var box = el('div', ''); box.id = 'gobox';
    function close() { shade.remove(); box.remove(); }
    shade.addEventListener('click', close);
    box.appendChild(el('h3', '', '🗺️ どこへ いく?'));
    var scr = el('div', 'scr'); box.appendChild(scr);
    scr.appendChild(el('div', 'sec', '🏘️ 行き先'));
    var g1 = el('div', 'grid');
    GO_PLACES.forEach(function (pl) {
      g1.appendChild(btn('<span class="e">' + pl[1] + '</span><span>' + pl[2] + '</span>', pl[0] === 'exit' ? 'exit' : 'pl', function () { close(); goPlace(pl[0]); }));
    });
    scr.appendChild(g1);
    var cands = people.filter(function (p) { return p.kind === 'comp'; });
    cands.sort(function (a, b) { return (Math.abs(a.x - hero.x) + Math.abs(a.y - hero.y)) - (Math.abs(b.x - hero.x) + Math.abs(b.y - hero.y)); });
    scr.appendChild(el('div', 'sec', '🤝 まだ さそっていない 仲間候補(' + cands.length + ')'));
    if (P.party.length >= 10) scr.appendChild(el('div', 'note', '仲間は 10組 いっぱい。話すだけなら できるよ。'));
    if (!cands.length) scr.appendChild(el('div', 'note', '町の 仲間候補は もう いない。'));
    var g2 = el('div', 'grid');
    cands.forEach(function (p) {
      g2.appendChild(btn('<span class="e">' + esc(p.emoji) + '</span><span>' + esc(p.ref.name) + '</span>', 'cp', function () { close(); approach(p, true); }));
    });
    scr.appendChild(g2);
    box.appendChild(btn('とじる', 'close', close));
    ui.appendChild(shade); ui.appendChild(box);
  }
  function goPlace(place) {
    var d = doorOf(place); if (!d) return;
    if (hero.x === d.x && hero.y === d.y) { justIn = false; hero.intent = d.x + ',' + d.y; arrive(); return; }
    if (walkTo(d.x, d.y)) { hero.intent = d.x + ',' + d.y; hero.auto = true; }
  }

  /* ---------- 目標までの道 ---------- */
  function walkTo(tx, ty, then) {
    var path = findPath(hero.x, hero.y, tx, ty, blockedMap());
    if (!path) path = findPath(hero.x, hero.y, tx, ty, null); // 人に囲まれて道がないときは、人を無視した道で(人と入れかわりながら)進む
    if (!path) { hero.q = '❓'; hero.qt = 0.7; return false; }
    hero.path = path; hero.then = then || null; hero.intent = null; hero.auto = false; target = path.length ? path[path.length - 1] : null; return true;
  }
  function approach(p, auto) { // 人の隣まで歩いて話す
    hero.targetP = p;
    if (Math.abs(p.x - hero.x) + Math.abs(p.y - hero.y) === 1) { face(p.x, p.y); hero.targetP = null; talkTo(p); return; }
    var best = null, bd = 1e9;
    [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(function (d) { var x = p.x + d[0], y = p.y + d[1]; if (!passable(x, y) || personAt(x, y) || isEntry(x, y)) return; var pt = findPath(hero.x, hero.y, x, y, blockedMap()); if (pt && pt.length < bd) { bd = pt.length; best = { x: x, y: y }; } });
    if (!best) [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(function (d) { var x = p.x + d[0], y = p.y + d[1]; if (!passable(x, y) || isEntry(x, y)) return; var pt = findPath(hero.x, hero.y, x, y, null); if (pt && pt.length < bd) { bd = pt.length; best = { x: x, y: y }; } });
    if (best && walkTo(best.x, best.y, function () { hero.targetP = null; face(p.x, p.y); talkTo(p); })) { hero.auto = !!auto; }
    else { hero.targetP = null; hero.q = '❓'; hero.qt = 0.7; }
  }
  /* 扉・出口を「ねらって」タップしたか(扉の真ん中から 30px 以内) */
  function entryNear(wx, wy) {
    var best = null, bd = 31;
    function chk(x, y) { var dx = Math.abs(wx - (x * TILE + HALF)), dy = Math.abs(wy - (y * TILE + HALF)); var d = Math.max(dx, dy); if (d < bd) { bd = d; best = { x: x, y: y }; } }
    for (var k in DOORS) { var p = k.split(',').map(Number); chk(p[0], p[1]); }
    EXITS.forEach(function (e) { chk(e[0], e[1]); });
    return best;
  }
  function tapAt(wx, wy) {
    if (DIALOG.isActive()) return;
    var tx = Math.floor(wx / TILE), ty = Math.floor(wy / TILE);
    var p = personAt(tx, ty);
    if (p) { approach(p, false); return; }
    var e = entryNear(wx, wy);
    if (e) { // 扉そのものをタップ = 入りたい
      if (hero.x === e.x && hero.y === e.y) { justIn = false; hero.intent = e.x + ',' + e.y; arrive(); return; }
      if (walkTo(e.x, e.y)) hero.intent = e.x + ',' + e.y;
      return;
    }
    walkTo(tx, ty); // ふつうの所: 歩くだけ(道の終わりが扉でも入らない)
  }
  function face(x, y) { hero.dir = y > hero.y ? 'down' : y < hero.y ? 'up' : x > hero.x ? 'right' : 'left'; }
  function talkTo(p) {
    AUDIO.sfx('talk'); P.talked[p.id] = (P.talked[p.id] || 0) + 1;
    if (p.kind === 'comp') { RECRUIT.start(p.ref, function (joined) { if (joined) { buildPeople(); refreshStat(); } }); return; }
    var n = p.ref, ls = n.lines || ['…'];
    var line = ls[(P.talked[p.id] - 1) % ls.length];
    if (n.id === 'lost_slime' && !P.flags.foundSlime) { P.flags.foundSlime = true; say({ name: n.name, emoji: n.emoji }, [line, 'ぷるん… (おかあさんの ところへ 帰っていった)'], function () { toast('まいごの 子スライムを 見つけた!'); }); return; }
    say({ name: n.name, emoji: n.emoji }, [line]);
  }
  function arrive() {
    var ch = tileAt(hero.x, hero.y), k = hero.x + ',' + hero.y;
    var want = hero.intent === k; hero.intent = null; hero.auto = false;
    if (hero.then) { var f = hero.then; hero.then = null; f(); return; }
    if (!want) return; // ねらっていない扉には入らない
    if (PASS[ch] === 2 && DOORS[k] && !justIn) { AUDIO.sfx('door'); autosave(); pushScene(DOORS[k]); return; }
    if (PASS[ch] === 3) { go('confirmBoss'); return; }
  }
  function stepDir(dx, dy) {
    if (hero.moving || DIALOG.isActive()) return;
    hero.dir = dy > 0 ? 'down' : dy < 0 ? 'up' : dx > 0 ? 'right' : 'left';
    var nx = hero.x + dx, ny = hero.y + dy;
    if (!passable(nx, ny)) return;
    var p = personAt(nx, ny); if (p) { talkTo(p); return; }
    hero.path = [{ x: nx, y: ny }]; hero.then = null; target = null; hero.auto = false;
    hero.intent = isEntry(nx, ny) ? nx + ',' + ny : null; // 扉に向かって歩いた = 入る
  }
  function update(dt) {
    if (hero.qt > 0) hero.qt -= dt;
    if (hero.land > 0) hero.land -= dt;
    if (held) stepDir(held[0], held[1]);
    if (!hero.moving && hero.path.length) {
      var n = hero.path[0];
      var bp = personAt(n.x, n.y);
      if (bp) { // 行く先に人が立っていた(細い道をふさぐ人がいる): その人と場所を入れかわって、先へ進む。詰まらない
        bp.fx = bp.x; bp.fy = bp.y; bp.x = hero.x; bp.y = hero.y; bp.t = 1; bp.wait = rnd(1, 3);
      }
      hero.path.shift(); face(n.x, n.y); hero.fx = hero.x; hero.fy = hero.y; hero.x = n.x; hero.y = n.y; hero.moving = true; hero.t = 0; justIn = false;
      trail.unshift({ x: hero.fx, y: hero.fy }); if (trail.length > 14) trail.pop(); hero.step++; if (hero.step % 4 === 0) AUDIO.sfx('step');
    }
    if (hero.moving) {
      hero.t += dt / (hero.auto ? AUTO_SPEED : SPEED);
      if (hero.t >= 1) { hero.t = 1; hero.moving = false; hero.land = 0.14; hero.px = hero.x; hero.py = hero.y; if (!hero.path.length) { target = null; arrive(); } }
      else { hero.px = lerp(hero.fx, hero.x, hero.t); hero.py = lerp(hero.fy, hero.y, hero.t); }
    }
    // カメラ(へっぽこを追う)
    var c = camTarget(hero.px, hero.py);
    cam.x += (c.x - cam.x) * Math.min(1, dt * 8); cam.y += (c.y - cam.y) * Math.min(1, dt * 8);
    // 人の うろうろ
    people.forEach(function (p) {
      if (p.t > 0) { p.t -= dt / 0.5; if (p.t <= 0) { p.t = 0; p.fx = p.x; p.fy = p.y; } return; }
      p.wait -= dt; if (p.wait > 0) return; p.wait = rnd(2, 6);
      if (p === hero.targetP) return; // 話しに行く相手は 待っていてくれる
      if (DIALOG.isActive() && Math.abs(p.x - hero.x) + Math.abs(p.y - hero.y) <= 1) return; // 話している相手は動かない
      var d = pick([[1, 0], [-1, 0], [0, 1], [0, -1]]), nx = p.x + d[0], ny = p.y + d[1];
      if (Math.abs(nx - p.hx) > 1 || Math.abs(ny - p.hy) > 1) return;
      if (!passable(nx, ny) || isEntry(nx, ny) || occupied(nx, ny)) return;
      if (hero.path.some(function (q) { return q.x === nx && q.y === ny; })) return;
      p.fx = p.x; p.fy = p.y; p.x = nx; p.y = ny; p.t = 1;
    });
  }

  /* ---------- 描く ---------- */
  function shadow(x, y, rx) { ctx.fillStyle = 'rgba(90,61,43,.20)'; ctx.beginPath(); ctx.ellipse(x, y, rx, rx * 0.3, 0, 0, 7); ctx.fill(); }
  function drawPerson(e, x, y, bob, big) {
    var s = big || 34;
    shadow(x, y + 15, s * 0.36);
    ATL.draw(e, x, y - 2 - bob, s);
  }
  function groupDraw(c, x, y, bob) {
    var n = c.count || 1;
    if (n <= 1) drawPerson(c.emoji, x, y, bob);
    else if (n < 10) { drawPerson(c.emoji, x - 6, y - 2, bob, 25); ATL.draw(c.emoji, x + 8, y + 2 - bob, 25); }
    else { drawPerson(c.emoji, x, y - 6, bob, 20); ATL.draw(c.emoji, x - 10, y + 4 - bob, 20); ATL.draw(c.emoji, x + 10, y + 4 - bob, 20); if (n >= 100) { rrect(x + 2, y + 7, 26, 14, 4, INK); txt(String(n), x + 15, y + 14, 11, '#fff', 'center', 900, null); } }
  }
  function hop(p) { // 止まっていても 1.5秒ごとに 3px ぴょこっ
    if (p.t > 0) return Math.abs(Math.sin(p.t * Math.PI)) * 4;
    var ph = (G.t + p.off) % 1.5; return ph < 0.28 ? Math.sin(ph / 0.28 * Math.PI) * 3 : 0;
  }
  function bubble(x, y) { // 仲間候補の 白い丸い吹き出し
    var k = 1 + 0.06 * Math.sin(G.t * 4);
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = INK; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-5, 8); ctx.lineTo(-9, 15); ctx.lineTo(1, 10); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 11, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-5, 7); ctx.lineTo(1, 9); ctx.lineTo(-2, 4); ctx.fill();
    ctx.restore();
    ATL.draw('💬', x, y + 0.5, 16);
  }
  function drawHero(x, y) { // x,y = マスの真ん中。着せ替え人形(縦48px)
    var bob = hero.moving ? Math.sin(hero.t * Math.PI) * 8 : 0;
    var sq = hero.land > 0 ? hero.land / 0.14 : 0, sx = 1 + 0.1 * sq, sy = 1 - 0.1 * sq;
    var foot = y + 16;
    shadow(x, foot, 13 - bob * 0.6);
    ctx.save(); ctx.translate(x, foot); ctx.scale(hero.dir === 'left' ? -sx : sx, sy); ctx.translate(0, -bob);
    DOLL.draw(0, -23.4, 0.12, { noEmpty: true });
    ctx.restore();
    if (hero.qt > 0) ATL.draw(hero.q, x + 16, y - 34, 20);
  }
  function label(s, x, y, fill) {
    ctx.font = '900 17px ' + TEXT_FONT; var tw = ctx.measureText(s).width + 16;
    x = clamp(x, tw / 2 + 4, W - tw / 2 - 4);
    rrect(x - tw / 2, y - 13, tw, 26, 10, fill || 'rgba(255,246,230,.96)', INK, 2); txt(s, x, y + 1, 17, INK, 'center', 900, null);
  }
  function draw() {
    ctx.fillStyle = '#fff6e6'; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.beginPath(); ctx.rect(0, VIEW_Y, W, VIEW_H); ctx.clip();
    var ox = -Math.round(cam.x), oy = VIEW_Y - Math.round(cam.y), MW = MAPW * TILE, MH = MAPH * TILE;
    if (mapCanvas) ctx.drawImage(mapCanvas, ox, oy, MW, MH);
    // 噴水の水
    for (var i = 0; i < 3; i++) { var ph = (G.t * 1.25 + i / 3) % 1; ATL.draw('💧', ox + 12 * TILE + (i - 1) * 14, oy + 13 * TILE - 12 - Math.sin(ph * Math.PI) * 28, 16, 1 - ph * 0.5); }
    // 南の出口の矢印(いつも出す・ぴょこぴょこ)
    var ex = ox + 12 * TILE, ey = oy + 23 * TILE + 20 + Math.sin(G.t * 4) * 5;
    ctx.fillStyle = '#ffd84d'; ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(ex - 12, ey - 22); ctx.lineTo(ex + 12, ey - 22); ctx.lineTo(ex + 12, ey - 8); ctx.lineTo(ex + 24, ey - 8); ctx.lineTo(ex, ey + 14); ctx.lineTo(ex - 24, ey - 8); ctx.lineTo(ex - 12, ey - 8); ctx.closePath(); ctx.fill(); ctx.stroke();
    // 目標の輪
    if (target) { ctx.strokeStyle = '#ffb35c'; ctx.lineWidth = 4; ctx.globalAlpha = 0.5 + 0.5 * Math.abs(Math.sin(G.t * 5)); ctx.beginPath(); ctx.ellipse(ox + target.x * TILE + HALF, oy + target.y * TILE + HALF + 8, 17, 9, 0, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; }
    // 描く順: y が小さいものから(人・仲間・主人公)
    var list = [], near = [];
    people.forEach(function (p) {
      var px = p.t > 0 ? lerp(p.fx, p.x, 1 - p.t) : p.x, py = p.t > 0 ? lerp(p.fy, p.y, 1 - p.t) : p.y;
      var x = ox + px * TILE + HALF, y = oy + py * TILE + HALF;
      if (x < -40 || x > W + 40 || y < VIEW_Y - 50 || y > VIEW_Y + VIEW_H + 50) return;
      var dist = Math.abs(p.x - hero.x) + Math.abs(p.y - hero.y);
      if (dist <= 2) near.push({ p: p, x: x, y: y, d: dist });
      list.push({ y: py, f: function () {
        var b = hop(p);
        if (p.kind === 'comp') {
          /* ふだんは 足もとの うすい ピンクの輪だけ。近く(3マス以内)に来たら 💬 の吹き出しを出す */
          var close3 = dist <= 3, a = close3 ? 0.6 + 0.4 * Math.sin(G.t * 4) : 0.45;
          ctx.strokeStyle = 'rgba(255,143,200,' + a + ')'; ctx.lineWidth = close3 ? 4 : 3; ctx.beginPath(); ctx.ellipse(x, y + 15, 18, 6, 0, 0, 7); ctx.stroke();
          groupDraw(p.ref, x, y, b); if (close3) bubble(x + 16, y - 30 - b);
        } else drawPerson(p.emoji, x, y, b);
      } });
    });
    partyComps().forEach(function (c, i) { var t = trail[i] || trail[trail.length - 1]; if (!t) return; var nx = i === 0 ? { x: hero.fx, y: hero.fy } : (trail[i - 1] || t); var k = hero.moving ? hero.t : 1; var x = lerp(t.x, nx.x, k), y = lerp(t.y, nx.y, k); if (!hero.moving) { x = (i === 0 ? trail[0] : trail[i - 1] || t); y = x.y; x = x.x; }
      var bob = hero.moving ? Math.abs(Math.sin((hero.t + i * 0.2) * Math.PI)) * 4 : 0; list.push({ y: y, f: function () { groupDraw(c, ox + x * TILE + HALF, oy + y * TILE + HALF, bob); } }); });
    list.push({ y: hero.py + 0.01, f: function () { drawHero(ox + hero.px * TILE + HALF, oy + hero.py * TILE + HALF); } });
    list.sort(function (a, b) { return a.y - b.y; }).forEach(function (o) { o.f(); });
    if (mapCanvasTop) ctx.drawImage(mapCanvasTop, ox, oy, MW, MH);
    // 場所の名前は 屋根の看板に書いてある(扉のそばに重ねて出すと へっぽこが かくれるので出さない)
    // 南の出口の札
    label(Math.abs(11.5 - hero.x) <= 3 && hero.y >= 20 ? '▼ 大魔王の ところへ' : '▼ 南の出口', ex, ey - 40, 'rgba(255,216,77,.97)');
    // 近く(2マス)の人に 名前の札(いちばん近い1人。へっぽこに かぶるときは 足もとに出す)
    near.sort(function (a, b) { return a.d - b.d; });
    if (near.length) {
      var o = near[0], nm = o.p.kind === 'comp' ? '🤝 ' + o.p.ref.name : o.p.ref.name;
      ctx.font = '900 17px ' + TEXT_FONT; var tw = ctx.measureText(nm).width + 16, lx = clamp(o.x, tw / 2 + 4, W - tw / 2 - 4);
      var hx = ox + hero.px * TILE + HALF, hy = oy + hero.py * TILE + HALF;
      var cover = function (ly) { return Math.abs(hx - lx) < (40 + tw) / 2 && ly + 13 > hy - 50 && ly - 13 < hy + 20; };
      var ly = o.y - (o.p.kind === 'comp' ? 58 : 42);
      if (cover(ly) || ly < VIEW_Y + 14) ly = o.y + 34;
      if (!cover(ly) && ly < VIEW_Y + VIEW_H - 14) label(nm, lx, ly, o.p.kind === 'comp' ? 'rgba(255,227,241,.97)' : null);
    }
    ctx.restore();
    if (SETTINGS.dpad) drawDpad();
  }
  var DPAD = { x: 212, y: 450, s: 56 };
  function drawDpad() {
    var k = [[1, 0, '▲', 0, -1], [0, 1, '◀', -1, 0], [2, 1, '▶', 1, 0], [1, 2, '▼', 0, 1]];
    k.forEach(function (a) { var x = DPAD.x + a[0] * DPAD.s, y = DPAD.y + a[1] * DPAD.s, on = held && held[0] === a[3] && held[1] === a[4]; rrect(x + 2, y + 2, DPAD.s - 4, DPAD.s - 4, 10, on ? 'rgba(255,216,77,.9)' : 'rgba(255,255,255,.6)', 'rgba(90,61,43,.7)', 2); txt(a[2], x + DPAD.s / 2, y + DPAD.s / 2, 22, INK, 'center', 900, null); });
  }
  function dpadHit(x, y) { if (!SETTINGS.dpad) return null; var cx = Math.floor((x - DPAD.x) / DPAD.s), cy = Math.floor((y - DPAD.y) / DPAD.s); if (cx < 0 || cy < 0 || cx > 2 || cy > 2) return null; if (cx === 1 && cy === 0) return [0, -1]; if (cx === 0 && cy === 1) return [-1, 0]; if (cx === 2 && cy === 1) return [1, 0]; if (cx === 1 && cy === 2) return [0, 1]; return 'pad'; }

  SCENES.town = {
    enter: function (arg, prev) {
      HUD.show(); HUD.setPlace('へっぽこの町'); AUDIO.bgm('town');
      if (!bottom) buildBottom(); show(bottom);
      buildPeople();
      if (arg && arg.fresh) { setHero(START.x, START.y); if (!hintShown) { hintShown = true; setTimeout(function () { say({ name: 'ママ', emoji: '👩' }, ['へっぽこ、行ってらっしゃい。', '行きたい所を タップすると 歩くよ。', '下の「🗺️ いく」を おすと、お店や 仲間の ところへ 自動で 行けるよ。', '人に 話しかけて、仲間を さがしてね。南の 出口から 大魔王の ところへ 行けるよ。']); }, 300); } }
      else if (prev !== 'confirmBoss' && prev !== 'showoff' && prev !== 'equip' && prev !== 'party' && prev !== 'items' && prev !== 'town') { setHero(P.x, P.y); justIn = isEntry(P.x, P.y); }
      else if (hero.x === 0 && hero.y === 0) setHero(P.x, P.y);
      if (prev === 'confirmBoss') { justIn = true; walkTo(hero.x, hero.y - 1); }
      if (arg && (arg.from === 'lose' || arg.from === 'ending')) setHero(START.x, START.y);
      refreshStat();
      P.x = hero.x; P.y = hero.y; autosave(); // 町に もどるたびに 自動で 保存
    },
    leave: function () { P.x = hero.x; P.y = hero.y; if (bottom) hide(bottom); held = null; DIALOG.close(); var gb = document.getElementById('gobox'); if (gb) { gb.remove(); var sh = document.getElementById('shade'); if (sh) sh.remove(); } },
    update: update, draw: draw,
    tap: function (x, y) {
      if (DIALOG.tap()) return;
      if (y < VIEW_Y || y >= VIEW_Y + VIEW_H) return;
      var d = dpadHit(x, y); if (d) { if (d !== 'pad') { held = d; stepDir(d[0], d[1]); } return; }
      tapAt(x + cam.x, y - VIEW_Y + cam.y);
    },
    tapUp: function () { held = null; },
    key: function (k) {
      if (DIALOG.isActive()) { if (k === ' ' || k === 'Enter') DIALOG.tap(); return; }
      var m = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] }[k];
      if (m) stepDir(m[0], m[1]);
    },
    refresh: function () { refreshStat(); buildPeople(); }
  };
  return { hero: hero, refresh: function () { refreshStat(); buildPeople(); }, people: function () { return people; }, openGo: openGo, goPlace: goPlace };
})();

'use strict';
/* 町: 見下ろしマップを歩く・人と話す・扉に入る・仲間が連なる */
var TOWN = (function () {
  var hero = { x: 0, y: 0, px: 0, py: 0, fx: 0, fy: 0, t: 0, moving: false, path: [], dir: 'down', step: 0 };
  var trail = [], cam = { x: 0, y: 0 }, target = null, people = [], bottom = null, tipI = 0, tipT = 0, held = null, justIn = false, hintShown = false;
  var VIEW_Y = 52, VIEW_H = 576, SPEED = 0.18;
  var TIPS = ['噴水の 広場で 人に 話しかけてみよう', '店の 扉に 乗ると 中に 入れる', '仲間は 10組まで。おばさんは 強いらしい…', '装備すると「見た目」が 大画面で 出るよ', '南の 出口から 大魔王の ところへ', '買った物は「そうび」で つけかえ', '仲間の 誘い方は いろいろ。お金・お願い・なぞなぞ', 'セーブは「セーブ」ボタンで いつでも'];

  function buildPeople() {
    people = [];
    DATA.NPCS.forEach(function (n) { if (INTERIOR[n.id]) return; people.push({ kind: 'npc', ref: n, id: n.id, x: n.x, y: n.y, hx: n.x, hy: n.y, emoji: n.emoji, wait: rnd(1, 4), fx: 0, fy: 0, t: 0 }); });
    DATA.COMPANIONS.forEach(function (c) { if (!c.where || P.party.indexOf(c.id) >= 0) return; people.push({ kind: 'comp', ref: c, id: c.id, x: c.where.x, y: c.where.y, hx: c.where.x, hy: c.where.y, emoji: c.emoji, wait: rnd(2, 6), fx: 0, fy: 0, t: 0 }); });
  }
  function personAt(x, y) { for (var i = 0; i < people.length; i++) if (people[i].x === x && people[i].y === y) return people[i]; return null; }
  function occupied(x, y) { return personAt(x, y) || (hero.x === x && hero.y === y); }
  function blockedMap() { var b = {}; people.forEach(function (p) { b[p.x + ',' + p.y] = 1; }); return b; }
  function setHero(x, y) { hero.x = x; hero.y = y; hero.px = x; hero.py = y; hero.moving = false; hero.path = []; trail = []; for (var i = 0; i < 12; i++) trail.push({ x: x, y: y + 1 + i }); cam.x = clamp(x * TILE + 16 - 195, 0, MAPW * TILE - W); cam.y = clamp(y * TILE + 16 - VIEW_H / 2, 0, MAPH * TILE - VIEW_H); }

  /* 下の帯 */
  function buildBottom() {
    bottom = el('div', ''); bottom.id = 'bottom';
    var row = el('div', 'row');
    row.appendChild(btn('<span class="e">🎽</span>そうび', 'orange', function () { pushScene('equip'); }));
    row.appendChild(btn('<span class="e">👥</span>なかま', 'leaf', function () { pushScene('party'); }));
    row.appendChild(btn('<span class="e">🎒</span>もちもの', 'sky', function () { pushScene('items'); }));
    row.appendChild(btn('<span class="e">💾</span>セーブ', 'lav', function () { toast(saveGame() ? '✅ セーブした' : '❌ 保存できなかった'); }));
    bottom.appendChild(row); bottom.appendChild(el('div', 'stat', '')); bottom.appendChild(el('div', 'tip', '')); ui.appendChild(bottom);
  }
  function refreshStat() { if (!bottom) return; var st = heroStats(); bottom.querySelector('.stat').textContent = '⚔️ 攻 ' + st.atk + '  🛡️ 守 ' + st.def + '  ❤️ HP ' + st.hp + '   👥 ' + P.party.length + '/10組'; }
  function setTip(s) { if (bottom) bottom.querySelector('.tip').textContent = '💬 ' + s; }

  /* 目標までの道 */
  function walkTo(tx, ty, then) {
    var path = findPath(hero.x, hero.y, tx, ty, blockedMap());
    if (!path) { hero.q = '❓'; hero.qt = 0.7; return false; }
    hero.path = path; hero.then = then || null; target = path.length ? path[path.length - 1] : null; return true;
  }
  function tapTile(tx, ty) {
    if (DIALOG.isActive()) return;
    var p = personAt(tx, ty);
    if (p) { // 隣まで歩いて話す
      if (Math.abs(p.x - hero.x) + Math.abs(p.y - hero.y) === 1) { face(p.x, p.y); talkTo(p); return; }
      var best = null, bd = 1e9; [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(function (d) { var x = p.x + d[0], y = p.y + d[1]; if (!passable(x, y) || personAt(x, y) || PASS[tileAt(x, y)] >= 2) return; var pt = findPath(hero.x, hero.y, x, y, blockedMap()); if (pt && pt.length < bd) { bd = pt.length; best = { x: x, y: y }; } });
      if (best) walkTo(best.x, best.y, function () { face(p.x, p.y); talkTo(p); }); else { hero.q = '❓'; hero.qt = 0.7; }
      return;
    }
    walkTo(tx, ty);
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
    if (hero.then) { var f = hero.then; hero.then = null; f(); return; }
    if (PASS[ch] === 2 && DOORS[k] && !justIn) { AUDIO.sfx('door'); autosave(); pushScene(DOORS[k]); return; }
    if (PASS[ch] === 3) { go('confirmBoss'); return; }
  }
  function stepDir(dx, dy) {
    if (hero.moving || DIALOG.isActive()) return;
    hero.dir = dy > 0 ? 'down' : dy < 0 ? 'up' : dx > 0 ? 'right' : 'left';
    var nx = hero.x + dx, ny = hero.y + dy;
    if (!passable(nx, ny)) return;
    var p = personAt(nx, ny); if (p) { talkTo(p); return; }
    hero.path = [{ x: nx, y: ny }]; hero.then = null; target = null;
  }
  function update(dt) {
    tipT += dt; if (tipT > 6) { tipT = 0; tipI = (tipI + 1) % TIPS.length; setTip(TIPS[tipI]); }
    if (hero.qt > 0) hero.qt -= dt;
    if (held) stepDir(held[0], held[1]);
    if (!hero.moving && hero.path.length) {
      var n = hero.path[0];
      if (personAt(n.x, n.y)) { hero.path = []; target = null; if (hero.then) { var f = hero.then; hero.then = null; f(); } }
      else { hero.path.shift(); face(n.x, n.y); hero.fx = hero.x; hero.fy = hero.y; hero.x = n.x; hero.y = n.y; hero.moving = true; hero.t = 0; justIn = false;
        trail.unshift({ x: hero.fx, y: hero.fy }); if (trail.length > 14) trail.pop(); hero.step++; if (hero.step % 4 === 0) AUDIO.sfx('step'); }
    }
    if (hero.moving) {
      hero.t += dt / SPEED; if (hero.t >= 1) { hero.t = 1; hero.moving = false; hero.px = hero.x; hero.py = hero.y; if (!hero.path.length) { target = null; arrive(); } }
      else { hero.px = lerp(hero.fx, hero.x, hero.t); hero.py = lerp(hero.fy, hero.y, hero.t); }
    }
    // カメラ
    var tx = clamp(hero.px * TILE + 16 - 195, 0, MAPW * TILE - W), ty = clamp(hero.py * TILE + 16 - VIEW_H / 2, 0, MAPH * TILE - VIEW_H);
    cam.x += (tx - cam.x) * Math.min(1, dt * 8); cam.y += (ty - cam.y) * Math.min(1, dt * 8);
    // 人の うろうろ
    people.forEach(function (p) {
      if (p.t > 0) { p.t -= dt / 0.5; if (p.t <= 0) { p.t = 0; p.fx = p.x; p.fy = p.y; } return; }
      p.wait -= dt; if (p.wait > 0) return; p.wait = rnd(2, 6);
      if (Math.abs(p.x - hero.x) + Math.abs(p.y - hero.y) <= 1) return;
      var d = pick([[1, 0], [-1, 0], [0, 1], [0, -1]]), nx = p.x + d[0], ny = p.y + d[1];
      if (Math.abs(nx - p.hx) > 1 || Math.abs(ny - p.hy) > 1) return;
      if (!passable(nx, ny) || PASS[tileAt(nx, ny)] >= 2 || occupied(nx, ny)) return;
      if (hero.path.some(function (q) { return q.x === nx && q.y === ny; })) return;
      p.fx = p.x; p.fy = p.y; p.x = nx; p.y = ny; p.t = 1;
    });
  }
  function drawPerson(e, x, y, bob, big) {
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(x, y + 12, 10, 3, 0, 0, 7); ctx.fill();
    ATL.draw(e, x, y - 3 - bob, big || 26);
  }
  function groupDraw(c, x, y, bob) {
    var n = c.count || 1;
    if (n <= 1) drawPerson(c.emoji, x, y, bob);
    else if (n < 10) { drawPerson(c.emoji, x - 4, y - 2, bob, 17); ATL.draw(c.emoji, x + 6, y + 1 - bob, 17); }
    else { drawPerson(c.emoji, x, y - 5, bob, 14); ATL.draw(c.emoji, x - 7, y + 3 - bob, 14); ATL.draw(c.emoji, x + 7, y + 3 - bob, 14); if (n >= 100) { rrect(x + 2, y + 5, 22, 11, 3, PAL.ink); txt(String(n), x + 13, y + 10.5, 9, '#fff', 'center', 900, null); } }
  }
  function draw() {
    ctx.fillStyle = '#0b0816'; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.beginPath(); ctx.rect(0, VIEW_Y, W, VIEW_H); ctx.clip();
    var ox = -Math.round(cam.x), oy = VIEW_Y - Math.round(cam.y);
    if (mapCanvas) ctx.drawImage(mapCanvas, ox, oy);
    // 噴水の水
    for (var i = 0; i < 3; i++) { var ph = (G.t * 1.25 + i / 3) % 1; ATL.draw('💧', ox + 12 * TILE + (i - 1) * 10, oy + 13 * TILE - 10 - Math.sin(ph * Math.PI) * 22, 12, 1 - ph * 0.5); }
    // 目標の輪
    if (target) { ctx.strokeStyle = PAL.sun; ctx.lineWidth = 3; ctx.globalAlpha = 0.5 + 0.5 * Math.abs(Math.sin(G.t * 5)); ctx.beginPath(); ctx.arc(ox + target.x * TILE + 16, oy + target.y * TILE + 16, 12, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; }
    // 描く順: y が小さいものから(人・仲間・主人公)
    var list = [];
    people.forEach(function (p) { var px = p.t > 0 ? lerp(p.fx, p.x, 1 - p.t) : p.x, py = p.t > 0 ? lerp(p.fy, p.y, 1 - p.t) : p.y; list.push({ y: py, f: function () { var x = ox + px * TILE + 16, y = oy + py * TILE + 16; if (p.kind === 'comp') { groupDraw(p.ref, x, y, p.t > 0 ? Math.abs(Math.sin(p.t * Math.PI)) * 2 : 0); ATL.draw('💬', x + 12, y - 20, 12, 0.6 + 0.4 * Math.sin(G.t * 3)); } else drawPerson(p.emoji, x, y, p.t > 0 ? Math.abs(Math.sin(p.t * Math.PI)) * 2 : 0); } }); });
    partyComps().forEach(function (c, i) { var t = trail[i] || trail[trail.length - 1]; if (!t) return; var nx = i === 0 ? { x: hero.fx, y: hero.fy } : (trail[i - 1] || t); var k = hero.moving ? hero.t : 1; var x = lerp(t.x, nx.x, k), y = lerp(t.y, nx.y, k); if (!hero.moving) { x = (i === 0 ? trail[0] : trail[i - 1] || t); y = x.y; x = x.x; }
      var bob = hero.moving ? Math.abs(Math.sin((hero.t + i * 0.2) * Math.PI)) * 2 : 0; list.push({ y: y, f: function () { groupDraw(c, ox + x * TILE + 16, oy + y * TILE + 16, bob); } }); });
    list.push({ y: hero.py + 0.01, f: function () { var x = ox + hero.px * TILE + 16, y = oy + hero.py * TILE + 16, bob = hero.moving ? Math.abs(Math.sin(hero.t * Math.PI)) * 2 : 0;
      drawPerson('🤴', x, y, bob, 27);
      var hd = P.equip.head; if (hd && ITEMS[hd]) ATL.draw(ITEMS[hd].look.emoji, x, y - 20 - bob, 14);
      ctx.fillStyle = PAL.ink; ctx.beginPath(); var d = hero.dir; if (d === 'down') { ctx.moveTo(x - 4, y + 11); ctx.lineTo(x + 4, y + 11); ctx.lineTo(x, y + 16); } else if (d === 'up') { ctx.moveTo(x - 4, y - 14); ctx.lineTo(x + 4, y - 14); ctx.lineTo(x, y - 19); } else if (d === 'left') { ctx.moveTo(x - 13, y - 4); ctx.lineTo(x - 13, y + 4); ctx.lineTo(x - 18, y); } else { ctx.moveTo(x + 13, y - 4); ctx.lineTo(x + 13, y + 4); ctx.lineTo(x + 18, y); } ctx.fill();
      if (hero.qt > 0) ATL.draw(hero.q, x + 14, y - 26, 18); } });
    list.sort(function (a, b) { return a.y - b.y; }).forEach(function (o) { o.f(); });
    if (mapCanvasTop) ctx.drawImage(mapCanvasTop, ox, oy);
    // 看板・家の名前(主人公が近いとき)
    ctx.restore();
    if (SETTINGS.dpad) drawDpad();
  }
  var DPAD = { x: 212, y: 450, s: 56 };
  function drawDpad() {
    var k = [[1, 0, '▲', 0, -1], [0, 1, '◀', -1, 0], [2, 1, '▶', 1, 0], [1, 2, '▼', 0, 1]];
    k.forEach(function (a) { var x = DPAD.x + a[0] * DPAD.s, y = DPAD.y + a[1] * DPAD.s, on = held && held[0] === a[3] && held[1] === a[4]; rrect(x + 2, y + 2, DPAD.s - 4, DPAD.s - 4, 10, on ? 'rgba(255,224,102,.85)' : 'rgba(255,255,255,.4)', 'rgba(27,20,48,.6)', 2); txt(a[2], x + DPAD.s / 2, y + DPAD.s / 2, 22, PAL.ink, 'center', 900, null); });
  }
  function dpadHit(x, y) { if (!SETTINGS.dpad) return null; var cx = Math.floor((x - DPAD.x) / DPAD.s), cy = Math.floor((y - DPAD.y) / DPAD.s); if (cx < 0 || cy < 0 || cx > 2 || cy > 2) return null; if (cx === 1 && cy === 0) return [0, -1]; if (cx === 0 && cy === 1) return [-1, 0]; if (cx === 2 && cy === 1) return [1, 0]; if (cx === 1 && cy === 2) return [0, 1]; return 'pad'; }

  SCENES.town = {
    enter: function (arg, prev) {
      HUD.show(); HUD.setPlace('へっぽこの町'); AUDIO.bgm('town');
      if (!bottom) buildBottom(); show(bottom); refreshStat(); setTip(TIPS[tipI]);
      buildPeople();
      if (arg && arg.fresh) { setHero(START.x, START.y); if (!hintShown) { hintShown = true; setTimeout(function () { say({ name: 'ママ', emoji: '👩' }, ['へっぽこ、行ってらっしゃい。', '行きたい所を タップすると 歩くよ。', '人に 話しかけて、仲間を さがしてね。', '武器や 防具は お店で。南の 出口から 大魔王の ところへ 行けるよ。']); }, 300); } }
      else if (prev !== 'confirmBoss' && prev !== 'showoff' && prev !== 'equip' && prev !== 'party' && prev !== 'items' && prev !== 'town') { setHero(P.x, P.y); justIn = (PASS[tileAt(P.x, P.y)] >= 2); }
      else if (hero.x === 0 && hero.y === 0) setHero(P.x, P.y);
      if (prev === 'confirmBoss') { justIn = true; walkTo(hero.x, hero.y - 1); }
      if (arg && (arg.from === 'lose' || arg.from === 'ending')) setHero(START.x, START.y);
    },
    leave: function () { P.x = hero.x; P.y = hero.y; if (bottom) hide(bottom); held = null; DIALOG.close(); },
    update: update, draw: draw,
    tap: function (x, y) {
      if (DIALOG.tap()) return;
      if (y < VIEW_Y || y >= VIEW_Y + VIEW_H) return;
      var d = dpadHit(x, y); if (d) { if (d !== 'pad') { held = d; stepDir(d[0], d[1]); } return; }
      var tx = Math.floor((x + cam.x) / TILE), ty = Math.floor((y - VIEW_Y + cam.y) / TILE);
      tapTile(tx, ty);
    },
    tapUp: function () { held = null; },
    key: function (k) {
      if (DIALOG.isActive()) { if (k === ' ' || k === 'Enter') DIALOG.tap(); return; }
      var m = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] }[k];
      if (m) stepDir(m[0], m[1]);
    },
    refresh: function () { refreshStat(); buildPeople(); }
  };
  return { hero: hero, refresh: function () { refreshStat(); buildPeople(); } };
})();

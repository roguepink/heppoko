'use strict';
/* ゲーム全体: プレイヤーの状態・HUD・会話の窓・確認・タイトル・オープニング・出発の確認・負け・おしまい */
var ITEMS = {}, COMPS = {}, NPCS = {}, SHOPS = {};
DATA.ITEMS.forEach(function (i) { ITEMS[i.id] = i; });
DATA.COMPANIONS.forEach(function (c) { COMPS[c.id] = c; });
DATA.NPCS.forEach(function (n) { NPCS[n.id] = n; });
DATA.SHOPS.forEach(function (s) { SHOPS[s.id] = s; });
var SLOTS = ['head', 'face', 'body', 'rhand', 'lhand', 'cape', 'waist', 'feet', 'ring', 'charm'];
var SLOT_NAME = { head: 'あたま', face: 'かお', body: 'からだ', rhand: 'みぎて', lhand: 'ひだりて', cape: 'マント', waist: 'こし', feet: 'あし', ring: 'ゆびわ', charm: 'おまもり' };
var SLOT_EMOJI = { head: '👒', face: '👓', body: '👕', rhand: '🫱', lhand: '🫲', cape: '🧣', waist: '👖', feet: '👟', ring: '💍', charm: '📿' };
/* 家の中にいる人(町のマップには出さない) */
var INTERIOR = { king: 'castle', princess: 'castle', mama: 'home', papa: 'home', shop_weapon: 'weapon', shop_armor: 'armor', shop_acc: 'accessory', shop_zakka: 'zakka' };
COMPS.aunt.where = null; // おばさんは自分の家の中

var P = null;
function newPlayer() {
  return { money: DATA.TEXTS.money.start, items: [], equip: { head: null, face: null, body: null, rhand: null, lhand: null, cape: null, waist: null, feet: null, ring: null, charm: null },
    party: [], flags: {}, talked: {}, discovered: {}, x: START.x, y: START.y, dir: 'down', wins: 0, losses: 0, started: Date.now() };
}
G.save = function () { return { P: P, time: Date.now(), ver: 1 }; };
function applySave(d) { P = newPlayer(); for (var k in d.P) P[k] = d.P[k]; for (var s in P.equip) if (P.equip[s] && !ITEMS[P.equip[s]]) P.equip[s] = null; P.party = P.party.filter(function (id) { return COMPS[id]; }); }
function autosave() { if (P) saveGame('auto'); }
function equippedIds() { return SLOTS.map(function (s) { return P.equip[s]; }).filter(Boolean); }
function heroStats() { return BATTLE.calcHeroStats(equippedIds(), ITEMS); }
function partyComps() { return P.party.map(function (id) { return COMPS[id]; }).filter(Boolean); }
function hasItem(id) { return P.items.indexOf(id) >= 0; }
function pay(n) { if (P.money < n) return false; P.money -= n; HUD.update(-n); return true; }
function gain(n) { P.money += n; HUD.update(n); }
function removeItem(id) { var i = P.items.indexOf(id); if (i >= 0) P.items.splice(i, 1); for (var s in P.equip) if (P.equip[s] === id) P.equip[s] = null; }

/* ---------- HUD ---------- */
var HUD = (function () {
  var node = el('div', 'hidden'); node.id = 'hud';
  var money = el('span', 'money', ''), place = el('span', 'place', ''), diff = el('span', 'mdiff', '');
  var gear = btn('⚙️', 'small lav', function () { openSettings(); }); gear.style.cssText = 'flex:none;min-height:40px;width:44px;padding:0;font-size:18px;box-shadow:none;border-width:2px';
  var right = el('div', '', ''); right.style.cssText = 'display:flex;align-items:center;gap:8px;min-width:0'; right.appendChild(place); right.appendChild(gear);
  node.appendChild(money); node.appendChild(right); node.appendChild(diff); ui.appendChild(node);
  var shown = 0, target = 0, anim = null;
  function update(delta) {
    if (!P) return; target = P.money;
    if (delta) { diff.textContent = (delta > 0 ? '+' : '−') + fmtG(Math.abs(delta)); diff.style.color = delta > 0 ? PAL.leaf : PAL.red; diff.style.opacity = '1'; diff.style.transform = 'translateY(0)';
      setTimeout(function () { diff.style.opacity = '0'; diff.style.transform = 'translateY(-20px)'; }, 900); }
    if (anim) clearInterval(anim); var start = shown, t0 = Date.now();
    anim = setInterval(function () { var k = Math.min(1, (Date.now() - t0) / 500); shown = Math.round(lerp(start, target, k)); money.textContent = '💰 ' + fmtG(shown); if (k >= 1) { clearInterval(anim); anim = null; } }, 30);
    if (!delta) { clearInterval(anim); anim = null; shown = target; money.textContent = '💰 ' + fmtG(shown); } // 差分なし = すぐ表示(0.5 秒ぐるぐるしない)
  }
  return { node: node, update: update, setPlace: function (s) { place.textContent = s; }, show: function () { show(node); update(); }, hide: function () { hide(node); } };
})();

/* ---------- お知らせ・確認 ---------- */
function toast(text, ms) { var t = el('div', 'toast', esc(text)); ui.appendChild(t); setTimeout(function () { t.remove(); }, ms || 1300); }
function confirm(msg, okLabel, cancelLabel, cb, okCls) {
  var shade = el('div', ''); shade.id = 'shade'; var box = el('div', ''); box.id = 'confirm';
  box.appendChild(el('div', 'msg', esc(msg)));
  var row = el('div', 'btns');
  var ok = btn(okLabel || 'はい', okCls || '', function () { close(); cb(true); }), no = btn(cancelLabel || 'やめる', 'gray', function () { close(); cb(false); });
  row.appendChild(ok); row.appendChild(no); box.appendChild(row); ui.appendChild(shade); ui.appendChild(box);
  function close() { shade.remove(); box.remove(); }
}
/* ---------- 会話の窓 ---------- */
var DIALOG = (function () {
  var node = el('div', 'hidden'); node.id = 'dialog';
  var who = el('div', 'who'), body = el('div', 'body'), next = el('div', 'next', '▼ タップ'), choices = el('div', 'choices hidden');
  node.appendChild(who); node.appendChild(body); node.appendChild(next); node.appendChild(choices); ui.appendChild(node);
  node.addEventListener('click', function () { tap(); }); // 窓そのものを タップしても 進む
  var lines = [], idx = 0, full = '', shownN = 0, timer = null, doneAt = 0, cb = null, active = false, choosing = false;
  function speedMs() { return [0, 40, 25, 10][SETTINGS.textSpeed || 2]; }
  function start(w, ls, done) {
    lines = ls.slice(); idx = 0; cb = done || null; active = true; choosing = false; hide(choices); choices.innerHTML = '';
    who.innerHTML = w ? '<span class="face">' + esc(w.emoji || '') + '</span>' + esc(w.name || '') : ''; who.style.display = w ? 'flex' : 'none';
    show(node); showLine();
  }
  function showLine() {
    full = lines[idx] || ''; shownN = 0; body.textContent = ''; hide(next);
    if (timer) clearInterval(timer);
    timer = setInterval(function () { shownN++; body.textContent = full.slice(0, shownN); if (shownN % 3 === 0) AUDIO.sfx('talk'); if (shownN >= full.length) { clearInterval(timer); timer = null; doneAt = Date.now(); if (!choosing) show(next); } }, speedMs());
  }
  function tap() {
    if (!active) return false;
    if (choosing) { if (timer) { clearInterval(timer); timer = null; shownN = full.length; body.textContent = full; show(choices); } return true; } // 選択肢つき: タップで文を全部出す
    if (timer) { clearInterval(timer); timer = null; shownN = full.length; body.textContent = full; doneAt = Date.now(); show(next); return true; }
    if (Date.now() - doneAt < 120) return true;
    idx++;
    if (idx < lines.length) showLine(); else { active = false; hide(node); var c = cb; cb = null; if (c) c(); }
    return true;
  }
  function askChoices(w, text, list) {
    lines = [text]; idx = 0; active = true; choosing = true; cb = null;
    who.innerHTML = w ? '<span class="face">' + esc(w.emoji || '') + '</span>' + esc(w.name || '') : ''; who.style.display = w ? 'flex' : 'none';
    show(node); hide(next); choices.innerHTML = ''; choices.className = 'choices hidden' + (list.length === 2 ? ' two' : ''); // 文が出おわるまで ボタンは隠す
    list.forEach(function (c) { var b = btn(c.label, c.cls || '', function () { active = false; choosing = false; hide(node); hide(choices); c.fn && c.fn(); }); if (c.disabled) b.disabled = true; choices.appendChild(b); });
    full = text; shownN = 0; body.textContent = '';
    if (timer) clearInterval(timer);
    timer = setInterval(function () { shownN++; body.textContent = full.slice(0, shownN); if (shownN >= full.length) { clearInterval(timer); timer = null; show(choices); } }, speedMs());
  }
  function close() { active = false; choosing = false; hide(node); if (timer) { clearInterval(timer); timer = null; } }
  return { start: start, tap: tap, ask: askChoices, close: close, isActive: function () { return active; }, node: node };
})();
function say(who, lines, cb) { if (typeof lines === 'string') lines = [lines]; DIALOG.start(who, lines, cb); }
function ask(who, text, choices) { DIALOG.ask(who, text, choices); }

/* ---------- 設定 ---------- */
function openSettings() {
  var shade = el('div', ''); shade.id = 'shade'; var box = el('div', ''); box.id = 'confirm';
  box.appendChild(el('div', 'msg', '⚙️ せってい'));
  function row(label, get, fn) { var b = btn(label + ': ' + get(), 'lav', function () { fn(); b.innerHTML = label + ': ' + get(); }); b.style.cssText = 'width:100%;margin-bottom:8px;min-height:56px'; box.appendChild(b); }
  row('🔊 おと', function () { return AUDIO.isMuted() ? 'オフ' : 'オン'; }, function () { AUDIO.setMute(!AUDIO.isMuted()); });
  row('Aあ 字の大きさ', function () { return SETTINGS.font === 'big' ? '大きい' : 'ふつう'; }, function () { SETTINGS.font = SETTINGS.font === 'big' ? 'normal' : 'big'; saveSettings(); });
  row('🎮 十字キー', function () { return SETTINGS.dpad ? '出す' : '出さない'; }, function () { SETTINGS.dpad = !SETTINGS.dpad; saveSettings(); });
  row('💬 字の出る速さ', function () { return ['', 'ゆっくり', 'ふつう', 'はやい'][SETTINGS.textSpeed || 2]; }, function () { SETTINGS.textSpeed = (SETTINGS.textSpeed % 3) + 1; saveSettings(); });
  var close = btn('とじる', '', function () { shade.remove(); box.remove(); }); close.style.cssText = 'width:100%;min-height:56px'; box.appendChild(close);
  ui.appendChild(shade); ui.appendChild(box);
}

function battleInProgress() { try { var b = JSON.parse(localStorage.getItem('heppoko.battle') || 'null'); return !!(b && b.st && b.st.boss && b.st.hero); } catch (e) { return false; } }
/* ---------- タイトル ---------- */
SCENES.title = {
  enter: function () {
    HUD.hide(); AUDIO.bgm(null);
    var t = el('div', ''); t.id = 'title'; this.node = t;
    t.appendChild(el('div', 'emo', '🏰 ⚔️ 💰'));
    t.appendChild(el('h1', '', '勇者へっぽこの<br>小さな冒険<small>〜 お金の力で 大魔王を 〜</small>'));
    var sv = loadSave();
    t.appendChild(btn('はじめから', 'main', function () { AUDIO.unlock(); if (sv) confirm('いまの セーブデータは 消えます。いい?', '消して はじめる', 'やめる', function (ok) { if (ok) startNew(); }); else startNew(); }));
    if (sv) { var d = new Date(sv.time || 0), lab = 'つづきから <small style="display:block;font-size:13px;font-weight:800;white-space:nowrap">(' + (d.getMonth() + 1) + '/' + d.getDate() + ' ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) + ' に セーブ)</small>'; t.appendChild(btn(lab, 'main sky', function () { AUDIO.unlock(); applySave(sv); HUD.show(); go(battleInProgress() ? 'battle' : 'town'); })); } // 大決戦の途中で閉じていたら、その続きから
    var tools = el('div', 'tools');
    var mute = btn(AUDIO.isMuted() ? '🔇' : '🔊', '', function () { AUDIO.unlock(); AUDIO.setMute(!AUDIO.isMuted()); mute.textContent = AUDIO.isMuted() ? '🔇' : '🔊'; });
    var font = btn('Aあ', '', function () { SETTINGS.font = SETTINGS.font === 'big' ? 'normal' : 'big'; saveSettings(); toast('字の大きさ: ' + (SETTINGS.font === 'big' ? '大きい' : 'ふつう')); });
    tools.appendChild(mute); tools.appendChild(font); t.appendChild(tools);
    t.appendChild(el('div', 'copy', '©2026 ROGUE PINK'));
    ui.appendChild(t); this.stars = []; for (var i = 0; i < 14; i++) this.stars.push({ x: rnd(10, 380), y: rnd(20, 760), p: rnd(0, 6) });
    function startNew() { clearSave(); P = newPlayer(); go('opening'); } // 古いセーブは消す(「つづきから」に前のデータが残らないように)
  },
  leave: function () { if (this.node) this.node.remove(); },
  draw: function () {
    var g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#140c2a'); g.addColorStop(1, '#2a1a4a'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    var self = this; this.stars.forEach(function (s) { var a = 0.3 + 0.7 * Math.abs(Math.sin(G.t * 1.3 + s.p)); ATL.draw('✨', s.x, s.y, 14, a * 0.8); });
  }
};
/* ---------- オープニング ---------- */
SCENES.opening = {
  enter: function () {
    var self = this, node = el('div', ''); node.id = 'opening'; this.node = node;
    var line = el('div', 'line'); node.appendChild(line); var tapn = el('div', 'tapnext', 'タップで ▼'); node.appendChild(tapn);
    var skip = btn('とばす', 'skip', function () { finish(); }); node.appendChild(skip); ui.appendChild(node);
    var lines = DATA.TEXTS.opening, i = 0, done = false;
    var bgs = ['#0b0816', '#1a0f33', '#2a1a4a', '#8fd3ff'];
    function showLine() { line.classList.remove('on'); setTimeout(function () { line.textContent = lines[i]; line.classList.add('on'); }, 60); node.style.background = bgs[Math.min(3, Math.floor(i / 3))]; node.style.color = i >= 9 ? PAL.ink : '#fff'; }
    showLine();
    node.addEventListener('click', function () { if (done) return; i++; if (i < lines.length) showLine(); else finish(); });
    function finish() { if (done) return; done = true; HUD.show(); go('town', { fresh: true }); }
  },
  leave: function () { if (this.node) this.node.remove(); },
  draw: function () { ctx.fillStyle = '#0b0816'; ctx.fillRect(0, 0, W, H); }
};
/* ---------- 出発の確認 ---------- */
SCENES.confirmBoss = {
  enter: function () {
    var self = this; HUD.show();
    var st = heroStats(), n = P.party.length, warn = [];
    if (n < 10) warn.push('仲間は ' + n + '組(10組まで)'); if (st.def < 100) warn.push('守りが 弱め'); if (st.hp < 600) warn.push('HP が 少なめ');
    say(null, DATA.TEXTS.beforeBoss.slice(0, 2), function () {
      ask({ name: 'へっぽこ', emoji: '🤴' }, 'いま: 攻 ' + st.atk + ' 守 ' + st.def + ' HP ' + st.hp + ' / 仲間 ' + n + '組' + (warn.length ? '\n⚠ ' + warn.join('・') : '\nじゅんびは ばっちり!') + '\n大魔王の ところへ 行く?', [
        { label: '⚔️ いく!', cls: 'orange', fn: function () { autosave(); try { localStorage.removeItem('heppoko.battle'); } catch (e) {} go('battle'); } }, // 新しい戦い(古い途中保存は使わない)
        { label: 'まだ やめておく', cls: 'gray', fn: function () { go('town', { from: 'exit' }); } }]);
    });
  },
  tap: function () { DIALOG.tap(); },
  draw: function () { SCENES.town.draw(); ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(0, 0, W, H); }
};
/* ---------- 負け ---------- */
SCENES.lose = {
  enter: function () {
    P.losses++; var st = heroStats();
    var okane = P.losses <= 3 ? 50000 : 0;
    AUDIO.bgm('sad'); HUD.show();
    var lines = DATA.TEXTS.defeat.slice();
    if (okane) lines.push('王さまから おみまい金 ' + fmtG(okane) + ' が とどいた。「がんばれ。わしは 行かんが」');
    var hint = untoldHint(); if (hint) lines.push('隣の おばさんが 教えてくれた。「' + hint + '」');
    say(null, lines, function () { if (okane) gain(okane); P.x = START.x; P.y = START.y; autosave(); go('town', { from: 'lose' }); });
  },
  tap: function () { DIALOG.tap(); },
  draw: function () { ctx.fillStyle = '#0b0816'; ctx.fillRect(0, 0, W, H); ATL.draw('😵', 195, 300, 96); txt('…', 195, 380, 28, '#fff'); }
};
function untoldHint() {
  var pairs = []; for (var m in BATTLE.BEST) if (!P.discovered[m + ':' + BATTLE.BEST[m]]) pairs.push(m);
  if (!pairs.length) return null; var m2 = pick(pairs); var tips = { angry: 'あいつ、怒ってるときに あやまられると 弱いらしいよ', boast: 'じまんしてるときに ほめると 油断するんだって', cry: '泣いてるときは いっしょに 泣くと いいらしいよ', sleepy: 'ねむそうなときに 歌うと 寝ちゃうんだって', taunt: 'ちょうはつは むしするのが 一番 きくって', hungry: 'おなかが すいてるときは おにぎりだよ', lonely: 'さびしそうなときは はなしあうのが いいんだって', laugh: '笑ってるときは ツッコむと いいらしいよ' };
  return tips[m2];
}
/* ---------- おしまい ---------- */
SCENES.ending = {
  enter: function () {
    P.wins++; autosave(); AUDIO.bgm('town'); HUD.hide();
    var node = el('div', ''); node.id = 'title'; this.node = node;
    node.appendChild(el('div', 'emo', '🏆'));
    node.appendChild(el('h1', '', 'おしまい<small>勇者へっぽこの小さな冒険</small>'));
    var lb = G.lastBattle || {};
    node.appendChild(el('p', '', esc((lb.turns || '?') + 'ターンで 勝利 / コンボ ' + (lb.combos || 0) + '回 / とどめ: ' + (lb.finisher || 'へっぽこ')) + '<br>のこった お金: ' + fmtG(P.money) + '<br>仲間: ' + P.party.length + '組'));
    node.appendChild(el('p', '', 'ほかの 装備や 仲間でも 勝てるかな?<br>町に もどって もう一度 あそべます。'));
    node.appendChild(btn('町に もどる', 'main', function () { P.x = START.x; P.y = START.y; HUD.show(); go('town', { from: 'ending' }); }));
    node.appendChild(btn('タイトルへ', 'main sky', function () { go('title'); }));
    node.appendChild(el('div', 'copy', 'ありがとう! ©2026 ROGUE PINK'));
    ui.appendChild(node);
  },
  leave: function () { if (this.node) this.node.remove(); },
  draw: function () { SCENES.title.draw.call({ stars: SCENES.title.stars || [] }); }
};

/* 起動 */
buildMap();
resize();
requestAnimationFrame(function (t) { last = t; loop(t); });
if (location.hash === '#play' || location.hash === '#auto') { P = newPlayer(); HUD.show(); go('town', { fresh: true }); }
else if (location.hash === '#battle') { P = newPlayer(); SLOTS.forEach(function (s) { var best = DATA.ITEMS.filter(function (i) { return i.slot === s; }).sort(function (a, b) { return (b.atk + b.def) - (a.atk + a.def); })[0]; P.equip[s] = best.id; P.items.push(best.id); }); P.party = ['aunt', 'dragon_small', 'retired_hero', 'mage', 'bus_driver', 'sumo', 'grandma', 'priest', 'monsters', 'inventor']; HUD.show(); go('battle'); }
else go('title');

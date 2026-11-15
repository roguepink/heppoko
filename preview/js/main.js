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
var INTERIOR = { king: 'castle', princess: 'castle', mama: 'home', papa: 'home', shop_weapon: 'weapon', shop_armor: 'armor', shop_acc: 'accessory', shop_zakka: 'zakka', shoukai: 'shoukai' };
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
  var gear = btn('⚙️', 'small lav', function () { openSettings(); }); gear.style.cssText = 'flex:none;min-height:44px;height:44px;width:44px;padding:0;font-size:20px;border-radius:50%;box-shadow:0 3px 0 var(--lav-d)';
  var right = el('div', '', ''); right.style.cssText = 'display:flex;align-items:center;gap:8px;min-width:0'; right.appendChild(place); right.appendChild(gear);
  node.appendChild(money); node.appendChild(right); node.appendChild(diff); ui.appendChild(node);
  var shown = 0, target = 0, anim = null;
  function update(delta) {
    if (!P) return; target = P.money;
    if (delta) { diff.textContent = (delta > 0 ? '+' : '−') + fmtG(Math.abs(delta)); diff.style.color = delta > 0 ? '#2e9d4a' : '#c62828'; diff.style.opacity = '1'; diff.style.transform = 'translateY(0)';
      setTimeout(function () { diff.style.opacity = '0'; diff.style.transform = 'translateY(-20px)'; }, 900); }
    if (delta) { money.classList.remove('boing'); void money.offsetWidth; money.classList.add('boing'); } // お金が変わったら 札が ぽよん と弾む
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
  function speedMs() { return [0, 24, 12, 6][SETTINGS.textSpeed || 2]; } // ふつう = 12ms(前は 25ms)
  function whoHtml(w) { return w ? '<span class="face">' + esc(w.emoji || '') + '</span>' + (w.name ? '<span class="nm">' + esc(w.name) + '</span>' : '') : ''; }
  /* へっぽこが話すときは 顔の丸に 手描きの顔(DOLL.faceCanvas)を描く。町の人は 絵文字のまま */
  function setWho(w) {
    who.innerHTML = whoHtml(w); who.style.display = w ? 'flex' : 'none';
    if (w && w.name === 'へっぽこ' && window.DOLL && DOLL.faceCanvas) {
      var f = who.querySelector('.face'); if (f) { f.textContent = ''; f.style.overflow = 'hidden'; f.style.background = '#fff6e6'; f.appendChild(DOLL.faceCanvas(50, w.expr || 'smile')); }
    }
  }
  function start(w, ls, done) {
    lines = ls.slice(); idx = 0; cb = done || null; active = true; choosing = false; node.classList.remove('danger'); hide(choices); choices.innerHTML = '';
    setWho(w);
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
    if (timer) {
      if (shownN * 2 < full.length) { clearInterval(timer); timer = null; shownN = full.length; body.textContent = full; doneAt = Date.now(); show(next); return true; } // 出はじめは 文を全部出す
      clearInterval(timer); timer = null; // 半分以上 出ていたら、そのまま 次の行へ(2回 タップしなくていい)
    } else if (Date.now() - doneAt < 120) return true;
    idx++;
    if (idx < lines.length) showLine(); else { active = false; hide(node); var c = cb; cb = null; if (c) c(); }
    return true;
  }
  function askChoices(w, text, list) {
    lines = [text]; idx = 0; active = true; choosing = true; cb = null; node.classList.remove('danger');
    setWho(w);
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

/* 戦闘の途中データ('heppoko.battle')は、装備と仲間の「署名」つきで保存する。いまの装備・仲間とちがえば古いデータなので捨てる */
function battleSig() { return SLOTS.map(function (s) { return (P && P.equip[s]) || ''; }).join(',') + '|' + (P ? P.party.join(',') : ''); }
function dropBattleSave() { try { localStorage.removeItem('heppoko.battle'); } catch (e) {} }
function battleInProgress() { // つづけてよい途中データがあるか(装備・仲間がちがう古いデータは、ここで捨てる)
  var b = null; try { b = JSON.parse(localStorage.getItem('heppoko.battle') || 'null'); } catch (e) { b = null; }
  if (!b || !b.st || !b.st.boss || !b.st.hero) return false;
  if (!P || b.sig !== battleSig()) { dropBattleSave(); return false; }
  return true;
}
/* ---------- タイトル ---------- */
function easeBack(x) { x = clamp(x, 0, 1); var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); }
function titleCatch() { // ひとこと(係Eが DATA.TEXTS に入れる。なければ この文)
  var T = DATA.TEXTS || {}, t = T.title || {};
  return T.titleCopy || t.catch || t.tagline || t.copy || T.catchcopy || T.tagline || T.titleCatch || '勇者は いくらで 買えますか?';
}
function waveText(s, d0) { // 1字ずつ 波打つ
  var h = '', k = 0; for (var i = 0; i < s.length; i++) { var ch = s.charAt(i); if (ch === '\n') { h += '<br>'; continue; } h += '<span class="w" style="animation-delay:' + ((d0 || 0) + k * 0.1).toFixed(2) + 's">' + esc(ch) + '</span>'; k++; }
  return h;
}
/* あたたかい クリーム地 + ふんわり光の筋 + 水玉(タイトル・おしまい 共通) */
function drawWarmBg(cy) {
  var g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#fff3d6'); g.addColorStop(1, '#ffe2bf'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.translate(195, cy); ctx.rotate(G.t * 0.12); ctx.fillStyle = 'rgba(255,216,77,.22)';
  for (var i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(700, -70); ctx.lineTo(700, 70); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  ctx.fillStyle = 'rgba(255,143,200,.16)';
  for (i = 0; i < 18; i++) { var x = (i * 89) % W, y = (i * 137 + 40) % H, r = 8 + (i % 4) * 5; ctx.beginPath(); ctx.arc(x, y + Math.sin(G.t + i) * 4, r, 0, Math.PI * 2); ctx.fill(); }
}
SCENES.title = {
  enter: function () {
    HUD.hide(); AUDIO.bgm(null); this.t0 = G.t;
    var t = el('div', 'top'); t.id = 'title'; this.node = t;
    t.appendChild(el('h1', '', waveText('勇者へっぽこの\n小さな冒険', 0) + '<small>〜 お金の力で 大魔王を 〜</small>'));
    t.appendChild(el('div', 'catch', esc(titleCatch())));
    var sv = loadSave();
    t.appendChild(btn('はじめから', 'main', function () { AUDIO.unlock(); if (sv) confirm('いまの セーブデータは 消えます。いい?', '消して はじめる', 'やめる', function (ok) { if (ok) startNew(); }); else startNew(); }));
    if (sv) { var d = new Date(sv.time || 0), lab = 'つづきから <small style="display:block;font-size:13px;font-weight:800;white-space:nowrap">(' + (d.getMonth() + 1) + '/' + d.getDate() + ' ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) + ' に セーブ)</small>'; t.appendChild(btn(lab, 'main sky', function () { AUDIO.unlock(); applySave(sv); HUD.show(); go(battleInProgress() ? 'battle' : 'town'); })); } // 大決戦の途中で閉じていたら、その続きから
    var tools = el('div', 'tools');
    var mute = btn(AUDIO.isMuted() ? '🔇' : '🔊', 'lav', function () { AUDIO.unlock(); AUDIO.setMute(!AUDIO.isMuted()); mute.textContent = AUDIO.isMuted() ? '🔇' : '🔊'; });
    var font = btn('Aあ', 'lav', function () { SETTINGS.font = SETTINGS.font === 'big' ? 'normal' : 'big'; saveSettings(); toast('字の大きさ: ' + (SETTINGS.font === 'big' ? '大きい' : 'ふつう')); });
    tools.appendChild(mute); tools.appendChild(font); t.appendChild(tools);
    t.appendChild(el('div', 'copy', '©2026 ROGUE PINK'));
    ui.appendChild(t);
    function startNew() { clearSave(); dropBattleSave(); P = newPlayer(); go('opening'); } // 古いセーブは消す(「つづきから」に前のデータが残らないように)
  },
  leave: function () { if (this.node) this.node.remove(); },
  draw: function () {
    drawWarmBg(150);
    /* へっぽこ人形が 札束を持って ゆれる */
    var k = easeBack((G.t - (this.t0 || 0)) / 0.6), sw = Math.sin(G.t * 2.2) * 0.07;
    ctx.save(); ctx.translate(195, 240); ctx.rotate(sw); ctx.scale(k, k); ctx.translate(-195, -240);
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(195, 152, 96, 0, Math.PI * 2); ctx.fill();
    DOLL.draw(195, 150, 0.45, { pose: 'money', noEmpty: true, equip: {} });
    ATL.draw('💴', 140, 128 + Math.sin(G.t * 4) * 3, 34); ATL.draw('💴', 250, 128 + Math.cos(G.t * 4) * 3, 34);
    ctx.restore();
  }
};
/* ---------- オープニング(絵本) ---------- */
/* 行の中の ことばから 絵を決める(台本が変わっても 合うように)。doll = へっぽこ人形を canvas に描く */
function openingPic(s) {
  if (/はじまった|はじまる/.test(s)) return { doll: 'jump', side: ['🌈', '⭐'] };
  if (/ぼくも|なれるかも/.test(s)) return { doll: 'hero', side: ['✨', '✨'] };
  if (/レシート/.test(s)) return { doll: 'smug', side: ['🧾', '🧾'] };
  if (/買えば|ぜんぶ 買/.test(s)) return { doll: 'money', side: ['🛒', '💎'] };
  if (/ママ/.test(s)) return { em: ['👩', '💴', '💴'] };
  if (/お金持ち/.test(s)) return { em: ['🏰', '💰', '💎'] };
  if (/王さま/.test(s)) return { em: ['😰', '👑', '💤'] };
  if (/大魔王/.test(s)) return { em: ['😈', '⚡', '🏚️'] };
  if (/へっぽこ/.test(s) && /お金/.test(s)) return { doll: 'smug', side: ['💰', '🛡️'] };
  if (/へっぽこ/.test(s)) return { doll: 'normal', side: ['💭', '⚔️'] };
  if (/お金/.test(s)) return { em: ['💰', '💴'] };
  return { em: ['✨', '📖', '✨'] };
}
SCENES.opening = {
  enter: function () {
    var self = this, node = el('div', ''); node.id = 'opening'; this.node = node; this.doll = null; this.t0 = G.t;
    var pic = el('div', 'pic'), line = el('div', 'line'), dots = el('div', 'dots'); node.appendChild(pic); node.appendChild(line); node.appendChild(dots);
    var tapn = el('div', 'tapnext', 'タップで つぎへ ▼'); node.appendChild(tapn);
    var skip = btn('とばす ⏩', 'lav skip', function () { finish(); }); node.appendChild(skip); ui.appendChild(node);
    var lines = DATA.TEXTS.opening, i = 0, done = false;
    function showLine() {
      var s = lines[i], pc = openingPic(s), h = '';
      line.classList.remove('on'); setTimeout(function () { line.textContent = s; line.classList.add('on'); }, 60);
      if (pc.doll) { h = '<span>' + pc.side[0] + '</span><span style="width:170px"></span><span>' + pc.side[1] + '</span>'; pic.style.fontSize = '64px'; }
      else { pc.em.forEach(function (e) { h += '<span>' + e + '</span>'; }); pic.style.fontSize = pc.em.length > 2 ? '86px' : '100px'; }
      pic.classList.remove('pop'); pic.innerHTML = h; void pic.offsetWidth; pic.classList.add('pop');
      self.doll = pc.doll || null; self.t0 = G.t;
      var dd = ''; for (var k = 0; k < lines.length; k++) dd += k === i ? '●' : '○'; dots.textContent = dd;
    }
    showLine();
    node.addEventListener('click', function () { if (done) return; i++; if (i < lines.length) showLine(); else finish(); });
    function finish() { if (done) return; done = true; HUD.show(); go('town', { fresh: true }); }
  },
  leave: function () { if (this.node) this.node.remove(); },
  draw: function () {
    ctx.fillStyle = '#f3e3c8'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,.35)'; for (var i = 0; i < 16; i++) { ctx.beginPath(); ctx.arc((i * 71) % W, (i * 113) % H, 6 + (i % 3) * 4, 0, Math.PI * 2); ctx.fill(); }
    /* 絵本のページ */
    ctx.save(); ctx.shadowColor = 'rgba(90,61,43,.25)'; ctx.shadowOffsetY = 6; rrect(14, 76, 362, 640, 30, '#fffaf0', PAL.ink, 4); ctx.restore();
    ctx.save(); ctx.setLineDash([8, 7]); rrect(26, 88, 338, 616, 22, null, '#ecd6b8', 3); ctx.restore();
    ctx.fillStyle = '#fff1c9'; ctx.beginPath(); ctx.ellipse(195, 268, 150, 112, 0, 0, Math.PI * 2); ctx.fill();   // 絵の下の まるい日だまり
    if (this.doll) {
      var k = easeBack((G.t - this.t0) / 0.5), bob = Math.sin(G.t * 3) * 4;
      ctx.save(); ctx.translate(195, 360); ctx.scale(k, k); ctx.translate(-195, -360);
      DOLL.draw(195, 262 + bob, 0.5, { pose: this.doll, noEmpty: true, equip: {} });
      ctx.restore();
    }
  }
};
/* ---------- 出発の確認 ---------- */
SCENES.confirmBoss = {
  enter: function () {
    var self = this; HUD.show();
    var st = heroStats(), n = P.party.length, warn = [], rc = roleCounts(), danger = false;
    if (rc.guard === 0) { warn.push('🛡️ まもり役が いない(大技で あぶない!)'); danger = true; }
    if (rc.heal === 0) { warn.push('💚 かいふく役が いない'); danger = true; }
    if (n < 6) { warn.push('仲間が 6組より 少ない(いま ' + n + '組)'); danger = true; } else if (n < 10) warn.push('仲間は ' + n + '組(10組まで)');
    if (st.def < 100) warn.push('守りが 弱め'); if (st.hp < 600) warn.push('HP が 少なめ');
    function goBattle(keep) { autosave(); if (!keep) dropBattleSave(); go('battle'); } // 新しい戦いは 古い途中保存を使わない
    function askGo() {
      ask({ name: 'へっぽこ', emoji: '🤴' }, 'いま: 攻 ' + st.atk + ' 守 ' + st.def + ' HP ' + st.hp + ' / 仲間 ' + n + '組' + (warn.length ? '\n⚠ ' + warn.join('\n⚠ ') : '\nじゅんびは ばっちり!') + '\n大魔王の ところへ 行く?', [
        { label: danger ? '⚔️ それでも いく!' : '⚔️ いく!', cls: 'orange', fn: function () { goBattle(false); } },
        danger ? { label: '👥 なかまを 見なおす', cls: 'leaf', fn: function () { go('town', { from: 'exit' }); setTimeout(function () { pushScene('party'); }, 60); } } : null,
        { label: 'まだ やめておく', cls: 'gray', fn: function () { go('town', { from: 'exit' }); } }].filter(Boolean));
      if (danger) DIALOG.node.classList.add('danger'); // 赤い枠で目立たせる
    }
    say(null, DATA.TEXTS.beforeBoss.slice(0, 2), function () {
      if (battleInProgress()) { // 前の戦いの途中データが、いまの装備・仲間と同じなら つづきを聞く
        ask({ name: 'へっぽこ', emoji: '🤴' }, '前の 戦いの つづきが あるよ。\nつづきから する?', [
          { label: '▶ つづきから', cls: 'orange', fn: function () { goBattle(true); } },
          { label: '🔄 最初から', cls: 'sky', fn: function () { dropBattleSave(); askGo(); } },
          { label: 'まだ やめておく', cls: 'gray', fn: function () { go('town', { from: 'exit' }); } }]);
      } else askGo();
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
    var lines = DATA.TEXTS.defeat.slice(0, 3);   // タップは 4回まで(負けの文 3行 + お見舞い金とヒントを 1行に)
    var hint = untoldHint(), extra = [];
    if (okane) extra.push('王さまから おみまい金 ' + fmtG(okane) + '。「がんばれ。わしは 行かんが」');
    if (hint) extra.push('隣の おばさん:「' + hint + '」');
    if (extra.length) lines.push(extra.join('\n'));
    say(null, lines, function () { if (okane) gain(okane); P.x = START.x; P.y = START.y; autosave(); go('town', { from: 'lose' }); });
  },
  tap: function () { DIALOG.tap(); },
  draw: function () { ctx.fillStyle = '#e9dcc6'; ctx.fillRect(0, 0, W, H); ATL.draw('😵', 195, 300, 96); txt('…', 195, 380, 28, PAL.ink, 'center', 900, null); }
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
    var self = this; this.node = null;
    /* 写真のあとの ひとこと(DATA.TEXTS.ending。「ママ:「…」」の形なら 名前と顔を出す) */
    var FACES = { 'ママ': '👩', 'へっぽこ': '🤴', 'パパ': '👨', '王さま': '🤴', '大魔王': '😈' };
    var ends = (DATA.TEXTS && DATA.TEXTS.ending) || [], k = 0;
    function nextEnd() {
      if (k >= ends.length) { self.buildEnd(); return; }
      var s = String(ends[k++]), m = s.match(/^([^:：「]{1,8})[:：]\s*(.*)$/);
      if (m) say({ name: m[1], emoji: FACES[m[1]] || '💬' }, [m[2]], nextEnd); else say(null, [s], nextEnd);
    }
    nextEnd();
  },
  tap: function () { DIALOG.tap(); },
  buildEnd: function () {
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
  leave: function () { DIALOG.close(); if (this.node) this.node.remove(); },
  draw: function () { drawWarmBg(200); if (!this.node) DOLL.draw(195, 250, 0.55, { pose: 'peace', noEmpty: true }); }
};

/* 起動 */
buildMap();
resize();
requestAnimationFrame(function (t) { last = t; loop(t); });
if (location.hash === '#play' || location.hash === '#auto') { P = newPlayer(); HUD.show(); go('town', { fresh: true }); }
else if (location.hash === '#battle') { P = newPlayer(); SLOTS.forEach(function (s) { var best = DATA.ITEMS.filter(function (i) { return i.slot === s; }).sort(function (a, b) { return (b.atk + b.def) - (a.atk + a.def); })[0]; P.equip[s] = best.id; P.items.push(best.id); }); P.party = ['aunt', 'dragon_small', 'retired_hero', 'mage', 'bus_driver', 'sumo', 'grandma', 'priest', 'monsters', 'inventor']; HUD.show(); go('battle'); }
else go('title');

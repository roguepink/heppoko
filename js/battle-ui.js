'use strict';
/* ボス戦の画面(battle-ui.js)
   計算は battle.js(BATTLE.runTurn)にまかせ、ここは「見せ方」だけ。
   - canvas: 背景・大魔王・HP バー・味方の列・ダメージの数字・ゆれ・フラッシュ・赤い縁・紙吹雪
   - DOM(#battle): メッセージ窓 .msg / 大ボタン .cmds / 一覧 .grid / ヒント .hint
   runTurn が返す events を キューに入れて 1 つずつ再生する(design-battle.md 8-3)。 */
var BATTLEUI = (function () {
  var BOSS_CX = 195, BOSS_CY = 200, BOSS_SIZE = 180;
  var HERO_Y = 330;                       // へっぽこの HP の行(炎の下)
  var DOLL_X = 44, DOLL_Y = 728, DOLL_S = 0.26;   // 下の空きの 左に へっぽこの人形、右に 仲間の札(2 段)
  var CARD_X0 = 84, CARD_X1 = 386, CARD_TOP = 670, CARD_H = 54, SUM_Y = 658; // 仲間の札の場所と「なかま のこり」の札
  var STRIP_Y = 558, STRIP_H = 46;                // 一覧を開いたとき: 一覧の上に 小さく 仲間の列
  var MID_Y = 382;                        // 「みんなに 合計」などの数字を出す場所(ヒントの吹き出しと同じ帯。演出中は吹き出しが出ない)
  var LAYERS = ['#8a2be2', '#4a148c', '#1565c0', '#2e7d32', '#f9a825', '#ef6c00', '#c62828']; // 7 層(外から)
  // 1 つの出来事を見せる時間(秒)。設計 8-3。速さ「はやい」では ×0.5。1 ターン 5〜7 秒くらいになるよう 短め
  var DUR = { text: 0.7, say: 1.8, boss: 0.8, act: 0.7, damage: 0.4, group: 0.9, compgroup: 1.0, party: 1.3, combo: 1.4, bigattack: 2.4, bigdmg: 1.2, phase: 1.0, morph: 2.0, mood: 1.1, warn: 0.9, heal: 0.5, revive: 0.9, down: 0.9, finisher: 2.6, win: 2.2, lose: 1.8, bigtext: 1.5, pay: 1.8 };
  // タップで飛ばせない出来事(見逃し防止)
  var PROTECT = { morph: 1, bigattack: 1, combo: 1, down: 1, phase: 1, end: 1, finisher: 1, bigdmg: 1, win: 1, lose: 1 };
  // 手動(速さ 1)のとき タップ待ちになる出来事
  var TAPWAIT = { text: 1, say: 1, boss: 1, act: 1, mood: 1, phase: 1, down: 1, revive: 1, bigtext: 1, party: 1, pay: 1 };
  var ICON = { guardStance: '🛡️', heal: '💚', buffAtk: '🎵', buffDef: '🚩', nothing: '💤', mood: '💬', self: '💫', bheal: '😅' };
  var PHASE_TINT = [null, '255,179,71', '255,61,61', '70,0,110'];
  var reduced = false;
  try { reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  var S = null; // 画面の状態(戦闘そのものの状態は S.st)
  var itemsCache = null;

  /* ---------- main.js が無いときの代わり(試し用) ---------- */
  function ITEMSREF() {
    if (typeof ITEMS !== 'undefined' && ITEMS) return ITEMS;
    if (!itemsCache) { itemsCache = {}; (window.DATA.ITEMS || []).forEach(function (it) { itemsCache[it.id] = it; }); }
    return itemsCache;
  }
  function ids() {
    if (typeof equippedIds === 'function') return equippedIds();
    if (window.P && P.equip) return Object.keys(P.equip).map(function (k) { return P.equip[k]; }).filter(Boolean);
    return [];
  }
  function heroSt() {
    if (typeof heroStats === 'function') return heroStats();
    return BATTLE.calcHeroStats(ids(), ITEMSREF());
  }
  function comps() {
    if (typeof partyComps === 'function') return partyComps();
    return (window.DATA.COMPANIONS || []).slice(0, 10);
  }
  function fmtNum(n) { return Math.floor(n).toLocaleString('ja-JP'); }
  function speedMul() { return SETTINGS.speed === 3 ? 0.5 : 1; }
  function bigFont() { return SETTINGS.font === 'big'; }

  /* ---------- 表示用の写し(view)。events を再生しながら少しずつ動かす ---------- */
  function snapshot(st) {
    var v = { bossHp: st.boss.hp, bossMax: st.boss.maxHp, heroHp: st.hero.hp, heroMax: st.hero.maxHp, mood: st.boss.mood, phase: st.boss.phase, comps: {} };
    st.comps.forEach(function (c) { v.comps[c.id] = { hp: c.hp, maxHp: c.maxHp, alive: c.alive, count: c.count }; });
    return v;
  }
  function compOf(id) { for (var i = 0; i < S.st.comps.length; i++) if (S.st.comps[i].id === id) return S.st.comps[i]; return null; }
  function compIdx(id) { for (var i = 0; i < S.st.comps.length; i++) if (S.st.comps[i].id === id) return i; return -1; }
  // 仲間の札: 人形の右に 2 段(5 組以下なら 1 段)。cardOf(i) = 札の左上・幅・まん中
  function cardOf(i) {
    var n = S.st.comps.length, rows = n <= 5 ? 1 : 2, cols = Math.max(1, Math.ceil(n / rows));
    var w = Math.min(72, (CARD_X1 - CARD_X0) / cols), sx = CARD_X0 + ((CARD_X1 - CARD_X0) - w * cols) / 2;
    var r = Math.floor(i / cols), c = i % cols, top = rows === 1 ? CARD_TOP + 22 : CARD_TOP + r * (CARD_H + 2);
    return { x: sx + w * c, y: top, w: w, cx: sx + w * (c + 0.5), ey: top + 14 };
  }
  function compX(i) { return cardOf(i).cx; }
  function compY(i) { return cardOf(i).ey; }
  function layersOf(hp) { var p = S.view.bossMax ? hp / S.view.bossMax : 0; return p <= 0 ? 0 : Math.ceil(p * 7 - 1e-9); }

  /* ---------- 演出の小道具 ---------- */
  function shake(amp, dur) { if (reduced) return; if (amp >= (S.shake.amp || 0) || S.shake.t <= 0) S.shake = { amp: amp, t: dur, dur: dur }; }
  function flash(rgb, a, dur) { S.flash = { rgb: rgb, a: a, t: dur, dur: dur }; }
  function floater(o) { o.t = 0; o.dur = o.dur || 0.9; S.floaters.push(o); }
  function dmgFloaterBoss(amount, kind) {
    var big = amount >= S.view.bossMax * 0.02;
    floater({ x: BOSS_CX + rnd(-30, 30), y: BOSS_CY + 10, text: fmtNum(amount), size: big ? 48 : 32, grow: big ? 48 : 36, color: big ? '#ffe066' : (kind === 'crit' ? '#ff6a6a' : '#fff'), stroke: big ? '#c62828' : PAL.ink, rise: 50, bounce: true, dur: 1.0 });
  }
  function dmgFloaterAlly(target, amount, kind) {
    var x, y, size = 24;
    if (target === 'hero') { x = DOLL_X + 46; y = DOLL_Y - 70; }
    else { var i = compIdx(target); if (i < 0) i = 0; x = compX(i); y = cardOf(i).y + 34; size = 18; } // 仲間は 自分の札の中に(となりの札に かからない)
    var txtS = kind === 'miss' ? 'ミス' : (kind === 'heal' ? '+' : '') + fmtNum(amount);
    floater({ x: x, y: y, text: txtS, size: size, grow: size, color: kind === 'heal' ? '#9df29d' : '#ff6a6a', stroke: PAL.ink, rise: target === 'hero' ? 22 : 16, bounce: true, dur: kind === 'heal' ? 1.1 : 0.9, guard: kind === 'guarded' && target === 'hero' });
  }
  function pop(id, icon) { S.pops[id] = { t: 0.6, icon: icon }; }
  // 生きている仲間を みんな 回復(割合 pct %)。それぞれの札に 緑の +数字 を ぽよん
  function healAllView(pct) {
    for (var id in S.view.comps) { var v = S.view.comps[id]; if (!v.alive) continue;
      var a = Math.min(v.maxHp - v.hp, Math.floor(v.maxHp * pct / 100)); v.hp += a; if (a > 0) dmgFloaterAlly(id, a, 'heal'); }
  }
  // 「○○は たおれた!」の札(画面のまん中に ぴょんと出す)
  function downBanner(id, text) {
    var c = compOf(id); if (!c) return;
    var verb = /にげだした/.test(text || '') ? 'にげだした!' : 'たおれた!';
    S.banner = { t: 0, emoji: c.emoji, name: c.name, verb: verb };
    S.downT[id] = 0;
  }
  function rowShake(target) { if (!reduced) S.rowShake = { target: target, t: 0.3 }; }
  function lunge(amp) { if (!reduced) S.lunge = { t: 0, amp: amp }; }
  function confetti() { for (var i = 0; i < 40; i++) S.confetti.push({ x: rnd(0, W), y: rnd(-300, -10), vy: rnd(120, 260), vx: rnd(-40, 40), e: i % 2 ? '✨' : '🎊', r: rnd(0, 6), t: 0 }); }
  function peel() { S.peelT = 0.6; shake(6, 0.25); S.barFlash = 0.15; AUDIO.sfx('peel'); }

  /* ---------- メッセージ窓 ---------- */
  function setMsg(lines, replace) {
    var max = bigFont() ? 2 : 3, perRow = bigFont() ? 14 : 17; // 窓に入る行数と 1 行の字数(だいたい)
    if (replace) S.msgLines = lines.slice(); else lines.forEach(function (l) { S.msgLines.push(l); });
    var rows = function () { return S.msgLines.reduce(function (a, l) { return a + Math.max(1, Math.ceil(l.length / perRow)); }, 0); };
    for (var guard = 0; rows() > max && guard < 12; guard++) { // はみ出すとき: まず仲間のセリフ「…」を落とし、それでもなら古い行を捨てる
      var i0 = -1; for (var i = 0; i < S.msgLines.length; i++) if (/「[^」]*」/.test(S.msgLines[i]) && S.msgLines[i].indexOf('の こうげき!') >= 0) { i0 = i; break; }
      if (i0 >= 0) S.msgLines[i0] = S.msgLines[i0].replace(/「[^」]*」/, '');
      else if (S.msgLines.length > 1) S.msgLines.shift(); else break;
    }
    var last = S.msgLines[S.msgLines.length - 1] || '';
    var per = SETTINGS.speed === 3 ? 0 : 0.012; // 1 文字 0.012 秒(待たせない)
    S.typing = { full: last, n: per ? 0 : last.length, per: per };
    S.msgDirty = true;
  }
  function typingDone() { return !S.typing || S.typing.n >= S.typing.full.length; }
  function renderMsg() {
    if (!S.msgDirty) return; S.msgDirty = false;
    var ls = S.msgLines.slice(), n = ls.length;
    if (n && S.typing) ls[n - 1] = S.typing.full.slice(0, Math.floor(S.typing.n));
    S.dom.body.textContent = ls.join('\n');
    S.dom.next.style.display = (S.mode !== 'wait' && S.cur && typingDone() && (S.wait === Infinity || SETTINGS.speed === 1)) ? '' : 'none';
  }

  /* ---------- 大魔王のセリフを DATA.BOSS.moves から ---------- */
  function moveText(kind) {
    var mv = (window.DATA.BOSS.moves || []).filter(function (m) { return m.kind === kind; });
    return mv.length ? mv[Math.floor(Math.random() * mv.length)] : null;
  }
  function bossText(e) {
    var m;
    switch (e.action) {
      case 'normal': m = moveText('attack'); return m ? m.text : e.text;
      case 'all': m = moveText('all'); return m ? m.text : e.text;
      case 'heal': m = moveText('heal'); return m ? m.text : e.text;
      case 'charge': m = moveText('big'); if (m) { S.bigMove = m.id; return m.text; } return e.text;
      case 'big': { var mv = (window.DATA.BOSS.moves || []).filter(function (x) { return x.id === S.bigMove; })[0];
        var nm = mv ? mv.name.replace(/[(（].*?[)）]/g, '') : ''; return (nm ? (nm.indexOf('大魔王') === 0 ? nm : '大魔王の ' + nm) + '!! ' : '') + 'くらえーーっ!!'; } // 名前が「大魔王〜」ではじまるなら「大魔王の」を足さない
    }
    return e.text;
  }

  /* 仲間の番の「まとめてよい」出来事か(とどめ・気分が変わる・自分でころぶ・大魔王を回復… は 1 つずつ見せる) */
  var PARTY_ACT = { buffAtk: 1, buffDef: 1, nothing: 1, heal: 1, guardStance: 1 };
  function partyPart(evs, i) {
    var e = evs[i];
    if (e.type === 'damage') return e.target === 'boss' && e.who !== 'hero' && e.who !== 'boss' && (e.kind === 'comp' || e.kind === 'weird') && !e.finisher;
    if (e.type === 'act') return !!PARTY_ACT[e.kind];
    if (e.type === 'heal') { var nx = evs[i + 1]; return (e.target === 'hero') && nx && nx.type === 'act' && nx.kind === 'heal'; } // 回復役の「へっぽこを 回復」の数字
    return false;
  }
  /* ---------- events の下ごしらえ(まとめる・印をつける・フェーズのセリフを差しこむ) ---------- */
  function prepare(evs) {
    var out = [], i = 0, endIdx = -1;
    evs.forEach(function (e, idx) { if (e.type === 'end') endIdx = idx; });
    if (endIdx >= 0 && evs[endIdx].result === 'win') { // 勝ち: 最後に大魔王へ当たった一撃に「とどめ」の印
      for (var j = endIdx - 1; j >= 0; j--) if (evs[j].type === 'damage' && evs[j].target === 'boss') { evs[j].finisher = true; break; }
    }
    while (i < evs.length) {
      var e = evs[i];
      if (e.type === 'damage' && e.who === 'boss' && e.target !== 'boss') { // 大魔王 → 味方: 連続分は同時に見せる
        var hits = [e], downs = [], k = i + 1;
        while (k < evs.length) { var f = evs[k]; if (f.type === 'damage' && f.who === 'boss' && f.target !== 'boss') hits.push(f); else if (f.type === 'down') downs.push(f); else break; k++; }
        if (hits.length >= 2) { out.push({ type: e.kind === 'big' ? 'bigdmg' : 'group', hits: hits }); downs.forEach(function (d) { out.push(d); }); i = k; continue; }
      }
      if (partyPart(evs, i)) { // 仲間の番: 攻撃・応援・回復などを 1 つの窓にまとめる(10組が 1 行ずつ しゃべると 待たされるので)
        var grp = [], k2 = i;
        while (k2 < evs.length && partyPart(evs, k2)) { grp.push(evs[k2]); k2++; }
        var nAct = grp.filter(function (x) { return x.type !== 'heal'; }).length;
        if (nAct >= 2) { out.push({ type: 'party', items: grp }); i = k2; continue; }
      }
      if (e.type === 'phase') out.push({ type: 'morph', to: e.phase }); // 段階が変わる前に 変身の演出(boss.js)
      out.push(e);
      if (e.type === 'phase') { (window.DATA.BOSS.lines['phase' + (e.phase + 1)] || []).forEach(function (t) { out.push({ type: 'say', text: t }); }); }
      i++;
    }
    return out;
  }

  /* ---------- 1 つの出来事を始める ---------- */
  function applyDamageView(e) {
    if (e.target === 'boss') S.view.bossHp = Math.max(0, S.view.bossHp - e.amount);
    else if (e.target === 'hero') S.view.heroHp = Math.max(0, S.view.heroHp - e.amount);
    else if (S.view.comps[e.target]) S.view.comps[e.target].hp = Math.max(0, S.view.comps[e.target].hp - e.amount);
  }
  function allyLine(e) {
    if (e.kind === 'miss') return e.text || 'へっぽこは ひらりと よけた!';
    if (e.target === 'hero') return e.kind === 'guarded' ? 'へっぽこは ふんばった! ' + fmtNum(e.amount) + ' の ダメージ' : 'へっぽこに ' + fmtNum(e.amount) + ' の ダメージ!';
    var c = compOf(e.target); return (c ? c.name : 'なかま') + 'に ' + fmtNum(e.amount) + ' の ダメージ!';
  }
  function startEvent(e) {
    S.cur = e; var d = (DUR[e.type] || 0.5) * speedMul(); S.wait = d;
    switch (e.type) {
      case 'say': setMsg([e.text], true); if (SETTINGS.speed === 1 && !e.auto) S.wait = Infinity; AUDIO.sfx('talk'); break;
      case 'text': {
        setMsg([e.text], true);
        if (e.who === 'hero') { S.heroPop = 0.3; if (e.item) { var it = ITEMSREF()[e.item]; S.lastHeroAtk = it && it.attack ? it.attack.name : null; var ty = it && it.attack ? it.attack.type : 'phys'; AUDIO.sfx(ty === 'magic' ? 'magic' : ty === 'heal' ? 'heal' : ty === 'weird' ? 'weird' : 'hit'); } if (e.cmd) AUDIO.sfx('weird'); }
        break; }
      case 'boss': {
        var t = bossText(e); setMsg([t], true);
        if (e.action === 'normal' || e.action === 'all') { lunge(30); }
        if (e.action === 'none') S.wait = DUR.text * speedMul();
        break; }
      case 'act': {
        var atxt = e.text; if (e.kind === 'heal' && e.target && e.target === e.who) { var sc0 = compOf(e.who); if (sc0) atxt = sc0.name + 'は 自分を 回復した(なむなむ) 💚'; }
        setMsg([atxt], true); pop(e.who, ICON[e.kind] || '💬');
        if (e.kind === 'guardStance') AUDIO.sfx('guard');
        if (e.kind === 'heal') { AUDIO.sfx('heal'); if (e.target === 'all') healAllView(20); else if (e.target && e.target !== 'hero' && S.view.comps[e.target]) { var v2 = S.view.comps[e.target]; v2.hp = Math.min(v2.maxHp, v2.hp + (e.amount || 0)); dmgFloaterAlly(e.target, e.amount || 0, 'heal'); } }
        if (e.kind === 'self') { var v3 = S.view.comps[e.who]; if (v3) v3.hp = Math.max(0, v3.hp - (e.amount || 0)); dmgFloaterAlly(e.who, e.amount || 0, 'self'); AUDIO.sfx('hurt'); }
        if (e.kind === 'bheal') { S.view.bossHp = Math.min(S.view.bossMax, S.view.bossHp + (e.amount || 0)); floater({ x: BOSS_CX, y: BOSS_CY, text: '+' + fmtNum(e.amount || 0), size: 28, grow: 28, color: '#9df29d', stroke: PAL.ink, rise: 40, dur: 0.9 }); AUDIO.sfx('heal'); }
        if (e.kind === 'buffAtk' || e.kind === 'buffDef') AUDIO.sfx('magic');
        break; }
      case 'damage': {
        applyDamageView(e);
        if (e.target === 'boss') {
          if (e.finisher) { // とどめ: いったん止めて、超特大の金色の数字
            S.cur.type = 'finisher'; S.wait = DUR.finisher * speedMul(); S.finisherT = 0; S.finisherAmt = e.amount;
            S.finisher = e.kind === 'combo' ? 'へっぽこ(心に きいた!)' : e.who === 'hero' ? 'へっぽこ' : (compOf(e.who) || { name: 'なかま' }).name;
            S.finisherLabel = e.kind === 'combo' ? '心に きいた!!' : e.who === 'hero' ? 'へっぽこの ' + (S.lastHeroAtk || 'いちげき') + '!!' : S.finisher + 'の いちげき!!';
            setMsg(['とどめだ!!'], true); if (e.who !== 'hero') pop(e.who, '💥');
            break;
          }
          if (e.kind === 'combo') { // 心のダメージ: 画面中央にドーン
            S.cur.type = 'combo'; S.wait = DUR.combo * speedMul();
            S.combo = { t: 0, text: fmtNum(e.amount) }; shake(8, 0.4); lunge(-20); AUDIO.sfx('bighit'); AUDIO.sfx('magic');
            setMsg([e.text || ('心に ' + fmtNum(e.amount) + ' の ダメージ!')], false);
            break;
          }
          dmgFloaterBoss(e.amount, e.kind);
          var big = e.amount >= S.view.bossMax * 0.02; AUDIO.sfx(big || e.kind === 'crit' ? 'bighit' : 'hit');
          if (e.kind === 'crit') shake(8, 0.4); else lunge(-8);
          if (e.who === 'hero') { var ls = []; if (e.text) ls.push(e.text); ls.push('大魔王に ' + fmtNum(e.amount) + ' の ダメージ!'); setMsg(ls, false); }
          else { pop(e.who, '💥'); setMsg([e.text || ((compOf(e.who) || { name: 'なかま' }).name + 'の こうげき!'), '大魔王に ' + fmtNum(e.amount) + ' の ダメージ!'], true); }
          break;
        }
        // 味方が受けた
        dmgFloaterAlly(e.target, e.amount, e.kind); rowShake(e.target);
        if (e.kind === 'miss') AUDIO.sfx('miss'); else if (e.kind === 'guarded') AUDIO.sfx('guard'); else AUDIO.sfx('hurt');
        if (e.target === 'hero' && e.kind !== 'miss') shake(4, 0.2);
        if (e.kind === 'self' && e.text) setMsg([e.text, fmtNum(e.amount) + ' の ダメージ'], false); else setMsg([allyLine(e)], false);
        break; }
      case 'group': case 'bigdmg': {
        var guardN = 0, isBig = e.type === 'bigdmg', sumA = 0, cntA = 0, lastA = null;
        if (isBig) { flash([255, 255, 255], 0.8, 0.25); shake(14, 0.6); AUDIO.sfx('bighit'); guardN = S.st.guardCount || 0; } else { shake(6, 0.3); AUDIO.sfx('hurt'); }
        e.hits.forEach(function (h) {
          applyDamageView(h); rowShake(h.target);
          if (h.target === 'hero') dmgFloaterAlly(h.target, h.amount, h.kind === 'miss' ? 'miss' : (isBig && guardN > 0 ? 'guarded' : h.kind));
          else if (h.kind !== 'miss') { sumA += h.amount; cntA++; lastA = h; var ci = compIdx(h.target); if (ci >= 0) floater({ x: compX(ci), y: cardOf(ci).y + 34, text: fmtNum(h.amount), size: 16, grow: 16, color: '#ff8a8a', stroke: PAL.ink, rise: 12, bounce: true, dur: 1.0 }); }
        });
        if (cntA >= 2) floater({ x: 195, y: MID_Y, text: 'みんなに 合計 ' + fmtNum(sumA), size: isBig ? 30 : 24, grow: isBig ? 30 : 24, color: isBig ? '#ffe066' : '#ffb3b3', stroke: PAL.ink, rise: 18, dur: 1.7 }); // 10人分の数字が 重ならないよう 1つだけ
        // (1 組だけのときは 上の 札の数字だけで わかる)
        if (isBig) setMsg([guardN > 0 ? '🛡️ 守りの かまえで ダメージが へった!' : 'みんなに 大ダメージ!!'], false); else setMsg(['みんなに ダメージ!'], false);
        break; }
      case 'compgroup': {
        var sum = 0; e.hits.forEach(function (h) { applyDamageView(h); sum += h.amount; pop(h.who, '💥'); });
        dmgFloaterBoss(sum, 'comp'); lunge(-10); AUDIO.sfx('bighit');
        setMsg([e.hits.length + '組が いっせいに 攻撃! 合計 ' + fmtNum(sum) + ' の ダメージ!'], true);
        break; }
      case 'party': { // 仲間の番を まとめて 1 つの窓に
        var psum = 0, pcnt = 0, tags = {}, order = [], gN = 0, lucky = false;
        function tag(k, label) { if (!tags[k]) { tags[k] = label; order.push(k); } }
        e.items.forEach(function (h) {
          if (h.type === 'damage') { applyDamageView(h); psum += h.amount; pcnt++; pop(h.who, '💥'); if (h.kind === 'weird') lucky = true; }
          else if (h.type === 'heal') { S.view.heroHp = Math.min(S.view.heroMax, S.view.heroHp + h.amount); dmgFloaterAlly('hero', h.amount, 'heal'); }
          else if (h.type === 'act') {
            pop(h.who, ICON[h.kind] || '💬');
            if (h.kind === 'heal') {
              tag('heal', '💚回復');
              if (h.target === 'all') healAllView(20);
              else if (h.target && h.target !== 'hero' && S.view.comps[h.target]) { var w3 = S.view.comps[h.target]; w3.hp = Math.min(w3.maxHp, w3.hp + (h.amount || 0)); dmgFloaterAlly(h.target, h.amount || 0, 'heal'); }
            }
            else if (h.kind === 'buffAtk') tag('atk', '🎵攻撃UP');
            else if (h.kind === 'buffDef') tag('def', '🚩守りUP');
            else if (h.kind === 'guardStance') { gN++; tag('guard', '🛡️かまえ'); }
            else if (h.kind === 'nothing') tag('zzz', '💤昼寝');
          }
        });
        if (gN >= 2) tags.guard = '🛡️かまえ×' + gN;
        if (lucky) tag('lucky', '🎯大当たり');
        if (tags.guard) { order = ['guard'].concat(order.filter(function (k) { return k !== 'guard'; })); } // 大技の前の かまえを いちばん先に
        var plines = psum > 0 ? ['なかまの こうげき!', '合計 ' + fmtNum(psum) + ' ダメージ!'] : ['なかまたちが うごいた!'];
        if (order.length) plines.push(order.slice(0, 3).map(function (k) { return tags[k]; }).join(' '));
        if (psum > 0) { dmgFloaterBoss(psum, pcnt >= 2 ? 'crit' : 'comp'); lunge(-10); AUDIO.sfx('bighit'); }
        if (tags.heal) AUDIO.sfx('heal'); else if (tags.guard) AUDIO.sfx('guard'); else if (tags.atk || tags.def) AUDIO.sfx('magic');
        setMsg(plines, true);
        break; }
      case 'pay': { // 大魔王に 電車代を わたす(所持金から ほんとうに 引く)
        var have = window.P ? Math.max(0, P.money || 0) : 160, give = Math.min(160, have);
        if (window.P && give > 0) { if (typeof pay === 'function') pay(give); else P.money -= give; }
        S.paid = give;
        var ptxt = e.text || 'へっぽこは 160Gを わたした。';
        if (give < 160) ptxt = give > 0 ? 'へっぽこは のこりの ' + give + 'Gを ぜんぶ わたした。(160G には たりなかった)' : 'へっぽこの さいふは からっぽだった。大魔王は 歩いて 帰ることにした。';
        floater({ x: BOSS_CX, y: BOSS_CY + 40, text: '-' + give + 'G', size: 34, grow: 34, color: '#ffe066', stroke: '#8a5a00', rise: 50, bounce: true, dur: 1.6 });
        setMsg([ptxt], true); AUDIO.sfx('coin');
        break; }
      case 'heal': {
        if (e.target === 'hero') { S.view.heroHp = Math.min(S.view.heroMax, S.view.heroHp + e.amount); dmgFloaterAlly('hero', e.amount, 'heal'); setMsg(['へっぽこの HPが ' + fmtNum(e.amount) + ' 回復!'], false); AUDIO.sfx('heal'); }
        else if (e.target === 'boss') { S.view.bossHp = Math.min(S.view.bossMax, S.view.bossHp + e.amount); floater({ x: BOSS_CX, y: BOSS_CY, text: '+' + fmtBig(e.amount), size: 30, grow: 30, color: '#9df29d', stroke: PAL.ink, rise: 40, dur: 0.9 }); setMsg(['大魔王の HPが ' + fmtBig(e.amount) + ' 回復した…'], false); AUDIO.sfx('heal'); }
        else { var pct = parseFloat(e.amount) || 0; healAllView(pct); floater({ x: 195, y: MID_Y, text: 'みんな 回復!', size: 24, grow: 24, color: '#9df29d', stroke: PAL.ink, rise: 18, dur: 1.2 }); setMsg(['みんなの HPが 回復した!'], false); AUDIO.sfx('heal'); }
        break; }
      case 'mood': {
        S.view.mood = e.mood; S.moodPop = 0.5;
        if (e.text) { var mtx = e.text, alt = { boast: 'brag', taunt: 'taunt', cry: 'cry', asleep: 'sleep' }[e.mood]; if (alt && Math.random() < 0.5) { var mvv = moveText(alt); if (mvv) mtx = mvv.text; } // 大魔王の ほかのセリフも ときどき
          setMsg([mtx], true); if (e.mood === 'laugh') AUDIO.sfx('laugh'); else if (e.mood === 'angry') AUDIO.sfx('hurt'); else if (e.mood === 'charge') AUDIO.sfx('warn'); else AUDIO.sfx('talk'); }
        else S.wait = 0.25 * speedMul();
        break; }
      case 'morph': { // 白く光る → 黒い影が ふくらみながら 形を変える → 新しい姿(2 秒。「はやい」では 1.6 秒)
        var from = S.view.phase;
        if (from === e.to || !window.BOSSART) { S.wait = 0; break; }
        S.morph = { t: 0, from: from, to: e.to, dur: SETTINGS.speed === 3 ? 1.6 : DUR.morph, shook: false, rev: false };
        S.wait = S.morph.dur; S.view.phase = e.to;
        flash([255, 255, 255], 0.95, 0.4); AUDIO.sfx('warn');
        setMsg(['大魔王の すがたが かわっていく…!'], true);
        break; }
      case 'phase': {
        S.view.phase = e.phase; S.phaseTint = { t: 1.5, i: e.phase }; shake(8, 0.4); AUDIO.sfx('bighit');
        setMsg(['大魔王の ようすが 変わった!(' + e.name + ')'], true);
        break; }
      case 'shake': shake(e.power === 'big' ? 14 : 6, e.power === 'big' ? 0.6 : 0.3); S.wait = 0; break;
      case 'warn': S.warnT = 1.4; S.yellow = 1.0; AUDIO.sfx('warn'); break;
      case 'bigattack': S.view.mood = 'normal'; S.warnT = 0; flash([138, 43, 226], 0.7, 0.3); lunge(40); S.bigT = 0; AUDIO.sfx('warn'); break;
      case 'revive': { var vr = S.view.comps[e.target]; var cr = compOf(e.target); if (vr && cr) { vr.alive = true; vr.hp = Math.floor(cr.maxHp / 2); } delete S.downT[e.target]; if (S.shownC[e.target]) S.shownC[e.target].ghost = 0; dmgFloaterAlly(e.target, Math.floor((cr ? cr.maxHp : 0) / 2), 'heal'); pop(e.target, '💚'); pop(e.who, '🙏'); setMsg([e.text], true); AUDIO.sfx('heal'); break; }
      case 'down': { var vd = S.view.comps[e.who]; if (vd) { vd.alive = false; vd.hp = 0; } downBanner(e.who, e.text); setMsg([e.text], true); AUDIO.sfx('hurt'); rowShake(e.who); break; }
      case 'end': onEnd(e.result); S.wait = 0; break;
      case 'turn': S.view = snapshot(S.st); if (e.hint) S.hint = e.hint; S.wait = 0; break;
      case 'win': S.spin = 0; flash([255, 255, 255], 0.9, 0.5); shake(20, 1.0); confetti(); AUDIO.sfx('fanfare'); AUDIO.bgm('victory'); setMsg([''], true); break;
      case 'lose': S.dark = 0; S.heroFace = '😵'; AUDIO.bgm('sad'); AUDIO.sfx('lose'); setMsg(['へっぽこは 目の前が まっくらに なった…'], true); break;
      case 'bigtext': S.bigText = { t: 0, text: e.text }; AUDIO.sfx('fanfare'); setMsg([e.text, '(タップで つぎへ)'], true); S.wait = Infinity; break;
      case 'go': S.wait = 0; S.pendingGo = e.to; break;
      default: S.wait = 0;
    }
    if (SETTINGS.speed === 1 && TAPWAIT[e.type] && e.type !== 'mood' && !e.auto) S.wait = Infinity;
    if (SETTINGS.speed === 1 && e.type === 'mood' && e.text) S.wait = Infinity;
    S.msgDirty = true;
  }

  /* ---------- 勝ったあとの 電車代の くだり(文は DATA.TEXTS.victoryTrain。無いときは ここの文) ---------- */
  function trainLines() {
    var T = (window.DATA && DATA.TEXTS) || {}, a = T.victoryTrain;
    if (a && a.length) { if (!a.some(function (t) { return /160/.test(t); })) a = a.concat(['へっぽこは 160Gを わたした。']); return a; }
    return ['大魔王「…あの。帰りの 電車代… かして…」', 'へっぽこは 160Gを わたした。', 'お金で 買えたのは、大魔王の きっぷ だけ。'];
  }
  /* ---------- 戦いの終わり ---------- */
  function onEnd(result) {
    S.mode = 'over'; S.result = result;
    try { localStorage.removeItem('heppoko.battle'); } catch (e) {}
    if (window.P) { P.discovered = P.discovered || {}; for (var k in S.st.discovered) P.discovered[k] = true; }
    G.lastBattle = { turns: S.st.turn, combos: S.st.combos, finisher: S.finisher || 'へっぽこ', won: result === 'win' };
    hide(S.dom.cmds); hideGrid(); S.dom.hint.textContent = ''; hide(S.dom.hint);
    var L = window.DATA.BOSS.lines;
    if (result === 'win') {
      // 勝った直後: 大魔王の ひとこと → 「帰りの 電車代… かして…」→ 160G を わたす → 「お金で 買えたのは、大魔王の きっぷ だけ。」
      S.queue.push({ type: 'win' });
      var lz = (L.lose || []).slice(), cut = Math.min(2, lz.length);
      lz.slice(0, cut).forEach(function (t) { S.queue.push({ type: 'say', text: t }); });
      trainLines().forEach(function (t) { S.queue.push(/160/.test(t) ? { type: 'pay', text: t } : { type: 'say', text: t }); });
      lz.slice(cut).forEach(function (t) { S.queue.push({ type: 'say', text: t }); });
      S.queue.push({ type: 'bigtext', text: '大魔王を たおした!' });
      S.queue.push({ type: 'go', to: 'win' });
    } else {
      // 負け: 短く(タップ待ちなしで 自動で進む。このあと 負けの画面へ)
      S.queue.push({ type: 'lose', auto: true });
      var lw = L.win || []; if (lw[0]) S.queue.push({ type: 'say', text: lw[0], auto: true });
      S.queue.push({ type: 'go', to: 'lose' });
    }
  }

  /* ---------- コマンド待ち ---------- */
  function speaker() {
    var sup = S.st.comps.filter(function (c) { return c.alive && c.role === 'support'; })[0];
    if (S.hint && S.hint.mood === 'charge') return 'みんな';
    var alive = S.st.comps.filter(function (c) { return c.alive; });
    var nm = sup ? sup.name : alive.length ? alive[Math.floor(Math.random() * alive.length)].name : 'なかま';
    return nm.length > 8 ? nm.slice(0, 7) + '…' : nm; // 長い名前は短く(1 行に収める)
  }
  function goWait() {
    S.mode = 'wait'; S.cur = null; S.view = snapshot(S.st);
    S.hint = BATTLE.hintFor(S.st);
    setMsg([S.hint.line || 'どうする?'], true);
    S.dom.hint.textContent = S.hint.tip ? speaker() + '「' + S.hint.tip + '」' : ''; S.dom.hint.classList.toggle('hidden', !S.hint.tip);
    S.dom.bGuard.classList.toggle('guardglow', !!S.hint.guardGlow);
    S.dom.bGuard.style.transform = S.hint.guardGlow ? 'scale(1.08)' : '';
    show(S.dom.cmds); setCmdsEnabled(true);
    if (S.gridMode) openGrid(S.gridMode); else hideGrid();
    S.dom.next.style.display = 'none';
  }
  function setCmdsEnabled(on) { [S.dom.bAtk, S.dom.bWeird, S.dom.bGuard].forEach(function (b) { b.disabled = !on; }); }
  function save() {
    try { localStorage.setItem('heppoko.battle', JSON.stringify({ st: S.st, gridMode: S.gridMode, bigMove: S.bigMove, sig: (typeof battleSig === 'function') ? battleSig() : '' })); } catch (e) {}
  }
  function choose(cmd) {
    if (!S || S.mode !== 'wait') return false;
    S.mode = 'play'; setCmdsEnabled(false); hideGrid(); hideBubble();
    S.dom.hint.textContent = ''; hide(S.dom.hint); S.dom.bGuard.classList.remove('guardglow'); S.dom.bGuard.style.transform = '';
    var firstTurn = S.st.turn === 1;
    var res = BATTLE.runTurn(S.st, cmd, ITEMSREF(), window.DATA.BOSS, S.rng);
    var ended = res.events.some(function (e) { return e.type === 'end'; });
    if (!ended) save();
    var evs = withFail(res.events, cmd);
    if (cmd.kind === 'attack') { // 攻撃にならない そうびで たたくときの 笑える一行
      var ft = evs.filter(function (e) { return e.type === 'text' && e.who === 'hero' && e.item === cmd.itemId; })[0], fit = ITEMSREF()[cmd.itemId];
      if (ft && fit && !fit.attack) ft.text = nonAtkText(fit);
    }
    if (firstTurn && S.st.hero.items.indexOf('kotatsu') >= 0 && cmd.kind !== 'guard') evs.unshift({ type: 'text', text: 'へっぽこは こたつから 出られない… でも 手だけ 出して たたかう!' });
    S.queue = S.queue.concat(prepare(evs));
    return true;
  }
  /* 無駄コマンドが 何も起こさなかったターンの最後に、そのコマンドの「失敗の一言」(DATA.COMMANDS の fail)を 1 行足す */
  function withFail(evs, cmd) {
    if (cmd.kind !== 'waste' || !evs.length) return evs;
    var c = (window.DATA.COMMANDS || []).filter(function (x) { return x.id === cmd.id; })[0];
    if (!c || !c.fail || !c.fail.length || evs[0].type !== 'text' || !evs[0].cmd) return evs;
    var k = 1; while (k < evs.length && evs[k].type === 'text') k++;
    if (k > 2) return evs; // 効果の文が 2 つ以上あるとき(攻撃が はげしくなった 等)は そのまま
    if (k === 2 && /攻撃が|守りが|ママ/.test(evs[1].text || '')) return evs;
    var nx = evs[k]; // 次が 効果(気分・回復・ダメージ)なら 何か起きているので 足さない
    if (nx && (nx.type === 'mood' || nx.type === 'heal' || (nx.type === 'damage' && (nx.who === 'hero' || nx.kind === 'self')))) return evs;
    var out = evs.slice(); out.splice(k, 0, { type: 'text', text: c.fail[Math.floor(Math.random() * c.fail.length)] });
    return out;
  }

  /* ---------- 一覧(グリッド) ---------- */
  function gridButton(emoji, name, sub, color, desc, onPick) {
    var b = el('button'); b.type = 'button';
    var nmSize = name.length >= 8 ? 15 : 17; // 長い名前だけ 少し小さく(2 行まで)
    b.innerHTML = '<span class="e">' + emoji + '</span><span class="nm" style="flex:1;line-height:1.15;font-size:' + nmSize + 'px;min-width:0">' + esc(name) + (sub ? '<small style="display:block;font-size:15px;font-weight:800;opacity:.8">' + esc(sub) + '</small>' : '') + '</span>';
    b.style.background = color;
    b.style.boxShadow = '0 4px 0 ' + (color === '#ffd9a0' ? 'var(--orange-d,#e08a2a)' : color === '#ffc6ea' ? 'var(--pink-d,#e0609f)' : '#a8977a');
    var timer = null, lp = false, sx = 0, sy = 0;
    b.addEventListener('pointerdown', function (ev) { ev.stopPropagation(); lp = false; sx = ev.clientX; sy = ev.clientY; clearTimeout(timer); timer = setTimeout(function () { lp = true; showBubble(desc); }, 400); });
    b.addEventListener('pointermove', function (ev) { if (Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) > 10) clearTimeout(timer); });
    function endp() { clearTimeout(timer); hideBubble(); }
    b.addEventListener('pointerup', endp); b.addEventListener('pointercancel', endp); b.addEventListener('pointerleave', endp);
    b.addEventListener('click', function (ev) { ev.stopPropagation(); if (lp) { lp = false; return; } if (b.disabled) return; AUDIO.sfx('tap'); onPick(); });
    return b;
  }
  function hideGrid() { if (!S || !S.dom) return; hide(S.dom.grid); S.dom.root.classList.remove('gridopen'); }
  function showBubble(text) { if (!text) return; S.dom.bubble.textContent = text; show(S.dom.bubble); } // 説明は メッセージ窓の上に かぶせる
  function hideBubble() { if (S && S.dom) hide(S.dom.bubble); }
  // 「たたかう」の一覧に出す、攻撃にならない そうびの ひとこと(押すと「ふつうに たたく」。効果は 小さい)
  function nonAtkText(it) {
    var n = it.name;
    var a = ['へっぽこは ' + n + 'を かまえた! …たたく ための ものじゃ ないけど、ぺちっ。', 'へっぽこは ' + n + 'で ふつうに たたいた! …ふつうに。', n + 'を ぶんぶん ふりまわした! 大魔王は ちょっと 目で おった。'];
    if (it.def > 0) a = ['へっぽこは ' + n + 'を かまえた! まもりが ちょっと 上がった… 気がする。ぺちっ。', n + 'を かざして ポーズ! かっこいい… かもしれない。ぺちっ。'];
    return a[Math.floor(Math.random() * a.length)];
  }
  var KEY_MOODS = ['angry', 'boast', 'cry', 'sleepy', 'taunt', 'hungry', 'lonely', 'laugh']; // 気分に効く ことば 8つ(BATTLE.BEST の順)
  function openGrid(mode) {
    var g = S.dom.grid; g.innerHTML = ''; S.gridMode = mode;
    var glow = (S.hint && S.hint.glow) || [], moodName = (BATTLE.MOODS[S.st.boss.mood] || {}).name || '';
    function closeRow(bottom) { // 「とじる」は 一覧の先頭にも出す(スクロールしなくても閉じられる)
      var close = el('button', 'small closer', '▲ とじる'); close.type = 'button';
      close.addEventListener('click', function (ev) { ev.stopPropagation(); AUDIO.sfx('cancel'); hideGrid(); S.gridMode = null; });
      g.appendChild(close);
    }
    function section(label) { var d = el('div', 'sec', label); g.appendChild(d); }
    closeRow();
    if (mode === 'attack') {
      var items = ITEMSREF(), eq = S.st.hero.items.filter(function (id) { return items[id]; });
      var list = eq.filter(function (id) { return items[id].attack; }), others = eq.filter(function (id) { return !items[id].attack; });
      list.forEach(function (id) {
        var it = items[id], heal = it.attack.type === 'heal';
        g.appendChild(gridButton((it.look && it.look.emoji) || '⚔️', it.name, heal ? '回復' : it.attack.name, '#ffd9a0', it.attack.name + ': ' + (it.desc || ''), function () { choose({ kind: 'attack', itemId: id }); }));
      });
      if (!list.length) { var none = el('div', '', 'こうげきできる そうびが ない!'); none.style.cssText = 'grid-column:1/-1;color:#fff;font-weight:800;text-align:center;padding:10px'; g.appendChild(none); }
      if (others.length) {
        section('こうげき用じゃない そうび(ふつうに たたく)');
        others.forEach(function (id) { var it = items[id]; g.appendChild(gridButton((it.look && it.look.emoji) || '🎽', it.name, 'ふつうに たたく', '#e6dcc8', (it.desc || '') + '(こうげき用じゃ ないので 小さく ぺちっ)', function () { choose({ kind: 'attack', itemId: id }); })); });
      }
    } else {
      var used = {}; for (var key in S.st.comboUsed) used[key.split(':')[1]] = true;
      var all = window.DATA.COMMANDS || [], keyIds = KEY_MOODS.map(function (m) { return BATTLE.BEST[m]; });
      function add(c) {
        var isGlow = glow.indexOf(c.id) >= 0, mamaGone = c.id === 'mama' && S.st.hero.mamaUsed;
        var b = gridButton(CMD_EMOJI[c.id] || '🤪', c.name, isGlow ? moodName + 'に きく' : (mamaGone ? 'もう来ない' : null), '#ffc6ea', c.desc, function () { choose({ kind: 'waste', id: c.id, name: c.name, text: c.text }); });
        if (isGlow) b.classList.add('glow');
        if (used[c.id]) b.appendChild(el('span', 'chk', '✓'));
        if (mamaGone) b.disabled = true;
        g.appendChild(b);
      }
      keyIds.forEach(function (id) { all.forEach(function (c) { if (c.id === id) add(c); }); }); // 気分に効く 8つを先頭に
      section('そのほか');
      all.forEach(function (c) { if (keyIds.indexOf(c.id) < 0) add(c); });
    }
    var bot = el('button', 'small closer', '▲ とじる'); bot.type = 'button';
    bot.addEventListener('click', function (ev) { ev.stopPropagation(); AUDIO.sfx('cancel'); hideGrid(); S.gridMode = null; });
    g.appendChild(bot);
    S.dom.root.classList.add('gridopen'); show(g); g.scrollTop = 0;
  }
  var CMD_EMOJI = { talk: '💬', tsukkomi: '👉', soothe: '🫳', janken: '✊', ignore: '🙈', dajare: '🥶', tea: '🍵', glare: '👀', sorry: '🙇', flee: '🏃', fake: '🤺', cry: '😭', boast: '💰', money: '💴', praise: '👏', sleep: '😴', dance: '💃', sing: '🎤', hungry: '🍽️', pray: '🙏', photo: '🤳', pout: '😤', mama: '👩', play_dead: '🫠', tickle: '🫦', hug: '🤗', count: '🔢', space_out: '☁️', homework_cmd: '📓', onigiri: '🍙', greet: '👋', mimic: '🎭', riddle_cmd: '❓', lecture: '📢', toilet: '🚽', sneeze: '🤧' };

  /* ---------- 戦闘画面だけの CSS(1 回だけ差し込む)。夜の背景のまま、窓とボタンは かわいい形と色 ---------- */
  function injectCss() {
    if (document.getElementById('css-battle')) return;
    var st = document.createElement('style'); st.id = 'css-battle';
    var F = '"Hiragino Maru Gothic ProN","Hiragino Sans","Yu Gothic UI","Meiryo","Noto Sans JP",system-ui,sans-serif';
    st.textContent = [
      '#battle, #battle button { font-family:' + F + '; }',
      '#battle .msg { top:430px; height:130px; background:var(--cream,#fff6e6); color:var(--ink,#5a3d2b); border:3px solid var(--ink,#5a3d2b); border-radius:22px; box-shadow:0 5px 0 rgba(0,0,0,.35); padding:9px 16px; }',
      '#battle .msg .next { color:var(--pink-d,#e0609f); }',
      '#battle.gridopen .msg { top:430px; height:66px; padding:5px 14px; font-size:17px; line-height:1.38; border-radius:18px; }',
      '#battle.gridopen .msg .next { bottom:3px; font-size:14px; }',
      '#battle .cmds button.bb { border:3px solid var(--ink,#5a3d2b); border-radius:22px; color:var(--ink,#5a3d2b); transition:transform 120ms ease-out; }',
      '#battle .cmds button.bb:active { transform:scale(.94,.88); }',
      '#battle .cmds button.orange { background:var(--orange,#ffb35c); box-shadow:0 5px 0 var(--orange-d,#e08a2a); }',
      '#battle .cmds button.pink { background:var(--pink,#ff8fc8); box-shadow:0 5px 0 var(--pink-d,#e0609f); }',
      '#battle .cmds button.sky { background:var(--sky,#8fd3ff); box-shadow:0 5px 0 var(--sky-d,#4fa8d8); }',
      '#battle .cmds button.spd { background:var(--cream,#fff6e6); box-shadow:0 5px 0 #c9b48f; }',
      '#battle .cmds button:disabled { background:#b9b0c9 !important; box-shadow:0 5px 0 #8a809c !important; color:#efeaf5; }',
      '#battle.gridopen .cmds { top:504px; }',
      '#battle.gridopen .cmds button { min-height:48px; height:48px; }',
      '#battle.gridopen .grid { top:610px; height:166px; background:var(--cream,#fff6e6); border:3px solid var(--ink,#5a3d2b); border-radius:18px; padding:6px 6px 8px; box-sizing:border-box; gap:7px; }',
      '#battle .grid button { border:3px solid var(--ink,#5a3d2b); border-radius:18px; color:var(--ink,#5a3d2b); transition:transform 120ms ease-out; }',
      '#battle .grid button:active { transform:scale(.94,.88); }',
      '#battle .grid button:not(.closer) { height:auto; min-height:60px; padding:5px 8px; }',
      '#battle .grid button.closer { background:#efe6d6; box-shadow:0 4px 0 #c9b48f; font-size:17px; min-height:38px; height:38px; }',
      '#battle .grid .sec { color:var(--ink,#5a3d2b); border-bottom:2px dashed var(--ink,#5a3d2b); font-size:17px; }',
      '#battle .grid::-webkit-scrollbar-thumb { background:var(--pink,#ff8fc8); }',
      '#battle .hint { left:16px; top:352px; width:358px; box-sizing:border-box; text-align:left; font-size:17px; line-height:1.35; font-weight:800; color:var(--ink,#5a3d2b); text-shadow:none; background:var(--cream,#fff6e6); border:3px solid var(--ink,#5a3d2b); border-radius:18px; padding:5px 12px; box-shadow:0 4px 0 rgba(0,0,0,.35); }',
      '#battle .hint:after { content:""; position:absolute; left:40px; bottom:-11px; width:14px; height:14px; background:var(--cream,#fff6e6); border-right:3px solid var(--ink,#5a3d2b); border-bottom:3px solid var(--ink,#5a3d2b); transform:rotate(45deg); }',
      '#battle .bubble { position:absolute; left:8px; top:430px; width:374px; min-height:86px; box-sizing:border-box; background:var(--cream,#fff6e6); color:var(--ink,#5a3d2b); border:3px solid var(--ink,#5a3d2b); border-radius:18px; padding:8px 14px; font-size:17px; font-weight:800; line-height:1.45; z-index:5; box-shadow:0 5px 0 rgba(0,0,0,.35); }'
    ].join('\n');
    document.head.appendChild(st);
  }
  /* ---------- DOM を作る ---------- */
  function buildDom() {
    var root = el('div'); root.id = 'battle'; root.style.pointerEvents = 'none'; // 子だけ押せる(canvas のタップを通す)
    injectCss();
    var hint = el('div', 'hint hidden'); hint.style.pointerEvents = 'none'; // 吹き出し(炎の下・へっぽこの HP の下の帯。場所と形は css-battle)
    var msg = el('div', 'msg'); msg.style.pointerEvents = 'auto';
    var body = el('div', 'body'); var next = el('div', 'next', '▼'); msg.appendChild(body); msg.appendChild(next);
    msg.addEventListener('pointerdown', function (ev) { ev.stopPropagation(); onTap(); });
    var cmds = el('div', 'cmds'); cmds.style.pointerEvents = 'auto';
    function bigBtn(emoji, label, cls, fn) {
      var b = btn('<span class="e" style="font-size:24px;line-height:1">' + emoji + '</span><span>' + label + '</span>', cls, fn);
      b.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;font-size:18px;padding:0 2px;line-height:1.15;white-space:nowrap;letter-spacing:-1px';
    b.classList.add('bb');
      return b;
    }
    var bAtk = bigBtn('⚔️', 'たたかう', 'orange', function () { if (S.mode !== 'wait') return; if (S.gridMode === 'attack' && S.dom.root.classList.contains('gridopen')) { S.dom.grid.scrollTop = 0; return; } openGrid('attack'); }); // 同じボタンを もう一度 押しても 閉じない
    var bWeird = bigBtn('🤪', 'へんなこと', 'pink', function () { if (S.mode !== 'wait') return; if (S.gridMode === 'weird' && S.dom.root.classList.contains('gridopen')) { S.dom.grid.scrollTop = 0; return; } openGrid('weird'); });
    var bGuard = bigBtn('🛡️', 'まもる', 'sky', function () { if (S.mode !== 'wait') return; AUDIO.sfx('guard'); choose({ kind: 'guard' }); });
    var bSpd = btn('', 'spd', function () { SETTINGS.speed = SETTINGS.speed >= 3 ? 1 : SETTINGS.speed + 1; saveSettings(); spdLabel(); });
    bSpd.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;line-height:1.1'; bSpd.classList.add('bb');
    function spdLabel() { bSpd.innerHTML = '<span style="font-size:15px">⏩ 文字</span><span style="font-size:17px">' + ['', '手動', '自動', 'はやい'][SETTINGS.speed] + '</span>'; } // 何の「ふつう」か 分かるように「文字:」を付ける
    spdLabel();
    cmds.appendChild(bAtk); cmds.appendChild(bWeird); cmds.appendChild(bGuard); cmds.appendChild(bSpd);
    var grid = el('div', 'grid hidden'); grid.style.pointerEvents = 'auto';
    var bubble = el('div', 'bubble hidden'); bubble.style.pointerEvents = 'none';
    root.appendChild(hint); root.appendChild(msg); root.appendChild(cmds); root.appendChild(grid); root.appendChild(bubble);
    S.dom = { root: root, hint: hint, msg: msg, body: body, next: next, cmds: cmds, bAtk: bAtk, bWeird: bWeird, bGuard: bGuard, bSpd: bSpd, grid: grid, bubble: bubble };
    ui.appendChild(root);
  }

  /* ---------- タップ(速送り・文字送り) ---------- */
  function onTap() {
    if (!S || S.mode === 'wait' || !S.cur) return;
    if (!typingDone()) { S.typing.n = S.typing.full.length; S.msgDirty = true; if (S.wait === Infinity) return; }
    if (S.wait === Infinity) { S.wait = 0; return; } // タップ待ち(手動)は いつでも 進める(PROTECT の出来事で 止まったままに ならないように)
    if (PROTECT[S.cur.type]) return;
    S.wait = 0;
  }

  /* ---------- 新しい画面の状態 ---------- */
  function fresh() {
    return { st: null, rng: null, dom: null, view: null, shownBossHp: 0, shownHeroHp: 0, queue: [], cur: null, wait: 0, typing: null, msgLines: [], msgDirty: true,
      floaters: [], confetti: [], flash: null, shake: { amp: 0, t: 0, dur: 1 }, lunge: null, pops: {}, rowShake: null, peelT: 0, barFlash: 0, warnT: 0, yellow: 0, phaseTint: null, heroPop: 0, moodPop: 0,
      combo: null, finisherT: -1, finisherAmt: 0, finisher: null, finisherLabel: '', spin: -1, dark: -1, heroFace: '🤴', bigText: null, bigT: -1, pendingGo: null, morph: null,
      shownC: {}, downT: {}, banner: null, mode: 'play', gridMode: null, pinch: false, bigMove: null, hint: null, lastHeroAtk: null, result: null, resumed: false };
  }

  /* ========== 場面 ========== */
  SCENES.battle = {
    enter: function () {
      S = fresh();
      var saved = null; try { saved = JSON.parse(localStorage.getItem('heppoko.battle') || 'null'); } catch (e) { saved = null; }
      if (saved && typeof battleSig === 'function' && saved.sig !== battleSig()) { saved = null; try { localStorage.removeItem('heppoko.battle'); } catch (e) {} } // 装備・仲間がちがう古いデータは使わない
      if (saved && saved.st && saved.st.boss && saved.st.hero) { S.st = saved.st; S.gridMode = saved.gridMode || null; S.bigMove = saved.bigMove || null; S.resumed = true; }
      else S.st = BATTLE.newState(heroSt(), ids(), comps(), window.DATA.BOSS);
      S.rng = BATTLE.makeRng(Date.now());
      S.view = snapshot(S.st); S.shownBossHp = S.view.bossHp; S.shownHeroHp = S.view.heroHp; S.ghostHeroHp = S.view.heroHp;
      for (var cid in S.view.comps) { var cv = S.view.comps[cid]; S.shownC[cid] = { hp: cv.hp, ghost: cv.hp }; if (!cv.alive) S.downT[cid] = 9; }
      buildDom();
      if (window.HUD && HUD.hide) HUD.hide();
      AUDIO.bgm('battle');
      if (S.resumed) goWait();
      else {
        S.mode = 'play'; (window.DATA.BOSS.lines.intro || []).forEach(function (t) { S.queue.push({ type: 'say', text: t }); });
        var heq = S.st.hero.items, ex = heq.indexOf('granny_dentures') >= 0 ? '大魔王「…まて。なんだ その 歯は!」' : heq.indexOf('kotatsu') >= 0 ? '大魔王「こたつ…? なんで こたつ…?」' : heq.indexOf('gold_poop') >= 0 ? '大魔王は 金のうんちから そっと 目を そらした。(見ないふりを した)' : null; // 装備しだいで 一言
        if (ex) S.queue.push({ type: 'say', text: ex });
        S.queue.push({ type: 'turn', hint: null });
      }
    },
    leave: function () {
      if (S && S.dom && S.dom.root.parentNode) S.dom.root.parentNode.removeChild(S.dom.root);
      S = null;
    },
    update: function (dt) {
      if (!S) return;
      // 時計まわり
      if (S.peelT > 0) S.peelT -= dt; if (S.barFlash > 0) S.barFlash -= dt; if (S.warnT > 0) S.warnT -= dt; if (S.yellow > 0) S.yellow -= dt;
      if (S.heroPop > 0) S.heroPop -= dt; if (S.moodPop > 0) S.moodPop -= dt;
      if (S.flash) { S.flash.t -= dt; if (S.flash.t <= 0) S.flash = null; }
      if (S.shake.t > 0) S.shake.t -= dt;
      if (S.lunge) { S.lunge.t += dt; if (S.lunge.t > 0.3) S.lunge = null; }
      if (S.rowShake) { S.rowShake.t -= dt; if (S.rowShake.t <= 0) S.rowShake = null; }
      if (S.morph) { // 変身の とちゅう: ふくらむ所で 地面が ゆれ、新しい姿が 出る所で もう一度 光る
        var mo = S.morph; mo.t += dt; var mu = mo.t / mo.dur;
        if (mu > 0.36 && !mo.shook) { mo.shook = true; shake(12, 0.9); AUDIO.sfx('bighit'); }
        if (mu > 0.72 && !mo.rev) { mo.rev = true; flash([255, 255, 255], 0.55, 0.3); }
        if (mu >= 1) S.morph = null;
      }
      if (S.phaseTint) { S.phaseTint.t -= dt; if (S.phaseTint.t <= 0) S.phaseTint = null; }
      for (var k in S.pops) { S.pops[k].t -= dt; if (S.pops[k].t <= 0) delete S.pops[k]; }
      S.floaters = S.floaters.filter(function (f) { f.t += dt; return f.t < f.dur; });
      S.confetti = S.confetti.filter(function (c) { c.t += dt; c.y += c.vy * dt; c.x += c.vx * dt; c.r += dt * 3; return c.t < 3.5 && c.y < H + 40; });
      if (S.combo) { S.combo.t += dt; if (S.combo.t > 1.5) S.combo = null; }
      if (S.finisherT >= 0) S.finisherT += dt;
      if (S.spin >= 0) S.spin += dt;
      if (S.dark >= 0) S.dark = Math.min(1, S.dark + dt / 1.5);
      if (S.bigT >= 0) S.bigT += dt;
      if (S.bigText) S.bigText.t += dt;
      // HP の数字は 0.6 秒で追いつく(層がはがれたら演出)
      var before = layersOf(S.shownBossHp);
      S.shownBossHp = Math.abs(S.view.bossHp - S.shownBossHp) < 1 ? S.view.bossHp : lerp(S.shownBossHp, S.view.bossHp, 1 - Math.pow(0.002, dt / 0.6));
      var nowL = layersOf(S.shownBossHp);
      if (nowL < before) {
        peel();
        if (nowL === 1 && !S.sawLast && S.mode !== 'over') { S.sawLast = true; S.queue.unshift({ type: 'say', text: 'へっぽこ「…だめです。」' }); S.queue.unshift({ type: 'say', text: '大魔王「ま、まて。ちょっと トイレに 行っていいか?」' }); } // あと 1 層の ひとこと
      }
      S.shownHeroHp = Math.abs(S.view.heroHp - S.shownHeroHp) < 0.5 ? S.view.heroHp : lerp(S.shownHeroHp, S.view.heroHp, 1 - Math.pow(0.01, dt / 0.3));
      S.ghostHeroHp = stepGhost(S.ghostHeroHp === undefined ? S.shownHeroHp : S.ghostHeroHp, S.shownHeroHp, dt);
      // 仲間の HP バーも するっと 動く(うすい赤の「へった分」は 少し おくれて ついてくる)
      for (var cid2 in S.view.comps) {
        var tv = S.view.comps[cid2], sc = S.shownC[cid2] || (S.shownC[cid2] = { hp: tv.hp, ghost: tv.hp });
        sc.hp = Math.abs(tv.hp - sc.hp) < 0.5 ? tv.hp : lerp(sc.hp, tv.hp, 1 - Math.pow(0.01, dt / 0.35));
        sc.ghost = stepGhost(sc.ghost, sc.hp, dt);
      }
      for (var did in S.downT) S.downT[did] += dt;
      if (S.banner) { S.banner.t += dt; if (S.banner.t > 1.9) S.banner = null; }
      // ピンチの曲
      var pinch = S.view.heroHp <= S.view.heroMax * 0.25 && S.mode !== 'over';
      if (pinch !== S.pinch) { S.pinch = pinch; if (S.mode !== 'over') AUDIO.bgm(pinch ? 'pinch' : 'battle'); }
      // 文字送り
      if (S.typing && S.typing.n < S.typing.full.length) { S.typing.n = S.typing.per ? Math.min(S.typing.full.length, S.typing.n + dt / S.typing.per) : S.typing.full.length; S.msgDirty = true; }
      // 出来事の再生
      if (S.cur && typingDone()) {
        if (S.wait !== Infinity) S.wait -= dt;
        if (S.wait <= 0) { var done = S.cur; S.cur = null; S.msgDirty = true; if (done.type === 'go' || S.pendingGo) { var to = S.pendingGo; S.pendingGo = null; go(to); return; } }
      }
      if (!S.cur && S.queue.length) { startEvent(S.queue.shift()); if (!S) return; }
      if (!S.cur && !S.queue.length && S.mode === 'play') goWait();
      renderMsg();
    },
    draw: function () {
      if (!S) return;
      ctx.save();
      if (S.shake.t > 0 && !reduced) { var a = S.shake.amp * (S.shake.t / S.shake.dur); ctx.translate(rnd(-a, a), rnd(-a, a)); }
      drawBg(); drawBoss(); drawHud(); if (S.dark < 0) drawAllies(); drawFloaters(); drawBanner(); drawOverlays(); if (S.dark >= 0) drawAllies();
      ctx.restore();
    },
    tap: function () { onTap(); },
    key: function (k) { if (k === ' ' || k === 'Enter') onTap(); }
  };

  // へった分(うすい赤)は いまの分より ゆっくり 追いつく。ふえたときは すぐ 合わせる
  function stepGhost(g, hp, dt) { if (g <= hp) return hp; return Math.max(hp, g - Math.max(1, (g - hp)) * Math.min(1, dt * 3.2)); }

  /* ========== 描く ========== */
  function drawBg() {
    var g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1a0b2e'); g.addColorStop(1, '#3a1050');
    ctx.fillStyle = g; ctx.fillRect(-30, -30, W + 60, H + 60);
    var dim = S.st.comps.filter(function (c) { return S.view.comps[c.id] && S.view.comps[c.id].alive; }).length <= 3;
    if (dim) { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(-30, -30, W + 60, H + 60); }
    ctx.beginPath(); ctx.arc(195, 190, 150, 0, Math.PI * 2); ctx.fillStyle = '#0b0816'; ctx.fill();
    for (var i = 0; i < 3; i++) { // 回るオーラ 3 本
      ctx.save(); ctx.translate(195, 190); ctx.rotate(G.t * (0.5 + i * 0.3) * (i % 2 ? -1 : 1) + i * 2.1); ctx.scale(1, 0.32 + i * 0.12);
      ctx.beginPath(); ctx.arc(0, 0, 162 + i * 10, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(138,43,226,.35)'; ctx.lineWidth = 6; ctx.stroke(); ctx.restore();
    }
  }
  function drawBoss() {
    if (S.spin >= 2.2) return; // 消えた
    var dy = 0, sc = 1, rot = 0, alpha = 1, atk = 0, ph = S.view.phase || 0;
    if (S.lunge) { var lw = Math.sin(Math.PI * S.lunge.t / 0.3); dy = lw * S.lunge.amp; if (S.lunge.amp > 0) atk = lw; }
    if (S.bigT >= 0 && S.bigT < 1.2) { sc = 1 + 0.25 * Math.sin(Math.PI * S.bigT / 1.2); atk = Math.max(atk, Math.sin(Math.PI * S.bigT / 1.2)); } // 大技: ふくらむ
    if (S.spin >= 0) { rot = S.spin * 9; sc = Math.max(0.02, 1 - S.spin / 2.2); alpha = clamp(1 - S.spin / 2.2, 0, 1); }
    if (S.spin < 0 && !reduced) rot = Math.sin(G.t * Math.PI) * (ph >= 3 ? 1.5 : 3) * Math.PI / 180; // ゆらゆら(大きい姿は 少しだけ)
    var hp = S.view.bossMax ? S.shownBossHp / S.view.bossMax : 1;
    // 足元の炎(段階が上がるほど 大きく 外へ。のんきな 最初の姿には 出さない)
    if (S.spin < 0 && !S.morph && ph >= 1) {
      var fl = 1 + 0.12 * Math.sin(G.t * 9), fl2 = 1 + 0.12 * Math.cos(G.t * 7), fx = [0, 84, 108, 150][ph], fsz = [0, 40, 50, 58][ph];
      ATL.draw('🔥', BOSS_CX - fx, 284, fsz * fl); ATL.draw('🔥', BOSS_CX + fx, 284, fsz * fl2);
    }
    ctx.save(); ctx.translate(BOSS_CX, BOSS_CY + dy); ctx.rotate(rot); ctx.scale(sc, sc); ctx.globalAlpha = alpha;
    if (window.BOSSART) BOSSART.draw(ctx, ph, { t: G.t, mood: S.view.mood, hp: hp, hurt: S.peelT > 0 ? clamp(S.peelT / 0.6, 0, 1) : 0, atk: atk, dead: S.spin >= 0, reduced: reduced,
      morph: S.morph ? S.morph.t / S.morph.dur : null, from: S.morph ? S.morph.from : null });
    else BIG.draw('😈', 0, 0, BOSS_SIZE, alpha);
    if (S.spin < 0 && !S.morph && ph >= 1 && ph <= 2) { // 汗 💦(いらいら・あせり)。HP が へるほど 汗が ふえる
      var hd = BOSSART.head(ph), sw = (G.t * 0.8) % 1;
      ATL.draw('💦', hd.x + 12, hd.y + sw * 24, 36, 1 - sw * 0.6);
      if (ph === 2) ATL.draw('💦', -hd.x - 14, hd.y + 14 + ((sw + 0.5) % 1) * 24, 30, 1 - ((sw + 0.5) % 1) * 0.6);
    }
    ctx.restore();
    // 気分の絵文字(頭の右上・大きく)
    var m = S.view.mood;
    if (m && m !== 'normal' && BATTLE.MOODS[m] && S.spin < 0 && !S.morph) {
      var ps = S.moodPop > 0 ? 1 + 0.6 * (S.moodPop / 0.5) : 1 + 0.05 * Math.sin(G.t * 4);
      ATL.draw(BATTLE.MOODS[m].emoji, 310, 118 + (m === 'charge' ? Math.sin(G.t * 20) * 3 : 0), 64 * ps);
    }
    // 大技の予告「!!」
    if (S.warnT > 0 || m === 'charge') {
      var t = S.warnT, ws = t > 1.15 ? 1 + (t - 1.15) / 0.25 : 1, on = t > 0 ? (Math.floor(t * 8) % 2 === 0) : (Math.floor(G.t * 3) % 2 === 0);
      if (on) txt('!!', BOSS_CX, 86, Math.round(64 * ws), '#ff3d3d', 'center', 900, '#fff');
    }
  }
  function drawHud() {
    ctx.fillStyle = 'rgba(27,20,48,.92)'; ctx.fillRect(-30, -30, W + 60, 82);
    txt(S.st.boss.name, 8, 14, 17, '#fff', 'left', 900, null);
    txt(fmtBig(S.shownBossHp), W - 8, 14, 17, S.view.bossHp <= 0 ? '#ff6a6a' : '#fff', 'right', 900, null);
    var bx = 8, by = 30, bw = 374, bh = 16, k = layersOf(S.shownBossHp), top = 7 - k;
    var frac = k > 0 ? (S.shownBossHp / S.view.bossMax) * 7 - (k - 1) : 0;
    rrect(bx, by, bw, bh, 8, k > 1 ? LAYERS[top + 1] : '#3a2d55');
    if (k > 0) { ctx.save(); rrect(bx, by, bw, bh, 8, null); ctx.clip(); ctx.fillStyle = LAYERS[top]; ctx.fillRect(bx, by, bw * clamp(frac, 0, 1), bh); ctx.restore(); }
    ctx.fillStyle = 'rgba(255,255,255,.45)'; [0.7, 0.4, 0.15].forEach(function (q) { ctx.fillRect(bx + bw * q - 1, by, 2, bh); });
    var md = BATTLE.MOODS[S.view.mood], edge = k === 1 ? '#ffe066' : (md && md.color ? md.color : '#fff');
    if (S.view.mood === 'charge') edge = Math.floor(G.t * 6) % 2 ? '#ffe066' : '#fff';
    rrect(bx, by, bw, bh, 8, null, edge, k === 1 || S.view.mood === 'charge' ? 3 : 2);
    if (S.barFlash > 0) rrect(bx, by, bw, bh, 8, 'rgba(255,255,255,' + (S.barFlash / 0.15 * 0.9).toFixed(2) + ')');
    txt('あと ' + k + ' 層', bx + 4, by + bh + 10, 17, '#ffe9b3', 'left', 800, null);
  }
  function hpColor(p) { return p > 0.5 ? '#46c84a' : p > 0.3 ? '#ffcf33' : '#ff4d4d'; } // 緑 → 黄 → 赤
  // HP バー(地・へった分・いまの分・白い縁)。blink = 3 割以下で 点滅
  function hpBar(x, y, w, h, hp, ghost, max, blink) {
    var q = max ? clamp(hp / max, 0, 1) : 0, g = max ? clamp(ghost / max, 0, 1) : 0, r = h / 2;
    rrect(x, y, w, h, r, '#2a1f3d');
    ctx.save(); rrect(x, y, w, h, r, null); ctx.clip();
    if (g > q) { ctx.fillStyle = '#ffb3b3'; ctx.fillRect(x + w * q, y, w * (g - q), h); }
    if (q > 0) { ctx.fillStyle = blink && Math.floor(G.t * 4) % 2 === 0 ? '#ffd0d0' : hpColor(q); ctx.fillRect(x, y, w * q, h); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x, y + 1, w * q, Math.max(1, h * 0.3)); }
    ctx.restore();
    rrect(x, y, w, h, r, null, '#fff', 2);
  }
  // 灰色の絵文字(たおれた仲間)。canvas の filter を使わず 色の合成で 灰色にする(古い iPhone でも 灰色になる)
  var greyCache = {};
  function greyCan(e) {
    if (greyCache[e]) return greyCache[e];
    var c = document.createElement('canvas'); c.width = c.height = 72; var g = c.getContext('2d');
    g.font = '56px ' + EMOJI_FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(e, 36, 39);
    try { g.globalCompositeOperation = 'saturation'; g.fillStyle = '#7d7d7d'; g.fillRect(0, 0, 72, 72); g.globalCompositeOperation = 'destination-in'; g.fillText(e, 36, 39); g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(0, 0, 72, 72); } catch (er) {}
    greyCache[e] = c; return c;
  }
  // 仲間の絵文字(生き・たおれ)。たおれた瞬間は ぴょんと 跳ねてから 横に たおれる
  function drawCompEmoji(c, x, y, size, alive, dt) {
    if (alive) { ATL.draw(c.emoji, x, y, size); return; }
    var t = dt === undefined ? 9 : dt, dy = 6, rot = Math.PI / 2, grey = true;
    if (!reduced && t < 0.22) { dy = -18 * Math.sin(Math.PI / 2 * t / 0.22); rot = 0; grey = false; }
    else if (!reduced && t < 0.55) { var u = (t - 0.22) / 0.33; dy = -18 + 24 * u * u; rot = Math.PI / 2 * u; }
    ctx.save(); ctx.translate(x, y + dy); ctx.rotate(rot);
    if (grey) { var s = size * 72 / 56; ctx.drawImage(greyCan(c.emoji), -s / 2, -s / 2, s, s); }
    else ATL.draw(c.emoji, 0, 0, size);
    ctx.restore();
  }
  function aliveCount() { var n = 0; S.st.comps.forEach(function (c) { var v = S.view.comps[c.id]; if (v && v.alive) n++; }); return n; }
  function pill(label, x, y, size, fg, bg, edge, pad) {
    ctx.font = '900 ' + size + 'px ' + TEXT_FONT; var w = ctx.measureText(label).width + (pad === undefined ? 22 : pad);
    rrect(x - w / 2, y - size * 0.75, w, size * 1.5, size * 0.75, bg, edge, 2); txt(label, x, y + 1, size, fg, 'center', 900, null);
  }
  function drawAllies() {
    // ===== へっぽこの HP の行(炎の下・横いっぱいの札) =====
    var p = S.view.heroMax ? S.shownHeroHp / S.view.heroMax : 0, low = p <= 0.3 && S.view.heroHp > 0, on = Math.floor(G.t * 4) % 2 === 0;
    rrect(8, HERO_Y - 17, 374, 34, 17, 'rgba(27,20,48,.82)', low && on ? '#ff4d4d' : 'rgba(255,246,230,.75)', low ? 3 : 2);
    ATL.draw(S.view.heroHp <= 0 ? '😵' : low ? '😰' : S.heroFace, 27, HERO_Y, 26);
    if (low) { var sw0 = (G.t * 0.9) % 1; ATL.draw('💦', 40, HERO_Y - 12 + sw0 * 10, 16, 1 - sw0 * 0.6); }
    txt('へっぽこ', 44, HERO_Y + 1, 17, '#fff', 'left', 900, null);
    hpBar(118, HERO_Y - 10, 148, 20, S.shownHeroHp, S.ghostHeroHp === undefined ? S.shownHeroHp : S.ghostHeroHp, S.view.heroMax, low);
    if (p <= 0.25 && p > 0 && Math.floor(G.t * 3) % 2 === 0) txt('ピンチ!', 192, HERO_Y + 1, 16, '#ff4d4d', 'center', 900, '#fff');
    txt(Math.ceil(S.shownHeroHp) + '/' + S.view.heroMax, 376, HERO_Y + 1, 18, low ? '#ffb3b3' : '#fff', 'right', 900, null);
    var gridOpen = S.dom && S.dom.root.classList.contains('gridopen') && S.mode === 'wait';
    // ===== 下の空き: 床の光と へっぽこの人形(左) =====
    ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = '#5b3a8a'; ctx.beginPath(); ctx.ellipse(DOLL_X, 772, 40, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    if (window.DOLL && DOLL.draw) {
      var hx = 0; if (S.rowShake && S.rowShake.target === 'hero') hx = Math.sin(S.rowShake.t * 60) * 6;
      var pose = S.result === 'win' ? 'jump' : S.heroPop > 0 ? 'hero' : 'normal';
      var face = S.dark >= 0 || S.view.heroHp <= 0 ? '😵' : S.result === 'win' ? '😆' : S.view.heroHp <= S.view.heroMax * 0.25 ? '😰' : (S.view.mood === 'charge' ? '😨' : null);
      var ds = DOLL_S * (S.heroPop > 0 ? 1 + 0.12 * (S.heroPop / 0.3) : 1);
      try { DOLL.draw(DOLL_X + hx, DOLL_Y, ds, { pose: pose, face: face || undefined, noEmpty: true }); } catch (e) {}
    } else ATL.draw(S.heroFace, DOLL_X, DOLL_Y, 48);
    if (gridOpen) { drawStrip(); return; }
    // ===== 「なかま のこり 7/10」 =====
    var n = S.st.comps.length, al = aliveCount();
    if (n) pill('なかま のこり ' + al + '/' + n, (CARD_X0 + CARD_X1) / 2, SUM_Y - (n <= 5 ? -12 : 0), 17, al <= Math.ceil(n * 0.3) ? '#fff' : '#5a3d2b', al <= Math.ceil(n * 0.3) ? '#c62828' : '#fff6e6', '#5a3d2b');
    // ===== 仲間の札(絵文字・HP バー・数字 or 人数 or 「ダウン」) =====
    S.st.comps.forEach(function (c, i) {
      var v = S.view.comps[c.id] || { hp: c.hp, maxHp: c.maxHp, alive: c.alive, count: c.count }, sc = S.shownC[c.id] || { hp: v.hp, ghost: v.hp };
      var k = cardOf(i), dx = 0; if (S.rowShake && S.rowShake.target === c.id) dx = Math.sin(S.rowShake.t * 60) * 6;
      var q = v.maxHp ? sc.hp / v.maxHp : 0, lowc = v.alive && q <= 0.3, dt = S.downT[c.id];
      var justDown = !v.alive && dt !== undefined && dt < 0.8;
      rrect(k.x + 2 + dx, k.y, k.w - 4, CARD_H - 2, 10, v.alive ? 'rgba(255,255,255,.10)' : 'rgba(0,0,0,.45)', justDown && Math.floor(dt * 10) % 2 === 0 ? '#ff4d4d' : (v.alive ? 'rgba(255,255,255,.28)' : 'rgba(255,90,90,.55)'), 1.5);
      var pp = S.pops[c.id], sz = pp && pp.t > 0.4 ? 1 + 0.3 * ((pp.t - 0.4) / 0.2) : 1, bob = v.alive ? Math.sin(G.t * 3 + i) * 1.5 : 0;
      drawCompEmoji(c, k.cx + dx, k.ey + bob, 26 * sz, v.alive, dt);
      if (!v.alive && (dt === undefined || dt > 0.5)) ATL.draw('💫', k.cx + dx + Math.sin(G.t * 4) * 3, k.y + 5, 16);
      if (lowc) { var sw = (G.t * 0.9 + i * 0.13) % 1; ATL.draw('💦', k.cx - 15 + dx, k.ey - 8 + sw * 9, 15, 1 - sw * 0.6); }
      if (pp) ATL.draw(pp.icon, k.cx + k.w / 2 - 12 + dx, k.y + 7, 17);
      var bw = k.w - 12;
      hpBar(k.cx - bw / 2 + dx, k.y + 27, bw, 9, v.alive ? sc.hp : 0, v.alive ? sc.ghost : Math.max(0, sc.ghost), v.maxHp, lowc);
      if (!v.alive) { pill('ダウン', k.cx + dx, k.y + 45, 15, '#fff', '#c62828', null, 8); }
      else {
        var label;
        if (v.count >= 2) { var ppl = Math.max(1, Math.ceil(v.count * sc.hp / v.maxHp)); label = (ppl >= 10000 ? Math.floor(ppl / 10000) + '万' : ppl) + (c.emoji === '🐩' ? '匹' : '人'); }
        else label = String(Math.ceil(sc.hp));
        txt(label, k.cx + dx, k.y + 45, 15, v.count >= 2 ? '#ffe066' : (lowc ? '#ffb3b3' : '#fff'), 'center', 900, '#1b1430');
      }
    });
  }
  // 一覧を開いているとき: 一覧の上に 小さな 仲間の列(絵文字と HP バーだけ)
  function drawStrip() {
    var n = S.st.comps.length; if (!n) return;
    var al = aliveCount(), warn = al <= Math.ceil(n * 0.3);
    rrect(8, STRIP_Y, 374, STRIP_H, 14, 'rgba(27,20,48,.92)', 'rgba(255,246,230,.75)', 2);
    txt('なかま', 36, STRIP_Y + 14, 15, '#fff', 'center', 900, null);
    txt(al + '/' + n, 36, STRIP_Y + 33, 18, warn ? '#ff8080' : '#ffe066', 'center', 900, null);
    var x0 = 66, w = Math.min(44, (380 - x0) / n);
    S.st.comps.forEach(function (c, i) {
      var v = S.view.comps[c.id] || { hp: c.hp, maxHp: c.maxHp, alive: c.alive }, sc = S.shownC[c.id] || { hp: v.hp, ghost: v.hp };
      var cx = x0 + w * (i + 0.5), q = v.maxHp ? sc.hp / v.maxHp : 0;
      drawCompEmoji(c, cx, STRIP_Y + 14 + (v.alive ? 0 : -4), 20, v.alive, S.downT[c.id]);
      hpBar(cx - (w - 6) / 2, STRIP_Y + 30, w - 6, 9, v.alive ? sc.hp : 0, v.alive ? sc.ghost : 0, v.maxHp, v.alive && q <= 0.3);
      if (!v.alive) { ctx.strokeStyle = '#ff4d4d'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(cx - 8, STRIP_Y + 6); ctx.lineTo(cx + 8, STRIP_Y + 22); ctx.moveTo(cx + 8, STRIP_Y + 6); ctx.lineTo(cx - 8, STRIP_Y + 22); ctx.stroke(); }
    });
  }
  // 「○○は たおれた!」の札(ぴょんと出て、少しして 消える)
  function drawBanner() {
    var b = S.banner; if (!b) return;
    var t = b.t, sc = reduced ? 1 : (t < 0.18 ? 0.4 + 0.75 * (t / 0.18) : 1 + 0.15 * Math.exp(-(t - 0.18) * 8) * Math.cos((t - 0.18) * 30)), al = t > 1.5 ? clamp((1.9 - t) / 0.4, 0, 1) : 1;
    ctx.save(); ctx.globalAlpha = al; ctx.translate(195, MID_Y); ctx.scale(sc, sc);
    rrect(-170, -34, 340, 68, 20, '#fff6e6', '#5a3d2b', 3);
    ATL.draw('🪦', -136, 0, 36);
    var nm = b.name, fs = 20; ctx.font = '900 ' + fs + 'px ' + TEXT_FONT;
    while (ctx.measureText(nm + 'は').width > 270 && fs > 17) { fs--; ctx.font = '900 ' + fs + 'px ' + TEXT_FONT; }
    while (ctx.measureText(nm + '…は').width > 270 && nm.length > 4) nm = nm.slice(0, -1);
    nm = (nm === b.name ? nm : nm + '…') + 'は';
    txt(nm, -110, -12, fs, '#5a3d2b', 'left', 900, null);
    txt(b.verb, -110, 15, 22, '#d32f2f', 'left', 900, null);
    ATL.draw(b.emoji, 140, 0, 30);
    ctx.restore();
  }
  function drawFloaters() {
    S.floaters.forEach(function (f) {
      var u = f.t / f.dur, y = f.y - f.rise * u, size = f.size + (f.grow - f.size) * Math.min(1, u * 3);
      if (f.bounce && !reduced) { // ぽよんと 弾む: 大きく出て ぷるぷる 落ちつき、2 回はねる
        size *= 1 + 0.55 * Math.exp(-u * 7) * Math.cos(u * 26);
        y -= Math.abs(Math.sin(u * Math.PI * 2.5)) * 16 * (1 - u);
      }
      var alpha = u > 0.7 ? (1 - u) / 0.3 : 1;
      ctx.save(); ctx.globalAlpha = alpha;
      if (f.guard) ATL.draw('🛡', f.x - 22, y, 18);
      txt(f.text, f.x, y, Math.round(size), f.color, 'center', 900, f.stroke);
      ctx.restore();
    });
    S.confetti.forEach(function (c) { ATL.draw(c.e, c.x, c.y, 26); });
    // コンボ: 画面中央にドーン(数字が 1 桁ずつ止まる)
    if (S.combo) {
      var t = S.combo.t, s = S.combo.text, out = '', digits = s.replace(/,/g, '').length, di = 0;
      for (var i = 0; i < s.length; i++) { if (s[i] === ',') { out += ','; continue; } var settle = 0.8 * (di + 1) / digits; out += t >= settle ? s[i] : String(Math.floor(Math.random() * 10)); di++; }
      var sc = t < 0.15 ? 1.6 - 0.6 * (t / 0.15) : 1, al = t > 1.2 ? (1.5 - t) / 0.3 : 1;
      ctx.save(); ctx.globalAlpha = clamp(al, 0, 1);
      txt('心に きいた!', 195, 232, 22, '#ffb3c7', 'center', 900, PAL.ink);
      txt(out, 195, 275, Math.round(56 * sc), '#ff7ad0', 'center', 900, '#8a2be2');
      ctx.restore();
    }
    // とどめの一撃(スロー → 超特大の金色)
    if (S.finisherT >= 0 && S.finisherT < 3.2) {
      var ft = S.finisherT;
      if (ft > 0.5) { var u2 = Math.min(1, (ft - 0.5) / 0.35), sz = Math.round(76 * (2 - u2)), al2 = ft > 2.6 ? clamp((3.2 - ft) / 0.6, 0, 1) : 1;
        ctx.save(); ctx.globalAlpha = al2;
        txt(S.finisherLabel, 195, 232, 24, '#fff', 'center', 900, '#c62828');
        txt(fmtNum(S.finisherAmt), 195, 290, sz, '#ffe066', 'center', 900, '#c62828');
        ctx.restore(); }
    }
    if (S.bigText) { var bt = Math.min(1, S.bigText.t / 0.4); txt(S.bigText.text, 195, 250, Math.round(34 * (1.6 - 0.6 * bt)), '#ffe066', 'center', 900, '#8a2be2'); }
  }
  function drawOverlays() {
    if (S.phaseTint) { var c = PHASE_TINT[S.phaseTint.i] || '255,255,255'; ctx.fillStyle = 'rgba(' + c + ',' + (0.45 * S.phaseTint.t / 1.5).toFixed(2) + ')'; ctx.fillRect(-30, -30, W + 60, H + 60); }
    if (S.yellow > 0) { var ya = 0.35 * Math.max(0, Math.sin((1 - S.yellow) * Math.PI * 3)); ctx.fillStyle = 'rgba(255,224,102,' + ya.toFixed(2) + ')'; ctx.fillRect(-30, -30, W + 60, H + 60); }
    if (S.flash) { ctx.fillStyle = 'rgba(' + S.flash.rgb.join(',') + ',' + (S.flash.a * S.flash.t / S.flash.dur).toFixed(2) + ')'; ctx.fillRect(-30, -30, W + 60, H + 60); }
    if (S.pinch && S.dark < 0) { // 赤い縁(呼吸)
      var a = 0.55 * (0.5 + 0.5 * Math.sin(G.t * Math.PI * 2)), col = 'rgba(198,40,40,' + a.toFixed(2) + ')', tr = 'rgba(198,40,40,0)', g;
      g = ctx.createLinearGradient(0, 0, 0, 24); g.addColorStop(0, col); g.addColorStop(1, tr); ctx.fillStyle = g; ctx.fillRect(0, 0, W, 24);
      g = ctx.createLinearGradient(0, H, 0, H - 24); g.addColorStop(0, col); g.addColorStop(1, tr); ctx.fillStyle = g; ctx.fillRect(0, H - 24, W, 24);
      g = ctx.createLinearGradient(0, 0, 24, 0); g.addColorStop(0, col); g.addColorStop(1, tr); ctx.fillStyle = g; ctx.fillRect(0, 0, 24, H);
      g = ctx.createLinearGradient(W, 0, W - 24, 0); g.addColorStop(0, col); g.addColorStop(1, tr); ctx.fillStyle = g; ctx.fillRect(W - 24, 0, 24, H);
    }
    if (S.dark >= 0) { ctx.fillStyle = 'rgba(0,0,0,' + (0.85 * S.dark).toFixed(2) + ')'; ctx.fillRect(-30, -30, W + 60, H + 60); }
  }

  return { choose: choose, tap: onTap, get: function () { return S; } };
})();

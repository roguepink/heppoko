'use strict';
/* ボス戦の画面(battle-ui.js)
   計算は battle.js(BATTLE.runTurn)にまかせ、ここは「見せ方」だけ。
   - canvas: 背景・大魔王・HP バー・味方の列・ダメージの数字・ゆれ・フラッシュ・赤い縁・紙吹雪
   - DOM(#battle): メッセージ窓 .msg / 大ボタン .cmds / 一覧 .grid / ヒント .hint
   runTurn が返す events を キューに入れて 1 つずつ再生する(design-battle.md 8-3)。 */
var BATTLEUI = (function () {
  var BOSS_CX = 195, BOSS_CY = 200, BOSS_SIZE = 180;
  var HERO_Y = 364, COMP_Y = 398, DOT_Y = 423;
  var LAYERS = ['#8a2be2', '#4a148c', '#1565c0', '#2e7d32', '#f9a825', '#ef6c00', '#c62828']; // 7 層(外から)
  // 1 つの出来事を見せる時間(秒)。設計 8-3。速さ「はやい」では ×0.5
  var DUR = { text: 1.0, say: 2.4, boss: 1.1, act: 0.8, damage: 0.5, group: 1.0, compgroup: 1.2, combo: 1.5, bigattack: 3.0, bigdmg: 1.3, phase: 1.5, mood: 1.0, warn: 1.0, heal: 0.6, revive: 1.0, down: 1.0, finisher: 2.8, win: 2.6, lose: 2.2, bigtext: 1.5 };
  // タップで飛ばせない出来事(見逃し防止)
  var PROTECT = { bigattack: 1, combo: 1, down: 1, phase: 1, end: 1, finisher: 1, bigdmg: 1, win: 1, lose: 1 };
  // 手動(速さ 1)のとき タップ待ちになる出来事
  var TAPWAIT = { text: 1, say: 1, boss: 1, act: 1, mood: 1, phase: 1, down: 1, revive: 1, bigtext: 1 };
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
  function compX(i) { return 28 + 34 * i; }
  function hpFace() {
    var p = S.view.bossMax ? S.shownBossHp / S.view.bossMax : 1;
    return p > 0.6 ? '😈' : p > 0.3 ? '😡' : p > 0.1 ? '😰' : '😱';
  }
  function bossFace() {
    if (S.peelT > 0 && Math.floor(S.peelT * 10) % 2 === 0) return '😡';
    var m = S.view.mood;
    if (m === 'normal' || m === 'charge' || !BATTLE.MOODS[m]) return hpFace();
    return BATTLE.MOODS[m].emoji;
  }
  function layersOf(hp) { var p = S.view.bossMax ? hp / S.view.bossMax : 0; return p <= 0 ? 0 : Math.ceil(p * 7 - 1e-9); }

  /* ---------- 演出の小道具 ---------- */
  function shake(amp, dur) { if (reduced) return; if (amp >= (S.shake.amp || 0) || S.shake.t <= 0) S.shake = { amp: amp, t: dur, dur: dur }; }
  function flash(rgb, a, dur) { S.flash = { rgb: rgb, a: a, t: dur, dur: dur }; }
  function floater(o) { o.t = 0; o.dur = o.dur || 0.9; S.floaters.push(o); }
  function dmgFloaterBoss(amount, kind) {
    var big = amount >= S.view.bossMax * 0.02;
    floater({ x: BOSS_CX + rnd(-30, 30), y: BOSS_CY, text: fmtNum(amount), size: big ? 48 : 28, grow: big ? 48 : 36, color: big ? '#ffe066' : (kind === 'crit' ? '#ff6a6a' : '#fff'), stroke: big ? '#c62828' : PAL.ink, rise: 60, bounce: big, dur: 0.9 });
  }
  function dmgFloaterAlly(target, amount, kind) {
    var x, y, size = 22;
    if (target === 'hero') { x = 215; y = HERO_Y - 22; }
    else { var i = compIdx(target); if (i < 0) i = 0; x = compX(i); y = COMP_Y - 2 + (i % 2 ? 16 : 0); size = 16; } // 仲間は絵文字の上に小さく・互い違い(へっぽこの行に重ねない)
    var txtS = kind === 'miss' ? 'ミス' : (kind === 'heal' ? '+' : '') + fmtNum(amount);
    floater({ x: x, y: y, text: txtS, size: size, grow: size, color: kind === 'heal' ? '#9df29d' : '#ff6a6a', stroke: PAL.ink, rise: target === 'hero' ? 22 : 12, dur: 0.9, guard: kind === 'guarded' && target === 'hero' });
  }
  function pop(id, icon) { S.pops[id] = { t: 0.6, icon: icon }; }
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
    var per = SETTINGS.speed === 3 ? 0 : 0.02;
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
        var nm = mv ? mv.name.replace(/[(（].*?[)）]/g, '') : ''; return (nm ? '大魔王の ' + nm + '!! ' : '') + 'くらえーーっ!!'; }
    }
    return e.text;
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
      if (e.type === 'damage' && e.kind === 'comp' && !e.finisher && SETTINGS.speed === 3) { // はやい: 仲間の攻撃をまとめる
        var grp = [e], k2 = i + 1;
        while (k2 < evs.length && evs[k2].type === 'damage' && evs[k2].kind === 'comp' && !evs[k2].finisher) { grp.push(evs[k2]); k2++; }
        if (grp.length >= 2) { out.push({ type: 'compgroup', hits: grp }); i = k2; continue; }
      }
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
      case 'say': setMsg([e.text], true); if (SETTINGS.speed === 1) S.wait = Infinity; AUDIO.sfx('talk'); break;
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
        setMsg([e.text], true); pop(e.who, ICON[e.kind] || '💬');
        if (e.kind === 'guardStance') AUDIO.sfx('guard');
        if (e.kind === 'heal') { AUDIO.sfx('heal'); if (e.target === 'all') { for (var id in S.view.comps) { var vc = S.view.comps[id]; if (vc.alive) vc.hp = Math.min(vc.maxHp, vc.hp + Math.floor(vc.maxHp * 0.2)); } } else if (e.target && e.target !== 'hero' && S.view.comps[e.target]) { var v2 = S.view.comps[e.target]; v2.hp = Math.min(v2.maxHp, v2.hp + (e.amount || 0)); dmgFloaterAlly(e.target, e.amount || 0, 'heal'); } }
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
        var guardN = 0, isBig = e.type === 'bigdmg';
        if (isBig) { flash([255, 255, 255], 0.8, 0.25); shake(14, 0.6); AUDIO.sfx('bighit'); guardN = S.st.guardCount || 0; } else { shake(6, 0.3); AUDIO.sfx('hurt'); }
        e.hits.forEach(function (h) { applyDamageView(h); dmgFloaterAlly(h.target, h.amount, h.kind === 'miss' ? 'miss' : (isBig && guardN > 0 ? 'guarded' : h.kind)); rowShake(h.target); });
        if (isBig) setMsg([guardN > 0 ? '🛡️ 守りの かまえで ダメージが へった!' : 'みんなに 大ダメージ!!'], false); else setMsg(['みんなに ダメージ!'], false);
        break; }
      case 'compgroup': {
        var sum = 0; e.hits.forEach(function (h) { applyDamageView(h); sum += h.amount; pop(h.who, '💥'); });
        dmgFloaterBoss(sum, 'comp'); lunge(-10); AUDIO.sfx('bighit');
        setMsg([e.hits.length + '組が いっせいに 攻撃! 合計 ' + fmtNum(sum) + ' の ダメージ!'], true);
        break; }
      case 'heal': {
        if (e.target === 'hero') { S.view.heroHp = Math.min(S.view.heroMax, S.view.heroHp + e.amount); dmgFloaterAlly('hero', e.amount, 'heal'); setMsg(['へっぽこの HPが ' + fmtNum(e.amount) + ' 回復!'], false); AUDIO.sfx('heal'); }
        else if (e.target === 'boss') { S.view.bossHp = Math.min(S.view.bossMax, S.view.bossHp + e.amount); floater({ x: BOSS_CX, y: BOSS_CY, text: '+' + fmtBig(e.amount), size: 30, grow: 30, color: '#9df29d', stroke: PAL.ink, rise: 40, dur: 0.9 }); setMsg(['大魔王の HPが ' + fmtBig(e.amount) + ' 回復した…'], false); AUDIO.sfx('heal'); }
        else { var pct = parseFloat(e.amount) || 0; for (var cid in S.view.comps) { var vv = S.view.comps[cid]; if (vv.alive) { vv.hp = Math.min(vv.maxHp, vv.hp + Math.floor(vv.maxHp * pct / 100)); dmgFloaterAlly(cid, Math.floor(vv.maxHp * pct / 100), 'heal'); } } setMsg(['みんなの HPが 回復した!'], false); AUDIO.sfx('heal'); }
        break; }
      case 'mood': {
        S.view.mood = e.mood; S.moodPop = 0.5;
        if (e.text) { setMsg([e.text], true); if (e.mood === 'laugh') AUDIO.sfx('laugh'); else if (e.mood === 'angry') AUDIO.sfx('hurt'); else if (e.mood === 'charge') AUDIO.sfx('warn'); else AUDIO.sfx('talk'); }
        else S.wait = 0.25 * speedMul();
        break; }
      case 'phase': {
        S.view.phase = e.phase; S.phaseTint = { t: 1.5, i: e.phase }; shake(8, 0.4); AUDIO.sfx('bighit');
        setMsg(['大魔王の ようすが 変わった!(' + e.name + ')'], true);
        break; }
      case 'shake': shake(e.power === 'big' ? 14 : 6, e.power === 'big' ? 0.6 : 0.3); S.wait = 0; break;
      case 'warn': S.warnT = 1.4; S.yellow = 1.0; AUDIO.sfx('warn'); break;
      case 'bigattack': S.view.mood = 'normal'; S.warnT = 0; flash([138, 43, 226], 0.7, 0.3); lunge(40); S.bigT = 0; AUDIO.sfx('warn'); break;
      case 'revive': { var vr = S.view.comps[e.target]; var cr = compOf(e.target); if (vr && cr) { vr.alive = true; vr.hp = Math.floor(cr.maxHp / 2); } pop(e.target, '💚'); pop(e.who, '🙏'); setMsg([e.text], true); AUDIO.sfx('heal'); break; }
      case 'down': { var vd = S.view.comps[e.who]; if (vd) { vd.alive = false; vd.hp = 0; } setMsg([e.text], true); AUDIO.sfx('hurt'); rowShake(e.who); break; }
      case 'end': onEnd(e.result); S.wait = 0; break;
      case 'turn': S.view = snapshot(S.st); if (e.hint) S.hint = e.hint; S.wait = 0; break;
      case 'win': S.spin = 0; flash([255, 255, 255], 0.9, 0.5); shake(20, 1.0); confetti(); AUDIO.sfx('fanfare'); AUDIO.bgm('victory'); setMsg([''], true); break;
      case 'lose': S.dark = 0; S.heroFace = '😵'; AUDIO.bgm('sad'); AUDIO.sfx('lose'); setMsg(['へっぽこは 目の前が まっくらに なった…'], true); break;
      case 'bigtext': S.bigText = { t: 0, text: e.text }; AUDIO.sfx('fanfare'); setMsg([e.text, '(タップで つぎへ)'], true); S.wait = Infinity; break;
      case 'go': S.wait = 0; S.pendingGo = e.to; break;
      default: S.wait = 0;
    }
    if (SETTINGS.speed === 1 && TAPWAIT[e.type] && e.type !== 'mood') S.wait = Infinity;
    if (SETTINGS.speed === 1 && e.type === 'mood' && e.text) S.wait = Infinity;
    S.msgDirty = true;
  }

  /* ---------- 戦いの終わり ---------- */
  function onEnd(result) {
    S.mode = 'over'; S.result = result;
    try { localStorage.removeItem('heppoko.battle'); } catch (e) {}
    if (window.P) { P.discovered = P.discovered || {}; for (var k in S.st.discovered) P.discovered[k] = true; }
    G.lastBattle = { turns: S.st.turn, combos: S.st.combos, finisher: S.finisher || 'へっぽこ', won: result === 'win' };
    hide(S.dom.cmds); hide(S.dom.grid); S.dom.hint.textContent = ''; hide(S.dom.hint);
    var L = window.DATA.BOSS.lines;
    if (result === 'win') {
      S.queue.push({ type: 'win' });
      (L.lose || []).forEach(function (t) { S.queue.push({ type: 'say', text: t }); });
      S.queue.push({ type: 'bigtext', text: '大魔王を たおした!' });
      S.queue.push({ type: 'go', to: 'win' });
    } else {
      S.queue.push({ type: 'lose' });
      (L.win || []).forEach(function (t) { S.queue.push({ type: 'say', text: t }); });
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
    if (S.gridMode) openGrid(S.gridMode); else hide(S.dom.grid);
    S.dom.next.style.display = 'none';
  }
  function setCmdsEnabled(on) { [S.dom.bAtk, S.dom.bWeird, S.dom.bGuard].forEach(function (b) { b.disabled = !on; }); }
  function save() {
    try { localStorage.setItem('heppoko.battle', JSON.stringify({ st: S.st, gridMode: S.gridMode, bigMove: S.bigMove })); } catch (e) {}
  }
  function choose(cmd) {
    if (!S || S.mode !== 'wait') return false;
    S.mode = 'play'; setCmdsEnabled(false); hide(S.dom.grid); hideBubble();
    S.dom.hint.textContent = ''; hide(S.dom.hint); S.dom.bGuard.classList.remove('guardglow'); S.dom.bGuard.style.transform = '';
    var res = BATTLE.runTurn(S.st, cmd, ITEMSREF(), window.DATA.BOSS, S.rng);
    var ended = res.events.some(function (e) { return e.type === 'end'; });
    if (!ended) save();
    S.queue = S.queue.concat(prepare(res.events));
    return true;
  }

  /* ---------- 一覧(グリッド) ---------- */
  function gridButton(emoji, name, sub, color, desc, onPick) {
    var b = el('button'); b.type = 'button';
    b.innerHTML = '<span class="e">' + emoji + '</span><span class="nm" style="flex:1;line-height:1.2">' + esc(name) + (sub ? '<small style="display:block;font-size:13px;font-weight:800;opacity:.85">' + esc(sub) + '</small>' : '') + '</span>';
    b.style.background = color;
    var timer = null, lp = false, sx = 0, sy = 0;
    b.addEventListener('pointerdown', function (ev) { ev.stopPropagation(); lp = false; sx = ev.clientX; sy = ev.clientY; clearTimeout(timer); timer = setTimeout(function () { lp = true; showBubble(desc); }, 400); });
    b.addEventListener('pointermove', function (ev) { if (Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) > 10) clearTimeout(timer); });
    function endp() { clearTimeout(timer); hideBubble(); }
    b.addEventListener('pointerup', endp); b.addEventListener('pointercancel', endp); b.addEventListener('pointerleave', endp);
    b.addEventListener('click', function (ev) { ev.stopPropagation(); if (lp) { lp = false; return; } if (b.disabled) return; AUDIO.sfx('tap'); onPick(); });
    return b;
  }
  function showBubble(text) { if (!text) return; S.dom.bubble.textContent = text; show(S.dom.bubble); }
  function hideBubble() { if (S && S.dom) hide(S.dom.bubble); }
  function openGrid(mode) {
    var g = S.dom.grid; g.innerHTML = ''; S.gridMode = mode;
    var glow = (S.hint && S.hint.glow) || [], moodName = (BATTLE.MOODS[S.st.boss.mood] || {}).name || '';
    if (mode === 'attack') {
      var items = ITEMSREF(), list = S.st.hero.items.filter(function (id) { return items[id] && items[id].attack; });
      if (!list.length) list = [];
      list.forEach(function (id) {
        var it = items[id], heal = it.attack.type === 'heal';
        g.appendChild(gridButton((it.look && it.look.emoji) || '⚔️', it.name, heal ? '回復' : it.attack.name, '#ffd9a0', it.attack.name + ': ' + (it.desc || ''), function () { choose({ kind: 'attack', itemId: id }); }));
      });
      if (!list.length) { var none = el('div', '', 'こうげきできる そうびが ない!'); none.style.cssText = 'grid-column:1/-1;color:#fff;font-weight:800;text-align:center;padding:10px'; g.appendChild(none); }
    } else {
      var used = {}; for (var key in S.st.comboUsed) used[key.split(':')[1]] = true;
      (window.DATA.COMMANDS || []).forEach(function (c) {
        var isGlow = glow.indexOf(c.id) >= 0, mamaGone = c.id === 'mama' && S.st.hero.mamaUsed;
        var b = gridButton(CMD_EMOJI[c.id] || '🤪', c.name, isGlow ? moodName + 'に きく' : (mamaGone ? 'もう来ない' : null), '#ffc6ea', c.desc, function () { choose({ kind: 'waste', id: c.id, name: c.name, text: c.text }); });
        if (isGlow) b.classList.add('glow');
        if (used[c.id]) b.appendChild(el('span', 'chk', '✓'));
        if (mamaGone) b.disabled = true;
        g.appendChild(b);
      });
    }
    var close = el('button', 'small', '▲ とじる'); close.type = 'button'; close.style.cssText = 'grid-column:1/-1;background:#d9d4e8;min-height:48px';
    close.addEventListener('click', function (ev) { ev.stopPropagation(); AUDIO.sfx('cancel'); hide(g); S.gridMode = null; });
    g.appendChild(close);
    show(g); g.scrollTop = 0;
  }
  var CMD_EMOJI = { talk: '💬', tsukkomi: '👉', soothe: '🫳', janken: '✊', ignore: '🙈', dajare: '🥶', tea: '🍵', glare: '👀', sorry: '🙇', flee: '🏃', fake: '🤺', cry: '😭', boast: '💰', money: '💴', praise: '👏', sleep: '😴', dance: '💃', sing: '🎤', hungry: '🍽️', pray: '🙏', photo: '🤳', pout: '😤', mama: '👩', play_dead: '🫠', tickle: '🫦', hug: '🤗', count: '🔢', space_out: '☁️', homework_cmd: '📓', onigiri: '🍙', greet: '👋', mimic: '🎭', riddle_cmd: '❓', lecture: '📢', toilet: '🚽', sneeze: '🤧' };

  /* ---------- DOM を作る ---------- */
  function buildDom() {
    var root = el('div'); root.id = 'battle'; root.style.pointerEvents = 'none'; // 子だけ押せる(canvas のタップを通す)
    var hint = el('div', 'hint hidden'); hint.style.cssText = 'top:296px;font-size:15px;line-height:1.3;pointer-events:none;background:rgba(27,20,48,.85);border-radius:12px;padding:3px 10px'; // フキダシ型(炎に重なっても読める)
    var msg = el('div', 'msg'); msg.style.pointerEvents = 'auto';
    var body = el('div', 'body'); var next = el('div', 'next', '▼'); msg.appendChild(body); msg.appendChild(next);
    msg.addEventListener('pointerdown', function (ev) { ev.stopPropagation(); onTap(); });
    var cmds = el('div', 'cmds'); cmds.style.pointerEvents = 'auto';
    function bigBtn(emoji, label, cls, fn) {
      var b = btn('<span class="e" style="font-size:24px;line-height:1">' + emoji + '</span><span>' + label + '</span>', cls, fn);
      b.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;font-size:15px;padding:0 2px;line-height:1.15';
      return b;
    }
    var bAtk = bigBtn('⚔️', 'たたかう', 'orange', function () { if (S.mode !== 'wait') return; if (S.gridMode === 'attack') { hide(S.dom.grid); S.gridMode = null; } else openGrid('attack'); });
    var bWeird = bigBtn('🤪', 'へんなこと', 'pink', function () { if (S.mode !== 'wait') return; if (S.gridMode === 'weird') { hide(S.dom.grid); S.gridMode = null; } else openGrid('weird'); });
    var bGuard = bigBtn('🛡️', 'まもる', 'sky', function () { if (S.mode !== 'wait') return; AUDIO.sfx('guard'); choose({ kind: 'guard' }); });
    var bSpd = btn('', 'spd', function () { SETTINGS.speed = SETTINGS.speed >= 3 ? 1 : SETTINGS.speed + 1; saveSettings(); spdLabel(); });
    bSpd.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;line-height:1.1';
    function spdLabel() { bSpd.innerHTML = '<span style="font-size:18px">⏩</span><span>' + ['', '手動', 'ふつう', 'はやい'][SETTINGS.speed] + '</span>'; }
    spdLabel();
    cmds.appendChild(bAtk); cmds.appendChild(bWeird); cmds.appendChild(bGuard); cmds.appendChild(bSpd);
    var grid = el('div', 'grid hidden'); grid.style.pointerEvents = 'auto';
    var bubble = el('div', 'hidden'); bubble.style.cssText = 'position:absolute;left:8px;top:572px;width:374px;min-height:72px;background:#fffaf0;color:#1b1430;border:3px solid #1b1430;border-radius:14px;padding:10px 14px;font-size:17px;font-weight:800;line-height:1.5;z-index:5;pointer-events:none';
    root.appendChild(hint); root.appendChild(msg); root.appendChild(cmds); root.appendChild(grid); root.appendChild(bubble);
    S.dom = { root: root, hint: hint, msg: msg, body: body, next: next, cmds: cmds, bAtk: bAtk, bWeird: bWeird, bGuard: bGuard, bSpd: bSpd, grid: grid, bubble: bubble };
    ui.appendChild(root);
  }

  /* ---------- タップ(速送り・文字送り) ---------- */
  function onTap() {
    if (!S || S.mode === 'wait' || !S.cur) return;
    if (!typingDone()) { S.typing.n = S.typing.full.length; S.msgDirty = true; if (S.wait === Infinity) return; }
    if (PROTECT[S.cur.type]) return;
    S.wait = 0;
  }

  /* ---------- 新しい画面の状態 ---------- */
  function fresh() {
    return { st: null, rng: null, dom: null, view: null, shownBossHp: 0, shownHeroHp: 0, queue: [], cur: null, wait: 0, typing: null, msgLines: [], msgDirty: true,
      floaters: [], confetti: [], flash: null, shake: { amp: 0, t: 0, dur: 1 }, lunge: null, pops: {}, rowShake: null, peelT: 0, barFlash: 0, warnT: 0, yellow: 0, phaseTint: null, heroPop: 0, moodPop: 0,
      combo: null, finisherT: -1, finisherAmt: 0, finisher: null, finisherLabel: '', spin: -1, dark: -1, heroFace: '🧒', bigText: null, bigT: -1, pendingGo: null,
      mode: 'play', gridMode: null, pinch: false, bigMove: null, hint: null, lastHeroAtk: null, result: null, resumed: false };
  }

  /* ========== 場面 ========== */
  SCENES.battle = {
    enter: function () {
      S = fresh();
      var saved = null; try { saved = JSON.parse(localStorage.getItem('heppoko.battle') || 'null'); } catch (e) { saved = null; }
      if (saved && saved.st && saved.st.boss && saved.st.hero) { S.st = saved.st; S.gridMode = saved.gridMode || null; S.bigMove = saved.bigMove || null; S.resumed = true; }
      else S.st = BATTLE.newState(heroSt(), ids(), comps(), window.DATA.BOSS);
      S.rng = BATTLE.makeRng(Date.now());
      S.view = snapshot(S.st); S.shownBossHp = S.view.bossHp; S.shownHeroHp = S.view.heroHp;
      buildDom();
      if (window.HUD && HUD.hide) HUD.hide();
      AUDIO.bgm('battle');
      if (S.resumed) goWait();
      else { S.mode = 'play'; (window.DATA.BOSS.lines.intro || []).forEach(function (t) { S.queue.push({ type: 'say', text: t }); }); S.queue.push({ type: 'turn', hint: null }); }
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
      if (layersOf(S.shownBossHp) < before) peel();
      S.shownHeroHp = Math.abs(S.view.heroHp - S.shownHeroHp) < 0.5 ? S.view.heroHp : lerp(S.shownHeroHp, S.view.heroHp, 1 - Math.pow(0.01, dt / 0.3));
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
      drawBg(); drawBoss(); drawHud(); if (S.dark < 0) drawAllies(); drawFloaters(); drawOverlays(); if (S.dark >= 0) drawAllies();
      ctx.restore();
    },
    tap: function () { onTap(); },
    key: function (k) { if (k === ' ' || k === 'Enter') onTap(); }
  };

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
    var dy = 0, sc = 1, rot = 0, alpha = 1;
    if (S.lunge) { dy = Math.sin(Math.PI * S.lunge.t / 0.3) * S.lunge.amp; }
    if (S.bigT >= 0 && S.bigT < 1.2) sc = 1 + 0.25 * Math.sin(Math.PI * S.bigT / 1.2); // 大技: ふくらむ
    if (S.spin >= 0) { rot = S.spin * 9; sc = Math.max(0.02, 1 - S.spin / 2.2); alpha = clamp(1 - S.spin / 2.2, 0, 1); }
    if (S.view.phase >= 3) sc *= 1.08;
    // 足元の炎
    var fl = 1 + 0.12 * Math.sin(G.t * 9), fl2 = 1 + 0.12 * Math.cos(G.t * 7);
    if (S.spin < 0) { ATL.draw('🔥', 150, 284, 56 * fl); ATL.draw('🔥', 240, 284, 56 * fl2); }
    ctx.save(); ctx.translate(BOSS_CX, BOSS_CY + dy); ctx.rotate(rot); ctx.scale(sc, sc);
    // 角(三角 2 つ)
    ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.moveTo(-60, -70); ctx.lineTo(-30, -78); ctx.lineTo(-45, -112); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(60, -70); ctx.lineTo(30, -78); ctx.lineTo(45, -112); ctx.closePath(); ctx.fill();
    BIG.draw(bossFace(), 0, 0, BOSS_SIZE, alpha);
    if (S.view.phase >= 3 && S.spin < 0) { ctx.fillStyle = 'rgba(255,40,40,.55)'; ctx.beginPath(); ctx.arc(-28, -20, 7, 0, Math.PI * 2); ctx.arc(28, -20, 7, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
    // 気分の絵文字(頭の右上・大きく)
    var m = S.view.mood;
    if (m && m !== 'normal' && BATTLE.MOODS[m] && S.spin < 0) {
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
    txt(S.st.boss.name, 8, 14, 16, '#fff', 'left', 900, null);
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
    txt('あと ' + k + ' 層', bx + 4, by + bh + 1, 12, '#ffe9b3', 'left', 800, null);
  }
  function hpColor(p) { return p > 0.5 ? '#2e7d32' : p > 0.25 ? '#f9a825' : '#c62828'; }
  function drawAllies() {
    // へっぽこの行
    var hx = 0; if (S.rowShake && S.rowShake.target === 'hero') hx = Math.sin(S.rowShake.t * 60) * 6;
    var hs = S.heroPop > 0 ? 1 + 0.3 * (S.heroPop / 0.3) : 1;
    ATL.draw(S.heroFace, 24 + hx, HERO_Y, 32 * hs);
    txt('へっぽこ', 44 + hx, HERO_Y, 17, '#fff', 'left', 900, null);
    var p = S.view.heroMax ? S.shownHeroHp / S.view.heroMax : 0;
    rrect(124, HERO_Y - 7, 148, 14, 7, '#3a2d55');
    if (p > 0) { var blink = p <= 0.3 && Math.floor(G.t * 4) % 2 === 0; rrect(124, HERO_Y - 7, 148 * clamp(p, 0, 1), 14, 7, blink ? '#ff6a6a' : hpColor(p)); }
    rrect(124, HERO_Y - 7, 148, 14, 7, null, '#fff', 2);
    if (p <= 0.15 && p > 0 && Math.floor(G.t * 3) % 2 === 0) txt('ピンチ!', 198, HERO_Y, 14, '#ff6a6a', 'center', 900, '#fff');
    txt(Math.ceil(S.shownHeroHp) + '/' + S.view.heroMax, 278, HERO_Y, 15, '#fff', 'left', 900, null);
    // 仲間 10 組
    S.st.comps.forEach(function (c, i) {
      var v = S.view.comps[c.id] || { hp: c.hp, maxHp: c.maxHp, alive: c.alive, count: c.count };
      var x = compX(i), dx = 0; if (S.rowShake && S.rowShake.target === c.id) dx = Math.sin(S.rowShake.t * 60) * 6;
      var pp = S.pops[c.id], sc = pp && pp.t > 0.4 ? 1 + 0.3 * ((pp.t - 0.4) / 0.2) : 1;
      if (!v.alive) { ATL.draw('😵', x + dx, COMP_Y, 26, 0.55); }
      else {
        ATL.draw(c.emoji, x + dx, COMP_Y, 28 * sc);
        if (v.count >= 2) { var n = Math.max(1, Math.ceil(v.count * v.hp / v.maxHp)); txt(n >= 1000 ? Math.floor(n / 1000) + 'k' : String(n), x + 14, COMP_Y + 10, 12, '#ffe066', 'right', 900, PAL.ink); }
      }
      if (pp) ATL.draw(pp.icon, x + 13, COMP_Y - 17, 20);
      // HP の点
      var q = v.maxHp ? v.hp / v.maxHp : 0;
      ctx.beginPath(); ctx.arc(x, DOT_Y, 5, 0, Math.PI * 2);
      if (!v.alive) { ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#000'; ctx.stroke(); }
      else { ctx.fillStyle = hpColor(q); ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.stroke(); }
    });
  }
  function drawFloaters() {
    S.floaters.forEach(function (f) {
      var u = f.t / f.dur, y = f.y - f.rise * u, size = f.size + (f.grow - f.size) * Math.min(1, u * 3);
      if (f.bounce) y += Math.abs(Math.sin(u * Math.PI * 2)) * -10 * (1 - u);
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

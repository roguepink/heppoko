'use strict';
/* 店・そうび・なかま・もちもの・家の中(家・城・教会・宿・おばさんの家)・仲間の誘い方 */
/* ---------- この係の見た目(クリーム地+こげ茶の絵本カード)。1回だけ差し込む ---------- */
(function () {
  if (document.getElementById('css-menu')) return;
  var st = document.createElement('style'); st.id = 'css-menu';
  st.textContent = [
    '.panel.mn{background:var(--cream,#fff6e6);color:var(--ink,#5a3d2b);font-family:"Hiragino Maru Gothic ProN","Hiragino Sans","Yu Gothic UI","Meiryo","Noto Sans JP",system-ui,sans-serif}',
    '.panel.mn .head h2{color:var(--ink,#5a3d2b)}',
    '.panel.mn .head .sub{color:#8a6448;font-size:17px;font-weight:800;line-height:1.35}',
    '.panel.mn .xbtn{background:var(--card,#fff);color:var(--ink,#5a3d2b);border-color:var(--ink,#5a3d2b);box-shadow:0 4px 0 var(--ink,#5a3d2b)}',
    '.panel.mn .info{color:var(--ink,#5a3d2b);font-size:17px}',
    '.panel.mn .info span{background:#fff;border:2px solid rgba(90,61,43,.25);border-radius:12px;padding:1px 9px;margin-bottom:4px}',
    '.panel.mn .list{padding:6px 10px 10px}',
    '.panel.mn .list::-webkit-scrollbar-thumb{background:var(--orange,#ffb35c)}',
    '.panel.mn .list .sec{color:var(--ink,#5a3d2b);border-bottom:3px dotted rgba(90,61,43,.35);padding:12px 6px 6px;margin-bottom:8px}',
    '.panel.mn .row-item{background:var(--card,#fff);color:var(--ink,#5a3d2b);border:3px solid var(--ink,#5a3d2b);border-radius:20px;box-shadow:0 4px 0 rgba(90,61,43,.28);margin-bottom:10px;padding:8px 10px;transition:transform .12s,box-shadow .12s;cursor:pointer}',
    '.panel.mn .row-item.sel{transform:translateY(-4px);box-shadow:0 8px 0 var(--gold-d,#d9a400);background:#fffbe3;border-color:var(--gold-d,#d9a400)}',
    '.panel.mn .row-item.dim{opacity:1}',
    '.panel.mn .row-item .e{width:48px;height:48px;border-radius:50%;font-size:28px;display:flex;align-items:center;justify-content:center;background:#f3ead8;border:2px solid rgba(90,61,43,.22)}',
    '.panel.mn .row-item .nm small{font-size:17px;opacity:.9;margin-top:2px}',
    '.panel.mn .row-item .pr{color:var(--ink,#5a3d2b)}',
    '.panel.mn .up,.panel.mn .row-item.sel .up{color:#2e7d32}.panel.mn .dn,.panel.mn .row-item.sel .dn{color:#c62828}',
    /* 値段の金色の札(パロディ: 値段を大きく) */
    '.mn .tag{display:inline-block;background:var(--gold,#ffd84d);border:3px solid var(--ink,#5a3d2b);border-radius:8px 18px 18px 8px;padding:3px 10px 3px 17px;font-size:20px;font-weight:900;color:var(--ink,#5a3d2b);box-shadow:0 3px 0 var(--gold-d,#d9a400);position:relative}',
    '.mn .tag:before{content:"";position:absolute;left:4px;top:50%;width:6px;height:6px;margin-top:-3px;border-radius:50%;background:var(--cream,#fff6e6);border:2px solid var(--ink,#5a3d2b)}',
    '.mn .tag.no{background:#f1e6e6;color:#b23a3a;box-shadow:0 3px 0 #d8bcbc}',
    '.mn .badge{display:inline-block;border:3px solid var(--ink,#5a3d2b);border-radius:14px;padding:3px 10px;font-size:17px;font-weight:900;color:var(--ink,#5a3d2b);background:var(--leaf,#9be38a)}',
    '.mn .badge.eq{background:var(--pink,#ff8fc8)}',
    '.mn .desc{color:var(--ink,#5a3d2b);background:#fff;border:3px dashed rgba(90,61,43,.35);border-radius:16px;margin:-2px 2px 10px;padding:10px 12px}',
    '.mn .buybox{display:flex;gap:8px;align-items:stretch;margin:10px 0 2px}',
    '.mn .buybox .big{flex:1 1 auto;min-width:0;min-height:64px;font-size:20px;padding:0 6px;border-radius:22px;white-space:nowrap;letter-spacing:-.5px}',
    '@media (max-width:360px){.mn .buybox .big{font-size:18px}.mn .buybox .mini{flex-basis:88px!important}}',
    '.mn .buybox .mini{flex:0 0 100px;min-height:56px;font-size:17px;padding:0 4px;border-radius:22px;align-self:center}',
    '.mn .buybox .note{flex:1;text-align:center;font-weight:900;font-size:var(--fs,20px);padding:10px 0}',
    '.panel.mn .foot{background:#f6e4c4;border-top:3px solid var(--ink,#5a3d2b);padding:10px 8px 12px}',
    '.panel.mn .foot button{border-radius:22px;font-size:18px}',
    '.panel.mn .foot button.back{flex:0 0 122px;background:var(--card,#fff)}',
    '.panel.mn .foot button.lav{flex:1}',
    '.panel.mn .roles .chip{background:#fff;color:var(--ink,#5a3d2b);border:2px solid rgba(90,61,43,.3);font-size:17px}',
    '.panel.mn .roles .chip b{color:var(--orange-d,#e08a2a)}',
    '.panel.mn .roles .chip.zero{background:#ffd9d9;border-color:#d9534f}.panel.mn .roles .chip.zero b{color:#c62828}',
    '.panel.mn .roles .warnline{background:#fff0ee;border-color:#e06a5a;color:#a33528;font-size:17px}',
    /* なかま画面: 行の右に はずす と ▲▼ */
    '.mn .prow .ctl{display:flex;gap:6px;align-items:center;flex:none}',
    '.mn .prow .ud{display:flex;flex-direction:column;gap:6px}',
    '.mn .prow .ud button{width:52px;min-height:48px;height:48px;padding:0;font-size:20px;border-radius:16px;box-shadow:0 3px 0 var(--ink,#5a3d2b)}',
    '.mn .prow .off{width:84px;min-height:56px;padding:0 4px;font-size:17px;border-radius:18px}',
    '.mn .prow .nm{cursor:pointer}',
    /* 名前は 1行で。入らないときは 字を 少しずつ 縮める(17px まで。fitNames) */
    '.panel.mn .row-item .nm{min-width:0}',
    '.panel.mn .row-item .nm .n{display:block;white-space:nowrap;overflow:hidden}',
    '.panel.mn .row-item .nm .l2{display:flex;align-items:center;justify-content:flex-end;flex-wrap:wrap;gap:4px 6px}',
    '.panel.mn .row-item .nm .l2 small{flex:1 1 auto;min-width:0}',
    '.panel.mn .row-item .nm .l2 .pr{flex:none}',
    '.mn .up,.mn .dn{white-space:nowrap}',
    '.panel.mn .row-item .nm .n.wrap{white-space:normal;word-break:keep-all;overflow-wrap:anywhere}',
    '.mn .roombtn{width:100%;min-height:62px;margin-bottom:12px;font-size:19px;border-radius:22px}',
    /* なかま紹介所: 絞りこみボタンと 仲間カード */
    '.mn .flt{display:flex;gap:6px;padding:0 10px 8px}',
    '.mn .flt button{min-width:56px;min-height:60px;padding:2px 0 0;font-size:17px;letter-spacing:-1px;border-radius:18px;background:#fff;box-shadow:0 4px 0 var(--ink,#5a3d2b);display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.1;white-space:nowrap}',
    '.mn .flt button .fe{font-size:20px;letter-spacing:0}',
    '.mn .flt button.on{background:var(--gold,#ffd84d);box-shadow:0 4px 0 var(--gold-d,#d9a400)}',
    '.mn .ccard{display:flex;gap:10px;align-items:flex-start;background:#fff;border:3px solid var(--ink,#5a3d2b);border-radius:20px;box-shadow:0 4px 0 rgba(90,61,43,.28);padding:10px;margin-bottom:12px;cursor:pointer;min-height:56px;transition:transform .12s,box-shadow .12s;-webkit-tap-highlight-color:transparent}',
    '.mn .ccard:active{transform:scale(.98)}',
    '.mn .ccard.mem{background:#eefbe9}',
    '.mn .ccard.sel{background:#fffbe3;border-color:var(--gold-d,#d9a400);box-shadow:0 8px 0 var(--gold-d,#d9a400);transform:translateY(-3px)}',
    '.mn .ccard.swap{border-style:dashed;border-color:#e0609f}',
    '.mn .ccard .e{flex:none;width:58px;height:58px;border-radius:50%;font-size:32px;display:flex;align-items:center;justify-content:center;background:#ffe3f1;border:2px solid rgba(90,61,43,.22)}',
    '.mn .ccard .bd{flex:1;min-width:0}',
    '.mn .ccard .n{font-size:20px;font-weight:900;line-height:1.25;word-break:keep-all;overflow-wrap:anywhere}',
    '.mn .ccard .meta{display:flex;flex-wrap:wrap;gap:4px 8px;align-items:center;margin:5px 0 3px;font-size:17px;font-weight:900}',
    '.mn .ccard .rl{border:2px solid var(--ink,#5a3d2b);border-radius:12px;padding:0 8px;white-space:nowrap}',
    '.mn .ccard .rl.attack{background:#ffe0d6}.mn .ccard .rl.guard{background:#dff0ff}.mn .ccard .rl.heal{background:#e2f7dc}.mn .ccard .rl.support{background:#fff2c4}.mn .ccard .rl.weird{background:#efe4ff}',
    '.mn .ccard .st{color:#e09a00;letter-spacing:1px;white-space:nowrap}',
    '.mn .ccard .ct{white-space:nowrap;opacity:.85}',
    '.mn .ccard .d{font-size:17px;line-height:1.4;opacity:.92}',
    '.mn .ccard .off{flex:none;align-self:center;width:80px;min-height:56px;font-size:17px;border-radius:18px;padding:0 4px}',
    '.mn .warnline{cursor:pointer}',
    '#dialog .choices button.nw{white-space:nowrap;font-size:18px;letter-spacing:-1px;padding:0 4px}',
    '.panel.mn .foot button.bigjoin{flex:1;font-size:20px;min-height:64px}',
    '.panel.mn .foot button.bigjoin:disabled{opacity:.6}',
    '.mn .lady{text-align:center;padding:26px 10px 10px;font-size:84px;line-height:1.1}',
    '.mn .lady small{display:block;font-size:20px;font-weight:900;margin-top:10px}'
  ].join('\n');
  document.head.appendChild(st);
})();
/* 行の名前を 1行に おさめる: はみ出したら 字を 1px ずつ 小さく(17px まで)。それでも 入らなければ 折りかえす */
function fitNames(root) {
  (root || ui).querySelectorAll('.row-item .nm .n:not(.fit)').forEach(function (n) {
    if (!n.clientWidth) return;   // まだ 見えていない
    n.classList.add('fit'); n.style.fontSize = '';
    var fs = parseFloat(getComputedStyle(n).fontSize) || 20;
    while (n.scrollWidth > n.clientWidth + 1 && fs > 17) { fs -= 1; n.style.fontSize = fs + 'px'; }
    if (n.scrollWidth > n.clientWidth + 1) n.classList.add('wrap');
  });
}
(function () {   // 行が 足されたら 次の描画で 合わせる
  var pend = false;
  new MutationObserver(function () { if (pend) return; pend = true; requestAnimationFrame(function () { pend = false; fitNames(); }); }).observe(ui, { childList: true, subtree: true });
})();
var SLOT_TINT = { head: '#ffe3ef', face: '#e6f0ff', body: '#e4f7df', rhand: '#fff0d6', lhand: '#fde7d3', cape: '#efe4ff', waist: '#e1f4f7', feet: '#fff6c9', ring: '#ffe0e0', charm: '#e8f6e9' }; // 部位ごとの うすい色
var HERO = { name: 'へっぽこ', emoji: '🤴' };
function panel(title, sub, full) {
  var pn = el('div', 'panel mn' + (full ? ' full' : '')); var head = el('div', 'head', '<h2>' + title + '</h2>' + (sub ? '<div class="sub">' + esc(sub) + '</div>' : ''));
  pn.appendChild(head); var x = btn('×', 'xbtn', function () { popScene(); }); pn.appendChild(x); ui.appendChild(pn); return pn;
}
function backBtn(label) { return btn(label || '◀ もどる', 'back', function () { AUDIO.sfx('cancel'); popScene(); }); } // 親指の届く 下の もどる
/* ---------- 仲間の役割の数(なかま画面・出発の確認・町の下の帯で使う) ---------- */
var ROLE_LIST = [['attack', '⚔️', 'こうげき'], ['guard', '🛡️', 'まもり'], ['heal', '💚', 'かいふく'], ['support', '🎵', 'おうえん'], ['weird', '🎲', 'へんな']];
function roleCounts() {
  var r = { attack: 0, guard: 0, heal: 0, support: 0, weird: 0 };
  P.party.forEach(function (id) { var c = COMPS[id]; if (c && c.battle && r[c.battle.role] !== undefined) r[c.battle.role]++; });
  return r;
}
function roleWarnHtml() { // 足りない役の 一言(なかま画面・紹介所)
  if (!P.party.length) return '';
  var rc = roleCounts(), h = '';
  if (!rc.guard) h += '<div class="warnline" data-r="guard">🛡️ まもり役が いない!(大技で あぶない)</div>';
  if (!rc.heal) h += '<div class="warnline" data-r="heal">💚 かいふく役が いない!(けがを なおせない)</div>';
  return h;
}
function statDiff(item, slot) { // いまの装備との差
  var cur = P.equip[slot] ? ITEMS[P.equip[slot]] : null, da = (item ? item.atk : 0) - (cur ? cur.atk : 0), dd = (item ? item.def : 0) - (cur ? cur.def : 0), dh = (item ? item.extra.hp : 0) - (cur ? cur.extra.hp : 0);
  var s = []; if (da) s.push((da > 0 ? '<span class="up">▲攻+' + da : '<span class="dn">▼攻' + da) + '</span>'); if (dd) s.push((dd > 0 ? '<span class="up">▲守+' + dd : '<span class="dn">▼守' + dd) + '</span>'); if (dh) s.push((dh > 0 ? '<span class="up">▲HP+' + dh : '<span class="dn">▼HP' + dh) + '</span>');
  return s.join(' ') || '<span style="opacity:.6">かわらない</span>';
}
function diffText(item) { // 買う確認窓用: いまの装備との差(文字だけ)
  var cur = P.equip[item.slot] ? ITEMS[P.equip[item.slot]] : null, da = item.atk - (cur ? cur.atk : 0), dd = item.def - (cur ? cur.def : 0), dh = (item.extra.hp || 0) - (cur ? (cur.extra.hp || 0) : 0);
  function f(lab, d) { return (d > 0 ? '▲' : '▼') + lab + (d > 0 ? '+' : '−') + Math.abs(d); }
  var s = []; if (da) s.push(f('攻', da)); if (dd) s.push(f('守', dd)); if (dh) s.push(f('HP', dh));
  return (cur ? 'いまの ' + cur.name + ' より' : 'いまは なにも つけていない') + '\n' + (s.join(' ') || 'かわらない');
}
function itemRow(item, right, onTap) {
  var r = el('div', 'row-item'); r.innerHTML = '<div class="e" style="background:' + (SLOT_TINT[item.slot] || '#f3ead8') + '">' + item.look.emoji + '</div><div class="nm"><span class="n">' + esc(item.name) + '</span><div class="l2"><small>' + SLOT_NAME[item.slot] + ' · ' + statDiff(item, item.slot) + '</small>' + (right.text ? '<div class="pr' + (right.no ? ' no' : '') + '">' + right.text + '</div>' : '') + '</div></div>';   // 名前は 行の幅いっぱい。値段は 2行目の右
  r.addEventListener('click', function () { AUDIO.sfx('tap'); onTap(r); }); return r;
}
function doEquip(item, then) {
  var before = heroStats(); var old = P.equip[item.slot]; P.equip[item.slot] = item.id; var after = heroStats(); AUDIO.sfx('equip');
  TOWN.refresh(); pushScene('showoff', { itemId: item.id, before: before, after: after, old: old }); if (then) then();
}

/* ---------- 店 ----------
   買う手順: 行を えらぶ(1) →「💰 かって そうび」(2) → 確認窓の「かう」(3) → お披露目(1タップで 店へ もどる)
   お披露目から もどったら、一覧は 同じ位置・同じ品を えらんだまま */
var BUY_ASIDE = { gold_poop: '(うんが つく)' }; // 買う前の ひとこと
var BUY_AFTER = { gold_poop: 'キラリ「…ほんとに 買う人 はじめて 見た」', legend_sword: 'ゴンゾウ「ねふだは はがしておいたぞ。…あ、まだ ついてた」' }; // 買ったあとの 店主の ひとこと
function shopScene(shopId) {
  var mem = { top: 0, sel: null }; // お披露目から もどったときの 一覧の位置
  return {
    enter: function (arg, prev) {
      var sh = SHOPS[shopId], self = this, owner = NPCS[sh.npc]; AUDIO.bgm('shop'); HUD.show(); HUD.setPlace(sh.name);
      var back = prev === 'showoff'; if (!back) { mem.top = 0; mem.sel = null; }
      var pn = panel(sh.emoji + ' ' + sh.name, '「' + sh.talk.hello + '」'); this.pn = pn;
      var info = el('div', 'info'); pn.appendChild(info); var list = el('div', 'list'); pn.appendChild(list); var foot = el('div', 'foot'); pn.appendChild(foot); this.list = list;
      var selId = null, descEl = null;
      function ownerToast(line) { toast(owner.emoji + ' ' + line, 2200); var t = ui.lastChild; if (t && t.className === 'toast') { t.classList.add('shoptoast'); t.style.pointerEvents = 'none'; t.style.top = '58px'; } } // 指を じゃましない。上のほうに 出す
      function refresh() { var st = heroStats(); info.innerHTML = '<span>' + sh.items.length + ' 品</span><span>いま: 攻 ' + st.atk + ' 守 ' + st.def + ' HP ' + st.hp + '</span>'; }
      function priceHtml(it) {
        if (P.equip[it.slot] === it.id) return '<span class="badge eq">そうび中</span>';
        if (hasItem(it.id)) return '<span class="badge">もってる</span>';
        return '<span class="tag' + (it.price > P.money ? ' no' : '') + '">' + fmtG(it.price) + '</span>';
      }
      function buy(it, andEquip) {
        if (hasItem(it.id)) return;
        if (it.price > P.money) { ownerToast(sh.talk.poor); return; }
        confirm(it.look.emoji + ' ' + it.name + ' を ' + fmtG(it.price) + ' で かう?' + (BUY_ASIDE[it.id] || '') + (andEquip ? '\n' + diffText(it) : '') + '\n(のこり ' + fmtG(P.money - it.price) + ')', '💰 かう', 'やめる', function (ok) {
          if (!ok) return; pay(it.price); P.items.push(it.id); AUDIO.sfx('buy'); autosave();
          var line = BUY_AFTER[it.id] || (owner.name + '「' + sh.talk.buy + '」');
          mem.sel = it.id; mem.top = list.scrollTop;
          if (andEquip) { doEquip(it); ownerToast(line); } else { ownerToast(line); build(); }
        }, 'orange');
      }
      function select(it, row) {
        list.querySelectorAll('.row-item').forEach(function (x) { x.classList.remove('sel'); }); if (descEl) descEl.remove();
        row.classList.add('sel'); selId = it.id; mem.sel = it.id;
        descEl = el('div', 'desc', esc(it.desc) + (it.attack ? '<br>⚔️ わざ:「' + esc(it.attack.name) + '」' : ''));
        var box = el('div', 'buybox');
        if (P.equip[it.slot] === it.id) box.appendChild(el('div', 'note', '✅ いま そうび中'));
        else if (hasItem(it.id)) box.appendChild(btn('🎽 そうびする', 'big orange', function () { mem.top = list.scrollTop; doEquip(it); }));
        else if (it.price > P.money) { box.appendChild(btn('😢 お金が たりない', 'big gray', function () { ownerToast(sh.talk.poor); })); }
        else {
          box.appendChild(btn('💰 かって そうび', 'big orange', function () { buy(it, true); }));
          box.appendChild(btn('かうだけ', 'mini lav', function () { buy(it, false); }));
        }
        descEl.appendChild(box); row.after(descEl);
        // えらんだ行と ボタンが 見えるように すこし うごかす
        var lb = list.getBoundingClientRect(), db = descEl.getBoundingClientRect();
        if (db.bottom > lb.bottom) list.scrollTop += Math.min(db.bottom - lb.bottom + 8, row.getBoundingClientRect().top - lb.top - 4);
      }
      function build() {
        var keep = list.scrollTop; list.innerHTML = ''; refresh(); descEl = null; var selRow = null, selIt = null;
        var lastSlot = null;
        sh.items.map(function (id) { return ITEMS[id]; }).filter(Boolean).sort(function (a, b) { return (SLOTS.indexOf(a.slot) - SLOTS.indexOf(b.slot)) || (a.price - b.price); }).forEach(function (it) {
          if (it.slot !== lastSlot) { lastSlot = it.slot; list.appendChild(el('div', 'sec', SLOT_EMOJI[it.slot] + ' ' + SLOT_NAME[it.slot])); } // 部位ごとの見出し
          var r = itemRow(it, { text: priceHtml(it) }, function (row) { if (selId === it.id && row.classList.contains('sel')) return; select(it, row); });
          list.appendChild(r); if (mem.sel === it.id) { selRow = r; selIt = it; }
        });
        list.scrollTop = keep;
        if (selRow) { var t = list.scrollTop; select(selIt, selRow); list.scrollTop = t; }
      }
      var talk = btn('💬 はなす', 'lav', function () { say({ name: owner.name, emoji: owner.emoji }, [pick(owner.lines)]); });
      foot.appendChild(backBtn()); foot.appendChild(talk);
      build(); if (back) list.scrollTop = mem.top;
    },
    leave: function () { if (this.list) mem.top = this.list.scrollTop; if (this.pn) this.pn.remove(); DIALOG.close(); },
    tap: function () { DIALOG.tap(); }, draw: drawDim, _shop: true
  };
}
/* 店の人の ひとこと(お知らせ)は、店と お披露目の あいだだけ。ほかの画面へ 移ったら 消す */
(function () {
  var goOrig = go;
  go = function (name, arg) {
    if (!(SCENES[name] && SCENES[name]._shop) && name !== 'showoff') ui.querySelectorAll('.toast.shoptoast').forEach(function (t) { t.remove(); });
    return goOrig(name, arg);
  };
})();
function drawDim() { SCENES.town.draw(); ctx.fillStyle = 'rgba(90,61,43,.45)'; ctx.fillRect(0, 0, W, H); }
SCENES.weapon = shopScene('weapon'); SCENES.armor = shopScene('armor'); SCENES.accessory = shopScene('accessory'); SCENES.zakka = shopScene('zakka');
/* お披露目は 1タップで もどる(はじめの 0.35 秒だけは 買ったときの指の はずみを よける) */
(function () {
  var s = SCENES.showoff; if (!s || s._mnQuick) return; s._mnQuick = true;
  var t0 = 0, oe = s.enter, ot = s.tap;
  s.enter = function () { t0 = Date.now(); return oe.apply(this, arguments); };
  s.tap = function () { if (Date.now() - t0 >= 350) { popScene(); return; } return ot.apply(this, arguments); };
})();

/* ---------- そうび ---------- */
SCENES.equip = {
  enter: function () {
    var self = this; HUD.show(); HUD.setPlace('そうび');
    var pn = panel('🎽 そうび', '部位を タップして つけかえる'); this.pn = pn;
    var info = el('div', 'info'); pn.appendChild(info); var list = el('div', 'list'); pn.appendChild(list); var foot = el('div', 'foot'); pn.appendChild(foot);
    function build() {
      var st = heroStats(); info.innerHTML = '<span>攻 ' + st.atk + '  守 ' + st.def + '</span><span>HP ' + st.hp + '  運 ' + st.luck + '</span>'; list.innerHTML = '';
      SLOTS.forEach(function (s) {
        var id = P.equip[s], it = id ? ITEMS[id] : null, r = el('div', 'row-item'); r.style.minHeight = '60px'; r.style.padding = '5px 10px'; r.style.marginBottom = '8px';
        r.innerHTML = '<div class="e" style="font-size:24px;background:' + (SLOT_TINT[s] || '#f3ead8') + '">' + SLOT_EMOJI[s] + '</div><div class="nm" style="font-size:17px;flex:0 0 76px">' + SLOT_NAME[s] + '</div><div class="nm">' + (it ? '<span class="n">' + it.look.emoji + ' ' + esc(it.name) + '</span>' : '<span style="opacity:.5">── なし ──</span>') + '</div><div class="pr">▶</div>';
        r.addEventListener('click', function () { AUDIO.sfx('tap'); pickFor(s); }); list.appendChild(r);
      });
    }
    function pickFor(slot) {
      list.innerHTML = ''; info.innerHTML = '<span>' + SLOT_EMOJI[slot] + ' ' + SLOT_NAME[slot] + ' に つけるもの</span><span></span>';
      var back = el('div', 'row-item', '<div class="e">↩</div><div class="nm">もどる</div>'); back.addEventListener('click', function () { AUDIO.sfx('cancel'); build(); }); list.appendChild(back);
      if (P.equip[slot]) { var off = el('div', 'row-item', '<div class="e">🚫</div><div class="nm">はずす</div>'); off.addEventListener('click', function () { P.equip[slot] = null; AUDIO.sfx('ok'); TOWN.refresh(); build(); }); list.appendChild(off); }
      var cands = P.items.filter(function (id) { return ITEMS[id] && ITEMS[id].slot === slot && P.equip[slot] !== id; });
      if (!cands.length) {
        var shops = DATA.SHOPS.filter(function (sh) { return sh.items.some(function (iid) { return ITEMS[iid] && ITEMS[iid].slot === slot; }); }).map(function (sh) { return sh.name.replace(/\(.*\)/, ''); });
        list.appendChild(el('div', 'desc', 'この部位に つけられる物を 持っていない。お店で 買おう!' + (shops.length ? '<br>「' + SLOT_NAME[slot] + '」は ' + esc(shops.join('・')) + ' で 売っているよ。' : '')));
      }
      cands.forEach(function (id) { var it = ITEMS[id]; list.appendChild(itemRow(it, { text: it.attack ? '⚔️' : '' }, function () { doEquip(it); build(); })); });
    }
    foot.appendChild(backBtn());
    foot.appendChild(btn('👀 いまの すがたを 見る', 'orange', function () { var st = heroStats(); pushScene('showoff', { itemId: null, before: st, after: st }); }));
    build(); this.build = build;
  },
  leave: function () { if (this.pn) this.pn.remove(); },
  tap: function () {}, draw: drawDim
};
/* ---------- なかま ---------- */
SCENES.party = {
  enter: function () {
    HUD.show(); HUD.setPlace('なかま');
    var pn = panel('👥 なかま', '10組まで。▲▼で ならびかえ'); this.pn = pn;
    var info = el('div', 'info'); pn.appendChild(info); var roles = el('div', 'roles'); pn.appendChild(roles); var list = el('div', 'list'); pn.appendChild(list); var foot = el('div', 'foot'); pn.appendChild(foot); foot.appendChild(backBtn());
    var ROLE = { attack: '⚔️ こうげき', guard: '🛡️ まもり', heal: '💚 かいふく', support: '🎵 おうえん', weird: '🎲 へんな人' };
    function buildRoles() { // 役割の数と、足りない役の一言(まもり役が 0 だと 大技で全滅しやすい)
      var rc = roleCounts(), h = '<div class="chips">';
      ROLE_LIST.forEach(function (r) { h += '<span class="chip' + (rc[r[0]] === 0 && (r[0] === 'guard' || r[0] === 'heal') ? ' zero' : '') + '">' + r[1] + r[2] + '<b>' + rc[r[0]] + '</b></span>'; });
      h += '</div>';
      if (P.party.length) {
        if (!rc.guard) h += '<div class="warnline">🛡️ まもり役が いないと 大魔王の 大技で あぶないよ!</div>';
        if (!rc.heal) h += '<div class="warnline">💚 かいふく役が いないと けがが なおらなくて つらいよ!</div>';
      }
      roles.innerHTML = h; roles.style.display = P.party.length ? '' : 'none';
    }
    function build() {
      info.innerHTML = '<span>' + P.party.length + ' / 10 組</span><span>候補は 町に ' + DATA.COMPANIONS.filter(function (c) { return P.party.indexOf(c.id) < 0; }).length + ' 組</span>'; list.innerHTML = ''; buildRoles();
      if (!P.party.length) list.appendChild(el('div', 'desc', 'まだ 仲間が いない。町の 人に 話しかけてみよう。💬 の ふきだしが 出ている人が 仲間に なってくれる人。<br>めんどうなら 🗺️いく →「🤝 なかま紹介所」で タップだけで えらべるよ。'));
      P.party.forEach(function (id, i) {
        var c = COMPS[id], r = el('div', 'row-item prow'); r.innerHTML = '<div class="e">' + c.emoji + '</div><div class="nm"><span class="n">' + esc(c.name) + (c.count > 1 && c.name.indexOf(String(c.count)) < 0 ? ' ×' + c.count : '') + '</span><small>' + ROLE[c.battle.role] + '<br>力 ' + c.battle.power + ' · HP ' + c.battle.hp + '</small></div>';
        var ctl = el('div', 'ctl'), ud = el('div', 'ud');
        function remove() { confirm(c.emoji + ' ' + c.name + ' を 仲間から はずす?\n(町に もどる。また さそえる)', 'はずす', 'やめる', function (ok) { if (ok) { P.party.splice(P.party.indexOf(id), 1); AUDIO.sfx('ok'); TOWN.refresh(); autosave(); build(); } }); }
        var off = btn('はずす', 'off gray', remove);
        var up = btn('▲', 'lav', function () { if (i > 0) { var t = list.scrollTop; P.party.splice(i, 1); P.party.splice(i - 1, 0, id); build(); list.scrollTop = t; } }), dn = btn('▼', 'lav', function () { if (i < P.party.length - 1) { var t = list.scrollTop; P.party.splice(i, 1); P.party.splice(i + 1, 0, id); build(); list.scrollTop = t; } });
        if (i === 0) up.disabled = true; if (i === P.party.length - 1) dn.disabled = true;
        ud.appendChild(up); ud.appendChild(dn); ctl.appendChild(off); ctl.appendChild(ud); r.appendChild(ctl);
        r.querySelector('.nm').addEventListener('click', function () { ask({ name: c.name, emoji: c.emoji }, '「' + pick(c.battle.lines) + '」\n' + c.desc, [{ label: 'はずす', cls: 'gray', fn: remove }, { label: 'とじる', fn: function () {} }]); });
        list.appendChild(r);
      });
    }
    build();
  },
  leave: function () { if (this.pn) this.pn.remove(); DIALOG.close(); },
  tap: function () { DIALOG.tap(); }, draw: drawDim
};
/* ---------- もちもの ---------- */
SCENES.items = {
  enter: function () {
    HUD.show(); HUD.setPlace('もちもの');
    var pn = panel('🎒 もちもの', 'そうびしていない物。売ると 半額'); this.pn = pn;
    var info = el('div', 'info'); pn.appendChild(info); var list = el('div', 'list'); pn.appendChild(list); var foot = el('div', 'foot'); pn.appendChild(foot); foot.appendChild(backBtn());
    function build() {
      var eq = equippedIds(), free = P.items.filter(function (id) { return eq.indexOf(id) < 0 && ITEMS[id]; });
      info.innerHTML = '<span>' + free.length + ' 個(そうび中 ' + eq.length + ')</span><span>' + fmtG(P.money) + '</span>'; list.innerHTML = '';
      if (!free.length) list.appendChild(el('div', 'desc', 'そうびしていない 持ち物は ない。'));
      free.forEach(function (id) { var it = ITEMS[id]; list.appendChild(itemRow(it, { text: '<span class="tag">売 ' + fmtG(Math.floor(it.price / 2)) + '</span>' }, function () {
        ask({ name: it.name, emoji: it.look.emoji }, it.desc, [{ label: '🎽 そうび', cls: 'orange', fn: function () { doEquip(it); build(); } }, { label: '💰 売る', cls: 'sky', fn: function () { confirm(it.name + ' を ' + fmtG(Math.floor(it.price / 2)) + ' で 売る?', '売る', 'やめる', function (ok) { if (ok) { removeItem(id); gain(Math.floor(it.price / 2)); AUDIO.sfx('coin'); build(); } }); } }, { label: 'とじる', cls: 'gray', fn: function () {} }]);
      })); });
    }
    build();
  },
  leave: function () { if (this.pn) this.pn.remove(); DIALOG.close(); },
  tap: function () { DIALOG.tap(); }, draw: drawDim
};

/* ---------- 家の中(人と話す場所) ---------- */
function roomScene(opt) {
  return {
    enter: function () {
      var self = this; HUD.show(); HUD.setPlace(opt.title); if (opt.bgm) AUDIO.bgm(opt.bgm);
      var pn = panel(opt.emoji + ' ' + opt.title, opt.sub); this.pn = pn; pn.style.background = opt.color || 'var(--cream,#fff6e6)';
      var list = el('div', 'list'); list.style.padding = '10px'; pn.appendChild(list);
      var scene = el('div', ''); scene.style.cssText = 'text-align:center;font-size:72px;line-height:1.2;padding:8px 0 14px;letter-spacing:6px'; scene.textContent = opt.scene; list.appendChild(scene);
      opt.actions(P).forEach(function (a) { var b = btn(a.label, 'roombtn ' + (a.cls || 'lav'), a.fn); list.appendChild(b); });
      var foot = el('div', 'foot'); pn.appendChild(foot); foot.appendChild(btn('◀ 🚪 外に 出る', 'back', function () { AUDIO.sfx('cancel'); popScene(); })); foot.lastChild.style.flex = '1';
      if (opt.onEnter) opt.onEnter();
    },
    leave: function () { if (this.pn) this.pn.remove(); DIALOG.close(); AUDIO.bgm('town'); },
    tap: function () { DIALOG.tap(); }, draw: drawDim
  };
}
function talkNpc(id, extra) { var n = NPCS[id]; P.talked[id] = (P.talked[id] || 0) + 1; var ls = (extra || []).concat([n.lines[(P.talked[id] - 1) % n.lines.length]]); say({ name: n.name, emoji: n.emoji }, ls); }
function restAndSave(where) { AUDIO.sfx('heal'); toast('ぐっすり 休んだ。' + (saveGame() ? ' ✅ セーブした' : '')); }

SCENES.home = roomScene({ title: 'へっぽこの家', emoji: '🏠', sub: '大きな家。ママと パパが いる', scene: '🛋️ 👩 👨 🍽️', color: '#fff0e0',
  actions: function () { return [
    { label: '👩 ママと はなす', fn: function () { talkNpc('mama', (P.equip.rhand === 'frying_pan' || P.equip.cape === 'curtain' || P.equip.body === 'curtain') ? ['へっぽこ、その 手に もってるの なに? …フライパン? カーテン? …まあ いいわ。'] : []); } },
    { label: '👨 パパと はなす', fn: function () { if (!P.flags.papaMoney) { P.flags.papaMoney = true; talkNpc('papa'); setTimeout(function () { gain(DATA.TEXTS.money.allowanceFromPapa); AUDIO.sfx('coin'); toast('パパから ' + fmtG(DATA.TEXTS.money.allowanceFromPapa) + ' もらった!'); }, 400); } else talkNpc('papa'); } },
    { label: '🛏️ 休む・セーブ', cls: 'sky', fn: function () { restAndSave(); } }]; } });
SCENES.castle = roomScene({ title: 'お城', emoji: '🏰', sub: '王さまは ひるね中。お姫さまが いる', scene: '👑 🤴 👸 🪑', color: '#f1eaff',
  actions: function () { return [
    { label: '🤴 王さまと はなす', fn: function () {
      if (P.flags.guardAsk && !P.flags.guardTold) { P.flags.guardTold = true; say({ name: '王さま', emoji: '🤴' }, ['兵士が がんばってる? …そうか。', 'わしは 見ていないが、まあ、よく やっているんじゃろう。伝えておけ。']); toast('兵士に 伝えよう'); return; }
      if (P.wins > 0) { say({ name: '王さま', emoji: '🤴' }, ['おお、大魔王を たおしたそうじゃな! えらい! …わしは 見ていないが。', 'ほうび? …そうじゃな、肩たたき券で どうじゃ。']); return; }
      talkNpc('king'); } },
    { label: '👸 お姫さまと はなす', fn: function () { talkNpc('princess'); } },
    { label: '💰 お金を おねだり', cls: 'sky', fn: function () { if (P.flags.kingGift) { say({ name: '王さま', emoji: '🤴' }, ['もう やったじゃろ。わしは けちじゃ ないが、2回は やらん。']); return; } P.flags.kingGift = true; gain(100000); AUDIO.sfx('coin'); say({ name: '王さま', emoji: '🤴' }, ['ほうびを 先に やろう。10万G じゃ。', 'たおしたら… そうだな… また 考える。']); } }]; } });
SCENES.church = roomScene({ title: '教会', emoji: '⛪', sub: 'しずかな場所', scene: '🕯️ ✝️ 🕯️', color: '#eaf1ff',
  actions: function () { return [
    { label: '🙏 おいのりする', fn: function () { AUDIO.sfx('heal'); say({ name: 'シスター', emoji: '👩‍🦳' }, ['あなたの 旅に 光が ありますように。', '大魔王も、きっと だれかに わかってほしい だけなのかも。…なんて。']); } },
    { label: '💾 セーブする', cls: 'sky', fn: function () { toast(saveGame() ? '✅ セーブした' : '❌ 保存できなかった'); } }]; } });
SCENES.inn = roomScene({ title: '宿', emoji: '🛏️', sub: 'お金持ちなので いつでも 泊まれる', scene: '🛏️ 🛏️ 🧴', color: '#fff4df',
  actions: function () { return [
    { label: '🛏️ 泊まる(ツケで)・セーブ', cls: 'sky', fn: function () { restAndSave(); say({ name: '宿のおかみ', emoji: '👩‍🍳' }, ['ツケで いいわよ。ママに 請求 しておくから。', 'ゆっくり 休んでね。']); } },
    { label: '💬 おかみと はなす', fn: function () { say({ name: '宿のおかみ', emoji: '👩‍🍳' }, [pick(['隣の おばさん、むかしは 「おたまの 達人」って よばれてたのよ。', '大魔王って、おなかが すくと 弱いって うわさよ。', 'うちの 宿、大魔王も 泊まったこと あるの。いびきが すごかった。', '大魔王の 大技はね、「まもり」の 仲間が いないと 全滅しちゃうのよ。つれて いきなさいね。'])]); } }]; } });
SCENES.aunt = roomScene({ title: '隣のおばさんの家', emoji: '🏡', sub: 'いい においが する', scene: '🍲 👩‍🦱 🐈', color: '#ffeef3',
  actions: function () { return [{ label: '👩‍🦱 おばさんと はなす', cls: 'leaf', fn: function () { RECRUIT.start(COMPS.aunt, function (joined) { if (joined) TOWN.refresh(); }); } }]; } });

/* ---------- 仲間の誘い方 ---------- */
var RECRUIT = (function () {
  /* お願い(favor)の進み方。check(P) が true なら 仲間になる。hint は まだのときの一言 */
  function inm(id) { return ITEMS[id] ? ITEMS[id].name : id; } // 品物の名前は data.js から読む
  var FAVOR = {
    retired_hero: { check: function () { return (P.talked.retired_hero || 0) >= 3; }, hint: function () { return 'こしを もんだのは ' + (P.talked.retired_hero || 0) + ' 回。あと ' + Math.max(0, 3 - (P.talked.retired_hero || 0)) + ' 回 たのむ。'; } },
    priest: { check: function () { return (P.talked.priest || 0) >= 3; }, hint: function () { return 'かねを ならしたのは ' + ((P.talked.priest || 0)) + ' 回。あと ' + Math.max(0, 3 - (P.talked.priest || 0)) + ' 回。'; } },
    pomeranians: { check: function () { return (P.talked.pomeranians || 0) >= 3; }, hint: function () { return 'ワン! (ボール ' + (P.talked.pomeranians || 0) + ' 回。あと ' + Math.max(0, 3 - (P.talked.pomeranians || 0)) + ' 回 なげて!)'; } },
    monsters: { item: 'mama_bento', hint: function () { return '雑貨屋で「' + inm('mama_bento') + '」を 買ってきて…'; } },
    crows: { item: 'key_ring', hint: function () { return 'カァ(アクセサリー屋の「' + inm('key_ring') + '」が ほしい)'; } },
    cat_gang: { item: 'oden_skewer', hint: function () { return 'ニャー(武器屋の「' + inm('oden_skewer') + '」が ほしい)'; } },
    fisher: { item: 'rubber_duck', hint: function () { return '雑貨屋の「' + inm('rubber_duck') + '」を たのむ。'; } },
    slime_family: { check: function () { return !!P.flags.foundSlime; }, hint: function () { return 'ぷるぷる…(子どもが 町の どこかで まいごに。お城の 近くかも)'; } },
    aunt: { check: function () { return !!P.flags.kairanbanDone; }, start: function () { P.flags.kairanban = true; }, hint: function () { return P.flags.kairanban ? '回覧板、パン屋さんに とどけてくれた?' : ''; } },
    king_guards: { check: function () { return !!P.flags.guardTold; }, start: function () { P.flags.guardAsk = true; }, hint: function () { return '王さまに 伝えてきてよ。お城の 中だよ。'; } },
    bees: { check: function () { return !!P.flags.bouquet; }, hint: function () { return 'ブーン(お花屋さんから 花束を もらってきて)'; } }
  };
  /* お金の いらない相手にも、へっぽこは まず 札束を出す →「いらない」と ことわられる(物語の型)。
     ことわりの セリフは c.talk.money(台本係)。なければ 共通の 一言。1組につき 最初の 1回だけ */
  var MONEY_OFFER = ['いくら? 💴💴💴(札束を どさっと 出す)', 'いくら はらえば いい? 💴💴(札束を 出す)', 'お金なら あるよ! いくら? 💴💴💴'];
  var MONEY_NO = ['お金は いらないよ。しまって しまって。', 'え… お金? いらない いらない。', 'そういうのじゃ ないんだよ。', 'お金で きめることじゃ ないよ。'];
  function refuseLines(c) { // c.talk.money(台本係)。なければ 共通の 一言
    var m = c.talk && c.talk.money, common = (DATA.TEXTS && DATA.TEXTS.moneyRefuse) || pick(MONEY_NO);
    return m ? (typeof m === 'string' ? [m] : m.slice()) : (typeof common === 'string' ? [common] : common.slice());
  }
  function moneyFirst(c, next) {
    var key = 'moneyAsk_' + c.id; if (P.flags[key]) { next(); return; } P.flags[key] = true;
    say(HERO, [pick(MONEY_OFFER)], function () { say({ name: c.name, emoji: c.emoji }, refuseLines(c), next); });
  }
  function join(c, then) {
    if (P.party.length >= 10) { say({ name: c.name, emoji: c.emoji }, ['…でも もう 10組 いるね。「なかま」で だれかを はずしたら 来るよ。']); then && then(false); return; }
    P.party.push(c.id); AUDIO.sfx('join'); autosave();
    say({ name: c.name, emoji: c.emoji }, [c.talk.ok, '✨ ' + c.name + (c.count > 1 ? '(' + c.count + '人)' : '') + ' が 仲間に なった!(' + P.party.length + '/10組)'], function () { then && then(true); });
  }
  function start(c, then) {
    var who = { name: c.name, emoji: c.emoji }, h = c.how;
    // 特別な役(お使いの相手)
    if (c.id === 'aunt' && !P.flags.kairanbanDone && P.party.indexOf('baker') >= 0) { // パン屋さんを先に仲間にしていても、回覧板は「うしろにいる」で通す
      P.flags.kairanban = true; P.flags.kairanbanDone = true;
      say(who, ['回覧板? パン屋さんに… あら、もう あなたの うしろに いるじゃない。', 'じゃあ とどけたことに しておくわ。(ちょっと うれしそう)'], function () { join(c, then); }); return;
    }
    if (c.id === 'bees' && !P.flags.bouquet && P.party.indexOf('florist') >= 0) { // お花屋さんが うしろにいれば、花束を わけてもらったことにする
      P.flags.bouquet = true;
      say(who, ['ブーン?(あ、お花屋さんが うしろに いる! 花束を わけてもらった 💐)', 'ブーン♪ (ついていく!)'], function () { join(c, then); }); return;
    }
    if (c.id === 'baker' && P.flags.kairanban && !P.flags.kairanbanDone) { P.flags.kairanbanDone = true; say(who, ['あ、回覧板! ありがとう。おばさんに よろしくね。', 'おれいに パンを 1つ。(🥐 を もらった。気分が いい)'], function () { then && then(false); }); return; }
    if (c.id === 'florist' && !P.flags.bouquet && (P.talked.bees || 0) > 0) { P.flags.bouquet = true; say(who, ['ミツバチさんに 花束? いいわよ、はい どうぞ。💐', 'わたしも つれていってね!']); then && then(false); return; }
    var before = c.talk.before || [];
    if (h.type !== 'pay') { moneyFirst(c, function () { route(c, then, who, h, before); }); return; }
    route(c, then, who, h, before);
  }
  function route(c, then, who, h, before) {
    switch (h.type) {
      case 'free': say(who, before.slice(0, 1).concat([h.text]), function () { ask(who, '仲間に なってもらう?', [{ label: 'おねがい!', cls: 'leaf', fn: function () { join(c, then); } }, { label: 'やめておく', cls: 'gray', fn: function () { then && then(false); } }]); }); break;
      case 'pay': // 仲間は お金では 来ない: はらおうとする → ことわられる → 仲間になる(所持金は へらない)
        say(who, before.slice(0, 1).concat([h.text]), function () {
        ask(who, '仲間に なってもらう?', [{ label: '💰 まとめて はらう!', cls: 'orange', fn: function () { say(HERO, ['まとめて はらう! 💴💴💴 おつりは いらない!'], function () { say(who, refuseLines(c), function () { join(c, then); }); }); } }, { label: 'やめておく', cls: 'gray', fn: function () { then && then(false); } }]); }); break;
      case 'riddle': case 'quest': say(who, before.slice(0, 1).concat([h.text]), function () {
        var ch = (h.choices || []).map(function (op) { return { label: op, cls: 'lav', fn: function () { if (op === h.answer) { AUDIO.sfx('ok'); join(c, then); } else { AUDIO.sfx('cancel'); say(who, [c.talk.no], function () { then && then(false); }); } } }; });
        ch.push({ label: 'あとで', cls: 'gray', fn: function () { then && then(false); } });
        ask(who, h.question || h.text, ch); }); break;
      case 'favor': {
        var f = FAVOR[c.id] || {}; var done = f.item ? hasItem(f.item) : (f.check ? f.check() : true);
        if (done) { if (f.item && P.party.length < 10) { removeItem(f.item); say(who, ['それ! それが ほしかった!'], function () { join(c, then); }); } else join(c, then); } // 10組いっぱいのときは 品物を渡さない(join が「はずしたら来るよ」と言う)
        else { var first = !(P.flags['favor_' + c.id]); P.flags['favor_' + c.id] = true; if (f.start) f.start();
          var ls = first ? before.slice(0, 1).concat([h.text]) : [f.hint ? (f.hint() || h.text) : h.text]; say(who, ls, function () { then && then(false); }); }
        break; }
    }
  }
  return { start: start, refuseLines: refuseLines };
})();

/* ---------- なかま紹介所(めんどうな人のための お店) ----------
   入る → おねえさんの 助言と 2択(🔍 自分で さがす / 📋 紹介してもらう)
   一覧: カードを タップ(1) →「🤝 なかまに する」(2) で 仲間に。お金は へらない(だれも 受けとらない)。お願い・なぞなぞは とばす。
   10組いっぱいなら「🔄 だれかと 入れかえる」→ はずす人の カードを タップ → 確認 */
var SHOUKAI = (function () {
  var ROLE_NM = { attack: '⚔️ こうげき', guard: '🛡️ まもり', heal: '💚 かいふく', support: '🎵 おうえん', weird: '🎲 へんな' };
  var FILTERS = [['all', '📋', 'ぜんぶ', 62], ['attack', '⚔️', 'こうげき', 83], ['guard', '🛡️', 'まもり', 62], ['heal', '💚', 'かいふく', 83], ['other', '🎲', 'ほか', 56]];
  var STARS = null;
  function stars(c) { // 強さの めやす(力と HP から。34組を 5段に わける)
    if (!STARS) { STARS = {}; var a = DATA.COMPANIONS.slice().sort(function (x, y) { return (x.battle.power + x.battle.hp / 30) - (y.battle.power + y.battle.hp / 30); }); a.forEach(function (x, i) { STARS[x.id] = 1 + Math.floor(i * 5 / a.length); }); }
    var n = STARS[c.id] || 1, s = ''; for (var i = 0; i < 5; i++) s += i < n ? '★' : '☆'; return s;
  }
  function offerG(c) { return Math.max(10000, Math.round(c.battle.power * c.battle.hp / 100) * 1000); } // へっぽこが 出す 札束の 額(だれも 受けとらない)
  function lady() { var n = NPCS.shoukai || { name: '紹介所のおねえさん', emoji: '👩‍💼' }; return { name: n.name, emoji: n.emoji }; }
  var AFTER = ['お代は 0G です。…はい、札束は しまって ください。', 'はい、紹介料 0G。おつりも 0G です。', 'みなさん タダで 来てくれますからね。…ふしぎでしょ?'];
  var scene = {
    enter: function () {
      var self = this; HUD.show(); HUD.setPlace('なかま紹介所'); AUDIO.bgm('shop');
      var L = lady(), lines = (NPCS.shoukai && NPCS.shoukai.lines) || ['当店は お金を いただきません。'];
      P.talked.shoukai = (P.talked.shoukai || 0) + 1;
      var pn = panel('🤝 なかま紹介所', L.emoji + '「' + lines[(P.talked.shoukai - 1) % lines.length] + '」'); this.pn = pn;
      var info = el('div', 'info'), warn = el('div', 'roles'), flt = el('div', 'flt'), list = el('div', 'list'), foot = el('div', 'foot');
      pn.appendChild(info); pn.appendChild(warn); pn.appendChild(flt); pn.appendChild(list); pn.appendChild(foot); this.list = list;
      var filter = 'all', sel = null, swap = null, shown = false;
      var big = btn('', 'bigjoin leaf', function () { onBig(); });
      foot.appendChild(backBtn()); foot.appendChild(big);
      FILTERS.forEach(function (f) {
        var b = btn('<span class="fe">' + f[1] + '</span><span>' + f[2] + '</span>', f[0] === filter ? 'on' : '', function () { if (DIALOG.isActive()) return; filter = f[0]; sel = null; flt.querySelectorAll('button').forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on'); list.scrollTop = 0; build(); });
        b.style.flex = '1 1 ' + f[3] + 'px'; flt.appendChild(b);
      });
      warn.addEventListener('click', function (ev) { var w = ev.target.closest ? ev.target.closest('.warnline') : null; if (!w || swap || DIALOG.isActive()) return; var r = w.getAttribute('data-r'); var fb = flt.querySelectorAll('button')[r === 'guard' ? 2 : 3]; if (fb) fb.click(); });
      function isMem(c) { return P.party.indexOf(c.id) >= 0; }
      function match(c) { var r = c.battle.role; return filter === 'all' || r === filter || (filter === 'other' && (r === 'weird' || r === 'support')); }
      function who(c) { return { name: c.name, emoji: c.emoji }; }
      function cname(c) { return c.name + (c.count > 1 && c.name.indexOf(String(c.count)) < 0 ? ' ×' + c.count : ''); }
      function card(c) {
        var m = isMem(c), r = el('div', 'ccard' + (m ? ' mem' : '') + (sel === c.id ? ' sel' : '') + (swap ? ' swap' : ''));
        r.innerHTML = '<div class="e">' + c.emoji + '</div><div class="bd"><div class="n">' + esc(cname(c)) + '</div><div class="meta"><span class="rl ' + c.battle.role + '">' + ROLE_NM[c.battle.role] + '</span><span class="st">' + stars(c) + '</span><span class="ct">👥' + c.count + '</span>' + (m && !swap ? '<span class="badge">🤝 なかま</span>' : '') + '</div><div class="d">' + esc(c.desc) + '</div></div>';
        if (m && !swap) { var off = btn('はずす', 'off gray', function (ev) { ev.stopPropagation(); if (DIALOG.isActive()) return; removeAsk(c); }); r.appendChild(off); }
        r.addEventListener('click', function () {
          if (DIALOG.isActive()) { DIALOG.tap(); return; }
          AUDIO.sfx('tap');
          if (swap) { swapAsk(c); return; }
          sel = sel === c.id ? null : c.id; list.querySelectorAll('.ccard').forEach(function (x) { x.classList.remove('sel'); }); if (sel) r.classList.add('sel'); updateBig();
        });
        return r;
      }
      function build() {
        if (!shown) return;
        var keep = list.scrollTop; list.innerHTML = '';
        info.innerHTML = '<span>いま ' + P.party.length + ' / 10 組</span><span>' + (swap ? '🔄 はずす人を えらんでね' : 'タップして えらぶ') + '</span>';
        warn.innerHTML = swap ? '<div class="warnline" style="background:#ffe3f1;border-color:#e0609f;color:#8a2a5a">' + esc(swap.emoji + ' ' + swap.name) + ' と 入れかえる人を タップ</div>' : roleWarnHtml();
        warn.style.display = warn.innerHTML ? '' : 'none'; flt.style.display = swap ? 'none' : '';
        var arr = swap ? partyComps() : DATA.COMPANIONS.filter(match);
        arr.forEach(function (c) { list.appendChild(card(c)); });
        if (!arr.length) list.appendChild(el('div', 'desc', 'この 役の 人は いないみたい。'));
        list.scrollTop = keep; updateBig();
      }
      function updateBig() {
        var c = sel ? COMPS[sel] : null; big.disabled = false; big.className = 'bigjoin';
        if (!shown) { big.innerHTML = '📋 紹介してもらう'; big.classList.add('leaf'); return; }
        if (swap) { big.innerHTML = 'やめる'; big.classList.add('gray'); return; }
        if (!c) { big.innerHTML = '👆 カードを えらんでね'; big.classList.add('leaf'); big.disabled = true; return; }
        if (isMem(c)) { big.innerHTML = '👋 はずす'; big.classList.add('gray'); return; }
        if (P.party.length >= 10) { big.innerHTML = '🔄 だれかと 入れかえる'; big.classList.add('orange'); return; }
        big.innerHTML = '🤝 なかまに する'; big.classList.add('leaf');
      }
      function onBig() {
        if (DIALOG.isActive()) return;
        if (!shown) { showList(); return; }
        if (swap) { swap = null; build(); return; }
        var c = sel ? COMPS[sel] : null; if (!c) return;
        if (isMem(c)) { removeAsk(c); return; }
        if (P.party.length >= 10) { swap = c; list.scrollTop = 0; build(); return; }
        recruit(c, null);
      }
      function removeAsk(c) {
        confirm(c.emoji + ' ' + c.name + ' を 仲間から はずす?\n(町に もどる。また さそえる)', 'はずす', 'やめる', function (ok) { if (!ok) return; P.party.splice(P.party.indexOf(c.id), 1); AUDIO.sfx('ok'); autosave(); TOWN.refresh(); if (sel === c.id) sel = null; build(); });
      }
      function swapAsk(out) {
        var c = swap; if (!c) return;
        confirm(out.emoji + ' ' + out.name + ' を はずして、\n' + c.emoji + ' ' + c.name + ' を 仲間に する?', '🔄 いれかえる', 'やめる', function (ok) { if (ok) recruit(c, out.id); });
      }
      function recruit(c, outId) { // 仲間に する(先に 仲間に 入れてから 会話。お金は へらない)
        if (outId) P.party[P.party.indexOf(outId)] = c.id; else P.party.push(c.id);
        AUDIO.sfx('join'); autosave(); TOWN.refresh(); sel = null; swap = null; build();
        var first = !P.flags.shoukaiJoined; P.flags.shoukaiJoined = true;
        say(HERO, [fmtG(offerG(c)) + ' で どう? 💴💴💴(札束を どさっと 出す)'], function () {
          say(who(c), RECRUIT.refuseLines(c).concat(['✨ ' + c.name + (c.count > 1 ? '(' + c.count + ')' : '') + ' が なかまに なった!(' + P.party.length + '/10組)' + (outId ? '\n(' + COMPS[outId].name + ' は 町に もどった)' : '')]), function () {
            if (first) say(L, [AFTER[0]]); else if (Math.random() < 0.35) say(L, [pick(AFTER)]);
          });
        });
      }
      function showList() { shown = true; list.innerHTML = ''; build(); }
      /* はじめに おねえさんの 助言 → 2択 */
      list.appendChild(el('div', 'lady', L.emoji + '<small>' + esc(L.name) + '</small>')); flt.style.display = 'none'; warn.style.display = 'none';
      info.innerHTML = '<span>いま ' + P.party.length + ' / 10 組</span>'; updateBig();
      var choices = [{ label: '🔍 自分で さがす', cls: 'sky nw', fn: function () { popScene(); setTimeout(function () { if (G.scene === 'town' && TOWN.openGo) TOWN.openGo(); }, 350); } }, { label: '📋 紹介してもらう', cls: 'leaf nw', fn: function () { showList(); } }];
      function askNow() { ask(L, P.flags.shoukaiTalked ? '自分で さそうほうが 楽しいですよ。…どうします?' : '紹介料は 0G。どうします?', choices); }
      if (!P.flags.shoukaiTalked) {
        setTimeout(function () { if (G.scene !== 'shoukai') return; say(L, ['いらっしゃいませ。なかま紹介所です。…札束は しまって ください。', 'でも ここだけの 話、仲間は 自分で 町の人に 話しかけて さそったほうが 楽しいですよ。お願いごとも、おもしろいし。'], function () { P.flags.shoukaiTalked = true; askNow(); }); }, 200);
      } else setTimeout(function () { if (G.scene === 'shoukai') askNow(); }, 200);
    },
    leave: function () { if (this.pn) this.pn.remove(); DIALOG.close(); AUDIO.bgm('town'); },
    tap: function () { DIALOG.tap(); }, draw: drawDim
  };
  SCENES.shoukai = scene;
  return { offerG: offerG, stars: stars };
})();

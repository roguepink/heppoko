'use strict';
/* 店・そうび・なかま・もちもの・家の中(家・城・教会・宿・おばさんの家)・仲間の誘い方 */
function panel(title, sub, full) {
  var pn = el('div', 'panel' + (full ? ' full' : '')); var head = el('div', 'head', '<h2>' + title + '</h2>' + (sub ? '<div class="sub">' + esc(sub) + '</div>' : ''));
  pn.appendChild(head); var x = btn('×', 'xbtn', function () { popScene(); }); pn.appendChild(x); ui.appendChild(pn); return pn;
}
function statDiff(item, slot) { // いまの装備との差
  var cur = P.equip[slot] ? ITEMS[P.equip[slot]] : null, da = (item ? item.atk : 0) - (cur ? cur.atk : 0), dd = (item ? item.def : 0) - (cur ? cur.def : 0), dh = (item ? item.extra.hp : 0) - (cur ? cur.extra.hp : 0);
  var s = []; if (da) s.push((da > 0 ? '<span class="up">▲攻+' + da : '<span class="dn">▼攻' + da) + '</span>'); if (dd) s.push((dd > 0 ? '<span class="up">▲守+' + dd : '<span class="dn">▼守' + dd) + '</span>'); if (dh) s.push((dh > 0 ? '<span class="up">▲HP+' + dh : '<span class="dn">▼HP' + dh) + '</span>');
  return s.join(' ') || '<span style="opacity:.6">かわらない</span>';
}
function itemRow(item, right, onTap) {
  var r = el('div', 'row-item'); r.innerHTML = '<div class="e">' + item.look.emoji + '</div><div class="nm">' + esc(item.name) + '<small>' + SLOT_NAME[item.slot] + ' · ' + statDiff(item, item.slot) + '</small></div><div class="pr' + (right.no ? ' no' : '') + '">' + right.text + '</div>';
  r.addEventListener('click', function () { AUDIO.sfx('tap'); onTap(r); }); return r;
}
function doEquip(item, then) {
  var before = heroStats(); var old = P.equip[item.slot]; P.equip[item.slot] = item.id; var after = heroStats(); AUDIO.sfx('equip');
  TOWN.refresh(); pushScene('showoff', { itemId: item.id, before: before, after: after, old: old }); if (then) then();
}

/* ---------- 店 ---------- */
function shopScene(shopId) {
  return {
    enter: function () {
      var sh = SHOPS[shopId], self = this, owner = NPCS[sh.npc]; AUDIO.bgm('shop'); HUD.show(); HUD.setPlace(sh.name);
      var pn = panel(sh.emoji + ' ' + sh.name, '「' + sh.talk.hello + '」'); this.pn = pn;
      var info = el('div', 'info'); pn.appendChild(info); var list = el('div', 'list'); pn.appendChild(list); var foot = el('div', 'foot'); pn.appendChild(foot);
      var sel = null, descEl = null;
      function refresh() { var st = heroStats(); info.innerHTML = '<span>' + sh.items.length + ' 品</span><span>いま: 攻 ' + st.atk + ' 守 ' + st.def + ' HP ' + st.hp + '</span>'; }
      function build() {
        list.innerHTML = ''; refresh(); sel = null; descEl = null; buy.disabled = true; buy.textContent = 'えらんでね'; // 買ったあと、もう一度「かう」で同じ物を二重に買わない
        sh.items.map(function (id) { return ITEMS[id]; }).filter(Boolean).sort(function (a, b) { return a.price - b.price; }).forEach(function (it) {
          var owned = hasItem(it.id), r = itemRow(it, owned ? { text: 'もってる' } : { text: fmtG(it.price), no: it.price > P.money }, function (row) {
            list.querySelectorAll('.row-item').forEach(function (x) { x.classList.remove('sel'); }); if (descEl) descEl.remove();
            row.classList.add('sel'); sel = it; descEl = el('div', 'desc', esc(it.desc) + (it.attack ? '<br>⚔️ わざ:「' + esc(it.attack.name) + '」' : '')); row.after(descEl);
            buy.disabled = owned || it.price > P.money; buy.textContent = owned ? 'もってる' : it.price > P.money ? 'お金が たりない' : '💰 ' + fmtG(it.price) + ' で かう';
          }); if (owned) r.classList.add('dim'); list.appendChild(r);
        });
      }
      var buy = btn('えらんでね', 'orange', function () {
        if (!sel) return; var it = sel;
        if (hasItem(it.id)) { buy.disabled = true; buy.textContent = 'もってる'; return; }
        if (it.price > P.money) { say({ name: owner.name, emoji: owner.emoji }, [sh.talk.poor]); return; }
        confirm(it.look.emoji + ' ' + it.name + ' を ' + fmtG(it.price) + ' で かう?\n(のこり ' + fmtG(P.money - it.price) + ')', 'かう', 'やめる', function (ok) {
          if (!ok) return; pay(it.price); P.items.push(it.id); AUDIO.sfx('buy'); autosave();
          var cur = P.equip[it.slot];
          ask({ name: owner.name, emoji: owner.emoji }, sh.talk.buy + '\nそのまま そうびする?' + (cur ? '(いまの ' + ITEMS[cur].name + ' と とりかえ)' : ''), [
            { label: '🎽 そうびする', cls: 'orange', fn: function () { doEquip(it); build(); } },
            { label: 'あとで', cls: 'gray', fn: function () { build(); } }]);
        }, 'orange');
      }); buy.disabled = true;
      var talk = btn('💬 はなす', 'lav', function () { say({ name: owner.name, emoji: owner.emoji }, [pick(owner.lines)]); });
      foot.appendChild(talk); foot.appendChild(buy); build();
    },
    leave: function () { if (this.pn) this.pn.remove(); DIALOG.close(); },
    tap: function () { DIALOG.tap(); }, draw: drawDim
  };
}
function drawDim() { SCENES.town.draw(); ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(0, 0, W, H); }
SCENES.weapon = shopScene('weapon'); SCENES.armor = shopScene('armor'); SCENES.accessory = shopScene('accessory'); SCENES.zakka = shopScene('zakka');

/* ---------- そうび ---------- */
SCENES.equip = {
  enter: function () {
    var self = this; HUD.show(); HUD.setPlace('そうび');
    var pn = panel('🎽 そうび', '部位を タップして つけかえる'); this.pn = pn;
    var info = el('div', 'info'); pn.appendChild(info); var list = el('div', 'list'); pn.appendChild(list); var foot = el('div', 'foot'); pn.appendChild(foot);
    function build() {
      var st = heroStats(); info.innerHTML = '<span>攻 ' + st.atk + '  守 ' + st.def + '</span><span>HP ' + st.hp + '  運 ' + st.luck + '</span>'; list.innerHTML = '';
      SLOTS.forEach(function (s) {
        var id = P.equip[s], it = id ? ITEMS[id] : null, r = el('div', 'row-item'); r.style.minHeight = '48px'; r.style.padding = '4px 10px';
        r.innerHTML = '<div class="e" style="font-size:24px">' + SLOT_EMOJI[s] + '</div><div class="nm" style="font-size:16px;flex:0 0 76px">' + SLOT_NAME[s] + '</div><div class="nm">' + (it ? it.look.emoji + ' ' + esc(it.name) : '<span style="opacity:.5">── なし ──</span>') + '</div><div class="pr">▶</div>';
        r.addEventListener('click', function () { AUDIO.sfx('tap'); pickFor(s); }); list.appendChild(r);
      });
    }
    function pickFor(slot) {
      list.innerHTML = ''; info.innerHTML = '<span>' + SLOT_EMOJI[slot] + ' ' + SLOT_NAME[slot] + ' に つけるもの</span><span></span>';
      var back = el('div', 'row-item', '<div class="e">↩</div><div class="nm">もどる</div>'); back.addEventListener('click', function () { AUDIO.sfx('cancel'); build(); }); list.appendChild(back);
      if (P.equip[slot]) { var off = el('div', 'row-item', '<div class="e">🚫</div><div class="nm">はずす</div>'); off.addEventListener('click', function () { P.equip[slot] = null; AUDIO.sfx('ok'); TOWN.refresh(); build(); }); list.appendChild(off); }
      var cands = P.items.filter(function (id) { return ITEMS[id] && ITEMS[id].slot === slot && P.equip[slot] !== id; });
      if (!cands.length) list.appendChild(el('div', 'desc', 'この部位に つけられる物を 持っていない。お店で 買おう!'));
      cands.forEach(function (id) { var it = ITEMS[id]; list.appendChild(itemRow(it, { text: it.attack ? '⚔️' : '' }, function () { doEquip(it); build(); })); });
    }
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
    var pn = panel('👥 なかま', '10組まで。上から 順に ならんで 歩く'); this.pn = pn;
    var info = el('div', 'info'); pn.appendChild(info); var list = el('div', 'list'); pn.appendChild(list);
    var ROLE = { attack: '⚔️ こうげき', guard: '🛡️ まもり', heal: '💚 かいふく', support: '🎵 おうえん', weird: '🎲 へんな人' };
    function build() {
      info.innerHTML = '<span>' + P.party.length + ' / 10 組</span><span>候補は 町に ' + DATA.COMPANIONS.filter(function (c) { return P.party.indexOf(c.id) < 0; }).length + ' 組</span>'; list.innerHTML = '';
      if (!P.party.length) list.appendChild(el('div', 'desc', 'まだ 仲間が いない。町の 人に 話しかけてみよう。💬 の ふきだしが 出ている人が 仲間に なってくれる人。'));
      P.party.forEach(function (id, i) {
        var c = COMPS[id], r = el('div', 'row-item'); r.innerHTML = '<div class="e">' + c.emoji + '</div><div class="nm">' + esc(c.name) + (c.count > 1 && c.name.indexOf(String(c.count)) < 0 ? ' ×' + c.count : '') + '<small>' + ROLE[c.battle.role] + ' · 力 ' + c.battle.power + ' · HP ' + c.battle.hp + '</small></div>';
        var ctl = el('div', ''); ctl.style.cssText = 'display:flex;gap:4px';
        var up = btn('▲', 'small lav', function () { if (i > 0) { P.party.splice(i, 1); P.party.splice(i - 1, 0, id); build(); } }), dn = btn('▼', 'small lav', function () { if (i < P.party.length - 1) { P.party.splice(i, 1); P.party.splice(i + 1, 0, id); build(); } });
        up.style.cssText = dn.style.cssText = 'min-height:40px;width:40px;padding:0;box-shadow:none;border-width:2px'; ctl.appendChild(up); ctl.appendChild(dn); r.appendChild(ctl);
        r.querySelector('.nm').addEventListener('click', function () { ask({ name: c.name, emoji: c.emoji }, '「' + pick(c.battle.lines) + '」\n' + c.desc, [{ label: 'はずす', cls: 'gray', fn: function () { confirm(c.name + ' を 仲間から はずす?(町に もどる)', 'はずす', 'やめる', function (ok) { if (ok) { P.party.splice(P.party.indexOf(id), 1); TOWN.refresh(); build(); } }); } }, { label: 'とじる', fn: function () {} }]); });
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
    var info = el('div', 'info'); pn.appendChild(info); var list = el('div', 'list'); pn.appendChild(list);
    function build() {
      var eq = equippedIds(), free = P.items.filter(function (id) { return eq.indexOf(id) < 0 && ITEMS[id]; });
      info.innerHTML = '<span>' + free.length + ' 個(そうび中 ' + eq.length + ')</span><span>' + fmtG(P.money) + '</span>'; list.innerHTML = '';
      if (!free.length) list.appendChild(el('div', 'desc', 'そうびしていない 持ち物は ない。'));
      free.forEach(function (id) { var it = ITEMS[id]; list.appendChild(itemRow(it, { text: '売 ' + fmtG(Math.floor(it.price / 2)) }, function () {
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
      var pn = panel(opt.emoji + ' ' + opt.title, opt.sub); this.pn = pn; pn.style.background = opt.color || 'rgba(20,12,42,.97)';
      var list = el('div', 'list'); list.style.padding = '10px'; pn.appendChild(list);
      var scene = el('div', ''); scene.style.cssText = 'text-align:center;font-size:72px;line-height:1.2;padding:8px 0 14px;letter-spacing:6px'; scene.textContent = opt.scene; list.appendChild(scene);
      opt.actions(P).forEach(function (a) { var b = btn(a.label, a.cls || 'lav', a.fn); b.style.cssText = 'width:100%;min-height:62px;margin-bottom:10px;font-size:19px'; list.appendChild(b); });
      var out = btn('🚪 外に 出る', 'gray', function () { popScene(); }); out.style.cssText = 'width:100%;min-height:62px;margin-top:6px'; list.appendChild(out);
      if (opt.onEnter) opt.onEnter();
    },
    leave: function () { if (this.pn) this.pn.remove(); DIALOG.close(); AUDIO.bgm('town'); },
    tap: function () { DIALOG.tap(); }, draw: drawDim
  };
}
function talkNpc(id, extra) { var n = NPCS[id]; P.talked[id] = (P.talked[id] || 0) + 1; var ls = (extra || []).concat([n.lines[(P.talked[id] - 1) % n.lines.length]]); say({ name: n.name, emoji: n.emoji }, ls); }
function restAndSave(where) { AUDIO.sfx('heal'); toast('ぐっすり 休んだ。' + (saveGame() ? ' ✅ セーブした' : '')); }

SCENES.home = roomScene({ title: 'へっぽこの家', emoji: '🏠', sub: '大きな家。ママと パパが いる', scene: '🛋️ 👩 👨 🍽️', color: 'rgba(60,40,30,.97)',
  actions: function () { return [
    { label: '👩 ママと はなす', fn: function () { talkNpc('mama'); } },
    { label: '👨 パパと はなす', fn: function () { if (!P.flags.papaMoney) { P.flags.papaMoney = true; talkNpc('papa'); setTimeout(function () { gain(DATA.TEXTS.money.allowanceFromPapa); AUDIO.sfx('coin'); toast('パパから ' + fmtG(DATA.TEXTS.money.allowanceFromPapa) + ' もらった!'); }, 400); } else talkNpc('papa'); } },
    { label: '🛏️ 休む・セーブ', cls: 'sky', fn: function () { restAndSave(); } }]; } });
SCENES.castle = roomScene({ title: 'お城', emoji: '🏰', sub: '王さまは ひるね中。お姫さまが いる', scene: '👑 🤴 👸 🪑', color: 'rgba(40,30,70,.97)',
  actions: function () { return [
    { label: '🤴 王さまと はなす', fn: function () {
      if (P.flags.guardAsk && !P.flags.guardTold) { P.flags.guardTold = true; say({ name: '王さま', emoji: '🤴' }, ['兵士が がんばってる? …そうか。', 'わしは 見ていないが、まあ、よく やっているんじゃろう。伝えておけ。']); toast('兵士に 伝えよう'); return; }
      talkNpc('king'); } },
    { label: '👸 お姫さまと はなす', fn: function () { talkNpc('princess'); } },
    { label: '💰 おみまい金を もらう', cls: 'sky', fn: function () { if (P.flags.kingGift) { say({ name: '王さま', emoji: '🤴' }, ['もう やったじゃろ。わしは けちじゃ ないが、2回は やらん。']); return; } P.flags.kingGift = true; gain(100000); AUDIO.sfx('coin'); say({ name: '王さま', emoji: '🤴' }, ['ほうびを 先に やろう。10万G じゃ。', 'たおしたら… そうだな… また 考える。']); } }]; } });
SCENES.church = roomScene({ title: '教会', emoji: '⛪', sub: 'しずかな場所', scene: '🕯️ ✝️ 🕯️', color: 'rgba(30,30,60,.97)',
  actions: function () { return [
    { label: '🙏 おいのりする', fn: function () { AUDIO.sfx('heal'); say({ name: 'シスター', emoji: '👩‍🦳' }, ['あなたの 旅に 光が ありますように。', '大魔王も、きっと だれかに わかってほしい だけなのかも。…なんて。']); } },
    { label: '💾 セーブする', cls: 'sky', fn: function () { toast(saveGame() ? '✅ セーブした' : '❌ 保存できなかった'); } }]; } });
SCENES.inn = roomScene({ title: '宿', emoji: '🛏️', sub: 'お金持ちなので いつでも 泊まれる', scene: '🛏️ 🛏️ 🧴', color: 'rgba(60,45,30,.97)',
  actions: function () { return [
    { label: '🛏️ 泊まる(ツケで)・セーブ', cls: 'sky', fn: function () { restAndSave(); say({ name: '宿のおかみ', emoji: '👩‍🍳' }, ['ツケで いいわよ。ママに 請求 しておくから。', 'ゆっくり 休んでね。']); } },
    { label: '💬 おかみと はなす', fn: function () { say({ name: '宿のおかみ', emoji: '👩‍🍳' }, [pick(['隣の おばさん、むかしは 「おたまの 達人」って よばれてたのよ。', '大魔王って、おなかが すくと 弱いって うわさよ。', 'うちの 宿、大魔王も 泊まったこと あるの。いびきが すごかった。'])]); } }]; } });
SCENES.aunt = roomScene({ title: '隣のおばさんの家', emoji: '🏡', sub: 'いい においが する', scene: '🍲 👩‍🦱 🐈', color: 'rgba(60,30,40,.97)',
  actions: function () { return [{ label: '👩‍🦱 おばさんと はなす', cls: 'leaf', fn: function () { RECRUIT.start(COMPS.aunt, function (joined) { if (joined) TOWN.refresh(); }); } }]; } });

/* ---------- 仲間の誘い方 ---------- */
var RECRUIT = (function () {
  /* お願い(favor)の進み方。check(P) が true なら 仲間になる。hint は まだのときの一言 */
  var FAVOR = {
    priest: { check: function () { return (P.talked.priest || 0) >= 3; }, hint: function () { return 'かねを ならしたのは ' + ((P.talked.priest || 0)) + ' 回。あと ' + Math.max(0, 3 - (P.talked.priest || 0)) + ' 回。'; } },
    pomeranians: { check: function () { return (P.talked.pomeranians || 0) >= 3; }, hint: function () { return 'ワン! (ボール ' + (P.talked.pomeranians || 0) + ' 回。あと ' + Math.max(0, 3 - (P.talked.pomeranians || 0)) + ' 回 なげて!)'; } },
    monsters: { item: 'mama_bento', hint: function () { return '雑貨屋で「ママの愛妻弁当」を 買ってきて…'; } },
    crows: { item: 'key_ring', hint: function () { return 'カァ(アクセサリー屋の「キーホルダー」が ほしい)'; } },
    cat_gang: { item: 'oden_skewer', hint: function () { return 'ニャー(武器屋の「おでんの串」が ほしい)'; } },
    fisher: { item: 'rubber_duck', hint: function () { return '雑貨屋の「ゴムのアヒル」を たのむ。'; } },
    slime_family: { check: function () { return !!P.flags.foundSlime; }, hint: function () { return 'ぷるぷる…(子どもが 町の どこかで まいごに。お城の 近くかも)'; } },
    aunt: { check: function () { return !!P.flags.kairanbanDone; }, start: function () { P.flags.kairanban = true; }, hint: function () { return P.flags.kairanban ? '回覧板、パン屋さんに とどけてくれた?' : ''; } },
    king_guards: { check: function () { return !!P.flags.guardTold; }, start: function () { P.flags.guardAsk = true; }, hint: function () { return '王さまに 伝えてきてよ。お城の 中だよ。'; } },
    bees: { check: function () { return !!P.flags.bouquet; }, hint: function () { return 'ブーン(お花屋さんから 花束を もらってきて)'; } }
  };
  function join(c, then) {
    if (P.party.length >= 10) { say({ name: c.name, emoji: c.emoji }, ['…でも もう 10組 いるね。「なかま」で だれかを はずしたら 来るよ。']); then && then(false); return; }
    P.party.push(c.id); AUDIO.sfx('join'); autosave();
    say({ name: c.name, emoji: c.emoji }, [c.talk.ok, '✨ ' + c.name + (c.count > 1 ? '(' + c.count + '人)' : '') + ' が 仲間に なった!(' + P.party.length + '/10組)'], function () { then && then(true); });
  }
  function start(c, then) {
    var who = { name: c.name, emoji: c.emoji }, h = c.how;
    // 特別な役(お使いの相手)
    if (c.id === 'baker' && P.flags.kairanban && !P.flags.kairanbanDone) { P.flags.kairanbanDone = true; say(who, ['あ、回覧板! ありがとう。おばさんに よろしくね。', 'おれいに パンを 1つ。(🥐 を もらった。気分が いい)'], function () { then && then(false); }); return; }
    if (c.id === 'florist' && !P.flags.bouquet && (P.talked.bees || 0) > 0) { P.flags.bouquet = true; say(who, ['ミツバチさんに 花束? いいわよ、はい どうぞ。💐', 'わたしも つれていってね!']); then && then(false); return; }
    var before = c.talk.before || [];
    switch (h.type) {
      case 'free': say(who, before.slice(0, 1).concat([h.text]), function () { ask(who, '仲間に なってもらう?', [{ label: 'おねがい!', cls: 'leaf', fn: function () { join(c, then); } }, { label: 'やめておく', cls: 'gray', fn: function () { then && then(false); } }]); }); break;
      case 'pay': say(who, before.slice(0, 1).concat([h.text]), function () {
        ask(who, fmtG(h.price) + ' はらう?(のこり ' + fmtG(P.money - h.price) + ')', [{ label: '💰 はらう', cls: 'orange', disabled: P.money < h.price, fn: function () { if (!pay(h.price)) return; AUDIO.sfx('coin'); join(c, then); } }, { label: P.money < h.price ? 'お金が たりない…' : 'やめておく', cls: 'gray', fn: function () { if (P.money < h.price) say(who, [c.talk.no]); then && then(false); } }]); }); break;
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
  return { start: start };
})();

'use strict';
/* ボス戦の計算(画面はさわらない・setTimeout も使わない・乱数は引数 rng だけ)。
   docs/design-battle.md と docs/sim_battle.py と同じ数字。定数は CONST にまとめる。 */
var BATTLE = (function () {
  var CONST = {
    DMG_SCALE_HERO: 20, DMG_SCALE_COMP: 70, HERO_BASE: { hp: 100, atk: 3, def: 2, spd: 5, luck: 5 },
    BOSS_ATK: { single: 850, all: 450, big: 2000 }, BOSS_HEAL_RATE: 0.08, BOSS_HEAL_TIMES: 2,
    GUARD_MUL: 0.3, GUARD_STANCE: [1, 0.2, 0.1, 0.07, 0.05], HERO_TARGET_P: 0.35, REPEAT_COMBO_MUL: 0.25,
    ROLE_MUL: { attack: 1.0, guard: 0.6, heal: 0.4, support: 0.6, weird: 1.0 }, ALL_COMP_MUL: 0.7, COMP_DEF_BONUS: 0
  };
  var PHASES = [
    { until: 0.70, name: 'よゆう', atk: 1.0, w: { normal: 45, all: 20, charge: 0, heal: 0, mood: 35 }, chargeGap: 99, moodP: 0.6, moods: ['boast', 'taunt', 'laugh', 'sleepy'] },
    { until: 0.40, name: 'いらいら', atk: 1.2, w: { normal: 35, all: 25, charge: 20, heal: 0, mood: 20 }, chargeGap: 3, moodP: 0.5, moods: ['angry', 'boast', 'sleepy', 'taunt', 'hungry'], enterMood: 'angry' },
    { until: 0.15, name: 'あせり', atk: 1.5, w: { normal: 30, all: 25, charge: 25, heal: 10, mood: 10 }, chargeGap: 3, moodP: 0.5, moods: ['cry', 'hungry', 'lonely', 'angry', 'laugh'], enterMood: 'cry' },
    { until: 0.00, name: 'ほんき', atk: 2.0, w: { normal: 25, all: 35, charge: 40, heal: 0, mood: 0 }, chargeGap: 2, moodP: 0.3, moods: ['angry'], enterMood: 'charge' }
  ];
  var MOODS = {
    normal: { name: 'ふつう', emoji: '😈', atk: 1.0, taken: 1.0, skip: 0, len: 0, line: '' },
    angry: { name: 'いかり', emoji: '😡', atk: 1.4, taken: 1.1, skip: 0, len: 2, line: '大魔王は 顔を 真っ赤にして ふるえている!', color: '#ff3d3d' },
    boast: { name: 'じまん', emoji: '😤', atk: 1.0, taken: 0.7, skip: 0, len: 2, line: '大魔王は ツノを みがきながら じまんしている。「どうだ、りっぱだろう」', color: '#ffd93d' },
    cry: { name: 'なく', emoji: '😢', atk: 0.7, taken: 1.0, skip: 0, len: 2, line: '大魔王の 目から ぽろぽろ 涙が…「だれも わかってくれない」', color: '#5aa9ff' },
    sleepy: { name: 'ねむい', emoji: '😴', atk: 1.0, taken: 1.0, skip: 0.4, len: 2, line: '大魔王は 大きな あくびをした。「ふぁ〜…」', color: '#b48cff' },
    taunt: { name: 'ちょうはつ', emoji: '🫵', atk: 1.0, taken: 1.0, skip: 0, len: 2, line: '大魔王「かかってこいよ へっぽこ。ほら、ほら」', color: '#ff9f43' },
    hungry: { name: 'おなかすいた', emoji: '🍙', atk: 0.8, taken: 1.0, skip: 0, len: 2, line: '大魔王の おなかが ぐ〜〜〜 と鳴った', color: '#c08a4a' },
    lonely: { name: 'さびしい', emoji: '🥺', atk: 1.0, taken: 1.0, skip: 0, len: 2, line: '大魔王は 遠くを 見ている…「友だちなんて いたことない」', color: '#9aa5b1' },
    laugh: { name: 'わらい', emoji: '😂', atk: 1.0, taken: 1.0, skip: 0.3, len: 2, line: '大魔王は ゲラゲラ 笑っている。「なんだ その かっこうは!」', color: '#ff7ad0' },
    charge: { name: 'ためる', emoji: '⚡', atk: 1.0, taken: 1.0, skip: 0, len: 1, line: '大魔王は 力を ためはじめた!! 次は すごいのが くる!!', color: '#ffe066' },
    careless: { name: 'ゆだん', emoji: '😏', atk: 1.0, taken: 2.0, skip: 0, len: 2, line: '大魔王は すっかり いい気分で 守りを わすれている', color: '#9df29d' },
    asleep: { name: 'ねている', emoji: '💤', atk: 1.0, taken: 1.5, skip: 1, len: 2, line: '大魔王は ぐっすり 眠っている… zzz', color: '#b48cff' },
    shaken: { name: 'どうよう', emoji: '😳', atk: 1.0, taken: 1.0, skip: 1, len: 1, line: '大魔王は「え…」と 固まっている', color: '#9aa5b1' }
  };
  /* 無駄コマンド × 気分 → 効果コードの列。'*' = ふつう(と書いてない気分)。
     効果コード: dmg N / clear / mood X / skip / batk k,n / bdef / hheal N / pheal N / bheal N / self N / buff k / hguard / chance p ... / text ... / noact */
  var EFFECTS = {
    sorry: { '*': ['chance 0.2 mood laugh', 'text 大魔王「なんで 謝るんだ(笑)」'], angry: ['dmg 12', 'clear', 'text 大魔王「…お、おう。わかれば いいんだ」'], cry: ['dmg 3', 'text 大魔王は もっと 泣いた'], taunt: ['batk 1.2,1', 'text 大魔王「なさけない やつめ!」'] },
    flee: { '*': ['text 足が すくんで 動けない!'], taunt: ['chance 0.5 mood boast', 'text 大魔王「逃げるのか〜? ん〜?」'], charge: ['hguard', 'text へっぽこは 逃げ腰で かまえた!'] },
    fake: { '*': ['chance 0.3 bdef', 'text 大魔王は ちょっと ビクッとした'], sleepy: ['clear', 'text 大魔王の 目が さめた…(やめておけば)'], asleep: ['clear', 'text 大魔王が 起きてしまった!'], taunt: ['bdef', 'mood angry', 'text 大魔王「ひっかかった…! くそー!」'] },
    cry: { '*': ['pheal 10', 'text 仲間たちが へっぽこを はげました'], angry: ['batk 0.8,2', 'text 大魔王「な、泣くなよ…」'], boast: ['text 大魔王は きいていない'], cry: ['dmg 15', 'clear', 'text 大魔王も もらい泣きした!「うぅ…おまえも つらいのか…」'], laugh: ['dmg 5', 'text 大魔王「泣くか笑うか どっちか にしろ!」'] },
    boast: { '*': ['chance 0.6 mood boast', 'text 大魔王「おれの ほうが すごい!」'], angry: ['batk 1.5,1', 'text 大魔王「調子に のるなーっ!」'], boast: ['dmg 5', 'text どっちが えらいか 言い合いに なった'], laugh: ['dmg 3', 'text 大魔王「へっぽこの じまんは おかしい(笑)」'] },
    money: { '*': ['dmg 2', 'text 大魔王「成金め…」'], taunt: ['mood angry', 'text 大魔王「金で なんとか なると 思うな!」'], hungry: ['skip', 'text 大魔王「…それで なにか 買ってくる」'], lonely: ['dmg 5', 'text 大魔王「お金より 友だちが ほしい…」'] },
    praise: { '*': ['dmg 1', 'text 大魔王は ちょっと 照れた'], angry: ['batk 1.3,1', 'text 大魔王「バカに してるのか!」'], boast: ['mood careless', 'text 大魔王「えへへ そうだろ〜」すっかり 油断した!'], lonely: ['dmg 8', 'text 大魔王「は、はじめて ほめられた…」'] },
    sleep: { '*': ['hheal 30', 'vuln 1.5', 'text へっぽこは ぐっすり 寝た(むぼうび!)'], sleepy: ['mood asleep', 'text 大魔王も つられて 寝てしまった!'], charge: ['hheal 30', 'text へっぽこは 寝た… 大技が くるのに!'] },
    dance: { '*': ['buff 1.3', 'text みんなが つられて 踊りはじめた!'], angry: ['batk 1.3,1', 'text 大魔王「ふざけるなーっ!」'], laugh: ['skip', 'text 大魔王も いっしょに 踊りだした!'], asleep: ['clear', 'text 大魔王が 起きてしまった!'] },
    mimic: { '*': ['chance 0.7 mood laugh else mood angry', 'text へっぽこは 大魔王の ものまねを した'], boast: ['mood laugh', 'text 大魔王「はは、似てる 似てる!」'], cry: ['mood angry', 'text 大魔王「バカに して!」'], laugh: ['dmg 4', 'text 大魔王は 笑いすぎて 腹が いたい'] },
    glare: { '*': ['chance 0.5 dmg 3 bdef else noact', 'text へっぽこは 大魔王を にらんだ'], sleepy: ['text 大魔王は 気づいていない'], taunt: ['chance 0.5 dmg 6 else mood angry', 'text にらみあいに なった!'], asleep: ['clear', 'text 大魔王が 起きてしまった!'] },
    sing: { '*': ['dmg 2', 'chance 0.2 mood sleepy', 'text 大魔王は 耳を ふさいだ'], angry: ['batk 1.2,1', 'text 大魔王「うるさいっ!」'], cry: ['dmg 4', 'text 大魔王は 歌を きいて しんみりした'], sleepy: ['mood asleep', 'text 子守歌で 大魔王は ねむってしまった!'], asleep: ['clear', 'text 大魔王が 起きてしまった!'] },
    photo: { '*': ['photo', 'text へっぽこは 写真を 1枚 撮った(アルバムに 入った)'], boast: ['skip', 'photo', 'text 大魔王は ポーズを とった!「いい顔で 撮れよ」'], cry: ['mood angry', 'text 大魔王「撮るな!」'], asleep: ['clear', 'text シャッターの 音で 起きてしまった!'] },
    mama: { '*': ['pheal 100', 'text ママが 来た!「あらあら けがして」みんな 元気に なった'], lonely: ['pheal 100', 'dmg 10', 'text ママと 大魔王の ママも 来て 大魔王を しかった!'], charge: ['pheal 100', 'mamaguard', 'text ママが 来て みんなを かばった!'] },
    onigiri: { '*': ['bheal 1', 'text 大魔王は おにぎりを 食べて 元気に なった…'], angry: ['dmg 6', 'clear', 'text 大魔王「…食べてから 聞いてやる」'], cry: ['dmg 5', 'text 大魔王は 泣きながら 食べた'], hungry: ['dmg 10', 'clear', 'text 大魔王「う、うまい…」心に きいた!'] },
    talk: { '*': ['text 話が 通じない'], angry: ['batk 1.2,1', 'text 大魔王「話を 聞く 気分じゃ ない!」'], taunt: ['text 大魔王「はなしは あとだ」'], lonely: ['dmg 10', 'clear', 'batk 0.7,3', 'text 大魔王は 長い 話を した。すこし 心が 通じた…'] },
    tsukkomi: { '*': ['text 大魔王「…なにが?」'], boast: ['dmg 4', 'text 大魔王「い、いいだろ べつに」'], cry: ['mood angry', 'text 大魔王「泣いてるときに ツッコむな!」'], laugh: ['dmg 8', 'clear', 'text 大魔王「ちょ、やめて、笑わせないで…!」'] },
    soothe: { '*': ['text 大魔王「なだめるな」'], angry: ['dmg 8', 'clear', 'text 大魔王は 少し 落ちついた'], cry: ['dmg 8', 'clear', 'text 大魔王は 鼻を すすった'], taunt: ['batk 1.2,1', 'text 大魔王「なめてるのか!」'] },
    janken: { '*': ['janken', 'text へっぽこ「じゃんけん…」'], taunt: ['janken skip', 'text 大魔王「のった!」'], lonely: ['janken2', 'text 大魔王は うれしそうに 手を出した'] },
    ignore: { '*': ['mood angry', 'batk 1.3,1', 'text 大魔王「む、無視するな!」'], boast: ['mood lonely', 'text 大魔王は すねてしまった'], sleepy: ['chance 0.5 mood asleep', 'text 大魔王は ひまで ねむくなった'], taunt: ['dmg 6', 'skip', 'text 大魔王「え…無視…?」ショックで 固まった!'] },
    dajare: { '*': ['chance 0.5 mood laugh', 'chance 0.2 mood angry', 'text へっぽこ「ふとんが ふっとんだ!」'], cry: ['chance 0.3 mood laugh', 'text 大魔王は 泣きながら ちょっと 笑った'], laugh: ['dmg 6', 'text 大魔王「もう やめて 腹が…!」'] },
    hungry: { '*': ['text 大魔王「おれも…」ふたりで おなかが 鳴った'], hungry: ['dmg 6', 'text 大魔王「おまえも か…」なんだか 仲間意識が 生まれた'], angry: ['batk 1.2,1', 'text 大魔王「おなかの 話を するな!」'] },
    pray: { '*': ['hheal 15', 'text へっぽこは 少し 元気に なった'], cry: ['dmg 4', 'text 大魔王も 手を 合わせた'], asleep: ['hheal 15', 'text しずかな いのりの 時間…'] },
    pout: { '*': ['text 大魔王は どうすれば いいか わからない'], boast: ['mood lonely', 'text 大魔王「む、無視か…」すこし さびしくなった'], lonely: ['dmg 6', 'text ふたりで すねあって、なんだか 友だちみたい…'] },
    play_dead: { '*': ['chance 0.5 skip', 'text 大魔王は つんつん した'], angry: ['skip', 'text 大魔王「え…やりすぎた…?」固まった!'], taunt: ['dmg 4', 'text 大魔王「つまらん…」'], asleep: ['text ふたりとも 横になった'] },
    tickle: { '*': ['chance 0.4 mood laugh', 'text 大魔王の 体は かたかった'], laugh: ['dmg 7', 'text 大魔王「や、やめ、ははは、やめろ!」'], sleepy: ['clear', 'text 大魔王は くすぐられて 目が さめた'], angry: ['batk 1.3,1', 'text 大魔王「さわるな!」'] },
    hug: { '*': ['chance 0.3 mood lonely', 'text 大魔王は ちょっと あたたかかった'], lonely: ['dmg 12', 'clear', 'text 大魔王「…だ、だきつかれたのは はじめてだ」'], cry: ['dmg 8', 'clear', 'text 大魔王は へっぽこの 肩で 泣いた'], angry: ['self 10', 'text 大魔王に ふりはらわれた!'] },
    count: { '*': ['text 10で あきた'], sleepy: ['chance 0.6 mood asleep', 'text 「…8、9…」大魔王の 目が とろんと した'], charge: ['text 数えている 間に 大技が…!'] },
    space_out: { '*': ['hheal 5', 'text 雲が きれいだった'], taunt: ['dmg 5', 'text 大魔王「聞いてる!? おい!」'], sleepy: ['mood asleep', 'text ふたりで ぼーっと して、大魔王は 寝た'] },
    homework_cmd: { '*': ['text 1もんも とけなかった'], boast: ['dmg 5', 'text 大魔王「おれが 教える!」まちがっていた。はずかしい'], sleepy: ['chance 0.5 mood asleep', 'text 宿題を 見ていた 大魔王が 寝た'] },
    greet: { '*': ['dmg 1', 'text 大魔王「…こんにちは」'], taunt: ['dmg 4', 'clear', 'text ていねいな あいさつに 大魔王は 調子が くるった'], lonely: ['dmg 6', 'text 大魔王「あいさつ されたの、ひさしぶりだ…」'] },
    riddle_cmd: { '*': ['chance 0.5 skip', 'text 大魔王は かんがえこんで しまった'], boast: ['skip', 'text 大魔王「わかる、わかるぞ…まて…」'], angry: ['batk 1.2,1', 'text 大魔王「なぞなぞの 気分じゃ ない!」'] },
    lecture: { '*': ['chance 0.3 mood angry', 'text 大魔王は 下を 向いた'], boast: ['dmg 6', 'text 大魔王「…はい」しょんぼり'], laugh: ['dmg 4', 'clear', 'text 大魔王は わらうのを やめた'], cry: ['batk 0.8,2', 'text 大魔王「…ごめんなさい」'] },
    toilet: { '*': ['skip', 'text 大魔王「…あっちだ」待ってくれた'], angry: ['text 大魔王「がまんしろ!」'], charge: ['hguard', 'text へっぽこは トイレに かけこんで 大技を かわした!'] },
    sneeze: { '*': ['text 大魔王「おだいじに」'], sleepy: ['clear', 'text 大魔王は くしゃみで 目が さめた'], asleep: ['clear', 'text 大魔王が 起きてしまった!'], boast: ['dmg 4', 'text じまん話の 途中で くしゃみ。大魔王は しらけた'] },
    tea: { '*': ['batk 0.9,1', 'text 大魔王は お茶を 一口 のんだ'], angry: ['dmg 4', 'clear', 'text 大魔王「…ふう」'], sleepy: ['clear', 'text 大魔王は お茶で 目が さめた'], hungry: ['dmg 3', 'text 大魔王「お茶だけ か…」'], lonely: ['dmg 8', 'batk 0.8,2', 'text ふたりで お茶を のんだ。しずかな 時間…'] }
  };
  var BEST = { angry: 'sorry', boast: 'praise', cry: 'cry', sleepy: 'sing', taunt: 'ignore', hungry: 'onigiri', lonely: 'talk', laugh: 'tsukkomi' };
  var HINT2 = { angry: 'あんなに 怒ってる人には まず あやまるもんだよ', boast: 'じまん話は ほめておくのが 早いですぞ', cry: '泣いてる… こっちも 泣いてみるか?', sleepy: 'ねむそ〜。子守歌 歌ったら 寝るんじゃない?', taunt: 'ちょうはつは 無視が いちばん こたえるんじゃ', hungry: 'おなか すいてるんじゃね? なんか あげたら?', lonely: 'さびしそうです。お話を 聞いてあげては', laugh: '笑ってるときは ツッコミが 効くわ', charge: '予告だ! まもる か、守りの仲間に まかせろ!' };
  var WAKE = { fake: 1, glare: 1, sing: 1, dance: 1, photo: 1 };

  function makeRng(seed) { var s = (seed >>> 0) || 1; return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  function calcHeroStats(itemIds, ITEMS) {
    var st = { hp: CONST.HERO_BASE.hp, atk: CONST.HERO_BASE.atk, def: CONST.HERO_BASE.def, spd: CONST.HERO_BASE.spd, luck: CONST.HERO_BASE.luck };
    (itemIds || []).forEach(function (id) { var it = ITEMS[id]; if (!it) return; st.atk += it.atk || 0; st.def += it.def || 0; var ex = it.extra || {}; st.hp += ex.hp || 0; st.spd += ex.spd || 0; st.luck += ex.luck || 0; });
    return st;
  }
  function moodOf(s) { return MOODS[s.boss.mood] || MOODS.normal; }
  function phaseIdx(boss) { var p = boss.hp / boss.maxHp; for (var i = 0; i < PHASES.length; i++) if (p > PHASES[i].until) return i; return 3; }
  function heroAttackDamage(st, item, s, rng) {
    var crit = rng() < Math.min(0.3, st.luck / 100);
    var d = (item.attack ? item.attack.power : 1) * (st.atk * CONST.DMG_SCALE_HERO + 200) * (0.9 + rng() * 0.2) * (crit ? 2 : 1) * moodOf(s).taken * (s.boss.defBreakLeft > 0 ? 1.3 : 1) * (s.heroBuff || 1);
    return { dmg: Math.max(1, Math.floor(d)), crit: crit };
  }
  function companionDamage(c, s, rng, roleMul) {
    var num = c.count >= 2 ? (0.5 + 0.5 * c.hp / c.maxHp) : 1;
    var d = c.power * CONST.DMG_SCALE_COMP * (0.85 + rng() * 0.3) * num * roleMul * moodOf(s).taken * (s.boss.defBreakLeft > 0 ? 1.3 : 1) * (s.buffs.partyAtk || 1);
    return Math.max(1, Math.floor(d));
  }
  function damageToParty(base, atkMul, def, rng) { return Math.max(1, Math.floor(base * atkMul * (0.9 + rng() * 0.2) * 100 / (100 + def))); }

  function newState(heroStats, itemIds, comps, bossData) {
    return {
      turn: 1,
      hero: { hp: heroStats.hp, maxHp: heroStats.hp, atk: heroStats.atk, def: heroStats.def, spd: heroStats.spd, luck: heroStats.luck, items: itemIds.slice(), guarding: false, vuln: 1, hguard: false, mamaUsed: false, noAct: false },
      comps: comps.map(function (c) { return { id: c.id, name: c.name, emoji: c.emoji, role: c.battle.role, power: c.battle.power, hp: c.battle.hp, maxHp: c.battle.hp, def: c.battle.def || 20, count: c.count || 1, alive: true, lines: c.battle.lines || [], special: c.battle.special || null, reviveLeft: c.battle.role === 'heal' ? 1 : 0, stance: false }; }),
      boss: { name: bossData.name, hp: bossData.hp, maxHp: bossData.hp, mood: 'normal', moodLeft: 0, lastChargeTurn: -99, healsLeft: CONST.BOSS_HEAL_TIMES, atkMulTemp: 1, atkMulTempLeft: 0, defBreakLeft: 0, phase: 0, skipNext: 0 },
      buffs: { partyAtk: 1, partyDef: 1 }, heroBuff: 1, heroBuffNext: 1, mamaGuard: false,
      comboUsed: {}, discovered: {}, combos: 0, photos: 0, lastHitBy: null, log: []
    };
  }
  function ev(events, type, o) { o = o || {}; o.type = type; events.push(o); return o; }
  function hitBoss(s, events, amount, kind, who, text) {
    s.boss.hp = Math.max(0, s.boss.hp - amount); s.lastHitBy = who;
    ev(events, 'damage', { who: who, target: 'boss', amount: amount, kind: kind || 'normal', text: text });
  }
  /* 効果コードを1つ実行 */
  function applyEffect(s, code, events, cmdId, rng) {
    var p = code.split(' '), k = p[0];
    switch (k) {
      case 'text': ev(events, 'text', { text: code.slice(5) }); break;
      case 'dmg': { var key = s.boss.mood + ':' + cmdId; var n = s.comboUsed[key] || 0; var amt = Math.floor(s.boss.maxHp * (+p[1]) / 100 * (n > 0 ? CONST.REPEAT_COMBO_MUL : 1));
        s.comboUsed[key] = n + 1; if (+p[1] >= 5) { s.discovered[key] = true; s.combos++; }
        hitBoss(s, events, amt, 'combo', 'hero', n > 0 ? '…でも 2回目は あまり きかない' : '心に ' + amt.toLocaleString('ja-JP') + ' の ダメージ!'); break; }
      case 'clear': s.boss.mood = 'normal'; s.boss.moodLeft = 0; ev(events, 'mood', { mood: 'normal' }); break;
      case 'mood': setMood(s, p[1], events); break;
      case 'skip': s.boss.skipNext = 1; setMood(s, 'shaken', events); break;
      case 'batk': { var kv = p[1].split(','); s.boss.atkMulTemp = +kv[0]; s.boss.atkMulTempLeft = +kv[1]; ev(events, 'text', { text: +kv[0] > 1 ? '大魔王の 攻撃が はげしくなった!' : '大魔王の 攻撃が 弱まった' }); break; }
      case 'bdef': s.boss.defBreakLeft = 1; ev(events, 'text', { text: '大魔王の 守りが くずれた!' }); break;
      case 'hheal': healHero(s, events, Math.floor(s.hero.maxHp * (+p[1]) / 100)); break;
      case 'pheal': healHero(s, events, Math.floor(s.hero.maxHp * (+p[1]) / 100)); s.comps.forEach(function (c) { if (c.alive) { var a = Math.floor(c.maxHp * (+p[1]) / 100); c.hp = Math.min(c.maxHp, c.hp + a); } }); ev(events, 'heal', { target: 'all', amount: p[1] + '%' }); break;
      case 'bheal': { var b = Math.floor(s.boss.maxHp * (+p[1]) / 100); s.boss.hp = Math.min(s.boss.maxHp, s.boss.hp + b); ev(events, 'heal', { target: 'boss', amount: b }); break; }
      case 'self': { var sd = Math.floor(s.hero.maxHp * (+p[1]) / 100); s.hero.hp = Math.max(0, s.hero.hp - sd); ev(events, 'damage', { who: 'boss', target: 'hero', amount: sd, kind: 'self', text: 'へっぽこは デコピンを くらった!' }); break; }
      case 'buff': s.heroBuffNext = +p[1]; s.buffs.partyAtk = +p[1]; ev(events, 'text', { text: 'みんなの 攻撃が 上がった!' }); break;
      case 'hguard': s.hero.hguard = true; break;
      case 'mamaguard': s.mamaGuard = true; break;
      case 'vuln': s.hero.vuln = +p[1]; break;
      case 'noact': ev(events, 'text', { text: 'へっぽこは にらみ負けて 動けなかった' }); break;
      case 'photo': s.photos++; break;
      case 'chance': { var r = rng(), pr = +p[1], rest = p.slice(2).join(' '); var alt = rest.split(' else '); if (r < pr) applyEffectList(s, alt[0], events, cmdId, rng); else if (alt[1]) applyEffectList(s, alt[1], events, cmdId, rng); break; }
      case 'janken': case 'janken2': { var rr = rng(); var win = k === 'janken2' ? rr < 2 / 3 : rr < 1 / 3;
        if (win) { ev(events, 'text', { text: 'へっぽこの 勝ち!' }); if (k === 'janken2') applyEffect(s, 'dmg 8', events, cmdId, rng); else { applyEffect(s, 'dmg 4', events, cmdId, rng); if (p[1] === 'skip') applyEffect(s, 'skip', events, cmdId, rng); } }
        else if (k === 'janken' && rr < 2 / 3) ev(events, 'text', { text: 'あいこ! にらみあった' });
        else { ev(events, 'text', { text: '大魔王の 勝ち!' }); applyEffect(s, 'self 10', events, cmdId, rng); } break; }
    }
  }
  function applyEffectList(s, str, events, cmdId, rng) { // "dmg 3 bdef" のように空白でつながった複数コード
    var toks = str.split(' '), i = 0;
    while (i < toks.length) { var t = toks[i]; if (t === 'mood' || t === 'dmg' || t === 'batk' || t === 'hheal' || t === 'pheal' || t === 'bheal' || t === 'self' || t === 'buff' || t === 'vuln') { applyEffect(s, t + ' ' + toks[i + 1], events, cmdId, rng); i += 2; } else { applyEffect(s, t, events, cmdId, rng); i++; } }
  }
  function setMood(s, m, events) { if (!MOODS[m]) return; s.boss.mood = m; s.boss.moodLeft = MOODS[m].len; ev(events, 'mood', { mood: m, text: MOODS[m].line }); }
  function healHero(s, events, a) { var before = s.hero.hp; s.hero.hp = Math.min(s.hero.maxHp, s.hero.hp + a); ev(events, 'heal', { target: 'hero', amount: s.hero.hp - before }); }

  /* ① へっぽこのコマンド */
  function resolveCommand(s, cmd, ITEMS, events, rng) {
    s.hero.guarding = false; s.hero.hguard = false; s.hero.vuln = 1; s.hero.noAct = false;
    if (cmd.kind === 'guard') { s.hero.guarding = true; ev(events, 'text', { text: 'へっぽこは 身を まもっている!' }); return; }
    if (cmd.kind === 'attack') {
      var it = ITEMS[cmd.itemId]; if (!it) return;
      var at = it.attack || { name: 'たたく', power: 0.5, type: 'phys', text: 'へっぽこは ' + it.name + 'で たたいた!' };
      ev(events, 'text', { text: at.text || ('へっぽこは ' + at.name + '!') , who: 'hero', item: it.id });
      if (at.type === 'heal') { var a = Math.floor(((it.extra && it.extra.heal) || 10) * 10 * at.power); healHero(s, events, a); return; }
      if (s.boss.mood === 'asleep' && rng() < 0.5) { setMood(s, 'normal', events); ev(events, 'text', { text: '大魔王が 目を さました!' }); }
      var r = heroAttackDamage(s.hero, it, s, rng);
      hitBoss(s, events, r.dmg, r.crit ? 'crit' : (at.type === 'weird' ? 'weird' : 'hero'), 'hero', r.crit ? '会心の いちげき!' : null);
      return;
    }
    if (cmd.kind === 'waste') {
      var tbl = EFFECTS[cmd.id]; if (!tbl) { ev(events, 'text', { text: 'なにも おこらなかった' }); return; }
      if (cmd.id === 'mama') { if (s.hero.mamaUsed) { ev(events, 'text', { text: 'ママは もう 来てくれない…' }); return; } s.hero.mamaUsed = true; }
      ev(events, 'text', { text: cmd.text || ('へっぽこは ' + cmd.name + '!'), who: 'hero', cmd: cmd.id });
      var m = s.boss.mood, list = tbl[m];
      if (!list) { if ((m === 'asleep') && WAKE[cmd.id]) list = ['clear', 'text 大魔王が 起きてしまった!']; else list = tbl['*']; }
      // text は最後に出したいので並べ替え(効果→セリフ)
      var fx = list.filter(function (c) { return c.indexOf('text ') !== 0; }), tx = list.filter(function (c) { return c.indexOf('text ') === 0; });
      tx.forEach(function (c) { applyEffect(s, c, events, cmd.id, rng); });
      fx.forEach(function (c) { applyEffect(s, c, events, cmd.id, rng); });
      return;
    }
  }
  /* ② 仲間 */
  var ORDER = { support: 0, guard: 1, heal: 2, attack: 3, weird: 4 };
  function companionsPhase(s, events, rng) {
    var alive = s.comps.filter(function (c) { return c.alive; });
    alive.sort(function (a, b) { return (ORDER[a.role] - ORDER[b.role]) || (s.comps.indexOf(a) - s.comps.indexOf(b)); });
    s.guardCount = 0; s.comps.forEach(function (c) { c.stance = false; });
    alive.forEach(function (c) {
      if (!c.alive || s.boss.hp <= 0) return;
      var roleMul = CONST.ROLE_MUL[c.role] || 1, line = c.lines.length ? c.lines[Math.floor(rng() * c.lines.length)] : '';
      switch (c.role) {
        case 'guard':
          if (s.boss.mood === 'charge') { c.stance = true; s.guardCount++; ev(events, 'act', { who: c.id, kind: 'guardStance', text: c.name + 'は まもりの かまえ! 🛡️' }); return; }
          break;
        case 'heal':
          if (s.hero.hp < s.hero.maxHp * 0.6) { var a = c.power * 12; healHero(s, events, a); ev(events, 'act', { who: c.id, kind: 'heal', target: 'hero', amount: a, text: c.name + 'は へっぽこを 回復した! 💚' }); return; }
          var down = s.comps.filter(function (x) { return !x.alive; });
          if (down.length && c.reviveLeft > 0) { c.reviveLeft--; var d = down[0]; d.alive = true; d.hp = Math.floor(d.maxHp / 2); ev(events, 'revive', { who: c.id, target: d.id, text: c.name + 'は ' + d.name + 'を よびもどした!' }); return; }
          var low = alive.filter(function (x) { return x.alive && x.hp < x.maxHp * 0.5; }).sort(function (a, b) { return a.hp / a.maxHp - b.hp / b.maxHp; })[0];
          if (low) { var h = c.power * 12; low.hp = Math.min(low.maxHp, low.hp + h); ev(events, 'act', { who: c.id, kind: 'heal', target: low.id, amount: h, text: c.name + 'は ' + low.name + 'を 回復した! 💚' }); return; }
          break;
        case 'support': {
          var mode = s.turn % 3;
          if (mode === 0) { s.buffs.partyAtk = Math.max(s.buffs.partyAtk, 1.25); s.heroBuffNext = Math.max(s.heroBuffNext, 1.25); ev(events, 'act', { who: c.id, kind: 'buffAtk', text: c.name + 'の こうげきの歌! みんなの 攻撃が 上がった 🎵' }); return; }
          if (mode === 1) { s.buffs.partyDef = 0.75; ev(events, 'act', { who: c.id, kind: 'buffDef', text: c.name + 'の まもりの旗! つぎの 攻撃が 弱まる 🚩' }); return; }
          break; }
        case 'weird': {
          var r = rng();
          if (r < 0.15) { var wd = companionDamage(c, s, rng, 3.0); hitBoss(s, events, wd, 'weird', c.id, c.name + 'の なぜか 大当たり!!'); return; }
          if (r < 0.30) { s.comps.forEach(function (x) { if (x.alive) x.hp = Math.min(x.maxHp, x.hp + Math.floor(x.maxHp * 0.2)); }); healHero(s, events, Math.floor(s.hero.maxHp * 0.2)); ev(events, 'act', { who: c.id, kind: 'heal', target: 'all', text: c.name + 'が へんな おどりを した。なぜか みんな 元気に!' }); return; }
          if (r < 0.55) { ev(events, 'act', { who: c.id, kind: 'nothing', text: c.name + 'は 昼寝を している… 💤' }); return; }
          if (r < 0.70) { if (['charge', 'careless', 'asleep', 'shaken'].indexOf(s.boss.mood) < 0) { var ms = ['angry', 'boast', 'cry', 'sleepy', 'taunt', 'hungry', 'lonely', 'laugh']; setMood(s, ms[Math.floor(rng() * ms.length)], events); ev(events, 'act', { who: c.id, kind: 'mood', text: c.name + 'が なにか 言った。大魔王の 気分が 変わった!' }); } else ev(events, 'act', { who: c.id, kind: 'nothing', text: c.name + 'は なにか 言ったが 大魔王に 届かなかった' }); return; }
          if (r < 0.80) { var sd = Math.floor(c.maxHp * 0.2); c.hp = Math.max(0, c.hp - sd); ev(events, 'act', { who: c.id, kind: 'self', amount: sd, text: c.name + 'は 自分で ころんだ! 💫' }); if (c.hp <= 0) downComp(s, c, events); return; }
          if (r < 0.90) { if (['charge', 'careless', 'asleep', 'shaken'].indexOf(s.boss.mood) < 0) setMood(s, 'laugh', events); ev(events, 'act', { who: c.id, kind: 'mood', text: c.name + 'の 一発ギャグ! 大魔王が 笑った' }); return; }
          var bh = Math.floor(s.boss.maxHp * 0.01); s.boss.hp = Math.min(s.boss.maxHp, s.boss.hp + bh); ev(events, 'act', { who: c.id, kind: 'bheal', amount: bh, text: c.name + 'は まちがえて 大魔王を 回復した…' }); return; }
      }
      // 攻撃
      if (s.boss.mood === 'asleep' && rng() < 0.3) { setMood(s, 'normal', events); ev(events, 'text', { text: '大魔王が 目を さました!' }); }
      var dmg = companionDamage(c, s, rng, roleMul);
      var sp = '';
      if (c.special && rng() < 0.12) { dmg = Math.floor(dmg * 1.8); sp = ' ' + c.special.name + '!'; }
      hitBoss(s, events, dmg, 'comp', c.id, c.name + 'の こうげき!' + sp + (line ? '「' + line + '」' : ''));
    });
  }
  function downComp(s, c, events) { c.alive = false; c.hp = 0; ev(events, 'down', { who: c.id, text: c.count >= 2 ? c.name + 'は にげだした!' : c.name + 'は たおれた!' }); }
  /* ③ 大魔王 */
  function chooseBossAction(s, rng) {
    var b = s.boss, md = moodOf(s);
    if (b.skipNext > 0) { b.skipNext = 0; return 'none'; }
    if (md.skip >= 1) return 'none';
    if (md.skip > 0 && rng() < md.skip) return 'none';
    if (b.mood === 'charge') return 'big';
    var ph = PHASES[b.phase], w = {}, tot = 0;
    for (var k in ph.w) { var v = ph.w[k]; if (k === 'charge' && s.turn - b.lastChargeTurn < ph.chargeGap) v = 0; if (k === 'heal' && b.healsLeft <= 0) v = 0; w[k] = v; tot += v; }
    var r = rng() * tot; for (k in w) { r -= w[k]; if (r < 0) return k; }
    return 'normal';
  }
  function bossAtkMul(s) { return PHASES[s.boss.phase].atk * moodOf(s).atk * (s.boss.atkMulTempLeft > 0 ? s.boss.atkMulTemp : 1) * (s.buffs.partyDef || 1); }
  function hurtHero(s, events, base, mul, rng, kind) {
    if (kind === 'single' && rng() < Math.min(0.25, s.hero.spd / 200)) { ev(events, 'damage', { who: 'boss', target: 'hero', amount: 0, kind: 'miss', text: 'へっぽこは ひらりと よけた!' }); return; }
    var d = damageToParty(base, mul, s.hero.def, rng);
    if (s.hero.guarding) d = Math.floor(d * CONST.GUARD_MUL);
    d = Math.floor(d * s.hero.vuln);
    if (kind === 'big') { var g = CONST.GUARD_STANCE[Math.min(s.guardCount, 4)]; d = Math.floor(d * g); if (s.hero.hguard) d = 0; if (s.mamaGuard) d = Math.floor(d * 0.5); }
    s.hero.hp = Math.max(0, s.hero.hp - d);
    ev(events, 'damage', { who: 'boss', target: 'hero', amount: d, kind: kind === 'big' ? 'big' : (s.hero.guarding ? 'guarded' : 'normal') });
  }
  function hurtComp(s, c, events, base, mul, rng, kind) {
    var d = damageToParty(base, mul, c.def + CONST.COMP_DEF_BONUS, rng);
    if (kind === 'all' || kind === 'big') d = Math.floor(d * CONST.ALL_COMP_MUL);
    if (kind === 'big') { var g = CONST.GUARD_STANCE[Math.min(s.guardCount, 4)]; d = Math.floor(d * g); if (s.mamaGuard) d = Math.floor(d * 0.5); }
    c.hp = Math.max(0, c.hp - d);
    ev(events, 'damage', { who: 'boss', target: c.id, amount: d, kind: kind === 'big' ? 'big' : 'normal' });
    if (c.hp <= 0) downComp(s, c, events);
  }
  function applyBossAction(s, action, events, rng, bossData) {
    var b = s.boss, lines = (bossData && bossData.lines) || {}, mul = bossAtkMul(s);
    var say = function (key, fallback) { var arr = lines[key]; ev(events, 'boss', { action: action, text: (arr && arr.length) ? arr[Math.floor(rng() * arr.length)] : fallback }); };
    switch (action) {
      case 'none': ev(events, 'boss', { action: 'none', text: moodOf(s).skip >= 1 ? '大魔王は 動けない!' : '大魔王は ぼんやり している…' }); break;
      case 'normal': { say('normal', '大魔王の こうげき!');
        var alive = s.comps.filter(function (c) { return c.alive; });
        if (!alive.length || rng() < CONST.HERO_TARGET_P) hurtHero(s, events, CONST.BOSS_ATK.single, mul, rng, 'single');
        else hurtComp(s, alive[Math.floor(rng() * alive.length)], events, CONST.BOSS_ATK.single, mul, rng, 'single'); break; }
      case 'all': say('all', '大魔王の 全体こうげき!'); hurtHero(s, events, CONST.BOSS_ATK.all, mul, rng, 'all'); s.comps.slice().forEach(function (c) { if (c.alive) hurtComp(s, c, events, CONST.BOSS_ATK.all, mul, rng, 'all'); }); ev(events, 'shake', { power: 'mid' }); break;
      case 'charge': b.lastChargeTurn = s.turn; setMood(s, 'charge', events); say('charge', '大魔王は 力を ためはじめた!!'); ev(events, 'warn', {}); break;
      case 'big': b.mood = 'normal'; b.moodLeft = 0; say('big', 'くらえーーっ!! 大魔王の おおわざ!!'); ev(events, 'bigattack', { guardCount: s.guardCount });
        hurtHero(s, events, CONST.BOSS_ATK.big, mul, rng, 'big'); s.comps.slice().forEach(function (c) { if (c.alive) hurtComp(s, c, events, CONST.BOSS_ATK.big, mul, rng, 'big'); }); ev(events, 'shake', { power: 'big' }); break;
      case 'heal': { b.healsLeft--; var h = Math.floor(b.maxHp * CONST.BOSS_HEAL_RATE); b.hp = Math.min(b.maxHp, b.hp + h); say('heal', '大魔王は 傷を なめて 回復した'); ev(events, 'heal', { target: 'boss', amount: h }); break; }
      case 'mood': { var ph = PHASES[b.phase]; if (b.mood === 'normal' && ph.moods.length) { setMood(s, ph.moods[Math.floor(rng() * ph.moods.length)], events); } else say('normal', '大魔王は 様子を 見ている'); break; }
    }
  }
  function tickBoss(s, events, rng) {
    var b = s.boss;
    if (b.atkMulTempLeft > 0) { b.atkMulTempLeft--; if (b.atkMulTempLeft === 0) b.atkMulTemp = 1; }
    if (b.defBreakLeft > 0) b.defBreakLeft--;
    if (b.mood !== 'normal' && b.mood !== 'charge') { b.moodLeft--; if (b.moodLeft <= 0) { b.mood = 'normal'; ev(events, 'mood', { mood: 'normal', text: '大魔王は ふつうの 顔に もどった' }); } }
    // 攻撃のあと、ふつうなら新しい気分
    var ph = PHASES[b.phase];
    if (b.mood === 'normal' && s.lastBossAction !== 'mood' && s.lastBossAction !== 'charge' && rng() < ph.moodP && ph.moods.length) setMood(s, ph.moods[Math.floor(rng() * ph.moods.length)], events);
  }
  function checkPhase(s, events) {
    var ni = phaseIdx(s.boss);
    if (ni > s.boss.phase) {
      s.boss.phase = ni; var ph = PHASES[ni];
      ev(events, 'phase', { phase: ni, name: ph.name });
      if (ph.enterMood && s.boss.mood !== 'charge') { if (ph.enterMood === 'charge') { s.boss.lastChargeTurn = s.turn; } setMood(s, ph.enterMood, events); if (ph.enterMood === 'charge') ev(events, 'warn', {}); }
    }
  }
  function checkEnd(s) { if (s.boss.hp <= 0) return 'win'; if (s.hero.hp <= 0) return 'lose'; return null; }
  /* 1ターンまとめて */
  function runTurn(s, cmd, ITEMS, bossData, rng) {
    var events = [];
    s.heroBuff = s.heroBuffNext; s.heroBuffNext = 1; s.buffs.partyAtk = 1; s.mamaGuard = false;
    resolveCommand(s, cmd, ITEMS, events, rng);
    checkPhase(s, events);
    if (checkEnd(s) === 'win') { ev(events, 'end', { result: 'win' }); return { state: s, events: events }; }
    companionsPhase(s, events, rng);
    checkPhase(s, events);
    if (checkEnd(s) === 'win') { ev(events, 'end', { result: 'win' }); return { state: s, events: events }; }
    var act = chooseBossAction(s, rng); s.lastBossAction = act;
    applyBossAction(s, act, events, rng, bossData);
    s.buffs.partyDef = 1;
    if (checkEnd(s) === 'lose') { ev(events, 'end', { result: 'lose' }); return { state: s, events: events }; }
    tickBoss(s, events, rng);
    s.turn++;
    ev(events, 'turn', { turn: s.turn, mood: s.boss.mood, hint: hintFor(s) });
    return { state: s, events: events };
  }
  function hintFor(s) {
    var m = s.boss.mood, md = MOODS[m] || MOODS.normal, out = { mood: m, emoji: md.emoji, line: md.line, glow: [], tip: null, guardGlow: m === 'charge' };
    if (m === 'charge') { out.tip = HINT2.charge; return out; }
    var best = BEST[m]; if (!best) return out;
    if (s.discovered[m + ':' + best]) out.glow.push(best);
    var hasSupport = s.comps.some(function (c) { return c.alive && c.role === 'support'; });
    if (hasSupport || (s.moodSeen && s.moodSeen[m] >= 2) || s.missedIn === m) out.tip = HINT2[m];
    return out;
  }
  /* 自動対戦(調整用) policy: 'novice'|'normal'|'expert'(コンボに気づく確率 0.35/0.7/1.0) */
  function simulate(itemIds, comps, ITEMS, bossData, skill, n, seed) {
    var wins = 0, turns = 0, rng = makeRng(seed || 1), P = { novice: 0.35, normal: 0.7, expert: 1.0 }[skill] || 0.7;
    var bestItem = itemIds.filter(function (id) { return ITEMS[id] && ITEMS[id].attack && ITEMS[id].attack.type !== 'heal'; }).sort(function (a, b) { return ITEMS[b].attack.power - ITEMS[a].attack.power; })[0];
    var healItem = itemIds.filter(function (id) { return ITEMS[id] && ITEMS[id].attack && ITEMS[id].attack.type === 'heal'; })[0];
    for (var i = 0; i < n; i++) {
      var st = newState(calcHeroStats(itemIds, ITEMS), itemIds, comps, bossData), res = null, used = {};
      while (!res && st.turn < 60) {
        var cmd, m = st.boss.mood;
        if (m === 'charge') cmd = { kind: 'guard' };
        else if (BEST[m] && !used[m] && rng() < P) { used[m] = 1; cmd = { kind: 'waste', id: BEST[m] }; }
        else if (healItem && st.hero.hp < st.hero.maxHp * 0.3) cmd = { kind: 'attack', itemId: healItem };
        else if (!st.hero.mamaUsed && st.hero.hp < st.hero.maxHp * 0.25 && P >= 0.7) cmd = { kind: 'waste', id: 'mama' };
        else cmd = bestItem ? { kind: 'attack', itemId: bestItem } : { kind: 'guard' };
        var out = runTurn(st, cmd, ITEMS, bossData, rng);
        out.events.forEach(function (e) { if (e.type === 'end') res = e.result; });
      }
      if (res === 'win') { wins++; turns += st.turn; }
    }
    return { winRate: wins / n, avgTurns: wins ? turns / wins : 0 };
  }
  return { CONST: CONST, PHASES: PHASES, MOODS: MOODS, EFFECTS: EFFECTS, BEST: BEST, HINT2: HINT2, makeRng: makeRng, calcHeroStats: calcHeroStats, newState: newState, runTurn: runTurn, checkEnd: checkEnd, hintFor: hintFor, simulate: simulate, phaseIdx: phaseIdx };
})();

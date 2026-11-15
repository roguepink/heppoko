'use strict';
/* 着せ替え人形(へっぽこ)・お披露目(showoff)・記念写真の絵。
   座標は docs/design-ui.md 7-2 の表(全身 400px、中心 (195,345))をそのまま使い、
   DOLL.draw が cx, cy, scale で動かす。
   絵文字は、メイン画面では ATL / BIG(アトラス)、保存用 canvas では fillText で描く。
   そのため「描く道具の束 T = { c: 2D context, em: 絵文字を描く関数 }」を全部の描画関数に渡す。 */
var DOLL = (function () {
  var SKIN = '#ffd9b3', SKIN_EDGE = '#e0a97a', INK = '#5a3d2b', EYE = '#3a2418';
  var HAIR = '#6b4226', HAIR_HI = '#8a5a35';                    // 髪(茶色のマッシュルーム)
  var SHIRT = '#ffffff', SHIRT_EDGE = '#d9cdc0', PANTS = '#3f7fd9', PANTS_EDGE = '#2c5fae';   // ふだん着
  var SOCK = '#ffffff', SHOE = '#e63e3e', SHOE_EDGE = '#b02a2a'; // 白い靴下・赤い靴
  var CX = 195, CY = 345;                 // 設計の人形の中心
  var TAU = Math.PI * 2;

  /* 素体の寸法(2.3 頭身: 頭 156px : 体+足 204px)。設計 7-2 の座標系(縦 400px、y=145〜545)に合わせてある */
  var HEAD = { x: 195, y: 248, r: 78 };                       // 頭(丸)。上端 170・あご 326
  var NECK = { x: 195, y: 322 };                              // 首(頭を傾ける原点)
  var BODY = { x: 143, y: 318, w: 104, h: 128, r: 30 };       // 体の角丸(318〜446)
  var SHOULDER = { dx: 50, y: 338 }, ARM_LEN = 66, HAND_R = 15; // 肩の原点と腕の長さ
  var HIP = { dx: 22, y: 440 }, LEG_LEN = 60;                 // 股関節と足の長さ
  var TORSO_C = { x: 195, y: 405 };                           // 「体の外側」を決める中心(武器を手の外側に出すのに使う)

  /* 装備の位置(通常ポーズのとき)。お披露目のフラッシュ・光らせる部位に使う */
  var SLOT_POS = {
    head: [195, 160], face: [195, 254], charm: [195, 376], body: [195, 382], cape: [292, 300],
    waist: [195, 404], rhand: [108, 404], lhand: [282, 404], ring: [268, 418], feet: [195, 508]
  };

  /* ポーズ表。腕・足の角度は「外側(体から離れる向き)に上がる = プラス」で統一(ラジアン。0 = まっすぐ下)。
     body = 腰を軸にした上半身の傾き、head = 首を軸にした頭の傾き、dy = 全体の上下、shadow = 影の横半径
     腕を上げる角度は 2.0 前後まで(それ以上だと、大きな頭に手がかぶる) */
  var POSES = {
    normal: { rArm: 0.25, lArm: 0.25, rLeg: 0.00, lLeg: 0.00, body: 0.00, head: 0.00, dy: 0, face: 'smile', shadow: 90, cape: 0 },
    hero:   { rArm: 2.00, lArm: 0.55, rLeg: 0.15, lLeg: 0.15, body: -0.04, head: -0.08, dy: 0, face: 'brave', shadow: 90, cape: -0.15 },
    peace:  { rArm: 0.25, lArm: 1.95, rLeg: 0.00, lLeg: 0.10, body: 0.00, head: 0.10, dy: 0, face: 'wink', shadow: 90, cape: 0 },
    smug:   { rArm: 0.30, lArm: 0.60, rLeg: 0.00, lLeg: 0.30, body: -0.10, head: -0.15, dy: 0, face: 'doya', shadow: 90, cape: -0.3 },
    jump:   { rArm: 1.90, lArm: 1.90, rLeg: 0.40, lLeg: 0.40, body: 0.00, head: 0.00, dy: -40, face: 'excited', shadow: 50, cape: 0.1 },
    money:  { rArm: 1.95, lArm: 1.95, rLeg: 0.10, lLeg: 0.10, body: -0.05, head: 0.05, dy: -6, face: 'money', shadow: 90, cape: 0 },
    sleep:  { rArm: 0.35, lArm: 0.35, rLeg: 0.05, lLeg: 0.05, body: 0.00, head: 0.10, dy: 0, face: 'sleep', shadow: 150, cape: 0, lie: true }
  };

  /* ---------- 手描きの顔(目・まゆ・口)。expr はポーズごとの表情 ---------- */
  var FACES = { smile: 1, brave: 1, wink: 1, doya: 1, excited: 1, money: 1, sleep: 1 };
  function drawFace(c, hx, hy, expr, t) {
    var L = hx - 26, Rx = hx + 26, ey = hy + 8;
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = EYE; c.fillStyle = EYE;
    function oval(x) {   // 黒い楕円の目 + 白い光の点
      c.fillStyle = EYE; c.beginPath(); c.ellipse(x, ey, 9, 12.5, 0, 0, TAU); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(x - 3, ey - 5, 3.6, 0, TAU); c.fill();
      c.beginPath(); c.arc(x + 3.5, ey + 4.5, 1.6, 0, TAU); c.fill();
    }
    function happy(x) { c.lineWidth = 5; c.beginPath(); c.arc(x, ey + 6, 10, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }   // ^ の目
    function line(x) { c.lineWidth = 5; c.beginPath(); c.moveTo(x - 10, ey + 2); c.quadraticCurveTo(x, ey + 7, x + 10, ey + 2); c.stroke(); }   // ー の目(ねむい)
    function arrow(x, sd) { c.lineWidth = 5; c.beginPath(); c.moveTo(x - 8 * sd, ey - 8); c.lineTo(x + 7 * sd, ey); c.lineTo(x - 8 * sd, ey + 8); c.stroke(); }   // > < の目
    function coin(x) {   // お金の目(金色の G)
      c.fillStyle = '#ffd84d'; c.strokeStyle = '#d9a400'; c.lineWidth = 3; c.beginPath(); c.arc(x, ey, 13, 0, TAU); c.fill(); c.stroke();
      c.fillStyle = EYE; c.font = '900 17px ' + TEXT_FONT; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('G', x, ey + 1);
      c.fillStyle = '#fff'; c.beginPath(); c.arc(x - 6, ey - 6, 2.6, 0, TAU); c.fill(); c.strokeStyle = EYE;
    }
    function brows(lift, tilt) {   // 短いまゆ。lift = 上げる量、tilt = 内側を下げる量(きりっ)
      c.lineWidth = 4.5; c.strokeStyle = EYE;
      c.beginPath(); c.moveTo(L - 9, ey - 21 - lift); c.lineTo(L + 8, ey - 21 - lift + tilt); c.stroke();
      c.beginPath(); c.moveTo(Rx + 9, ey - 21 - lift); c.lineTo(Rx - 8, ey - 21 - lift + tilt); c.stroke();
    }
    function smileMouth(w) { c.lineWidth = 4.5; c.strokeStyle = EYE; c.beginPath(); c.arc(hx, hy + 22, w, Math.PI * 0.2, Math.PI * 0.8); c.stroke(); }
    function openMouth(w, h) {   // 大きく開いた口 + 舌
      var my = hy + 28;
      c.beginPath(); c.moveTo(hx - w, my); c.quadraticCurveTo(hx, my - 3, hx + w, my); c.quadraticCurveTo(hx + w * 0.9, my + h * 1.6, hx, my + h * 1.6); c.quadraticCurveTo(hx - w * 0.9, my + h * 1.6, hx - w, my); c.closePath();
      c.fillStyle = '#8a3a2a'; c.fill();
      c.save(); c.clip(); c.fillStyle = '#ff8fa3'; c.beginPath(); c.ellipse(hx, my + h * 1.55, w * 0.6, h * 0.6, 0, 0, TAU); c.fill(); c.restore();
      c.lineWidth = 3.5; c.strokeStyle = EYE; c.stroke();
    }
    if (expr === 'brave') { oval(L); oval(Rx); brows(0, 6); openMouth(11, 7); }
    else if (expr === 'wink') { oval(L); happy(Rx); brows(3, -2); openMouth(12, 8); }
    else if (expr === 'doya') { happy(L); happy(Rx); brows(7, -3); openMouth(17, 11); }
    else if (expr === 'excited') { arrow(L, 1); arrow(Rx, -1); brows(6, -2); openMouth(15, 11); }
    else if (expr === 'money') { coin(L); coin(Rx); brows(6, -3); openMouth(16, 11); }
    else if (expr === 'sleep') { line(L); line(Rx); c.lineWidth = 3.5; c.beginPath(); c.ellipse(hx, hy + 32, 5, 6, 0, 0, TAU); c.stroke(); }
    else { oval(L); oval(Rx); brows(0, 0); smileMouth(11); }
    c.restore();
  }
  /* お金持ちの子の しるし: 金の蝶ネクタイ(装備がなくても いつも見える) */
  function bowTie(c) {
    c.save(); c.lineJoin = 'round'; c.fillStyle = '#ffd84d'; c.strokeStyle = INK; c.lineWidth = 3;
    c.beginPath(); c.moveTo(195, 334); c.lineTo(173, 322); c.quadraticCurveTo(168, 334, 173, 346); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(195, 334); c.lineTo(217, 322); c.quadraticCurveTo(222, 334, 217, 346); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#d9a400'; c.beginPath(); c.arc(195, 334, 6.5, 0, TAU); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.ellipse(179, 328, 4, 2, -0.4, 0, TAU); c.fill(); c.beginPath(); c.ellipse(211, 328, 4, 2, 0.4, 0, TAU); c.fill();
    c.restore();
  }

  /* ---------- 描く道具の束 ---------- */
  function emojiMain(e, x, y, s, a) { if (!e) return; if (s > 100) BIG.draw(e, x, y, s, a); else ATL.draw(e, x, y, s, a); }
  function mainTools() { return { c: ctx, em: emojiMain }; }
  function rawTools(c) {
    return { c: c, em: function (e, x, y, s, a) {
      if (!e) return;
      c.save(); if (a !== undefined) c.globalAlpha = a;
      c.fillStyle = '#000';   // 直前の fillStyle(半透明の影など)を引きずると絵文字まで薄くなる
      c.font = s + 'px ' + EMOJI_FONT; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(e, x, y + s * 0.04); c.restore();
    } };
  }
  /* どの ctx にも描ける角丸と文字(engine.js の rrect / txt と同じ見た目) */
  function RR(c, x, y, w, h, r, fill, stroke, lw) {
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
    if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.lineWidth = lw || 3; c.strokeStyle = stroke; c.stroke(); }
  }
  function TX(c, s, x, y, size, color, align, weight, stroke) {
    c.font = (weight || 900) + ' ' + size + 'px ' + TEXT_FONT; c.textAlign = align || 'center'; c.textBaseline = 'middle';
    if (stroke !== null) { c.lineJoin = 'round'; c.lineWidth = Math.max(3, size / 5); c.strokeStyle = stroke || INK; c.strokeText(s, x, y); }
    c.fillStyle = color || '#fff'; c.fillText(s, x, y);
  }
  function easeOutBack(x) { var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); }
  function easeOut(x) { return 1 - Math.pow(1 - x, 3); }
  function cl(v, a, b) { return v < a ? a : v > b ? b : v; }
  function mixColor(a, b, k) { // '#rrggbb' 2 色を k で混ぜる
    var pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16), r = [], i, s;
    for (i = 16; i >= 0; i -= 8) { s = Math.round(((pa >> i) & 255) * (1 - k) + ((pb >> i) & 255) * k); r.push(s); }
    return 'rgb(' + r.join(',') + ')';
  }

  /* ---------- 装備の取り出し ---------- */
  function curEquip(opts) {
    if (opts && opts.equip) return opts.equip;
    if (typeof P !== 'undefined' && P && P.equip) return P.equip;
    return {};
  }
  function itemOf(id) {
    if (!id) return null;
    if (typeof ITEMS !== 'undefined' && ITEMS && ITEMS[id]) return ITEMS[id];
    var list = window.DATA && window.DATA.ITEMS;
    if (list) for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function look(eq, slot) { var it = itemOf(eq[slot]); if (!it) return null; return (it.look && it.look.emoji) || it.emoji || null; }

  /* 8 本の光線の星形フラッシュ(白) */
  function star(c, x, y, len, width, alpha) {
    if (len <= 0) return;
    c.save(); c.translate(x, y); c.globalAlpha = alpha === undefined ? 1 : alpha; c.fillStyle = '#fff';
    for (var i = 0; i < 8; i++) {
      c.rotate(Math.PI / 4);
      c.beginPath(); c.moveTo(0, -width / 2); c.lineTo(len, 0); c.lineTo(0, width / 2); c.closePath(); c.fill();
    }
    c.restore();
  }

  /* 体の角丸のパス(体の装備をクリップする・体を塗るのに共通で使う) */
  function bodyPath(c) {
    var b = BODY, x = b.x, y = b.y, w = b.w, h = b.h, r = b.r;
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }

  /* 頭の土台(耳・顔の丸・髪・ほっぺ)。人形と、会話の窓の小さな顔(DOLL.faceCanvas)で共通に使う */
  function drawHeadBase(c) {
    var hx = HEAD.x, hy = HEAD.y, hr = HEAD.r, i;
    c.fillStyle = SKIN; c.lineWidth = 3; c.strokeStyle = SKIN_EDGE;
    c.beginPath(); c.arc(hx - hr + 2, hy + 10, 13, 0, TAU); c.fill(); c.stroke();   // 耳
    c.beginPath(); c.arc(hx + hr - 2, hy + 10, 13, 0, TAU); c.fill(); c.stroke();
    c.beginPath(); c.arc(hx, hy, hr, 0, TAU); c.fill(); c.stroke();                 // 顔の丸
    /* 髪: 頭より少し大きい丸の上半分 + 前髪のギザギザ + 横の毛(マッシュルーム) */
    c.save();
    c.beginPath(); c.arc(hx, hy + 2, hr + 5, 0, TAU); c.clip();
    c.fillStyle = HAIR;
    c.fillRect(hx - hr - 6, hy - hr - 6, (hr + 6) * 2, hr - 28);               // 上のかたまり(下端 y=hy-34。目にかぶらない高さ)
    var bx = [-56, -28, 0, 28, 56];
    for (i = 0; i < bx.length; i++) { c.beginPath(); c.arc(hx + bx[i], hy - 35, 16, 0, Math.PI); c.fill(); }   // 前髪の丸いギザギザ
    RR(c, hx - hr - 6, hy - 40, 20, 54, 9, HAIR); RR(c, hx + hr - 14, hy - 40, 20, 54, 9, HAIR);            // 横の毛(耳にかかる)
    c.fillStyle = HAIR_HI; c.beginPath(); c.ellipse(hx - 24, hy - 60, 20, 6, -0.3, 0, TAU); c.fill();     // つや
    c.restore();
    /* ほっぺ(ピンクの丸) → 手描きの顔。知らない表情名(絵文字)が来たら 前と同じく絵文字を貼る */
    c.fillStyle = 'rgba(255,143,200,.55)';
    c.beginPath(); c.arc(hx - 50, hy + 24, 12, 0, TAU); c.fill();
    c.beginPath(); c.arc(hx + 50, hy + 24, 12, 0, TAU); c.fill();
  }

  /* =====================================================================
     着せ替え: 装備を「体の一部」として図形で描く。
     101 品を 1 つずつ描くのでなく、部位ごとの「型」(t)を対応表 STYLE で選び、色は look.color で塗る。
     data.js の look.kind があれば そちらを優先(あとから型を足せるように)。表にない品は 絵文字で添える。
     名前で特徴が分かる品(ねふだ・保証書・ブランドの もよう など)は、型の中で 品ごとの しるしを 描き足す。
     LO = 細かさ。0 = 全部描く / 1 = 細い線・字を省く(戦闘の小さい人形) / 2 = 形だけ(町の 0.12 倍)
     ===================================================================== */
  var LO = 0;
  var STYLE = {
    /* からだ */
    cloth_armor: { t: 'shirt', col: '#ff8fc8' }, bubble_wrap: { t: 'bubble' }, apron: { t: 'apron' }, cardboard_robot: { t: 'box' },
    pajamas: { t: 'pajama' }, school_uniform: { t: 'jersey' }, rice_cooker: { t: 'cooker' }, kotatsu: { t: 'kotatsu' },
    fur_coat: { t: 'robe', fluffy: 1 }, mithril_armor: { t: 'armor' },
    /* あたま */
    party_hat: { t: 'cone' }, leather_cap: { t: 'cap' }, bucket: { t: 'bucket' }, rice_bowl: { t: 'bowl' }, octopus_hat: { t: 'octo' },
    pudding_hat: { t: 'pudding' }, neko_ears: { t: 'ears' }, bike_helmet: { t: 'helmet' }, steel_helm: { t: 'kabuto' },
    fake_crown: { t: 'crown' }, alien_antenna: { t: 'antenna' },
    /* かお */
    red_nose: { t: 'nose' }, glasses_3d: { t: 'g3d' }, mosquito_net: { t: 'net' }, fake_glasses: { t: 'groucho' }, face_pack: { t: 'pack' },
    snorkel: { t: 'snorkel' }, eye_patch: { t: 'patch' }, sunglasses: { t: 'shades' }, hero_mask: { t: 'mask' }, granny_dentures: { t: 'teeth' },
    /* マント(ふろしきは data.js の色=赤 で塗る) */
    towel: { t: 'towel' }, ghost_sheet: { t: 'sheet' }, raincoat: { t: 'rain' }, furoshiki_cape: { t: 'karakusa' },
    curtain: { t: 'curtain' }, futon: { t: 'futon' }, fake_wings: { t: 'wings' }, hero_cape: { t: 'hero' }, solar_panel: { t: 'panel' },
    /* こし */
    rope: { t: 'jumprope' }, leather_belt: { t: 'belt' }, inner_tube: { t: 'tube' }, fanny_pack: { t: 'pouch' },
    fake_snake: { t: 'snake' }, tool_belt: { t: 'tools' }, sumo_mawashi: { t: 'mawashi' }, obi: { t: 'obi' }, champion_belt: { t: 'champ' },
    /* あし */
    slippers: { t: 'slipper' }, leather_boots: { t: 'shoe' }, geta: { t: 'geta' }, rain_boots: { t: 'boot' }, stilts: { t: 'stilts' },
    swim_fins: { t: 'fins' }, light_sneakers: { t: 'sneaker' }, roller_skates: { t: 'skate' }, spring_shoes: { t: 'spring' }, iron_boots: { t: 'boot', metal: 1 },
    /* みぎて(どれも 手で にぎる。型は WEAP の表) */
    wooden_stick: { t: 'stick' }, oden_skewer: { t: 'oden' }, leek: { t: 'leek' }, rubber_duck: { t: 'duck' }, frying_pan: { t: 'pan' },
    wet_umbrella: { t: 'umbrella' }, magic_wand: { t: 'wand' }, steel_sword: { t: 'sword' }, smartphone: { t: 'phone' },
    bundle_of_bills: { t: 'bills' }, legend_sword: { t: 'sword', legend: 1 },
    /* ひだりて(盾は 腕に ベルトで つける。それ以外は にぎる・ぶらさげる) */
    cardboard_shield: { t: 'cardboard' }, pot_lid: { t: 'lid' }, pizza_box: { t: 'pizza' }, wooden_shield: { t: 'woodshield' },
    randoseru: { t: 'randoseru' }, manhole: { t: 'manhole' }, hero_shield: { t: 'heroshield' },
    homework: { t: 'homework' }, plushie: { t: 'plush' }, mama_bento: { t: 'bento' },
    /* ゆびわ */
    rubber_band: { t: 'band' }, washer: { t: 'washer' }, toy_ring: { t: 'ring', toy: 1 }, onion_ring: { t: 'bracelet' }, donut: { t: 'bracelet' },
    key_ring: { t: 'dangle' }, mood_ring: { t: 'ring', mood: 1 }, smartwatch: { t: 'watch' }, power_ring: { t: 'ring', glow: 1 }, diamond_ring: { t: 'ring', glow: 1, big: 1 },
    /* おまもり(首から下げる) */
    receipt: { t: 'receipt' }, omamori: { t: 'omamori' }, bell: { t: 'bell' }, wrinkled_bill: { t: 'bill' }, four_leaf: { t: 'clover' },
    dumbbell: { t: 'dumbbell' }, daruma: { t: 'daruma' }, magic_stone: { t: 'stone' }, gold_poop: { t: 'poop' }
  };
  var SHIELDS = { cardboard: 1, lid: 1, pizza: 1, woodshield: 1, randoseru: 1, manhole: 1, heroshield: 1 };
  var SHIELD_W = { cardboard: 34, lid: 39, pizza: 37, woodshield: 34, randoseru: 34, manhole: 42, heroshield: 40 };
  /* 手に持つ物の型。tilt = 腕に合わせて 外へ傾ける割合(1 = ふつう、小さいほど まっすぐ立てる)。
     two = 左手が空いていれば 両手で持つ大きい武器 / hang = にぎった所から 下に ぶらさげる */
  var WEAP = {
    sword: {}, dagger: {}, spear: {}, axe: {}, hammer: { two: 1 }, bat: { two: 1 }, wand: {}, rod: {}, bow: { tilt: 0.35 }, whip: {}, harisen: {},
    pan: {}, broom: {}, stick: {}, oden: {}, leek: {}, umbrella: {}, phone: { tilt: 0.35 }, bills: { tilt: 0.45 }, duck: { tilt: 0.3 },
    homework: { tilt: 0.25 }, plush: { tilt: 0.2 }, bento: { hang: 1 }, emoji: { tilt: 0.45 }
  };
  function hex6(v) { return (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v)) ? v : null; }
  function styleOf(eq, slot) {
    var it = itemOf(eq[slot]); if (!it) return null;
    var lk = it.look || {}, s = STYLE[it.id] || {}, o = {}, k;
    for (k in s) o[k] = s[k];
    if (lk.kind) o.t = lk.kind;
    o.col = hex6(s.col) || hex6(lk.color) || '#cccccc';
    o.em = lk.emoji || it.emoji || ''; o.price = it.price || 0; o.id = it.id;
    return o;
  }

  /* 小さな道具 */
  function dk(col, k) { return mixColor(col, '#000000', k === undefined ? 0.22 : k); }
  function lt(col, k) { return mixColor(col, '#ffffff', k === undefined ? 0.45 : k); }
  function ink(c, lw) { c.lineJoin = 'round'; c.lineCap = 'round'; c.lineWidth = lw || 3; c.strokeStyle = INK; c.stroke(); }
  function fillInk(c, col, lw) { c.fillStyle = col; c.fill(); ink(c, lw); }
  function circ(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, TAU); }
  function ell(c, x, y, rx, ry, rot) { c.beginPath(); c.ellipse(x, y, rx, ry, rot || 0, 0, TAU); }
  function rrPath(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function starPath(c, x, y, R, r, n) {
    c.beginPath();
    for (var i = 0; i < n * 2; i++) { var a = -Math.PI / 2 + i * Math.PI / n, d = i % 2 ? r : R; if (i) c.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d); else c.moveTo(x + Math.cos(a) * d, y + Math.sin(a) * d); }
    c.closePath();
  }
  function heart(c, x, y, r, col) {
    c.beginPath(); c.moveTo(x, y + r); c.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.6, y - r * 1.4, x, y - r * 0.4);
    c.bezierCurveTo(x + r * 0.6, y - r * 1.4, x + r * 1.6, y - r * 0.2, x, y + r); c.closePath(); c.fillStyle = col; c.fill();
  }
  function shine(c, x, y, rx, ry, rot, a) { if (LO === 2) return; ell(c, x, y, rx, ry, rot); c.fillStyle = 'rgba(255,255,255,' + (a || 0.6) + ')'; c.fill(); }
  /* 手間をかけた絵の しあげ: ぬい目・下の陰・小さな光・びょう・しわ・値札 */
  function stitch(c, col, lw) { if (LO) return; c.save(); c.setLineDash([4, 3.5]); c.lineCap = 'butt'; c.lineWidth = lw || 1.6; c.strokeStyle = col || 'rgba(255,255,255,.8)'; c.stroke(); c.restore(); }
  function shadeIn(c, pathFn, y0, y1, a) {
    if (LO === 2) return;
    c.save(); pathFn(); c.clip();
    var g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, 'rgba(70,35,15,0)'); g.addColorStop(1, 'rgba(70,35,15,' + (a || 0.18) + ')');
    c.fillStyle = g; c.fillRect(0, y0, 400, y1 - y0); c.restore();
  }
  function hiDot(c, x, y, r, a) { if (LO === 2) return; circ(c, x, y, r); c.fillStyle = 'rgba(255,255,255,' + (a || 0.9) + ')'; c.fill(); }
  function rivet(c, x, y, r, col) {
    if (LO === 2) return;
    circ(c, x, y, r || 2.6); c.fillStyle = col || '#ffe58a'; c.fill(); if (LO) return;
    c.lineWidth = 1.2; c.strokeStyle = INK; c.stroke(); hiDot(c, x - 0.8, y - 0.8, (r || 2.6) * 0.35);
  }
  function wrinkle(c, x0, y0, cx, cy, x1, y1, a) {
    if (LO) return; c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(cx, cy, x1, y1); c.lineCap = 'round'; c.lineWidth = 1.8; c.strokeStyle = 'rgba(90,61,43,' + (a || 0.35) + ')'; c.stroke();
  }
  function tag(c, x, y, rot, label, col, w) {   // ひもで ぶらさがった 値札・ねふだ(原点 = ひもの上の はし)
    if (LO === 2) return;
    w = w || 38;
    c.save(); c.translate(x, y); c.rotate(rot || 0);
    c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 9); c.lineWidth = 1.4; c.strokeStyle = INK; c.stroke();
    c.beginPath(); c.moveTo(-w / 2 + 6, 9); c.lineTo(w / 2, 9); c.lineTo(w / 2, 25); c.lineTo(-w / 2 + 6, 25); c.lineTo(-w / 2, 17); c.closePath(); fillInk(c, '#fff', 1.6);
    if (!LO) { circ(c, -w / 2 + 5, 17, 1.7); c.fillStyle = INK; c.fill(); TX(c, label, 3, 17.5, 9, col || '#e63e3e', 'center', 900, null); }
    c.restore();
  }

  /* ---------- からだ(服) ---------- */
  function plainClothes(c, shirt, pants, edge, pantsTop) {
    bodyPath(c); c.fillStyle = shirt; c.fill();
    c.save(); bodyPath(c); c.clip();
    c.fillStyle = pants; c.fillRect(BODY.x, pantsTop, BODY.w, 60);
    c.strokeStyle = PANTS_EDGE; c.lineWidth = 2; c.beginPath(); c.moveTo(195, pantsTop + 6); c.lineTo(195, 446); c.stroke();
    c.beginPath(); c.moveTo(BODY.x, pantsTop); c.lineTo(BODY.x + BODY.w, pantsTop); c.stroke();
    if (!LO) {
      c.beginPath(); c.moveTo(BODY.x, pantsTop + 5); c.lineTo(BODY.x + BODY.w, pantsTop + 5); stitch(c, 'rgba(255,255,255,.6)', 1.4);   // ズボンの ぬい目
      c.beginPath(); c.moveTo(162, pantsTop + 6); c.quadraticCurveTo(165, pantsTop + 18, 150, pantsTop + 22); c.moveTo(228, pantsTop + 6); c.quadraticCurveTo(225, pantsTop + 18, 240, pantsTop + 22);
      c.lineWidth = 1.8; c.strokeStyle = PANTS_EDGE; c.stroke();   // ポケット
    }
    c.restore();
    shadeIn(c, function () { bodyPath(c); }, 356, 446, 0.13);
    wrinkle(c, 158, 370, 165, 380, 160, 390); wrinkle(c, 232, 366, 225, 377, 231, 388);
    bodyPath(c); c.lineWidth = 2.5; c.strokeStyle = edge; c.stroke();
  }
  function drawBodyWear(c, T, s, t) {
    var i, j, x, y;
    if (!s) {   // 服なし: 白い半そでシャツ + 青い半ズボン
      plainClothes(c, SHIRT, PANTS, SHIRT_EDGE, 398);
      c.strokeStyle = SHIRT_EDGE; c.lineWidth = 2; c.beginPath(); c.moveTo(183, 320); c.lineTo(195, 334); c.lineTo(207, 320); c.stroke();   // えり
      return;
    }
    var k = s.t, col = s.col, bp = function () { bodyPath(c); };
    if (k === 'shirt') {          // ブランドの ポロシャツ: 全面に ブランドの もよう + 金の紋章 + そでに 値札
      bodyPath(c); c.fillStyle = col; c.fill();
      c.save(); bodyPath(c); c.clip();
      if (!LO) {
        c.fillStyle = 'rgba(255,255,255,.4)'; c.font = '900 10px ' + TEXT_FONT; c.textAlign = 'center'; c.textBaseline = 'middle';
        for (j = 0; j < 5; j++) for (i = 0; i < 6; i++) c.fillText(j % 2 ? '♥' : 'B', 148 + i * 19 + (j % 2) * 9, 326 + j * 16);
      }
      c.fillStyle = dk(col, 0.1); c.fillRect(230, 318, 20, 90);
      c.fillStyle = PANTS; c.fillRect(BODY.x, 404, BODY.w, 60);
      c.fillStyle = PANTS_EDGE; c.fillRect(194, 410, 2, 40);
      c.beginPath(); c.moveTo(BODY.x, 399); c.lineTo(BODY.x + BODY.w, 399); stitch(c, 'rgba(255,255,255,.9)');
      c.beginPath(); c.moveTo(BODY.x, 409); c.lineTo(BODY.x + BODY.w, 409); stitch(c, 'rgba(255,255,255,.5)', 1.3);
      c.restore();
      shadeIn(c, bp, 356, 446, 0.14);
      bodyPath(c); ink(c, 3);
      c.beginPath(); c.moveTo(BODY.x, 404); c.lineTo(BODY.x + BODY.w, 404); ink(c, 2.5);
      wrinkle(c, 164, 390, 172, 398, 168, 403, 0.4); wrinkle(c, 222, 390, 216, 398, 221, 403, 0.4);
      c.beginPath(); c.moveTo(195, 330); c.lineTo(166, 319); c.lineTo(175, 348); c.closePath(); fillInk(c, '#fff', 2.5);
      c.beginPath(); c.moveTo(195, 330); c.lineTo(224, 319); c.lineTo(215, 348); c.closePath(); fillInk(c, '#fff', 2.5);
      if (!LO) { c.beginPath(); c.moveTo(171, 323); c.lineTo(177, 341); c.moveTo(219, 323); c.lineTo(213, 341); stitch(c, 'rgba(90,61,43,.4)', 1.2); }
      RR(c, 189, 344, 12, 40, 4, dk(col, 0.08), dk(col, 0.3), 2);   // 前立て
      for (i = 0; i < 2; i++) { circ(c, 195, 356 + i * 15, 3.4); fillInk(c, '#fff', 1.5); if (!LO) { c.fillStyle = INK; circ(c, 194, 356 + i * 15, 0.7); c.fill(); circ(c, 196, 356 + i * 15, 0.7); c.fill(); } }
      circ(c, 226, 366, 12); fillInk(c, '#ffd84d', 2.5); circ(c, 226, 366, 8.5); c.lineWidth = 1.5; c.strokeStyle = '#d9a400'; c.stroke();
      TX(c, 'B', 226, 367, 12, INK, 'center', 900, null); hiDot(c, 221, 361, 2.2);
      if (!LO) { starPath(c, 216, 354, 3.5, 1.5, 5); c.fillStyle = '#fff'; c.fill(); }
    } else if (k === 'jersey') {  // 体操服: 白地 + 紺の短パン + 名前の ぬいとり
      bodyPath(c); c.fillStyle = '#fff'; c.fill();
      c.save(); bodyPath(c); c.clip();
      c.fillStyle = 'rgba(0,0,0,.05)'; c.fillRect(232, 318, 20, 90);
      c.fillStyle = '#2c3e78'; c.fillRect(BODY.x, 408, BODY.w, 60);
      c.fillStyle = '#fff'; c.fillRect(BODY.x + 6, 412, 4, 40); c.fillRect(BODY.x + BODY.w - 10, 412, 4, 40);
      c.beginPath(); c.moveTo(BODY.x, 413); c.lineTo(BODY.x + BODY.w, 413); stitch(c, 'rgba(255,255,255,.55)', 1.3);
      c.restore();
      shadeIn(c, bp, 356, 446, 0.12);
      bodyPath(c); ink(c, 3); c.beginPath(); c.moveTo(BODY.x, 408); c.lineTo(BODY.x + BODY.w, 408); ink(c, 2.5);
      c.beginPath(); c.arc(195, 318, 25, 0.12 * Math.PI, 0.88 * Math.PI); c.lineWidth = 9; c.strokeStyle = INK; c.stroke(); c.lineWidth = 6; c.strokeStyle = '#e63e3e'; c.stroke();
      wrinkle(c, 168, 392, 176, 400, 170, 405, 0.3); wrinkle(c, 226, 392, 218, 400, 224, 405, 0.3);
      RR(c, 150, 352, 50, 26, 4, '#fff', INK, 2);
      if (!LO) { c.save(); c.setLineDash([3, 3]); RR(c, 153.5, 355.5, 43, 19, 3, null, '#e63e3e', 1.5); c.restore(); TX(c, 'へっぽこ', 175, 365.5, 10, INK, 'center', 900, null); }
      circ(c, 226, 362, 7); fillInk(c, '#2c3e78', 2); if (!LO) TX(c, '1', 226, 362.5, 8, '#fff', 'center', 900, null);   // 学年の バッジ
    } else if (k === 'apron') {   // ふだん着 + おかあさんの エプロン(フリル・ハートのポケット・ママの ししゅう)
      plainClothes(c, SHIRT, PANTS, SHIRT_EDGE, 398);
      for (i = 0; i < 7; i++) { circ(c, 152 + i * 14.3, 458, 8); fillInk(c, '#fff', 2); }
      var apr = function () { c.beginPath(); c.moveTo(172, 344); c.lineTo(218, 344); c.lineTo(221, 396); c.quadraticCurveTo(240, 398, 242, 458); c.lineTo(148, 458); c.quadraticCurveTo(150, 398, 169, 396); c.closePath(); };
      apr(); fillInk(c, col, 3);
      shadeIn(c, apr, 400, 458, 0.15);
      if (!LO) {
        c.beginPath(); c.moveTo(176, 349); c.lineTo(214, 349); c.lineTo(216, 394); stitch(c, 'rgba(255,255,255,.85)', 1.4);
        c.beginPath(); c.moveTo(176, 349); c.lineTo(174, 394); stitch(c, 'rgba(255,255,255,.85)', 1.4);
        c.beginPath(); c.moveTo(152, 450); c.lineTo(238, 450); stitch(c, 'rgba(255,255,255,.85)', 1.4);
        TX(c, 'ママ', 195, 364, 10, lt(col, 0.85), 'center', 900, null);
        wrinkle(c, 172, 410, 176, 430, 168, 448, 0.3); wrinkle(c, 218, 410, 214, 430, 222, 448, 0.3);
      }
      c.beginPath(); c.moveTo(174, 346); c.lineTo(160, 322); c.moveTo(216, 346); c.lineTo(230, 322); c.lineWidth = 7; c.strokeStyle = INK; c.stroke(); c.lineWidth = 4; c.strokeStyle = col; c.stroke();
      RR(c, 178, 414, 34, 26, 7, lt(col, 0.5), INK, 2.5); heart(c, 195, 426, 6, '#e63e3e'); hiDot(c, 192, 423, 1.5);
      if (!LO) { rrPath(c, 181, 417, 28, 20, 5); stitch(c, dk(col, 0.25), 1.2); }
    } else if (k === 'pajama') {  // パジャマ: 月と星の もよう + まるいえり + ボタン(足も同じ柄。leg で描く)
      bodyPath(c); c.fillStyle = col; c.fill();
      c.save(); bodyPath(c); c.clip();
      for (j = 0; j < 7; j++) for (i = 0; i < 6; i++) {
        x = 146 + i * 22 + (j % 2) * 11; y = 326 + j * 20;
        if (LO) { circ(c, x, y, 3.5); c.fillStyle = 'rgba(255,255,255,.7)'; c.fill(); }
        else if ((i + j) % 2) { starPath(c, x, y, 4.5, 2, 5); c.fillStyle = '#fff6b0'; c.fill(); }
        else { c.beginPath(); c.arc(x, y, 4.5, 0.6, TAU - 0.6); c.arc(x + 2.6, y - 1, 3.6, TAU - 0.9, 0.9, true); c.closePath(); c.fillStyle = 'rgba(255,255,255,.8)'; c.fill(); }
      }
      c.fillStyle = dk(col, 0.12); c.fillRect(BODY.x, 400, BODY.w, 8);
      c.restore();
      shadeIn(c, bp, 356, 446, 0.15);
      bodyPath(c); ink(c, 3);
      ell(c, 180, 331, 17, 10, 0.4); fillInk(c, lt(col, 0.6), 2.5); ell(c, 210, 331, 17, 10, -0.4); fillInk(c, lt(col, 0.6), 2.5);
      if (!LO) { ell(c, 180, 331, 13, 7, 0.4); stitch(c, dk(col, 0.25), 1.2); ell(c, 210, 331, 13, 7, -0.4); stitch(c, dk(col, 0.25), 1.2); }
      for (i = 0; i < 3; i++) { circ(c, 195, 358 + i * 18, 4.2); fillInk(c, '#fff', 2); if (!LO) { c.fillStyle = INK; circ(c, 193.8, 358 + i * 18, 0.8); c.fill(); circ(c, 196.2, 358 + i * 18, 0.8); c.fill(); } }
      RR(c, 212, 352, 24, 20, 5, lt(col, 0.2), dk(col, 0.35), 2); if (!LO) { rrPath(c, 214.5, 354.5, 19, 15, 3); stitch(c, '#fff', 1.1); }
      wrinkle(c, 160, 384, 168, 392, 162, 398, 0.35); wrinkle(c, 230, 380, 222, 390, 228, 398, 0.35);
    } else if (k === 'bubble') {  // プチプチを ぐるぐる巻き(セロハンテープで とめてある)
      var bw = function () { rrPath(c, 134, 312, 122, 144, 40); };
      bw(); c.fillStyle = 'rgba(214,238,250,.96)'; c.fill();
      c.save(); bw(); c.clip();
      for (j = 0; j < 9; j++) for (i = 0; i < 8; i++) {
        x = 140 + i * 16 + (j % 2) * 8; y = 320 + j * 16;
        circ(c, x, y, 6.5); c.fillStyle = 'rgba(255,255,255,.7)'; c.fill(); if (LO === 2) continue;
        c.lineWidth = 1.5; c.strokeStyle = 'rgba(79,168,216,.6)'; c.stroke();
        circ(c, x - 2.2, y - 2.2, 1.8); c.fillStyle = '#fff'; c.fill();
        if ((i * 7 + j * 3) % 11 === 0 && !LO) { c.beginPath(); c.moveTo(x - 4, y + 1); c.lineTo(x - 1, y - 2); c.lineTo(x + 1, y + 2); c.lineTo(x + 4, y - 1); c.lineWidth = 1.4; c.strokeStyle = 'rgba(79,168,216,.9)'; c.stroke(); }   // つぶれた つぶ
      }
      c.save(); c.translate(195, 400); c.rotate(-0.08); RR(c, -70, -11, 140, 22, 2, 'rgba(232,194,122,.95)'); if (!LO) TX(c, 'ワレモノ', 0, 1, 13, '#d03a2a', 'center', 900, null); c.restore();
      c.fillStyle = 'rgba(255,255,255,.45)'; c.fillRect(154, 312, 14, 144);   // セロハンテープ
      c.restore();
      shadeIn(c, bw, 380, 456, 0.12);
      bw(); ink(c, 3);
    } else if (k === 'box') {     // 段ボールロボ(体ごと箱。ガムテープ・天地無用の しるし)
      var bx = function () { rrPath(c, 128, 312, 134, 142, 8); };
      bx(); c.fillStyle = col; c.fill();
      c.save(); bx(); c.clip();
      c.fillStyle = dk(col, 0.12); c.fillRect(240, 312, 24, 142);
      c.fillStyle = 'rgba(245,228,180,.85)'; c.fillRect(186, 312, 18, 142);
      c.restore();
      shadeIn(c, bx, 400, 454, 0.15);
      bx(); ink(c, 3);
      c.beginPath(); c.moveTo(130, 332); c.lineTo(260, 332); c.lineWidth = 2; c.strokeStyle = dk(col, 0.3); c.stroke();
      RR(c, 154, 350, 82, 46, 7, '#7a5a34', INK, 2.5);
      circ(c, 172, 366, 7); fillInk(c, '#e63e3e', 2); circ(c, 194, 366, 7); fillInk(c, '#5fb84e', 2); hiDot(c, 170, 364, 2); hiDot(c, 192, 364, 2);
      RR(c, 208, 358, 20, 16, 3, '#ffd84d', INK, 2);
      for (i = 0; i < 4; i++) { circ(c, 168 + i * 18, 386, 3.5); c.fillStyle = (Math.floor(t * 3) + i) % 4 === 0 ? '#ffd84d' : '#3a2a18'; c.fill(); }
      TX(c, 'ロボ', 195, 436, 18, INK, 'center', 900, null);
      if (!LO) {   // ↑↑ 天地無用 の しるし
        c.strokeStyle = 'rgba(90,61,43,.55)'; c.lineWidth = 2;
        for (i = 0; i < 2; i++) { x = 140 + i * 9; c.beginPath(); c.moveTo(x, 448); c.lineTo(x, 432); c.moveTo(x - 3.5, 436); c.lineTo(x, 431); c.lineTo(x + 3.5, 436); c.stroke(); }
        c.beginPath(); c.moveTo(130, 312); c.lineTo(262, 312); c.stroke();
      }
      c.fillStyle = INK; [[136, 320], [254, 320], [136, 446], [254, 446]].forEach(function (p) { rivet(c, p[0], p[1], 2.6, '#cfd8e0'); });
    } else if (k === 'cooker') {  // 炊飯器(着ぐるみ)。湯気が 上がる
      var ck = function () { rrPath(c, 124, 304, 142, 154, 50); };
      ck(); c.fillStyle = '#f7f7f7'; c.fill();
      c.save(); ck(); c.clip();
      c.fillStyle = '#e4e4e4'; c.fillRect(124, 304, 142, 40);
      c.fillStyle = 'rgba(0,0,0,.07)'; c.fillRect(238, 304, 30, 154);
      c.fillStyle = 'rgba(255,255,255,.95)'; c.fillRect(140, 350, 9, 90);
      c.restore();
      shadeIn(c, ck, 400, 458, 0.13);
      ck(); ink(c, 3);
      c.beginPath(); c.moveTo(128, 344); c.lineTo(262, 344); ink(c, 2);
      RR(c, 236, 316, 18, 10, 4, '#cfcfcf', INK, 2);   // 湯気の 出口
      if (LO < 2) for (i = 0; i < 2; i++) { var sp = (t * 0.7 + i * 0.5) % 1; c.globalAlpha = 1 - sp; circ(c, 245 + Math.sin(sp * 6 + i) * 5, 310 - sp * 40, 5 + sp * 6); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 1.5; c.strokeStyle = 'rgba(90,61,43,.3)'; c.stroke(); c.globalAlpha = 1; }
      RR(c, 156, 362, 78, 52, 10, '#e2e2e2', INK, 2.5);
      RR(c, 165, 369, 60, 19, 4, '#33424d'); if (!LO) TX(c, 'ほかほか', 195, 379, 10, '#7dffb0', 'center', 900, null);
      circ(c, 180, 401, 6.5); fillInk(c, '#ff8a3d', 2); circ(c, 210, 401, 6.5); fillInk(c, '#4fa8d8', 2); hiDot(c, 178, 399, 1.8); hiDot(c, 208, 399, 1.8);
      if (!LO) { TX(c, 'たく', 180, 412, 7, INK, 'center', 900, null); TX(c, 'とり消', 210, 412, 7, INK, 'center', 900, null); }
    } else if (k === 'kotatsu') { // こたつごと 着る
      plainClothes(c, SHIRT, PANTS, SHIRT_EDGE, 398);
      c.strokeStyle = SHIRT_EDGE; c.lineWidth = 2; c.beginPath(); c.moveTo(183, 320); c.lineTo(195, 334); c.lineTo(207, 320); c.stroke();
      var kt = function () {
        c.beginPath(); c.moveTo(108, 400); c.lineTo(282, 400); c.lineTo(288, 474);
        for (i = 0; i < 6; i++) { x = 288 - i * 31; c.quadraticCurveTo(x - 15.5, 490, x - 31, 474); }
        c.closePath();
      };
      kt(); c.fillStyle = col; c.fill();
      c.save(); kt(); c.clip(); c.strokeStyle = lt(col, 0.35); c.lineWidth = 3;
      for (x = 112; x < 290; x += 26) { c.beginPath(); c.moveTo(x, 400); c.lineTo(x, 492); c.stroke(); }
      c.beginPath(); c.moveTo(100, 436); c.lineTo(290, 436); c.stroke();
      if (!LO) { c.fillStyle = 'rgba(255,255,255,.5)'; for (x = 125; x < 290; x += 26) for (y = 418; y < 480; y += 36) { c.beginPath(); c.moveTo(x, y - 5); c.lineTo(x + 5, y); c.lineTo(x, y + 5); c.lineTo(x - 5, y); c.closePath(); c.fill(); } }   // ひしがたの 花もよう
      c.restore();
      shadeIn(c, kt, 430, 492, 0.2);
      kt(); ink(c, 3);
      RR(c, 90, 388, 210, 16, 5, '#c8915a', INK, 3); RR(c, 95, 390.5, 200, 4, 2, '#e8b884');
      if (!LO) { c.beginPath(); c.moveTo(110, 398); c.quadraticCurveTo(150, 395, 190, 399); c.moveTo(210, 397); c.quadraticCurveTo(250, 400, 285, 396); c.lineWidth = 1.2; c.strokeStyle = 'rgba(90,61,43,.45)'; c.stroke(); }   // 木目
      circ(c, 268, 376, 11); fillInk(c, '#ffa531', 2.5); ell(c, 270, 365, 5, 3, -0.5); c.fillStyle = '#5fb84e'; c.fill(); hiDot(c, 264, 372, 2.4);
      if (!LO) { circ(c, 248, 380, 8); fillInk(c, '#ffa531', 2); hiDot(c, 245, 377, 1.8); }
    } else if (k === 'robe') {    // すその長い コート / ローブ(すそに もよう、金のボタン、ポケット)
      var robe = function () { c.beginPath(); c.moveTo(152, 320); c.lineTo(238, 320); c.quadraticCurveTo(252, 340, 251, 400); c.lineTo(270, 494); c.quadraticCurveTo(195, 502, 120, 494); c.lineTo(139, 400); c.quadraticCurveTo(138, 340, 152, 320); c.closePath(); };
      robe(); c.fillStyle = col; c.fill();
      c.save(); robe(); c.clip(); c.fillStyle = dk(col, 0.12); c.fillRect(226, 318, 60, 190);
      /* すその もよう帯(金の ひし形) */
      c.fillStyle = dk(col, 0.28); c.fillRect(100, 468, 200, 20);
      c.fillStyle = '#ffd84d'; for (x = 118; x < 280; x += 16) { c.beginPath(); c.moveTo(x, 471); c.lineTo(x + 6, 478); c.lineTo(x, 485); c.lineTo(x - 6, 478); c.closePath(); c.fill(); }
      if (!LO) { c.beginPath(); c.moveTo(100, 466); c.lineTo(300, 466); c.moveTo(100, 489); c.lineTo(300, 489); stitch(c, '#ffd84d', 1.4); }
      c.restore();
      shadeIn(c, robe, 410, 500, 0.18);
      robe(); ink(c, 3);
      c.beginPath(); c.moveTo(195, 338); c.lineTo(195, 496); c.lineWidth = 2.5; c.strokeStyle = dk(col, 0.35); c.stroke();
      wrinkle(c, 160, 420, 156, 450, 150, 480, 0.3); wrinkle(c, 232, 420, 236, 450, 242, 480, 0.3);
      RR(c, 152, 420, 28, 20, 4, dk(col, 0.06), dk(col, 0.35), 2); RR(c, 210, 420, 28, 20, 4, dk(col, 0.06), dk(col, 0.35), 2);   // ポケット
      if (!LO) { rrPath(c, 154.5, 422.5, 23, 15, 3); stitch(c, lt(col, 0.6), 1.1); rrPath(c, 212.5, 422.5, 23, 15, 3); stitch(c, lt(col, 0.6), 1.1); }
      if (s.fluffy) {
        var fl = function (fx, fy, r) { circ(c, fx, fy, r); c.fillStyle = '#fffaf0'; c.fill(); if (LO === 2) return; c.lineWidth = 1.8; c.strokeStyle = 'rgba(90,61,43,.55)'; c.stroke(); if (!LO) hiDot(c, fx - r * 0.35, fy - r * 0.35, r * 0.25, 0.9); };
        for (i = 0; i < 11; i++) fl(124 + i * 14.6, 495, 9);
        for (y = 344; y < 490; y += 14) fl(195, y, 8);
        [[158, 326], [170, 336], [182, 342], [208, 342], [220, 336], [232, 326]].forEach(function (p) { fl(p[0], p[1], 9); });
        for (i = 0; i < 3; i++) { circ(c, 210, 362 + i * 26, 5); fillInk(c, '#ffd84d', 2); hiDot(c, 208.5, 360.5 + i * 26, 1.5); }   // 金のボタン
        if (!LO) { starPath(c, 168, 356, 7, 3, 5); fillInk(c, '#ffd84d', 1.5); circ(c, 168, 356, 2); c.fillStyle = '#e63e3e'; c.fill(); }   // ブローチ
      } else {
        c.beginPath(); c.moveTo(122, 490); c.quadraticCurveTo(195, 498, 268, 490); c.lineWidth = 7; c.strokeStyle = '#ffd84d'; c.stroke();
      }
    } else if (k === 'armor') {   // よろい: 胸板の金ぶち・おなかの板の重なり・びょう・宝石(肩当ては 腕で描く)
      for (i = 0; i < 3; i++) {   // 草ずり(腰の板)
        x = 150 + i * 31; y = 432 + (i === 1 ? 6 : 0);
        RR(c, x, y, 28, 30, 7, dk(col, 0.08), INK, 2.5);
        if (LO < 2) { RR(c, x + 3, y + 3, 22, 24, 5, null, '#e8b923', 1.8); rivet(c, x + 14, y + 9, 2.2); }
      }
      bodyPath(c); var g = c.createLinearGradient(150, 320, 245, 446);
      g.addColorStop(0, lt(col, 0.6)); g.addColorStop(0.55, col); g.addColorStop(1, dk(col, 0.25)); c.fillStyle = g; c.fill();
      c.save(); bodyPath(c); c.clip();
      for (i = 2; i >= 0; i--) {   // おなかの板(下から 重ねる。上の板の下に 影)
        y = 396 + i * 17;
        c.beginPath(); c.moveTo(143, y + 2); c.quadraticCurveTo(195, y + 11, 247, y + 2); c.lineTo(247, y + 8); c.quadraticCurveTo(195, y + 17, 143, y + 8); c.closePath(); c.fillStyle = 'rgba(30,50,70,.2)'; c.fill();
        c.beginPath(); c.moveTo(143, y); c.quadraticCurveTo(195, y + 9, 247, y); c.lineWidth = 5; c.strokeStyle = INK; c.stroke(); c.lineWidth = 2.6; c.strokeStyle = '#ffd84d'; c.stroke();
      }
      c.beginPath(); c.moveTo(143, 374); c.quadraticCurveTo(172, 350, 195, 377); c.quadraticCurveTo(218, 350, 247, 374);   // 胸板
      c.lineWidth = 6.5; c.strokeStyle = INK; c.stroke(); c.lineWidth = 3.8; c.strokeStyle = '#ffd84d'; c.stroke();
      c.beginPath(); c.moveTo(195, 377); c.lineTo(195, 396); c.lineWidth = 2.5; c.strokeStyle = dk(col, 0.35); c.stroke();
      var sx = ((t * 70) % 280) - 70;   // ななめの光が ゆっくり流れる
      if (LO < 2) { c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.moveTo(sx + 100, 318); c.lineTo(sx + 124, 318); c.lineTo(sx + 64, 446); c.lineTo(sx + 40, 446); c.closePath(); c.fill(); }
      bodyPath(c); c.lineWidth = 10; c.strokeStyle = INK; c.stroke(); c.lineWidth = 7; c.strokeStyle = '#ffd84d'; c.stroke();   // 体のふちの 金の縁どり
      c.restore(); bodyPath(c); ink(c, 3);
      if (!LO) {   // 胸の つばさの紋章
        for (j = -1; j <= 1; j += 2) { c.beginPath(); c.moveTo(195 + j * 9, 384); c.quadraticCurveTo(195 + j * 24, 372, 195 + j * 30, 380); c.quadraticCurveTo(195 + j * 22, 384, 195 + j * 26, 388); c.quadraticCurveTo(195 + j * 16, 390, 195 + j * 9, 388); c.closePath(); fillInk(c, '#fff', 1.5); }
      }
      circ(c, 195, 384, 8); fillInk(c, '#4fa8d8', 2.5);
      if (LO < 2) { c.beginPath(); c.moveTo(195, 376); c.lineTo(195, 392); c.moveTo(187, 384); c.lineTo(203, 384); c.lineWidth = 1; c.strokeStyle = 'rgba(255,255,255,.5)'; c.stroke(); hiDot(c, 192, 381, 2.4); }
      [[156, 336], [234, 336], [152, 402], [238, 402], [152, 419], [238, 419]].forEach(function (p) { rivet(c, p[0], p[1], 2.5); });
    } else {                      // 型のない服: 色で塗って 胸に 小さなワッペン
      bodyPath(c); c.fillStyle = col; c.fill();
      c.save(); bodyPath(c); c.clip(); c.fillStyle = 'rgba(255,255,255,.2)'; c.fillRect(BODY.x, BODY.y, BODY.w, BODY.h / 2); c.restore();
      shadeIn(c, bp, 356, 446, 0.15);
      bodyPath(c); ink(c, 3);
      circ(c, 224, 380, 15); fillInk(c, '#fff', 2.5); if (!LO) { circ(c, 224, 380, 12); stitch(c, dk(col, 0.2), 1.2); } T.em(s.em, 224, 380, 22);
    }
  }

  /* 袖(腕の変換の中。肩が原点、腕は +y へ) */
  function drawSleeve(c, s) {
    if (!s) { RR(c, -13, -12, 26, 30, 11, SHIRT, 'rgba(27,20,48,.3)', 2); if (!LO) { c.beginPath(); c.moveTo(-12, 13); c.lineTo(12, 13); stitch(c, SHIRT_EDGE, 1.2); } return; }
    var k = s.t, col = s.col, i;
    if (k === 'pajama' || k === 'robe') {
      RR(c, -13, -12, 26, ARM_LEN + 2, 11, col, INK, 2.5);
      wrinkle(c, -6, 18, -1, 22, 5, 18, 0.35); wrinkle(c, -5, 34, 0, 38, 6, 34, 0.35);
      if (s.fluffy) for (i = 0; i < 4; i++) { circ(c, -10 + i * 6.7, ARM_LEN - 8, 6.5); c.fillStyle = '#fffaf0'; c.fill(); c.lineWidth = 1.5; c.strokeStyle = 'rgba(90,61,43,.55)'; c.stroke(); }
      else { RR(c, -14, ARM_LEN - 14, 28, 9, 4, lt(col, 0.45), INK, 2); if (!LO) { c.beginPath(); c.moveTo(-12, ARM_LEN - 9.5); c.lineTo(12, ARM_LEN - 9.5); stitch(c, dk(col, 0.3), 1.1); } }
    } else if (k === 'box') {
      RR(c, -16, -12, 32, ARM_LEN + 4, 4, col, INK, 2.5);
      c.strokeStyle = dk(col, 0.3); c.lineWidth = 2; c.beginPath(); c.moveTo(-15, 22); c.lineTo(15, 22); c.moveTo(-15, 44); c.lineTo(15, 44); c.stroke();
      rivet(c, 0, 4, 2.2, '#cfd8e0');
    } else if (k === 'bubble') {
      RR(c, -17, -14, 34, 44, 16, 'rgba(214,238,250,.96)', INK, 2.5);
      for (i = 0; i < 4; i++) { circ(c, -7 + (i % 2) * 14, 2 + Math.floor(i / 2) * 14, 5); c.lineWidth = 1.5; c.strokeStyle = 'rgba(79,168,216,.6)'; c.stroke(); }
    } else if (k === 'armor') {   // 肩当て(板 2 枚 + 金のふち)・こて
      RR(c, -12, -10, 24, 34, 10, '#9fb4c4', INK, 2);
      RR(c, -13, ARM_LEN - 36, 26, 24, 7, col, INK, 2.5); RR(c, -8, ARM_LEN - 32, 4, 16, 2, 'rgba(255,255,255,.7)');
      if (LO < 2) { c.beginPath(); c.moveTo(-13, ARM_LEN - 31); c.lineTo(13, ARM_LEN - 31); c.lineWidth = 2.5; c.strokeStyle = '#ffd84d'; c.stroke(); rivet(c, 6, ARM_LEN - 20, 2); }
      ell(c, 0, 12, 22, 13); fillInk(c, dk(col, 0.1), 2.5);
      ell(c, 0, -2, 25, 18); var g = c.createLinearGradient(-20, -18, 20, 16); g.addColorStop(0, lt(col, 0.6)); g.addColorStop(1, dk(col, 0.2)); fillInk(c, g, 3);
      if (LO < 2) { c.beginPath(); c.ellipse(0, -2, 20.5, 13.5, 0, 0.15, Math.PI - 0.15); c.lineWidth = 2.6; c.strokeStyle = '#ffd84d'; c.stroke(); rivet(c, 0, -10, 2.4); shine(c, -9, -9, 7, 3, -0.4, 0.7); }
    } else if (k === 'cooker') {
      RR(c, -14, -12, 28, 32, 12, '#f2f2f2', INK, 2.5);
    } else if (k === 'jersey') {
      RR(c, -13, -12, 26, 30, 11, '#fff', INK, 2.5); RR(c, -13, 12, 26, 5, 2, '#e63e3e');
    } else if (k === 'apron' || k === 'kotatsu') {
      RR(c, -13, -12, 26, 30, 11, SHIRT, 'rgba(27,20,48,.3)', 2);
    } else if (k === 'shirt') {   // ブランドの ふく: そでに 値札が ついたまま
      RR(c, -13, -12, 26, 30, 11, col, INK, 2.5); RR(c, -13, 11, 26, 6, 3, '#fff', INK, 1.5);
      tag(c, 0, 16, 0.15, (s.price || 0) + 'G', '#e63e3e', 34);
    } else {
      RR(c, -13, -12, 26, 30, 11, col, INK, 2.5);
      if (!LO) { c.beginPath(); c.moveTo(-12, 13); c.lineTo(12, 13); stitch(c, lt(col, 0.6), 1.2); }
    }
  }

  /* ---------- マント(体の後ろ。首を原点に揺れる) ---------- */
  function capeShape(c, hemY, half, sway, scallop) {
    c.beginPath(); c.moveTo(154, 326); c.lineTo(236, 326);
    c.quadraticCurveTo(195 + half * 0.78, 400, 195 + half + sway, hemY);
    if (scallop) { var n = 6, w = (half * 2) / n; for (var i = 0; i < n; i++) { var x0 = 195 + half + sway - i * w; c.quadraticCurveTo(x0 - w / 2, hemY + 18, x0 - w, hemY); } }
    else c.quadraticCurveTo(195 + sway, hemY + 12, 195 - half + sway, hemY);
    c.quadraticCurveTo(195 - half * 0.78, 400, 154, 326); c.closePath();
  }
  function wing(c, sd, t) {
    c.save(); c.translate(195 + sd * 26, 350); c.rotate(sd * (-0.15 + Math.sin(t * 3) * 0.12)); c.scale(sd, 1);
    var tiers = [[64, -34, 60, 26, -0.35], [58, -6, 56, 22, -0.12], [48, 20, 46, 18, 0.12], [36, 42, 34, 14, 0.32]];
    for (var i = tiers.length - 1; i >= 0; i--) {
      var f = tiers[i]; ell(c, f[0], f[1], f[2], f[3], f[4]); fillInk(c, i % 2 ? '#ffffff' : '#f2f6ff', 2.5);
      if (!LO) { c.beginPath(); c.moveTo(f[0] - f[2] * 0.6, f[1]); c.lineTo(f[0] + f[2] * 0.7, f[1] + f[2] * 0.7 * Math.tan(f[4])); c.lineWidth = 1.3; c.strokeStyle = 'rgba(120,150,200,.5)'; c.stroke(); }   // 羽の軸
    }
    if (!LO) { c.save(); c.setLineDash([4, 4]); ell(c, 64, -34, 46, 15, -0.35); c.lineWidth = 1.5; c.strokeStyle = 'rgba(90,61,43,.45)'; c.stroke(); c.restore(); }   // ぬい目(つくりもの)
    c.restore();
  }
  function panelWing(c, sd, t) {
    c.save(); c.translate(195 + sd * 30, 352); c.rotate(sd * (-0.3 + Math.sin(t * 1.5) * 0.03)); c.scale(sd, 1);
    RR(c, 0, -58, 98, 98, 6, '#cfd8e0', INK, 3); RR(c, 6, -52, 86, 86, 3, '#24477a');
    c.strokeStyle = '#6a8fc8'; c.lineWidth = 1.5;
    for (var i = 1; i < 4; i++) { c.beginPath(); c.moveTo(6 + i * 21.5, -52); c.lineTo(6 + i * 21.5, 34); c.moveTo(6, -52 + i * 21.5); c.lineTo(92, -52 + i * 21.5); c.stroke(); }
    c.fillStyle = 'rgba(255,255,255,.3)'; c.beginPath(); c.moveTo(20, -52); c.lineTo(44, -52); c.lineTo(14, 34); c.lineTo(6, 34); c.lineTo(6, 0); c.closePath(); c.fill();
    rivet(c, 3, -55, 2, '#9aa3ab'); rivet(c, 95, -55, 2, '#9aa3ab'); rivet(c, 3, 37, 2, '#9aa3ab'); rivet(c, 95, 37, 2, '#9aa3ab');
    c.restore();
  }
  function drawCapeBack(c, T, s, t) {
    var k = s.t, col = s.col, sway = Math.sin(t * 1.6) * 6, x, y, i;
    /* main: 外の色で塗る → (呼んだ側が もようを描く) → done(): 裏地(lining)と 内側の陰・ひだ → ふち */
    function main(hemY, half, scallop, lw, edge, lining) {
      capeShape(c, hemY, half, sway, scallop); c.fillStyle = col; c.fill();
      c.save(); capeShape(c, hemY, half, sway, scallop); c.clip();
      capeShape(c, hemY, half, sway, scallop); c.lineWidth = edge ? 14 : 18; c.strokeStyle = edge || dk(col, 0.18); c.stroke();
      return function () {
        var inner = function () { capeShape(c, hemY - 14, half - 18, sway * 0.9, scallop); };
        if (lining) { inner(); c.fillStyle = lining; c.fill(); }
        if (LO < 2) {
          inner(); var g = c.createLinearGradient(0, 326, 0, 432); g.addColorStop(0, 'rgba(40,20,10,.4)'); g.addColorStop(1, 'rgba(40,20,10,0)'); c.fillStyle = g; c.fill();
          if (!LO) for (var j = -1; j <= 1; j += 2) { c.beginPath(); c.moveTo(195 + j * 34, 350); c.quadraticCurveTo(195 + j * half * 0.5 + sway, 420, 195 + j * half * 0.6 + sway, hemY - 6); c.lineWidth = 2.2; c.strokeStyle = 'rgba(40,20,10,.22)'; c.stroke(); }
        }
        c.restore(); capeShape(c, hemY, half, sway, scallop); ink(c, lw || 3);
      };
    }
    var done;
    if (k === 'wings') { wing(c, -1, t); wing(c, 1, t); return; }
    if (k === 'panel') { panelWing(c, -1, t); panelWing(c, 1, t); return; }
    if (k === 'towel') {   // タオル: しま + ふさふさ + 洗たく表示の タグ
      done = main(442, 66, false);
      c.fillStyle = '#4fa8d8'; c.fillRect(100, 414, 200, 7); c.fillRect(100, 426, 200, 4);
      if (!LO) { c.fillStyle = 'rgba(0,0,0,.05)'; for (y = 332; y < 440; y += 6) for (x = 120 + (y % 12); x < 270; x += 12) c.fillRect(x, y, 2, 2); }
      done();
      c.lineWidth = 2; c.strokeStyle = INK; c.beginPath();
      for (x = 133; x <= 257; x += 9) { c.moveTo(x + sway, 446); c.lineTo(x + sway, 455); } c.stroke();
      if (!LO) { RR(c, 244 + sway, 424, 12, 16, 2, '#fff', INK, 1.3); c.fillStyle = '#4fa8d8'; c.fillRect(246 + sway, 428, 8, 2); c.fillRect(246 + sway, 432, 8, 2); }
    } else if (k === 'sheet') {
      done = main(486, 94, true, 3, 'rgba(0,0,0,.06)'); done();
      T.em('👻', 195 + 84 + sway, 468, 28);
    } else if (k === 'rain') {
      ell(c, 195, 238, 99, 100); fillInk(c, col, 3); ell(c, 195, 246, 88, 86); c.fillStyle = dk(col, 0.25); c.fill();   // フード(頭の後ろ)
      if (!LO) { ell(c, 195, 238, 94, 95); stitch(c, dk(col, 0.35), 1.4); }
      done = main(472, 86, false, 3, null, dk(col, 0.12));
      c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 4; c.beginPath(); c.moveTo(130, 380); c.lineTo(124, 440); c.moveTo(262, 380); c.lineTo(268, 440); c.stroke();
      done();
      if (!LO) for (i = 0; i < 4; i++) { x = (i % 2 ? 268 : 116) + sway * 0.8; y = 392 + i * 18; c.beginPath(); c.moveTo(x, y - 6); c.quadraticCurveTo(x + 4, y + 1, x, y + 3); c.quadraticCurveTo(x - 4, y + 1, x, y - 6); c.fillStyle = 'rgba(255,255,255,.8)'; c.fill(); }   // しずく
    } else if (k === 'karakusa') {   // ふろしき(data.js の色 + 白い からくさ もよう)
      done = main(482, 90, false);
      c.strokeStyle = LO === 2 ? 'rgba(255,255,255,.6)' : '#fff'; c.lineWidth = 3;
      for (y = 344, i = 0; y < 500; y += 30, i++) for (x = 108 + (i % 2) * 17; x < 290; x += 34) {
        c.beginPath(); for (var a = 0; a < 9.5; a += 0.35) { var r = 1.5 + a * 1.1; if (a) c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); else c.moveTo(x + r, y); } c.stroke();
        if (!LO) { c.beginPath(); c.moveTo(x + 11, y + 4); c.quadraticCurveTo(x + 17, y + 13, x + 9, y + 18); c.stroke(); }
      }
      done();
    } else if (k === 'curtain') {   // カーテン: ひだ + 白い裏地 + 金の ふさの タッセル
      done = main(494, 92, false, 3, null, '#f6efe0');
      c.fillStyle = dk(col, 0.15); for (x = 98; x < 296; x += 16) c.fillRect(x, 320, 7, 190);
      done();
      if (LO < 2) {
        x = 195 - 92 * 0.86 + sway * 0.6; y = 440;
        c.beginPath(); c.moveTo(x - 8, y - 6); c.quadraticCurveTo(x + 6, y + 2, x + 22, y - 4); c.lineWidth = 6; c.strokeStyle = INK; c.stroke(); c.lineWidth = 3.5; c.strokeStyle = '#ffd84d'; c.stroke();
        circ(c, x + 4, y, 5); fillInk(c, '#ffd84d', 2);
        c.beginPath(); c.moveTo(x - 1, y + 4); c.lineTo(x - 5, y + 24); c.lineTo(x + 13, y + 24); c.lineTo(x + 9, y + 4); c.closePath(); fillInk(c, '#f0c020', 2);
        if (!LO) { c.strokeStyle = '#b8860b'; c.lineWidth = 1; for (i = 0; i < 4; i++) { c.beginPath(); c.moveTo(x + 0.5 + i * 2.7, y + 8); c.lineTo(x - 2 + i * 4, y + 23); c.stroke(); } }
      }
    } else if (k === 'futon') {   // おふとん: キルトの ぬい目 + しきい の 白い ふち
      done = main(502, 108, false, 4);
      c.strokeStyle = lt(col, 0.5); c.lineWidth = 2.5;
      for (x = 40; x < 360; x += 30) { c.beginPath(); c.moveTo(x, 320); c.lineTo(x + 180, 520); c.moveTo(x + 40, 320); c.lineTo(x - 140, 520); c.stroke(); }
      if (!LO) { c.fillStyle = '#fff'; for (x = 55; x < 345; x += 30) for (y = 348; y < 510; y += 33) { circ(c, x + ((y / 33) % 2) * 15, y, 2); c.fill(); } }
      capeShape(c, 502, 108, sway, false); c.lineWidth = 14; c.strokeStyle = '#fff'; c.stroke();
      done();
    } else if (k === 'hero') {   // 勇者のマント: 赤 + 金のふち + 濃い裏地 + すみに 金の星
      done = main(506, 102, false, 3, '#ffd84d', dk(col, 0.35));
      done();
      if (LO < 2) for (i = -1; i <= 1; i += 2) { starPath(c, 195 + i * 86 + sway, 488, 8, 3.5, 5); fillInk(c, '#ffd84d', 1.8); }
    } else {
      done = main(482, 88, false); done();
      T.em(s.em, 195 + 70 + sway, 464, 26);
    }
  }
  /* マントの前の部品(留め金・結び目・肩ひも)。体のあと・腕の前に描く */
  function drawCapeFront(c, s) {
    var k = s.t, i;
    if (k === 'wings' || k === 'panel') {   // 背負いひも(つくりもの感)
      c.beginPath(); c.moveTo(158, 322); c.quadraticCurveTo(148, 360, 160, 398); c.moveTo(232, 322); c.quadraticCurveTo(242, 360, 230, 398);
      c.lineWidth = 8; c.strokeStyle = INK; c.stroke(); c.lineWidth = 5; c.strokeStyle = k === 'wings' ? '#fff' : '#cfd8e0'; c.stroke();
      if (!LO) { c.beginPath(); c.moveTo(158, 322); c.quadraticCurveTo(148, 360, 160, 398); c.moveTo(232, 322); c.quadraticCurveTo(242, 360, 230, 398); stitch(c, 'rgba(90,61,43,.4)', 1); }
      RR(c, 150, 360, 12, 9, 2, '#cfd8e0', INK, 1.6); RR(c, 228, 360, 12, 9, 2, '#cfd8e0', INK, 1.6);   // ひもの 金具
    } else if (k === 'towel' || k === 'sheet' || k === 'curtain' || k === 'futon') {
      // 首のうしろで むすんでいる(前からは 見えない)
    } else if (k === 'karakusa') {   // ふろしきは 首の前で 結ぶ(結び目 + 2 つの耳)
      for (i = -1; i <= 1; i += 2) { c.beginPath(); c.moveTo(195 + i * 6, 350); c.quadraticCurveTo(195 + i * 22, 352, 195 + i * 26, 366); c.quadraticCurveTo(195 + i * 12, 366, 195 + i * 4, 356); c.closePath(); fillInk(c, s.col, 2.5); }
      ell(c, 195, 352, 9, 7); fillInk(c, s.col, 2.5);
      if (!LO) { c.beginPath(); c.arc(195, 352, 4, 0.5, 4); c.lineWidth = 1.8; c.strokeStyle = '#fff'; c.stroke(); }
    } else {
      var cc = k === 'rain' ? dk(s.col, 0.2) : '#ffd84d';
      for (i = -1; i <= 1; i += 2) {
        circ(c, 195 + i * 39, 334, 7.5); fillInk(c, cc, 2.5);
        if (k === 'hero') { circ(c, 195 + i * 39, 334, 3.5); fillInk(c, '#e63e3e', 1.4); }
        else if (!LO) { circ(c, 195 + i * 39, 334, 4.5); c.lineWidth = 1.2; c.strokeStyle = 'rgba(90,61,43,.5)'; c.stroke(); }
        hiDot(c, 195 + i * 39 - 2.5, 331, 1.8);
      }
    }
  }

  /* ---------- こし(ベルト)。服の形に合わせて 巻く位置と はばを変える(着ぐるみの上でも 体に 巻きついて見える) ---------- */
  function waistFrame(sb) {
    var k = sb && sb.t;
    if (k === 'cooker') return { x0: 122, x1: 268, y: 432, cv: 8 };
    if (k === 'box') return { x0: 126, x1: 264, y: 410, cv: 0 };
    if (k === 'bubble') return { x0: 132, x1: 258, y: 404, cv: 7 };
    if (k === 'kotatsu') return { x0: 141, x1: 249, y: 374, cv: 4, short: 1 };
    if (k === 'robe') return { x0: 137, x1: 253, y: 404, cv: 5 };
    return { x0: BODY.x - 3, x1: BODY.x + BODY.w + 3, y: 404, cv: 5 };
  }
  function drawTube(c, s, front, wf) {
    var rx = Math.max(76, (wf.x1 - wf.x0) / 2 + 8), cy = wf.y + 6;
    c.save(); c.beginPath(); if (front) c.rect(0, cy, 400, 220); else c.rect(0, 160, 400, cy - 160); c.clip();
    ell(c, 195, cy, rx, 20); c.lineWidth = 27; c.strokeStyle = INK; c.stroke(); c.lineWidth = 21; c.strokeStyle = s.col; c.stroke();
    c.setLineDash([22, 22]); c.strokeStyle = '#fff'; c.stroke(); c.setLineDash([]);
    if (front) { shine(c, 195 - rx * 0.48, cy + 16, 12, 3, -0.2, 0.75); if (LO < 2) { RR(c, 195 + rx * 0.5, cy + 14, 8, 9, 2, '#fff', INK, 1.6); } }   // 空気を入れる口
    c.restore();
  }
  function drawWaist(c, T, s, t, wf) {
    var k = s.t, col = s.col, y = wf.y, yc = wf.y + wf.cv, x0 = wf.x0, x1 = wf.x1, i, x;
    function bandPath(h) { var tp = y - h / 2, bt = y + h / 2; c.beginPath(); c.moveTo(x0, tp); c.quadraticCurveTo(195, tp + wf.cv * 2, x1, tp); c.lineTo(x1, bt); c.quadraticCurveTo(195, bt + wf.cv * 2, x0, bt); c.closePath(); }
    function band(h, c1, st) {
      bandPath(h); fillInk(c, c1, 3);
      if (!LO) { var tp = y - h / 2 + 3, bt = y + h / 2 - 3; c.beginPath(); c.moveTo(x0 + 2, tp); c.quadraticCurveTo(195, tp + wf.cv * 2, x1 - 2, tp); stitch(c, st || 'rgba(255,255,255,.5)', 1.2); c.beginPath(); c.moveTo(x0 + 2, bt); c.quadraticCurveTo(195, bt + wf.cv * 2, x1 - 2, bt); stitch(c, st || 'rgba(255,255,255,.5)', 1.2); }
    }
    function yAt(px) { var u = (px - x0) / (x1 - x0); return y + wf.cv * 2 * 2 * u * (1 - u); }   // 帯の まん中の線の 高さ
    if (k === 'belt') {   // 金の バックルの ベルト: 穴・ぬい目・金具
      band(16, col);
      if (!LO) for (i = 0; i < 3; i++) { x = 222 + i * 8; circ(c, x, yAt(x), 1.8); c.fillStyle = INK; c.fill(); }
      RR(c, 179, yc - 13, 32, 26, 5, '#ffd84d', INK, 3); RR(c, 186, yc - 6, 18, 12, 3, col);
      c.beginPath(); c.moveTo(186, yc); c.lineTo(204, yc); c.lineWidth = 2.5; c.strokeStyle = '#d9a400'; c.stroke();   // 留めの ピン
      shine(c, 184, yc - 9, 4, 2, 0, 0.85);
      RR(c, 214, yAt(216) - 9, 6, 18, 2, dk(col, 0.15), INK, 1.8);   // ベルト通し
    } else if (k === 'jumprope') {
      for (i = 0; i < 2; i++) {
        c.beginPath(); for (x = 0; x <= 20; x++) { var px = x0 - 1 + x * (x1 - x0 + 2) / 20, py = yAt(px) - 5 + i * 10 + Math.sin(x * 0.9 + i) * 3; if (x) c.lineTo(px, py); else c.moveTo(px, py); }
        c.lineWidth = 8; c.strokeStyle = INK; c.stroke(); c.lineWidth = 5; c.strokeStyle = col; c.stroke();
        if (!LO) { c.setLineDash([3, 4]); c.lineWidth = 1.5; c.strokeStyle = 'rgba(255,255,255,.7)'; c.stroke(); c.setLineDash([]); }
      }
      if (!wf.short) {
        c.beginPath(); c.moveTo(x1 + 2, y + 4); c.quadraticCurveTo(x1 + 15, y + 16, x1 + 9, y + 30); c.lineWidth = 7; c.strokeStyle = INK; c.stroke(); c.lineWidth = 4; c.strokeStyle = col; c.stroke();
        RR(c, x1 + 3, y + 28, 12, 28, 6, '#c8915a', INK, 2.5); if (!LO) { RR(c, x1 + 3, y + 33, 12, 4, 1, '#e63e3e'); hiDot(c, x1 + 6, y + 42, 1.6); }
      }
    } else if (k === 'tube') {
      drawTube(c, s, true, wf);
    } else if (k === 'pouch') {   // ウエストポーチ: ファスナー + 引き手 + ぬい目 + ロゴ
      band(8, '#2d3436');
      RR(c, 170, yc - 2, 50, 32, 11, col, INK, 3);
      if (!LO) { rrPath(c, 173, yc + 1, 44, 26, 8); stitch(c, 'rgba(255,255,255,.35)', 1.1); }
      c.beginPath(); c.moveTo(176, yc + 8); c.lineTo(214, yc + 8); c.lineWidth = 2; c.strokeStyle = '#888'; c.stroke();
      if (!LO) { c.save(); c.setLineDash([1.5, 1.5]); c.beginPath(); c.moveTo(176, yc + 8); c.lineTo(214, yc + 8); c.lineWidth = 3.5; c.strokeStyle = '#aaa'; c.stroke(); c.restore(); }
      RR(c, 207, yc + 6, 7, 12, 2, '#ffd84d', INK, 1.5);
      circ(c, 186, yc + 19, 5); fillInk(c, '#e63e3e', 1.5); if (!LO) TX(c, 'P', 186, yc + 19.5, 6, '#fff', 'center', 900, null);
      RR(c, 160, yc - 6, 10, 12, 2, '#555', INK, 1.5); RR(c, 220, yc - 6, 10, 12, 2, '#555', INK, 1.5);   // バックル
    } else if (k === 'snake') {
      c.beginPath(); for (i = 0; i <= 24; i++) { x = x0 - 1 + i * (x1 - x0 + 2) / 24; var yy = yAt(x) + Math.sin(i * 0.8 + t * 3) * 5; if (i) c.lineTo(x, yy); else c.moveTo(x, yy); }
      c.lineCap = 'round'; c.lineWidth = 17; c.strokeStyle = INK; c.stroke(); c.lineWidth = 12; c.strokeStyle = col; c.stroke();
      c.setLineDash([3, 9]); c.strokeStyle = '#1e8449'; c.lineWidth = 5; c.stroke(); c.setLineDash([]);
      if (!LO) { c.lineWidth = 1.5; c.strokeStyle = 'rgba(255,255,255,.4)'; c.stroke(); }
      ell(c, x1 + 11, y - 4, 14, 10, -0.3); fillInk(c, col, 3);
      circ(c, x1 + 14, y - 8, 3.5); c.fillStyle = '#fff'; c.fill(); circ(c, x1 + 15, y - 8, 1.8); c.fillStyle = INK; c.fill();
      if (Math.floor(t * 3) % 2) { c.beginPath(); c.moveTo(x1 + 23, y - 2); c.lineTo(x1 + 33, y); c.lineTo(x1 + 37, y - 4); c.moveTo(x1 + 33, y); c.lineTo(x1 + 37, y + 3); c.lineWidth = 2; c.strokeStyle = '#e63e3e'; c.stroke(); }
      if (!LO) { RR(c, 176, yAt(186) + 4, 20, 9, 2, '#fff', INK, 1); TX(c, 'MADE IN', 186, yAt(186) + 8.8, 4.5, INK, 'center', 900, null); }   // おもちゃの しるし
    } else if (k === 'tools') {   // 大工さんの道具ベルト: 金づち・スパナ・えんぴつ・メジャー
      band(16, col);
      T.em('🔨', 162, y + 2, 28); T.em('🔧', 228, y + 2, 24);
      RR(c, 150, y + 6, 26, 22, 4, dk(col, 0.15), INK, 2.5); RR(c, 215, y + 6, 26, 22, 4, dk(col, 0.15), INK, 2.5);
      if (!LO) { rrPath(c, 152.5, y + 8.5, 21, 17, 3); stitch(c, 'rgba(255,255,255,.5)', 1.1); rrPath(c, 217.5, y + 8.5, 21, 17, 3); stitch(c, 'rgba(255,255,255,.5)', 1.1); }
      RR(c, 185, yc - 8, 20, 16, 3, '#cfd8e0', INK, 2.5); hiDot(c, 189, yc - 4, 1.6);
      if (LO < 2) {
        RR(c, 198, y - 26, 5, 22, 1.5, '#ffd84d', INK, 1.4); c.beginPath(); c.moveTo(198, y - 26); c.lineTo(200.5, y - 32); c.lineTo(203, y - 26); c.closePath(); fillInk(c, '#f5d0a0', 1.2);   // えんぴつ
        circ(c, 176, yAt(176) + 18, 8); fillInk(c, '#ffd84d', 2); circ(c, 176, yAt(176) + 18, 3); c.fillStyle = '#333'; c.fill();   // メジャー
      }
    } else if (k === 'mawashi') {
      if (!wf.short) for (x = 170; x <= 220; x += 10) { c.beginPath(); c.moveTo(x, yc + 12); c.lineTo(x + (x - 195) * 0.08, yc + 46); c.lineWidth = 6; c.strokeStyle = INK; c.stroke(); c.lineWidth = 3.5; c.strokeStyle = col; c.stroke(); }
      band(28, col, 'rgba(255,255,255,.35)');
      if (!LO) { bandPath(28); c.save(); c.clip(); c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 2; for (x = x0; x < x1; x += 7) { c.beginPath(); c.moveTo(x, y - 14); c.lineTo(x + 5, y + 14); c.stroke(); } c.restore(); }
      if (!wf.short) { c.beginPath(); c.moveTo(180, yc + 12); c.lineTo(210, yc + 12); c.lineTo(205, yc + 42); c.lineTo(185, yc + 42); c.closePath(); fillInk(c, col, 3); }
    } else if (k === 'obi') {
      ell(c, x1 + 11, y - 11, 17, 11, -0.5); fillInk(c, lt(col, 0.2), 2.5); ell(c, x1 + 11, y + 11, 17, 11, 0.5); fillInk(c, lt(col, 0.2), 2.5);
      band(32, col, 'rgba(255,255,255,.0)');
      c.save(); bandPath(32); c.clip(); c.strokeStyle = lt(col, 0.4); c.lineWidth = 2;
      for (x = x0 - 10; x < x1 + 10; x += 14) { c.beginPath(); c.moveTo(x, y - 16); c.lineTo(x + 14, y + 20); c.moveTo(x + 14, y - 16); c.lineTo(x, y + 20); c.stroke(); }
      if (!LO) { c.fillStyle = '#fff6b0'; for (x = x0 + 7; x < x1; x += 14) { circ(c, x, yAt(x) - 7, 1.6); c.fill(); circ(c, x + 7, yAt(x + 7) + 9, 1.6); c.fill(); } }
      c.restore();
      c.beginPath(); c.moveTo(x0 + 1, y); c.quadraticCurveTo(195, y + wf.cv * 2, x1 - 1, y); c.lineWidth = 7; c.strokeStyle = INK; c.stroke(); c.lineWidth = 4; c.strokeStyle = '#e63e3e'; c.stroke();
      circ(c, 195, yc, 6); fillInk(c, '#5fb84e', 2); hiDot(c, 193, yc - 2, 1.6); circ(c, x1 + 3, y, 6); fillInk(c, col, 2.5);
    } else if (k === 'champ') {   // チャンピオンベルト: 金の大きな板・宝石・横の金具・CHAMP の字
      band(22, '#222', 'rgba(255,216,77,.6)');
      RR(c, 148, yAt(158) - 9, 20, 18, 4, '#ffd84d', INK, 2); RR(c, 222, yAt(232) - 9, 20, 18, 4, '#ffd84d', INK, 2);
      if (!LO) { starPath(c, 158, yAt(158), 5, 2.2, 5); c.fillStyle = '#e63e3e'; c.fill(); starPath(c, 232, yAt(232), 5, 2.2, 5); c.fill(); }
      ell(c, 195, yc, 34, 25); fillInk(c, '#ffd84d', 3); ell(c, 195, yc, 24, 17); c.lineWidth = 2.5; c.strokeStyle = '#d9a400'; c.stroke();
      if (!LO) { for (i = 0; i < 12; i++) { var aa = i * TAU / 12; circ(c, 195 + Math.cos(aa) * 29, yc + Math.sin(aa) * 21, 1.4); c.fillStyle = '#fff6b0'; c.fill(); } TX(c, 'CHAMP', 195, yc + 11, 6.5, '#8a5a00', 'center', 900, null); }
      circ(c, 195, yc - 2, 6.5); fillInk(c, '#e63e3e', 2); hiDot(c, 193, yc - 4, 1.8); shine(c, 180, yc - 12, 8, 3, -0.3, 0.8);
    } else {
      band(14, col); T.em(s.em, 195, yc, 30);
    }
  }

  /* ---------- あし(靴。足の変換の中: 股関節が原点、足は +y) ---------- */
  function sole(c, x, y, w, col) { RR(c, x, y, w, 7, 3, col, INK, 2); if (!LO) { c.beginPath(); c.moveTo(x + 3, y + 3.5); c.lineTo(x + w - 3, y + 3.5); stitch(c, 'rgba(255,255,255,.6)', 1); } }
  function drawFoot(c, T, s, sd, t) {
    var k = s.t, col = s.col, L = LEG_LEN, i, o = sd * 3;
    if (k === 'slipper') {   // スリッパ: 来客用の ぽんぽん つき
      ell(c, o, L + 14, 22, 9); fillInk(c, lt(col, 0.35), 2.5);
      c.beginPath(); c.moveTo(-17 + o, L + 13); c.quadraticCurveTo(o, L - 8, 17 + o, L + 13); c.closePath(); fillInk(c, col, 2.5);
      if (!LO) { c.beginPath(); c.moveTo(-13 + o, L + 11); c.quadraticCurveTo(o, L - 3, 13 + o, L + 11); stitch(c, 'rgba(255,255,255,.8)', 1.2); }
      if (LO < 2) { for (i = 0; i < 5; i++) { circ(c, o + Math.cos(i * 1.26) * 4, L + 2 + Math.sin(i * 1.26) * 4, 3.4); c.fillStyle = '#fff'; c.fill(); } circ(c, o, L + 2, 3); c.fillStyle = '#ffe0f0'; c.fill(); }
    } else if (k === 'shoe') {   // おろしたての くつ: ひも・はとめ・底の ぬい目・ぴかぴか・底に 値段シール
      sole(c, -19 + o, L + 12, 38, dk(col, 0.4));
      RR(c, -18 + o, L - 4, 36, 22, 10, col, INK, 2.5);
      if (!LO) { c.beginPath(); c.arc(o + sd * 10, L + 7, 9, -Math.PI * 0.5, Math.PI * 0.5, sd < 0); c.lineWidth = 1.3; c.strokeStyle = dk(col, 0.35); c.stroke(); }   // つま先の きりかえ
      c.beginPath(); for (i = 0; i < 2; i++) { c.moveTo(-6 + o, L - 1 + i * 5); c.lineTo(6 + o, L + 3 + i * 5); c.moveTo(6 + o, L - 1 + i * 5); c.lineTo(-6 + o, L + 3 + i * 5); } c.lineWidth = 2; c.strokeStyle = '#f5e6d0'; c.stroke();
      if (!LO) { for (i = 0; i < 3; i++) { circ(c, -7 + o, L - 2 + i * 5, 1.2); c.fillStyle = '#ffd84d'; c.fill(); circ(c, 7 + o, L - 2 + i * 5, 1.2); c.fill(); } }
      shine(c, sd * 4 - 5, L + 6, 6, 2.5, 0, 0.75);
      if (!LO && sd < 0) { RR(c, -17 + o, L + 13, 14, 6, 1.5, '#fff', INK, 0.8); TX(c, '¥', -10 + o, L + 16.3, 5, '#e63e3e', 'center', 900, null); }
      if (LO < 2 && Math.floor(t * 2 + (sd > 0 ? 1 : 0)) % 2 === 0) T.em('✨', sd * 22, L - 6, 14);
    } else if (k === 'geta') {
      RR(c, -14, L + 16, 8, 10, 2, '#a0703a', INK, 2); RR(c, 6, L + 16, 8, 10, 2, '#a0703a', INK, 2);
      RR(c, -20, L + 7, 40, 11, 3, '#d9a86a', INK, 2.5);
      if (!LO) { c.beginPath(); c.moveTo(-16, L + 11); c.quadraticCurveTo(0, L + 9, 16, L + 13); c.lineWidth = 1; c.strokeStyle = 'rgba(122,74,36,.6)'; c.stroke(); }
      c.beginPath(); c.moveTo(-12, L + 9); c.lineTo(0, L - 3); c.lineTo(12, L + 9); c.lineWidth = 7; c.strokeStyle = INK; c.stroke(); c.lineWidth = 4; c.strokeStyle = '#e63e3e'; c.stroke();
      if (!LO) { c.save(); c.setLineDash([1.5, 2.5]); c.lineWidth = 1.6; c.strokeStyle = '#fff'; c.stroke(); c.restore(); }
    } else if (k === 'boot') {
      var bc = s.metal ? '#9aa3ab' : col;
      RR(c, -16, L - 36, 32, 42, 8, bc, INK, 2.5);
      RR(c, -19 + o, L + 13, 38, 7, 3, dk(bc, 0.4), INK, 2);
      if (!LO) { c.beginPath(); for (i = 0; i < 6; i++) { c.moveTo(-16 + o + i * 6, L + 20); c.lineTo(-13 + o + i * 6, L + 16); } c.lineWidth = 1.3; c.strokeStyle = 'rgba(255,255,255,.5)'; c.stroke(); }   // 底の みぞ
      RR(c, -18 + o, L - 2, 36, 21, 9, bc, INK, 2.5);
      RR(c, -17, L - 39, 34, 10, 4, s.metal ? '#cfd8e0' : lt(col, 0.4), INK, 2);
      RR(c, -11, L - 28, 5, 26, 2, 'rgba(255,255,255,.6)');
      if (s.metal) {
        ell(c, 0, L - 40, 13, 9); fillInk(c, '#cfd8e0', 2.5); shine(c, -4, L - 43, 4, 2, -0.3, 0.8);
        for (i = 0; i < 3; i++) rivet(c, -9 + i * 9, L - 6, 2, '#e8edf2');
        if (LO < 2) { c.beginPath(); c.moveTo(-16, L - 18); c.lineTo(16, L - 18); c.lineWidth = 2; c.strokeStyle = dk(bc, 0.3); c.stroke(); rivet(c, -12, L - 18, 1.8, '#e8edf2'); rivet(c, 12, L - 18, 1.8, '#e8edf2'); }
      } else if (LO < 2) { RR(c, sd * 10 - 3, L - 46, 6, 9, 2, lt(col, 0.4), INK, 1.5); }   // 長ぐつの 引っぱる つまみ
    } else if (k === 'stilts') {
      RR(c, sd * 20 - 5, -34, 10, L + 70, 5, '#7bb661', INK, 2.5);
      c.strokeStyle = '#4e8a3a'; c.lineWidth = 2.5; for (i = 0; i < 3; i++) { c.beginPath(); c.moveTo(sd * 20 - 5, i * 30 - 6); c.lineTo(sd * 20 + 5, i * 30 - 6); c.stroke(); }
      RR(c, -18 + o, L - 2, 36, 22, 9, SHOE, INK, 2.5);
      RR(c, sd * 4 - 18, L + 19, 40, 7, 3, '#a0703a', INK, 2);
      if (!LO) { c.beginPath(); c.moveTo(sd * 4 - 14, L + 19); c.lineTo(sd * 4 + 18, L + 27); c.moveTo(sd * 4 + 18, L + 19); c.lineTo(sd * 4 - 14, L + 27); c.lineWidth = 1.5; c.strokeStyle = '#f5e6d0'; c.stroke(); }   // ひもで しばってある
    } else if (k === 'fins') {
      c.beginPath(); c.moveTo(-14 + sd * 2, L + 6); c.lineTo(14 + sd * 2, L + 6); c.lineTo(26 + sd * 8, L + 34); c.quadraticCurveTo(sd * 6, L + 41, -26 + sd * 4, L + 34); c.closePath(); fillInk(c, col, 2.5);
      c.strokeStyle = dk(col, 0.25); c.lineWidth = 2; for (i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(i * 7 + sd * 2, L + 10); c.lineTo(i * 14 + sd * 5, L + 34); c.stroke(); }
      shine(c, -10 + sd * 3, L + 22, 3, 7, 0.4, 0.5);
      RR(c, -16 + sd * 2, L - 4, 32, 16, 7, dk(col, 0.2), INK, 2.5);
      if (LO < 2) RR(c, -18 + sd * 2, L + 1, 36, 5, 2, '#2d3436');   // かかとの ベルト
    } else if (k === 'sneaker') {   // 光るスニーカー: 星の ロゴ・ひも・底が 七色に光る
      RR(c, -18 + o, L - 4, 36, 22, 10, col, INK, 2.5);
      RR(c, -19 + o, L + 11, 38, 10, 4, '#fff', INK, 2);
      for (i = 0; i < 3; i++) { circ(c, -10 + o + i * 10, L + 16, 2.6); c.fillStyle = 'hsl(' + Math.round((t * 220 + i * 120) % 360) + ',95%,60%)'; c.fill(); }
      c.beginPath(); c.moveTo(-6 + o, L); c.lineTo(6 + o, L + 4); c.moveTo(6 + o, L); c.lineTo(-6 + o, L + 4); c.lineWidth = 2; c.strokeStyle = '#fff'; c.stroke();
      if (!LO) { starPath(c, o + sd * 11, L + 5, 4.5, 2, 5); c.fillStyle = '#fff'; c.fill(); }
    } else if (k === 'skate') {
      RR(c, -16, L - 20, 32, 38, 9, col, INK, 2.5);
      c.beginPath(); for (i = 0; i < 3; i++) { c.moveTo(-6, L - 14 + i * 7); c.lineTo(6, L - 10 + i * 7); c.moveTo(6, L - 14 + i * 7); c.lineTo(-6, L - 10 + i * 7); } c.lineWidth = 2; c.strokeStyle = '#fff'; c.stroke();
      RR(c, -19, L + 14, 38, 6, 2, '#ddd', INK, 2);
      RR(c, sd * 17 - 4, L + 15, 8, 8, 3, '#e63e3e', INK, 1.5);   // つまさきの ブレーキ
      for (i = -1; i <= 1; i += 2) { circ(c, i * 10, L + 25, 6.5); fillInk(c, '#ffd84d', 2); circ(c, i * 10, L + 25, 2); c.fillStyle = INK; c.fill(); }
      shine(c, -8, L - 12, 3, 6, 0.2, 0.5);
    } else if (k === 'spring') {
      var sq = Math.abs(Math.sin(t * 5)) * 4;
      c.beginPath(); c.moveTo(0, L + 16); for (i = 1; i <= 6; i++) c.lineTo(i % 2 ? 10 : -10, L + 16 + i * (18 - sq) / 6); c.lineWidth = 5; c.strokeStyle = INK; c.stroke(); c.lineWidth = 3; c.strokeStyle = '#cfd8e0'; c.stroke();
      RR(c, -13, L + 33 - sq, 26, 6, 3, '#888', INK, 2);
      RR(c, -18 + o, L - 4, 36, 22, 10, col, INK, 2.5);
      if (!LO) { c.beginPath(); c.moveTo(-15 + o, L + 13); c.lineTo(15 + o, L + 13); stitch(c, 'rgba(255,255,255,.7)', 1.2); }
      shine(c, sd * 4 - 5, L + 3, 5, 2, 0, 0.6);
    } else {
      RR(c, -18 + o, L - 2, 36, 22, 9, col, INK, 2.5); T.em(s.em, o, L + 8, 22);
    }
  }

  /* ---------- あたま(かぶりもの。頭の変換の中) ---------- */
  function drawHat(c, T, s, t) {
    var k = s.t, col = s.col, i, sd;
    if (k === 'cone') {   // とんがり帽子: しま・金の水玉・リボン・ふわふわの ぽんぽん
      c.beginPath(); c.moveTo(150, 204); c.quadraticCurveTo(104, 300, 195, 328); c.lineWidth = 1.6; c.strokeStyle = 'rgba(90,61,43,.65)'; c.stroke();   // あごのゴム
      c.save(); c.translate(200, 198); c.rotate(0.12);
      var cone = function () { c.beginPath(); c.moveTo(-50, 0); c.lineTo(0, -112); c.lineTo(50, 0); c.quadraticCurveTo(0, 12, -50, 0); c.closePath(); };
      cone(); c.fillStyle = col; c.fill();
      c.save(); cone(); c.clip(); c.lineWidth = 8; c.strokeStyle = 'rgba(255,255,255,.6)';
      for (i = -6; i <= 6; i++) { c.beginPath(); c.moveTo(-60 + i * 24, 12); c.lineTo(-10 + i * 24, -122); c.stroke(); }
      c.fillStyle = '#ffd84d'; [[-20, -24], [14, -50], [-4, -78], [26, -14]].forEach(function (p) { circ(c, p[0], p[1], 4.5); c.fill(); });
      c.fillStyle = 'rgba(70,35,15,.15)'; c.beginPath(); c.moveTo(18, -60); c.lineTo(60, 10); c.lineTo(10, 10); c.closePath(); c.fill();   // 右側の陰
      c.restore(); cone(); ink(c, 3);
      c.beginPath(); c.moveTo(-46, -6); c.quadraticCurveTo(0, 6, 46, -6); c.lineTo(48, 0); c.quadraticCurveTo(0, 12, -48, 0); c.closePath(); fillInk(c, '#4fa8d8', 2);   // リボン
      if (LO < 2) { c.beginPath(); c.moveTo(30, -2); c.lineTo(44, -14); c.lineTo(46, 2); c.closePath(); fillInk(c, '#4fa8d8', 1.8); c.beginPath(); c.moveTo(30, -2); c.lineTo(48, 8); c.lineTo(36, 12); c.closePath(); fillInk(c, '#4fa8d8', 1.8); }
      if (LO < 2) for (i = 0; i < 7; i++) { circ(c, Math.cos(i * 0.9) * 8, -114 + Math.sin(i * 0.9) * 8, 6); fillInk(c, '#ffd84d', 1.6); }
      circ(c, 0, -114, 8); c.fillStyle = '#ffe680'; c.fill(); hiDot(c, -4, -118, 2.6);
      c.restore();
    } else if (k === 'cap') {   // ねふだつきの ぼうし: ぬい目・つばの ステッチ・ワッペン・値札
      c.beginPath(); c.arc(195, 216, 84, Math.PI, 0); c.closePath(); fillInk(c, col, 3);
      c.save(); c.beginPath(); c.arc(195, 216, 84, Math.PI, 0); c.closePath(); c.clip(); c.fillStyle = 'rgba(70,35,15,.18)'; c.fillRect(225, 120, 60, 100); c.restore();
      c.beginPath(); c.moveTo(195, 132); c.quadraticCurveTo(168, 170, 160, 216); c.moveTo(195, 132); c.quadraticCurveTo(222, 170, 230, 216); c.lineWidth = 2; c.strokeStyle = dk(col, 0.3); c.stroke();
      if (!LO) { c.beginPath(); c.moveTo(189, 134); c.quadraticCurveTo(162, 172, 154, 216); c.moveTo(201, 134); c.quadraticCurveTo(228, 172, 236, 216); stitch(c, lt(col, 0.4), 1.2); }
      circ(c, 195, 133, 6); fillInk(c, lt(col, 0.2), 2);
      ell(c, 195, 216, 92, 15); fillInk(c, dk(col, 0.15), 3);
      if (!LO) { ell(c, 195, 216, 84, 10); stitch(c, lt(col, 0.45), 1.3); }
      RR(c, 182, 176, 26, 20, 5, '#fff', INK, 2); if (!LO) TX(c, 'H', 195, 186.5, 12, col, 'center', 900, null);
      shine(c, 160, 160, 14, 6, -0.6, 0.35);
      tag(c, 268, 196, -0.35, (s.price || 0) + 'G', '#e63e3e', 40);
    } else if (k === 'bucket') {   // バケツ: 取っ手が ぶらさがっている
      c.beginPath(); c.moveTo(112, 216); c.lineTo(140, 116); c.lineTo(250, 116); c.lineTo(278, 216); c.closePath(); fillInk(c, col, 3);
      c.save(); c.beginPath(); c.moveTo(112, 216); c.lineTo(140, 116); c.lineTo(250, 116); c.lineTo(278, 216); c.closePath(); c.clip(); c.fillStyle = 'rgba(70,35,15,.16)'; c.fillRect(226, 110, 70, 110); c.restore();
      c.strokeStyle = dk(col, 0.25); c.lineWidth = 2.5; c.beginPath(); c.moveTo(128, 160); c.lineTo(262, 160); c.moveTo(122, 182); c.lineTo(268, 182); c.stroke();
      ell(c, 195, 116, 55, 8); fillInk(c, dk(col, 0.15), 2.5);
      RR(c, 104, 206, 182, 17, 7, lt(col, 0.25), INK, 3);
      c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.moveTo(150, 120); c.lineTo(164, 120); c.lineTo(142, 206); c.lineTo(128, 206); c.closePath(); c.fill();
      if (LO < 2) {
        circ(c, 117, 196, 5); fillInk(c, dk(col, 0.1), 2); circ(c, 273, 196, 5); fillInk(c, dk(col, 0.1), 2);
        c.beginPath(); c.moveTo(117, 196); c.quadraticCurveTo(195, 290 + Math.sin(t * 2) * 6, 273, 196); c.lineWidth = 4.5; c.strokeStyle = INK; c.stroke(); c.lineWidth = 2.5; c.strokeStyle = '#cfd8e0'; c.stroke();
      }
    } else if (k === 'bowl') {   // どんぶり: 青い もよう・なると の うず・めんが 1 本 たれている
      var bowl = function () { c.beginPath(); c.moveTo(108, 216); c.bezierCurveTo(112, 118, 278, 118, 282, 216); c.closePath(); };
      bowl(); c.fillStyle = col; c.fill();
      c.save(); bowl(); c.clip(); c.strokeStyle = '#3b6fd8'; c.lineWidth = 4; c.beginPath();
      for (i = 100; i <= 290; i += 6) { if (i === 100) c.moveTo(i, 192 + Math.sin(i * 0.2) * 4); else c.lineTo(i, 192 + Math.sin(i * 0.2) * 4); } c.stroke();
      c.lineWidth = 2.5; c.beginPath(); c.moveTo(100, 204); c.lineTo(290, 204); c.stroke();
      c.fillStyle = 'rgba(70,35,15,.12)'; c.fillRect(235, 110, 60, 110);
      c.restore();
      bowl(); ink(c, 3);
      if (!LO) { c.beginPath(); for (i = 0; i < 14; i++) { var ra = i * 0.45, rr = 1 + i * 0.75; if (i) c.lineTo(222 + Math.cos(ra) * rr, 162 + Math.sin(ra) * rr); else c.moveTo(222, 162); } c.lineWidth = 2.5; c.strokeStyle = '#e63e3e'; c.stroke(); }
      RR(c, 168, 128, 54, 15, 5, col, INK, 2.5);
      shine(c, 140, 168, 6, 16, 0.4, 0.7);
      if (LO < 2) { c.beginPath(); c.moveTo(250, 214); c.bezierCurveTo(258, 236, 244, 246, 256, 268 + Math.sin(t * 3) * 3); c.lineWidth = 6; c.strokeStyle = INK; c.stroke(); c.lineWidth = 3.5; c.strokeStyle = '#ffe9a0'; c.stroke(); }
    } else if (k === 'octo') {   // タコ: 吸ばん + ねじりはちまき
      var tx = [118, 136, 154, 236, 254, 272];
      for (i = 0; i < 6; i++) {
        var x = tx[i], wig = Math.sin(t * 3 + i) * 5, ex = 0, ey = 0; sd = x < 195 ? -1 : 1;
        ex = x + sd * (6 + (i % 3) * 4) + wig; ey = 264 - (i % 3) * 10;
        c.beginPath(); c.moveTo(x, 196); c.quadraticCurveTo(x + sd * 14 + wig, 232, ex, ey);
        c.lineCap = 'round'; c.lineWidth = 16; c.strokeStyle = INK; c.stroke(); c.lineWidth = 11; c.strokeStyle = col; c.stroke();
        if (!LO) for (var q = 1; q <= 3; q++) { var u = q / 4.2, px = (1 - u) * (1 - u) * x + 2 * u * (1 - u) * (x + sd * 14 + wig) + u * u * ex, py = (1 - u) * (1 - u) * 196 + 2 * u * (1 - u) * 232 + u * u * ey; circ(c, px - sd * 2.5, py, 2.2); c.fillStyle = lt(col, 0.55); c.fill(); }
      }
      ell(c, 195, 176, 72, 54); fillInk(c, col, 3);
      c.fillStyle = lt(col, 0.3); circ(c, 160, 160, 6); c.fill(); circ(c, 232, 150, 5); c.fill(); circ(c, 214, 132, 4); c.fill();
      for (sd = -1; sd <= 1; sd += 2) { ell(c, 195 + sd * 20, 184, 10, 12); fillInk(c, '#fff', 2); circ(c, 195 + sd * 20 + 2, 187, 5); c.fillStyle = INK; c.fill(); hiDot(c, 195 + sd * 20, 184, 1.5); }
      RR(c, 187, 200, 16, 12, 6, dk(col, 0.15), INK, 2);
      if (LO < 2) {   // ねじりはちまき
        c.beginPath(); c.moveTo(126, 160); c.quadraticCurveTo(195, 142, 264, 160); c.lineWidth = 12; c.strokeStyle = INK; c.stroke(); c.lineWidth = 8.5; c.strokeStyle = '#fff'; c.stroke();
        if (!LO) { c.save(); c.setLineDash([4, 5]); c.lineWidth = 8.5; c.strokeStyle = '#e63e3e'; c.stroke(); c.restore(); }
        c.beginPath(); c.moveTo(262, 158); c.lineTo(282, 146); c.moveTo(262, 160); c.lineTo(284, 166); c.lineWidth = 7; c.strokeStyle = INK; c.stroke(); c.lineWidth = 4; c.strokeStyle = '#fff'; c.stroke();
      }
    } else if (k === 'pudding') {
      var jg = 1 + Math.sin(t * 4) * 0.03;
      c.save(); c.translate(195, 216); c.scale(1 / jg, jg);
      c.beginPath(); c.moveTo(-76, 0); c.lineTo(-54, -78); c.quadraticCurveTo(0, -88, 54, -78); c.lineTo(76, 0); c.quadraticCurveTo(0, 12, -76, 0); c.closePath(); fillInk(c, col, 3);
      c.save(); c.clip(); c.fillStyle = 'rgba(160,82,29,.15)'; c.fillRect(30, -90, 60, 100); c.restore();
      c.beginPath(); c.moveTo(-54, -78); c.quadraticCurveTo(0, -88, 54, -78); c.lineTo(57, -64);
      c.quadraticCurveTo(50, -48, 42, -62); c.quadraticCurveTo(28, -70, 14, -60); c.quadraticCurveTo(6, -42, -4, -60); c.quadraticCurveTo(-24, -68, -36, -60); c.quadraticCurveTo(-44, -46, -50, -62); c.lineTo(-57, -64); c.closePath(); fillInk(c, '#a0521d', 2.5);
      shine(c, -30, -74, 10, 2.5, 0, 0.5);
      circ(c, -12, -88, 12); fillInk(c, '#fff', 2.5); circ(c, 10, -90, 13); fillInk(c, '#fff', 2.5);
      c.beginPath(); c.moveTo(4, -112); c.quadraticCurveTo(10, -128, 18, -130); c.lineWidth = 2.5; c.strokeStyle = '#5fb84e'; c.stroke();
      circ(c, 4, -108, 9); fillInk(c, '#e63e3e', 2.5); circ(c, 1, -111, 2.5); c.fillStyle = '#fff'; c.fill();
      shine(c, -48, -30, 6, 20, 0.25, 0.6);
      c.restore();
    } else if (k === 'ears') {   // ネコ耳: 中の ふわふわの毛 + 片耳に リボン + すず
      c.beginPath(); c.arc(195, 250, 84, Math.PI * 1.15, Math.PI * 1.85); c.lineWidth = 10; c.strokeStyle = INK; c.stroke(); c.lineWidth = 6.5; c.strokeStyle = dk(col, 0.1); c.stroke();
      for (sd = -1; sd <= 1; sd += 2) {
        var tw = (sd > 0 && (t % 3) < 0.25) ? 0.25 : 0;
        c.save(); c.translate(195 + sd * 52, 188); c.rotate(sd * (0.28 + tw));
        c.beginPath(); c.moveTo(-23, 10); c.lineTo(0, -42); c.lineTo(23, 10); c.closePath(); fillInk(c, col, 3);
        c.beginPath(); c.moveTo(-11, 5); c.lineTo(0, -24); c.lineTo(11, 5); c.closePath(); c.fillStyle = lt(col, 0.55); c.fill();
        if (!LO) { c.beginPath(); c.moveTo(-4, 6); c.lineTo(-7, -6); c.moveTo(0, 6); c.lineTo(0, -10); c.moveTo(4, 6); c.lineTo(7, -6); c.lineWidth = 1.6; c.strokeStyle = '#fff'; c.stroke(); }
        if (sd < 0 && LO < 2) { ell(c, -12, 2, 8, 5, -0.5); fillInk(c, '#e63e3e', 1.6); ell(c, 2, -6, 8, 5, 0.6); fillInk(c, '#e63e3e', 1.6); circ(c, -5, -2, 3.5); fillInk(c, '#e63e3e', 1.5); }
        c.restore();
      }
      if (LO < 2) { circ(c, 195, 168, 7); fillInk(c, '#ffd84d', 2); c.beginPath(); c.moveTo(195, 170); c.lineTo(195, 175); c.lineWidth = 1.5; c.strokeStyle = INK; c.stroke(); hiDot(c, 192.5, 165.5, 1.8); }
    } else if (k === 'helmet') {   // ヘルメット: 空気穴・安全シール・あごひも
      c.beginPath(); c.moveTo(118, 214); c.lineTo(160, 322); c.moveTo(272, 214); c.lineTo(230, 322); c.lineWidth = 3.5; c.strokeStyle = 'rgba(58,36,24,.8)'; c.stroke();
      RR(c, 185, 316, 20, 10, 3, '#333');
      var helm = function () { c.beginPath(); c.moveTo(106, 218); c.bezierCurveTo(102, 108, 288, 108, 284, 218); c.quadraticCurveTo(195, 204, 106, 218); c.closePath(); };
      helm(); fillInk(c, col, 3);
      shadeIn(c, helm, 150, 220, 0.2);
      for (i = -1; i <= 1; i++) RR(c, 195 + i * 34 - 7, 138 + Math.abs(i) * 10, 14, 40, 7, dk(col, 0.35));
      c.beginPath(); c.moveTo(126, 212); c.quadraticCurveTo(195, 236, 264, 212); c.lineTo(262, 206); c.quadraticCurveTo(195, 222, 128, 206); c.closePath(); fillInk(c, dk(col, 0.2), 2.5);
      if (LO < 2) { RR(c, 136, 168, 24, 22, 4, '#fff', INK, 1.8); c.fillStyle = '#5fb84e'; c.fillRect(145, 171, 6, 16); c.fillRect(140, 176, 16, 6); }   // 安全の シール(緑の十字)
      shine(c, 168, 134, 12, 5, -0.4, 0.55);
    } else if (k === 'kabuto') {   // 特注の かぶと: 金のくわがた + 前に「へ」の 前立て + びょう
      for (sd = -1; sd <= 1; sd += 2) {   // ほおの板(顔のまわりを囲む)
        c.beginPath(); c.moveTo(195 + sd * 64, 206); c.quadraticCurveTo(195 + sd * 102, 232, 195 + sd * 96, 288); c.lineTo(195 + sd * 70, 310); c.quadraticCurveTo(195 + sd * 78, 252, 195 + sd * 56, 214); c.closePath();
        fillInk(c, dk(col, 0.08), 3);
        c.beginPath(); c.moveTo(195 + sd * 74, 236); c.quadraticCurveTo(195 + sd * 92, 250, 195 + sd * 88, 280); c.lineWidth = 2; c.strokeStyle = lt(col, 0.4); c.stroke();
        c.beginPath(); c.moveTo(195 + sd * 70, 258); c.quadraticCurveTo(195 + sd * 86, 266, 195 + sd * 84, 290); c.lineWidth = 2; c.strokeStyle = '#ffd84d'; c.stroke();
      }
      c.beginPath(); c.moveTo(104, 216); c.bezierCurveTo(98, 102, 292, 102, 286, 216); c.closePath();
      var g = c.createLinearGradient(120, 120, 270, 216); g.addColorStop(0, lt(col, 0.6)); g.addColorStop(1, dk(col, 0.25)); fillInk(c, g, 3);
      for (i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(195 + i * 24, 126 + Math.abs(i) * 7); c.quadraticCurveTo(195 + i * 30, 170, 195 + i * 38, 212); c.lineWidth = 2; c.strokeStyle = dk(col, 0.3); c.stroke(); }
      for (i = -2; i <= 2; i++) rivet(c, 195 + i * 30 + (i ? 4 * (i > 0 ? 1 : -1) : 0), 150 + Math.abs(i) * 4, 2.2, '#ffe58a');
      c.beginPath(); c.moveTo(188, 214); c.quadraticCurveTo(158, 180, 146, 106); c.moveTo(202, 214); c.quadraticCurveTo(232, 180, 244, 106);   // くわがた(金の角)
      c.lineWidth = 14; c.strokeStyle = INK; c.stroke(); c.lineWidth = 9; c.strokeStyle = '#ffd84d'; c.stroke();
      if (!LO) { c.beginPath(); c.moveTo(186, 208); c.quadraticCurveTo(160, 178, 150, 112); c.lineWidth = 2.5; c.strokeStyle = 'rgba(255,255,255,.7)'; c.stroke(); }
      c.beginPath(); c.moveTo(100, 210); c.quadraticCurveTo(195, 236, 290, 210); c.lineTo(288, 222); c.quadraticCurveTo(195, 248, 102, 222); c.closePath(); fillInk(c, dk(col, 0.3), 3);
      if (!LO) { c.beginPath(); c.moveTo(104, 216); c.quadraticCurveTo(195, 242, 286, 216); stitch(c, '#ffd84d', 1.4); }
      circ(c, 195, 206, 13); fillInk(c, '#e63e3e', 2.5); circ(c, 195, 206, 10); c.lineWidth = 1.5; c.strokeStyle = '#ffd84d'; c.stroke();
      if (LO < 2) TX(c, 'へ', 195, 207, 13, '#ffd84d', 'center', 900, null);
      c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.moveTo(140, 130); c.lineTo(156, 124); c.lineTo(132, 196); c.lineTo(118, 196); c.closePath(); c.fill();
    } else if (k === 'crown') {   // 王冠(にせもの): 金メッキが はげて 灰色が 見えている + シール
      c.save(); c.translate(195, 184); c.rotate(-0.12);
      var cr = function () { c.beginPath(); c.moveTo(-46, 14); c.lineTo(-52, -30); c.lineTo(-26, -8); c.lineTo(0, -42); c.lineTo(26, -8); c.lineTo(52, -30); c.lineTo(46, 14); c.closePath(); };
      cr(); fillInk(c, '#ffd84d', 3);
      if (LO < 2) { c.save(); cr(); c.clip(); c.beginPath(); c.moveTo(22, -14); c.quadraticCurveTo(36, -18, 40, -4); c.quadraticCurveTo(34, 6, 24, 2); c.quadraticCurveTo(16, -4, 22, -14); c.fillStyle = '#b9bec4'; c.fill(); c.lineWidth = 1.2; c.strokeStyle = 'rgba(90,61,43,.6)'; c.stroke(); c.restore(); }
      RR(c, -49, 1, 98, 15, 5, '#f0c020', INK, 2.5);
      [[-26, '#e63e3e'], [0, '#4fa8d8'], [26, '#5fb84e']].forEach(function (j) { circ(c, j[0], 8.5, 4.5); fillInk(c, j[1], 1.5); hiDot(c, j[0] - 1.5, 7, 1.3); });
      [[-52, -32, 5], [0, -44, 6], [52, -32, 5]].forEach(function (j) { circ(c, j[0], j[1], j[2]); fillInk(c, '#fff6b0', 2); });
      shine(c, -30, -6, 3, 9, 0.5, 0.75);
      if (!LO) { RR(c, -40, -2, 22, 9, 2, '#fff', INK, 1); TX(c, '¥980', -29, 2.8, 6, '#e63e3e', 'center', 900, null); }
      c.restore();
    } else if (k === 'antenna') {
      c.beginPath(); c.arc(195, 250, 84, Math.PI * 1.15, Math.PI * 1.85); c.lineWidth = 10; c.strokeStyle = INK; c.stroke(); c.lineWidth = 6.5; c.strokeStyle = '#3a3a3a'; c.stroke();
      for (sd = -1; sd <= 1; sd += 2) {
        var bx = 195 + sd * 34, w = Math.sin(t * 4 + sd) * 8, ex2 = bx + sd * 26 + w;
        RR(c, bx - 7, 172, 14, 9, 3, '#9aa3ab', INK, 1.8);
        c.beginPath(); c.moveTo(bx, 176); c.quadraticCurveTo(bx + sd * 2, 122, ex2, 96); c.lineWidth = 6; c.strokeStyle = INK; c.stroke(); c.lineWidth = 3; c.strokeStyle = dk(col, 0.3); c.stroke();
        if (Math.floor(t * 3) % 2) { circ(c, ex2, 92, 21); c.fillStyle = 'rgba(46,204,113,.3)'; c.fill(); }
        circ(c, ex2, 92, 13); fillInk(c, col, 3); circ(c, ex2 - 4, 88, 3.5); c.fillStyle = '#fff'; c.fill();
      }
    } else {
      var crown = s.em === '👑'; T.em(s.em, 195, crown ? 140 : 150, crown ? 86 : 96);
    }
  }

  /* ---------- かお(目の位置 L=169 / R=221、y=256 に合わせる) ---------- */
  function drawFaceItem(c, T, s, t) {
    var k = s.t, col = s.col, L = 169, R = 221, ey = 256, i;
    if (k === 'nose') {
      circ(c, 195, 265, 10.5); fillInk(c, '#e63e3e', 2.5); circ(c, 191.5, 261.5, 3.2); c.fillStyle = 'rgba(255,255,255,.85)'; c.fill();
      if (!LO) { c.beginPath(); c.arc(195, 265, 7.5, 0.3, 1.5); c.lineWidth = 1.5; c.strokeStyle = 'rgba(120,20,20,.5)'; c.stroke(); }
    } else if (k === 'g3d') {
      c.beginPath(); c.moveTo(142, 250); c.lineTo(120, 246); c.moveTo(248, 250); c.lineTo(270, 246); ink(c, 3.5);
      RR(c, 142, 240, 106, 32, 6, '#fff', INK, 2.5);
      RR(c, 148, 244, 42, 24, 4, 'rgba(230,60,60,.72)'); RR(c, 200, 244, 42, 24, 4, 'rgba(60,110,230,.72)');
      if (!LO) { c.beginPath(); c.moveTo(153, 248); c.lineTo(161, 248); c.moveTo(205, 248); c.lineTo(213, 248); c.lineWidth = 2.5; c.strokeStyle = 'rgba(255,255,255,.85)'; c.stroke(); TX(c, '3D', 195, 268, 6, INK, 'center', 900, null); }
    } else if (k === 'net') {
      c.save(); c.beginPath(); c.moveTo(98, 202); c.lineTo(292, 202); c.lineTo(282, 318); c.quadraticCurveTo(195, 342, 108, 318); c.closePath();
      c.fillStyle = 'rgba(110,140,110,.2)'; c.fill(); c.lineWidth = 2; c.strokeStyle = 'rgba(60,80,60,.6)'; c.stroke(); c.clip();
      if (LO < 2) {
        c.strokeStyle = 'rgba(60,80,60,.35)'; c.lineWidth = 1.2;
        for (i = 96; i < 296; i += 8) { c.beginPath(); c.moveTo(i, 200); c.lineTo(i, 344); c.stroke(); }
        for (i = 204; i < 344; i += 8) { c.beginPath(); c.moveTo(96, i); c.lineTo(296, i); c.stroke(); }
      }
      c.restore();
      c.beginPath(); c.ellipse(195, 196, 58, 36, 0, Math.PI, 0); c.closePath(); fillInk(c, '#e9cf8f', 3);
      if (!LO) { c.strokeStyle = 'rgba(160,110,40,.45)'; c.lineWidth = 1.2; for (i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(195 + i * 12, 196); c.lineTo(195 + i * 9, 164 + Math.abs(i) * 2); c.stroke(); } }   // 麦わらの すじ
      ell(c, 195, 200, 102, 17); fillInk(c, '#e9cf8f', 3); RR(c, 140, 186, 110, 9, 3, '#5fb84e');
    } else if (k === 'groucho') {
      ell(c, L, 233, 18, 6.5, -0.1); c.fillStyle = '#3a2418'; c.fill(); ell(c, R, 233, 18, 6.5, 0.1); c.fill();
      for (i = 0; i < 2; i++) { circ(c, i ? R : L, ey, 16); c.fillStyle = 'rgba(255,255,255,.2)'; c.fill(); c.lineWidth = 4; c.strokeStyle = '#2a1a10'; c.stroke(); if (!LO) { c.beginPath(); c.arc(i ? R : L, ey, 11, 3.6, 4.4); c.lineWidth = 2; c.strokeStyle = 'rgba(255,255,255,.85)'; c.stroke(); } }
      c.beginPath(); c.moveTo(185, 254); c.quadraticCurveTo(195, 248, 205, 254); c.lineWidth = 4; c.strokeStyle = '#2a1a10'; c.stroke();
      ell(c, 195, 270, 12, 14); fillInk(c, '#ffb3a0', 2.5); hiDot(c, 191, 265, 2.5, 0.7);
      c.beginPath(); c.moveTo(195, 281); c.bezierCurveTo(180, 273, 160, 281, 161, 294); c.bezierCurveTo(176, 291, 188, 289, 195, 285); c.bezierCurveTo(202, 289, 214, 291, 229, 294); c.bezierCurveTo(230, 281, 210, 273, 195, 281); c.closePath(); fillInk(c, col, 2);
      if (!LO) { c.beginPath(); for (i = 0; i < 4; i++) { c.moveTo(172 + i * 5, 282); c.lineTo(170 + i * 5, 289); c.moveTo(218 - i * 5, 282); c.lineTo(220 - i * 5, 289); } c.lineWidth = 1; c.strokeStyle = 'rgba(255,255,255,.35)'; c.stroke(); }
    } else if (k === 'pack') {   // パック: 目と口の穴 + ほっぺに きゅうり
      c.beginPath(); c.ellipse(195, 254, 66, 64, 0, 0, TAU);
      c.moveTo(L + 15, ey); c.ellipse(L, ey, 15, 16, 0, 0, TAU); c.moveTo(R + 15, ey); c.ellipse(R, ey, 15, 16, 0, 0, TAU); c.moveTo(213, 282); c.ellipse(195, 282, 18, 13, 0, 0, TAU);
      c.fillStyle = 'rgba(246,250,252,.94)'; c.fill('evenodd'); c.lineWidth = 2; c.strokeStyle = 'rgba(140,175,190,.9)'; c.stroke();
      if (LO < 2) for (i = -1; i <= 1; i += 2) { circ(c, 195 + i * 44, 288, 11); fillInk(c, '#7bb661', 2); circ(c, 195 + i * 44, 288, 8); c.fillStyle = '#d8f0b8'; c.fill(); if (!LO) { c.fillStyle = '#9ac87a'; for (var q = 0; q < 5; q++) { circ(c, 195 + i * 44 + Math.cos(q * 1.26) * 4, 288 + Math.sin(q * 1.26) * 4, 1); c.fill(); } } }
    } else if (k === 'snorkel') {
      c.beginPath(); c.moveTo(118, 252); c.lineTo(146, 254); c.moveTo(244, 254); c.lineTo(272, 252); c.lineWidth = 6; c.strokeStyle = '#2d3436'; c.stroke();
      c.beginPath(); c.moveTo(244, 266); c.quadraticCurveTo(270, 266, 270, 232); c.lineTo(270, 150); c.lineCap = 'round'; c.lineWidth = 13; c.strokeStyle = INK; c.stroke(); c.lineWidth = 8.5; c.strokeStyle = col; c.stroke();
      if (!LO) { c.beginPath(); c.moveTo(268, 228); c.lineTo(268, 156); c.lineWidth = 2; c.strokeStyle = 'rgba(255,255,255,.6)'; c.stroke(); }
      RR(c, 262, 136, 16, 14, 4, '#ff8a3d', INK, 2);
      RR(c, 145, 235, 100, 44, 16, col, INK, 3); RR(c, 153, 241, 84, 32, 11, 'rgba(180,230,255,.55)', INK, 2);
      c.beginPath(); c.moveTo(162, 248); c.lineTo(172, 248); c.lineWidth = 3; c.strokeStyle = '#fff'; c.stroke();
      if (!LO) { circ(c, 230, 266, 2); c.fillStyle = 'rgba(255,255,255,.8)'; c.fill(); }
    } else if (k === 'patch') {
      c.beginPath(); c.moveTo(134, 202); c.lineTo(274, 272); c.lineWidth = 4.5; c.strokeStyle = '#222'; c.stroke();
      ell(c, R, ey, 18, 16); fillInk(c, '#222', 2.5);
      if (!LO) { ell(c, R, ey, 14.5, 12.5); stitch(c, 'rgba(255,255,255,.45)', 1.1); }
      circ(c, R, ey - 3, 4.5); c.fillStyle = '#fff'; c.fill();
      c.beginPath(); c.moveTo(R - 6, ey + 4); c.lineTo(R + 6, ey + 9); c.moveTo(R + 6, ey + 4); c.lineTo(R - 6, ey + 9); c.lineWidth = 2; c.strokeStyle = '#fff'; c.stroke();
    } else if (k === 'shades') {   // サングラス: レンズに 値段シールが はったまま
      c.beginPath(); c.moveTo(148, 250); c.lineTo(119, 246); c.moveTo(242, 250); c.lineTo(271, 246); c.lineWidth = 3.5; c.strokeStyle = '#111'; c.stroke();
      for (i = 0; i < 2; i++) { var x = i ? R : L; RR(c, x - 22, 242, 44, 27, 10, col, INK, 2.5); c.beginPath(); c.moveTo(x - 13, 249); c.lineTo(x - 4, 249); c.lineWidth = 3; c.strokeStyle = 'rgba(255,255,255,.8)'; c.stroke(); }
      c.beginPath(); c.moveTo(191, 249); c.quadraticCurveTo(195, 245, 199, 249); c.lineWidth = 3.5; c.strokeStyle = '#111'; c.stroke();
      if (!LO) { c.save(); c.translate(R + 6, 260); c.rotate(-0.15); RR(c, -13, -6, 26, 12, 3, '#fff', INK, 1.2); TX(c, (s.price || 0) + 'G', 0, 0.5, 6, '#e63e3e', 'center', 900, null); c.restore(); circ(c, 121, 246, 2.2); c.fillStyle = '#ffd84d'; c.fill(); }
    } else if (k === 'mask') {
      var flp = Math.sin(t * 4) * 4;
      c.beginPath(); c.moveTo(142, 252); c.quadraticCurveTo(124, 244 + flp, 112, 250 + flp); c.moveTo(142, 254); c.quadraticCurveTo(126, 262 + flp, 116, 268 + flp); c.lineWidth = 7; c.strokeStyle = INK; c.stroke(); c.lineWidth = 4; c.strokeStyle = col; c.stroke();
      c.beginPath(); c.moveTo(140, 250); c.quadraticCurveTo(150, 232, 195, 240); c.quadraticCurveTo(240, 232, 250, 250); c.quadraticCurveTo(246, 276, 220, 276); c.quadraticCurveTo(200, 274, 195, 264); c.quadraticCurveTo(190, 274, 170, 276); c.quadraticCurveTo(144, 276, 140, 250); c.closePath();
      c.moveTo(L + 12, ey); c.ellipse(L, ey, 12, 13, 0, 0, TAU); c.moveTo(R + 12, ey); c.ellipse(R, ey, 12, 13, 0, 0, TAU);
      c.fillStyle = col; c.fill('evenodd'); ink(c, 2.5);
      shine(c, 156, 244, 8, 2.5, -0.3, 0.6);
      if (!LO) { starPath(c, 195, 250, 5, 2.2, 5); c.fillStyle = '#ffd84d'; c.fill(); }
    } else if (k === 'teeth') {   // おばあちゃんの 入れ歯: 金歯が 1 本
      var ch = Math.sin(t * 10) * 1.5;
      ell(c, 195, 284, 30, 17); fillInk(c, '#ff8fa3', 2.5);
      for (i = -2; i <= 2; i++) { RR(c, 195 + i * 10 - 5, 271 - ch, 10, 12, 3, i === 1 ? '#ffd84d' : '#fff', INK, 1.5); RR(c, 195 + i * 10 - 5, 285 + ch, 10, 11, 3, '#fff', INK, 1.5); }
      hiDot(c, 203.5, 274 - ch, 1.6); shine(c, 180, 278, 6, 2, -0.3, 0.6);
    } else {
      T.em(s.em, 195, 254, 64);
    }
  }

  /* ---------- にぎる手 ----------
     ローカル座標: 柄は y 軸(先は -y)、原点が にぎる所。f = 1 のとき こぶしの角(指の付け根)が -x、指先と親指が +x。
     描く順番: palmBack(柄の後ろの 手のひら) → 柄・武器 → fingersFront(柄の前に来る 指 4 本 + 親指) */
  function palmBack(c, x, y, f) {
    c.save(); c.translate(x, y); c.scale(f, 1);
    if (LO === 2) { circ(c, 0, 0, HAND_R); c.fillStyle = SKIN; c.fill(); }
    else { rrPath(c, -16, -13, 30, 26, 12); c.fillStyle = SKIN; c.fill(); c.lineWidth = 2.5; c.strokeStyle = SKIN_EDGE; c.stroke(); }
    c.restore();
  }
  function fingersFront(c, x, y, f) {
    if (LO === 2) return;
    c.save(); c.translate(x, y); c.scale(f, 1);
    if (LO === 1) { rrPath(c, -15, -11, 26, 22, 10); c.fillStyle = SKIN; c.fill(); c.lineWidth = 2; c.strokeStyle = SKIN_EDGE; c.stroke(); c.restore(); return; }
    for (var i = 3; i >= 0; i--) {   // 小指(下)から 人さし指(上)へ。上の指が 下の指に 少し かぶさる
      var fy = -9.3 + i * 6.2, w = 26 - i * 1.6;
      rrPath(c, -15.5, fy - 3.9, w, 7.8, 3.9); c.fillStyle = SKIN; c.fill(); c.lineWidth = 1.8; c.strokeStyle = SKIN_EDGE; c.stroke();
    }
    ell(c, 9.5, -12.5, 7.2, 4.6, -0.45); c.fillStyle = SKIN; c.fill(); c.lineWidth = 1.8; c.strokeStyle = SKIN_EDGE; c.stroke();   // 親指(柄の反対側から 人さし指に かぶさる)
    ell(c, -11, -8, 3, 1.5, -0.3); c.fillStyle = 'rgba(255,255,255,.6)'; c.fill();   // 関節の 光
    c.restore();
  }
  function wrapGrip(c, y0, y1, hw, col) {   // 柄の 布・革まき(ななめの線)
    RR(c, -hw, y0, hw * 2, y1 - y0, 2.5, col, INK, 1.8);
    if (LO) return; c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1.4;
    for (var yy = y0 + 3; yy < y1 - 2; yy += 5.5) { c.beginPath(); c.moveTo(-hw, yy); c.lineTo(hw, yy + 4); c.stroke(); }
  }
  function woodGrain(c, x, y0, y1) { if (LO) return; c.beginPath(); c.moveTo(x, y0); c.lineTo(x, y1); c.moveTo(x + 3, y0 + 10); c.lineTo(x + 3, y1 - 12); c.lineWidth = 1.2; c.strokeStyle = 'rgba(122,74,36,.45)'; c.stroke(); }
  function metalGrad(c, x0, x1, base) { var g = c.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, base || '#dfe6ec'); g.addColorStop(0.55, dk(base || '#dfe6ec', 0.12)); g.addColorStop(1, dk(base || '#dfe6ec', 0.25)); return g; }

  /* ---------- 手に持つ物(原点 = にぎる所、先は -y) ---------- */
  function drawWeapon(c, T, s, t) {
    var k = s.t, col = s.col, i, j, x, y;
    if (k === 'sword' || k === 'dagger') {   // 剣: 柄頭・革まきの柄・つば・しのぎ・刃の光
      var lg = s.legend, dg = k === 'dagger', len = dg ? 62 : lg ? 136 : 116, bw = dg ? 10 : lg ? 11 : 9.5, gy = -17;
      circ(c, 0, 20, 6.5); fillInk(c, lg ? '#ffd84d' : '#c9a227', 2.2); hiDot(c, -2, 18, 1.8);
      wrapGrip(c, gy, 16, 5, lg ? '#4a2a8a' : '#6b4226');
      var blade = function () { c.beginPath(); c.moveTo(-bw, gy - 6); c.lineTo(-bw, -len); c.lineTo(0, -len - 20); c.lineTo(bw, -len); c.lineTo(bw, gy - 6); c.closePath(); };
      if (lg && LO < 2) { c.save(); c.shadowColor = 'rgba(255,216,77,.95)'; c.shadowBlur = 12 + Math.sin(t * 4) * 5; blade(); c.fillStyle = '#eafaff'; c.fill(); c.restore(); }
      blade(); fillInk(c, LO === 2 ? '#e6ecf2' : metalGrad(c, -bw, bw, lg ? '#dff4ff' : '#e6ecf2'), 2.5);
      c.beginPath(); c.moveTo(0, gy - 8); c.lineTo(0, -len - 6); c.lineWidth = 2; c.strokeStyle = lg ? '#6fb6e0' : '#9aa6b2'; c.stroke();   // しのぎ
      if (!LO) { c.beginPath(); c.moveTo(-bw + 3, gy - 10); c.lineTo(-bw + 3, -len + 2); c.lineTo(-2.5, -len - 12); c.lineWidth = 1.8; c.strokeStyle = 'rgba(255,255,255,.95)'; c.stroke(); }
      if (lg && !LO) for (i = 0; i < 4; i++) { y = gy - 26 - i * 24; c.beginPath(); c.moveTo(0, y - 5); c.lineTo(3.5, y); c.lineTo(0, y + 5); c.lineTo(-3.5, y); c.closePath(); c.fillStyle = '#4fa8d8'; c.fill(); }   // 光る もんしょう
      if (lg) {   // 伝説: 金の つばさ形の つば + 赤い宝石 + ねふだ が ついたまま
        for (j = -1; j <= 1; j += 2) {
          c.beginPath(); c.moveTo(0, gy - 4); c.quadraticCurveTo(j * 18, gy - 17, j * 33, gy - 15); c.quadraticCurveTo(j * 26, gy - 6, j * 31, gy + 3); c.quadraticCurveTo(j * 16, gy + 1, 0, gy + 5); c.closePath(); fillInk(c, '#ffd84d', 2.2);
          if (!LO) { c.beginPath(); c.moveTo(j * 8, gy - 3); c.quadraticCurveTo(j * 18, gy - 10, j * 27, gy - 10); c.lineWidth = 1.3; c.strokeStyle = '#d9a400'; c.stroke(); }
        }
        circ(c, 0, gy, 6.5); fillInk(c, '#e63e3e', 2); hiDot(c, -2, gy - 2, 2);
        tag(c, -28, gy - 6, 0.3, (s.price || 0) + 'G', '#e63e3e', 52);
      } else {
        RR(c, -27, gy - 5, 54, 10, 5, '#c9a227', INK, 2.5); circ(c, -27, gy, 5); fillInk(c, '#ffd84d', 2); circ(c, 27, gy, 5); fillInk(c, '#ffd84d', 2);
        rivet(c, 0, gy, 2.6); hiDot(c, -28.5, gy - 1.5, 1.4); hiDot(c, 25.5, gy - 1.5, 1.4);
        if (!dg && LO < 2) {   // 保証書(剣より ぶあつい)が ひもで ぶらさがっている
          c.beginPath(); c.moveTo(27, gy + 4); c.lineTo(33, gy + 15); c.lineWidth = 1.5; c.strokeStyle = INK; c.stroke();
          c.save(); c.translate(34, gy + 27); c.rotate(-0.12);
          RR(c, -13, -7, 34, 26, 3, '#e6dcc4', INK, 1.4); RR(c, -15, -9, 34, 26, 3, '#f3ecd8', INK, 1.4); RR(c, -17, -11, 34, 26, 3, '#fff', INK, 1.8);
          if (!LO) {
            TX(c, '保証書', 0, -3.5, 8.5, INK, 'center', 900, null);
            c.beginPath(); c.moveTo(-13, 4); c.lineTo(11, 4); c.moveTo(-13, 8.5); c.lineTo(4, 8.5); c.lineWidth = 1; c.strokeStyle = '#b0a59a'; c.stroke();
            circ(c, 10, 8, 3.6); c.lineWidth = 1.3; c.strokeStyle = '#e63e3e'; c.stroke();
          }
          c.restore();
        }
      }
    } else if (k === 'spear') {   // やり: 長い柄・布まき・金の口金・赤い ふさ・木の葉の 穂先
      RR(c, -4, -132, 8, 172, 4, '#b07a45', INK, 2.2); woodGrain(c, -1.5, -124, 34);
      RR(c, -5.5, 34, 11, 9, 3, '#9aa3ab', INK, 2);
      wrapGrip(c, -18, 16, 6, '#3a2a5a');
      for (i = -2; i <= 2; i++) { var sw = Math.sin(t * 3 + i) * 3; c.beginPath(); c.moveTo(0, -128); c.quadraticCurveTo(i * 6 + sw * 0.6, -114, i * 7 + sw, -98); c.lineCap = 'round'; c.lineWidth = 5.5; c.strokeStyle = INK; c.stroke(); c.lineWidth = 3.2; c.strokeStyle = '#e63e3e'; c.stroke(); }
      RR(c, -6, -140, 12, 13, 3, '#ffd84d', INK, 2); hiDot(c, -3, -136, 1.4);
      c.beginPath(); c.moveTo(0, -190); c.quadraticCurveTo(16, -163, 6, -140); c.lineTo(-6, -140); c.quadraticCurveTo(-16, -163, 0, -190); c.closePath(); fillInk(c, LO === 2 ? '#e6ecf2' : metalGrad(c, -12, 12), 2.5);
      c.beginPath(); c.moveTo(0, -184); c.lineTo(0, -143); c.lineWidth = 1.6; c.strokeStyle = '#9aa6b2'; c.stroke();
      if (!LO) { c.beginPath(); c.moveTo(-3, -178); c.quadraticCurveTo(-10, -163, -4, -146); c.lineWidth = 1.6; c.strokeStyle = '#fff'; c.stroke(); }
    } else if (k === 'axe') {   // おの: 柄の木目・鉄の頭・三日月の刃・背の とげ
      RR(c, -5, -104, 10, 128, 5, '#b07a45', INK, 2.2); woodGrain(c, -2, -96, 20);
      wrapGrip(c, -14, 14, 5.5, '#6b4226'); circ(c, 0, 24, 5.5); fillInk(c, '#9aa3ab', 2);
      c.beginPath(); c.moveTo(-8, -110); c.quadraticCurveTo(-26, -116, -46, -130); c.quadraticCurveTo(-36, -100, -46, -66); c.quadraticCurveTo(-26, -80, -8, -84); c.closePath(); fillInk(c, LO === 2 ? '#cfd8e0' : metalGrad(c, -46, -8, '#cfd8e0'), 2.6);
      if (!LO) { c.beginPath(); c.moveTo(-42, -124); c.quadraticCurveTo(-34, -99, -42, -72); c.lineWidth = 2.6; c.strokeStyle = '#fff'; c.stroke(); }
      c.beginPath(); c.moveTo(8, -106); c.lineTo(24, -98); c.lineTo(8, -90); c.closePath(); fillInk(c, '#9aa3ab', 2);
      RR(c, -9, -112, 18, 30, 4, '#7d858c', INK, 2.2); rivet(c, 0, -104, 2.4, '#cfd8e0'); rivet(c, 0, -90, 2.4, '#cfd8e0');
    } else if (k === 'hammer') {   // ハンマー(両手で持つ): 太い柄・鉄の頭・帯・びょう
      RR(c, -5.5, -96, 11, 122, 5, '#b07a45', INK, 2.2); woodGrain(c, -2, -88, 20);
      wrapGrip(c, -44, 16, 6, '#2d3436'); circ(c, 0, 27, 6.5); fillInk(c, '#9aa3ab', 2);
      RR(c, -36, -126, 72, 36, 7, LO === 2 ? '#9aa3ab' : metalGrad(c, -36, 36, '#b8c2ca'), INK, 3);
      RR(c, -36, -126, 11, 36, 4, '#6d767e', INK, 2); RR(c, 25, -126, 11, 36, 4, '#6d767e', INK, 2);
      RR(c, -8, -94, 16, 8, 2, '#9aa3ab', INK, 2);
      rivet(c, -14, -116, 2.4, '#e8edf2'); rivet(c, 14, -116, 2.4, '#e8edf2'); rivet(c, -14, -100, 2.4, '#e8edf2'); rivet(c, 14, -100, 2.4, '#e8edf2');
      shine(c, -8, -120, 14, 2.5, 0, 0.7);
    } else if (k === 'bat') {   // バット(両手で持つ): 先ほど太い・グリップテープ・ロゴ
      c.beginPath(); c.moveTo(-4, 16); c.lineTo(-4, -20); c.quadraticCurveTo(-12, -70, -12, -110); c.arc(0, -110, 12, Math.PI, 0); c.quadraticCurveTo(12, -70, 4, -20); c.lineTo(4, 16); c.closePath();
      var bg = LO === 2 ? '#e8c48a' : c.createLinearGradient(-12, 0, 12, 0); if (LO !== 2) { bg.addColorStop(0, '#f7dcae'); bg.addColorStop(0.5, '#e8c48a'); bg.addColorStop(1, '#c79a5a'); } fillInk(c, bg, 2.4);
      ell(c, 0, 20, 8.5, 5); fillInk(c, '#c79a5a', 2);
      wrapGrip(c, -40, 16, 4.6, '#2d3436');
      if (!LO) { ell(c, 0, -80, 5.5, 10); c.lineWidth = 1.5; c.strokeStyle = '#c0392b'; c.stroke(); TX(c, 'へ', 0, -79.5, 7, '#c0392b', 'center', 900, null); c.beginPath(); c.moveTo(-7, -60); c.quadraticCurveTo(-10, -90, -8, -116); c.lineWidth = 2; c.strokeStyle = 'rgba(255,255,255,.7)'; c.stroke(); }
    } else if (k === 'wand') {   // まほうのつえ: 星・リボン・電池の ふた(電池べつうり)
      circ(c, 0, 20, 5.5); fillInk(c, '#ffd84d', 2);
      RR(c, -4.5, -84, 9, 104, 4.5, '#7a4a2a', INK, 2.5); RR(c, -6, -80, 12, 8, 3, col, INK, 1.4);
      if (!LO) { c.beginPath(); c.moveTo(-1.5, -76); c.lineTo(-1.5, -20); c.lineWidth = 1.2; c.strokeStyle = 'rgba(255,255,255,.4)'; c.stroke(); }
      if (LO < 2) { RR(c, -5.5, -44, 11, 15, 2, '#cfd8e0', INK, 1.3); if (!LO) TX(c, '+', 0, -36.5, 9, INK, 'center', 900, null); }   // 電池の ふた
      for (j = -1; j <= 1; j += 2) { ell(c, j * 10, -86, 10, 6, j * 0.4); fillInk(c, col, 2); }   // リボン
      if (LO < 2) { c.beginPath(); c.moveTo(-3, -84); c.lineTo(-10, -66); c.moveTo(3, -84); c.lineTo(9, -68); c.lineWidth = 5; c.strokeStyle = INK; c.stroke(); c.lineWidth = 3; c.strokeStyle = col; c.stroke(); }
      circ(c, 0, -86, 4); fillInk(c, lt(col, 0.3), 1.6);
      starPath(c, 0, -104, 24, 10.5, 5); fillInk(c, '#ffd84d', 2.5);
      if (LO < 2) { starPath(c, 0, -104, 14, 6, 5); c.fillStyle = '#fff3a8'; c.fill(); hiDot(c, -6, -112, 2.8); }
      if (LO < 2 && Math.floor(t * 2) % 2 === 0) T.em('✨', 22, -122, 18);
    } else if (k === 'rod') {   // ロッド: 木の杖 + つめで つかんだ 光る玉
      RR(c, -5, -104, 10, 132, 5, '#8a5a35', INK, 2.4); woodGrain(c, -2, -96, 24); wrapGrip(c, -16, 14, 6, col);
      circ(c, 0, -120, 15); c.fillStyle = 'rgba(160,220,255,.35)'; c.fill(); circ(c, 0, -120, 11); fillInk(c, lt(col, 0.3), 2.2); hiDot(c, -4, -124, 3);
      for (j = -1; j <= 1; j += 2) { c.beginPath(); c.moveTo(j * 4, -104); c.quadraticCurveTo(j * 16, -112, j * 9, -130); c.lineWidth = 5; c.strokeStyle = INK; c.stroke(); c.lineWidth = 3; c.strokeStyle = '#8a5a35'; c.stroke(); }
    } else if (k === 'bow') {   // 弓: まん中を にぎる。外側に 弓なり、内側に 弦
      c.beginPath(); c.moveTo(23, -80); c.quadraticCurveTo(-23, 0, 23, 80); c.lineCap = 'round'; c.lineWidth = 10; c.strokeStyle = INK; c.stroke(); c.lineWidth = 6.5; c.strokeStyle = '#b07a45'; c.stroke();
      if (!LO) { c.lineWidth = 1.5; c.strokeStyle = 'rgba(255,255,255,.5)'; c.stroke(); }
      c.beginPath(); c.moveTo(23, -80); c.lineTo(23, 80); c.lineWidth = 1.6; c.strokeStyle = '#f5e6d0'; c.stroke();
      circ(c, 23, -80, 4); fillInk(c, '#ffd84d', 1.6); circ(c, 23, 80, 4); fillInk(c, '#ffd84d', 1.6);
      wrapGrip(c, -15, 15, 5.5, col);
    } else if (k === 'whip') {   // むち: 柄 + しなる革ひも(風で ゆれる)
      var ws = Math.sin(t * 3) * 10;
      c.beginPath(); c.moveTo(0, -26); c.bezierCurveTo(-6, -74, -62 + ws, -70, -56 + ws, -26); c.quadraticCurveTo(-52 + ws, 6, -30 + ws * 1.3, 22);
      c.lineCap = 'round'; c.lineWidth = 8; c.strokeStyle = INK; c.stroke(); c.lineWidth = 5; c.strokeStyle = col; c.stroke();
      if (!LO) { c.setLineDash([3, 4]); c.lineWidth = 1.4; c.strokeStyle = 'rgba(255,255,255,.5)'; c.stroke(); c.setLineDash([]); }
      wrapGrip(c, -28, 16, 5.5, '#6b4226'); circ(c, 0, 20, 6); fillInk(c, '#c9a227', 2);
    } else if (k === 'harisen') {   // ハリセン: 紙の じゃばら + テープを まいた 持ち手
      c.beginPath(); c.moveTo(-6, -18); c.lineTo(-36, -98); c.quadraticCurveTo(0, -110, 36, -98); c.lineTo(6, -18); c.closePath(); fillInk(c, '#fff', 2.5);
      if (LO < 2) { c.save(); c.beginPath(); c.moveTo(-6, -18); c.lineTo(-36, -98); c.quadraticCurveTo(0, -110, 36, -98); c.lineTo(6, -18); c.closePath(); c.clip(); for (i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(i * 1.6, -18); c.lineTo(i * 10.5 - 4, -110); c.lineTo(i * 10.5 + 4, -110); c.lineTo(i * 1.6 + 0.8, -18); c.closePath(); c.fillStyle = 'rgba(90,61,43,.1)'; c.fill(); } c.restore(); }
      RR(c, -6.5, -20, 13, 38, 3, '#fff', INK, 2);
      if (LO < 2) { c.strokeStyle = '#e63e3e'; c.lineWidth = 3; for (i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-6, -16 + i * 9); c.lineTo(6, -11 + i * 9); c.stroke(); } }
    } else if (k === 'pan') {   // フライパン: 目玉焼き・取っ手の びょう・つるす 穴
      RR(c, -6, -46, 12, 64, 6, '#3a3a3a', INK, 2.5);
      if (LO < 2) { circ(c, 0, 12, 2.6); c.lineWidth = 1.6; c.strokeStyle = '#888'; c.stroke(); rivet(c, 0, -40, 2, '#aaa'); c.beginPath(); c.moveTo(-3.5, -30); c.lineTo(-3.5, 6); c.lineWidth = 1.2; c.strokeStyle = 'rgba(255,255,255,.3)'; c.stroke(); }
      ell(c, 0, -84, 38, 34); fillInk(c, '#4a4a4a', 3); ell(c, 0, -84, 29, 26); c.fillStyle = '#2e2e2e'; c.fill();
      c.beginPath(); c.moveTo(-16, -84); c.bezierCurveTo(-18, -100, 4, -102, 12, -94); c.bezierCurveTo(22, -86, 14, -68, 0, -70); c.bezierCurveTo(-12, -70, -14, -76, -16, -84); c.fillStyle = '#fff'; c.fill();
      circ(c, -1, -84, 7.5); c.fillStyle = '#ffc93c'; c.fill(); hiDot(c, -3.5, -86.5, 2);
      if (LO < 2) { c.beginPath(); c.arc(0, -84, 33, Math.PI * 1.1, Math.PI * 1.4); c.lineWidth = 3; c.strokeStyle = 'rgba(255,255,255,.45)'; c.stroke(); }
    } else if (k === 'broom') {   // ほうき: 細い柄・赤い しばり・わらの ほ先
      RR(c, -3.5, -82, 7, 112, 3.5, '#d9a86a', INK, 2); woodGrain(c, -1, -74, 26);
      c.beginPath(); c.moveTo(-9, -92); c.lineTo(-24, -142); c.quadraticCurveTo(0, -150, 24, -142); c.lineTo(9, -92); c.closePath(); fillInk(c, '#e8c56a', 2.4);
      if (!LO) { c.strokeStyle = 'rgba(160,110,40,.6)'; c.lineWidth = 1.2; for (i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(i * 2, -94); c.lineTo(i * 6.5, -144); c.stroke(); } }
      RR(c, -9.5, -98, 19, 14, 4, '#e63e3e', INK, 2); if (!LO) { c.beginPath(); c.moveTo(-9, -91); c.lineTo(9, -91); c.lineWidth = 1.2; c.strokeStyle = '#fff'; c.stroke(); }
    } else if (k === 'stick') {   // 高級ひのきの棒: 木目・ふし・紅白ひも・「高級」の札・切り口
      RR(c, -7, -104, 14, 128, 7, '#d9a86a', INK, 2.5); woodGrain(c, -2, -96, 18);
      if (LO < 2) { ell(c, 2, -50, 3, 5); c.lineWidth = 1.4; c.strokeStyle = 'rgba(122,74,36,.6)'; c.stroke(); ell(c, 0, 22, 6, 2.2); c.fillStyle = '#f2d2a0'; c.fill(); }
      RR(c, -8.5, -76, 17, 9, 3, '#fff', INK, 1.5);
      if (LO < 2) { c.save(); rrPath(c, -8.5, -76, 17, 9, 3); c.clip(); c.strokeStyle = '#e63e3e'; c.lineWidth = 3; for (i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(i * 5 - 4, -78); c.lineTo(i * 5 + 4, -65); c.stroke(); } c.restore(); }
      tag(c, 8, -72, 0.35, '高級', '#c0392b', 30);
    } else if (k === 'oden') {   // おでんの串: こんにゃく・たまご・だいこん・からし・湯気
      RR(c, -2.5, -130, 5, 154, 2.5, '#e8c890', INK, 1.6);
      c.beginPath(); c.moveTo(-2.5, -128); c.lineTo(0, -140); c.lineTo(2.5, -128); c.closePath(); fillInk(c, '#e8c890', 1.4);
      c.beginPath(); c.moveTo(0, -58); c.lineTo(19, -20); c.lineTo(-19, -20); c.closePath(); fillInk(c, '#8c8478', 2.4);   // こんにゃく
      if (LO < 2) {
        c.fillStyle = '#5e574d'; [[-6, -28], [5, -32], [-1, -40], [9, -24], [-10, -23], [2, -48]].forEach(function (p) { circ(c, p[0], p[1], 1.2); c.fill(); });
        ell(c, -5, -30, 6, 3.5, -0.3); c.fillStyle = '#f2c81e'; c.fill();   // からし
      }
      ell(c, 0, -74, 13.5, 16); fillInk(c, '#f0d7a4', 2.4); shine(c, -5, -80, 3.5, 6, 0.3, 0.7);   // たまご
      RR(c, -17, -120, 34, 28, 7, '#f1dfba', INK, 2.4); ell(c, 0, -120, 17, 5.5); fillInk(c, '#f8ecd2', 2);   // だいこん
      if (!LO) { c.beginPath(); c.moveTo(-8, -122); c.lineTo(8, -118); c.moveTo(8, -122); c.lineTo(-8, -118); c.lineWidth = 1.2; c.strokeStyle = 'rgba(160,110,40,.6)'; c.stroke(); c.beginPath(); c.moveTo(-13, -108); c.lineTo(13, -108); c.lineWidth = 1; c.strokeStyle = 'rgba(160,110,40,.3)'; c.stroke(); }
      if (LO < 2) for (i = 0; i < 2; i++) { var sp = (t * 0.6 + i * 0.5) % 1; c.beginPath(); c.moveTo(-6 + i * 12, -132 - sp * 10); c.quadraticCurveTo(-12 + i * 12, -142 - sp * 14, -5 + i * 12, -152 - sp * 16); c.lineWidth = 2.5; c.strokeStyle = 'rgba(255,255,255,' + (0.9 * (1 - sp)).toFixed(2) + ')'; c.stroke(); }
    } else if (k === 'leek') {   // 長ネギ: 白い根元・ひげ根・しなった 緑の葉
      if (LO < 2) { c.beginPath(); for (i = -2; i <= 2; i++) { c.moveTo(i * 2.5, 20); c.lineTo(i * 4.5, 30); } c.lineWidth = 1.4; c.strokeStyle = '#c9b58a'; c.stroke(); }
      var dr = Math.sin(t * 2) * 3;
      c.beginPath(); c.moveTo(2, -42); c.quadraticCurveTo(30, -82, 42, -78 + dr); c.quadraticCurveTo(28, -70, 7, -38); c.closePath(); fillInk(c, '#4e9e3c', 2.2);
      c.beginPath(); c.moveTo(-7, -40); c.quadraticCurveTo(-16, -82, -11, -120); c.quadraticCurveTo(-2, -82, 1, -42); c.closePath(); fillInk(c, '#5fb84e', 2.2);
      c.beginPath(); c.moveTo(-3, -42); c.quadraticCurveTo(3, -88, 1, -130); c.quadraticCurveTo(10, -88, 7, -40); c.closePath(); fillInk(c, '#7bc95a', 2.2);
      if (!LO) { c.beginPath(); c.moveTo(-8, -50); c.quadraticCurveTo(-11, -84, -10, -110); c.moveTo(3, -52); c.quadraticCurveTo(5, -90, 3, -120); c.lineWidth = 1.2; c.strokeStyle = 'rgba(255,255,255,.45)'; c.stroke(); }
      RR(c, -8.5, -46, 17, 68, 8, '#fbfbf2', INK, 2.2);
      RR(c, -7, -45, 14, 20, 6, '#d9efb0');
      if (!LO) { c.beginPath(); c.moveTo(-3, -20); c.lineTo(-3, 16); c.moveTo(3, -24); c.lineTo(3, 14); c.lineWidth = 1.2; c.strokeStyle = 'rgba(150,170,120,.5)'; c.stroke(); }
    } else if (k === 'umbrella') {   // ぬれたかさ: J の持ち手・たたんだ布・留めひも・しずく
      c.beginPath(); c.moveTo(0, -6); c.lineTo(0, 14); c.quadraticCurveTo(0, 31, 13, 31); c.quadraticCurveTo(25, 31, 25, 18);
      c.lineCap = 'round'; c.lineWidth = 10; c.strokeStyle = INK; c.stroke(); c.lineWidth = 6.5; c.strokeStyle = '#8a5a2b'; c.stroke();
      if (!LO) { c.lineWidth = 1.5; c.strokeStyle = 'rgba(255,255,255,.4)'; c.stroke(); }
      RR(c, -2, -30, 4, 26, 2, '#cfd8e0', INK, 1.4);
      c.beginPath(); c.moveTo(-5, -28); c.quadraticCurveTo(-17, -62, -3, -106); c.lineTo(3, -106); c.quadraticCurveTo(17, -62, 5, -28); c.closePath(); fillInk(c, col, 2.4);
      if (LO < 2) { c.beginPath(); c.moveTo(0, -30); c.quadraticCurveTo(-4, -70, 0, -104); c.moveTo(4, -32); c.quadraticCurveTo(10, -62, 2, -100); c.lineWidth = 1.4; c.strokeStyle = dk(col, 0.3); c.stroke(); }
      RR(c, -12, -66, 24, 7, 3, dk(col, 0.25), INK, 1.6); circ(c, 8, -62.5, 2); c.fillStyle = '#fff'; c.fill();
      RR(c, -1.8, -116, 3.6, 12, 1.5, '#cfd8e0', INK, 1.2);
      if (LO < 2) {
        shine(c, -6, -80, 2, 6, 0.1, 0.8); shine(c, 5, -50, 1.6, 4, -0.1, 0.8);
        for (i = 0; i < 2; i++) { var dp = (t * 1.3 + i * 0.5) % 1; x = -6 + i * 12; y = -26 + dp * 34; c.globalAlpha = 1 - dp; c.beginPath(); c.moveTo(x, y - 6); c.quadraticCurveTo(x + 4, y + 1, x, y + 3); c.quadraticCurveTo(x - 4, y + 1, x, y - 6); c.fillStyle = '#8fd3ff'; c.fill(); c.lineWidth = 1; c.strokeStyle = INK; c.stroke(); c.globalAlpha = 1; }
      }
    } else if (k === 'phone') {   // スマホ: 画面のアプリ・でんち 23%・ケースから はみ出た カード
      RR(c, 4, -80, 22, 14, 2, '#ffd84d', INK, 1.5); if (!LO) { c.fillStyle = '#d9a400'; c.fillRect(8, -76, 6, 4); }
      RR(c, -17, -72, 34, 70, 7, '#222', INK, 2.5);
      if (LO === 2) { RR(c, -14, -67, 28, 56, 3, '#4f8fe0'); }
      else {
        var sg = c.createLinearGradient(0, -67, 0, -11); sg.addColorStop(0, '#3a7bd5'); sg.addColorStop(1, '#8fd3ff'); RR(c, -14, -67, 28, 56, 3, sg);
        var ac = ['#ff8fc8', '#ffd84d', '#9be38a', '#ffb35c', '#ffffff', '#e63e3e', '#8fd3ff', '#c39bff', '#5fb84e'];
        for (i = 0; i < 9; i++) RR(c, -10.5 + (i % 3) * 8, -56 + Math.floor(i / 3) * 9, 5.5, 5.5, 1.5, ac[i]);
        if (!LO) { RR(c, 5, -64.5, 7, 3.5, 1, null, '#fff', 0.8); c.fillStyle = '#e63e3e'; c.fillRect(5.6, -63.9, 1.6, 2.3); TX(c, '23%', -4, -63, 4.5, '#fff', 'center', 900, null); }
        c.fillStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.moveTo(-14, -40); c.lineTo(4, -67); c.lineTo(12, -67); c.lineTo(-14, -28); c.closePath(); c.fill();
      }
      circ(c, 0, -69.5, 1.2); c.fillStyle = '#555'; c.fill();
    } else if (k === 'bills') {   // 札束: 何枚も 重なった お札 + 帯 + はみ出した札
      for (j = -1; j <= 1; j += 2) { c.save(); c.translate(0, -8); c.rotate(j * 0.16); RR(c, -16, -72, 32, 66, 3, '#dfeccc', INK, 1.6); c.restore(); }
      RR(c, -15, -78, 34, 74, 3, '#cfe0b4', INK, 1.5);
      RR(c, -17, -80, 34, 74, 3, '#eaf4da', INK, 2);
      if (LO < 2) {
        ell(c, 0, -56, 7, 9); c.lineWidth = 1.4; c.strokeStyle = '#7cb86a'; c.stroke();
        c.beginPath(); c.moveTo(13, -78); c.lineTo(13, -8); c.lineWidth = 1; c.strokeStyle = 'rgba(90,61,43,.3)'; c.stroke();
        if (!LO) { TX(c, '¥', -10, -73, 7, '#5e9a4c', 'center', 900, null); TX(c, '¥', 10, -14, 7, '#5e9a4c', 'center', 900, null); }
      }
      RR(c, -18, -40, 36, 11, 1.5, '#fff', INK, 1.5); if (!LO) TX(c, '100万', 0, -34.2, 6.5, '#c0392b', 'center', 900, null);
    } else if (k === 'duck') {   // ゴムのアヒル: おなかを にぎると「ピュ」
      ell(c, -2, -14, 21, 15); fillInk(c, col, 2.4);
      c.beginPath(); c.moveTo(-20, -18); c.lineTo(-28, -30); c.lineTo(-16, -26); c.closePath(); fillInk(c, col, 2);
      circ(c, 6, -36, 12.5); fillInk(c, col, 2.4);
      ell(c, 19, -33, 8, 4.2); fillInk(c, '#ff8a3d', 2);
      circ(c, 9, -39, 2.4); c.fillStyle = INK; c.fill(); hiDot(c, 8.2, -40, 0.9);
      if (LO < 2) { c.beginPath(); c.arc(-6, -16, 9, 0.2, 2.2); c.lineWidth = 1.8; c.strokeStyle = dk(col, 0.25); c.stroke(); shine(c, 0, -42, 4, 2, -0.4, 0.8); }
      if (!LO && Math.floor(t * 1.5) % 3 === 0) TX(c, 'ピュ', 30, -52, 10, '#e0609f', 'center', 900, '#fff');
    } else if (k === 'homework') {   // 宿題: ノートの 下を つまんで 持つ(らくがき・やり直しの はんこ)
      RR(c, -22, -84, 48, 74, 4, '#3b6fd8', INK, 2);
      RR(c, -25, -86, 48, 74, 4, '#fffdf4', INK, 2.2);
      RR(c, -25, -86, 48, 15, 4, '#4fa8d8', INK, 1.8);
      if (!LO) {
        TX(c, 'しゅくだい', -1, -78.5, 7.5, '#fff', 'center', 900, null);
        c.strokeStyle = '#c8d8ec'; c.lineWidth = 1; for (y = -64; y < -14; y += 7) { c.beginPath(); c.moveTo(-21, y); c.lineTo(19, y); c.stroke(); }
        circ(c, -8, -46, 7); c.lineWidth = 1.4; c.strokeStyle = '#555'; c.stroke(); circ(c, -10.5, -47, 1); c.fillStyle = '#555'; c.fill(); circ(c, -5.5, -47, 1); c.fill();
        circ(c, 10, -30, 6); c.lineWidth = 1.6; c.strokeStyle = '#e63e3e'; c.stroke(); TX(c, '?', 10, -29.5, 7, '#e63e3e', 'center', 900, null);
      }
    } else if (k === 'plush') {
      T.em(s.em, 0, -30, 60);
    } else if (k === 'bento') {   // ママの愛妻弁当: ふろしきの 結び目を にぎって ぶらさげる
      var dots = function () { if (LO) return; c.fillStyle = 'rgba(255,255,255,.85)'; for (y = 22; y < 64; y += 9) for (x = -30 + ((y / 9) % 2) * 5; x < 32; x += 10) { circ(c, x, y, 1.8); c.fill(); } };
      c.beginPath(); c.moveTo(-5, 10); c.lineTo(-35, 24); c.lineTo(-35, 60); c.quadraticCurveTo(0, 68, 35, 60); c.lineTo(35, 24); c.lineTo(5, 10); c.closePath(); fillInk(c, col, 2.5);
      c.save(); c.clip(); dots(); c.fillStyle = 'rgba(70,35,15,.15)'; c.fillRect(-40, 46, 80, 30); c.restore();
      if (LO < 2) {
        c.beginPath(); c.moveTo(-3, 12); c.quadraticCurveTo(-20, 22, -30, 26); c.moveTo(3, 12); c.quadraticCurveTo(20, 22, 30, 26); c.lineWidth = 1.6; c.strokeStyle = dk(col, 0.3); c.stroke();
        c.beginPath(); c.moveTo(18, 26); c.lineTo(30, -4); c.moveTo(23, 27); c.lineTo(35, -3); c.lineWidth = 4; c.strokeStyle = INK; c.stroke(); c.lineWidth = 2.2; c.strokeStyle = '#c8915a'; c.stroke();   // おはし
        heart(c, 0, 42, 7, '#fff'); if (!LO) TX(c, 'ママ', 0, 41, 5.5, col, 'center', 900, null);
      }
      for (j = -1; j <= 1; j += 2) { ell(c, j * 10, -17, 8.5, 6, j * 0.7); fillInk(c, col, 2.2); }   // 結び目の 耳(手の上に 出る)
    } else {
      T.em(s.em, 0, -26, 62);
    }
  }
  function shieldPath(c, w, h) { c.beginPath(); c.moveTo(-w, -h); c.lineTo(w, -h); c.lineTo(w, -h * 0.1); c.quadraticCurveTo(w * 0.9, h * 0.7, 0, h); c.quadraticCurveTo(-w * 0.9, h * 0.7, -w, -h * 0.1); c.closePath(); }
  function drawShield(c, T, s, t, f) {
    var k = s.t, col = s.col, i;
    if (k === 'cardboard') {   // 段ボールの盾: ガムテープ・へこみ・天地無用の矢印
      RR(c, -34, -38, 68, 76, 5, '#c9a066', INK, 3);
      c.beginPath(); c.moveTo(-34, -22); c.lineTo(34, -22); c.lineWidth = 2; c.strokeStyle = 'rgba(90,61,43,.4)'; c.stroke();
      c.fillStyle = 'rgba(245,228,180,.9)'; c.fillRect(-33, -6, 66, 14);
      if (LO < 2) { c.save(); c.translate(-20, -30); c.rotate(-0.5); c.fillStyle = 'rgba(150,120,80,.55)'; c.fillRect(-14, -4, 28, 8); c.restore(); }
      if (!LO) { c.beginPath(); c.moveTo(18, -30); c.lineTo(24, -26); c.lineTo(20, -20); c.lineWidth = 1.4; c.strokeStyle = 'rgba(90,61,43,.5)'; c.stroke(); c.beginPath(); c.moveTo(24, 12); c.lineTo(24, 2); c.moveTo(21, 5); c.lineTo(24, 1); c.lineTo(27, 5); c.lineWidth = 1.6; c.stroke(); }
      TX(c, 'たて', 0, 22, 17, INK, 'center', 900, null);
    } else if (k === 'lid') {   // 高級なべのふた: 前の つまみを こぶしで にぎる
      circ(c, 0, 0, 39); fillInk(c, '#a7b0b8', 3); circ(c, 0, 0, 29); c.lineWidth = 3; c.strokeStyle = 'rgba(255,255,255,.7)'; c.stroke();
      if (LO < 2) { circ(c, 0, 0, 35); c.lineWidth = 1.2; c.strokeStyle = 'rgba(90,61,43,.35)'; c.stroke(); circ(c, 22, -16, 2.2); c.fillStyle = '#5d656c'; c.fill(); }   // 湯気の 穴
      shine(c, -15, -19, 10, 4.5, -0.6, 0.7);
      if (!LO) { circ(c, -22, 16, 8); fillInk(c, '#ffd84d', 1.4); TX(c, '高級', -22, 16.5, 6, '#c0392b', 'center', 900, null); }
      palmBack(c, 0, 0, f);
      RR(c, -11, -6, 22, 12, 6, '#ffd84d', INK, 2.5);
      fingersFront(c, 0, 0, f);
    } else if (k === 'pizza') {
      RR(c, -37, -35, 74, 70, 6, '#f0d3a0', INK, 3);
      if (LO < 2) { c.beginPath(); c.moveTo(-37, -26); c.lineTo(37, -26); c.lineWidth = 1.5; c.strokeStyle = 'rgba(90,61,43,.35)'; c.stroke(); ell(c, 22, 18, 6, 4, 0.3); c.fillStyle = 'rgba(200,120,40,.3)'; c.fill(); }   // ふたの線・油じみ
      circ(c, 0, -4, 20); fillInk(c, '#e63e3e', 2.5); T.em('🍕', 0, -3, 26);
      if (!LO) TX(c, 'PIZZA', 0, 25, 11, '#e63e3e', 'center', 900, null);
    } else if (k === 'woodshield') {   // シールつきの盾: 鉄のふち・びょう・シールが いっぱい
      shieldPath(c, 34, 42); fillInk(c, '#c08a50', 3);
      c.save(); shieldPath(c, 34, 42); c.clip(); c.strokeStyle = 'rgba(90,61,43,.45)'; c.lineWidth = 2; c.beginPath(); c.moveTo(-12, -44); c.lineTo(-12, 44); c.moveTo(12, -44); c.lineTo(12, 44); c.stroke();
      shieldPath(c, 34, 42); c.lineWidth = 10; c.strokeStyle = '#8d959c'; c.stroke(); c.restore(); shieldPath(c, 34, 42); ink(c, 3);
      rivet(c, -26, -34, 2.2, '#cfd8e0'); rivet(c, 26, -34, 2.2, '#cfd8e0'); rivet(c, 0, 36, 2.2, '#cfd8e0');
      starPath(c, 10, -12, 13, 5.5, 5); fillInk(c, '#ffd84d', 2); heart(c, -13, 10, 8, '#ff8fc8');
      if (LO < 2) { circ(c, -14, -18, 7); fillInk(c, '#8fd3ff', 1.5); circ(c, 12, 16, 6.5); fillInk(c, '#9be38a', 1.5); hiDot(c, 7, -17, 1.8); }
      if (!LO) { TX(c, '★', -14, -17.5, 8, '#fff', 'center', 900, null); TX(c, 'GOOD', 12, 16.5, 4.5, INK, 'center', 900, null); }
    } else if (k === 'randoseru') {   // ランドセル: かぶせ・金具・名札・ぬい目
      RR(c, -34, -40, 68, 82, 18, col, INK, 3);
      if (!LO) { rrPath(c, -30, -36, 60, 74, 15); stitch(c, 'rgba(255,255,255,.5)', 1.2); }
      c.beginPath(); c.moveTo(-34, -24); c.lineTo(34, -24); c.lineTo(34, 8); c.quadraticCurveTo(34, 24, 20, 24); c.lineTo(-20, 24); c.quadraticCurveTo(-34, 24, -34, 8); c.closePath(); fillInk(c, dk(col, 0.15), 2.5);
      RR(c, -7, 17, 14, 12, 3, '#ffd84d', INK, 2); hiDot(c, -3, 20, 1.5); shine(c, -20, -32, 8, 3, 0, 0.6);
      if (LO < 2) { RR(c, -16, -18, 32, 16, 2, '#fff', INK, 1.5); if (!LO) TX(c, 'へっぽこ', 0, -9.5, 6, INK, 'center', 900, null); }
      if (LO < 2) RR(c, -30, 30, 60, 5, 2, '#ffd84d');   // 反射テープ
    } else if (k === 'manhole') {   // マンホールのふた: もよう・町の しるし・持ち上げる 穴
      circ(c, 0, 0, 42); fillInk(c, '#5e5e5e', 3);
      if (LO < 2) { c.save(); circ(c, 0, 0, 35); c.clip(); c.strokeStyle = '#7d7d7d'; c.lineWidth = 3;
        for (i = -60; i <= 60; i += 12) { c.beginPath(); c.moveTo(i - 40, -40); c.lineTo(i + 40, 40); c.moveTo(i + 40, -40); c.lineTo(i - 40, 40); c.stroke(); } c.restore(); }
      circ(c, 0, 0, 35); c.lineWidth = 3; c.strokeStyle = '#3e3e3e'; c.stroke(); circ(c, 0, 0, 13); fillInk(c, '#6e6e6e', 2);
      if (!LO) { TX(c, '下水', 0, 0.5, 9, '#bbb', 'center', 900, null); circ(c, -26, 0, 2.5); c.fillStyle = '#2e2e2e'; c.fill(); circ(c, 26, 0, 2.5); c.fill(); }
      shine(c, -20, -24, 9, 3, -0.6, 0.35);
    } else if (k === 'heroshield') {   // 勇者の盾: 金のふち・びょう・十字・宝石
      shieldPath(c, 40, 47); fillInk(c, '#2e6fd8', 3);
      c.save(); shieldPath(c, 40, 47); c.clip(); shieldPath(c, 40, 47); c.lineWidth = 12; c.strokeStyle = '#ffd84d'; c.stroke();
      if (LO < 2) { c.fillStyle = 'rgba(255,255,255,.15)'; c.fillRect(-40, -47, 40, 100); }
      c.restore(); shieldPath(c, 40, 47); ink(c, 3);
      for (i = 0; i < 5; i++) rivet(c, -30 + i * 15, -41, 2, '#fff6b0');
      RR(c, -5, -28, 10, 50, 3, '#ffd84d', INK, 2); RR(c, -20, -14, 40, 10, 3, '#ffd84d', INK, 2);
      circ(c, 0, -9, 6); fillInk(c, '#e63e3e', 2); hiDot(c, -2, -11, 1.8); shine(c, -20, -30, 8, 3, -0.4, 0.6);
      if (!LO) { circ(c, -26, 20, 3.5); fillInk(c, '#9be38a', 1.2); circ(c, 26, 20, 3.5); fillInk(c, '#9be38a', 1.2); }
    }
  }
  /* ゆびわ(左手)。h = 手、sh = 肩 */
  function drawRing(c, T, s, t, h, sh) {
    var k = s.t, col = s.col, wx = sh.x + (h.x - sh.x) * 0.8, wy = sh.y + (h.y - sh.y) * 0.8, ang = Math.atan2(h.y - sh.y, h.x - sh.x) - Math.PI / 2;
    if (k === 'watch') {
      c.save(); c.translate(wx, wy); c.rotate(ang); RR(c, -14, -6, 28, 12, 4, '#2d3436', INK, 2); RR(c, -9, -9, 18, 18, 4, '#2d3436', INK, 2);
      RR(c, -6, -6, 12, 12, 3, Math.floor(t * 2) % 2 ? '#4fd1c5' : '#7dffb0');
      if (!LO) { heart(c, 0, 0, 2.8, '#e63e3e'); c.beginPath(); c.moveTo(-5, 3); c.lineTo(-2, 3); c.lineTo(-1, 0); c.lineTo(1, 5); c.lineTo(2, 3); c.lineTo(5, 3); c.lineWidth = 0.9; c.strokeStyle = '#2d3436'; c.stroke(); }
      c.restore();
    } else if (k === 'bracelet') {
      T.em(s.em, wx, wy, 30);
    } else if (k === 'band') {
      c.save(); c.translate(wx, wy); c.rotate(ang); ell(c, 0, 0, 14, 4); c.lineWidth = 3.5; c.strokeStyle = col; c.stroke(); c.restore();
    } else if (k === 'dangle') {
      c.beginPath(); c.moveTo(h.x + 2, h.y + 8); c.lineTo(h.x + 7, h.y + 22); c.lineWidth = 2; c.strokeStyle = INK; c.stroke(); T.em(s.em, h.x + 9, h.y + 31, 22);
    } else {
      var gx = h.x + 2, gy = h.y + 4, r = s.big ? 9 : s.toy ? 7.5 : 5.5;
      var gc = s.mood ? 'hsl(' + Math.round((t * 60) % 360) + ',80%,60%)' : col;   // 気分の指輪: 色が かわりつづける
      ell(c, gx, gy + 4, 9, 4.5); c.lineWidth = 6; c.strokeStyle = INK; c.stroke(); c.lineWidth = 3.5; c.strokeStyle = k === 'washer' ? '#aab3bb' : s.toy ? '#ff8fc8' : '#ffd84d'; c.stroke();
      if (k !== 'washer') {
        if (s.glow) { circ(c, gx, gy - 2, s.big ? 18 : 12); c.fillStyle = 'rgba(255,255,255,' + (0.35 + 0.25 * Math.sin(t * 5)).toFixed(3) + ')'; c.fill(); }
        if (s.toy) { heart(c, gx, gy - 3, r * 0.9, INK); heart(c, gx, gy - 3, r * 0.7, gc); hiDot(c, gx - 2, gy - 5, 1.4); }
        else {
          c.beginPath(); c.moveTo(gx, gy - 2 - r); c.lineTo(gx + r, gy - 2); c.lineTo(gx, gy - 2 + r); c.lineTo(gx - r, gy - 2); c.closePath(); fillInk(c, gc, 2);
          if (LO < 2) { c.beginPath(); c.moveTo(gx - r * 0.5, gy - 2 - r * 0.5); c.lineTo(gx + r * 0.5, gy - 2 + r * 0.5); c.moveTo(gx, gy - 2 - r); c.lineTo(gx, gy - 2 + r); c.lineWidth = 1; c.strokeStyle = 'rgba(255,255,255,.7)'; c.stroke(); }
        }
        if (LO < 2 && Math.floor(t * 2) % 2 === 0) T.em('✨', gx + 14, gy - 12, s.big ? 20 : 16);
      } else if (!LO) { circ(c, gx, gy + 4, 3); c.lineWidth = 1; c.strokeStyle = '#6d767e'; c.stroke(); }
    }
  }
  /* おまもり(首から下げる) */
  function drawCharm(c, T, s, t) {
    var k = s.t, i;
    if (k === 'receipt') {   // むねのポケットから ながーいレシートが たれている
      c.beginPath(); c.moveTo(218, 352);
      for (i = 1; i <= 10; i++) c.lineTo(218 + Math.sin(i * 0.9 + t * 2) * 5 + i * 2, 352 + i * 12);
      c.lineCap = 'butt'; c.lineWidth = 19; c.strokeStyle = INK; c.stroke(); c.lineWidth = 15; c.strokeStyle = '#fff'; c.stroke();
      if (LO < 2) { c.setLineDash([6, 6]); c.lineWidth = 2; c.strokeStyle = '#b0a59a'; c.stroke(); c.setLineDash([]); }
      c.lineCap = 'round';
      RR(c, 204, 344, 30, 18, 4, 'rgba(255,255,255,.35)', INK, 2);
      return;
    }
    c.beginPath(); c.moveTo(168, 318); c.lineTo(195, 362); c.lineTo(222, 318); c.lineWidth = 2.5; c.strokeStyle = INK; c.stroke();
    c.save(); c.translate(195, 362); c.rotate(Math.sin(t * 2) * 0.08);
    circ(c, 0, 14, 19 + Math.sin(t * 4) * 2); c.fillStyle = 'rgba(255,240,160,.6)'; c.fill();
    if (k === 'omamori') {
      RR(c, -12, 0, 24, 32, 5, '#e63e3e', INK, 2.5); circ(c, 0, 1, 5); fillInk(c, '#ffd84d', 2);
      if (!LO) { rrPath(c, -9, 6, 18, 23, 3); stitch(c, '#ffd84d', 1.1); }
      TX(c, '守', 0, 19, 14, '#ffd84d', 'center', 900, null);
    } else if (k === 'bell') {   // 金の すず
      circ(c, 0, -1, 3.5); c.lineWidth = 2; c.strokeStyle = INK; c.stroke();
      circ(c, 0, 15, 14); var bg = LO === 2 ? '#ffd84d' : c.createRadialGradient(-5, 9, 2, 0, 15, 15); if (LO !== 2) { bg.addColorStop(0, '#fff6b0'); bg.addColorStop(0.6, '#ffd84d'); bg.addColorStop(1, '#d9a400'); } fillInk(c, bg, 2.5);
      c.beginPath(); c.moveTo(-13, 12); c.quadraticCurveTo(0, 16, 13, 12); c.lineWidth = 2; c.strokeStyle = '#b8860b'; c.stroke();
      circ(c, 0, 20, 2.6); c.fillStyle = INK; c.fill(); c.beginPath(); c.moveTo(0, 21); c.lineTo(0, 27); c.lineWidth = 2; c.strokeStyle = INK; c.stroke();
      hiDot(c, -5, 9, 2.6);
    } else if (k === 'bill') {   // しわくちゃの 千円札
      c.save(); c.rotate(-0.12);
      c.beginPath(); c.moveTo(-20, 2); c.lineTo(-6, 0); c.lineTo(4, 3); c.lineTo(20, 0); c.lineTo(19, 14); c.lineTo(21, 26); c.lineTo(6, 28); c.lineTo(-8, 25); c.lineTo(-21, 27); c.lineTo(-19, 14); c.closePath(); fillInk(c, '#cfe6f0', 2);
      if (LO < 2) { c.beginPath(); c.moveTo(-6, 0); c.lineTo(-4, 26); c.moveTo(4, 3); c.lineTo(7, 28); c.moveTo(-20, 13); c.lineTo(20, 15); c.lineWidth = 1.2; c.strokeStyle = 'rgba(90,61,43,.35)'; c.stroke(); }
      if (!LO) { TX(c, '千', -11, 8.5, 7, '#3b6fd8', 'center', 900, null); ell(c, 9, 15, 5, 6); c.lineWidth = 1.2; c.strokeStyle = '#3b6fd8'; c.stroke(); }
      c.restore();
    } else if (k === 'clover') {   // 四つ葉の クローバー(ラミネート)
      RR(c, -16, -1, 32, 34, 5, 'rgba(255,255,255,.7)', INK, 2);
      c.beginPath(); c.moveTo(2, 18); c.quadraticCurveTo(6, 26, 4, 30); c.lineWidth = 2.2; c.strokeStyle = '#3c8a32'; c.stroke();
      for (i = 0; i < 4; i++) { c.save(); c.translate(0, 15); c.rotate(i * Math.PI / 2 + 0.2); heart(c, 0, -6.5, 5.2, '#4fae45'); c.restore(); }
      circ(c, 0, 15, 2); c.fillStyle = '#2f7a2a'; c.fill();
      shine(c, -9, 4, 6, 2, -0.5, 0.8);
    } else if (k === 'dumbbell') {   // ダンベル(首から ぶらさげて 重そう)
      RR(c, -16, 13, 32, 6, 2, '#9aa3ab', INK, 2);
      for (i = -1; i <= 1; i += 2) { RR(c, i * 17 - 6, 4, 12, 24, 3, '#3a3a3a', INK, 2.2); RR(c, i * 24 - 3, 7, 6, 18, 2, '#555', INK, 1.8); }
      if (!LO) TX(c, '10kg', 0, 30, 6, INK, 'center', 900, null);
      shine(c, -17, 9, 2, 5, 0, 0.5);
    } else if (k === 'daruma') {   // だるま: 片方の目だけ 入っている
      ell(c, 0, 16, 15, 16); fillInk(c, '#e63e3e', 2.5);
      ell(c, 0, 12, 9.5, 8.5); fillInk(c, '#ffe4c8', 1.6);
      if (LO < 2) {
        circ(c, -4, 11, 3.2); c.lineWidth = 1.2; c.strokeStyle = INK; c.stroke(); circ(c, -4, 11, 1.6); c.fillStyle = INK; c.fill();
        circ(c, 4, 11, 3.2); c.stroke();
        c.beginPath(); c.moveTo(-6, 5.5); c.lineTo(-2, 6.5); c.moveTo(6, 5.5); c.lineTo(2, 6.5); c.stroke();
        c.beginPath(); c.moveTo(-8, 25); c.quadraticCurveTo(0, 31, 8, 25); c.lineWidth = 1.6; c.strokeStyle = '#ffd84d'; c.stroke();
        hiDot(c, -9, 6, 2);
      }
    } else if (k === 'stone') {   // まほうの石: 光る むらさきの 結晶
      circ(c, 0, 14, 22 + Math.sin(t * 3) * 3); c.fillStyle = 'rgba(200,150,255,.35)'; c.fill();
      c.beginPath(); c.moveTo(0, -2); c.lineTo(12, 8); c.lineTo(9, 26); c.lineTo(-9, 26); c.lineTo(-12, 8); c.closePath(); fillInk(c, s.col, 2.4);
      if (LO < 2) { c.beginPath(); c.moveTo(0, -2); c.lineTo(-3, 26); c.moveTo(-12, 8); c.lineTo(12, 8); c.lineWidth = 1.2; c.strokeStyle = 'rgba(255,255,255,.55)'; c.stroke(); c.beginPath(); c.moveTo(0, -2); c.lineTo(-12, 8); c.lineTo(-3, 26); c.lineTo(-9, 26); c.closePath(); c.fillStyle = 'rgba(255,255,255,.25)'; c.fill(); }
      if (LO < 2 && Math.floor(t * 2) % 2 === 0) T.em('✨', 14, 0, 14);
    } else if (k === 'poop') {   // 金のうんち: ぐるぐる 3 段 + きらきら
      var pg = LO === 2 ? '#ffd84d' : c.createLinearGradient(-16, 0, 16, 30); if (LO !== 2) { pg.addColorStop(0, '#fff6b0'); pg.addColorStop(0.5, '#ffd84d'); pg.addColorStop(1, '#c99400'); }
      ell(c, 0, 24, 17, 7); fillInk(c, pg, 2.2); ell(c, 0, 15, 12.5, 6); fillInk(c, pg, 2.2); ell(c, 0, 7, 8, 5); fillInk(c, pg, 2.2);
      c.beginPath(); c.moveTo(-3, 3); c.quadraticCurveTo(2, -6, 4, -1); c.lineTo(3, 4); c.closePath(); fillInk(c, pg, 2);
      hiDot(c, -4, 5, 1.8); hiDot(c, -7, 13, 2); hiDot(c, -10, 22, 2.2);
      if (LO < 2 && Math.floor(t * 2) % 2 === 1) T.em('✨', -16, 4, 14);
    } else T.em(s.em, 0, 15, 30);
    c.restore();
  }

  /* ---------- 人形本体 ---------- */
  function drawDoll(T, cx, cy, scale, opts) {
    opts = opts || {};
    var c = T.c, eq = curEquip(opts);
    var t = opts.t !== undefined ? opts.t : (typeof G !== 'undefined' ? G.t : 0);
    var poseName = opts.pose || 'normal', pose = POSES[poseName] || POSES.normal;
    var face = opts.face || pose.face;
    var breath = pose === POSES.normal ? Math.sin(t * Math.PI) * 4 : 0;   // 2 秒周期で上下 4px
    var pop = opts.pop || null;                                             // { slot, k } その部位だけ大きさを掛けて光らせる(お披露目)
    LO = scale < 0.2 ? 2 : scale < 0.36 ? 1 : 0;                            // 小さい人形は 細かい線を省く(つぶれて汚くならない・軽い)
    function popOn(slot, ax, ay) {     // 必ず c.restore() と組で使う
      c.save();
      if (pop && pop.slot === slot) { c.translate(ax, ay); c.scale(pop.k, pop.k); c.translate(-ax, -ay); c.shadowColor = 'rgba(255,255,255,.95)'; c.shadowBlur = 16; }
    }
    function dotted(x, y, r) {        // 何も付けていない部位: うす灰色の点線の丸
      if (opts.noEmpty) return;
      c.save(); c.setLineDash([5, 5]); c.strokeStyle = 'rgba(27,20,48,.25)'; c.lineWidth = 2.5;
      c.beginPath(); c.arc(x, y, r || 22, 0, TAU); c.stroke(); c.restore();
    }
    var S = {}, slots = ['body', 'head', 'face', 'cape', 'waist', 'feet', 'rhand', 'lhand', 'ring', 'charm'], si;
    for (si = 0; si < slots.length; si++) S[slots[si]] = styleOf(eq, slots[si]);
    var WF = waistFrame(S.body);
    /* 腕の角度。両手持ちの大きい武器で 左手が空いていれば、両手で 体の前に ななめに かまえる */
    var rTh = pose.rArm, lTh = pose.lArm, wR = S.rhand && !SHIELDS[S.rhand.t] ? (WEAP[S.rhand.t] || WEAP.emoji) : null;
    var twoH = !!(wR && wR.two && !S.lhand && (poseName === 'normal' || poseName === 'smug'));
    if (twoH) { rTh = -0.9; lTh = -0.3; }
    var gripR = !!wR, gripL = !!(S.lhand && !SHIELDS[S.lhand.t]) || twoH;

    c.save();
    c.translate(cx, cy); c.scale(scale, scale); c.translate(-CX, -CY);

    /* 影(地面に固定。ジャンプでは小さく、寝ポーズでは横長) */
    c.fillStyle = 'rgba(0,0,0,.22)'; c.beginPath(); c.ellipse(195, pose.lie ? 512 : 540, pose.shadow, 14, 0, 0, TAU); c.fill();

    if (pose.lie) {   // 寝ポーズ: 💤 を出してから、人形ごと横に倒す(頭が画面の左)。写真の赤い帯に足がかからないよう 下げすぎない
      T.em('💤', 90 + Math.sin(t * 2) * 4, 380 - (t * 20 % 30), 40, 0.9);
      T.em('💤', 130, 352 - (t * 14 % 24), 26, 0.6);
      c.translate(0, 105); c.translate(195, 345); c.rotate(-Math.PI / 2 + 0.1); c.translate(-195, -345);
    }
    c.translate(0, pose.dy + breath);
    function bodyFrame() { c.translate(195, 445); c.rotate(pose.body); c.translate(-195, -445); }

    /* 1 マント(いちばん後ろ)。上半身といっしょに傾き、首を原点に風で揺れる */
    if (S.cape) {
      c.save(); bodyFrame(); c.translate(NECK.x, NECK.y); c.rotate(Math.sin(t * 1.3) * 0.035 + pose.cape * 0.6); c.translate(-NECK.x, -NECK.y);
      popOn('cape', 195, 360); drawCapeBack(c, T, S.cape, t); c.restore();
      c.restore();
    } else dotted(SLOT_POS.cape[0], SLOT_POS.cape[1]);

    /* 2 足(股関節を原点に回す。靴下・靴は足の変換の中) */
    function leg(sd, th) {   // sd = -1 右足(画面左) / +1 左足(画面右)
      c.save(); c.translate(195 + sd * HIP.dx, HIP.y); c.rotate(-sd * th);
      RR(c, -13, -8, 26, LEG_LEN + 8, 11, SKIN);                           // 肌
      RR(c, -14, LEG_LEN - 22, 28, 24, 6, SOCK, SKIN_EDGE, 1.5);            // 白い靴下
      if (!LO) { c.beginPath(); c.moveTo(-13, LEG_LEN - 16); c.lineTo(13, LEG_LEN - 16); c.moveTo(-13, LEG_LEN - 12.5); c.lineTo(13, LEG_LEN - 12.5); c.lineWidth = 1; c.strokeStyle = 'rgba(224,169,122,.6)'; c.stroke(); }   // 靴下の ゴム
      if (S.body && S.body.t === 'pajama') {                               // パジャマのズボン
        RR(c, -15, -10, 30, LEG_LEN - 6, 10, S.body.col, INK, 2.5);
        c.fillStyle = 'rgba(255,255,255,.7)'; circ(c, -5, 14, 3.5); c.fill(); circ(c, 6, 30, 3.5); c.fill();
        if (!LO) { c.beginPath(); c.moveTo(-14, LEG_LEN - 22); c.lineTo(14, LEG_LEN - 22); stitch(c, '#fff', 1.1); }
      }
      if (S.feet) { popOn('feet', 0, LEG_LEN + 8); drawFoot(c, T, S.feet, sd, t); c.restore(); }
      else {   // 赤い靴(つま先は少し外側へ。底と ベルト)
        if (LO < 2) RR(c, -19 + sd * 3, LEG_LEN + 12, 38, 8, 3, '#8a1f1f', SHOE_EDGE, 1.5);
        RR(c, -18 + sd * 3, LEG_LEN - 2, 36, 22, 9, SHOE, SHOE_EDGE, 2);
        if (LO < 2) { RR(c, -12 + sd * 3, LEG_LEN + 1, 24, 5, 2, SHOE_EDGE); circ(c, sd * 9, LEG_LEN + 3.5, 1.8); c.fillStyle = '#ffd84d'; c.fill(); }
        c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(sd * 4, LEG_LEN + 9, 7, 3, 0, 0, TAU); c.fill();   // つやの光
      }
      c.restore();
    }
    leg(-1, pose.rLeg); leg(1, pose.lLeg);

    /* 上半身(腰を原点に傾く) */
    c.save(); bodyFrame();

    /* 3 体 + 服(浮き輪は 後ろ半分を先に描く) */
    if (S.waist && S.waist.t === 'tube') { popOn('waist', 195, WF.y); drawTube(c, S.waist, false, WF); c.restore(); }
    popOn('body', 195, 382); drawBodyWear(c, T, S.body, t); c.restore();
    /* 4 腰(服の形に合わせて 巻く) */
    if (S.waist) { popOn('waist', 195, WF.y); drawWaist(c, T, S.waist, t, WF); c.restore(); }
    else dotted(195, 404, 20);

    bowTie(c);
    if (S.cape) { popOn('cape', 195, 340); drawCapeFront(c, S.cape); c.restore(); }
    /* 5 お守り(首から下げる)。頭より先に描いて、ひもの上端は あごの下に隠れる */
    if (S.charm) { popOn('charm', 195, 376); drawCharm(c, T, S.charm, t); c.restore(); }
    else dotted(195, 376, 16);

    /* 6 腕(肩を原点に回す。袖は服に合わせる)。物を にぎる手は あとで こぶしに描く */
    function arm(sd, th, grip) {   // sd = -1 右腕(画面左) / +1 左腕(画面右)
      c.save(); c.translate(195 + sd * SHOULDER.dx, SHOULDER.y); c.rotate(-sd * th);
      RR(c, -11, -10, 22, ARM_LEN + 6, 11, SKIN);                            // 腕
      popOn('body', 0, 10); drawSleeve(c, S.body); c.restore();
      if (!grip) {
        c.fillStyle = SKIN; c.beginPath(); c.arc(0, ARM_LEN, HAND_R, 0, TAU); c.fill();   // 丸い手
        if (!LO) { c.beginPath(); c.arc(sd * 3, ARM_LEN + 2, 8, Math.PI * 0.15, Math.PI * 0.6); c.lineWidth = 1.6; c.strokeStyle = SKIN_EDGE; c.stroke(); }
      }
      c.restore();
    }
    arm(-1, rTh, gripR); arm(1, lTh, gripL);

    /* 7 頭(首を原点に傾く): 肌の丸 → 表情 → 髪 → ほっぺ → かおの装備 → かぶりもの */
    c.save(); c.translate(NECK.x, NECK.y); c.rotate(pose.head); c.translate(-NECK.x, -NECK.y);
    var hx = HEAD.x, hy = HEAD.y, i;
    drawHeadBase(c);
    if (FACES[face]) drawFace(c, hx, hy, face, t); else T.em(face, hx, hy + 6, 108);
    if (S.face) { popOn('face', hx, hy + 6); drawFaceItem(c, T, S.face, t); c.restore(); }
    else dotted(hx + 62, hy - 52, 10);                           // かお の空き: 表情にかぶらないよう 顔の右上に小さく
    if (S.head) { popOn('head', 195, 190); drawHat(c, T, S.head, t); c.restore(); }
    else dotted(195, 150);
    c.restore();   // 頭

    /* 8 手に持つ物・盾・指輪(頭のあと。手の位置は腕の角度から計算) */
    function hand(sd, th) {   // 腕の変換と同じ式で手の中心(上半身の座標)を出す
      var sx = 195 + sd * SHOULDER.dx, sy = SHOULDER.y;
      return { x: sx + sd * ARM_LEN * Math.sin(th), y: sy + ARM_LEN * Math.cos(th) };
    }
    function held(sd, th, slot) {
      var s = S[slot], h = hand(sd, th), sh = { x: 195 + sd * SHOULDER.dx, y: SHOULDER.y }, f = -sd;
      if (twoH && slot === 'lhand') {
        // 両手持ち: 左手は 右手の武器を にぎっている(右手の ところで 描いた)
      } else if (twoH && slot === 'rhand') {   // 両手持ち: 下の手(左)を原点に、上の手(右)まで 柄が通る
        var L = hand(1, lTh), R = h, dx = R.x - L.x, dy = R.y - L.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
        c.save(); c.translate(L.x, L.y); c.rotate(Math.atan2(dy, dx) + Math.PI / 2);
        palmBack(c, 0, 0, -1); palmBack(c, 0, -d, -1);
        popOn(slot, 0, -60); drawWeapon(c, T, s, t); c.restore();
        fingersFront(c, 0, 0, -1); fingersFront(c, 0, -d, -1);
        c.restore();
      } else if (!s) {
        var vx = h.x - TORSO_C.x, vy = h.y - TORSO_C.y, ln = Math.sqrt(vx * vx + vy * vy) || 1;
        dotted(h.x + vx / ln * 30, h.y + vy / ln * 30, 20);
      } else if (SHIELDS[s.t]) {   // 盾: 前腕に ベルトで つけ、裏の 持ち手を にぎる(ベルトの はしと 指先が のぞく)
        var px = sh.x + (h.x - sh.x) * 0.72, py = sh.y + (h.y - sh.y) * 0.72, ox = px - TORSO_C.x, oy = py - TORSO_C.y, ol = Math.sqrt(ox * ox + oy * oy) || 1, sw = SHIELD_W[s.t] || 36, j;
        c.save(); c.translate(px + ox / ol * 14, py + oy / ol * 14); c.rotate(sd * 0.06);
        popOn(slot, 0, 0);
        if (s.t !== 'lid' && LO < 2) {
          var strapC = s.t === 'randoseru' ? '#2d3436' : '#8a5a2b';
          for (j = 0; j < 2; j++) { RR(c, -sw - 7, -12 + j * 24, sw * 2 + 14, 8, 3, strapC, INK, 2); if (!LO) { c.beginPath(); c.moveTo(-sw - 5, -8 + j * 24); c.lineTo(sw + 5, -8 + j * 24); stitch(c, 'rgba(255,255,255,.45)', 1); } }
          RR(c, sd * (sw + 3) - 4, -14, 9, 12, 2, null, '#ffd84d', 2.2);   // ベルトの 金具(外側)
        }
        drawShield(c, T, s, t, f);
        if (s.t !== 'lid' && LO < 2) {   // 裏から にぎった 指先が、体の側の ふちから のぞく
          for (j = 0; j < 3; j++) { ell(c, -sd * (sw + 2), 7 + j * 6.5, 5, 3.4); c.fillStyle = SKIN; c.fill(); c.lineWidth = 1.6; c.strokeStyle = SKIN_EDGE; c.stroke(); }
        }
        c.restore(); c.restore();
      } else {                     // 武器など: こぶしで 柄を にぎる。先は 外側の上へ(腕を上げるほど まっすぐ上)
        var wi = WEAP[s.t] || WEAP.emoji, a;
        if (wi.hang) a = -Math.PI / 2;
        else if (pose.lie) a = Math.PI / 2 - sd * 0.3;           // 寝ポーズ: 体に そわせて 足のほうへ
        else a = -Math.PI / 2 + sd * (0.65 - 0.3 * th) * (wi.tilt === undefined ? 1 : wi.tilt);
        c.save(); c.translate(h.x, h.y); c.rotate(a + Math.PI / 2);
        palmBack(c, 0, 0, f);
        popOn(slot, 0, -40); drawWeapon(c, T, s, t); c.restore();
        fingersFront(c, 0, 0, f);
        c.restore();
      }
      if (sd === 1) {
        if (S.ring) { popOn('ring', h.x, h.y); drawRing(c, T, S.ring, t, h, sh); c.restore(); }
        else dotted(h.x + 6, h.y + 14, 12);
      }
    }
    held(-1, rTh, 'rhand'); held(1, lTh, 'lhand');
    c.restore();   // 上半身

    /* ポーズのおまけ */
    if (poseName === 'money') {   // 札束ばらまき: 💴💸 を 6 枚、周りにふわふわ
      for (i = 0; i < 6; i++) {
        var ang = i * TAU / 6 + t * 0.4, d2 = 150 + Math.sin(t * 2 + i) * 12;
        T.em(i % 2 ? '💸' : '💴', 195 + Math.cos(ang) * d2, 330 + Math.sin(ang) * d2 * 0.8 - 20, 44, 0.95);
      }
    }
    /* 光らせる部位(白い星形フラッシュ + ✨) */
    if (opts.highlight && SLOT_POS[opts.highlight]) {
      var hp = SLOT_POS[opts.highlight], p = opts.hlT !== undefined ? cl(opts.hlT, 0, 1) : 0.5 + 0.5 * Math.sin(t * 6);
      star(c, hp[0], hp[1], 60 * (1 - p), 6 * (1 - p), 0.9);
      T.em('✨', hp[0] + 34, hp[1] - 34, 28, 1 - p * 0.6);
    }
    c.restore();   // 人形全体
  }

  /* 人形の設計座標 → 画面座標(お披露目のフラッシュ位置に使う) */
  function slotWorld(slot, cx, cy, scale, dy) {
    var p = SLOT_POS[slot] || [195, 345];
    return { x: cx + (p[0] - CX) * scale, y: cy + (p[1] - CY + (dy || 0)) * scale };
  }

  /* ---------- お披露目(SCENES.showoff) 設計 7-3 ---------- */
  var SO = { t: 0, arg: null, pon: false };
  function drawShowoff() {
    var t = SO.t, a = SO.arg || {}, it = itemOf(a.itemId), slot = it ? it.slot : null;
    var gt = G.t;
    /* 背景: 白から 0.2 秒で金色の放射グラデへ */
    var k = cl(t / 0.2, 0, 1);
    var g = ctx.createRadialGradient(195, 330, 10, 195, 330, 520);
    g.addColorStop(0, mixColor('#ffffff', '#fff7d6', k)); g.addColorStop(0.5, mixColor('#ffffff', '#ffd166', k)); g.addColorStop(1, mixColor('#ffffff', '#ff9f43', k));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    /* 光の筋 12 本(1 周 8 秒) */
    ctx.save(); ctx.translate(195, 330); ctx.rotate(gt * TAU / 8); ctx.fillStyle = 'rgba(255,255,255,.35)';
    for (var i = 0; i < 12; i++) {
      ctx.rotate(TAU / 12);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(620 * Math.cos(-0.11), 620 * Math.sin(-0.11)); ctx.lineTo(620 * Math.cos(0.11), 620 * Math.sin(0.11)); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    /* 背景の ✨(ゆっくり点滅) */
    var sp = [[40, 80], [330, 60], [60, 600], [350, 520], [300, 140], [30, 300]];
    for (i = 0; i < sp.length; i++) ATL.draw('✨', sp[i][0], sp[i][1], 22 + (i % 3) * 6, 0.35 + 0.35 * Math.sin(gt * 3 + i * 1.3));
    /* 人形 0.6 → 1.0(easeOutBack) */
    var sc = 0.6 + 0.4 * easeOutBack(cl(t / 0.25, 0, 1));
    var breath = Math.sin(gt * Math.PI) * 4;
    var pop = (slot && t >= 0.25 && t < 0.55) ? { slot: slot, k: 1.4 - 0.4 * ((t - 0.25) / 0.3) } : null;
    /* 0.25 秒までは 着がえる前の すがた(menu.js が old を渡す)→ けむりで ぽん → 新しい すがた */
    var oldEq;
    if (slot && t < 0.25 && 'old' in a) { var ce = curEquip(), kk; oldEq = {}; for (kk in ce) oldEq[kk] = ce[kk]; oldEq[slot] = a.old || null; }
    drawDoll(mainTools(), 195, 350, sc, { t: gt, pop: pop, noEmpty: true, equip: oldEq });
    /* 新しい装備の位置に 白い星形フラッシュ(0.20〜0.45)と ✨×6(0.25〜0.60) */
    if (slot) {
      var wp = slotWorld(slot, 195, 350, sc, breath);
      if (t >= 0.2 && t < 0.62) {   // 着がえの けむり(白い もこもこが 広がって消える)
        var pq = (t - 0.2) / 0.42;
        ctx.save(); ctx.globalAlpha = 1 - pq;
        for (i = 0; i < 9; i++) {
          var pa = i * TAU / 9 + 0.3, pd = 26 + 56 * easeOut(pq), pr = (18 + 7 * Math.sin(i * 2.1)) * (1 - pq * 0.5);
          ctx.beginPath(); ctx.arc(wp.x + Math.cos(pa) * pd, wp.y + Math.sin(pa) * pd * 0.8, pr, 0, TAU);
          ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(90,61,43,.35)'; ctx.stroke();
        }
        ctx.restore();
      }
      if (t >= 0.25 && t < 1.0) {   // 「ぽんっ!」の文字
        var pt = (t - 0.25) / 0.75;
        ctx.save(); ctx.globalAlpha = pt < 0.7 ? 1 : 1 - (pt - 0.7) / 0.3;
        txt('ぽんっ!', Math.min(wp.x + 56, 320), Math.max(wp.y - 48 - pt * 18, 60), 26, '#ff8fc8', 'center', 900, INK);
        ctx.restore();
      }
      if (t >= 0.2 && t < 0.45) { var p = (t - 0.2) / 0.25; star(ctx, wp.x, wp.y, 60 * (1 - p), 6 * (1 - p), 1); }
      if (t >= 0.25 && t < 0.6) {
        var q = (t - 0.25) / 0.35, d = 80 * easeOut(q);
        for (i = 0; i < 6; i++) { var ang = i * TAU / 6 - Math.PI / 2; ATL.draw('✨', wp.x + Math.cos(ang) * d, wp.y + Math.sin(ang) * d, 26, 1 - q); }
      }
    }
    /* 名前の札(0.55 から 0.3 秒。下から 40px 上がりながら 0.7→1.05→1.0) */
    if (t >= 0.55) {
      var u = cl((t - 0.55) / 0.3, 0, 1), s = u < 0.7 ? 0.7 + 0.35 * (u / 0.7) : 1.05 - 0.05 * ((u - 0.7) / 0.3);
      var ly = 607 + 40 * (1 - u);
      ctx.save(); ctx.translate(195, ly); ctx.scale(s, s);
      rrect(-166, -32, 332, 64, 20, '#fff', INK, 4);
      var emo = it ? ((it.look && it.look.emoji) || '') : '🤴', name = it ? it.name : 'いまの すがた', tail = it ? ' を そうび!' : '';
      var fs = 24; ctx.font = '900 ' + fs + 'px ' + TEXT_FONT; var tw = ctx.measureText(name + tail).width;
      if (tw + 40 > 300) { fs = Math.max(15, Math.floor(24 * 300 / (tw + 40))); ctx.font = '900 ' + fs + 'px ' + TEXT_FONT; tw = ctx.measureText(name + tail).width; }
      var total = tw + (emo ? 40 : 0), x0 = -total / 2;
      if (emo) ATL.draw(emo, x0 + 16, 0, 32);
      txt(name + tail, x0 + (emo ? 40 : 0), 1, fs, INK, 'left', 900, null);
      ctx.restore();
    }
    /* 数字(0.85 から 0.4 秒でカウント) */
    if (t >= 0.85 && a.before && a.after) {
      var v = easeOut(cl((t - 0.85) / 0.4, 0, 1));
      function statText(label, x, y, key) {
        var b = a.before[key] || 0, af = a.after[key] || 0, cur = Math.round(b + (af - b) * v), dif = af - b;
        ctx.font = '900 22px ' + TEXT_FONT;
        var main = label + ' ' + cur, mw = ctx.measureText(main).width;
        var difS = dif > 0 ? ' (+' + dif + '↑)' : dif < 0 ? ' (−' + (-dif) + '↓)' : '';
        var dw = ctx.measureText(difS).width, x0 = x - (mw + dw) / 2;
        txt(main, x0, y, 22, INK, 'left', 900, null);
        if (difS) txt(difS, x0 + mw, y, 22, dif > 0 ? '#2e7d32' : '#c62828', 'left', 900, null);
      }
      statText('攻', 110, 668, 'atk'); statText('守', 280, 668, 'def'); statText('HP', 195, 700, 'hp');
    }
    /* タップで もどる(1.2 秒から点滅) */
    if (t >= 1.2 && Math.floor(gt * 2) % 2 === 0) txt('タップで もどる ▼', 195, 740, 17, '#fff', 'center', 900, INK);
    /* 右下のロゴ */
    txt('勇者へっぽこ', 380, 766, 17, 'rgba(27,20,48,.55)', 'right', 900, null);
  }
  SCENES.showoff = {
    enter: function (arg) { SO.t = 0; SO.arg = arg || {}; SO.pon = false; AUDIO.sfx('equip'); if (window.HUD) HUD.hide(); },
    leave: function () { if (window.HUD) HUD.show(); },
    update: function (dt) { SO.t += dt; if (SO.t >= 0.55 && !SO.pon) { SO.pon = true; AUDIO.sfx('ok'); } },
    draw: drawShowoff,
    tap: function () {
      if (SO.t >= 1.2) { popScene(); return; }
      SO.t = 1.6;                                   // 演出を最後まで飛ばす
      if (!SO.pon) { SO.pon = true; AUDIO.sfx('ok'); }
    }
  };

  /* ---------- 記念写真(設計 9-2)。写真の中は 360×450 の座標で描く ---------- */
  function bgCastle(T, t) {
    var c = T.c, g = c.createLinearGradient(0, 0, 0, 300);
    g.addColorStop(0, '#8fd3ff'); g.addColorStop(1, '#dff3ff'); c.fillStyle = g; c.fillRect(0, 0, 360, 300);
    var drift = (t * 3) % 420 - 30;
    T.em('☁️', ((50 + drift) % 420) - 30, 52, 48); T.em('☁️', ((200 + drift * 0.7) % 420) - 30, 32, 40); T.em('☁️', ((300 + drift * 0.5) % 420) - 30, 86, 56);
    /* 城(幅 220。塔 2 本 + 壁 + まん中の高い塔) */
    c.fillStyle = '#6c4fb0'; c.fillRect(90, 200, 180, 100);
    c.fillStyle = '#5a3f9a'; c.fillRect(70, 150, 40, 150); c.fillRect(250, 150, 40, 150);
    c.fillStyle = '#7d5fc4'; c.fillRect(150, 160, 60, 140);
    c.fillStyle = '#c0392b';   // 屋根
    c.beginPath(); c.moveTo(64, 152); c.lineTo(90, 112); c.lineTo(116, 152); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(244, 152); c.lineTo(270, 112); c.lineTo(296, 152); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(144, 162); c.lineTo(180, 118); c.lineTo(216, 162); c.closePath(); c.fill();
    c.fillStyle = '#ffe066';   // 旗と窓
    c.fillRect(179, 96, 2, 24); c.beginPath(); c.moveTo(181, 96); c.lineTo(196, 102); c.lineTo(181, 108); c.closePath(); c.fill();
    var wx = [100, 130, 230, 260], i;
    for (i = 0; i < wx.length; i++) { c.beginPath(); c.arc(wx[i] + (i > 1 ? 0 : 0), 236, 6, Math.PI, 0); c.lineTo(wx[i] + 6, 250); c.lineTo(wx[i] - 6, 250); c.closePath(); c.fill(); }
    for (i = 0; i < 2; i++) { c.beginPath(); c.arc(90 + i * 180, 190, 6, Math.PI, 0); c.lineTo(96 + i * 180, 204); c.lineTo(84 + i * 180, 204); c.closePath(); c.fill(); }
    c.fillStyle = '#3a2550';   // 門
    c.beginPath(); c.arc(180, 270, 22, Math.PI, 0); c.lineTo(202, 300); c.lineTo(158, 300); c.closePath(); c.fill();
    c.fillStyle = '#5a3f9a';   // 壁の上のギザギザ
    for (i = 0; i < 9; i++) c.fillRect(92 + i * 20, 192, 12, 10);
    /* 石畳 */
    c.fillStyle = '#b9b4a8'; c.fillRect(0, 300, 360, 150);
    c.strokeStyle = '#a39e92'; c.lineWidth = 1.5;
    for (var r = 0; r < 8; r++) for (var q = -1; q < 11; q++) RR(c, q * 36 + (r % 2) * 18, 302 + r * 19, 34, 17, 4, null, '#a39e92', 1.5);
  }
  function bgSunset(T, t) {
    var c = T.c, g = c.createLinearGradient(0, 0, 0, 290);
    g.addColorStop(0, '#6c4fb0'); g.addColorStop(0.55, '#ff7f6b'); g.addColorStop(1, '#ff9f43'); c.fillStyle = g; c.fillRect(0, 0, 360, 300);
    c.fillStyle = 'rgba(255,224,102,.35)'; c.beginPath(); c.arc(245, 90, 72, 0, TAU); c.fill();
    c.fillStyle = '#ffe066'; c.beginPath(); c.arc(245, 90, 50, 0, TAU); c.fill();
    T.em('🐦', 80 + Math.sin(t * 0.7) * 10, 70 + Math.sin(t * 1.9) * 4, 22); T.em('🐦', 122 + Math.sin(t * 0.6) * 8, 50 + Math.cos(t * 1.7) * 4, 18);
    c.fillStyle = '#3e8e41';   // 遠い丘
    c.beginPath(); c.moveTo(0, 300); c.quadraticCurveTo(110, 190, 240, 262); c.quadraticCurveTo(300, 290, 360, 250); c.lineTo(360, 450); c.lineTo(0, 450); c.closePath(); c.fill();
    c.fillStyle = '#2e7d32';   // 近い丘
    c.beginPath(); c.moveTo(0, 340); c.quadraticCurveTo(120, 250, 260, 300); c.quadraticCurveTo(320, 320, 360, 306); c.lineTo(360, 450); c.lineTo(0, 450); c.closePath(); c.fill();
    T.em('🌼', 40, 345, 16); T.em('🌼', 320, 330, 14); T.em('🌼', 150, 372, 12);
  }
  function bgRuins(T, t) {
    var c = T.c, g = c.createLinearGradient(0, 0, 0, 450), i;
    g.addColorStop(0, '#1a0b2e'); g.addColorStop(1, '#3a1050'); c.fillStyle = g; c.fillRect(0, 0, 360, 450);
    c.fillStyle = '#2a2235';   // くずれた壁
    c.beginPath(); c.moveTo(20, 290); c.lineTo(20, 200); c.lineTo(45, 215); c.lineTo(60, 180); c.lineTo(85, 205); c.lineTo(110, 170); c.lineTo(125, 290); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(235, 290); c.lineTo(240, 190); c.lineTo(265, 220); c.lineTo(290, 165); c.lineTo(310, 210); c.lineTo(340, 195); c.lineTo(345, 290); c.closePath(); c.fill();
    for (i = 0; i < 4; i++) {   // くすぶる煙(上るほど薄く)
      var sy = 280 - ((t * 12 + i * 40) % 160);
      c.fillStyle = 'rgba(200,200,210,' + (0.16 * cl((sy - 120) / 160, 0, 1)).toFixed(3) + ')'; c.beginPath(); c.arc(60 + i * 80, sy, 14 + i * 3, 0, TAU); c.fill();
    }
    c.fillStyle = '#3d3d3d'; c.fillRect(0, 290, 360, 160);
    c.strokeStyle = '#1e1e1e'; c.lineWidth = 2;   // ひび
    var cracks = [[30, 300, 70, 330, 60, 380, 110, 420], [200, 295, 230, 340, 215, 390], [300, 310, 330, 350, 320, 400, 355, 430], [120, 330, 150, 360, 140, 410]];
    for (i = 0; i < cracks.length; i++) { c.beginPath(); c.moveTo(cracks[i][0], cracks[i][1]); for (var j = 2; j < cracks[i].length; j += 2) c.lineTo(cracks[i][j], cracks[i][j + 1]); c.stroke(); }
    T.em('🔥', 60, 272, 40 + Math.sin(t * 9) * 3); T.em('🔥', 300, 268, 48 + Math.sin(t * 8 + 1) * 4); T.em('🔥', 200, 282, 30 + Math.sin(t * 10 + 2) * 3);
    c.save(); c.translate(326, 362); c.rotate(Math.PI); T.em('😈', 0, 0, 44); c.restore();   // ひっくり返った大魔王(鏡にしない。180 度回す)
    T.em('💫', 298, 340 + Math.sin(t * 3) * 2, 20);
  }
  var BG_FUNCS = [bgCastle, bgSunset, bgRuins];
  var BG_NAMES = [{ emoji: '🏰', name: '城の前' }, { emoji: '🌅', name: '夕やけの丘' }, { emoji: '💀', name: '大魔王の城あと' }];

  /* 仲間 1 組。count が 2 以上なら絵文字を重ねて 人数の小札 */
  function drawComp(T, cp, x, y, size, sync) {
    var c = T.c; c.save(); c.translate(x, y + (sync.dy || 0)); if (sync.rot) c.rotate(sync.rot);
    c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.ellipse(0, size * 0.5, size * 0.4, 4, 0, 0, TAU); c.fill();
    var n = cp.count >= 3 ? 3 : cp.count >= 2 ? 2 : 1, i;
    if (n === 1) T.em(cp.emoji, 0, 0, size);
    else {
      var s2 = size * 0.82, offs = n === 2 ? [[-9, 3], [9, -3]] : [[-11, 5], [11, 5], [0, -7]];
      for (i = 0; i < n; i++) T.em(cp.emoji, offs[i][0], offs[i][1], s2);
    }
    if (cp.count >= 2) {   // 人数の小札(足もとに重ねる。枠の端で切れないよう中央ぞろえ)
      var label = '×' + cp.count; c.font = '900 10px ' + TEXT_FONT; var w = c.measureText(label).width + 8;
      RR(c, -w / 2, size * 0.2, w, 14, 7, '#fff', INK, 1.5);
      TX(c, label, 0, size * 0.2 + 7.5, 10, INK, 'center', 900, null);
    }
    c.restore();
  }
  /* 仲間の立ち位置。前列 6・後列 4(まん中はへっぽこ)。少人数のときも左右が偏らないよう、内側から外側へ埋める順にしてある */
  var FRONT_X = [128, 232, 78, 282, 30, 330], BACK_X = [90, 270, 30, 330];

  /* 写真の中身(360×450 の座標。T.c は translate 済み) */
  function drawPhoto(T, opts) {
    opts = opts || {};
    var c = T.c, t = opts.t !== undefined ? opts.t : (typeof G !== 'undefined' ? G.t : 0);
    var bg = ((opts.bg | 0) % 3 + 3) % 3, pose = opts.pose || 'peace', comps = opts.comps || [];
    c.save(); c.beginPath(); c.rect(0, 0, 360, 450); c.clip();
    BG_FUNCS[bg](T, t);
    /* 仲間はポーズに合わせて全員 少しだけ同じ動き */
    var sync = pose === 'peace' ? { dy: -2 - Math.abs(Math.sin(t * 4)) * 2 } : pose === 'jump' ? { dy: -8 } : pose === 'smug' ? { rot: -0.1 } :
               pose === 'sleep' ? { rot: 0.12 } : pose === 'money' ? { dy: -3 } : pose === 'hero' ? { dy: -1 } : {};
    var front = comps.slice(0, 6), back = comps.slice(6, 10), i;
    for (i = 0; i < back.length; i++) drawComp(T, back[i], BACK_X[i], 198, 44, sync);
    /* へっぽこ(人形 0.6 倍)。寝ポーズのときは みんなの前に ころがる(前列より手前に描く) */
    var hero = function () { drawDoll(T, 180, 292, 0.6, { pose: pose, t: t, noEmpty: true, equip: opts.equip, face: opts.face }); };
    var lie = pose === 'sleep', frontY = lie ? 262 : 372;   // 寝ているときは前列も後ろに下がる(隠れないように)
    if (!lie) hero();
    for (i = 0; i < front.length; i++) drawComp(T, front[i], FRONT_X[i], frontY, 52, sync);
    if (lie) hero();
    /* 下の帯(金色)。題は opts.title(DATA.TEXTS.photoTitle)。長ければ 字を小さくして 1行に収める */
    c.fillStyle = '#ffd84d'; c.fillRect(0, 400, 360, 42);
    c.fillStyle = INK; c.fillRect(0, 400, 360, 2.5); c.fillRect(0, 439.5, 360, 2.5);
    var title = opts.title || '大魔王討伐記念', fs = 17;
    c.font = '900 ' + fs + 'px ' + TEXT_FONT; var tw = c.measureText(title).width;
    if (tw > 316) { fs = Math.max(11, Math.floor(fs * 316 / tw)); c.font = '900 ' + fs + 'px ' + TEXT_FONT; tw = c.measureText(title).width; }
    var x0 = 180 - (tw + 24) / 2;
    T.em('🏆', x0 + 9, 414, 18);
    TX(c, title, x0 + 24, 414, fs, INK, 'left', 900, null);
    var rec = (opts.record || '') + (opts.date ? (opts.record ? '  ' : '') + opts.date : '');
    if (rec) TX(c, rec, 180, 431, 11, '#8a5a00', 'center', 800, null);
    /* 帯の下の細い余白に、左: ロゴ / 右: アドレス(薄く) */
    TX(c, '勇者へっぽこ', 6, 446, 7, 'rgba(255,255,255,.7)', 'left', 900, null);
    TX(c, 'roguepink.github.io/heppoko', 355, 446, 7, 'rgba(255,255,255,.7)', 'right', 800, null);
    c.restore();
  }

  /* 画面の写真枠: (x,y,w,h) が写真。その外側に白い縁 8px と影 */
  function drawPhotoFrame(x, y, w, h, opts) {
    ctx.save();
    ctx.shadowColor = 'rgba(90,61,43,.35)'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 6;
    rrect(x - 8, y - 8, w + 16, h + 16, 10, '#fff', INK, 3);
    ctx.restore();
    ctx.save(); ctx.translate(x, y); ctx.scale(w / 360, h / 450);
    drawPhoto(mainTools(), opts);
    ctx.restore();
  }
  /* 保存用: 別 canvas(既定 1080×1350)に 3 倍で描き直す */
  function renderPhoto(canvas, opts) {
    opts = opts || {};
    var w = opts.w || 1080, h = opts.h || 1350;
    canvas.width = w; canvas.height = h;
    var c = canvas.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, w, h);
    c.save(); c.scale(w / 360, h / 450); drawPhoto(rawTools(c), opts); c.restore();
    return canvas;
  }

  /* 会話の窓の顔: 小さな canvas に へっぽこの頭だけを描いて返す(size = 表示の px) */
  function faceCanvas(size, expr) {
    var cv = document.createElement('canvas'), dpr = Math.min(3, window.devicePixelRatio || 1), px = Math.round(size * dpr);
    cv.width = px; cv.height = px; cv.style.width = size + 'px'; cv.style.height = size + 'px';
    var c = cv.getContext('2d'), k = px / 190;   // 頭(耳ふくめ 幅 約180)を枠いっぱいに
    c.translate(px / 2, px / 2 + 4 * k); c.scale(k, k); c.translate(-HEAD.x, -HEAD.y);
    drawHeadBase(c); drawFace(c, HEAD.x, HEAD.y, FACES[expr] ? expr : 'smile', 0);
    return cv;
  }

  return {
    faceCanvas: faceCanvas,
    draw: function (cx, cy, scale, opts) { drawDoll(mainTools(), cx, cy, scale, opts); },
    renderPhoto: renderPhoto,
    drawPhotoFrame: drawPhotoFrame,
    slotPos: function (slot) { var p = SLOT_POS[slot]; return p ? { x: p[0], y: p[1] } : null; },
    POSES: POSES, BG_NAMES: BG_NAMES, star: star
  };
})();

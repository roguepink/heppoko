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
     data.js の look.kind があれば そちらを優先(あとから型を足せるように)。表にない品は 今どおり絵文字で添える。
     ===================================================================== */
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
    /* マント */
    towel: { t: 'towel' }, ghost_sheet: { t: 'sheet' }, raincoat: { t: 'rain' }, furoshiki_cape: { t: 'karakusa', col: '#3fa34d' },
    curtain: { t: 'curtain' }, futon: { t: 'futon' }, fake_wings: { t: 'wings' }, hero_cape: { t: 'hero' }, solar_panel: { t: 'panel' },
    /* こし */
    rope: { t: 'jumprope' }, leather_belt: { t: 'belt' }, inner_tube: { t: 'tube' }, fanny_pack: { t: 'pouch' },
    fake_snake: { t: 'snake' }, tool_belt: { t: 'tools' }, sumo_mawashi: { t: 'mawashi' }, obi: { t: 'obi' }, champion_belt: { t: 'champ' },
    /* あし */
    slippers: { t: 'slipper' }, leather_boots: { t: 'shoe' }, geta: { t: 'geta' }, rain_boots: { t: 'boot' }, stilts: { t: 'stilts' },
    swim_fins: { t: 'fins' }, light_sneakers: { t: 'sneaker' }, roller_skates: { t: 'skate' }, spring_shoes: { t: 'spring' }, iron_boots: { t: 'boot', metal: 1 },
    /* みぎて(表にない物は 絵文字を にぎる) */
    wooden_stick: { t: 'stick' }, frying_pan: { t: 'pan' }, magic_wand: { t: 'wand' }, steel_sword: { t: 'sword' }, legend_sword: { t: 'sword', legend: 1 },
    /* ひだりて(盾は 腕に つける) */
    cardboard_shield: { t: 'cardboard' }, pot_lid: { t: 'lid' }, pizza_box: { t: 'pizza' }, wooden_shield: { t: 'woodshield' },
    randoseru: { t: 'randoseru' }, manhole: { t: 'manhole' }, hero_shield: { t: 'heroshield' },
    /* ゆびわ */
    rubber_band: { t: 'band' }, washer: { t: 'washer' }, toy_ring: { t: 'ring' }, onion_ring: { t: 'bracelet' }, donut: { t: 'bracelet' },
    key_ring: { t: 'dangle' }, mood_ring: { t: 'ring' }, smartwatch: { t: 'watch' }, power_ring: { t: 'ring', glow: 1 }, diamond_ring: { t: 'ring', glow: 1, big: 1 },
    /* おまもり(ほかは 首から下げる) */
    receipt: { t: 'receipt' }, omamori: { t: 'omamori' }
  };
  var SHIELDS = { cardboard: 1, lid: 1, pizza: 1, woodshield: 1, randoseru: 1, manhole: 1, heroshield: 1 };
  function hex6(v) { return (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v)) ? v : null; }
  function styleOf(eq, slot) {
    var it = itemOf(eq[slot]); if (!it) return null;
    var lk = it.look || {}, s = STYLE[it.id] || {}, o = {}, k;
    for (k in s) o[k] = s[k];
    if (lk.kind) o.t = lk.kind;
    o.col = hex6(s.col) || hex6(lk.color) || '#cccccc';
    o.em = lk.emoji || it.emoji || ''; o.price = it.price || 0;
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
  function shine(c, x, y, rx, ry, rot, a) { ell(c, x, y, rx, ry, rot); c.fillStyle = 'rgba(255,255,255,' + (a || 0.6) + ')'; c.fill(); }

  /* ---------- からだ(服) ---------- */
  function plainClothes(c, shirt, pants, edge, pantsTop) {
    bodyPath(c); c.fillStyle = shirt; c.fill();
    c.save(); bodyPath(c); c.clip();
    c.fillStyle = pants; c.fillRect(BODY.x, pantsTop, BODY.w, 60);
    c.strokeStyle = PANTS_EDGE; c.lineWidth = 2; c.beginPath(); c.moveTo(195, pantsTop + 6); c.lineTo(195, 446); c.stroke();
    c.beginPath(); c.moveTo(BODY.x, pantsTop); c.lineTo(BODY.x + BODY.w, pantsTop); c.stroke();
    c.restore();
    bodyPath(c); c.lineWidth = 2.5; c.strokeStyle = edge; c.stroke();
  }
  function drawBodyWear(c, T, s, t) {
    var i, j, x, y;
    if (!s) {   // 服なし: 白い半そでシャツ + 青い半ズボン
      plainClothes(c, SHIRT, PANTS, SHIRT_EDGE, 398);
      c.strokeStyle = SHIRT_EDGE; c.lineWidth = 2; c.beginPath(); c.moveTo(183, 320); c.lineTo(195, 334); c.lineTo(207, 320); c.stroke();   // えり
      return;
    }
    var k = s.t, col = s.col;
    if (k === 'shirt') {          // ブランドのポロシャツ
      bodyPath(c); c.fillStyle = col; c.fill();
      c.save(); bodyPath(c); c.clip();
      c.fillStyle = dk(col, 0.1); c.fillRect(230, 318, 20, 90);
      c.fillStyle = PANTS; c.fillRect(BODY.x, 404, BODY.w, 60);
      c.fillStyle = PANTS_EDGE; c.fillRect(194, 410, 2, 40);
      c.restore();
      bodyPath(c); ink(c, 3);
      c.beginPath(); c.moveTo(BODY.x, 404); c.lineTo(BODY.x + BODY.w, 404); ink(c, 2.5);
      c.beginPath(); c.moveTo(195, 330); c.lineTo(166, 319); c.lineTo(175, 348); c.closePath(); fillInk(c, '#fff', 2.5);
      c.beginPath(); c.moveTo(195, 330); c.lineTo(224, 319); c.lineTo(215, 348); c.closePath(); fillInk(c, '#fff', 2.5);
      c.beginPath(); c.moveTo(195, 346); c.lineTo(195, 380); c.lineWidth = 2.5; c.strokeStyle = dk(col, 0.3); c.stroke();
      circ(c, 195, 358, 3); c.fillStyle = '#fff'; c.fill(); circ(c, 195, 371, 3); c.fill();
      circ(c, 226, 366, 11); fillInk(c, '#ffd84d', 2.5); TX(c, 'B', 226, 367, 13, INK, 'center', 900, null);   // ブランドの金の紋章
    } else if (k === 'jersey') {  // 体操服: 白地 + 紺の短パン + 名前のぬいとり
      bodyPath(c); c.fillStyle = '#fff'; c.fill();
      c.save(); bodyPath(c); c.clip();
      c.fillStyle = 'rgba(0,0,0,.05)'; c.fillRect(232, 318, 20, 90);
      c.fillStyle = '#2c3e78'; c.fillRect(BODY.x, 408, BODY.w, 60);
      c.fillStyle = '#fff'; c.fillRect(BODY.x + 6, 412, 4, 40); c.fillRect(BODY.x + BODY.w - 10, 412, 4, 40);
      c.restore();
      bodyPath(c); ink(c, 3); c.beginPath(); c.moveTo(BODY.x, 408); c.lineTo(BODY.x + BODY.w, 408); ink(c, 2.5);
      c.beginPath(); c.arc(195, 318, 25, 0.12 * Math.PI, 0.88 * Math.PI); c.lineWidth = 7; c.strokeStyle = '#e63e3e'; c.stroke();
      RR(c, 150, 352, 50, 26, 4, '#fff', INK, 2);
      c.save(); c.setLineDash([3, 3]); RR(c, 153.5, 355.5, 43, 19, 3, null, '#e63e3e', 1.5); c.restore();
      TX(c, 'へっぽこ', 175, 365.5, 10, INK, 'center', 900, null);
    } else if (k === 'apron') {   // ふだん着 + エプロン
      plainClothes(c, SHIRT, PANTS, SHIRT_EDGE, 398);
      for (i = 0; i < 7; i++) { circ(c, 152 + i * 14.3, 458, 8); fillInk(c, '#fff', 2); }
      c.beginPath(); c.moveTo(172, 344); c.lineTo(218, 344); c.lineTo(221, 396); c.quadraticCurveTo(240, 398, 242, 458); c.lineTo(148, 458); c.quadraticCurveTo(150, 398, 169, 396); c.closePath(); fillInk(c, col, 3);
      c.beginPath(); c.moveTo(174, 346); c.lineTo(160, 322); c.moveTo(216, 346); c.lineTo(230, 322); c.lineWidth = 7; c.strokeStyle = INK; c.stroke(); c.lineWidth = 4; c.strokeStyle = col; c.stroke();
      RR(c, 178, 414, 34, 26, 7, lt(col, 0.5), INK, 2.5); heart(c, 195, 426, 6, '#e63e3e');
    } else if (k === 'pajama') {  // パジャマ: 水玉 + まるいえり + ボタン(足も同じ柄。leg で描く)
      bodyPath(c); c.fillStyle = col; c.fill();
      c.save(); bodyPath(c); c.clip(); c.fillStyle = 'rgba(255,255,255,.7)';
      for (j = 0; j < 7; j++) for (i = 0; i < 6; i++) { circ(c, 146 + i * 22 + (j % 2) * 11, 326 + j * 20, 3.5); c.fill(); }
      c.fillStyle = dk(col, 0.12); c.fillRect(BODY.x, 400, BODY.w, 8);
      c.restore(); bodyPath(c); ink(c, 3);
      ell(c, 180, 331, 17, 10, 0.4); fillInk(c, lt(col, 0.6), 2.5); ell(c, 210, 331, 17, 10, -0.4); fillInk(c, lt(col, 0.6), 2.5);
      for (i = 0; i < 3; i++) { circ(c, 195, 358 + i * 18, 4); fillInk(c, '#fff', 2); }
      RR(c, 212, 352, 24, 20, 5, null, dk(col, 0.3), 2);
    } else if (k === 'bubble') {  // プチプチを ぐるぐる巻き
      rrPath(c, 134, 312, 122, 144, 40); c.fillStyle = 'rgba(214,238,250,.96)'; c.fill();
      c.save(); rrPath(c, 134, 312, 122, 144, 40); c.clip();
      for (j = 0; j < 9; j++) for (i = 0; i < 8; i++) {
        x = 140 + i * 16 + (j % 2) * 8; y = 320 + j * 16;
        circ(c, x, y, 6.5); c.fillStyle = 'rgba(255,255,255,.7)'; c.fill(); c.lineWidth = 1.5; c.strokeStyle = 'rgba(79,168,216,.6)'; c.stroke();
        circ(c, x - 2.2, y - 2.2, 1.8); c.fillStyle = '#fff'; c.fill();
      }
      c.save(); c.translate(195, 400); c.rotate(-0.08); RR(c, -70, -11, 140, 22, 2, 'rgba(232,194,122,.95)'); TX(c, 'ワレモノ', 0, 1, 13, '#d03a2a', 'center', 900, null); c.restore();
      c.restore(); rrPath(c, 134, 312, 122, 144, 40); ink(c, 3);
    } else if (k === 'box') {     // 段ボールロボ(体ごと箱)
      rrPath(c, 128, 312, 134, 142, 8); c.fillStyle = col; c.fill();
      c.save(); rrPath(c, 128, 312, 134, 142, 8); c.clip();
      c.fillStyle = dk(col, 0.12); c.fillRect(240, 312, 24, 142);
      c.fillStyle = 'rgba(245,228,180,.85)'; c.fillRect(186, 312, 18, 142);
      c.restore(); rrPath(c, 128, 312, 134, 142, 8); ink(c, 3);
      c.beginPath(); c.moveTo(130, 332); c.lineTo(260, 332); c.lineWidth = 2; c.strokeStyle = dk(col, 0.3); c.stroke();
      RR(c, 154, 350, 82, 46, 7, '#7a5a34', INK, 2.5);
      circ(c, 172, 366, 7); fillInk(c, '#e63e3e', 2); circ(c, 194, 366, 7); fillInk(c, '#5fb84e', 2);
      RR(c, 208, 358, 20, 16, 3, '#ffd84d', INK, 2);
      for (i = 0; i < 4; i++) { circ(c, 168 + i * 18, 386, 3.5); c.fillStyle = (Math.floor(t * 3) + i) % 4 === 0 ? '#ffd84d' : '#3a2a18'; c.fill(); }
      TX(c, 'ロボ', 195, 424, 18, INK, 'center', 900, null);
      c.fillStyle = INK; [[136, 320], [254, 320], [136, 446], [254, 446]].forEach(function (p) { circ(c, p[0], p[1], 2.5); c.fill(); });
    } else if (k === 'cooker') {  // 炊飯器(着ぐるみ)
      rrPath(c, 124, 304, 142, 154, 50); c.fillStyle = '#f7f7f7'; c.fill();
      c.save(); rrPath(c, 124, 304, 142, 154, 50); c.clip();
      c.fillStyle = '#e4e4e4'; c.fillRect(124, 304, 142, 40);
      c.fillStyle = 'rgba(0,0,0,.07)'; c.fillRect(238, 304, 30, 154);
      c.fillStyle = 'rgba(255,255,255,.95)'; c.fillRect(140, 350, 9, 90);
      c.restore(); rrPath(c, 124, 304, 142, 154, 50); ink(c, 3);
      c.beginPath(); c.moveTo(128, 344); c.lineTo(262, 344); ink(c, 2);
      RR(c, 156, 362, 78, 52, 10, '#e2e2e2', INK, 2.5);
      RR(c, 165, 369, 60, 19, 4, '#33424d'); TX(c, 'ほかほか', 195, 379, 10, '#7dffb0', 'center', 900, null);
      circ(c, 180, 401, 6.5); fillInk(c, '#ff8a3d', 2); circ(c, 210, 401, 6.5); fillInk(c, '#4fa8d8', 2);
    } else if (k === 'kotatsu') { // こたつごと 着る
      plainClothes(c, SHIRT, PANTS, SHIRT_EDGE, 398);
      c.strokeStyle = SHIRT_EDGE; c.lineWidth = 2; c.beginPath(); c.moveTo(183, 320); c.lineTo(195, 334); c.lineTo(207, 320); c.stroke();
      c.beginPath(); c.moveTo(108, 400); c.lineTo(282, 400); c.lineTo(288, 474);
      for (i = 0; i < 6; i++) { x = 288 - i * 31; c.quadraticCurveTo(x - 15.5, 490, x - 31, 474); }
      c.closePath(); c.fillStyle = col; c.fill();
      c.save(); c.clip(); c.strokeStyle = lt(col, 0.35); c.lineWidth = 3;
      for (x = 112; x < 290; x += 26) { c.beginPath(); c.moveTo(x, 400); c.lineTo(x, 492); c.stroke(); }
      c.beginPath(); c.moveTo(100, 436); c.lineTo(290, 436); c.stroke(); c.restore();
      c.beginPath(); c.moveTo(108, 400); c.lineTo(282, 400); c.lineTo(288, 474);
      for (i = 0; i < 6; i++) { x = 288 - i * 31; c.quadraticCurveTo(x - 15.5, 490, x - 31, 474); }
      c.closePath(); ink(c, 3);
      RR(c, 90, 388, 210, 16, 5, '#c8915a', INK, 3); RR(c, 95, 390.5, 200, 4, 2, '#e8b884');
      circ(c, 268, 376, 11); fillInk(c, '#ffa531', 2.5); ell(c, 270, 365, 5, 3, -0.5); c.fillStyle = '#5fb84e'; c.fill();
    } else if (k === 'robe') {    // すその長い コート / ローブ
      var robe = function () { c.beginPath(); c.moveTo(152, 320); c.lineTo(238, 320); c.quadraticCurveTo(252, 340, 251, 400); c.lineTo(270, 494); c.quadraticCurveTo(195, 502, 120, 494); c.lineTo(139, 400); c.quadraticCurveTo(138, 340, 152, 320); c.closePath(); };
      robe(); c.fillStyle = col; c.fill();
      c.save(); robe(); c.clip(); c.fillStyle = dk(col, 0.12); c.fillRect(226, 318, 60, 190); c.restore();
      robe(); ink(c, 3);
      c.beginPath(); c.moveTo(195, 338); c.lineTo(195, 496); c.lineWidth = 2.5; c.strokeStyle = dk(col, 0.35); c.stroke();
      if (s.fluffy) {
        var fl = function (fx, fy, r) { circ(c, fx, fy, r); c.fillStyle = '#fffaf0'; c.fill(); c.lineWidth = 1.8; c.strokeStyle = 'rgba(90,61,43,.55)'; c.stroke(); };
        for (i = 0; i < 11; i++) fl(124 + i * 14.6, 495, 9);
        for (y = 344; y < 490; y += 14) fl(195, y, 8);
        [[158, 326], [170, 336], [182, 342], [208, 342], [220, 336], [232, 326]].forEach(function (p) { fl(p[0], p[1], 9); });
      } else {
        c.beginPath(); c.moveTo(122, 490); c.quadraticCurveTo(195, 498, 268, 490); c.lineWidth = 7; c.strokeStyle = '#ffd84d'; c.stroke();
      }
    } else if (k === 'armor') {   // よろい: 胸板の線・腰の板・金属の光(肩当ては 腕で描く)
      for (i = 0; i < 3; i++) RR(c, 150 + i * 31, 432 + (i === 1 ? 6 : 0), 28, 30, 7, dk(col, 0.08), INK, 2.5);
      bodyPath(c); var g = c.createLinearGradient(150, 320, 245, 446);
      g.addColorStop(0, lt(col, 0.6)); g.addColorStop(0.55, col); g.addColorStop(1, dk(col, 0.25)); c.fillStyle = g; c.fill();
      c.save(); bodyPath(c); c.clip();
      c.strokeStyle = dk(col, 0.35); c.lineWidth = 2.5;
      c.beginPath(); c.moveTo(148, 374); c.quadraticCurveTo(172, 352, 195, 376); c.quadraticCurveTo(218, 352, 242, 374); c.stroke();
      c.beginPath(); c.moveTo(195, 376); c.lineTo(195, 446); c.stroke();
      for (i = 0; i < 2; i++) { y = 408 + i * 18; c.beginPath(); c.moveTo(143, y); c.quadraticCurveTo(195, y + 8, 247, y); c.stroke(); }
      var sx = ((t * 70) % 280) - 70;   // ななめの光が ゆっくり流れる
      c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.moveTo(sx + 100, 318); c.lineTo(sx + 124, 318); c.lineTo(sx + 64, 446); c.lineTo(sx + 40, 446); c.closePath(); c.fill();
      c.restore(); bodyPath(c); ink(c, 3);
      circ(c, 195, 394, 7); fillInk(c, '#4fa8d8', 2.5); circ(c, 192.5, 391.5, 2.2); c.fillStyle = '#fff'; c.fill();
      c.fillStyle = INK; [[156, 334], [234, 334], [152, 400], [238, 400]].forEach(function (p) { circ(c, p[0], p[1], 2.4); c.fill(); });
    } else {                      // 型のない服: 色で塗って 胸に 小さなワッペン
      bodyPath(c); c.fillStyle = col; c.fill();
      c.save(); bodyPath(c); c.clip(); c.fillStyle = 'rgba(255,255,255,.2)'; c.fillRect(BODY.x, BODY.y, BODY.w, BODY.h / 2); c.restore();
      bodyPath(c); ink(c, 3);
      circ(c, 224, 380, 15); fillInk(c, '#fff', 2.5); T.em(s.em, 224, 380, 22);
    }
  }

  /* 袖(腕の変換の中。肩が原点、腕は +y へ) */
  function drawSleeve(c, s) {
    if (!s) { RR(c, -13, -12, 26, 30, 11, SHIRT, 'rgba(27,20,48,.3)', 2); return; }
    var k = s.t, col = s.col, i;
    if (k === 'pajama' || k === 'robe') {
      RR(c, -13, -12, 26, ARM_LEN + 2, 11, col, INK, 2.5);
      if (s.fluffy) for (i = 0; i < 4; i++) { circ(c, -10 + i * 6.7, ARM_LEN - 8, 6.5); c.fillStyle = '#fffaf0'; c.fill(); c.lineWidth = 1.5; c.strokeStyle = 'rgba(90,61,43,.55)'; c.stroke(); }
      else RR(c, -14, ARM_LEN - 14, 28, 9, 4, lt(col, 0.45), INK, 2);
    } else if (k === 'box') {
      RR(c, -16, -12, 32, ARM_LEN + 4, 4, col, INK, 2.5);
      c.strokeStyle = dk(col, 0.3); c.lineWidth = 2; c.beginPath(); c.moveTo(-15, 22); c.lineTo(15, 22); c.moveTo(-15, 44); c.lineTo(15, 44); c.stroke();
    } else if (k === 'bubble') {
      RR(c, -17, -14, 34, 44, 16, 'rgba(214,238,250,.96)', INK, 2.5);
      for (i = 0; i < 4; i++) { circ(c, -7 + (i % 2) * 14, 2 + Math.floor(i / 2) * 14, 5); c.lineWidth = 1.5; c.strokeStyle = 'rgba(79,168,216,.6)'; c.stroke(); }
    } else if (k === 'armor') {
      RR(c, -12, -10, 24, 34, 10, '#9fb4c4', INK, 2);
      RR(c, -13, ARM_LEN - 36, 26, 24, 7, col, INK, 2.5); RR(c, -8, ARM_LEN - 32, 4, 16, 2, 'rgba(255,255,255,.7)');
      ell(c, 0, -2, 25, 18); var g = c.createLinearGradient(-20, -18, 20, 16); g.addColorStop(0, lt(col, 0.6)); g.addColorStop(1, dk(col, 0.2)); fillInk(c, g, 3);
      c.beginPath(); c.ellipse(0, 4, 20, 9, 0, 0.1, Math.PI - 0.1); c.lineWidth = 2; c.strokeStyle = dk(col, 0.35); c.stroke();
    } else if (k === 'cooker') {
      RR(c, -14, -12, 28, 32, 12, '#f2f2f2', INK, 2.5);
    } else if (k === 'jersey') {
      RR(c, -13, -12, 26, 30, 11, '#fff', INK, 2.5); RR(c, -13, 12, 26, 5, 2, '#e63e3e');
    } else if (k === 'apron' || k === 'kotatsu') {
      RR(c, -13, -12, 26, 30, 11, SHIRT, 'rgba(27,20,48,.3)', 2);
    } else {
      RR(c, -13, -12, 26, 30, 11, col, INK, 2.5);
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
    for (var i = tiers.length - 1; i >= 0; i--) { var f = tiers[i]; ell(c, f[0], f[1], f[2], f[3], f[4]); fillInk(c, i % 2 ? '#ffffff' : '#f2f6ff', 2.5); }
    c.save(); c.setLineDash([4, 4]); ell(c, 64, -34, 46, 15, -0.35); c.lineWidth = 1.5; c.strokeStyle = 'rgba(90,61,43,.45)'; c.stroke(); c.restore();   // ぬい目(つくりもの)
    c.restore();
  }
  function panelWing(c, sd, t) {
    c.save(); c.translate(195 + sd * 30, 352); c.rotate(sd * (-0.3 + Math.sin(t * 1.5) * 0.03)); c.scale(sd, 1);
    RR(c, 0, -58, 98, 98, 6, '#cfd8e0', INK, 3); RR(c, 6, -52, 86, 86, 3, '#24477a');
    c.strokeStyle = '#6a8fc8'; c.lineWidth = 1.5;
    for (var i = 1; i < 4; i++) { c.beginPath(); c.moveTo(6 + i * 21.5, -52); c.lineTo(6 + i * 21.5, 34); c.moveTo(6, -52 + i * 21.5); c.lineTo(92, -52 + i * 21.5); c.stroke(); }
    c.fillStyle = 'rgba(255,255,255,.3)'; c.beginPath(); c.moveTo(20, -52); c.lineTo(44, -52); c.lineTo(14, 34); c.lineTo(6, 34); c.lineTo(6, 0); c.closePath(); c.fill();
    c.restore();
  }
  function drawCapeBack(c, T, s, t) {
    var k = s.t, col = s.col, sway = Math.sin(t * 1.6) * 6, x, y, i;
    function main(hemY, half, scallop, lw, edge) {
      capeShape(c, hemY, half, sway, scallop); c.fillStyle = col; c.fill();
      c.save(); capeShape(c, hemY, half, sway, scallop); c.clip();
      capeShape(c, hemY, half, sway, scallop); c.lineWidth = edge ? 14 : 18; c.strokeStyle = edge || dk(col, 0.18); c.stroke();
      return function () { c.restore(); capeShape(c, hemY, half, sway, scallop); ink(c, lw || 3); };
    }
    var done;
    if (k === 'wings') { wing(c, -1, t); wing(c, 1, t); return; }
    if (k === 'panel') { panelWing(c, -1, t); panelWing(c, 1, t); return; }
    if (k === 'towel') {
      done = main(442, 66, false);
      c.fillStyle = '#4fa8d8'; c.fillRect(100, 414, 200, 7); c.fillRect(100, 426, 200, 4);
      done();
      c.lineWidth = 2; c.strokeStyle = INK; c.beginPath();
      for (x = 133; x <= 257; x += 9) { c.moveTo(x + sway, 446); c.lineTo(x + sway, 455); } c.stroke();
    } else if (k === 'sheet') {
      done = main(486, 94, true, 3, 'rgba(0,0,0,.06)'); done();
      T.em('👻', 195 + 84 + sway, 468, 28);
    } else if (k === 'rain') {
      ell(c, 195, 238, 99, 100); fillInk(c, col, 3); ell(c, 195, 246, 88, 86); c.fillStyle = dk(col, 0.25); c.fill();   // フード(頭の後ろ)
      done = main(472, 86, false);
      c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 4; c.beginPath(); c.moveTo(130, 380); c.lineTo(124, 440); c.moveTo(262, 380); c.lineTo(268, 440); c.stroke();
      done();
    } else if (k === 'karakusa') {   // ふろしき(からくさ もよう)
      done = main(482, 90, false);
      c.strokeStyle = '#fff'; c.lineWidth = 3;
      for (y = 344, i = 0; y < 500; y += 30, i++) for (x = 108 + (i % 2) * 17; x < 290; x += 34) {
        c.beginPath(); for (var a = 0; a < 9.5; a += 0.35) { var r = 1.5 + a * 1.1; if (a) c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); else c.moveTo(x + r, y); } c.stroke();
      }
      done();
    } else if (k === 'curtain') {
      done = main(494, 92, false);
      c.fillStyle = dk(col, 0.15); for (x = 98; x < 296; x += 16) c.fillRect(x, 320, 7, 190);
      done();
    } else if (k === 'futon') {
      done = main(502, 108, false, 4);
      c.strokeStyle = lt(col, 0.5); c.lineWidth = 2.5;
      for (x = 40; x < 360; x += 30) { c.beginPath(); c.moveTo(x, 320); c.lineTo(x + 180, 520); c.moveTo(x + 40, 320); c.lineTo(x - 140, 520); c.stroke(); }
      done();
    } else if (k === 'hero') {
      done = main(506, 102, false, 3, '#ffd84d'); done();
    } else {
      done = main(482, 88, false); done();
      T.em(s.em, 195 + 70 + sway, 464, 26);
    }
  }
  /* マントの前の部品(留め金・肩ひも)。体のあと・腕の前に描く */
  function drawCapeFront(c, s) {
    var k = s.t;
    if (k === 'wings' || k === 'panel') {   // 背負いひも(つくりもの感)
      c.beginPath(); c.moveTo(158, 322); c.quadraticCurveTo(148, 360, 160, 398); c.moveTo(232, 322); c.quadraticCurveTo(242, 360, 230, 398);
      c.lineWidth = 8; c.strokeStyle = INK; c.stroke(); c.lineWidth = 5; c.strokeStyle = k === 'wings' ? '#fff' : '#cfd8e0'; c.stroke();
    } else if (k === 'towel' || k === 'sheet' || k === 'curtain' || k === 'futon') {
      // 首のうしろで むすんでいる(前からは 見えない)
    } else {
      var cc = k === 'hero' ? '#ffd84d' : k === 'rain' ? dk(s.col, 0.2) : k === 'karakusa' ? '#fff' : '#ffd84d';
      circ(c, 156, 334, 7.5); fillInk(c, cc, 2.5); circ(c, 234, 334, 7.5); fillInk(c, cc, 2.5);
    }
  }

  /* ---------- こし(ベルト。腰 y=404 に巻く) ---------- */
  function drawTube(c, s, front) {
    c.save(); c.beginPath(); if (front) c.rect(0, 410, 400, 200); else c.rect(0, 200, 400, 210); c.clip();
    ell(c, 195, 410, 76, 20); c.lineWidth = 27; c.strokeStyle = INK; c.stroke(); c.lineWidth = 21; c.strokeStyle = s.col; c.stroke();
    c.setLineDash([22, 22]); c.strokeStyle = '#fff'; c.stroke(); c.setLineDash([]);
    if (front) shine(c, 158, 426, 12, 3, -0.2, 0.75);
    c.restore();
  }
  function drawWaist(c, T, s, t) {
    var k = s.t, col = s.col, y = 404, i, x;
    function band(h, c1) { RR(c, BODY.x - 3, y - h / 2, BODY.w + 6, h, Math.min(8, h / 2), c1, INK, 3); }
    if (k === 'belt') {
      band(16, col); RR(c, 179, y - 13, 32, 26, 5, '#ffd84d', INK, 3); RR(c, 186, y - 6, 18, 12, 3, col); shine(c, 184, y - 9, 4, 2, 0, 0.8);
    } else if (k === 'jumprope') {
      for (i = 0; i < 2; i++) {
        c.beginPath(); for (x = 0; x <= 20; x++) { var px = BODY.x - 4 + x * (BODY.w + 8) / 20, py = y - 5 + i * 10 + Math.sin(x * 0.9 + i) * 3; if (x) c.lineTo(px, py); else c.moveTo(px, py); }
        c.lineWidth = 8; c.strokeStyle = INK; c.stroke(); c.lineWidth = 5; c.strokeStyle = col; c.stroke();
      }
      c.beginPath(); c.moveTo(249, y + 4); c.quadraticCurveTo(262, y + 16, 256, y + 30); c.lineWidth = 7; c.strokeStyle = INK; c.stroke(); c.lineWidth = 4; c.strokeStyle = col; c.stroke();
      RR(c, 250, y + 28, 12, 28, 6, '#c8915a', INK, 2.5);
    } else if (k === 'tube') {
      drawTube(c, s, true);
    } else if (k === 'pouch') {
      band(8, '#2d3436'); RR(c, 170, y - 2, 50, 32, 11, col, INK, 3);
      c.beginPath(); c.moveTo(176, y + 8); c.lineTo(214, y + 8); c.lineWidth = 2; c.strokeStyle = '#888'; c.stroke(); RR(c, 208, y + 6, 6, 10, 2, '#ffd84d', INK, 1.5);
    } else if (k === 'snake') {
      c.beginPath(); for (i = 0; i <= 24; i++) { x = BODY.x - 4 + i * (BODY.w + 8) / 24; var yy = y + Math.sin(i * 0.8 + t * 3) * 5; if (i) c.lineTo(x, yy); else c.moveTo(x, yy); }
      c.lineCap = 'round'; c.lineWidth = 17; c.strokeStyle = INK; c.stroke(); c.lineWidth = 12; c.strokeStyle = col; c.stroke();
      c.setLineDash([3, 9]); c.strokeStyle = '#1e8449'; c.lineWidth = 5; c.stroke(); c.setLineDash([]);
      ell(c, 258, y - 4, 14, 10, -0.3); fillInk(c, col, 3);
      circ(c, 261, y - 8, 3.5); c.fillStyle = '#fff'; c.fill(); circ(c, 262, y - 8, 1.8); c.fillStyle = INK; c.fill();
      if (Math.floor(t * 3) % 2) { c.beginPath(); c.moveTo(270, y - 2); c.lineTo(280, y); c.lineTo(284, y - 4); c.moveTo(280, y); c.lineTo(284, y + 3); c.lineWidth = 2; c.strokeStyle = '#e63e3e'; c.stroke(); }
    } else if (k === 'tools') {
      band(16, col); T.em('🔨', 162, y + 2, 28); T.em('🔧', 228, y + 2, 24);
      RR(c, 150, y + 6, 26, 22, 4, dk(col, 0.15), INK, 2.5); RR(c, 215, y + 6, 26, 22, 4, dk(col, 0.15), INK, 2.5);
      RR(c, 185, y - 8, 20, 16, 3, '#cfd8e0', INK, 2.5);
    } else if (k === 'mawashi') {
      for (x = 170; x <= 220; x += 10) { c.beginPath(); c.moveTo(x, y + 12); c.lineTo(x + (x - 195) * 0.08, y + 46); c.lineWidth = 6; c.strokeStyle = INK; c.stroke(); c.lineWidth = 3.5; c.strokeStyle = col; c.stroke(); }
      band(28, col);
      c.beginPath(); c.moveTo(180, y + 12); c.lineTo(210, y + 12); c.lineTo(205, 446); c.lineTo(185, 446); c.closePath(); fillInk(c, col, 3);
    } else if (k === 'obi') {
      ell(c, 258, y - 11, 17, 11, -0.5); fillInk(c, lt(col, 0.2), 2.5); ell(c, 258, y + 11, 17, 11, 0.5); fillInk(c, lt(col, 0.2), 2.5);
      band(32, col);
      c.save(); rrPath(c, BODY.x - 3, y - 16, BODY.w + 6, 32, 8); c.clip(); c.strokeStyle = lt(col, 0.4); c.lineWidth = 2;
      for (x = BODY.x - 10; x < 270; x += 14) { c.beginPath(); c.moveTo(x, y - 16); c.lineTo(x + 14, y + 16); c.moveTo(x + 14, y - 16); c.lineTo(x, y + 16); c.stroke(); }
      c.restore();
      c.beginPath(); c.moveTo(BODY.x - 2, y); c.lineTo(BODY.x + BODY.w + 2, y); c.lineWidth = 7; c.strokeStyle = INK; c.stroke(); c.lineWidth = 4; c.strokeStyle = '#e63e3e'; c.stroke();
      circ(c, 195, y, 6); fillInk(c, '#5fb84e', 2); circ(c, 250, y, 6); fillInk(c, col, 2.5);
    } else if (k === 'champ') {
      band(22, '#222');
      RR(c, 148, y - 9, 20, 18, 4, '#ffd84d', INK, 2); RR(c, 222, y - 9, 20, 18, 4, '#ffd84d', INK, 2);
      ell(c, 195, y, 34, 25); fillInk(c, '#ffd84d', 3); ell(c, 195, y, 24, 17); c.lineWidth = 2.5; c.strokeStyle = '#d9a400'; c.stroke();
      circ(c, 195, y, 6.5); fillInk(c, '#e63e3e', 2); shine(c, 180, y - 12, 8, 3, -0.3, 0.8);
    } else {
      band(14, col); T.em(s.em, 195, y, 30);
    }
  }

  /* ---------- あし(靴。足の変換の中: 股関節が原点、足は +y) ---------- */
  function drawFoot(c, T, s, sd, t) {
    var k = s.t, col = s.col, L = LEG_LEN, i;
    if (k === 'slipper') {
      ell(c, sd * 3, L + 14, 22, 9); fillInk(c, lt(col, 0.35), 2.5);
      c.beginPath(); c.moveTo(-17 + sd * 3, L + 13); c.quadraticCurveTo(sd * 3, L - 8, 17 + sd * 3, L + 13); c.closePath(); fillInk(c, col, 2.5);
    } else if (k === 'shoe') {
      RR(c, -19 + sd * 3, L + 12, 38, 8, 3, dk(col, 0.4), INK, 2);
      RR(c, -18 + sd * 3, L - 4, 36, 22, 10, col, INK, 2.5);
      c.beginPath(); c.moveTo(-6 + sd * 3, L - 1); c.lineTo(6 + sd * 3, L + 3); c.moveTo(6 + sd * 3, L - 1); c.lineTo(-6 + sd * 3, L + 3); c.lineWidth = 2; c.strokeStyle = '#f5e6d0'; c.stroke();
      shine(c, sd * 4 - 5, L + 6, 6, 2.5, 0, 0.7);
      if (Math.floor(t * 2 + (sd > 0 ? 1 : 0)) % 2 === 0) T.em('✨', sd * 22, L - 6, 14);
    } else if (k === 'geta') {
      RR(c, -14, L + 16, 8, 10, 2, '#a0703a', INK, 2); RR(c, 6, L + 16, 8, 10, 2, '#a0703a', INK, 2);
      RR(c, -20, L + 7, 40, 11, 3, '#d9a86a', INK, 2.5);
      c.beginPath(); c.moveTo(-12, L + 9); c.lineTo(0, L - 3); c.lineTo(12, L + 9); c.lineWidth = 7; c.strokeStyle = INK; c.stroke(); c.lineWidth = 4; c.strokeStyle = '#e63e3e'; c.stroke();
    } else if (k === 'boot') {
      var bc = s.metal ? '#9aa3ab' : col;
      RR(c, -16, L - 36, 32, 42, 8, bc, INK, 2.5);
      RR(c, -19 + sd * 3, L + 13, 38, 7, 3, dk(bc, 0.4), INK, 2);
      RR(c, -18 + sd * 3, L - 2, 36, 21, 9, bc, INK, 2.5);
      RR(c, -17, L - 39, 34, 10, 4, s.metal ? '#cfd8e0' : lt(col, 0.4), INK, 2);
      RR(c, -11, L - 28, 5, 26, 2, 'rgba(255,255,255,.6)');
      if (s.metal) { ell(c, 0, L - 40, 13, 9); fillInk(c, '#cfd8e0', 2.5); c.fillStyle = INK; for (i = 0; i < 3; i++) { circ(c, -9 + i * 9, L - 6, 2); c.fill(); } }
    } else if (k === 'stilts') {
      RR(c, sd * 20 - 5, -34, 10, L + 70, 5, '#7bb661', INK, 2.5);
      c.strokeStyle = '#4e8a3a'; c.lineWidth = 2.5; for (i = 0; i < 3; i++) { c.beginPath(); c.moveTo(sd * 20 - 5, i * 30 - 6); c.lineTo(sd * 20 + 5, i * 30 - 6); c.stroke(); }
      RR(c, -18 + sd * 3, L - 2, 36, 22, 9, SHOE, INK, 2.5);
      RR(c, sd * 4 - 18, L + 19, 40, 7, 3, '#a0703a', INK, 2);
    } else if (k === 'fins') {
      c.beginPath(); c.moveTo(-14 + sd * 2, L + 6); c.lineTo(14 + sd * 2, L + 6); c.lineTo(26 + sd * 8, L + 34); c.quadraticCurveTo(sd * 6, L + 41, -26 + sd * 4, L + 34); c.closePath(); fillInk(c, col, 2.5);
      c.strokeStyle = dk(col, 0.25); c.lineWidth = 2; for (i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(i * 7 + sd * 2, L + 10); c.lineTo(i * 14 + sd * 5, L + 34); c.stroke(); }
      RR(c, -16 + sd * 2, L - 4, 32, 16, 7, dk(col, 0.2), INK, 2.5);
    } else if (k === 'sneaker') {
      RR(c, -18 + sd * 3, L - 4, 36, 22, 10, col, INK, 2.5);
      RR(c, -19 + sd * 3, L + 11, 38, 10, 4, '#fff', INK, 2);
      for (i = 0; i < 3; i++) { circ(c, -10 + sd * 3 + i * 10, L + 16, 2.6); c.fillStyle = 'hsl(' + Math.round((t * 220 + i * 120) % 360) + ',95%,60%)'; c.fill(); }
      c.beginPath(); c.moveTo(-6 + sd * 3, L); c.lineTo(6 + sd * 3, L + 4); c.moveTo(6 + sd * 3, L); c.lineTo(-6 + sd * 3, L + 4); c.lineWidth = 2; c.strokeStyle = '#fff'; c.stroke();
    } else if (k === 'skate') {
      RR(c, -16, L - 20, 32, 38, 9, col, INK, 2.5);
      c.beginPath(); for (i = 0; i < 3; i++) { c.moveTo(-6, L - 14 + i * 7); c.lineTo(6, L - 10 + i * 7); c.moveTo(6, L - 14 + i * 7); c.lineTo(-6, L - 10 + i * 7); } c.lineWidth = 2; c.strokeStyle = '#fff'; c.stroke();
      RR(c, -19, L + 14, 38, 6, 2, '#ddd', INK, 2);
      circ(c, -10, L + 25, 6.5); fillInk(c, '#ffd84d', 2); circ(c, 10, L + 25, 6.5); fillInk(c, '#ffd84d', 2);
    } else if (k === 'spring') {
      var sq = Math.abs(Math.sin(t * 5)) * 4;
      c.beginPath(); c.moveTo(0, L + 16); for (i = 1; i <= 6; i++) c.lineTo(i % 2 ? 10 : -10, L + 16 + i * (18 - sq) / 6); c.lineWidth = 5; c.strokeStyle = INK; c.stroke(); c.lineWidth = 3; c.strokeStyle = '#cfd8e0'; c.stroke();
      RR(c, -13, L + 33 - sq, 26, 6, 3, '#888', INK, 2);
      RR(c, -18 + sd * 3, L - 4, 36, 22, 10, col, INK, 2.5);
    } else {
      RR(c, -18 + sd * 3, L - 2, 36, 22, 9, col, INK, 2.5); T.em(s.em, sd * 3, L + 8, 22);
    }
  }

  /* ---------- あたま(かぶりもの。頭の変換の中) ---------- */
  function drawHat(c, T, s, t) {
    var k = s.t, col = s.col, i, sd;
    if (k === 'cone') {
      c.beginPath(); c.moveTo(150, 204); c.quadraticCurveTo(104, 300, 195, 328); c.lineWidth = 1.6; c.strokeStyle = 'rgba(90,61,43,.65)'; c.stroke();   // あごのゴム
      c.save(); c.translate(200, 198); c.rotate(0.12);
      var cone = function () { c.beginPath(); c.moveTo(-50, 0); c.lineTo(0, -112); c.lineTo(50, 0); c.quadraticCurveTo(0, 12, -50, 0); c.closePath(); };
      cone(); c.fillStyle = col; c.fill();
      c.save(); cone(); c.clip(); c.lineWidth = 8; c.strokeStyle = 'rgba(255,255,255,.6)';
      for (i = -6; i <= 6; i++) { c.beginPath(); c.moveTo(-60 + i * 24, 12); c.lineTo(-10 + i * 24, -122); c.stroke(); }
      c.fillStyle = '#ffd84d'; [[-20, -24], [14, -50], [-4, -78], [26, -14]].forEach(function (p) { circ(c, p[0], p[1], 4.5); c.fill(); });
      c.restore(); cone(); ink(c, 3);
      circ(c, 0, -114, 12); fillInk(c, '#ffd84d', 2.5); circ(c, -4, -118, 3.5); c.fillStyle = '#fff'; c.fill();
      c.restore();
    } else if (k === 'cap') {
      c.beginPath(); c.arc(195, 216, 84, Math.PI, 0); c.closePath(); fillInk(c, col, 3);
      c.beginPath(); c.moveTo(195, 132); c.quadraticCurveTo(168, 170, 160, 216); c.moveTo(195, 132); c.quadraticCurveTo(222, 170, 230, 216); c.lineWidth = 2; c.strokeStyle = dk(col, 0.3); c.stroke();
      circ(c, 195, 133, 6); fillInk(c, lt(col, 0.2), 2);
      ell(c, 195, 216, 92, 15); fillInk(c, dk(col, 0.15), 3);
      shine(c, 160, 160, 14, 6, -0.6, 0.35);
      c.beginPath(); c.moveTo(262, 190); c.lineTo(284, 226); c.lineWidth = 1.6; c.strokeStyle = INK; c.stroke();   // 値札
      c.save(); c.translate(288, 238); c.rotate(0.25); RR(c, -20, -10, 40, 22, 4, '#fff', INK, 2); circ(c, -14, -4, 2); c.fillStyle = INK; c.fill();
      TX(c, (s.price || 0) + 'G', 2, 1.5, 10, '#e63e3e', 'center', 900, null); c.restore();
    } else if (k === 'bucket') {
      c.beginPath(); c.moveTo(112, 216); c.lineTo(140, 116); c.lineTo(250, 116); c.lineTo(278, 216); c.closePath(); fillInk(c, col, 3);
      c.strokeStyle = dk(col, 0.25); c.lineWidth = 2.5; c.beginPath(); c.moveTo(128, 160); c.lineTo(262, 160); c.moveTo(122, 182); c.lineTo(268, 182); c.stroke();
      ell(c, 195, 116, 55, 8); fillInk(c, dk(col, 0.15), 2.5);
      RR(c, 104, 206, 182, 17, 7, lt(col, 0.25), INK, 3);
      c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.moveTo(150, 120); c.lineTo(164, 120); c.lineTo(142, 206); c.lineTo(128, 206); c.closePath(); c.fill();
    } else if (k === 'bowl') {
      var bowl = function () { c.beginPath(); c.moveTo(108, 216); c.bezierCurveTo(112, 118, 278, 118, 282, 216); c.closePath(); };
      bowl(); c.fillStyle = col; c.fill();
      c.save(); bowl(); c.clip(); c.strokeStyle = '#3b6fd8'; c.lineWidth = 4; c.beginPath();
      for (i = 100; i <= 290; i += 6) { if (i === 100) c.moveTo(i, 192 + Math.sin(i * 0.2) * 4); else c.lineTo(i, 192 + Math.sin(i * 0.2) * 4); } c.stroke();
      c.lineWidth = 2.5; c.beginPath(); c.moveTo(100, 204); c.lineTo(290, 204); c.stroke(); c.restore();
      bowl(); ink(c, 3);
      RR(c, 168, 128, 54, 15, 5, col, INK, 2.5);
      shine(c, 140, 168, 6, 16, 0.4, 0.7);
    } else if (k === 'octo') {
      var tx = [118, 136, 154, 236, 254, 272];
      for (i = 0; i < 6; i++) {
        var x = tx[i], wig = Math.sin(t * 3 + i) * 5; sd = x < 195 ? -1 : 1;
        c.beginPath(); c.moveTo(x, 196); c.quadraticCurveTo(x + sd * 14 + wig, 232, x + sd * (6 + (i % 3) * 4) + wig, 264 - (i % 3) * 10);
        c.lineCap = 'round'; c.lineWidth = 16; c.strokeStyle = INK; c.stroke(); c.lineWidth = 11; c.strokeStyle = col; c.stroke();
      }
      ell(c, 195, 176, 72, 54); fillInk(c, col, 3);
      c.fillStyle = lt(col, 0.3); circ(c, 160, 160, 6); c.fill(); circ(c, 232, 150, 5); c.fill(); circ(c, 214, 132, 4); c.fill();
      for (sd = -1; sd <= 1; sd += 2) { ell(c, 195 + sd * 20, 184, 10, 12); fillInk(c, '#fff', 2); circ(c, 195 + sd * 20 + 2, 187, 5); c.fillStyle = INK; c.fill(); }
      RR(c, 187, 200, 16, 12, 6, dk(col, 0.15), INK, 2);
    } else if (k === 'pudding') {
      var jg = 1 + Math.sin(t * 4) * 0.03;
      c.save(); c.translate(195, 216); c.scale(1 / jg, jg);
      c.beginPath(); c.moveTo(-76, 0); c.lineTo(-54, -78); c.quadraticCurveTo(0, -88, 54, -78); c.lineTo(76, 0); c.quadraticCurveTo(0, 12, -76, 0); c.closePath(); fillInk(c, col, 3);
      c.beginPath(); c.moveTo(-54, -78); c.quadraticCurveTo(0, -88, 54, -78); c.lineTo(57, -64);
      c.quadraticCurveTo(50, -48, 42, -62); c.quadraticCurveTo(28, -70, 14, -60); c.quadraticCurveTo(6, -42, -4, -60); c.quadraticCurveTo(-24, -68, -36, -60); c.quadraticCurveTo(-44, -46, -50, -62); c.lineTo(-57, -64); c.closePath(); fillInk(c, '#a0521d', 2.5);
      circ(c, -12, -88, 12); fillInk(c, '#fff', 2.5); circ(c, 10, -90, 13); fillInk(c, '#fff', 2.5);
      c.beginPath(); c.moveTo(4, -112); c.quadraticCurveTo(10, -128, 18, -130); c.lineWidth = 2.5; c.strokeStyle = '#5fb84e'; c.stroke();
      circ(c, 4, -108, 9); fillInk(c, '#e63e3e', 2.5); circ(c, 1, -111, 2.5); c.fillStyle = '#fff'; c.fill();
      shine(c, -48, -30, 6, 20, 0.25, 0.6);
      c.restore();
    } else if (k === 'ears') {
      c.beginPath(); c.arc(195, 250, 84, Math.PI * 1.15, Math.PI * 1.85); c.lineWidth = 10; c.strokeStyle = INK; c.stroke(); c.lineWidth = 6.5; c.strokeStyle = dk(col, 0.1); c.stroke();
      for (sd = -1; sd <= 1; sd += 2) {
        var tw = (sd > 0 && (t % 3) < 0.25) ? 0.25 : 0;
        c.save(); c.translate(195 + sd * 52, 188); c.rotate(sd * (0.28 + tw));
        c.beginPath(); c.moveTo(-23, 10); c.lineTo(0, -42); c.lineTo(23, 10); c.closePath(); fillInk(c, col, 3);
        c.beginPath(); c.moveTo(-11, 5); c.lineTo(0, -24); c.lineTo(11, 5); c.closePath(); c.fillStyle = lt(col, 0.55); c.fill();
        c.restore();
      }
    } else if (k === 'helmet') {
      c.beginPath(); c.moveTo(118, 214); c.lineTo(160, 322); c.moveTo(272, 214); c.lineTo(230, 322); c.lineWidth = 3.5; c.strokeStyle = 'rgba(58,36,24,.8)'; c.stroke();
      RR(c, 185, 316, 20, 10, 3, '#333');
      var helm = function () { c.beginPath(); c.moveTo(106, 218); c.bezierCurveTo(102, 108, 288, 108, 284, 218); c.quadraticCurveTo(195, 204, 106, 218); c.closePath(); };
      helm(); fillInk(c, col, 3);
      for (i = -1; i <= 1; i++) RR(c, 195 + i * 34 - 7, 138 + Math.abs(i) * 10, 14, 40, 7, dk(col, 0.35));
      c.beginPath(); c.moveTo(126, 212); c.quadraticCurveTo(195, 236, 264, 212); c.lineTo(262, 206); c.quadraticCurveTo(195, 222, 128, 206); c.closePath(); fillInk(c, dk(col, 0.2), 2.5);
      shine(c, 148, 156, 14, 7, -0.7, 0.5);
    } else if (k === 'kabuto') {
      for (sd = -1; sd <= 1; sd += 2) {   // ほおの板(顔のまわりを囲む)
        c.beginPath(); c.moveTo(195 + sd * 64, 206); c.quadraticCurveTo(195 + sd * 102, 232, 195 + sd * 96, 288); c.lineTo(195 + sd * 70, 310); c.quadraticCurveTo(195 + sd * 78, 252, 195 + sd * 56, 214); c.closePath();
        fillInk(c, dk(col, 0.08), 3);
        c.beginPath(); c.moveTo(195 + sd * 74, 236); c.quadraticCurveTo(195 + sd * 92, 250, 195 + sd * 88, 280); c.lineWidth = 2; c.strokeStyle = lt(col, 0.4); c.stroke();
      }
      c.beginPath(); c.moveTo(104, 216); c.bezierCurveTo(98, 102, 292, 102, 286, 216); c.closePath();
      var g = c.createLinearGradient(120, 120, 270, 216); g.addColorStop(0, lt(col, 0.6)); g.addColorStop(1, dk(col, 0.25)); fillInk(c, g, 3);
      for (i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(195 + i * 24, 126 + Math.abs(i) * 7); c.quadraticCurveTo(195 + i * 30, 170, 195 + i * 38, 212); c.lineWidth = 2; c.strokeStyle = dk(col, 0.3); c.stroke(); }
      c.beginPath(); c.moveTo(188, 214); c.quadraticCurveTo(158, 180, 146, 106); c.moveTo(202, 214); c.quadraticCurveTo(232, 180, 244, 106);   // くわがた(金の角)
      c.lineWidth = 14; c.strokeStyle = INK; c.stroke(); c.lineWidth = 9; c.strokeStyle = '#ffd84d'; c.stroke();
      c.beginPath(); c.moveTo(100, 210); c.quadraticCurveTo(195, 236, 290, 210); c.lineTo(288, 222); c.quadraticCurveTo(195, 248, 102, 222); c.closePath(); fillInk(c, dk(col, 0.3), 3);
      circ(c, 195, 214, 10); fillInk(c, '#ffd84d', 2.5);
      c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.moveTo(140, 130); c.lineTo(156, 124); c.lineTo(132, 196); c.lineTo(118, 196); c.closePath(); c.fill();
    } else if (k === 'crown') {
      c.save(); c.translate(195, 184); c.rotate(-0.12);
      c.beginPath(); c.moveTo(-46, 14); c.lineTo(-52, -30); c.lineTo(-26, -8); c.lineTo(0, -42); c.lineTo(26, -8); c.lineTo(52, -30); c.lineTo(46, 14); c.closePath(); fillInk(c, '#ffd84d', 3);
      RR(c, -49, 1, 98, 15, 5, '#f0c020', INK, 2.5);
      [[-26, '#e63e3e'], [0, '#4fa8d8'], [26, '#5fb84e']].forEach(function (j) { circ(c, j[0], 8.5, 4.5); fillInk(c, j[1], 1.5); });
      [[-52, -32, 5], [0, -44, 6], [52, -32, 5]].forEach(function (j) { circ(c, j[0], j[1], j[2]); fillInk(c, '#fff6b0', 2); });
      shine(c, -30, -6, 3, 9, 0.5, 0.75);
      c.restore();
    } else if (k === 'antenna') {
      c.beginPath(); c.arc(195, 250, 84, Math.PI * 1.15, Math.PI * 1.85); c.lineWidth = 10; c.strokeStyle = INK; c.stroke(); c.lineWidth = 6.5; c.strokeStyle = '#3a3a3a'; c.stroke();
      for (sd = -1; sd <= 1; sd += 2) {
        var bx = 195 + sd * 34, w = Math.sin(t * 4 + sd) * 8, ex = bx + sd * 26 + w;
        c.beginPath(); c.moveTo(bx, 176); c.quadraticCurveTo(bx + sd * 2, 122, ex, 96); c.lineWidth = 6; c.strokeStyle = INK; c.stroke(); c.lineWidth = 3; c.strokeStyle = dk(col, 0.3); c.stroke();
        if (Math.floor(t * 3) % 2) { circ(c, ex, 92, 21); c.fillStyle = 'rgba(46,204,113,.3)'; c.fill(); }
        circ(c, ex, 92, 13); fillInk(c, col, 3); circ(c, ex - 4, 88, 3.5); c.fillStyle = '#fff'; c.fill();
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
    } else if (k === 'g3d') {
      c.beginPath(); c.moveTo(142, 250); c.lineTo(120, 246); c.moveTo(248, 250); c.lineTo(270, 246); ink(c, 3.5);
      RR(c, 142, 240, 106, 32, 6, '#fff', INK, 2.5);
      RR(c, 148, 244, 42, 24, 4, 'rgba(230,60,60,.72)'); RR(c, 200, 244, 42, 24, 4, 'rgba(60,110,230,.72)');
    } else if (k === 'net') {
      c.save(); c.beginPath(); c.moveTo(98, 202); c.lineTo(292, 202); c.lineTo(282, 318); c.quadraticCurveTo(195, 342, 108, 318); c.closePath();
      c.fillStyle = 'rgba(110,140,110,.2)'; c.fill(); c.lineWidth = 2; c.strokeStyle = 'rgba(60,80,60,.6)'; c.stroke(); c.clip();
      c.strokeStyle = 'rgba(60,80,60,.35)'; c.lineWidth = 1.2;
      for (i = 96; i < 296; i += 8) { c.beginPath(); c.moveTo(i, 200); c.lineTo(i, 344); c.stroke(); }
      for (i = 204; i < 344; i += 8) { c.beginPath(); c.moveTo(96, i); c.lineTo(296, i); c.stroke(); }
      c.restore();
      c.beginPath(); c.ellipse(195, 196, 58, 36, 0, Math.PI, 0); c.closePath(); fillInk(c, '#e9cf8f', 3);
      ell(c, 195, 200, 102, 17); fillInk(c, '#e9cf8f', 3); RR(c, 140, 186, 110, 9, 3, '#5fb84e');
    } else if (k === 'groucho') {
      ell(c, L, 233, 18, 6.5, -0.1); c.fillStyle = '#3a2418'; c.fill(); ell(c, R, 233, 18, 6.5, 0.1); c.fill();
      for (i = 0; i < 2; i++) { circ(c, i ? R : L, ey, 16); c.fillStyle = 'rgba(255,255,255,.2)'; c.fill(); c.lineWidth = 4; c.strokeStyle = '#2a1a10'; c.stroke(); }
      c.beginPath(); c.moveTo(185, 254); c.quadraticCurveTo(195, 248, 205, 254); c.lineWidth = 4; c.stroke();
      ell(c, 195, 270, 12, 14); fillInk(c, '#ffb3a0', 2.5);
      c.beginPath(); c.moveTo(195, 281); c.bezierCurveTo(180, 273, 160, 281, 161, 294); c.bezierCurveTo(176, 291, 188, 289, 195, 285); c.bezierCurveTo(202, 289, 214, 291, 229, 294); c.bezierCurveTo(230, 281, 210, 273, 195, 281); c.closePath(); fillInk(c, col, 2);
    } else if (k === 'pack') {
      c.beginPath(); c.ellipse(195, 254, 66, 64, 0, 0, TAU);
      c.moveTo(L + 15, ey); c.ellipse(L, ey, 15, 16, 0, 0, TAU); c.moveTo(R + 15, ey); c.ellipse(R, ey, 15, 16, 0, 0, TAU); c.moveTo(213, 282); c.ellipse(195, 282, 18, 13, 0, 0, TAU);
      c.fillStyle = 'rgba(246,250,252,.94)'; c.fill('evenodd'); c.lineWidth = 2; c.strokeStyle = 'rgba(140,175,190,.9)'; c.stroke();
    } else if (k === 'snorkel') {
      c.beginPath(); c.moveTo(118, 252); c.lineTo(146, 254); c.moveTo(244, 254); c.lineTo(272, 252); c.lineWidth = 6; c.strokeStyle = '#2d3436'; c.stroke();
      c.beginPath(); c.moveTo(244, 266); c.quadraticCurveTo(270, 266, 270, 232); c.lineTo(270, 150); c.lineCap = 'round'; c.lineWidth = 13; c.strokeStyle = INK; c.stroke(); c.lineWidth = 8.5; c.strokeStyle = col; c.stroke();
      RR(c, 262, 136, 16, 14, 4, '#ff8a3d', INK, 2);
      RR(c, 145, 235, 100, 44, 16, col, INK, 3); RR(c, 153, 241, 84, 32, 11, 'rgba(180,230,255,.55)', INK, 2);
      c.beginPath(); c.moveTo(162, 248); c.lineTo(172, 248); c.lineWidth = 3; c.strokeStyle = '#fff'; c.stroke();
    } else if (k === 'patch') {
      c.beginPath(); c.moveTo(134, 202); c.lineTo(274, 272); c.lineWidth = 4.5; c.strokeStyle = '#222'; c.stroke();
      ell(c, R, ey, 18, 16); fillInk(c, '#222', 2.5);
      circ(c, R, ey - 3, 4.5); c.fillStyle = '#fff'; c.fill();
      c.beginPath(); c.moveTo(R - 6, ey + 4); c.lineTo(R + 6, ey + 9); c.moveTo(R + 6, ey + 4); c.lineTo(R - 6, ey + 9); c.lineWidth = 2; c.strokeStyle = '#fff'; c.stroke();
    } else if (k === 'shades') {
      c.beginPath(); c.moveTo(148, 250); c.lineTo(119, 246); c.moveTo(242, 250); c.lineTo(271, 246); c.lineWidth = 3.5; c.strokeStyle = '#111'; c.stroke();
      for (i = 0; i < 2; i++) { var x = i ? R : L; RR(c, x - 22, 242, 44, 27, 10, col, INK, 2.5); c.beginPath(); c.moveTo(x - 13, 249); c.lineTo(x - 4, 249); c.lineWidth = 3; c.strokeStyle = 'rgba(255,255,255,.8)'; c.stroke(); }
      c.beginPath(); c.moveTo(191, 249); c.quadraticCurveTo(195, 245, 199, 249); c.lineWidth = 3.5; c.strokeStyle = '#111'; c.stroke();
    } else if (k === 'mask') {
      var fl = Math.sin(t * 4) * 4;
      c.beginPath(); c.moveTo(142, 252); c.quadraticCurveTo(124, 244 + fl, 112, 250 + fl); c.moveTo(142, 254); c.quadraticCurveTo(126, 262 + fl, 116, 268 + fl); c.lineWidth = 7; c.strokeStyle = INK; c.stroke(); c.lineWidth = 4; c.strokeStyle = col; c.stroke();
      c.beginPath(); c.moveTo(140, 250); c.quadraticCurveTo(150, 232, 195, 240); c.quadraticCurveTo(240, 232, 250, 250); c.quadraticCurveTo(246, 276, 220, 276); c.quadraticCurveTo(200, 274, 195, 264); c.quadraticCurveTo(190, 274, 170, 276); c.quadraticCurveTo(144, 276, 140, 250); c.closePath();
      c.moveTo(L + 12, ey); c.ellipse(L, ey, 12, 13, 0, 0, TAU); c.moveTo(R + 12, ey); c.ellipse(R, ey, 12, 13, 0, 0, TAU);
      c.fillStyle = col; c.fill('evenodd'); ink(c, 2.5);
    } else if (k === 'teeth') {
      var ch = Math.sin(t * 10) * 1.5;
      ell(c, 195, 284, 30, 17); fillInk(c, '#ff8fa3', 2.5);
      for (i = -2; i <= 2; i++) { RR(c, 195 + i * 10 - 5, 271 - ch, 10, 12, 3, '#fff', INK, 1.5); RR(c, 195 + i * 10 - 5, 285 + ch, 10, 11, 3, '#fff', INK, 1.5); }
    } else {
      T.em(s.em, 195, 254, 64);
    }
  }

  /* ---------- 手に持つ物。p は手の中心、ブレードは ローカルの -y 方向 ---------- */
  function drawWeapon(c, T, s, t) {
    var k = s.t, col = s.col;
    if (k === 'stick') {
      RR(c, -7, -104, 14, 124, 7, '#d9a86a', INK, 2.5);
      c.strokeStyle = 'rgba(122,74,36,.5)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-2, -96); c.lineTo(-2, -30); c.moveTo(3, -80); c.lineTo(3, -10); c.stroke();
      RR(c, -8.5, -72, 17, 9, 3, '#e63e3e', INK, 1.5);   // 高級の 紅白ひも
    } else if (k === 'pan') {
      RR(c, -6, -46, 12, 60, 6, '#3a3a3a', INK, 2.5);
      ell(c, 0, -82, 38, 34); fillInk(c, '#4a4a4a', 3); ell(c, 0, -82, 29, 26); c.fillStyle = '#2e2e2e'; c.fill();
      ell(c, -2, -82, 17, 14); c.fillStyle = '#fff'; c.fill(); circ(c, 0, -82, 7); c.fillStyle = '#ffc93c'; c.fill();
      c.beginPath(); c.arc(0, -82, 33, Math.PI * 1.1, Math.PI * 1.4); c.lineWidth = 3; c.strokeStyle = 'rgba(255,255,255,.45)'; c.stroke();
    } else if (k === 'wand') {
      RR(c, -4.5, -84, 9, 100, 4.5, '#7a4a2a', INK, 2.5); RR(c, -6, -80, 12, 8, 3, col);
      starPath(c, 0, -100, 23, 10, 5); fillInk(c, '#ffd84d', 2.5);
      if (Math.floor(t * 2) % 2 === 0) T.em('✨', 20, -116, 18);
    } else if (k === 'sword') {
      var lg = s.legend, len = lg ? 128 : 108, bw = lg ? 11 : 9;
      if (lg) { c.save(); c.shadowColor = 'rgba(255,216,77,.95)'; c.shadowBlur = 14; }
      c.beginPath(); c.moveTo(-bw, -12); c.lineTo(-bw, -len); c.lineTo(0, -len - 18); c.lineTo(bw, -len); c.lineTo(bw, -12); c.closePath(); fillInk(c, lg ? '#eafaff' : '#e6ecf2', 2.5);
      if (lg) c.restore();
      c.beginPath(); c.moveTo(0, -18); c.lineTo(0, -len - 4); c.lineWidth = 2.5; c.strokeStyle = lg ? '#8fd3ff' : '#b7c2cc'; c.stroke();
      c.beginPath(); c.moveTo(-bw + 3.5, -20); c.lineTo(-bw + 3.5, -len + 4); c.lineWidth = 2; c.strokeStyle = 'rgba(255,255,255,.95)'; c.stroke();
      RR(c, -5, -8, 10, 26, 4, lg ? '#4a2a8a' : '#6b4226', INK, 2);
      RR(c, -27, -17, 54, 10, 5, lg ? '#ffd84d' : '#c9a227', INK, 2.5);
      circ(c, 0, 21, 6); fillInk(c, '#ffd84d', 2);
      if (lg) { circ(c, 0, -12, 5); fillInk(c, '#e63e3e', 2); }
      else {   // 保証書の札が ぶらさがっている
        c.beginPath(); c.moveTo(22, -9); c.lineTo(32, 4); c.lineWidth = 1.5; c.strokeStyle = INK; c.stroke();
        RR(c, 22, 3, 34, 16, 3, '#fff', INK, 1.5); TX(c, '保証書', 39, 11.5, 9, INK, 'center', 900, null);
      }
    } else {
      T.em(s.em, 0, -24, 76);
    }
  }
  function shieldPath(c, w, h) { c.beginPath(); c.moveTo(-w, -h); c.lineTo(w, -h); c.lineTo(w, -h * 0.1); c.quadraticCurveTo(w * 0.9, h * 0.7, 0, h); c.quadraticCurveTo(-w * 0.9, h * 0.7, -w, -h * 0.1); c.closePath(); }
  function drawShield(c, T, s, t) {
    var k = s.t, col = s.col, i;
    if (k === 'cardboard') {
      RR(c, -34, -38, 68, 76, 5, '#c9a066', INK, 3);
      c.beginPath(); c.moveTo(-34, -22); c.lineTo(34, -22); c.lineWidth = 2; c.strokeStyle = 'rgba(90,61,43,.4)'; c.stroke();
      c.fillStyle = 'rgba(245,228,180,.9)'; c.fillRect(-33, -6, 66, 14);
      TX(c, 'たて', 0, 22, 17, INK, 'center', 900, null);
    } else if (k === 'lid') {
      circ(c, 0, 0, 39); fillInk(c, '#a7b0b8', 3); circ(c, 0, 0, 29); c.lineWidth = 3; c.strokeStyle = 'rgba(255,255,255,.7)'; c.stroke();
      RR(c, -11, -6, 22, 12, 6, '#ffd84d', INK, 2.5); shine(c, -15, -19, 10, 4.5, -0.6, 0.7);
    } else if (k === 'pizza') {
      RR(c, -37, -35, 74, 70, 6, '#f0d3a0', INK, 3); circ(c, 0, -4, 20); fillInk(c, '#e63e3e', 2.5); T.em('🍕', 0, -3, 26);
      TX(c, 'PIZZA', 0, 25, 11, '#e63e3e', 'center', 900, null);
    } else if (k === 'woodshield') {
      shieldPath(c, 34, 42); fillInk(c, '#c08a50', 3);
      c.save(); shieldPath(c, 34, 42); c.clip(); c.strokeStyle = 'rgba(90,61,43,.45)'; c.lineWidth = 2; c.beginPath(); c.moveTo(-12, -44); c.lineTo(-12, 44); c.moveTo(12, -44); c.lineTo(12, 44); c.stroke(); c.restore();
      starPath(c, 10, -12, 13, 5.5, 5); fillInk(c, '#ffd84d', 2); heart(c, -13, 10, 8, '#ff8fc8');
    } else if (k === 'randoseru') {
      RR(c, -34, -40, 68, 82, 18, col, INK, 3);
      c.beginPath(); c.moveTo(-34, -24); c.lineTo(34, -24); c.lineTo(34, 8); c.quadraticCurveTo(34, 24, 20, 24); c.lineTo(-20, 24); c.quadraticCurveTo(-34, 24, -34, 8); c.closePath(); fillInk(c, dk(col, 0.15), 2.5);
      RR(c, -7, 17, 14, 12, 3, '#ffd84d', INK, 2); shine(c, -20, -32, 8, 3, 0, 0.6);
    } else if (k === 'manhole') {
      circ(c, 0, 0, 42); fillInk(c, '#5e5e5e', 3);
      c.save(); circ(c, 0, 0, 35); c.clip(); c.strokeStyle = '#7d7d7d'; c.lineWidth = 3;
      for (i = -60; i <= 60; i += 12) { c.beginPath(); c.moveTo(i - 40, -40); c.lineTo(i + 40, 40); c.moveTo(i + 40, -40); c.lineTo(i - 40, 40); c.stroke(); } c.restore();
      circ(c, 0, 0, 35); c.lineWidth = 3; c.strokeStyle = '#3e3e3e'; c.stroke(); circ(c, 0, 0, 12); fillInk(c, '#6e6e6e', 2);
    } else if (k === 'heroshield') {
      shieldPath(c, 40, 47); fillInk(c, '#2e6fd8', 3);
      c.save(); shieldPath(c, 40, 47); c.clip(); shieldPath(c, 40, 47); c.lineWidth = 12; c.strokeStyle = '#ffd84d'; c.stroke(); c.restore(); shieldPath(c, 40, 47); ink(c, 3);
      RR(c, -5, -28, 10, 50, 3, '#ffd84d', INK, 2); RR(c, -20, -14, 40, 10, 3, '#ffd84d', INK, 2);
      circ(c, 0, -9, 6); fillInk(c, '#e63e3e', 2); shine(c, -20, -30, 8, 3, -0.4, 0.6);
    }
  }
  /* ゆびわ(左手)。h = 手、sh = 肩 */
  function drawRing(c, T, s, t, h, sh) {
    var k = s.t, col = s.col, wx = sh.x + (h.x - sh.x) * 0.8, wy = sh.y + (h.y - sh.y) * 0.8, ang = Math.atan2(h.y - sh.y, h.x - sh.x) - Math.PI / 2;
    if (k === 'watch') {
      c.save(); c.translate(wx, wy); c.rotate(ang); RR(c, -14, -6, 28, 12, 4, '#2d3436', INK, 2); RR(c, -9, -9, 18, 18, 4, '#2d3436', INK, 2);
      RR(c, -6, -6, 12, 12, 3, Math.floor(t * 2) % 2 ? '#4fd1c5' : '#7dffb0'); c.restore();
    } else if (k === 'bracelet') {
      T.em(s.em, wx, wy, 30);
    } else if (k === 'band') {
      c.save(); c.translate(wx, wy); c.rotate(ang); ell(c, 0, 0, 14, 4); c.lineWidth = 3.5; c.strokeStyle = col; c.stroke(); c.restore();
    } else if (k === 'dangle') {
      c.beginPath(); c.moveTo(h.x + 2, h.y + 8); c.lineTo(h.x + 7, h.y + 22); c.lineWidth = 2; c.strokeStyle = INK; c.stroke(); T.em(s.em, h.x + 9, h.y + 31, 22);
    } else {
      var gx = h.x + 2, gy = h.y + 4, r = s.big ? 8 : 5.5;
      ell(c, gx, gy + 4, 9, 4.5); c.lineWidth = 6; c.strokeStyle = INK; c.stroke(); c.lineWidth = 3.5; c.strokeStyle = k === 'washer' ? '#aab3bb' : '#ffd84d'; c.stroke();
      if (k !== 'washer') {
        if (s.glow) { circ(c, gx, gy - 2, s.big ? 16 : 12); c.fillStyle = 'rgba(255,255,255,' + (0.35 + 0.25 * Math.sin(t * 5)).toFixed(3) + ')'; c.fill(); }
        c.beginPath(); c.moveTo(gx, gy - 2 - r); c.lineTo(gx + r, gy - 2); c.lineTo(gx, gy - 2 + r); c.lineTo(gx - r, gy - 2); c.closePath(); fillInk(c, col, 2);
        if (Math.floor(t * 2) % 2 === 0) T.em('✨', gx + 14, gy - 12, 16);
      }
    }
  }
  /* おまもり(首から下げる) */
  function drawCharm(c, T, s, t) {
    var k = s.t, i;
    if (k === 'receipt') {   // むねのポケットから ながーいレシートが たれている
      c.beginPath(); c.moveTo(218, 352);
      for (i = 1; i <= 10; i++) c.lineTo(218 + Math.sin(i * 0.9 + t * 2) * 5 + i * 2, 352 + i * 12);
      c.lineCap = 'butt'; c.lineWidth = 19; c.strokeStyle = INK; c.stroke(); c.lineWidth = 15; c.strokeStyle = '#fff'; c.stroke();
      c.setLineDash([6, 6]); c.lineWidth = 2; c.strokeStyle = '#b0a59a'; c.stroke(); c.setLineDash([]); c.lineCap = 'round';
      RR(c, 204, 344, 30, 18, 4, 'rgba(255,255,255,.35)', INK, 2);
      return;
    }
    c.beginPath(); c.moveTo(168, 318); c.lineTo(195, 362); c.lineTo(222, 318); c.lineWidth = 2.5; c.strokeStyle = INK; c.stroke();
    c.save(); c.translate(195, 362); c.rotate(Math.sin(t * 2) * 0.08);
    circ(c, 0, 14, 19 + Math.sin(t * 4) * 2); c.fillStyle = 'rgba(255,240,160,.6)'; c.fill();
    if (k === 'omamori') { RR(c, -12, 0, 24, 32, 5, '#e63e3e', INK, 2.5); circ(c, 0, 1, 5); fillInk(c, '#ffd84d', 2); TX(c, '守', 0, 19, 14, '#ffd84d', 'center', 900, null); }
    else T.em(s.em, 0, 15, 30);
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
      if (S.body && S.body.t === 'pajama') {                               // パジャマのズボン
        RR(c, -15, -10, 30, LEG_LEN - 6, 10, S.body.col, INK, 2.5);
        c.fillStyle = 'rgba(255,255,255,.7)'; circ(c, -5, 14, 3.5); c.fill(); circ(c, 6, 30, 3.5); c.fill();
      }
      if (S.feet) { popOn('feet', 0, LEG_LEN + 8); drawFoot(c, T, S.feet, sd, t); c.restore(); }
      else {   // 赤い靴(つま先は少し外側へ)
        RR(c, -18 + sd * 3, LEG_LEN - 2, 36, 22, 9, SHOE, SHOE_EDGE, 2);
        c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(sd * 4, LEG_LEN + 5, 7, 3, 0, 0, TAU); c.fill();   // つやの光
      }
      c.restore();
    }
    leg(-1, pose.rLeg); leg(1, pose.lLeg);

    /* 上半身(腰を原点に傾く) */
    c.save(); bodyFrame();

    /* 3 体 + 服(浮き輪は 後ろ半分を先に描く) */
    if (S.waist && S.waist.t === 'tube') { popOn('waist', 195, 404); drawTube(c, S.waist, false); c.restore(); }
    popOn('body', 195, 382); drawBodyWear(c, T, S.body, t); c.restore();
    /* 4 腰 */
    if (S.waist) { popOn('waist', 195, 404); drawWaist(c, T, S.waist, t); c.restore(); }
    else dotted(195, 404, 20);

    bowTie(c);
    if (S.cape) { popOn('cape', 195, 340); drawCapeFront(c, S.cape); c.restore(); }
    /* 5 お守り(首から下げる)。頭より先に描いて、ひもの上端は あごの下に隠れる */
    if (S.charm) { popOn('charm', 195, 376); drawCharm(c, T, S.charm, t); c.restore(); }
    else dotted(195, 376, 16);

    /* 6 腕(肩を原点に回す。袖は服に合わせる) */
    function arm(sd, th) {   // sd = -1 右腕(画面左) / +1 左腕(画面右)
      c.save(); c.translate(195 + sd * SHOULDER.dx, SHOULDER.y); c.rotate(-sd * th);
      RR(c, -11, -10, 22, ARM_LEN + 6, 11, SKIN);                            // 腕
      popOn('body', 0, 10); drawSleeve(c, S.body); c.restore();
      c.fillStyle = SKIN; c.beginPath(); c.arc(0, ARM_LEN, HAND_R, 0, TAU); c.fill();   // 丸い手
      c.restore();
    }
    arm(-1, pose.rArm); arm(1, pose.lArm);

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
    function fist(p) {        // にぎった手(持ち手の上にかぶせる)
      c.fillStyle = SKIN; circ(c, p.x, p.y, HAND_R); c.fill(); c.lineWidth = 2.5; c.strokeStyle = SKIN_EDGE; c.stroke();
      c.beginPath(); c.arc(p.x, p.y + 2, 8, Math.PI * 1.15, Math.PI * 1.85); c.lineWidth = 2; c.stroke();
    }
    function held(sd, th, slot) {
      var s = S[slot], h = hand(sd, th), sh = { x: 195 + sd * SHOULDER.dx, y: SHOULDER.y };
      if (!s) {
        var vx = h.x - TORSO_C.x, vy = h.y - TORSO_C.y, ln = Math.sqrt(vx * vx + vy * vy) || 1;
        dotted(h.x + vx / ln * 30, h.y + vy / ln * 30, 20);
      } else if (SHIELDS[s.t]) {   // 盾: 前腕に つける(体から見て外側へ少しずらす)
        var px = sh.x + (h.x - sh.x) * 0.72, py = sh.y + (h.y - sh.y) * 0.72, ox = px - TORSO_C.x, oy = py - TORSO_C.y, ol = Math.sqrt(ox * ox + oy * oy) || 1;
        c.save(); c.translate(px + ox / ol * 14, py + oy / ol * 14); c.rotate(sd * 0.06);
        popOn(slot, 0, 0); drawShield(c, T, s, t); c.restore(); c.restore();
      } else {                     // 武器など: 手で にぎる。先は 外側の上へ(腕を上げるほど まっすぐ上)
        var a = -Math.PI / 2 + sd * (0.65 - 0.3 * th);
        c.save(); c.translate(h.x, h.y); c.rotate(a + Math.PI / 2);
        popOn(slot, 0, -40); drawWeapon(c, T, s, t); c.restore(); c.restore();
        fist(h);
      }
      if (sd === 1) {
        if (S.ring) { popOn('ring', h.x, h.y); drawRing(c, T, S.ring, t, h, sh); c.restore(); }
        else dotted(h.x + 6, h.y + 14, 12);
      }
    }
    held(-1, pose.rArm, 'rhand'); held(1, pose.lArm, 'lhand');
    c.restore();   // 上半身

    /* ポーズのおまけ */
    if (poseName === 'money') {   // 札束ばらまき: 💴💸 を 6 枚、周りにふわふわ
      for (i = 0; i < 6; i++) {
        var ang = i * TAU / 6 + t * 0.4, d = 150 + Math.sin(t * 2 + i) * 12;
        T.em(i % 2 ? '💸' : '💴', 195 + Math.cos(ang) * d, 330 + Math.sin(ang) * d * 0.8 - 20, 44, 0.95);
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

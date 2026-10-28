'use strict';
/* 着せ替え人形(へっぽこ)・お披露目(showoff)・記念写真の絵。
   座標は docs/design-ui.md 7-2 の表(全身 400px、中心 (195,345))をそのまま使い、
   DOLL.draw が cx, cy, scale で動かす。
   絵文字は、メイン画面では ATL / BIG(アトラス)、保存用 canvas では fillText で描く。
   そのため「描く道具の束 T = { c: 2D context, em: 絵文字を描く関数 }」を全部の描画関数に渡す。 */
var DOLL = (function () {
  var SKIN = '#ffd9b3', SKIN_EDGE = '#e0a97a', INK = '#1b1430';
  var CX = 195, CY = 345;                 // 設計の人形の中心
  var TAU = Math.PI * 2;

  /* 装備の位置(設計 7-2。通常ポーズのとき)。空きスロットの点線の丸・お披露目のフラッシュに使う */
  var SLOT_POS = {
    head: [195, 160], face: [195, 238], charm: [195, 302], body: [195, 375], cape: [292, 292],
    waist: [195, 442], rhand: [111, 390], lhand: [279, 390], ring: [263, 408], feet: [195, 510]
  };

  /* ポーズ表。腕・足の角度は「外側(体から離れる向き)に上がる = プラス」で統一(ラジアン。0 = まっすぐ下)。
     body = 腰を軸にした上半身の傾き、head = 首を軸にした頭の傾き、dy = 全体の上下、shadow = 影の横半径 */
  var POSES = {
    normal: { rArm: 0.25, lArm: 0.25, rLeg: 0.00, lLeg: 0.00, body: 0.00, head: 0.00, dy: 0, face: '😊', shadow: 90, cape: 0 },
    hero:   { rArm: 2.30, lArm: 0.55, rLeg: 0.15, lLeg: 0.15, body: -0.04, head: -0.08, dy: 0, face: '😤', shadow: 90, cape: -0.15 },
    peace:  { rArm: 0.25, lArm: 2.15, rLeg: 0.00, lLeg: 0.10, body: 0.00, head: 0.10, dy: 0, face: '😆', shadow: 90, cape: 0 },
    smug:   { rArm: 0.30, lArm: 0.60, rLeg: 0.00, lLeg: 0.30, body: -0.10, head: -0.15, dy: 0, face: '😎', shadow: 90, cape: -0.3 },
    jump:   { rArm: 2.05, lArm: 2.05, rLeg: 0.40, lLeg: 0.40, body: 0.00, head: 0.00, dy: -40, face: '😝', shadow: 50, cape: 0.1 },
    money:  { rArm: 2.10, lArm: 2.10, rLeg: 0.10, lLeg: 0.10, body: -0.05, head: 0.05, dy: -6, face: '🤑', shadow: 90, cape: 0 },
    sleep:  { rArm: 0.35, lArm: 0.35, rLeg: 0.05, lLeg: 0.05, body: 0.00, head: 0.10, dy: 0, face: '😴', shadow: 150, cape: 0, lie: true }
  };

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

  /* ---------- 人形本体 ---------- */
  function drawDoll(T, cx, cy, scale, opts) {
    opts = opts || {};
    var c = T.c, eq = curEquip(opts);
    var t = opts.t !== undefined ? opts.t : (typeof G !== 'undefined' ? G.t : 0);
    var poseName = opts.pose || 'normal', pose = POSES[poseName] || POSES.normal;
    var face = opts.face || pose.face;
    var breath = pose === POSES.normal ? Math.sin(t * Math.PI) * 4 : 0;   // 2 秒周期で上下 4px
    var pop = opts.pop || null;                                             // { slot, k } その部位の絵文字だけ大きさを掛ける
    function K(slot) { return (pop && pop.slot === slot) ? pop.k : 1; }
    function dotted(x, y, r) {        // 何も付けていない部位: うす灰色の点線の丸
      if (opts.noEmpty) return;
      c.save(); c.setLineDash([5, 5]); c.strokeStyle = 'rgba(27,20,48,.25)'; c.lineWidth = 2.5;
      c.beginPath(); c.arc(x, y, r || 22, 0, TAU); c.stroke(); c.restore();
    }

    c.save();
    c.translate(cx, cy); c.scale(scale, scale); c.translate(-CX, -CY);

    /* 2 影(地面に固定。ジャンプでは小さく、寝ポーズでは横長) */
    c.fillStyle = 'rgba(0,0,0,.22)'; c.beginPath(); c.ellipse(195, 545, pose.shadow, 14, 0, 0, TAU); c.fill();

    if (pose.lie) {   // 寝ポーズ: 💤 を出してから、人形ごと横に倒す(頭が画面の左)
      T.em('💤', 90 + Math.sin(t * 2) * 4, 400 - (t * 20 % 30), 40, 0.9);
      T.em('💤', 130, 372 - (t * 14 % 24), 26, 0.6);
      c.translate(0, 135); c.translate(195, 345); c.rotate(-Math.PI / 2 + 0.1); c.translate(-195, -345);
    }
    c.translate(0, pose.dy + breath);

    /* 1 マント(いちばん後ろ)。首 (195,300) を原点に風で揺れる */
    var cape = look(eq, 'cape');
    if (cape) {
      c.save(); c.translate(195, 300); c.rotate(Math.sin(t * 1.3) * 0.04 + pose.cape); c.translate(-195, -300);
      T.em(cape, 195, 385, 190 * K('cape')); c.restore();
    } else dotted(SLOT_POS.cape[0], SLOT_POS.cape[1]);

    /* 3 足(股関節 (170,440)/(220,440) を原点に回す。足の装備は足の変換の中) */
    function leg(sd, th) {   // sd = -1 右足(画面左) / +1 左足(画面右)
      c.save(); c.translate(195 + sd * 25, 440); c.rotate(-sd * th);
      RR(c, -15, -8, 30, 70, 12, SKIN);
      var fe = look(eq, 'feet');
      if (fe) T.em(fe, 0, 70, 58 * K('feet')); else RR(c, -20, 58, 40, 22, 9, '#6d4c2a');
      c.restore();
    }
    leg(-1, pose.rLeg); leg(1, pose.lLeg);

    /* 上半身(腰 (195,445) を原点に傾く) */
    c.save(); c.translate(195, 445); c.rotate(pose.body); c.translate(-195, -445);

    /* 4 体(素体)+ 服 */
    RR(c, 140, 305, 110, 140, 34, SKIN);
    var body = look(eq, 'body');
    if (body) T.em(body, 195, 375, 150 * K('body'));
    else {   // 服なし: 白い はだぎ
      RR(c, 158, 332, 74, 98, 22, '#ffffff', '#e8d9c8', 2);
      c.strokeStyle = '#e8d9c8'; c.lineWidth = 2; c.beginPath(); c.moveTo(195, 340); c.lineTo(195, 420); c.stroke();
      dotted(195, 375);
    }
    /* 5 腰 */
    var waist = look(eq, 'waist');
    if (waist) T.em(waist, 195, 442, 66 * K('waist')); else dotted(195, 442);

    /* 6〜9 頭(首 (195,300) を原点に傾く) */
    c.save(); c.translate(195, 300); c.rotate(pose.head); c.translate(-195, -300);
    c.fillStyle = SKIN; c.beginPath(); c.arc(195, 230, 60, 0, TAU); c.fill();
    c.lineWidth = 3; c.strokeStyle = SKIN_EDGE; c.stroke();
    T.em(face, 195, 230, 118);                                   // 表情
    var fc = look(eq, 'face');
    if (fc) T.em(fc, 195, 238, 76 * K('face'));
    else { dotted(176, 236, 13); dotted(214, 236, 13); }         // メガネの形の点線 = かお の空き
    /* 8 お守り(ひも + 絵文字) */
    var charm = look(eq, 'charm');
    if (charm) {
      c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); c.moveTo(165, 268); c.lineTo(195, 296); c.lineTo(225, 268); c.stroke();
      T.em(charm, 195, 302, 44 * K('charm'));
    } else dotted(195, 302, 18);
    /* 9 頭の上(帽子)。王冠は少し小さく高く */
    var head = look(eq, 'head');
    if (head) { var crown = head === '👑'; T.em(head, 195, crown ? 150 : 160, (crown ? 86 : 96) * K('head')); }
    else dotted(195, 160);
    c.restore();   // 頭

    /* 10〜12 腕(肩 (160,320)/(230,320) を原点に回す。武器・指輪は腕の変換の中で描くので一緒に動く) */
    function arm(sd, th, slot) {   // sd = -1 右腕(画面左) / +1 左腕(画面右)
      c.save(); c.translate(195 + sd * 35, 320); c.rotate(-sd * th);
      RR(c, -13, -12, 26, 86, 13, SKIN);                          // 腕
      c.fillStyle = SKIN; c.beginPath(); c.arc(0, 76, 20, 0, TAU); c.fill();   // 手
      var w = look(eq, slot);
      if (w) { c.save(); c.translate(sd * 28, 78); c.rotate(sd * 0.3); T.em(w, 0, 0, 92 * K(slot)); c.restore(); }
      else dotted(sd * 28, 78);
      if (sd === 1) {   // 指輪は左手の下側。✨ が 0.5 秒ごとに点滅
        var ring = look(eq, 'ring');
        if (ring) { T.em(ring, 10, 94, 34 * K('ring')); if (Math.floor(t * 2) % 2 === 0) T.em('✨', 24, 82, 16); }
        else dotted(10, 94, 14);
      }
      c.restore();
    }
    arm(-1, pose.rArm, 'rhand'); arm(1, pose.lArm, 'lhand');
    c.restore();   // 上半身

    /* ポーズのおまけ */
    if (poseName === 'money') {   // 札束ばらまき: 💴💸 を 6 枚、周りにふわふわ
      for (var i = 0; i < 6; i++) {
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
    drawDoll(mainTools(), 195, 350, sc, { t: gt, pop: pop });
    /* 新しい装備の位置に 白い星形フラッシュ(0.20〜0.45)と ✨×6(0.25〜0.60) */
    if (slot) {
      var wp = slotWorld(slot, 195, 350, sc, breath);
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
    /* 下の帯 */
    c.fillStyle = '#c62828'; c.fillRect(0, 400, 360, 42);
    c.fillStyle = '#ffe066'; c.fillRect(0, 400, 360, 2); c.fillRect(0, 440, 360, 2);
    var title = '大魔王討伐記念  ' + (opts.date || '');
    c.font = '900 17px ' + TEXT_FONT; var tw = c.measureText(title).width, x0 = 180 - (tw + 26) / 2;
    T.em('🏆', x0 + 10, 413, 20);
    TX(c, title, x0 + 26, 413, 17, '#fff', 'left', 900, null);
    if (opts.record) TX(c, opts.record, 180, 431, 11, '#ffe9b3', 'center', 800, null);
    /* 帯の下の細い余白に、左: ロゴ / 右: アドレス(薄く) */
    TX(c, '勇者へっぽこ', 6, 446, 7, 'rgba(255,255,255,.7)', 'left', 900, null);
    TX(c, 'roguepink.github.io/heppoko', 355, 446, 7, 'rgba(255,255,255,.7)', 'right', 800, null);
    c.restore();
  }

  /* 画面の写真枠: (x,y,w,h) が写真。その外側に白い縁 8px と影 */
  function drawPhotoFrame(x, y, w, h, opts) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 8;
    rrect(x - 8, y - 8, w + 16, h + 16, 6, '#fff');
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

  return {
    draw: function (cx, cy, scale, opts) { drawDoll(mainTools(), cx, cy, scale, opts); },
    renderPhoto: renderPhoto,
    drawPhotoFrame: drawPhotoFrame,
    slotPos: function (slot) { var p = SLOT_POS[slot]; return p ? { x: p[0], y: p[1] } : null; },
    POSES: POSES, BG_NAMES: BG_NAMES, star: star
  };
})();

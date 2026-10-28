'use strict';
/* 勝利の文(SCENES.win)と 記念写真の画面(SCENES.photo)。設計 9 章。
   写真の絵そのものは doll.js(DOLL.drawPhotoFrame / DOLL.renderPhoto)が描く。ここは画面の流れ・ボタン・保存。 */
(function () {
  var INK = '#1b1430';
  function texts() { return (window.DATA && DATA.TEXTS) || {}; }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function today(sep) { var d = new Date(); return d.getFullYear() + sep + pad2(d.getMonth() + 1) + sep + pad2(d.getDate()); }
  function hideHud() { try { if (window.HUD && HUD.hide) HUD.hide(); } catch (e) {} }
  /* 短いお知らせ(main.js の toast があればそれを使う) */
  function note(s, ms) {
    if (typeof toast === 'function') { toast(s, ms || 1500); return; }
    var d = el('div', 'toast', esc(s)); ui.appendChild(d); setTimeout(function () { d.remove(); }, ms || 1500);
  }
  /* 日本語の折り返し: まず空白で区切り、長すぎる語は文字で割る */
  function wrap(s, maxW, size) {
    ctx.font = '900 ' + size + 'px ' + TEXT_FONT;
    var words = String(s).split(' '), lines = [], cur = '', i;
    function push(w) {
      var test = cur ? cur + ' ' + w : w;
      if (ctx.measureText(test).width <= maxW) { cur = test; return; }
      if (cur) lines.push(cur); cur = '';
      if (ctx.measureText(w).width <= maxW) { cur = w; return; }
      for (var k = 0; k < w.length; k++) { if (ctx.measureText(cur + w[k]).width > maxW && cur) { lines.push(cur); cur = ''; } cur += w[k]; }
    }
    for (i = 0; i < words.length; i++) push(words[i]);
    if (cur) lines.push(cur);
    return lines;
  }

  /* ---------- 勝利の文 ---------- */
  var WIN = { idx: 0, since: 0, conf: [] };
  var CONF_EMOJI = ['✨', '🎊', '🎉', '✨', '⭐'];
  function newConf(i, top) {
    return { e: CONF_EMOJI[i % CONF_EMOJI.length], x: rnd(0, W), y: top ? rnd(-60, -10) : rnd(-20, H), vy: rnd(40, 110), vx: rnd(-20, 20), s: rnd(18, 32), r: rnd(0, 6.28), vr: rnd(-2, 2) };
  }
  SCENES.win = {
    enter: function () {
      WIN.idx = 0; WIN.since = 0; WIN.conf = [];
      for (var i = 0; i < 36; i++) WIN.conf.push(newConf(i, false));
      hideHud(); AUDIO.bgm('victory'); AUDIO.sfx('fanfare');
    },
    update: function (dt) {
      WIN.since += dt;
      for (var i = 0; i < WIN.conf.length; i++) {
        var p = WIN.conf[i]; p.y += p.vy * dt; p.x += (p.vx + Math.sin(G.t * 2 + i) * 20) * dt; p.r += p.vr * dt;
        if (p.y > H + 30) WIN.conf[i] = newConf(i, true);
      }
    },
    draw: function () {
      var g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2a1a5e'); g.addColorStop(1, '#6c4fb0');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      for (var i = 0; i < WIN.conf.length; i++) {
        var p = WIN.conf[i]; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ATL.draw(p.e, 0, 0, p.s, 0.9); ctx.restore();
      }
      txt('だいしょうり!', 195, 96, 36, PAL.sun, 'center', 900, INK);
      ATL.draw('🎉', 60, 96, 40); ATL.draw('🎉', 330, 96, 40);
      ctx.save(); ctx.translate(195, 200); ctx.rotate(Math.sin(G.t * 2) * 0.08); BIG.draw('🏆', 0, 0, 130); ctx.restore();
      /* 文の窓 */
      var lines = texts().victory || ['大魔王は にげていった!'];
      var s = lines[Math.min(WIN.idx, lines.length - 1)];
      rrect(18, 300, 354, 200, 20, PAL.cream, INK, 4);
      var rows = wrap(s, 310, 22), y0 = 400 - (rows.length - 1) * 18;
      for (i = 0; i < rows.length; i++) txt(rows[i], 195, y0 + i * 36, 22, INK, 'center', 900, null);
      if (Math.floor(G.t * 2) % 2 === 0) txt(WIN.idx >= lines.length - 1 ? 'タップで 写真へ ▼' : 'タップで つぎへ ▼', 350, 482, 15, '#8a2be2', 'right', 900, null);
      /* 何番目か */
      var dots = ''; for (i = 0; i < lines.length; i++) dots += (i === WIN.idx ? '●' : '○') + ' ';
      txt(dots.trim(), 195, 530, 14, 'rgba(255,255,255,.8)', 'center', 900, null);
    },
    tap: function () {
      if (WIN.since < 0.25) return;    // 2 文いっぺんに飛ばない
      WIN.since = 0;
      var lines = texts().victory || [];
      if (WIN.idx >= lines.length - 1) { go('photo'); return; }
      WIN.idx++; AUDIO.sfx('talk');
    },
    key: function (k) { if (k === ' ' || k === 'Enter') this.tap(); }
  };

  /* ---------- 記念写真 ---------- */
  var PH = { bg: 0, pose: 'peace', comps: [], lastSave: -9, flash: 0, root: null, bgLabel: null, poseBtns: [], full: null, poseName: '' };
  function buildComps() {
    var list = [];
    try { if (typeof partyComps === 'function') list = partyComps() || []; } catch (e) { list = []; }
    var out = [];
    for (var i = 0; i < list.length && out.length < 10; i++) {
      var cpn = list[i]; if (!cpn) continue;
      out.push({ emoji: cpn.emoji || '🙂', name: cpn.name || '', count: cpn.count || 1 });
    }
    return out;
  }
  function recordText() {
    var b = (typeof G !== 'undefined' && G.lastBattle) || null;
    if (!b) return 'たった一度の 大決戦';
    var s = (b.turns || 0) + 'ターン / コンボ' + (b.combos || 0) + '回';
    if (b.finisher) s += ' / とどめ: ' + b.finisher;
    return s;
  }
  function photoOpts() {
    return { bg: PH.bg, pose: PH.pose, comps: PH.comps, date: today('.'), record: recordText(), t: G.t };
  }
  function setBg(d) {
    PH.bg = (PH.bg + d + 3) % 3; var n = DOLL.BG_NAMES[PH.bg];
    if (PH.bgLabel) PH.bgLabel.textContent = n.emoji + ' ' + n.name;
  }
  function setPose(id, name) {
    PH.pose = id; PH.poseName = name || '';
    for (var i = 0; i < PH.poseBtns.length; i++) PH.poseBtns[i].b.classList.toggle('sel', PH.poseBtns[i].id === id);
  }
  function shuffle() {
    for (var i = PH.comps.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var tmp = PH.comps[i]; PH.comps[i] = PH.comps[j]; PH.comps[j] = tmp; }
    AUDIO.sfx('weird');
  }
  /* 最後の手段: 画像を全画面に出して「長押しで保存」 */
  function showFull(dataUrl) {
    closeFull();
    var d = el('div', '', '');
    d.style.cssText = 'position:absolute;inset:0;z-index:30;background:rgba(10,6,20,.95);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:16px;';
    var img = document.createElement('img'); img.src = dataUrl; img.alt = '記念写真';
    img.style.cssText = 'max-width:92%;max-height:62%;border:6px solid #fff;border-radius:6px;-webkit-touch-callout:default;-webkit-user-select:auto;user-select:auto;pointer-events:auto;';
    var cap = el('p', '', '画像を <b>長押し</b> すると<br>「写真に保存」できます'); cap.style.cssText = 'font-size:18px;font-weight:800;text-align:center;color:#fff;';
    d.appendChild(img); d.appendChild(cap); d.appendChild(btn('とじる', 'sky', closeFull));
    ui.appendChild(d); PH.full = d;
  }
  function closeFull() { if (PH.full) { PH.full.remove(); PH.full = null; } }
  function download(blob, fname, cv2) {
    var isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (isIOS) { showFull(cv2.toDataURL('image/png')); return; }   // iPhone の Safari は a[download] が当てにならない
    try {
      var url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = fname; document.body.appendChild(a); a.click();
      setTimeout(function () { a.remove(); URL.revokeObjectURL(url); }, 4000);
      note('保存しました 📥');
    } catch (e) { showFull(cv2.toDataURL('image/png')); }
  }
  function shareOrDownload(blob, fname, cv2) {
    var file = null;
    try { file = new File([blob], fname, { type: 'image/png' }); } catch (e) {}
    if (file && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: '勇者へっぽこ 記念写真' })
        .then(function () { note('シェアしました 📸'); })
        .catch(function (e) { if (e && e.name === 'AbortError') return; download(blob, fname, cv2); });
      return;
    }
    download(blob, fname, cv2);
  }
  function doSave() {
    if (G.t - PH.lastSave < 1.5) return;    // 連打防止
    PH.lastSave = G.t; PH.flash = 1; AUDIO.sfx('shutter');
    var cv2 = document.createElement('canvas');
    try { DOLL.renderPhoto(cv2, photoOpts()); } catch (e) { note('写真を作れませんでした'); return; }
    var fname = 'heppoko-' + today('-') + '.png';
    function done(blob) { if (!blob) { showFull(cv2.toDataURL('image/png')); return; } shareOrDownload(blob, fname, cv2); }
    try { if (cv2.toBlob) cv2.toBlob(done, 'image/png'); else done(null); } catch (e) { done(null); }
  }
  function buildUI() {
    var root = el('div', '', ''); root.id = 'photoui';
    /* 背景の切り替え(上の帯の右) */
    var bgbox = el('div', 'bg');
    bgbox.appendChild(btn('◀', '', function () { setBg(-1); }));
    PH.bgLabel = el('span', '', ''); PH.bgLabel.style.cssText = 'width:134px;text-align:center;font-size:13px;white-space:nowrap;';
    bgbox.appendChild(PH.bgLabel);
    bgbox.appendChild(btn('▶', '', function () { setBg(1); }));
    root.appendChild(bgbox);
    /* ポーズ 6 つ */
    var poses = (texts().poses || []), pb = el('div', 'poses'); PH.poseBtns = [];
    poses.forEach(function (p) {
      var b = btn(p.emoji, '', function () { setPose(p.id, p.name); });
      b.title = p.name; b.setAttribute('aria-label', p.name);
      pb.appendChild(b); PH.poseBtns.push({ id: p.id, b: b });
    });
    root.appendChild(pb);
    /* 保存・ならび替え */
    var acts = el('div', 'acts');
    acts.appendChild(btn('📸 保存・シェア', 'save', doSave));
    acts.appendChild(btn('🔀 ならび替え', 'shuf', shuffle));
    root.appendChild(acts);
    root.appendChild(btn('おしまいへ ▶', 'end', function () { go('ending'); }));
    ui.appendChild(root); PH.root = root;
    setBg(0);
    var first = poses.filter(function (p) { return p.id === PH.pose; })[0] || poses[1] || poses[0];
    if (first) setPose(first.id, first.name);
  }
  SCENES.photo = {
    enter: function () {
      PH.comps = buildComps(); PH.flash = 0; PH.lastSave = -9; PH.pose = 'peace'; PH.bg = 0;
      hideHud(); AUDIO.bgm('photo'); buildUI();
    },
    leave: function () { closeFull(); if (PH.root) { PH.root.remove(); PH.root = null; } PH.poseBtns = []; PH.bgLabel = null; },
    update: function (dt) { if (PH.flash > 0) PH.flash = Math.max(0, PH.flash - dt * 3.3); },
    draw: function () {
      ctx.fillStyle = '#140c2a'; ctx.fillRect(0, 0, W, H);
      /* うすい模様 */
      ctx.fillStyle = 'rgba(255,255,255,.04)';
      for (var i = 0; i < 12; i++) { ctx.beginPath(); ctx.arc((i * 97) % W, 560 + (i * 53) % 220, 30 + (i % 3) * 14, 0, Math.PI * 2); ctx.fill(); }
      /* 上の帯 */
      ctx.fillStyle = 'rgba(27,20,48,.92)'; ctx.fillRect(0, 0, W, 52);
      ATL.draw('📸', 24, 26, 26); txt('記念写真', 44, 27, 20, '#fff', 'left', 900, null);
      DOLL.drawPhotoFrame(15, 70, 360, 450, photoOpts());
      txt('ポーズ: ' + (PH.poseName || ''), 8, 536, 13, 'rgba(255,255,255,.85)', 'left', 800, null);
      if (PH.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + PH.flash + ')'; ctx.fillRect(0, 0, W, H); }
    },
    key: function (k) { if (k === 's') doSave(); }
  };
})();

'use strict';
/* 音: すべて WebAudio でその場で作る(音のファイルは使わない)。
   最初のタップのあとに AUDIO.unlock() を呼ぶ。AUDIO.bgm('town') で曲、AUDIO.sfx('coin') で効果音。 */
var AUDIO = (function () {
  var ctx = null, master = null, muted = false, cur = null, timer = null, step = 0, nextT = 0;
  var MUTE_KEY = 'heppoko-mute';
  try { muted = localStorage.getItem(MUTE_KEY) === '1'; } catch (e) {}
  function unlock() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.5; master.connect(ctx.destination);
    if (cur) { var name = cur; cur = null; bgm(name); }
  }
  function setMute(m) { muted = m; try { localStorage.setItem(MUTE_KEY, m ? '1' : '0'); } catch (e) {} if (master) master.gain.value = m ? 0 : 0.5; }
  function isMuted() { return muted; }
  // 音の名前 → 周波数
  var NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
  function freq(n) { if (!n || n === '-') return 0; var m = /^([A-G]#?)(\d)$/.exec(n); if (!m) return 0; return 440 * Math.pow(2, (NOTE[m[1]] + (m[2] - 4) * 12 - 9) / 12); }
  function tone(f, t0, dur, type, vol, dest) {
    if (!ctx || !f) return;
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'square'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dest || master); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function noise(t0, dur, vol) {
    if (!ctx) return;
    var buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    var s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = buf; g.gain.value = vol; s.connect(g); g.connect(master); s.start(t0);
  }
  /* 曲: 16分音符ごとの列。mel(主旋律)・bass(低音)・chord(和音, 4分ごと) */
  var SONGS = {
    town: { bpm: 132, lead: 'square', mel: 'C5 - E5 G5 - G5 A5 G5 E5 - C5 - D5 E5 D5 - C5 - E5 G5 - A5 - G5 E5 D5 - C5 - - - - -'.split(' '),
            bass: 'C3 - C3 - G2 - G2 - A2 - A2 - G2 - G2 - F2 - F2 - C3 - C3 - G2 - G2 - C3 - C3 -'.split(' ') },
    shop: { bpm: 112, lead: 'triangle', mel: 'E5 - - - G5 - - - A5 - G5 - E5 - - - D5 - - - E5 - - - C5 - - - - - - -'.split(' '),
            bass: 'C3 - - - E3 - - - F3 - - - E3 - - - D3 - - - E3 - - - C3 - - - - - - -'.split(' ') },
    battle: { bpm: 168, lead: 'sawtooth', mel: 'A4 A4 - A4 C5 A4 - G4 A4 A4 - A4 D5 - C5 - A4 A4 - A4 C5 A4 - G4 F4 - E4 - D4 - E4 -'.split(' '),
            bass: 'A2 - A2 A2 - A2 - - A2 - A2 A2 - A2 - - F2 - F2 F2 - F2 - - E2 - E2 E2 - E2 - -'.split(' ') },
    pinch: { bpm: 180, lead: 'sawtooth', mel: 'A4 - A#4 - A4 - A#4 - A4 - G4 - A4 - - - A4 - A#4 - C5 - A#4 - A4 - G4 - F4 - E4 -'.split(' '),
            bass: 'A2 A2 - A2 A2 - A2 - A2 A2 - A2 A2 - A2 - F2 F2 - F2 F2 - F2 - E2 E2 - E2 E2 - E2 -'.split(' ') },
    victory: { bpm: 140, lead: 'square', mel: 'C5 - C5 - C5 - E5 - - - D5 - E5 - - - F5 - E5 - D5 - C5 - - - G5 - - - - - - -'.split(' '),
            bass: 'C3 - - - C3 - - - G2 - - - G2 - - - F2 - - - G2 - - - C3 - - - C3 - - - - -'.split(' ') },
    sad: { bpm: 96, lead: 'triangle', mel: 'E4 - - - D4 - - - C4 - - - - - - - E4 - D4 - C4 - B3 - A3 - - - - - - -'.split(' '),
            bass: 'A2 - - - A2 - - - F2 - - - F2 - - - E2 - - - E2 - - - A2 - - - A2 - - - - -'.split(' ') },
    photo: { bpm: 100, lead: 'triangle', mel: 'G5 - E5 - C5 - - - A5 - G5 - E5 - - - F5 - D5 - B4 - - - C5 - - - - - - -'.split(' '),
            bass: 'C3 - - - - - - - F2 - - - - - - - G2 - - - - - - - C3 - - - - - - -'.split(' ') }
  };
  function tick() {
    if (!ctx || !cur || !SONGS[cur]) return;
    var s = SONGS[cur], spb = 60 / s.bpm / 4;
    while (nextT < ctx.currentTime + 0.25) {
      var i = step % s.mel.length, m = s.mel[i], b = s.bass[i % s.bass.length];
      var ml = 1; while (s.mel[(i + ml) % s.mel.length] === '-' && ml < 8) ml++;
      if (m && m !== '-') tone(freq(m), nextT, spb * ml * 0.9, s.lead, 0.16);
      var bl = 1; while (s.bass[(i + bl) % s.bass.length] === '-' && bl < 8) bl++;
      if (b && b !== '-') tone(freq(b), nextT, spb * bl * 0.8, 'triangle', 0.22);
      if (cur === 'battle' || cur === 'pinch') { if (i % 4 === 0) noise(nextT, 0.05, 0.12); if (i % 8 === 4) noise(nextT, 0.03, 0.06); }
      nextT += spb; step++;
    }
  }
  function bgm(name) {
    if (name === cur) return;
    cur = name; step = 0;
    if (timer) { clearInterval(timer); timer = null; }
    if (!ctx || !name) return;
    nextT = ctx.currentTime + 0.05; timer = setInterval(tick, 100); tick();
  }
  function stop() { bgm(null); }
  /* 効果音 */
  function sfx(name) {
    if (!ctx) return; var t = ctx.currentTime;
    switch (name) {
      case 'tap': tone(880, t, 0.05, 'square', 0.12); break;
      case 'ok': tone(660, t, 0.06, 'square', 0.14); tone(990, t + 0.06, 0.1, 'square', 0.14); break;
      case 'cancel': tone(440, t, 0.08, 'square', 0.12); tone(330, t + 0.07, 0.1, 'square', 0.1); break;
      case 'step': tone(220, t, 0.03, 'triangle', 0.05); break;
      case 'door': tone(330, t, 0.08, 'triangle', 0.15); tone(440, t + 0.08, 0.12, 'triangle', 0.15); break;
      case 'coin': tone(1320, t, 0.06, 'square', 0.12); tone(1760, t + 0.06, 0.16, 'square', 0.14); break;
      case 'buy': tone(880, t, 0.06, 'square', 0.12); tone(1100, t + 0.06, 0.06, 'square', 0.12); tone(1320, t + 0.12, 0.06, 'square', 0.12); tone(1760, t + 0.18, 0.2, 'square', 0.14); break;
      case 'equip': noise(t, 0.08, 0.1); tone(1200, t + 0.02, 0.08, 'sawtooth', 0.12); tone(2400, t + 0.08, 0.3, 'triangle', 0.16); tone(3600, t + 0.12, 0.35, 'sine', 0.1); break;
      case 'join': [523, 659, 784, 1047].forEach(function (f, i) { tone(f, t + i * 0.08, 0.2, 'square', 0.13); }); break;
      case 'talk': tone(700, t, 0.04, 'square', 0.08); break;
      case 'hit': noise(t, 0.12, 0.3); tone(160, t, 0.12, 'sawtooth', 0.25); break;
      case 'bighit': noise(t, 0.3, 0.45); tone(90, t, 0.3, 'sawtooth', 0.35); tone(60, t + 0.05, 0.4, 'square', 0.25); break;
      case 'hurt': tone(300, t, 0.1, 'sawtooth', 0.22); tone(200, t + 0.08, 0.15, 'sawtooth', 0.2); noise(t, 0.1, 0.2); break;
      case 'heal': [660, 880, 1100, 1320].forEach(function (f, i) { tone(f, t + i * 0.06, 0.25, 'sine', 0.14); }); break;
      case 'magic': for (var i = 0; i < 8; i++) tone(600 + i * 150, t + i * 0.03, 0.12, 'triangle', 0.1); break;
      case 'weird': tone(440, t, 0.1, 'square', 0.12); tone(466, t + 0.1, 0.1, 'square', 0.12); tone(415, t + 0.2, 0.2, 'square', 0.12); break;
      case 'miss': tone(500, t, 0.08, 'triangle', 0.1); tone(350, t + 0.1, 0.15, 'triangle', 0.1); break;
      case 'warn': for (var j = 0; j < 3; j++) { tone(880, t + j * 0.18, 0.08, 'square', 0.18); tone(440, t + j * 0.18, 0.08, 'square', 0.12); } break;
      case 'guard': tone(220, t, 0.08, 'triangle', 0.18); tone(330, t + 0.05, 0.2, 'triangle', 0.14); noise(t, 0.05, 0.1); break;
      case 'fanfare': [523, 523, 523, 659, 784, 659, 784].forEach(function (f, i) { tone(f, t + [0, .15, .3, .45, .75, .95, 1.1][i], [.12, .12, .12, .28, .18, .18, .6][i], 'square', 0.16); }); break;
      case 'peel': tone(1200, t, 0.1, 'square', 0.14); tone(400, t + 0.08, 0.2, 'square', 0.14); noise(t, 0.2, 0.15); break;
      case 'shutter': noise(t, 0.04, 0.3); tone(2000, t, 0.03, 'square', 0.1); noise(t + 0.08, 0.04, 0.2); break;
      case 'lose': [392, 370, 349, 330].forEach(function (f, i) { tone(f, t + i * 0.25, 0.3, 'sawtooth', 0.14); }); break;
      case 'laugh': [300, 280, 300, 280, 260].forEach(function (f, i) { tone(f, t + i * 0.1, 0.09, 'square', 0.1); }); break;
    }
  }
  return { unlock: unlock, bgm: bgm, stop: stop, sfx: sfx, setMute: setMute, isMuted: isMuted };
})();

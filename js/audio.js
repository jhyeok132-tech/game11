/* ══════════════════════════════════════════════════════════════
   js/audio.js — 소리 (WebAudio 로 직접 합성 · mp3 파일 없음)

   파일을 하나도 추가하지 않고 소리를 넣는 방법.
   브라우저가 기본으로 가진 '소리 만드는 부품'을 코드로 조립한다.

   BGM   : 8분음표 한 칸씩 패턴을 반복 (survive / boss)
   효과음 : shoot · item · hit · boom · pew · alarm · phase · clear · over
   ══════════════════════════════════════════════════════════════ */
VG.SND = (function () {
  var AC = window.AudioContext || window.webkitAudioContext;
  var ctx = null, master = null;
  var enabled = true;
  try { enabled = localStorage.getItem('vg_sound') !== '0'; } catch (e) {}

  var nb = null;                       // 노이즈 버퍼(한 번만 만든다)
  var bgm = { on: false, mode: null, step: 0, next: 0, timer: null, bpm: 96 };

  // ── 초기화 (사용자가 처음 클릭/키를 눌렀을 때) ──────────────
  function ensure() {
    if (ctx) return ctx;
    if (!AC) return null;
    try {
      ctx = new AC();
      var comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18; comp.ratio.value = 6;
      master = ctx.createGain();
      master.gain.value = enabled ? 0.42 : 0.0;
      master.connect(comp); comp.connect(ctx.destination);
      nb = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate);
      var d = nb.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ctx = null; }
    return ctx;
  }

  function resume() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  // ── 기본 조각 ────────────────────────────────────────────────
  function tone(o) {
    if (!ctx || !enabled) return;
    var t0 = ctx.currentTime + (o.when || 0);
    var dur = o.dur || 0.12;
    var osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(o.f0, t0);
    if (o.f1) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.vol || 0.12, t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(master);
    osc.start(t0); osc.stop(t0 + dur + 0.03);
  }

  function noise(o) {
    if (!ctx || !enabled || !nb) return;
    var t0 = ctx.currentTime + (o.when || 0);
    var dur = o.dur || 0.2;
    var src = ctx.createBufferSource(); src.buffer = nb;
    var f = ctx.createBiquadFilter(); f.type = o.filter || 'lowpass';
    f.frequency.setValueAtTime(o.f0 || 2400, t0);
    if (o.f1) f.frequency.exponentialRampToValueAtTime(Math.max(80, o.f1), t0 + dur);
    var g = ctx.createGain();
    g.gain.setValueAtTime(o.vol || 0.2, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t0); src.stop(t0 + dur + 0.02);
  }

  // ── 효과음 ───────────────────────────────────────────────────
  var S = {};

  S.shoot = function () {                       // 내 미사일 (아주 짧고 작게)
    tone({ f0: 900, f1: 380, dur: 0.055, type: 'square', vol: 0.045 });
  };

  S.item = function () {                        // 아이템 획득 — 두 음 상승
    tone({ f0: 660, dur: 0.07, type: 'triangle', vol: 0.13 });
    tone({ f0: 990, dur: 0.10, type: 'triangle', vol: 0.13, when: 0.07 });
  };

  S.hit = function () {                         // 피격
    noise({ dur: 0.34, f0: 1800, f1: 120, vol: 0.34 });
    tone({ f0: 220, f1: 60, dur: 0.32, type: 'sawtooth', vol: 0.22 });
  };

  S.boom = function () {                        // 폭발
    noise({ dur: 0.45, f0: 1400, f1: 90, vol: 0.30 });
    tone({ f0: 130, f1: 40, dur: 0.4, type: 'sine', vol: 0.20 });
  };

  S.pew = function (p) {                        // 보스가 쏘는 미사일
    var f = 520 - (p - 1) * 90;
    tone({ f0: f, f1: f * 0.32, dur: 0.22, type: 'sawtooth', vol: 0.10 });
    noise({ dur: 0.10, f0: 3200, f1: 900, vol: 0.06 });
  };

  S.charge = function (p) {                     // 발사 직전 조준음 (긴장)
    tone({ f0: 180 + p * 40, f1: 640 + p * 90, dur: 0.30, type: 'triangle', vol: 0.075 });
  };

  S.alarm = function () {                       // 보스 등장 경보 (2.4초)
    for (var i = 0; i < 4; i++) {
      tone({ f0: 880, dur: 0.20, type: 'square', vol: 0.11, when: i * 0.60 });
      tone({ f0: 660, dur: 0.20, type: 'square', vol: 0.11, when: i * 0.60 + 0.30 });
    }
    noise({ dur: 1.6, f0: 400, f1: 90, vol: 0.14 });     // 낮은 웅웅거림
  };

  S.phase = function () {                       // 페이즈 전환
    [0, 0.10, 0.20, 0.32].forEach(function (w, i) {
      tone({ f0: 440 * Math.pow(1.26, i), dur: 0.14, type: 'square', vol: 0.13, when: w });
    });
  };

  S.alert = function () {                       // 목숨 1개 남음
    tone({ f0: 520, f1: 300, dur: 0.5, type: 'triangle', vol: 0.12 });
  };

  S.clear = function () {                       // 클리어 팡파레
    [523, 659, 784, 1047].forEach(function (f, i) {
      tone({ f0: f, dur: 0.30, type: 'square', vol: 0.12, when: i * 0.13 });
    });
    tone({ f0: 1047, dur: 0.9, type: 'triangle', vol: 0.10, when: 0.52 });
  };

  S.over = function () {                        // 게임오버
    [392, 330, 262, 196].forEach(function (f, i) {
      tone({ f0: f, dur: 0.34, type: 'sawtooth', vol: 0.12, when: i * 0.19 });
    });
  };

  // ── BGM (한 칸씩 예약해서 반복) ──────────────────────────────
  var PAT = {
    survive: {
      bass: [0, 0, 7, 0, 3, 0, 7, 5],           // 반음 오프셋
      arp: [24, 31, 36, 31, 24, 31, 36, 39],
      root: 55,                                 // A1
      kick: [0, 4],
    },
    boss: {
      bass: [0, 0, 12, 0, 7, 0, 10, 7],
      arp: [36, 43, 36, 48, 36, 43, 51, 43],
      root: 49,                                 // C#1 — 조금 불길하게
      kick: [0, 2, 4, 6],
    },
  };

  function semitone(f, n) { return f * Math.pow(2, n / 12); }

  function schedule(step, t) {
    var p = PAT[bgm.mode] || PAT.survive;
    var i = step % 8;
    var spb = 60 / bgm.bpm / 2;                 // 8분음표 길이

    tone({ f0: semitone(p.root, p.bass[i]), dur: spb * 0.9, type: 'triangle', vol: 0.075, when: t - ctx.currentTime });
    if (i % 2 === 0) {
      tone({ f0: semitone(p.root * 4, p.arp[i]), dur: spb * 0.55, type: 'square', vol: 0.026, when: t - ctx.currentTime });
    }
    if (bgm.mode === 'boss' && p.kick.indexOf(i) >= 0) {
      tone({ f0: 90, f1: 45, dur: 0.12, type: 'sine', vol: 0.16, when: t - ctx.currentTime });
    }
    if (bgm.mode === 'boss' && i % 2 === 1) {
      noise({ dur: 0.045, f0: 7000, f1: 4000, vol: 0.028, when: t - ctx.currentTime });
    }
  }

  function tick() {
    if (!ctx || !bgm.on) return;
    var spb = 60 / bgm.bpm / 2;
    while (bgm.next < ctx.currentTime + 0.25) {
      schedule(bgm.step, bgm.next);
      bgm.next += spb;
      bgm.step++;
    }
  }

  function bgmStart(mode) {
    if (!ensure()) return;
    resume();
    bgm.mode = mode;
    bgm.bpm = mode === 'boss' ? 132 : 96;
    bgm.step = 0;
    if (!bgm.on) { bgm.on = true; bgm.next = ctx.currentTime + 0.1; bgm.timer = setInterval(tick, 60); }
  }

  function bgmStop() {
    bgm.on = false;
    if (bgm.timer) { clearInterval(bgm.timer); bgm.timer = null; }
  }

  // ── 공개 API ─────────────────────────────────────────────────
  return {
    init: function () { ensure(); resume(); },
    ready: function () { return !!ctx; },
    play: function (name, arg) {
      if (!enabled) return;
      if (!ensure()) return;
      resume();
      if (S[name]) S[name](arg);
    },
    bgm: bgmStart,
    bgmStop: bgmStop,
    setTempo: function (bpm) { bgm.bpm = bpm; },
    isOn: function () { return enabled; },
    toggle: function () {
      enabled = !enabled;
      try { localStorage.setItem('vg_sound', enabled ? '1' : '0'); } catch (e) {}
      if (master) master.gain.value = enabled ? 0.42 : 0.0;
      if (!enabled) bgmStop();
      else if (VG.G && (VG.G.phase === 'survive' || VG.G.phase === 'boss')) {
        bgmStart(VG.G.phase === 'boss' ? 'boss' : 'survive');
      }
      return enabled;
    },
  };
})();

/* ══════════════════════════════════════════════════════════════
   js/config.js — 숫자 · 색 · 상태
   개선판: 아이템 · 미사일 · 보스 · 보스 미사일 · 소리

   ★ 난이도를 바꾸고 싶으면 이 파일만 고치면 됩니다.
   ══════════════════════════════════════════════════════════════ */
window.VG = window.VG || {};

VG.CFG = {
  lanes: 4.2,
  lives: 3,
  playerSpeed: 9.5,

  // 1단계: 30초 버티기 (운석 피하기 그대로)
  surviveTime: 30,
  asteroid: { speed0: 11.0, speedUp: 0.10, spawn0: 1.55, spawnMin: 0.90, hitSize: 1.15 },
  invuln: 2.0,          // 피격 후 무적 시간(초)

  // 2단계: 보스
  boss: {
    hpBase: 3200,                 // 보스 HP = hpBase + (미사일LV-1) × hpPerLevel
    hpPerLevel: 800,              //   강해진 만큼 보스도 튼튼해진다 (전투 시간이 비슷해짐)
    phaseAt: [0.55, 0.27],        // 남은 HP 비율이 이 아래로 가면 2·3페이즈
    z: -15, y: 3.4,
    swayAmp: 2.8, swaySpeed: 0.85,
    contact: 2.6,            // 보스 몸통에 닿으면 피해

    // 보스가 쏘는 미사일 — 페이즈가 오를수록 빨라지고 많아진다
    shot: {
      gap:       [1.70, 1.30, 0.98],   // 발사 간격(초)
      speed:     [12.0, 16.0, 21.0],   // 탄속 (페이즈마다 확 빨라짐)
      count:     [1, 2, 3],            // 한 번에 쏘는 발수
      spread:    [0.0, 2.2, 2.6],      // 부채꼴로 벌리는 x 속도
      telegraph: [0.46, 0.36, 0.28],   // 발사 전 조준(예고) 시간
    },
  },

  // 아이템: 미사일 강화 / 목숨 / 연사
  item: { gap: 3.0, speed: 6.5, size: 0.55, maxLvl: 5 },

  // 내 미사일 (보스전에서만 자동 발사)
  missile: {
    dmg0: 16, dmgStep: 6,
    interval0: 0.30, intervalStep: 0.02, intervalMin: 0.20,
    speed: 46,
  },
};

VG.COLORS = {
  bg: 0x0B0A12, cyan: 0x3CC7E0, pink: 0xFF5C8A, yellow: 0xFFD23F,
  green: 0x5FC46B, rock: 0x6E6880, cream: 0xFBF8EF, orange: 0xE97132,
  boss1: 0xFF5C8A, boss2: 0xE97132, boss3: 0xFFD23F,
};

VG.G = {
  phase: 'ready',        // ready | survive | boss | clear | over
  t: 0, surviveLeft: 0,
  lives: 3, score: 0, dodged: 0,
  missileLvl: 1, picked: 0,
  bossHp: 0, bossMax: 0, bossPhase: 1, bossShotN: 0,
  fireTimer: 0, itemTimer: 0, bossFireTimer: 0, invuln: 0, spawnTimer: 0,
  chargeTimer: 0,        // 보스 조준 남은 시간
  phaseShown: 1,
};

VG.keys = { left: false, right: false };
VG.$ = function (id) { return document.getElementById(id); };
VG.rand = function (a, b) { return a + Math.random() * (b - a); };

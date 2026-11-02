/* ══════════════════════════════════════════════════════════════
   js/boss.js — 보스 (3페이즈)

   · 등장: 뒤에서 튀어나오며 경보 · 화면 흔들림 · 붉은 섬광
   · 공격: 운석을 뿌리지 않고, 플레이어를 조준해 미사일을 쏜다
   · 페이즈: HP 가 줄면 색이 바뀌고 탄속 · 발수가 올라간다
   ══════════════════════════════════════════════════════════════ */
VG.boss = null;
VG.BOSS_SCALE = 1.75;      // 보스가 작아 보이지 않게 기본 크기

VG.buildBoss = function (scene) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: VG.COLORS.boss1 });

  const core = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.3, 2.0), bodyMat);
  const dome = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.7, 1.4),
    new THREE.MeshLambertMaterial({ color: VG.COLORS.cream }));
  dome.position.set(0, 0.85, 0);
  const podL = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.9, 1.5), bodyMat);
  podL.position.set(-2.1, 0, 0.1);
  const podR = podL.clone();
  podR.position.x = 2.1;

  const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.24, 0.12),
    new THREE.MeshBasicMaterial({ color: VG.COLORS.yellow }));
  eyeL.position.set(-0.62, 0.05, 1.02);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.62;

  // 발사구 3개 (왼쪽 · 오른쪽 · 중앙) — 조준하면 여기가 빛난다
  const muzzles = [[-2.1, 0.0, 1.05], [2.1, 0.0, 1.05], [0, 0.42, 1.05]];
  const glows = muzzles.map(function (p) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.34, 8, 6),
      new THREE.MeshBasicMaterial({ color: VG.COLORS.yellow, transparent: true, opacity: 0 })
    );
    m.position.set(p[0], p[1], p[2]);
    return m;
  });

  g.add(core, dome, podL, podR, eyeL, eyeR);
  glows.forEach(function (m) { g.add(m); });

  g.position.set(0, VG.CFG.boss.y, VG.CFG.boss.z);
  g.scale.setScalar(VG.BOSS_SCALE);
  g.visible = false;
  g.userData = { bodyMat: bodyMat, eyes: [eyeL, eyeR], glows: glows, intro: -1 };
  scene.add(g);
  VG.boss = g;
  return g;
};

// ── 등장 (긴박감 연출) ────────────────────────────────────────
VG.showBoss = function () {
  const b = VG.boss;
  b.visible = true;
  b.position.set(0, VG.CFG.boss.y, VG.CFG.boss.z - 16);
  b.scale.setScalar(VG.BOSS_SCALE * 0.35);

  const lvl = VG.G.missileLvl;
  const hp = Math.round(VG.CFG.boss.hpBase + (lvl - 1) * VG.CFG.boss.hpPerLevel);
  VG.G.bossMax = hp;
  VG.G.bossHp = hp;
  VG.G.bossPhase = 1;
  VG.G.bossShotN = 0;
  VG.G.chargeTimer = 0;
  b.userData.intro = 0;

  VG.applyBossPhase(1);
  VG.SND.bgm('boss');
  VG.SND.play('alarm');
  VG.shake(1.5);
  VG.flashScreen(520);
  VG.drama = 1;                     // 등장 중 줌인
};

VG.bossColor = function (phase) {
  return phase === 1 ? VG.COLORS.boss1 : phase === 2 ? VG.COLORS.boss2 : VG.COLORS.boss3;
};

VG.applyBossPhase = function (phase) {
  const b = VG.boss;
  b.userData.bodyMat.color.setHex(VG.bossColor(phase));
  b.userData.glows.forEach(function (m) { m.material.color.setHex(VG.bossColor(phase)); });
  b.userData.eyes.forEach(function (e) {
    e.material.color.setHex(phase >= 3 ? VG.COLORS.pink : VG.COLORS.yellow);
  });
  b.scale.setScalar(VG.BOSS_SCALE * (1 + (phase - 1) * 0.05));
};

// ── 매 프레임 ────────────────────────────────────────────────
// 돌려주는 값: 발사 간격(초). 조준이 끝나면 VG.fireBossMissiles() 를 부른다.
VG.updateBoss = function (dt, t) {
  const b = VG.boss;
  if (!b.visible) return 99;

  const c = VG.CFG.boss;
  const ph = VG.G.bossPhase;

  // 등장: 뒤에서 앞으로 + 커지기
  if (b.userData.intro >= 0) {
    b.userData.intro += dt;
    const k = Math.min(1, b.userData.intro / 1.6);
    const e = 1 - Math.pow(1 - k, 3);                 // 감속하며 도착
    b.position.z = (c.z - 16) + 16 * e;
    b.scale.setScalar(VG.BOSS_SCALE * (0.35 + 0.65 * e) * (1 + (ph - 1) * 0.05));
    if (k >= 1) b.userData.intro = -1;
  }

  // 좌우로 흔들리기 — 페이즈가 오르면 더 빠르게
  b.position.x = Math.sin(t * c.swaySpeed * (1 + (ph - 1) * 0.35)) * c.swayAmp;
  b.rotation.z = Math.cos(t * c.swaySpeed) * 0.06;
  b.position.y = c.y + Math.sin(t * 1.3) * 0.18;

  // 발사구 점멸 — 조준 중이면 밝게 커진다
  const charge = Math.max(0, VG.G.chargeTimer);
  const tg = c.shot.telegraph[ph - 1];
  const k = charge > 0 ? 1 - charge / tg : 0;
  b.userData.glows.forEach(function (m, i) {
    const on = charge > 0 ? Math.max(0, Math.sin((k * 14) + i) * 0.5 + 0.5) : 0;
    m.material.opacity = on * 0.85;
    m.scale.setScalar(0.7 + on * (0.8 + k * 1.6));
  });

  return c.shot.gap[ph - 1];
};

VG.damageBoss = function (amount) {
  if (VG.G.bossHp <= 0) return;
  VG.G.bossHp = Math.max(0, VG.G.bossHp - amount);

  const pa = VG.CFG.boss.phaseAt, mx = VG.G.bossMax;
  const shouldBe = VG.G.bossHp <= mx * pa[1] ? 3 : (VG.G.bossHp <= mx * pa[0] ? 2 : 1);
  if (shouldBe !== VG.G.bossPhase) {
    VG.G.bossPhase = shouldBe;
    VG.applyBossPhase(shouldBe);
    VG.SND.play('phase');
    VG.SND.setTempo(shouldBe === 2 ? 150 : 172);
    VG.shake(1.1);
    VG.flashScreen(300);
    VG.$('phaseTag').classList.add('pop');
    setTimeout(function () { VG.$('phaseTag').classList.remove('pop'); }, 700);
  }
};

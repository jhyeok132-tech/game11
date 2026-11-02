/* ══════════════════════════════════════════════════════════════
   js/missiles.js — 미사일 (보스전에서 자동 발사)
   ══════════════════════════════════════════════════════════════ */
VG.missiles = [];

VG.missileInterval = function () {
  const c = VG.CFG.missile;
  return Math.max(c.intervalMin, c.interval0 - (VG.G.missileLvl - 1) * c.intervalStep);
};

VG.missileDamage = function () {
  const c = VG.CFG.missile;
  return c.dmg0 + (VG.G.missileLvl - 1) * c.dmgStep;
};

VG.fireMissile = function (scene, player) {
  const lvl = VG.G.missileLvl;
  const w = 0.12 + lvl * 0.03;          // 레벨이 오르면 굵어진다
  const l = 0.8 + lvl * 0.12;
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, w, l),
    new THREE.MeshLambertMaterial({ color: lvl >= 4 ? VG.COLORS.pink : VG.COLORS.yellow })
  );
  m.position.set(player.position.x, 0.6, -0.6);
  // 보스를 향해 살짝 조준한다 (완전 유도는 아님 — 직선으로 날아간다)
  let vx = 0;
  if (VG.boss && VG.boss.visible) {
    const dz = Math.max(4, player.position.z - VG.boss.position.z);
    vx = (VG.boss.position.x - player.position.x) / (dz / VG.CFG.missile.speed);
    vx = Math.max(-14, Math.min(14, vx));
  }
  m.userData = { dmg: VG.missileDamage(), vx: vx };
  scene.add(m);
  VG.missiles.push(m);
};

VG.clearMissiles = function (scene) {
  VG.missiles.forEach(function (m) { scene.remove(m); });
  VG.missiles = [];
};

/* 미사일 이동 + 보스 충돌. 보스에 맞은 데미지 합을 돌려준다. */
VG.updateMissiles = function (scene, dt, boss) {
  let dmg = 0;
  for (let i = VG.missiles.length - 1; i >= 0; i--) {
    const m = VG.missiles[i];
    m.position.z -= VG.CFG.missile.speed * dt;
    if (m.userData.vx) m.position.x += m.userData.vx * dt;

    if (boss && boss.visible) {
      const dx = Math.abs(m.position.x - boss.position.x);
      const dz = Math.abs(m.position.z - boss.position.z);
      if (dx < 2.1 && dz < 1.9) {
        dmg += m.userData.dmg;
        scene.remove(m);
        VG.missiles.splice(i, 1);
        continue;
      }
    }
    if (m.position.z < -70) {
      scene.remove(m);
      VG.missiles.splice(i, 1);
    }
  }
  return dmg;
};

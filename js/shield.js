/* ══════════════════════════════════════════════════════════════
   js/shield.js — 스페이스바 방어막

   · 누르면 0.5초만 열린다(짧다) → 다리가 내리치는 순간에 맞춰 눌러야 막힌다
   · 닫히면 0.95초 재사용 대기 → 연타로 버티는 걸 막는다
   ══════════════════════════════════════════════════════════════ */
VG.shield = null;
VG.shieldActive = 0;        // 남은 방어 시간
VG.shieldCd = 0;            // 남은 재사용 대기
VG.blockCount = 0;          // 방어 성공 횟수 (점수 · 검증용)

VG.buildShield = function (scene) {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({
    color: VG.COLORS.cyan, transparent: true, opacity: 0.26,
    side: THREE.DoubleSide, fog: false, depthWrite: false,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), mat);
  const wire = new THREE.Mesh(
    new THREE.SphereGeometry(1.04, 12, 9),
    new THREE.MeshBasicMaterial({ color: 0xFFFFFF, wireframe: true, transparent: true,
                                  opacity: 0.22, fog: false, depthWrite: false })
  );
  g.add(dome, wire);
  g.visible = false;
  g.userData = { dome: dome, wire: wire, mat: mat };
  scene.add(g);
  VG.shield = g;
  return g;
};

VG.tryShield = function () {
  if (VG.G.phase !== 'survive' && VG.G.phase !== 'boss') return false;
  if (VG.shieldActive > 0 || VG.shieldCd > 0) return false;
  const c = VG.CFG.shield;
  VG.shieldActive = c.dur;
  VG.shieldCd = c.dur + c.cd;
  VG.SND.play('shield');
  return true;
};

VG.updateShield = function (dt) {
  if (VG.shieldActive > 0) VG.shieldActive -= dt;
  if (VG.shieldCd > 0) VG.shieldCd -= dt;

  const s = VG.shield;
  if (!s) return;
  const on = VG.shieldActive > 0;
  s.visible = on;
  if (!on) return;

  s.position.copy(VG.player.position);
  const t = 1 - Math.max(0, VG.shieldActive) / VG.CFG.shield.dur;   // 0 → 1
  const grow = 0.55 + 0.45 * Math.min(1, t * 4);                    // 확 열렸다가
  const fade = 1 - Math.max(0, (t - 0.75) / 0.25);                  // 끝에 살짝 닫힌다
  s.scale.setScalar(VG.CFG.shield.radius * grow);
  s.userData.mat.opacity = 0.30 * fade + 0.06;
  s.userData.wire.material.opacity = 0.26 * fade + 0.05;
  s.rotation.y += dt * 1.4;
};

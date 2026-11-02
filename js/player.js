/* ══════════════════════════════════════════════════════════════
   js/player.js — 우주선 (미사일 발사구 포함)
   ══════════════════════════════════════════════════════════════ */
VG.buildPlayer = function (scene) {
  const group = new THREE.Group();
  group.position.set(0, 0.6, 0);

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 0.34, 1.25),
    new THREE.MeshLambertMaterial({ color: VG.COLORS.cyan })
  );
  const nose = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.3, 0.55),
    new THREE.MeshLambertMaterial({ color: VG.COLORS.cream })
  );
  nose.position.set(0, 0.04, -0.78);

  const wingL = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.14, 0.42),
    new THREE.MeshLambertMaterial({ color: VG.COLORS.yellow })
  );
  wingL.position.set(-0.86, -0.06, 0.18);
  const wingR = wingL.clone();
  wingR.position.x = 0.86;

  // 발사구 — 미사일 레벨이 오르면 이 부분이 커진다
  const gun = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.16, 0.5),
    new THREE.MeshLambertMaterial({ color: VG.COLORS.yellow })
  );
  gun.position.set(0, 0.22, -0.7);
  group.userData.gun = gun;

  group.add(body, nose, wingL, wingR, gun);
  scene.add(group);
  return group;
};

VG.movePlayer = function (group, dt) {
  const k = VG.keys;
  const dir = (k.right ? 1 : 0) - (k.left ? 1 : 0);
  group.position.x += dir * VG.CFG.playerSpeed * dt;
  group.position.x = Math.max(-VG.CFG.lanes, Math.min(VG.CFG.lanes, group.position.x));
  group.rotation.z = -dir * 0.18;
};

// 미사일 레벨에 따라 발사구가 굵어진다 (강화가 눈에 보이게)
VG.syncGun = function (player) {
  const lv = VG.G.missileLvl;
  const gun = player.userData.gun;
  gun.scale.set(1 + (lv - 1) * 0.28, 1 + (lv - 1) * 0.28, 1);
  gun.material.color.setHex(lv >= 4 ? VG.COLORS.pink : VG.COLORS.yellow);
};

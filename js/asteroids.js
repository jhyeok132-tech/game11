/* ══════════════════════════════════════════════════════════════
   js/asteroids.js — 운석 (1단계와 보스전 공용)
   ══════════════════════════════════════════════════════════════ */
VG.asteroids = [];

VG.spawnAsteroid = function (scene, fromBoss) {
  const size = VG.rand(0.55, 1.3);
  const color = Math.random() < 0.22 ? VG.COLORS.pink : VG.COLORS.rock;

  const m = new THREE.Mesh(
    new THREE.IcosahedronGeometry(size, 0),
    new THREE.MeshLambertMaterial({ color: color, flatShading: true })
  );
  if (fromBoss) {
    // 보스에서 떨어지는 운석은 보스 위치 근처에서 시작한다
    m.position.set(fromBoss.position.x + VG.rand(-2.2, 2.2), VG.rand(1.4, 2.6),
                   fromBoss.position.z + 2);
  } else {
    m.position.set(VG.rand(-VG.CFG.lanes, VG.CFG.lanes), VG.rand(0.4, 2.2),
                   VG.rand(-70, -58));
  }
  m.rotation.set(VG.rand(0, 3), VG.rand(0, 3), VG.rand(0, 3));
  m.userData = { size: size, spin: VG.rand(-1.1, 1.1), vx: VG.rand(-0.8, 0.8) };

  scene.add(m);
  VG.asteroids.push(m);
};

VG.clearAsteroids = function (scene) {
  VG.asteroids.forEach(function (a) { scene.remove(a); });
  VG.asteroids = [];
};

VG.updateAsteroids = function (scene, player, dt, speed) {
  const hit = VG.CFG.asteroid.hitSize;
  let hits = 0, dodged = 0;

  for (let i = VG.asteroids.length - 1; i >= 0; i--) {
    const a = VG.asteroids[i];
    a.position.z += speed * dt;
    a.position.x += a.userData.vx * dt;
    a.rotation.x += a.userData.spin * dt;
    a.rotation.y += a.userData.spin * 0.7 * dt;

    const dx = Math.abs(a.position.x - player.position.x);
    const dz = Math.abs(a.position.z - player.position.z);
    const near = (a.userData.size + hit) * 0.50;

    if (dx < near && dz < 1.1) {
      scene.remove(a);
      VG.asteroids.splice(i, 1);
      hits += 1;
      continue;
    }
    if (a.position.z > 12) {
      scene.remove(a);
      VG.asteroids.splice(i, 1);
      dodged += 1;
    }
  }
  return { hits: hits, dodged: dodged };
};

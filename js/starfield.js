/* ══════════════════════════════════════════════════════════════
   js/starfield.js — 별 배경 + 바닥 격자 (1차 버전과 동일)
   ══════════════════════════════════════════════════════════════ */
VG.buildStars = function (scene) {
  const g = new THREE.BufferGeometry();
  const n = 900, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos[i * 3]     = VG.rand(-38, 38);
    pos[i * 3 + 1] = VG.rand(0, 28);
    pos[i * 3 + 2] = VG.rand(-120, 0);
  }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const stars = new THREE.Points(g, new THREE.PointsMaterial({
    color: 0x9c93b8, size: 0.22, sizeAttenuation: true,
  }));
  scene.add(stars);
  return stars;
};

VG.buildFloor = function (scene) {
  const grid = new THREE.GridHelper(140, 44, 0x2a2540, 0x1b1830);
  grid.position.set(0, -0.6, -45);
  scene.add(grid);
};

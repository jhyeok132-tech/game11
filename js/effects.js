/* ══════════════════════════════════════════════════════════════
   js/effects.js — 폭발 조각 · 화면 흔들림 · 붉은 섬광

   게임에서 '맞았다'는 느낌은 숫자가 아니라 화면에서 나온다.
   1) burst()  : 작은 조각을 사방으로 터뜨린다
   2) shake()  : 카메라를 잠깐 흔든다
   3) flash()  : 화면을 색으로 덮었다가 지운다
   ══════════════════════════════════════════════════════════════ */
VG.parts = [];

VG.burst = function (scene, pos, color, n) {
  n = n || 10;
  for (let i = 0; i < n; i++) {
    const s = VG.rand(0.10, 0.22);
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(s, s, s),
      new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 1 })
    );
    m.position.copy(pos);
    m.userData = {
      vx: VG.rand(-7, 7), vy: VG.rand(-2, 7), vz: VG.rand(-4, 8),
      life: VG.rand(0.35, 0.7), age: 0,
    };
    scene.add(m);
    VG.parts.push(m);
  }
};

VG.updateParts = function (scene, dt) {
  for (let i = VG.parts.length - 1; i >= 0; i--) {
    const m = VG.parts[i], u = m.userData;
    u.age += dt;
    m.position.x += u.vx * dt;
    m.position.y += u.vy * dt;
    m.position.z += u.vz * dt;
    u.vy -= 12 * dt;
    m.rotation.x += dt * 6; m.rotation.y += dt * 4;
    m.material.opacity = Math.max(0, 1 - u.age / u.life);
    if (u.age >= u.life) {
      scene.remove(m);
      VG.parts.splice(i, 1);
    }
  }
};

VG.clearParts = function (scene) {
  VG.parts.forEach(function (p) { scene.remove(p); });
  VG.parts = [];
};

// ── 화면 흔들림 ────────────────────────────────────────────────
VG.shakeAmt = 0;
VG.shake = function (amount) { VG.shakeAmt = Math.max(VG.shakeAmt, amount); };

VG.applyShake = function (camera, dt, baseX) {
  VG.shakeAmt *= Math.pow(0.0016, dt);          // 빠르게 잦아든다
  if (VG.shakeAmt < 0.002) VG.shakeAmt = 0;
  const a = VG.shakeAmt;
  camera.position.x = baseX + (Math.random() - 0.5) * a;
  camera.position.y = 6.2 + (Math.random() - 0.5) * a * 0.6;
};

// ── 화면 섬광 (DOM) ───────────────────────────────────────────
VG.flashScreen = function (ms) {
  const el = VG.$('flash');
  if (!el) return;
  el.style.transition = 'none';
  el.style.opacity = '0.95';
  setTimeout(function () {
    el.style.transition = 'opacity ' + (ms || 420) + 'ms ease-out';
    el.style.opacity = '0';
  }, 30);
};

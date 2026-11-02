/* ══════════════════════════════════════════════════════════════
   js/bossfire.js — 보스가 쏘는 미사일

   바뀐 규칙
     · 보스전에서는 운석이 떨어지지 않는다.
     · 보스가 플레이어를 조준해 미사일을 쏜다 → 피하는 게임.
     · 페이즈가 오르면 탄속(speed)과 발수(count), 연사(gap)가 함께 빨라진다.
     · 발사 전에 0.3~0.5초 '조준' 구간이 있어 피할 틈을 준다.

   가독성 (v3.1)
     · 탄 재질은 fog:false — 어두운 우주에서도 색이 죽지 않는다.
     · 흰 심 + 색 몸통 + 흰 외곽선 + 꼬리 4겹으로 어디서든 또렷하게.
   ══════════════════════════════════════════════════════════════ */
VG.bullets = [];
VG.flashes = [];

VG.bulletColor = function (phase) {
  return phase === 1 ? VG.COLORS.pink : phase === 2 ? VG.COLORS.orange : VG.COLORS.yellow;
};

// 안개 영향 없는 밝은 재질 (가독성 핵심)
function _flat(color, opacity) {
  return new THREE.MeshBasicMaterial({
    color: color,
    transparent: opacity < 1,
    opacity: opacity,
    fog: false,
    depthWrite: opacity >= 1,
  });
}

// ── 1발 만들기 ─────────────────────────────────────────────────
VG.spawnBossBullet = function (scene, x, y, z, vx, speed, phase) {
  const g = new THREE.Group();
  const col = VG.bulletColor(phase);

  // 꼬리 (뒤로 길게 — 날아오는 방향이 한눈에 보인다)
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.02, 3.8, 6), _flat(col, 0.34));
  tail.rotation.x = Math.PI / 2;
  tail.position.z = 2.7;

  // 외곽선 (흰 테두리 — 배경과 분리)
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 2.30, 12), _flat(0xFFFFFF, 0.28));
  rim.rotation.x = Math.PI / 2;

  // 몸통
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 2.30, 12), _flat(col, 0.95));
  body.rotation.x = Math.PI / 2;

  // 심 (흰색 — 가장 밝은 부분)
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 2.55, 8), _flat(0xFFFFFF, 1));
  core.rotation.x = Math.PI / 2;

  // 앞쪽 촉
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.56, 10, 8), _flat(0xFFFFFF, 1));
  tip.position.z = -1.15;

  g.add(tail, rim, body, core, tip);
  g.position.set(x, y, z);
  g.userData = { vx: vx, speed: speed, phase: phase, rim: rim, body: body, tip: tip };
  scene.add(g);
  VG.bullets.push(g);
  return g;
};

// ── 발사 (조준 + 부채꼴) ───────────────────────────────────────
VG.bossFire = function (scene, boss, player) {
  const c = VG.CFG.boss.shot;
  const phase = VG.G.bossPhase;
  const n = c.count[phase - 1];
  const speed = c.speed[phase - 1];
  const spread = c.spread[phase - 1];

  // 발사구: 왼쪽 포드 / 오른쪽 포드 / 중앙
  const pods = [[-3.6, 1.5], [3.6, 1.5], [0, 2.0]];
  const bx = boss.position.x, bz = boss.position.z, by = boss.position.y;

  for (let i = 0; i < n; i++) {
    const pod = pods[(VG.G.bossShotN++) % pods.length];
    const sx = bx + pod[0];
    const sy = by + pod[1];
    const sz = bz + 2.2;

    // 플레이어가 도달할 시간만큼 앞을 예측해 조준한다 (살짝만 예측)
    const dz = Math.max(6, player.position.z - sz);
    const t = dz / speed;
    const lead = (VG.keys.right ? 1 : 0) - (VG.keys.left ? 1 : 0);
    const tx = player.position.x + lead * 1.6;

    let vx = (tx - sx) / t;
    vx = Math.max(-6.5, Math.min(6.5, vx));            // 너무 옆으로 꺾이지 않게
    vx += (i - (n - 1) / 2) * spread;                  // 부채꼴로 벌린다

    VG.spawnBossBullet(scene, sx, sy, sz, vx, speed, phase);
  }

  // 총구 섬광
  for (let k = 0; k < n; k++) {
    const pod = pods[(VG.G.bossShotN - 1 - k) % pods.length];
    VG.flashes.push({ x: bx + pod[0], y: by + pod[1], z: bz + 1.6, t: 0, color: VG.bulletColor(phase) });
  }
  VG.SND.play('pew', phase);
};

// ── 이동 + 충돌 ────────────────────────────────────────────────
VG.updateBullets = function (scene, dt, player) {
  let hits = 0, dodged = 0;
  const px = player.position.x, pz = player.position.z;

  for (let i = VG.bullets.length - 1; i >= 0; i--) {
    const b = VG.bullets[i];
    const u = b.userData;
    b.position.z += u.speed * dt;
    b.position.x += u.vx * dt;
    b.position.y += Math.sin((b.position.z + u.phase * 2) * 0.5) * 0.004;

    // 심박동하듯 아주 약하게 커졌다 작아진다 (시선을 끈다)
    const puls = 1 + Math.sin(b.position.z * 0.9) * 0.06;
    u.rim.scale.setScalar(puls);
    u.tip.scale.setScalar(puls);

    const dx = Math.abs(b.position.x - px);
    const dz = Math.abs(b.position.z - pz);

    if (dx < 0.70 && dz < 1.05) {
      VG.burst(scene, b.position, VG.bulletColor(u.phase), 8);
      scene.remove(b);
      VG.bullets.splice(i, 1);
      hits += 1;
      continue;
    }
    if (b.position.z > 5 || Math.abs(b.position.x) > 16) {   // 카메라 앞에서 사라진다
      scene.remove(b);
      VG.bullets.splice(i, 1);
      dodged += 1;                       // 뒤로 지나가면 '피했다'로 계산
    }
  }
  return { hits: hits, dodged: dodged };
};

VG.clearBullets = function (scene) {
  VG.bullets.forEach(function (b) { scene.remove(b); });
  VG.bullets = [];
  VG.flashes.forEach(function (f) { if (f.mesh) scene.remove(f.mesh); });
  VG.flashes = [];
};

// 총구 섬광은 0.22초만 보이게
VG.updateFlashes = function (scene, dt) {
  for (let i = VG.flashes.length - 1; i >= 0; i--) {
    const f = VG.flashes[i];
    f.t += dt;
    if (!f.mesh) {
      f.mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.62, 8, 6),
        new THREE.MeshBasicMaterial({ color: f.color, transparent: true, opacity: 0.9, fog: false })
      );
      f.mesh.position.set(f.x, f.y, f.z);
      scene.add(f.mesh);
    }
    f.mesh.scale.setScalar(1 + f.t * 8);
    f.mesh.material.opacity = Math.max(0, 0.9 - f.t * 4);
    if (f.t > 0.24) { scene.remove(f.mesh); VG.flashes.splice(i, 1); }
  }
};

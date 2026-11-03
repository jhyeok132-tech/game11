/* ══════════════════════════════════════════════════════════════
   js/boss.js — 문어 보스 (다리 8개)

   · 등장: 뒤에서 튀어나오며 경보 · 화면 흔들림
   · 공격: 다리를 들어올려(예고) → 플레이어 쪽으로 내리친다
   · 방어: 스페이스바 방어막을 '타이밍 맞춰' 켜면 막힌다 (shield.js)
   · 페이즈: HP 가 줄면 색이 바뀌고 다리 수 · 속도가 올라간다
   ══════════════════════════════════════════════════════════════ */
VG.boss = null;
VG.BOSS_SCALE = 1.45;                      // 화면 폭 기준 — 다리 8개가 읽히는 크기
VG.octo = { state: 'idle', wait: 2.2, el: 0, legs: [], done: false, next: 0, warned: false };

var UP = new THREE.Vector3(0, 1, 0);
var LEGS = 8, SEGS = 7, SEG_LEN = 0.86;
// 다리가 내리치는 지점(월드). 표식 링도 같은 z 를 쓴다 — 링과 촉수 끝이 반드시 일치해야 한다.
VG.MARK_Z = -1.05;

// 다리 굵기 — 뿌리는 굵고 끝으로 갈수록 가늘어진다 (문어 다리)
function armRadius(f) { return 0.46 * Math.pow(1 - f, 0.50) + 0.065; }
// 3차 베지어
function bez(a, b, c, d, f) {
  const i = 1 - f;
  return i * i * i * a + 3 * i * i * f * b + 3 * i * f * f * c + f * f * f * d;
}

function placeSeg(m, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.001;
  m.position.set(a.x + dx * 0.5, a.y + dy * 0.5, a.z + dz * 0.5);
  m.scale.y = len / SEG_LEN;
  m.quaternion.setFromUnitVectors(UP, new THREE.Vector3(dx / len, dy / len, dz / len));
}

VG.buildBoss = function (scene) {
  const g = new THREE.Group();

  // ── 망토(머리) — 위는 둥글고 아래로 살짝 좁아지는 문어 머리
  const headMat = new THREE.MeshLambertMaterial({ color: VG.COLORS.boss1 });
  const head = new THREE.Mesh(new THREE.SphereGeometry(1.62, 26, 20), headMat);
  head.scale.set(1.08, 1.14, 1.00);
  head.position.y = 1.05;
  g.add(head);

  // 머리 밑동 — 다리 8개가 여기서 갈라져 나온다
  const crown = new THREE.Mesh(new THREE.SphereGeometry(1.50, 22, 16), headMat);
  crown.scale.set(1.24, 0.54, 1.06);
  crown.position.y = -1.55;
  g.add(crown);

  // 눈 — 흰자 + 검은 눈동자 + 하이라이트
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xFBF8EF, fog: false });
  const pupMat = new THREE.MeshBasicMaterial({ color: 0x14121E, fog: false });
  const eyes = [];
  [-0.92, 0.92].forEach(function (ex) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.78, 16, 12), eyeMat);
    e.position.set(ex, 1.18, 1.52);
    e.scale.set(1, 1.15, 0.62);
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 10), pupMat);
    p.position.set(ex * 0.94, 1.14, 1.92);
    const hl = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), eyeMat);
    hl.position.set(ex * 0.94 + 0.14, 1.32, 2.10);
    eyes.push(e);
    g.add(e, p, hl);
  });

  // ── 다리 8개 — 머리 밑동 둘레에 방사형으로 붙는다
  //    관절 구슬 8개 + 그 사이를 잇는 원기둥 7개 (구슬이 꺾인 자리를 메워 부드럽게 보인다)
  const legMat = new THREE.MeshLambertMaterial({ color: VG.COLORS.boss1 });
  const jointGeo = new THREE.SphereGeometry(1, 12, 9);
  const legs = [];
  for (let i = 0; i < LEGS; i++) {
    // 다리 끝이 화면에 고르게 8개로 벌어지도록 '끝 위치'를 먼저 정한다
    //   좌우로 고르게 퍼지고, 끝은 머리 아래로 길게 늘어진다
    const tipX = -4.4 + 8.8 * i / (LEGS - 1);
    const tipZ = 0.35 * Math.cos((i / (LEGS - 1) - 0.5) * Math.PI);
    const rx = tipX * 0.38;                        // 뿌리는 머리 아래에 모여 있다
    const rz = tipZ * 0.28;
    const dx = tipX >= 0 ? 1 : -1;
    const dz = 0;

    const segs = [], joints = [];
    for (let s = 0; s <= SEGS; s++) {
      const j = new THREE.Mesh(jointGeo, legMat);
      joints.push(j); g.add(j);
    }
    for (let s = 0; s < SEGS; s++) {
      const r0 = armRadius(s / SEGS), r1 = armRadius((s + 1) / SEGS);
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, SEG_LEN, 9, 1), legMat);
      segs.push(m); g.add(m);
    }

    legs.push({
      i: i,
      dir: new THREE.Vector3(dx, 0, 0),                       // 바깥(좌/우) 방향
      root: new THREE.Vector3(rx, -1.75, rz),
      tip: new THREE.Vector3(tipX, -6.20 + (i % 3 - 1) * 0.32, tipZ),
      phase: i * 0.78,
      segs: segs,
      joints: joints,
      k: 0,                                       // 0 = 평소, 1 = 표식에 내리침
      target: null,
    });
  }

  g.position.set(0, VG.CFG.boss.y, VG.CFG.boss.z);
  g.scale.setScalar(VG.BOSS_SCALE);
  g.visible = false;
  g.userData = { headMat: headMat, legMat: legMat, eyes: eyes, legs: legs, intro: -1 };
  scene.add(g);
  VG.boss = g;
  return g;
};

// ── 예고 표식 (바닥에 뜨는 링) ────────────────────────────────
VG.markers = [];
VG.spawnMarker = function (scene, x) {
  const grp = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.62, 0.92, 28),
    new THREE.MeshBasicMaterial({ color: 0xFF5C8A, transparent: true, opacity: 0.95,
                                  side: THREE.DoubleSide, fog: false })
  );
  const ring2 = null;                       // 바깥 노란 링은 뺐다 — 3개가 겹쳐 한 덩어리로 보였다
  const dot = new THREE.Mesh(
    new THREE.CircleGeometry(0.20, 16),
    new THREE.MeshBasicMaterial({ color: 0xFF5C8A, transparent: true, opacity: 0.9,
                                  side: THREE.DoubleSide, fog: false })
  );
  grp.add(ring, dot);
  grp.rotation.x = -Math.PI / 2;
  grp.position.set(x, 0.12, VG.MARK_Z);   // 전투기 바로 앞 바닥
  grp.userData = { ring: ring, ring2: ring2, t: 0, x: x };
  scene.add(grp);
  VG.markers.push(grp);
  return grp;
};
VG.clearMarkers = function (scene) {
  VG.markers.forEach(function (m) { scene.remove(m); });
  VG.markers = [];
};

// ── 등장 ─────────────────────────────────────────────────────
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
  VG.G.chargeTimer = 0;
  b.userData.intro = 0;

  VG.octo.state = 'idle';
  VG.octo.wait = 2.0;                     // 등장 직후 여유
  VG.octo.el = 0;
  VG.octo.legs = [];
  VG.octo.next = 0;

  VG.applyBossPhase(1);
  VG.SND.bgm('boss');
  VG.SND.play('alarm');
  VG.shake(1.5);
  VG.flashScreen(520);
  VG.drama = 1;
};

VG.bossColor = function (phase) {
  return phase === 1 ? VG.COLORS.boss1 : phase === 2 ? VG.COLORS.boss2 : VG.COLORS.boss3;
};

VG.applyBossPhase = function (phase) {
  const b = VG.boss, c = VG.bossColor(phase);
  b.userData.headMat.color.setHex(c);
  b.userData.legMat.color.setHex(c);
  b.scale.setScalar(VG.BOSS_SCALE * (1 + (phase - 1) * 0.04));
};

// ── 다리 한 점의 위치 ────────────────────────────────────────
//   평소: 뿌리에서 바깥으로 뻗어 바닥 쪽으로 내려갔다가 끝이 살짝 말린다
//   공격: 위로 치켜들었다가 표식(월드 좌표)으로 수직 낙하
//   leg.target 은 월드 좌표 → 보스 그룹 스케일(1.4)을 되돌려 로컬로 환산한다
function armPoint(leg, f, t, out, b) {
  const r = leg.root, d = leg.dir;
  const sw = Math.cos(t * 1.05 + leg.phase) * 0.30;   // 좌우로 천천히 흔들린다

  // 평소 자세: 뿌리 → 바깥으로 볼록하게 뻗고 → 끝은 살짝 말려 들린다
  const eX = leg.tip.x + sw * 0.35 + Math.sin(t * 0.7 + leg.phase) * 0.18;
  const eY = leg.tip.y + Math.sin(t * 1.7 + leg.phase) * 0.08;
  const eZ = leg.tip.z;
  const c1x = r.x + (eX - r.x) * 0.40 + d.x * 0.70, c1y = r.y - 0.62, c1z = r.z + (eZ - r.z) * 0.40;
  const c2x = eX - d.x * 0.55, c2y = eY + 0.45, c2z = eZ;

  let bx = bez(r.x, c1x, c2x, eX, f);
  let by = bez(r.y, c1y, c2y, eY, f);
  let bz = bez(r.z, c1z, c2z, eZ, f);

  if (leg.target && leg.k > 0) {
    const S = (b && b.scale.x) || 1;
    const tx = (leg.target.x - b.position.x) / S;
    const ty = (leg.target.y - b.position.y) / S;
    const tz = (leg.target.z - b.position.z) / S;

    // 내리치기 자세 제어점 — 위로 솟았다가 표식 머리 위에서 곧장 떨어진다
    const s1x = r.x + d.x * 0.4, s1y = r.y + 1.55, s1z = r.z + d.z * 0.4;
    const s2x = tx, s2y = ty + 6.4, s2z = tz - 2.2;

    const k = leg.k;
    bx += (bez(r.x, s1x, s2x, tx, f) - bx) * k;
    by += (bez(r.y, s1y, s2y, ty, f) - by) * k;
    bz += (bez(r.z, s1z, s2z, tz, f) - bz) * k;
  }

  out.set(bx, by, bz);
  return out;
}

var _a = new THREE.Vector3(), _b = new THREE.Vector3();
var _p = [];
for (let _i = 0; _i <= SEGS; _i++) _p.push(new THREE.Vector3());

// ── 매 프레임 애니메이션 ─────────────────────────────────────
VG.updateBoss = function (dt, t) {
  const b = VG.boss;
  if (!b || !b.visible) return 99;
  const c = VG.CFG.boss;
  const ph = VG.G.bossPhase;

  if (b.userData.intro >= 0) {                       // 등장: 뒤에서 앞으로
    b.userData.intro += dt;
    const k = Math.min(1, b.userData.intro / 1.6);
    const e = 1 - Math.pow(1 - k, 3);
    b.position.z = (c.z - 16) + 16 * e;
    b.scale.setScalar(VG.BOSS_SCALE * (0.35 + 0.65 * e) * (1 + (ph - 1) * 0.04));
    if (k >= 1) b.userData.intro = -1;
  }

  b.position.x = Math.sin(t * c.swaySpeed * (1 + (ph - 1) * 0.3)) * c.swayAmp;
  b.rotation.z = Math.cos(t * c.swaySpeed) * 0.05;
  b.position.y = c.y + Math.sin(t * 1.3) * 0.16;

  // 다리 자세 갱신 — 표본점 8개를 먼저 구하고 그 사이를 원기둥으로 잇는다
  b.userData.legs.forEach(function (leg) {
    for (let s = 0; s <= SEGS; s++) armPoint(leg, s / SEGS, t, _p[s], b);
    for (let s = 0; s < SEGS; s++) placeSeg(leg.segs[s], _p[s], _p[s + 1]);
    for (let s = 0; s <= SEGS; s++) {
      const j = leg.joints[s];
      j.position.copy(_p[s]);
      j.scale.setScalar(armRadius(s / SEGS));
    }
  });

  // 예고 표식 링 애니메이션
  for (let i = VG.markers.length - 1; i >= 0; i--) {
    const m = VG.markers[i];
    m.userData.t += dt;
    const pulse = 0.55 + 0.45 * Math.abs(Math.sin(m.userData.t * 7));
    m.userData.ring.material.opacity = pulse;
    if (m.userData.ring2) m.userData.ring2.scale.setScalar(1 + Math.sin(m.userData.t * 9) * 0.12);
    m.rotation.z += dt * 1.6;
  }

  return 99;                                         // 더 이상 미사일을 쏘지 않는다
};

// ── 공격 진행 ───────────────────────────────────────────────
VG.startOctoAttack = function () {
  const o = VG.octo, G = VG.G, C = VG.CFG.octo;
  const ph = G.bossPhase;
  const n = C.legs[ph - 1];
  const px = VG.player.position.x;

  // 항상 '플레이어가 있는 자리'를 노린다 → 피하려면 움직이거나 막아야 한다
  const targets = [px];
  for (let i = 1; i < n; i++) {
    const side = (i % 2 ? 1 : -1) * (2.2 + Math.floor((i - 1) / 2) * 1.6);
    targets.push(Math.max(-VG.CFG.lanes, Math.min(VG.CFG.lanes, px + side)));
  }

  o.legs = targets.map(function (tx, idx) {
    const tent = VG.boss.userData.legs[(o.next + idx) % LEGS];
    // 월드 좌표 — 전투기 바로 앞바닥(표식과 같은 자리)을 노린다
    tent.target = new THREE.Vector3(tx, 0.55, VG.MARK_Z);
    tent.k = 0;
    VG.spawnMarker(VG.scene, tx);
    return { tent: tent, x: tx, blocked: false };
  });
  o.next = (o.next + n) % LEGS;
  o.state = 'telegraph';
  o.el = 0;
  o.done = false;
  VG.SND.play('charge', ph);
};

VG.resolveOctoAttack = function () {
  const o = VG.octo, C = VG.CFG.octo, G = VG.G;
  const px = VG.player.position.x;
  const shielded = VG.shieldActive > 0;

  let blockedAny = false, hitAny = false;
  o.legs.forEach(function (leg) {
    if (Math.abs(leg.x - px) > C.reach) return;      // 그 자리에 없으면 스쳐 지나감
    if (shielded) {
      leg.blocked = true;
      blockedAny = true;
      VG.burst(VG.scene, new THREE.Vector3(px, 1.0, -1.2), 0x3CC7E0, 14);
      VG.sparks(px);
    } else {
      hitAny = true;
    }
  });

  if (blockedAny) {
    VG.blockCount += 1;
    VG.damageBoss(C.blockDmg);
    VG.SND.play('block');
    VG.shake(0.7);
    VG.fxText('BLOCK!', '#3CC7E0');
  }
  if (hitAny) {
    VG.hit();
    VG.shake(1.6);
  }
  if (!blockedAny && !hitAny) VG.fxText('DODGE', '#FFD23F');
};

// 방어 성공 스파크 (다리 끝에서 튀는 빛)
VG.sparks = function (x) {
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 6, 5),
      new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.95, fog: false })
    );
    m.position.set(x + (Math.random() - 0.5) * 1.6, 0.8 + Math.random() * 1.2, -1.4);
    m.userData = { v: new THREE.Vector3((Math.random() - 0.5) * 6, Math.random() * 5, (Math.random() - 0.5) * 4), life: 0.4 };
    VG.scene.add(m);
    VG.sparkList.push(m);
  }
};
VG.sparkList = [];
VG.updateSparks = function (dt) {
  for (let i = VG.sparkList.length - 1; i >= 0; i--) {
    const m = VG.sparkList[i];
    m.userData.life -= dt;
    m.position.addScaledVector(m.userData.v, dt);
    m.userData.v.y -= 9 * dt;
    m.material.opacity = Math.max(0, m.userData.life / 0.4);
    if (m.userData.life <= 0) { VG.scene.remove(m); VG.sparkList.splice(i, 1); }
  }
};

// 화면 가운데 뜨는 판정 문구 (BLOCK! / DODGE)
VG.fxText = function (text, color) {
  const el = VG.$('fxText');
  if (!el) return;
  el.textContent = text;
  el.style.color = color;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
};

VG.updateOctopusAttack = function (dt) {
  const o = VG.octo, C = VG.CFG.octo, G = VG.G;
  if (G.phase !== 'boss' || !VG.boss.visible) return;
  const ph = G.bossPhase;
  const tg = C.telegraph[ph - 1];

  if (o.state === 'idle') {
    o.wait -= dt;
    if (o.wait <= 0) VG.startOctoAttack();
    return;
  }

  o.el += dt;

  if (o.state === 'telegraph') {
    // 예고: 다리를 위로 치켜든다 (아직 표식에는 닿지 않는다)
    const k = Math.min(1, o.el / tg) * 0.42;
    o.legs.forEach(function (leg) { leg.tent.k = k; });
    if (o.el >= tg) {
      o.state = 'slam';          // 내리치기 시작
      o.el = 0;
      VG.SND.play('slam');
    }
    return;
  }

  if (o.state === 'slam') {
    // 빠르게 내리친다 — 다리 끝이 표식에 닿는 순간이 판정 시점
    const k = 0.42 + 0.58 * Math.min(1, o.el / C.slamTime);
    o.legs.forEach(function (leg) { leg.tent.k = k; });
    if (o.el >= C.slamTime) {
      VG.clearMarkers(VG.scene);
      VG.resolveOctoAttack();
      o.state = 'retract';
      o.el = 0;
    }
    return;
  }

  if (o.state === 'retract') {
    const k = Math.max(0, 1 - o.el / C.retract);
    o.legs.forEach(function (leg) { leg.tent.k = k; });
    if (o.el >= C.retract) {
      o.legs.forEach(function (leg) { leg.tent.target = null; leg.tent.k = 0; });
      o.legs = [];
      o.state = 'idle';
      o.wait = C.gap[ph - 1];
    }
  }
};

VG.clearOctopusAttack = function () {
  const o = VG.octo;
  o.state = 'idle';
  o.wait = 2.2;
  o.el = 0;
  o.done = false;
  o.next = 0;
  o.legs = [];
  if (VG.boss) {
    VG.boss.userData.legs.forEach(function (leg) { leg.target = null; leg.k = 0; });
  }
  VG.clearMarkers(VG.scene);
  VG.sparkList.forEach(function (m) { VG.scene.remove(m); });
  VG.sparkList = [];
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

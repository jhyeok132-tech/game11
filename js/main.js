/* ══════════════════════════════════════════════════════════════
   js/main.js — 게임 진행
   상태: ready → survive(30초 운석) → boss(조준 미사일 3페이즈) → clear | over
   ══════════════════════════════════════════════════════════════ */
VG.scene = VG.camera = VG.renderer = VG.clock = VG.stars = VG.player = null;
VG.drama = 0;                 // 보스 등장 줌인 (1 → 0)
VG.camBlend = 0;              // 보스전 카메라 각도 (0 = 1단계, 1 = 보스전)

VG.init = function () {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(VG.COLORS.bg, 20, 70);

  const camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, 0.1, 220);
  camera.position.set(0, 6.2, 11.5);
  camera.lookAt(0, 1.2, -6);

  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.setClearColor(VG.COLORS.bg, 1);
  document.body.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 0.62));
  const key = new THREE.DirectionalLight(0xffffff, 0.85);
  key.position.set(4, 12, 7);
  scene.add(key);
  const rim = new THREE.DirectionalLight(VG.COLORS.pink, 0.35);
  rim.position.set(-7, 3, -9);
  scene.add(rim);

  VG.scene = scene; VG.camera = camera; VG.renderer = renderer;
  VG.stars = VG.buildStars(scene);
  VG.buildFloor(scene);
  VG.player = VG.buildPlayer(scene);
  VG.buildBoss(scene);
  VG.clock = new THREE.Clock();

  addEventListener('resize', VG.onResize);
  addEventListener('keydown', VG.onKey);
  addEventListener('keyup', VG.onKeyUp);
  VG.$('startBtn').onclick = VG.start;
  VG.$('retryBtn').onclick = VG.start;
  VG.$('clearBtn').onclick = VG.start;

  const mb = VG.$('muteBtn');
  if (mb) {
    mb.textContent = VG.SND.isOn() ? '🔊' : '🔇';
    mb.onclick = function (e) {
      e.stopPropagation();
      mb.textContent = VG.SND.toggle() ? '🔊' : '🔇';
    };
  }

  VG.renderHearts();
  VG.renderMissile();
  VG.animate();
};

// ── 시작 ────────────────────────────────────────────────────────
VG.start = function () {
  const G = VG.G;
  VG.clearAsteroids(VG.scene);
  VG.clearItems(VG.scene);
  VG.clearMissiles(VG.scene);
  VG.clearBullets(VG.scene);
  VG.clearParts(VG.scene);
  VG.boss.visible = false;
  VG.drama = 0;
  VG.camBlend = 0;

  G.phase = 'survive';
  G.t = 0; G.surviveLeft = VG.CFG.surviveTime;
  G.lives = VG.CFG.lives; G.score = 0; G.dodged = 0;
  G.missileLvl = 1; G.picked = 0;
  G.bossHp = 0; G.bossMax = 0; G.bossPhase = 1; G.bossShotN = 0;
  G.fireTimer = 0; G.itemTimer = 2.0; G.bossFireTimer = 1.4;
  G.invuln = 0; G.spawnTimer = 0; G.chargeTimer = 0; G.alertT = 0;

  VG.player.position.x = 0;
  VG.player.visible = true;
  VG.syncGun(VG.player);
  VG.$('startScreen').classList.add('hide');
  VG.$('overScreen').classList.add('hide');
  VG.$('clearScreen').classList.add('hide');
  VG.$('danger').classList.remove('on');
  VG.renderHearts(); VG.renderMissile(); VG.updateHud();

  VG.SND.init();
  VG.SND.bgm('survive');
};

// ── 1단계 → 2단계 ───────────────────────────────────────────────
VG.startBoss = function () {
  VG.G.phase = 'boss';
  VG.clearAsteroids(VG.scene);        // 남은 운석은 정리 — 이제 보스가 직접 쏜다
  VG.showBoss();
  VG.$('bossAlert').classList.remove('hide');
  VG.G.alertT = 2.6;                  // 경보는 게임 시간으로 끈다(녹화·일시정지에 안전)
};

// ── 끝 ──────────────────────────────────────────────────────────
VG.gameOver = function () {
  const G = VG.G;
  G.phase = 'over';
  VG.SND.bgmStop();
  VG.SND.play('over');
  VG.burst(VG.scene, VG.player.position, VG.COLORS.cyan, 18);
  VG.shake(1.4);
  VG.$('finalScore').textContent = G.score;
  VG.$('finalDodged').textContent = G.dodged;
  VG.$('finalTime').textContent = Math.floor(G.t) + '초';
  VG.$('overScreen').classList.remove('hide');
};

VG.missionClear = function () {
  const G = VG.G;
  G.phase = 'clear';
  VG.SND.bgmStop();
  VG.SND.play('clear');
  for (let k = 0; k < 6; k++) {
    setTimeout(function () {
      if (!VG.boss) return;
      VG.burst(VG.scene,
        new THREE.Vector3(VG.boss.position.x + VG.rand(-2, 2), VG.boss.position.y + VG.rand(-1, 1), VG.boss.position.z),
        VG.COLORS.yellow, 14);
      VG.shake(0.7);
      VG.SND.play('boom');
    }, k * 130);
  }
  VG.boss.visible = false;
  VG.clearBullets(VG.scene);
  VG.$('danger').classList.remove('on');
  VG.$('clearScore').textContent = G.score;
  VG.$('clearLvl').textContent = 'LV.' + G.missileLvl;
  VG.$('clearTime').textContent = Math.floor(G.t) + '초';
  VG.$('clearScreen').classList.remove('hide');
};

VG.hit = function () {
  if (VG.G.invuln > 0) return;
  VG.G.invuln = VG.CFG.invuln;
  VG.G.lives -= 1;
  VG.renderHearts();                   // 목숨이 줄어드는 게 화면에 보인다
  VG.shake(1.5);
  VG.flashScreen(260);
  VG.SND.play('hit');
  if (VG.G.lives === 1) {
    VG.SND.play('alert');
    VG.$('danger').classList.add('on');
  }
  if (VG.G.lives <= 0) {
    if (VG.CINE) {                     // 촬영 모드: 게임오버 대신 목숨만 다시 채운다
      VG.G.lives = VG.CFG.lives;
      VG.renderHearts();
      VG.$('danger').classList.remove('on');
      return;
    }
    VG.gameOver();
  }
};

// ── 입력 ────────────────────────────────────────────────────────
VG.onKey = function (e) {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') VG.keys.left = true;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') VG.keys.right = true;
  if (e.code === 'KeyM') {
    const mb = VG.$('muteBtn');
    if (mb) mb.textContent = VG.SND.toggle() ? '🔊' : '🔇';
  }
  if (e.code === 'Space') {
    e.preventDefault();
    VG.SND.init();
    if (VG.G.phase === 'ready' || VG.G.phase === 'over' || VG.G.phase === 'clear') VG.start();
  }
};
VG.onKeyUp = function (e) {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') VG.keys.left = false;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') VG.keys.right = false;
};

// ── 게임 루프 ───────────────────────────────────────────────────
VG.animate = function () {
  requestAnimationFrame(VG.animate);
  if (VG.REC) return;                 // 촬영 모드: 프레임은 밖에서 한 장씩 민다
  const dt = Math.min(VG.clock.getDelta(), 0.05);
  VG.step(dt);
  VG.renderer.render(VG.scene, VG.camera);
};

VG.step = function (dt) {
  const G = VG.G, C = VG.CFG;
  VG.stars.rotation.z += dt * 0.01;
  VG.updateParts(VG.scene, dt);
  VG.updateFlashes(VG.scene, dt);

  if (G.alertT > 0) {
    G.alertT -= dt;
    if (G.alertT <= 0) VG.$('bossAlert').classList.add('hide');
  }

  if (G.phase !== 'survive' && G.phase !== 'boss') {
    VG.applyCamera(dt);
    return;
  }

  G.t += dt;
  G.score = Math.floor(G.t * 10) + G.dodged * 5 + G.picked * 20;
  if (G.invuln > 0) {
    G.invuln -= dt;
    VG.player.visible = Math.floor(G.invuln * 12) % 2 === 0;
    if (G.invuln <= 0) VG.player.visible = true;
  }
  if (VG.CINE) {
    const wantLvl = Math.min(5, 1 + Math.floor(G.t / 7));
    if (wantLvl > G.missileLvl) {
      G.missileLvl = wantLvl; VG.syncGun(VG.player); VG.renderMissile();
    }
  }
  if (VG.DEMO) VG.demo();
  VG.movePlayer(VG.player, dt);

  // ── 1단계: 운석 피하기 ──────────────────────────────────────
  if (G.phase === 'survive') {
    const speed = C.asteroid.speed0 + G.t * C.asteroid.speedUp;
    G.spawnTimer = (G.spawnTimer || 0) - dt;
    const gap = Math.max(C.asteroid.spawnMin, C.asteroid.spawn0 - G.t * 0.012);
    if (G.spawnTimer <= 0) { VG.spawnAsteroid(VG.scene); G.spawnTimer = gap; }

    const r = VG.updateAsteroids(VG.scene, VG.player, dt, speed);
    G.dodged += r.dodged;
    for (let i = 0; i < r.hits; i++) VG.hit();

    G.surviveLeft -= dt;
    if (G.surviveLeft <= 0) VG.startBoss();
  }

  // ── 아이템 (1단계는 3종, 보스전은 목숨만) ───────────────────
  G.itemTimer -= dt;
  if (G.itemTimer <= 0) {
    if (G.phase === 'survive') {
      VG.spawnItem(VG.scene);
      G.itemTimer = C.item.gap + VG.rand(-1.2, 1.6);
    } else {
      VG.spawnItem(VG.scene, 'life');
      G.itemTimer = 11 + VG.rand(-2, 3);
    }
  }
  VG.updateItems(VG.scene, VG.player, dt).forEach(function (type) {
    G.picked += 1;
    VG.SND.play('item');
    if (type === 'power' || type === 'rapid') {
      G.missileLvl = Math.min(C.item.maxLvl, G.missileLvl + 1);
      VG.syncGun(VG.player);
    } else if (type === 'life') {
      G.lives = Math.min(C.lives + 2, G.lives + 1);
      VG.renderHearts();
    }
    VG.renderMissile();
  });

  // ── 2단계: 보스전 ───────────────────────────────────────────
  if (G.phase === 'boss') {
    const gap = VG.updateBoss(dt, G.t);

    // 내 미사일 자동 발사
    G.fireTimer -= dt;
    if (G.fireTimer <= 0) {
      VG.fireMissile(VG.scene, VG.player);
      G.fireTimer = VG.missileInterval();
      VG.SND.play('shoot');
    }

    // 내 미사일 → 보스
    const dmg = VG.updateMissiles(VG.scene, dt, VG.boss);
    if (dmg > 0) VG.damageBoss(dmg);

    // 보스 조준 → 발사
    if (G.chargeTimer > 0) {
      G.chargeTimer -= dt;
      if (G.chargeTimer <= 0) {
        VG.bossFire(VG.scene, VG.boss, VG.player);
        G.bossFireTimer = gap;
        G.chargeTimer = 0;
      }
    } else {
      G.bossFireTimer -= dt;
      if (G.bossFireTimer <= 0) {
        G.chargeTimer = C.boss.shot.telegraph[G.bossPhase - 1];
        VG.SND.play('charge', G.bossPhase);
      }
    }

    // 보스 미사일 → 나
    const rb = VG.updateBullets(VG.scene, dt, VG.player);
    G.dodged += rb.dodged;
    for (let i = 0; i < rb.hits; i++) VG.hit();

    // 보스 몸통에 닿으면 큰 피해
    const bdx = Math.abs(VG.boss.position.x - VG.player.position.x);
    const bdz = Math.abs(VG.boss.position.z - VG.player.position.z);
    if (bdx < C.boss.contact && bdz < 1.6) VG.hit();

    if (G.bossHp <= 0) VG.missionClear();
  }

  VG.applyCamera(dt);
  VG.updateHud();
};

// 카메라: 플레이어를 살짝 따라가고 + 흔들림 + 보스 등장 줌인
//   보스전에서는 카메라를 조금 높여 내려본다 —
//   그래야 보스가 쏘는 탄이 '점'이 아니라 '날아오는 선'으로 보인다(가독성).
VG.applyCamera = function (dt) {
  const baseX = VG.player ? VG.player.position.x * 0.32 : 0;
  VG.camX = (VG.camX || 0) + (baseX - (VG.camX || 0)) * 4 * dt;

  const want = VG.G.phase === 'boss' ? 1 : 0;
  VG.camBlend += (want - VG.camBlend) * Math.min(1, 1.6 * dt);

  if (VG.drama > 0) VG.drama = Math.max(0, VG.drama - dt * 0.55);
  const d = VG.drama, k = VG.camBlend;

  VG.shakeAmt *= Math.pow(0.0016, dt);
  if (VG.shakeAmt < 0.002) VG.shakeAmt = 0;
  const a = VG.shakeAmt;

  VG.camera.position.x = VG.camX + (Math.random() - 0.5) * a;
  VG.camera.position.y = 6.2 + 2.4 * k - d * 0.5 + (Math.random() - 0.5) * a * 0.6;
  VG.camera.position.z = 11.5 - 0.9 * k - d * 2.6;
  VG.camera.lookAt(0, 1.2 + 0.5 * k, -6 + 1.0 * k);
};

VG.onResize = function () {
  VG.camera.aspect = innerWidth / innerHeight;
  VG.camera.updateProjectionMatrix();
  VG.renderer.setSize(innerWidth, innerHeight);
};

// ── 자동 플레이 (?demo=1) — 영상 녹화 · 난이도 측정용 ──
// 사람 대신 '가장 안전한 x 위치'를 매 프레임 고른다.
VG.demo = function () {
  const G = VG.G;
  const p = VG.player;
  const LANE = VG.CFG.lanes * 0.96;
  const px = p.position.x, pz = p.position.z;
  const N = 28;

  let bestX = px, bestScore = -1e9;

  for (let i = 0; i <= N; i++) {
    const x = (i / N * 2 - 1) * LANE;
    let sc = 0;

    // 운석: 앞으로 올수록 강하게 회피
    VG.asteroids.forEach(function (a) {
      const dz = a.position.z - pz;
      if (dz < -3 || dz > 30) return;
      const ttc = Math.max(0.05, dz / 14);            // 대략적인 도달 시간
      const ax = a.position.x + a.userData.vx * ttc;
      const d = Math.abs(ax - x);
      const r = a.userData.size + VG.CFG.asteroid.hitSize * 0.5 + 0.55;
      if (d < r) sc -= (r - d) * (r - d) * 900 / (0.35 + ttc);
      sc -= Math.max(0, 2.2 - d) * 12 / (0.5 + ttc);
    });

    // 보스 미사일: 도달 위치를 계산해 피한다
    VG.bullets.forEach(function (b) {
      const dz = pz - b.position.z;
      if (dz < -2 || dz > 40) return;
      const ttc = Math.max(0.03, dz / b.userData.speed);
      const bx = b.position.x + b.userData.vx * ttc;
      const d = Math.abs(bx - x);
      const r = 1.35;
      if (d < r) sc -= (r - d) * (r - d) * 1400 / (0.20 + ttc);
      sc -= Math.max(0, 2.0 - d) * 18 / (0.3 + ttc);
    });

    // 아이템은 안전할 때만
    if (G.phase === 'survive') {
      VG.items.forEach(function (it) {
        const dz = it.position.z - pz;
        if (dz > 3 && dz < 32) {
          sc += 90 / (1 + Math.abs(it.position.x - x) * 0.6) / (1 + dz * 0.06);
        }
      });
    } else if (VG.boss.visible) {
      // 보스 몸통과 겹치지 않게, 화면 가운데에 머물지 않게
      if (Math.abs(VG.boss.position.x - x) < 3.2) sc -= 220;
      sc -= Math.abs(x) * 1.2;
    }

    sc -= Math.abs(x - px) * 0.30;      // 급격한 이동 억제
    if (sc > bestScore) { bestScore = sc; bestX = x; }
  }

  VG.keys.left = px > bestX + 0.12;
  VG.keys.right = px < bestX - 0.12;
};

// ── 실행 ────────────────────────────────────────────────────────
try {
  if (typeof THREE === 'undefined') throw new Error('lib/three.min.js 를 찾지 못했습니다');
  VG.init();

  const q = new URLSearchParams(location.search);
  VG.REC = q.has('rec');
  if (VG.REC) {
    window.VG_FRAME = function (dt) {
      VG.step(dt);
      VG.renderer.render(VG.scene, VG.camera);
    };
  }
  VG.DEMO = q.has('demo') || q.has('cine');
  VG.CINE = q.has('cine');
  if (VG.CINE) {
    VG.CFG.boss.hpBase = 5400;         // 촬영용: 3페이즈가 다 보이게 조금 길게
    VG.CFG.boss.hpPerLevel = 0;
  }
  if (VG.DEMO) {
    VG.start();
    VG.boss.visible = false;
    VG.$('hud').style.opacity = '1';
  }
  if (q.has('sim')) {                 // 개발용: 자동 플레이 결과를 title 에 남긴다
    VG.DEMO = true;
    const trials = Math.max(1, Math.min(12, parseInt(q.get('sim'), 10) || 1));
    const log = [];
    for (let n = 0; n < trials; n++) {
      VG.start();
      VG.boss.visible = false;
      let end = 'timeout', bt = 0;
      for (let i = 0; i < 60 * 130; i++) {
        const wasSurvive = VG.G.phase === 'survive';
        VG.step(1 / 60);
        if (wasSurvive && VG.G.phase === 'boss') bt = i / 60;
        if (VG.G.phase === 'clear' || VG.G.phase === 'over') {
          end = VG.G.phase; break;
        }
      }
      log.push('#' + n + ' ' + end + ' @' + Math.round(VG.G.t) + 's boss=' +
               Math.round(bt) + 's lv=' + VG.G.missileLvl + ' life=' + VG.G.lives);
    }
    document.title = 'SIM ' + log.join(' | ');
  }
  if (q.has('boss')) {            // 캡처용: 보스전부터 시작
    VG.start();
    VG.G.surviveLeft = 0.1;
    VG.G.missileLvl = 3;
    VG.syncGun(VG.player); VG.renderMissile();
    if (q.has('phase')) {
      const want = parseInt(q.get('phase'), 10) || 2;
      setTimeout(function () {
        const cut = VG.G.bossMax * (1 - VG.CFG.boss.phaseAt[want - 2]) + 40;
        VG.damageBoss(cut);
      }, 2200);
    }
  }
} catch (e) {
  const el = VG.$('err');
  el.style.display = 'flex';
  el.innerHTML = '게임을 시작할 수 없습니다.<br>폴더 구조를 확인해 주세요.<br><br><b>'
    + e.message + '</b>';
  console.error(e);
}

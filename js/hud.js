/* ══════════════════════════════════════════════════════════════
   js/hud.js — 점수 · 목숨 · 미사일 레벨 · 보스 HP
   ══════════════════════════════════════════════════════════════ */
VG.renderHearts = function () {
  const box = VG.$('lives');
  box.innerHTML = '';
  for (let i = 0; i < VG.CFG.lives; i++) {
    const d = document.createElement('div');
    d.className = 'heart' + (i < VG.G.lives ? '' : ' off');
    box.appendChild(d);
  }
};

VG.renderMissile = function () {
  const box = VG.$('mlvl');
  box.innerHTML = '';
  for (let i = 0; i < VG.CFG.item.maxLvl; i++) {
    const d = document.createElement('i');
    d.className = i < VG.G.missileLvl ? 'on' : '';
    box.appendChild(d);
  }
  VG.$('mlvlNum').textContent = 'LV.' + VG.G.missileLvl;
};

VG.updateHud = function () {
  const G = VG.G;
  VG.$('scoreVal').textContent = G.score;

  // 방어막 게이지
  const sh = VG.$('shBar'), shTxt = VG.$('shTxt'), shHud = VG.$('shieldHud');
  if (sh && shTxt) {
    const total = VG.CFG.shield.dur + VG.CFG.shield.cd;
    const ready = VG.shieldCd <= 0;
    const pct = VG.shieldActive > 0 ? 100
              : ready ? 100
              : Math.max(0, 100 - (VG.shieldCd / total) * 100);
    sh.firstChild.style.width = pct.toFixed(0) + '%';
    shTxt.textContent = VG.shieldActive > 0 ? 'ON' : (ready ? 'READY' : 'WAIT');
    if (shHud) shHud.classList.toggle('cool', !ready);
  }

  if (G.phase === 'survive') {
    VG.$('timerLabel').textContent = 'BOSS IN';
    VG.$('timerVal').textContent = Math.max(0, Math.ceil(G.surviveLeft));
    VG.$('timefill').style.width =
      (100 - G.surviveLeft / VG.CFG.surviveTime * 100).toFixed(1) + '%';
    VG.$('phaseTag').textContent = 'STAGE 1 · SURVIVE';
  } else if (G.phase === 'boss') {
    VG.$('timerLabel').textContent = 'PHASE';
    VG.$('timerVal').textContent = G.bossPhase + '/3';
    VG.$('timefill').style.width =
      (G.bossHp / G.bossMax * 100).toFixed(1) + '%';
    VG.$('phaseTag').textContent = 'STAGE 2 · BOSS';
  }

  const bar = VG.$('bossbar');
  if (G.phase === 'boss') {
    bar.classList.remove('hide');
    VG.$('bossfill').style.width = (G.bossHp / G.bossMax * 100).toFixed(1) + '%';
    VG.$('bosshp').textContent = Math.max(0, Math.ceil(G.bossHp));
    VG.$('bosspips').innerHTML =
      [1, 2, 3].map(function (p) {
        return '<b class="' + (p <= G.bossPhase ? 'on' : '') + '">' + p + '</b>';
      }).join('');
  } else {
    bar.classList.add('hide');
  }
};

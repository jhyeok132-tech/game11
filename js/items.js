/* ══════════════════════════════════════════════════════════════
   js/items.js — 아이템 (미사일 강화 · 목숨 · 연사)
   ══════════════════════════════════════════════════════════════ */
VG.items = [];

VG.ITEM_TYPES = {
  power: { color: VG.COLORS.yellow, label: 'POWER' },
  life:  { color: VG.COLORS.green,  label: 'LIFE'  },
  rapid: { color: VG.COLORS.cyan,   label: 'RAPID' },
};

VG.spawnItem = function (scene, forceType) {
  const r = Math.random();
  const type = forceType || (r < 0.6 ? 'power' : (r < 0.8 ? 'rapid' : 'life'));
  const t = VG.ITEM_TYPES[type];

  const m = new THREE.Mesh(
    new THREE.OctahedronGeometry(VG.CFG.item.size, 0),
    new THREE.MeshLambertMaterial({ color: t.color })
  );
  m.position.set(VG.rand(-VG.CFG.lanes, VG.CFG.lanes), VG.rand(0.8, 2.0),
                 VG.rand(-52, -44));
  m.userData = { type: type, spin: 2.2 };
  scene.add(m);
  VG.items.push(m);
};

VG.clearItems = function (scene) {
  VG.items.forEach(function (i) { scene.remove(i); });
  VG.items = [];
};

/* 아이템을 앞으로 보내고, 먹었는지 확인한다. 먹은 타입 배열을 돌려준다. */
VG.updateItems = function (scene, player, dt) {
  const got = [];
  for (let i = VG.items.length - 1; i >= 0; i--) {
    const it = VG.items[i];
    it.position.z += VG.CFG.item.speed * dt;
    it.rotation.y += it.userData.spin * dt;
    it.rotation.x += it.userData.spin * 0.5 * dt;

    const dx = Math.abs(it.position.x - player.position.x);
    const dz = Math.abs(it.position.z - player.position.z);
    if (dx < 1.0 && dz < 1.1) {           // 먹었다
      got.push(it.userData.type);
      scene.remove(it);
      VG.items.splice(i, 1);
      continue;
    }
    if (it.position.z > 10) {             // 놓쳤다
      scene.remove(it);
      VG.items.splice(i, 1);
    }
  }
  return got;
};

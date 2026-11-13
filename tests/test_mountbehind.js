// Mounting a kept line whose end is right next to him (Larry
// 2026-11-09 log): he exits onto a platform running right, and a
// kept line (a bridge drawn back from the platform's edge node)
// extends left from the platform's edge, its near end 4px from
// him. He must run TOWARD the line — mount it at the near end
// and turn left along it — not run past it off the right edge.
// The bug: segFoot picked the foot by his running direction
// (left end for dir>0), so the front-line rule saw him on the
// far side and blocked the mount.
const { loadGame } = require('./harness');
const { T, S, assert, tick, setWorld } = loadGame();

// M1: a horizontal bridge back from the platform edge — he mounts
// it at the near end and turns left, instead of running off
{
  const plat = { x1: 1026, x2: 1307, y: 334, row: 1 };
  setWorld([plat], 1030, 334, 1); // on the platform, running right
  // the kept bridge: from the platform's left edge (1026,340) left to 777
  S.keptSeg = { ax: 1026, ay: 340, bx: 777, by: 340, len: 249, node: false };
  S.rampSlot = 1;
  let mounted = false;
  for (let i = 0; i < 200 && S.mode === 'run' && S.x <= 1307; i++){
    tick();
    if (S.surface && S.surface.type === 'finger'){ mounted = true; break; }
  }
  assert(mounted, 'M1: must mount the kept bridge at its near end, got mode=' + S.mode + ' x=' + Math.round(S.x) + ' surface=' + (S.surface && S.surface.type));
  assert(S.dir === -1, 'M1: must turn left along the bridge, got dir=' + S.dir);
  assert(S.climbSeg && S.climbSeg.ax === 1026, 'M1: must be climbing the bridge, got ' + JSON.stringify(S.climbSeg));
  console.log('[M1] mounts a bridge behind him and turns toward it: OK');
}
// M2: the same bridge, but he is running LEFT toward it from the
// right — he mounts it at the near end and keeps running left
{
  const plat = { x1: 1026, x2: 1307, y: 334, row: 1 };
  setWorld([plat], 1100, 334, -1); // running left toward the bridge end
  S.keptSeg = { ax: 1026, ay: 340, bx: 777, by: 340, len: 249, node: false };
  S.rampSlot = 1;
  let mounted = false;
  for (let i = 0; i < 200 && S.mode === 'run'; i++){
    tick();
    if (S.surface && S.surface.type === 'finger'){ mounted = true; break; }
  }
  assert(mounted, 'M2: must mount the bridge running left, got mode=' + S.mode + ' x=' + Math.round(S.x));
  assert(S.dir === -1, 'M2: must keep running left along the bridge, got dir=' + S.dir);
  console.log('[M2] mounts a bridge running toward it: OK');
}
// M3: a line in FRONT of him (ahead, in his running direction)
// must still NOT turn him — the front-line rule still protects
// a line drawn ahead that he has not reached the foot of
{
  const plat = { x1: 100, x2: 1307, y: 700, row: 1 };
  setWorld([plat], 200, 700, 1); // running right on a long platform
  // a ramp ahead of him, foot at 500 (far ahead), far end at 700 up
  S.keptSeg = { ax: 500, ay: 700, bx: 700, by: 550, len: 250, node: false };
  S.rampSlot = 1;
  // run 60 ticks: he is still far from the foot, must not mount
  for (let i = 0; i < 60; i++) tick();
  assert(S.mode === 'run' && S.surface && S.surface.type !== 'finger', 'M3: must not mount a line far ahead, got surface=' + (S.surface && S.surface.type) + ' x=' + Math.round(S.x));
  assert(S.dir === 1, 'M3: must keep running right, got dir=' + S.dir);
  console.log('[M3] a line far ahead does not turn him: OK');
}
console.log('ALL MOUNT-BEHIND TESTS PASSED');

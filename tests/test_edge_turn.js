// Helping hand REVERTED (Jack 2026-11-05): on a platform the
// mouse CAN run off it again — past an edge he falls, the way he
// did before the helping hand. He only stays on a platform while
// he is on it; the ground still turns him at the screen edges.
const { loadGame } = require('./harness');
const { sandbox, T, S, assert, tick, press, move, release, setWorld, settle } = loadGame();

// E1: no line drawn — he runs off the platform's edge and falls
// to the ground (and the log records the run-off)
{
  const plat = { x1: 100, x2: 300, y: 700 };
  setWorld([plat], 150);
  let fell = false;
  for (let i = 0; i < 600; i++) {
    tick();
    if (S.mode === 'fall' || S.mode === 'lost') fell = true;
  }
  assert(fell, 'E1: mouse must run off his platform and fall');
  assert(T.log.join('\n').includes('ran-off-ledge'), 'E1: log must record reason=ran-off-ledge');
  assert(S.mode === 'run' && S.surface.type === 'ground', 'E1: mouse must end on the ground, got surf=' + (S.surface && S.surface.type));
  console.log('[E1] no line: runs off the platform and falls to the ground: OK');
}
// E2: a ramp whose foot is AT the platform's left edge still
// mounts (he can stand on the foot itself) and climbs up
{
  const origin = { x1: 100, x2: 390, y: 700 };
  const upper = { x1: 250, x2: 390, y: 550 };
  setWorld([origin, upper], 150);
  press(100, 700); move(250, 550);
  const landed = settle(400);
  assert(landed === upper, 'E2: edge-foot ramp must mount and land on the upper platform, got ' + (landed && landed.row));
  console.log('[E2] ramp from the platform edge mounts and climbs: OK');
}
// E3: a ramp he cannot mount at all (too steep to climb) whose
// foot is at the edge: he runs toward it, can't mount, runs
// past the edge and falls to the ground. (A climbable edge-foot
// ramp mounts — see E2 — so the unmountable case needs a
// too-steep line.)
{
  const origin = { x1: 100, x2: 390, y: 700 };
  setWorld([origin], 200);
  press(390, 700); move(390, 550); // foot at the right edge, vertical (unclimbable — Jack 2026-11-05: only near-vertical is unclimbable now)
  let fell = false, maxX = -999;
  for (let i = 0; i < 400; i++) {
    tick();
    maxX = Math.max(maxX, S.x);
    if (S.mode === 'fall' || S.mode === 'lost') fell = true;
  }
  assert(fell, 'E3: mouse must run off the edge and fall');
  assert(T.log.join('\n').includes('ran-off-ledge'), 'E3: log must record reason=ran-off-ledge');
  assert(maxX >= 385, 'E3: mouse must reach the edge the ramp starts from, got maxX=' + maxX);
  assert(S.mode === 'run' && S.surface.type === 'ground', 'E3: mouse must end on the ground, got surf=' + (S.surface && S.surface.type));
  console.log('[E3] unmountable edge ramp: runs off the edge and falls to the ground: OK');
}
console.log('ALL EDGE-TURN TESTS PASSED');

// Line rules: commitment, crossing drop, uncapped length, no landing
// on a spent line.
const { loadGame } = require('./harness');
const { sandbox, S, assert, tick, press, move, setWorld } = loadGame();
const lower = { x1: 0, x2: 390, y: 700 };
const upper = { x1: 0, x2: 390, y: 550 };
// C: drawn lines uncapped past 380px
{
  setWorld([lower, upper], 100);
  press(150, 700); move(700, 550);
  const seg = sandbox.fingerSegment();
  assert(seg && seg.len > 380, 'C: drawn lines must be uncapped past 380px (got ' + (seg && seg.len) + ')');
  console.log('[C] drawn lines uncapped past 380px: OK');
}
// A: mount/step-off then finger-slide leaves him on the upper ledge
{
  setWorld([lower, upper], 100);
  press(150, 700); move(300, 550);
  let landed = false;
  for (let i = 0; i < 400; i++) {
    tick();
    if (S.mode === 'run' && S.surface === upper) { landed = true; break; }
  }
  assert(landed, 'A: must reach the upper platform first');
  move(340, 500); // slide the finger after step-off
  for (let i = 0; i < 20; i++) tick();
  assert(S.mode === 'run' && S.surface === upper && S.y === 550, 'A: slide after step-off must leave him on the upper ledge');
  console.log('[A] commitment — no re-mount, no running back down: OK');
}
// D: no landing on a spent line (falls straight through it)
{
  setWorld([lower, upper], 100);
  press(150, 700); move(300, 550);
  let mounted = false;
  for (let i = 0; i < 300; i++) {
    tick();
    if (S.surface && S.surface.type === 'finger') { mounted = true; break; }
  }
  assert(mounted, 'D: must mount first');
  for (let i = 0; i < 30; i++) tick(); // climb partway up first
  assert(S.surface && S.surface.type === 'finger' && S.y < 700, 'D: must be mid-climb before steepening');
  move(150, 480); // steepen to vertical -> falls from height, line spent (Larry 2026-11-05: only near-vertical is unclimbable now)
  tick();
  assert(S.mode === 'fall' && S.spentFinger, 'D: steepening must drop him mid-climb and spend the line');
  move(300, 550); // restore the line under his fall (his fall path
  // crosses it, so landing on the ledge proves he fell through it —
  // note his surface stays 'finger' throughout the fall itself,
  // since that is what he fell from, so only the landing counts)
  let landed = false;
  for (let i = 0; i < 300; i++) {
    tick();
    if (S.mode === 'run' && S.surface === lower) { landed = true; break; }
  }
  assert(landed && S.y === 700, 'D: falling mouse must fall through the spent line to the ledge');
  for (let i = 0; i < 60; i++) tick();
  assert(S.mode === 'run' && S.surface === lower, 'D: restored spent line must never re-mount after landing');
  console.log('[D] no landing on a spent line: OK');
}
// B: crossing -> vertical fall to the next platform below
{
  const lowerB = { x1: 0, x2: 390, y: 700 };
  const middleB = { x1: 100, x2: 280, y: 600 };
  const upperB = { x1: 0, x2: 390, y: 450 };
  setWorld([lowerB, middleB, upperB], 100);
  press(150, 700); move(350, 500); // crosses y=600 at x=250, inside middleB
  let triggered = false, fellX = null, mounted = false;
  for (let i = 0; i < 400; i++) {
    tick();
    if (S.surface && S.surface.type === 'finger') mounted = true;
    if (mounted && S.mode === 'fall' && S.verticalFall && fellX === null) { triggered = true; fellX = S.x; }
    if (triggered && S.mode === 'run' && S.surface === lowerB) break;
  }
  assert(triggered, 'B: crossing must trigger a vertical fall');
  assert(fellX === 250, 'B: vertical fall must start at the crossing x=250 (got ' + fellX + ')');
  console.log('[B] crossing -> vertical fall to the next platform below: OK');
}
console.log('ALL LINE-RULE TESTS PASSED');

// Kept lines + edge snap: lines stay after lifting until used up or
// replaced; a far end within 48px of a platform's edge climbs onto it.
const { loadGame } = require('./harness');
const { S, assert, tick, press, move, release, setWorld, settle } = loadGame();
const lowerS = { x1: 0, x2: 390, y: 700 };
const upperK = { x1: 0, x2: 390, y: 550 };
const upperFar = { x1: 320, x2: 390, y: 550 };
// S1: far end 20px short of the edge snaps on
{
  setWorld([lowerS, upperFar], 100);
  press(150, 700); move(300, 550);
  const landed = settle();
  assert(landed === upperFar && S.y === 550, 'S1: 20px-short line must snap onto the platform');
  console.log('[S1] edge snap (20px short) climbs on: OK');
}
// S2: beyond every snap range falls back (80px short: past A's
// 48px edge snap AND B's 64px auto-snap radius)
{
  setWorld([lowerS, upperFar], 100);
  press(150, 700); move(240, 550);
  const landed = settle();
  assert(landed === lowerS && S.y === 700, 'S2: 80px-short line must fall back, no snap');
  console.log('[S2] beyond snap range falls back, no snap: OK');
}
// K: line stays after lift, climb completes
{
  setWorld([lowerS, upperK], 100);
  press(150, 700); move(300, 550);
  let onRamp = false;
  for (let i = 0; i < 300; i++) {
    tick();
    if (S.surface && S.surface.type === 'finger') { onRamp = true; break; }
  }
  assert(onRamp, 'K: must mount first');
  release();
  assert(S.keptSeg, 'K: line must stay after lift');
  const landed = settle();
  assert(landed === upperK && S.y === 550, 'K: kept line climb must complete');
  console.log('[K] line stays after lift, climb completes: OK');
}
// K2: kept line mountable after lift
{
  setWorld([lowerS, upperK], 100);
  press(150, 700); move(300, 550); release();
  assert(S.keptSeg, 'K2: kept line must exist after lift');
  const landed = settle();
  assert(landed === upperK && S.y === 550, 'K2: kept line must be mountable after lift');
  console.log('[K2] kept line mountable after lift: OK');
}
// T: direction locked mid-ramp through a morph
{
  setWorld([lowerS, upperK], 100);
  press(150, 700); move(300, 550);
  let onRamp = false, finished = false;
  const dirs = new Set();
  for (let i = 0; i < 300; i++) {
    tick();
    if (S.surface && S.surface.type === 'finger') {
      onRamp = true; dirs.add(S.rampDir);
      if (i === 10) move(280, 550); // morph the line mid-climb
    }
    if (S.mode === 'run' && S.surface === upperK) { finished = true; break; }
  }
  assert(onRamp && finished, 'T: must mount and finish on the upper platform');
  assert(dirs.size === 1 && dirs.has(1), 'T: direction must stay locked through the morph');
  console.log('[T] direction locked mid-ramp through a morph: OK');
}
console.log('ALL STAY/SNAP TESTS PASSED');

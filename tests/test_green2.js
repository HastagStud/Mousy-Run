// Green reachability: mountable (within his ledge's reachable
// interval, steering counts for live lines, current direction only
// for kept/unsteered) and touching his platform.
const { loadGame } = require('./harness');
const { sandbox, S, assert, tick, press, move, release, setWorld } = loadGame();
const lower = { x1: 0, x2: 390, y: 700 };
function drawLine(plats, startX, a, b, startY, dir) {
  setWorld(plats, startX, startY, dir);
  press(a[0], a[1]); move(b[0], b[1]);
  return sandbox.lineWillLand(sandbox.fingerSegment());
}
// R1: floating line above mount reach -> amber
assert(drawLine([lower], 100, [150, 620], [300, 600]) === false, 'R1');
console.log('[R1] floating line above mount reach is not green: OK');
// R2: kept line behind him -> amber
{
  setWorld([lower], 300, undefined, 1); press(100, 700); move(200, 550); release();
  assert(sandbox.lineWillLand(S.keptSeg) === false, 'R2');
  console.log('[R2] kept line behind him is not green: OK');
}
// R3: line past his ledge edge -> amber
{
  const short = { x1: 0, x2: 150, y: 700 };
  const upR = { x1: 250, x2: 390, y: 600 };
  assert(drawLine([short, upR], 50, [200, 700], [300, 550]) === false, 'R3');
  console.log('[R3] line past his ledge edge is not green: OK');
}
// R4: reachable line stays green
{
  const upper = { x1: 0, x2: 390, y: 550 };
  assert(drawLine([lower, upper], 100, [150, 700], [300, 550]) === true, 'R4');
  console.log('[R4] reachable line stays green: OK');
}
// R5: line while falling -> amber
{
  setWorld([lower], 100); press(150, 700); move(300, 550);
  S.mode = 'fall';
  assert(sandbox.lineWillLand(sandbox.fingerSegment()) === false, 'R5');
  console.log('[R5] line while falling is not green: OK');
}
// R6: on-ramp prediction stays green
{
  const upper = { x1: 0, x2: 390, y: 550 };
  setWorld([lower, upper], 100); press(150, 700); move(300, 550);
  let onRamp = false;
  for (let i = 0; i < 300; i++) {
    tick();
    if (S.surface && S.surface.type === 'finger') { onRamp = true; break; }
  }
  assert(onRamp, 'R6: must mount first');
  assert(sandbox.lineWillLand(sandbox.fingerSegment()) === true, 'R6');
  console.log('[R6] on-ramp prediction stays green: OK');
}
// R7: mid-segment mount within reach -> green
{
  const upMid = { x1: 250, x2: 390, y: 650 };
  assert(drawLine([lower, upMid], 100, [100, 780], [300, 650]) === true, 'R7');
  console.log('[R7] mid-segment mount within reach is green: OK');
}
// R8: line below mount reach -> amber
{
  const upLow = { x1: 250, x2: 390, y: 770 };
  assert(drawLine([lower, upLow], 100, [100, 780], [300, 770]) === false, 'R8');
  console.log('[R8] line below mount reach is not green: OK');
}
console.log('ALL REACHABILITY TESTS PASSED');

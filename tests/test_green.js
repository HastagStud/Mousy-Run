// Green prediction (Larry 2026-10-27: landing lines are green): the
// line touches the platform he's on, is mountable, and its far end
// LANDS him — exact touch, edge snap, step-up, or drop (the exit's
// own landing check, shared). Crossing lines and unconnected starts
// are still amber.
const { loadGame } = require('./harness');
const { sandbox, S, assert, tick, press, move, release, setWorld, settle } = loadGame();
const lower = { x1: 0, x2: 390, y: 700 };
const upper = { x1: 0, x2: 390, y: 550 };
function drawLine(plats, startX, a, b, startY, dir) {
  setWorld(plats, startX, startY, dir);
  press(a[0], a[1]); move(b[0], b[1]);
  return sandbox.lineWillLand(sandbox.fingerSegment());
}
assert(drawLine([lower, upper], 100, [150, 700], [300, 550]) === true, 'G1');
console.log('[G1] step-on line is green: OK');
// G1b: green holds while on the ramp
{
  setWorld([lower, upper], 100); press(150, 700); move(300, 550);
  let onRamp = false;
  for (let i = 0; i < 300; i++) {
    tick();
    if (S.surface && S.surface.type === 'finger') { onRamp = true; break; }
  }
  assert(onRamp, 'G1b: must mount first');
  assert(sandbox.lineWillLand(sandbox.fingerSegment()) === true, 'G1b');
  console.log('[G1b] green holds while on the ramp: OK');
}
// G2: drop gap -> GREEN (the far end drops onto the platform below)
{
  const narrow = { x1: 180, x2: 230, y: 640 };
  assert(drawLine([lower, narrow], 50, [100, 700], [200, 560]) === true, 'G2: drop landing must be green');
  console.log('[G2] drop-gap line is green: OK');
}
// G3: below-face over open air -> amber
{
  const over = { x1: 150, x2: 300, y: 550 };
  const short = { x1: 0, x2: 120, y: 700 };
  assert(drawLine([short, over], 50, [100, 700], [200, 580]) === false, 'G3');
  console.log('[G3] below-face line over open air is not green: OK');
}
// G9: face-ending -> green
{
  const over = { x1: 150, x2: 300, y: 550 };
  assert(drawLine([lower, over], 50, [100, 700], [200, 560]) === true, 'G9');
  console.log('[G9] face-ending line is green: OK');
}
// G4: open air -> amber
{
  const short = { x1: 0, x2: 120, y: 700 };
  assert(drawLine([short], 50, [100, 700], [200, 560]) === false, 'G4');
  console.log('[G4] open-air line is not green: OK');
}
// G5: unclimbable -> amber (vertical: Larry 2026-11-05 —
// only a line within 1.5deg of vertical is rejected now)
assert(drawLine([lower, upper], 50, [100, 700], [100, 550]) === false, 'G5');
console.log('[G5] unclimbable line is not green: OK');
// G6: crossing drop -> amber (line never reaches its far end)
{
  const mid = { x1: 150, x2: 300, y: 600 };
  assert(drawLine([lower, mid], 50, [100, 700], [300, 500]) === false, 'G6: crossing drop must not be green');
  console.log('[G6] crossing line is amber: OK');
}
// G7: crossing with nothing below -> amber
{
  const mid = { x1: 150, x2: 300, y: 600 };
  const short = { x1: 0, x2: 120, y: 700 };
  assert(drawLine([short, mid], 50, [100, 700], [300, 500]) === false, 'G7');
  console.log('[G7] crossing line with nothing below is not green: OK');
}
// N1: snap gap (20px short of the edge) -> GREEN (snaps onto the edge)
{
  const upperFar = { x1: 360, x2: 390, y: 550 };
  assert(drawLine([lower, upperFar], 100, [150, 700], [340, 550]) === true, 'N1: snap landing must be green');
  console.log('[N1] snap-gap line is green: OK');
}
// N2: far end exactly at the platform's edge -> green
{
  const upperFar = { x1: 360, x2: 390, y: 550 };
  assert(drawLine([lower, upperFar], 100, [150, 700], [360, 550]) === true, 'N2: edge-touching line must be green');
  console.log('[N2] edge-touching line is green: OK');
}
// N3: far end within the span but 30px above the top -> GREEN
// (steps up onto it: the 40px step-up window)
{
  const over = { x1: 150, x2: 300, y: 550 };
  assert(drawLine([lower, over], 30, [50, 700], [160, 520]) === true, 'N3: step-up landing must be green');
  console.log('[N3] step-up line is green: OK');
}
// N5: far end exactly at the face bottom edge (564) -> green
{
  const over = { x1: 150, x2: 300, y: 550 };
  assert(drawLine([lower, over], 50, [100, 700], [200, 564]) === true, 'N5: face-bottom-edge line must be green');
  console.log('[N5] face-bottom-edge line is green: OK');
}
// D1: drop back onto his own platform -> amber (it lands, but
// nowhere new — Larry 2026-10-27: a steep line that drops him
// where he started must not show green), yet he still lands
// back safely (the exit's drop-back is untouched). Geometry
// chosen so B cannot snap it (far end 69px from the upper edge,
// past snapR) — Larry's original log line now snaps under B
// and is covered by S8 in test_snap.js instead.
{
  const origin = { x1: 846.92, x2: 1366, y: 719 };
  const upper = { x1: 969.86, x2: 1366, y: 544 };
  assert(drawLine([origin, upper], 872, [872, 723], [1010, 600]) === false, 'D1: drop-back line must not be green');
  const landed = settle();
  assert(landed === origin, 'D1: drop-back line must still land him back safely');
  console.log('[D1] drop-back line is amber but lands him back safely: OK');
}
// C1 (updated Larry 2026-10-29): a same-row drop is now AMBER —
// it lands somewhere new but not onward, and with scroll the row
// slides down during the climb (his log: dropped to the same
// row's other segment, which had scrolled to the screen bottom,
// and died). The exit itself still lands him safely on the new
// segment; only the color changes. This supersedes the 2026-10-28
// "same-row drop IS green" ruling, which held for a static world
// with no scroll.
{
  const origin = { x1: 300, x2: 430, y: 700 };
  const left = { x1: 0, x2: 200, y: 700 };
  assert(drawLine([origin, left], 320, [320, 700], [150, 550]) === false, 'C1: same-row drop must be amber');
  const landed = settle();
  assert(landed === left, 'C1: same-row drop must still land him safely');
  console.log('[C1] same-row drop is amber but lands safely: OK');
}
// G8: kept line (finger lifted) still predicts green
{
  setWorld([lower, upper], 100); press(150, 700); move(300, 550); release();
  assert(S.keptSeg, 'G8: kept line must exist after lift');
  assert(sandbox.lineWillLand(S.keptSeg) === true, 'G8');
  console.log('[G8] kept line still predicts green: OK');
}
console.log('ALL GREEN TESTS PASSED');

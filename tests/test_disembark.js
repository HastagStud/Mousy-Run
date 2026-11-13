// Disembark lifecycle: a spent press is fully inert — no line drawn,
// no blocker — even with the finger still held. A new line needs
// lift + a new press.
const { loadGame } = require('./harness');
const { sandbox, S, assert, tick, press, move, release, setWorld } = loadGame();
const lower = { x1: 0, x2: 390, y: 700, row: 1 };
// Upper platform ends at 350, not the screen edge, so the mouse
// CAN run off it (a full-width platform is stopped by the screen
// edge, like the ground) — D2 needs a real edge to fall from.
const upper = { x1: 0, x2: 350, y: 550, row: 2 };
setWorld([lower, upper], 100);
press(150, 700); move(300, 550);
let landed = false;
for (let i = 0; i < 400; i++) {
  tick();
  if (S.mode === 'run' && S.surface === upper) { landed = true; break; }
}
assert(landed, 'D1: must reach the upper platform first');
assert(sandbox.fingerSegment() === null, 'D1: disembark with finger held -> line gone');
assert(S.keptSeg === null, 'D1: disembark with finger held -> no kept line');
assert(sandbox.fingerBlocker() === null, 'D1: disembark with finger held -> no blocker');
console.log('[D1] disembark with finger held: line gone, press inert: OK');
// D2: held press after disembark stays inert. He runs off the
// upper platform for it (Jack 2026-11-05, helping hand
// reverted): with no line to climb he runs to the edge and falls
// — the press being inert is the point, not staying put.
for (let i = 0; i < 60; i++) tick();
assert(sandbox.fingerSegment() === null && sandbox.fingerBlocker() === null, 'D2: held press must stay inert');
assert(S.surface !== upper, 'D2: mouse must have run off the upper platform');
console.log('[D2] held press after disembark stays inert, mouse runs off: OK');
// D3: new press after lift draws again
release(); press(200, 550); move(300, 450);
assert(!S.spentFinger, 'D3: new press must clear spent');
assert(sandbox.fingerSegment() !== null, 'D3: new press after lift draws again');
console.log('[D3] new press after lift draws again: OK');
console.log('ALL DISEMBARK TESTS PASSED');

// Commitment: ANY departure from a ramp spends it — a line flicker
// or steepening that drops him can never let him climb back on, even
// if the line is restored while he is still on the ledge.
const { loadGame } = require('./harness');
const { S, assert, tick, press, move, setWorld } = loadGame();
const lower = { x1: 0, x2: 390, y: 700 };
const upper = { x1: 0, x2: 390, y: 550 };
setWorld([lower, upper], 100);
press(150, 700); move(300, 550);
let mounted = false;
for (let i = 0; i < 300; i++) {
  tick();
  if (S.surface && S.surface.type === 'finger') { mounted = true; break; }
}
assert(mounted, 'flicker: must mount first');
console.log('mounted, at x=' + S.x.toFixed(1) + ' y=' + S.y.toFixed(1));
// steepen the line past climbable (vertical: Jack 2026-11-05 —
// only a line within 1.5deg of vertical is unclimbable now) ->
// he departs (spent) and drops back onto the ledge (he was at
// the ramp's foot, so the fall lands within a single tick —
// check the spent flag, not the transient mode)
move(150, 480);
tick();
assert(S.spentFinger && S.surface === lower && S.mode === 'run', 'flicker: steepening must drop him and spend the line');
console.log('fell off, line spent: OK');
// restore the line while he is falling/landed -> never re-mounts.
// He runs off the ledge for it (Jack 2026-11-05, helping hand
// reverted): with no line to climb he runs to the edge and falls
// to the ground — the spent flag is what keeps him off the line,
// not the ledge.
move(300, 550);
let remounted = false;
for (let i = 0; i < 300; i++) {
  tick();
  if (S.surface && S.surface.type === 'finger') remounted = true;
}
assert(!remounted, 'flicker: restored line must never re-mount');
assert(S.mode === 'run' && S.surface.type === 'ground', 'flicker: mouse must run off the ledge and end on the ground, got surf=' + (S.surface && S.surface.type));
console.log('line returns, no re-mount, runs off the ledge to the ground: OK');
console.log('FLICKER TEST PASSED');

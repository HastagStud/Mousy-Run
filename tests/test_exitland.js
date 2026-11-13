// Guaranteed landing (Jack 2026-10-30): green must mean the
// EXIT puts him ON the platform, not beside it. The engine steps
// him 4px past the far end in his running direction (clamped to
// 6px outside the platform), so a far end a hair inside an edge,
// run toward that edge, exits him off the ledge — held up only
// by the 10px grace — and he falls at once. His log's
// (172,331)-(112,183) line exited at 108 beside a ledge starting
// at 111.8, yet showed green. A drop always lands him clamped
// inside its platform, so drops need no extra check.
const { loadGame } = require('./harness');
const { sandbox, T, S, assert, press, move, release, setWorld } = loadGame();
const lastRelease = () => T.log.filter(l => l.includes('RELEASE')).pop();

// X1: live line whose far end sits 2px inside the target's left
// edge, run toward that edge — the exit lands beside the ledge,
// so it must be amber even though the far end is over the ledge.
{
  const origin = { x1: 0, x2: 200, y: 700, row: 1 };
  const target = { x1: 48, x2: 200, y: 600, row: 2 };
  setWorld([origin, target], 150, 700, -1);
  const seg = { ax: 100, ay: 700, bx: 50, by: 600, len: Math.hypot(50, 100) };
  assert(!T.lineWillLand(seg), 'X1: exit beside the ledge must be amber (live)');
  console.log('[X1] live line exiting beside the ledge is amber: OK');
}
// X2: the same geometry with the far end far enough inside that
// the exit lands on the ledge — stays green.
{
  const origin = { x1: 0, x2: 200, y: 700, row: 1 };
  const target = { x1: 48, x2: 200, y: 600, row: 2 };
  setWorld([origin, target], 150, 700, -1);
  const seg = { ax: 100, ay: 700, bx: 60, by: 600, len: Math.hypot(40, 100) };
  assert(T.lineWillLand(seg), 'X2: exit on the ledge must stay green (live)');
  console.log('[X2] live line exiting onto the ledge stays green: OK');
}
// X3: kept line, off-exit geometry in BOTH directions — amber.
// (Kept-green tries every anchor, so a segment that is a valid
// climb in reverse would stay green. Here the origin end sits
// 2px inside the origin's right edge and runs toward it, so the
// reverse climb also exits beside its ledge: 198+4=202 > 200.)
{
  const origin = { x1: 0, x2: 200, y: 700, row: 1 };
  const target = { x1: 48, x2: 200, y: 600, row: 2 };
  setWorld([origin, target], 150, 700, -1);
  const seg = { ax: 198, ay: 700, bx: 50, by: 600, len: Math.hypot(148, 100) };
  assert(!T.keptLineWillLand(seg), 'X3: exit beside the ledge must be amber (kept)');
  console.log('[X3] kept line exiting beside the ledge is amber: OK');
}
// X4: kept line exiting onto the ledge — stays green. (Drawn via
// press/move with the far end clear of both edges, so no far snap
// moves it; the wide target keeps the line climbable.)
{
  const origin = { x1: 0, x2: 200, y: 700, row: 1 };
  const target = { x1: 48, x2: 300, y: 600, row: 2 };
  setWorld([origin, target], 150, 700, 1);
  press(100, 700); move(174, 600); release();
  assert(S.keptSeg, 'X4: line must be kept');
  assert(T.keptLineWillLand(S.keptSeg), 'X4: exit onto the ledge must stay kept-green');
  assert(lastRelease().includes('green=true'), 'X4: release must print the on-ledge exit green');
  console.log('[X4] kept line exiting onto the ledge stays green: OK');
}
// X5: the user-visible flow — a far end snapped exactly onto the
// edge, run toward it, exits beside the ledge and must print amber.
// (The press lands on the origin's gap node, so the line is
// node-locked to (200,700); both ends are on nodes, so the node
// rule passes and the exit check is what makes it amber. The
// origin end sits on the origin's right edge, so the reverse
// climb also exits beside its ledge: 200+4=204 > 200.)
{
  const origin = { x1: 0, x2: 200, y: 700, row: 1 };
  const target = { x1: 48, x2: 200, y: 600, row: 2 };
  setWorld([origin, target], 150, 700, -1);
  press(198, 700); move(50, 600); release();
  assert(S.keptSeg, 'X5: line must be kept');
  assert(S.keptSeg.bx === 48, 'X5: far end must have snapped to the edge');
  assert(!T.keptLineWillLand(S.keptSeg), 'X5: edge-snapped exit beside the ledge must be amber');
  assert(lastRelease().includes('green=false'), 'X5: release must print the edge exit amber');
  console.log('[X5] edge-snapped line exiting beside the ledge prints amber: OK');
}
console.log('ALL EXIT-LANDING TESTS PASSED');

// Start-lock anchoring to the NEAREST platform (Larry 2026-10-28:
// "line moves with the scroll" — a line drawn on the platform he
// is about to land on detached as that platform scrolled, because
// the lock only ever anchored to the platform he stood on).
const { loadGame } = require('./harness');
const { sandbox, T, S, assert, tick, press, move, release, setWorld } = loadGame();
const logText = () => T.log.join('\n');

// A1: a press on a platform he is NOT standing on locks to it.
// Press kept off the upper's gap node (250,550) so this stays a
// start-lock test, not a node test (nodes are test_gamenodes.js).
{
  const origin = { x1: 100, x2: 390, y: 700, row: 1 };
  const upper = { x1: 250, x2: 390, y: 550, row: 2 };
  setWorld([origin, upper], 150);
  press(300, 550); move(350, 400); // press ON the upper platform
  const seg = sandbox.fingerSegment();
  assert(seg && seg.ax === 300 && seg.ay === 550, 'A1: must lock to the upper platform, got ' + JSON.stringify(seg));
  assert(logText().includes('LOCK'), 'A1: must log LOCK');
  console.log('[A1] press on another platform locks to it: OK');
}
// A2: a start locked to another platform rides that platform as
// the world scrolls (S10 pattern, high world so scroll latches)
{
  const origin = { x1: 100, x2: 390, y: 400, row: 1 };
  const upper = { x1: 250, x2: 390, y: 250, row: 2 };
  setWorld([origin, upper], 150);
  press(300, 250); move(350, 150); // press ON the upper platform (off its node)
  let seg = sandbox.fingerSegment();
  assert(seg && seg.ax === 300 && seg.ay === 250, 'A2: must lock to the upper platform, got ' + JSON.stringify(seg));
  for (let i = 0; i < 11; i++) tick();
  seg = sandbox.fingerSegment();
  assert(seg && seg.ax === 300, 'A2: locked start x must not move, got ' + JSON.stringify(seg));
  assert(seg && Math.round(seg.ay) === Math.round(upper.y), 'A2: locked start must ride the upper platform, got ' + JSON.stringify(seg));
  assert(S.mode === 'run' && S.surface === origin, 'A2: must keep running on his own platform');
  console.log('[A2] start locked to another platform rides it through scroll: OK');
}
// A3: Larry's line-4 case — a press just below a narrow platform,
// dragged up through its height with the foot over the gap (past
// its edge), locks: clamping creates the foot on the platform
{
  const origin = { x1: 100, x2: 390, y: 700, row: 1 };
  const narrow = { x1: 0, x2: 111, y: 550, row: 2 };
  setWorld([origin, narrow], 150);
  press(80, 560); move(300, 500); // 10px below the narrow platform, drag up-right, foot over the gap (press kept off its node (111,550))
  const seg = sandbox.fingerSegment();
  assert(seg && seg.ax === 80 && seg.ay === 550, 'A3: must lock to the narrow platform, got ' + JSON.stringify(seg));
  assert(logText().includes('LOCK'), 'A3: must log LOCK');
  console.log('[A3] press below a narrow platform, foot over the gap, locks: OK');
}
// A4 (guard preserved): a press below his own platform, dragged
// up with the foot ON the platform, must NOT lock — clamping
// would move a real foot and break the front-line geometry
{
  const origin = { x1: 100, x2: 390, y: 700, row: 1 };
  setWorld([origin], 150);
  const before = T.log.length; // the log is shared across blocks; scope to A4's entries
  press(200, 710); move(300, 600); // 10px below his platform, drag up
  const seg = sandbox.fingerSegment();
  assert(seg && seg.ax === 200 && seg.ay === 710, 'A4: crossing line with an on-platform foot must stay raw, got ' + JSON.stringify(seg));
  assert(!T.log.slice(before).join('\n').includes('LOCK'), 'A4: must not log LOCK');
  console.log('[A4] crossing line with an on-platform foot does not lock: OK');
}
console.log('ALL ANCHOR TESTS PASSED');

// Green means ONWARD (Larry 2026-10-29: a green line whose far
// end stopped short of the next platform stayed green only
// because its far end dropped — first to a LOWER platform, then
// to the SAME row's other segment, both backward landings that
// still counted as "somewhere new"). A DROP must land strictly
// above the origin/anchor; step-ons count wherever they land (a
// downward face landing stays green, F3; a same-height step-on is
// a real sideways move, U4).
const { loadGame } = require('./harness');
const { sandbox, T, S, assert, press, move, release, setWorld } = loadGame();
const lastRelease = () => T.log.filter(l => l.includes('RELEASE')).pop();

// U1: kept line whose far end drops to a platform BELOW its
// embark anchor (Larry's log: far end short of row 7, dropping
// to row 5 below) must be amber, not green
{
  const anchor = { x1: 300, x2: 430, y: 440, row: 1 };
  const below = { x1: 0, x2: 202, y: 680, row: 2 };
  setWorld([anchor, below], 350);
  press(370, 440); move(205, 284); release();
  assert(S.keptSeg, 'U1: line must be kept');
  assert(!T.keptLineWillLand(S.keptSeg), 'U1: backward drop must not be kept-green');
  assert(lastRelease().includes('green=false'), 'U1: release must print the backward drop amber');
  console.log('[U1] kept line dropping below its anchor is amber: OK');
}
// U2: the same rule for a live line (green from his position)
{
  const anchor = { x1: 300, x2: 430, y: 700, row: 1 };
  const below = { x1: 0, x2: 202, y: 900, row: 2 };
  setWorld([anchor, below], 350);
  press(340, 700); move(200, 560);
  const seg = sandbox.fingerSegment();
  assert(seg, 'U2: live line must exist');
  assert(!T.lineWillLand(seg), 'U2: live line dropping below its origin must be amber');
  console.log('[U2] live line dropping below its origin is amber: OK');
}
// U3 (preserved): a drop to a platform ABOVE the anchor is upward
// progress and stays green
{
  const anchor = { x1: 300, x2: 430, y: 700, row: 1 };
  const above = { x1: 0, x2: 202, y: 500, row: 2 };
  setWorld([anchor, above], 350);
  press(370, 700); move(205, 400); release();
  assert(S.keptSeg, 'U3: line must be kept');
  assert(T.keptLineWillLand(S.keptSeg), 'U3: upward drop must stay kept-green');
  assert(lastRelease().includes('green=true'), 'U3: release must print the upward drop green');
  console.log('[U3] line dropping to a platform above its anchor stays green: OK');
}
// U4 (preserved): a same-height landing stays green (Larry's
// horizontal ruling, 2026-10-28)
{
  const anchor = { x1: 0, x2: 150, y: 700, row: 1 };
  const same = { x1: 250, x2: 390, y: 700, row: 2 };
  setWorld([anchor, same], 100);
  press(100, 700); move(260, 700); release();
  assert(S.keptSeg, 'U4: line must be kept');
  assert(T.keptLineWillLand(S.keptSeg), 'U4: same-height landing must stay kept-green');
  assert(lastRelease().includes('green=true'), 'U4: release must print the same-height landing green');
  console.log('[U4] same-height landing stays green: OK');
}
// U5: kept line whose far end drops to the SAME row's other
// segment (Larry's second log: from row 7's right segment, far
// end in the air, dropping to row 7's left segment) must be amber
// — same height means the same row, never a new row, and scroll
// carries that row toward the screen bottom while he climbs
{
  const right = { x1: 340, x2: 430, y: 600, row: 1 };
  const left = { x1: 0, x2: 214, y: 600, row: 1 };
  setWorld([right, left], 370);
  press(370, 600); move(151, 430); release();
  assert(S.keptSeg, 'U5: line must be kept');
  assert(!T.keptLineWillLand(S.keptSeg), 'U5: same-row drop must not be kept-green');
  assert(lastRelease().includes('green=false'), 'U5: release must print the same-row drop amber');
  console.log('[U5] kept line dropping to the same row is amber: OK');
}
console.log('ALL GREEN-UP TESTS PASSED');

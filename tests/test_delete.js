// Delete badge (Larry 2026-10-26): a small circled x at the kept
// line's midpoint; tapping it deletes the line. Tapping anywhere
// else on/near the line leaves it alone; tapping the x and then
// dragging draws a new line instead.
const { loadGame } = require('./harness');
const { sandbox, S, assert, tick, press, move, release, setWorld } = loadGame();
const lower = { x1: 0, x2: 390, y: 700 };
const upper = { x1: 0, x2: 390, y: 550 };
function keptLine() {
  setWorld([lower, upper], 100);
  press(150, 700); move(300, 550); release(); // kept line (150,700)-(300,550), midpoint (225,625)
  assert(S.keptSeg && S.keptSeg.ax === 150 && S.keptSeg.bx === 300, 'setup: kept line must exist');
}

// X1: tapping the badge deletes the line at once, and it stays
// deleted after the tap lifts (no replacement line appears).
{
  keptLine();
  press(225, 625); // exactly the midpoint
  assert(S.keptSeg === null, 'X1: tapping the x must delete the line at once');
  assert(S.deletePress === true, 'X1: the press must be marked a delete press');
  assert(sandbox.fingerSegment() === null, 'X1: no line must draw during the delete press');
  release();
  assert(S.keptSeg === null, 'X1: the line must stay deleted after the tap lifts');
  assert(sandbox.fingerSegment() === null, 'X1: no line must appear after the delete tap');
  console.log('[X1] tapping the x deletes the line, and it stays deleted: OK');
}

// X2: tapping 60px from the badge (outside the 28px hit area)
// leaves the kept line alone.
{
  keptLine();
  press(225, 565); // 60px above the midpoint
  assert(S.deletePress === false, 'X2: a press away from the badge must not be a delete press');
  assert(S.keptSeg && S.keptSeg.ax === 150, 'X2: the kept line must survive a press away from the badge');
  assert(sandbox.fingerSegment() === S.keptSeg, 'X2: the kept line must stay the current line');
  release();
  assert(S.keptSeg && S.keptSeg.ax === 150 && S.keptSeg.bx === 300, 'X2: the kept line must survive the tap lifting');
  console.log('[X2] tapping away from the x leaves the line alone: OK');
}

// X3: tapping the x while he climbs the kept line deletes it, so
// he falls instead of climbing nothing.
{
  keptLine();
  let climbing = false;
  for (let i = 0; i < 60; i++) {
    tick();
    if (S.surface && S.surface.type === 'finger') { climbing = true; break; }
  }
  assert(climbing, 'X3: must be climbing the kept line first');
  for (let i = 0; i < 30; i++) tick(); // actually up the line (the mount tick sits at its foot, at ledge height)
  assert(S.y < 700, 'X3: must be above the ledge before deleting (got y=' + S.y + ')');
  press(225, 625); // the badge, mid-climb
  assert(S.keptSeg === null, 'X3: tapping the x must delete the line he is on');
  tick();
  assert(S.mode === 'fall', 'X3: deleting the line under him must drop him');
  console.log('[X3] deleting the line he climbs drops him: OK');
}

// X4: tapping the x and then dragging draws a new line (the
// delete press becomes a normal draw once it moves).
{
  keptLine();
  press(225, 625); // the badge: line deleted
  assert(S.keptSeg === null, 'X4: the old line must be deleted by the x-tap');
  move(100, 400); // drag: a new line
  const seg = sandbox.fingerSegment();
  assert(seg && seg.ax === 225 && seg.bx === 100, 'X4: dragging after the x-tap must draw a new line');
  assert(S.deletePress === false, 'X4: the drag must clear the delete press');
  release();
  assert(S.keptSeg && S.keptSeg.ax === 225 && S.keptSeg.bx === 100, 'X4: the new line must keep after lifting');
  console.log('[X4] x-tap then drag draws a new line: OK');
}
console.log('ALL DELETE TESTS PASSED');

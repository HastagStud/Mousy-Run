// Drawing while embarked, one line (Jack 2026-11-09, for
// now): when the mouse embarks on the kept line and another is
// drawn, he must not jump off it. The climb keeps the line he
// mounted (S.climbSeg); the new line replaces the kept one on
// release (Jack 2026-11-09: you can draw a new line while
// climbing a locked line), and he keeps climbing the old line
// until he exits it. A live-line climb still drops him on a new
// press (test_point T2, preserved).
const { loadGame } = require('./harness');
const { sandbox, T, S, assert, tick, press, move, release, setWorld, settle } = loadGame();
const logText = () => T.log.join('\n');
const mountFirst = () => { for (let i = 0; i < 200 && !(S.surface && S.surface.type === 'finger'); i++) tick(); };

// C1: climbing the kept line, a new press + drag draws the
// replacement but he stays on the old line while the drag is
// live; releasing it replaces the kept line and he KEEPS
// climbing the old line (no drop)
{
  const origin = { x1: 100, x2: 390, y: 700, row: 1 };
  const upper = { x1: 250, x2: 390, y: 550, row: 2 };
  setWorld([origin, upper], 100);
  press(100, 700); move(260, 560); release(); // kept line A
  mountFirst();
  assert(S.surface && S.surface.type === 'finger', 'C1: must be climbing line A first');
  assert(S.rampSlot === 1, 'C1: must be climbing slot 1');
  press(150, 700); move(300, 560); // draw another line mid-climb
  for (let i = 0; i < 20; i++) tick();
  assert(S.mode === 'run', 'C1: must still be running, not fallen');
  assert(S.surface && S.surface.type === 'finger', 'C1: must still be climbing, not jumped off');
  assert(S.rampSlot === 1, 'C1: must still be on slot 1, not switched to the new line');
  assert(S.y < 700, 'C1: must still be climbing up line A');
  assert(!logText().includes('new-press-replaced-line'), 'C1: no teleport fall may fire');
  const drawn = sandbox.fingerSegment();
  assert(drawn && drawn.ax === 150, 'C1: the new line must be what is drawn, got ' + JSON.stringify(drawn));
  release(); // the new line replaces line A in the kept slot, and he keeps climbing line A
  assert(S.mode === 'run', 'C1: releasing the replacement while climbing must not drop him, got mode=' + S.mode);
  assert(S.surface && S.surface.type === 'finger', 'C1: must still be climbing the old line after the release');
  assert(S.keptSeg && S.keptSeg.ax === 150, 'C1: the new line must be the kept line, got ' + JSON.stringify(S.keptSeg));
  assert(S.climbSeg && S.climbSeg.ax === 100, 'C1: must still be climbing line A, got ' + JSON.stringify(S.climbSeg));
  for (let i = 0; i < 5; i++) tick(); // 5 ticks, not 10: the
  // climb is ~30 ticks at s=317, and 10 would already have
  // him exited onto the upper platform (correctly)
  assert(S.surface && S.surface.type === 'finger' && S.mode === 'run', 'C1: must still be climbing line A after the release');
  console.log('[C1] drawing while climbing keeps him on the old line after release: OK');
}
// C2: a still point while climbing the kept line does not disturb
// it — no replacement, no drop
{
  const origin = { x1: 100, x2: 390, y: 700, row: 1 };
  const upper = { x1: 250, x2: 390, y: 550, row: 2 };
  setWorld([origin, upper], 100);
  press(100, 700); move(260, 560); release(); // kept line A
  mountFirst();
  assert(S.surface && S.surface.type === 'finger', 'C2: must be climbing line A first');
  press(150, 700); // still point, no drag
  for (let i = 0; i < 20; i++) tick();
  assert(S.surface && S.surface.type === 'finger', 'C2: must still be climbing, not jumped off');
  assert(S.rampSlot === 1, 'C2: must still be on slot 1');
  release(); // still point: nothing new is kept, line A stays
  assert(S.keptSeg && S.keptSeg.ax === 100, 'C2: the kept line must survive a still point, got ' + JSON.stringify(S.keptSeg));
  assert(S.mode === 'run', 'C2: must still be running, not fallen');
  for (let i = 0; i < 5; i++) tick();
  assert(S.surface && S.surface.type === 'finger', 'C2: must still be climbing line A after the release');
  console.log('[C2] a still point while climbing does not disturb the kept line: OK');
}
// C4: the full flow — draw while climbing the kept line,
// release it (replaces the kept line, he keeps climbing the
// old line), then exit the old line onto the upper platform
// (not a fall), and the new line stays kept
{
  const origin = { x1: 100, x2: 390, y: 700, row: 1 };
  const upper = { x1: 250, x2: 390, y: 550, row: 2 };
  setWorld([origin, upper], 100);
  press(100, 700); move(260, 560); release(); // kept line A
  mountFirst();
  press(150, 700); move(300, 560); // draw another line mid-climb
  release(); // replaces line A in the kept slot, he keeps climbing line A
  assert(S.mode === 'run', 'C4: must keep climbing, not fall, when the replacement is released');
  assert(!logText().includes('new-press-replaced-line'), 'C4: no teleport fall may fire');
  const landed = settle(400);
  assert(landed === upper, 'C4: must exit line A onto the upper platform, not fall');
  assert(S.keptSeg && S.keptSeg.ax === 150, 'C4: the replacement line must stay kept after he exits line A, got ' + JSON.stringify(S.keptSeg));
  assert(!S.keptSeg2, 'C4: there must be no second kept line');
  assert(!S.climbSeg, 'C4: the climbed line must be cleared after the exit');
  console.log('[C4] draw while climbing, release, exit onto the upper platform, new line stays: OK');
}
// C5 (Jack 2026-11-09 log, 430x819: 'id draw a line and it
// would be two lines'): he mounts a LIVE line, its far end snaps
// mid-climb, then he releases — the live line becomes the kept
// line, and he must keep climbing THAT (snapped) line, not the
// pre-snap line he mounted. The old S.climbSeg (set at mount,
// pre-snap) stayed stale after the release flipped rampSlot
// from 'live' to 1, so the climb switched to it while the kept
// line was the snapped one — two lines on screen, and he
// climbed the worse one (exiting on a drop instead of the
// snapped landing).
{
  const origin = { x1: 100, x2: 390, y: 700 };
  const upper = { x1: 250, x2: 390, y: 550 };
  setWorld([origin, upper], 100);
  press(100, 700); move(300, 560); // live line, far end raw (300,560) — not near a node
  mountFirst();
  assert(S.surface && S.surface.type === 'finger', 'C5: must be climbing the live line first');
  assert(S.rampSlot === 'live', 'C5: must be climbing a live line, got rampSlot=' + S.rampSlot);
  move(260, 560); // drag the far end near the upper platform's left-edge node (250,557) — it snaps
  let seg = sandbox.fingerSegment();
  // (scroll may already be latched on from C1/C2/C4, so the node
  // rides down a few px — check the snap by x and the node flag,
  // not the exact y)
  assert(seg && seg.bx === 250 && seg.node === true, 'C5: the live line must snap to the node, got ' + JSON.stringify(seg));
  release(); // the live line becomes the kept line; he must keep climbing it
  assert(S.mode === 'run', 'C5: releasing mid-climb must not drop him, got mode=' + S.mode);
  assert(S.surface && S.surface.type === 'finger', 'C5: must still be climbing after the release');
  assert(S.rampSlot === 1, 'C5: the released line must become slot 1, got rampSlot=' + S.rampSlot);
  assert(S.keptSeg && S.keptSeg.bx === 250 && S.keptSeg.node === true, 'C5: the kept line must be the snapped line, got ' + JSON.stringify(S.keptSeg));
  assert(S.climbSeg && S.climbSeg.bx === 250 && S.climbSeg.node === true, 'C5: the climbed line must be the snapped line too, not the pre-snap one, got ' + JSON.stringify(S.climbSeg));
  assert(S.climbSeg === S.keptSeg, 'C5: there must be one line, not two — the climbed line and the kept line must be the same');
  const landed = settle(400);
  assert(landed === upper, 'C5: must exit the snapped line onto the upper platform, not drop');
  console.log('[C5] releasing a live line mid-climb keeps him on the snapped line (one line, not two): OK');
}
console.log('ALL CLIMB-DRAW TESTS PASSED');

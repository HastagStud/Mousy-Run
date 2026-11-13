// One line (Jack 2026-11-09, for now): only one line on
// screen. Drawing a second line replaces the first; there is
// no second slot. Drawing a new line while climbing the kept
// line is allowed (Jack 2026-11-09: you can draw a new line
// while climbing a locked line) — the new line replaces the
// kept one, and he keeps climbing the old line until he exits
// it (the climb reads S.climbSeg, not the kept slot).
const { loadGame } = require('./harness');
const { sandbox, T, S, assert, tick, press, move, release, setWorld, settle } = loadGame();
const logText = () => T.log.join('\n');

// W1: drawing a second line replaces the first — one kept line, no second slot
{
  const origin = { x1: 100, x2: 390, y: 700, row: 1 };
  const upper = { x1: 250, x2: 390, y: 550, row: 2 };
  setWorld([origin, upper], 150);
  press(100, 700); move(260, 560); release();
  assert(S.keptSeg && S.keptSeg.ax === 100, 'W1: first line must be kept, got ' + JSON.stringify(S.keptSeg));
  assert(!S.keptSeg2, 'W1: only one line kept yet');
  press(150, 700); move(300, 560); release();
  assert(S.keptSeg && S.keptSeg.ax === 150, 'W1: second draw must replace the first, got ' + JSON.stringify(S.keptSeg));
  assert(!S.keptSeg2, 'W1: there must be no second kept line');
  assert(!logText().includes('kept2='), 'W1: release must not log a second kept line');
  console.log('[W1] a second draw replaces the first: OK');
}
// W2: drawing a new line while climbing the kept line is
// allowed (Jack 2026-11-09: you can draw a new line while
// climbing a locked line) — the new line replaces the kept one,
// and he keeps climbing the old line until he exits it
{
  const origin = { x1: 100, x2: 390, y: 700, row: 1 };
  const upper = { x1: 250, x2: 390, y: 550, row: 2 };
  setWorld([origin, upper], 100);
  press(100, 700); move(260, 560); release(); // kept line
  // mount it, then draw a new line mid-climb
  for (let i = 0; i < 200 && !(S.surface && S.surface.type === 'finger'); i++) tick();
  assert(S.surface && S.surface.type === 'finger', 'W2: must mount the kept line');
  assert(S.rampSlot === 1, 'W2: must be climbing the kept line');
  press(150, 700); move(300, 560); release(); // new line replaces the kept one
  assert(S.mode === 'run', 'W2: drawing while climbing must not drop him, got mode=' + S.mode);
  assert(S.surface && S.surface.type === 'finger', 'W2: must still be climbing, not fallen');
  assert(S.keptSeg && S.keptSeg.ax === 150, 'W2: the new line must be the kept line, got ' + JSON.stringify(S.keptSeg));
  assert(S.climbSeg && S.climbSeg.ax === 100, 'W2: must still be climbing the old line, got ' + JSON.stringify(S.climbSeg));
  const landed = settle(400);
  assert(landed === upper, 'W2: must exit the old line onto the upper platform');
  assert(S.keptSeg && S.keptSeg.ax === 150, 'W2: the new line must stay kept after the exit, got ' + JSON.stringify(S.keptSeg));
  assert(!S.climbSeg, 'W2: the climbed line must be cleared after the exit');
  console.log('[W2] drawing while climbing is allowed, old line climbs out, new line stays: OK');
}
// W3: disembarking the line frees it — a new line can be drawn after
{
  const origin = { x1: 100, x2: 390, y: 700, row: 1 };
  const upper = { x1: 250, x2: 390, y: 550, row: 2 };
  setWorld([origin, upper], 100);
  press(100, 700); move(260, 560); release();
  const landed = settle(400);
  assert(landed === upper, 'W3: must climb the line and land on the upper platform');
  assert(!S.keptSeg, 'W3: the used line must be gone after disembarking, got ' + JSON.stringify(S.keptSeg));
  press(280, 550); move(350, 400); release();
  assert(S.keptSeg && S.keptSeg.ax === 280, 'W3: a new line must be kept after disembarking, got ' + JSON.stringify(S.keptSeg));
  assert(!S.keptSeg2, 'W3: there must be no second kept line');
  console.log('[W3] disembark frees the line for a new draw: OK');
}
// W4: releasing mid-climb (on the live line) keeps climbing the same line
{
  const origin = { x1: 100, x2: 390, y: 700, row: 1 };
  const upper = { x1: 250, x2: 390, y: 550, row: 2 };
  setWorld([origin, upper], 100);
  press(100, 700); move(260, 560); // live line, finger still down
  for (let i = 0; i < 200 && !(S.surface && S.surface.type === 'finger'); i++) tick();
  assert(S.surface && S.surface.type === 'finger', 'W4: must mount the live line');
  assert(S.rampSlot === 'live', 'W4: must be climbing a live line, got rampSlot=' + S.rampSlot);
  release(); // keep the live line mid-climb
  assert(S.keptSeg && S.keptSeg.ax === 100, 'W4: released line must be kept, got ' + JSON.stringify(S.keptSeg));
  assert(S.rampSlot === 1, 'W4: the kept line must become the climbing slot, got rampSlot=' + S.rampSlot);
  for (let i = 0; i < 20; i++) tick();
  assert(S.surface && S.surface.type === 'finger', 'W4: must still be climbing, not fallen');
  assert(S.y < 700, 'W4: must be climbing up the line');
  console.log('[W4] release mid-climb keeps the same line: OK');
}
// W5: tapping the kept line's badge deletes it, and a new line can be drawn
{
  const origin = { x1: 100, x2: 390, y: 700, row: 1 };
  const upper = { x1: 250, x2: 390, y: 550, row: 2 };
  setWorld([origin, upper], 150);
  press(100, 700); move(200, 600); release();
  assert(S.keptSeg && S.keptSeg.ax === 100, 'W5: line must be kept before deleting');
  const mx = (S.keptSeg.ax + S.keptSeg.bx) / 2, my = (S.keptSeg.ay + S.keptSeg.by) / 2;
  press(Math.round(mx), Math.round(my));
  assert(!S.keptSeg, 'W5: the line must be deleted, got ' + JSON.stringify(S.keptSeg));
  assert(!S.keptSeg2, 'W5: there must be no second kept line');
  press(200, 700); move(280, 560); release();
  assert(S.keptSeg && S.keptSeg.ax === 200, 'W5: a new line must be allowed after deleting, got ' + JSON.stringify(S.keptSeg));
  console.log('[W5] deleting the kept line frees it for a new draw: OK');
}
// W6: drawing a new line while standing (not climbing) replaces the kept line without dropping him
{
  const origin = { x1: 100, x2: 390, y: 700, row: 1 };
  const upper = { x1: 250, x2: 390, y: 550, row: 2 };
  setWorld([origin, upper], 150);
  press(100, 700); move(260, 560); release();
  assert(S.keptSeg && S.keptSeg.ax === 100, 'W6: first line must be kept');
  const logBefore = T.log.length;
  press(150, 700); move(300, 560); release();
  assert(S.keptSeg && S.keptSeg.ax === 150, 'W6: second draw must replace the first, got ' + JSON.stringify(S.keptSeg));
  assert(S.mode === 'run', 'W6: replacing a line while standing must not drop him, got mode=' + S.mode);
  assert(!T.log.slice(logBefore).join('\n').includes('FALL'), 'W6: no fall must be logged while standing');
  console.log('[W6] replacing a line while standing does not drop him: OK');
}
console.log('ALL ONE-LINE TESTS PASSED');

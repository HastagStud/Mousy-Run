// Touch-mode start-lock tests (Jack 2026-10-28): the lock was
// mouse-only (it required dragA, which is null on touch), so it
// never fired on his device while every mouse-mode test passed.
// These drive the game with touch presses (isMouse=false).
const { loadGame } = require('./harness');
const { sandbox, T, S, assert, tick, pressTouch, move, setWorld } = loadGame();
const logText = () => T.log.join('\n');
const segEq = (seg, ax, ay, bx, by) => seg && Math.round(seg.ax) === ax && Math.round(seg.ay) === ay && Math.round(seg.bx) === bx && Math.round(seg.by) === by;

// T-far: a touch press far from his platform must not lock
{
  const origin = { x1: 100, x2: 390, y: 400, row: 1 };
  const upper = { x1: 250, x2: 390, y: 250, row: 2 };
  setWorld([origin, upper], 150);
  pressTouch(20, 320); move(200, 200);
  const seg = sandbox.fingerSegment();
  assert(seg && seg.ax === 20, 'T-far: far touch line must stay raw, got ' + JSON.stringify(seg));
  assert(!logText().includes('LOCK'), 'T-far: far touch press must not log LOCK');
  console.log('[T-far] far touch press does not lock: OK');
}
// T-ride: touch mirror of S10 — the locked start rides and never disengages.
// Updated 2026-11-02 (Jack: node wins over a B edge): the
// finger (240,260) is near both the B edge (250,250) and the
// node (250,257), so the far end is the node now.
{
  const origin = { x1: 100, x2: 390, y: 400, row: 1 };
  const upper = { x1: 250, x2: 390, y: 250, row: 2 };
  setWorld([origin, upper], 150);
  pressTouch(50, 400); move(240, 260);
  let seg = sandbox.fingerSegment();
  assert(segEq(seg, 100, 400, 250, 257), 'T-ride: must lock at draw, got ' + JSON.stringify(seg));
  assert(logText().includes('LOCK'), 'T-ride: touch press must log LOCK');
  for (let i = 0; i < 11; i++) tick();
  seg = sandbox.fingerSegment();
  assert(seg.ax === 100 && seg.bx === 250, 'T-ride: start must stay locked and far snapped after scroll, got ' + JSON.stringify(seg));
  assert(Math.round(seg.ay) === Math.round(origin.y), 'T-ride: locked start must ride its platform, got ' + JSON.stringify(seg));
  console.log('[T-ride] touch locked start rides the world and never disengages: OK');
}
// T-vision: touch mirror of S11 — locked start rides the scroll
// while climbing, line persists, exits onto the upper platform.
// (Same 2026-11-09 capped-follow update as S11: the start no
// longer races off the bottom mid-climb; he exits the ramp first.)
// Fresh instance: T-ride latches scrolling on, and setWorld does
// not reset it — with scrolling already on, the climb timing
// shifts and he exits into the air instead.
{
  const gTv = loadGame();
  const { sandbox: sbTv, T: TTv, S: STv, tick: tickTv, pressTouch: pressTouchTv, move: moveTv, setWorld: setWorldTv } = gTv;
  const origin = { x1: 100, x2: 390, y: 700, row: 1 };
  const upper = { x1: 350, x2: 450, y: 100, row: 2 };
  setWorldTv([origin, upper], 100);
  tickTv(); // one tick on the platform first: the points block must
  // see him running on row 1 (bestRow=1, scroll starts) before he
  // mounts — he mounts on the first tick after the press, and the
  // mount runs before the points block in that tick (same fix as S11)
  pressTouchTv(100, 700); moveTv(360, 160);
  for (let i = 0; i < 200 && !(STv.surface && STv.surface.type === 'finger'); i++) tickTv();
  assert(STv.surface && STv.surface.type === 'finger', 'T-vision: must mount first');
  // Climb until the line is gone (he exited); while he climbs, the
  // locked start must descend at most the scroll rate per tick.
  // (Read the segment once per tick, after the tick — the read
  // itself can snap the line, so a second read would perturb it.)
  let climbed = false, sawScrollRate = false, prev = null;
  for (let i = 0; i < 400; i++) {
    tickTv();
    const seg = sbTv.fingerSegment();
    if (!seg) break; // line gone: he exited
    assert(STv.mode === 'run', 'T-vision: must keep climbing, not fall');
    if (TTv.scrolling && prev && seg.ax === prev.ax) {
      const dAy = seg.ay - prev.ay;
      // the scroll rate is the current ramped speed (curA), not the
      // base SCROLL_A — bestRow=1 already ramps it to 62 (same as S11)
      if (Math.abs(dAy - TTv.curA * 0.016) < 1e-6) sawScrollRate = true;
      assert(dAy >= -1e-9 && dAy <= TTv.curA * 0.016 + 1e-6, 'T-vision: locked start must descend at most the scroll rate, got ' + dAy);
    }
    prev = seg;
    climbed = true;
  }
  assert(climbed, 'T-vision: must climb');
  assert(sawScrollRate, 'T-vision: must see the locked start descend at the scroll rate');
  // He exits onto the upper platform (the far end node-snapped to
  // it, so the line ends on the platform he lands on). The exit
  // may be a drop, so wait for the landing (same as S11).
  let landedTv = false;
  for (let i = 0; i < 200 && !landedTv; i++){
    tickTv();
    if (STv.mode === 'run' && STv.surface === upper) landedTv = true;
  }
  assert(landedTv && Math.abs(STv.y - upper.y) < 2, 'T-vision: must exit onto the upper platform, got mode=' + STv.mode + ' S.y=' + STv.y + ' upper.y=' + upper.y);
  console.log('[T-vision] touch locked start rides the scroll while climbing and the line persists: OK');
}
console.log('ALL TOUCH TESTS PASSED');

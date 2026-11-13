// B auto-snap (endless only, Larry 2026-10-27): a drawn line snaps
// to real anchors — start to his platform, far to an edge above —
// only when both ends are within snapR (64px), the snapped line
// is climbable, and it crosses no platform. Otherwise the line
// stays exactly as drawn (A behavior).
const { loadGame } = require('./harness');
const { sandbox, T, S, assert, tick, press, move, setWorld, settle } = loadGame();
function segEq(seg, ax, ay, bx, by) {
  return seg && seg.ax === ax && seg.ay === ay && seg.bx === bx && seg.by === by;
}
const lower = { x1: 0, x2: 390, y: 700 };
const upper = { x1: 250, x2: 390, y: 550 };
// S1: both ends aimed near anchors -> snaps, is green, lands on target.
// Updated 2026-11-02 (Larry: any line's far end snaps into a
// node, node wins over a B edge): the finger (260,560) is near
// both the B edge (250,550) and the node (250,557), so the far
// end is the node now, not the edge.
{
  setWorld([lower, upper], 100); press(100, 710); move(260, 560);
  const seg = sandbox.fingerSegment();
  assert(segEq(seg, 100, 700, 250, 557), 'S1: must snap to (100,700)-(250,557), got ' + JSON.stringify(seg));
  assert(sandbox.lineWillLand(seg) === true, 'S1: snapped line must be green');
  const landed = settle();
  assert(landed === upper, 'S1: snapped line must land on the upper platform');
  console.log('[S1] snap engages, green, lands on target: OK');
}
// S2: far end nowhere near an edge -> no snap (both ends required)
{
  setWorld([lower, upper], 100); press(100, 700); move(150, 600);
  const seg = sandbox.fingerSegment();
  assert(segEq(seg, 100, 700, 150, 600), 'S2: must stay raw, got ' + JSON.stringify(seg));
  console.log('[S2] far end out of radius stays raw: OK');
}
// S3: start end nowhere near his platform -> B does not snap
// the start. Updated 2026-11-02 (Larry: any line's far end
// snaps into a node): the finger (260,560) is within 28px of
// the node (250,557), so the far end DOES node-snap even
// though B stays off and the start stays raw at the press.
{
  const short = { x1: 0, x2: 150, y: 700 };
  setWorld([short, upper], 50); press(300, 700); move(260, 560);
  const seg = sandbox.fingerSegment();
  assert(segEq(seg, 300, 700, 250, 557), 'S3: start must stay raw but far end must node-snap, got ' + JSON.stringify(seg));
  console.log('[S3] start end out of radius stays raw, far end still node-snaps: OK');
}
// S4: snapped line too steep to climb -> B rejects it, and the
// node snap rejects it too (Larry 2026-11-05: only a line within
// 1.5deg of vertical is unclimbable now, so the test line is
// vertical). The far end stays raw at the finger.
{
  const steepTop = { x1: 200, x2: 350, y: 550 };
  setWorld([lower, steepTop], 100); press(200, 700); move(200, 560);
  const seg = sandbox.fingerSegment();
  assert(segEq(seg, 200, 700, 200, 560), 'S4: vertical line far end must stay raw (200,560), not node-snap, got ' + JSON.stringify(seg));
  assert(sandbox.lineWillLand(seg) === false, 'S4: vertical line must be amber');
  assert(!T.greenNodes().includes('200,557'), 'S4: far node of an unsnapped line must stay orange');
  console.log('[S4] unclimbable B snap rejected, node snap rejected too (amber, raw far end): OK');
}
// S5: snapped line would cross a platform -> B rejects it.
// Updated 2026-11-02 (Larry: any line's far end snaps into a
// node, unconditionally like nodeLock): the finger (260,560)
// is within 28px of the node (250,557), so the far end DOES
// node-snap even though the B edge snap is rejected for
// crossing — the line stays amber (crossing blocker).
{
  const mid = { x1: 150, x2: 205, y: 600 };
  setWorld([lower, mid, upper], 100); press(100, 700); move(260, 560);
  const seg = sandbox.fingerSegment();
  assert(segEq(seg, 100, 700, 250, 557), 'S5: far end must node-snap (B edge rejected for crossing), got ' + JSON.stringify(seg));
  assert(sandbox.lineWillLand(seg) === false, 'S5: node-snapped crossing line must be amber');
  console.log('[S5] crossing B snap rejected, far end still node-snaps (amber): OK');
}
// S6: the START locks while he climbs — dragging mid-climb moves
// the end (he controls it, Larry 2026-10-28) but the start stays
// put, and he still lands on target (via drop)
{
  setWorld([lower, upper], 100); press(100, 700); move(260, 560);
  for (let i = 0; i < 200 && !(S.surface && S.surface.type === 'finger'); i++) tick();
  assert(S.surface && S.surface.type === 'finger', 'S6: must mount first');
  move(300, 480);
  const seg = sandbox.fingerSegment();
  assert(segEq(seg, 100, 700, 300, 480), 'S6: start must stay locked while the end follows the finger, got ' + JSON.stringify(seg));
  const landed = settle();
  assert(landed === upper, 'S6: start-locked line must land on the upper platform');
  console.log('[S6] start stays locked while the end follows the finger: OK');
}
// S8: Larry's exact log line (2026-10-27) — it used to drop back
// onto his origin while green; under B it snaps onto the upper
// platform's edge and lands there instead. Since nodes (2026-10-29)
// the press (872,723) lands within 28px of the origin's gap node
// (846.92,726), so the node lock takes precedence over B's clamp
// and the start is the node, not the press point — the far end
// still snaps to the upper edge and lands there.
{
  const origin = { x1: 846.92, x2: 1366, y: 719 };
  const upper = { x1: 969.86, x2: 1366, y: 544 };
  setWorld([origin, upper], 872); press(872, 723); move(967, 559);
  const seg = sandbox.fingerSegment();
  assert(segEq(seg, 846.92, 726, 969.86, 551), 'S8: must snap to the upper edge, got ' + JSON.stringify(seg));
  assert(sandbox.lineWillLand(seg) === true, 'S8: snapped line must be green');
  const landed = settle();
  assert(landed === upper, 'S8: snapped line must land on the upper platform');
  console.log('[S8] log line snaps and lands on the upper platform: OK');
}
// S9: a raw line snaps MID-CLIMB when the drag moves it into a
// snap target (Larry 2026-10-28: mounting a raw line bypassed
// snap, so a line dragged toward an edge never snapped at all).
// Since nodes (2026-10-29) the press (320,700) lands within 28px
// of the origin's gap node (300,707), so the line starts
// node-locked, not raw — but the mid-climb snap (far end into
// the upper's node) is the same behaviour under test.
{
  const origin = { x1: 300, x2: 430, y: 700 };
  const upper = { x1: 0, x2: 160, y: 500 };
  const left = { x1: 0, x2: 200, y: 700 };
  setWorld([origin, upper, left], 320);
  press(320, 700); move(190, 620);
  let seg = sandbox.fingerSegment();
  assert(segEq(seg, 300, 707, 190, 620), 'S9: out-of-range line must stay unsnapped at the far end, got ' + JSON.stringify(seg));
  for (let i = 0; i < 200 && !(S.surface && S.surface.type === 'finger'); i++) tick();
  assert(S.surface && S.surface.type === 'finger', 'S9: must mount first');
  seg = sandbox.fingerSegment();
  assert(segEq(seg, 300, 707, 190, 620), 'S9: mounted line must still be unsnapped at the far end, got ' + JSON.stringify(seg));
  move(150, 510);
  seg = sandbox.fingerSegment();
  assert(segEq(seg, 300, 707, 160, 507), 'S9: dragged-into-range line must snap mid-climb, got ' + JSON.stringify(seg));
  const landed = settle();
  assert(landed === upper, 'S9: snapped line must land on the upper platform');
  console.log('[S9] raw line snaps mid-climb and lands on target: OK');
}
// S7: ground counts as the platform he stands on.
// Updated 2026-11-02 (Larry: node wins over a B edge): the
// finger (260,560) is near both the B edge (250,550) and the
// node (250,557), so the far end is the node now.
{
  setWorld([upper], 100); S.surface = { type: 'ground' }; S.y = 800;
  press(100, 810); move(260, 560);
  const seg = sandbox.fingerSegment();
  assert(segEq(seg, 100, 800, 250, 557), 'S7: must snap from ground, got ' + JSON.stringify(seg));
  console.log('[S7] ground anchor snaps: OK');
}
// S10: the locked start rides the world and never disengages —
// scroll stretching the press-point distance past snapR must not
// drop the snap (Larry 2026-10-28, Example 2).
// Updated 2026-11-02 (Larry: node wins over a B edge): the
// finger (240,260) is near both the B edge (250,250) and the
// node (250,257), so the far end is the node now.
{
  const origin = { x1: 100, x2: 390, y: 400 };
  const upper = { x1: 250, x2: 390, y: 250 };
  setWorld([origin, upper], 150);
  press(50, 400); move(240, 260);
  let seg = sandbox.fingerSegment();
  assert(segEq(seg, 100, 400, 250, 257), 'S10: must snap at draw, got ' + JSON.stringify(seg));
  for (let i = 0; i < 11; i++) tick();
  seg = sandbox.fingerSegment();
  assert(seg.ax === 100 && seg.bx === 250, 'S10: start must stay locked and far snapped after scroll, got ' + JSON.stringify(seg));
  assert(Math.round(seg.ay) === Math.round(origin.y), 'S10: locked start must ride its platform, got ' + JSON.stringify(seg));
  console.log('[S10] locked start rides the world and never disengages: OK');
}
// S11: the locked start rides the world down while he climbs, and
// the line persists (Larry 2026-10-28 vision, updated 2026-11-09
// for the capped follow). The start is a world point: once
// scrolling, it descends at exactly the scroll rate — no follow
// shove — and the line stays whole until he exits onto the upper
// platform, whose node the far end snapped to. (With the follow
// capped the start no longer races off the bottom mid-climb; he
// exits the ramp first, which is normal play.)
// Fresh instance: setWorld does not reset module-level scrolling,
// and earlier suites latch it on — with scrolling already on, the
// climb timing shifts and he exits into the air instead.
{
  const g11 = loadGame();
  const { sandbox: sb11, T: T11, S: S11, tick: tick11, press: press11, move: move11, setWorld: setWorld11 } = g11;
  const origin = { x1: 100, x2: 390, y: 700, row: 1 };
  const upper = { x1: 350, x2: 450, y: 100, row: 2 };
  setWorld11([origin, upper], 100);
  tick11(); // one tick on the platform first: the points block must
  // see him running on row 1 (bestRow=1, scroll starts) before he
  // mounts — he mounts on the first tick after the press, and the
  // mount runs before the points block in that tick, so without
  // this the scroll would never start and the start would not ride it
  press11(100, 700); move11(360, 160);
  for (let i = 0; i < 200 && !(S11.surface && S11.surface.type === 'finger'); i++) tick11();
  assert(S11.surface && S11.surface.type === 'finger', 'S11: must mount first');
  // Climb until the line is gone (he exited); while he climbs, the
  // locked start must descend at most the scroll rate per tick.
  // (Read the segment once per tick, after the tick — the read
  // itself can snap the line, so a second read would perturb it.)
  let climbed = false, sawScrollRate = false, prev = null;
  for (let i = 0; i < 400; i++) {
    tick11();
    const seg = sb11.fingerSegment();
    if (!seg) break; // line gone: he exited
    assert(S11.mode === 'run', 'S11: must keep climbing, not fall');
    if (T11.scrolling && prev && seg.ax === prev.ax) {
      const dAy = seg.ay - prev.ay;
      // the scroll rate is the current ramped speed (curA), not the
      // base SCROLL_A — bestRow=1 already ramps it to 62 (Larry
      // 2026-11-09 speed ramp), and it steps up as he climbs
      if (Math.abs(dAy - T11.curA * 0.016) < 1e-6) sawScrollRate = true;
      assert(dAy >= -1e-9 && dAy <= T11.curA * 0.016 + 1e-6, 'S11: locked start must descend at most the scroll rate, got ' + dAy);
    }
    prev = seg;
    climbed = true;
  }
  assert(climbed, 'S11: must climb');
  assert(sawScrollRate, 'S11: must see the locked start descend at the scroll rate');
  // He exits onto the upper platform (the far end node-snapped to
  // it, so the line ends on the platform he lands on). The exit
  // may be a drop (he falls a short way onto it), so wait for the
  // landing instead of asserting on the exit tick.
  let landed11 = false;
  for (let i = 0; i < 200 && !landed11; i++){
    tick11();
    if (S11.mode === 'run' && S11.surface === upper) landed11 = true;
  }
  assert(landed11 && Math.abs(S11.y - upper.y) < 2, 'S11: must exit onto the upper platform, got mode=' + S11.mode + ' S.y=' + S11.y + ' upper.y=' + upper.y);
  console.log('[S11] locked start rides the scroll while climbing and the line persists: OK');
}
// S12: scroll continues at its pace while he's on a ramp (Larry
// 2026-10-28: the autoscroll should continue and not stop). The
// measured climb stays below mid-screen (422 = 844/2), so follow
// is off and any world movement is scroll alone — the old pause
// would leave the platform exactly where it was.
{
  // Phase A: turn scrolling on (a row-1 platform — scroll starts
  // when he gets onto row 1, Larry 2026-11-09, not at mid-screen)
  setWorld([{ x1: 100, x2: 390, y: 400, row: 1 }], 150);
  tick();
  assert(T.scrolling, 'S12: scrolling must be on after reaching row 1');
  // Phase B: place him below mid-screen; scrolling stays latched on
  const origin = { x1: 100, x2: 390, y: 700, row: 1 };
  const upper = { x1: 350, x2: 450, y: 100, row: 2 };
  setWorld([origin, upper], 100);
  assert(T.scrolling, 'S12: scrolling must stay on after re-placing him');
  press(100, 700); move(360, 160);
  for (let i = 0; i < 200 && !(S.surface && S.surface.type === 'finger'); i++) tick();
  assert(S.surface && S.surface.type === 'finger', 'S12: must mount first');
  const yBefore = origin.y;
  for (let i = 0; i < 10; i++) {
    tick();
    assert(S.surface && S.surface.type === 'finger', 'S12: must still be climbing');
    assert(S.y > 422, 'S12: must stay below mid-screen so follow stays off');
  }
  assert(origin.y > yBefore, 'S12: world must scroll during a climb, origin.y ' + yBefore + ' -> ' + origin.y);
  console.log('[S12] scroll continues during a climb: OK');
}
console.log('ALL SNAP TESTS PASSED');

// Nodes in the endless game (Larry 2026-10-29, ported from the
// Line Lab): blue circles only at platform ends leading to a
// gap, from either direction. Press on one locks the start to
// it exactly; end in one and the far end snaps to it; both
// endpoints in nodes always snap. The game's B snap and
// start-lock still apply for presses not on a node.
const { loadGame } = require('./harness');
const { sandbox, T, S, assert, tick, press, move, release, setWorld, settle } = loadGame();
function segEq(seg, ax, ay, bx, by) {
  return seg && seg.ax === ax && seg.ay === ay && seg.bx === bx && seg.by === by;
}
const nodeKey = (n) => n.x + ',' + n.y;

// G1: nodes only at gap-facing ends — a row's outer (border)
// ends get none, and a full-width row gets none at all
{
  setWorld([{ x1: 0, x2: 90, y: 700 }, { x1: 100, x2: 390, y: 700 }], 50);
  const nodes = T.nodes();
  assert(nodes.length === 2, 'G1: exactly the two gap ends must be nodes, got ' + JSON.stringify(nodes));
  assert(nodes.some(n => nodeKey(n) === '90,707') && nodes.some(n => nodeKey(n) === '100,707'),
    'G1: gap nodes must be (90,707) and (100,707), got ' + JSON.stringify(nodes));
  setWorld([{ x1: 0, x2: 390, y: 550 }], 50);
  assert(T.nodes().length === 0, 'G1: a full-width row must have no nodes, got ' + JSON.stringify(T.nodes()));
  console.log('[G1] nodes only at gap-facing ends: OK');
}
// G2: press on a node locks the start to it exactly, and ending
// in a node snaps the far end to it — both endpoints in nodes
// always snap, with NODE + SNAP in the log
{
  const origin = { x1: 100, x2: 390, y: 700 };
  const upper = { x1: 250, x2: 380, y: 550 };
  setWorld([origin, upper], 150);
  press(100, 700); move(250, 550);
  const seg = sandbox.fingerSegment();
  assert(segEq(seg, 100, 707, 250, 557), 'G2: node-to-node must snap both ends, got ' + JSON.stringify(seg));
  const log = T.log.join('\n');
  assert(log.includes('NODE start=(100,707)'), 'G2: must log NODE, log:\n' + log);
  assert(log.includes('SNAP far=(250,557)'), 'G2: must log far node snap, log:\n' + log);
  console.log('[G2] press on node locks, end in node snaps: OK');
}
// G4: the mouse mounts a node line and lands on the upper
// platform (he starts standing on the foot node)
{
  const origin = { x1: 100, x2: 380, y: 700 };
  const upper = { x1: 300, x2: 380, y: 550 };
  setWorld([origin, upper], 380);
  press(380, 700); move(300, 550);
  const seg = sandbox.fingerSegment();
  assert(segEq(seg, 380, 707, 300, 557), 'G4: node line must be (380,707)-(300,557), got ' + JSON.stringify(seg));
  const landed = settle();
  assert(landed === upper, 'G4: node line must land on the upper platform, got ' + (landed && landed.row));
  console.log('[G4] mouse mounts a node line and lands on the upper platform: OK');
}
// G5: a node line kept on release is green, and its delete
// badge removes it
{
  const origin = { x1: 100, x2: 380, y: 700 };
  const upper = { x1: 250, x2: 380, y: 550 };
  setWorld([origin, upper], 150);
  press(100, 700); move(250, 550); release();
  assert(S.keptSeg && segEq(S.keptSeg, 100, 707, 250, 557), 'G5: node line must keep, got ' + JSON.stringify(S.keptSeg));
  assert(sandbox.keptLineWillLand(S.keptSeg) === true, 'G5: kept node line must be green');
  press(175, 625); // midpoint badge
  assert(S.keptSeg === null, 'G5: badge tap must delete the kept node line');
  release();
  console.log('[G5] kept node line is green and its badge deletes it: OK');
}
// G6 (Larry 2026-10-29: a line not fully connected to a node
// turns green): a node line whose far end floats short of a
// node is AMBER — live and kept — even though it would land via
// edge-snap/face tolerance. Amber is a warning, not a block:
// the same line still mounts and still lands. A fully
// node-connected line stays green.
{
  const origin = { x1: 100, x2: 380, y: 700 };
  const upper = { x1: 300, x2: 380, y: 550 };
  // (a) floating far: live amber, kept amber
  setWorld([origin, upper], 150);
  press(100, 700); move(335, 520); // far 46px from the nearest node — raw, not snapped
  let seg = sandbox.fingerSegment();
  assert(segEq(seg, 100, 707, 335, 520), 'G6a: floating-far node line must be (100,707)-(335,520), got ' + JSON.stringify(seg));
  assert(sandbox.lineWillLand(seg) === false, 'G6a: floating-far node line must be amber live');
  release();
  assert(S.keptSeg && S.keptSeg.node === true, 'G6a: kept node line must carry its node provenance');
  assert(sandbox.keptLineWillLand(S.keptSeg) === false, 'G6a: floating-far node line must be amber kept');
  // (b) amber still mounts and still lands (tolerance landing)
  setWorld([origin, upper], 100);
  press(100, 700); move(335, 520);
  seg = sandbox.fingerSegment();
  assert(sandbox.lineWillLand(seg) === false, 'G6b: floating-far node line must be amber before mounting');
  const landed = settle();
  assert(landed === upper, 'G6b: amber node line must still land on the upper platform, got ' + (landed && landed.row));
  // (c) fully node-connected stays green, live and kept
  setWorld([origin, upper], 150);
  press(100, 700); move(300, 550);
  seg = sandbox.fingerSegment();
  assert(segEq(seg, 100, 707, 300, 557), 'G6c: node-to-node must snap both ends, got ' + JSON.stringify(seg));
  assert(sandbox.lineWillLand(seg) === true, 'G6c: node-to-node must stay green live');
  release();
  assert(sandbox.keptLineWillLand(S.keptSeg) === true, 'G6c: node-to-node must stay green kept');
  console.log('[G6] floating-far node line amber (live + kept), still mounts/lands; node-to-node stays green: OK');
}
// G3 (last — it latches scrolling): a node-locked start rides
// the world down as it scrolls, x fixed, far end at the finger
{
  const origin = { x1: 100, x2: 380, y: 400, row: 1 };
  setWorld([origin], 150);
  press(100, 400); move(200, 300);
  let seg = sandbox.fingerSegment();
  assert(segEq(seg, 100, 407, 200, 300), 'G3: node line must start (100,400)-(200,300), got ' + JSON.stringify(seg));
  for (let i = 0; i < 5; i++) tick(); // 5 ticks, not 11: the
  // locked start rides down on the first tick (follow), and
  // at s=317 he would run off the platform's left edge
  // before 11 ticks (he steers left toward the line)
  seg = sandbox.fingerSegment();
  assert(seg && seg.ax === 100, 'G3: locked start x must not move, got ' + JSON.stringify(seg));
  assert(seg && seg.ay > 407, 'G3: locked start must ride the world down, got ' + JSON.stringify(seg));
  assert(seg && seg.bx === 200 && seg.by === 300, 'G3: far end must stay at the finger, got ' + JSON.stringify(seg));
  assert(S.mode === 'run' && S.surface === origin, 'G3: must keep running on his own platform');
  console.log('[G3] node-locked start rides scroll, far end at finger: OK');
}
// G7 (Larry 2026-11-02): a node turns green exactly when a
// green line snaps into it — live and kept — and stays orange
// when the snapped line is amber, or when it is only the start
// node of a green line.
{
  const origin = { x1: 120, x2: 400, y: 700 };
  const upper = { x1: 280, x2: 400, y: 550 };
  // (a) live green node-to-node: far node green, start node not
  setWorld([origin, upper], 150);
  press(120, 700); move(280, 550);
  let seg = sandbox.fingerSegment();
  assert(sandbox.lineWillLand(seg) === true, 'G7a: node-to-node line must be green');
  assert(T.greenNodes().includes('280,557'), 'G7a: far node of a green line must be green, got ' + JSON.stringify(T.greenNodes()));
  assert(!T.greenNodes().includes('120,707'), 'G7a: start node must stay orange');
  // (b) kept green line: far node stays green after release
  release();
  assert(T.greenNodes().includes('280,557'), 'G7b: far node of a kept green line must stay green');
  // (c) snapped but amber (same platform): far node stays orange
  const flat = { x1: 120, x2: 300, y: 700 };
  setWorld([flat], 150);
  press(120, 700); move(300, 700);
  seg = sandbox.fingerSegment();
  assert(sandbox.lineWillLand(seg) === false, 'G7c: same-platform node line must be amber');
  assert(!T.greenNodes().includes('300,707'), 'G7c: far node of an amber line must stay orange');
  console.log('[G7] green node on green snap (live + kept), orange on amber/start: OK');
}
// G8 (Larry 2026-11-02): snapping into a node flashes it once
// (~250ms), then it settles — no continuous flashing while the
// line stays snapped.
{
  const origin = { x1: 120, x2: 400, y: 700 };
  const upper = { x1: 280, x2: 400, y: 550 };
  setWorld([origin, upper], 150);
  for (let i = 0; i < 20; i++) tick(); // 320ms: expires any stale flash from the previous test (a single tick leaves it 16ms old)
  assert(T.getSnapFlash() === null, 'G8: no flash before any snap in this test');
  // Read the nodes' LIVE positions: G3 latched scrolling and
  // setWorld does not reset it, so these 20 ticks scrolled the
  // world ~38px down — fixed press coordinates would now miss
  // the nodes entirely (that was the first G8 failure).
  const nodes = T.nodes();
  const startNode = nodes.find(n => n.x === 120);
  const farNode = nodes.find(n => n.x === 280);
  press(startNode.x, startNode.y); move(farNode.x, farNode.y);
  tick();
  const flash = T.getSnapFlash();
  assert(flash && Math.round(flash.x) === Math.round(farNode.x) && Math.round(flash.y) === Math.round(farNode.y), 'G8: snap must set a flash on the far node, got ' + JSON.stringify(flash));
  for (let i = 0; i < 20; i++) tick(); // 320ms > 250ms flash
  assert(T.getSnapFlash() === null, 'G8: flash must expire after ~250ms');
  console.log('[G8] snap flash fires once and expires: OK');
}
// G9 (Larry 2026-11-02): ANY line's far end snaps into a
// node — not just node-locked lines. A start-locked line
// ending near a node snaps to it exactly (node wins over the
// B edge: B would give (280,550), the node gives (280,557)),
// turns the node green when green, and flashes it — and an
// amber snapped line still flashes but leaves the node orange.
{
  const row1 = { x1: 120, x2: 400, y: 700 };
  const row2 = { x1: 280, x2: 400, y: 550 };
  // (a) start-locked (NOT node-locked): press on the platform,
  // 80px from the node, then drag to within 7px of the far node
  setWorld([row1, row2], 150);
  press(200, 700); move(280, 550);
  let seg = sandbox.fingerSegment();
  assert(seg && seg.bx === 280 && seg.by === 557, 'G9a: far end must snap to the node (280,557), not the B edge (280,550) or raw finger, got ' + JSON.stringify(seg));
  assert(!seg.node, 'G9a: start-locked line must not carry node provenance');
  assert(sandbox.lineWillLand(seg) === true, 'G9a: start-locked node-snapped line must be green');
  assert(T.greenNodes().includes('280,557'), 'G9a: far node of a green snapped line must be green, got ' + JSON.stringify(T.greenNodes()));
  assert(T.log.join(' ').includes('SNAP far=(280,557)'), 'G9a: SNAP far= must log for a non-node line');
  const flash = T.getSnapFlash();
  assert(flash && Math.round(flash.x) === 280 && Math.round(flash.y) === 557, 'G9a: snap must flash the far node, got ' + JSON.stringify(flash));
  // (b) kept: far node stays green after release
  release();
  assert(T.greenNodes().includes('280,557'), 'G9b: far node of a kept green snapped line must stay green');
  // (c) unclimbable line must NOT snap: the vertical line is
  // too steep to climb (Larry 2026-11-05: only near-vertical
  // is unclimbable now), so the node snap must not fire at
  // all — no snap to the node, no SNAP log, no flash.
  // The far end stays on the B edge / raw finger (280,550).
  setWorld([row1, row2], 150);
  press(280, 700); move(280, 550);
  seg = sandbox.fingerSegment();
  assert(seg && seg.ax === 280 && seg.ay === 700 && seg.bx === 280 && seg.by === 550, 'G9c: vertical line far end must stay raw (280,550), not snap to the node, got ' + JSON.stringify(seg));
  assert(sandbox.lineWillLand(seg) === false, 'G9c: near-vertical line must be amber');
  assert(!T.greenNodes().includes('280,557'), 'G9c: far node of an unsnapped line must stay orange');
  // (d) amber-but-climbable line DOES still snap + flash: a
  // flat line to the same platform's own node is climbable
  // but lands nowhere new, so it stays amber while snapping.
  setWorld([row1, row2], 150);
  press(200, 700); move(120, 707);
  seg = sandbox.fingerSegment();
  assert(seg && seg.bx === 120 && seg.by === 707, 'G9d: climbable amber line far end must snap to the node (120,707), got ' + JSON.stringify(seg));
  assert(sandbox.lineWillLand(seg) === false, 'G9d: same-platform line must be amber');
  assert(!T.greenNodes().includes('120,707'), 'G9d: far node of an amber line must stay orange');
  assert(T.getSnapFlash() && Math.round(T.getSnapFlash().x) === 120 && Math.round(T.getSnapFlash().y) === 707, 'G9d: amber-but-climbable snap must still flash, got ' + JSON.stringify(T.getSnapFlash()));
  console.log('[G9] any-line far-node snap (node over B, green node, flash; unclimbable never snaps, climbable amber still flashes): OK');
}
// G10 (Larry 2026-11-02): B edge on a node-edge converts to
// the node. Finger 35px from the node (outside the 28px
// finger-node radius, inside B's 64px edge radius) B-snaps
// to the edge (250,550); the far end must then move onto
// the node (250,557) and turn it green — Larry's kept lines
// ended on edges 7px from their nodes, so no node went green.
{
  const lower = { x1: 0, x2: 390, y: 700 };
  const upper = { x1: 250, x2: 390, y: 550 };
  setWorld([lower, upper], 100);
  press(100, 700); move(285, 560);
  const seg = sandbox.fingerSegment();
  assert(seg && seg.bx === 250 && seg.by === 557, 'G10: B edge far end must convert onto the node (250,557), got ' + JSON.stringify(seg));
  assert(sandbox.lineWillLand(seg) === true, 'G10: converted line must be green');
  assert(T.greenNodes().includes('250,557'), 'G10: converted node must be green, got ' + JSON.stringify(T.greenNodes()));
  assert(T.log.join(' ').includes('SNAP far=(250,557)'), 'G10: conversion must log SNAP far=');
  console.log('[G10] B edge on a node-edge converts onto the node and turns it green: OK');
}
// G11 (Larry 2026-11-05, from his pasted log, revised by his
// "isn't vertical" ruling the same day): the node-to-node line
// at 77deg is climbable now, so it DOES snap — and he climbs
// it and lands on the upper row — but it stays amber, because
// the far end sits exactly on the platform's edge and the exit
// steps 4px past it (the guaranteed-landing rule, 2026-10-30;
// the helping hand still lands him safely, so this is a color
// question, not a fall). Snap and climbability are no longer
// the blockers; the edge-exit is. (Fresh loadGame: earlier
// tests in this file latch the scroll, and a scrolling world
// slides the upper platform into this screen-fixed far end.)
{
  const g11 = require('./harness').loadGame();
  const row9 = { x1: 1187, x2: 1307, y: 792 };
  const row10 = { x1: 1142, x2: 1307, y: 590 };
  g11.setWorld([row9, row10], 1250, 792, 1);
  g11.press(1189, 786); g11.move(1142, 597);
  const seg = g11.sandbox.fingerSegment();
  assert(seg && seg.ax === 1187 && seg.ay === 799, 'G11: node line must start locked to (1187,799), got ' + JSON.stringify(seg));
  assert(g11.T.log.join(' ').includes('SNAP far=(1142,597)'), 'G11: climbable 77deg node line must snap, got ' + JSON.stringify(g11.T.log));
  assert(g11.sandbox.lineWillLand(seg) === false, 'G11: edge-exit line must stay amber (exit lands beside the edge)');
  assert(!g11.T.greenNodes().includes('1142,597'), 'G11: far node of an amber line must stay orange');
  const landed = g11.settle(400);
  assert(landed === row10, 'G11: he must still climb the 77deg line and land on the upper row, got ' + (landed && landed.row));
  console.log('[G11] 77deg node-to-node line snaps and climbs (Larry log case, amber on the edge-exit): OK');
}
console.log('ALL GAME-NODE TESTS PASSED');

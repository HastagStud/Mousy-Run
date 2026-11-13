// Point-again rule (Jack 2026-10-26): drawing a line, then pointing
// on the screen again, must not make the line vanish. Two paths:
// (1) a second finger while one is held must be ignored entirely
// (first finger wins); (2) a quick tap must not replace a kept line
// before a real line is drawn (a new press commits by moving, or by
// being held ~200ms, i.e. a lay).
const { loadGame } = require('./harness');
const { sandbox, S, assert, tick, press, move, release, setWorld, fireCanvas } = loadGame();
const lower = { x1: 0, x2: 390, y: 700 };
const upper = { x1: 0, x2: 390, y: 550 };
const pdown = (id, x, y) => fireCanvas('pointerdown', { pointerId: id, pointerType: 'touch', clientX: x, clientY: y, width: 97, height: 97 });
const pmove = (id, x, y) => fireCanvas('pointermove', { pointerId: id, pointerType: 'touch', clientX: x, clientY: y, width: 97, height: 97 });
const pup = (id) => fireCanvas('pointerup', { pointerId: id });
const tstart = (id, x, y) => fireCanvas('touchstart', { changedTouches: [{ identifier: id, clientX: x, clientY: y, radiusX: 48, radiusY: 48, rotationAngle: 0 }] });

// P1: second finger while drawing is ignored; first finger's line
// survives the second finger's down/move/up, then keeps on release.
{
  setWorld([lower, upper], 100);
  tstart(1, 150, 700); // iOS order: touchstart precedes pointerdown
  pdown(1, 150, 700);
  pmove(1, 300, 550); // traj line (150,700)-(300,550)
  const first = sandbox.fingerSegment();
  assert(first && first.ax === 150 && first.bx === 300, 'P1: first line must be drawn');
  // traj segments are rebuilt per call, so compare values, not identity
  const sameLine = () => { const s = sandbox.fingerSegment(); return s && s.ax === 150 && s.ay === 700 && s.bx === 300 && s.by === 550; };
  tstart(2, 50, 500); // second finger's touch: ignored
  assert(S.finger && S.finger.x === 300, 'P1: second touch must not move the first finger');
  pdown(2, 200, 600); // second finger's down: ignored
  assert(sameLine(), 'P1: second down must not replace the line');
  pmove(2, 250, 550); // second finger's move: ignored
  assert(sameLine(), 'P1: second move must not move the line');
  pup(2); // second finger's up: ignored, first finger still held
  assert(S.finger, 'P1: second up must not release the first finger');
  assert(sameLine(), 'P1: line must survive the second finger lifting');
  pup(1); // first finger lifts: line keeps
  assert(S.keptSeg && S.keptSeg.ax === 150 && S.keptSeg.bx === 300, 'P1: first line must keep after the first finger lifts');
  console.log('[P1] second finger ignored, first line survives: OK');
}

// P2: a point — quick tap OR held lay (oval patch, no movement) —
// must never replace a kept line. Only point+drag creates a line.
{
  setWorld([lower, upper], 100);
  press(150, 700); move(300, 550); release(); // kept line (150,700)-(300,550)
  assert(S.keptSeg && S.keptSeg.ax === 150 && S.keptSeg.bx === 300, 'P2: kept line must exist');
  sandbox.press(100, 600, 48, 30, 0, false); // tap, oval patch -> live patch segment
  assert(sandbox.fingerSegment() === S.keptSeg, 'P2: tap must not replace the kept line');
  assert(S.keptSeg.ax === 150, 'P2: kept line must stay intact during the tap');
  sandbox.release(); // quick tap lifts: kept line survives
  assert(S.keptSeg && S.keptSeg.ax === 150 && S.keptSeg.bx === 300, 'P2: kept line must survive a quick tap');
  sandbox.press(100, 600, 48, 30, 0, false); // same patch, now held (a lay)
  for (let i = 0; i < 30; i++) tick(); // held well past any commit window
  assert(sandbox.fingerSegment() === S.keptSeg, 'P2: held point must not replace the kept line either');
  assert(S.keptSeg.ax === 150 && S.keptSeg.bx === 300, 'P2: kept line must survive a held point');
  sandbox.release();
  assert(S.keptSeg && S.keptSeg.ax === 150 && S.keptSeg.bx === 300, 'P2: kept line must survive the held point lifting');
  console.log('[P2] point (tap or held) never replaces the kept line: OK');
}

// P3: a mouse drag adds a second line immediately (movement commits)
// — under the two-line rule it no longer replaces the kept line.
{
  setWorld([lower, upper], 100);
  press(150, 700); move(300, 550); release();
  assert(S.keptSeg, 'P3: kept line must exist');
  press(100, 650); move(250, 500); // drag >= 40px: committed at once
  const seg = sandbox.fingerSegment();
  assert(seg && seg.ax === 100 && seg.bx === 250, 'P3: drag must draw the new line immediately');
  assert(S.keptSeg && S.keptSeg.ax === 150 && S.keptSeg.bx === 300, 'P3: kept line must survive the drag (drag adds, not replaces)');
  console.log('[P3] drag adds a second line immediately, kept line stays: OK');
}
// T2: drawing a new line while he climbs one must not teleport him
// onto it: the old line is gone, so he falls instead of snapping
// to the new line's height at his x.
{
  setWorld([lower, upper], 100);
  press(150, 700); move(300, 550); // line A
  let climbing = false;
  for (let i = 0; i < 30; i++) {
    tick();
    if (S.surface && S.surface.type === 'finger') { climbing = true; break; }
  }
  assert(climbing, 'T2: must be climbing line A first');
  for (let i = 0; i < 20; i++) tick(); // partway up A
  const yBefore = S.y;
  assert(yBefore < 700 && yBefore > 600, 'T2: must be mid-climb (got y=' + yBefore + ')');
  press(100, 400); move(200, 300); // new press drags line B, far above
  tick();
  assert(S.mode === 'fall', 'T2: replacing his line must drop him, not move him along the new line');
  assert(S.y > 600, 'T2: he must fall from where he was, not snap to the new line (y=' + S.y + ')');
  let landed = false;
  for (let i = 0; i < 300; i++) {
    tick();
    if (S.mode === 'run' && S.surface === lower) { landed = true; break; }
  }
  assert(landed && S.y === 700, 'T2: he must land back on his ledge, not on the new line');
  console.log('[T2] new line while climbing drops him instead of teleporting: OK');
}
console.log('ALL POINT TESTS PASSED');

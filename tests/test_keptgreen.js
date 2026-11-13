// Kept-line green (Jack 2026-10-28): a kept line stays green
// if the LINE itself is good — climbable, touching a platform
// (its own embark anchor), crossing nothing, far end landing
// somewhere new from that anchor — even after he moves to a
// platform it does not connect to. The live line's green stays
// lineWillLand ("can I mount it from here").
const { loadGame } = require('./harness');
const { sandbox, T, S, assert, press, move, release, setWorld } = loadGame();
const lastRelease = () => T.log.filter(l => l.includes('RELEASE')).pop();
const toGround = () => { S.surface = { type: 'ground' }; S.x = 200; S.y = T.groundY; S.mode = 'run'; S.dir = 1; };

// K1: a good kept line stays green after he moves to the ground,
// where lineWillLand (from his position) goes amber
{
  const origin = { x1: 100, x2: 390, y: 700, row: 1 };
  const upper = { x1: 250, x2: 390, y: 550, row: 2 };
  setWorld([origin, upper], 100);
  press(100, 700); move(260, 560); release();
  assert(S.keptSeg && S.keptSeg.ax === 100, 'K1: line must be kept');
  assert(T.lineWillLand(S.keptSeg), 'K1: line must be green from its embark platform before the move');
  assert(T.keptLineWillLand(S.keptSeg), 'K1: line must be kept-green before the move');
  assert(lastRelease().includes('green=true'), 'K1: release log must print the kept green');
  toGround();
  assert(T.keptLineWillLand(S.keptSeg), 'K1: line must STAY kept-green after moving to the ground');
  assert(!T.lineWillLand(S.keptSeg), 'K1: the same line must be amber from the ground (not connected there)');
  console.log('[K1] good kept line stays green after moving away: OK');
}
// K2: the same property for the REPLACEMENT line (one line:
// a second draw replaces the first, and the replacement stays
// kept-green after moving away)
{
  const origin = { x1: 100, x2: 390, y: 700, row: 1 };
  const upper = { x1: 250, x2: 390, y: 550, row: 2 };
  setWorld([origin, upper], 100);
  press(100, 700); move(260, 560); release();
  press(150, 700); move(300, 560); release();
  assert(S.keptSeg && S.keptSeg.ax === 150, 'K2: replacement line must be kept, got ' + JSON.stringify(S.keptSeg));
  assert(!S.keptSeg2, 'K2: there must be no second kept line');
  toGround();
  assert(T.keptLineWillLand(S.keptSeg), 'K2: replacement line must stay kept-green after moving to the ground');
  assert(!T.lineWillLand(S.keptSeg), 'K2: replacement line must be amber from the ground');
  console.log('[K2] replacement line stays green after moving away: OK');
}
// K3: a kept line whose far end lands nowhere stays amber,
// and the release log prints that
{
  const origin = { x1: 0, x2: 150, y: 700, row: 1 };
  const upper = { x1: 300, x2: 430, y: 550, row: 2 };
  setWorld([origin, upper], 50);
  press(50, 700); move(200, 550); release();
  assert(S.keptSeg && S.keptSeg.ax === 50 && S.keptSeg.bx === 200, 'K3: line must be kept as drawn, got ' + JSON.stringify(S.keptSeg));
  assert(!T.keptLineWillLand(S.keptSeg), 'K3: a line landing nowhere must be amber even though it is connected and climbable');
  assert(lastRelease().includes('green=false'), 'K3: release log must print the kept amber');
  console.log('[K3] far end landing nowhere stays amber: OK');
}
// K4: a kept line that runs through platforms stays amber —
// every embark option is blocked by another platform it crosses
{
  const origin = { x1: 0, x2: 390, y: 700, row: 1 };
  const mid1 = { x1: 150, x2: 250, y: 600, row: 2 };
  const mid2 = { x1: 250, x2: 350, y: 550, row: 3 };
  setWorld([origin, mid1, mid2], 100);
  press(100, 700); move(300, 500); release();
  assert(S.keptSeg && S.keptSeg.ax === 100 && S.keptSeg.bx === 300, 'K4: line must be kept as drawn, got ' + JSON.stringify(S.keptSeg));
  assert(!T.keptLineWillLand(S.keptSeg), 'K4: a line crossing platforms must be amber (no embark option reaches its far end)');
  console.log('[K4] crossing line stays amber: OK');
}
// K5: a kept line whose far end only drops back onto its embark
// platform stays amber (lands somewhere NEW is still required)
{
  const origin = { x1: 0, x2: 390, y: 700, row: 1 };
  setWorld([origin], 100);
  press(100, 700); move(200, 600); release();
  assert(S.keptSeg && S.keptSeg.ax === 100 && S.keptSeg.bx === 200, 'K5: line must be kept as drawn, got ' + JSON.stringify(S.keptSeg));
  assert(!T.keptLineWillLand(S.keptSeg), 'K5: a drop-back onto the embark platform must be amber');
  console.log('[K5] drop-back onto the embark platform stays amber: OK');
}
console.log('ALL KEPT-GREEN TESTS PASSED');

// Green means lands (Jack 2026-10-27): the three landing paths that
// used to predict amber now predict green AND actually land when run
// — the prediction and the exit use the same shared check, so they
// cannot disagree.
const { loadGame } = require('./harness');
const { sandbox, S, assert, press, move, setWorld, settle } = loadGame();
const lower = { x1: 0, x2: 390, y: 700 };
// L1: snap — far end 20px short of the edge, predicts green, lands
{
  const upperFar = { x1: 360, x2: 390, y: 550 };
  setWorld([lower, upperFar], 100); press(150, 700); move(340, 550);
  assert(sandbox.lineWillLand(sandbox.fingerSegment()) === true, 'L1: snap line must predict green');
  const landed = settle();
  assert(landed === upperFar && S.y === 550, 'L1: snap line must land on the upper platform');
  console.log('[L1] snap line predicts green and lands: OK');
}
// L2: drop — far end high above a platform, predicts green, drops onto it
{
  const narrow = { x1: 180, x2: 230, y: 640 };
  setWorld([lower, narrow], 50); press(100, 700); move(200, 560);
  assert(sandbox.lineWillLand(sandbox.fingerSegment()) === true, 'L2: drop line must predict green');
  const landed = settle();
  assert(landed === narrow && S.y === 640, 'L2: drop line must land on the platform below');
  console.log('[L2] drop line predicts green and lands: OK');
}
// L3: step-up — far end 30px above the top, predicts green, steps on
{
  const over = { x1: 150, x2: 300, y: 550 };
  setWorld([lower, over], 30); press(50, 700); move(160, 520);
  assert(sandbox.lineWillLand(sandbox.fingerSegment()) === true, 'L3: step-up line must predict green');
  const landed = settle();
  assert(landed === over && S.y === 550, 'L3: step-up line must land on the platform');
  console.log('[L3] step-up line predicts green and lands: OK');
}
console.log('ALL GREEN-LANDING TESTS PASSED');

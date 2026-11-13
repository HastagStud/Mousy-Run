// Face counts (Larry 2026-10-26): a downward line ending on a
// platform's face lands on it; ending below the face falls through.
const { loadGame } = require('./harness');
const { sandbox, S, assert, press, move, setWorld, settle } = loadGame();
const origin = { x1: 0, x2: 390, y: 500 };
const target = { x1: 150, x2: 300, y: 550 };
// F2: downward line ending on the face lands (no crossing drop)
{
  setWorld([origin, target], 50);
  press(100, 500); move(200, 560);
  const landed = settle();
  assert(landed === target && S.y === 550, 'F2: downward face-ending line must land on the target');
  console.log('[F2] downward line ending on the face lands (no crossing drop): OK');
}
// F3: downward face-ending line predicts green (it lands on a
// new platform; horizontal and downward moves count)
{
  setWorld([origin, target], 50);
  press(100, 500); move(200, 560);
  assert(sandbox.lineWillLand(sandbox.fingerSegment()) === true, 'F3');
  console.log('[F3] downward face-ending line predicts green: OK');
}
// F4: downward line ending below the face falls to the ground
{
  setWorld([origin, target], 50);
  press(100, 500); move(200, 580);
  const landed = settle();
  assert(landed && landed.type === 'ground' && S.y === 800, 'F4: below-face line must fall to the ground');
  console.log('[F4] downward line ending below the face falls to the ground: OK');
}
console.log('ALL FACE TESTS PASSED');

// Drop rule: a far end over a platform but too high to step on drops
// vertically onto the nearest platform below the far end; far ends
// over open air fall normally.
const { loadGame } = require('./harness');
const { S, assert, press, move, setWorld, settle } = loadGame();
const lower = { x1: 0, x2: 390, y: 700 };
function run(plats, a, b) {
  setWorld(plats, 50);
  press(a[0], a[1]); move(b[0], b[1]);
  return settle();
}
// P1: 80px above a 50px-wide platform lands centre
{
  const narrow = { x1: 180, x2: 230, y: 640 };
  const landed = run([lower, narrow], [100, 700], [200, 560]);
  assert(landed === narrow && S.y === 640 && S.x === 200, 'P1: drop must land centre of the narrow platform');
  console.log('[P1] drop onto narrow platform below the far end: OK');
}
// P2: 10px-short drops onto the nearest edge
{
  const edgePlat = { x1: 210, x2: 300, y: 640 };
  const landed = run([lower, edgePlat], [100, 700], [200, 560]);
  assert(landed === edgePlat && S.y === 640 && S.x === 210, 'P2: edge drop must land on the nearest edge');
  console.log('[P2] edge drop lands on the nearest edge: OK');
}
// P3: far end over open air falls normally to the ground
{
  const short = { x1: 0, x2: 120, y: 700 };
  const landed = run([short], [100, 700], [200, 560]);
  assert(landed && landed.type === 'ground' && S.y === 800, 'P3: open-air far end must fall to the ground');
  console.log('[P3] far end over open air falls normally to the ground: OK');
}
console.log('ALL DROP TESTS PASSED');

// Soft rounded clouds (Jack 2026-11-06): decoration only — they
// drift slowly left in screen space, wrap around, and never touch
// gameplay (no collision, no scroll/follow).
const { loadGame } = require('./harness');
const { T, S, assert, tick, press, move, release, setWorld, settle } = loadGame();

// C1: clouds exist, on screen, soft white, slow.
{
  assert(T.clouds.length >= 3, 'C1: at least 3 clouds, got ' + T.clouds.length);
  for (const c of T.clouds){
    assert(c.y > 0 && c.y < 844, 'C1: cloud y must be on screen, got ' + c.y);
    assert(c.a > 0 && c.a <= 1, 'C1: cloud alpha must be a soft white, got ' + c.a);
    assert(c.v > 0 && c.v <= 20, 'C1: cloud drift must be slow, got ' + c.v);
  }
  console.log('[C1] clouds exist, on screen, soft and slow: OK');
}

// C2: clouds drift left over time (positions pinned first so no
// wrap can hide the drift).
{
  T.clouds.forEach((c, i) => { c.x = 200 + i * 10; });
  const before = T.clouds.map(c => c.x);
  for (let i = 0; i < 60; i++) tick(); // ~1s
  T.clouds.forEach((c, i) => {
    assert(c.x < before[i], 'C2: cloud ' + i + ' must drift left, was ' + before[i] + ' now ' + c.x);
    assert(c.x > 0, 'C2: cloud ' + i + ' must not have wrapped yet, got ' + c.x);
  });
  console.log('[C2] clouds drift left: OK');
}

// C3: a cloud that drifts off the left wraps back to the right.
{
  const c = T.clouds[0];
  c.x = -200;
  tick();
  assert(c.x > 390, 'C3: wrapped cloud must reappear right of the screen, got ' + c.x);
  console.log('[C3] off-screen cloud wraps around: OK');
}

// C4: clouds never touch gameplay — a real climb still lands.
{
  setWorld([{ x1: 0, x2: 390, y: 800 }, { x1: 0, x2: 390, y: 608, row: 1 }], 100);
  press(150, 800); move(300, 608); release();
  const landed = settle();
  assert(landed && landed.row === 1, 'C4: climb must still land on row 1 with clouds present');
  console.log('[C4] gameplay unaffected by clouds: OK');
}
console.log('ALL CLOUD TESTS PASSED');

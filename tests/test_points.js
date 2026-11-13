// Point gathering (Jack 2026-11-06, Flappy-style): landing on a row
// above earns the rows gained (1 above = 1, 2 above = 2 — bypassed
// rows count), each row counts only once, so points = highest row
// reached. The big top-center number shows points and pops on gain.
const { loadGame } = require('./harness');
const { sandbox, T, S, assert, tick, press, move, release, setWorld, settle } = loadGame();
const pointsEl = () => sandbox.document.getElementById('pointsNum');
const pointLogs = () => T.log.filter(l => l.includes('POINT'));

// P1: landing on row 1 earns 1 point, number shows it.
{
  S.mode = 'run'; S.x = 100; S.y = 700; S.dir = 1;
  S.surface = { x1: 0, x2: 390, y: 700, row: 1 };
  tick();
  assert(T.points === 1, 'P1: points must be 1 after landing on row 1, got ' + T.points);
  assert(T.bestRow === 1, 'P1: bestRow must be 1');
  assert(String(pointsEl().textContent) === '1', 'P1: big number must show 1, got ' + pointsEl().textContent);
  assert(pointLogs().length === 1 && pointLogs()[0].includes('+1'), 'P1: log must record POINT +1, got ' + pointLogs());
  console.log('[P1] landing on row 1 earns 1 point, number shows 1: OK');
}

// P2: landing two rows up earns 2 (bypass counts).
{
  S.mode = 'run'; S.x = 100; S.y = 500; S.dir = 1;
  S.surface = { x1: 0, x2: 390, y: 500, row: 3 };
  tick();
  assert(T.points === 3, 'P2: points must be 3 after landing on row 3, got ' + T.points);
  assert(String(pointsEl().textContent) === '3', 'P2: big number must show 3');
  assert(pointLogs().length === 2 && pointLogs()[1].includes('+2'), 'P2: log must record POINT +2, got ' + pointLogs());
  console.log('[P2] landing two rows up earns 2, bypass counts: OK');
}

// P3: falling back and re-climbing earns nothing.
{
  const n = pointLogs().length;
  S.mode = 'run'; S.x = 100; S.y = 700; S.dir = 1;
  S.surface = { x1: 0, x2: 390, y: 700, row: 1 };
  tick();
  assert(T.points === 3, 'P3: points must stay 3 after falling back to row 1, got ' + T.points);
  assert(pointLogs().length === n, 'P3: no new POINT log on a re-climb');
  console.log('[P3] re-climbing a counted row earns nothing: OK');
}

// P4: same row again earns nothing.
{
  const n = pointLogs().length;
  S.mode = 'run'; S.x = 100; S.y = 500; S.dir = 1;
  S.surface = { x1: 0, x2: 390, y: 500, row: 3 };
  tick();
  assert(T.points === 3, 'P4: points must stay 3 on the same row');
  assert(pointLogs().length === n, 'P4: no new POINT log on the same row');
  console.log('[P4] same row again earns nothing: OK');
}

// P5: end to end — a real climb from the ground to row 1 earns 1.
{
  const g2 = loadGame();
  const S2 = g2.S, T2 = g2.T;
  g2.setWorld([{ x1: 0, x2: 390, y: 800 }, { x1: 0, x2: 390, y: 608, row: 1 }], 100);
  g2.press(150, 800); g2.move(300, 608); g2.release();
  const landed = g2.settle();
  assert(landed && landed.row === 1, 'P5: must land on row 1');
  assert(T2.points === 1, 'P5: real climb to row 1 must earn 1 point, got ' + T2.points);
  assert(String(g2.sandbox.document.getElementById('pointsNum').textContent) === '1', 'P5: big number must show 1');
  console.log('[P5] real climb earns its point: OK');
}

// P6: a gain bursts six gold sparkles from the number, cleared on finish.
// The harness stubs document without createElement and elements without
// appendChild, so the test patches both with recording fakes first.
{
  const g3 = loadGame();
  const numEl = g3.sandbox.document.getElementById('pointsNum');
  const sparks = [];
  const anims = [];
  g3.sandbox.document.createElement = (tag) => {
    const s = { tag, className: '', removed: false,
      animate: () => { const a = { onfinish: null }; anims.push(a); return a; },
      remove(){ this.removed = true; } };
    sparks.push(s);
    return s;
  };
  numEl.appendChild = (c) => { numEl._kids = numEl._kids || []; numEl._kids.push(c); };
  const S3 = g3.S, T3 = g3.T;
  S3.mode = 'run'; S3.x = 100; S3.y = 700; S3.dir = 1;
  S3.surface = { x1: 0, x2: 390, y: 700, row: 1 };
  g3.tick();
  assert(T3.points === 1, 'P6: points must be 1');
  assert(sparks.length === 6, 'P6: a gain must burst 6 sparkles, got ' + sparks.length);
  assert(sparks.every(s => s.className === 'spark'), 'P6: sparkles must carry the spark class');
  assert((numEl._kids || []).length === 6, 'P6: sparkles must be appended to the number');
  for (const a of anims) if (a.onfinish) a.onfinish();
  assert(sparks.every(s => s.removed), 'P6: finished sparkles must be removed');
  console.log('[P6] gain bursts 6 sparkles, cleared on finish: OK');
}
console.log('ALL POINTS TESTS PASSED');

// Endless: capped generator (per-row worst travel <= s*h/a), scroll
// activation + world shift, death below the screen.
const { loadGame } = require('./harness');
const { T, S, assert, tick, setWorld } = loadGame();
// [1] generator, 5000 rows
{
  T.buildWorld();
  let prevGaps = [{ c: 70, w: 100 }];
  let topY = T.groundY;
  let violations = 0, fallbacks = 0, minGap = Infinity, minSeg = Infinity;
  for (let i = 0; i < 5000; i++) {
    const row = T.genRow(prevGaps, topY, i + 1);
    const h = topY - row.y;
    const limit = T.CFG.speed * h / T.curA; // generator budget s*h/a (= L, constant under the ramp)
    if (T.worstTravel(prevGaps, row.gaps, h) > limit + 1e-9) violations++;
    if (JSON.stringify(row.gaps) === JSON.stringify(prevGaps)) fallbacks++;
    for (const g of row.gaps) minGap = Math.min(minGap, g.w);
    // internal segments only (each followed by a gap): the trailing
    // segment after the last gap can legitimately be short
    let cur = 0;
    for (const g of row.gaps) {
      const left = g.c - g.w / 2;
      if (left > cur + 1) minSeg = Math.min(minSeg, left - cur);
      cur = Math.max(cur, g.c + g.w / 2);
    }
    prevGaps = row.gaps; topY = row.y;
  }
  assert(violations === 0, 'endless: cap violations must be 0 (got ' + violations + ')');
  assert(minGap >= 100, 'endless: min gap must be >= 100 (got ' + minGap + ')');
  assert(minSeg >= 60, 'endless: min segment must be >= 60 (got ' + minSeg + ')');
  console.log('[1] JS generator, 5000 rows: violations=0 fallbacks=' + fallbacks + ' minGap=' + minGap + ' minSeg=' + minSeg);
}
// [2] scroll activation + capped world speed + no top death
{
  T.buildWorld();
  assert(!T.scrolling, 'endless: scrolling must start off');
  // scroll starts when he gets onto row 1 (Jack 2026-11-09) —
  // not at mid-screen. Stand on a row-1 platform (well below
  // mid-screen) and it starts on the first tick.
  const row1 = { x1: 0, x2: T.getW(), y: T.getH() - 100, row: 1 };
  S.x = 100; S.y = row1.y; S.surface = row1; S.mode = 'run'; S.dir = 1; S.vy = 0;
  tick();
  assert(T.scrolling, 'endless: reaching row 1 must start scrolling');
  // Cap (Jack 2026-11-09): the world never moves faster than
  // the current ramp speed (curA). Rise above mid-screen and the
  // world shifts down by the scroll alone — no follow shove —
  // and he stays above the middle instead of being pulled back
  // to it.
  const gyBefore = T.groundY;
  const higher = { x1: 0, x2: T.getW(), y: T.getH() / 2 - 50 };
  S.surface = higher; S.y = higher.y; // rise above mid-screen
  tick();
  const shift = T.groundY - gyBefore;
  assert(Math.abs(shift - T.curA * 0.016) < 1e-6, 'endless: world must shift by the scroll alone above mid-screen, got ' + shift);
  assert(S.y < T.getH() / 2, 'endless: he must stay above the middle with the follow capped');
  // No top death: rising off the top is not the end of the run.
  S.mode = 'fall'; S.y = -20;
  tick();
  assert(S.mode !== 'lost', 'endless: going off the top must not end the run');
  // Death still works once the ground has scrolled off the
  // bottom — while the ground is still on screen it catches
  // him (line 1610), so scroll it past the screen first.
  for (let i = 0; i < 60; i++) tick();
  assert(T.groundY > T.getH(), 'endless: ground must scroll off the bottom (got ' + T.groundY + ')');
  S.mode = 'fall'; S.y = T.getH() + 100; // fall below the screen
  tick();
  assert(S.mode === 'lost', 'endless: falling below the screen must end the run');
  console.log('[2] scroll activation + capped world speed + no top death: OK');
}
console.log('ALL HARNESS TESTS PASSED');

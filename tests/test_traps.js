// Mouse traps (Jack 2026-11-09, death on touch): a trap is a
// hazard on a platform. Touching it ends the run. At most one
// per row, only on some rows, never in the first few, and only
// on a segment long enough to leave a way past. A line that
// would land him on a trap is amber, never green. Ramping over
// one is safe.
const { loadGame } = require('./harness');
const { sandbox, T, S, assert, tick, press, move, release, setWorld, settle } = loadGame();

// [1] generation: at most one trap per row, none before
// TRAP_MIN_ROW, only on segments >= TRAP_MIN_SEG with the trap
// TRAP_EDGE clear of both ends, and present but not on every row.
{
  T.platforms.length = 0; T.rows.length = 0;
  let prevGaps = [{ c: 70, w: 100 }];
  let topY = T.groundY;
  for (let i = 0; i < 2000; i++){
    const row = T.genRow(prevGaps, topY, i + 1);
    prevGaps = row.gaps; topY = row.y;
  }
  const perRow = {};
  let trappedRows = 0, totalRows = 2000, violations = 0;
  for (const p of T.platforms){
    if (p.trapX === undefined || p.trapX === null) continue;
    perRow[p.row] = (perRow[p.row] || 0) + 1;
    if (p.row < T.TRAP_MIN_ROW) violations++;
    if (p.x2 - p.x1 < T.TRAP_MIN_SEG) violations++;
    if (p.trapX < p.x1 + T.TRAP_EDGE || p.trapX > p.x2 - T.TRAP_EDGE) violations++;
  }
  for (const r of Object.keys(perRow)){
    if (perRow[r] > 1) violations++;
    else trappedRows++;
  }
  const rate = trappedRows / totalRows;
  assert(violations === 0, 'traps: placement violations must be 0 (got ' + violations + ')');
  assert(rate > 0.05 && rate < 0.45, 'traps: trap rate must be present but not on every row, got ' + rate.toFixed(3));
  console.log('[1] generation: trapped rows=' + trappedRows + '/2000 rate=' + rate.toFixed(3) + ' violations=0: OK');
}
// [2] death on touch: running into a trap ends the run.
{
  const plat = { x1: 0, x2: 390, y: 700, trapX: 200 };
  setWorld([plat], 100); // start at x=100, running right toward the trap at 200
  const logBefore = T.log.length;
  let died = false;
  for (let i = 0; i < 200; i++){
    tick();
    if (S.mode === 'lost'){ died = true; break; }
  }
  assert(died, 'traps: running into a trap must end the run');
  assert(T.log.slice(logBefore).join('\n').includes('reason=trap'), 'traps: trap death must log DEATH reason=trap');
  console.log('[2] running into a trap ends the run: OK');
}
// [3] ramping over a trap is safe: he climbs over it and lands past it.
{
  const origin = { x1: 0, x2: 390, y: 700, trapX: 200 };
  const upper = { x1: 0, x2: 390, y: 508 };
  setWorld([origin, upper], 50); // start left of the foot so he mounts from the correct side
  press(100, 700); move(300, 508); // ramp over the trap (at 200) to the upper platform
  const logBefore = T.log.length;
  const landed = settle(400);
  assert(landed === upper, 'traps: must land on the upper platform, got ' + JSON.stringify(landed));
  assert(S.mode === 'run', 'traps: ramping over a trap must not kill him');
  assert(!T.log.slice(logBefore).join('\n').includes('reason=trap'), 'traps: no trap death while ramping over');
  console.log('[3] ramping over a trap is safe: OK');
}
// [4] green: a line landing on a trap is amber; beside it is green.
{
  const origin = { x1: 0, x2: 390, y: 700 };
  const upper = { x1: 0, x2: 390, y: 508, trapX: 200 };
  // far end on the trap -> amber
  setWorld([origin, upper], 100);
  press(100, 700); move(200, 508);
  assert(sandbox.lineWillLand(sandbox.fingerSegment()) === false, 'traps: a line landing on a trap must be amber');
  // far end beside the trap (same platform) -> green
  setWorld([origin, upper], 100);
  press(100, 700); move(300, 508);
  assert(sandbox.lineWillLand(sandbox.fingerSegment()) === true, 'traps: a line landing beside a trap must be green');
  console.log('[4] a trap landing is amber, beside it is green: OK');
}
// [5] exiting onto a trap ends the run (amber lines still mount).
{
  const origin = { x1: 0, x2: 390, y: 700 };
  const upper = { x1: 0, x2: 390, y: 508, trapX: 200 };
  setWorld([origin, upper], 50); // start left of the foot so he mounts from the correct side
  press(100, 700); move(200, 508); // ramp ending on the trap
  const logBefore = T.log.length;
  let died = false;
  for (let i = 0; i < 400; i++){
    tick();
    if (S.mode === 'lost'){ died = true; break; }
  }
  assert(died, 'traps: exiting onto a trap must end the run');
  assert(T.log.slice(logBefore).join('\n').includes('reason=trap'), 'traps: trap death must be logged');
  console.log('[5] exiting onto a trap ends the run: OK');
}
// [6] kept green: a kept line whose landings are traps both ways is amber.
{
  const origin = { x1: 0, x2: 390, y: 700, trapX: 100 };
  const upper = { x1: 0, x2: 390, y: 508, trapX: 200 };
  setWorld([origin, upper], 150); // start clear of the origin trap (kill zone 55-145)
  press(100, 700); move(200, 508); release();
  const kept = S.keptSeg;
  assert(kept, 'traps: must have a kept line');
  assert(T.keptLineWillLand(kept) === false, 'traps: a kept line landing on traps both ways must be amber');
  console.log('[6] a kept trap landing is amber: OK');
}
console.log('ALL TRAP TESTS PASSED');

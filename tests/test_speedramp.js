// Speed ramp (Jack 2026-11-09): the game speeds up as he
// climbs — the scroll gains RAMP_PER_ROW for every row
// reached, up to RAMP_MAX_A, and the mouse speed follows the
// formula (s = a*L/h), so the climb timing stays right and
// the generator budget (s*h/a = L) never changes.
const { loadGame } = require('./harness');
const { sandbox, T, S, assert, tick, press, move, release, setWorld, settle } = loadGame();
const speedLogs = () => T.log.filter(l => l.includes('SPEED'));

// [R1] base speed: a fresh run starts at 60 / 136
{
  assert(T.curA === 60, 'ramp: curA must start at 60, got ' + T.curA);
  assert(T.CFG.speed === 136, 'ramp: mouse speed must start at 136, got ' + T.CFG.speed);
  assert(T.bestRow === 0 && T.points === 0, 'ramp: bestRow/points must start at 0');
  console.log('[R1] base speed is 60 / 136: OK');
}
// [R2] climbing to row 5 steps the speed up (a=70, s=159) and logs it
{
  const origin = { x1: 0, x2: 390, y: 700, row: 1 };
  const upper = { x1: 0, x2: 390, y: 508, row: 5 };
  setWorld([origin, upper], 100);
  S.surface = upper; S.y = upper.y; S.mode = 'run'; S.dir = 1;
  tick();
  assert(T.bestRow === 5, 'ramp: bestRow must be 5, got ' + T.bestRow);
  assert(T.curA === 70, 'ramp: curA must be 70 at row 5, got ' + T.curA);
  const expectS = Math.round(70 * T.SPEED_RATIO);
  assert(T.CFG.speed === expectS, 'ramp: mouse speed must be ' + expectS + ' at a=70, got ' + T.CFG.speed);
  const logs = speedLogs();
  assert(logs.length === 1 && logs[0].includes('a=70') && logs[0].includes('rows=5'), 'ramp: must log SPEED a=70 rows=5, got ' + logs);
  console.log('[R2] row 5 steps the speed to 70 / ' + expectS + ': OK');
}
// [R3] the speed caps at 90 (mouse ~205) and stays there
{
  const origin = { x1: 0, x2: 390, y: 700, row: 1 };
  const high = { x1: 0, x2: 390, y: 300, row: 20 };
  setWorld([origin, high], 100);
  S.surface = high; S.y = high.y; S.mode = 'run'; S.dir = 1;
  tick();
  assert(T.curA === 90, 'ramp: curA must cap at 90, got ' + T.curA);
  const expectS = Math.round(90 * T.SPEED_RATIO);
  assert(T.CFG.speed === expectS, 'ramp: mouse speed must cap at ' + expectS + ', got ' + T.CFG.speed);
  const n = speedLogs().length;
  const higher = { x1: 0, x2: 390, y: 100, row: 25 };
  S.surface = higher; S.y = higher.y;
  tick();
  assert(T.curA === 90, 'ramp: curA must stay 90 past row 20, got ' + T.curA);
  assert(T.CFG.speed === expectS, 'ramp: mouse speed must stay ' + expectS + ' past row 20');
  assert(speedLogs().length === n, 'ramp: no new SPEED log once capped');
  console.log('[R3] speed caps at 90 / ' + expectS + ' and stays there: OK');
}
// [R4] a fresh run (resetRun / buildWorld) restarts at base speed
{
  T.resetRun();
  assert(T.curA === 60 && T.CFG.speed === 136, 'ramp: resetRun must restore 60 / 136, got ' + T.curA + ' / ' + T.CFG.speed);
  assert(T.bestRow === 0 && T.points === 0, 'ramp: resetRun must clear bestRow/points');
  T.buildWorld();
  assert(T.curA === 60 && T.CFG.speed === 136, 'ramp: buildWorld must restore 60 / 136');
  console.log('[R4] reset and rebuild restart at base speed: OK');
}
// [R5] the generator still accepts rows at max speed (budget = L, constant)
{
  const origin = { x1: 0, x2: 390, y: 700, row: 1 };
  const high = { x1: 0, x2: 390, y: 300, row: 20 };
  setWorld([origin, high], 100);
  S.surface = high; S.y = high.y; S.mode = 'run'; S.dir = 1;
  tick(); // ramp to the cap (curA=90)
  assert(T.curA === 90, 'ramp: must be at the cap for the generator check');
  T.platforms.length = 0; T.rows.length = 0;
  let prevGaps = [{ c: 70, w: 100 }];
  let topY = T.groundY;
  let violations = 0;
  for (let i = 0; i < 500; i++){
    const row = T.genRow(prevGaps, topY, i + 1);
    const h = topY - row.y;
    const limit = T.CFG.speed * h / T.curA;
    if (T.worstTravel(prevGaps, row.gaps, h) > limit + 1e-9) violations++;
    prevGaps = row.gaps; topY = row.y;
  }
  assert(violations === 0, 'ramp: generator violations at max speed must be 0 (got ' + violations + ')');
  console.log('[R5] generator still accepts rows at max speed: OK');
}
// [R6] the world actually scrolls at the ramped speed
{
  const origin = { x1: 0, x2: 390, y: 700, row: 1 };
  const high = { x1: 0, x2: 390, y: 300, row: 20 };
  setWorld([origin, high], 100);
  S.surface = high; S.y = high.y; S.mode = 'run'; S.dir = 1;
  tick(); // ramp to the cap
  assert(T.curA === 90, 'ramp: must be at the cap for the scroll check');
  // scrolling is already on (it started when he reached row 20 —
  // scroll starts at row 1, Jack 2026-11-09, not at mid-screen).
  // Stand on a plain platform (no row, so the ramp does not move)
  // to measure the shift at the ramped speed.
  const mid = { x1: 0, x2: T.getW(), y: T.getH() / 2 - 10 };
  S.surface = mid; S.y = mid.y; S.mode = 'run'; S.dir = 1; S.vy = 0;
  tick();
  assert(T.scrolling, 'ramp: scrolling must be on at row 20');
  const gyBefore = T.groundY;
  tick();
  const shift = T.groundY - gyBefore;
  assert(Math.abs(shift - T.curA * 0.016) < 1e-6, 'ramp: world must shift by the ramped scroll (90*0.016=1.44), got ' + shift);
  console.log('[R6] world scrolls at the ramped speed: OK');
}
console.log('ALL SPEED-RAMP TESTS PASSED');

// Multi-gap rows + inconsistent gap sizes (Jack 2026-11-01).
// Stress the generator over 2000 rows: every accepted row must
// still satisfy the worst-travel winnability cap, every gap must
// be >= 100px, every platform >= 60px (minus 1px float dust),
// some rows must have two gaps, and some gaps must be wide.
const { loadGame } = require('./harness');
const { T, assert } = loadGame();
const N = 2000;
let prevGaps = [{ c: 70, w: 100 }];
let topY = T.groundY, idx = 0;
let multi = 0, maxGap = 0, minGap = Infinity, maxGapsPerRow = 0;
const platBefore = T.platforms.length;
// Speed formula (Jack 2026-11-05): s = a*L/h with L = (W-g)+d,
// g = minimum gap 100px — s is round(a*L/h) and s/a matches L/h
// within rounding (at most 0.5px/s, i.e. 0.0042 on the ratio).
assert(T.CFG.speed === Math.round(T.SCROLL_A * T.PATH_L / T.ROW_H), 'genrows: s must be round(a*L/h), got ' + T.CFG.speed);
assert(Math.abs(T.CFG.speed / T.SCROLL_A - T.PATH_L / T.ROW_H) < 0.01, 'genrows: s/a must match L/h, got ' + (T.CFG.speed / T.SCROLL_A));
for (let i = 0; i < N; i++){
  idx++;
  const row = T.genRow(prevGaps, topY, idx);
  const h = topY - row.y;
  assert(h === 192, 'genrows: h must be equal (192) for every row, got ' + h);
  const limit = T.CFG.speed * h / T.SCROLL_A;
  assert(T.worstTravel(prevGaps, row.gaps, h) <= limit + 1e-6,
    'genrows: row ' + idx + ' must satisfy worst travel <= s*h/a');
  assert(row.gaps.length >= 1, 'genrows: every row must have a gap');
  for (const g of row.gaps){
    assert(g.w >= 100, 'genrows: every gap must be >= 100px');
    if (g.w > maxGap) maxGap = g.w;
    if (g.w < minGap) minGap = g.w;
  }
  if (row.gaps.length >= 2) multi++;
  if (row.gaps.length > maxGapsPerRow) maxGapsPerRow = row.gaps.length;
  prevGaps = row.gaps; topY = row.y;
}
for (let i = platBefore; i < T.platforms.length; i++){
  const p = T.platforms[i];
  assert(p.x2 - p.x1 >= 59, 'genrows: every platform must be >= 60px (got ' + (p.x2 - p.x1) + ')');
}
assert(multi > N * 0.05, 'genrows: multi-gap rows must actually occur (got ' + multi + '/' + N + ')');
assert(multi < N * 0.7, 'genrows: multi-gap rows must stay a minority (got ' + multi + '/' + N + ')');
assert(maxGap > 200, 'genrows: wide gaps must occur (max ' + maxGap + ')');
assert(minGap >= 100, 'genrows: no gap below 100px (min ' + minGap + ')');
console.log('[genrows] ' + N + ' rows: ' + multi + ' multi-gap, max gap ' + Math.round(maxGap) + 'px, min gap ' + Math.round(minGap) + 'px, max ' + maxGapsPerRow + ' gaps/row, all winnable, all platforms >= 60px: OK');

// Wide screen (Jack 2026-11-06: lengthen the pieces): on a 1307px
// iPad the multi-gap pieces must grow with the width instead of
// staying at the 60-80px phone size — same winnability cap, same
// floors, but mean segment length well above the phone's ~70px and
// pieces reaching toward the 220 cap.
{
  const wide = loadGame('endless.html', { width: 1307, height: 938 });
  const WT = wide.T, wassert = wide.assert;
  let wPrev = [{ c: 70, w: 100 }];
  let wTop = WT.groundY, wIdx = 0, wMulti = 0;
  let segSum = 0, segCount = 0, segMaxLen = 0;
  const wPlatBefore = WT.platforms.length;
  for (let i = 0; i < N; i++){
    wIdx++;
    const row = WT.genRow(wPrev, wTop, wIdx);
    const h = wTop - row.y;
    wassert(h === 192, 'genrows-wide: h must be equal (192) for every row, got ' + h);
    const limit = WT.CFG.speed * h / WT.SCROLL_A;
    wassert(WT.worstTravel(wPrev, row.gaps, h) <= limit + 1e-6,
      'genrows-wide: row ' + wIdx + ' must satisfy worst travel <= s*h/a');
    wassert(row.gaps.length >= 1, 'genrows-wide: every row must have a gap');
    for (const g of row.gaps) wassert(g.w >= 100, 'genrows-wide: every gap must be >= 100px');
    if (row.gaps.length >= 2) wMulti++;
    wPrev = row.gaps; wTop = row.y;
  }
  for (let i = wPlatBefore; i < WT.platforms.length; i++){
    const p = WT.platforms[i];
    const len = p.x2 - p.x1;
    wassert(len >= 59, 'genrows-wide: every platform must be >= 60px (got ' + len + ')');
    segSum += len; segCount++; if (len > segMaxLen) segMaxLen = len;
  }
  const segMean = segSum / segCount;
  wassert(segMean > 110, 'genrows-wide: mean segment must exceed 110px on a wide screen (got ' + segMean.toFixed(1) + ')');
  wassert(segMaxLen > 180, 'genrows-wide: some piece must approach the 220 cap (max ' + segMaxLen.toFixed(1) + ')');
  wassert(wMulti > N * 0.5, 'genrows-wide: most wide rows must have 2+ gaps (got ' + wMulti + '/' + N + ')');
  console.log('[genrows-wide] ' + N + ' rows at 1307px: ' + wMulti + ' multi-gap, mean segment ' + segMean.toFixed(1) + 'px, max segment ' + Math.round(segMaxLen) + 'px, all winnable, all platforms >= 60px: OK');
}
console.log('ALL GENERATOR TESTS PASSED');

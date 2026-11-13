// Ball cats (Jack 2026-11-10, villains/obstacles for Mousy Run):
// a cat is a ball about the mouse's size, walking a platform.
// Colours join at their own rows (Orange Tabby 5, Black 20,
// Cream Calico 50, White 100) and each walks at its own pace
// (Orange 75% of the mouse's speed, Black his speed, Calico
// 25% faster, White 50% faster). A row holds at most 1 cat
// until 150, then 2 at 150, 3 at 200, 4 at 250. Touching one
// ends the run. A line that would land him on a cat is amber,
// never green. Ramping over one is safe.
const { loadGame } = require('./harness');
const { sandbox, T, S, assert, tick, press, move, release, setWorld, settle } = loadGame();

// [1] generation: cats only from CAT_MIN_ROW (5), at most
// catMaxForRow(row) per row, only on segments >= CAT_MIN_SEG
// with each cat CAT_EDGE clear of both ends, never on a trap's
// segment, colour always within the colours unlocked at that
// row, and present but not on every row. All four colours must
// appear somewhere, and rows >= 150 must be able to hold 2.
{
  T.platforms.length = 0; T.rows.length = 0;
  let prevGaps = [{ c: 70, w: 100 }];
  let topY = T.groundY;
  for (let i = 0; i < 3000; i++){
    const row = T.genRow(prevGaps, topY, i + 1);
    prevGaps = row.gaps; topY = row.y;
  }
  const perRow = {};
  const colours = {};
  const coloursByBand = { b5: {}, b20: {}, b50: {}, b100: {} };
  let catRows = 0, twoCatRows = 0, violations = 0;
  for (const p of T.platforms){
    if (!p.cats || !p.cats.length) continue;
    perRow[p.row] = (perRow[p.row] || 0) + p.cats.length;
    if (p.cats.length > 1) violations++; // one cat per platform (Jack 2026-11-11): a row may hold several, each on its own segment
    if (p.row < T.CAT_MIN_ROW) violations++;
    if (p.x2 - p.x1 < T.CAT_MIN_SEG) violations++;
    if (p.trapX !== undefined && p.trapX !== null) violations++; // never shares a segment with a trap
    for (const cat of p.cats){
      if (cat.x < p.x1 + T.CAT_EDGE || cat.x > p.x2 - T.CAT_EDGE) violations++;
      if (!cat.color || cat.color < 1 || cat.color > T.catColorsForRow(p.row)) violations++; // colour must be unlocked at this row
      if (cat.dir !== 1 && cat.dir !== -1) violations++;
      colours[cat.color] = (colours[cat.color] || 0) + 1;
      const band = p.row >= 100 ? 'b100' : p.row >= 50 ? 'b50' : p.row >= 20 ? 'b20' : 'b5';
      coloursByBand[band][cat.color] = (coloursByBand[band][cat.color] || 0) + 1;
    }
  }
  for (const r of Object.keys(perRow)){
    const row = +r;
    if (perRow[r] > T.catMaxForRow(row)) violations++;
    else if (row >= T.CAT_MIN_ROW){ catRows++; if (perRow[r] >= 2) twoCatRows++; }
  }
  const totalRows = 3000 - T.CAT_MIN_ROW + 1; // rows 5..3000
  const rate = catRows / totalRows;
  assert(violations === 0, 'cats: placement violations must be 0 (got ' + violations + ')');
  assert(rate > 0.02 && rate < 0.6, 'cats: cat rate must be present but not on every row, got ' + rate.toFixed(3));
  assert(Object.keys(colours).length === 4, 'cats: all four colours must appear, got ' + JSON.stringify(colours));
  assert(!coloursByBand.b5[2] && !coloursByBand.b5[3] && !coloursByBand.b5[4], 'cats: below row 20 only Orange Tabby may appear, got ' + JSON.stringify(coloursByBand.b5));
  assert(!coloursByBand.b20[3] && !coloursByBand.b20[4], 'cats: below row 50 only Orange and Black may appear, got ' + JSON.stringify(coloursByBand.b20));
  assert(!coloursByBand.b50[4], 'cats: below row 100 White must not appear, got ' + JSON.stringify(coloursByBand.b50));
  assert(coloursByBand.b100[4] > 0, 'cats: White must appear at row 100+, got ' + JSON.stringify(coloursByBand.b100));
  assert(twoCatRows > 0, 'cats: rows >= 150 must be able to hold 2 cats, got ' + twoCatRows + ' two-cat rows');
  console.log('[1] generation: cat rows=' + catRows + '/' + totalRows + ' rate=' + rate.toFixed(3) + ' twoCatRows=' + twoCatRows + ' colours=' + JSON.stringify(colours) + ' violations=0: OK');
}
// [1b] the gates themselves: colours unlock at 5/20/50/100,
// max cats per row at 150/200/250.
{
  assert(T.CAT_MIN_ROW === 5, 'cats: CAT_MIN_ROW must be 5, got ' + T.CAT_MIN_ROW);
  assert(T.catColorsForRow(4) === 0 && T.catColorsForRow(5) === 1 && T.catColorsForRow(19) === 1
    && T.catColorsForRow(20) === 2 && T.catColorsForRow(49) === 2 && T.catColorsForRow(50) === 3
    && T.catColorsForRow(99) === 3 && T.catColorsForRow(100) === 4, 'cats: colour gates must be 5/20/50/100');
  assert(JSON.stringify(T.CAT_SPEED) === JSON.stringify([0.75, 1, 1.25, 1.5]), 'cats: speeds must be 0.75/1/1.25/1.5, got ' + JSON.stringify(T.CAT_SPEED));
  assert(T.catMaxForRow(149) === 1 && T.catMaxForRow(150) === 2 && T.catMaxForRow(199) === 2
    && T.catMaxForRow(200) === 3 && T.catMaxForRow(249) === 3 && T.catMaxForRow(250) === 4, 'cats: max cats per row must be 1/2/3/4 at 150/200/250');
  console.log('[1b] colour gates 5/20/50/100, speeds 0.75/1/1.25/1.5, max cats 1/2/3/4 at 150/200/250: OK');
}
// [2] death on touch: a cat walking toward him ends the run.
{
  const plat = { x1: 0, x2: 390, y: 700, cats: [{ x: 200, color: 2, dir: -1 }] };
  setWorld([plat], 100); // start at x=100, running right; the Black cat walks left toward him
  const logBefore = T.log.length;
  let died = false;
  for (let i = 0; i < 200; i++){
    tick();
    if (S.mode === 'lost'){ died = true; break; }
  }
  assert(died, 'cats: a cat walking into him must end the run');
  assert(T.log.slice(logBefore).join('\n').includes('reason=cat'), 'cats: cat death must log DEATH reason=cat');
  console.log('[2] a cat walking into him ends the run: OK');
}
// [3] ramping over a cat is safe: he climbs over it and lands past it.
{
  const origin = { x1: 0, x2: 390, y: 700, cats: [{ x: 200, color: 1, dir: 1 }] };
  const upper = { x1: 0, x2: 390, y: 508 };
  setWorld([origin, upper], 50); // start left of the foot so he mounts from the correct side
  press(100, 700); move(300, 508); // ramp over the cat (at 200) to the upper platform
  const logBefore = T.log.length;
  const landed = settle(400);
  assert(landed === upper, 'cats: must land on the upper platform, got ' + JSON.stringify(landed));
  assert(S.mode === 'run', 'cats: ramping over a cat must not kill him');
  assert(!T.log.slice(logBefore).join('\n').includes('reason=cat'), 'cats: no cat death while ramping over');
  console.log('[3] ramping over a cat is safe: OK');
}
// [4] green: a line landing on a cat is amber; beside it is green.
{
  const origin = { x1: 0, x2: 390, y: 700 };
  const upper = { x1: 0, x2: 390, y: 508, cats: [{ x: 200, color: 3, dir: 1 }] };
  // far end on the cat -> amber (no ticks run between setWorld and the check, so the cat is still at 200)
  setWorld([origin, upper], 100);
  press(100, 700); move(200, 508);
  assert(sandbox.lineWillLand(sandbox.fingerSegment()) === false, 'cats: a line landing on a cat must be amber');
  // far end beside the cat (same platform) -> green
  setWorld([origin, upper], 100);
  press(100, 700); move(300, 508);
  assert(sandbox.lineWillLand(sandbox.fingerSegment()) === true, 'cats: a line landing beside a cat must be green');
  console.log('[4] a cat landing is amber, beside it is green: OK');
}
// [5] exiting onto a cat ends the run (amber lines still mount).
// The cat patrols a short segment centred on the landing spot,
// so it is always within the kill zone when he arrives.
{
  const origin = { x1: 0, x2: 390, y: 700 };
  const upper = { x1: 170, x2: 240, y: 508, cats: [{ x: 205, color: 4, dir: 1 }] };
  setWorld([origin, upper], 50); // start left of the foot so he mounts from the correct side
  press(100, 700); move(200, 508); // ramp ending on the cat
  const logBefore = T.log.length;
  let died = false;
  for (let i = 0; i < 400; i++){
    tick();
    if (S.mode === 'lost'){ died = true; break; }
  }
  assert(died, 'cats: exiting onto a cat must end the run');
  assert(T.log.slice(logBefore).join('\n').includes('reason=cat'), 'cats: cat death must be logged');
  console.log('[5] exiting onto a cat ends the run: OK');
}
// [6] kept green: a kept line whose landings are cats both ways is amber.
{
  const origin = { x1: 0, x2: 390, y: 700, cats: [{ x: 100, color: 1, dir: 1 }] };
  const upper = { x1: 0, x2: 390, y: 508, cats: [{ x: 200, color: 2, dir: 1 }] };
  setWorld([origin, upper], 160); // start clear of the origin cat (kill zone 49-151)
  press(100, 700); move(200, 508); release();
  const kept = S.keptSeg;
  assert(kept, 'cats: must have a kept line');
  assert(T.keptLineWillLand(kept) === false, 'cats: a kept line landing on cats both ways must be amber');
  console.log('[6] a kept cat landing is amber: OK');
}
// [7] walking: each colour moves at its own multiple of the
// mouse's speed, and a cat reverses at its segment's ends.
{
  const origin = { x1: 0, x2: 390, y: 700 };
  const upper = { x1: 0, x2: 390, y: 508, cats: [
    { x: 100, color: 2, dir: 1 }, // Black, his speed
    { x: 200, color: 1, dir: 1 }, // Orange Tabby, 75%
  ] };
  setWorld([origin, upper], 50);
  const black0 = upper.cats[0].x, orange0 = upper.cats[1].x;
  for (let i = 0; i < 30; i++) tick(); // 0.48s, neither cat reaches an end
  const blackD = upper.cats[0].x - black0, orangeD = upper.cats[1].x - orange0;
  assert(blackD > 40 && blackD < 90, 'cats: Black must move about his speed in 0.48s, moved ' + blackD.toFixed(1));
  const ratio = orangeD / blackD;
  assert(ratio > 0.6 && ratio < 0.9, 'cats: Orange must move ~75% as far as Black, ratio ' + ratio.toFixed(2));
  // reversal: a Black cat at the right end turns around
  const upper2 = { x1: 0, x2: 390, y: 508, cats: [{ x: 350, color: 2, dir: 1 }] };
  setWorld([origin, upper2], 50);
  for (let i = 0; i < 60; i++) tick();
  assert(upper2.cats[0].dir === -1, 'cats: a cat at its segment end must reverse, dir=' + upper2.cats[0].dir);
  assert(upper2.cats[0].x < 340, 'cats: after reversing it must walk back left, x=' + upper2.cats[0].x.toFixed(1));
  console.log('[7] walking: Orange moves ~75% of Black, cats reverse at segment ends: OK');
}
// [8] two cats on one platform both kill: touching either ends the run.
{
  const plat = { x1: 0, x2: 390, y: 700, cats: [
    { x: 150, color: 1, dir: 1 },
    { x: 300, color: 2, dir: -1 },
  ] };
  setWorld([plat], 100); // runs right into the first cat at 150
  let died = false;
  for (let i = 0; i < 200; i++){
    tick();
    if (S.mode === 'lost'){ died = true; break; }
  }
  assert(died, 'cats: running into either of two cats must end the run');
  assert(T.catAt(plat, 300) === true, 'cats: catAt must see the second cat');
  assert(T.catAt(plat, 225) === false, 'cats: catAt must be clear between the two cats');
  console.log('[8] two cats on one platform both kill: OK');
}
// [9] boost: jumping to a point total puts the mouse on that row
// with the cats for that stage, and 0 restarts.
{
  T.boostToRow(5);
  assert(T.points === 5 && T.bestRow === 5, 'boost: points/bestRow must be 5, got ' + T.points + '/' + T.bestRow);
  assert(S.surface && S.surface.row === 5, 'boost: mouse must stand on a row-5 platform, got ' + JSON.stringify(S.surface && S.surface.row));
  assert(S.surface.trapX === undefined && !S.surface.cats, 'boost: the platform he lands on must be safe (no trap, no cat)');
  assert(S.y > 0 && S.y < T.getH(), 'boost: the target row must sit on screen, y=' + S.y);
  assert(T.rows[T.rows.length - 1].idx >= 7, 'boost: rows must be generated a couple above the target, top=' + T.rows[T.rows.length - 1].idx);

  T.boostToRow(100);
  assert(T.points === 100 && T.bestRow === 100, 'boost: points/bestRow must be 100, got ' + T.points + '/' + T.bestRow);
  assert(S.surface && S.surface.row === 100, 'boost: mouse must stand on a row-100 platform');
  assert(T.catColorsForRow(100) === 4, 'boost: all four colours must be unlocked at row 100');
  assert(T.curA === 90, 'boost: speed must be capped at row 100 (a=90), got ' + T.curA);

  T.boostToRow(150);
  assert(T.points === 150, 'boost: points must be 150, got ' + T.points);
  assert(T.catMaxForRow(150) === 2, 'boost: up to 2 cats per row at 150');

  T.boostToRow(0);
  assert(T.points === 0 && T.bestRow === 0, 'boost: 0 must restart at 0 points, got ' + T.points);
  assert(S.surface && S.surface.type === 'ground', 'boost: 0 must put him back on the ground');
  console.log('[9] boost: jump to 5/100/150 lands on the target row with the right cats, 0 restarts: OK');
}
// [10] animated like the mouse: 3 walk-cycle frames per colour
// (normal / squash / stretch), white background removed
// (transparent), and the run cycle is the mouse's own 4-step
// ping-pong (1,2,3,2) at 0.11s per frame, facing the way it runs.
{
  assert(T.CAT_FRAMES === 3, 'cats: CAT_FRAMES must be 3, got ' + T.CAT_FRAMES);
  // Every colour is a mouse clone: tabby/black/calico/white-mouse run frames.
  assert(T.catSprite(1, 1) === 'tabby-mouse-run-1.png' && T.catSprite(1, 3) === 'tabby-mouse-run-3.png'
    && T.catSprite(2, 2) === 'black-mouse-run-2.png'
    && T.catSprite(3, 1) === 'calico-mouse-run-1.png'
    && T.catSprite(4, 3) === 'white-mouse-run-3.png', 'cats: catSprite must map colour+frame to the frame file');
  const plat = { x1: 0, x2: 390, y: 700, cats: [{ x: 100, color: 1, dir: 1, walkT: 0 }] };
  setWorld([plat], 300); // mouse far away so the cat walks undisturbed
  const cat = plat.cats[0];
  const seq = [1, 2, 3, 2];
  const frameAt = () => seq[Math.floor((cat.walkT || 0) / 0.11) % 4];
  const seen = new Set([frameAt()]);
  for (let i = 0; i < 30; i++){ tick(); seen.add(frameAt()); } // 0.48s, a full cycle is 0.44s
  assert(cat.walkT > 0.4, 'cats: walkT must advance as the cat walks, got ' + cat.walkT);
  assert(seen.size > 1, 'cats: the run frame must cycle as the cat runs, only saw ' + JSON.stringify([...seen]));
  assert(seen.has(3), 'cats: the run cycle must reach the stretch frame, saw ' + JSON.stringify([...seen]));
  console.log('[10] animated like the mouse: ping-pong run cycle at 0.11s, faces the way it runs: OK');
}
console.log('ALL CAT TESTS PASSED');

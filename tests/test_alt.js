// Alternating-gap model test copy (Jack 2026-11-03).
// Loads endless-alt.html ONLY — the main game and its suite are
// untouched. Run separately: node tests/test_alt.js (not in
// run_all.sh, so deleting the copy later breaks nothing).
const { loadGame } = require('./harness');
const { sandbox, T, S, assert, tick, press, move, release, settle } = loadGame('endless-alt.html');
const W = T.getW(), H = T.getH();
// A: generator stress — 2000 alternating rows, every gap the
// fixed constant GAP_G (reframed 2026-11-05: the equation
// derives the speeds, it does not gate rows).
{
  // Equation check (once, before the loop): s/a must equal
  // L/h from Jack's premise, with s rounded from a.
  assert(Math.abs(T.SPEED_RATIO - T.PATH_L / T.ROW_H) < 1e-9, 'A: s/a must equal L/h, got ' + T.SPEED_RATIO);
  assert(T.CFG.speed === Math.round(T.SCROLL_A * T.SPEED_RATIO), 'A: s must be round(a * L/h), got ' + T.CFG.speed);
  assert(T.PATH_L / T.CFG.speed <= T.ROW_H / T.SCROLL_A + 1e-9, 'A: Mouse Time L/s must be <= Scroll Time h/a');
  // loadGame already built a world; clear it so this loop's row
  // indices don't collide with buildWorld's rows.
  T.platforms.length = 0; T.rows.length = 0;
  let prev = [{ c: 70, w: 100 }]; // buildWorld's virtual ground row
  let topY = T.groundY, prevEnd = 'left';
  for (let i = 0; i < 2000; i++){
    const row = T.genRow(prev, topY, i + 1);
    assert(row.gaps.length === 1, 'A' + i + ': alt row must have exactly one gap, got ' + row.gaps.length);
    const g = row.gaps[0].w, c = row.gaps[0].c;
    assert(g === T.GAP_G, 'A' + i + ': gap must be the fixed constant GAP_G=' + T.GAP_G + ', got ' + g);
    const end = c < W / 2 ? 'left' : 'right';
    assert(end !== prevEnd, 'A' + i + ': gaps must alternate ends, got ' + end + ' after ' + prevEnd);
    const h = topY - row.y;
    assert(h === 192, 'A' + i + ': spacing h must be equal (192) for every row, got ' + h);
    const d = Math.sqrt(h * h + g * g);
    assert(Math.atan2(h, g) * 180 / Math.PI <= T.CFG.maxRampDeg + 1e-9, 'A' + i + ': diagonal d must be climbable (<=70 deg), got ' + (Math.atan2(h, g) * 180 / Math.PI).toFixed(2));
    assert(W - g >= 60, 'A' + i + ': platform W-g must be >= 60, got ' + (W - g));
    const plat = T.platforms.find(p => p.row === row.idx);
    assert(plat && Math.abs((plat.x2 - plat.x1) - (W - g)) < 1e-6, 'A' + i + ': derived platform must be W-g long');
    if (end === 'left') assert(Math.abs(plat.x1 - g) < 1e-6 && plat.x2 === W, 'A' + i + ': left-gap row platform must be [g,W]');
    else assert(plat.x1 === 0 && Math.abs(plat.x2 - (W - g)) < 1e-6, 'A' + i + ': right-gap row platform must be [0,W-g]');
    prev = row.gaps; topY = row.y; prevEnd = end;
  }
  console.log('[A] 2000 alternating rows: one fixed gap each (g=' + T.GAP_G + '), ends alternate, diagonal climbable, equation holds (L/s <= h/a, s=' + T.CFG.speed + '): OK');
}
// B: simulated climb — 10 rows up the real alt world, under
// scroll, each via a planned green diagonal to the next row's
// gap-facing node (same planner as tests/play_alt.js). Live
// coords every climb (scroll shifts the world once he passes
// mid-screen).
{
  T.buildWorld();
  // Place him on the ground (mirrors setWorld's resets, but keeps
  // buildWorld's alt platforms instead of replacing them).
  S.finger = null; S.keptSeg = null; S.keptSeg2 = null; S.rampSlot = null; S.verticalFall = false; S.rampOrigin = null;
  S.fallExclude = null; S.steerDone = false; S.spentFinger = null; S.vy = 0; S.mode = 'run';
  S.rampFinger = null; S.deletePress = false;
  S.x = 100; S.y = T.groundY; S.dir = 1; S.surface = { type: 'ground' };
  T.npcReset();
  let climbed = 0;
  for (let k = 0; k < 10; k++){
    const curRow = S.surface.row === undefined ? 0 : S.surface.row;
    const targetRow = curRow + 1;
    const tp = T.platforms.find(p => p.row === targetRow);
    assert(tp, 'B climb ' + k + ': target row ' + targetRow + ' must exist');
    // The row's gap-facing node (its one interior edge, centered).
    const node = tp.x1 > 0 ? { x: tp.x1, y: tp.y + 7 } : { x: tp.x2, y: tp.y + 7 };
    // Draw-and-verify: try candidate starts (current spot, the
    // platform's border edges — the gap-side approach lives
    // there, the gate guarantees it — then insets), drawing to
    // the target node each time and checking the ACTUAL drawn
    // line's release green (not a predicted segment, so node-lock
    // and snap shifts can't make plan and draw disagree). An
    // amber draw is released, badge-deleted, and the next start
    // is tried. The mouse is placed at each start directly — the
    // run to get there is what the part-A gate already proves.
    const cur = S.surface.type === 'ground' ? { x1: 0, x2: W } : S.surface;
    const starts = [...new Set([S.x, cur.x1, cur.x2, cur.x1 + 30, cur.x2 - 30])].filter(x => x >= cur.x1 && x <= cur.x2);
    let climbedThis = false;
    for (const sx of starts){
      if (sx !== S.x) S.x = sx;
      press(S.x, S.y); move(node.x, node.y);
      const live = sandbox.fingerSegment();
      if (live && sandbox.keptLineWillLand(live) === true){
        const logBefore = T.log.length;
        release();
        const newEntries = T.log.slice(logBefore).join(' ');
        assert(/RELEASE.*green=true/.test(newEntries), 'B climb ' + k + ': diagonal must be green, log: ' + newEntries);
        const landed = settle();
        assert(landed && landed.row === targetRow, 'B climb ' + k + ': must land on row ' + targetRow + ', got ' + (landed ? JSON.stringify(landed) : 'timeout'));
        climbed++; climbedThis = true; break;
      }
      release(); // amber draw: keep it only to badge-delete it
      const bad = S.keptSeg || S.keptSeg2;
      assert(bad, 'B climb ' + k + ': released line must be kept before deleting');
      press(Math.round((bad.ax + bad.bx) / 2), Math.round((bad.ay + bad.by) / 2));
      assert(!S.keptSeg && !S.keptSeg2, 'B climb ' + k + ': bad line must be deleted');
    }
    assert(climbedThis, 'B climb ' + k + ': no green diagonal to row ' + targetRow + ' from row ' + curRow);
  }
  assert(T.bestRow >= 10, 'B: bestRow must reach 10, got ' + T.bestRow);
  assert(S.mode !== 'lost', 'B: mouse must stay alive');
  console.log('[B] 10-row simulated climb on the real alt world, under scroll, every diagonal green and landing on the next row: OK');
}
// C: NPC mouse — it performs the run the equation describes.
// Reset the world and both mice to the ground, then tick the
// real game loop and watch the NPC climb on its own. (The
// player mouse is left idle, so it will slip away and die
// once the NPC drives the scroll — that is expected here; the
// NPC must keep going regardless, which is part of what this
// checks.)
{
  T.buildWorld();
  T.npcReset();
  S.finger = null; S.keptSeg = null; S.keptSeg2 = null; S.rampSlot = null; S.verticalFall = false; S.rampOrigin = null;
  S.fallExclude = null; S.steerDone = false; S.spentFinger = null; S.vy = 0; S.mode = 'run';
  S.rampFinger = null; S.deletePress = false;
  S.x = 100; S.y = T.groundY; S.dir = 1; S.surface = { type: 'ground' };
  assert(T.NPC.row === 0 && T.NPC.mode === 'run', 'C: NPC must start on the ground, got row=' + T.NPC.row + ' mode=' + T.NPC.mode);
  let ramps = T.npcRamps();
  assert(ramps.length === 2, 'C: two ramps must be drawn at the start, got ' + ramps.length);
  assert(ramps[0].fromRow === 0 && ramps[1].fromRow === 1, 'C: starting ramps must be climbs 0->1 and 1->2, got ' + ramps.map(r => r.fromRow).join(','));
  for (const r of ramps){
    assert(Math.abs(Math.abs(r.bx - r.ax) - T.GAP_G) < 1e-9, 'C: ramp horizontal span must be g=' + T.GAP_G + ', got ' + Math.abs(r.bx - r.ax));
    assert(Math.abs((r.ay - r.by) - T.ROW_H) < 1e-9, 'C: ramp vertical span must be h=' + T.ROW_H + ', got ' + (r.ay - r.by));
  }
  let ticks = 0;
  const MAXT = 2000;
  while (T.NPC.row < 5 && ticks < MAXT){
    tick();
    ticks++;
    const pos = T.npcXY();
    assert(pos.y >= 0 && pos.y <= H, 'C tick ' + ticks + ': NPC must stay on screen, y=' + pos.y);
    ramps = T.npcRamps();
    assert(ramps.length === 2, 'C tick ' + ticks + ': two ramps must stay drawn, got ' + ramps.length);
    assert(ramps[0].fromRow === T.NPC.row && ramps[1].fromRow === T.NPC.row + 1, 'C tick ' + ticks + ': ramps must be climbs ' + T.NPC.row + '->' + (T.NPC.row + 1) + ' and ' + (T.NPC.row + 1) + '->' + (T.NPC.row + 2) + ', got ' + ramps.map(r => r.fromRow).join(','));
  }
  assert(T.NPC.row >= 5, 'C: NPC must climb to row 5, got row=' + T.NPC.row + ' after ' + ticks + ' ticks');
  assert(T.scrolling === true, 'C: scrolling must have latched once the NPC reached mid-screen');
  assert(S.mode === 'lost', 'C: idle player mouse must have slipped away while the NPC drove the scroll, got mode=' + S.mode);
  console.log('[C] NPC climbed to row ' + T.NPC.row + ' in ' + ticks + ' ticks, two ramps always ahead, scrolling latched, player mouse slipped away as expected: OK');
}
console.log('ALL ALT TESTS PASSED');

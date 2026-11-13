// Play driver for the alternating-gap test copy (Jack 2026-11-03).
// Plays endless-alt.html autonomously, 50 rows or until death /
// a failed climb. Each climb is PLANNED first with the game's own
// release green (keptLineWillLand — position-independent, and
// what the log records), on snap-exact candidates only (so the
// drawn line equals the planned line — no trial drawing, no
// stale kept lines): the effective start is the mouse's
// position, or the nearby node when the press would node-lock;
// the destination is the target row's node. (The live green,
// lineWillLand, is NOT used for planning: it reads the mouse's
// current position, and from far away it misreads the climb
// direction — a real draw turns green as the mouse runs to the
// foot.) If nothing is green from the current spot, the mouse
// is placed at a platform edge/inset (off-node) and the search
// repeats. (Placing the mouse shortcuts the run to the approach
// — that run is what the part-A gate already proves. Diagonal,
// mount, climb, scroll, landing are the real engine.)
const { loadGame } = require('./harness');
const { sandbox, T, S, press, move, release, settle } = loadGame('endless-alt.html');
const W = T.getW();
T.buildWorld();
S.finger = null; S.keptSeg = null; S.keptSeg2 = null; S.rampSlot = null; S.verticalFall = false; S.rampOrigin = null;
S.fallExclude = null; S.steerDone = false; S.spentFinger = null; S.vy = 0; S.mode = 'run';
S.rampFinger = null; S.deletePress = false;
S.x = 100; S.y = T.groundY; S.dir = 1; S.surface = { type: 'ground' };
T.npcReset();
function nearNode(x, y){
  let best = null, bd = 28;
  for (const n of T.nodes()){ const d = Math.hypot(n.x - x, n.y - y); if (d <= bd){ bd = d; best = n; } }
  return best;
}
let climbs = 0, amber = 0, failures = 0;
for (let k = 0; k < 50; k++){
  const curRow = S.surface.row === undefined ? 0 : S.surface.row;
  const targetRow = curRow + 1;
  const tp = T.platforms.find(p => p.row === targetRow);
  if (!tp){ console.log('FAIL climb ' + (k + 1) + ': target row ' + targetRow + ' missing'); failures++; break; }
  const node = tp.x1 > 0 ? { x: tp.x1, y: tp.y + 7 } : { x: tp.x2, y: tp.y + 7 };
  const cur = S.surface.type === 'ground' ? { x1: 0, x2: W } : S.surface;
  // Candidate starts: current spot first, then the platform's
  // border edges (the gap-side approach lives there — the gate
  // guarantees it: g >= 0.364h puts a climbable, inward-exiting
  // start at the border on the target's gap side), then insets.
  // Destination is the target node only: a border-edge target
  // can never be green (the exit steps past the screen edge).
  const starts = [...new Set([S.x, cur.x1, cur.x2, cur.x1 + 30, cur.x2 - 30])].filter(x => x >= cur.x1 && x <= cur.x2);
  let plan = null;
  for (const sx of starts){
    const nn = nearNode(sx, S.y);
    const st = nn ? { x: nn.x, y: nn.y, node: true } : { x: sx, y: S.y, node: false };
    const seg = { ax: st.x, ay: st.y, bx: node.x, by: node.y, node: st.node };
    if (sandbox.keptLineWillLand(seg) === true){ plan = { startX: sx, seg }; break; }
  }
  if (!plan){ console.log('FAIL climb ' + (k + 1) + ': no green diagonal to row ' + targetRow + ' from row ' + curRow); failures++; break; }
  if (plan.startX !== S.x) S.x = plan.startX;
  const logBefore = T.log.length;
  press(S.x, S.y); move(plan.seg.bx, plan.seg.by);
  const drawn = sandbox.fingerSegment();
  release();
  const entries = T.log.slice(logBefore).join(' ');
  const green = /RELEASE.*green=true/.test(entries);
  if (!green) amber++;
  const landed = settle();
  const ok = landed && landed.row === targetRow && S.mode !== 'lost';
  console.log('climb ' + (k + 1) + ': row ' + curRow + ' -> ' + targetRow +
    ' diag (' + Math.round(plan.seg.ax) + ',' + Math.round(plan.seg.ay) + ')-(' + Math.round(plan.seg.bx) + ',' + Math.round(plan.seg.by) + ')' +
    (plan.seg.node ? ' node' : '') +
    ' drawn=' + (drawn ? '(' + Math.round(drawn.ax) + ',' + Math.round(drawn.ay) + ')-(' + Math.round(drawn.bx) + ',' + Math.round(drawn.by) + ')' : 'none') +
    ' green=' + green + ' landed=' + (landed ? landed.row : 'timeout') + ' best=' + T.bestRow + ' scroll=' + (T.scrolling ? 'on' : 'off'));
  if (!ok){ console.log('FAIL climb ' + (k + 1) + ': expected landing on row ' + targetRow + ', log: ' + entries); failures++; break; }
  climbs++;
  if (S.mode === 'lost'){ console.log('DIED after climb ' + climbs); break; }
}
const death = T.log.slice().reverse().find(e => e.includes('DEATH'));
console.log('PLAY SUMMARY: climbs=' + climbs + ' bestRow=' + T.bestRow + ' alive=' + (S.mode !== 'lost') + ' amber=' + amber + ' failures=' + failures + (death ? ' death=' + death : ''));

// Static-game (MVP) checks, committed so they survive /tmp wipes.
// Run: node tests/mvp_check.js  (from the mouse-ramp-game folder).
// Covers the rules ported from endless: nodes, start lock, B snap,
// node-green, onward green, two lines, per-finger spent, and the
// guaranteed-landing exit rule (Jack 2026-10-30).
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const src = html.match(/<script>([\s\S]*)<\/script>/)[1];
let fakeNow = 1000;
const el = () => ({
  style: {}, addEventListener(){}, getContext(){
    return new Proxy({}, { get(t, p){ if (p === 'canvas') return {}; if (p === 'createLinearGradient') return () => ({ addColorStop(){} }); return () => {}; },
      set(){ return true; } });
  },
  width: 0, height: 0, value: '', textContent: '',
});
// elements are singletons per id, so tests can read back a style
// the game set (e.g. the QA_TOOLS hiding of the LOG button)
const elements = {};
const getEl = (id) => (elements[id] = elements[id] || el());
const sandbox = {
  console, Math, JSON, Array, Object, Number, String, Boolean, parseInt, parseFloat,
  isNaN, isFinite, setTimeout(){}, clearTimeout(){},
  innerWidth: 390, innerHeight: 844, devicePixelRatio: 1,
  performance: { now: () => fakeNow },
  requestAnimationFrame(){}, addEventListener(){},
  document: { getElementById: getEl, createElement: el, addEventListener(){} },
  Image: class { constructor(){ this.src = ''; } },
  window: {},
};
sandbox.globalThis = sandbox; sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(src, sandbox);
const T = sandbox.__mvpTest, S = T.S;
function tick(){ fakeNow += 16; sandbox.tick(fakeNow); }
function press(x, y){ sandbox.press(x, y, 14, 14, 0, true); }
function pressTouch(x, y){ sandbox.press(x, y, 24, 24, 0, false); }
function move(x, y){ sandbox.moveFinger(x, y); }
function release(){ sandbox.release(); }
function seg(){ return sandbox.fingerSegment(); }
function segStr(s){ return s ? '(' + Math.round(s.ax) + ',' + Math.round(s.ay) + ')-(' + Math.round(s.bx) + ',' + Math.round(s.by) + ')' + (s.node ? ' node' : '') : 'null'; }
function assert(c, m){ if (!c){ console.log('FAIL: ' + m); process.exitCode = 1; } else console.log('ok: ' + m); }
function setWorld(plats, mx, my, dir){
  T.platforms.length = 0;
  for (const p of plats) T.platforms.push(p);
  S.x = mx; S.y = my; S.dir = dir || 1; S.mode = 'run';
  S.surface = plats.find(p => p.y === my && mx >= p.x1 && mx <= p.x2) || { type: 'ground' };
  if (S.surface.type === 'ground') S.y = T.groundY;
  S.finger = null; S.keptSeg = null; S.keptSeg2 = null; S.spentFinger = null;
  S.rampFinger = null; S.rampSlot = null; S.deletePress = false;
  S.rampOrigin = null; S.fallExclude = null; S.verticalFall = false; S.steerDone = false; S.vy = 0;
}
function settle(max){
  for (let i = 0; i < (max || 600); i++){
    tick();
    if (S.mode === 'run' && S.surface.type !== 'finger') return true;
  }
  return false;
}
function runUntilFinger(max){
  for (let i = 0; i < (max || 600); i++){
    tick();
    if (S.mode === 'run' && S.surface.type === 'finger') return true;
    if (S.mode !== 'run') return false;
  }
  return false;
}
const ROW1L = { x1: 0, x2: 200, y: 700 }, ROW1R = { x1: 300, x2: 390, y: 700 };
const ROW2L = { x1: 0, x2: 150, y: 500 }, ROW2R = { x1: 250, x2: 390, y: 500 };
const PLATS = [ROW1L, ROW1R, ROW2L, ROW2R];
const GROUND = { type: 'ground' };

// V1: gap-only nodes
setWorld(PLATS, 150, 700, 1);
const ns = T.nodes();
assert(ns.length === 4, 'V1 nodes: 4 gap-facing nodes');
assert(!ns.some(n => n.x === 0 || n.x === 390), 'V1 no border nodes');
// V2: node lock
setWorld(PLATS, 150, 700, 1);
press(200, 700); move(100, 600);
let s = seg();
assert(s && s.ax === 200 && s.ay === 707 && s.bx === 100 && s.by === 600 && s.node === true, 'V2 node-locked start, far at finger, flagged: ' + segStr(s));
release();
// V3: far node snap (climbable: the old (200,707)-(250,507)
// line was 76deg, too steep to snap under the 2026-11-05 rule)
setWorld(PLATS, 150, 700, 1);
press(150, 700); move(255, 505);
s = seg();
assert(s && s.ax === 150 && s.ay === 700 && s.bx === 250 && s.by === 507, 'V3 far snapped to node: ' + segStr(s));
release();
// V4: floating-far node line amber live + kept; unflagged copy green
setWorld(PLATS, 150, 700, 1);
press(200, 700); move(320, 505);
s = seg();
assert(T.lineWillLand(s) === false, 'V4 floating-far node line amber (live)');
const unflagged = { ax: s.ax, ay: s.ay, bx: s.bx, by: s.by, len: s.len };
assert(T.lineWillLand(unflagged) === true, 'V4 same segment unflagged is green');
release();
assert(S.keptSeg && S.keptSeg.node === true, 'V4 kept copy preserves node flag');
assert(T.keptLineWillLand(S.keptSeg) === false, 'V4 floating-far node line amber (kept)');
// V5: start lock
setWorld(PLATS, 150, 700, 1);
press(100, 680); move(250, 560);
s = seg();
assert(s && s.ax === 100 && s.ay === 700, 'V5 start locked to platform point: ' + segStr(s));
release();
// V6: node precedence over start lock
setWorld(PLATS, 150, 700, 1);
press(205, 695); move(100, 600);
s = seg();
assert(s && s.ax === 200 && s.ay === 707, 'V6 node beats start lock: ' + segStr(s));
release();
// V7: B snap function unit
setWorld(PLATS, 150, 800, 1);
S.surface = GROUND; S.y = 800;
const crafted = { ax: 150, ay: 790, bx: 210, by: 690, len: Math.hypot(60, 100) };
const snapped = sandbox.snapLive(crafted);
assert(snapped && snapped.ax === 150 && snapped.ay === 800 && snapped.bx === 200 && snapped.by === 700, 'V7 snapLive snaps start to ground + far to row1 edge: ' + (snapped ? segStr(snapped) : 'null'));
// V8: onward green
setWorld(PLATS, 150, 700, 1);
press(100, 680); move(320, 600);
s = seg();
assert(T.lineWillLand(s) === false, 'V8 same-row drop amber (live)');
release();
setWorld(PLATS, 150, 700, 1);
press(100, 680); move(320, 505);
s = seg();
assert(T.lineWillLand(s) === true, 'V8 step-on stays green: ' + segStr(s));
release();
// Touch: two touch draws while standing — the second replaces the first
// (Jack 2026-11-12: a second line is only allowed while mounted on the
// first; standing, a new draw replaces the kept line, no second slot)
setWorld(PLATS, 150, 700, 1);
pressTouch(100, 680); move(320, 505); release();
pressTouch(150, 660); move(280, 560); release();
assert(S.keptSeg && S.keptSeg.ax === 150, 'TOUCH: second touch draw replaces the first while standing');
assert(S.keptSeg2 === null, 'TOUCH: no second line while standing');
// T1: drawing a second line while standing replaces the first (no mount yet)
setWorld(PLATS, 150, 700, 1);
press(100, 680); move(320, 505); release();
assert(S.keptSeg && S.keptSeg.ax === 100, 'T1 first line kept');
press(150, 660); move(280, 560); release();
assert(S.keptSeg && S.keptSeg.ax === 150, 'T1 second draw replaces the first while standing');
assert(S.keptSeg2 === null, 'T1 no second line while standing');
assert(!T.log[T.log.length - 1].includes('kept2='), 'T1 release log shows no kept2 while standing');
// T2: third draw blocked — first build two lines the allowed way
// (mount line 1, then draw line 2 while climbing), then a third draw
// while still mounted is blocked because both slots are full.
setWorld(PLATS, 70, 700, 1);
press(100, 680); move(320, 505); release();
assert(runUntilFinger(), 'T2 mounted kept line A (slot 1)');
press(150, 660); move(280, 560); release();
assert(S.keptSeg && S.keptSeg.ax === 100, 'T2 first line still kept');
assert(S.keptSeg2 && S.keptSeg2.ax === 150, 'T2 second line kept while climbing');
press(120, 640); move(300, 520);
s = seg();
assert(s === S.keptSeg, 'T2 third drag draws nothing, returns first kept line');
release();
assert(S.keptSeg && S.keptSeg.ax === 100 && S.keptSeg2 && S.keptSeg2.ax === 150, 'T2 still exactly two lines after blocked third draw');
// T5: first line first
setWorld(PLATS, 150, 700, 1);
press(100, 680); move(320, 505); release();
press(150, 660); move(280, 560); release();
assert(seg() === S.keptSeg, 'T5 no-finger segment is the first kept line');
// T4: badge delete promotes, then removes the last line
press(210, 602);
assert(S.keptSeg && S.keptSeg.ax === 150 && S.keptSeg2 === null, 'T4 first badge deletes A, B promotes to first');
press(215, 630);
assert(S.keptSeg === null && S.keptSeg2 === null, 'T4 second badge removes the last line');
// T3: climb a kept line, draw a second alongside, exit the kept line — the second survives
setWorld(PLATS, 70, 700, 1);
press(100, 680); move(320, 505); release();
assert(runUntilFinger(), 'T3 mounted kept line A (slot 1)');
assert(S.rampSlot === 1, 'T3 climbing slot 1');
press(150, 660); move(280, 560);
for (let i = 0; i < 30; i++) tick();
assert(S.mode === 'run' && S.surface.type === 'finger', 'T3 still climbing A after second line drawn');
release();
assert(S.keptSeg && S.keptSeg.ax === 100, 'T3 A still first after second release');
assert(S.keptSeg2 && S.keptSeg2.ax === 150, 'T3 second line kept alongside while climbing');
assert(S.rampSlot === 1, 'T3 climbing slot still 1 (new line did not steal it)');
assert(settle(), 'T3 exited A');
assert(S.spentFinger === null, 'T3 kept-line exit spends no finger');
assert(S.keptSeg && S.keptSeg.ax === 150 && S.keptSeg2 === null, 'T3 second line promoted after A exits');
assert(seg() === S.keptSeg, 'T3 promoted line is the live segment');
// T6: climbing a LIVE line + a new press still drops him
setWorld(PLATS, 70, 700, 1);
press(100, 680); move(320, 505);
assert(runUntilFinger(), 'T6 mounted live line');
assert(S.rampSlot === 'live', 'T6 climbing a live line');
press(150, 660); move(280, 560);
tick();
assert(T.log.some(l => l.includes('new-press-replaced-line')), 'T6 new press while climbing a live line drops him (fall logged)');
assert(S.surface.type !== 'finger', 'T6 off the live line after the new press');
// T7: a live line's disembark spends its finger; a new press works after
setWorld(PLATS, 70, 700, 1);
press(100, 680); move(320, 505);
assert(runUntilFinger(), 'T7 mounted live line');
const oldFinger = S.finger;
assert(settle(), 'T7 exited the live line');
assert(S.spentFinger === oldFinger, 'T7 live-line disembark spends its finger');
assert(S.keptSeg === null && S.keptSeg2 === null, 'T7 live line not kept after disembark');
assert(seg() === null, 'T7 spent finger draws nothing while still down');
release();
press(100, 680); move(320, 505);
assert(seg() !== null, 'T7 new press draws again after spent finger lifts');
release();
// E1: exit beside the ledge is amber (live, synthetic)
{
  const origin = { x1: 0, x2: 200, y: 700 }, target = { x1: 48, x2: 200, y: 600 };
  setWorld([origin, target], 150, 700, -1);
  const line = { ax: 100, ay: 700, bx: 50, by: 600, len: Math.hypot(50, 100) };
  assert(T.lineWillLand(line) === false, 'E1 exit beside the ledge amber (live)');
}
// E2: exit onto the ledge stays green (live, synthetic)
{
  const origin = { x1: 0, x2: 200, y: 700 }, target = { x1: 48, x2: 200, y: 600 };
  setWorld([origin, target], 150, 700, -1);
  const line = { ax: 100, ay: 700, bx: 60, by: 600, len: Math.hypot(40, 100) };
  assert(T.lineWillLand(line) === true, 'E2 exit onto the ledge green (live)');
}
// E3: log-exact case — Jack's (172,331)-(112,183) line, exiting at
// 108 beside a ledge starting at 111.8, must be amber (live + kept).
{
  const logPlats = [
    { x1: 0, x2: 154.8, y: 627 }, { x1: 266.6, x2: 430, y: 627 },
    { x1: 38.7, x2: 193.5, y: 479 }, { x1: 305.3, x2: 430, y: 479 },
    { x1: 0, x2: 172, y: 331 }, { x1: 283.8, x2: 430, y: 331 },
    { x1: 111.8, x2: 318.2, y: 183 },
  ];
  setWorld(logPlats, 176, 331, -1);
  S.surface = logPlats[4]; S.x = 176; S.y = 331; S.dir = -1;
  const line = { ax: 172, ay: 331, bx: 112, by: 183, len: Math.hypot(60, 148) };
  assert(T.lineWillLand(line) === false, 'E3 log-exact line amber (live)');
  assert(T.keptLineWillLand(line) === false, 'E3 log-exact line amber (kept)');
}
// E4: log-exact on-exit variant — (52,331)-(112,183) running right
// exits at 116, on the ledge, and stays green.
{
  const logPlats = [
    { x1: 0, x2: 154.8, y: 627 }, { x1: 266.6, x2: 430, y: 627 },
    { x1: 38.7, x2: 193.5, y: 479 }, { x1: 305.3, x2: 430, y: 479 },
    { x1: 0, x2: 172, y: 331 }, { x1: 283.8, x2: 430, y: 331 },
    { x1: 111.8, x2: 318.2, y: 183 },
  ];
  setWorld(logPlats, 30, 331, 1);
  S.surface = logPlats[4]; S.x = 30; S.y = 331; S.dir = 1;
  const line = { ax: 52, ay: 331, bx: 112, by: 183, len: Math.hypot(60, 148) };
  assert(T.lineWillLand(line) === true, 'E4 log-exact on-exit line green (live)');
}
// V9 (Jack 2026-11-02): green node — far node of a green
// snapped line turns green (live + kept); start node and
// amber-snapped far nodes stay orange.
{
  setWorld(PLATS, 350, 700, 1);
  press(300, 700); move(150, 505);
  s = seg();
  assert(s && s.ax === 300 && s.ay === 707 && s.bx === 150 && s.by === 507, 'V9 node-to-node snap: ' + segStr(s));
  assert(T.lineWillLand(s) === true, 'V9 node-to-node line must be green: ' + segStr(s));
  assert(T.greenNodes().includes('150,507'), 'V9 far node of a green line must be green, got ' + JSON.stringify(T.greenNodes()));
  assert(!T.greenNodes().includes('300,707'), 'V9 start node must stay orange');
  release();
  assert(T.greenNodes().includes('150,507'), 'V9 far node of a kept green line must stay green');
  setWorld([{ x1: 100, x2: 300, y: 700 }], 150, 700, 1);
  press(100, 700); move(300, 700);
  s = seg();
  assert(T.lineWillLand(s) === false, 'V9 same-platform node line must be amber');
  assert(!T.greenNodes().includes('300,707'), 'V9 far node of an amber line must stay orange');
  release();
}
// V10 (Jack 2026-11-02): snap flash — fires once on a node
// snap (even an amber one) and expires after ~250ms.
{
  setWorld([{ x1: 100, x2: 300, y: 700 }], 150, 700, 1);
  for (let i = 0; i < 20; i++) tick(); // 320ms: expires any stale flash from the previous test
  assert(T.getSnapFlash() === null, 'V10 no flash before any snap in this test');
  press(100, 700); move(300, 700);
  tick();
  const flash = T.getSnapFlash();
  assert(flash && Math.round(flash.x) === 300 && Math.round(flash.y) === 707, 'V10 snap must flash the far node, got ' + JSON.stringify(flash));
  for (let i = 0; i < 20; i++) tick(); // 320ms > 250ms flash
  assert(T.getSnapFlash() === null, 'V10 flash must expire after ~250ms');
  release();
}
// V11 (Jack 2026-11-02): any line's far end snaps into a
// node — start-locked line, node wins over the B edge
// (B would give (150,500), the node gives (150,507)),
// green node when green, flash on snap, kept stays green.
{
  setWorld(PLATS, 350, 700, 1);
  press(350, 700); move(150, 505);
  s = seg();
  assert(s && s.bx === 150 && s.by === 507, 'V11 far end must snap to the node (150,507), not the B edge (150,500), got ' + segStr(s));
  assert(!s.node, 'V11 start-locked line must not carry node provenance');
  assert(T.lineWillLand(s) === true, 'V11 start-locked node-snapped line must be green: ' + segStr(s));
  assert(T.greenNodes().includes('150,507'), 'V11 far node of a green snapped line must be green, got ' + JSON.stringify(T.greenNodes()));
  const flash = T.getSnapFlash();
  assert(flash && Math.round(flash.x) === 150 && Math.round(flash.y) === 507, 'V11 snap must flash the far node, got ' + JSON.stringify(flash));
  release();
  assert(T.greenNodes().includes('150,507'), 'V11 far node of a kept green snapped line must stay green');
}
// V12 (Jack 2026-11-02, revised 2026-11-05): an unclimbable
// amber line must NOT snap — the far end stays raw, the node
// stays orange, no flash for it. (Vertical now: only a line
// within 1.5deg of vertical is unclimbable, so the node must
// sit directly above the start.)
{
  setWorld([{ x1: 200, x2: 390, y: 700 }, { x1: 200, x2: 390, y: 500 }], 250, 700, 1);
  press(200, 700); move(200, 505);
  s = seg();
  assert(s && s.bx === 200 && s.by === 505, 'V12 vertical line far end must stay raw (200,505), not snap to the node, got ' + segStr(s));
  assert(T.lineWillLand(s) === false, 'V12 vertical line must be amber');
  assert(!T.greenNodes().includes('200,507'), 'V12 far node of an unsnapped line must stay orange');
  const f12 = T.getSnapFlash();
  assert(!f12 || !(Math.round(f12.x) === 200 && Math.round(f12.y) === 507), 'V12 no flash for the unsnapped node, got ' + JSON.stringify(f12));
  release();
}
// V12b: a climbable-but-amber line DOES still snap + flash
// (flat line to its own platform's node — lands nowhere new).
{
  setWorld(PLATS, 350, 700, 1);
  press(350, 700); move(300, 707);
  s = seg();
  assert(s && s.bx === 300 && s.by === 707, 'V12b climbable amber line far end must snap to the node (300,707), got ' + segStr(s));
  assert(T.lineWillLand(s) === false, 'V12b same-platform line must be amber');
  assert(!T.greenNodes().includes('300,707'), 'V12b far node of an amber line must stay orange');
  assert(T.getSnapFlash() && Math.round(T.getSnapFlash().x) === 300 && Math.round(T.getSnapFlash().y) === 707, 'V12b amber-but-climbable snap must still flash, got ' + JSON.stringify(T.getSnapFlash()));
  release();
}
// V13 (Jack 2026-11-02): B edge on a node-edge converts to
// the node (same annulus case as G10, static game).
{
  setWorld([{ x1: 0, x2: 390, y: 700 }, { x1: 250, x2: 390, y: 500 }], 100, 700, 1);
  press(100, 700); move(285, 510);
  s = seg();
  assert(s && s.bx === 250 && s.by === 507, 'V13 B edge far end must convert onto the node (250,507), got ' + segStr(s));
  assert(T.lineWillLand(s) === true, 'V13 converted line must be green');
  assert(T.greenNodes().includes('250,507'), 'V13 converted node must be green, got ' + JSON.stringify(T.greenNodes()));
  release();
}

// T7: first line first (Jack 2026-11-03): with a kept first line
// pending, a live second line must not be mounted before it — he
// runs past the second line's foot and mounts the first.
{
  setWorld(PLATS, 380, 700, -1);
  press(320, 700); move(140, 500); release();
  assert(S.keptSeg && S.keptSeg.ax === 300, 'T7 first line must be kept, got ' + segStr(S.keptSeg));
  assert(!S.keptSeg2, 'T7 only one line kept yet');
  press(350, 700); move(140, 500); // second line live, finger still down
  for (let i = 0; i < 200 && S.x > 340; i++) tick();
  assert(S.x <= 340, 'T7 must have run past the second line foot');
  assert(!(S.surface && S.surface.type === 'finger'), 'T7 must not have mounted the second line while the first is pending');
  assert(S.mode === 'run', 'T7 must still be running');
  assert(runUntilFinger(), 'T7 must mount a line');
  assert(S.rampSlot === 1, 'T7 must mount the first line first, got rampSlot=' + S.rampSlot);
  assert(S.keptSeg && S.keptSeg.ax === 300, 'T7 mounted line must be the first, got ' + segStr(S.keptSeg));
  release(); // second line kept alongside, mid-climb on the first
  assert(settle(), 'T7 must climb the first line and land');
  assert(S.surface === ROW2L, 'T7 must land on the upper platform');
  assert(S.keptSeg && S.keptSeg.ax === 350, 'T7 second line must be promoted after the first is disembarked, got ' + segStr(S.keptSeg));
  assert(!S.keptSeg2, 'T7 the disembarked slot must be free');
}

// Clouds (endless parity, Jack 2026-11-06): soft rounded whites
// drifting slowly left in screen space, wrapping around.
{
  assert(T.clouds.length >= 3, 'clouds: at least 3 clouds, got ' + T.clouds.length);
  for (const c of T.clouds){
    assert(c.y > 0 && c.y < 844, 'clouds: cloud y must be on screen, got ' + c.y);
    assert(c.a > 0 && c.a <= 1, 'clouds: cloud alpha must be a soft white, got ' + c.a);
    assert(c.v > 0 && c.v <= 20, 'clouds: cloud drift must be slow, got ' + c.v);
  }
  T.clouds.forEach((c, i) => { c.x = 200 + i * 10; });
  const before = T.clouds.map(c => c.x);
  for (let i = 0; i < 60; i++) tick();
  T.clouds.forEach((c, i) => {
    assert(c.x < before[i], 'clouds: cloud ' + i + ' must drift left');
    assert(c.x > 0, 'clouds: cloud ' + i + ' must not have wrapped yet');
  });
  T.clouds[0].x = -200;
  tick();
  assert(T.clouds[0].x > 390, 'clouds: wrapped cloud must reappear right of the screen, got ' + T.clouds[0].x);
  console.log('ok: clouds drift left and wrap');
}

// Capabilities modal ("?" button, Jack 2026-11-06): opens on
// demand, draws the three pictures, closes again, and never
// disturbs the game state.
{
  assert(T.helpOpen === false, 'help: modal must start closed');
  assert(T.capDrawn === 0, 'help: no pictures drawn before opening');
  T.openHelp();
  assert(T.helpOpen === true, 'help: openHelp must open the modal');
  assert(T.capDrawn === 3, 'help: opening must draw all three pictures, got ' + T.capDrawn);
  const modeBefore = S.mode, keptBefore = S.keptSeg;
  T.closeHelp();
  assert(T.helpOpen === false, 'help: closeHelp must close the modal');
  assert(S.mode === modeBefore, 'help: closing must not change the game mode');
  assert(S.keptSeg === keptBefore, 'help: closing must not disturb a kept line');
  T.openHelp();
  assert(T.capDrawn === 6, 'help: reopening must redraw the pictures, got ' + T.capDrawn);
  T.closeHelp();
  console.log('ok: capabilities modal opens, draws three pictures, closes cleanly');
}
// Mount-behind (Jack 2026-11-09, ported from endless): a bridge
// drawn back from the platform edge he just landed on mounts at
// its near end — he turns toward it instead of running past it
// off the edge. He exits onto a platform running right, with a
// kept horizontal bridge extending left from the platform's edge,
// its near end 4px from him.
{
  const plat = { x1: 1026, x2: 1307, y: 334 };
  setWorld([plat], 1030, 334, 1);
  S.keptSeg = { ax: 1026, ay: 340, bx: 777, by: 340, len: 249, node: false };
  S.rampSlot = 1;
  const mounted = runUntilFinger(200);
  assert(mounted, 'mount-behind: must mount the kept bridge at its near end, got mode=' + S.mode + ' x=' + Math.round(S.x) + ' surface=' + (S.surface && S.surface.type));
  assert(S.dir === -1, 'mount-behind: must turn left along the bridge, got dir=' + S.dir);
  console.log('ok: mount-behind bridge mounts at the near end and turns him toward it');
}
// QA Tools (Jack 2026-11-13): the training LOG button is a test tool,
// so it hides when QA_TOOLS is false (the real game); the "?" help
// button is not a QA tool and always shows.
{
  assert(T.QA_TOOLS === false, 'QA: training QA_TOOLS must default to false, got ' + T.QA_TOOLS);
  const logBtn = sandbox.document.getElementById('logBtn');
  assert(logBtn.style.display === 'none', 'QA: training LOG must hide when QA_TOOLS is false, got display=' + logBtn.style.display);
  const helpBtn = sandbox.document.getElementById('helpBtn');
  assert(helpBtn.style.display !== 'none', 'QA: training "?" must show (it is not a QA tool)');
  console.log('ok: QA off hides the training LOG, "?" still shows');
}
console.log(process.exitCode ? 'MVP CHECKS FAILED' : 'ALL MVP CHECKS PASSED');

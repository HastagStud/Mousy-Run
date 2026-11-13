// Green parity (Jack 2026-11-06): what counts as green must be the
// same in endless and static. Same world, same mouse state, same
// segments — lineWillLand and keptLineWillLand must agree in both
// games, and match the expected verdict in each case.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { loadGame } = require('./harness');

// ---- endless ----
const E = loadGame();
const TE = E.T, SE = TE.S;

// ---- MVP (loader copied from tests/mvp_check.js) ----
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const src = html.match(/<script>([\s\S]*)<\/script>/)[1];
let fakeNow = 1000;
const el = () => ({ style: {}, addEventListener(){}, getContext(){
  return new Proxy({}, { get(t, p){ if (p === 'canvas') return {}; if (p === 'createLinearGradient') return () => ({ addColorStop(){} }); return () => {}; }, set(){ return true; } }); },
  width: 0, height: 0, value: '', textContent: '' });
const sandbox = { console, Math, JSON, Array, Object, Number, String, Boolean, parseInt, parseFloat,
  isNaN, isFinite, setTimeout(){}, clearTimeout(){}, innerWidth: 390, innerHeight: 844, devicePixelRatio: 1,
  performance: { now: () => fakeNow }, requestAnimationFrame(){}, addEventListener(){},
  document: { getElementById: el, createElement: el, addEventListener(){} },
  Image: class { constructor(){ this.src = ''; } }, window: {} };
sandbox.globalThis = sandbox; sandbox.window = sandbox;
vm.createContext(sandbox); vm.runInContext(src, sandbox);
const TM = sandbox.__mvpTest, SM = TM.S;

const assert = (c, m) => { if (!c){ console.error('FAIL:', m); process.exit(1); } };

// same world in both: two rows, one gap each, 192 apart; ground at 800
const WORLD = [
  { x1: 0, x2: 150, y: 700 },
  { x1: 250, x2: 390, y: 700 },
  { x1: 0, x2: 200, y: 508 },
  { x1: 300, x2: 390, y: 508 },
];
function setWorldBoth(surfIdx, x, y, dir){
  for (const T of [TE, TM]){
    T.platforms.length = 0;
    for (const p of WORLD) T.platforms.push({ x1: p.x1, x2: p.x2, y: p.y });
  }
  SE.mode = SM.mode = 'run';
  SE.x = SM.x = x; SE.y = SM.y = y; SE.dir = SM.dir = dir || 1;
  SE.surface = TE.platforms[surfIdx]; SM.surface = TM.platforms[surfIdx];
  for (const S of [SE, SM]){ S.finger = null; S.steerDone = false; S.rampSlot = null; S.rampOrigin = null; S.rampDir = 1; S.vy = 0; }
}
const seg = (ax, ay, bx, by, node) => ({ ax, ay, bx, by, len: Math.hypot(bx - ax, by - ay), node: !!node });

// live green: [name, surface index, x, y, segment, expected]
const liveCases = [
  ['green step-on up', 0, 100, 700, seg(150, 700, 300, 508), true],
  ['steep unclimbable', 0, 100, 700, seg(150, 700, 151, 508), false],
  ['crossing a platform', 0, 100, 700, seg(150, 700, 350, 450), false],
  ['same-row step-on', 0, 100, 700, seg(100, 700, 300, 700), true],
  ['drop below origin', 2, 100, 508, seg(100, 508, 300, 600), false],
  ['drop landing above origin', 0, 100, 700, seg(150, 700, 300, 400), true],
  ['node fully connected', 0, 100, 700, seg(150, 700, 190, 508, true), true],
  ['node floating far end', 0, 100, 700, seg(150, 700, 230, 508, true), false],
  ['far end in open air below the rows', 0, 100, 700, seg(100, 700, 300, 780), false],
];
for (const [name, surfIdx, x, y, s, expected] of liveCases){
  setWorldBoth(surfIdx, x, y, 1);
  const e = TE.lineWillLand(s), m = TM.lineWillLand(s);
  assert(e === m, name + ': endless=' + e + ' mvp=' + m + ' must agree');
  assert(e === expected, name + ': verdict must be ' + expected + ', got ' + e);
  console.log('[live] ' + name + ' = ' + e + ': OK');
}

// kept green (judged from the line's own anchors): [name, segment, expected]
// Note: a line that crosses a platform when ridden upward can still
// read green when kept — keptLineWillLand tries EVERY anchor the
// line touches, and from the platform it crosses the same line is
// a valid ride down, so crossing alone never fails a kept line.
// That anchor-independence is by design (and identical in both
// games), so the kept battery covers the climbable and node gates
// instead of re-testing the crossing rule.
const keptCases = [
  ['kept green step-on up', seg(150, 700, 300, 508), true],
  ['kept steep unclimbable', seg(150, 700, 151, 508), false],
  ['kept node floating', seg(150, 700, 230, 508, true), false],
  ['kept drop above origin', seg(150, 700, 300, 400), true],
  ['kept same-row step-on', seg(100, 700, 300, 700), true],
];
setWorldBoth(0, 100, 700, 1);
for (const [name, s, expected] of keptCases){
  const e = TE.keptLineWillLand(s), m = TM.keptLineWillLand(s);
  assert(e === m, name + ': endless=' + e + ' mvp=' + m + ' must agree');
  assert(e === expected, name + ': verdict must be ' + expected + ', got ' + e);
  console.log('[kept] ' + name + ' = ' + e + ': OK');
}
console.log('ALL GREEN PARITY TESTS PASSED');

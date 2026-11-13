// Homescreen (Living World) checks, committed so they survive /tmp wipes.
// Run: node tests/home_check.js  (from the mouse-ramp-game folder).
// Covers: the demo climbs rows by the game's own logic, the mouse
// disappears off the top and re-emerges at the bottom, the loop
// repeats, and the PLAY/Train links point at the right files —
// plus the DELIVERED standalone (mouse-game-home-play.html): it is
// self-contained, PLAY/Train switch views inside the single file,
// and the embedded games actually run.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
let fakeNow = 1000;
const el = () => ({
  style: {}, addEventListener(){}, getContext(){
    return new Proxy({}, { get(t, p){ if (p === 'canvas') return {}; if (p === 'createLinearGradient') return () => ({ addColorStop(){} }); return () => {}; },
      set(){ return true; } });
  },
  width: 0, height: 0, value: '', textContent: '',
});
function makeSandbox(){
  const sb = {
    console, Math, JSON, Array, Object, Number, String, Boolean, parseInt, parseFloat,
    isNaN, isFinite, setTimeout(){}, clearTimeout(){},
    innerWidth: 390, innerHeight: 844, devicePixelRatio: 1,
    performance: { now: () => fakeNow },
    requestAnimationFrame(){}, addEventListener(){},
    document: { getElementById: el, createElement: el, addEventListener(){} },
    Image: class { constructor(){ this.src = ''; } },
    localStorage: { _v: {}, getItem(k){ return this._v[k] || null; }, setItem(k, v){ this._v[k] = String(v); } },
    window: {},
  };
  sb.globalThis = sb; sb.window = sb;
  vm.createContext(sb);
  return sb;
}
function runScripts(sb, htmlText){
  // every top-level <script> block, in order (the combined
  // standalone has three: sprites+shim, the demo, the switching;
  // the embedded game docs' <script> tags are escaped as
  // <\/script> inside string constants, so they are not matched)
  const blocks = [...htmlText.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  for (const b of blocks) vm.runInContext(b, sb);
  return blocks.length;
}
function runGameDoc(doc, hookName){
  // a whole embedded game document (the iframe's srcdoc): run its
  // script blocks in a fresh sandbox, the way the iframe would —
  // the shim looks for the parent's shared sprites, so the
  // sandbox gets a parent stub for it
  const sb = makeSandbox();
  sb.parent = { __MOUSE_SPRITES: {} };
  const blocks = [...doc.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  assert(blocks.length === 2, 'embedded game doc must have exactly two script blocks (shim + game), got ' + blocks.length);
  for (const b of blocks) vm.runInContext(b, sb);
  assert(sb[hookName], 'embedded game doc must expose ' + hookName);
  return sb;
}
function assert(c, m){ if (!c){ console.log('FAIL: ' + m); process.exitCode = 1; } else console.log('ok: ' + m); }

const html = fs.readFileSync(path.join(__dirname, '..', 'home.html'), 'utf8');
const sandbox = makeSandbox();
assert(runScripts(sandbox, html) === 1, 'home.html must have exactly one script block');
const T = sandbox.__homeTest, S = T.S;
function tick(){ fakeNow += 16; sandbox.tick(fakeNow); }

// 1. links: PLAY -> endless, Train -> training ground (editable hrefs)
assert(html.includes('href="endless.html"'), 'home: PLAY must link to endless.html');
assert(html.includes('href="index.html"'), 'home: Train must link to index.html');
assert(!html.includes('id="reset"') && !html.includes('id="logBtn"'), 'home: no Reset/LOG chrome on the homescreen');
// 2. the demo climbs rows by the game's own logic
let climbed = false;
for (let i = 0; i < 4000 && !climbed; i++){ tick(); if (T.bestRow >= 4) climbed = true; }
assert(climbed, 'home: demo must climb at least 4 rows (bestRow=' + T.bestRow + ', state=' + T.demoState + ')');
// 3. he disappears off the TOP and re-emerges at the bottom
// (a wrap from below is a fall, not the loop — the top wrap is
// the approved demo: he climbs until he leaves through the top)
let wrappedTop = false;
for (let i = 0; i < 12000 && !wrappedTop; i++){ tick(); if (T.demoTopWraps >= 1) wrappedTop = true; }
assert(wrappedTop, 'home: demo must disappear off the TOP and re-emerge (topWraps=' + T.demoTopWraps + ' wraps=' + T.demoWraps + ' bestRow=' + T.bestRow + ')');
// 4. the loop repeats: after the wrap he climbs again
const wrapsAfterFirst = T.demoWraps;
let climbedAgain = false;
for (let i = 0; i < 4000 && !climbedAgain; i++){ tick(); if (T.bestRow >= 3) climbedAgain = true; }
assert(climbedAgain, 'home: after a wrap the demo must climb again (bestRow=' + T.bestRow + ')');
// 5. and wraps a second time
let wrappedAgain = false;
for (let i = 0; i < 9000 && !wrappedAgain; i++){ tick(); if (T.demoWraps > wrapsAfterFirst) wrappedAgain = true; }
assert(wrappedAgain, 'home: the loop must repeat (wraps=' + T.demoWraps + ', climbs=' + T.demoClimbs + ')');

// ---- the DELIVERED standalone (mouse-game-home-play.html) ----
// PLAY/Train must switch views INSIDE the single file (Jack
// 2026-11-06: clicking PLAY did nothing when the file opened as
// a lone attachment — the relative link to the sibling file had
// nowhere to go).
const combined = fs.readFileSync(path.join(__dirname, '..', 'mouse-game-home-play.html'), 'utf8');
// sprites inlined exactly once (the shared __MOUSE_SPRITES object;
// both embedded games load them by filename through the shim):
// 8 mouse sprites + 12 cat frames, 3 per colour — colour 1 is
// the tabby-mouse run frames, the rest are the ball cats
const dataUriCount = (combined.match(/data:image\/png;base64,/g) || []).length;
assert(dataUriCount === 20, 'home standalone: sprites must be inlined exactly once, got ' + dataUriCount);
// no navigation to a sibling file anywhere in the delivered file
assert(!combined.includes('href="endless.html"') && !combined.includes('href="index.html"')
  && !combined.includes('href="mouse-game-endless-play.html"') && !combined.includes('href="mouse-game-play.html"'),
  'home standalone: PLAY/Train must not link to a sibling file');
assert(combined.includes('id="playBtn"') && combined.includes('id="trainBtn"')
  && combined.includes('id="endlessFrame"') && combined.includes('id="trainFrame"')
  && combined.includes('id="homeBtn"'),
  'home standalone: must have play/train buttons, both game frames, and a Home button');
// Cartoonish home icon (Jack 2026-11-11): the Home button is a
// little house (inline SVG) in the top-left corner, not the old
// '‹ Home' text at the bottom-left.
assert(combined.includes('id="homeBtn"') && combined.includes('viewBox="0 0 64 64"')
  && !combined.includes('‹ Home'),
  'home standalone: Home button must be the cartoonish house icon at the top-left, not the old text button');

const sb2 = makeSandbox();
assert(runScripts(sb2, combined) === 3, 'home standalone: must have exactly three script blocks');
const H = sb2.__homeStandaloneTest;
assert(H, 'home standalone: must expose __homeStandaloneTest');
assert(H.view === 'home', 'home standalone: must start on the homescreen, got ' + H.view);
// PLAY switches to the endless view and loads the endless game
H.showEndless();
assert(H.view === 'endless', 'home standalone: PLAY must switch to the endless view, got ' + H.view);
assert(H.endlessLoaded === true, 'home standalone: PLAY must load the endless game');
assert(typeof H.endlessFrame.srcdoc === 'string' && H.endlessFrame.srcdoc.includes('SCROLL_A')
  && H.endlessFrame.srcdoc.includes('mousyRunBest'),
  'home standalone: endless frame must hold the endless game');
assert(!H.trainFrame.srcdoc, 'home standalone: Train must not load until tapped');
assert(H.homeBtn.style.display === 'block', 'home standalone: Home button must show in the endless view');
// the endless game inside the PLAY view actually runs
const sbEndless = runGameDoc(H.endlessFrame.srcdoc, '__endlessTest');
{
  const x0 = sbEndless.__endlessTest.S.x;
  for (let i = 0; i < 100; i++){ fakeNow += 16; sbEndless.tick(fakeNow); }
  assert(sbEndless.__endlessTest.S.x !== x0, 'home standalone: embedded endless game must run (mouse x ' + x0 + ' -> ' + sbEndless.__endlessTest.S.x + ')');
  assert(sbEndless.__endlessTest.log.length > 0, 'home standalone: embedded endless game must log its START');
  // the endless game carries its own cartoonish home icon (top-left)
  // for the lone-file card; it hides inside this iframe because the
  // parent's Home button is the way home here
  assert(H.endlessFrame.srcdoc.includes('id="homeIcon"') && H.endlessFrame.srcdoc.includes('viewBox="0 0 64 64"'),
    'home standalone: embedded endless game must carry the cartoonish home icon');
}
// Home returns to the homescreen (and picks up a new best)
sb2.localStorage.setItem('mousyRunBest', '42');
H.showHome();
assert(H.view === 'home', 'home standalone: Home must return to the homescreen, got ' + H.view);
assert(H.endlessFrame.style.display === 'none', 'home standalone: Home must hide the endless frame');
assert(H.homeBtn.style.display === 'none', 'home standalone: Home button must hide on the homescreen');
assert(H.bestShown === 42, 'home standalone: returning Home must re-read the best score, got ' + H.bestShown);
// Train switches to the training-ground view and it runs too
H.showTrain();
assert(H.view === 'train', 'home standalone: Train must switch to the training view, got ' + H.view);
assert(H.trainLoaded === true, 'home standalone: Train must load the training ground');
assert(typeof H.trainFrame.srcdoc === 'string' && H.trainFrame.srcdoc.includes('Training Ground'),
  'home standalone: train frame must hold the training ground');
const sbTrain = runGameDoc(H.trainFrame.srcdoc, '__mvpTest');
{
  const x0 = sbTrain.__mvpTest.S.x;
  for (let i = 0; i < 100; i++){ fakeNow += 16; sbTrain.tick(fakeNow); }
  assert(sbTrain.__mvpTest.S.x !== x0, 'home standalone: embedded training ground must run (mouse x ' + x0 + ' -> ' + sbTrain.__mvpTest.S.x + ')');
}
H.showHome();
assert(H.view === 'home', 'home standalone: Home must return from the training view too');
console.log(process.exitCode ? 'HOME CHECKS FAILED' : 'ALL HOME CHECKS PASSED');

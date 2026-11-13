// Resize (Jack 2026-11-12): tapping the screen on iOS Safari hides or
// shows the URL bar, changing innerHeight and firing resize. The old
// handler rebuilt the whole world on every resize, so the platforms
// visibly jumped whenever Jack tapped. Now only a WIDTH change (a real
// orientation change) rebuilds the world; a height-only change just
// resizes the canvas and the world stays put.
const { loadGame } = require('./harness');
function assert(c, m){ if (!c){ console.error('FAIL: ' + m); process.exit(1); } }
function sig(plats){ return plats.map(p => p.x1 + ',' + p.x2 + ',' + p.y).join('|'); }

const { sandbox, T, S, fireWindow, tick } = loadGame('endless.html');
// run a few ticks so the world is generated and settled
for (let i = 0; i < 10; i++) tick();
assert(T.platforms.length > 0, 'resize: world must have platforms to start');
const before = sig(T.platforms);
const startX = S.x, startY = S.y;

// [1] Height-only resize (URL bar hides: 844 -> 700). Platforms must NOT move.
sandbox.innerHeight = 700;
fireWindow('resize');
assert(sig(T.platforms) === before, 'resize: height-only resize must NOT rebuild the platforms');
assert(S.x === startX && S.y === startY, 'resize: height-only resize must NOT reset the mouse');
assert(sandbox.innerHeight === 700, 'resize: H must update to the new height');
console.log('[1] height-only resize: platforms unchanged, mouse not reset: OK');

// [2] Height-only resize back (URL bar shows: 700 -> 844). Still no rebuild.
sandbox.innerHeight = 844;
fireWindow('resize');
assert(sig(T.platforms) === before, 'resize: height-only resize back must NOT rebuild the platforms');
console.log('[2] height-only resize back: platforms unchanged: OK');

// [3] Width change (orientation: 390 -> 500). The world rebuilds.
sandbox.innerWidth = 500;
fireWindow('resize');
assert(sig(T.platforms) !== before, 'resize: width change must rebuild the platforms');
assert(T.platforms.length > 0, 'resize: rebuilt world must still have platforms');
console.log('[3] width change: world rebuilt: OK');

console.log('ALL RESIZE TESTS PASSED');

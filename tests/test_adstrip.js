// Reserved banner-ad strip (Jack 2026-11-16, launch config: bottom
// banner, Flappy model). The play area is the viewport minus the
// 50px strip; the strip element + ad slot exist in the DOM; resize
// keeps the strip reserved (height-only and width changes alike).
const { loadGame } = require('./harness');
const { sandbox, T, S, assert, tick, fireWindow } = loadGame('endless.html');

// [1] Strip constant + game area.
{
  assert(T.AD_STRIP_H === 50, 'adstrip: AD_STRIP_H must be 50, got ' + T.AD_STRIP_H);
  assert(T.getW() === 390, 'adstrip: game width must stay 390, got ' + T.getW());
  assert(T.getH() === 794, 'adstrip: game height must be 844 - 50 = 794, got ' + T.getH());
  assert(T.groundY === 750, 'adstrip: ground must sit at H - 44 = 750, got ' + T.groundY);
  console.log('[1] strip is 50px, game area 390x794, ground at 750: OK');
}

// [2] Strip + slot elements exist.
{
  const strip = sandbox.document.getElementById('adStrip');
  const slot = sandbox.document.getElementById('adSlot');
  assert(strip, 'adstrip: #adStrip element must exist');
  assert(slot, 'adstrip: #adSlot element must exist');
  console.log('[2] #adStrip + #adSlot exist: OK');
}

// [3] Height-only resize keeps the strip reserved.
{
  sandbox.innerHeight = 900;
  fireWindow('resize');
  assert(T.getH() === 850, 'adstrip: height-only resize must keep H = innerHeight - 50, got ' + T.getH());
  assert(T.getW() === 390, 'adstrip: height-only resize must not change W, got ' + T.getW());
  console.log('[3] height-only resize keeps strip reserved (H=850): OK');
}

// [4] Width change rebuilds with the strip still reserved.
{
  sandbox.innerWidth = 420;
  fireWindow('resize');
  assert(T.getW() === 420, 'adstrip: width change must update W, got ' + T.getW());
  assert(T.getH() === 850, 'adstrip: width change must keep H = innerHeight - 50, got ' + T.getH());
  console.log('[4] width change rebuilds with strip reserved: OK');
}
console.log('ALL AD STRIP TESTS PASSED');

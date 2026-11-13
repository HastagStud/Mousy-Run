// Per-finger spent (Jack 2026-10-28: continue onto the next
// ramp): disembarking, departing, or crossing a LIVE line spends
// only that line's finger. A kept line's exit spends no finger,
// so a line drawn while climbing stays live (and mountable)
// across the exit instead of being poisoned by a global flag.
const { loadGame } = require('./harness');
const { sandbox, T, S, assert, tick, press, move, release, setWorld, settle } = loadGame();
const lastRelease = () => T.log.filter(l => l.includes('RELEASE')).pop();
const mountFirst = () => { for (let i = 0; i < 200 && !(S.surface && S.surface.type === 'finger'); i++) tick(); };
const landOn = (plat) => { for (let i = 0; i < 400; i++) { tick(); if (S.mode === 'run' && S.surface === plat) return true; } return false; };

// F1: a line drawn while climbing a kept line survives that
// line's exit — still live while held, kept on release
{
  const origin = { x1: 100, x2: 390, y: 700 };
  const upper = { x1: 250, x2: 390, y: 550 };
  setWorld([origin, upper], 100);
  press(100, 700); move(260, 560); release(); // kept line A
  mountFirst();
  assert(S.rampSlot === 1, 'F1: must be climbing kept line A first');
  press(150, 700); move(300, 560); // draw line B mid-climb, finger held
  assert(landOn(upper), 'F1: must exit line A onto the upper platform');
  const live = sandbox.fingerSegment();
  assert(live && live.ax === 150, 'F1: line B must still be live after line A exits, got ' + JSON.stringify(live));
  release();
  assert(S.keptSeg && S.keptSeg.ax === 150, 'F1: line B must keep on release, got ' + JSON.stringify(S.keptSeg));
  assert(lastRelease().includes('kept=(150,700)'), 'F1: release must keep line B, not report it spent');
  console.log('[F1] line drawn while climbing survives the exit and keeps: OK');
}
// F2: a second line drawn from the landing platform and HELD
// across the exit mounts after the exit — he continues onto the
// next ramp instead of running off the landing platform. (One
// line: it cannot be KEPT before the exit — releasing it would
// replace the line he is climbing and drop him — so it stays
// live, held, across the exit, and keeps on release after.)
{
  const origin = { x1: 100, x2: 390, y: 700 };
  const upper = { x1: 250, x2: 390, y: 550 };
  const top = { x1: 300, x2: 430, y: 400 };
  setWorld([origin, upper, top], 100);
  press(100, 700); move(260, 560); release(); // kept line A
  mountFirst();
  press(280, 550); move(350, 400); // line B from the landing platform, finger held
  const landed = settle(400);
  assert(landed === upper, 'F2: must exit line A onto the upper platform');
  const live = sandbox.fingerSegment();
  assert(live && live.ax === 280, 'F2: line B must still be live after line A exits, got ' + JSON.stringify(live));
  mountFirst(); // mount line B from the upper platform
  assert(S.surface && S.surface.type === 'finger', 'F2: must mount line B after the exit, not run off');
  assert(S.rampSlot === 'live', 'F2: must be climbing line B as a live line, got rampSlot=' + S.rampSlot);
  assert(!T.log.join('\n').includes('ran-off-ledge'), 'F2: no running off the landing platform');
  for (let i = 0; i < 20; i++) tick();
  assert(S.mode === 'run' && S.y < 550, 'F2: must be climbing up line B');
  release(); // line B keeps on release
  assert(S.keptSeg && S.keptSeg.ax === 280, 'F2: line B must keep on release, got ' + JSON.stringify(S.keptSeg));
  console.log('[F2] held line mounts after the exit — continues onto the next ramp: OK');
}
// F3 (preserved): a live line's press IS spent on exit — the
// held finger draws nothing and its release keeps nothing
{
  const origin = { x1: 100, x2: 390, y: 700 };
  const upper = { x1: 250, x2: 390, y: 550 };
  setWorld([origin, upper], 100);
  press(100, 700); move(260, 560); // live line A, finger held
  mountFirst();
  assert(S.rampSlot === 'live', 'F3: must be climbing a live line first');
  const landed = settle(400);
  assert(landed === upper, 'F3: must exit line A onto the upper platform');
  assert(sandbox.fingerSegment() === null, 'F3: the exited press must draw nothing while held');
  release();
  assert(lastRelease().includes('kept=none spent=true'), 'F3: the exited press must stay spent on release');
  console.log('[F3] live line press stays spent on exit: OK');
}
console.log('ALL SPENT-FINGER TESTS PASSED');

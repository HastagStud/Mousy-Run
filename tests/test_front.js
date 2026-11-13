// Front-line rule (Larry 2026-10-26): a line drawn in front of the
// mouse (in his running direction) must not change his trajectory
// or location. He keeps running straight and mounts only at the
// line's foot — where it meets the surface he's on — from the side
// where it makes the largest angle with that surface (the foot
// between him and the far end). Approaching from the high/acute
// side, or mid-line, he runs past instead of snapping onto it.
const { loadGame } = require('./harness');
const { S, assert, tick, press, move, setWorld } = loadGame();

// F1: up-slope in front mounts at the foot: no height snap, no
// direction change, then climbs and lands on the upper platform.
{
  const lower = { x1: 0, x2: 390, y: 700 };
  const upper = { x1: 0, x2: 390, y: 550 };
  setWorld([lower, upper], 100);
  press(200, 700); move(350, 550);
  let mounted = false, mountY = 0, mountDir = 0;
  for (let i = 0; i < 300; i++) {
    tick();
    if (S.surface && S.surface.type === 'finger' && !mounted) { mounted = true; mountY = S.y; mountDir = S.dir; }
    if (S.mode === 'run' && S.surface === upper) break;
  }
  assert(mounted, 'F1: must mount the foot of the front line');
  assert(mountY === 700, 'F1: mounting at the foot must not change his height (y=' + mountY + ')');
  assert(mountDir === 1, 'F1: mounting must not change his direction');
  assert(S.surface === upper && S.y === 550, 'F1: must climb and land on the upper platform');
  console.log('[F1] front line mounts at the foot with no snap or turn: OK');
}

// F2: down-slope (high end toward him, foot on his platform):
// approaching from the high/acute side he must NOT mount, snap, or
// turn — even where the old engine mounts (segment within 54 of his
// path). Past the foot he is on the largest-angle side, mounts, and
// climbs back toward the high end.
{
  const lower = { x1: 0, x2: 390, y: 700 };
  setWorld([lower], 100);
  press(200, 550); move(350, 700);
  let acuteOk = false, mounted = false, mountDir = 0, mountY = 0;
  for (let i = 0; i < 250; i++) {
    tick();
    if (S.surface === lower && S.x >= 290 && S.x < 350) {
      assert(S.mode === 'run' && S.y === 700 && S.dir === 1, 'F2: acute-side approach must not mount, snap, or turn (x=' + S.x + ')');
      acuteOk = true;
    }
    if (S.surface && S.surface.type === 'finger') { mounted = true; mountDir = S.dir; mountY = S.y; break; }
  }
  assert(acuteOk, 'F2: must have run the acute-side zone without mounting');
  assert(mounted, 'F2: must mount from the largest-angle side after passing the foot');
  assert(mountDir === -1, 'F2: largest-angle-side mount must climb back toward the high end (dir=' + mountDir + ')');
  assert(mountY === 700, 'F2: largest-angle-side mount must not snap (y=' + mountY + ')');
  console.log('[F2] down-slope: no acute-side mount, largest-angle-side mount climbs back: OK');
}

// F3: line crossing his platform height mid-span (foot interior):
// same rule — no mount from the acute side even though the segment
// is within 54 of his path, then a mount from the largest-angle
// side after passing the foot, climbing back toward the high end.
{
  const lower = { x1: 0, x2: 390, y: 700 };
  setWorld([lower], 100);
  press(150, 650); move(350, 750);
  let acuteOk = false, mounted = false, mountDir = 0;
  for (let i = 0; i < 250; i++) {
    tick();
    if (S.surface === lower && S.x >= 150 && S.x < 250) {
      assert(S.mode === 'run' && S.y === 700 && S.dir === 1, 'F3: acute-side approach must not mount, snap, or turn (x=' + S.x + ')');
      acuteOk = true;
    }
    if (S.surface && S.surface.type === 'finger') { mounted = true; mountDir = S.dir; break; }
  }
  assert(acuteOk, 'F3: must have run the acute-side zone without mounting');
  assert(mounted, 'F3: must mount from the largest-angle side after passing the foot');
  assert(mountDir === -1, 'F3: largest-angle-side mount must climb back toward the high end (dir=' + mountDir + ')');
  console.log('[F3] crossing line: no acute-side mount, largest-angle-side mount climbs back: OK');
}
console.log('ALL FRONT TESTS PASSED');

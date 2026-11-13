// Mount-touch rule (Larry 2026-10-26): a line that isn't connected to
// the platform the mouse is on is not usable — he falls instead of
// climbing it. Touch = the segment's height over the shared x-range
// of segment span and platform span overlaps [top - 54, top + 54]
// (stepping distance — a finger press lands on the mouse's body,
// not pixel-perfect on the platform line; the earlier exact
// [top, top+14] reading was superseded). Applies to mounting, to
// falling onto a line, and to the green prediction.
const { loadGame } = require('./harness');
const { sandbox, T, S, assert, tick, press, move, release, setWorld, settle } = loadGame();

// M1: near-edge press locks to the platform edge and mounts —
// the start lock (Larry 2026-10-28) anchors a press within snapR
// of the platform, so this line now connects at the edge and
// climbs to the upper platform instead of falling.
{
  const lower = { x1: 0, x2: 150, y: 700 };
  const upper = { x1: 200, x2: 350, y: 550 };
  setWorld([lower, upper], 50);
  press(160, 660); move(280, 560);
  const landed = settle();
  assert(landed === upper && S.y === 550, 'M1: edge-locked line must mount and land on the upper platform');
  console.log('[M1] near-edge press locks to the edge and lands on upper: OK');
}
// M1b: FAR floating line (press > snapR from the platform, no
// overlap) still never mounts — the lock only anchors near presses.
// He runs off his ledge for it (Larry 2026-11-05, helping hand
// reverted): he steers toward the line, runs past the edge, and
// falls to the ground, unmounted.
{
  const lower = { x1: 0, x2: 150, y: 700 };
  const upper = { x1: 200, x2: 350, y: 550 };
  setWorld([lower, upper], 50);
  press(220, 660); move(280, 560);
  let everFinger = false, everFall = false;
  for (let i = 0; i < 300; i++) {
    tick();
    if (S.surface && S.surface.type === 'finger') everFinger = true;
    if (S.mode === 'fall' || S.mode === 'lost') everFall = true;
  }
  assert(!everFinger, 'M1b: floating line must never be mounted');
  assert(everFall, 'M1b: mouse must fall off his ledge');
  assert(S.mode === 'run' && S.surface.type === 'ground', 'M1b: mouse must end on the ground, got surf=' + (S.surface && S.surface.type));
  console.log('[M1b] far floating line: no mount, runs off and falls to the ground: OK');
}

// M2: touching line mounts and climbs (regression for normal play).
{
  const lower = { x1: 0, x2: 390, y: 700 };
  const upper = { x1: 0, x2: 390, y: 550 };
  setWorld([lower, upper], 100);
  press(150, 700); move(300, 550);
  const landed = settle();
  assert(landed === upper && S.y === 550, 'M2: touching line must mount and land on the upper platform');
  console.log('[M2] touching line mounts and climbs: OK');
}

// M3: line drawn ON another platform, not his -> no mount.
// He runs off his own ledge for it (Larry 2026-11-05, helping
// hand reverted): he steers toward the line, runs past the
// edge, and falls to the ground, unmounted.
{
  const lower = { x1: 0, x2: 150, y: 700 };
  const other = { x1: 200, x2: 350, y: 650 };
  setWorld([lower, other], 50);
  press(200, 650); move(300, 550);
  let everFinger = false, everFall = false;
  for (let i = 0; i < 300; i++) {
    tick();
    if (S.surface && S.surface.type === 'finger') everFinger = true;
    if (S.mode === 'fall' || S.mode === 'lost') everFall = true;
  }
  assert(!everFinger, 'M3: line on another platform must never be mounted');
  assert(everFall, 'M3: mouse must fall off his ledge');
  assert(S.mode === 'run' && S.surface.type === 'ground', 'M3: mouse must end on the ground, got surf=' + (S.surface && S.surface.type));
  console.log('[M3] line on another platform: no mount, runs off and falls to the ground: OK');
}

// M4a: a line floating within a step (40px) above his platform, over
// his platform's span, IS connected — a finger press lands on the
// mouse's body, not pixel-perfect on the platform line — so it is green.
{
  const lower = { x1: 0, x2: 150, y: 700 };
  const upper = { x1: 200, x2: 350, y: 550 };
  setWorld([lower, upper], 50);
  press(100, 660); move(250, 550);
  assert(sandbox.lineWillLand(sandbox.fingerSegment()) === true, 'M4a: stepping-distance float over his platform must be green');
  console.log('[M4a] stepping-distance float over his platform is green: OK');
}
// M4b: a line floating BEYOND a step (67-100px) above his platform is
// NOT connected, even though it is reachable and its far end touches
// a platform — the start-connection gate alone must make it amber.
{
  const lower = { x1: 0, x2: 150, y: 700 };
  const upper = { x1: 200, x2: 350, y: 700 };
  setWorld([lower, upper], 50);
  press(100, 600); move(250, 700);
  assert(sandbox.lineWillLand(sandbox.fingerSegment()) === false, 'M4b: beyond-step float must not be green');
  console.log('[M4b] beyond-step float is amber: OK');
}

// M5: fall-landing gate — a line that sits BELOW his level and
// crosses his old fall path must never be mounted or fallen
// onto. He runs off his ledge for it (Larry 2026-11-05, helping
// hand reverted) and falls to the ground — the gate itself (an
// unconnected line can't be fallen onto) still stands in
// findLanding, so he lands on the ground, never on the line.
// The press is placed so the line stays unconnected: far enough
// from the platform edge and the ground that no lock anchors it
// (a press within 64px of the ground would lock the start to the
// ground and turn it into a ground ramp he could mount after
// landing). (220,730) is 76px from the platform edge and 70px
// above the ground, and the line stays above the ground's touch
// band, so it touches nothing.
{
  const lower = { x1: 0, x2: 150, y: 700 };
  setWorld([lower], 50);
  press(220, 730); move(320, 690);
  let everFinger = false, everFall = false;
  for (let i = 0; i < 400; i++) {
    tick();
    if (S.surface && S.surface.type === 'finger') everFinger = true;
    if (S.mode === 'fall' || S.mode === 'lost') everFall = true;
  }
  assert(!everFinger, 'M5: unconnected line must never be mounted or fallen onto');
  assert(everFall, 'M5: mouse must fall off his ledge');
  assert(S.mode === 'run' && S.surface.type === 'ground', 'M5: mouse must end on the ground, got surf=' + (S.surface && S.surface.type));
  console.log('[M5] unconnected line under the old fall path: never mounted, runs off and falls to the ground: OK');
}
// M5b: fall-landing gate — a FAR line under the old fall path
// still never mounts. He runs off his ledge for it (Larry
// 2026-11-05, helping hand reverted) and falls through to the
// ground, because the lock only anchors near presses. The press
// is placed like M5's so the line stays unconnected (far from
// the platform edge and the ground, touching nothing).
{
  const lower = { x1: 0, x2: 150, y: 700 };
  setWorld([lower], 50);
  press(250, 730); move(320, 690);
  let everFinger = false, everFall = false;
  for (let i = 0; i < 400; i++) {
    tick();
    if (S.surface && S.surface.type === 'finger') everFinger = true;
    if (S.mode === 'fall' || S.mode === 'lost') everFall = true;
  }
  assert(!everFinger, 'M5b: unconnected line must never be mounted or fallen onto');
  assert(everFall, 'M5b: mouse must fall off his ledge');
  assert(S.mode === 'run' && S.surface.type === 'ground', 'M5b: mouse must end on the ground, got surf=' + (S.surface && S.surface.type));
  console.log('[M5b] far line under the old fall path: never mounted, runs off and falls to the ground: OK');
}
// M6 (Larry 2026-11-09 log, 430x819: 'When I drew a green line,
// the mouse ignored'): he exits a line onto a platform at its
// left edge (the exit steps him 4px past the far end, to x=246),
// where a green line starts at that very node (242,700) and
// climbs up-right to (303,550). The line's foot is at x=242
// (the segment starts on the surface), so he is 4px PAST the
// foot — and the front-line rule (over <= 0) blocked the mount,
// so he ran right off the edge instead of climbing the green
// line he had just drawn. He is essentially AT the foot (the
// exit put him there), so the rule must tolerate a few px past
// it.
{
  const plat = { x1: 242, x2: 430, y: 700 };
  setWorld([plat], 246, 700, 1); // as if just exited onto the left edge (exit steps 4px past the far end)
  S.keptSeg = { ax: 242, ay: 700, bx: 303, by: 550, len: 165, node: true };
  S.rampSlot = 1;
  let mounted = false;
  for (let i = 0; i < 60; i++){
    tick();
    if (S.surface && S.surface.type === 'finger'){ mounted = true; break; }
  }
  assert(mounted, 'M6: a green line starting at the node he just landed on must mount, got mode=' + S.mode + ' x=' + Math.round(S.x) + ' surface=' + (S.surface && S.surface.type));
  assert(S.dir === 1, 'M6: must climb up-right along the green line, got dir=' + S.dir);
  console.log('[M6] a green line starting at the node he just landed on mounts (a few px past the foot): OK');
}
console.log('ALL MOUNT TESTS PASSED');

// Reset button in the death modal (Jack 2026-11-13): the corner Reset
// is a QA tool and hides in the real game, so the death modal carries
// its own restart. The button uses the same cartoonish Luckiest Guy
// lettering as the game's display type, and it always shows — it is
// part of the game, not a QA tool, so QA_TOOLS=false must not hide it.
const { loadGame } = require('./harness');
const { sandbox, T, S, assert, tick, setWorld } = loadGame('endless.html');
function click(el){
  const list = (el && el._handlers && el._handlers['click']) || [];
  for (const fn of list) fn({});
}

// [1] A death shows the banner with a visible RESET button, even with
// QA_TOOLS off (the default in the real game).
{
  assert(T.QA_TOOLS === false, 'banner: QA_TOOLS must be false in the real game');
  const plat = { x1: 0, x2: 390, y: 700, trapX: 200 };
  setWorld([plat], 100); // start at x=100, running right toward the trap at 200
  let died = false;
  for (let i = 0; i < 200; i++){
    tick();
    if (S.mode === 'lost'){ died = true; break; }
  }
  assert(died, 'banner: running into a trap must end the run');
  const banner = sandbox.document.getElementById('banner');
  assert(banner.style.display === 'block', 'banner: death must show the banner, got display=' + banner.style.display);
  const btn = sandbox.document.getElementById('bannerReset');
  assert(btn.style.display !== 'none', 'banner: RESET must show in the modal even with QA_TOOLS off, got display=' + btn.style.display);
  // the corner Reset (a QA tool) is hidden in the real game
  const corner = sandbox.document.getElementById('reset');
  assert(corner.style.display === 'none', 'banner: corner Reset must hide with QA_TOOLS off');
  console.log('[1] death shows the banner with a visible RESET, corner Reset hidden: OK');
  // [2] Tapping RESET restarts the run: banner hides, mouse is back at the start.
  click(btn);
  assert(banner.style.display === 'none', 'banner: RESET must hide the banner, got display=' + banner.style.display);
  assert(S.mode === 'run', 'banner: RESET must restart the run, got mode=' + S.mode);
  assert(S.x === 70 && S.y === T.groundY, 'banner: RESET must put the mouse back at the start, got (' + S.x + ',' + S.y + ')');
  console.log('[2] tapping RESET restarts the run: OK');
}
console.log('ALL BANNER RESET TESTS PASSED');

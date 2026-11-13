// Shared stubbed-DOM harness: drives the real game script (endless.html)
// inside a vm, with canvas/DOM stubbed out. Every suite requires this.
// Durable home (the old /tmp harnesses were wiped).
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadGame(file, opts) {
  const html = fs.readFileSync(path.join(__dirname, '..', file || 'endless.html'), 'utf8');
  const code = html.split('<script>')[1].split('</script>')[0];
  let fakeNow = 1000;
  const ctxStub = new Proxy({}, {
    get: (t, p) => p === 'createLinearGradient' ? () => ({ addColorStop() {} }) : () => {},
    set: () => true,
  });
  // elements are singletons (the game stores the canvas once), and
  // listeners are recorded so tests can dispatch synthetic events
  const elements = {};
  function makeEl() {
    const handlers = {};
    return {
      style: {}, textContent: '',
      _handlers: handlers,
      addEventListener: (t, fn) => { (handlers[t] = handlers[t] || []).push(fn); },
      getContext: () => ctxStub,
      querySelector: () => makeEl(),
    };
  }
  const sandbox = {
    innerWidth: (opts && opts.width) || 390, innerHeight: (opts && opts.height) || 844, devicePixelRatio: 1,
    performance: { now: () => fakeNow },
    setTimeout: () => {}, requestAnimationFrame: () => {},
    addEventListener: () => {},
    Image: class { set src(v) {} },
    document: { getElementById: (id) => (elements[id] = elements[id] || makeEl()) },
    console,
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  const T = sandbox.__endlessTest;
  const S = T.S;
  const assert = (c, msg) => { if (!c) { console.error('FAIL:', msg); process.exit(1); } };
  const tick = () => { fakeNow += 16; sandbox.tick(fakeNow); };
  const press = (x, y) => sandbox.press(x, y, 14, 14, 0, true);
  const pressTouch = (x, y) => sandbox.press(x, y, 14, 14, 0, false);
  const move = (x, y) => sandbox.moveFinger(x, y, 14, 14, 0);
  const release = () => sandbox.release();
  function setWorld(plats, startX, startY, dir) {
    if (T.resetRun) T.resetRun(); // fresh run: base speed, ramp restarts (endless only; the training ground and alt have no resetRun)
    T.platforms.length = 0;
    for (const p of plats) T.platforms.push(p);
    S.finger = null; S.keptSeg = null; S.keptSeg2 = null; S.rampSlot = null; S.climbSeg = null; S.verticalFall = false; S.rampOrigin = null;
    S.fallExclude = null; S.fallFrom = null; S.steerDone = false; S.spentFinger = null; S.vy = 0; S.mode = 'run';
    S.rampFinger = null; S.deletePress = false;
    S.x = startX; S.y = startY === undefined ? plats[0].y : startY;
    S.dir = dir === undefined ? 1 : dir; S.surface = plats[0];
  }
  // Run ticks until he mounted at least once and then landed on a
  // real surface again (on a ramp his mode is still 'run', so the
  // landing check must exclude the finger surface); returns his
  // landing surface (or null on timeout).
  function settle(maxTicks) {
    let mounted = false;
    for (let i = 0; i < (maxTicks || 400); i++) {
      tick();
      if (S.surface && S.surface.type === 'finger') mounted = true;
      if (mounted && S.mode === 'run' && S.surface && S.surface.type !== 'finger') return S.surface;
    }
    return null;
  }
  function runToRow(targetRow, maxTicks) {
    for (let i = 0; i < (maxTicks || 900); i++) {
      tick();
      if (S.mode === 'run' && S.surface && S.surface.row === targetRow) return true;
    }
    return false;
  }
  // dispatch a synthetic event to the game's canvas listeners
  function fireCanvas(type, evt) {
    const canvas = elements['game'];
    const list = (canvas && canvas._handlers[type]) || [];
    for (const fn of list) fn(evt);
  }
  return { sandbox, T, S, assert, tick, press, pressTouch, move, release, setWorld, settle, runToRow, fireCanvas };
}

module.exports = { loadGame };

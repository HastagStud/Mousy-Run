// Play log (Jack 2026-10-27): every engine decision is recorded so
// a defect can be pinned to an exact frame, segment, and decision
// from the log the player pastes into chat.
const { loadGame } = require('./harness');
const { sandbox, S, assert, tick, press, move, release, setWorld, settle } = loadGame();
const T = sandbox.__endlessTest;
const logText = () => T.log.join('\n');
const has = (s) => { assert(logText().includes(s), 'log must contain: ' + s); };
const lower = { x1: 0, x2: 390, y: 700 };
const upper = { x1: 0, x2: 390, y: 550 };
// Q1: START + PRESS + RELEASE (kept line, green)
{
  setWorld([lower, upper], 100); press(150, 700); move(300, 550);
  tick();
  has('START endless 390x844');
  has('PRESS at=(150,700)');
  release();
  has('RELEASE kept=(150,700)-(300,550) green=true');
  console.log('[Q1] start/press/release logged: OK');
}
// Q2: mount, climb, exit onto a platform — the EXIT event is the
// landing record for a plat exit (no separate LAND fires)
{
  setWorld([lower, upper], 100); press(150, 700); move(300, 550);
  const landed = settle();
  assert(landed === upper, 'Q2: must land on the upper platform');
  has('MOUNT foot=');
  has('green=true');
  has('EXIT end=(300,550) landing=plat [0,390]@550');
  console.log('[Q2] mount/exit logged: OK');
}
// Q3: crossing drop logs its reason, and the fall's landing logs too
{
  const mid = { x1: 150, x2: 300, y: 600 };
  setWorld([lower, mid], 50); press(100, 700); move(300, 500);
  const landed = settle();
  assert(landed === lower, 'Q3: must land back on the lower platform');
  has('FALL reason=crossing');
  has('LAND surf=[0,390]@700');
  console.log('[Q3] crossing fall + landing logged: OK');
}
// Q4: the log is capped (no unbounded growth)
{
  for (let i = 0; i < 500; i++) sandbox.logEvent('TEST', 'x');
  assert(T.log.length <= 400, 'Q4: log must be capped at 400');
  console.log('[Q4] log capped: OK');
}
console.log('ALL LOG TESTS PASSED');

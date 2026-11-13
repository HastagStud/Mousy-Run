// QA Tools (Jack 2026-11-11): Reset, LOG and BOOST are test
// tools, not part of the real game. A single QA_TOOLS flag hides
// them (the components stay in the code). The developer flips it
// per environment — true while Jack is testing, false for the
// real game. The home icon is not a QA tool; it always shows.
const fs = require('fs');
const path = require('path');
const { loadGame } = require('./harness');
function assert(c, m){ if (!c){ console.error('FAIL: ' + m); process.exit(1); } }
const BTNS = ['reset', 'logBtn', 'boostBtn'];

// QA on (the test build): the flag is true and the buttons show.
{
  const { sandbox, T } = loadGame('endless.html');
  assert(T.QA_TOOLS === true, 'QA: QA_TOOLS must default to true in the test build, got ' + T.QA_TOOLS);
  for (const id of BTNS){
    const el = sandbox.document.getElementById(id);
    assert(el.style.display !== 'none', 'QA: ' + id + ' must show when QA_TOOLS is true, got display=' + el.style.display);
  }
  const home = sandbox.document.getElementById('homeIcon');
  assert(home.style.display !== 'none', 'QA: homeIcon must show (it is not a QA tool)');
  console.log('[1] QA on: flag true, Reset/LOG/BOOST show, home icon shows: OK');
}
// QA off (the real game): flip the flag and the three buttons hide,
// the home icon still shows.
{
  const src = fs.readFileSync(path.join(__dirname, '..', 'endless.html'), 'utf8');
  assert(src.includes('const QA_TOOLS = true;'), 'QA: the source must carry the QA_TOOLS flag');
  const off = src.replace('const QA_TOOLS = true;', 'const QA_TOOLS = false;');
  const tmp = path.join(__dirname, '..', 'endless-qa-off.html');
  fs.writeFileSync(tmp, off);
  try {
    const { sandbox, T } = loadGame('endless-qa-off.html');
    assert(T.QA_TOOLS === false, 'QA: QA_TOOLS must be false in the flipped copy');
    for (const id of BTNS){
      const el = sandbox.document.getElementById(id);
      assert(el.style.display === 'none', 'QA: ' + id + ' must hide when QA_TOOLS is false, got display=' + el.style.display);
    }
    const home = sandbox.document.getElementById('homeIcon');
    assert(home.style.display !== 'none', 'QA: homeIcon must still show when QA_TOOLS is false');
    console.log('[2] QA off: flag false, Reset/LOG/BOOST hide, home icon still shows: OK');
  } finally {
    fs.unlinkSync(tmp);
  }
}
console.log('ALL QA TOOLS TESTS PASSED');

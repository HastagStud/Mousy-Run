// QA Tools (Jack 2026-11-11): Reset, LOG and BOOST are test
// tools, not part of the real game. A single QA_TOOLS flag hides
// them (the components stay in the code). The developer flips it
// per environment — false for the real game (the live site), true
// while Jack is testing. The home icon is not a QA tool; it always shows.
const fs = require('fs');
const path = require('path');
const { loadGame } = require('./harness');
function assert(c, m){ if (!c){ console.error('FAIL: ' + m); process.exit(1); } }
const BTNS = ['reset', 'logBtn', 'boostBtn'];

// QA off (the real game / default): the flag is false and the buttons hide.
{
  const { sandbox, T } = loadGame('endless.html');
  assert(T.QA_TOOLS === false, 'QA: QA_TOOLS must default to false in the real game, got ' + T.QA_TOOLS);
  for (const id of BTNS){
    const el = sandbox.document.getElementById(id);
    assert(el.style.display === 'none', 'QA: ' + id + ' must hide when QA_TOOLS is false, got display=' + el.style.display);
  }
  const home = sandbox.document.getElementById('homeIcon');
  assert(home.style.display !== 'none', 'QA: homeIcon must show (it is not a QA tool)');
  console.log('[1] QA off: flag false, Reset/LOG/BOOST hide, home icon shows: OK');
}
// QA on (the test build): flip the flag and the three buttons show,
// the home icon still shows.
{
  const src = fs.readFileSync(path.join(__dirname, '..', 'endless.html'), 'utf8');
  assert(src.includes('const QA_TOOLS = false;'), 'QA: the source must carry the QA_TOOLS flag');
  const on = src.replace('const QA_TOOLS = false;', 'const QA_TOOLS = true;');
  const tmp = path.join(__dirname, '..', 'endless-qa-off.html');
  fs.writeFileSync(tmp, on);
  try {
    const { sandbox, T } = loadGame('endless-qa-off.html');
    assert(T.QA_TOOLS === true, 'QA: QA_TOOLS must be true in the flipped copy');
    for (const id of BTNS){
      const el = sandbox.document.getElementById(id);
      assert(el.style.display !== 'none', 'QA: ' + id + ' must show when QA_TOOLS is true, got display=' + el.style.display);
    }
    const home = sandbox.document.getElementById('homeIcon');
    assert(home.style.display !== 'none', 'QA: homeIcon must still show when QA_TOOLS is true');
    console.log('[2] QA on: flag true, Reset/LOG/BOOST show, home icon still shows: OK');
  } finally {
    fs.unlinkSync(tmp);
  }
}
console.log('ALL QA TOOLS TESTS PASSED');

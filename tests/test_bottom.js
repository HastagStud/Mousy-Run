// Bottom-point rule: a line ending on a platform's face (top down to
// top+14) mounts; ending below the face falls.
const { loadGame } = require('./harness');
const { S, assert, press, move, setWorld, settle } = loadGame();
const lower = { x1: 0, x2: 390, y: 700 };
const over = { x1: 150, x2: 300, y: 550 };
function run(a, b) {
  setWorld([lower, over], 50);
  press(a[0], a[1]); move(b[0], b[1]);
  return settle();
}
let landed = run([100, 700], [200, 560]);
assert(landed === over && S.y === 550, 'B1: line ending on the platform face mounts');
console.log('[B1] line ending on the platform face mounts: OK');
landed = run([100, 700], [200, 564]);
assert(landed === over && S.y === 550, 'B5a: line ending at the face bottom edge mounts');
console.log('[B5a] line ending at the face bottom edge mounts: OK');
landed = run([100, 700], [200, 600]);
assert(landed === lower && S.y === 700, 'B2: line ending below the bottom face falls, does not mount');
console.log('[B2] line ending below the bottom face falls, does not mount: OK');
landed = run([100, 700], [200, 550]);
assert(landed === over && S.y === 550, 'B3: line ending at the top level still mounts');
console.log('[B3] line ending at the top level still mounts: OK');
landed = run([100, 700], [343, 520]);
assert(landed === over && S.y === 550, 'B4: line ending above the top still mounts');
console.log('[B4] line ending above the top still mounts: OK');
console.log('ALL BOTTOM-POINT TESTS PASSED');

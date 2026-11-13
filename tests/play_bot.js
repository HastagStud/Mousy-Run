// Autoplay bot for Mousy Run (endless) — plays the game by drawing
// ramps, to measure how far a player gets (survival curve).
//
// The bot is a greedy node-to-node climber: whenever the mouse is
// running on a platform it looks for a green line to the next row
// up (testing candidates with the game's own lineWillLand) and
// draws the first green one. Skill is tunable:
//   reactTicks — ticks the bot waits after a landing before it
//     draws (simulates reaction time; 60 ticks = 1s)
//   missP — probability the bot hesitates and skips a draw chance
// A bot is not a human: it gives a baseline distribution and a
// way to compare tunings, not the absolute "average player".
//
// Usage: node tests/play_bot.js [runs] [reactTicks] [missP]
//   defaults: 500 runs, reactTicks 12, missP 0.15 (a casual player)
// Writes a JSON summary to tests/bot_results.json and prints the
// median, percentiles, survival curve, and death-cause breakdown.
const fs = require('fs');
const path = require('path');
const { loadGame } = require('./harness');

const RUNS = parseInt(process.argv[2] || '500', 10);
const REACT = parseInt(process.argv[3] || '12', 10);
const MISS = parseFloat(process.argv[4] || '0.15');
const MAX_TICKS = 60 * 150; // 2.5 minutes of game time per run, cap

const { sandbox, T, S, tick, press, move, release } = loadGame();

function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

// Try to draw a green line from the mouse's current platform to
// the next row up. Returns true if a line was drawn.
function tryDraw(){
  const cur = S.surface;
  let curRow, curY, curX1, curX2;
  if (cur && cur.type === 'ground'){ curRow = 0; curY = T.groundY; curX1 = 0; curX2 = T.getW(); }
  else if (cur && cur.x1 !== undefined){ curRow = cur.row; curY = cur.y; curX1 = cur.x1; curX2 = cur.x2; }
  else return false; // finger/air: can't draw from here
  const targetRow = curRow + 1;
  const targetPlats = T.platforms.filter(p => p.row === targetRow);
  if (!targetPlats.length) return false;
  const nodes = T.nodes();
  // end candidates: nodes on the target platforms + their edges,
  // nearest to the mouse first
  const ends = [];
  for (const p of targetPlats){
    for (const n of nodes){
      if (n.y === p.y && n.x >= p.x1 && n.x <= p.x2) ends.push({ x: n.x, y: n.y });
    }
    ends.push({ x: p.x1, y: p.y });
    ends.push({ x: p.x2, y: p.y });
  }
  ends.sort((a, b) => Math.abs(a.x - S.x) - Math.abs(b.x - S.x));
  // start candidates: nodes on the current platform (nearest
  // first), then a point ahead of the mouse on his platform
  const starts = [];
  for (const n of nodes){
    if (n.y === curY && n.x >= curX1 && n.x <= curX2) starts.push({ x: n.x, y: n.y });
  }
  starts.sort((a, b) => Math.abs(a.x - S.x) - Math.abs(b.x - S.x));
  const aheadX = clamp(S.x + S.dir * 40, curX1 + 5, curX2 - 5);
  starts.push({ x: aheadX, y: curY });
  for (const st of starts){
    for (const en of ends){
      const seg = { ax: st.x, ay: st.y, bx: en.x, by: en.y };
      if (sandbox.lineWillLand(seg)){
        press(st.x, st.y); move(en.x, en.y); release();
        return true;
      }
    }
  }
  return false;
}

function deathReason(){
  for (let i = T.log.length - 1; i >= 0; i--){
    const line = T.log[i];
    if (line.includes('DEATH')){
      if (line.includes('reason=trap')) return 'trap';
      if (line.includes('reason=cat')) return 'cat';
      return 'fall';
    }
  }
  return 'unknown';
}

function playOneRun(){
  T.reset();
  let lastSurface = S.surface;
  let nextDrawTick = REACT; // first draw after the reaction delay
  let ticks = 0;
  for (; ticks < MAX_TICKS; ticks++){
    tick();
    if (S.mode === 'lost') break;
    if (S.mode !== 'run') continue; // falling: nothing to do
    if (!S.surface || S.surface.type === 'finger') continue; // climbing a ramp: wait
    if (S.surface !== lastSurface){
      lastSurface = S.surface;
      nextDrawTick = ticks + REACT;
    }
    if (S.finger) continue; // a live press is active: don't stack draws
    if (ticks < nextDrawTick) continue;
    if (Math.random() < MISS){ nextDrawTick = ticks + 8; continue; } // hesitation
    if (tryDraw()) nextDrawTick = ticks + 30; // drew one: cooldown
    else nextDrawTick = ticks + 8; // no green line: retry soon
  }
  return { bestRow: T.bestRow, points: T.points, reason: S.mode === 'lost' ? deathReason() : 'timeout', ticks };
}

const results = [];
for (let i = 0; i < RUNS; i++){
  results.push(playOneRun());
  if ((i + 1) % 100 === 0) console.log('...' + (i + 1) + '/' + RUNS + ' runs');
}

const rows = results.map(r => r.bestRow).sort((a, b) => a - b);
function pct(p){ return rows[Math.min(rows.length - 1, Math.floor(p * rows.length))]; }
const mean = rows.reduce((a, b) => a + b, 0) / rows.length;
const causes = {};
for (const r of results) causes[r.reason] = (causes[r.reason] || 0) + 1;
const reach = {};
for (const n of [5, 10, 15, 20, 30, 50, 100]){
  reach[n] = rows.filter(r => r >= n).length / rows.length;
}
const summary = {
  runs: RUNS, reactTicks: REACT, missP: MISS,
  median: pct(0.5), mean: +mean.toFixed(1),
  p10: pct(0.1), p25: pct(0.25), p75: pct(0.75), p90: pct(0.9), p99: pct(0.99), max: rows[rows.length - 1],
  reach, causes,
};
console.log('\n=== AUTOPLAY BOT: ' + RUNS + ' runs, reactTicks=' + REACT + ', missP=' + MISS + ' ===');
console.log('best row: median=' + summary.median + ' mean=' + summary.mean + ' p10=' + summary.p10 + ' p25=' + summary.p25 + ' p75=' + summary.p75 + ' p90=' + summary.p90 + ' p99=' + summary.p99 + ' max=' + summary.max);
console.log('reach: ' + Object.keys(reach).map(n => 'row ' + n + ': ' + (reach[n] * 100).toFixed(0) + '%').join(', '));
console.log('death causes: ' + Object.keys(causes).map(k => k + ' ' + causes[k] + ' (' + (causes[k] / RUNS * 100).toFixed(0) + '%)').join(', '));
fs.writeFileSync(path.join(__dirname, 'bot_results.json'), JSON.stringify(summary, null, 2));
console.log('saved tests/bot_results.json');

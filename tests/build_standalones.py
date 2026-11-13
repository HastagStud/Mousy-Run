"""Build the standalone play files by inlining the mouse sprites as data URIs.

Durable home for the builder (it used to live in /tmp and was wiped).
Run from anywhere: python3 tests/build_standalones.py
"""
import base64
import json
import os
import re

GAME = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SPRITES = [
    "mouse-left.png", "mouse-right.png",
    "mouse-left-run-1.png", "mouse-left-run-2.png", "mouse-left-run-3.png",
    "mouse-right-run-1.png", "mouse-right-run-2.png", "mouse-right-run-3.png",
]

# Ball cats (Larry 2026-11-10): the four villain colours, 1-4.
# Every cat is a clone of the mouse running (Larry 2026-11-11):
# the mouse's ball body, no tail, a white eye with a black
# pupil, with each cat's own fur and ears — 3 frames per colour
# (the tail was the run animation, so the frames are the same
# image now), white background removed so they are transparent
# like the mouse. The game loads them by filename and the
# builder inlines them like the mouse.
CATS = [
    "tabby-mouse-run-1.png", "tabby-mouse-run-2.png", "tabby-mouse-run-3.png",
    "black-mouse-run-1.png", "black-mouse-run-2.png", "black-mouse-run-3.png",
    "calico-mouse-run-1.png", "calico-mouse-run-2.png", "calico-mouse-run-3.png",
    "white-mouse-run-1.png", "white-mouse-run-2.png", "white-mouse-run-3.png",
]


def build(src, dst, hrefs=None):
    html = open(os.path.join(GAME, src)).read()
    for name in SPRITES + CATS:
        data = base64.b64encode(open(os.path.join(GAME, name), "rb").read()).decode()
        html = html.replace(name, "data:image/png;base64," + data)
    if hrefs:
        # Rewrite navigation hrefs so the delivered standalone links
        # to the delivered standalones (the editable file keeps the
        # editable hrefs).
        for old, new in hrefs.items():
            html = html.replace(old, new)
    open(os.path.join(GAME, dst), "w").write(html)
    print("wrote", dst, len(html), "chars")


# ---------- combined homescreen standalone (2026-11-06) ----------
# The delivered homescreen opens as a lone attachment, so a relative
# link to a sibling file has nowhere to go (Larry 2026-11-06:
# clicking PLAY did nothing). The combined file is self-contained:
# PLAY and Train switch views INSIDE the file — the endless game
# and the training ground run in iframes whose whole documents are
# embedded as strings. The 8 mouse sprites are inlined ONCE
# (window.__MOUSE_SPRITES) and every sprite load — the homescreen
# demo and both games — is redirected to that shared data by a
# small shim, so the games keep loading sprites by filename and no
# sibling PNGs are needed.

SHIM_JS = """(function(){
  var data = null;
  try { data = window.__MOUSE_SPRITES || (window.parent && window.parent.__MOUSE_SPRITES); } catch (e){ data = null; }
  if (!data) return;
  var HIE = window.HTMLImageElement;
  if (!HIE || !HIE.prototype) return;
  var desc = Object.getOwnPropertyDescriptor(HIE.prototype, 'src');
  if (!desc || typeof desc.set !== 'function') return;
  Object.defineProperty(HIE.prototype, 'src', {
    configurable: true, enumerable: true,
    get: desc.get,
    set: function(v){ if (data[v]) v = data[v]; desc.set.call(this, v); }
  });
})();"""


def js_string(s):
    # A double-quoted JS string literal for s. </script would close
    # the enclosing script block, so it is written as <\\/script>
    # (which JS reads back as </script>). Backslashes and quotes
    # are escaped first so the escape itself survives.
    s = s.replace('\\', '\\\\').replace('"', '\\"')
    s = s.replace('\n', '\\n').replace('\r', '\\r').replace('\t', '\\t')
    s = re.sub(r'</script', '<\\/script', s, flags=re.IGNORECASE)
    return '"' + s + '"'


def sprite_object_js():
    obj = {}
    for name in SPRITES + CATS:
        data = base64.b64encode(open(os.path.join(GAME, name), "rb").read()).decode()
        obj[name] = "data:image/png;base64," + data
    return "window.__MOUSE_SPRITES = " + json.dumps(obj) + ";"


def embed_doc(src):
    # A whole game document as a JS string constant. The sprite shim
    # runs first so the game's sprite loads resolve to the parent's
    # shared data instead of sibling PNG files.
    doc = open(os.path.join(GAME, src)).read()
    doc = doc.replace('<script>', '<script>\n' + SHIM_JS + '\n</script>\n<script>', 1)
    return js_string(doc)


SWITCH_JS = """// Combined standalone only (assembled by tests/build_standalones.py):
// PLAY and Train switch views INSIDE this single file. The endless
// game and the training ground run in iframes whose whole documents
// are embedded above as strings, so the delivered file has no
// sibling dependencies. The editable home.html keeps its plain
// links (endless.html / index.html); the build turns the anchors
// into view switches and injects the iframes + Home button.
let homeView = 'home';
let bestShown = 0;
let endlessLoaded = false, trainLoaded = false;
const homeEls = ['game', 'veil', 'title', 'best', 'homeBtns'].map(function(id){ return document.getElementById(id); });
const endlessFrame = document.getElementById('endlessFrame');
const trainFrame = document.getElementById('trainFrame');
const homeBtn = document.getElementById('homeBtn');
const playBtn = document.getElementById('playBtn');
const trainBtn = document.getElementById('trainBtn');
function setHomeVisible(v){
  for (const el of homeEls){ if (el) el.style.display = v ? '' : 'none'; }
}
function refreshBest(){
  // re-read the best score — the endless game may have saved a
  // new best while it was open
  let best = 0;
  try { best = parseInt(localStorage.getItem('mousyRunBest') || '0', 10) || 0; } catch (e){}
  bestShown = best;
  const n = document.getElementById('bestNum');
  if (n) n.textContent = String(best);
}
function showEndless(){
  if (!endlessLoaded){ endlessFrame.srcdoc = ENDLESS_DOC; endlessLoaded = true; }
  setHomeVisible(false);
  if (trainFrame) trainFrame.style.display = 'none';
  if (endlessFrame) endlessFrame.style.display = 'block';
  if (homeBtn) homeBtn.style.display = 'block';
  homeView = 'endless';
}
function showTrain(){
  if (!trainLoaded){ trainFrame.srcdoc = TRAIN_DOC; trainLoaded = true; }
  setHomeVisible(false);
  if (endlessFrame) endlessFrame.style.display = 'none';
  if (trainFrame) trainFrame.style.display = 'block';
  if (homeBtn) homeBtn.style.display = 'block';
  homeView = 'train';
}
function showHome(){
  if (endlessFrame) endlessFrame.style.display = 'none';
  if (trainFrame) trainFrame.style.display = 'none';
  if (homeBtn) homeBtn.style.display = 'none';
  setHomeVisible(true);
  homeView = 'home';
  refreshBest();
}
if (playBtn && playBtn.addEventListener) playBtn.addEventListener('click', function(e){ if (e && e.preventDefault) e.preventDefault(); showEndless(); });
if (trainBtn && trainBtn.addEventListener) trainBtn.addEventListener('click', function(e){ if (e && e.preventDefault) e.preventDefault(); showTrain(); });
if (homeBtn && homeBtn.addEventListener) homeBtn.addEventListener('click', showHome);
globalThis.__homeStandaloneTest = {
  get view(){ return homeView; },
  get bestShown(){ return bestShown; },
  get endlessLoaded(){ return endlessLoaded; },
  get trainLoaded(){ return trainLoaded; },
  get endlessFrame(){ return endlessFrame; },
  get trainFrame(){ return trainFrame; },
  get homeBtn(){ return homeBtn; },
  showEndless, showTrain, showHome,
};"""


def build_home():
    home = open(os.path.join(GAME, "home.html")).read()
    # The anchors become view switches in the standalone: their
    # hrefs would point at sibling files that are not there when
    # the file opens as a lone attachment — that was the bug.
    home = home.replace('<a class="homeBtn play" href="endless.html">',
                        '<a id="playBtn" class="homeBtn play" href="#">')
    home = home.replace('<a class="homeBtn train" href="index.html">',
                        '<a id="trainBtn" class="homeBtn train" href="#">')
    # Shared sprites + shim, before the homescreen's own script so
    # the demo's sprite loads resolve to the shared data.
    sprite_block = ('<script>\n"use strict";\n' + sprite_object_js() + '\n'
                    + SHIM_JS + '\n</script>\n')
    home = home.replace('<script>', sprite_block + '<script>', 1)
    # The two games, embedded as strings, + the view switching.
    switch_block = ('<script>\n"use strict";\n'
                    + 'const ENDLESS_DOC = ' + embed_doc("endless.html") + ';\n'
                    + 'const TRAIN_DOC = ' + embed_doc("index.html") + ';\n'
                    + SWITCH_JS + '\n</script>\n')
    frames = (
        '<iframe id="endlessFrame" title="Mousy Run — Endless" '
        'style="display:none;position:fixed;inset:0;width:100%;height:100%;border:0;z-index:10"></iframe>\n'
        '<iframe id="trainFrame" title="Mousy Run — Training Ground" '
        'style="display:none;position:fixed;inset:0;width:100%;height:100%;border:0;z-index:10"></iframe>\n'
        '<button id="homeBtn" type="button" aria-label="Home" '
        'style="display:none;position:fixed;left:12px;top:calc(10px + env(safe-area-inset-top));z-index:11;'
        'width:44px;height:44px;padding:6px;box-sizing:border-box;'
        'border:1px solid #c9b896;background:#fff8ea;border-radius:999px">'
        '<svg viewBox="0 0 64 64" width="32" height="32" aria-hidden="true" style="display:block">'
        '<circle cx="47" cy="6" r="3.5" fill="#fff" stroke="#5a4632" stroke-width="1.5"/>'
        '<rect x="43" y="10" width="8" height="14" rx="2" fill="#c96f2e" stroke="#5a4632" stroke-width="2.5"/>'
        '<path d="M4 34 L32 12 L60 34 Z" fill="#ff8c42" stroke="#5a4632" stroke-width="3" stroke-linejoin="round"/>'
        '<rect x="14" y="34" width="36" height="22" rx="3" fill="#ffe9a8" stroke="#5a4632" stroke-width="3"/>'
        '<path d="M28 56 V46 Q28 40 32 40 Q36 40 36 46 V56 Z" fill="#8b5a2b" stroke="#5a4632" stroke-width="2"/>'
        '<circle cx="34" cy="49" r="1.3" fill="#ffe9a8"/>'
        '<circle cx="21" cy="43" r="4.5" fill="#a8d8ea" stroke="#5a4632" stroke-width="2"/>'
        '<circle cx="43" cy="43" r="4.5" fill="#a8d8ea" stroke="#5a4632" stroke-width="2"/>'
        '</svg></button>\n'
    )
    home = home.replace('</body>', frames + switch_block + '</body>', 1)
    open(os.path.join(GAME, "mouse-game-home-play.html"), "w").write(home)
    print("wrote mouse-game-home-play.html", len(home), "chars")


build("index.html", "mouse-game-play.html")
build("endless.html", "mouse-game-endless-play.html")
# Alt copy too (2026-11-04; it used to be a one-off build and went stale).
build("endless-alt.html", "endless-alt-play.html")
# Homescreen (2026-11-06): self-contained — PLAY/Train switch views
# inside the single file (see build_home above); the editable
# home.html keeps its plain links to endless.html / index.html.
build_home()

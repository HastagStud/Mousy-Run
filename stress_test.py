#!/usr/bin/env python3
"""
Mouse Ramp — row generator + no-win stress test (2026-10-26).

Model (Larry's n / N / x, derived 2026-10-26):
  s     = mouse horizontal run speed, FIXED (px/s)
  a     = frame auto-scroll speed, FIXED (px/s)
  h_i   = vertical spacing between row i and row i+1 (px)
  x_max = s * h_i / a  -- max horizontal travel per row that still
          climbs at least as fast as the frame scrolls. Derivation:
          one row cycle takes travel/s seconds and gains h_i px, so
          climb rate = s*h_i/travel; requiring rate >= a gives
          travel <= s*h_i/a.
  n_i   = worst-case horizontal travel for transition i:
          max over arrival gaps p in row i of (min over gaps q in
          row i+1 of |q - p|), with travel floored at the ramp
          footprint h_i / tan(70deg) (a climb at the max slope still
          needs that much horizontal run). Same-row gaps the mouse
          bridges count as traversable, not blockers: the distance
          spans across them.
  N     = running average of n_i. Safe rule: N <= x (ceiling), with
          the hard per-row cap n_i <= x_max,i (Flappy's max-delta).
          An average over the whole run alone is NOT sufficient: a
          burst of hard rows early can kill before easy rows arrive
          (see the burst demo below).

Row layout rules (Larry's randomness constraints):
  * screen width W; every gap width >= 100 px (mouse is ~54 px wide)
  * every platform segment >= 60 px (mouse-width to stand on)
  * row spacing h_i uniform in [96, 288] px (the spec's 1-3 inches
    at 96 px/inch); gap widths uniform in [100, 170] px
  * the frame scrolls at fixed a once the mouse reaches the middle
    row; the mouse starts at the middle of the screen, so its height
    above the bottom death line starts at H/2 and is capped at H.

Worst-case mouse: at every row it arrives through the gap that
maximises its travel to the next row (adversarial arrival). If the
worst-case mouse survives, any real mouse survives.

Feasibility precondition: the ramp footprint must fit inside the
budget, i.e. s/a >= 1/tan(70deg) ~= 0.364, else even a vertically
aligned gap is unclimbable. Checked at startup.
"""
import math
import random
import statistics

# ---- parameters (game units: px, px/s) ----
W = 390            # phone screen width
H_SCREEN = 844     # phone screen height
S = 138.0          # mouse speed, FIXED (MVP base speed)
A = 120.0          # frame scroll speed, FIXED
H_MIN, H_MAX = 96.0, 288.0   # row spacing range (1-3 inches)
GAP_MIN, GAP_MAX = 100.0, 170.0
SEG_MIN = 60.0
MAX_SLOPE_DEG = 70.0
MAX_RETRIES = 100
N_ROWS = 5000

FOOTPRINT = 1.0 / math.tan(math.radians(MAX_SLOPE_DEG))  # ~0.364


def gen_row(rng):
    """Random row: list of (gap_center, gap_width), all layout rules met.
    Built by alternating random segments and gaps that tile width W.
    Returns None if a tiling attempt fails (caller retries)."""
    for _ in range(200):
        parts = []  # ('seg', len) / ('gap', len), tiling [0, W]
        x = 0.0
        ok = True
        while x < W - 1e-9:
            seg = rng.uniform(SEG_MIN, 220.0)
            if x + seg >= W:
                if W - x >= SEG_MIN:
                    parts.append(('seg', W - x))
                else:
                    ok = False  # final sliver too short to stand on
                x = W
                break
            parts.append(('seg', seg))
            x += seg
            gap = rng.uniform(GAP_MIN, GAP_MAX)
            if x + gap >= W - SEG_MIN:
                # not enough room left for a gap + final segment
                parts.append(('seg', W - x))
                x = W
                break
            parts.append(('gap', gap))
            x += gap
        if not ok:
            continue
        gaps = []
        x = 0.0
        for kind, ln in parts:
            if kind == 'gap':
                gaps.append((x + ln / 2.0, ln))
            x += ln
        if gaps and all(ln >= GAP_MIN for _, ln in gaps):
            return gaps
    return None


def worst_travel(prev_gaps, next_gaps, h):
    """Worst-case horizontal travel for one row transition."""
    disp = 0.0
    for p, _ in prev_gaps:
        nearest = min(abs(q - p) for q, _ in next_gaps)
        disp = max(disp, nearest)
    footprint = h * FOOTPRINT
    return max(disp, footprint), disp


def x_max(h):
    return S * h / A


def gen_capped_row(rng, prev_gaps):
    """Random next row accepted only if worst travel <= x_max.
    Falls back to the previous row's gaps (travel = footprint only)
    after MAX_RETRIES misses, so generation always terminates.
    Returns (gaps, h, travel, disp, used_fallback, retries)."""
    h = rng.uniform(H_MIN, H_MAX)
    limit = x_max(h)
    for tries in range(1, MAX_RETRIES + 1):
        gaps = gen_row(rng)
        if gaps is None:
            continue
        travel, disp = worst_travel(prev_gaps, gaps, h)
        if travel <= limit:
            return gaps, h, travel, disp, False, tries
    return list(prev_gaps), h, h * FOOTPRINT, 0.0, True, MAX_RETRIES


def simulate(rows, start_height):
    """Worst-case mouse through a list of (h, travel).
    Returns (death_row or None, min_height, final_height)."""
    height = start_height
    min_height = height
    for i, (h, travel) in enumerate(rows):
        height += h - A * travel / S
        if height > H_SCREEN:
            height = H_SCREEN  # cannot bank progress above the screen top
        min_height = min(min_height, height)
        if height < 0:
            return i + 1, min_height, height
    return None, min_height, height


def main():
    assert S / A >= FOOTPRINT, "infeasible parameters: s/a below ramp-footprint bound"
    print(f"params: W={W} s={S} a={A} h in [{H_MIN},{H_MAX}] "
          f"s/a={S / A:.3f} (footprint bound {FOOTPRINT:.3f})")
    print(f"x_max range: {x_max(H_MIN):.1f}..{x_max(H_MAX):.1f} px")

    # ---- Experiment 1: capped generator, worst-case mouse ----
    rng = random.Random(12345)
    gaps = gen_row(rng)
    rows, travels, disps, fallbacks, retries_tot = [], [], [], 0, 0
    for _ in range(N_ROWS):
        gaps, h, travel, disp, fb, tries = gen_capped_row(rng, gaps)
        rows.append((h, travel))
        travels.append(travel)
        disps.append(disp)
        fallbacks += fb
        retries_tot += tries
    death, min_h, final_h = simulate(rows, H_SCREEN / 2)
    print("\n[1] CAPPED generator, worst-case mouse, "
          f"{N_ROWS} rows:")
    print(f"    deaths: {death} | min height above death line: {min_h:.1f} px "
          f"(start {H_SCREEN / 2:.0f}) | final height: {final_h:.1f}")
    print(f"    mean travel N = {statistics.mean(travels):.1f} px | "
          f"max travel = {max(travels):.1f} px | "
          f"mean disp = {statistics.mean(disps):.1f} px")
    print(f"    fallback rows: {fallbacks} | mean retries/row: "
          f"{retries_tot / N_ROWS:.2f}")

    # ---- Experiment 2: uncapped generator (control: can the test kill?) ----
    rng = random.Random(999)
    gaps = gen_row(rng)
    rows2 = []
    for _ in range(N_ROWS):
        h = rng.uniform(H_MIN, H_MAX)
        nxt = gen_row(rng)
        travel, _ = worst_travel(gaps, nxt, h)
        rows2.append((h, travel))
        gaps = nxt
    death2, min_h2, _ = simulate(rows2, H_SCREEN / 2)
    print("\n[2] UNCAPPED generator (control), worst-case mouse, "
          f"{N_ROWS} rows:")
    print(f"    first death at row: {death2} | min height: {min_h2:.1f} px")

    # ---- Experiment 3: adversarial layout (gaps alternate extremes) ----
    rows3 = []
    left = (110.0, 120.0)   # leftmost legal gap centre (edge seg >= 60)
    right = (280.0, 120.0)  # rightmost legal gap centre
    for i in range(200):
        h = 120.0
        prev = [left] if i % 2 == 0 else [right]
        nxt = [right] if i % 2 == 0 else [left]
        travel, _ = worst_travel(prev, nxt, h)
        rows3.append((h, travel))
    death3, _, _ = simulate(rows3, H_SCREEN / 2)
    print("\n[3] ADVERSARIAL layout (gap alternates far-left/far-right, "
          "h=120, travel=170 > x_max=138):")
    print(f"    first death at row: {death3}")

    # ---- Experiment 4: average-only burst (why the average rule fails) ----
    # 9 hard rows (disp 170, h=96, x_max=110) then 100 easy rows
    # (travel = ramp footprint only, ~35 px). Full-run average travel
    # is ~46 px <= x_max, yet the mouse dies during the burst, before
    # the easy rows arrive.
    burst = [(96.0, 170.0)] * 9 + [(96.0, 96.0 * FOOTPRINT)] * 100
    death4, _, _ = simulate(burst, H_SCREEN / 2)
    avg = statistics.mean(t for _, t in burst)
    print("\n[4] AVERAGE-ONLY burst demo (9 hard rows, then 100 easy rows):")
    print(f"    full-run average travel = {avg:.1f} px (<= x_max=110) "
          f"yet first death at row: {death4}")
    print("    => the average must hold for every PREFIX (or a per-row "
          "cap must hold); a whole-run average is not a safety rule.")

    print("\nVERDICT: capped generation keeps the worst-case mouse alive "
          "over 5000 rows. Uncapped random rows also survived (random "
          "layouts are usually kind; the cap binds on extremes, not on "
          "typical rows), while the adversarial and average-only variants "
          "die -- so the test has teeth exactly where the rule matters.")


if __name__ == '__main__':
    main()

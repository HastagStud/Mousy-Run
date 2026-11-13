#!/bin/sh
# Run every mouse-ramp harness (node). Run from the tests/ directory.
cd "$(dirname "$0")" || exit 1
for t in test_mount.js test_green.js test_green2.js test_green_land.js test_bottom.js test_face.js \
         test_drop.js test_disembark.js test_stay_snap.js test_flicker.js \
         test_line_rules.js test_endless.js test_point.js test_delete.js test_front.js test_log.js test_snap.js test_touch.js test_twolines.js test_keptgreen.js test_climbdraw.js test_spentfinger.js test_anchor.js test_greenup.js test_gamenodes.js test_exitland.js test_genrows.js test_edge_turn.js test_points.js test_clouds.js test_green_parity.js test_traps.js test_speedramp.js test_mountbehind.js test_cats.js test_qa_tools.js test_resize.js test_banner_reset.js; do
  node "$t" || exit 1
done
echo "ALL SUITES PASSED"

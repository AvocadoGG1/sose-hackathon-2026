// Haxagon intake scale: plate for a single-bar load cell.
//
// Print TWO plates from this file, one of each variant:
//   variant = "bottom": sits pad-up on the table and bolts to the cable
//                       (fixed) end of the bar. Its underside says which
//                       way is front.
//   variant = "top":    flipped end-to-end (pad facing down onto the bar) and
//                       bolts to the free end. Its flat face is the food
//                       surface and carries the Haxagon logo.
// Both plates take M4 or M5 bolts; use whichever fits that end's threads.
// The arrow printed on the bar points down.
// Each plate's spacer pad holds the plate 5 mm away from the bar, so the
// coated middle of the bar never touches anything.
//
// Print flat, artwork face on the bed, pad facing up, no supports. Artwork
// is mirrored here so it reads correctly once the plate is flipped over.
//
// Export:  openscad -D 'variant="top"'    -o scale_plate_top.stl    scale_plate.scad
//          openscad -D 'variant="bottom"' -o scale_plate_bottom.stl scale_plate.scad
// Set `part` to "assembly" to preview both plates with the bar between them.

/* [Output] */
part = "plate";      // [plate, assembly]
variant = "top";     // [top, bottom]

/* [Load cell (measured)] */
bar_len = 80;
bar_w = 13;
bar_h = 13;
hole_end_offset = 4.75;   // bar end -> center of the outer hole
hole_spacing = 15;        // center-to-center of the two holes at one end

/* [Plate] */
plate_len = 150;          // X, along the bar
plate_w = 150;            // Y
plate_t = 6;

/* [Spacer pad] */
pad_len = 24;             // X, along the bar, starting flush with the bar end
pad_w = 16;               // Y
pad_h = 5;                // gap between plate face and bar

/* [Bolts] */
hole_d = 5.5;             // fits M5; M4 with a washer
recess_d = 10.5;          // M5 socket head (8.5) or an M4/M5 washer (9/10)
recess_depth = 3;
bolt_len = 20;            // M4x20 and M5x20
washer_t = 1;             // M5 washer is 1.0 mm; M4 is 0.8 mm

/* [Artwork] */
deboss_depth = 0.8;
deboss_max = 1;           // never cut deeper than this
keepout = 10;             // clearance from pad, bolt recesses and edges
font = "Liberation Sans:style=Bold";
cap_ratio = 0.956;        // cap height / text size for this font (measured)
min_text_h = 7;           // minimum cap height
logo_text_size = 8;       // "Haxagon"
sub_text_size = 7.5;      // "SOSE 2026" / "Hackathon"
label_text_size = 7.5;    // bottom plate labels
team = ["Andrew", "Daniel", "Evan", "Hanna", "Jose", "Justin"];
names_per_line = 3;       // names span the full plate width below the pad zone
name_sep = "  ·  ";
team_text_size = 7.5;
line_gap = 3;             // space between stacked lines
block_gap = 5;            // space between logo/arrow and the text around it
hex_w = 64;               // corner to corner
hex_stroke = 3;
arrow_len = 40;
arrow_shaft_w = 4;
arrow_head_w = 12;
arrow_head_len = 10;

$fn = 64;

// ---------- derived ----------
bar_x0 = -bar_len / 2;                            // the end this plate bolts to
hole_xs = [bar_x0 + hole_end_offset,
           bar_x0 + hole_end_offset + hole_spacing];
pad_end_x = bar_x0 + pad_len;
pad_end_wall = pad_end_x - (hole_xs[1] + hole_d / 2);
side_wall = (pad_w - hole_d) / 2;
grip = plate_t + pad_h - recess_depth + washer_t;  // material under the bolt head
thread_engagement = bolt_len - grip;
gap_between_plates = 2 * pad_h + bar_h;

// Artwork is laid out in "viewer" coordinates: looking down on the artwork
// face after the plate is flipped end-to-end, which maps model x to -x.
// The pad and bolt recesses then sit on the +x side, so the artwork goes in
// the open area to their left.
feature_x_near = min(-pad_end_x, -(hole_xs[1] + recess_d / 2));
art_x_min = -plate_len / 2 + keepout;
art_x_max = feature_x_near - keepout;
art_y_max = plate_w / 2 - keepout;
art_cx = (art_x_min + art_x_max) / 2;
art_w = art_x_max - art_x_min;

hex_h = hex_w * sqrt(3) / 2;                      // across the flats
sub_cap = sub_text_size * cap_ratio;
label_cap = label_text_size * cap_ratio;
team_cap = team_text_size * cap_ratio;

function join(v, sep, i = 0) =
    i >= len(v) ? "" : str(v[i], i < len(v) - 1 ? sep : "", join(v, sep, i + 1));
team_lines = [for (i = [0 : names_per_line : len(team) - 1])
                  join([for (j = [i : min(i + names_per_line, len(team)) - 1]) team[j]], name_sep)];

logo_block_h = hex_h + block_gap + 2 * sub_cap + line_gap;
team_block_h = len(team_lines) * team_cap + (len(team_lines) - 1) * line_gap;
top_art_h = logo_block_h + block_gap + team_block_h;
team_top_y = top_art_h / 2 - logo_block_h - block_gap;  // names are centered on the plate,
pad_zone_y = pad_w / 2 + keepout;                        // so they must sit below the pad zone
bottom_art_h = label_cap + block_gap + arrow_head_w + block_gap + 2 * label_cap + line_gap;

echo(str("Bolt thread engagement in the bar: ", thread_engagement, " mm (bar is ",
         bar_h, " mm tall)"));
echo(str("Artwork area (viewer frame): x ", art_x_min, "..", art_x_max,
         ", y ", -art_y_max, "..", art_y_max));

// ---------- sanity checks ----------
assert(plate_len >= bar_len && plate_w >= pad_w, "plate is smaller than the bar");
assert(pad_end_x < 0, "pad reaches past the middle of the bar and would touch the coating");
assert(pad_end_wall >= 1, "pad too short: inner hole breaks out of the pad end");
assert(side_wall >= 1, "pad too narrow for the holes");
assert(recess_d > hole_d, "recess must be wider than the hole");
assert(recess_depth < plate_t, "recess would cut through the plate");
assert(thread_engagement >= 4, "bolts too short for enough thread engagement");
assert(thread_engagement <= bar_h, "bolts would poke out the top of the bar");
assert(variant == "top" || variant == "bottom", "variant must be \"top\" or \"bottom\"");
assert(deboss_depth > 0 && deboss_depth <= deboss_max, "deboss deeper than deboss_max");
assert(min(sub_text_size, label_text_size, logo_text_size, team_text_size) * cap_ratio >= min_text_h,
       "text is shorter than min_text_h");
assert(hex_w <= art_w && top_art_h <= 2 * art_y_max,
       "logo does not fit in the artwork area");
assert(team_top_y <= -pad_zone_y, "team names would run into the pad zone");
assert(arrow_len <= art_w && bottom_art_h <= 2 * art_y_max,
       "arrow block does not fit in the artwork area");

// ---------- artwork (2D, viewer frame) ----------
module label(s, size, baseline_y, cx = art_cx) {
    translate([cx, baseline_y])
        text(s, size = size, font = font, halign = "center", valign = "baseline");
}

module top_art() {
    hex_cy = top_art_h / 2 - hex_h / 2;
    // hexagon outline
    translate([art_cx, hex_cy])
        difference() {
            circle(d = hex_w, $fn = 6);
            circle(d = hex_w - 2 * hex_stroke / cos(30), $fn = 6);
        }
    // "Haxagon" centered on its capital height
    translate([0, hex_cy]) label("Haxagon", logo_text_size, -logo_text_size * cap_ratio / 2);
    // two-line subtitle under the hexagon
    sub1 = hex_cy - hex_h / 2 - block_gap - sub_cap;
    sub2 = sub1 - line_gap - sub_cap;
    label("SOSE 2026", sub_text_size, sub1);
    label("Hackathon", sub_text_size, sub2);
    // team names under the subtitle, centered on the plate
    for (k = [0 : len(team_lines) - 1])
        label(team_lines[k], team_text_size,
              team_top_y - team_cap - k * (team_cap + line_gap), cx = 0);
}

module bottom_art() {
    front_y = bottom_art_h / 2 - label_cap;
    arrow_cy = front_y - block_gap - arrow_head_w / 2;
    label("FRONT", label_text_size, front_y);
    // arrow pointing toward the pad end (+x in the viewer frame)
    translate([art_cx - arrow_len / 2, arrow_cy]) {
        translate([0, -arrow_shaft_w / 2])
            square([arrow_len - arrow_head_len, arrow_shaft_w]);
        polygon([[arrow_len - arrow_head_len, -arrow_head_w / 2],
                 [arrow_len, 0],
                 [arrow_len - arrow_head_len, arrow_head_w / 2]]);
    }
    line1 = arrow_cy - arrow_head_w / 2 - block_gap - label_cap;
    label("Load cell", label_text_size, line1);
    label("arrow DOWN", label_text_size, line1 - line_gap - label_cap);
}

module artwork(v) {
    if (v == "top") top_art(); else bottom_art();
}

// ---------- plate ----------
module plate(v) {
    difference() {
        union() {
            translate([-plate_len / 2, -plate_w / 2, 0])
                cube([plate_len, plate_w, plate_t]);
            translate([bar_x0, -pad_w / 2, plate_t - 0.01])
                cube([pad_len, pad_w, pad_h + 0.01]);
        }
        for (x = hole_xs) {
            translate([x, 0, -1])
                cylinder(d = hole_d, h = plate_t + pad_h + 2);
            translate([x, 0, -1])
                cylinder(d = recess_d, h = recess_depth + 1);
        }
        // deboss into the flat face (z = 0), mirrored back into model coordinates
        translate([0, 0, -1])
            linear_extrude(deboss_depth + 1)
                mirror([1, 0, 0]) artwork(v);
    }
}

module load_cell() {
    color("silver", 0.6)
        translate([bar_x0, -bar_w / 2, 0])
            cube([bar_len, bar_w, bar_h]);
}

if (part == "plate") {
    plate(variant);
} else {
    color("orange") plate("bottom");                      // bolts to the M4 end
    translate([0, 0, plate_t + pad_h]) load_cell();
    color("teal")                                         // flipped, bolts to the M5 end
        translate([0, 0, 2 * plate_t + gap_between_plates])
            rotate([0, 180, 0]) plate("top");
}

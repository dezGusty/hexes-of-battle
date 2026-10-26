"""
Higher-fidelity (circa 2008-2012 "Civilization 5 / Shogun 2" style) low-poly barbarian for Hexes of Battle.

Instead of primitive spheres and cylinders, every anatomical body part and piece of gear is lofted:
  - Powerful, muscular broad-shouldered torso with barrel chest, latissimus flare, and defined waist
  - Heavy wolf/bear fur pelt mantle (Fur_Mantle) draped over the shoulders, upper chest, and back
  - Player-colored war tabard / loincloth (Tabard_Team) dyed in player team color (blue for P1, red for P2)
  - Heavy studded barbarian leather belt with iron ring buckle
  - Muscular bull neck connecting torso collar to head
  - Sculpted fierce barbarian head with prominent brow ridge, deep eye sockets, rugged nose,
    grim jawline, braided beard, moustache, and modeled ears
  - Iron skull helmet (Helmet_Horned) with swept curved beast horns (Helmet_Horns)
  - Muscular arms with heavy studded leather bracers (Bracer_L, Bracer_R)
  - Modeled hands articulated to wield the greataxe
  - Muscular legs, rugged cross-laced leather trousers, and fur-cuffed barbarian boots (Boot_L, Boot_R)
  - Massive double-bitted greataxe / battleaxe (Weapon, Axe_Blade) with ash haft, socket collar,
    dual crescent bearded blades, and top thrusting spike

Total budget is ~3k-3.8k triangles, optimal for 2008-2012 strategy game fidelity
while remaining ultra-fast for cross-platform and mobile rendering.

Blender axes: +X = forward, +Y = unit's left (Arm_L), +Z = up. The glTF exporter converts to Y-up.

Rig contract:
  Torso (root)  -> Head, Arm_L, Arm_R, Leg_L, Leg_R
  Arm_R         -> Weapon (double-bitted battleaxe)
  Torso         -> Fur_Mantle, Tabard_Team, Belt, Neck
  Head          -> Helmet_Horned, Helmet_Horns, Ear_L, Ear_R
  Arm_L         -> Bracer_L, Hand_L
  Arm_R         -> Bracer_R, Hand_R, Weapon -> Axe_Blade
  Leg_L         -> Boot_L
  Leg_R         -> Boot_R
"""

import math
import random
import bmesh
from mathutils import Euler, Vector

# ---------------------------------------------------------------------------------------
# Proportions (metres; heavy muscular build, overall height ~1.15m with horns)
# ---------------------------------------------------------------------------------------
HIP_Z = 0.40
SHOULDER_Z = 0.77
SHOULDER_Y = 0.205  # wide barbarian shoulder span
HIP_Y = 0.088
HEAD_PIVOT_Z = 0.88
HEAD_H = 0.185
HEAD_CHIN_Z = 0.02

X_AXIS = Vector((1.0, 0.0, 0.0))
Y_AXIS = Vector((0.0, 1.0, 0.0))
Z_AXIS = Vector((0.0, 0.0, 1.0))


# ---------------------------------------------------------------------------------------
# Loft helpers
# ---------------------------------------------------------------------------------------
def _superellipse(theta, p):
    e = 2.0 / p
    c, s = math.cos(theta), math.sin(theta)
    return math.copysign(abs(c) ** e, c), math.copysign(abs(s) ** e, s)


def make_ring(bm, centre, a_vec, b_vec, ra, rb, thetas, p=2.0):
    """One cross-section: `a` is the lateral axis (radius ra), `b` the fore-aft axis (radius rb).
    `rb` may be a (front, back) tuple for asymmetric sections."""
    verts = []
    for th in thetas:
        cx, sy = _superellipse(th, p)
        if isinstance(rb, tuple):
            rbv = rb[0] if cx >= 0 else rb[1]
            off = b_vec * (rbv * cx)
        else:
            off = b_vec * (rb * cx)
        verts.append(bm.verts.new(centre + off + a_vec * (ra * sy)))
    return verts


def bridge_rings(bm, rings, closed_bottom=False, closed_top=False):
    """Skin consecutive rings with quads; orientation is fixed automatically so normals face out."""
    n = len(rings[0])
    faces = []
    for i in range(len(rings) - 1):
        for k in range(n):
            k2 = (k + 1) % n
            faces.append(bm.faces.new((rings[i][k], rings[i][k2], rings[i + 1][k2], rings[i + 1][k])))
    if closed_bottom:
        faces.append(bm.faces.new(list(rings[0])))
    if closed_top:
        faces.append(bm.faces.new(list(reversed(rings[-1]))))
    return faces


def _orient_outward(bm, faces, centre_hint):
    """Flip faces if normals point towards centre_hint."""
    bm.normal_update()
    score = 0.0
    for f in faces:
        score += f.normal.dot(f.calc_center_median() - centre_hint)
    if score < 0:
        bmesh.ops.reverse_faces(bm, faces=faces)


def tube(bm, path, radii, segments=10, p=2.0, up_hint=Y_AXIS, cap_start=True, cap_end=True, thetas=None):
    """Loft along a polyline `path`."""
    if thetas is None:
        thetas = [2 * math.pi * k / segments for k in range(segments)]
    rings = []
    for i, c in enumerate(path):
        if len(path) == 1:
            t = Z_AXIS
        elif i == 0:
            t = (path[1] - path[0]).normalized()
        elif i == len(path) - 1:
            t = (path[-1] - path[-2]).normalized()
        else:
            t = (path[i + 1] - path[i - 1]).normalized()

        a = t.cross(up_hint)
        if a.length < 1e-4:
            a = t.cross(X_AXIS)
        a.normalize()
        b = a.cross(t).normalized()

        r = radii[i]
        ra, rb = (r, r) if isinstance(r, (int, float)) else r
        rings.append(make_ring(bm, c, a, b, ra, rb, thetas, p=p))

    faces = bridge_rings(bm, rings, closed_bottom=cap_start, closed_top=cap_end)
    mid = sum(path, Vector((0, 0, 0))) / len(path)
    _orient_outward(bm, faces, mid)
    return rings


def z_loft(bm, stations, segments=16, p_default=2.0, cap_start=True, cap_end=True, thetas=None):
    """Stack of horizontal cross-sections at given heights Z."""
    if thetas is None:
        thetas = [2 * math.pi * k / segments for k in range(segments)]
    rings = []
    zs = []
    for row in stations:
        z = row[0]
        cx = row[1] if len(row) > 1 else 0.0
        rb = row[2] if len(row) > 2 else 0.1
        ra = row[3] if len(row) > 3 else rb
        p = row[4] if len(row) > 4 else p_default
        c = Vector((cx, 0.0, z))
        rings.append(make_ring(bm, c, Y_AXIS, X_AXIS, ra, rb, thetas, p=p))
        zs.append(z)
    faces = bridge_rings(bm, rings, closed_bottom=cap_start, closed_top=cap_end)
    mid_z = (zs[0] + zs[-1]) * 0.5
    _orient_outward(bm, faces, Vector((0.0, 0.0, mid_z)))
    return rings


def gauss(x, z, x0, z0, sx, sz):
    return math.exp(-0.5 * (((x - x0) / sx) ** 2 + ((z - z0) / sz) ** 2))


# ---------------------------------------------------------------------------------------
# Head, Face & Braided Beard (head-local coordinates, pivot at 0, 0, 0.88)
# ---------------------------------------------------------------------------------------
_BARBARIAN_SKULL_PROFILE = [
    # zf,   xf,     xb,      w,     p
    (0.00, 0.030, -0.048, 0.042, 2.3),   # under jaw
    (0.04, 0.052, -0.058, 0.050, 2.4),
    (0.09, 0.065, -0.068, 0.058, 2.4),   # heavy squared chin
    (0.15, 0.068, -0.076, 0.063, 2.4),   # wide grim mouth
    (0.21, 0.069, -0.082, 0.067, 2.4),   # base of nose / moustache
    (0.26, 0.070, -0.088, 0.070, 2.3),   # nose
    (0.31, 0.070, -0.092, 0.072, 2.3),   # broad cheekbones
    (0.36, 0.068, -0.095, 0.073, 2.3),   # deep eye line
    (0.41, 0.067, -0.097, 0.074, 2.3),
    (0.46, 0.066, -0.098, 0.074, 2.3),
    (0.51, 0.066, -0.098, 0.074, 2.3),
    (0.56, 0.070, -0.098, 0.074, 2.3),   # heavy warrior brow ridge
    (0.61, 0.067, -0.097, 0.074, 2.3),
    (0.67, 0.064, -0.095, 0.072, 2.2),
    (0.73, 0.058, -0.092, 0.070, 2.2),
    (0.80, 0.050, -0.085, 0.065, 2.1),
    (0.87, 0.038, -0.073, 0.056, 2.0),
    (0.93, 0.024, -0.054, 0.044, 2.0),
    (0.975, 0.010, -0.030, 0.026, 2.0),
]


def _barbarian_profile_at(zf):
    pts = _BARBARIAN_SKULL_PROFILE
    for i in range(len(pts) - 1):
        z0, z1 = pts[i][0], pts[i + 1][0]
        if z0 <= zf <= z1:
            t = (zf - z0) / (z1 - z0)
            return tuple(pts[i][j] + (pts[i + 1][j] - pts[i][j]) * t for j in range(1, 5))
    return pts[-1][1:]


def _head_thetas():
    degs = [-75 + 7.5 * i for i in range(21)] + [105, 135, 165, 195, 225, 255]
    return sorted(math.radians(d % 360) for d in degs)


def build_head_bmesh():
    """Sculpted fierce barbarian head with heavy brows, deep eye sockets, and braided beard."""
    bm = bmesh.new()
    zfs = [0.0, 0.04, 0.09, 0.15, 0.21, 0.26, 0.31, 0.36, 0.41, 0.46, 0.51, 0.56, 0.61, 0.67, 0.73, 0.80, 0.87, 0.93, 0.975]
    thetas = _head_thetas()
    rings = []
    for zf in zfs:
        xf, xb, w, p = _barbarian_profile_at(zf)
        z = HEAD_CHIN_Z + zf * HEAD_H
        rings.append(make_ring(bm, Vector((0.0, 0.0, z)), Y_AXIS, X_AXIS, w, (xf, -xb), thetas, p))
    faces = bridge_rings(bm, rings, closed_bottom=True, closed_top=False)

    crown = bm.verts.new(Vector((-0.012, 0.0, HEAD_CHIN_Z + HEAD_H)))
    top = rings[-1]
    n = len(top)
    for k in range(n):
        faces.append(bm.faces.new((top[k], top[(k + 1) % n], crown)))
    _orient_outward(bm, faces, Vector((0, 0, HEAD_CHIN_Z + HEAD_H * 0.5)))

    def zfz(frac):
        return HEAD_CHIN_Z + frac * HEAD_H

    for v in bm.verts:
        x, y, z = v.co
        if x <= 0.0:
            continue
        ay = abs(y)
        dx = 0.0
        # Broad rugged warrior nose
        dx += 0.033 * gauss(ay, z, 0.0, zfz(0.335), 0.015, 0.0125)
        dx += 0.016 * gauss(ay, z, 0.0, zfz(0.455), 0.011, 0.0180)
        dx += 0.014 * gauss(ay, z, 0.020, zfz(0.315), 0.010, 0.0105)
        # Heavy prominent furrowed brow ridge
        dx += 0.016 * gauss(ay, z, 0.0, zfz(0.575), 0.052, 0.0110)
        # Sunken fierce eye sockets
        dx -= 0.013 * gauss(ay, z, 0.032, zfz(0.505), 0.017, 0.0105)
        # Wide angular cheekbones
        dx += 0.011 * gauss(ay, z, 0.054, zfz(0.385), 0.022, 0.0160)
        # Grimacing warrior mouth
        dx += 0.007 * gauss(ay, z, 0.0, zfz(0.238), 0.024, 0.0090)
        dx += 0.006 * gauss(ay, z, 0.0, zfz(0.190), 0.022, 0.0090)
        # Heavy square jaw
        dx += 0.015 * gauss(ay, z, 0.0, zfz(0.075), 0.024, 0.0130)
        # Full barbarian braided beard volume projecting forward below mouth
        dx += 0.022 * gauss(ay, z, 0.0, zfz(0.120), 0.036, 0.0280)
        v.co.x = x + dx

    bm.normal_update()
    return bm


def build_ear_bmesh(side):
    bm = bmesh.new()
    ret = bmesh.ops.create_uvsphere(bm, u_segments=8, v_segments=6, radius=1.0)
    bmesh.ops.scale(bm, verts=ret["verts"], vec=(0.011, 0.007, 0.019))
    bmesh.ops.rotate(bm, verts=ret["verts"], cent=(0, 0, 0), matrix=Euler((0, math.radians(-10), 0)).to_matrix())
    bmesh.ops.translate(bm, verts=ret["verts"], vec=(-0.012, side * 0.074, HEAD_CHIN_Z + HEAD_H * 0.47))
    return bm


# ---------------------------------------------------------------------------------------
# Horned Iron Helmet (Helmet_Horned, Helmet_Horns)
# ---------------------------------------------------------------------------------------
def build_horned_helmet_bmesh():
    """
    Hammered iron barbarian skull cap / nasal helm:
      - Low-profile dome hugging skull down to brow level
      - Brow reinforcing band with heavy hammered iron rivets
      - Triangular nasal guard protecting nose bridge
    """
    bm = bmesh.new()
    brow_z = HEAD_CHIN_Z + HEAD_H * 0.58  # ~0.127m

    # 1. Skull dome stations
    dome_stations = [
        (brow_z + 0.000, -0.004, 0.092, 0.086, 2.3),
        (brow_z + 0.025, -0.006, 0.090, 0.084, 2.3),
        (brow_z + 0.050, -0.008, 0.085, 0.079, 2.2),
        (brow_z + 0.075, -0.011, 0.074, 0.068, 2.1),
        (brow_z + 0.095, -0.014, 0.055, 0.050, 2.0),
        (brow_z + 0.110, -0.016, 0.030, 0.028, 2.0),
        (brow_z + 0.116, -0.018, 0.010, 0.010, 2.0),
    ]
    thetas = [2 * math.pi * k / 16 for k in range(16)]
    z_loft(bm, dome_stations, segments=16, cap_start=False, cap_end=True, thetas=thetas)

    # 2. Brow reinforcing band
    band_stations = [
        (brow_z - 0.006, -0.004, 0.094, 0.088, 2.3),
        (brow_z + 0.016, -0.005, 0.093, 0.087, 2.3),
    ]
    z_loft(bm, band_stations, segments=16, cap_start=False, cap_end=False, thetas=thetas)

    # 3. Triangular nasal guard down over nose bridge
    nasal_pts = [
        Vector((0.088, 0.0, brow_z + 0.008)),
        Vector((0.092, 0.0, brow_z - 0.025)),
        Vector((0.094, 0.0, brow_z - 0.055)),
    ]
    tube(bm, nasal_pts, [(0.014, 0.005), (0.010, 0.005), (0.006, 0.004)], segments=4, up_hint=Y_AXIS, cap_start=True, cap_end=True)

    # 4. Rivet studs around brow band
    for k in range(8):
        rth = 2 * math.pi * k / 8
        rc, rs = math.cos(rth), math.sin(rth)
        rv_x = -0.004 + rc * 0.095
        rv_y = rs * 0.089
        rv_z = brow_z + 0.005

        ret = bmesh.ops.create_cube(bm, size=1.0)
        bmesh.ops.scale(bm, verts=ret["verts"], vec=(0.006, 0.006, 0.006))
        bmesh.ops.translate(bm, verts=ret["verts"], vec=(rv_x, rv_y, rv_z))

    bm.normal_update()
    return bm


def build_helmet_horns_bmesh():
    """
    Swept curved beast horns emerging from the sides of the helmet:
      - Horn bases attach to temporal plates
      - Sweeps gracefully outward, upward, and slightly forward to sharp tips
    """
    bm = bmesh.new()
    brow_z = HEAD_CHIN_Z + HEAD_H * 0.58

    for side in (-1.0, 1.0):
        # Spline path for sweeping horn
        horn_path = [
            Vector((-0.004, side * 0.082, brow_z + 0.018)),   # base at helmet
            Vector((0.008, side * 0.125, brow_z + 0.042)),    # sweeping out
            Vector((0.004, side * 0.160, brow_z + 0.085)),    # curving up
            Vector((-0.014, side * 0.170, brow_z + 0.138)),   # vertical apex
            Vector((-0.032, side * 0.155, brow_z + 0.185)),   # recurving tip
        ]
        horn_radii = [
            (0.026, 0.024),  # heavy horn base socket
            (0.021, 0.019),
            (0.015, 0.013),
            (0.009, 0.008),
            (0.003, 0.002),  # sharp horn tip
        ]
        tube(bm, horn_path, horn_radii, segments=8, up_hint=Z_AXIS, cap_start=True, cap_end=True)

        # Flanged brass / iron horn socket ring at helmet junction
        socket_pts = [horn_path[0], horn_path[0] + (horn_path[1] - horn_path[0]).normalized() * 0.016]
        tube(bm, socket_pts, [(0.030, 0.028), (0.028, 0.026)], segments=8, up_hint=Z_AXIS, cap_start=False, cap_end=False)

    bm.normal_update()
    return bm


# ---------------------------------------------------------------------------------------
# Muscular Torso, Wolf Fur Pelt Mantle, War Tabard & Belt
# ---------------------------------------------------------------------------------------
_BARBARIAN_TORSO_STATIONS = [
    (0.390, 0.000, 0.096, 0.124, 2.4),   # waistline / hip crest
    (0.440, 0.002, 0.090, 0.116, 2.5),   # navel / groin cinch
    (0.495, 0.004, 0.086, 0.108, 2.5),   # waist cinch (belt level)
    (0.575, 0.008, 0.096, 0.124, 2.4),   # lower ribcage / abs
    (0.665, 0.012, 0.106, 0.142, 2.3),   # massive chest / pectorals
    (0.745, 0.008, 0.102, 0.148, 2.4),   # upper clavicles & broad shoulders
    (0.785, 0.002, 0.084, 0.144, 2.6),   # trapezial shoulder slope
    (0.815, -0.002, 0.058, 0.095, 2.4),  # neck base
    (0.835, -0.004, 0.048, 0.058, 2.2),  # collar rim
]


def _barbarian_interp_station(z):
    st = _BARBARIAN_TORSO_STATIONS
    for i in range(len(st) - 1):
        if st[i][0] <= z <= st[i + 1][0]:
            t = (z - st[i][0]) / (st[i + 1][0] - st[i][0])
            return tuple(st[i][j] + (st[i + 1][j] - st[i][j]) * t for j in range(1, 5))
    return st[-1][1:]


def build_torso_bmesh():
    """Powerful muscular barbarian torso with barrel chest and broad shoulders."""
    bm = bmesh.new()
    z_loft(bm, _BARBARIAN_TORSO_STATIONS, segments=20, cap_start=True, cap_end=True)
    return bm


def build_fur_mantle_bmesh():
    """
    Heavy wolf / bear fur pelt mantle draped heavily over the shoulders, upper chest, and upper back:
      - Adds substantial bulk to the upper torso
      - Shaggy silhouette with jagged overhangs and thick fur layers
      - Front iron/bone clasp across the clavicles
    """
    bm = bmesh.new()
    # Mantle stations stacked from mid-chest up to neck collar
    mantle_stations = [
        (0.660, 0.006, 0.118, 0.165, 2.3),   # jagged lower pelt hem
        (0.700, 0.008, 0.120, 0.170, 2.3),
        (0.745, 0.008, 0.118, 0.172, 2.4),   # shoulder bulge
        (0.790, 0.002, 0.100, 0.165, 2.5),   # thick fur collar
        (0.830, -0.002, 0.068, 0.108, 2.3),  # neck fur ruff
    ]
    thetas = [2 * math.pi * k / 20 for k in range(20)]
    rings = z_loft(bm, mantle_stations, segments=20, cap_start=False, cap_end=True, thetas=thetas)

    # Scallop / perturb lower rim vertices to produce shaggy fur tufts
    rnd = random.Random(42)
    for v in rings[0]:
        th = math.atan2(v.co.y, v.co.x)
        # Jagged fur tufts hanging downward
        drop = 0.024 * (0.5 + 0.5 * math.sin(th * 6.0)) + rnd.uniform(-0.005, 0.005)
        v.co.z -= drop
        # Slightly flare outwards
        v.co.x *= 1.05
        v.co.y *= 1.05

    # Front pelt opening across chest
    bm.normal_update()
    kill = []
    for f in bm.faces:
        c = f.calc_center_median()
        if c.x > 0.02 and c.z < 0.77:
            half_open = 0.015 + max(0.0, 0.77 - c.z) * 0.18
            if abs(c.y) < half_open:
                kill.append(f)
    bmesh.ops.delete(bm, geom=kill, context="FACES")

    # Heavy iron / bone ring clasp across front clavicles
    ret = bmesh.ops.create_cone(bm, segments=12, radius1=0.020, radius2=0.020, depth=0.008)
    bmesh.ops.rotate(bm, verts=ret["verts"], cent=(0, 0, 0), matrix=Euler((0, math.radians(90), 0)).to_matrix())
    bmesh.ops.translate(bm, verts=ret["verts"], vec=(0.112, 0.0, 0.740))

    bm.normal_update()
    return bm


def build_tabard_bmesh():
    """
    Player-colored barbarian war tabard / loincloth (Tabard_Team):
      - Dyed in player-specific team color (blue for P1, red for P2)
      - Front and rear rectangular leather/cloth panels hanging from belt over thighs
    """
    bm = bmesh.new()
    # Stations from waistbelt down over hips/thighs
    zs = [0.280, 0.330, 0.380, 0.430, 0.485]
    stations = []
    for z in zs:
        cx, rb, ra, p = _barbarian_interp_station(z)
        grow = 0.008
        stations.append((z, cx, rb + grow, ra + grow, p))
    # Lower hem flare
    stations[0] = (stations[0][0], stations[0][1], stations[0][2] + 0.010, stations[0][3] + 0.012, stations[0][4])
    z_loft(bm, stations, segments=20, cap_start=False, cap_end=False)

    bm.normal_update()
    # Cut side slits so front and back loincloth flaps hang freely over legs
    kill = []
    for f in bm.faces:
        c = f.calc_center_median()
        # Side regions (|y| > 0.055) are cut open below belt
        if abs(c.y) > 0.050 and c.z < 0.460:
            kill.append(f)
    bmesh.ops.delete(bm, geom=kill, context="FACES")
    return bm


def build_belt_bmesh():
    """Heavy studded barbarian leather belt with iron ring buckle."""
    bm = bmesh.new()
    cx, rb, ra, p = _barbarian_interp_station(0.495)
    r_b, r_a = rb + 0.015, ra + 0.015
    z_loft(bm, [(0.475, cx, r_b, r_a, p), (0.515, cx, r_b, r_a, p)], segments=20, cap_start=False, cap_end=False)

    # Massive iron ring buckle at front center
    ret = bmesh.ops.create_cone(bm, segments=12, radius1=0.034, radius2=0.034, depth=0.012)
    bmesh.ops.rotate(bm, verts=ret["verts"], cent=(0, 0, 0), matrix=Euler((0, math.radians(90), 0)).to_matrix())
    bmesh.ops.translate(bm, verts=ret["verts"], vec=(cx + r_b + 0.005, 0.0, 0.495))

    # Belt studs
    thetas = [2 * math.pi * k / 8 for k in range(8)]
    for th in thetas:
        if abs(math.sin(th)) > 0.2:  # avoid center buckle
            c, s = math.cos(th), math.sin(th)
            stud = bmesh.ops.create_cube(bm, size=1.0)
            bmesh.ops.scale(bm, verts=stud["verts"], vec=(0.005, 0.008, 0.008))
            bmesh.ops.translate(bm, verts=stud["verts"], vec=(cx + r_b * c, r_a * s, 0.495))

    return bm


def build_neck_bmesh():
    """Thick muscular bull neck connecting torso to cranium/jaw."""
    bm = bmesh.new()
    path = [
        Vector((-0.004, 0.0, 0.795)),  # inside collar
        Vector((-0.006, 0.0, 0.835)),  # throat
        Vector((-0.008, 0.0, 0.875)),  # jaw level
        Vector((-0.010, 0.0, 0.915)),  # skull insertion
    ]
    radii = [
        (0.052, 0.050),
        (0.046, 0.044),
        (0.043, 0.042),
        (0.040, 0.039),
    ]
    tube(bm, path, radii, segments=12, up_hint=Y_AXIS, cap_start=False, cap_end=True)
    return bm


# ---------------------------------------------------------------------------------------
# Arms, Heavy Studded Bracers, and Articulated Hands
# ---------------------------------------------------------------------------------------
def build_arm_bmesh(side):
    """Muscular upper arm with bicep and deltoid volume, shoulder-relative."""
    bm = bmesh.new()
    path = [
        Vector((0.0, 0, 0.030)),
        Vector((0.005, 0, -0.030)),
        Vector((0.014, 0, -0.090)),
        Vector((0.022, 0, -0.150)),
    ]
    radii = [
        (0.054, 0.056),
        (0.052, 0.054),
        (0.048, 0.049),
        (0.044, 0.045),
    ]
    tube(bm, path, radii, segments=12, cap_start=True, cap_end=True)
    return bm


def build_bracer_bmesh(side):
    """Heavy studded leather bracers protecting forearms with rawhide strap bindings."""
    bm = bmesh.new()
    forearm_pts = [
        Vector((0.022, 0, -0.150)),
        Vector((0.036, 0, -0.194)),
        Vector((0.052, 0, -0.242)),
        Vector((0.066, 0, -0.288)),
    ]
    tube(bm, forearm_pts, [(0.042, 0.041), (0.040, 0.039), (0.036, 0.035), (0.031, 0.030)], segments=10, cap_start=False, cap_end=False)

    # Iron reinforcement plate on outer forearm
    plate = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, verts=plate["verts"], vec=(0.028, 0.016, 0.115))
    bmesh.ops.translate(bm, verts=plate["verts"], vec=(0.045, side * 0.028, -0.220))
    return bm


WRIST = Vector((0.066, 0.0, -0.288))
HAND_DIR = Vector((0.27, 0.0, -0.96)).normalized()


def build_hand_bmesh(side, is_weapon_hand=True):
    """
    Barbarian hand with thick knuckles and curled fingers:
      - Formed to grip the heavy battleaxe haft
    """
    bm = bmesh.new()
    pts, radii = [], []
    for s, ra, rb in [
        (-0.006, 0.028, 0.021),
        (0.018, 0.034, 0.023),
        (0.042, 0.035, 0.022),
        (0.066, 0.032, 0.020),
        (0.086, 0.023, 0.015),
    ]:
        c = WRIST + HAND_DIR * s + X_AXIS * (0.52 * max(0.0, s - 0.03) ** 2 * 6.0)
        pts.append(c)
        radii.append((ra, rb))
    tube(bm, pts, radii, segments=8, cap_start=False, cap_end=True)

    inner = -side
    thumb = [
        WRIST + HAND_DIR * 0.012 + Y_AXIS * (inner * 0.027),
        WRIST + HAND_DIR * 0.038 + Y_AXIS * (inner * 0.035) + X_AXIS * 0.014,
        WRIST + HAND_DIR * 0.060 + Y_AXIS * (inner * 0.031) + X_AXIS * 0.026,
    ]
    tube(bm, thumb, [(0.012, 0.012), (0.010, 0.010), (0.008, 0.008)], segments=6, cap_start=True, cap_end=True)
    return bm


# ---------------------------------------------------------------------------------------
# Legs & Fur-Cuffed Boots
# ---------------------------------------------------------------------------------------
def build_leg_bmesh():
    """Muscular legs with rugged leather trousers, hip-relative."""
    bm = bmesh.new()
    path = [
        Vector((0, 0, 0.060)),
        Vector((0, 0, 0.000)),
        Vector((0.005, 0, -0.100)),
        Vector((0.016, 0, -0.210)),
        Vector((0.010, 0, -0.280)),
        Vector((0.0, 0, -0.370)),
        Vector((-0.002, 0, -0.400)),
    ]
    radii = [
        (0.060, 0.058),
        (0.064, 0.062),
        (0.059, 0.057),
        (0.050, 0.048),
        (0.052, 0.048),
        (0.040, 0.038),
        (0.037, 0.035),
    ]
    tube(bm, path, radii, segments=12, up_hint=Y_AXIS, cap_start=True, cap_end=False)
    return bm


def build_boot_bmesh():
    """Turned-leather barbarian boots with folded fur cuffs and rugged hide soles."""
    bm = bmesh.new()
    # Folded fur cuff around top of boot
    cuff = [Vector((0.0, 0, -0.270)), Vector((0.0, 0, -0.315))]
    tube(bm, cuff, [(0.058, 0.056), (0.052, 0.050)], segments=12, cap_start=True, cap_end=False)

    # Ankle shaft
    shaft = [Vector((0.0, 0, -0.315)), Vector((0.0, 0, -0.365)), Vector((-0.002, 0, -0.420))]
    tube(bm, shaft, [(0.050, 0.048), (0.043, 0.041), (0.043, 0.041)], segments=12, cap_start=False, cap_end=False)

    # Foot stations along +X
    stations = [
        (-0.046, -0.424, 0.038, 0.034),  # heel
        (-0.016, -0.422, 0.040, 0.038),  # instep
        (0.028, -0.434, 0.029, 0.042),   # midfoot
        (0.070, -0.442, 0.020, 0.042),   # ball
        (0.105, -0.446, 0.016, 0.034),   # toe
        (0.128, -0.450, 0.010, 0.019),   # tip
    ]
    thetas = [2 * math.pi * k / 10 for k in range(10)]
    rings = []
    for (x, cz, hz, hy) in stations:
        rings.append(make_ring(bm, Vector((x, 0.0, cz)), Y_AXIS, Z_AXIS, hy, hz, thetas, 2.4))
    faces = bridge_rings(bm, rings, closed_bottom=True, closed_top=True)
    _orient_outward(bm, faces, Vector((0.04, 0.0, -0.436)))
    return bm


# ---------------------------------------------------------------------------------------
# Massive Double-Bitted Greataxe / Battleaxe (Weapon & Axe_Blade)
# ---------------------------------------------------------------------------------------
def build_axe_shaft_bmesh():
    """
    Stout ash haft wrapped with cross-laced leather grip in the center:
      - Haft length ~1.05m
      - Socket collar wrapping haft where blades attach
      - Top thrusting spike and bottom iron butt pommel
    """
    bm = bmesh.new()
    palm_c = WRIST + HAND_DIR * 0.048 + X_AXIS * 0.005

    # Shaft direction: combat ready guard stance forward and up (+X ~0.42, +Z ~0.91)
    sdir = Vector((0.42, 0.0, 0.91)).normalized()

    butt_p = palm_c - sdir * 0.38
    socket_p = palm_c + sdir * 0.44
    spike_p = palm_c + sdir * 0.65

    # Ash haft
    tube(bm, [butt_p, palm_c, socket_p], [(0.022, 0.022), (0.020, 0.020), (0.024, 0.024)], segments=8, up_hint=Y_AXIS, cap_start=False, cap_end=False)

    # Leather wrapped grip around palm
    tube(bm, [palm_c - sdir * 0.12, palm_c + sdir * 0.12], [(0.023, 0.023), (0.023, 0.023)], segments=8, up_hint=Y_AXIS, cap_start=False, cap_end=False)

    # Top thrusting spearpoint / spike extending past socket
    spike_pts = [socket_p, socket_p + sdir * 0.12, spike_p]
    tube(bm, spike_pts, [(0.026, 0.026), (0.016, 0.010), (0.003, 0.002)], segments=6, up_hint=Y_AXIS, cap_start=False, cap_end=True)

    # Iron butt pommel at base of haft
    tube(bm, [butt_p, butt_p - sdir * 0.045], [(0.024, 0.024), (0.012, 0.012)], segments=6, up_hint=Y_AXIS, cap_start=False, cap_end=True)

    return bm


def build_axe_blades_bmesh():
    """
    Massive dual crescent bearded axe blades extending forward (+X) and backward (-X):
      - Central socket collar
      - Broad sweeping bearded cutting edges with honed bevels
    """
    bm = bmesh.new()
    palm_c = WRIST + HAND_DIR * 0.048 + X_AXIS * 0.005
    sdir = Vector((0.42, 0.0, 0.91)).normalized()
    socket_c = palm_c + sdir * 0.44

    # Central iron socket collar
    tube(bm, [socket_c - sdir * 0.09, socket_c + sdir * 0.09], [(0.034, 0.034), (0.034, 0.034)], segments=10, up_hint=Y_AXIS, cap_start=False, cap_end=False)

    # Normal vector perpendicular to haft in X-Z plane
    blade_dir = Vector((sdir.z, 0.0, -sdir.x)).normalized()

    # 1. Front primary bearded axe blade (+blade_dir)
    # Profile stations along blade_dir: socket -> cheek -> cutting edge
    f_stations = [
        (0.030, 0.024, 0.120),  # at socket
        (0.120, 0.016, 0.180),  # mid cheek
        (0.230, 0.004, 0.250),  # wide crescent cutting edge
    ]
    rings = []
    thetas = [2 * math.pi * k / 12 for k in range(12)]
    for dist, thick, height in f_stations:
        c = socket_c + blade_dir * dist
        # Elongated in sdir (height) and thin in Y (thick)
        rings.append(make_ring(bm, c, Y_AXIS, sdir, thick * 0.5, height * 0.5, thetas, p=2.2))
    faces = bridge_rings(bm, rings, closed_bottom=False, closed_top=True)
    _orient_outward(bm, faces, socket_c)

    # 2. Rear secondary axe blade (-blade_dir)
    r_stations = [
        (-0.030, 0.024, 0.110),
        (-0.100, 0.016, 0.160),
        (-0.200, 0.004, 0.220),
    ]
    r_rings = []
    for dist, thick, height in r_stations:
        c = socket_c + blade_dir * dist
        r_rings.append(make_ring(bm, c, Y_AXIS, sdir, thick * 0.5, height * 0.5, thetas, p=2.2))
    r_faces = bridge_rings(bm, r_rings, closed_bottom=False, closed_top=True)
    _orient_outward(bm, r_faces, socket_c)

    bm.normal_update()
    return bm


# ---------------------------------------------------------------------------------------
# Scene assembly
# ---------------------------------------------------------------------------------------
def assemble_barbarian(create_mesh_object, make_material):
    """Create the full barbarian hierarchy in the current Blender scene and return the rig dict."""
    mats = {
        "skin": make_material("BarbarianSkin", (0.87, 0.70, 0.56, 1.0), metallic=0.0, roughness=0.72),
        "clothing": make_material("BarbarianClothing", (0.34, 0.22, 0.12, 1.0), metallic=0.05, roughness=0.82),
        "team": make_material("TeamColor", (0.22, 0.42, 0.78, 1.0), metallic=0.04, roughness=0.76),
        "leather": make_material("BarbarianLeather", (0.18, 0.12, 0.08, 1.0), metallic=0.04, roughness=0.78),
        "iron": make_material("BarbarianIron", (0.52, 0.55, 0.58, 1.0), metallic=0.78, roughness=0.40),
        "horn": make_material("BarbarianHorn", (0.90, 0.88, 0.80, 1.0), metallic=0.06, roughness=0.55),
        "wood": make_material("BarbarianWood", (0.46, 0.30, 0.16, 1.0), metallic=0.08, roughness=0.68),
        "steel": make_material("BarbarianSteel", (0.72, 0.75, 0.80, 1.0), metallic=0.82, roughness=0.34),
    }

    # 1. Torso (root object at 0, 0, 0)
    torso = create_mesh_object("Torso", build_torso_bmesh(), mats["skin"], location=(0, 0, 0))
    create_mesh_object("Fur_Mantle", build_fur_mantle_bmesh(), mats["clothing"], parent=torso)
    create_mesh_object("Tabard_Team", build_tabard_bmesh(), mats["team"], parent=torso)
    create_mesh_object("Belt", build_belt_bmesh(), mats["leather"], parent=torso)
    create_mesh_object("Neck", build_neck_bmesh(), mats["skin"], parent=torso)

    # 2. Head (pivot at z = 0.88)
    head = create_mesh_object("Head", build_head_bmesh(), mats["skin"], parent=torso, location=(0, 0, HEAD_PIVOT_Z))
    helmet = create_mesh_object("Helmet_Horned", build_horned_helmet_bmesh(), mats["iron"], parent=head)
    create_mesh_object("Helmet_Horns", build_helmet_horns_bmesh(), mats["horn"], parent=helmet)
    create_mesh_object("Ear_L", build_ear_bmesh(1.0), mats["skin"], parent=head)
    create_mesh_object("Ear_R", build_ear_bmesh(-1.0), mats["skin"], parent=head)

    # 3. Left Arm (pivot at y = +0.205, z = 0.77)
    arm_l = create_mesh_object("Arm_L", build_arm_bmesh(1.0), mats["skin"], parent=torso, location=(0, SHOULDER_Y, SHOULDER_Z))
    create_mesh_object("Bracer_L", build_bracer_bmesh(1.0), mats["leather"], parent=arm_l)
    create_mesh_object("Hand_L", build_hand_bmesh(1.0, is_weapon_hand=False), mats["skin"], parent=arm_l)

    # 4. Right Arm (pivot at y = -0.205, z = 0.77)
    arm_r = create_mesh_object("Arm_R", build_arm_bmesh(-1.0), mats["skin"], parent=torso, location=(0, -SHOULDER_Y, SHOULDER_Z))
    create_mesh_object("Bracer_R", build_bracer_bmesh(-1.0), mats["leather"], parent=arm_r)
    create_mesh_object("Hand_R", build_hand_bmesh(-1.0, is_weapon_hand=True), mats["skin"], parent=arm_r)

    # Massive double-bitted battleaxe in right hand
    weapon = create_mesh_object("Weapon", build_axe_shaft_bmesh(), mats["wood"], parent=arm_r)
    create_mesh_object("Axe_Blade", build_axe_blades_bmesh(), mats["steel"], parent=weapon)

    # 5. Left Leg (pivot at y = +0.088, z = 0.40)
    leg_l = create_mesh_object("Leg_L", build_leg_bmesh(), mats["clothing"], parent=torso, location=(0, HIP_Y, HIP_Z))
    create_mesh_object("Boot_L", build_boot_bmesh(), mats["leather"], parent=leg_l)

    # 6. Right Leg (pivot at y = -0.088, z = 0.40)
    leg_r = create_mesh_object("Leg_R", build_leg_bmesh(), mats["clothing"], parent=torso, location=(0, -HIP_Y, HIP_Z))
    create_mesh_object("Boot_R", build_boot_bmesh(), mats["leather"], parent=leg_r)

    return {
        "torso": torso,
        "head": head,
        "arm_l": arm_l,
        "arm_r": arm_r,
        "leg_l": leg_l,
        "leg_r": leg_r,
    }

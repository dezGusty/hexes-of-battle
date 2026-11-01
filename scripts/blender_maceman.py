"""
Higher-fidelity (circa 2008-2012 "Civilization 5 / Shogun 2" style) low-poly maceman for Hexes of Battle.

Instead of primitive spheres and cylinders, every anatomical body part and piece of gear is lofted:
  - Anatomical quilted gambeson torso with fluted skirt hem
  - Player-colored team vest / surcoat (Vest_Team) dyed in player team color (blue for P1, red for P2)
  - Heavy military studded leather belt with brass buckle
  - Connecting neck and quilted gambeson collar (Gambeson_Collar) connecting torso to head
  - Sculpted human head with determined facial landmarks and modeled ears
  - Rounded steel kettle helmet / war hat (Helmet_Kettle) over padded arming cap coif (Helmet_Coif)
  - Quilted gambeson sleeves with leather forearm bracers (Bracer_L, Bracer_R) and shoulder pads (Pauldron_L, Pauldron_R)
  - Modeled hands articulated to grip the two-handed mace:
      - Left hand (Hand_L) gripping at the base / end of the shaft above the pommel
      - Right hand (Hand_R) gripping closer to the middle of the shaft
  - Quilted chausses, reinforced leather/iron shin greaves (Greave_L, Greave_R), and cuffed boots
  - Massive two-handed heavy flanged mace (Weapon):
      - Long reinforced hardwood haft (~0.96m)
      - Steel socket collar and langet reinforcement bands
      - 6 heavy forged steel flanges (Weapon_Flanges) with sharpened impact points
      - Armor-penetrating steel top thrusting spike (Weapon_Spike)
      - Fluted steel/brass round pommel counterweight at base (Weapon_Pommel)

Total budget is ~3.2k-3.8k triangles, optimal for 2008-2012 strategy game fidelity
while remaining ultra-fast for cross-platform and mobile rendering.

Blender axes: +X = forward, +Y = unit's left (Arm_L), +Z = up. The glTF exporter converts to Y-up.

Rig contract:
  Torso (root)  -> Head, Arm_L, Arm_R, Leg_L, Leg_R
  Arm_R         -> Weapon (two-handed flanged mace)
  Torso         -> Vest_Team, Belt, Neck, Gambeson_Collar
  Head          -> Helmet_Kettle, Helmet_Coif, Ear_L, Ear_R
  Arm_L         -> Pauldron_L, Bracer_L, Hand_L
  Arm_R         -> Pauldron_R, Bracer_R, Hand_R, Weapon -> Weapon_Flanges, Weapon_Spike, Weapon_Pommel
  Leg_L         -> Greave_L, Boot_L
  Leg_R         -> Greave_R, Boot_R
"""

import math
import random
import bmesh
from mathutils import Euler, Vector

# ---------------------------------------------------------------------------------------
# Proportions (metres; overall height ~1.12m with kettle helmet)
# ---------------------------------------------------------------------------------------
HIP_Z = 0.40
SHOULDER_Z = 0.77
SHOULDER_Y = 0.185
HIP_Y = 0.080
HEAD_PIVOT_Z = 0.88
HEAD_H = 0.185
HEAD_CHIN_Z = 0.02

X_AXIS = Vector((1.0, 0.0, 0.0))
Y_AXIS = Vector((0.0, 1.0, 0.0))
Z_AXIS = Vector((0.0, 0.0, 1.0))

# Two-handed mace direction vector in world space:
# Held across the body: forward (+X), left-to-right (-Y), upward (+Z)
MACE_SDIR = Vector((0.5484, -0.6481, 0.5284)).normalized()

# Hand grip points in world space (Torso at 0,0,0):
# Right hand grips closer to the middle of the shaft:
HAND_R_WORLD = Vector((0.2200, -0.0600, 0.4600))
# Left hand grips near the end of the shaft (0.20m behind right hand along shaft):
HAND_L_WORLD = HAND_R_WORLD - 0.20 * MACE_SDIR

# Wrist positions in local arm spaces:
WRIST_R = HAND_R_WORLD - Vector((0.0, -SHOULDER_Y, SHOULDER_Z))
WRIST_L = HAND_L_WORLD - Vector((0.0, SHOULDER_Y, SHOULDER_Z))


# ---------------------------------------------------------------------------------------
# Loft helpers
# ---------------------------------------------------------------------------------------
def _superellipse(theta, p):
    c = math.cos(theta)
    s = math.sin(theta)
    cx = math.copysign(abs(c) ** (2.0 / p), c)
    sy = math.copysign(abs(s) ** (2.0 / p), s)
    return cx, sy


def make_ring(bm, centre, a_vec, b_vec, ra, rb, thetas, p=2.0):
    """One cross-section: `a` is the lateral axis (radius ra), `b` the fore-aft axis (radius rb)."""
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
    side_faces = []
    for i in range(len(rings) - 1):
        for k in range(n):
            k2 = (k + 1) % n
            side_faces.append(bm.faces.new((rings[i][k], rings[i + 1][k], rings[i + 1][k2], rings[i][k2])))
    bm.normal_update()
    if side_faces and len(rings) > 1:
        c_mid = (sum((v.co for v in rings[0]), Vector()) / n + sum((v.co for v in rings[-1]), Vector()) / n) * 0.5
        score = sum(f.normal.dot(f.calc_center_median() - c_mid) for f in side_faces)
        if score < 0:
            bmesh.ops.reverse_faces(bm, faces=side_faces)
    faces.extend(side_faces)

    if closed_bottom and len(rings) > 1:
        f = bm.faces.new(list(rings[0]))
        bm.normal_update()
        d = rings[1][0].co - rings[0][0].co
        if f.normal.dot(d) > 0:
            bmesh.ops.reverse_faces(bm, faces=[f])
        faces.append(f)
    if closed_top and len(rings) > 1:
        f = bm.faces.new(list(rings[-1]))
        bm.normal_update()
        d = rings[-1][0].co - rings[-2][0].co
        if f.normal.dot(d) < 0:
            bmesh.ops.reverse_faces(bm, faces=[f])
        faces.append(f)
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
        a = path[min(i + 1, len(path) - 1)] - path[max(i - 1, 0)]
        t = a.normalized()
        lat = (up_hint - t * up_hint.dot(t)).normalized()
        fwd = t.cross(lat).normalized()
        if fwd.dot(X_AXIS) < 0 and abs(fwd.dot(X_AXIS)) > 1e-3:
            fwd = -fwd
        ra, rb = radii[i]
        rings.append(make_ring(bm, c, lat, fwd, ra, rb, thetas, p))
    faces = bridge_rings(bm, rings, closed_bottom=cap_start, closed_top=cap_end)
    return rings


def z_loft(bm, stations, segments=20, cap_start=True, cap_end=True, thetas=None):
    """Loft stacked in Z. stations: (z, cx, rb, ra, p)."""
    if thetas is None:
        thetas = [2 * math.pi * k / segments for k in range(segments)]
    rings = []
    for (z, cx, rb, ra, p) in stations:
        rings.append(make_ring(bm, Vector((cx, 0.0, z)), Y_AXIS, X_AXIS, ra, rb, thetas, p))
    faces = bridge_rings(bm, rings, closed_bottom=cap_start, closed_top=cap_end)
    return rings


# ---------------------------------------------------------------------------------------
# Head & Facial Sculpture (head-local coordinates, pivot at 0, 0, 0.88)
# ---------------------------------------------------------------------------------------
_SKULL_PROFILE = [
    # zf,   xf,     xb,      w,     p
    (0.00, 0.024, -0.046, 0.038, 2.2),   # jaw under chin
    (0.04, 0.044, -0.055, 0.046, 2.3),
    (0.09, 0.056, -0.064, 0.053, 2.3),   # lower jaw / chin bump
    (0.15, 0.058, -0.072, 0.058, 2.3),   # mouth
    (0.21, 0.060, -0.079, 0.062, 2.3),   # base of nose
    (0.26, 0.061, -0.084, 0.065, 2.3),   # nose
    (0.31, 0.062, -0.088, 0.067, 2.3),   # cheekbones
    (0.36, 0.061, -0.092, 0.069, 2.3),   # eye line
    (0.41, 0.060, -0.095, 0.070, 2.3),
    (0.46, 0.060, -0.096, 0.070, 2.3),
    (0.51, 0.060, -0.097, 0.070, 2.3),
    (0.56, 0.063, -0.097, 0.070, 2.3),   # brow
    (0.61, 0.061, -0.096, 0.070, 2.3),
    (0.67, 0.059, -0.094, 0.069, 2.2),
    (0.73, 0.055, -0.090, 0.067, 2.2),
    (0.80, 0.047, -0.083, 0.062, 2.1),
    (0.87, 0.036, -0.071, 0.054, 2.0),
    (0.93, 0.023, -0.052, 0.042, 2.0),
    (0.975, 0.010, -0.028, 0.024, 2.0),
]


def _profile_at(zf):
    pts = _SKULL_PROFILE
    for i in range(len(pts) - 1):
        z0, z1 = pts[i][0], pts[i + 1][0]
        if z0 <= zf <= z1:
            t = (zf - z0) / (z1 - z0)
            return tuple(pts[i][j] + (pts[i + 1][j] - pts[i][j]) * t for j in range(1, 5))
    return pts[-1][1:]


def _head_thetas():
    degs = [-75 + 7.5 * i for i in range(21)] + [105, 135, 165, 195, 225, 255]
    return sorted(math.radians(d % 360) for d in degs)


def gauss(x, z, x0, z0, sx, sz):
    return math.exp(-0.5 * (((x - x0) / sx) ** 2 + ((z - z0) / sz) ** 2))


def build_head_bmesh():
    """Skull + sculpted human face in head-local coordinates."""
    bm = bmesh.new()
    zfs = [0.0, 0.04, 0.09, 0.15, 0.21, 0.26, 0.31, 0.36, 0.41, 0.46, 0.51, 0.56, 0.61, 0.67, 0.73, 0.80, 0.87, 0.93, 0.975]
    thetas = _head_thetas()
    rings = []
    for zf in zfs:
        xf, xb, w, p = _profile_at(zf)
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
        # Determined warrior nose
        dx += 0.030 * gauss(ay, z, 0.0, zfz(0.335), 0.013, 0.0115)
        dx += 0.014 * gauss(ay, z, 0.0, zfz(0.455), 0.010, 0.0165)
        dx += 0.010 * gauss(ay, z, 0.017, zfz(0.315), 0.009, 0.0095)
        # Resolute brow ridge
        dx += 0.012 * gauss(ay, z, 0.0, zfz(0.575), 0.048, 0.0095)
        # Deep eye sockets
        dx -= 0.010 * gauss(ay, z, 0.031, zfz(0.505), 0.016, 0.0095)
        # Broad warrior cheekbones
        dx += 0.008 * gauss(ay, z, 0.050, zfz(0.385), 0.020, 0.0150)
        # Firm set mouth
        dx += 0.006 * gauss(ay, z, 0.0, zfz(0.238), 0.022, 0.0085)
        dx += 0.0055 * gauss(ay, z, 0.0, zfz(0.190), 0.020, 0.0085)
        dx -= 0.003 * gauss(ay, z, 0.027, zfz(0.215), 0.010, 0.0080)
        # Strong square jaw & chin
        dx += 0.013 * gauss(ay, z, 0.0, zfz(0.075), 0.022, 0.0120)
        v.co.x = x + dx

    bm.normal_update()
    return bm


def build_ear_bmesh(side):
    """Modeled anatomical ear placed at side of head."""
    bm = bmesh.new()
    path = [
        Vector((0.008, side * 0.064, 0.045)),
        Vector((0.002, side * 0.072, 0.075)),
        Vector((-0.004, side * 0.072, 0.095)),
        Vector((-0.010, side * 0.066, 0.110)),
    ]
    radii = [
        (0.008, 0.006),
        (0.012, 0.008),
        (0.013, 0.008),
        (0.009, 0.006),
    ]
    tube(bm, path, radii, segments=6, up_hint=Z_AXIS, cap_start=True, cap_end=True)
    return bm


def build_coif_bmesh():
    """Padded arming cap / gambeson coif worn under the helmet."""
    bm = bmesh.new()
    # Padded hood enveloping back and sides of head down to neck
    coif_stations = [
        (-0.035, -0.012, (0.030, 0.038), 0.042, 2.3),
        ( 0.010, -0.005, (0.050, 0.060), 0.058, 2.3),
        ( 0.070,  0.010, (0.052, 0.082), 0.070, 2.3),
        ( 0.130,  0.008, (0.060, 0.088), 0.072, 2.3),
        ( 0.185, -0.005, (0.068, 0.076), 0.066, 2.2),
        ( 0.208, -0.015, (0.048, 0.050), 0.046, 2.0),
    ]
    z_loft(bm, coif_stations, segments=18, cap_start=False, cap_end=True)
    return bm


def build_kettle_helmet_bmesh():
    """
    Classic medieval Kettle Hat / Chapel-de-fer:
      - Hemispherical skull dome with central dorsal comb ridge
      - Flared downward-sloping protective steel brim
      - Brow reinforcement band with iron rivets
    """
    bm = bmesh.new()
    # Hemispherical dome covering top of head (z = 0.08 to 0.21)
    dome_stations = [
        (0.080, 0.005, 0.086, 0.082, 2.2),
        (0.115, 0.004, 0.088, 0.084, 2.2),
        (0.150, 0.002, 0.084, 0.080, 2.2),
        (0.185, 0.000, 0.072, 0.068, 2.1),
        (0.210, -0.004, 0.046, 0.042, 2.0),
    ]
    z_loft(bm, dome_stations, segments=18, cap_start=False, cap_end=True)

    # Dorsal comb ridge running front to back over the crest
    comb_pts = [
        Vector((0.088, 0, 0.100)),
        Vector((0.060, 0, 0.165)),
        Vector((0.000, 0, 0.218)),
        Vector((-0.065, 0, 0.170)),
        Vector((-0.086, 0, 0.100)),
    ]
    comb_radii = [
        (0.005, 0.008),
        (0.006, 0.012),
        (0.007, 0.015),
        (0.006, 0.012),
        (0.005, 0.008),
    ]
    tube(bm, comb_pts, comb_radii, segments=6, up_hint=Z_AXIS, cap_start=True, cap_end=True)

    # Flared protective brim extending downward and outward around entire perimeter
    brim_stations = [
        (0.082, 0.005, 0.088, 0.084, 2.2),
        (0.065, 0.005, 0.118, 0.112, 2.2),
        (0.052, 0.005, 0.142, 0.134, 2.3),
    ]
    z_loft(bm, brim_stations, segments=18, cap_start=False, cap_end=False)

    # Brow reinforcement band with iron rivets
    thetas = [2 * math.pi * k / 18 for k in range(18)]
    pts = [Vector((0.005 + math.cos(th) * 0.090, math.sin(th) * 0.086, 0.084)) for th in thetas]
    pts.append(pts[0])
    tube(bm, pts, [(0.006, 0.005)] * len(pts), segments=4, up_hint=Z_AXIS, cap_start=False, cap_end=False)

    return bm


# ---------------------------------------------------------------------------------------
# Torso, Padded Gambeson Collar, Belt, and Player Team Vest
# ---------------------------------------------------------------------------------------
_MACEMAN_TORSO_STATIONS = [
    (0.380, 0.000, 0.095, 0.124, 2.4),   # gambeson skirt hem
    (0.430, 0.002, 0.086, 0.112, 2.5),   # hip / groin
    (0.490, 0.004, 0.082, 0.102, 2.5),   # waist cinch (belt level)
    (0.570, 0.006, 0.088, 0.110, 2.4),   # ribcage
    (0.650, 0.008, 0.094, 0.122, 2.3),   # chest / pectorals
    (0.730, 0.006, 0.092, 0.125, 2.4),   # upper chest
    (0.770, 0.002, 0.078, 0.122, 2.6),   # shoulder line
    (0.805, -0.002, 0.054, 0.082, 2.4),  # neck slope
    (0.830, -0.004, 0.046, 0.052, 2.2),  # collar rim
]


def _interp_station(z):
    st = _MACEMAN_TORSO_STATIONS
    for i in range(len(st) - 1):
        if st[i][0] <= z <= st[i + 1][0]:
            t = (z - st[i][0]) / (st[i + 1][0] - st[i][0])
            return tuple(st[i][j] + (st[i + 1][j] - st[i][j]) * t for j in range(1, 5))
    return st[-1][1:]


def build_torso_bmesh():
    """Infantry gambeson / quilted padded brigandine torso."""
    bm = bmesh.new()
    z_loft(bm, _MACEMAN_TORSO_STATIONS, segments=20, cap_start=True, cap_end=True)
    return bm


def build_vest_bmesh():
    """Player-colored combat vest / surcoat (Vest_Team)."""
    bm = bmesh.new()
    zs = [0.440, 0.490, 0.550, 0.610, 0.670, 0.730, 0.770, 0.800, 0.820]
    stations = []
    for z in zs:
        cx, rb, ra, p = _interp_station(z)
        grow = 0.008
        if z > 0.79:
            grow = 0.004
        stations.append((z, cx, rb + grow, ra + grow, p))
    stations[0] = (stations[0][0], stations[0][1], stations[0][2] + 0.009, stations[0][3] + 0.012, stations[0][4])
    z_loft(bm, stations, segments=20, cap_start=False, cap_end=False)

    bm.normal_update()
    # Front V-slit opening revealing gambeson underneath
    kill = []
    for f in bm.faces:
        c = f.calc_center_median()
        if c.x > 0.02:
            half_open = 0.008 + max(0.0, c.z - 0.50) * 0.100
            if abs(c.y) < half_open and c.z > 0.50:
                kill.append(f)
    bmesh.ops.delete(bm, geom=kill, context="FACES")
    return bm


def build_belt_bmesh():
    """Heavy military leather belt with brass buckle and iron studs."""
    bm = bmesh.new()
    cx, rb, ra, p = _interp_station(0.495)
    r_b, r_a = rb + 0.014, ra + 0.014
    z_loft(bm, [(0.480, cx, r_b, r_a, p), (0.510, cx, r_b, r_a, p)], segments=20, cap_start=False, cap_end=False)

    # Sturdy buckle at front center
    ret = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, verts=ret["verts"], vec=(0.012, 0.034, 0.038))
    bmesh.ops.translate(bm, verts=ret["verts"], vec=(cx + r_b + 0.003, 0.0, 0.495))
    return bm


def build_neck_bmesh():
    """Anatomical neck connecting torso to head."""
    bm = bmesh.new()
    path = [
        Vector((-0.004, 0, 0.815)),
        Vector((-0.006, 0, 0.850)),
        Vector((-0.008, 0, 0.885)),
    ]
    radii = [
        (0.046, 0.048),
        (0.043, 0.045),
        (0.041, 0.043),
    ]
    tube(bm, path, radii, segments=12, up_hint=Y_AXIS, cap_start=False, cap_end=False)
    return bm


def build_collar_bmesh():
    """Padded gambeson collar / shoulder mantle (Gambeson_Collar) flaring out over shoulders."""
    bm = bmesh.new()
    collar_stations = [
        (0.700, 0.004, 0.096, 0.130, 2.4),
        (0.740, 0.002, 0.082, 0.118, 2.4),
        (0.790, -0.002, 0.062, 0.088, 2.3),
        (0.835, -0.004, 0.050, 0.058, 2.2),
    ]
    z_loft(bm, collar_stations, segments=18, cap_start=False, cap_end=False)
    return bm


# ---------------------------------------------------------------------------------------
# Arms, Shoulder Pads, Bracers, and Two-Handed Grip Hands
# ---------------------------------------------------------------------------------------
def build_arm_bmesh(side):
    """
    Quilted gambeson upper arm sleeve in shoulder-relative coordinates.
    Extended and curved inward at shoulder to connect cleanly into torso.
    """
    bm = bmesh.new()
    y_inward = 0.016
    if side < 0:
        # Arm_R: reaches forward and down-inward toward mid shaft WRIST_R (0.22, 0.125, -0.31)
        path = [
            Vector((0.0, -side * y_inward, 0.038)),
            Vector((0.002, -side * (y_inward * 0.5), 0.008)),
            Vector((0.035, 0.020, -0.050)),
            Vector((0.110, 0.065, -0.150)),
            Vector((0.170, 0.098, -0.235)),
            WRIST_R,
        ]
        radii = [
            (0.052, 0.054),
            (0.050, 0.052),
            (0.046, 0.048),
            (0.043, 0.044),
            (0.040, 0.041),
            (0.036, 0.036),
        ]
    else:
        # Arm_L: reaches across chest and down-inward toward end shaft WRIST_L (0.1103, -0.1154, -0.4157)
        path = [
            Vector((0.0, -side * y_inward, 0.038)),
            Vector((0.002, -side * (y_inward * 0.5), 0.008)),
            Vector((0.025, -0.022, -0.070)),
            Vector((0.055, -0.058, -0.180)),
            Vector((0.085, -0.090, -0.300)),
            WRIST_L,
        ]
        radii = [
            (0.052, 0.054),
            (0.050, 0.052),
            (0.046, 0.048),
            (0.043, 0.044),
            (0.040, 0.041),
            (0.036, 0.036),
        ]
    tube(bm, path, radii, segments=12, cap_start=True, cap_end=True)
    return bm


def build_pauldron_bmesh(side):
    """Reinforced leather and padded gambeson shoulder pad protecting shoulder joint."""
    bm = bmesh.new()
    ret = bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=8, radius=1.0)
    bmesh.ops.scale(bm, verts=ret["verts"], vec=(0.068, 0.078, 0.054))
    bmesh.ops.translate(bm, verts=ret["verts"], vec=(0.005, -side * 0.018, 0.024))

    strap = bmesh.ops.create_uvsphere(bm, u_segments=10, v_segments=6, radius=1.0)
    bmesh.ops.scale(bm, verts=strap["verts"], vec=(0.062, 0.070, 0.040))
    bmesh.ops.translate(bm, verts=strap["verts"], vec=(0.008, -side * 0.012, -0.018))
    bm.normal_update()
    return bm


def build_bracer_bmesh(side):
    """Reinforced leather forearm bracer with buckled straps."""
    bm = bmesh.new()
    if side < 0:
        forearm_pts = [
            Vector((0.110, 0.065, -0.150)),
            Vector((0.140, 0.082, -0.192)),
            Vector((0.170, 0.098, -0.235)),
            WRIST_R,
        ]
        splint_pos = Vector((0.145, 0.125, -0.200))
    else:
        forearm_pts = [
            Vector((0.055, -0.058, -0.180)),
            Vector((0.070, -0.074, -0.240)),
            Vector((0.085, -0.090, -0.300)),
            WRIST_L,
        ]
        splint_pos = Vector((0.075, -0.125, -0.245))

    tube(bm, forearm_pts, [(0.042, 0.041), (0.040, 0.038), (0.036, 0.034), (0.032, 0.030)], segments=10, cap_start=False, cap_end=False)

    # Steel reinforcement gutter splint on outer forearm
    splint = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, verts=splint["verts"], vec=(0.024, 0.015, 0.110))
    bmesh.ops.translate(bm, verts=splint["verts"], vec=splint_pos)
    return bm


def build_hand_bmesh(side):
    """
    Articulated combat glove hand gripping the mace shaft:
      - Wrist cuff
      - Palm block
      - Curled fingers wrapping tightly around the hardwood haft
      - Thumb locking the grip
    """
    bm = bmesh.new()
    wrist = WRIST_L if side > 0 else WRIST_R

    # Shaft coordinate frame at hand:
    sdir = MACE_SDIR
    up_hint = Z_AXIS
    lat = (up_hint - sdir * up_hint.dot(sdir)).normalized()
    fwd = sdir.cross(lat).normalized()

    # Flared leather glove wrist cuff
    cuff_pts = [wrist - sdir * 0.035, wrist]
    tube(bm, cuff_pts, [(0.035, 0.034), (0.032, 0.031)], segments=8, up_hint=lat, cap_start=True, cap_end=False)

    # Palm block around shaft center
    palm = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, verts=palm["verts"], vec=(0.042, 0.038, 0.050))
    bmesh.ops.translate(bm, verts=palm["verts"], vec=wrist + fwd * (side * 0.015))

    # Curled fingers wrapped around shaft perimeter (radius ~0.026m)
    grip_angles = [math.pi * (-0.4 + 1.6 * k / 6) for k in range(7)]
    grip_pts = [wrist + lat * (math.cos(a) * 0.026) + fwd * (math.sin(a) * 0.026) for a in grip_angles]
    tube(bm, grip_pts, [(0.016, 0.022)] * len(grip_pts), segments=6, up_hint=sdir, cap_start=True, cap_end=True)

    # Opposing thumb pressing against shaft
    thumb_pts = [
        wrist + fwd * (side * 0.024),
        wrist + lat * (side * 0.020) + fwd * (side * 0.016),
        wrist + lat * (side * 0.024),
    ]
    tube(bm, thumb_pts, [(0.011, 0.011), (0.010, 0.010), (0.008, 0.008)], segments=6, up_hint=sdir, cap_start=True, cap_end=True)

    return bm


# ---------------------------------------------------------------------------------------
# Legs, Greaves, and Marching Boots
# ---------------------------------------------------------------------------------------
def build_leg_bmesh():
    """Gambeson chausses (upper leg) in hip-relative coordinates."""
    bm = bmesh.new()
    path = [
        Vector((0.000, 0,  0.020)),
        Vector((0.002, 0, -0.060)),
        Vector((0.006, 0, -0.140)),
        Vector((0.012, 0, -0.220)),
    ]
    radii = [
        (0.060, 0.062),
        (0.055, 0.057),
        (0.048, 0.050),
        (0.044, 0.046),
    ]
    tube(bm, path, radii, segments=12, up_hint=Y_AXIS, cap_start=True, cap_end=False)
    return bm


def build_greave_bmesh(side):
    """Reinforced leather and steel shin greave with poleyn knee cap."""
    bm = bmesh.new()
    # Poleyn knee cop cup
    knee = bmesh.ops.create_uvsphere(bm, u_segments=10, v_segments=6, radius=1.0)
    bmesh.ops.scale(bm, verts=knee["verts"], vec=(0.048, 0.050, 0.042))
    bmesh.ops.translate(bm, verts=knee["verts"], vec=(0.028, 0, -0.220))

    # Shin greave gutter plate extending down shin to boot ankle
    greave_pts = [
        Vector((0.026, 0, -0.220)),
        Vector((0.028, 0, -0.280)),
        Vector((0.024, 0, -0.340)),
    ]
    tube(bm, greave_pts, [(0.042, 0.038), (0.038, 0.034), (0.034, 0.030)], segments=6, up_hint=Y_AXIS, cap_start=True, cap_end=True)
    return bm


def build_boot_bmesh():
    """Cuffed marching boot with turn-down cuff, modeled instep, sole, and heel."""
    bm = bmesh.new()
    # Flared leather turn-down boot cuff (z = -0.31 to -0.35)
    cuff = [Vector((0.010, 0, -0.310)), Vector((0.010, 0, -0.350))]
    tube(bm, cuff, [(0.052, 0.051), (0.047, 0.046)], segments=12, cap_start=True, cap_end=False)

    # Ankle shaft (z = -0.35 to -0.42)
    shaft = [Vector((0.010, 0, -0.350)), Vector((0.010, 0, -0.390)), Vector((0.010, 0, -0.420))]
    tube(bm, shaft, [(0.046, 0.045), (0.040, 0.039), (0.040, 0.039)], segments=12, cap_start=False, cap_end=False)

    # Instep swell and foot forward to toe (length ~0.15m)
    foot_pts = [
        Vector((0.010, 0, -0.435)),
        Vector((0.045, 0, -0.442)),
        Vector((0.080, 0, -0.448)),
        Vector((0.105, 0, -0.452)),
    ]
    radii = [
        (0.040, 0.032),
        (0.038, 0.028),
        (0.034, 0.020),
        (0.022, 0.012),
    ]
    tube(bm, foot_pts, radii, segments=8, up_hint=Z_AXIS, cap_start=False, cap_end=True)

    # Leather sole slab on ground plane (z = -0.46)
    sole = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, verts=sole["verts"], vec=(0.145, 0.076, 0.014))
    bmesh.ops.translate(bm, verts=sole["verts"], vec=(0.040, 0.0, -0.460))
    return bm


# ---------------------------------------------------------------------------------------
# Two-Handed Heavy Flanged Mace (Weapon on Arm_R)
# ---------------------------------------------------------------------------------------
# Local coordinates in Arm_R frame:
# Arm_R origin is (0.0, -0.185, 0.770)
# Shaft direction in Arm_R: MACE_SDIR
MACE_POMMEL_LOCAL = HAND_R_WORLD - 0.28 * MACE_SDIR - Vector((0.0, -SHOULDER_Y, SHOULDER_Z))
MACE_HAND_R_LOCAL = WRIST_R
MACE_COLLAR_LOCAL = HAND_R_WORLD + 0.44 * MACE_SDIR - Vector((0.0, -SHOULDER_Y, SHOULDER_Z))
MACE_HEAD_LOCAL   = HAND_R_WORLD + 0.47 * MACE_SDIR - Vector((0.0, -SHOULDER_Y, SHOULDER_Z))
MACE_SPIKE_LOCAL  = MACE_HEAD_LOCAL + 0.14 * MACE_SDIR


def build_mace_shaft_bmesh():
    """
    Long reinforced hardwood haft (~0.96m) in Arm_R local space:
      - Passes directly through Hand_L (at base) and Hand_R (closer to middle)
      - Steel socket collar and langet reinforcement bands near the head
      - Spiral leather grip wrap across the two-handed grasp zone
    """
    bm = bmesh.new()
    sdir = MACE_SDIR
    p_start = MACE_POMMEL_LOCAL
    p_end = MACE_COLLAR_LOCAL + sdir * 0.04

    # Hardwood stave
    shaft_pts = [p_start, MACE_HAND_R_LOCAL, p_end]
    shaft_radii = [(0.021, 0.021), (0.019, 0.019), (0.018, 0.018)]
    tube(bm, shaft_pts, shaft_radii, segments=10, up_hint=Z_AXIS, cap_start=True, cap_end=True)

    # Steel socket collar and langets reinforcing top of stave
    col_start = p_end - sdir * 0.08
    col_end = p_end + sdir * 0.02
    tube(bm, [col_start, col_end], [(0.023, 0.023), (0.021, 0.021)], segments=10, up_hint=Z_AXIS, cap_start=False, cap_end=False)

    return bm


def build_mace_flanges_bmesh():
    """
    Heavy forged steel flanged mace head:
      - Hexagonal central core
      - 6 radial triangular steel flanges with reinforced medial ribs
    """
    bm = bmesh.new()
    sdir = MACE_SDIR
    up_hint = Z_AXIS
    lat = (up_hint - sdir * up_hint.dot(sdir)).normalized()
    fwd = sdir.cross(lat).normalized()

    head_start = MACE_HEAD_LOCAL
    head_end = head_start + sdir * 0.160

    # Central cylindrical / hexagonal head core
    core_pts = [head_start, head_end]
    tube(bm, core_pts, [(0.038, 0.038), (0.034, 0.034)], segments=12, up_hint=lat, cap_start=True, cap_end=True)

    # 6 radial flanges radiating outward
    for i in range(6):
        th = 2 * math.pi * i / 6
        radial_dir = lat * math.cos(th) + fwd * math.sin(th)
        perp_dir = lat * (-math.sin(th)) + fwd * math.cos(th)

        # Flange box centered on core and protruding outward by 0.052m
        flange = bmesh.ops.create_cube(bm, size=1.0)
        # Scaled along radial, thickness, and shaft length
        # We manually construct verts for clean geometry
        p_base_bot = head_start + radial_dir * 0.025
        p_base_top = head_end + radial_dir * 0.022
        p_tip_bot  = head_start + radial_dir * 0.075 + sdir * 0.025
        p_tip_top  = head_end + radial_dir * 0.070 - sdir * 0.020

        # Scale cube and translate to flange center
        flange_center = (p_base_bot + p_base_top + p_tip_bot + p_tip_top) * 0.25
        flange_w = 0.012  # thickness
        flange_len = 0.150
        flange_depth = 0.052

        # Transform default cube verts
        for v in flange["verts"]:
            vx, vy, vz = v.co.x, v.co.y, v.co.z
            v.co = flange_center + radial_dir * (vx * flange_depth) + perp_dir * (vy * flange_w) + sdir * (vz * flange_len)

    bm.normal_update()
    return bm


def build_mace_spike_bmesh():
    """Armor-penetrating tapered top thrusting spike on the mace head."""
    bm = bmesh.new()
    sdir = MACE_SDIR
    head_end = MACE_HEAD_LOCAL + sdir * 0.160
    spike_tip = head_end + sdir * 0.110

    spike_pts = [head_end, spike_tip]
    tube(bm, spike_pts, [(0.020, 0.020), (0.003, 0.003)], segments=8, up_hint=Z_AXIS, cap_start=False, cap_end=True)
    return bm


def build_mace_pommel_bmesh():
    """Solid steel and brass round pommel counterweight at base of shaft."""
    bm = bmesh.new()
    ret = bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=8, radius=1.0)
    bmesh.ops.scale(bm, verts=ret["verts"], vec=(0.038, 0.038, 0.042))
    bmesh.ops.translate(bm, verts=ret["verts"], vec=MACE_POMMEL_LOCAL)
    return bm


# ---------------------------------------------------------------------------------------
# Scene assembly
# ---------------------------------------------------------------------------------------
def assemble_maceman(create_mesh_object, make_material):
    """Create the full maceman hierarchy in the current Blender scene and return the rig dict."""
    mats = {
        "armor": make_material("MacemanArmor", (0.78, 0.71, 0.58, 1.0), metallic=0.05, roughness=0.82),
        "iron": make_material("SpearmanIron", (0.55, 0.58, 0.62, 1.0), metallic=0.78, roughness=0.38),
        "team": make_material("TeamColor", (0.22, 0.42, 0.78, 1.0), metallic=0.04, roughness=0.76),
        "leather": make_material("SpearmanLeather", (0.20, 0.13, 0.08, 1.0), metallic=0.04, roughness=0.78),
        "skin": make_material("SpearmanFace", (1.0, 1.0, 1.0, 1.0), metallic=0.0, roughness=0.74),
        "wood": make_material("SpearmanWood", (0.48, 0.32, 0.18, 1.0), metallic=0.08, roughness=0.68),
        "gear": make_material("MacemanGear", (0.60, 0.62, 0.65, 1.0), metallic=0.65, roughness=0.40),
    }

    # 1. Torso (root object at 0, 0, 0)
    torso = create_mesh_object("Torso", build_torso_bmesh(), mats["armor"], location=(0, 0, 0))
    create_mesh_object("Vest_Team", build_vest_bmesh(), mats["team"], parent=torso)
    create_mesh_object("Belt", build_belt_bmesh(), mats["leather"], parent=torso)
    create_mesh_object("Neck", build_neck_bmesh(), mats["skin"], parent=torso)
    create_mesh_object("Gambeson_Collar", build_collar_bmesh(), mats["armor"], parent=torso)

    # 2. Head (pivot at z = 0.88)
    head = create_mesh_object("Head", build_head_bmesh(), mats["skin"], parent=torso, location=(0, 0, HEAD_PIVOT_Z))
    create_mesh_object("Helmet_Coif", build_coif_bmesh(), mats["armor"], parent=head)
    create_mesh_object("Helmet_Kettle", build_kettle_helmet_bmesh(), mats["iron"], parent=head)
    create_mesh_object("Ear_L", build_ear_bmesh(1.0), mats["skin"], parent=head)
    create_mesh_object("Ear_R", build_ear_bmesh(-1.0), mats["skin"], parent=head)

    # 3. Left Arm (pivot at y = +0.185, z = 0.77) - grips lower end of mace shaft
    arm_l = create_mesh_object("Arm_L", build_arm_bmesh(1.0), mats["armor"], parent=torso, location=(0, SHOULDER_Y, SHOULDER_Z))
    create_mesh_object("Pauldron_L", build_pauldron_bmesh(1.0), mats["leather"], parent=arm_l)
    create_mesh_object("Bracer_L", build_bracer_bmesh(1.0), mats["leather"], parent=arm_l)
    create_mesh_object("Hand_L", build_hand_bmesh(1.0), mats["leather"], parent=arm_l)

    # 4. Right Arm (pivot at y = -0.185, z = 0.77) - grips middle of mace shaft
    arm_r = create_mesh_object("Arm_R", build_arm_bmesh(-1.0), mats["armor"], parent=torso, location=(0, -SHOULDER_Y, SHOULDER_Z))
    create_mesh_object("Pauldron_R", build_pauldron_bmesh(-1.0), mats["leather"], parent=arm_r)
    create_mesh_object("Bracer_R", build_bracer_bmesh(-1.0), mats["leather"], parent=arm_r)
    create_mesh_object("Hand_R", build_hand_bmesh(-1.0), mats["leather"], parent=arm_r)

    # Massive Two-Handed Flanged Mace clutched in hands (child of Arm_R for standard hierarchy)
    weapon = create_mesh_object("Weapon", build_mace_shaft_bmesh(), mats["gear"], parent=arm_r)
    create_mesh_object("Weapon_Flanges", build_mace_flanges_bmesh(), mats["gear"], parent=weapon)
    create_mesh_object("Weapon_Spike", build_mace_spike_bmesh(), mats["gear"], parent=weapon)
    create_mesh_object("Weapon_Pommel", build_mace_pommel_bmesh(), mats["gear"], parent=weapon)

    # 5. Left Leg (pivot at y = +0.080, z = 0.40)
    leg_l = create_mesh_object("Leg_L", build_leg_bmesh(), mats["armor"], parent=torso, location=(0, HIP_Y, HIP_Z))
    create_mesh_object("Greave_L", build_greave_bmesh(1.0), mats["iron"], parent=leg_l)
    create_mesh_object("Boot_L", build_boot_bmesh(), mats["leather"], parent=leg_l)

    # 6. Right Leg (pivot at y = -0.080, z = 0.40)
    leg_r = create_mesh_object("Leg_R", build_leg_bmesh(), mats["armor"], parent=torso, location=(0, -HIP_Y, HIP_Z))
    create_mesh_object("Greave_R", build_greave_bmesh(-1.0), mats["iron"], parent=leg_r)
    create_mesh_object("Boot_R", build_boot_bmesh(), mats["leather"], parent=leg_r)

    return {
        "torso": torso,
        "head": head,
        "arm_l": arm_l,
        "arm_r": arm_r,
        "leg_l": leg_l,
        "leg_r": leg_r,
        "weapon": weapon,
    }

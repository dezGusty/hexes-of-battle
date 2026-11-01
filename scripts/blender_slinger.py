"""
Higher-fidelity (circa 2008-2012 "Civilization 5 / Shogun 2" style) low-poly slinger for Hexes of Battle.

Instead of primitive spheres and cylinders, every anatomical body part and piece of gear is lofted:
  - Anatomical skirmisher tunic torso with flared peplum hem
  - Player-colored team vest / tunic front (Vest_Team) dyed in player team color (blue for P1, red for P2)
  - Stitched leather waist belt with bronze buckle
  - Cross-body sling baldric strap and molded leather stone pouch (Stone_Pouch) packed with river stones
  - Connecting neck and collar connecting torso to head
  - Sculpted human head with focused facial landmarks and modeled ears
  - Distinctive woven / leather headband (Headband) encircling brow with tied knot and trailing cords
  - Tunic sleeves with leather wrist wraps (Bracer_L, Bracer_R) and light leather shoulder pads (Pauldron_L, Pauldron_R)
  - Modeled hands articulated for skirmisher combat:
      - Left hand holding a light skirmisher buckler shield (Shield) with bronze boss and rim
      - Right hand holding a leather shepherd sling (Weapon) with twin cords, leather pouch, and sling stone
  - Form-fitting skirmisher wraps, cross-strapped greaves (Greave_L, Greave_R), and strappy sandals/boots
  - Leather shepherd sling (Weapon):
      - Twin braided cords descending from right hand
      - Molded leather cradle pocket
      - Realistic smooth river sling stone (Sling_Stone)

Total budget is ~3.0k-3.6k triangles, optimal for 2008-2012 strategy game fidelity
while remaining ultra-fast for cross-platform and mobile rendering.

Blender axes: +X = forward, +Y = unit's left (Arm_L), +Z = up. The glTF exporter converts to Y-up.

Rig contract:
  Torso (root)  -> Head, Arm_L, Arm_R, Leg_L, Leg_R
  Torso         -> Vest_Team, Belt, Pouch_Strap, Stone_Pouch, Neck, Collar
  Head          -> Headband, Ear_L, Ear_R, Hair
  Arm_L         -> Pauldron_L, Bracer_L, Hand_L, Shield -> Shield_Boss, Shield_Rim
  Arm_R         -> Pauldron_R, Bracer_R, Hand_R, Weapon -> Sling_Stone
  Leg_L         -> Greave_L, Boot_L
  Leg_R         -> Greave_R, Boot_R
"""

import math
import random
import bmesh
from mathutils import Euler, Vector

# ---------------------------------------------------------------------------------------
# Proportions (metres; overall height ~1.08m)
# ---------------------------------------------------------------------------------------
HIP_Z = 0.40
SHOULDER_Z = 0.765
SHOULDER_Y = 0.175
HIP_Y = 0.080
HEAD_PIVOT_Z = 0.875
HEAD_H = 0.185
HEAD_CHIN_Z = 0.02

X_AXIS = Vector((1.0, 0.0, 0.0))
Y_AXIS = Vector((0.0, 1.0, 0.0))
Z_AXIS = Vector((0.0, 0.0, 1.0))


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

        rad = radii[i]
        if isinstance(rad, tuple):
            ra, rb = rad
        else:
            ra = rb = rad
        rings.append(make_ring(bm, c, a, b, ra, rb, thetas, p=p))
    return bridge_rings(bm, rings, closed_bottom=cap_start, closed_top=cap_end)


def z_loft(bm, stations, segments=16, cap_start=True, cap_end=True, thetas=None):
    """Loft a vertical column where stations are (z, cx, rb, ra, p)."""
    if thetas is None:
        thetas = [2 * math.pi * k / segments for k in range(segments)]
    rings = []
    for z, cx, rb, ra, p in stations:
        centre = Vector((cx, 0.0, z))
        rings.append(make_ring(bm, centre, Y_AXIS, X_AXIS, ra, rb, thetas, p=p))
    return bridge_rings(bm, rings, closed_bottom=cap_start, closed_top=cap_end)


def gauss(y, z, y0, z0, sy, sz):
    return math.exp(-(((y - y0) / sy) ** 2 + ((z - z0) / sz) ** 2))


# ---------------------------------------------------------------------------------------
# Head & Face (Z-up in Head space, chin ~0.02, crown ~0.205)
# ---------------------------------------------------------------------------------------
_SLINGER_SKULL_PROFILE = [
    # zf,   xf,    xb,    w,     p
    (0.00,  0.038, -0.022, 0.028, 2.1),   # chin tip
    (0.05,  0.046, -0.030, 0.038, 2.2),   # chin base
    (0.12,  0.052, -0.044, 0.048, 2.2),   # jaw angles
    (0.20,  0.057, -0.056, 0.054, 2.1),   # lower lip
    (0.25,  0.061, -0.062, 0.056, 2.1),   # mouth line
    (0.32,  0.060, -0.068, 0.059, 2.0),   # upper lip / subnasale
    (0.37,  0.066, -0.072, 0.061, 2.0),   # nose tip
    (0.44,  0.057, -0.076, 0.063, 2.0),   # nasal bridge
    (0.50,  0.052, -0.079, 0.064, 2.1),   # eyes / sellion
    (0.58,  0.058, -0.081, 0.065, 2.2),   # brow ridge
    (0.66,  0.056, -0.082, 0.066, 2.3),   # forehead / headband lower
    (0.74,  0.053, -0.081, 0.066, 2.3),   # headband upper
    (0.82,  0.046, -0.076, 0.064, 2.2),   # cranium
    (0.90,  0.034, -0.064, 0.055, 2.1),   # parietal
    (0.96,  0.018, -0.042, 0.038, 2.0),   # vertex
]


def _profile_at(zf):
    pts = _SLINGER_SKULL_PROFILE
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
    """Sculpted human head with determined facial features, cheekbones, nose, and chin."""
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
        # Focused skirmisher nose: bridge, tip, alae
        dx += 0.026 * gauss(ay, z, 0.0, zfz(0.370), 0.013, 0.0115)
        dx += 0.013 * gauss(ay, z, 0.0, zfz(0.460), 0.010, 0.0165)
        dx += 0.009 * gauss(ay, z, 0.016, zfz(0.350), 0.009, 0.0095)
        # Intense brow ridge
        dx += 0.011 * gauss(ay, z, 0.0, zfz(0.580), 0.046, 0.0095)
        # Deep eye sockets
        dx -= 0.010 * gauss(ay, z, 0.029, zfz(0.500), 0.015, 0.0095)
        # Athletic cheekbones
        dx += 0.008 * gauss(ay, z, 0.046, zfz(0.410), 0.020, 0.0150)
        # Determined mouth
        dx += 0.006 * gauss(ay, z, 0.0, zfz(0.250), 0.022, 0.0085)
        dx += 0.005 * gauss(ay, z, 0.0, zfz(0.200), 0.020, 0.0085)
        dx -= 0.003 * gauss(ay, z, 0.025, zfz(0.225), 0.010, 0.0080)
        # Square skirmisher chin
        dx += 0.011 * gauss(ay, z, 0.0, zfz(0.065), 0.020, 0.0120)
        v.co.x = x + dx

    bm.normal_update()
    return bm


def build_ear_bmesh(side):
    """Anatomical human ear."""
    bm = bmesh.new()
    ret = bmesh.ops.create_uvsphere(bm, u_segments=8, v_segments=6, radius=1.0)
    bmesh.ops.scale(bm, verts=ret["verts"], vec=(0.010, 0.006, 0.018))
    bmesh.ops.rotate(bm, verts=ret["verts"], cent=(0, 0, 0), matrix=Euler((0, math.radians(-10), 0)).to_matrix())
    bmesh.ops.translate(bm, verts=ret["verts"], vec=(-0.012, side * 0.068, HEAD_CHIN_Z + HEAD_H * 0.47))
    return bm


def build_hair_bmesh():
    """Tousled skirmisher hair tufts above the headband and covering the back/sides of cranium."""
    bm = bmesh.new()
    crown_z = HEAD_CHIN_Z + HEAD_H * 0.72
    # Crown hair cap
    stations = [
        (crown_z + 0.000, -0.014, 0.082, 0.068, 2.3),
        (crown_z + 0.022, -0.016, 0.078, 0.065, 2.2),
        (crown_z + 0.040, -0.018, 0.064, 0.054, 2.1),
        (crown_z + 0.054, -0.020, 0.042, 0.036, 2.0),
        (crown_z + 0.062, -0.021, 0.016, 0.014, 2.0),
    ]
    thetas = [2 * math.pi * k / 14 for k in range(14)]
    z_loft(bm, stations, segments=14, cap_start=False, cap_end=True, thetas=thetas)

    # Hair locks hanging behind ears
    for s in [-1.0, 1.0]:
        lock_path = [
            Vector((-0.035, s * 0.062, crown_z + 0.005)),
            Vector((-0.042, s * 0.064, crown_z - 0.025)),
            Vector((-0.046, s * 0.062, crown_z - 0.055)),
        ]
        tube(bm, lock_path, [(0.014, 0.012), (0.012, 0.010), (0.007, 0.006)], segments=6, up_hint=X_AXIS, cap_start=True, cap_end=True)

    bm.normal_update()
    return bm


# ---------------------------------------------------------------------------------------
# Distinctive Headband (Headband)
# ---------------------------------------------------------------------------------------
def build_headband_bmesh():
    """
    The iconic slinger headband:
      - Encircles forehead, temples, and occiput snugly over the brow
      - Braided/wrapped profile with visible thickness and bevel
      - Knotted tie at the rear with two hanging cord ends trailing down the neck
    """
    bm = bmesh.new()
    brow_z = HEAD_CHIN_Z + HEAD_H * 0.68  # sits across forehead (~0.145m)

    # Headband stations encircling the head
    # Profile of the headband: 3 rings creating a convex braided band with bevels
    hband_stations = [
        (brow_z - 0.016, -0.012, 0.076, 0.069, 2.3),
        (brow_z + 0.000, -0.013, 0.079, 0.071, 2.3),
        (brow_z + 0.016, -0.014, 0.076, 0.069, 2.3),
    ]
    thetas = [2 * math.pi * k / 18 for k in range(18)]
    z_loft(bm, hband_stations, segments=18, cap_start=True, cap_end=True, thetas=thetas)

    # Central brow knot/tuck accent
    front_knot = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, verts=front_knot["verts"], vec=(0.012, 0.020, 0.036))
    bmesh.ops.translate(bm, verts=front_knot["verts"], vec=(0.064, 0.0, brow_z))

    # Knotted tie bundle at the back of the head
    back_knot = bmesh.ops.create_uvsphere(bm, u_segments=8, v_segments=6, radius=1.0)
    bmesh.ops.scale(bm, verts=back_knot["verts"], vec=(0.016, 0.024, 0.020))
    bmesh.ops.translate(bm, verts=back_knot["verts"], vec=(-0.088, 0.0, brow_z - 0.005))

    # Two trailing headband cord ends streaming down the back of the neck
    trail_left = [
        Vector((-0.088, 0.012, brow_z - 0.010)),
        Vector((-0.092, 0.016, brow_z - 0.045)),
        Vector((-0.090, 0.020, brow_z - 0.085)),
    ]
    tube(bm, trail_left, [(0.008, 0.006), (0.007, 0.005), (0.005, 0.004)], segments=6, up_hint=X_AXIS, cap_start=True, cap_end=True)

    trail_right = [
        Vector((-0.088, -0.012, brow_z - 0.010)),
        Vector((-0.094, -0.018, brow_z - 0.050)),
        Vector((-0.092, -0.024, brow_z - 0.095)),
    ]
    tube(bm, trail_right, [(0.008, 0.006), (0.007, 0.005), (0.005, 0.004)], segments=6, up_hint=X_AXIS, cap_start=True, cap_end=True)

    bm.normal_update()
    return bm


# ---------------------------------------------------------------------------------------
# Torso & Clothing (Torso at 0, 0, 0; waist ~0.42, shoulders ~0.77, neck ~0.82)
# ---------------------------------------------------------------------------------------
_SLINGER_TORSO_STATIONS = [
    # z,       cx,      rb,     ra,     p
    (0.360,   0.005,   0.148,  0.160,  2.1),   # flared tunic skirt hem
    (0.400,   0.004,   0.140,  0.150,  2.1),   # lower skirt
    (0.440,   0.003,   0.130,  0.140,  2.1),   # hips / upper skirt
    (0.485,   0.002,   0.118,  0.130,  2.2),   # waist / belt line
    (0.540,   0.003,   0.126,  0.142,  2.2),   # lower ribcage
    (0.610,   0.005,   0.136,  0.155,  2.2),   # mid chest
    (0.680,   0.006,   0.142,  0.168,  2.1),   # pectorals / lats
    (0.745,   0.005,   0.136,  0.170,  2.1),   # upper chest & shoulder base
    (0.795,   0.002,   0.108,  0.138,  2.2),   # shoulder slope
    (0.825,  -0.002,   0.076,  0.078,  2.3),   # neck base
]


def _interp_station(z, st=_SLINGER_TORSO_STATIONS):
    for i in range(len(st) - 1):
        if st[i][0] <= z <= st[i + 1][0]:
            t = (z - st[i][0]) / (st[i + 1][0] - st[i][0])
            return tuple(st[i][j] + (st[i + 1][j] - st[i][j]) * t for j in range(1, 5))
    return st[-1][1:]


def build_torso_bmesh():
    """Agile skirmisher torso clad in a fitted linen/wool tunic."""
    bm = bmesh.new()
    z_loft(bm, _SLINGER_TORSO_STATIONS, segments=18, cap_start=True, cap_end=True)
    return bm


def build_vest_bmesh():
    """
    Player-colored skirmisher tunic front / vest (Vest_Team).
    Hugs the chest and torso from belt line up to collar, clearly identifying team color.
    """
    bm = bmesh.new()
    zs = [0.470, 0.515, 0.575, 0.640, 0.705, 0.760, 0.805, 0.828]
    stations = []
    for z in zs:
        cx, rb, ra, p = _interp_station(z)
        stations.append((z, cx + 0.003, rb + 0.008, ra + 0.008, p))
    z_loft(bm, stations, segments=18, cap_start=False, cap_end=False)

    # Prune back and extreme flank faces to create a fitted front/side surcoat vest
    bm.normal_update()
    kill = []
    for f in bm.faces:
        c = f.calc_center_median()
        if c.x < -0.010:  # keep front and chest wrap
            kill.append(f)
    bmesh.ops.delete(bm, geom=kill, context="FACES")
    return bm


def build_belt_bmesh():
    """Leather waist belt with bronze buckle."""
    bm = bmesh.new()
    cx, rb, ra, p = _interp_station(0.485)
    r_b, r_a = rb + 0.012, ra + 0.012
    z_loft(bm, [(0.468, cx, r_b, r_a, p), (0.502, cx, r_b, r_a, p)], segments=18, cap_start=False, cap_end=False)

    # Sturdy bronze buckle in front
    buckle = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, verts=buckle["verts"], vec=(0.014, 0.038, 0.046))
    bmesh.ops.translate(bm, verts=buckle["verts"], vec=(cx + r_b + 0.007, 0.0, 0.485))

    bm.normal_update()
    return bm


def build_pouch_strap_bmesh():
    """Diagonal leather baldric strap running from right shoulder across chest to left hip stone pouch."""
    bm = bmesh.new()
    strap_pts = [
        Vector((0.030, -0.130, 0.770)),  # top of right shoulder
        Vector((0.082, -0.050, 0.650)),  # crossing chest
        Vector((0.090,  0.040, 0.540)),  # crossing left rib
        Vector((0.055,  0.135, 0.450)),  # down to left hip
        Vector((-0.030, 0.130, 0.460)),  # wrapping behind hip
        Vector((-0.075, 0.030, 0.570)),  # across back
        Vector((-0.055, -0.080, 0.690)), # across upper back
        Vector((0.030, -0.130, 0.770)),  # reconnect to right shoulder
    ]
    tube(bm, strap_pts, [(0.015, 0.006)] * len(strap_pts), segments=6, up_hint=Z_AXIS, cap_start=False, cap_end=False)
    return bm


def build_stone_pouch_bmesh():
    """
    Ammunition stone pouch at the left hip.
    Molded thick leather pouch bulging with heavy smooth sling stones, secured with leather flap and buckle.
    """
    bm = bmesh.new()
    pouch_center = Vector((0.035, 0.160, 0.440))

    # Main bulging pouch body
    body = bmesh.ops.create_uvsphere(bm, u_segments=10, v_segments=8, radius=1.0)
    bmesh.ops.scale(bm, verts=body["verts"], vec=(0.048, 0.042, 0.058))
    bmesh.ops.translate(bm, verts=body["verts"], vec=pouch_center)

    # Overlapping leather flap
    flap = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, verts=flap["verts"], vec=(0.046, 0.040, 0.012))
    bmesh.ops.rotate(bm, verts=flap["verts"], cent=(0, 0, 0), matrix=Euler((math.radians(20), 0, math.radians(-10))).to_matrix())
    bmesh.ops.translate(bm, verts=flap["verts"], vec=(pouch_center.x + 0.010, pouch_center.y, pouch_center.z + 0.032))

    # Small brass closure stud/toggle
    stud = bmesh.ops.create_uvsphere(bm, u_segments=6, v_segments=4, radius=0.007)
    bmesh.ops.translate(bm, verts=stud["verts"], vec=(pouch_center.x + 0.042, pouch_center.y, pouch_center.z + 0.010))

    bm.normal_update()
    return bm


def build_neck_bmesh():
    """Anatomical neck connecting torso doublet to the head/jaw."""
    bm = bmesh.new()
    path = [
        Vector((-0.003, 0.0, 0.795)),  # inside collar
        Vector((-0.005, 0.0, 0.835)),  # mid throat
        Vector((-0.008, 0.0, 0.880)),  # base of cranium / under jaw
    ]
    radii = [
        (0.046, 0.048),
        (0.042, 0.044),
        (0.040, 0.042),
    ]
    tube(bm, path, radii, segments=12, up_hint=Y_AXIS, cap_start=False, cap_end=True)
    return bm


def build_collar_bmesh():
    """Tunic collar wrapping the base of the neck."""
    bm = bmesh.new()
    path = [
        Vector((-0.002, 0.0, 0.805)),
        Vector((-0.004, 0.0, 0.835)),
    ]
    radii = [
        (0.054, 0.056),
        (0.050, 0.052),
    ]
    tube(bm, path, radii, segments=12, up_hint=Y_AXIS, cap_start=False, cap_end=False)
    return bm


# ---------------------------------------------------------------------------------------
# Arms, Shoulder Pads, and Bracers
# ---------------------------------------------------------------------------------------
def build_arm_bmesh(side):
    """
    Upper arm sleeve in shoulder-relative coordinates.
    Lofted inward at the top (-side * 0.015) to connect seamlessly to the torso shoulder without gaps.
    """
    bm = bmesh.new()
    y_inward = 0.015
    path = [
        Vector((0.0, -side * y_inward, 0.038)),  # inside shoulder cavity
        Vector((0.0, 0.0, 0.000)),               # shoulder center
        Vector((0.008, side * 0.008, -0.065)),   # deltoid bulge
        Vector((0.014, side * 0.010, -0.145)),   # mid bicep
        Vector((0.018, side * 0.008, -0.220)),   # elbow
    ]
    radii = [
        (0.058, 0.056),
        (0.055, 0.053),
        (0.049, 0.047),
        (0.043, 0.042),
        (0.040, 0.039),
    ]
    tube(bm, path, radii, segments=12, cap_start=True, cap_end=True)
    return bm


def build_pauldron_bmesh(side):
    """
    Curved leather shoulder pad / guard (Pauldron_L / Pauldron_R).
    Fits smoothly over the shoulder joint and bridges cleanly into the torso.
    """
    bm = bmesh.new()
    # Main curved cap over shoulder
    ret = bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=8, radius=1.0)
    bmesh.ops.scale(bm, verts=ret["verts"], vec=(0.064, 0.070, 0.048))
    bmesh.ops.translate(bm, verts=ret["verts"], vec=(0.002, -side * 0.018, 0.024))

    # Leather retention strap under deltoid
    strap = bmesh.ops.create_cone(bm, segments=10, radius1=0.052, radius2=0.052, depth=0.016)
    bmesh.ops.scale(bm, verts=strap["verts"], vec=(1.0, 0.85, 1.0))
    bmesh.ops.translate(bm, verts=strap["verts"], vec=(0.006, -side * 0.010, -0.018))

    bm.normal_update()
    return bm


def build_bracer_bmesh(side):
    """Forearm leather wraps and wrist bracers."""
    bm = bmesh.new()
    forearm_pts = [
        Vector((0.018, side * 0.008, -0.210)),
        Vector((0.026, side * 0.006, -0.255)),
        Vector((0.032, side * 0.004, -0.295)),
    ]
    radii = [
        (0.041, 0.040),
        (0.037, 0.036),
        (0.033, 0.032),
    ]
    tube(bm, forearm_pts, radii, segments=10, cap_start=False, cap_end=False)
    return bm


# Wrist position relative to shoulder:
WRIST = Vector((0.052, 0.0, -0.288))
HAND_DIR = Vector((0.27, 0.0, -0.96)).normalized()


def build_hand_bmesh(side, is_sling_hand=False):
    """
    Modeled human hand in arm-local coordinates:
      - Left hand (side > 0): Formed to grip the buckler handle.
      - Right hand (is_sling_hand=True): Articulated fingers holding the sling cords and release tab.
    """
    bm = bmesh.new()
    pts, radii = [], []
    for s, ra, rb in [
        (-0.006, 0.025, 0.018),
        (0.018, 0.031, 0.020),
        (0.042, 0.032, 0.019),
        (0.066, 0.029, 0.017),
        (0.086, 0.020, 0.012),
    ]:
        c = WRIST + HAND_DIR * s + X_AXIS * (0.52 * max(0.0, s - 0.03) ** 2 * 6.0)
        pts.append(c)
        radii.append((ra, rb))
    tube(bm, pts, radii, segments=8, cap_start=False, cap_end=True)

    inner = -side
    thumb = [
        WRIST + HAND_DIR * 0.012 + Y_AXIS * (inner * 0.024),
        WRIST + HAND_DIR * 0.038 + Y_AXIS * (inner * 0.031) + X_AXIS * 0.012,
        WRIST + HAND_DIR * 0.060 + Y_AXIS * (inner * 0.028) + X_AXIS * 0.024,
    ]
    tube(bm, thumb, [(0.010, 0.010), (0.009, 0.009), (0.007, 0.007)], segments=6, cap_start=True, cap_end=True)
    return bm


# ---------------------------------------------------------------------------------------
# Left Arm: Skirmisher Buckler Shield (Shield)
# ---------------------------------------------------------------------------------------
def build_buckler_shield_bmesh():
    """
    Light round skirmisher buckler on left forearm:
      - Double-sided convex wooden/leather disc (0.13m radius)
      - Sturdy central bronze / iron boss (Shield_Boss)
      - Steel protective rim (Shield_Rim)
      - Leather inner arm grip
    """
    bm = bmesh.new()
    n = 16
    thetas = [2 * math.pi * k / n for k in range(n)]
    r_outer = 0.135
    thickness = 0.014

    front_ring = []
    back_ring = []
    for th in thetas:
        y = math.sin(th) * r_outer
        z = math.cos(th) * r_outer
        front_ring.append(bm.verts.new(Vector((thickness * 0.5, y, z))))
        back_ring.append(bm.verts.new(Vector((-thickness * 0.5, y, z))))

    # Front center vertex
    front_center = bm.verts.new(Vector((thickness * 0.5 + 0.010, 0.0, 0.0)))
    # Back center vertex
    back_center = bm.verts.new(Vector((-thickness * 0.5 - 0.005, 0.0, 0.0)))

    for k in range(n):
        k2 = (k + 1) % n
        # Front face
        bm.faces.new((front_ring[k], front_ring[k2], front_center))
        # Back face
        bm.faces.new((back_ring[k2], back_ring[k], back_center))
        # Outer rim quads
        bm.faces.new((front_ring[k], back_ring[k], back_ring[k2], front_ring[k2]))

    bm.normal_update()
    return bm


def build_buckler_boss_bmesh():
    """Convex hammered bronze / iron boss protecting the hand."""
    bm = bmesh.new()
    boss = bmesh.ops.create_uvsphere(bm, u_segments=10, v_segments=8, radius=1.0)
    bmesh.ops.scale(bm, verts=boss["verts"], vec=(0.026, 0.046, 0.046))
    bmesh.ops.translate(bm, verts=boss["verts"], vec=(0.020, 0.0, 0.0))

    # Flange ring
    flange = bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=True, segments=12, radius1=0.058, radius2=0.058, depth=0.006)
    bmesh.ops.rotate(bm, verts=flange["verts"], cent=(0, 0, 0), matrix=Euler((0, math.radians(90), 0)).to_matrix())
    bmesh.ops.translate(bm, verts=flange["verts"], vec=(0.014, 0.0, 0.0))

    bm.normal_update()
    return bm


def build_buckler_rim_bmesh():
    """Protective metal rim around the buckler circumference."""
    bm = bmesh.new()
    thetas = [2 * math.pi * k / 16 for k in range(16)]
    pts = [Vector((0.0, math.sin(th) * 0.135, math.cos(th) * 0.135)) for th in thetas]
    pts.append(pts[0])
    tube(bm, pts, [(0.010, 0.008)] * len(pts), segments=4, up_hint=X_AXIS, cap_start=False, cap_end=False)
    bm.normal_update()
    return bm


# ---------------------------------------------------------------------------------------
# Right Arm: Leather Shepherd Sling & River Stone (Weapon)
# ---------------------------------------------------------------------------------------
def build_sling_weapon_bmesh():
    """
    Braided leather / hemp shepherd sling:
      - Originates in right hand grip: finger loop retention cord and release cord
      - Twin hanging cords descending ~0.34m from hand down to stone cradle
      - Molded oval leather pouch cradling the ammunition
    """
    bm = bmesh.new()
    hand_pos = Vector((0.046, 0.0, -0.320))
    cradle_pos = Vector((0.080, -0.010, -0.580))

    # Twin cords descending from hand to cradle
    cord1 = [
        hand_pos + Vector((-0.006, 0.006, 0.0)),
        hand_pos + Vector((0.008, 0.004, -0.120)),
        cradle_pos + Vector((-0.012, 0.008, 0.035)),
    ]
    tube(bm, cord1, [(0.004, 0.004), (0.004, 0.004), (0.005, 0.005)], segments=5, up_hint=Y_AXIS, cap_start=True, cap_end=True)

    cord2 = [
        hand_pos + Vector((0.006, -0.006, 0.0)),
        hand_pos + Vector((0.018, -0.004, -0.120)),
        cradle_pos + Vector((0.012, -0.008, 0.035)),
    ]
    tube(bm, cord2, [(0.004, 0.004), (0.004, 0.004), (0.005, 0.005)], segments=5, up_hint=Y_AXIS, cap_start=True, cap_end=True)

    # Molded leather cradle pouch
    pouch = bmesh.ops.create_uvsphere(bm, u_segments=10, v_segments=8, radius=1.0)
    bmesh.ops.scale(bm, verts=pouch["verts"], vec=(0.042, 0.026, 0.034))
    bmesh.ops.rotate(bm, verts=pouch["verts"], cent=(0, 0, 0), matrix=Euler((math.radians(15), math.radians(20), 0)).to_matrix())
    bmesh.ops.translate(bm, verts=pouch["verts"], vec=cradle_pos)

    # Free release cord tab tail hanging down from cradle
    tail = [
        cradle_pos + Vector((0.005, -0.005, -0.025)),
        cradle_pos + Vector((0.010, -0.010, -0.080)),
        cradle_pos + Vector((0.015, -0.008, -0.120)),
    ]
    tube(bm, tail, [(0.004, 0.004), (0.0035, 0.0035), (0.002, 0.002)], segments=5, up_hint=Y_AXIS, cap_start=True, cap_end=True)

    bm.normal_update()
    return bm


def build_sling_stone_bmesh():
    """Smooth, dense oval river stone nestled in the sling pouch."""
    bm = bmesh.new()
    stone_center = Vector((0.080, -0.010, -0.580))
    stone = bmesh.ops.create_icosphere(bm, subdivisions=2, radius=1.0)
    # Shape into aerodynamic oval bullet
    bmesh.ops.scale(bm, verts=stone["verts"], vec=(0.034, 0.022, 0.024))
    bmesh.ops.rotate(bm, verts=stone["verts"], cent=(0, 0, 0), matrix=Euler((math.radians(15), math.radians(20), 0)).to_matrix())
    bmesh.ops.translate(bm, verts=stone["verts"], vec=stone_center)

    bm.normal_update()
    return bm


# ---------------------------------------------------------------------------------------
# Legs & Skirmisher Footwear
# ---------------------------------------------------------------------------------------
def build_leg_bmesh():
    """Form-fitting skirmisher wraps / breeches in hip-relative coordinates."""
    bm = bmesh.new()
    path = [
        Vector((0, 0, 0.050)),
        Vector((0, 0, 0.000)),
        Vector((0.006, 0, -0.080)),
        Vector((0.012, 0, -0.160)),
        Vector((0.008, 0, -0.240)),  # knee
        Vector((-0.002, 0, -0.320)), # calf
        Vector((-0.004, 0, -0.380)), # ankle
    ]
    radii = [
        (0.064, 0.062),
        (0.060, 0.058),
        (0.054, 0.052),
        (0.048, 0.046),
        (0.044, 0.042),
        (0.042, 0.040),
        (0.036, 0.035),
    ]
    tube(bm, path, radii, segments=12, up_hint=Y_AXIS, cap_start=True, cap_end=False)
    return bm


def build_greave_bmesh(side):
    """Cross-laced leather calf wraps and shin protection."""
    bm = bmesh.new()
    path = [
        Vector((0.004, 0, -0.250)),
        Vector((-0.002, 0, -0.320)),
        Vector((-0.004, 0, -0.370)),
    ]
    radii = [
        (0.048, 0.046),
        (0.046, 0.044),
        (0.040, 0.038),
    ]
    tube(bm, path, radii, segments=10, up_hint=Y_AXIS, cap_start=False, cap_end=False)
    return bm


def build_boot_bmesh():
    """Strappy skirmisher leather sandals / light boots with shaped sole and toes."""
    bm = bmesh.new()
    # Ankle cuff wrap
    cuff = [Vector((-0.004, 0, -0.365)), Vector((-0.004, 0, -0.395))]
    tube(bm, cuff, [(0.042, 0.040), (0.040, 0.038)], segments=10, cap_start=False, cap_end=False)

    # Foot sole and vamp
    foot_pts = [
        Vector((-0.035, 0.0, -0.405)),  # heel
        Vector((0.005,  0.0, -0.405)),  # midfoot / arch
        Vector((0.045,  0.0, -0.405)),  # ball of foot
        Vector((0.075,  0.0, -0.405)),  # toe tip
    ]
    radii = [
        (0.032, 0.022),
        (0.030, 0.024),
        (0.035, 0.022),
        (0.024, 0.014),
    ]
    tube(bm, foot_pts, radii, segments=8, up_hint=Z_AXIS, cap_start=True, cap_end=True)

    # Sandal straps over instep
    for x_off in [0.015, 0.040]:
        strap = bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=True, segments=6, radius1=0.004, radius2=0.004, depth=0.052)
        bmesh.ops.rotate(bm, verts=strap["verts"], cent=(0, 0, 0), matrix=Euler((math.radians(90), 0, 0)).to_matrix())
        bmesh.ops.translate(bm, verts=strap["verts"], vec=(x_off, 0.0, -0.392))

    bm.normal_update()
    return bm


# ---------------------------------------------------------------------------------------
# Scene assembly
# ---------------------------------------------------------------------------------------
def assemble_slinger(create_mesh_object, make_material):
    """Create the full slinger hierarchy in the current Blender scene and return the rig dict."""
    mats = {
        "cloth": make_material("ClothBrown", (0.42, 0.30, 0.19, 1.0), metallic=0.0, roughness=0.88),
        "team": make_material("TeamColor", (0.22, 0.42, 0.78, 1.0), metallic=0.08, roughness=0.70),
        "leather": make_material("Leather", (0.34, 0.21, 0.11, 1.0), metallic=0.05, roughness=0.75),
        "dark_leather": make_material("DarkLeather", (0.18, 0.12, 0.08, 1.0), metallic=0.05, roughness=0.80),
        "skin": make_material("Skin", (0.87, 0.70, 0.56, 1.0), metallic=0.0, roughness=0.75),
        "iron": make_material("ForgedIron", (0.48, 0.51, 0.55, 1.0), metallic=0.82, roughness=0.38),
        "steel": make_material("PolishedSteel", (0.72, 0.75, 0.80, 1.0), metallic=0.88, roughness=0.28),
        "brass": make_material("BurnishedBrass", (0.82, 0.65, 0.24, 1.0), metallic=0.85, roughness=0.32),
        "stone": make_material("SlingStone", (0.52, 0.50, 0.47, 1.0), metallic=0.05, roughness=0.85),
    }

    # 1. Torso (root object at 0, 0, 0)
    torso = create_mesh_object("Torso", build_torso_bmesh(), mats["cloth"], location=(0, 0, 0))
    create_mesh_object("Vest_Team", build_vest_bmesh(), mats["team"], parent=torso)
    create_mesh_object("Belt", build_belt_bmesh(), mats["leather"], parent=torso)
    create_mesh_object("Pouch_Strap", build_pouch_strap_bmesh(), mats["leather"], parent=torso)
    create_mesh_object("Stone_Pouch", build_stone_pouch_bmesh(), mats["dark_leather"], parent=torso)
    create_mesh_object("Neck", build_neck_bmesh(), mats["skin"], parent=torso)
    create_mesh_object("Collar", build_collar_bmesh(), mats["cloth"], parent=torso)

    # 2. Head (pivot at z = 0.875)
    head = create_mesh_object("Head", build_head_bmesh(), mats["skin"], parent=torso, location=(0, 0, HEAD_PIVOT_Z))
    # Distinctive headband dyed with TeamColor accents / leather trim
    create_mesh_object("Headband", build_headband_bmesh(), mats["team"], parent=head)
    create_mesh_object("Hair", build_hair_bmesh(), mats["dark_leather"], parent=head)
    create_mesh_object("Ear_L", build_ear_bmesh(1.0), mats["skin"], parent=head)
    create_mesh_object("Ear_R", build_ear_bmesh(-1.0), mats["skin"], parent=head)

    # 3. Left Arm (pivot at y = +0.175, z = 0.765)
    arm_l = create_mesh_object("Arm_L", build_arm_bmesh(1.0), mats["cloth"], parent=torso, location=(0, SHOULDER_Y, SHOULDER_Z))
    create_mesh_object("Pauldron_L", build_pauldron_bmesh(1.0), mats["leather"], parent=arm_l)
    create_mesh_object("Bracer_L", build_bracer_bmesh(1.0), mats["leather"], parent=arm_l)
    create_mesh_object("Hand_L", build_hand_bmesh(1.0, is_sling_hand=False), mats["skin"], parent=arm_l)

    # Skirmisher Buckler on Arm_L at forearm/wrist, angled 45 degrees towards the left flank
    shield = create_mesh_object(
        "Shield",
        build_buckler_shield_bmesh(),
        mats["leather"],
        parent=arm_l,
        location=(0.075, 0.055, -0.220),
        rotation=(math.radians(15), math.radians(-8), math.radians(45)),
    )
    create_mesh_object("Shield_Boss", build_buckler_boss_bmesh(), mats["brass"], parent=shield)
    create_mesh_object("Shield_Rim", build_buckler_rim_bmesh(), mats["iron"], parent=shield)

    # 4. Right Arm (pivot at y = -0.175, z = 0.765)
    arm_r = create_mesh_object("Arm_R", build_arm_bmesh(-1.0), mats["cloth"], parent=torso, location=(0, -SHOULDER_Y, SHOULDER_Z))
    create_mesh_object("Pauldron_R", build_pauldron_bmesh(-1.0), mats["leather"], parent=arm_r)
    create_mesh_object("Bracer_R", build_bracer_bmesh(-1.0), mats["leather"], parent=arm_r)
    create_mesh_object("Hand_R", build_hand_bmesh(-1.0, is_sling_hand=True), mats["skin"], parent=arm_r)

    # Leather Shepherd Sling & River Stone held in right hand
    weapon = create_mesh_object("Weapon", build_sling_weapon_bmesh(), mats["leather"], parent=arm_r)
    create_mesh_object("Sling_Stone", build_sling_stone_bmesh(), mats["stone"], parent=weapon)

    # 5. Left Leg (pivot at y = +0.080, z = 0.40)
    leg_l = create_mesh_object("Leg_L", build_leg_bmesh(), mats["cloth"], parent=torso, location=(0, HIP_Y, HIP_Z))
    create_mesh_object("Greave_L", build_greave_bmesh(1.0), mats["leather"], parent=leg_l)
    create_mesh_object("Boot_L", build_boot_bmesh(), mats["dark_leather"], parent=leg_l)

    # 6. Right Leg (pivot at y = -0.080, z = 0.40)
    leg_r = create_mesh_object("Leg_R", build_leg_bmesh(), mats["cloth"], parent=torso, location=(0, -HIP_Y, HIP_Z))
    create_mesh_object("Greave_R", build_greave_bmesh(-1.0), mats["leather"], parent=leg_r)
    create_mesh_object("Boot_R", build_boot_bmesh(), mats["dark_leather"], parent=leg_r)

    return {
        "torso": torso,
        "head": head,
        "arm_l": arm_l,
        "arm_r": arm_r,
        "leg_l": leg_l,
        "leg_r": leg_r,
        "weapon": weapon,
        "shield": shield,
    }

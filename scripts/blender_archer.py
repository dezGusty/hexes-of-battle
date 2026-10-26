"""
Higher-fidelity (circa 2008-2012 "Civilization 5 / Shogun 2" style) low-poly archer for Hexes of Battle.

Instead of primitive spheres and cylinders, every body part is lofted:
  - Athletic archer torso clad in a quilted diamond-stitched doublet / gambeson
  - Player-colored team tunic / vest (Vest_Team)
  - Detailed leather belt with brass buckle and quiver baldric strap
  - Back-mounted leather quiver packed with fletched arrows
  - Sculpted human head with focused archer facial landmarks and modeled ears
  - Iconic medieval hunting hat (bycocket) with peaked visor, folded rear brim, and sweeping feather
  - Left arm equipped with leather archer's bracer / vambrace to protect against bowstring slap
  - Right drawing hand with archer's shooting glove
  - Form-fitting leather hose and cuffed medieval hunting boots
  - Laminated yew longbow with recurved limbs, horn nocks, leather grip, and taut linen bowstring

Total budget is ~3k triangles, optimal for 2008-2012 strategy game fidelity
while remaining ultra-fast for cross-platform and mobile rendering.

Blender axes: +X = forward, +Y = unit's left (Arm_L), +Z = up. The glTF exporter converts to Y-up.

Rig contract:
  Torso (root)  -> Head, Arm_L, Arm_R, Leg_L, Leg_R
  Arm_L         -> Weapon (longbow & bowstring)
"""

import math
import random
import bmesh
from mathutils import Euler, Vector

# ---------------------------------------------------------------------------------------
# Proportions (metres; overall height ~1.10m with hunting hat and feather)
# ---------------------------------------------------------------------------------------
HIP_Z = 0.42
SHOULDER_Z = 0.765
SHOULDER_Y = 0.165
HIP_Y = 0.075
HEAD_PIVOT_Z = 0.87
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
        a = path[min(i + 1, len(path) - 1)] - path[max(i - 1, 0)]
        t = a.normalized()
        lat = (up_hint - t * up_hint.dot(t)).normalized()
        fwd = t.cross(lat).normalized()
        if fwd.dot(X_AXIS) < 0 and abs(fwd.dot(X_AXIS)) > 1e-3:
            fwd = -fwd
        ra, rb = radii[i]
        rings.append(make_ring(bm, c, lat, fwd, ra, rb, thetas, p))
    faces = bridge_rings(bm, rings, closed_bottom=cap_start, closed_top=cap_end)
    centroid = sum((c for c in path), Vector()) / len(path)
    _orient_outward(bm, faces, centroid)
    return rings


def z_loft(bm, stations, segments=20, cap_start=True, cap_end=True, thetas=None):
    """Loft stacked in Z. stations: (z, cx, rb, ra, p)."""
    if thetas is None:
        thetas = [2 * math.pi * k / segments for k in range(segments)]
    rings = []
    for (z, cx, rb, ra, p) in stations:
        rings.append(make_ring(bm, Vector((cx, 0.0, z)), Y_AXIS, X_AXIS, ra, rb, thetas, p))
    faces = bridge_rings(bm, rings, closed_bottom=cap_start, closed_top=cap_end)
    centroid = Vector((0.0, 0.0, sum(s[0] for s in stations) / len(stations)))
    _orient_outward(bm, faces, centroid)
    return rings


def smoothstep(e0, e1, x):
    t = max(0.0, min(1.0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)


def gauss(y, z, y0, z0, sy, sz):
    return math.exp(-(((y - y0) / sy) ** 2 + ((z - z0) / sz) ** 2) * 0.5)


# ---------------------------------------------------------------------------------------
# Head & Face Anatomy
# ---------------------------------------------------------------------------------------
_ARCHER_SKULL_PROFILE = [
    (0.00, 0.032, -0.038, 0.024, 2.2),
    (0.04, 0.052, -0.048, 0.038, 2.5),
    (0.09, 0.058, -0.060, 0.048, 2.6),
    (0.15, 0.056, -0.072, 0.056, 2.7),   # jawline
    (0.21, 0.057, -0.080, 0.060, 2.6),
    (0.26, 0.058, -0.084, 0.062, 2.5),
    (0.31, 0.058, -0.088, 0.064, 2.4),
    (0.36, 0.058, -0.090, 0.065, 2.4),
    (0.41, 0.058, -0.092, 0.066, 2.3),
    (0.46, 0.058, -0.093, 0.066, 2.3),
    (0.51, 0.058, -0.094, 0.066, 2.3),
    (0.56, 0.061, -0.094, 0.066, 2.3),   # brow ridge
    (0.61, 0.059, -0.093, 0.066, 2.3),
    (0.67, 0.057, -0.091, 0.065, 2.2),
    (0.73, 0.053, -0.087, 0.063, 2.2),
    (0.80, 0.045, -0.080, 0.058, 2.1),
    (0.87, 0.034, -0.068, 0.050, 2.0),
    (0.93, 0.022, -0.050, 0.040, 2.0),
    (0.975, 0.009, -0.026, 0.022, 2.0),
]


def build_head_bmesh():
    """Anatomical archer head with sculpted facial features: brow, eye sockets, sharp nose, chin."""
    bm = bmesh.new()
    thetas = [2 * math.pi * k / 20 for k in range(20)]
    rings = []
    for (zf, rf, rb, ra, p) in _ARCHER_SKULL_PROFILE:
        z = HEAD_CHIN_Z + zf * HEAD_H
        cx = 0.006 * math.sin(zf * math.pi)
        rings.append(make_ring(bm, Vector((cx, 0.0, z)), Y_AXIS, X_AXIS, ra, (rf, -rb), thetas, p))
    faces = bridge_rings(bm, rings, closed_bottom=True, closed_top=True)
    _orient_outward(bm, faces, Vector((0.0, 0.0, HEAD_CHIN_Z + HEAD_H * 0.5)))

    # Sculpt facial features
    def zfz(val):
        return HEAD_CHIN_Z + val * HEAD_H

    bm.normal_update()
    for v in bm.verts:
        x, y, z = v.co.x, v.co.y, v.co.z
        ay = abs(y)
        dx = 0.0

        # Brow ridge
        dx += 0.0065 * gauss(ay, z, 0.024, zfz(0.575), 0.034, 0.016)
        # Nose bridge and tip
        dx += 0.0140 * gauss(ay, z, 0.0, zfz(0.440), 0.010, 0.055)
        dx += 0.0055 * gauss(ay, z, 0.0, zfz(0.355), 0.014, 0.014)
        # Eye sockets
        dx -= 0.0090 * gauss(ay, z, 0.029, zfz(0.510), 0.016, 0.010)
        # Cheekbones
        dx += 0.0065 * gauss(ay, z, 0.048, zfz(0.390), 0.020, 0.015)
        # Lips & chin
        dx += 0.0050 * gauss(ay, z, 0.0, zfz(0.240), 0.020, 0.008)
        dx += 0.0090 * gauss(ay, z, 0.0, zfz(0.080), 0.018, 0.012)
        v.co.x = x + dx

    bm.normal_update()
    return bm


def build_ear_bmesh(side):
    bm = bmesh.new()
    ret = bmesh.ops.create_uvsphere(bm, u_segments=8, v_segments=6, radius=1.0)
    bmesh.ops.scale(bm, verts=ret["verts"], vec=(0.010, 0.006, 0.018))
    bmesh.ops.rotate(bm, verts=ret["verts"], cent=(0, 0, 0), matrix=Euler((0, math.radians(-10), 0)).to_matrix())
    bmesh.ops.translate(bm, verts=ret["verts"], vec=(-0.012, side * 0.070, HEAD_CHIN_Z + HEAD_H * 0.47))
    return bm


# ---------------------------------------------------------------------------------------
# Medieval Hunting Hat (Bycocket / Robin Hood style hat) with Feather
# ---------------------------------------------------------------------------------------
def build_hunting_hat_bmesh():
    """
    Iconic medieval hunting hat (bycocket):
      - Peaked brim extending forward over the brow (+X)
      - Upturned brim sweeping up at the sides and back
      - Tapered conical crown slanting slightly backwards
    """
    bm = bmesh.new()
    crown_z = HEAD_CHIN_Z + HEAD_H * 0.62

    # Hat crown stacked in Z
    # (z, cx, rb, ra, p)
    stations = [
        (crown_z + 0.000, 0.004, 0.088, 0.080, 2.3),
        (crown_z + 0.035, -0.002, 0.082, 0.075, 2.3),
        (crown_z + 0.070, -0.012, 0.072, 0.066, 2.2),
        (crown_z + 0.105, -0.024, 0.054, 0.048, 2.1),
        (crown_z + 0.130, -0.036, 0.028, 0.024, 2.0),
        (crown_z + 0.142, -0.044, 0.008, 0.008, 2.0),
    ]
    thetas = [2 * math.pi * k / 18 for k in range(18)]
    z_loft(bm, stations, segments=18, cap_start=True, cap_end=True, thetas=thetas)

    # Peaked forward visor brim and upturned rear brim
    brim_bm = bmesh.new()
    brim_pts = []
    for k in range(20):
        th = 2 * math.pi * k / 20
        c, s = math.cos(th), math.sin(th)
        # Forward peak extends forward (+X)
        fwd_peak = 0.038 * max(0.0, c) ** 2
        # Rear brim curves upward (+Z)
        rear_lift = 0.028 * max(0.0, -c) ** 2

        bx = (0.004 + c * (0.092 + fwd_peak))
        by = s * 0.085
        bz = crown_z + 0.005 + rear_lift
        brim_pts.append(Vector((bx, by, bz)))

    # Outer brim ring
    outer_pts = []
    for k in range(20):
        th = 2 * math.pi * k / 20
        c, s = math.cos(th), math.sin(th)
        fwd_peak = 0.065 * max(0.0, c) ** 2
        rear_lift = 0.045 * max(0.0, -c) ** 2

        bx = (0.006 + c * (0.104 + fwd_peak))
        by = s * 0.096
        bz = crown_z + 0.012 + rear_lift
        outer_pts.append(Vector((bx, by, bz)))

    rings = [
        [bm.verts.new(p) for p in brim_pts],
        [bm.verts.new(p) for p in outer_pts],
    ]
    bridge_rings(bm, rings, closed_bottom=False, closed_top=False)
    bm.normal_update()
    return bm


def build_feather_bmesh():
    """
    Long archer pheasant/goose feather stuck into the hatband and sweeping backwards.
    Features a rich gradient progressing from golden yellow at the quill/base to vivid reddish-orange at the tip.
    """
    bm = bmesh.new()
    # Path along left side of the hat crown, curving up and back
    hat_z = HEAD_CHIN_Z + HEAD_H * 0.65
    path = [
        Vector((0.020, 0.082, hat_z + 0.010)),
        Vector((-0.010, 0.086, hat_z + 0.060)),
        Vector((-0.055, 0.082, hat_z + 0.110)),
        Vector((-0.115, 0.070, hat_z + 0.145)),
        Vector((-0.170, 0.050, hat_z + 0.160)),
    ]
    # Feather vane width (flat ribbon)
    radii = [
        (0.004, 0.002),
        (0.012, 0.002),
        (0.018, 0.002),
        (0.014, 0.002),
        (0.003, 0.001),
    ]
    tube(bm, path, radii, segments=6, up_hint=Z_AXIS, cap_start=True, cap_end=True)

    # Golden to reddish-orange gradient from base (x = +0.020) to tip (x = -0.170)
    col_layer = bm.loops.layers.color.new("color")
    base_x = 0.020
    tip_x = -0.170
    span_x = base_x - tip_x
    for f in bm.faces:
        for loop in f.loops:
            v = loop.vert
            t = max(0.0, min(1.0, (base_x - v.co.x) / span_x))
            # Smooth cubic easing across golden -> amber -> vivid orange -> reddish-orange
            if t < 0.35:
                k = t / 0.35
                r = 1.0 * (1 - k) + 0.98 * k
                g = 0.82 * (1 - k) + 0.58 * k
                b = 0.15 * (1 - k) + 0.10 * k
            elif t < 0.70:
                k = (t - 0.35) / 0.35
                r = 0.98 * (1 - k) + 0.94 * k
                g = 0.58 * (1 - k) + 0.36 * k
                b = 0.10 * (1 - k) + 0.08 * k
            else:
                k = (t - 0.70) / 0.30
                r = 0.94 * (1 - k) + 0.88 * k
                g = 0.36 * (1 - k) + 0.18 * k
                b = 0.08 * (1 - k) + 0.06 * k
            loop[col_layer] = (r, g, b, 1.0)

    return bm


# ---------------------------------------------------------------------------------------
# Torso & Doublet
# ---------------------------------------------------------------------------------------
_ARCHER_TORSO_STATIONS = [
    (0.380, 0.000, 0.088, 0.112, 2.4),   # doublet peplum skirt hem
    (0.430, 0.002, 0.080, 0.102, 2.5),   # waist cinch
    (0.500, 0.004, 0.076, 0.094, 2.5),   # belt level
    (0.580, 0.006, 0.082, 0.102, 2.4),   # ribcage
    (0.660, 0.008, 0.088, 0.112, 2.3),   # chest / pectorals
    (0.730, 0.006, 0.088, 0.118, 2.4),   # upper chest
    (0.765, 0.002, 0.074, 0.116, 2.6),   # shoulder line
    (0.800, -0.002, 0.050, 0.076, 2.4),  # neck slope
    (0.825, -0.004, 0.042, 0.048, 2.2),  # collar
]


def _interp_station(z):
    st = _ARCHER_TORSO_STATIONS
    for i in range(len(st) - 1):
        if st[i][0] <= z <= st[i + 1][0]:
            t = (z - st[i][0]) / (st[i + 1][0] - st[i][0])
            return tuple(st[i][j] + (st[i + 1][j] - st[i][j]) * t for j in range(1, 5))
    return st[-1][1:]


def build_torso_bmesh():
    """Athletic archer torso: quilted doublet / gambeson."""
    bm = bmesh.new()
    z_loft(bm, _ARCHER_TORSO_STATIONS, segments=20, cap_start=True, cap_end=True)
    return bm


def build_vest_bmesh():
    """Player-colored archer tunic / tabard vest (Vest_Team)."""
    bm = bmesh.new()
    zs = [0.450, 0.490, 0.540, 0.600, 0.660, 0.720, 0.760, 0.790, 0.810]
    stations = []
    for z in zs:
        cx, rb, ra, p = _interp_station(z)
        grow = 0.0075
        if z > 0.78:
            grow = 0.004
        stations.append((z, cx, rb + grow, ra + grow, p))
    stations[0] = (stations[0][0], stations[0][1], stations[0][2] + 0.008, stations[0][3] + 0.010, stations[0][4])
    z_loft(bm, stations, segments=20, cap_start=False, cap_end=False)

    bm.normal_update()
    # V-neck front opening
    kill = []
    for f in bm.faces:
        c = f.calc_center_median()
        if c.x > 0.02:
            half_open = 0.008 + max(0.0, c.z - 0.52) * 0.110
            if abs(c.y) < half_open and c.z > 0.52:
                kill.append(f)
    bmesh.ops.delete(bm, geom=kill, context="FACES")
    return bm


def build_belt_bmesh():
    """Stitched leather belt with brass buckle and diagonal quiver baldric strap."""
    bm = bmesh.new()
    cx, rb, ra, p = _interp_station(0.500)
    r_b, r_a = rb + 0.013, ra + 0.013
    z_loft(bm, [(0.486, cx, r_b, r_a, p), (0.514, cx, r_b, r_a, p)], segments=20, cap_start=False, cap_end=False)

    # Brass buckle on front center
    ret = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, verts=ret["verts"], vec=(0.012, 0.032, 0.036))
    bmesh.ops.translate(bm, verts=ret["verts"], vec=(cx + r_b + 0.003, 0.0, 0.500))

    # Diagonal quiver baldric chest strap (from right shoulder over chest to left waist)
    strap_pts = [
        Vector((cx + 0.010, -0.090, 0.750)),
        Vector((cx + r_b + 0.006, -0.040, 0.650)),
        Vector((cx + r_b + 0.006, 0.030, 0.560)),
        Vector((cx + 0.010, 0.080, 0.490)),
    ]
    tube(bm, strap_pts, [(0.016, 0.006), (0.016, 0.006), (0.016, 0.006), (0.016, 0.006)], segments=6, up_hint=Z_AXIS, cap_start=True, cap_end=True)
    return bm


def build_neck_bmesh():
    """Anatomical muscular neck connecting torso doublet to the head/jaw."""
    bm = bmesh.new()
    path = [
        Vector((-0.004, 0.0, 0.795)),  # inside doublet collar
        Vector((-0.006, 0.0, 0.835)),  # mid neck / throat
        Vector((-0.008, 0.0, 0.875)),  # upper neck / jaw angle
        Vector((-0.010, 0.0, 0.915)),  # base of cranium / under-jaw
    ]
    radii = [
        (0.046, 0.044),  # collar base
        (0.040, 0.038),  # throat
        (0.038, 0.037),  # under-chin
        (0.036, 0.036),  # skull insertion
    ]
    tube(bm, path, radii, segments=12, up_hint=Y_AXIS, cap_start=False, cap_end=True)
    return bm


def build_collar_bmesh():
    """Doublet stand-up collar wrapping the base of the neck."""
    bm = bmesh.new()
    path = [
        Vector((-0.003, 0.0, 0.810)),
        Vector((-0.005, 0.0, 0.840)),
    ]
    radii = [
        (0.052, 0.048),
        (0.049, 0.045),
    ]
    tube(bm, path, radii, segments=12, up_hint=Y_AXIS, cap_start=False, cap_end=False)
    return bm


# ---------------------------------------------------------------------------------------
# Back Quiver & Arrows (child of Torso)
# ---------------------------------------------------------------------------------------
def build_quiver_bmesh():
    """Back-mounted leather quiver packed with fletched arrows."""
    bm = bmesh.new()
    # Slanted across the back (from left waist towards right shoulder)
    path = [
        Vector((-0.110, 0.040, 0.460)),
        Vector((-0.125, 0.025, 0.540)),
        Vector((-0.140, 0.010, 0.620)),
        Vector((-0.155, -0.005, 0.700)),
        Vector((-0.165, -0.015, 0.760)),
    ]
    radii = [
        (0.034, 0.032),
        (0.038, 0.036),
        (0.042, 0.040),
        (0.046, 0.044),
        (0.048, 0.046),
    ]
    tube(bm, path, radii, segments=12, up_hint=Y_AXIS, cap_start=True, cap_end=False)

    # Rim reinforcing collar band at top
    collar_path = [Vector((-0.160, -0.012, 0.745)), Vector((-0.168, -0.018, 0.770))]
    tube(bm, collar_path, [(0.052, 0.050), (0.052, 0.050)], segments=12, up_hint=Y_AXIS, cap_start=False, cap_end=False)
    return bm


def build_arrows_bmesh():
    """Fletched arrows protruding from the top of the quiver."""
    bm = bmesh.new()
    top_c = Vector((-0.165, -0.015, 0.760))
    d = (top_c - Vector((-0.110, 0.040, 0.460))).normalized()
    lat = Y_AXIS

    offsets = [
        (-0.015, -0.012, 0.12),
        (0.010, -0.016, 0.15),
        (-0.012, 0.014, 0.14),
        (0.014, 0.010, 0.17),
        (0.000, 0.000, 0.19),
    ]

    for ox, oy, alen in offsets:
        start = top_c + Vector((ox, oy, 0.0))
        end = start + d * alen

        # Arrow shaft
        shaft = [start, end]
        tube(bm, shaft, [(0.005, 0.005), (0.005, 0.005)], segments=6, cap_start=True, cap_end=True)

        # 3 feather fletchings at the nock
        for fa in (0, 2 * math.pi / 3, 4 * math.pi / 3):
            fv = (math.cos(fa) * lat + math.sin(fa) * d.cross(lat)).normalized()
            fletch_pts = [
                end - d * 0.060,
                end - d * 0.030 + fv * 0.015,
                end - d * 0.005 + fv * 0.014,
                end,
            ]
            tube(bm, fletch_pts, [(0.002, 0.001), (0.002, 0.001), (0.002, 0.001), (0.001, 0.001)], segments=4, up_hint=d, cap_start=True, cap_end=True)

    return bm


# ---------------------------------------------------------------------------------------
# Arms, Bracer (Arm_L), and Shooting Glove (Arm_R)
# ---------------------------------------------------------------------------------------
def build_arm_bmesh(side):
    """Upper arm sleeve in shoulder-relative coordinates."""
    bm = bmesh.new()
    path = [
        Vector((0.0, 0, 0.030)),
        Vector((0.004, 0, -0.030)),
        Vector((0.010, 0, -0.090)),
        Vector((0.018, 0, -0.150)),
    ]
    radii = [
        (0.046, 0.048),
        (0.044, 0.046),
        (0.041, 0.042),
        (0.038, 0.039),
    ]
    tube(bm, path, radii, segments=12, cap_start=True, cap_end=True)
    return bm


def build_bracer_bmesh():
    """Leather archer's bracer / armguard on left forearm with straps to prevent string slap."""
    bm = bmesh.new()
    forearm_pts = [
        Vector((0.018, 0, -0.150)),
        Vector((0.032, 0, -0.194)),
        Vector((0.048, 0, -0.242)),
        Vector((0.062, 0, -0.288)),
    ]
    tube(bm, forearm_pts, [(0.037, 0.036), (0.035, 0.034), (0.031, 0.030), (0.027, 0.026)], segments=10, cap_start=False, cap_end=False)

    # Bracer reinforcing outer plate on inner forearm (Y > 0)
    plate = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, verts=plate["verts"], vec=(0.028, 0.014, 0.110))
    bmesh.ops.translate(bm, verts=plate["verts"], vec=(0.040, 0.026, -0.220))
    return bm


def build_right_forearm_bmesh():
    """Right forearm with sleeve cuff."""
    bm = bmesh.new()
    forearm_pts = [
        Vector((0.018, 0, -0.150)),
        Vector((0.032, 0, -0.194)),
        Vector((0.048, 0, -0.242)),
        Vector((0.062, 0, -0.288)),
    ]
    tube(bm, forearm_pts, [(0.036, 0.035), (0.034, 0.033), (0.030, 0.029), (0.026, 0.025)], segments=10, cap_start=False, cap_end=False)
    return bm


WRIST = Vector((0.062, 0.0, -0.288))
HAND_DIR = Vector((0.27, 0.0, -0.96)).normalized()


def build_hand_bmesh(side, is_bow_hand=False):
    """
    Archer hand:
      - Left hand (is_bow_hand=True): Formed to grip the longbow stave.
      - Right hand (draw hand): 3-finger leather shooting tab / glove.
    """
    bm = bmesh.new()
    pts, radii = [], []
    for s, ra, rb in [(-0.006, 0.025, 0.018), (0.018, 0.031, 0.020), (0.042, 0.032, 0.019), (0.066, 0.029, 0.017), (0.086, 0.020, 0.012)]:
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
# Legs & Hunting Boots
# ---------------------------------------------------------------------------------------
def build_leg_bmesh():
    """Form-fitting wool / leather hose, hip-relative."""
    bm = bmesh.new()
    path = [
        Vector((0, 0, 0.060)),
        Vector((0, 0, 0.000)),
        Vector((0.003, 0, -0.100)),
        Vector((0.012, 0, -0.210)),
        Vector((0.007, 0, -0.280)),
        Vector((0.0, 0, -0.370)),
        Vector((-0.002, 0, -0.400)),
    ]
    radii = [
        (0.054, 0.053),
        (0.058, 0.056),
        (0.054, 0.052),
        (0.045, 0.044),
        (0.047, 0.044),
        (0.036, 0.034),
        (0.034, 0.032),
    ]
    tube(bm, path, radii, segments=12, up_hint=Y_AXIS, cap_start=True, cap_end=False)
    return bm


def build_boot_bmesh():
    """Turned-leather hunting boots with folded ankle cuff and shaped soles."""
    bm = bmesh.new()
    # Folded top cuff
    cuff = [Vector((0.0, 0, -0.270)), Vector((0.0, 0, -0.310))]
    tube(bm, cuff, [(0.051, 0.050), (0.046, 0.045)], segments=12, cap_start=True, cap_end=False)

    # Ankle shaft
    shaft = [Vector((0.0, 0, -0.310)), Vector((0.0, 0, -0.360)), Vector((-0.002, 0, -0.420))]
    tube(bm, shaft, [(0.045, 0.044), (0.039, 0.038), (0.039, 0.038)], segments=12, cap_start=False, cap_end=False)

    # Foot stations along +X
    stations = [
        (-0.044, -0.424, 0.035, 0.030),  # heel
        (-0.015, -0.422, 0.036, 0.034),  # instep
        (0.028, -0.434, 0.026, 0.038),   # midfoot
        (0.068, -0.442, 0.018, 0.038),   # ball
        (0.100, -0.446, 0.014, 0.030),   # toe
        (0.122, -0.450, 0.008, 0.016),   # tip
    ]
    thetas = [2 * math.pi * k / 10 for k in range(10)]
    rings = []
    for (x, cz, hz, hy) in stations:
        rings.append(make_ring(bm, Vector((x, 0.0, cz)), Y_AXIS, Z_AXIS, hy, hz, thetas, 2.4))
    faces = bridge_rings(bm, rings, closed_bottom=True, closed_top=True)
    _orient_outward(bm, faces, Vector((0.04, 0.0, -0.436)))
    return bm


# ---------------------------------------------------------------------------------------
# Laminated Yew Longbow (Arm_L child)
# ---------------------------------------------------------------------------------------
def build_bow_bmesh():
    """
    English / Welsh medieval longbow:
      - Gracefully curved yew stave tapering from belly to tips
      - Carved horn nocks at upper and lower tips
      - Leather grip wrapping in the center
      - Taut twisted linen bowstring
    """
    bm = bmesh.new()
    grip_c = WRIST + HAND_DIR * 0.045 + X_AXIS * 0.005

    # Bow stave polyline with natural D-section curve
    # Stave curves from upper tip (+Z, slightly back -X) through grip to lower tip (-Z)
    stave_pts = [
        grip_c + Vector((-0.035, 0.0, 0.520)),   # upper horn nock
        grip_c + Vector((-0.015, 0.0, 0.420)),
        grip_c + Vector((0.010, 0.0, 0.280)),
        grip_c + Vector((0.024, 0.0, 0.140)),
        grip_c + Vector((0.026, 0.0, 0.000)),    # grip center
        grip_c + Vector((0.024, 0.0, -0.140)),
        grip_c + Vector((0.010, 0.0, -0.280)),
        grip_c + Vector((-0.015, 0.0, -0.420)),
        grip_c + Vector((-0.035, 0.0, -0.520)),  # lower horn nock
    ]

    stave_radii = [
        (0.008, 0.007),
        (0.011, 0.010),
        (0.014, 0.013),
        (0.017, 0.016),
        (0.019, 0.018),  # grip
        (0.017, 0.016),
        (0.014, 0.013),
        (0.011, 0.010),
        (0.008, 0.007),
    ]

    tube(bm, stave_pts, stave_radii, segments=8, up_hint=Y_AXIS, cap_start=True, cap_end=True)

    # Leather wrapped grip at center
    grip_wrap = [stave_pts[3], stave_pts[4], stave_pts[5]]
    tube(bm, grip_wrap, [(0.021, 0.020), (0.022, 0.021), (0.021, 0.020)], segments=8, up_hint=Y_AXIS, cap_start=False, cap_end=False)

    # Taut linen bowstring running between the horn nocks
    upper_nock = stave_pts[0] + Vector((0.004, 0.0, -0.010))
    lower_nock = stave_pts[-1] + Vector((0.004, 0.0, 0.010))
    string_pts = [upper_nock, lower_nock]
    tube(bm, string_pts, [(0.003, 0.003), (0.003, 0.003)], segments=4, up_hint=Y_AXIS, cap_start=True, cap_end=True)

    return bm


# ---------------------------------------------------------------------------------------
# Scene assembly
# ---------------------------------------------------------------------------------------
def assemble_archer(create_mesh_object, make_material):
    """Create the full archer hierarchy in the current Blender scene and return the rig dict."""
    mats = {
        "cloth": make_material("ArcherClothing", (0.34, 0.22, 0.12, 1.0), metallic=0.02, roughness=0.85),
        "team": make_material("TeamColor", (0.22, 0.42, 0.78, 1.0), metallic=0.04, roughness=0.76),
        "hat_green": make_material("ArcherHatGreen", (0.13, 0.28, 0.15, 1.0), metallic=0.04, roughness=0.80),
        "leather": make_material("ArcherLeather", (0.20, 0.13, 0.08, 1.0), metallic=0.04, roughness=0.78),
        "skin": make_material("ArcherSkin", (1.0, 1.0, 1.0, 1.0), metallic=0.0, roughness=0.74),
        "wood": make_material("ArcherBow", (0.46, 0.31, 0.16, 1.0), metallic=0.08, roughness=0.65),
        "feather": make_material("ArcherFeather", (1.0, 0.65, 0.18, 1.0), metallic=0.06, roughness=0.65),
    }

    # 1. Torso (root object at 0, 0, 0)
    torso = create_mesh_object("Torso", build_torso_bmesh(), mats["cloth"], location=(0, 0, 0))
    create_mesh_object("Vest_Team", build_vest_bmesh(), mats["team"], parent=torso)
    create_mesh_object("Belt", build_belt_bmesh(), mats["leather"], parent=torso)
    create_mesh_object("Neck", build_neck_bmesh(), mats["skin"], parent=torso)
    create_mesh_object("Collar", build_collar_bmesh(), mats["cloth"], parent=torso)
    create_mesh_object("Quiver", build_quiver_bmesh(), mats["leather"], parent=torso)
    create_mesh_object("Quiver_Arrows", build_arrows_bmesh(), mats["feather"], parent=torso)

    # 2. Head (pivot at z = 0.87)
    head = create_mesh_object("Head", build_head_bmesh(), mats["skin"], parent=torso, location=(0, 0, HEAD_PIVOT_Z))
    create_mesh_object("Hunting_Hat", build_hunting_hat_bmesh(), mats["hat_green"], parent=head)
    create_mesh_object("Feather", build_feather_bmesh(), mats["feather"], parent=head)
    create_mesh_object("Ear_L", build_ear_bmesh(1.0), mats["skin"], parent=head)
    create_mesh_object("Ear_R", build_ear_bmesh(-1.0), mats["skin"], parent=head)

    # 3. Left Arm (pivot at y = +0.165, z = 0.765)
    arm_l = create_mesh_object("Arm_L", build_arm_bmesh(1.0), mats["cloth"], parent=torso, location=(0, SHOULDER_Y, SHOULDER_Z))
    create_mesh_object("Bracer_L", build_bracer_bmesh(), mats["leather"], parent=arm_l)
    create_mesh_object("Hand_L", build_hand_bmesh(1.0, is_bow_hand=True), mats["skin"], parent=arm_l)

    # Longbow held in left hand
    create_mesh_object("Weapon", build_bow_bmesh(), mats["wood"], parent=arm_l)

    # 4. Right Arm (pivot at y = -0.165, z = 0.765)
    arm_r = create_mesh_object("Arm_R", build_arm_bmesh(-1.0), mats["cloth"], parent=torso, location=(0, -SHOULDER_Y, SHOULDER_Z))
    create_mesh_object("Forearm_R", build_right_forearm_bmesh(), mats["cloth"], parent=arm_r)
    create_mesh_object("Hand_R", build_hand_bmesh(-1.0, is_bow_hand=False), mats["leather"], parent=arm_r)

    # 5. Left Leg (pivot at y = +0.075, z = 0.42)
    leg_l = create_mesh_object("Leg_L", build_leg_bmesh(), mats["cloth"], parent=torso, location=(0, HIP_Y, HIP_Z))
    create_mesh_object("Boot_L", build_boot_bmesh(), mats["leather"], parent=leg_l)

    # 6. Right Leg (pivot at y = -0.075, z = 0.42)
    leg_r = create_mesh_object("Leg_R", build_leg_bmesh(), mats["cloth"], parent=torso, location=(0, -HIP_Y, HIP_Z))
    create_mesh_object("Boot_R", build_boot_bmesh(), mats["leather"], parent=leg_r)

    return {
        "torso": torso,
        "head": head,
        "arm_l": arm_l,
        "arm_r": arm_r,
        "leg_l": leg_l,
        "leg_r": leg_r,
    }

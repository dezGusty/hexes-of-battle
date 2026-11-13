"""
Higher-fidelity (circa 2008-2012 "Civilization 5 / Shogun 2" style) low-poly peasant for Hexes of Battle.

Instead of primitive spheres and cylinders, every body part is *lofted* from a stack of
super-elliptical cross-sections (torso, sleeves, trousers, boots, hands) and the head is a
lofted skull whose face is sculpted with analytic landmarks (brow ridge, eye sockets, nose,
cheekbones, lips, chin) and topped with a separate hair shell. Total budget is ~3k triangles.

Blender axes: +X = forward, +Y = unit's left (Arm_L), +Z = up. The glTF exporter converts to Y-up.

Rig contract (identical to the old peasant so animation code keeps working):
  Torso (root)  -> Head, Arm_L, Arm_R, Leg_L, Leg_R
  Arm_R         -> Weapon (pitchfork)
Everything else is a decorative child and gets merged into its parent limb at load time
(see compactArticulatedUnitHierarchy). Child names drive UV mapping and team colouring in
src/render3d/units/unit-mesh-builder.ts, so keep them in sync:
  *_Team   -> dyed in the player's colour (the vest)
  Neck / Forearm_* / Hand_*  -> skin band of the garb atlas
  Head / Hair / Ear_*        -> head atlas
"""

import math
import random

import bmesh
from mathutils import Euler, Vector

# ---------------------------------------------------------------------------------------
# Proportions (metres-ish; whole figure is ~1.07 tall, head ~1/5.6 of height)
# ---------------------------------------------------------------------------------------
HIP_Z = 0.46
SHOULDER_Z = 0.775
SHOULDER_Y = 0.13
HIP_Y = 0.052
HEAD_PIVOT_Z = 0.86
HEAD_H = 0.19          # chin underside -> crown
HEAD_CHIN_Z = 0.02     # chin underside, relative to the head pivot

X_AXIS = Vector((1.0, 0.0, 0.0))
Y_AXIS = Vector((0.0, 1.0, 0.0))
Z_AXIS = Vector((0.0, 0.0, 1.0))

# ---------------------------------------------------------------------------------------
# Two-handed pitchfork grip positions & direction in world space (Torso at 0,0,0)
# ---------------------------------------------------------------------------------------
# Left hand (Hand_L) grips around the middle (50%) of the shaft:
HAND_L_WORLD = Vector((0.170, 0.020, 0.460))
# Right hand (Hand_R) grips towards 3 quarters (74%) of the shaft:
HAND_R_WORLD = Vector((0.260, -0.050, 0.700))

# Direction of the tilted pitchfork shaft:
FORK_DIR = (HAND_R_WORLD - HAND_L_WORLD).normalized()
SHAFT_LEN = 1.12
HAND_R_FRAC = 0.74
HAND_L_FRAC = 0.50

# Wrist positions in local arm spaces:
WRIST_R = HAND_R_WORLD - Vector((0.0, -SHOULDER_Y, SHOULDER_Z))
WRIST_L = HAND_L_WORLD - Vector((0.0, SHOULDER_Y, SHOULDER_Z))


# ---------------------------------------------------------------------------------------
# Loft helpers
# ---------------------------------------------------------------------------------------
def _superellipse(theta, p):
    e = 2.0 / p
    c, s = math.cos(theta), math.sin(theta)
    return math.copysign(abs(c) ** e, c), math.copysign(abs(s) ** e, s)


def make_ring(bm, centre, a_vec, b_vec, ra, rb, thetas, p=2.0):
    """One cross-section: `a` is the lateral axis (radius ra), `b` the fore-aft axis (radius rb).
    `rb` may be a (front, back) tuple for asymmetric sections (used by the skull)."""
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
    """Flip every face of the loft if (on average) normals point towards `centre_hint`."""
    bm.normal_update()
    score = 0.0
    for f in faces:
        score += f.normal.dot(f.calc_center_median() - centre_hint)
    if score < 0:
        bmesh.ops.reverse_faces(bm, faces=faces)


def tube(bm, path, radii, segments=10, p=2.0, up_hint=Y_AXIS, cap_start=True, cap_end=True, thetas=None):
    """Loft along a polyline `path` (list of Vector). radii[i] = (ra, rb): ra along `up_hint`
    (lateral), rb along the perpendicular fore-aft axis."""
    if thetas is None:
        thetas = [2 * math.pi * k / segments for k in range(segments)]
    rings = []
    for i, c in enumerate(path):
        a = path[min(i + 1, len(path) - 1)] - path[max(i - 1, 0)]
        t = a.normalized()
        lat = (up_hint - t * up_hint.dot(t)).normalized()
        fwd = t.cross(lat).normalized()
        # make sure `fwd` points to +X (or +Z for vertical-lateral hints) for consistent UV/orientation
        if fwd.dot(X_AXIS) < 0 and abs(fwd.dot(X_AXIS)) > 1e-3:
            fwd = -fwd
        ra, rb = radii[i]
        rings.append(make_ring(bm, c, lat, fwd, ra, rb, thetas, p))
    faces = bridge_rings(bm, rings, closed_bottom=cap_start, closed_top=cap_end)
    centroid = sum((c for c in path), Vector()) / len(path)
    _orient_outward(bm, faces, centroid)
    return rings


def z_loft(bm, stations, segments=20, cap_start=True, cap_end=True, thetas=None):
    """Loft stacked in Z. stations: (z, cx, rb, ra, p). rb = fore-aft radius, ra = lateral radius."""
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
# Head
# ---------------------------------------------------------------------------------------
# (zf = 0 chin underside .. 1 crown, front depth, back depth, half width, super-ellipse exponent)
_SKULL_PROFILE = [
    (0.00, 0.034, -0.040, 0.026, 2.2),
    (0.04, 0.056, -0.050, 0.040, 2.5),
    (0.09, 0.062, -0.062, 0.052, 2.6),
    (0.15, 0.058, -0.074, 0.060, 2.7),   # jaw angle
    (0.21, 0.059, -0.082, 0.064, 2.6),
    (0.26, 0.060, -0.086, 0.066, 2.5),
    (0.31, 0.060, -0.090, 0.068, 2.4),
    (0.36, 0.060, -0.093, 0.069, 2.4),
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

# Landmarks as fractions of head height (== normalised V of the head texture; keep in sync with
# generatePeasantHeadPixels in src/render3d/units/humanoid-unit-textures.ts)
HEAD_LANDMARKS = {
    "eye": 0.505,
    "brow": 0.575,
    "nose_tip": 0.335,
    "nose_base": 0.30,
    "mouth": 0.215,
    "chin": 0.075,
    "hairline": 0.80,
}


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


def build_head_bmesh():
    """Skull + face in head-local coordinates (origin = neck pivot). Returns (bm, ring_zfs)."""
    bm = bmesh.new()
    zfs = [0.0, 0.04, 0.09, 0.15, 0.21, 0.26, 0.31, 0.36, 0.41, 0.46, 0.51, 0.56, 0.61, 0.67, 0.73, 0.80, 0.87, 0.93, 0.975]
    thetas = _head_thetas()
    rings = []
    for zf in zfs:
        xf, xb, w, p = _profile_at(zf)
        z = HEAD_CHIN_Z + zf * HEAD_H
        cx = 0.0
        rings.append(make_ring(bm, Vector((cx, 0.0, z)), Y_AXIS, X_AXIS, w, (xf, -xb), thetas, p))
    faces = bridge_rings(bm, rings, closed_bottom=True, closed_top=False)
    # crown fan
    crown = bm.verts.new(Vector((-0.012, 0.0, HEAD_CHIN_Z + HEAD_H)))
    top = rings[-1]
    n = len(top)
    for k in range(n):
        faces.append(bm.faces.new((top[k], top[(k + 1) % n], crown)))
    _orient_outward(bm, faces, Vector((0, 0, HEAD_CHIN_Z + HEAD_H * 0.5)))

    # --- sculpt the face -------------------------------------------------------------
    def zl(name):
        return HEAD_CHIN_Z + HEAD_LANDMARKS[name] * HEAD_H

    def zfz(frac):
        return HEAD_CHIN_Z + frac * HEAD_H

    for v in bm.verts:
        x, y, z = v.co
        if x <= 0.0:
            continue
        ay = abs(y)
        dx = 0.0
        # nose: tip, bridge and alae
        dx += 0.031 * gauss(ay, z, 0.0, zfz(0.335), 0.013, 0.0115)
        dx += 0.013 * gauss(ay, z, 0.0, zfz(0.455), 0.010, 0.0165)
        dx += 0.010 * gauss(ay, z, 0.017, zfz(0.315), 0.009, 0.0095)
        # brow ridge / glabella
        dx += 0.009 * gauss(ay, z, 0.0, zfz(0.575), 0.050, 0.0095)
        # eye sockets
        dx -= 0.009 * gauss(ay, z, 0.031, zfz(0.505), 0.016, 0.0095)
        # cheekbones
        dx += 0.007 * gauss(ay, z, 0.050, zfz(0.385), 0.020, 0.0150)
        # lips
        dx += 0.006 * gauss(ay, z, 0.0, zfz(0.238), 0.022, 0.0085)
        dx += 0.0055 * gauss(ay, z, 0.0, zfz(0.190), 0.020, 0.0085)
        # mouth corners dip back a little
        dx -= 0.003 * gauss(ay, z, 0.027, zfz(0.215), 0.010, 0.0080)
        # chin
        dx += 0.010 * gauss(ay, z, 0.0, zfz(0.075), 0.020, 0.0115)
        v.co.x = x + dx
    bm.normal_update()
    return bm


def build_hair_bmesh(head_bm):
    """Short tousled hair: a shell hugging the skull above a hairline that drops towards the nape."""
    bm = head_bm.copy()
    bm.normal_update()
    rnd = random.Random(1337)
    crown_z = HEAD_CHIN_Z + HEAD_H

    def boundary_zf(theta):
        a = abs(math.atan2(math.sin(theta), math.cos(theta)))  # 0 front .. pi back
        deg = math.degrees(a)
        if deg < 40:
            return HEAD_LANDMARKS["hairline"] + 0.015 * (deg / 40.0)
        if deg < 95:
            t = (deg - 40) / 55.0
            return 0.815 + (0.60 - 0.815) * smoothstep(0, 1, t)
        t = (deg - 95) / 55.0
        return 0.60 + (0.36 - 0.60) * smoothstep(0, 1, t)

    kill = []
    for f in bm.faces:
        c = f.calc_center_median()
        zf = (c.z - HEAD_CHIN_Z) / HEAD_H
        th = math.atan2(c.y, c.x + 0.012)
        if zf < boundary_zf(th):
            kill.append(f)
    bmesh.ops.delete(bm, geom=kill, context="FACES")
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    bm.normal_update()
    for v in bm.verts:
        th = math.atan2(v.co.y, v.co.x + 0.012)
        deg = math.degrees(abs(th))
        thickness = 0.0065 + 0.0075 * smoothstep(90, 150, deg)          # fuller at the back
        thickness += 0.004 * smoothstep(0.80, 1.0, (v.co.z - HEAD_CHIN_Z) / HEAD_H)  # volume on top
        thickness += rnd.uniform(-0.0025, 0.0030)                        # tufts
        v.co += v.normal * thickness
    bm.normal_update()
    return bm


def build_ear_bmesh(side):
    bm = bmesh.new()
    ret = bmesh.ops.create_uvsphere(bm, u_segments=8, v_segments=6, radius=1.0)
    bmesh.ops.scale(bm, verts=ret["verts"], vec=(0.011, 0.0065, 0.019))
    bmesh.ops.rotate(bm, verts=ret["verts"], cent=(0, 0, 0), matrix=Euler((0, math.radians(-10), 0)).to_matrix())
    bmesh.ops.translate(bm, verts=ret["verts"], vec=(-0.014, side * 0.0745, HEAD_CHIN_Z + HEAD_H * 0.47))
    return bm


# ---------------------------------------------------------------------------------------
# Body
# ---------------------------------------------------------------------------------------
# (z, centre x, fore-aft radius, lateral radius, exponent)
_TORSO_STATIONS = [
    (0.380, 0.000, 0.094, 0.122, 2.4),   # tunic hem (flared skirt)
    (0.430, 0.000, 0.086, 0.110, 2.5),
    (0.500, 0.000, 0.078, 0.096, 2.5),   # waist
    (0.580, 0.002, 0.082, 0.100, 2.5),
    (0.660, 0.004, 0.090, 0.108, 2.4),   # chest
    (0.730, 0.004, 0.090, 0.114, 2.4),
    (0.775, 0.000, 0.074, 0.112, 2.7),   # shoulder line
    (0.805, -0.004, 0.050, 0.078, 2.5),
    (0.822, -0.006, 0.044, 0.050, 2.2),  # neck base
]

_VEST_Z0 = 0.470
_VEST_Z1 = 0.800


def _interp_station(z):
    st = _TORSO_STATIONS
    for i in range(len(st) - 1):
        if st[i][0] <= z <= st[i + 1][0]:
            t = (z - st[i][0]) / (st[i + 1][0] - st[i][0])
            return tuple(st[i][j] + (st[i + 1][j] - st[i][j]) * t for j in range(1, 5))
    return st[-1][1:]


def build_torso_bmesh():
    bm = bmesh.new()
    z_loft(bm, _TORSO_STATIONS, segments=20, cap_start=True, cap_end=True)
    return bm


def build_vest_bmesh():
    """Sleeveless jerkin worn over the shirt, open in a V at the front. This is the team colour."""
    bm = bmesh.new()
    zs = [0.470, 0.500, 0.540, 0.600, 0.660, 0.720, 0.765, 0.795, 0.808]
    stations = []
    for z in zs:
        cx, rb, ra, p = _interp_station(z)
        grow = 0.0075
        if z > 0.79:
            grow = 0.0045
        stations.append((z, cx, rb + grow, ra + grow, p))
    # skirt flare at the bottom edge
    stations[0] = (stations[0][0], stations[0][1], stations[0][2] + 0.008, stations[0][3] + 0.010, stations[0][4])
    z_loft(bm, stations, segments=20, cap_start=False, cap_end=False)
    bm.normal_update()
    kill = []
    for f in bm.faces:
        c = f.calc_center_median()
        if c.x > 0.02:
            half_open = 0.010 + max(0.0, c.z - 0.50) * 0.105
            if abs(c.y) < half_open and c.z > 0.50:
                kill.append(f)
    bmesh.ops.delete(bm, geom=kill, context="FACES")
    return bm


def build_belt_bmesh():
    bm = bmesh.new()
    cx, rb, ra, p = _interp_station(0.50)
    r_b, r_a = rb + 0.0145, ra + 0.0145
    z_loft(bm, [(0.488, cx, r_b, r_a, p), (0.512, cx, r_b, r_a, p)], segments=20, cap_start=False, cap_end=False)
    # buckle
    ret = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, verts=ret["verts"], vec=(0.012, 0.030, 0.034))
    bmesh.ops.translate(bm, verts=ret["verts"], vec=(cx + r_b + 0.003, 0.0, 0.500))
    return bm


def build_neck_bmesh():
    bm = bmesh.new()
    path = [Vector((-0.006, 0, 0.790)), Vector((-0.008, 0, 0.840)), Vector((-0.012, 0, 0.905))]
    tube(bm, path, [(0.048, 0.046), (0.040, 0.039), (0.038, 0.037)], segments=12, up_hint=Y_AXIS, cap_start=False, cap_end=True)
    return bm


def build_sleeve_bmesh(side):
    """Rolled-up linen sleeve: deltoid -> elbow, in shoulder-relative coordinates."""
    bm = bmesh.new()
    if side < 0:
        # Arm_R: shoulder -> elbow bent forward/inward to hold upper shaft
        path = [
            Vector((0.0, 0.015, 0.038)),
            Vector((0.0, 0.000, 0.015)),
            Vector((0.020, -0.005, -0.030)),
            Vector((0.055, 0.005, -0.085)),
            Vector((0.095, 0.015, -0.135)),
            Vector((0.120, 0.020, -0.160)),
        ]
    else:
        # Arm_L: shoulder -> elbow reaching down/forward across to middle shaft
        path = [
            Vector((0.0, -0.015, 0.038)),
            Vector((0.0, 0.000, 0.015)),
            Vector((0.012, 0.005, -0.035)),
            Vector((0.028, -0.005, -0.095)),
            Vector((0.048, -0.018, -0.145)),
            Vector((0.065, -0.028, -0.175)),
        ]
    radii = [
        (0.030, 0.028),
        (0.046, 0.048),
        (0.049, 0.051),
        (0.043, 0.044),
        (0.047, 0.047),
        (0.042, 0.042),
    ]
    tube(bm, path, radii, segments=12, cap_start=True, cap_end=True)
    return bm


def build_forearm_bmesh(side):
    """Bare peasant forearm from elbow to wrist."""
    bm = bmesh.new()
    if side < 0:
        # Arm_R: elbow -> WRIST_R
        path = [
            Vector((0.120, 0.020, -0.160)),
            Vector((0.160, 0.038, -0.135)),
            Vector((0.210, 0.060, -0.108)),
            WRIST_R,
        ]
    else:
        # Arm_L: elbow -> WRIST_L
        path = [
            Vector((0.065, -0.028, -0.175)),
            Vector((0.098, -0.052, -0.218)),
            Vector((0.132, -0.080, -0.265)),
            WRIST_L,
        ]
    tube(bm, path, [(0.036, 0.036), (0.034, 0.032), (0.028, 0.026), (0.024, 0.022)], segments=10, cap_start=False, cap_end=False)
    return bm


def build_hand_bmesh(side):
    """
    Peasant hand gripping the pitchfork shaft:
      - Wrist transition
      - Palm block
      - Curled fingers wrapped around the wooden shaft
      - Thumb locking the grip
    """
    bm = bmesh.new()
    wrist = WRIST_L if side > 0 else WRIST_R
    sdir = FORK_DIR

    # Coordinate frame perpendicular to the shaft:
    up_hint = Z_AXIS
    lat = (up_hint - sdir * up_hint.dot(sdir)).normalized()
    fwd = sdir.cross(lat).normalized()

    # Wrist transition
    cuff_pts = [wrist - sdir * 0.030, wrist]
    tube(bm, cuff_pts, [(0.028, 0.025), (0.025, 0.023)], segments=8, up_hint=lat, cap_start=True, cap_end=False)

    # Palm block around shaft
    palm = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, verts=palm["verts"], vec=(0.036, 0.030, 0.044))
    bmesh.ops.translate(bm, verts=palm["verts"], vec=wrist + fwd * (side * 0.012))

    # Curled fingers wrapped around shaft perimeter (shaft radius ~0.020m)
    grip_angles = [math.pi * (-0.4 + 1.6 * k / 6) for k in range(7)]
    grip_pts = [wrist + lat * (math.cos(a) * 0.022) + fwd * (math.sin(a) * 0.022) for a in grip_angles]
    tube(bm, grip_pts, [(0.014, 0.018)] * len(grip_pts), segments=6, up_hint=sdir, cap_start=True, cap_end=True)

    # Opposing thumb pressing against shaft
    thumb_pts = [
        wrist + fwd * (side * 0.020),
        wrist + lat * (side * 0.018) + fwd * (side * 0.014),
        wrist + lat * (side * 0.022),
    ]
    tube(bm, thumb_pts, [(0.009, 0.009), (0.008, 0.008), (0.006, 0.006)], segments=6, up_hint=sdir, cap_start=True, cap_end=True)

    bm.normal_update()
    return bm


def build_leg_bmesh():
    """Wool trousers, hip-relative."""
    bm = bmesh.new()
    path = [Vector(p) for p in [(0, 0, 0.060), (0, 0, 0.0), (0.003, 0, -0.100), (0.014, 0, -0.220), (0.008, 0, -0.290), (0.0, 0, -0.380), (-0.002, 0, -0.405)]]
    radii = [(0.056, 0.055), (0.060, 0.058), (0.057, 0.054), (0.047, 0.046), (0.050, 0.046), (0.037, 0.035), (0.035, 0.033)]
    tube(bm, path, radii, segments=12, up_hint=Y_AXIS, cap_start=True, cap_end=False)
    return bm


def build_boot_bmesh():
    bm = bmesh.new()
    shaft = [Vector(p) for p in [(0.0, 0, -0.282), (0.0, 0, -0.300), (0.0, 0, -0.360), (-0.002, 0, -0.420)]]
    tube(bm, shaft, [(0.052, 0.051), (0.047, 0.046), (0.041, 0.040), (0.041, 0.040)], segments=12, cap_start=False, cap_end=False)
    # foot lofted along +X
    stations = [
        (-0.046, -0.424, 0.036, 0.032),
        (-0.016, -0.422, 0.038, 0.036),
        (0.030, -0.434, 0.027, 0.040),
        (0.070, -0.442, 0.019, 0.040),
        (0.104, -0.446, 0.015, 0.032),
        (0.126, -0.452, 0.009, 0.018),
    ]
    thetas = [2 * math.pi * k / 10 for k in range(10)]
    rings = []
    for (x, cz, hz, hy) in stations:
        # ring in the Y/Z plane: a = lateral (Y), b = vertical (Z)
        rings.append(make_ring(bm, Vector((x, 0.0, cz)), Y_AXIS, Z_AXIS, hy, hz, thetas, 2.4))
    faces = bridge_rings(bm, rings, closed_bottom=True, closed_top=True)
    _orient_outward(bm, faces, Vector((0.04, 0.0, -0.436)))
    return bm


# ---------------------------------------------------------------------------------------
# Pitchfork (shoulder-relative so it moves with Arm_R)
# ---------------------------------------------------------------------------------------
def build_pitchfork():
    d = FORK_DIR
    bottom = WRIST_R - d * (HAND_R_FRAC * SHAFT_LEN)
    top = bottom + d * SHAFT_LEN

    bm_shaft = bmesh.new()
    tube(
        bm_shaft,
        [bottom, bottom + d * 0.35, bottom + d * 0.70, top],
        [(0.0185, 0.0185), (0.0200, 0.0200), (0.0195, 0.0195), (0.0185, 0.0185)],
        segments=10,
        cap_start=True,
        cap_end=True,
    )

    bm_head = bmesh.new()
    lat_hint = Y_AXIS
    fwd = d.cross(lat_hint).normalized()
    lateral = fwd.cross(d).normalized()

    # iron socket
    sock_top = top + d * 0.095
    tube(bm_head, [top - d * 0.02, top + d * 0.03, sock_top], [(0.024, 0.024), (0.020, 0.020), (0.015, 0.015)], segments=10, cap_start=True, cap_end=True)
    # yoke / crossbar with a slight upward bow
    yoke_c = top + d * 0.088
    yoke = []
    yoke_r = []
    for i in range(-3, 4):
        t = i / 3.0
        yoke.append(yoke_c + lateral * (0.078 * t) + d * (0.014 * (t * t)))
        yoke_r.append((0.0085, 0.0085))
    tube(bm_head, yoke, yoke_r, segments=6, up_hint=fwd, cap_start=True, cap_end=True)
    # three tines, outer ones flaring slightly outwards then back in
    for ty in (-0.078, 0.0, 0.078):
        base = yoke_c + lateral * ty + d * (0.014 * (ty / 0.078) ** 2)
        bow = 0.012 * (1 if ty > 0 else -1 if ty < 0 else 0)
        pts = [
            base,
            base + d * 0.080 + lateral * bow,
            base + d * 0.165 + lateral * (bow * 1.2),
            base + d * 0.245 + lateral * (bow * 0.6),
        ]
        tube(
            bm_head,
            pts,
            [(0.0095, 0.0095), (0.0085, 0.0085), (0.0060, 0.0060), (0.0012, 0.0012)],
            segments=6,
            up_hint=fwd,
            cap_start=True,
            cap_end=True,
        )
    return bm_shaft, bm_head


# ---------------------------------------------------------------------------------------
# Scene assembly
# ---------------------------------------------------------------------------------------
def assemble_peasant(create_mesh_object, make_material):
    """Create the full peasant hierarchy in the current Blender scene and return the rig dict."""
    mats = {
        "skin": make_material("PeasantSkin", (1.0, 1.0, 1.0, 1.0), metallic=0.0, roughness=0.78),
        "hair": make_material("PeasantHair", (1.0, 1.0, 1.0, 1.0), metallic=0.0, roughness=0.90),
        "linen": make_material("PeasantLinen", (0.62, 0.55, 0.40, 1.0), metallic=0.0, roughness=0.90),
        "team": make_material("TeamColor", (0.22, 0.42, 0.78, 1.0), metallic=0.02, roughness=0.78),
        "trousers": make_material("PeasantWool", (0.19, 0.13, 0.085, 1.0), metallic=0.0, roughness=0.92),
        "belt": make_material("PeasantRope", (0.30, 0.22, 0.12, 1.0), metallic=0.0, roughness=0.88),
        "boot": make_material("PeasantLeather", (0.065, 0.040, 0.025, 1.0), metallic=0.04, roughness=0.80),
        "wood": make_material("PitchforkWood", (0.46, 0.31, 0.16, 1.0), metallic=0.02, roughness=0.70),
        "iron": make_material("PitchforkIron", (0.25, 0.26, 0.28, 1.0), metallic=0.60, roughness=0.50),
    }

    torso = create_mesh_object("Torso", build_torso_bmesh(), mats["linen"], location=(0, 0, 0))
    create_mesh_object("Vest_Team", build_vest_bmesh(), mats["team"], parent=torso)
    create_mesh_object("Belt", build_belt_bmesh(), mats["belt"], parent=torso)
    create_mesh_object("Neck", build_neck_bmesh(), mats["skin"], parent=torso)

    # Head, hair and ears (head-local coordinates, pivot at the neck)
    head_bm = build_head_bmesh()
    hair_bm = build_hair_bmesh(head_bm)
    head = create_mesh_object("Head", head_bm, mats["skin"], parent=torso, location=(0, 0, HEAD_PIVOT_Z))
    create_mesh_object("Hair", hair_bm, mats["hair"], parent=head)
    create_mesh_object("Ear_L", build_ear_bmesh(+1), mats["skin"], parent=head)
    create_mesh_object("Ear_R", build_ear_bmesh(-1), mats["skin"], parent=head)

    arms = {}
    for name, side in (("Arm_L", +1.0), ("Arm_R", -1.0)):
        arm = create_mesh_object(name, build_sleeve_bmesh(side), mats["linen"], parent=torso, location=(0, side * SHOULDER_Y, SHOULDER_Z))
        create_mesh_object(name.replace("Arm", "Forearm"), build_forearm_bmesh(side), mats["skin"], parent=arm)
        create_mesh_object(name.replace("Arm", "Hand"), build_hand_bmesh(side), mats["skin"], parent=arm)
        arms[name] = arm

    legs = {}
    for name, side in (("Leg_L", +1.0), ("Leg_R", -1.0)):
        leg = create_mesh_object(name, build_leg_bmesh(), mats["trousers"], parent=torso, location=(0, side * HIP_Y, HIP_Z))
        create_mesh_object(name.replace("Leg", "Boot"), build_boot_bmesh(), mats["boot"], parent=leg)
        legs[name] = leg

    shaft_bm, head_bm2 = build_pitchfork()
    fork = create_mesh_object("Weapon", shaft_bm, mats["wood"], parent=arms["Arm_R"])
    create_mesh_object("Weapon_Head", head_bm2, mats["iron"], parent=fork)

    return {"torso": torso, "head": head, "arm_l": arms["Arm_L"], "arm_r": arms["Arm_R"], "leg_l": legs["Leg_L"], "leg_r": legs["Leg_R"], "weapon": fork}

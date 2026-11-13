"""
Higher-fidelity (circa 2008-2012 "Civilization 5 / Shogun 2" style) low-poly crossbowman for Hexes of Battle.

Instead of primitive spheres and cylinders, every anatomical body part and piece of gear is lofted:
  - Anatomical quilted brigandine doublet torso with studded plate rivets and flared peplum skirt
  - Player-colored team vest / doublet front (Vest_Team) dyed in player team color (blue for P1, red for P2)
  - Heavy military studded leather waist belt with bronze buckle and quarrel bolt quiver (Quarrel_Pouch)
  - Back-mounted convex medieval Pavise shield (Back_Pavise) with central spine, heraldic team color, and steel rim
  - Connecting neck and quilted stand-up gambeson collar connecting torso to head
  - Sculpted human head with focused facial landmarks and modeled ears
  - Steel kettle hat / chapel-de-fer (Helmet) with flared brim and medial crest over a padded arming cap (Helmet_Coif)
  - Brigandine sleeves with leather forearm bracers (Bracer_L, Bracer_R) and curved shoulder pads (Pauldron_L, Pauldron_R)
  - Modeled hands articulated to wield the heavy crossbow:
      - Left hand (Hand_L) supporting the hardwood tiller stock from underneath
      - Right hand (Hand_R) grasping the lock housing and trigger lever
  - Quilted chausses, reinforced leather/iron shin greaves (Greave_L, Greave_R), and cuffed boots
  - Heavy siege crossbow (Weapon):
      - Contoured hardwood tiller stock with bolt groove and butt cheekpiece
      - Heavy forged steel prod (Crossbow_Prod) tapering to recurved string notches
      - Iron cocking stirrup (Crossbow_Stirrup) at the front tip
      - Taut hemp/sinew bowstring (Crossbow_String)
      - Steel rolling nut lock mechanism and trigger lever
      - Heavy armor-piercing bodkin bolt / quarrel (Crossbow_Bolt) resting in the flight groove

Total budget is ~3.2k-3.8k triangles, optimal for 2008-2012 strategy game fidelity
while remaining ultra-fast for cross-platform and mobile rendering.

Blender axes: +X = forward, +Y = unit's left (Arm_L), +Z = up. The glTF exporter converts to Y-up.

Rig contract:
  Torso (root)  -> Head, Arm_L, Arm_R, Leg_L, Leg_R
  Torso         -> Vest_Team, Belt, Quarrel_Pouch, Back_Pavise, Neck, Collar
  Head          -> Helmet, Helmet_Coif, Ear_L, Ear_R
  Arm_L         -> Pauldron_L, Bracer_L, Hand_L
  Arm_R         -> Pauldron_R, Bracer_R, Hand_R, Weapon -> Crossbow_Prod, Crossbow_Stirrup, Crossbow_String, Crossbow_Bolt
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
SHOULDER_Y = 0.180
HIP_Y = 0.080
HEAD_PIVOT_Z = 0.88
HEAD_H = 0.185
HEAD_CHIN_Z = 0.02

X_AXIS = Vector((1.0, 0.0, 0.0))
Y_AXIS = Vector((0.0, 1.0, 0.0))
Z_AXIS = Vector((0.0, 0.0, 1.0))

# ---------------------------------------------------------------------------------------
# Crossbow grip geometry (in Arm_R local space):
# Arm_R pivot is at (0, -SHOULDER_Y, SHOULDER_Z) in Torso space.
# ---------------------------------------------------------------------------------------
# Weapon root is child of Arm_R.
# Stock runs along +X forward with a slight upward aim angle (~6 degrees).
XBOW_PITCH = math.radians(6.0)


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
_CROSSBOWMAN_SKULL_PROFILE = [
    # zf,   xf,    xb,    w,     p
    (0.00,  0.040, -0.024, 0.030, 2.1),   # chin tip
    (0.05,  0.048, -0.032, 0.040, 2.2),   # chin base
    (0.12,  0.054, -0.046, 0.050, 2.2),   # jaw angles
    (0.20,  0.059, -0.058, 0.056, 2.1),   # lower lip
    (0.25,  0.063, -0.064, 0.058, 2.1),   # mouth line
    (0.32,  0.062, -0.070, 0.061, 2.0),   # upper lip
    (0.37,  0.068, -0.074, 0.063, 2.0),   # nose tip
    (0.44,  0.059, -0.078, 0.065, 2.0),   # nasal bridge
    (0.50,  0.054, -0.081, 0.066, 2.1),   # eyes
    (0.58,  0.060, -0.083, 0.067, 2.2),   # brow ridge
    (0.66,  0.058, -0.084, 0.068, 2.3),   # forehead
    (0.74,  0.054, -0.083, 0.067, 2.3),   # upper forehead
    (0.82,  0.047, -0.078, 0.065, 2.2),   # cranium
    (0.90,  0.035, -0.066, 0.056, 2.1),   # parietal
    (0.96,  0.018, -0.044, 0.038, 2.0),   # vertex
]


def _profile_at(zf):
    pts = _CROSSBOWMAN_SKULL_PROFILE
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
    """Sculpted human head with focused marksman facial features, chin, nose, and brow."""
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
        # Focused marksman nose: bridge, tip, alae
        dx += 0.028 * gauss(ay, z, 0.0, zfz(0.370), 0.013, 0.0115)
        dx += 0.014 * gauss(ay, z, 0.0, zfz(0.460), 0.010, 0.0165)
        dx += 0.010 * gauss(ay, z, 0.016, zfz(0.350), 0.009, 0.0095)
        # Squinting marksman brow ridge
        dx += 0.012 * gauss(ay, z, 0.0, zfz(0.580), 0.046, 0.0095)
        # Deep eye sockets
        dx -= 0.011 * gauss(ay, z, 0.029, zfz(0.500), 0.015, 0.0095)
        # Pronounced cheekbones
        dx += 0.008 * gauss(ay, z, 0.046, zfz(0.410), 0.020, 0.0150)
        # Firm jaw and mouth
        dx += 0.006 * gauss(ay, z, 0.0, zfz(0.250), 0.022, 0.0085)
        dx += 0.005 * gauss(ay, z, 0.0, zfz(0.200), 0.020, 0.0085)
        dx -= 0.003 * gauss(ay, z, 0.025, zfz(0.225), 0.010, 0.0080)
        # Square chin
        dx += 0.012 * gauss(ay, z, 0.0, zfz(0.065), 0.020, 0.0120)
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


# ---------------------------------------------------------------------------------------
# Medieval Kettle Hat / Chapel-de-fer & Padded Coif (Helmet, Helmet_Coif)
# ---------------------------------------------------------------------------------------
def build_helmet_coif_bmesh():
    """Padded quilted arming cap / coif worn under the steel helmet, covering temples, ears, and neck."""
    bm = bmesh.new()
    coif_stations = [
        (0.010, -0.016, 0.052, 0.048, 2.2),  # under chin / neck wrap
        (0.045, -0.018, 0.062, 0.056, 2.2),  # jaw line
        (0.085, -0.019, 0.072, 0.066, 2.2),  # lower temples
        (0.125, -0.019, 0.078, 0.070, 2.2),  # mid head
        (0.165, -0.018, 0.075, 0.068, 2.2),  # upper skull
        (0.198, -0.015, 0.050, 0.045, 2.1),  # crown
    ]
    thetas = [2 * math.pi * k / 14 for k in range(14)]
    z_loft(bm, coif_stations, segments=14, cap_start=False, cap_end=True, thetas=thetas)
    bm.normal_update()
    return bm


def build_kettle_helmet_bmesh():
    """
    14th-15th century marksman Kettle Hat (Chapel-de-fer):
      - Hemispherical hammered steel dome hugging cranium with medial dorsal ridge
      - Wide flared conical brim providing overhead defense from siege projectiles
      - Riveted steel brow reinforcement band
      - Leather chinstrap
    """
    bm = bmesh.new()
    brow_z = HEAD_CHIN_Z + HEAD_H * 0.58  # sits right above the brows (~0.127m)

    # 1. Dome stations (z, cx, rb, ra, p)
    dome_stations = [
        (brow_z + 0.000, -0.005, 0.088, 0.082, 2.3),
        (brow_z + 0.025, -0.007, 0.087, 0.081, 2.3),
        (brow_z + 0.050, -0.009, 0.083, 0.077, 2.2),
        (brow_z + 0.075, -0.012, 0.074, 0.068, 2.1),
        (brow_z + 0.095, -0.015, 0.058, 0.052, 2.0),
        (brow_z + 0.110, -0.017, 0.036, 0.032, 2.0),
        (brow_z + 0.118, -0.019, 0.012, 0.012, 2.0),
    ]
    thetas = [2 * math.pi * k / 16 for k in range(16)]
    z_loft(bm, dome_stations, segments=16, cap_start=False, cap_end=True, thetas=thetas)

    # Raised dorsal comb/keel running front-to-back along top of dome
    comb_pts = [
        Vector((0.070, 0.0, brow_z + 0.040)),
        Vector((0.045, 0.0, brow_z + 0.082)),
        Vector((0.000, 0.0, brow_z + 0.115)),
        Vector((-0.045, 0.0, brow_z + 0.112)),
        Vector((-0.075, 0.0, brow_z + 0.070)),
    ]
    tube(bm, comb_pts, [(0.007, 0.007)] * 5, segments=5, up_hint=Y_AXIS, cap_start=True, cap_end=True)

    # 2. Wide flared conical brim protecting face, shoulders, and neck
    brim_stations = [
        (brow_z + 0.004, -0.005, 0.089, 0.083, 2.3),
        (brow_z - 0.012, -0.006, 0.125, 0.116, 2.2),
        (brow_z - 0.024, -0.007, 0.155, 0.142, 2.1),
    ]
    z_loft(bm, brim_stations, segments=16, cap_start=False, cap_end=True, thetas=thetas)

    # 3. Brow reinforcement band
    band_stations = [
        (brow_z - 0.006, -0.005, 0.091, 0.085, 2.3),
        (brow_z + 0.014, -0.005, 0.091, 0.085, 2.3),
    ]
    z_loft(bm, band_stations, segments=16, cap_start=False, cap_end=False, thetas=thetas)

    # 4. Leather chinstrap under the jaw
    chinstrap_pts = [
        Vector((-0.008,  0.072, brow_z - 0.010)),
        Vector((0.016,   0.048, HEAD_CHIN_Z + 0.018)),
        Vector((0.025,   0.000, HEAD_CHIN_Z + 0.008)),
        Vector((0.016,  -0.048, HEAD_CHIN_Z + 0.018)),
        Vector((-0.008, -0.072, brow_z - 0.010)),
    ]
    tube(bm, chinstrap_pts, [(0.006, 0.003)] * 5, segments=4, up_hint=X_AXIS, cap_start=False, cap_end=False)

    bm.normal_update()
    return bm


# ---------------------------------------------------------------------------------------
# Torso & Clothing (Torso at 0, 0, 0; waist ~0.42, shoulders ~0.77, neck ~0.82)
# ---------------------------------------------------------------------------------------
_CROSSBOWMAN_TORSO_STATIONS = [
    # z,       cx,      rb,     ra,     p
    (0.360,   0.006,   0.150,  0.162,  2.1),   # flared brigandine skirt hem
    (0.400,   0.005,   0.142,  0.152,  2.1),   # lower skirt
    (0.440,   0.003,   0.134,  0.144,  2.1),   # hips / upper skirt
    (0.485,   0.002,   0.124,  0.136,  2.2),   # waist / belt line
    (0.540,   0.004,   0.132,  0.148,  2.2),   # lower ribcage
    (0.610,   0.006,   0.144,  0.162,  2.2),   # mid chest
    (0.680,   0.007,   0.150,  0.174,  2.1),   # pectorals / brigandine chest plate
    (0.745,   0.005,   0.142,  0.176,  2.1),   # upper chest & shoulder base
    (0.795,   0.002,   0.114,  0.144,  2.2),   # shoulder slope
    (0.825,  -0.002,   0.080,  0.082,  2.3),   # neck base
]


def _interp_station(z, st=_CROSSBOWMAN_TORSO_STATIONS):
    for i in range(len(st) - 1):
        if st[i][0] <= z <= st[i + 1][0]:
            t = (z - st[i][0]) / (st[i + 1][0] - st[i][0])
            return tuple(st[i][j] + (st[i + 1][j] - st[i][j]) * t for j in range(1, 5))
    return st[-1][1:]


def build_torso_bmesh():
    """Heavy padded brigandine torso doublet with riveted steel plates."""
    bm = bmesh.new()
    z_loft(bm, _CROSSBOWMAN_TORSO_STATIONS, segments=18, cap_start=True, cap_end=True)
    return bm


def build_vest_bmesh():
    """
    Player-colored brigandine tunic front / surcoat (Vest_Team).
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
    """Heavy military studded leather waist belt with bronze buckle."""
    bm = bmesh.new()
    cx, rb, ra, p = _interp_station(0.485)
    r_b, r_a = rb + 0.014, ra + 0.014
    z_loft(bm, [(0.466, cx, r_b, r_a, p), (0.504, cx, r_b, r_a, p)], segments=18, cap_start=False, cap_end=False)

    # Heavy bronze buckle in front
    buckle = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, verts=buckle["verts"], vec=(0.015, 0.042, 0.050))
    bmesh.ops.translate(bm, verts=buckle["verts"], vec=(cx + r_b + 0.008, 0.0, 0.485))

    bm.normal_update()
    return bm


def build_quarrel_pouch_bmesh():
    """
    Bolt quiver / quarrel pouch at right hip.
    Reinforced stiff leather case holding sharp crossbow bolts with fletchings protruding.
    """
    bm = bmesh.new()
    pouch_c = Vector((0.020, -0.165, 0.460))

    # Tapered leather bolt case
    case_pts = [
        pouch_c + Vector((-0.010, 0.0, -0.160)),
        pouch_c + Vector((0.000, 0.0, 0.000)),
        pouch_c + Vector((0.008, 0.0, 0.110)),
    ]
    radii = [
        (0.026, 0.024),
        (0.034, 0.030),
        (0.038, 0.034),
    ]
    tube(bm, case_pts, radii, segments=8, up_hint=X_AXIS, cap_start=True, cap_end=False)

    # 3 Fletched bolts protruding from the open top
    for i, (dx, dy) in enumerate([(-0.012, -0.008), (0.008, 0.010), (0.014, -0.010)]):
        base = pouch_c + Vector((dx, dy, 0.080))
        tip = base + Vector((dx * 0.4, dy * 0.4, 0.120))
        bolt = [base, tip]
        tube(bm, bolt, [(0.005, 0.005), (0.005, 0.005)], segments=4, up_hint=Y_AXIS, cap_start=False, cap_end=True)
        # Vanes
        vane = bmesh.ops.create_cube(bm, size=1.0)
        bmesh.ops.scale(bm, verts=vane["verts"], vec=(0.002, 0.018, 0.032))
        bmesh.ops.translate(bm, verts=vane["verts"], vec=(tip.x, tip.y, tip.z - 0.015))

    bm.normal_update()
    return bm


# ---------------------------------------------------------------------------------------
# Back Pavise Shield (Back_Pavise)
# ---------------------------------------------------------------------------------------
def build_back_pavise_bmesh():
    """
    Iconic medieval Pavise wall shield strapped to the crossbowman's back:
      - Large convex rectangular shield (~0.52m tall, ~0.32m wide)
      - Prominent raised central vertical spine / gutter ridge
      - Double-sided geometry with front face painted in heraldic TeamColor
      - Protective iron rim and diagonal leather carrying straps across shoulders
    """
    bm = bmesh.new()

    # Shield vertical stations (from lower back to above shoulders)
    zs = [0.380, 0.440, 0.520, 0.620, 0.720, 0.820, 0.880]
    # Pavise profile: convex gutter with prominent central ridge
    # Station widths and depths
    pavise_verts_front = []
    pavise_verts_back = []
    thickness = 0.016

    for z in zs:
        # Width widens slightly at top
        frac = (z - 0.380) / 0.500
        w = 0.140 + frac * 0.025
        # 7 points across width: left_edge, left_mid, left_crease, center_spine, right_crease, right_mid, right_edge
        row_f = []
        row_b = []
        for sy, depth, spine_extra in [
            (-1.0, 0.000, 0.000),
            (-0.6, 0.012, 0.000),
            (-0.25, 0.022, 0.004),
            (0.0, 0.028, 0.022),   # prominent medial gutter ridge
            (0.25, 0.022, 0.004),
            (0.6, 0.012, 0.000),
            (1.0, 0.000, 0.000),
        ]:
            y = sy * w
            # Back position: behind torso (X < 0)
            # Torso back is at x ~ -0.14
            x_base = -0.155 - depth - spine_extra
            # Front of shield faces backward (-X in world space)
            row_f.append(bm.verts.new(Vector((x_base, y, z))))
            row_b.append(bm.verts.new(Vector((x_base + thickness, y, z))))
        pavise_verts_front.append(row_f)
        pavise_verts_back.append(row_b)

    # Skin front and back grids with quads
    num_rows = len(zs)
    num_cols = 7
    for r in range(num_rows - 1):
        for c in range(num_cols - 1):
            # Front face (normals facing backward: -X)
            bm.faces.new((
                pavise_verts_front[r][c],
                pavise_verts_front[r][c + 1],
                pavise_verts_front[r + 1][c + 1],
                pavise_verts_front[r + 1][c],
            ))
            # Back face (normals facing forward: +X)
            bm.faces.new((
                pavise_verts_back[r][c],
                pavise_verts_back[r + 1][c],
                pavise_verts_back[r + 1][c + 1],
                pavise_verts_back[r][c + 1],
            ))

    # Side rim edges (left, right, bottom, top)
    for r in range(num_rows - 1):
        # Left edge (c = 0)
        bm.faces.new((
            pavise_verts_front[r][0],
            pavise_verts_front[r + 1][0],
            pavise_verts_back[r + 1][0],
            pavise_verts_back[r][0],
        ))
        # Right edge (c = num_cols - 1)
        bm.faces.new((
            pavise_verts_front[r][num_cols - 1],
            pavise_verts_back[r][num_cols - 1],
            pavise_verts_back[r + 1][num_cols - 1],
            pavise_verts_front[r + 1][num_cols - 1],
        ))

    # Bottom edge (r = 0)
    for c in range(num_cols - 1):
        bm.faces.new((
            pavise_verts_front[0][c],
            pavise_verts_back[0][c],
            pavise_verts_back[0][c + 1],
            pavise_verts_front[0][c + 1],
        ))
    # Top edge (r = num_rows - 1)
    for c in range(num_cols - 1):
        bm.faces.new((
            pavise_verts_front[num_rows - 1][c],
            pavise_verts_front[num_rows - 1][c + 1],
            pavise_verts_back[num_rows - 1][c + 1],
            pavise_verts_back[num_rows - 1][c],
        ))

    # Diagonal carrying straps securing the pavise over the shoulders
    strap_l = [
        Vector((-0.138, 0.080, 0.760)),
        Vector((-0.080, 0.090, 0.770)),
        Vector((0.040,  0.075, 0.750)),
        Vector((0.085,  0.020, 0.620)),
    ]
    tube(bm, strap_l, [(0.014, 0.005)] * 4, segments=4, up_hint=Y_AXIS, cap_start=False, cap_end=False)

    strap_r = [
        Vector((-0.138, -0.080, 0.760)),
        Vector((-0.080, -0.090, 0.770)),
        Vector((0.040,  -0.075, 0.750)),
        Vector((0.085,  -0.020, 0.620)),
    ]
    tube(bm, strap_r, [(0.014, 0.005)] * 4, segments=4, up_hint=Y_AXIS, cap_start=False, cap_end=False)

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
        (0.048, 0.050),
        (0.044, 0.046),
        (0.042, 0.044),
    ]
    tube(bm, path, radii, segments=12, up_hint=Y_AXIS, cap_start=False, cap_end=True)
    return bm


def build_collar_bmesh():
    """Quilted gambeson stand-up collar wrapping the base of the neck."""
    bm = bmesh.new()
    path = [
        Vector((-0.002, 0.0, 0.805)),
        Vector((-0.004, 0.0, 0.835)),
    ]
    radii = [
        (0.056, 0.058),
        (0.052, 0.054),
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
        Vector((0.010, side * 0.008, -0.070)),   # deltoid bulge
        Vector((0.016, side * 0.010, -0.150)),   # mid bicep
        Vector((0.020, side * 0.008, -0.225)),   # elbow
    ]
    radii = [
        (0.060, 0.058),
        (0.057, 0.055),
        (0.051, 0.049),
        (0.045, 0.044),
        (0.042, 0.041),
    ]
    tube(bm, path, radii, segments=12, cap_start=True, cap_end=True)
    return bm


def build_pauldron_bmesh(side):
    """
    Curved steel-reinforced brigandine shoulder pad (Pauldron_L / Pauldron_R).
    Fits smoothly over the shoulder joint and bridges cleanly into the torso.
    """
    bm = bmesh.new()
    ret = bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=8, radius=1.0)
    bmesh.ops.scale(bm, verts=ret["verts"], vec=(0.068, 0.074, 0.050))
    bmesh.ops.translate(bm, verts=ret["verts"], vec=(0.002, -side * 0.018, 0.024))

    # Leather retention strap under deltoid
    strap = bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=True, segments=10, radius1=0.054, radius2=0.054, depth=0.016)
    bmesh.ops.scale(bm, verts=strap["verts"], vec=(1.0, 0.85, 1.0))
    bmesh.ops.translate(bm, verts=strap["verts"], vec=(0.006, -side * 0.010, -0.018))

    bm.normal_update()
    return bm


def build_bracer_bmesh(side):
    """Forearm leather wraps and vambraces."""
    bm = bmesh.new()
    forearm_pts = [
        Vector((0.020, side * 0.008, -0.215)),
        Vector((0.028, side * 0.006, -0.260)),
        Vector((0.034, side * 0.004, -0.300)),
    ]
    radii = [
        (0.043, 0.042),
        (0.039, 0.038),
        (0.035, 0.034),
    ]
    tube(bm, forearm_pts, radii, segments=10, cap_start=False, cap_end=False)
    return bm


WRIST = Vector((0.054, 0.0, -0.292))
HAND_DIR = Vector((0.27, 0.0, -0.96)).normalized()


def build_hand_bmesh(side, is_trigger_hand=False):
    """
    Modeled human hand in arm-local coordinates:
      - Left hand (is_trigger_hand=False): Palms upward to support the crossbow stock.
      - Right hand (is_trigger_hand=True): Grasps trigger housing with index finger poised.
    """
    bm = bmesh.new()
    pts, radii = [], []
    for s, ra, rb in [
        (-0.006, 0.026, 0.019),
        (0.018, 0.032, 0.021),
        (0.042, 0.033, 0.020),
        (0.066, 0.030, 0.018),
        (0.086, 0.021, 0.013),
    ]:
        c = WRIST + HAND_DIR * s + X_AXIS * (0.52 * max(0.0, s - 0.03) ** 2 * 6.0)
        pts.append(c)
        radii.append((ra, rb))
    tube(bm, pts, radii, segments=8, cap_start=False, cap_end=True)

    inner = -side
    thumb = [
        WRIST + HAND_DIR * 0.012 + Y_AXIS * (inner * 0.025),
        WRIST + HAND_DIR * 0.038 + Y_AXIS * (inner * 0.032) + X_AXIS * 0.013,
        WRIST + HAND_DIR * 0.060 + Y_AXIS * (inner * 0.029) + X_AXIS * 0.025,
    ]
    tube(bm, thumb, [(0.010, 0.010), (0.009, 0.009), (0.007, 0.007)], segments=6, cap_start=True, cap_end=True)
    return bm


# ---------------------------------------------------------------------------------------
# Heavy Crossbow Weapon (Weapon - child of Arm_R)
# ---------------------------------------------------------------------------------------
def build_crossbow_stock_bmesh():
    """
    Hardwood tiller stock (child of Arm_R):
      - Extends forward along +X with shaped butt stock, cheek rest, and trigger grip
      - Central flight groove along top surface
      - Steel reinforcing side brackets and trigger guard
    """
    bm = bmesh.new()

    # Stock stations from shoulder butt to front prod socket
    # Crossbow stock path in Arm_R local space
    # Grip is centered near Arm_R wrist (~0.05, 0.0, -0.28)
    # Stock runs from x = -0.08 to x = +0.50
    stock_pts = [
        Vector((-0.080, 0.000, -0.280)),  # butt pad
        Vector((-0.020, 0.000, -0.275)),  # cheekpiece
        Vector((0.060,  0.000, -0.265)),  # lock / nut housing
        Vector((0.180,  0.000, -0.250)),  # fore-end (supported by left hand)
        Vector((0.340,  0.000, -0.235)),  # mid shaft
        Vector((0.480,  0.000, -0.220)),  # prod socket / front
    ]
    radii = [
        (0.020, 0.038),  # tall narrow butt
        (0.024, 0.035),
        (0.028, 0.032),  # lock housing
        (0.024, 0.028),
        (0.022, 0.026),
        (0.026, 0.030),  # reinforced head
    ]
    tube(bm, stock_pts, radii, segments=8, up_hint=Z_AXIS, cap_start=True, cap_end=True)

    # Steel lock nut mechanism plate
    lock = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, verts=lock["verts"], vec=(0.045, 0.052, 0.020))
    bmesh.ops.translate(bm, verts=lock["verts"], vec=(0.065, 0.0, -0.245))

    # Curved steel trigger lever underneath
    trigger_pts = [
        Vector((0.070, 0.0, -0.285)),
        Vector((0.055, 0.0, -0.320)),
        Vector((0.040, 0.0, -0.340)),
    ]
    tube(bm, trigger_pts, [(0.004, 0.006)] * 3, segments=4, up_hint=Y_AXIS, cap_start=False, cap_end=True)

    bm.normal_update()
    return bm


def build_crossbow_prod_bmesh():
    """
    Heavy laminated forged steel prod (bow limb):
      - Mounted transversely across front of stock (along Y axis from y = -0.24 to +0.24)
      - Thick central socket tapering gracefully to recurved ends with string notches
    """
    bm = bmesh.new()
    prod_center = Vector((0.480, 0.0, -0.220))

    # Loft the prod across Y: from left tip (+Y) to right tip (-Y)
    y_pts = [0.240, 0.200, 0.150, 0.090, 0.000, -0.090, -0.150, -0.200, -0.240]
    path = []
    radii = []
    for y in y_pts:
        # Slight backward sweep towards tips
        curve = 0.022 * (abs(y) / 0.240) ** 2
        path.append(prod_center + Vector((-curve, y, 0.0)))
        # Thickness tapers from center (0.020, 0.016) to tips (0.008, 0.008)
        t_frac = 1.0 - 0.55 * (abs(y) / 0.240)
        radii.append((0.016 * t_frac, 0.020 * t_frac))

    tube(bm, path, radii, segments=8, up_hint=Z_AXIS, cap_start=True, cap_end=True)

    # Steel mounting bridle bands securing prod to stock
    bridle = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, verts=bridle["verts"], vec=(0.038, 0.056, 0.050))
    bmesh.ops.translate(bm, verts=bridle["verts"], vec=prod_center)

    bm.normal_update()
    return bm


def build_crossbow_stirrup_bmesh():
    """D-shaped iron foot stirrup mounted to the very front of the stock for spanning."""
    bm = bmesh.new()
    front_tip = Vector((0.490, 0.0, -0.220))

    stirrup_pts = [
        front_tip + Vector((0.000, 0.036, -0.005)),
        front_tip + Vector((0.045, 0.045, -0.008)),
        front_tip + Vector((0.085, 0.032, -0.010)),
        front_tip + Vector((0.095, 0.000, -0.010)),
        front_tip + Vector((0.085, -0.032, -0.010)),
        front_tip + Vector((0.045, -0.045, -0.008)),
        front_tip + Vector((0.000, -0.036, -0.005)),
    ]
    tube(bm, stirrup_pts, [(0.006, 0.006)] * len(stirrup_pts), segments=5, up_hint=Z_AXIS, cap_start=False, cap_end=False)
    bm.normal_update()
    return bm


def build_crossbow_string_bmesh():
    """Taut twisted hemp bowstring spanning from left prod notch to right prod notch through the lock nut."""
    bm = bmesh.new()
    prod_center = Vector((0.480, 0.0, -0.220))
    nut_pos = Vector((0.065, 0.0, -0.245))

    left_notch = prod_center + Vector((-0.022, 0.235, 0.0))
    right_notch = prod_center + Vector((-0.022, -0.235, 0.0))

    string_pts = [
        left_notch,
        left_notch * 0.5 + nut_pos * 0.5,
        nut_pos,
        right_notch * 0.5 + nut_pos * 0.5,
        right_notch,
    ]
    tube(bm, string_pts, [(0.004, 0.004)] * 5, segments=4, up_hint=Z_AXIS, cap_start=True, cap_end=True)
    bm.normal_update()
    return bm


def build_crossbow_bolt_bmesh():
    """Heavy armor-piercing bodkin bolt / quarrel resting in the flight track ready to fire."""
    bm = bmesh.new()
    bolt_start = Vector((0.075, 0.0, -0.245))
    bolt_end = Vector((0.485, 0.0, -0.218))

    # Ash shaft
    shaft_pts = [bolt_start, bolt_end]
    tube(bm, shaft_pts, [(0.006, 0.006), (0.006, 0.006)], segments=5, up_hint=Z_AXIS, cap_start=True, cap_end=False)

    # 4-sided forged steel bodkin tip
    tip_pts = [bolt_end, bolt_end + Vector((0.045, 0.0, 0.004))]
    tube(bm, tip_pts, [(0.008, 0.008), (0.001, 0.001)], segments=4, p=1.2, up_hint=Z_AXIS, cap_start=False, cap_end=True)

    # Vanes / fletchings at rear
    for rot in [0, 90]:
        vane = bmesh.ops.create_cube(bm, size=1.0)
        bmesh.ops.scale(bm, verts=vane["verts"], vec=(0.040, 0.002, 0.016))
        if rot == 90:
            bmesh.ops.rotate(bm, verts=vane["verts"], cent=(0, 0, 0), matrix=Euler((math.radians(90), 0, 0)).to_matrix())
        bmesh.ops.translate(bm, verts=vane["verts"], vec=(bolt_start.x + 0.035, bolt_start.y, bolt_start.z + 0.008))

    bm.normal_update()
    return bm


# ---------------------------------------------------------------------------------------
# Legs & Boots
# ---------------------------------------------------------------------------------------
def build_leg_bmesh():
    """Quilted chausses/hose in hip-relative coordinates."""
    bm = bmesh.new()
    path = [
        Vector((0, 0, 0.060)),
        Vector((0, 0, 0.000)),
        Vector((0.004, 0, -0.100)),
        Vector((0.014, 0, -0.210)),
        Vector((0.008, 0, -0.280)),  # knee
        Vector((0.0, 0, -0.370)),    # calf
        Vector((-0.002, 0, -0.400)), # ankle
    ]
    radii = [
        (0.058, 0.056),
        (0.061, 0.059),
        (0.057, 0.055),
        (0.048, 0.047),
        (0.049, 0.046),
        (0.039, 0.037),
        (0.036, 0.034),
    ]
    tube(bm, path, radii, segments=12, up_hint=Y_AXIS, cap_start=True, cap_end=False)
    return bm


def build_greave_bmesh(side):
    """Anatomical steel / hardened leather shin greaves protecting front of the lower leg."""
    bm = bmesh.new()
    path = [
        Vector((0.006, 0, -0.260)),
        Vector((0.008, 0, -0.320)),
        Vector((0.004, 0, -0.375)),
    ]
    radii = [
        (0.053, 0.050),
        (0.047, 0.044),
        (0.041, 0.038),
    ]
    tube(bm, path, radii, segments=10, up_hint=Y_AXIS, cap_start=False, cap_end=False)
    return bm


def build_boot_bmesh():
    """Turned leather marching boots with folded cuff and sturdy sole."""
    bm = bmesh.new()
    # Folded top cuff
    cuff = [Vector((0.0, 0, -0.370)), Vector((0.0, 0, -0.410))]
    tube(bm, cuff, [(0.046, 0.044), (0.042, 0.040)], segments=10, cap_start=False, cap_end=False)

    # Foot vamp and sole
    foot = [
        Vector((-0.040, 0.0, -0.415)),  # heel
        Vector((0.005,  0.0, -0.415)),  # midfoot
        Vector((0.050,  0.0, -0.415)),  # ball
        Vector((0.082,  0.0, -0.415)),  # toe tip
    ]
    radii = [
        (0.034, 0.024),
        (0.032, 0.026),
        (0.038, 0.024),
        (0.026, 0.015),
    ]
    tube(bm, foot, radii, segments=8, up_hint=Z_AXIS, cap_start=True, cap_end=True)
    bm.normal_update()
    return bm


# ---------------------------------------------------------------------------------------
# Scene assembly
# ---------------------------------------------------------------------------------------
def assemble_crossbowman(create_mesh_object, make_material):
    """Create the full crossbowman hierarchy in the current Blender scene and return the rig dict."""
    mats = {
        "armor": make_material("CrossbowmanArmor", (0.24, 0.18, 0.14, 1.0), metallic=0.15, roughness=0.76),
        "team": make_material("TeamColor", (0.22, 0.42, 0.78, 1.0), metallic=0.08, roughness=0.70),
        "iron": make_material("ForgedIron", (0.48, 0.51, 0.55, 1.0), metallic=0.82, roughness=0.38),
        "steel": make_material("PolishedSteel", (0.72, 0.75, 0.80, 1.0), metallic=0.88, roughness=0.28),
        "leather": make_material("Leather", (0.34, 0.21, 0.11, 1.0), metallic=0.05, roughness=0.75),
        "dark_leather": make_material("DarkLeather", (0.18, 0.12, 0.08, 1.0), metallic=0.05, roughness=0.80),
        "skin": make_material("Skin", (0.87, 0.70, 0.56, 1.0), metallic=0.0, roughness=0.75),
        "wood": make_material("AshWood", (0.46, 0.31, 0.16, 1.0), metallic=0.02, roughness=0.82),
        "string": make_material("LinenString", (0.82, 0.80, 0.72, 1.0), metallic=0.0, roughness=0.90),
    }

    # 1. Torso (root object at 0, 0, 0)
    torso = create_mesh_object("Torso", build_torso_bmesh(), mats["armor"], location=(0, 0, 0))
    create_mesh_object("Vest_Team", build_vest_bmesh(), mats["team"], parent=torso)
    create_mesh_object("Belt", build_belt_bmesh(), mats["leather"], parent=torso)
    create_mesh_object("Quarrel_Pouch", build_quarrel_pouch_bmesh(), mats["dark_leather"], parent=torso)
    create_mesh_object("Back_Pavise", build_back_pavise_bmesh(), mats["team"], parent=torso)
    create_mesh_object("Neck", build_neck_bmesh(), mats["skin"], parent=torso)
    create_mesh_object("Collar", build_collar_bmesh(), mats["armor"], parent=torso)

    # 2. Head (pivot at z = 0.88)
    head = create_mesh_object("Head", build_head_bmesh(), mats["skin"], parent=torso, location=(0, 0, HEAD_PIVOT_Z))
    create_mesh_object("Helmet_Coif", build_helmet_coif_bmesh(), mats["armor"], parent=head)
    create_mesh_object("Helmet", build_kettle_helmet_bmesh(), mats["iron"], parent=head)
    create_mesh_object("Ear_L", build_ear_bmesh(1.0), mats["skin"], parent=head)
    create_mesh_object("Ear_R", build_ear_bmesh(-1.0), mats["skin"], parent=head)

    # 3. Left Arm (pivot at y = +0.180, z = 0.77)
    arm_l = create_mesh_object("Arm_L", build_arm_bmesh(1.0), mats["armor"], parent=torso, location=(0, SHOULDER_Y, SHOULDER_Z))
    create_mesh_object("Pauldron_L", build_pauldron_bmesh(1.0), mats["leather"], parent=arm_l)
    create_mesh_object("Bracer_L", build_bracer_bmesh(1.0), mats["leather"], parent=arm_l)
    create_mesh_object("Hand_L", build_hand_bmesh(1.0, is_trigger_hand=False), mats["skin"], parent=arm_l)

    # 4. Right Arm (pivot at y = -0.180, z = 0.77)
    arm_r = create_mesh_object("Arm_R", build_arm_bmesh(-1.0), mats["armor"], parent=torso, location=(0, -SHOULDER_Y, SHOULDER_Z))
    create_mesh_object("Pauldron_R", build_pauldron_bmesh(-1.0), mats["leather"], parent=arm_r)
    create_mesh_object("Bracer_R", build_bracer_bmesh(-1.0), mats["leather"], parent=arm_r)
    create_mesh_object("Hand_R", build_hand_bmesh(-1.0, is_trigger_hand=True), mats["skin"], parent=arm_r)

    # Heavy Crossbow Weapon (child of Arm_R)
    weapon = create_mesh_object("Weapon", build_crossbow_stock_bmesh(), mats["wood"], parent=arm_r)
    create_mesh_object("Crossbow_Prod", build_crossbow_prod_bmesh(), mats["steel"], parent=weapon)
    create_mesh_object("Crossbow_Stirrup", build_crossbow_stirrup_bmesh(), mats["iron"], parent=weapon)
    create_mesh_object("Crossbow_String", build_crossbow_string_bmesh(), mats["string"], parent=weapon)
    create_mesh_object("Crossbow_Bolt", build_crossbow_bolt_bmesh(), mats["steel"], parent=weapon)

    # 5. Left Leg (pivot at y = +0.080, z = 0.40)
    leg_l = create_mesh_object("Leg_L", build_leg_bmesh(), mats["armor"], parent=torso, location=(0, HIP_Y, HIP_Z))
    create_mesh_object("Greave_L", build_greave_bmesh(1.0), mats["leather"], parent=leg_l)
    create_mesh_object("Boot_L", build_boot_bmesh(), mats["dark_leather"], parent=leg_l)

    # 6. Right Leg (pivot at y = -0.080, z = 0.40)
    leg_r = create_mesh_object("Leg_R", build_leg_bmesh(), mats["armor"], parent=torso, location=(0, -HIP_Y, HIP_Z))
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
    }

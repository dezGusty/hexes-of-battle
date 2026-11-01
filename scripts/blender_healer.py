"""
Higher-fidelity (circa 2008-2012 "Civilization 5 / Shogun 2" style) low-poly healer for Hexes of Battle.

Instead of primitive spheres and cylinders, every anatomical body part and piece of gear is lofted:
  - Slender anatomical clerical robe / tunic torso with natural draping and skirt hem in an off-white / warm beige cloth theme
    (slender torso proportions matching peasants and macemen: ~0.078m fore-aft x 0.098m lateral waist cinch)
  - Seamless anatomical neck (Neck) extending continuously from deep inside the chest (z=0.780) up through the collar
    and deep into the skull base / throat (z=0.915), solidly eliminating any floating head gaps
  - Soft clerical cowl collar (Collar) wrapping around the neckline
  - Player-colored clerical stole / scapular (Vest_Team) dyed in player team color (blue for P1, red for P2)
  - Player-colored headband (Headband) encircling the brow with central medical medallion
  - Player-colored arm-bands (Armband_Team_L, Armband_Team_R) wrapped around the upper sleeves
  - Stitched leather waist belt (Belt) with burnished bronze buckle
  - Remedies satchel (Satchel) slung diagonally across torso with shoulder baldric strap, top flap, buckle, and herbal remedy vial
  - Sculpted human head with calm, focused facial landmarks, brow, straight nose bridge, lips, chin, and modeled ears
  - Neatly trimmed hair (Hair) framing temples and nape
  - Tunic sleeves with light shoulder mantles (Pauldron_L, Pauldron_R) and wrist wraps (Bracer_L, Bracer_R)
  - Modeled hands articulated for field medicine:
      - Left hand (Hand_L) holding the inner grip of a light wooden buckler shield (Shield) with iron rim and central boss
      - Right hand (Hand_R) firmly gripping the cylindrical hilt of the surgical remedy knife (Weapon)
  - Remedy Knife / Dagger (Weapon):
      - Cylindrical wrapped grip passing directly through the right hand's curled fingers
      - Burnished brass bolster & oval guard (Knife_Guard) resting against the fist
      - Forged surgical steel blade with beveled cutting edge, flat spine, and needle-sharp point
      - Burnished brass pommel cap
  - Fitted beige linen hose (Leg_L, Leg_R) and soft leather turnshoes (Boot_L, Boot_R)

Total budget is ~3.0k-3.6k triangles, optimal for 2008-2012 strategy game fidelity
while remaining ultra-fast for cross-platform and mobile rendering.

Blender axes: +X = forward, +Y = unit's left (Arm_L), +Z = up. The glTF exporter converts to Y-up.

Rig contract:
  Torso (root)  -> Head, Arm_L, Arm_R, Leg_L, Leg_R
  Torso         -> Vest_Team, Belt, Satchel, Neck, Collar
  Head          -> Headband, Ear_L, Ear_R, Hair
  Arm_L         -> Pauldron_L, Armband_Team_L, Bracer_L, Hand_L, Shield -> Shield_Boss, Shield_Rim
  Arm_R         -> Pauldron_R, Armband_Team_R, Bracer_R, Hand_R, Weapon -> Knife_Guard
  Leg_L         -> Boot_L
  Leg_R         -> Boot_R
"""

import math
import random
import bmesh
from mathutils import Euler, Vector

# ---------------------------------------------------------------------------------------
# Proportions (metres; overall height ~1.08m, slender build matching peasant and maceman)
# ---------------------------------------------------------------------------------------
HIP_Z = 0.420
SHOULDER_Z = 0.775
SHOULDER_Y = 0.130
HIP_Y = 0.055
HEAD_PIVOT_Z = 0.860
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
    """One cross-section: `a` is lateral axis (radius ra), `b` is fore-aft axis (radius rb)."""
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
        rings.append(make_ring(bm, Vector((cx, 0.0, z)), Y_AXIS, X_AXIS, ra, rb, thetas, p=p))
    return bridge_rings(bm, rings, closed_bottom=cap_start, closed_top=cap_end)


def gauss(x, y, x0, y0, sx, sy):
    return math.exp(-0.5 * (((x - x0) / sx) ** 2 + ((y - y0) / sy) ** 2))


# ---------------------------------------------------------------------------------------
# Head & Face (Z-up in Head space, chin ~0.02, crown ~0.205)
# ---------------------------------------------------------------------------------------
_HEALER_SKULL_PROFILE = [
    # zf,   xf,    xb,    w,     p
    (0.00,  0.036, -0.022, 0.026, 2.1),   # chin tip
    (0.05,  0.044, -0.030, 0.036, 2.2),   # chin base
    (0.12,  0.050, -0.044, 0.046, 2.2),   # jaw angles
    (0.20,  0.055, -0.056, 0.052, 2.1),   # lower lip
    (0.25,  0.059, -0.062, 0.054, 2.1),   # mouth line
    (0.32,  0.058, -0.068, 0.057, 2.0),   # upper lip / subnasale
    (0.37,  0.064, -0.072, 0.059, 2.0),   # nose tip
    (0.44,  0.056, -0.076, 0.062, 2.0),   # nasal bridge
    (0.50,  0.051, -0.079, 0.063, 2.1),   # eyes / sellion
    (0.58,  0.056, -0.081, 0.064, 2.2),   # brow ridge
    (0.66,  0.054, -0.082, 0.065, 2.3),   # forehead / headband lower
    (0.74,  0.051, -0.081, 0.065, 2.3),   # headband upper
    (0.82,  0.045, -0.076, 0.063, 2.2),   # cranium
    (0.90,  0.033, -0.064, 0.054, 2.1),   # parietal
    (0.96,  0.018, -0.042, 0.038, 2.0),   # vertex
]


def _profile_at(zf):
    pts = _HEALER_SKULL_PROFILE
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
    """Sculpted human head with calm, focused facial features, refined nose, cheekbones, and chin."""
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
        # Refined straight physician nose: bridge, tip, alae
        dx += 0.024 * gauss(ay, z, 0.0, zfz(0.370), 0.012, 0.0110)
        dx += 0.012 * gauss(ay, z, 0.0, zfz(0.460), 0.009, 0.0150)
        dx += 0.008 * gauss(ay, z, 0.015, zfz(0.350), 0.008, 0.0090)
        # Calm, focused brow ridge
        dx += 0.009 * gauss(ay, z, 0.0, zfz(0.580), 0.044, 0.0090)
        # Soft eye sockets
        dx -= 0.009 * gauss(ay, z, 0.028, zfz(0.500), 0.014, 0.0090)
        # Defined cheekbones
        dx += 0.007 * gauss(ay, z, 0.044, zfz(0.410), 0.018, 0.0140)
        # Calm, composed lips
        dx += 0.005 * gauss(ay, z, 0.0, zfz(0.250), 0.020, 0.0080)
        dx += 0.004 * gauss(ay, z, 0.0, zfz(0.200), 0.018, 0.0080)
        v.co.x += dx

    bm.normal_update()
    return bm


def build_ear_bmesh(side):
    """Anatomical human ear located at side of head."""
    bm = bmesh.new()
    y_sign = 1.0 if side > 0 else -1.0
    ear_pts = [
        Vector((-0.015, y_sign * 0.062, HEAD_CHIN_Z + HEAD_H * 0.38)),
        Vector((-0.014, y_sign * 0.065, HEAD_CHIN_Z + HEAD_H * 0.46)),
        Vector((-0.018, y_sign * 0.066, HEAD_CHIN_Z + HEAD_H * 0.54)),
        Vector((-0.025, y_sign * 0.064, HEAD_CHIN_Z + HEAD_H * 0.60)),
    ]
    radii = [(0.007, 0.005), (0.009, 0.006), (0.009, 0.006), (0.006, 0.004)]
    tube(bm, ear_pts, radii, segments=8, up_hint=Z_AXIS, cap_start=True, cap_end=True)
    return bm


def build_hair_bmesh():
    """Neat, calm hair framing the temples and back of the head beneath the headband."""
    bm = bmesh.new()
    crown_z = HEAD_CHIN_Z + HEAD_H * 0.72
    stations = [
        (crown_z + 0.000, -0.014, 0.081, 0.067, 2.3),
        (crown_z + 0.022, -0.016, 0.077, 0.064, 2.2),
        (crown_z + 0.040, -0.018, 0.063, 0.053, 2.1),
        (crown_z + 0.054, -0.020, 0.041, 0.035, 2.0),
        (crown_z + 0.062, -0.021, 0.015, 0.014, 2.0),
    ]
    thetas = [2 * math.pi * k / 14 for k in range(14)]
    z_loft(bm, stations, segments=14, cap_start=False, cap_end=True, thetas=thetas)

    # Hair at nape
    nape = [
        Vector((-0.040, 0.0, crown_z - 0.005)),
        Vector((-0.050, 0.0, crown_z - 0.035)),
        Vector((-0.048, 0.0, crown_z - 0.065)),
    ]
    tube(bm, nape, [(0.048, 0.012), (0.045, 0.010), (0.036, 0.007)], segments=8, up_hint=X_AXIS, cap_start=True, cap_end=True)

    bm.normal_update()
    return bm


# ---------------------------------------------------------------------------------------
# Distinctive Player-Colored Headband (Headband)
# ---------------------------------------------------------------------------------------
def build_headband_bmesh():
    """
    Player-colored headband encircling the brow with central medical medallion:
      - Encircles forehead, temples, and occiput snugly over the brow
      - Distinctive dyed woven circlet in player team color
      - Central bronze/gold circular medical medallion / brow brooch
    """
    bm = bmesh.new()
    brow_z = HEAD_CHIN_Z + HEAD_H * 0.68

    hband_stations = [
        (brow_z - 0.014, -0.012, 0.075, 0.068, 2.3),
        (brow_z + 0.000, -0.013, 0.078, 0.070, 2.3),
        (brow_z + 0.014, -0.014, 0.075, 0.068, 2.3),
    ]
    thetas = [2 * math.pi * k / 18 for k in range(18)]
    z_loft(bm, hband_stations, segments=18, cap_start=True, cap_end=True, thetas=thetas)

    # Central brow circular medallion / brooch
    medallion = bmesh.ops.create_cone(bm, segments=12, radius1=0.016, radius2=0.016, depth=0.010, cap_ends=True)
    bmesh.ops.rotate(bm, verts=medallion["verts"], cent=(0, 0, 0), matrix=Euler((0, math.radians(90), 0)).to_matrix())
    bmesh.ops.translate(bm, verts=medallion["verts"], vec=(0.060, 0.0, brow_z))

    bm.normal_update()
    return bm


# ---------------------------------------------------------------------------------------
# Torso & Clothing (Slender proportions matching peasant and maceman)
# ---------------------------------------------------------------------------------------
_HEALER_TORSO_STATIONS = [
    # z,       cx,      rb,     ra,     p
    (0.360,   0.000,   0.095,  0.122,  2.4),   # robe hem (flared skirt)
    (0.420,   0.000,   0.086,  0.110,  2.5),   # hips / lower skirt
    (0.490,   0.002,   0.078,  0.096,  2.5),   # waist cinch (belt level)
    (0.570,   0.004,   0.082,  0.100,  2.5),   # lower ribcage
    (0.650,   0.006,   0.090,  0.108,  2.4),   # chest / pectorals
    (0.730,   0.005,   0.090,  0.114,  2.4),   # upper chest
    (0.775,   0.002,   0.076,  0.112,  2.7),   # shoulder line
    (0.805,  -0.003,   0.052,  0.080,  2.5),   # neck slope
    (0.825,  -0.005,   0.045,  0.052,  2.2),   # collar rim / neck base
]


def _interp_station(z, st=_HEALER_TORSO_STATIONS):
    for i in range(len(st) - 1):
        if st[i][0] <= z <= st[i + 1][0]:
            t = (z - st[i][0]) / (st[i + 1][0] - st[i][0])
            return tuple(st[i][j] + (st[i + 1][j] - st[i][j]) * t for j in range(1, 5))
    return st[-1][1:]


def build_torso_bmesh():
    """Slender, lightly armored clerical tunic/robe in off-white / warm beige cloth theme."""
    bm = bmesh.new()
    z_loft(bm, _HEALER_TORSO_STATIONS, segments=20, cap_start=True, cap_end=True)
    return bm


def build_vest_bmesh():
    """
    Player-colored clerical stole / scapular (Vest_Team).
    Draped over both shoulders and streaming down the chest in team color (blue/red).
    """
    bm = bmesh.new()
    zs = [0.420, 0.470, 0.530, 0.600, 0.670, 0.740, 0.785, 0.815]
    stations = []
    for z in zs:
        cx, rb, ra, p = _interp_station(z)
        stations.append((z, cx + 0.003, rb + 0.006, ra + 0.006, p))
    z_loft(bm, stations, segments=20, cap_start=False, cap_end=False)

    bm.normal_update()
    # Keep front chest stole panels and over-shoulder drape, trimming back and sides
    kill = []
    for f in bm.faces:
        c = f.calc_center_median()
        if c.x < -0.012:
            kill.append(f)
        elif c.x < 0.030 and abs(c.y) > 0.095:
            kill.append(f)
    bmesh.ops.delete(bm, geom=kill, context="FACES")
    return bm


def build_belt_bmesh():
    """Stitched leather waist belt with bronze buckle."""
    bm = bmesh.new()
    cx, rb, ra, p = _interp_station(0.490)
    r_b, r_a = rb + 0.010, ra + 0.010
    z_loft(bm, [(0.476, cx, r_b, r_a, p), (0.504, cx, r_b, r_a, p)], segments=20, cap_start=False, cap_end=False)

    # Sturdy bronze buckle in front
    buckle = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, verts=buckle["verts"], vec=(0.012, 0.030, 0.038))
    bmesh.ops.translate(bm, verts=buckle["verts"], vec=(cx + r_b + 0.004, 0.0, 0.490))

    bm.normal_update()
    return bm


def build_satchel_bmesh():
    """
    Remedies satchel slung across torso:
      - Leather baldric strap crossing chest from right shoulder to left hip
      - Satchel pouch at left hip
      - Flap with brass buckle
      - Herbal remedy vial mounted in leather holster loop
    """
    bm = bmesh.new()

    # Diagonal shoulder strap crossing torso snugly over slender frame
    strap_pts = [
        Vector((0.020, -0.090, 0.770)),  # right shoulder
        Vector((0.065, -0.025, 0.640)),  # chest
        Vector((0.068,  0.035, 0.530)),  # left ribcage
        Vector((0.045,  0.105, 0.430)),  # down to left hip
        Vector((-0.025, 0.100, 0.440)),  # behind hip
        Vector((-0.055, 0.025, 0.550)),  # back
        Vector((-0.040, -0.055, 0.675)), # upper back
        Vector((0.020, -0.090, 0.770)),  # back to right shoulder
    ]
    tube(bm, strap_pts, [(0.013, 0.005)] * len(strap_pts), segments=6, up_hint=Z_AXIS, cap_start=False, cap_end=False)

    # Satchel pouch body at left hip
    pouch = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, verts=pouch["verts"], vec=(0.095, 0.065, 0.115))
    bmesh.ops.translate(bm, verts=pouch["verts"], vec=(0.055, 0.125, 0.410))

    # Flap overlapping top and front
    flap = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, verts=flap["verts"], vec=(0.100, 0.070, 0.052))
    bmesh.ops.translate(bm, verts=flap["verts"], vec=(0.055, 0.125, 0.445))

    # Small brass buckle on satchel
    sbuckle = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, verts=sbuckle["verts"], vec=(0.010, 0.022, 0.022))
    bmesh.ops.translate(bm, verts=sbuckle["verts"], vec=(0.105, 0.125, 0.425))

    # Herbal remedy vial in side leather holster
    vial = bmesh.ops.create_cone(bm, segments=10, radius1=0.016, radius2=0.016, depth=0.058, cap_ends=True)
    bmesh.ops.translate(bm, verts=vial["verts"], vec=(0.055, 0.162, 0.420))

    bm.normal_update()
    return bm


def build_neck_bmesh():
    """
    Solid anatomical neck connecting torso and head:
      - Starts well inside the chest (z = 0.780, well below torso top at 0.825)
      - Rises through the collar line (z = 0.825..0.860)
      - Penetrates solidly into the skull base / jaw underside (z = 0.915, well above chin at 0.880)
      - Both ends capped so no gaps or floating heads can exist from any angle.
    """
    bm = bmesh.new()
    path = [
        Vector((-0.004, 0.0, 0.780)),
        Vector((-0.006, 0.0, 0.830)),
        Vector((-0.009, 0.0, 0.875)),
        Vector((-0.012, 0.0, 0.915)),
    ]
    radii = [
        (0.048, 0.046),
        (0.042, 0.040),
        (0.038, 0.037),
        (0.036, 0.035),
    ]
    tube(bm, path, radii, segments=12, up_hint=Y_AXIS, cap_start=True, cap_end=True)
    return bm


def build_collar_bmesh():
    """Soft clerical cowl / collar rim at the neckline in beige cloth."""
    bm = bmesh.new()
    collar_stations = [
        (0.795, 0.000, 0.056, 0.082, 2.4),
        (0.818, -0.003, 0.048, 0.066, 2.3),
        (0.835, -0.005, 0.044, 0.050, 2.2),
    ]
    z_loft(bm, collar_stations, segments=16, cap_start=False, cap_end=False)
    return bm


# ---------------------------------------------------------------------------------------
# Arms, Shoulders, Pauldrons & Hands
# ---------------------------------------------------------------------------------------
def build_arm_bmesh(side):
    """
    Tunic sleeve in off-white / beige cloth extending from shoulder to wrist.
    Arm pivot at (0, ±SHOULDER_Y, SHOULDER_Z).
    """
    bm = bmesh.new()
    arm_path = [
        Vector((0.000, 0.0, 0.000)),
        Vector((0.012, 0.0, -0.080)),
        Vector((0.024, 0.0, -0.160)),
        Vector((0.038, 0.0, -0.235)),
        Vector((0.048, 0.0, -0.285)),
    ]
    radii = [
        (0.050, 0.052),
        (0.045, 0.047),
        (0.040, 0.042),
        (0.035, 0.036),
        (0.031, 0.032),
    ]
    tube(bm, arm_path, radii, segments=12, cap_start=True, cap_end=True)
    return bm


def build_pauldron_bmesh(side):
    """Light cloth shoulder mantle covering the shoulder joint."""
    bm = bmesh.new()
    ret = bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=8, radius=1.0)
    bmesh.ops.scale(bm, verts=ret["verts"], vec=(0.056, 0.062, 0.040))
    bmesh.ops.translate(bm, verts=ret["verts"], vec=(0.002, -side * 0.014, 0.018))
    bm.normal_update()
    return bm


def build_armband_team_bmesh(side):
    """
    Player-colored arm-band (Armband_Team_L / Armband_Team_R).
    Wrapped snugly around the upper arm in team color (blue/red).
    """
    bm = bmesh.new()
    band_pts = [
        Vector((0.015, 0.0, -0.095)),
        Vector((0.018, 0.0, -0.125)),
    ]
    tube(bm, band_pts, [(0.047, 0.049), (0.044, 0.046)], segments=12, cap_start=True, cap_end=True)
    return bm


def build_bracer_bmesh(side):
    """Leather wrist wrap near the cuff."""
    bm = bmesh.new()
    bracer_pts = [
        Vector((0.034, 0.0, -0.220)),
        Vector((0.042, 0.0, -0.260)),
        Vector((0.048, 0.0, -0.285)),
    ]
    radii = [(0.037, 0.038), (0.033, 0.034), (0.031, 0.032)]
    tube(bm, bracer_pts, radii, segments=10, cap_start=False, cap_end=False)
    return bm


# Wrist position relative to shoulder:
WRIST = Vector((0.050, 0.0, -0.285))
HAND_DIR = Vector((0.30, 0.0, -0.95)).normalized()
KNIFE_DIR = Vector((0.42, 0.0, -0.91)).normalized()


def build_hand_bmesh(side, is_knife_hand=False):
    """
    Modeled human hand in arm-local coordinates:
      - Left hand (side > 0): Formed to grip the buckler handle.
      - Right hand (is_knife_hand=True): Articulated fingers and thumb firmly curled
        around the knife grip handle!
    """
    bm = bmesh.new()

    # Palm block
    pts, radii = [], []
    for s, ra, rb in [
        (-0.004, 0.024, 0.017),
        (0.018, 0.029, 0.019),
        (0.040, 0.030, 0.018),
        (0.062, 0.026, 0.016),
        (0.080, 0.018, 0.012),
    ]:
        c = WRIST + HAND_DIR * s
        pts.append(c)
        radii.append((ra, rb))
    tube(bm, pts, radii, segments=8, cap_start=False, cap_end=True)

    inner = -side
    # Thumb wrapped over the grip/fingers
    thumb = [
        WRIST + HAND_DIR * 0.014 + Y_AXIS * (inner * 0.022),
        WRIST + HAND_DIR * 0.036 + Y_AXIS * (inner * 0.028) + X_AXIS * 0.012,
        WRIST + HAND_DIR * 0.056 + Y_AXIS * (inner * 0.024) + X_AXIS * 0.022,
    ]
    tube(bm, thumb, [(0.009, 0.009), (0.008, 0.008), (0.006, 0.006)], segments=6, cap_start=True, cap_end=True)

    if is_knife_hand:
        # Extra finger curls wrapping around the cylindrical knife grip
        palm_center = WRIST + HAND_DIR * 0.038
        lat = Y_AXIS
        for f_idx, f_offset in enumerate([-0.014, -0.004, 0.006, 0.016]):
            f_base = palm_center + KNIFE_DIR * f_offset
            curl_pts = [
                f_base + lat * (inner * 0.018),
                f_base + lat * (inner * 0.022) + X_AXIS * 0.014,
                f_base + lat * (inner * 0.012) + X_AXIS * 0.022 - KNIFE_DIR * 0.004,
            ]
            tube(bm, curl_pts, [(0.006, 0.006), (0.0055, 0.0055), (0.0045, 0.0045)], segments=5, cap_start=True, cap_end=True)

    bm.normal_update()
    return bm


# ---------------------------------------------------------------------------------------
# Right Arm: Remedy Knife / Dagger (Weapon) Connected to Hand_R
# ---------------------------------------------------------------------------------------
def build_knife_weapon_bmesh():
    """
    Surgical remedy knife / dagger held firmly inside Hand_R:
      - Cylindrical wrapped grip passing directly through the right hand's palm
      - Burnished brass bolster & oval guard (Knife_Guard) resting against the fist
      - Single-edged forged surgical steel blade with beveled cutting edge, curved belly, and sharp tip
      - Burnished brass pommel cap
    """
    bm = bmesh.new()
    palm = WRIST + HAND_DIR * 0.038  # exact center of Hand_R grip

    # 1. Wrapped Grip Cylinder (radius 0.013m, length 0.105m) centered inside Hand_R
    grip_p0 = palm - KNIFE_DIR * 0.052
    grip_p1 = palm + KNIFE_DIR * 0.052
    grip_pts = [grip_p0, palm, grip_p1]
    tube(bm, grip_pts, [(0.012, 0.012), (0.013, 0.013), (0.012, 0.012)], segments=10, cap_start=False, cap_end=False)

    # 2. Pommel Cap at base of grip
    pommel = bmesh.ops.create_uvsphere(bm, u_segments=8, v_segments=6, radius=1.0)
    bmesh.ops.scale(bm, verts=pommel["verts"], vec=(0.015, 0.015, 0.012))
    bmesh.ops.translate(bm, verts=pommel["verts"], vec=grip_p0 - KNIFE_DIR * 0.004)

    # 3. Guard / Bolster plate just in front of index finger
    guard = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, verts=guard["verts"], vec=(0.018, 0.036, 0.010))
    bmesh.ops.rotate(bm, verts=guard["verts"], cent=(0, 0, 0), matrix=Euler((0, math.radians(-25), 0)).to_matrix())
    bmesh.ops.translate(bm, verts=guard["verts"], vec=grip_p1 + KNIFE_DIR * 0.005)

    # 4. Surgical Steel Blade extending forward-downward
    blade_root = grip_p1 + KNIFE_DIR * 0.010
    blade_mid  = blade_root + KNIFE_DIR * 0.100
    blade_belly = blade_root + KNIFE_DIR * 0.155
    blade_tip  = blade_root + KNIFE_DIR * 0.190

    # Blade cross-sections (spine, cheeks, edge)
    norm = KNIFE_DIR.cross(Y_AXIS).normalized()  # blade spine-edge direction
    lat = Y_AXIS                                 # blade thickness direction

    stations = [
        (blade_root,  0.011, 0.005),
        (blade_mid,   0.013, 0.0045),
        (blade_belly, 0.011, 0.0035),
        (blade_tip,   0.002, 0.001),
    ]

    rings = []
    for pt, w_edge, w_thick in stations:
        v_spine = bm.verts.new(pt + norm * (w_edge * 0.35))
        v_right = bm.verts.new(pt + lat * w_thick)
        v_edge  = bm.verts.new(pt - norm * (w_edge * 0.65))
        v_left  = bm.verts.new(pt - lat * w_thick)
        rings.append([v_spine, v_right, v_edge, v_left])

    for i in range(len(rings) - 1):
        for k in range(4):
            k2 = (k + 1) % 4
            bm.faces.new((rings[i][k], rings[i + 1][k], rings[i + 1][k2], rings[i][k2]))

    # Cap tip
    tip_vert = bm.verts.new(blade_tip + KNIFE_DIR * 0.008)
    for k in range(4):
        k2 = (k + 1) % 4
        bm.faces.new((rings[-1][k], tip_vert, rings[-1][k2]))

    bm.normal_update()
    return bm


def build_knife_guard_bmesh():
    """Brass guard trim and decorative bolster accent."""
    bm = bmesh.new()
    palm = WRIST + HAND_DIR * 0.038
    guard_pos = palm + KNIFE_DIR * 0.057
    ret = bmesh.ops.create_cone(bm, segments=8, radius1=0.018, radius2=0.018, depth=0.008, cap_ends=True)
    bmesh.ops.rotate(bm, verts=ret["verts"], cent=(0, 0, 0), matrix=Euler((0, math.radians(-25), 0)).to_matrix())
    bmesh.ops.translate(bm, verts=ret["verts"], vec=guard_pos)
    bm.normal_update()
    return bm


# ---------------------------------------------------------------------------------------
# Left Arm: Simple Wooden Buckler Shield (Shield)
# ---------------------------------------------------------------------------------------
def build_buckler_shield_bmesh():
    """
    Light round wooden buckler on left arm:
      - Double-sided convex oak wood disc (0.135m radius)
      - Steel protective rim (Shield_Rim)
      - Iron central boss (Shield_Boss)
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

    front_center = bm.verts.new(Vector((thickness * 0.5 + 0.010, 0.0, 0.0)))
    back_center = bm.verts.new(Vector((-thickness * 0.5 - 0.005, 0.0, 0.0)))

    for k in range(n):
        k2 = (k + 1) % n
        bm.faces.new((front_ring[k], front_ring[k2], front_center))
        bm.faces.new((back_ring[k2], back_ring[k], back_center))
        bm.faces.new((front_ring[k], back_ring[k], back_ring[k2], front_ring[k2]))

    bm.normal_update()
    return bm


def build_buckler_boss_bmesh():
    """Central forged iron boss on buckler shield."""
    bm = bmesh.new()
    boss = bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=8, radius=1.0)
    bmesh.ops.scale(bm, verts=boss["verts"], vec=(0.024, 0.046, 0.046))
    bmesh.ops.translate(bm, verts=boss["verts"], vec=(0.018, 0.0, 0.0))
    bm.normal_update()
    return bm


def build_buckler_rim_bmesh():
    """Protective steel rim around buckler circumference."""
    bm = bmesh.new()
    n = 16
    thetas = [2 * math.pi * k / n for k in range(n)]
    r = 0.135
    rim_pts = [Vector((0.0, math.sin(th) * r, math.cos(th) * r)) for th in thetas]
    rim_pts.append(rim_pts[0])
    tube(bm, rim_pts, [0.008] * len(rim_pts), segments=6, up_hint=X_AXIS, cap_start=False, cap_end=False)
    return bm


# ---------------------------------------------------------------------------------------
# Legs & Boots
# ---------------------------------------------------------------------------------------
_HEALER_LEG_STATIONS = [
    # z (from hip), cx, rb, ra, p
    (0.000,   0.000, 0.052, 0.050, 2.1),   # hip / upper thigh
    (-0.080,  0.003, 0.048, 0.046, 2.1),   # mid thigh
    (-0.160,  0.006, 0.044, 0.042, 2.2),   # above knee
    (-0.210,  0.009, 0.040, 0.038, 2.2),   # knee
    (-0.270,  0.006, 0.038, 0.036, 2.2),   # calf
    (-0.330,  0.003, 0.034, 0.032, 2.2),   # lower calf
    (-0.370,  0.000, 0.028, 0.026, 2.2),   # ankle
]


def build_leg_bmesh():
    """Fitted beige linen hose/trousers."""
    bm = bmesh.new()
    z_loft(bm, _HEALER_LEG_STATIONS, segments=12, cap_start=True, cap_end=False)
    return bm


def build_boot_bmesh():
    """Soft leather medieval physician turnshoe / boot."""
    bm = bmesh.new()
    boot_pts = [
        Vector((0.000, 0.0, -0.355)),
        Vector((0.005, 0.0, -0.380)),
        Vector((0.015, 0.0, -0.395)),
    ]
    tube(bm, boot_pts, [(0.030, 0.028), (0.036, 0.030), (0.042, 0.032)], segments=10, cap_start=False, cap_end=False)

    # Foot sole & toe box
    sole = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, verts=sole["verts"], vec=(0.090, 0.048, 0.028))
    bmesh.ops.translate(bm, verts=sole["verts"], vec=(0.038, 0.0, -0.405))

    # Ankle turn-cuff
    cuff = bmesh.ops.create_cone(bm, segments=10, radius1=0.033, radius2=0.031, depth=0.022)
    bmesh.ops.translate(bm, verts=cuff["verts"], vec=(0.0, 0.0, -0.362))

    bm.normal_update()
    return bm


# ---------------------------------------------------------------------------------------
# Scene assembly
# ---------------------------------------------------------------------------------------
def assemble_healer(create_mesh_object, make_material):
    """Create the full healer hierarchy in the current Blender scene and return the rig dict."""
    mats = {
        # Lightly armored off-white / warm beige cloth theme
        "cloth": make_material("PeasantCloth", (0.86, 0.83, 0.75, 1.0), metallic=0.02, roughness=0.86),
        "team": make_material("TeamColor", (0.22, 0.42, 0.78, 1.0), metallic=0.08, roughness=0.70),
        "leather": make_material("Leather", (0.38, 0.24, 0.13, 1.0), metallic=0.04, roughness=0.78),
        "dark_leather": make_material("DarkLeather", (0.20, 0.14, 0.09, 1.0), metallic=0.04, roughness=0.82),
        "skin": make_material("Skin", (0.87, 0.71, 0.58, 1.0), metallic=0.0, roughness=0.75),
        "gear": make_material("HealerGear", (0.55, 0.42, 0.28, 1.0), metallic=0.45, roughness=0.60),
        "iron": make_material("ForgedIron", (0.45, 0.48, 0.52, 1.0), metallic=0.82, roughness=0.40),
        "steel": make_material("SurgicalSteel", (0.75, 0.78, 0.82, 1.0), metallic=0.88, roughness=0.25),
        "brass": make_material("BurnishedBrass", (0.82, 0.65, 0.24, 1.0), metallic=0.85, roughness=0.32),
        "wood": make_material("OakWood", (0.50, 0.35, 0.20, 1.0), metallic=0.02, roughness=0.85),
    }

    # 1. Torso (root object at 0, 0, 0)
    torso = create_mesh_object("Torso", build_torso_bmesh(), mats["cloth"], location=(0, 0, 0))
    create_mesh_object("Vest_Team", build_vest_bmesh(), mats["team"], parent=torso)
    create_mesh_object("Belt", build_belt_bmesh(), mats["leather"], parent=torso)
    create_mesh_object("Satchel", build_satchel_bmesh(), mats["gear"], parent=torso)
    create_mesh_object("Neck", build_neck_bmesh(), mats["skin"], parent=torso)
    create_mesh_object("Collar", build_collar_bmesh(), mats["cloth"], parent=torso)

    # 2. Head (pivot at z = 0.860)
    head = create_mesh_object("Head", build_head_bmesh(), mats["skin"], parent=torso, location=(0, 0, HEAD_PIVOT_Z))
    # Distinctive player-colored headband
    create_mesh_object("Headband", build_headband_bmesh(), mats["team"], parent=head)
    create_mesh_object("Hair", build_hair_bmesh(), mats["dark_leather"], parent=head)
    create_mesh_object("Ear_L", build_ear_bmesh(1.0), mats["skin"], parent=head)
    create_mesh_object("Ear_R", build_ear_bmesh(-1.0), mats["skin"], parent=head)

    # 3. Left Arm (pivot at y = +0.130, z = 0.775)
    arm_l = create_mesh_object("Arm_L", build_arm_bmesh(1.0), mats["cloth"], parent=torso, location=(0, SHOULDER_Y, SHOULDER_Z))
    create_mesh_object("Pauldron_L", build_pauldron_bmesh(1.0), mats["cloth"], parent=arm_l)
    create_mesh_object("Armband_Team_L", build_armband_team_bmesh(1.0), mats["team"], parent=arm_l)
    create_mesh_object("Bracer_L", build_bracer_bmesh(1.0), mats["leather"], parent=arm_l)
    create_mesh_object("Hand_L", build_hand_bmesh(1.0, is_knife_hand=False), mats["skin"], parent=arm_l)

    # Wooden buckler shield on Arm_L at forearm/wrist, angled 45 degrees towards the left flank
    shield = create_mesh_object(
        "Shield",
        build_buckler_shield_bmesh(),
        mats["gear"],
        parent=arm_l,
        location=(0.070, 0.045, -0.220),
        rotation=(math.radians(15), math.radians(-8), math.radians(45)),
    )
    create_mesh_object("Shield_Boss", build_buckler_boss_bmesh(), mats["iron"], parent=shield)
    create_mesh_object("Shield_Rim", build_buckler_rim_bmesh(), mats["steel"], parent=shield)

    # 4. Right Arm (pivot at y = -0.130, z = 0.775)
    arm_r = create_mesh_object("Arm_R", build_arm_bmesh(-1.0), mats["cloth"], parent=torso, location=(0, -SHOULDER_Y, SHOULDER_Z))
    create_mesh_object("Pauldron_R", build_pauldron_bmesh(-1.0), mats["cloth"], parent=arm_r)
    create_mesh_object("Armband_Team_R", build_armband_team_bmesh(-1.0), mats["team"], parent=arm_r)
    create_mesh_object("Bracer_R", build_bracer_bmesh(-1.0), mats["leather"], parent=arm_r)
    create_mesh_object("Hand_R", build_hand_bmesh(-1.0, is_knife_hand=True), mats["skin"], parent=arm_r)

    # Surgical remedy knife (Weapon) connected directly into Hand_R
    weapon = create_mesh_object("Weapon", build_knife_weapon_bmesh(), mats["gear"], parent=arm_r)
    create_mesh_object("Knife_Guard", build_knife_guard_bmesh(), mats["brass"], parent=weapon)

    # 5. Left Leg (pivot at y = +0.055, z = 0.420)
    leg_l = create_mesh_object("Leg_L", build_leg_bmesh(), mats["cloth"], parent=torso, location=(0, HIP_Y, HIP_Z))
    create_mesh_object("Boot_L", build_boot_bmesh(), mats["dark_leather"], parent=leg_l)

    # 6. Right Leg (pivot at y = -0.055, z = 0.420)
    leg_r = create_mesh_object("Leg_R", build_leg_bmesh(), mats["cloth"], parent=torso, location=(0, -HIP_Y, HIP_Z))
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

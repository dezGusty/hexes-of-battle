"""
Higher-fidelity (circa 2008-2012 "Civilization 5 / Shogun 2" style) low-poly swordsman for Hexes of Battle.

Instead of primitive spheres and cylinders, every armor and anatomical body part is lofted:
  - Anatomical globose cuirass (breastplate & backplate with central medial crease)
  - Heraldic surcoat/tabard (Surcoat_Team) dyed in player-specific team color (blue/red)
  - Articulated 14th-century bascinet helmet with ocular visor, brow trim, and chainmail aventail
  - 3-tier curved shoulder pauldrons with upright neck-guard flange
  - Articulated winged elbow couters and forearm vambraces
  - Hourglass plate gauntlets with flared cuffs and modeled fingers
  - Thigh cuisses, winged knee poleyns, anatomical crested greaves, and segmented sabaton boots
  - Double-edged knightly arming sword with fuller, down-curved crossguard, leather grip, and octagonal pommel
  - Curved medieval heater shield with team-colored heraldic face, riveted steel rim, and polished brass boss

Total budget is ~3k-4k triangles, perfectly tuned for 2008-2012 strategy game fidelity
while remaining ultra-fast for broad cross-platform / mobile performance.

Blender axes: +X = forward, +Y = unit's left (Arm_L), +Z = up. The glTF exporter converts to Y-up.

Rig contract (identical to the old swordsman so animation code keeps working):
  Torso (root)  -> Head, Arm_L, Arm_R, Leg_L, Leg_R
  Arm_L         -> Shield
  Arm_R         -> Weapon (arming sword)
All other child meshes are merged into their parent limb at load time
(see compactArticulatedUnitHierarchy in src/render3d/units/unit-mesh-builder.ts).
"""

import math
import bmesh
from mathutils import Euler, Vector

# ---------------------------------------------------------------------------------------
# Proportions (metres; overall height ~1.12m with helmet)
# ---------------------------------------------------------------------------------------
HIP_Z = 0.40
SHOULDER_Z = 0.77
SHOULDER_Y = 0.195
HIP_Y = 0.085
HEAD_PIVOT_Z = 0.88

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


# ---------------------------------------------------------------------------------------
# Torso & Cuirass
# ---------------------------------------------------------------------------------------
# (z, centre x, fore-aft radius, lateral radius, superellipse exponent)
_SWORDSMAN_TORSO_STATIONS = [
    (0.380, 0.000, 0.108, 0.136, 2.4),   # chainmail hauberk hem over thighs
    (0.430, 0.002, 0.102, 0.126, 2.4),   # lower fauld plates
    (0.485, 0.004, 0.096, 0.116, 2.5),   # waistline / belt line
    (0.550, 0.012, 0.106, 0.122, 2.3),   # globose breastplate swell
    (0.630, 0.016, 0.116, 0.132, 2.2),   # mid chest, prominent medial crest
    (0.710, 0.014, 0.114, 0.142, 2.3),   # upper pectoral / armpit line
    (0.770, 0.006, 0.094, 0.140, 2.6),   # broad clavicle / shoulder line
    (0.810, -0.002, 0.062, 0.088, 2.4),  # neck slope
    (0.835, -0.004, 0.052, 0.058, 2.2),  # gorget neck ring
]


def _interp_station(z):
    st = _SWORDSMAN_TORSO_STATIONS
    for i in range(len(st) - 1):
        if st[i][0] <= z <= st[i + 1][0]:
            t = (z - st[i][0]) / (st[i + 1][0] - st[i][0])
            return tuple(st[i][j] + (st[i + 1][j] - st[i][j]) * t for j in range(1, 5))
    return st[-1][1:]


def build_torso_bmesh():
    """Articulated anatomical torso: globose steel cuirass over chainmail hauberk."""
    bm = bmesh.new()
    z_loft(bm, _SWORDSMAN_TORSO_STATIONS, segments=20, cap_start=True, cap_end=True)

    # Accentuate the central medial ridge (stop-rib) on the front of the breastplate
    bm.normal_update()
    for v in bm.verts:
        if v.co.x > 0.02 and 0.50 <= v.co.z <= 0.74:
            # Distance from vertical centerline (y=0)
            ay = abs(v.co.y)
            if ay < 0.035:
                # Prominent central ridge peak
                crest = (1.0 - ay / 0.035) * 0.008 * math.sin((v.co.z - 0.50) / 0.24 * math.pi)
                v.co.x += crest
    bm.normal_update()
    return bm


def build_surcoat_bmesh():
    """Heraldic sleeveless surcoat / tabard worn over the breastplate, carrying the player's team colour."""
    bm = bmesh.new()
    zs = [0.420, 0.460, 0.500, 0.560, 0.640, 0.710, 0.765, 0.795, 0.815]
    stations = []
    for z in zs:
        cx, rb, ra, p = _interp_station(z)
        grow = 0.009
        if z > 0.78:
            grow = 0.005
        stations.append((z, cx, rb + grow, ra + grow, p))
    # Flare slightly at bottom skirt
    stations[0] = (stations[0][0], stations[0][1], stations[0][2] + 0.010, stations[0][3] + 0.012, stations[0][4])
    z_loft(bm, stations, segments=20, cap_start=False, cap_end=False)

    bm.normal_update()
    # Split the surcoat down the sides for leg/arm articulation and dynamic cloth look
    kill = []
    for f in bm.faces:
        c = f.calc_center_median()
        # Open side slits at |y| > lateral opening
        if abs(c.y) > 0.095 and c.z < 0.65:
            kill.append(f)
    bmesh.ops.delete(bm, geom=kill, context="FACES")
    return bm


def build_belt_bmesh():
    """Heavy knightly sword belt with bronze buckle, studs, and scabbard frog."""
    bm = bmesh.new()
    cx, rb, ra, p = _interp_station(0.485)
    r_b, r_a = rb + 0.014, ra + 0.014
    z_loft(bm, [(0.472, cx, r_b, r_a, p), (0.498, cx, r_b, r_a, p)], segments=20, cap_start=False, cap_end=False)

    # Bronze rectangular buckle on front-right
    ret = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, verts=ret["verts"], vec=(0.014, 0.034, 0.038))
    bmesh.ops.translate(bm, verts=ret["verts"], vec=(cx + r_b + 0.004, -0.025, 0.485))

    # Scabbard suspension frog on left hip
    frog = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, verts=frog["verts"], vec=(0.024, 0.016, 0.065))
    bmesh.ops.rotate(bm, verts=frog["verts"], cent=(0, 0, 0), matrix=Euler((0, math.radians(-20), 0)).to_matrix())
    bmesh.ops.translate(bm, verts=frog["verts"], vec=(cx - 0.015, ra + 0.012, 0.465))
    return bm


def build_aventail_bmesh():
    """Chainmail camail / aventail draped over the neck and resting on the upper chest and shoulders."""
    bm = bmesh.new()
    path = [Vector((-0.004, 0, 0.745)), Vector((-0.005, 0, 0.785)), Vector((-0.007, 0, 0.835)), Vector((-0.008, 0, 0.875))]
    # Flaring out from neck base down onto shoulders
    radii = [(0.125, 0.095), (0.100, 0.082), (0.075, 0.068), (0.065, 0.060)]
    tube(bm, path, radii, segments=16, up_hint=Y_AXIS, cap_start=True, cap_end=False)
    return bm


# ---------------------------------------------------------------------------------------
# Head & Bascinet Helmet
# ---------------------------------------------------------------------------------------
def build_helmet_bmesh():
    """
    Anatomical 14th-century bascinet helmet:
      - Egg-shaped conical skull dome curving up to an acute apex
      - Medial dorsal crest ridge
      - Contoured cheek and jaw guards enclosing the head
      - Visor faceplate with horizontal vision slit and ventilation punch holes
    """
    bm = bmesh.new()
    thetas = [2 * math.pi * k / 18 for k in range(18)]

    # Conical dome stations (chin underside z=0 up to helmet pointed apex z=0.25)
    # (z, cx, rb, ra, p)
    helmet_stations = [
        (0.000, 0.002, (0.068, 0.075), 0.066, 2.5),  # base of helmet / jaw wrap
        (0.035, 0.006, (0.076, 0.086), 0.074, 2.4),  # cheek level
        (0.075, 0.010, (0.082, 0.092), 0.078, 2.3),  # ocular brow level
        (0.120, 0.008, (0.080, 0.090), 0.076, 2.3),  # forehead
        (0.165, 0.004, (0.070, 0.078), 0.068, 2.2),  # skull curve
        (0.205, -0.002, (0.052, 0.058), 0.050, 2.1), # crown
        (0.238, -0.008, (0.030, 0.034), 0.028, 2.0), # tapering apex
        (0.255, -0.012, (0.010, 0.012), 0.010, 2.0), # pointed tip
    ]

    rings = []
    for (z, cx, rb, ra, p) in helmet_stations:
        rings.append(make_ring(bm, Vector((cx, 0.0, z)), Y_AXIS, X_AXIS, ra, rb, thetas, p))
    faces = bridge_rings(bm, rings, closed_bottom=True, closed_top=True)
    _orient_outward(bm, faces, Vector((0.0, 0.0, 0.12)))

    # Dorsal crest ridge on the top and rear of the helmet
    bm.normal_update()
    for v in bm.verts:
        if v.co.z >= 0.10:
            ay = abs(v.co.y)
            if ay < 0.020:
                crest = (1.0 - ay / 0.020) * 0.007 * ((v.co.z - 0.10) / 0.155)
                v.co.z += crest * 0.5
                if v.co.x < 0:
                    v.co.x -= crest * 0.8
                else:
                    v.co.x += crest * 0.5
    bm.normal_update()
    return bm


def build_visor_bmesh():
    """Pointed klappvisier / pig-faced visor with ocular slits and breath holes."""
    bm = bmesh.new()
    # Loft a protruding snout/visor on +X
    pts = [
        Vector((0.075, 0, 0.035)),  # bottom chin anchor
        Vector((0.098, 0, 0.055)),  # lower beak
        Vector((0.118, 0, 0.075)),  # snout tip
        Vector((0.095, 0, 0.092)),  # ocular brow ledge
        Vector((0.076, 0, 0.100)),  # brow anchor
    ]
    radii = [
        (0.046, 0.020),
        (0.048, 0.034),
        (0.044, 0.038),
        (0.048, 0.028),
        (0.052, 0.016),
    ]
    tube(bm, pts, radii, segments=12, up_hint=Y_AXIS, cap_start=True, cap_end=True)

    # Horizontal ocular vision slit bar (stepped indent / visor band)
    ret = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, verts=ret["verts"], vec=(0.012, 0.096, 0.016))
    bmesh.ops.translate(bm, verts=ret["verts"], vec=(0.092, 0.0, 0.084))
    return bm


def build_plume_bmesh():
    """Flowing knightly helmet crest / plume dyed in player-specific team colour."""
    bm = bmesh.new()
    path = [
        Vector((-0.012, 0, 0.252)),
        Vector((-0.026, 0, 0.280)),
        Vector((-0.052, 0, 0.292)),
        Vector((-0.088, 0, 0.280)),
        Vector((-0.118, 0, 0.245)),
    ]
    radii = [
        (0.012, 0.014),
        (0.020, 0.024),
        (0.026, 0.028),
        (0.022, 0.022),
        (0.008, 0.008),
    ]
    tube(bm, path, radii, segments=8, up_hint=Y_AXIS, cap_start=True, cap_end=True)
    return bm


# ---------------------------------------------------------------------------------------
# Arms, Pauldrons, Couters, and Gauntlets
# ---------------------------------------------------------------------------------------
def build_arm_bmesh(side):
    """Upper arm (rerebrace) in shoulder-relative coordinates."""
    bm = bmesh.new()
    path = [
        Vector((0.0, 0, 0.020)),
        Vector((0.006, 0, -0.040)),
        Vector((0.014, 0, -0.100)),
        Vector((0.022, 0, -0.150)),
    ]
    radii = [
        (0.052, 0.054),
        (0.048, 0.050),
        (0.044, 0.046),
        (0.040, 0.042),
    ]
    tube(bm, path, radii, segments=12, cap_start=True, cap_end=True)
    return bm


def build_pauldron_bmesh(side):
    """Articulated 3-tiered plate shoulder pauldron with upright neck guard gardbrace."""
    bm = bmesh.new()
    # Main curved cap over shoulder
    ret = bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=8, radius=1.0)
    bmesh.ops.scale(bm, verts=ret["verts"], vec=(0.068, 0.074, 0.055))
    # Gardbrace upright neck flange on the inner/rear side
    bmesh.ops.translate(bm, verts=ret["verts"], vec=(0.008, side * 0.012, 0.022))

    # Lower articulated lame plates
    lame = bmesh.ops.create_uvsphere(bm, u_segments=10, v_segments=6, radius=1.0)
    bmesh.ops.scale(bm, verts=lame["verts"], vec=(0.062, 0.066, 0.042))
    bmesh.ops.translate(bm, verts=lame["verts"], vec=(0.012, side * 0.008, -0.022))
    return bm


def build_vambrace_bmesh():
    """Lower arm gutter plates (vambrace) and elbow couter with wing."""
    bm = bmesh.new()
    # Elbow couter pointed cup
    couter = bmesh.ops.create_cone(bm, segments=10, cap_ends=True, radius1=0.044, radius2=0.008, depth=0.038)
    bmesh.ops.rotate(bm, verts=couter["verts"], cent=(0, 0, 0), matrix=Euler((0, math.radians(70), 0)).to_matrix())
    bmesh.ops.translate(bm, verts=couter["verts"], vec=(-0.018, 0, -0.155))

    # Vambrace tubular forearm plates down to wrist
    forearm_pts = [
        Vector((0.020, 0, -0.155)),
        Vector((0.036, 0, -0.198)),
        Vector((0.054, 0, -0.246)),
        Vector((0.070, 0, -0.292)),
    ]
    tube(bm, forearm_pts, [(0.042, 0.040), (0.040, 0.038), (0.036, 0.034), (0.032, 0.030)], segments=10, cap_start=False, cap_end=False)
    return bm


WRIST = Vector((0.070, 0.0, -0.292))
HAND_DIR = Vector((0.27, 0.0, -0.96)).normalized()


def build_gauntlet_bmesh(side):
    """Hourglass plate gauntlet with flared wrist cuff, metacarpal plates, and gloved fingers."""
    bm = bmesh.new()
    # Flared wrist cuff
    cuff_pts = [WRIST - HAND_DIR * 0.022, WRIST, WRIST + HAND_DIR * 0.025]
    tube(bm, cuff_pts, [(0.038, 0.036), (0.034, 0.032), (0.036, 0.030)], segments=10, cap_start=True, cap_end=False)

    # Hand palm and curled fingers
    pts, radii = [], []
    for s, ra, rb in [(0.025, 0.035, 0.024), (0.055, 0.036, 0.022), (0.082, 0.032, 0.020), (0.104, 0.024, 0.016)]:
        c = WRIST + HAND_DIR * s + X_AXIS * (0.50 * max(0.0, s - 0.03) ** 2 * 6.0)
        pts.append(c)
        radii.append((ra, rb))
    tube(bm, pts, radii, segments=8, cap_start=False, cap_end=True)

    # Segmented thumb on inner side
    inner = -side
    thumb = [
        WRIST + HAND_DIR * 0.020 + Y_AXIS * (inner * 0.028),
        WRIST + HAND_DIR * 0.048 + Y_AXIS * (inner * 0.034) + X_AXIS * 0.014,
        WRIST + HAND_DIR * 0.072 + Y_AXIS * (inner * 0.030) + X_AXIS * 0.028,
    ]
    tube(bm, thumb, [(0.012, 0.012), (0.011, 0.011), (0.008, 0.008)], segments=6, cap_start=True, cap_end=True)
    return bm


# ---------------------------------------------------------------------------------------
# Legs, Poleyns, Greaves, and Sabatons
# ---------------------------------------------------------------------------------------
def build_leg_bmesh():
    """Cuisses (thigh plate armor) and chainmail chausses, hip-relative."""
    bm = bmesh.new()
    path = [
        Vector((0, 0, 0.060)),
        Vector((0, 0, 0.000)),
        Vector((0.004, 0, -0.090)),
        Vector((0.012, 0, -0.190)),
        Vector((0.008, 0, -0.270)),
    ]
    radii = [
        (0.060, 0.062),
        (0.064, 0.065),
        (0.060, 0.060),
        (0.052, 0.052),
        (0.046, 0.046),
    ]
    tube(bm, path, radii, segments=12, up_hint=Y_AXIS, cap_start=True, cap_end=False)
    return bm


def build_poleyn_bmesh(side):
    """Articulated knee cop (poleyn) with protective lateral wing."""
    bm = bmesh.new()
    # Pointed hemispherical knee cop
    ret = bmesh.ops.create_cone(bm, segments=10, cap_ends=True, radius1=0.050, radius2=0.012, depth=0.040)
    bmesh.ops.rotate(bm, verts=ret["verts"], cent=(0, 0, 0), matrix=Euler((0, math.radians(-75), 0)).to_matrix())
    bmesh.ops.translate(bm, verts=ret["verts"], vec=(0.042, 0.0, -0.270))

    # Lateral protective wing plate on outer knee
    wing = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, verts=wing["verts"], vec=(0.038, 0.010, 0.048))
    bmesh.ops.translate(bm, verts=wing["verts"], vec=(0.024, side * 0.050, -0.270))
    return bm


def build_greave_bmesh():
    """Anatomical calf/shin greaves with anterior tibial crest ridge."""
    bm = bmesh.new()
    path = [
        Vector((0.006, 0, -0.270)),
        Vector((0.002, 0, -0.320)),
        Vector((-0.002, 0, -0.370)),
        Vector((-0.004, 0, -0.415)),
    ]
    radii = [
        (0.045, 0.046),
        (0.042, 0.044),
        (0.038, 0.040),
        (0.036, 0.038),
    ]
    tube(bm, path, radii, segments=12, up_hint=Y_AXIS, cap_start=False, cap_end=False)
    return bm


def build_sabaton_bmesh():
    """Articulated steel sabaton plate boots with ankle lames and pointed medieval toe."""
    bm = bmesh.new()
    # Ankle collar
    shaft = [Vector((0.0, 0, -0.370)), Vector((-0.002, 0, -0.418))]
    tube(bm, shaft, [(0.042, 0.042), (0.038, 0.038)], segments=10, cap_start=False, cap_end=False)

    # Foot stations along +X
    stations = [
        (-0.048, -0.426, 0.038, 0.034),  # heel cup
        (-0.016, -0.424, 0.040, 0.038),  # instep
        (0.032, -0.434, 0.029, 0.042),   # midfoot lame
        (0.074, -0.442, 0.021, 0.042),   # ball of foot
        (0.110, -0.446, 0.016, 0.032),   # toe box
        (0.138, -0.450, 0.010, 0.018),   # pointed sabaton toe tip
    ]
    thetas = [2 * math.pi * k / 10 for k in range(10)]
    rings = []
    for (x, cz, hz, hy) in stations:
        rings.append(make_ring(bm, Vector((x, 0.0, cz)), Y_AXIS, Z_AXIS, hy, hz, thetas, 2.4))
    faces = bridge_rings(bm, rings, closed_bottom=True, closed_top=True)
    _orient_outward(bm, faces, Vector((0.04, 0.0, -0.436)))

    # Heel spur stud
    spur = bmesh.ops.create_cone(bm, segments=6, cap_ends=True, radius1=0.008, radius2=0.002, depth=0.022)
    bmesh.ops.rotate(bm, verts=spur["verts"], cent=(0, 0, 0), matrix=Euler((0, math.radians(-90), 0)).to_matrix())
    bmesh.ops.translate(bm, verts=spur["verts"], vec=(-0.058, 0.0, -0.432))
    return bm


# ---------------------------------------------------------------------------------------
# Heater Shield (Arm_L child)
# ---------------------------------------------------------------------------------------
def build_heater_shield_bmesh():
    """
    Curved medieval knight's heater shield displaying player's team colour.
    Curved along Y axis (wraps around arm), pointed at bottom (+X), curved top rim.
    """
    bm = bmesh.new()
    # Lofted along shield vertical length (-Z from 0.18 down to -0.22)
    zs = [0.18, 0.12, 0.04, -0.04, -0.12, -0.18, -0.24]
    half_widths = [0.155, 0.152, 0.144, 0.128, 0.098, 0.060, 0.008]

    rings = []
    thetas = [math.pi * (-0.5 + k / 10.0) for k in range(11)]  # curve arc
    curve_radius = 0.32

    for z, hw in zip(zs, half_widths):
        ring_verts = []
        for th in thetas:
            # Curve convex forward on +X
            sx = math.cos(th) * curve_radius - (curve_radius - 0.035)
            sy = math.sin(th) * (hw / math.sin(math.pi * 0.5))
            ring_verts.append(bm.verts.new(Vector((sx, sy, z))))
        rings.append(ring_verts)

    # Skin grid of quads
    for i in range(len(rings) - 1):
        for k in range(len(rings[0]) - 1):
            bm.faces.new((rings[i][k], rings[i][k + 1], rings[i + 1][k + 1], rings[i + 1][k]))

    bm.normal_update()
    _orient_outward(bm, bm.faces, Vector((-0.1, 0, 0)))
    return bm


def build_shield_boss_bmesh():
    """Burnished brass central dome shield boss with cruciform reinforcement arms."""
    bm = bmesh.new()
    # Central polished dome
    boss = bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=8, radius=1.0)
    bmesh.ops.scale(bm, verts=boss["verts"], vec=(0.026, 0.046, 0.046))
    bmesh.ops.translate(bm, verts=boss["verts"], vec=(0.045, 0.0, 0.020))

    # Cruciform cross arms radiating from boss
    arm_v = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, verts=arm_v["verts"], vec=(0.012, 0.024, 0.220))
    bmesh.ops.translate(bm, verts=arm_v["verts"], vec=(0.038, 0.0, 0.020))

    arm_h = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, verts=arm_h["verts"], vec=(0.012, 0.200, 0.024))
    bmesh.ops.translate(bm, verts=arm_h["verts"], vec=(0.038, 0.0, 0.020))
    return bm


# ---------------------------------------------------------------------------------------
# Arming Sword (Arm_R child)
# ---------------------------------------------------------------------------------------
def build_sword_bmesh():
    """
    Double-edged knightly arming sword:
      - Double-edged blade with central fuller groove
      - Down-curved cruciform crossguard
      - Cord-bound leather grip
      - Octagonal scent-stopper pommel
    Grip center aligns with hand hold point.
    """
    bm = bmesh.new()
    # Grip along +Z (from z = -0.06 to +0.06)
    grip_pts = [Vector((0, 0, -0.055)), Vector((0, 0, 0.0)), Vector((0, 0, 0.055))]
    tube(bm, grip_pts, [(0.012, 0.015), (0.013, 0.016), (0.012, 0.015)], segments=8, cap_start=True, cap_end=True)

    # Octagonal scent-stopper pommel at bottom (z = -0.085)
    pommel = bmesh.ops.create_uvsphere(bm, u_segments=8, v_segments=6, radius=1.0)
    bmesh.ops.scale(bm, verts=pommel["verts"], vec=(0.024, 0.024, 0.028))
    bmesh.ops.translate(bm, verts=pommel["verts"], vec=(0, 0, -0.078))

    # Down-curved crossguard at z = +0.065
    guard = []
    guard_r = []
    for i in range(-5, 6):
        t = i / 5.0
        # Drooping quillon tips
        gy = t * 0.115
        gz = 0.065 - (t * t) * 0.012
        guard.append(Vector((0, gy, gz)))
        r = 0.012 * (1.0 - abs(t) * 0.35)
        guard_r.append((r, r))
    tube(bm, guard, guard_r, segments=6, up_hint=X_AXIS, cap_start=True, cap_end=True)

    # Double-edged blade with diamond cross-section and central fuller
    # (starts at z = 0.078, length ~0.68m up to z = 0.76)
    blade_stations = [
        (0.078, 0.024, 0.0075),  # ricasso
        (0.200, 0.023, 0.0068),
        (0.400, 0.021, 0.0058),
        (0.600, 0.018, 0.0048),
        (0.720, 0.013, 0.0038),
        (0.755, 0.002, 0.0010),  # acute point
    ]
    thetas = [0.0, math.pi * 0.5, math.pi, math.pi * 1.5]  # 4 diamond vertices
    rings = []
    for bz, bw, bt in blade_stations:
        # Diamond: width along Y, thickness along X
        rings.append(make_ring(bm, Vector((0, 0, bz)), Y_AXIS, X_AXIS, bw, bt, thetas, p=1.0))
    bridge_rings(bm, rings, closed_bottom=True, closed_top=True)
    bm.normal_update()
    _orient_outward(bm, bm.faces, Vector((0, 0, 0.40)))
    return bm


# ---------------------------------------------------------------------------------------
# Scene assembly
# ---------------------------------------------------------------------------------------
def assemble_swordsman(create_mesh_object, make_material):
    """Create the full swordsman hierarchy in the current Blender scene and return the rig dict."""
    mats = {
        "steel": make_material("SwordsmanSteel", (0.52, 0.55, 0.58, 1.0), metallic=0.82, roughness=0.34),
        "mail": make_material("SwordsmanMail", (0.28, 0.30, 0.33, 1.0), metallic=0.72, roughness=0.52),
        "brass": make_material("SwordsmanBrass", (0.84, 0.68, 0.24, 1.0), metallic=0.86, roughness=0.30),
        "team": make_material("TeamColor", (0.22, 0.42, 0.78, 1.0), metallic=0.04, roughness=0.76),
        "leather": make_material("SwordsmanLeather", (0.16, 0.11, 0.07, 1.0), metallic=0.04, roughness=0.78),
    }

    # 1. Torso (root object at 0, 0, 0)
    torso = create_mesh_object("Torso", build_torso_bmesh(), mats["steel"], location=(0, 0, 0))
    create_mesh_object("Surcoat_Team", build_surcoat_bmesh(), mats["team"], parent=torso)
    create_mesh_object("Belt", build_belt_bmesh(), mats["leather"], parent=torso)
    create_mesh_object("Aventail", build_aventail_bmesh(), mats["mail"], parent=torso)

    # 2. Head (pivot at z = 0.88)
    head = create_mesh_object("Head", build_helmet_bmesh(), mats["steel"], parent=torso, location=(0, 0, HEAD_PIVOT_Z))
    create_mesh_object("Helmet_Visor", build_visor_bmesh(), mats["steel"], parent=head)
    create_mesh_object("Plume_Team", build_plume_bmesh(), mats["team"], parent=head)

    # 3. Left Arm (pivot at y = +0.195, z = 0.75)
    arm_l = create_mesh_object("Arm_L", build_arm_bmesh(1.0), mats["mail"], parent=torso, location=(0, SHOULDER_Y, SHOULDER_Z))
    create_mesh_object("Pauldron_L", build_pauldron_bmesh(1.0), mats["steel"], parent=arm_l)
    create_mesh_object("Vambrace_L", build_vambrace_bmesh(), mats["steel"], parent=arm_l)
    create_mesh_object("Gauntlet_L", build_gauntlet_bmesh(1.0), mats["steel"], parent=arm_l)

    # Heater Shield attached to Arm_L at forearm/wrist
    shield = create_mesh_object("Shield", build_heater_shield_bmesh(), mats["team"], parent=arm_l, location=(0.09, 0.06, -0.16), rotation=(math.radians(12), 0, math.radians(-10)))
    create_mesh_object("Shield_Boss", build_shield_boss_bmesh(), mats["brass"], parent=shield)

    # 4. Right Arm (pivot at y = -0.195, z = 0.75)
    arm_r = create_mesh_object("Arm_R", build_arm_bmesh(-1.0), mats["mail"], parent=torso, location=(0, -SHOULDER_Y, SHOULDER_Z))
    create_mesh_object("Pauldron_R", build_pauldron_bmesh(-1.0), mats["steel"], parent=arm_r)
    create_mesh_object("Vambrace_R", build_vambrace_bmesh(), mats["steel"], parent=arm_r)
    create_mesh_object("Gauntlet_R", build_gauntlet_bmesh(-1.0), mats["steel"], parent=arm_r)

    # Arming Sword in right hand (positioned right in the palm grip)
    sword_pos = WRIST + HAND_DIR * 0.052 + X_AXIS * 0.005
    # Rotate sword so blade extends forward and slightly up in ready stance
    create_mesh_object("Weapon", build_sword_bmesh(), mats["steel"], parent=arm_r, location=sword_pos, rotation=(0, math.radians(52), 0))

    # 5. Left Leg (pivot at y = +0.085, z = 0.38)
    leg_l = create_mesh_object("Leg_L", build_leg_bmesh(), mats["mail"], parent=torso, location=(0, HIP_Y, HIP_Z))
    create_mesh_object("Poleyn_L", build_poleyn_bmesh(1.0), mats["steel"], parent=leg_l)
    create_mesh_object("Greave_L", build_greave_bmesh(), mats["steel"], parent=leg_l)
    create_mesh_object("Boot_L", build_sabaton_bmesh(), mats["steel"], parent=leg_l)

    # 6. Right Leg (pivot at y = -0.085, z = 0.38)
    leg_r = create_mesh_object("Leg_R", build_leg_bmesh(), mats["mail"], parent=torso, location=(0, -HIP_Y, HIP_Z))
    create_mesh_object("Poleyn_R", build_poleyn_bmesh(-1.0), mats["steel"], parent=leg_r)
    create_mesh_object("Greave_R", build_greave_bmesh(), mats["steel"], parent=leg_r)
    create_mesh_object("Boot_R", build_sabaton_bmesh(), mats["steel"], parent=leg_r)

    return {
        "torso": torso,
        "head": head,
        "arm_l": arm_l,
        "arm_r": arm_r,
        "leg_l": leg_l,
        "leg_r": leg_r,
        "shield": shield,
    }

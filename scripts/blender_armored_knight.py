"""
Higher-fidelity (circa 2008-2012 "Civilization 5 / Total War" style) low-poly Armored Knight mounted on Warhorse.

Key Improvements:
  1. Anatomically sculpted Warhorse:
     - Powerful barrel torso with deep flank and shoulder girth
     - Arched muscular neck rising up and forward with segmented steel Crinet neck plates
     - Anatomical equine head angled down and forward in a noble battle stance:
         - Wide flat forehead sloping down into a broad Roman nasal bridge
         - Large circular jaw cheeks (ganache/jowls) giving the unmistakable equine skull silhouette
         - Tapered squared-off equine muzzle with nostril flares and lower jaw
         - Armored steel Chamfron plate fitted along forehead and nose with forward-pointing spike
         - Alert upright equine ears atop the poll
     - Caparison / Barding (Horse_Barding) draped across flanks and chest in player-specific team color
     - Flowing braided horse tail
     - 4 muscular articulated horse legs (Horse_Leg_Front_L, Front_R, Rear_L, Rear_R) with knees, hocks, fetlocks, and hooves
     - High-cantle medieval war saddle with stirrups
  2. Fully Armored Knight Rider:
     - Full plate steel cuirass over chainmail hauberk
     - Player-colored heraldic surcoat / tabard (Tabard_Team)
     - Fluted steel pauldrons protecting shoulders
     - Great Helm with brass reinforcement cross and vision slit
     - Mounted legs in stirrups astride the warhorse
     - Left arm (Arm_L) holding reins and equipped with medieval knight Heater Shield (Shield):
         - Heraldic shield face dyed in player-specific team color (Shield_Team)
         - Riveted steel perimeter rim
         - Central burnished brass/steel boss
     - Right arm (Arm_R) wielding heavy flanged mace (Weapon):
         - Hardwood haft, 6 steel flanges, armor-penetrating top spike, and counterweight pommel

Blender axes: +X = forward, +Y = unit's left, +Z = up. Exported as Y-up in glTF.

Rig contract:
  Root (warhorse body)
    ├── Horse_Barding [player team color]
    ├── Horse_Neck -> Horse_Neck_Armor (Crinet)
    ├── Horse_Head (equine head angled down and forward)
    │     ├── Chamfron_Plate
    │     ├── Chamfron_Spike
    │     └── Ear_L, Ear_R
    ├── Horse_Leg_Front_L, Horse_Leg_Front_R, Horse_Leg_Rear_L, Horse_Leg_Rear_R
    ├── Horse_Tail
    ├── Saddle
    └── Torso (Knight rider)
          ├── Tabard_Team [player team color]
          ├── Pauldron_L, Pauldron_R
          ├── Head (Great Helm)
          ├── Leg_L, Leg_R
          ├── Arm_L -> Shield [player team color] -> Shield_Boss, Shield_Rim
          └── Arm_R -> Weapon -> Weapon_Head, Weapon_Spike, Weapon_Pommel
"""

import math
import bmesh
from mathutils import Euler, Vector

# ---------------------------------------------------------------------------------------
# Axes & Proportions
# ---------------------------------------------------------------------------------------
X_AXIS = Vector((1.0, 0.0, 0.0))
Y_AXIS = Vector((0.0, 1.0, 0.0))
Z_AXIS = Vector((0.0, 0.0, 1.0))

HORSE_BODY_Z = 0.44
HORSE_HIP_X = -0.25
HORSE_SHOULDER_X = 0.24
HORSE_LEG_Y = 0.14

KNIGHT_SEAT_X = 0.02
KNIGHT_SEAT_Z = 0.74
KNIGHT_SHOULDER_Z = 0.95
KNIGHT_SHOULDER_Y = 0.185
KNIGHT_HEAD_Z = 1.03


# ---------------------------------------------------------------------------------------
# Lofting helpers
# ---------------------------------------------------------------------------------------
def _superellipse(theta, p):
    c = math.cos(theta)
    s = math.sin(theta)
    cx = math.copysign(abs(c) ** (2.0 / p), c)
    sy = math.copysign(abs(s) ** (2.0 / p), s)
    return cx, sy


def make_ring(bm, centre, a_vec, b_vec, ra, rb, thetas, p=2.0):
    """One cross-section: `a` is lateral axis (radius ra), `b` is fore-aft/up axis (radius rb)."""
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


# ---------------------------------------------------------------------------------------
# 1. Warhorse Head (Anatomical Equine Skull, facing forward & down)
# ---------------------------------------------------------------------------------------
def build_horse_head_bmesh():
    """
    Sculpts a true anatomical horse head angled forward and DOWNWARD:
      - Wide flat forehead between eyes
      - Large circular jaw cheeks (ganache) at lower-back
      - Broad Roman nasal bridge tapering down to squared muzzle with nostrils
      - Muzzle points down and forward at Z = 0.49 (poll is at Z = 0.76)
    """
    bm = bmesh.new()

    # Stations from throat/poll down-forward to muzzle:
    # Each station: (centre, a_vec=Y_AXIS, b_vec, ra=half_width, rb=half_depth)
    thetas = [2 * math.pi * k / 14 for k in range(14)]
    rings = []

    # Head axis points down-forward: dx = 0.27, dz = -0.22 -> tangent direction
    head_tangent = Vector((0.27, 0.0, -0.22)).normalized()
    head_normal = Vector((0.22, 0.0, 0.27)).normalized()  # Perpendicular up-forward vector

    stations = [
        # 0: Poll and throat latch base
        (Vector((0.37, 0.0, 0.67)), 0.068, (0.088, 0.075)),
        # 1: Forehead and large jaw jowls (ganache)
        (Vector((0.42, 0.0, 0.63)), 0.064, (0.078, 0.072)),
        # 2: Eye orbits and upper nasal bridge
        (Vector((0.48, 0.0, 0.58)), 0.052, (0.060, 0.055)),
        # 3: Mid nasal bridge (Roman nose)
        (Vector((0.54, 0.0, 0.53)), 0.042, (0.046, 0.042)),
        # 4: Lower nasal bone approaching muzzle
        (Vector((0.59, 0.0, 0.49)), 0.034, (0.036, 0.034)),
        # 5: Squared equine muzzle and lips
        (Vector((0.63, 0.0, 0.46)), 0.026, (0.026, 0.024)),
    ]

    for centre, ra, rb in stations:
        rings.append(make_ring(bm, centre, Y_AXIS, head_normal, ra, rb, thetas, p=2.0))

    bridge_rings(bm, rings, closed_bottom=True, closed_top=True)

    # Add prominent circular jaw cheeks (ganache) on both sides of the lower head
    for y_sign in [1.0, -1.0]:
        jowl = bmesh.ops.create_uvsphere(bm, u_segments=10, v_segments=8, radius=1.0)
        bmesh.ops.scale(bm, verts=jowl["verts"], vec=(0.062, 0.024, 0.058))
        bmesh.ops.translate(bm, verts=jowl["verts"], vec=(0.38, y_sign * 0.060, 0.63))

    # Flared nostril ridges on muzzle
    for y_sign in [1.0, -1.0]:
        nostril = bmesh.ops.create_uvsphere(bm, u_segments=8, v_segments=6, radius=1.0)
        bmesh.ops.scale(bm, verts=nostril["verts"], vec=(0.018, 0.012, 0.016))
        bmesh.ops.translate(bm, verts=nostril["verts"], vec=(0.61, y_sign * 0.030, 0.475))

    # Eye bulges on forehead lateral sides
    for y_sign in [1.0, -1.0]:
        eye = bmesh.ops.create_uvsphere(bm, u_segments=8, v_segments=6, radius=1.0)
        bmesh.ops.scale(bm, verts=eye["verts"], vec=(0.016, 0.012, 0.016))
        bmesh.ops.translate(bm, verts=eye["verts"], vec=(0.45, y_sign * 0.060, 0.66))

    return bm


def build_horse_chamfron_bmesh():
    """
    Steel chamfron armor plate covering the forehead and nasal bridge:
      - Shaped steel plate fitted over horse head
      - Forehead spike projecting forward
      - Eye orbit protective flanges
    """
    bm = bmesh.new()

    # Chamfron main plate following the nasal slope
    thetas = [math.pi * (-0.5 + k / 8.0) for k in range(9)]  # convex curve over face
    plate_rings = []
    plate_stations = [
        (Vector((0.38, 0.0, 0.74)), 0.070, 0.018),
        (Vector((0.44, 0.0, 0.69)), 0.066, 0.018),
        (Vector((0.50, 0.0, 0.64)), 0.052, 0.016),
        (Vector((0.56, 0.0, 0.58)), 0.040, 0.014),
    ]

    for centre, hw, h_th in plate_stations:
        rverts = []
        for th in thetas:
            sy = math.sin(th) * hw
            sz = centre.z + math.cos(th) * h_th
            sx = centre.x + math.cos(th) * 0.012
            rverts.append(bm.verts.new(Vector((sx, sy, sz))))
        plate_rings.append(rverts)

    for i in range(len(plate_rings) - 1):
        for k in range(len(plate_rings[0]) - 1):
            bm.faces.new((plate_rings[i][k], plate_rings[i + 1][k], plate_rings[i + 1][k + 1], plate_rings[i][k + 1]))

    # Chamfron central forehead boss
    boss = bmesh.ops.create_uvsphere(bm, u_segments=10, v_segments=8, radius=1.0)
    bmesh.ops.scale(bm, verts=boss["verts"], vec=(0.024, 0.030, 0.030))
    bmesh.ops.translate(bm, verts=boss["verts"], vec=(0.45, 0.0, 0.70))

    # Chamfron spike projecting forward & slightly upward
    spike = bmesh.ops.create_cone(bm, segments=8, cap_ends=True, radius1=0.018, radius2=0.002, depth=0.12)
    bmesh.ops.rotate(bm, verts=spike["verts"], cent=(0, 0, 0), matrix=Euler((0, math.radians(72), 0)).to_matrix())
    bmesh.ops.translate(bm, verts=spike["verts"], vec=(0.51, 0.0, 0.72))

    return bm


def build_horse_ears_bmesh():
    """Alert, pointed equine ears atop the poll."""
    bm = bmesh.new()
    for y_sign in [1.0, -1.0]:
        ear = bmesh.ops.create_cone(bm, segments=8, cap_ends=True, radius1=0.022, radius2=0.004, depth=0.09)
        # Point upward, slightly forward and outward
        bmesh.ops.rotate(
            bm,
            verts=ear["verts"],
            cent=(0, 0, 0),
            matrix=Euler((y_sign * math.radians(-12), math.radians(-16), 0)).to_matrix(),
        )
        bmesh.ops.translate(bm, verts=ear["verts"], vec=(0.36, y_sign * 0.048, 0.78))
    return bm


# ---------------------------------------------------------------------------------------
# 2. Warhorse Neck & Crinet Armor
# ---------------------------------------------------------------------------------------
def build_horse_neck_bmesh():
    """Muscular arched warhorse neck lofted from chest to poll."""
    bm = bmesh.new()
    thetas = [2 * math.pi * k / 14 for k in range(14)]
    rings = []

    neck_stations = [
        # Base at chest
        (Vector((0.22, 0.0, 0.46)), 0.130, 0.140),
        # Mid neck with arched dorsal crest
        (Vector((0.28, 0.0, 0.56)), 0.110, 0.130),
        # Upper neck approaching poll
        (Vector((0.34, 0.0, 0.67)), 0.090, 0.110),
    ]

    for centre, ra, rb in neck_stations:
        rings.append(make_ring(bm, centre, Y_AXIS, Z_AXIS, ra, rb, thetas, p=2.0))

    bridge_rings(bm, rings, closed_bottom=True, closed_top=True)
    return bm


def build_horse_crinet_bmesh():
    """Segmented steel neck armor (crinet) plates layered over the dorsal crest."""
    bm = bmesh.new()
    crinet_plates = [
        (Vector((0.25, 0.0, 0.58)), 0.118, 0.10, math.radians(-35)),
        (Vector((0.31, 0.0, 0.68)), 0.098, 0.09, math.radians(-32)),
        (Vector((0.36, 0.0, 0.75)), 0.082, 0.08, math.radians(-28)),
    ]

    for centre, width, length, rot_y in crinet_plates:
        plate = bmesh.ops.create_cube(bm, size=1.0)
        bmesh.ops.scale(bm, verts=plate["verts"], vec=(length, width, 0.024))
        bmesh.ops.rotate(bm, verts=plate["verts"], cent=(0, 0, 0), matrix=Euler((0, rot_y, 0)).to_matrix())
        bmesh.ops.translate(bm, verts=plate["verts"], vec=centre)

    return bm


# ---------------------------------------------------------------------------------------
# 3. Warhorse Body & Player-Colored Barding / Caparison
# ---------------------------------------------------------------------------------------
def build_horse_body_bmesh():
    """Barrel torso, muscular chest front, and rounded rump."""
    bm = bmesh.new()

    # Barrel torso
    body = bmesh.ops.create_cone(bm, segments=16, cap_ends=True, radius1=0.175, radius2=0.190, depth=0.62)
    bmesh.ops.rotate(bm, verts=body["verts"], cent=(0, 0, 0), matrix=Euler((0, math.radians(90), 0)).to_matrix())
    bmesh.ops.translate(bm, verts=body["verts"], vec=(0.0, 0.0, HORSE_BODY_Z))

    # Chest sphere
    chest = bmesh.ops.create_uvsphere(bm, u_segments=14, v_segments=10, radius=0.185)
    bmesh.ops.scale(bm, verts=chest["verts"], vec=(1.05, 0.95, 1.0))
    bmesh.ops.translate(bm, verts=chest["verts"], vec=(0.28, 0.0, HORSE_BODY_Z + 0.01))

    # Rump sphere
    rump = bmesh.ops.create_uvsphere(bm, u_segments=14, v_segments=10, radius=0.180)
    bmesh.ops.scale(bm, verts=rump["verts"], vec=(1.05, 0.95, 1.0))
    bmesh.ops.translate(bm, verts=rump["verts"], vec=(-0.28, 0.0, HORSE_BODY_Z + 0.02))

    return bm


def build_horse_barding_bmesh():
    """
    Player-colored barding / caparison draped over the warhorse:
      - Flank drapes hanging along both sides with flared hems
      - Front peytral drape covering horse chest
      - Crupper drape covering rump
    Dyed in player-specific team color (mats['team']).
    """
    bm = bmesh.new()

    # Main barding drape box enclosing the horse flank
    barding = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, verts=barding["verts"], vec=(0.72, 0.40, 0.32))
    bmesh.ops.translate(bm, verts=barding["verts"], vec=(0.0, 0.0, 0.36))

    # Chest peytral front drape
    peytral = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, verts=peytral["verts"], vec=(0.22, 0.38, 0.24))
    bmesh.ops.rotate(bm, verts=peytral["verts"], cent=(0, 0, 0), matrix=Euler((0, math.radians(-20), 0)).to_matrix())
    bmesh.ops.translate(bm, verts=peytral["verts"], vec=(0.30, 0.0, 0.40))

    # Haunch crupper rear drape
    crupper = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, verts=crupper["verts"], vec=(0.20, 0.39, 0.24))
    bmesh.ops.rotate(bm, verts=crupper["verts"], cent=(0, 0, 0), matrix=Euler((0, math.radians(18), 0)).to_matrix())
    bmesh.ops.translate(bm, verts=crupper["verts"], vec=(-0.30, 0.0, 0.41))

    return bm


def build_horse_leg_bmesh():
    """Articulated horse leg with knee, hock, cannon bone, fetlock, and hoof."""
    bm = bmesh.new()

    # Upper gaskin / thigh (z = 0 extending down to -0.22)
    thigh = bmesh.ops.create_cone(bm, segments=10, cap_ends=True, radius1=0.060, radius2=0.044, depth=0.24)
    bmesh.ops.translate(bm, verts=thigh["verts"], vec=(0.0, 0.0, -0.12))

    # Lower cannon bone (z = -0.22 down to -0.40)
    cannon = bmesh.ops.create_cone(bm, segments=10, cap_ends=True, radius1=0.042, radius2=0.034, depth=0.20)
    bmesh.ops.translate(bm, verts=cannon["verts"], vec=(0.0, 0.0, -0.32))

    # Hoof (z = -0.40 down to -0.44 => ground z = 0)
    hoof = bmesh.ops.create_cone(bm, segments=10, cap_ends=True, radius1=0.045, radius2=0.040, depth=0.06)
    bmesh.ops.translate(bm, verts=hoof["verts"], vec=(0.0, 0.0, -0.42))

    return bm


def build_horse_tail_bmesh():
    """Braided flowing horse tail."""
    bm = bmesh.new()
    tail = bmesh.ops.create_cone(bm, segments=8, cap_ends=True, radius1=0.045, radius2=0.015, depth=0.34)
    bmesh.ops.rotate(bm, verts=tail["verts"], cent=(0, 0, 0), matrix=Euler((0, math.radians(22), 0)).to_matrix())
    bmesh.ops.translate(bm, verts=tail["verts"], vec=(-0.05, 0.0, -0.12))
    return bm


def build_saddle_bmesh():
    """Medieval high-cantle war saddle with front pommel and rear cantle."""
    bm = bmesh.new()

    # Seat
    seat = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, verts=seat["verts"], vec=(0.28, 0.28, 0.10))
    bmesh.ops.translate(bm, verts=seat["verts"], vec=(0.02, 0.0, 0.55))

    # Rear Cantle
    cantle = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, verts=cantle["verts"], vec=(0.06, 0.26, 0.14))
    bmesh.ops.translate(bm, verts=cantle["verts"], vec=(-0.10, 0.0, 0.60))

    # Front Pommel
    pommel = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, verts=pommel["verts"], vec=(0.06, 0.24, 0.12))
    bmesh.ops.translate(bm, verts=pommel["verts"], vec=(0.14, 0.0, 0.58))

    # Stirrup straps on sides
    for y_sign in [1.0, -1.0]:
        strap = bmesh.ops.create_cube(bm, size=1.0)
        bmesh.ops.scale(bm, verts=strap["verts"], vec=(0.025, 0.015, 0.28))
        bmesh.ops.translate(bm, verts=strap["verts"], vec=(0.04, y_sign * 0.19, 0.42))

        # Stirrup iron
        iron = bmesh.ops.create_cube(bm, size=1.0)
        bmesh.ops.scale(bm, verts=iron["verts"], vec=(0.06, 0.03, 0.04))
        bmesh.ops.translate(bm, verts=iron["verts"], vec=(0.04, y_sign * 0.19, 0.26))

    return bm


# ---------------------------------------------------------------------------------------
# 4. Knight Rider Torso & Armor
# ---------------------------------------------------------------------------------------
def build_knight_torso_bmesh():
    """Full plate steel cuirass and gorget over chainmail."""
    bm = bmesh.new()
    cuirass = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, verts=cuirass["verts"], vec=(0.18, 0.26, 0.28))
    bmesh.ops.translate(bm, verts=cuirass["verts"], vec=(0.02, 0.0, 0.74))

    gorget = bmesh.ops.create_cone(bm, segments=12, cap_ends=True, radius1=0.09, radius2=0.08, depth=0.08)
    bmesh.ops.translate(bm, verts=gorget["verts"], vec=(0.02, 0.0, 0.90))
    return bm


def build_knight_tabard_bmesh():
    """Heraldic surcoat / tabard draped over knight cuirass in player-specific color."""
    bm = bmesh.new()
    tabard = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, verts=tabard["verts"], vec=(0.20, 0.24, 0.29))
    bmesh.ops.translate(bm, verts=tabard["verts"], vec=(0.02, 0.0, 0.74))
    return bm


def build_great_helm_bmesh():
    """Sugarloaf Great Helm with brass cross reinforcing visor slits."""
    bm = bmesh.new()

    # Pointed top dome
    dome = bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=12, radius=0.115)
    bmesh.ops.scale(bm, verts=dome["verts"], vec=(1.02, 1.0, 1.12))
    bmesh.ops.translate(bm, verts=dome["verts"], vec=(0.02, 0.0, 1.03))

    # Cylindrical helmet bucket
    bucket = bmesh.ops.create_cone(bm, segments=14, cap_ends=True, radius1=0.115, radius2=0.115, depth=0.14)
    bmesh.ops.translate(bm, verts=bucket["verts"], vec=(0.02, 0.0, 0.98))

    # Vision slit
    slit = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, verts=slit["verts"], vec=(0.02, 0.13, 0.016))
    bmesh.ops.translate(bm, verts=slit["verts"], vec=(0.13, 0.0, 1.02))

    # Brass cross reinforcement
    cross_v = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, verts=cross_v["verts"], vec=(0.012, 0.022, 0.16))
    bmesh.ops.translate(bm, verts=cross_v["verts"], vec=(0.132, 0.0, 1.01))

    cross_h = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, verts=cross_h["verts"], vec=(0.012, 0.14, 0.022))
    bmesh.ops.translate(bm, verts=cross_h["verts"], vec=(0.132, 0.0, 1.02))

    return bm


def build_mounted_leg_bmesh(y_sign):
    """Mounted knight leg in stirrup astride horse."""
    bm = bmesh.new()

    # Thigh angled forward and down
    thigh = bmesh.ops.create_cone(bm, segments=10, cap_ends=True, radius1=0.065, radius2=0.052, depth=0.26)
    bmesh.ops.rotate(
        bm,
        verts=thigh["verts"],
        cent=(0, 0, 0),
        matrix=Euler((y_sign * math.radians(35), math.radians(15), 0)).to_matrix(),
    )
    bmesh.ops.translate(bm, verts=thigh["verts"], vec=(0.08, y_sign * 0.18, 0.62))

    # Greave extending down to stirrup
    greave = bmesh.ops.create_cone(bm, segments=10, cap_ends=True, radius1=0.050, radius2=0.040, depth=0.24)
    bmesh.ops.rotate(bm, verts=greave["verts"], cent=(0, 0, 0), matrix=Euler((y_sign * math.radians(10), 0, 0)).to_matrix())
    bmesh.ops.translate(bm, verts=greave["verts"], vec=(0.14, y_sign * 0.19, 0.43))

    # Sabaton boot
    sabaton = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, verts=sabaton["verts"], vec=(0.08, 0.07, 0.08))
    bmesh.ops.translate(bm, verts=sabaton["verts"], vec=(0.17, y_sign * 0.19, 0.31))

    return bm


def build_pauldrons_bmesh():
    """Fluted steel shoulder pauldrons."""
    bm = bmesh.new()
    for y_sign in [1.0, -1.0]:
        p = bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=8, radius=0.085)
        bmesh.ops.scale(bm, verts=p["verts"], vec=(1.1, 0.9, 1.0))
        bmesh.ops.translate(bm, verts=p["verts"], vec=(0.02, y_sign * 0.18, 0.86))
    return bm


# ---------------------------------------------------------------------------------------
# 5. Knight Left Arm & Medieval Heater Shield (Player Team Colored!)
# ---------------------------------------------------------------------------------------
def build_knight_arm_l_bmesh():
    """Left arm holding horse reins / shield straps."""
    bm = bmesh.new()
    arm = bmesh.ops.create_cone(bm, segments=10, cap_ends=True, radius1=0.052, radius2=0.042, depth=0.26)
    bmesh.ops.rotate(
        bm,
        verts=arm["verts"],
        cent=(0, 0, 0),
        matrix=Euler((math.radians(-25), math.radians(35), 0)).to_matrix(),
    )
    bmesh.ops.translate(bm, verts=arm["verts"], vec=(0.12, 0.17, 0.75))

    # Hand holding reins
    hand = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, verts=hand["verts"], vec=(0.05, 0.05, 0.05))
    bmesh.ops.translate(bm, verts=hand["verts"], vec=(0.18, 0.12, 0.70))

    return bm


def build_knight_heater_shield_bmesh():
    """
    Curved medieval knight's heater shield displaying player's team colour.
    Curved along horizontal axis (wraps around arm), tapering down to a sharp point.
    Double-sided face mesh ensures visibility from both front and back.
    """
    bm = bmesh.new()

    # Stations from top rim (z = 0.18) down to pointed bottom (z = -0.24)
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

    # Skin front face of shield
    for i in range(len(rings) - 1):
        for k in range(len(rings[0]) - 1):
            bm.faces.new((rings[i][k], rings[i][k + 1], rings[i + 1][k + 1], rings[i + 1][k]))

    # Extrude back face with thickness 0.016m so shield is double-sided
    back_rings = []
    for ring in rings:
        bring_verts = []
        for v in ring:
            bring_verts.append(bm.verts.new(Vector((v.co.x - 0.016, v.co.y, v.co.z))))
        back_rings.append(bring_verts)

    for i in range(len(back_rings) - 1):
        for k in range(len(back_rings[0]) - 1):
            bm.faces.new((back_rings[i][k + 1], back_rings[i][k], back_rings[i + 1][k], back_rings[i + 1][k + 1]))

    # Edge perimeter quad walls
    n_pts = len(rings[0])
    for i in range(len(rings) - 1):
        # Left edge
        bm.faces.new((rings[i][0], back_rings[i][0], back_rings[i + 1][0], rings[i + 1][0]))
        # Right edge
        bm.faces.new((rings[i][n_pts - 1], rings[i + 1][n_pts - 1], back_rings[i + 1][n_pts - 1], back_rings[i][n_pts - 1]))

    # Top rim wall
    for k in range(n_pts - 1):
        bm.faces.new((rings[0][k + 1], rings[0][k], back_rings[0][k], back_rings[0][k + 1]))

    bm.normal_update()
    return bm


def build_shield_boss_bmesh():
    """Polished brass/steel dome boss with reinforcement cruciform arms."""
    bm = bmesh.new()

    # Central dome boss
    boss = bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=8, radius=1.0)
    bmesh.ops.scale(bm, verts=boss["verts"], vec=(0.026, 0.046, 0.046))
    bmesh.ops.translate(bm, verts=boss["verts"], vec=(0.045, 0.0, 0.020))

    # Cross arms
    arm_v = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, verts=arm_v["verts"], vec=(0.012, 0.024, 0.220))
    bmesh.ops.translate(bm, verts=arm_v["verts"], vec=(0.038, 0.0, 0.020))

    arm_h = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, verts=arm_h["verts"], vec=(0.012, 0.200, 0.024))
    bmesh.ops.translate(bm, verts=arm_h["verts"], vec=(0.038, 0.0, 0.020))

    return bm


def build_shield_rim_bmesh():
    """Riveted steel edge rim running around shield perimeter."""
    bm = bmesh.new()
    rim = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, verts=rim["verts"], vec=(0.022, 0.320, 0.018))
    bmesh.ops.translate(bm, verts=rim["verts"], vec=(0.036, 0.0, 0.175))
    return bm


# ---------------------------------------------------------------------------------------
# 6. Knight Right Arm & Heavy Flanged Mace
# ---------------------------------------------------------------------------------------
def build_knight_arm_r_bmesh():
    """Right arm raised holding the heavy flanged mace."""
    bm = bmesh.new()
    arm = bmesh.ops.create_cone(bm, segments=10, cap_ends=True, radius1=0.052, radius2=0.042, depth=0.26)
    bmesh.ops.rotate(
        bm,
        verts=arm["verts"],
        cent=(0, 0, 0),
        matrix=Euler((math.radians(20), math.radians(-35), 0)).to_matrix(),
    )
    bmesh.ops.translate(bm, verts=arm["verts"], vec=(0.08, -0.18, 0.80))
    return bm


def build_mace_haft_bmesh():
    """Reinforced hardwood mace haft."""
    bm = bmesh.new()
    haft = bmesh.ops.create_cone(bm, segments=10, cap_ends=True, radius1=0.018, radius2=0.020, depth=0.72)
    bmesh.ops.rotate(bm, verts=haft["verts"], cent=(0, 0, 0), matrix=Euler((0, math.radians(40), 0)).to_matrix())
    bmesh.ops.translate(bm, verts=haft["verts"], vec=(0.20, -0.22, 0.94))
    return bm


def build_mace_head_bmesh():
    """6 steel flanges and impact socket."""
    bm = bmesh.new()

    # Central core
    core = bmesh.ops.create_cone(bm, segments=12, cap_ends=True, radius1=0.038, radius2=0.034, depth=0.16)
    bmesh.ops.rotate(bm, verts=core["verts"], cent=(0, 0, 0), matrix=Euler((0, math.radians(40), 0)).to_matrix())
    bmesh.ops.translate(bm, verts=core["verts"], vec=(0.42, -0.22, 1.20))

    # 6 flanges
    for i in range(6):
        frot = math.radians(i * 60)
        flange = bmesh.ops.create_cube(bm, size=1.0)
        bmesh.ops.scale(bm, verts=flange["verts"], vec=(0.075, 0.014, 0.14))
        bmesh.ops.rotate(bm, verts=flange["verts"], cent=(0, 0, 0), matrix=Euler((frot, math.radians(40), 0)).to_matrix())
        bmesh.ops.translate(bm, verts=flange["verts"], vec=(0.42, -0.22, 1.20))

    return bm


def build_mace_spike_bmesh():
    """Piercing steel top spike."""
    bm = bmesh.new()
    spike = bmesh.ops.create_cone(bm, segments=8, cap_ends=True, radius1=0.020, radius2=0.002, depth=0.12)
    bmesh.ops.rotate(bm, verts=spike["verts"], cent=(0, 0, 0), matrix=Euler((0, math.radians(40), 0)).to_matrix())
    bmesh.ops.translate(bm, verts=spike["verts"], vec=(0.49, -0.22, 1.29))
    return bm


def build_mace_pommel_bmesh():
    """Counterweight pommel at mace base."""
    bm = bmesh.new()
    pommel = bmesh.ops.create_uvsphere(bm, u_segments=10, v_segments=8, radius=0.034)
    bmesh.ops.translate(bm, verts=pommel["verts"], vec=(-0.05, -0.22, 0.63))
    return bm


# ---------------------------------------------------------------------------------------
# Scene Assembly Function
# ---------------------------------------------------------------------------------------
def assemble_armored_knight(create_mesh_object, make_material):
    """
    Creates the complete higher-fidelity Armored Knight mounted on Warhorse
    in the current Blender scene and returns the rig hierarchy dictionary.
    """
    mats = {
        "armor": make_material("KnightArmor", (0.75, 0.78, 0.82, 1.0), metallic=0.88, roughness=0.28),
        "gear": make_material("KnightGear", (0.70, 0.72, 0.75, 1.0), metallic=0.72, roughness=0.40),
        "horse": make_material("WarhorseCoat", (0.26, 0.16, 0.10, 1.0), metallic=0.02, roughness=0.76),
        # Player-specific team color: used for horse barding, knight shield, and surcoat!
        "team": make_material("TeamColor", (0.22, 0.42, 0.78, 1.0), metallic=0.08, roughness=0.70),
        "brass": make_material("BurnishedBrass", (0.82, 0.65, 0.24, 1.0), metallic=0.85, roughness=0.32),
        "wood": make_material("AshWood", (0.46, 0.31, 0.16, 1.0), metallic=0.02, roughness=0.82),
        "dark_leather": make_material("DarkLeather", (0.18, 0.12, 0.08, 1.0), metallic=0.05, roughness=0.80),
    }

    # 1. Warhorse Root Body
    horse_root = create_mesh_object("Root", build_horse_body_bmesh(), mats["horse"])

    # Horse Barding / Caparison (Player team colored!)
    create_mesh_object("Horse_Barding", build_horse_barding_bmesh(), mats["team"], parent=horse_root)

    # Warhorse Neck & Crinet Armor
    neck_obj = create_mesh_object("Horse_Neck", build_horse_neck_bmesh(), mats["horse"], parent=horse_root)
    create_mesh_object("Horse_Crinet", build_horse_crinet_bmesh(), mats["armor"], parent=neck_obj)

    # Warhorse Head (Anatomical Equine Skull, facing forward and down!)
    head_obj = create_mesh_object("Horse_Head", build_horse_head_bmesh(), mats["horse"], parent=horse_root)
    create_mesh_object("Chamfron_Plate", build_horse_chamfron_bmesh(), mats["armor"], parent=head_obj)
    create_mesh_object("Horse_Ears", build_horse_ears_bmesh(), mats["horse"], parent=head_obj)

    # 4 Articulated Horse Legs
    leg_coords = [
        ("Front_L", HORSE_SHOULDER_X, HORSE_LEG_Y),
        ("Front_R", HORSE_SHOULDER_X, -HORSE_LEG_Y),
        ("Rear_L", HORSE_HIP_X, HORSE_LEG_Y),
        ("Rear_R", HORSE_HIP_X, -HORSE_LEG_Y),
    ]
    for leg_name, lx, ly in leg_coords:
        create_mesh_object(
            f"Horse_Leg_{leg_name}",
            build_horse_leg_bmesh(),
            mats["horse"],
            parent=horse_root,
            location=(lx, ly, HORSE_BODY_Z),
        )

    # Horse Tail
    create_mesh_object(
        "Horse_Tail",
        build_horse_tail_bmesh(),
        mats["dark_leather"],
        parent=horse_root,
        location=(-0.36, 0.0, HORSE_BODY_Z + 0.02),
    )

    # Saddle
    create_mesh_object("Saddle", build_saddle_bmesh(), mats["dark_leather"], parent=horse_root)

    # 2. Knight Rider (Seated in Saddle)
    torso_obj = create_mesh_object("Torso", build_knight_torso_bmesh(), mats["armor"], parent=horse_root)

    # Tabard / Surcoat (Player team colored!)
    create_mesh_object("Tabard_Team", build_knight_tabard_bmesh(), mats["team"], parent=torso_obj)

    # Great Helm
    create_mesh_object("Head", build_great_helm_bmesh(), mats["armor"], parent=torso_obj)

    # Mounted Legs
    create_mesh_object("Leg_L", build_mounted_leg_bmesh(1.0), mats["armor"], parent=torso_obj)
    create_mesh_object("Leg_R", build_mounted_leg_bmesh(-1.0), mats["armor"], parent=torso_obj)

    # Pauldrons
    create_mesh_object("Pauldrons", build_pauldrons_bmesh(), mats["armor"], parent=torso_obj)

    # Left Arm (Holding reins & carrying Heater Shield)
    arm_l_obj = create_mesh_object("Arm_L", build_knight_arm_l_bmesh(), mats["armor"], parent=torso_obj)

    # Medieval Heater Shield (Player team colored!)
    shield_obj = create_mesh_object(
        "Shield",
        build_knight_heater_shield_bmesh(),
        mats["team"],
        parent=arm_l_obj,
        location=(0.14, 0.12, 0.65),
        rotation=(math.radians(15), math.radians(28), math.radians(-12)),
    )
    create_mesh_object("Shield_Rim", build_shield_rim_bmesh(), mats["armor"], parent=shield_obj)
    create_mesh_object("Shield_Boss", build_shield_boss_bmesh(), mats["brass"], parent=shield_obj)

    # Right Arm (Holding heavy mace)
    arm_r_obj = create_mesh_object("Arm_R", build_knight_arm_r_bmesh(), mats["armor"], parent=torso_obj)

    # Flanged Mace
    mace_obj = create_mesh_object("Weapon", build_mace_haft_bmesh(), mats["wood"], parent=arm_r_obj)
    create_mesh_object("Weapon_Head", build_mace_head_bmesh(), mats["armor"], parent=mace_obj)
    create_mesh_object("Weapon_Spike", build_mace_spike_bmesh(), mats["armor"], parent=mace_obj)
    create_mesh_object("Weapon_Pommel", build_mace_pommel_bmesh(), mats["armor"], parent=mace_obj)

    return {
        "root": horse_root,
        "torso": torso_obj,
        "shield": shield_obj,
        "mace": mace_obj,
    }

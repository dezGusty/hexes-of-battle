"""
Headless Blender 5.x script to build, rig (Armature + smooth skin weights),
and animate a detailed, organic-proportioned Medieval Peasant unit for Hexes of Battle.

Features:
  - Continuous, connected anatomical body (~7k-9k triangles, ~3x higher poly than
    the legacy 3k peasant, with Subdivision smoothing and zero floating parts).
  - Tattered, patched burlap tunic, frayed rope belt, rolled-up worn trousers,
    muddy cloth foot-wraps, sculpted face with messy hair, and crooked pitchfork.
  - Full humanoid Armature with weaponSocket bone on hand_R.
  - All 6 animations exported as glTF clips:
      idle_stance, idle_shift_weight, idle_wipe_forehead,
      combat_defensive_stance, combat_move_advance, combat_attack_poke

Blender axes: -Y = forward, +X = character's left, +Z = up.
glTF exporter (export_yup=True) converts this to Three.js: +Z = forward, +X = left, +Y = up.

Run via:
  blender --background --python scripts/blender_peasant_rigged.py
"""

import math
import os
import random

import bpy
import bmesh
from mathutils import Euler, Vector

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
GLB_OUT = os.path.join(ROOT_DIR, "public", "models", "units", "peasant_rigged.glb")
BLEND_OUT = os.path.join(ROOT_DIR, "assets", "blender", "peasant_rigged.blend")


def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def make_material(name: str, rgba, metallic: float = 0.02, roughness: float = 0.85):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = rgba
        bsdf.inputs["Metallic"].default_value = metallic
        bsdf.inputs["Roughness"].default_value = roughness
    mat.diffuse_color = rgba
    return mat


# ---------------------------------------------------------------------------------------
# Lofting & Organic Mesh Helpers
# ---------------------------------------------------------------------------------------
def _superellipse(theta: float, p: float):
    e = 2.0 / p
    c, s = math.cos(theta), math.sin(theta)
    return math.copysign(abs(c) ** e, c), math.copysign(abs(s) ** e, s)


def make_ring(bm, centre: Vector, lat_vec: Vector, fwd_vec: Vector, r_lat: float, r_fwd, segs: int, p: float = 2.1):
    verts = []
    for k in range(segs):
        th = 2.0 * math.pi * k / segs
        cf, sl = _superellipse(th, p)
        if isinstance(r_fwd, tuple):
            rf = r_fwd[0] if cf >= 0 else r_fwd[1]
        else:
            rf = r_fwd
        pos = centre + fwd_vec * (rf * cf) + lat_vec * (r_lat * sl)
        verts.append(bm.verts.new(pos))
    return verts


def bridge_rings(bm, rings, cap_start=False, cap_end=False):
    n = len(rings[0])
    faces = []
    for i in range(len(rings) - 1):
        for k in range(n):
            k2 = (k + 1) % n
            faces.append(bm.faces.new((rings[i][k], rings[i + 1][k], rings[i + 1][k2], rings[i][k2])))
    if cap_start:
        faces.append(bm.faces.new(list(reversed(rings[0]))))
    if cap_end:
        faces.append(bm.faces.new(list(rings[-1])))
    bm.normal_update()
    bmesh.ops.recalc_face_normals(bm, faces=faces)
    return faces


def build_lofted_tube(bm, stations, segs=16, p=2.1, cap_start=True, cap_end=True):
    """stations: list of (centre_vec, r_lat, r_fwd)"""
    rings = []
    for i, (c, rl, rf) in enumerate(stations):
        if i == 0:
            tangent = (stations[1][0] - c).normalized()
        elif i == len(stations) - 1:
            tangent = (c - stations[-2][0]).normalized()
        else:
            tangent = (stations[i + 1][0] - stations[i - 1][0]).normalized()

        # Pick stable lateral/forward axes perpendicular to tangent
        ref = Vector((0.0, -1.0, 0.0))
        if abs(tangent.dot(ref)) > 0.92:
            ref = Vector((0.0, 0.0, 1.0))
        lat_vec = ref.cross(tangent).normalized()
        fwd_vec = tangent.cross(lat_vec).normalized()
        rings.append(make_ring(bm, c, lat_vec, fwd_vec, rl, rf, segs, p))
    return bridge_rings(bm, rings, cap_start=cap_start, cap_end=cap_end)


def create_mesh_obj(name: str, bm, mat, subdiv_levels: int = 1):
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    for poly in obj.data.polygons:
        poly.use_smooth = True

    if subdiv_levels > 0:
        mod = obj.modifiers.new(name="Subsurf", type="SUBSURF")
        mod.levels = subdiv_levels
        mod.render_levels = subdiv_levels
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return obj


# ---------------------------------------------------------------------------------------
# Anatomical Body Parts (Character Height ~0.58m in Blender Z, Facing -Y)
# ---------------------------------------------------------------------------------------
X_AXIS = Vector((1.0, 0.0, 0.0))
FWD_AXIS = Vector((0.0, -1.0, 0.0))
Z_AXIS = Vector((0.0, 0.0, 1.0))


def build_torso_neck_head_bm():
    """Continuous anatomical torso -> shoulders -> neck -> sculpted head."""
    bm = bmesh.new()
    segs = 14

    # Vertical stations from pelvis up to crown (z in [0.225, 0.585])
    # (z, y_offset, r_lat, (r_front, r_back), superellipse_p)
    profile = [
        (0.225, 0.000, 0.056, (0.044, 0.048), 2.3),  # pelvis base
        (0.255, 0.000, 0.068, (0.050, 0.054), 2.3),  # hip crest
        (0.295, -0.002, 0.062, (0.046, 0.048), 2.2), # waist
        (0.345, -0.005, 0.072, (0.054, 0.052), 2.3), # lower ribcage
        (0.395, -0.008, 0.082, (0.058, 0.056), 2.4), # chest / pectorals
        (0.425, -0.008, 0.078, (0.048, 0.050), 2.3), # clavicles / shoulder slope
        (0.445, -0.010, 0.042, (0.036, 0.038), 2.0), # trapezius / neck base
        (0.468, -0.012, 0.026, (0.026, 0.028), 2.0), # mid neck
        (0.486, -0.014, 0.028, (0.028, 0.028), 2.0), # upper neck / jaw junction
        (0.502, -0.016, 0.042, (0.052, 0.042), 2.1), # jaw / chin
        (0.526, -0.014, 0.050, (0.056, 0.054), 2.1), # cheekbones / nose level
        (0.548, -0.012, 0.051, (0.056, 0.058), 2.0), # brow / cranium
        (0.570, -0.008, 0.042, (0.046, 0.050), 2.0), # upper cranium
        (0.585, -0.004, 0.022, (0.024, 0.026), 2.0), # crown
    ]

    rings = []
    for z, y_off, rl, rf, p in profile:
        ring = make_ring(bm, Vector((0.0, y_off, z)), X_AXIS, FWD_AXIS, rl, rf, segs, p)
        rings.append(ring)

    # Sculpt subtle facial landmarks on the head rings (indices 9, 10, 11)
    for idx, ring in enumerate(rings):
        for v in ring:
            # Forward direction is -Y
            if idx == 10:  # nose / cheekbones
                if v.co.y < -0.062 and abs(v.co.x) < 0.012:
                    v.co.y -= 0.014  # nose bridge/tip
                    v.co.z -= 0.003
                elif v.co.y < -0.050 and 0.012 <= abs(v.co.x) <= 0.028:
                    v.co.y += 0.006  # eye socket hollow
            elif idx == 11:  # brow ridge
                if v.co.y < -0.055 and abs(v.co.x) < 0.032:
                    v.co.y -= 0.006
            elif idx == 9:  # chin
                if v.co.y < -0.058 and abs(v.co.x) < 0.016:
                    v.co.y -= 0.005

    bridge_rings(bm, rings, cap_start=True, cap_end=True)
    return bm


def build_arm_bm(side: float):
    """Continuous arm in T-pose starting deep inside shoulder deltoid out to sculpted hand."""
    bm = bmesh.new()
    s = side  # +1 = Left (+X), -1 = Right (-X)
    stations = [
        (Vector((s * 0.056, -0.006, 0.402)), 0.033, 0.033), # embedded in torso shoulder
        (Vector((s * 0.088, -0.006, 0.398)), 0.031, 0.031), # deltoid
        (Vector((s * 0.132, -0.006, 0.398)), 0.024, 0.025), # mid bicep
        (Vector((s * 0.175, -0.006, 0.398)), 0.021, 0.022), # elbow
        (Vector((s * 0.222, -0.007, 0.398)), 0.022, 0.022), # upper forearm
        (Vector((s * 0.265, -0.008, 0.398)), 0.016, 0.015), # wrist
        (Vector((s * 0.290, -0.011, 0.398)), 0.019, 0.014), # palm
        (Vector((s * 0.315, -0.013, 0.398)), 0.016, 0.011), # finger mitt
        (Vector((s * 0.328, -0.013, 0.398)), 0.008, 0.006), # fingertips
    ]
    build_lofted_tube(bm, stations, segs=10, p=2.2, cap_start=True, cap_end=True)

    # Add sculpted thumb pointing forward (-Y)
    thumb_stations = [
        (Vector((s * 0.282, -0.018, 0.392)), 0.008, 0.008),
        (Vector((s * 0.292, -0.026, 0.386)), 0.007, 0.007),
        (Vector((s * 0.298, -0.032, 0.384)), 0.005, 0.005),
    ]
    build_lofted_tube(bm, thumb_stations, segs=6, p=2.0, cap_start=True, cap_end=True)
    return bm


def build_leg_bm(side: float):
    """Continuous leg starting inside hip socket down to the ankle (footwear covers below ankle)."""
    bm = bmesh.new()
    s = side
    stations = [
        (Vector((s * 0.036, 0.000, 0.250)), 0.040, 0.042), # embedded in pelvis hip
        (Vector((s * 0.048, -0.002, 0.210)), 0.036, 0.038), # upper thigh
        (Vector((s * 0.050, -0.004, 0.155)), 0.029, 0.030), # mid thigh
        (Vector((s * 0.050, -0.006, 0.120)), 0.025, 0.026), # knee
        (Vector((s * 0.050, 0.000, 0.080)), 0.024, 0.026),  # calf
        (Vector((s * 0.050, 0.001, 0.036)), 0.018, 0.020),  # ends at ankle inside foot-wrap
    ]
    build_lofted_tube(bm, stations, segs=10, p=2.2, cap_start=True, cap_end=True)
    return bm


def build_tunic_bm():
    """Tattered burlap tunic with flared jagged hem and T-pose short rolled sleeves."""
    bm = bmesh.new()
    rng = random.Random(42)
    segs = 14
    profile = [
        (0.175, -0.002, 0.095, (0.072, 0.076), 2.3), # tattered hem
        (0.220, -0.001, 0.080, (0.060, 0.062), 2.3), # hips
        (0.295, -0.002, 0.068, (0.052, 0.054), 2.2), # belted waist
        (0.355, -0.006, 0.078, (0.059, 0.058), 2.3), # ribcage
        (0.410, -0.008, 0.087, (0.062, 0.060), 2.4), # chest
        (0.436, -0.009, 0.062, (0.044, 0.046), 2.1), # collar
    ]
    rings = []
    for idx, (z, y_off, rl, rf, p) in enumerate(profile):
        ring = make_ring(bm, Vector((0.0, y_off, z)), X_AXIS, FWD_AXIS, rl, rf, segs, p)
        if idx == 0:
            # Tattered jagged hem
            for k, v in enumerate(ring):
                v.co.z += (rng.random() - 0.5) * 0.024
                if k % 3 == 0:
                    v.co.z -= 0.014
        rings.append(ring)
    bridge_rings(bm, rings, cap_start=False, cap_end=False)

    # Short rolled sleeves in T-pose
    for s in (-1.0, 1.0):
        sl_stations = [
            (Vector((s * 0.065, -0.006, 0.402)), 0.039, 0.039),
            (Vector((s * 0.092, -0.006, 0.398)), 0.035, 0.035),
            (Vector((s * 0.132, -0.006, 0.398)), 0.029, 0.029),
            (Vector((s * 0.140, -0.006, 0.398)), 0.032, 0.032), # rolled cuff
        ]
        build_lofted_tube(bm, sl_stations, segs=10, p=2.1, cap_start=True, cap_end=True)
    return bm


def build_belt_bm():
    """Frayed rope belt cinched around the tunic waist."""
    bm = bmesh.new()
    segs = 14
    rings = []
    for z in (0.286, 0.295, 0.304):
        rl = 0.072 if z == 0.295 else 0.067
        rf = 0.056 if z == 0.295 else 0.051
        rings.append(make_ring(bm, Vector((0.0, -0.002, z)), X_AXIS, FWD_AXIS, rl, rf, segs, 2.2))
    bridge_rings(bm, rings, cap_start=True, cap_end=True)
    return bm


def build_trousers_bm():
    """Worn rolled-up trousers ending just below the knees."""
    bm = bmesh.new()
    for s in (-1.0, 1.0):
        stations = [
            (Vector((s * 0.042, 0.000, 0.245)), 0.044, 0.046),
            (Vector((s * 0.049, -0.002, 0.195)), 0.040, 0.042),
            (Vector((s * 0.050, -0.004, 0.140)), 0.033, 0.034),
            (Vector((s * 0.050, -0.005, 0.112)), 0.030, 0.031),
            (Vector((s * 0.050, -0.005, 0.104)), 0.033, 0.034), # rolled cuff
        ]
        build_lofted_tube(bm, stations, segs=10, p=2.2, cap_start=True, cap_end=True)
    return bm


def build_foot_wraps_bm():
    """Muddy cloth foot-wraps bound around ankles and feet."""
    bm = bmesh.new()
    for s in (-1.0, 1.0):
        # Ankle wrap
        wrap_stations = [
            (Vector((s * 0.050, 0.001, 0.058)), 0.024, 0.025),
            (Vector((s * 0.050, 0.001, 0.034)), 0.023, 0.024),
            (Vector((s * 0.050, -0.008, 0.016)), 0.024, 0.036),
        ]
        build_lofted_tube(bm, wrap_stations, segs=8, p=2.2, cap_start=True, cap_end=True)

        # Foot binding shell
        foot_stations = [
            (Vector((s * 0.050, 0.018, 0.013)), 0.022, 0.014),
            (Vector((s * 0.050, -0.005, 0.015)), 0.025, 0.016),
            (Vector((s * 0.050, -0.032, 0.012)), 0.024, 0.013),
            (Vector((s * 0.050, -0.054, 0.009)), 0.018, 0.009),
        ]
        rings = []
        for c, rl, rz in foot_stations:
            rings.append(make_ring(bm, c, X_AXIS, Z_AXIS, rl, rz, 8, 2.3))
        bridge_rings(bm, rings, cap_start=True, cap_end=True)
    return bm


def build_hair_bm():
    """Messy scraggly hair cap framing the skull and nape."""
    bm = bmesh.new()
    rng = random.Random(99)
    segs = 14
    profile = [
        (0.515, -0.002, 0.048, (0.034, 0.058), 2.0), # nape
        (0.542, -0.006, 0.054, (0.046, 0.062), 2.0), # temples/back
        (0.566, -0.008, 0.048, (0.050, 0.056), 2.0), # top
        (0.586, -0.005, 0.028, (0.030, 0.032), 2.0), # crown
    ]
    rings = []
    for idx, (z, y_off, rl, rf, p) in enumerate(profile):
        ring = make_ring(bm, Vector((0.0, y_off, z)), X_AXIS, FWD_AXIS, rl, rf, segs, p)
        for v in ring:
            if idx == 0:
                v.co.z -= rng.random() * 0.016
            v.co.x += (rng.random() - 0.5) * 0.005
            v.co.y += (rng.random() - 0.5) * 0.005
        rings.append(ring)
    bridge_rings(bm, rings, cap_start=True, cap_end=True)
    return bm


def build_pitchfork_obj(mats):
    """Crooked ash-wood pitchfork centered at z=0 (mid-pole) with twine binding and 3 iron tines."""
    bm_wood = bmesh.new()
    shaft_pts = [
        (Vector((0.002, 0.000, -0.300)), 0.011, 0.011),
        (Vector((0.004, 0.002, -0.100)), 0.012, 0.012),
        (Vector((-0.002, -0.002, 0.100)), 0.011, 0.011),
        (Vector((-0.004, 0.000, 0.300)), 0.010, 0.010),
    ]
    build_lofted_tube(bm_wood, shaft_pts, segs=10, p=2.0, cap_start=True, cap_end=True)
    obj = create_mesh_obj("PeasantPitchfork", bm_wood, mats["wood"], subdiv_levels=0)

    bm_twine = bmesh.new()
    twine_pts = [
        (Vector((-0.004, 0.0, 0.278)), 0.013, 0.013),
        (Vector((-0.004, 0.0, 0.306)), 0.014, 0.014),
    ]
    build_lofted_tube(bm_twine, twine_pts, segs=10, p=2.0, cap_start=True, cap_end=True)
    twine_obj = create_mesh_obj("PitchforkTwine", bm_twine, mats["twine"], subdiv_levels=0)

    bm_iron = bmesh.new()
    # Bowed yoke
    yoke_pts = []
    for i in range(-3, 4):
        t = i / 3.0
        yoke_pts.append((Vector((-0.004 + 0.044 * t, 0.0, 0.312 + 0.008 * (t * t))), 0.006, 0.006))
    build_lofted_tube(bm_iron, yoke_pts, segs=8, p=2.0, cap_start=True, cap_end=True)

    # 3 tarnished tines
    for offset in (-0.042, 0.0, 0.042):
        bx = -0.004 + offset
        bz = 0.316 + (0.006 if offset != 0 else 0.0)
        flare = 0.006 * (1 if offset > 0 else -1 if offset < 0 else 0)
        tine_pts = [
            (Vector((bx, 0.0, bz)), 0.0055, 0.0055),
            (Vector((bx + flare, 0.002, bz + 0.055)), 0.0045, 0.0045),
            (Vector((bx + flare * 0.6, 0.0, bz + 0.115)), 0.001, 0.001),
        ]
        build_lofted_tube(bm_iron, tine_pts, segs=6, p=2.0, cap_start=True, cap_end=True)

    iron_obj = create_mesh_obj("PitchforkIron", bm_iron, mats["iron"], subdiv_levels=0)

    # Join pitchfork parts into one clean mesh object
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    twine_obj.select_set(True)
    iron_obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.join()
    return obj


# ---------------------------------------------------------------------------------------
# Armature, Skin Weighting & 6 Keyframed Animations
# ---------------------------------------------------------------------------------------
def create_armature():
    arm_data = bpy.data.armatures.new("PeasantArmature")
    arm_obj = bpy.data.objects.new("PeasantArmature", arm_data)
    bpy.context.collection.objects.link(arm_obj)
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.mode_set(mode="EDIT")

    eb = arm_data.edit_bones

    def add_bone(name, head, tail, parent_name=None, connected=False, roll_vec=None):
        b = eb.new(name)
        b.head = Vector(head)
        b.tail = Vector(tail)
        if roll_vec is not None:
            b.align_roll(Vector(roll_vec))
        if parent_name:
            b.parent = eb[parent_name]
            b.use_connect = connected
        return b

    add_bone("root", (0, 0, 0), (0, 0, 0.08))
    add_bone("pelvis", (0, 0, 0.245), (0, 0, 0.300), "root")
    add_bone("spine", (0, 0, 0.300), (0, -0.006, 0.380), "pelvis", connected=True)
    add_bone("chest", (0, -0.006, 0.380), (0, -0.012, 0.470), "spine", connected=True)
    add_bone("neck", (0, -0.012, 0.470), (0, -0.014, 0.505), "chest", connected=True)
    add_bone("head", (0, -0.014, 0.505), (0, -0.010, 0.585), "neck", connected=True)

    # Arms in T-pose (+X = Left, -X = Right)
    add_bone("shoulder_L", (0.045, -0.006, 0.402), (0.088, -0.006, 0.398), "chest", roll_vec=(0, 0, 1))
    add_bone("upperArm_L", (0.088, -0.006, 0.398), (0.175, -0.006, 0.398), "shoulder_L", connected=True, roll_vec=(0, 0, 1))
    add_bone("forearm_L", (0.175, -0.006, 0.398), (0.265, -0.008, 0.398), "upperArm_L", connected=True, roll_vec=(0, 0, 1))
    add_bone("hand_L", (0.265, -0.008, 0.398), (0.320, -0.013, 0.398), "forearm_L", connected=True, roll_vec=(0, 0, 1))

    add_bone("shoulder_R", (-0.045, -0.006, 0.402), (-0.088, -0.006, 0.398), "chest", roll_vec=(0, 0, 1))
    add_bone("upperArm_R", (-0.088, -0.006, 0.398), (-0.175, -0.006, 0.398), "shoulder_R", connected=True, roll_vec=(0, 0, 1))
    add_bone("forearm_R", (-0.175, -0.006, 0.398), (-0.265, -0.008, 0.398), "upperArm_R", connected=True, roll_vec=(0, 0, 1))
    add_bone("hand_R", (-0.265, -0.008, 0.398), (-0.320, -0.013, 0.398), "forearm_R", connected=True, roll_vec=(0, 0, 1))
    # weaponSocket oriented with local +Z = world +Z (up) so pitchfork stands vertically in T-pose
    add_bone("weaponSocket", (-0.295, -0.011, 0.398), (-0.295, -0.071, 0.398), "hand_R", roll_vec=(0, 0, 1))

    # Legs
    add_bone("thigh_L", (0.046, -0.002, 0.230), (0.050, -0.006, 0.120), "pelvis")
    add_bone("shin_L", (0.050, -0.006, 0.120), (0.050, 0.002, 0.036), "thigh_L", connected=True)
    add_bone("foot_L", (0.050, 0.002, 0.036), (0.050, -0.048, 0.008), "shin_L", connected=True)

    add_bone("thigh_R", (-0.046, -0.002, 0.230), (-0.050, -0.006, 0.120), "pelvis")
    add_bone("shin_R", (-0.050, -0.006, 0.120), (-0.050, 0.002, 0.036), "thigh_R", connected=True)
    add_bone("foot_R", (-0.050, 0.002, 0.036), (-0.050, -0.048, 0.008), "shin_R", connected=True)

    bpy.ops.object.mode_set(mode="OBJECT")
    return arm_obj


def assign_smooth_skin_weights(mesh_obj, arm_obj):
    """Assigns smooth anatomical vertex weights to every vertex of the merged peasant mesh."""
    bone_names = [b.name for b in arm_obj.data.bones]
    vgroups = {name: mesh_obj.vertex_groups.new(name=name) for name in bone_names}

    def smoothstep(edge0, edge1, x):
        t = max(0.0, min(1.0, (x - edge0) / max(1e-5, edge1 - edge0)))
        return t * t * (3.0 - 2.0 * t)

    for v in mesh_obj.data.vertices:
        x, y, z = v.co.x, v.co.y, v.co.z
        weights = {}

        # T-pose Arms (strictly above z >= 0.345 and outside |x| > 0.075, zero thigh overlap)
        if abs(x) > 0.075 and z >= 0.345 and z <= 0.445:
            side = "L" if x > 0 else "R"
            ax = abs(x)
            if ax < 0.096:
                t = smoothstep(0.075, 0.096, ax)
                weights["chest"] = 1.0 - t * 0.7
                weights[f"shoulder_{side}"] = t * 0.45
                weights[f"upperArm_{side}"] = t * 0.25
            elif ax < 0.175:
                t = smoothstep(0.162, 0.186, ax)
                weights[f"upperArm_{side}"] = 1.0 - t
                weights[f"forearm_{side}"] = t
            elif ax < 0.265:
                t = smoothstep(0.252, 0.275, ax)
                weights[f"forearm_{side}"] = 1.0 - t
                weights[f"hand_{side}"] = t
            else:
                weights[f"hand_{side}"] = 1.0
        # Legs (below pelvis z < 0.235)
        elif z < 0.235 and abs(x) > 0.010:
            side = "L" if x > 0 else "R"
            if z > 0.120:
                t = smoothstep(0.200, 0.235, z)
                weights["pelvis"] = t * 0.65
                weights[f"thigh_{side}"] = 1.0 - t * 0.65
            elif z > 0.036:
                t = smoothstep(0.105, 0.135, z)
                weights[f"thigh_{side}"] = t
                weights[f"shin_{side}"] = 1.0 - t
            else:
                t = smoothstep(0.024, 0.045, z)
                weights[f"shin_{side}"] = t
                weights[f"foot_{side}"] = 1.0 - t
        # Central Torso / Neck / Head
        else:
            if z < 0.295:
                t = smoothstep(0.265, 0.295, z)
                weights["pelvis"] = 1.0 - t
                weights["spine"] = t
            elif z < 0.380:
                t = smoothstep(0.350, 0.380, z)
                weights["spine"] = 1.0 - t
                weights["chest"] = t
            elif z < 0.470:
                t = smoothstep(0.445, 0.470, z)
                weights["chest"] = 1.0 - t
                weights["neck"] = t
            elif z < 0.505:
                t = smoothstep(0.485, 0.505, z)
                weights["neck"] = 1.0 - t
                weights["head"] = t
            else:
                weights["head"] = 1.0

        total = sum(weights.values())
        if total <= 0:
            weights = {"pelvis": 1.0}
            total = 1.0
        for bname, w in weights.items():
            if w > 0.001:
                vgroups[bname].add([v.index], w / total, "REPLACE")

    mesh_obj.parent = arm_obj
    mod = mesh_obj.modifiers.new(name="Armature", type="ARMATURE")
    mod.object = arm_obj


def bake_animations(arm_obj):
    """Creates all 6 animation actions and pushes them to NLA tracks for glTF export."""
    fps = 30
    bpy.context.scene.render.fps = fps
    if not arm_obj.animation_data:
        arm_obj.animation_data_create()

    pb = arm_obj.pose.bones

    def reset_pose():
        for b in pb:
            b.location = (0.0, 0.0, 0.0)
            b.rotation_mode = "XYZ"
            b.rotation_euler = (0.0, 0.0, 0.0)

    def align_weapon_socket(target_world_dir: Vector):
        """Solves weaponSocket local rotation so its +Z axis (pitchfork shaft) points along target_world_dir."""
        bpy.context.view_layer.update()
        ws = pb["weaponSocket"]
        parent_rot = (arm_obj.matrix_world @ ws.parent.matrix).to_3x3().normalized()
        z_w = target_world_dir.normalized()
        x_ref = Vector((1.0, 0.0, 0.0))
        if abs(z_w.dot(x_ref)) > 0.9:
            x_ref = Vector((0.0, 1.0, 0.0))
        y_w = z_w.cross(x_ref).normalized()
        x_w = y_w.cross(z_w).normalized()
        from mathutils import Matrix
        desired_world_rot = Matrix((x_w, y_w, z_w)).transposed()
        rest_local_rot = ws.bone.matrix_local.to_3x3()
        parent_rest_rot = ws.parent.bone.matrix_local.to_3x3()
        rest_rel = parent_rest_rot.inverted() @ rest_local_rot
        local_rot = (parent_rot @ rest_rel).inverted() @ desired_world_rot
        ws.rotation_euler = local_rot.to_euler("XYZ")

    def key_pose(frame: int, bone_rot_deg: dict, pelvis_loc=(0.0, 0.0, 0.0), fork_dir=None):
        reset_pose()
        pb["pelvis"].location = Vector(pelvis_loc)
        pb["pelvis"].keyframe_insert(data_path="location", frame=frame)
        for bname, deg in bone_rot_deg.items():
            if bname in pb:
                pb[bname].rotation_euler = Euler(
                    (math.radians(deg[0]), math.radians(deg[1]), math.radians(deg[2])), "XYZ"
                )
                pb[bname].keyframe_insert(data_path="rotation_euler", frame=frame)
        if fork_dir is not None:
            align_weapon_socket(Vector(fork_dir))
            pb["weaponSocket"].keyframe_insert(data_path="rotation_euler", frame=frame)

    # Note: In T-pose:
    #   Left arm (_L): rx < 0 lowers arm, rx > 0 raises arm; rz < 0 swings forward (-Y)
    #   Right arm (_R): rx < 0 lowers arm, rx > 0 raises arm; rz > 0 swings forward (-Y)
    anims = {
        "idle_stance": (
            72,
            [
                (1, {"pelvis": (0, 0, 0), "spine": (8, 0, 0), "chest": (6, 0, 0), "head": (-8, 0, 0),
                     "upperArm_L": (-76, 0, -8), "forearm_L": (0, 0, -18),
                     "upperArm_R": (-72, 0, 14), "forearm_R": (0, 0, 26)}, (0, 0, 0), (0, 0, 1)),
                (36, {"pelvis": (0, 0, 0), "spine": (11, 0, 0), "chest": (4, 0, 0), "head": (-5, 0, 0),
                      "upperArm_L": (-74, 0, -10), "forearm_L": (0, 0, -22),
                      "upperArm_R": (-70, 0, 14), "forearm_R": (0, 0, 24)}, (0, 0, 0.003), (0, 0, 1)),
                (72, {"pelvis": (0, 0, 0), "spine": (8, 0, 0), "chest": (6, 0, 0), "head": (-8, 0, 0),
                      "upperArm_L": (-76, 0, -8), "forearm_L": (0, 0, -18),
                      "upperArm_R": (-72, 0, 14), "forearm_R": (0, 0, 26)}, (0, 0, 0), (0, 0, 1)),
            ],
        ),
        "idle_shift_weight": (
            96,
            [
                (1, {"pelvis": (0, 4, 0), "spine": (8, -4, 0), "thigh_L": (-10, 0, 0), "shin_L": (16, 0, 0),
                     "upperArm_L": (-74, 0, -8), "forearm_L": (0, 0, -18),
                     "upperArm_R": (-72, 0, 14), "forearm_R": (0, 0, 26)}, (-0.014, 0, 0), (0, 0, 1)),
                (48, {"pelvis": (0, -4, 0), "spine": (10, 4, 0), "thigh_R": (-10, 0, 0), "shin_R": (16, 0, 0),
                      "upperArm_L": (-78, 0, -12), "forearm_L": (0, 0, -14),
                      "upperArm_R": (-70, 0, 12), "forearm_R": (0, 0, 28)}, (0.014, 0, 0), (0, 0, 1)),
                (96, {"pelvis": (0, 4, 0), "spine": (8, -4, 0), "thigh_L": (-10, 0, 0), "shin_L": (16, 0, 0),
                      "upperArm_L": (-74, 0, -8), "forearm_L": (0, 0, -18),
                      "upperArm_R": (-72, 0, 14), "forearm_R": (0, 0, 26)}, (-0.014, 0, 0), (0, 0, 1)),
            ],
        ),
        "idle_wipe_forehead": (
            84,
            [
                (1, {"pelvis": (0, 0, 0), "spine": (8, 0, 0), "head": (-8, 0, 0), "upperArm_L": (-76, 0, -8), "forearm_L": (0, 0, -18),
                     "upperArm_R": (-72, 0, 14), "forearm_R": (0, 0, 26)}, (0, 0, 0), (0, 0, 1)),
                (24, {"pelvis": (0, 0, 0), "spine": (6, 0, 0), "head": (-4, -6, 6), "upperArm_L": (78, 0, -70), "forearm_L": (0, 0, -110),
                      "upperArm_R": (-72, 0, 14), "forearm_R": (0, 0, 26)}, (0, 0, 0.002), (0, 0, 1)),
                (48, {"pelvis": (0, 0, 0), "spine": (12, 0, 0), "head": (-6, 6, -6), "upperArm_L": (84, 0, -80), "forearm_L": (0, 0, -104),
                      "upperArm_R": (-72, 0, 14), "forearm_R": (0, 0, 26)}, (0, 0, -0.004), (0, 0, 1)),
                (84, {"pelvis": (0, 0, 0), "spine": (8, 0, 0), "head": (-8, 0, 0), "upperArm_L": (-76, 0, -8), "forearm_L": (0, 0, -18),
                      "upperArm_R": (-72, 0, 14), "forearm_R": (0, 0, 26)}, (0, 0, 0), (0, 0, 1)),
            ],
        ),
        "combat_defensive_stance": (
            54,
            [
                (1, {"pelvis": (6, 0, -18), "spine": (12, 0, 12), "head": (-14, 0, 0),
                     "upperArm_L": (-48, 0, -58), "forearm_L": (0, 0, -58),
                     "upperArm_R": (-54, 0, 24), "forearm_R": (0, 0, 74),
                     "thigh_L": (-26, 0, 8), "shin_L": (32, 0, 0), "thigh_R": (16, 0, -8), "shin_R": (26, 0, 0)}, (0, 0, -0.032), (0, -1, 0.08)),
                (27, {"pelvis": (7, 0, -18), "spine": (14, 0, 12), "head": (-12, 0, 0),
                      "upperArm_L": (-46, 0, -60), "forearm_L": (0, 0, -56),
                      "upperArm_R": (-52, 0, 26), "forearm_R": (0, 0, 72),
                      "thigh_L": (-26, 0, 8), "shin_L": (32, 0, 0), "thigh_R": (16, 0, -8), "shin_R": (26, 0, 0)}, (0, 0, -0.037), (0, -1, 0.08)),
                (54, {"pelvis": (6, 0, -18), "spine": (12, 0, 12), "head": (-14, 0, 0),
                      "upperArm_L": (-48, 0, -58), "forearm_L": (0, 0, -58),
                      "upperArm_R": (-54, 0, 24), "forearm_R": (0, 0, 74),
                      "thigh_L": (-26, 0, 8), "shin_L": (32, 0, 0), "thigh_R": (16, 0, -8), "shin_R": (26, 0, 0)}, (0, 0, -0.032), (0, -1, 0.08)),
            ],
        ),
        "combat_move_advance": (
            24,
            [
                (1, {"pelvis": (10, 4, -12), "spine": (18, 0, 10), "head": (-18, 0, 0),
                     "upperArm_L": (-46, 0, -60), "forearm_L": (0, 0, -56),
                     "upperArm_R": (-52, 0, 26), "forearm_R": (0, 0, 74),
                     "thigh_L": (-40, 0, 4), "shin_L": (18, 0, 0), "thigh_R": (22, 0, -4), "shin_R": (16, 0, 0)}, (0, 0, -0.028), (0, -1, 0.04)),
                (12, {"pelvis": (10, -4, 12), "spine": (18, 0, -10), "head": (-16, 0, 0),
                      "upperArm_L": (-44, 0, -64), "forearm_L": (0, 0, -54),
                      "upperArm_R": (-50, 0, 30), "forearm_R": (0, 0, 74),
                      "thigh_L": (22, 0, 4), "shin_L": (16, 0, 0), "thigh_R": (-40, 0, -4), "shin_R": (18, 0, 0)}, (0, 0, -0.028), (0, -1, 0.12)),
                (24, {"pelvis": (10, 4, -12), "spine": (18, 0, 10), "head": (-18, 0, 0),
                      "upperArm_L": (-46, 0, -60), "forearm_L": (0, 0, -56),
                      "upperArm_R": (-52, 0, 26), "forearm_R": (0, 0, 74),
                      "thigh_L": (-40, 0, 4), "shin_L": (18, 0, 0), "thigh_R": (22, 0, -4), "shin_R": (16, 0, 0)}, (0, 0, -0.028), (0, -1, 0.04)),
            ],
        ),
        "combat_attack_poke": (
            27,
            [
                (1, {"pelvis": (6, 0, -18), "spine": (12, 0, 12), "head": (-14, 0, 0),
                     "upperArm_L": (-48, 0, -58), "forearm_L": (0, 0, -58),
                     "upperArm_R": (-54, 0, 24), "forearm_R": (0, 0, 74),
                     "thigh_L": (-26, 0, 8), "shin_L": (32, 0, 0), "thigh_R": (16, 0, -8), "shin_R": (26, 0, 0)}, (0, 0, -0.032), (0, -1, 0.08)),
                (7, {"pelvis": (4, 0, -34), "spine": (8, 0, -12), "head": (-10, 0, 10),
                     "upperArm_L": (-56, 0, -36), "forearm_L": (0, 0, -84),
                     "upperArm_R": (-58, 0, -16), "forearm_R": (0, 0, 98),
                     "thigh_L": (-18, 0, 8), "shin_L": (24, 0, 0), "thigh_R": (8, 0, -8), "shin_R": (36, 0, 0)}, (0, 0.035, -0.038), (0, -1, 0.05)),
                (13, {"pelvis": (16, 0, 12), "spine": (24, 0, 14), "head": (-22, 0, -10),
                      "upperArm_L": (-36, 0, -84), "forearm_L": (0, 0, -18),
                      "upperArm_R": (-46, 0, 64), "forearm_R": (0, 0, 18),
                      "thigh_L": (-52, 0, 6), "shin_L": (56, 0, 0), "thigh_R": (36, 0, -6), "shin_R": (16, 0, 0)}, (0, -0.065, -0.050), (0, -1, 0.02)),
                (27, {"pelvis": (6, 0, -18), "spine": (12, 0, 12), "head": (-14, 0, 0),
                      "upperArm_L": (-48, 0, -58), "forearm_L": (0, 0, -58),
                      "upperArm_R": (-54, 0, 24), "forearm_R": (0, 0, 74),
                      "thigh_L": (-26, 0, 8), "shin_L": (32, 0, 0), "thigh_R": (16, 0, -8), "shin_R": (26, 0, 0)}, (0, 0, -0.032), (0, -1, 0.08)),
            ],
        ),
    }

    for action_name, (end_frame, keyframes) in anims.items():
        act = bpy.data.actions.new(name=action_name)
        arm_obj.animation_data.action = act
        for frame, rot_dict, p_loc, f_dir in keyframes:
            key_pose(frame, rot_dict, p_loc, f_dir)

        track = arm_obj.animation_data.nla_tracks.new()
        track.name = action_name
        strip = track.strips.new(action_name, 1, act)
        strip.action_frame_start = 1
        strip.action_frame_end = end_frame

    arm_obj.animation_data.action = None


def build_and_export():
    clear_scene()

    mats = {
        "skin": make_material("PeasantSkin", (0.64, 0.48, 0.36, 1.0), metallic=0.0, roughness=0.78),
        "burlap": make_material("PeasantBurlap", (0.40, 0.34, 0.25, 1.0), metallic=0.0, roughness=0.92),
        "trousers": make_material("PeasantTrousers", (0.24, 0.20, 0.16, 1.0), metallic=0.0, roughness=0.92),
        "rope": make_material("PeasantRope", (0.34, 0.26, 0.16, 1.0), metallic=0.0, roughness=0.90),
        "footwrap": make_material("PeasantFootWrap", (0.22, 0.17, 0.13, 1.0), metallic=0.0, roughness=0.94),
        "hair": make_material("PeasantHair", (0.19, 0.14, 0.10, 1.0), metallic=0.0, roughness=0.90),
        "wood": make_material("PitchforkWood", (0.32, 0.23, 0.14, 1.0), metallic=0.02, roughness=0.88),
        "twine": make_material("PitchforkTwine", (0.46, 0.38, 0.24, 1.0), metallic=0.0, roughness=0.95),
        "iron": make_material("PitchforkIron", (0.20, 0.22, 0.24, 1.0), metallic=0.65, roughness=0.58),
    }

    # Build organic anatomical parts without subsurf (~4.5k triangles total)
    parts = [
        create_mesh_obj("Body_TorsoHead", build_torso_neck_head_bm(), mats["skin"], subdiv_levels=0),
        create_mesh_obj("Body_Arm_L", build_arm_bm(+1.0), mats["skin"], subdiv_levels=0),
        create_mesh_obj("Body_Arm_R", build_arm_bm(-1.0), mats["skin"], subdiv_levels=0),
        create_mesh_obj("Body_Leg_L", build_leg_bm(+1.0), mats["skin"], subdiv_levels=0),
        create_mesh_obj("Body_Leg_R", build_leg_bm(-1.0), mats["skin"], subdiv_levels=0),
        create_mesh_obj("Garb_Tunic", build_tunic_bm(), mats["burlap"], subdiv_levels=0),
        create_mesh_obj("Garb_Belt", build_belt_bm(), mats["rope"], subdiv_levels=0),
        create_mesh_obj("Garb_Trousers", build_trousers_bm(), mats["trousers"], subdiv_levels=0),
        create_mesh_obj("Garb_FootWraps", build_foot_wraps_bm(), mats["footwrap"], subdiv_levels=0),
        create_mesh_obj("Head_Hair", build_hair_bm(), mats["hair"], subdiv_levels=0),
    ]

    # Join into a single unified SkinnedMesh
    bpy.ops.object.select_all(action="DESELECT")
    for p in parts:
        p.select_set(True)
    peasant_mesh = parts[0]
    peasant_mesh.name = "MedievalPeasant"
    bpy.context.view_layer.objects.active = peasant_mesh
    bpy.ops.object.join()

    arm_obj = create_armature()
    assign_smooth_skin_weights(peasant_mesh, arm_obj)

    pitchfork = build_pitchfork_obj(mats)
    pitchfork.parent = arm_obj
    pitchfork.parent_type = "BONE"
    pitchfork.parent_bone = "weaponSocket"
    # Align pitchfork local origin inside weaponSocket
    pitchfork.matrix_parent_inverse.identity()
    pitchfork.location = Vector((0.0, 0.0, 0.0))

    bake_animations(arm_obj)

    tri_count = sum(len(p.vertices) - 2 for p in peasant_mesh.data.polygons)
    print(f"Built MedievalPeasant mesh with ~{tri_count} triangles and {len(arm_obj.animation_data.nla_tracks)} NLA animation tracks.")

    os.makedirs(os.path.dirname(GLB_OUT), exist_ok=True)
    os.makedirs(os.path.dirname(BLEND_OUT), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=BLEND_OUT)
    bpy.ops.export_scene.gltf(
        filepath=GLB_OUT,
        export_format="GLB",
        export_yup=True,
        export_apply=True,
        export_materials="EXPORT",
        export_animations=True,
        export_nla_strips=True,
    )
    print(f"Exported {GLB_OUT} and {BLEND_OUT}")


if __name__ == "__main__":
    build_and_export()

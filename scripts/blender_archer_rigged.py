"""
Builds, rigs, and animates the rigged Archer unit (2000-3000 tris) -> archer_rigged.glb/.blend.
Run via: blender --background --python scripts/blender_archer_rigged.py
"""

import math
import os
import sys

import bpy
import bmesh
from mathutils import Vector

sys.path.insert(0, os.path.dirname(__file__))
from blender_rigged_common import (
    ROOT_DIR,
    apply_cylindrical_uv,
    assign_humanoid_skin_weights,
    bake_humanoid_animations,
    build_arm_bm,
    build_belt_bm,
    build_boots_bm,
    build_knife_bm,
    build_lofted_tube,
    build_torso_neck_head_bm,
    build_trousers_bm,
    build_tunic_bm,
    clear_scene,
    create_humanoid_armature,
    create_mesh_obj,
    export_unit_blend_and_glb,
    make_material,
    make_skin_material,
    make_textured_material,
    set_bm_vertex_color,
)

GLB_OUT = os.path.join(ROOT_DIR, "public", "models", "units", "archer_rigged.glb")
BLEND_OUT = os.path.join(ROOT_DIR, "assets", "blender", "archer_rigged.blend")


def build_hunter_hat_bm():
    """Green Robin-Hood style peaked hunter's cap."""
    bm = bmesh.new()
    build_lofted_tube(
        bm,
        [
            (Vector((0.0, -0.016, 0.556)), 0.054, (0.072, 0.064)),
            (Vector((0.0, -0.014, 0.578)), 0.052, (0.064, 0.060)),
            (Vector((0.0, 0.004, 0.608)), 0.036, (0.044, 0.044)),
            (Vector((0.0, 0.028, 0.626)), 0.012, (0.014, 0.014)),
        ],
        segs=16,
        p=2.0,
        cap_start=False,
        cap_end=True,
    )
    set_bm_vertex_color(bm, (0.0, 0.0, 0.0, 1.0))
    return bm


def build_hat_band_bm():
    """Hat band tinted by player color (R=1)."""
    bm = bmesh.new()
    build_lofted_tube(
        bm,
        [
            (Vector((0.0, -0.016, 0.558)), 0.056, (0.074, 0.066)),
            (Vector((0.0, -0.015, 0.572)), 0.055, (0.070, 0.064)),
        ],
        segs=16,
        p=2.0,
    )
    apply_cylindrical_uv(bm, 0.55, 0.03, 1.0)
    set_bm_vertex_color(bm, (1.0, 0.0, 0.0, 1.0))
    return bm


def build_quiver_bm():
    """Leather quiver on the back with 4 fixed fletched arrows inside."""
    bm = bmesh.new()
    # Angled quiver tube on upper back (+Y)
    build_lofted_tube(
        bm,
        [
            (Vector((-0.035, 0.088, 0.295)), 0.022, 0.022),
            (Vector((0.015, 0.092, 0.375)), 0.025, 0.025),
            (Vector((0.055, 0.094, 0.445)), 0.027, 0.027),
        ],
        segs=10,
        p=2.0,
    )
    set_bm_vertex_color(bm, (0.0, 0.0, 0.0, 1.0))
    return bm


def build_quiver_arrows_bm():
    """Fixed arrows resting inside the quiver."""
    bm = bmesh.new()
    offsets = [(-0.008, -0.006), (0.008, -0.005), (-0.005, 0.008), (0.007, 0.007)]
    for ox, oy in offsets:
        base = Vector((0.048 + ox, 0.094 + oy, 0.435))
        tip = Vector((0.072 + ox, 0.096 + oy, 0.495))
        build_lofted_tube(
            bm,
            [
                (base, 0.003, 0.003),
                (tip, 0.003, 0.003),
                (tip + Vector((0.006, 0.0, 0.015)), 0.007, 0.002),
            ],
            segs=5,
            p=2.0,
        )
    set_bm_vertex_color(bm, (0.0, 0.0, 0.0, 1.0))
    return bm


def build_bow_obj(mats):
    """Curved wooden longbow + bowstring aligned along local Z (vertical in shieldSocket)."""
    bpy.ops.object.select_all(action="DESELECT")
    bm_limb = bmesh.new()
    pts = []
    segs = 12
    for i in range(segs + 1):
        t = (i / segs) * 2.0 - 1.0  # -1..+1
        z = t * 0.24
        y = 0.055 * (t * t)
        r = 0.009 - 0.004 * abs(t)
        pts.append((Vector((0.0, y, z)), r, r))
    build_lofted_tube(bm_limb, pts, segs=8, p=2.0)
    set_bm_vertex_color(bm_limb, (0.0, 0.0, 0.0, 1.0))
    bow_wood = create_mesh_obj("Bow_Wood", bm_limb, mats["wood"])

    bm_str = bmesh.new()
    build_lofted_tube(
        bm_str,
        [
            (Vector((0.0, 0.055, -0.24)), 0.0018, 0.0018),
            (Vector((0.0, 0.055, 0.24)), 0.0018, 0.0018),
        ],
        segs=4,
        p=2.0,
    )
    set_bm_vertex_color(bm_str, (0.0, 0.0, 0.0, 1.0))
    bow_str = create_mesh_obj("Bow_String", bm_str, mats["string"])

    bpy.ops.object.select_all(action="DESELECT")
    bow_wood.select_set(True)
    bow_str.select_set(True)
    bpy.context.view_layer.objects.active = bow_wood
    bpy.ops.object.join()
    bow_wood.name = "BowWeapon"
    return bow_wood


def build_drawn_arrow_obj(mats):
    """Single arrow on arrowSocket (+Z = shaft forward) that hides upon release."""
    bm = bmesh.new()
    build_lofted_tube(
        bm,
        [
            (Vector((0.0, 0.0, -0.14)), 0.003, 0.003),
            (Vector((0.0, 0.0, 0.14)), 0.003, 0.003),
            (Vector((0.0, 0.0, 0.17)), 0.007, 0.002),
            (Vector((0.0, 0.0, 0.19)), 0.001, 0.001),
        ],
        segs=6,
        p=2.0,
    )
    set_bm_vertex_color(bm, (0.0, 0.0, 0.0, 1.0))
    return create_mesh_obj("DrawnArrow", bm, mats["wood"])


def build_and_export():
    clear_scene()
    mats = {
        "skin": make_skin_material("Archer"),
        "jerkin": make_textured_material(
            "ArcherJerkin", "tex_archer_jerkin", 128,
            lambda u, v, _x, _y: (0.20 + 0.04 * math.sin(u * 25), 0.30 + 0.04 * math.cos(v * 25), 0.17),
            metallic=0.0, roughness=0.86,
        ),
        "hat_band": make_material("ArcherHatBand", (0.75, 0.75, 0.75, 1.0), metallic=0.0, roughness=0.82),
        "trousers": make_material("ArcherTrousers", (0.26, 0.21, 0.16, 1.0), metallic=0.0, roughness=0.92),
        "leather": make_material("ArcherLeather", (0.30, 0.19, 0.10, 1.0), metallic=0.04, roughness=0.80),
        "wood": make_material("ArcherBowWood", (0.44, 0.28, 0.14, 1.0), metallic=0.02, roughness=0.78),
        "string": make_material("ArcherBowString", (0.82, 0.78, 0.68, 1.0), metallic=0.0, roughness=0.90),
        "steel": make_material("ArcherSteel", (0.68, 0.71, 0.76, 1.0), metallic=0.88, roughness=0.25),
    }

    def tag(bm, rgba=(0.0, 0.0, 0.0, 1.0)):
        set_bm_vertex_color(bm, rgba)
        return bm

    parts = [
        create_mesh_obj("Body_TorsoHead", tag(build_torso_neck_head_bm()), mats["skin"]),
        create_mesh_obj("Body_Arm_L", tag(build_arm_bm(+1.0)), mats["skin"]),
        create_mesh_obj("Body_Arm_R", tag(build_arm_bm(-1.0)), mats["skin"]),
        create_mesh_obj("Garb_Jerkin", tag(build_tunic_bm()), mats["jerkin"]),
        create_mesh_obj("Garb_Belt", tag(build_belt_bm()), mats["leather"]),
        create_mesh_obj("Garb_Trousers", tag(build_trousers_bm()), mats["trousers"]),
        create_mesh_obj("Garb_Boots", tag(build_boots_bm()), mats["leather"]),
        create_mesh_obj("Helmet_HunterHat", build_hunter_hat_bm(), mats["jerkin"]),
        create_mesh_obj("Helmet_HatBand", build_hat_band_bm(), mats["hat_band"]),
        create_mesh_obj("Quiver_Bag", build_quiver_bm(), mats["leather"]),
        create_mesh_obj("Quiver_Arrows", build_quiver_arrows_bm(), mats["wood"]),
    ]

    bpy.ops.object.select_all(action="DESELECT")
    for p in parts:
        p.select_set(True)
    archer_mesh = parts[0]
    archer_mesh.name = "MedievalArcher"
    bpy.context.view_layer.objects.active = archer_mesh
    bpy.ops.object.join()

    def add_extra_bones(_eb, add_bone):
        add_bone("arrowSocket", (-0.295, -0.011, 0.398), (-0.295, -0.071, 0.398), "hand_R", roll_vec=(0, 0, 1))
        add_bone("hipKnifeSocket", (-0.095, -0.005, 0.285), (-0.095, -0.065, 0.285), "pelvis", roll_vec=(0, 0, 1))

    arm_obj = create_humanoid_armature("ArcherArmature", add_extra_bones)
    assign_humanoid_skin_weights(archer_mesh, arm_obj, cape_y_threshold=0.99)

    bow = build_bow_obj(mats)
    bow.parent = arm_obj
    bow.parent_type = "BONE"
    bow.parent_bone = "shieldSocket"
    bow.matrix_parent_inverse.identity()

    drawn_arrow = build_drawn_arrow_obj(mats)
    drawn_arrow.parent = arm_obj
    drawn_arrow.parent_type = "BONE"
    drawn_arrow.parent_bone = "arrowSocket"
    drawn_arrow.matrix_parent_inverse.identity()

    knife = create_mesh_obj("KnifeWeapon", build_knife_bm(), mats["steel"])
    knife.parent = arm_obj
    knife.parent_type = "BONE"
    knife.parent_bone = "weaponSocket"
    knife.matrix_parent_inverse.identity()

    hip_knife = create_mesh_obj("SideKnife", build_knife_bm(), mats["steel"])
    hip_knife.parent = arm_obj
    hip_knife.parent_type = "BONE"
    hip_knife.parent_bone = "hipKnifeSocket"
    hip_knife.matrix_parent_inverse.identity()

    def set_props(arrow_vis=False, melee_knife=False, arrow_dir=(0.0, -0.707, 0.707)):
        def fn(pb, frame, align_socket):
            pb["arrowSocket"].scale = (1, 1, 1) if arrow_vis else (0, 0, 0)
            pb["arrowSocket"].keyframe_insert(data_path="scale", frame=frame)
            if arrow_vis:
                align_socket("arrowSocket", Vector(arrow_dir))
                pb["arrowSocket"].keyframe_insert(data_path="rotation_euler", frame=frame)
            pb["weaponSocket"].scale = (1, 1, 1) if melee_knife else (0, 0, 0)
            pb["weaponSocket"].keyframe_insert(data_path="scale", frame=frame)
            pb["hipKnifeSocket"].scale = (0, 0, 0) if melee_knife else (1, 1, 1)
            pb["hipKnifeSocket"].keyframe_insert(data_path="scale", frame=frame)
            align_socket("hipKnifeSocket", Vector((0.0, -0.25, -0.96)))
            pb["hipKnifeSocket"].keyframe_insert(data_path="rotation_euler", frame=frame)
        return fn

    anims = {
        # Idle: stretch and raise the bow over head, then return to ready stance
        "idle_stance": (
            72,
            [
                (1, {"pelvis": (0, 0, -10), "spine": (5, 0, 8), "head": (-5, 0, 0),
                     "upperArm_L": (-55, 0, -45), "forearm_L": (0, 0, -25),
                     "upperArm_R": (-68, 0, 12), "forearm_R": (0, 0, 35),
                     "thigh_L": (-8, 0, 5), "shin_L": (10, 0, 0), "thigh_R": (6, 0, -5), "shin_R": (8, 0, 0)},
                 (0, 0, -0.006), (0.0, -0.2, 1.0), (0.0, 0.0, 1.0), set_props(False, False)),
                (34, {"pelvis": (0, 0, -4), "spine": (-6, 0, 4), "head": (-14, 0, 0),
                      "upperArm_L": (58, 0, -22), "forearm_L": (0, 0, -12),
                      "upperArm_R": (50, 0, 18), "forearm_R": (0, 0, 20),
                      "thigh_L": (-6, 0, 5), "shin_L": (8, 0, 0), "thigh_R": (4, 0, -5), "shin_R": (6, 0, 0)},
                 (0, 0, 0.002), (0.0, -0.2, 1.0), (0.2, -0.3, 0.9), set_props(False, False)),
                (72, {"pelvis": (0, 0, -10), "spine": (5, 0, 8), "head": (-5, 0, 0),
                      "upperArm_L": (-55, 0, -45), "forearm_L": (0, 0, -25),
                      "upperArm_R": (-68, 0, 12), "forearm_R": (0, 0, 35),
                      "thigh_L": (-8, 0, 5), "shin_L": (10, 0, 0), "thigh_R": (6, 0, -5), "shin_R": (8, 0, 0)},
                 (0, 0, -0.006), (0.0, -0.2, 1.0), (0.0, 0.0, 1.0), set_props(False, False)),
            ],
        ),
        "combat_move_advance": (
            24,
            [
                (1, {"pelvis": (8, 4, -8), "spine": (10, 0, 6), "head": (-10, 0, 0),
                     "upperArm_L": (-52, 0, -35), "forearm_L": (0, 0, -30),
                     "upperArm_R": (-62, 0, 18), "forearm_R": (0, 0, 42),
                     "thigh_L": (-38, 0, 4), "shin_L": (18, 0, 0), "thigh_R": (22, 0, -4), "shin_R": (16, 0, 0)},
                 (0, 0, -0.022), (0.0, -0.3, 0.95), (0.0, -0.2, 0.98), set_props(False, False)),
                (12, {"pelvis": (8, -4, 8), "spine": (10, 0, -6), "head": (-10, 0, 0),
                      "upperArm_L": (-50, 0, -40), "forearm_L": (0, 0, -28),
                      "upperArm_R": (-60, 0, 22), "forearm_R": (0, 0, 40),
                      "thigh_L": (22, 0, 4), "shin_L": (16, 0, 0), "thigh_R": (-38, 0, -4), "shin_R": (18, 0, 0)},
                 (0, 0, -0.022), (0.0, -0.3, 0.95), (0.0, -0.2, 0.98), set_props(False, False)),
                (24, {"pelvis": (8, 4, -8), "spine": (10, 0, 6), "head": (-10, 0, 0),
                      "upperArm_L": (-52, 0, -35), "forearm_L": (0, 0, -30),
                      "upperArm_R": (-62, 0, 18), "forearm_R": (0, 0, 42),
                      "thigh_L": (-38, 0, 4), "shin_L": (18, 0, 0), "thigh_R": (22, 0, -4), "shin_R": (16, 0, 0)},
                 (0, 0, -0.022), (0.0, -0.3, 0.95), (0.0, -0.2, 0.98), set_props(False, False)),
            ],
        ),
        # Ranged attack: reach to quiver -> extract arrow -> draw & aim at 45 deg -> release (arrow hidden!)
        "combat_attack_ranged": (
            36,
            [
                # Reach back to quiver on back
                (1, {"pelvis": (4, 0, -22), "spine": (6, 0, 10), "head": (-8, 0, 12),
                     "upperArm_L": (-35, 0, -65), "forearm_L": (0, 0, -20),
                     "upperArm_R": (42, 0, -38), "forearm_R": (0, 0, 95),
                     "thigh_L": (-18, 0, 8), "shin_L": (22, 0, 0), "thigh_R": (14, 0, -8), "shin_R": (18, 0, 0)},
                 (0, 0, -0.020), (0.0, -0.2, 1.0), (0.0, 0.25, 0.96), set_props(True, False, (0.2, 0.3, 0.9))),
                # Extract arrow & bring to bowstring
                (12, {"pelvis": (4, 0, -38), "spine": (6, 0, 12), "head": (-12, 0, 26),
                      "upperArm_L": (-10, 0, -78), "forearm_L": (0, 0, -10),
                      "upperArm_R": (-12, 0, 32), "forearm_R": (0, 0, 98),
                      "thigh_L": (-20, 0, 10), "shin_L": (24, 0, 0), "thigh_R": (16, 0, -10), "shin_R": (20, 0, 0)},
                 (0, 0, -0.024), (0.0, -0.7, 0.7), (0.0, 0.65, 0.75), set_props(True, False, (0.0, -0.707, 0.707))),
                # Full draw aiming 45 degrees upward
                (22, {"pelvis": (6, 0, -45), "spine": (-4, 0, 14), "head": (-10, 0, 30),
                      "upperArm_L": (28, 0, -82), "forearm_L": (0, 0, -6),
                      "upperArm_R": (18, 0, 14), "forearm_R": (0, 0, 118),
                      "thigh_L": (-22, 0, 10), "shin_L": (26, 0, 0), "thigh_R": (18, 0, -10), "shin_R": (22, 0, 0)},
                 (0, 0.02, -0.026), (0.0, -0.7, 0.7), (0.0, 0.707, 0.707), set_props(True, False, (0.0, -0.707, 0.707))),
                # Release frame: arrow hidden immediately as projectile spawns in Three.js!
                (26, {"pelvis": (6, 0, -42), "spine": (-2, 0, 12), "head": (-10, 0, 28),
                      "upperArm_L": (26, 0, -82), "forearm_L": (0, 0, -6),
                      "upperArm_R": (14, 0, 6), "forearm_R": (0, 0, 102),
                      "thigh_L": (-22, 0, 10), "shin_L": (26, 0, 0), "thigh_R": (18, 0, -10), "shin_R": (22, 0, 0)},
                 (0, 0.02, -0.024), (0.0, -0.7, 0.7), (0.0, 0.707, 0.707), set_props(False, False)),
                # Recover
                (36, {"pelvis": (0, 0, -10), "spine": (5, 0, 8), "head": (-5, 0, 0),
                      "upperArm_L": (-55, 0, -45), "forearm_L": (0, 0, -25),
                      "upperArm_R": (-68, 0, 12), "forearm_R": (0, 0, 35),
                      "thigh_L": (-8, 0, 5), "shin_L": (10, 0, 0), "thigh_R": (6, 0, -5), "shin_R": (8, 0, 0)},
                 (0, 0, -0.006), (0.0, -0.2, 1.0), (0.0, 0.0, 1.0), set_props(False, False)),
            ],
        ),
        # Melee attack: close-combat knife slash/stab
        "combat_attack_poke": (
            26,
            [
                (1, {"pelvis": (4, 0, -16), "spine": (8, 0, 10), "head": (-10, 0, 4),
                     "upperArm_L": (-50, 0, -45), "forearm_L": (0, 0, -35),
                     "upperArm_R": (-54, 0, 18), "forearm_R": (0, 0, 72),
                     "thigh_L": (-24, 0, 10), "shin_L": (28, 0, 0), "thigh_R": (18, 0, -10), "shin_R": (22, 0, 0)},
                 (0, 0, -0.026), (0.0, -1.0, 0.1), (0.0, 0.0, 1.0), set_props(False, True)),
                (12, {"pelvis": (14, 0, 18), "spine": (22, 0, 14), "head": (-22, 0, -10),
                      "upperArm_L": (-58, 0, -20), "forearm_L": (0, 0, -45),
                      "upperArm_R": (-38, 0, 72), "forearm_R": (0, 0, 16),
                      "thigh_L": (-42, 0, 10), "shin_L": (46, 0, 0), "thigh_R": (32, 0, -10), "shin_R": (16, 0, 0)},
                 (0, -0.06, -0.042), (0.0, -1.0, 0.0), (0.0, 0.0, 1.0), set_props(False, True)),
                (26, {"pelvis": (4, 0, -16), "spine": (8, 0, 10), "head": (-10, 0, 4),
                      "upperArm_L": (-50, 0, -45), "forearm_L": (0, 0, -35),
                      "upperArm_R": (-54, 0, 18), "forearm_R": (0, 0, 72),
                      "thigh_L": (-24, 0, 10), "shin_L": (28, 0, 0), "thigh_R": (18, 0, -10), "shin_R": (22, 0, 0)},
                 (0, 0, -0.026), (0.0, -1.0, 0.1), (0.0, 0.0, 1.0), set_props(False, True)),
            ],
        ),
        # Defensive stance: angle bow & knife diagonally across chest to parry
        "combat_defensive_stance": (
            48,
            [
                (1, {"pelvis": (6, 0, -14), "spine": (10, 0, 10), "head": (-12, 0, 4),
                     "upperArm_L": (-32, 0, -68), "forearm_L": (0, 0, -52),
                     "upperArm_R": (-42, 0, 42), "forearm_R": (0, 0, 82),
                     "thigh_L": (-24, 0, 8), "shin_L": (28, 0, 0), "thigh_R": (16, 0, -8), "shin_R": (22, 0, 0)},
                 (0, 0, -0.028), (-0.4, -0.8, 0.45), (0.4, -0.5, 0.75), set_props(False, True)),
                (24, {"pelvis": (7, 0, -14), "spine": (12, 0, 10), "head": (-12, 0, 4),
                      "upperArm_L": (-30, 0, -70), "forearm_L": (0, 0, -50),
                      "upperArm_R": (-40, 0, 44), "forearm_R": (0, 0, 80),
                      "thigh_L": (-24, 0, 8), "shin_L": (28, 0, 0), "thigh_R": (16, 0, -8), "shin_R": (22, 0, 0)},
                 (0, 0, -0.032), (-0.4, -0.8, 0.45), (0.4, -0.5, 0.75), set_props(False, True)),
                (48, {"pelvis": (6, 0, -14), "spine": (10, 0, 10), "head": (-12, 0, 4),
                      "upperArm_L": (-32, 0, -68), "forearm_L": (0, 0, -52),
                      "upperArm_R": (-42, 0, 42), "forearm_R": (0, 0, 82),
                      "thigh_L": (-24, 0, 8), "shin_L": (28, 0, 0), "thigh_R": (16, 0, -8), "shin_R": (22, 0, 0)},
                 (0, 0, -0.028), (-0.4, -0.8, 0.45), (0.4, -0.5, 0.75), set_props(False, True)),
            ],
        ),
        "death": (
            36,
            [
                (1, {"pelvis": (4, 0, -10), "spine": (6, 0, 8), "head": (-6, 0, 0),
                     "upperArm_L": (-55, 0, -45), "forearm_L": (0, 0, -25),
                     "upperArm_R": (-68, 0, 12), "forearm_R": (0, 0, 35),
                     "thigh_L": (-14, 0, 6), "shin_L": (18, 0, 0), "thigh_R": (10, 0, -6), "shin_R": (14, 0, 0)},
                 (0, 0, -0.015), (0.0, -0.2, 1.0), (0.0, 0.0, 1.0), set_props(False, False)),
                (16, {"pelvis": (-32, 6, -6), "spine": (-14, 0, 4), "head": (16, 0, -8),
                      "upperArm_L": (-60, 0, -10), "forearm_L": (0, 0, -16),
                      "upperArm_R": (-64, 0, 8), "forearm_R": (0, 0, 20),
                      "thigh_L": (-32, 0, 10), "shin_L": (56, 0, 0), "thigh_R": (-20, 0, -10), "shin_R": (48, 0, 0)},
                 (0, 0.07, -0.09), (0.0, -0.2, 1.0), (0.8, -0.5, 0.2), set_props(False, False)),
                (36, {"pelvis": (-86, 8, 0), "spine": (-4, 0, 0), "head": (6, 0, -10),
                      "upperArm_L": (-68, 0, 18), "forearm_L": (0, 0, 12),
                      "upperArm_R": (-70, 0, -22), "forearm_R": (0, 0, -14),
                      "thigh_L": (-4, 0, 8), "shin_L": (10, 0, 0), "thigh_R": (-2, 0, -8), "shin_R": (8, 0, 0)},
                 (0, 0.16, -0.170), (0.0, -0.2, 1.0), (0.95, -0.3, 0.02), set_props(False, False)),
            ],
        ),
    }

    bake_humanoid_animations(arm_obj, anims)
    export_unit_blend_and_glb(archer_mesh, arm_obj, BLEND_OUT, GLB_OUT)


if __name__ == "__main__":
    build_and_export()

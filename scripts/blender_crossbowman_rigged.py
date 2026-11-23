"""
Builds, rigs, and animates the rigged Crossbowman unit (2000-3000 tris) -> crossbowman_rigged.glb/.blend.
Run via: blender --background --python scripts/blender_crossbowman_rigged.py
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
    build_chainmail_aventail_bm,
    build_knife_bm,
    build_lofted_tube,
    build_torso_neck_head_bm,
    build_trousers_bm,
    build_tunic_bm,
    clear_scene,
    create_humanoid_armature,
    create_mesh_obj,
    export_unit_blend_and_glb,
    make_chainmail_material,
    make_material,
    make_shield_material,
    make_skin_material,
    make_textured_material,
    set_bm_vertex_color,
)

GLB_OUT = os.path.join(ROOT_DIR, "public", "models", "units", "crossbowman_rigged.glb")
BLEND_OUT = os.path.join(ROOT_DIR, "assets", "blender", "crossbowman_rigged.blend")


def build_chainmail_coif_bm():
    """Chainmail head armor piece (coif cap + sides/back aventail)."""
    bm = build_chainmail_aventail_bm(0.478, 0.562)
    uv_layer = bm.loops.layers.uv.get("UVMap") or bm.loops.layers.uv.new("UVMap")
    # Crown cap over top of head
    build_lofted_tube(
        bm,
        [
            (Vector((0.0, -0.014, 0.556)), 0.052, 0.058),
            (Vector((0.0, -0.013, 0.586)), 0.046, 0.052),
            (Vector((0.0, -0.010, 0.614)), 0.022, 0.024),
        ],
        segs=14,
        p=2.0,
        cap_start=False,
        cap_end=True,
    )
    apply_cylindrical_uv(bm, 0.47, 0.15, 3.0)
    set_bm_vertex_color(bm, (0.0, 0.0, 0.0, 1.0))
    return bm


def build_chest_banner_tabard_bm():
    """Front chest surcoat patch mapped to [0.04..0.96] for the player banner texture (G=1)."""
    bm = bmesh.new()
    uv_layer = bm.loops.layers.uv.new("UVMap")
    color_layer = bm.loops.layers.color.new("Col")

    # Curved front chest panel sitting cleanly outside the tunic (-Y)
    rows = 4
    cols = 4
    z_vals = [0.305, 0.355, 0.405, 0.448]
    x_half = [0.068, 0.072, 0.074, 0.060]
    y_vals = [-0.088, -0.094, -0.092, -0.076]

    grid = []
    for r in range(rows):
        row_v = []
        for c in range(cols):
            tx = c / (cols - 1)
            x = -x_half[r] + 2.0 * x_half[r] * tx
            arc = math.cos((tx - 0.5) * math.pi)
            y = y_vals[r] - 0.008 * arc
            row_v.append(bm.verts.new((x, y, z_vals[r])))
        grid.append(row_v)

    for r in range(rows - 1):
        for c in range(cols - 1):
            f = bm.faces.new((grid[r][c], grid[r][c + 1], grid[r + 1][c + 1], grid[r + 1][c]))
            for loop in f.loops:
                # Find (r_idx, c_idx) by matching vertex
                co = loop.vert.co
                u = 0.04 + 0.92 * ((co.x + 0.074) / 0.148)
                v = 0.04 + 0.92 * ((co.z - 0.305) / (0.448 - 0.305))
                loop[uv_layer].uv = (max(0.03, min(0.97, u)), max(0.03, min(0.97, v)))
                loop[color_layer] = (0.0, 1.0, 0.0, 1.0)
    bm.normal_update()
    return bm


def build_back_pavise_bm():
    """Large pavise shield carried on the back (+Y)."""
    bm = bmesh.new()
    build_lofted_tube(
        bm,
        [
            (Vector((0.0, 0.098, 0.175)), 0.115, 0.012),
            (Vector((0.0, 0.102, 0.310)), 0.125, 0.012),
            (Vector((0.0, 0.098, 0.445)), 0.112, 0.012),
        ],
        segs=10,
        p=2.6,
    )
    set_bm_vertex_color(bm, (0.0, 0.0, 0.0, 1.0))
    return bm


def build_bolt_quiver_bm():
    """Quiver of bolts mounted at the left hip."""
    bm = bmesh.new()
    build_lofted_tube(
        bm,
        [
            (Vector((0.095, 0.015, 0.210)), 0.020, 0.020),
            (Vector((0.102, -0.015, 0.295)), 0.024, 0.024),
        ],
        segs=8,
        p=2.0,
    )
    for ox in (-0.008, 0.0, 0.008):
        build_lofted_tube(
            bm,
            [
                (Vector((0.102 + ox, -0.015, 0.292)), 0.003, 0.003),
                (Vector((0.105 + ox, -0.026, 0.328)), 0.003, 0.003),
            ],
            segs=5,
            p=2.0,
        )
    set_bm_vertex_color(bm, (0.0, 0.0, 0.0, 1.0))
    return bm


def build_crossbow_obj(mats):
    """Crossbow aligned along local +Z (weaponSocket forward)."""
    bpy.ops.object.select_all(action="DESELECT")
    bm_stock = bmesh.new()
    build_lofted_tube(
        bm_stock,
        [
            (Vector((0, 0, -0.10)), 0.014, 0.020),
            (Vector((0, 0, 0.02)), 0.014, 0.018),
            (Vector((0, 0, 0.22)), 0.012, 0.014),
        ],
        segs=8,
        p=2.2,
    )
    set_bm_vertex_color(bm_stock, (0.0, 0.0, 0.0, 1.0))
    stock = create_mesh_obj("Crossbow_Stock", bm_stock, mats["wood"])

    bm_prod = bmesh.new()
    build_lofted_tube(
        bm_prod,
        [
            (Vector((-0.14, 0.0, 0.16)), 0.005, 0.007),
            (Vector((0.0, 0.0, 0.21)), 0.008, 0.010),
            (Vector((0.14, 0.0, 0.16)), 0.005, 0.007),
        ],
        segs=8,
        p=2.0,
    )
    set_bm_vertex_color(bm_prod, (0.0, 0.0, 0.0, 1.0))
    prod = create_mesh_obj("Crossbow_Prod", bm_prod, mats["steel"])

    bpy.ops.object.select_all(action="DESELECT")
    stock.select_set(True)
    prod.select_set(True)
    bpy.context.view_layer.objects.active = stock
    bpy.ops.object.join()
    stock.name = "CrossbowWeapon"
    return stock


def build_and_export():
    clear_scene()
    mats = {
        "skin": make_skin_material("Crossbowman"),
        "tunic": make_material("CrossbowmanTunic", (0.28, 0.24, 0.19, 1.0), metallic=0.0, roughness=0.88),
        "trousers": make_textured_material(
            "CrossbowmanTrousers", "tex_cb_trousers", 64,
            lambda u, v, _x, _y: (0.64 + 0.03 * math.sin(u * 30 + v * 30),) * 3,
            metallic=0.0, roughness=0.90,
        ),
        "leather": make_material("CrossbowmanLeather", (0.29, 0.18, 0.10, 1.0), metallic=0.04, roughness=0.82),
        "chainmail": make_chainmail_material("Crossbowman"),
        "banner_tabard": make_shield_material("Crossbowman"),
        "pavise": make_textured_material(
            "CrossbowmanPavise", "tex_cb_pavise", 128,
            lambda u, v, _x, _y: (0.36 + 0.04 * math.sin(v * 40), 0.25 + 0.03 * math.sin(v * 40), 0.15),
            metallic=0.04, roughness=0.80,
        ),
        "wood": make_material("CrossbowWood", (0.36, 0.22, 0.12, 1.0), metallic=0.02, roughness=0.82),
        "steel": make_material("CrossbowSteel", (0.66, 0.69, 0.74, 1.0), metallic=0.88, roughness=0.26),
    }

    def tag(bm, rgba=(0.0, 0.0, 0.0, 1.0)):
        set_bm_vertex_color(bm, rgba)
        return bm

    parts = [
        create_mesh_obj("Body_TorsoHead", tag(build_torso_neck_head_bm()), mats["skin"]),
        create_mesh_obj("Body_Arm_L", tag(build_arm_bm(+1.0)), mats["skin"]),
        create_mesh_obj("Body_Arm_R", tag(build_arm_bm(-1.0)), mats["skin"]),
        create_mesh_obj("Garb_Tunic", tag(build_tunic_bm()), mats["tunic"]),
        create_mesh_obj("Garb_BannerTabard", build_chest_banner_tabard_bm(), mats["banner_tabard"]),
        create_mesh_obj("Garb_Belt", tag(build_belt_bm()), mats["leather"]),
        create_mesh_obj("Garb_Trousers", tag(build_trousers_bm(), (1.0, 0.0, 0.0, 1.0)), mats["trousers"]),
        create_mesh_obj("Garb_Boots", tag(build_boots_bm()), mats["leather"]),
        create_mesh_obj("Helmet_ChainmailCoif", build_chainmail_coif_bm(), mats["chainmail"]),
        create_mesh_obj("Back_Pavise", build_back_pavise_bm(), mats["pavise"]),
        create_mesh_obj("Hip_BoltQuiver", build_bolt_quiver_bm(), mats["leather"]),
    ]

    bpy.ops.object.select_all(action="DESELECT")
    for p in parts:
        p.select_set(True)
    cb_mesh = parts[0]
    cb_mesh.name = "MedievalCrossbowman"
    bpy.context.view_layer.objects.active = cb_mesh
    bpy.ops.object.join()

    def add_extra_bones(_eb, add_bone):
        add_bone("knifeSocket", (-0.295, -0.011, 0.398), (-0.295, -0.071, 0.398), "hand_R", roll_vec=(0, 0, 1))
        add_bone("hipKnifeSocket", (-0.096, -0.005, 0.280), (-0.096, -0.065, 0.280), "pelvis", roll_vec=(0, 0, 1))

    arm_obj = create_humanoid_armature("CrossbowmanArmature", add_extra_bones)
    assign_humanoid_skin_weights(cb_mesh, arm_obj, cape_y_threshold=0.070)

    xbow = build_crossbow_obj(mats)
    xbow.parent = arm_obj
    xbow.parent_type = "BONE"
    xbow.parent_bone = "weaponSocket"
    xbow.matrix_parent_inverse.identity()

    knife = create_mesh_obj("KnifeWeapon", build_knife_bm(), mats["steel"])
    knife.parent = arm_obj
    knife.parent_type = "BONE"
    knife.parent_bone = "knifeSocket"
    knife.matrix_parent_inverse.identity()

    hip_knife = create_mesh_obj("SideKnife", build_knife_bm(), mats["steel"])
    hip_knife.parent = arm_obj
    hip_knife.parent_type = "BONE"
    hip_knife.parent_bone = "hipKnifeSocket"
    hip_knife.matrix_parent_inverse.identity()

    def set_mode(use_knife=False):
        def fn(pb, frame, align_socket):
            pb["weaponSocket"].scale = (0, 0, 0) if use_knife else (1, 1, 1)
            pb["weaponSocket"].keyframe_insert(data_path="scale", frame=frame)
            pb["knifeSocket"].scale = (1, 1, 1) if use_knife else (0, 0, 0)
            pb["knifeSocket"].keyframe_insert(data_path="scale", frame=frame)
            if use_knife:
                align_socket("knifeSocket", Vector((0.0, -1.0, 0.1)))
                pb["knifeSocket"].keyframe_insert(data_path="rotation_euler", frame=frame)
            pb["hipKnifeSocket"].scale = (0, 0, 0) if use_knife else (1, 1, 1)
            pb["hipKnifeSocket"].keyframe_insert(data_path="scale", frame=frame)
            align_socket("hipKnifeSocket", Vector((0.0, -0.25, -0.96)))
            pb["hipKnifeSocket"].keyframe_insert(data_path="rotation_euler", frame=frame)
        return fn

    anims = {
        # Idle: raise crossbow to eye level as if aiming at something, then lower
        "idle_stance": (
            72,
            [
                (1, {"pelvis": (0, 0, -8), "spine": (6, 0, 6), "head": (-6, 0, 0),
                     "upperArm_L": (-55, 0, -52), "forearm_L": (0, 0, -40),
                     "upperArm_R": (-62, 0, 22), "forearm_R": (0, 0, 58),
                     "thigh_L": (-8, 0, 5), "shin_L": (10, 0, 0), "thigh_R": (6, 0, -5), "shin_R": (8, 0, 0)},
                 (0, 0, -0.008), (0.0, -0.95, 0.25), None, set_mode(False)),
                (34, {"pelvis": (0, 0, -14), "spine": (8, 0, 10), "head": (-10, 0, 4),
                      "upperArm_L": (-36, 0, -68), "forearm_L": (0, 0, -32),
                      "upperArm_R": (-40, 0, 32), "forearm_R": (0, 0, 82),
                      "thigh_L": (-8, 0, 5), "shin_L": (10, 0, 0), "thigh_R": (6, 0, -5), "shin_R": (8, 0, 0)},
                 (0, 0, -0.008), (0.0, -1.0, 0.05), None, set_mode(False)),
                (72, {"pelvis": (0, 0, -8), "spine": (6, 0, 6), "head": (-6, 0, 0),
                      "upperArm_L": (-55, 0, -52), "forearm_L": (0, 0, -40),
                      "upperArm_R": (-62, 0, 22), "forearm_R": (0, 0, 58),
                      "thigh_L": (-8, 0, 5), "shin_L": (10, 0, 0), "thigh_R": (6, 0, -5), "shin_R": (8, 0, 0)},
                 (0, 0, -0.008), (0.0, -0.95, 0.25), None, set_mode(False)),
            ],
        ),
        "combat_move_advance": (
            24,
            [
                (1, {"pelvis": (8, 4, -8), "spine": (12, 0, 6), "head": (-12, 0, 0),
                     "upperArm_L": (-50, 0, -54), "forearm_L": (0, 0, -42),
                     "upperArm_R": (-58, 0, 24), "forearm_R": (0, 0, 60),
                     "thigh_L": (-38, 0, 4), "shin_L": (18, 0, 0), "thigh_R": (22, 0, -4), "shin_R": (16, 0, 0)},
                 (0, 0, -0.022), (0.0, -0.92, 0.35), None, set_mode(False)),
                (12, {"pelvis": (8, -4, 8), "spine": (12, 0, -6), "head": (-12, 0, 0),
                      "upperArm_L": (-48, 0, -56), "forearm_L": (0, 0, -40),
                      "upperArm_R": (-56, 0, 26), "forearm_R": (0, 0, 58),
                      "thigh_L": (22, 0, 4), "shin_L": (16, 0, 0), "thigh_R": (-38, 0, -4), "shin_R": (18, 0, 0)},
                 (0, 0, -0.022), (0.0, -0.92, 0.35), None, set_mode(False)),
                (24, {"pelvis": (8, 4, -8), "spine": (12, 0, 6), "head": (-12, 0, 0),
                      "upperArm_L": (-50, 0, -54), "forearm_L": (0, 0, -42),
                      "upperArm_R": (-58, 0, 24), "forearm_R": (0, 0, 60),
                      "thigh_L": (-38, 0, 4), "shin_L": (18, 0, 0), "thigh_R": (22, 0, -4), "shin_R": (16, 0, 0)},
                 (0, 0, -0.022), (0.0, -0.92, 0.35), None, set_mode(False)),
            ],
        ),
        # Ranged attack: aim & fire crossbow
        "combat_attack_ranged": (
            26,
            [
                (1, {"pelvis": (4, 0, -14), "spine": (8, 0, 10), "head": (-10, 0, 4),
                     "upperArm_L": (-36, 0, -68), "forearm_L": (0, 0, -30),
                     "upperArm_R": (-40, 0, 32), "forearm_R": (0, 0, 82),
                     "thigh_L": (-18, 0, 8), "shin_L": (22, 0, 0), "thigh_R": (14, 0, -8), "shin_R": (18, 0, 0)},
                 (0, 0, -0.020), (0.0, -1.0, 0.05), None, set_mode(False)),
                (10, {"pelvis": (2, 0, -14), "spine": (4, 0, 10), "head": (-8, 0, 4),
                      "upperArm_L": (-34, 0, -68), "forearm_L": (0, 0, -30),
                      "upperArm_R": (-38, 0, 30), "forearm_R": (0, 0, 80),
                      "thigh_L": (-18, 0, 8), "shin_L": (22, 0, 0), "thigh_R": (14, 0, -8), "shin_R": (18, 0, 0)},
                 (0, 0.02, -0.020), (0.0, -0.99, 0.14), None, set_mode(False)),
                (26, {"pelvis": (0, 0, -8), "spine": (6, 0, 6), "head": (-6, 0, 0),
                      "upperArm_L": (-55, 0, -52), "forearm_L": (0, 0, -40),
                      "upperArm_R": (-62, 0, 22), "forearm_R": (0, 0, 58),
                      "thigh_L": (-8, 0, 5), "shin_L": (10, 0, 0), "thigh_R": (6, 0, -5), "shin_R": (8, 0, 0)},
                 (0, 0, -0.008), (0.0, -0.95, 0.25), None, set_props_cb := set_mode(False)),
            ],
        ),
        # Separate reload animation: lower crossbow, pull string, load bolt from quiver, raise ready
        "reload": (
            42,
            [
                (1, {"pelvis": (6, 0, -8), "spine": (12, 0, 4), "head": (-4, 0, 0),
                     "upperArm_L": (-62, 0, -42), "forearm_L": (0, 0, -45),
                     "upperArm_R": (-64, 0, 26), "forearm_R": (0, 0, 62),
                     "thigh_L": (-14, 0, 6), "shin_L": (18, 0, 0), "thigh_R": (10, 0, -6), "shin_R": (14, 0, 0)},
                 (0, 0, -0.016), (0.0, -0.4, -0.9), None, set_mode(False)),
                (16, {"pelvis": (10, 0, -4), "spine": (24, 0, 0), "head": (12, 0, 0),
                      "upperArm_L": (-70, 0, -32), "forearm_L": (0, 0, -48),
                      "upperArm_R": (-48, 0, 12), "forearm_R": (0, 0, 96),
                      "thigh_L": (-20, 0, 8), "shin_L": (24, 0, 0), "thigh_R": (14, 0, -8), "shin_R": (18, 0, 0)},
                 (0, 0, -0.024), (0.0, -0.3, -0.95), None, set_mode(False)),
                (28, {"pelvis": (8, 0, -10), "spine": (18, 0, 8), "head": (8, 0, 12),
                      "upperArm_L": (-66, 0, -12), "forearm_L": (0, 0, -74),
                      "upperArm_R": (-54, 0, 32), "forearm_R": (0, 0, 68),
                      "thigh_L": (-16, 0, 8), "shin_L": (20, 0, 0), "thigh_R": (12, 0, -8), "shin_R": (16, 0, 0)},
                 (0, 0, -0.020), (0.0, -0.6, -0.8), None, set_mode(False)),
                (42, {"pelvis": (0, 0, -8), "spine": (6, 0, 6), "head": (-6, 0, 0),
                      "upperArm_L": (-55, 0, -52), "forearm_L": (0, 0, -40),
                      "upperArm_R": (-62, 0, 22), "forearm_R": (0, 0, 58),
                      "thigh_L": (-8, 0, 5), "shin_L": (10, 0, 0), "thigh_R": (6, 0, -5), "shin_R": (8, 0, 0)},
                 (0, 0, -0.008), (0.0, -0.95, 0.25), None, set_mode(False)),
            ],
        ),
        # Melee attack: close-combat knife strike
        "combat_attack_poke": (
            26,
            [
                (1, {"pelvis": (4, 0, -16), "spine": (8, 0, 10), "head": (-10, 0, 4),
                     "upperArm_L": (-56, 0, -32), "forearm_L": (0, 0, -40),
                     "upperArm_R": (-54, 0, 18), "forearm_R": (0, 0, 72),
                     "thigh_L": (-24, 0, 10), "shin_L": (28, 0, 0), "thigh_R": (18, 0, -10), "shin_R": (22, 0, 0)},
                 (0, 0, -0.026), None, None, set_mode(True)),
                (12, {"pelvis": (14, 0, 18), "spine": (22, 0, 14), "head": (-22, 0, -10),
                      "upperArm_L": (-60, 0, -18), "forearm_L": (0, 0, -44),
                      "upperArm_R": (-38, 0, 72), "forearm_R": (0, 0, 16),
                      "thigh_L": (-42, 0, 10), "shin_L": (46, 0, 0), "thigh_R": (32, 0, -10), "shin_R": (16, 0, 0)},
                 (0, -0.06, -0.042), None, None, set_mode(True)),
                (26, {"pelvis": (4, 0, -16), "spine": (8, 0, 10), "head": (-10, 0, 4),
                      "upperArm_L": (-56, 0, -32), "forearm_L": (0, 0, -40),
                      "upperArm_R": (-54, 0, 18), "forearm_R": (0, 0, 72),
                      "thigh_L": (-24, 0, 10), "shin_L": (28, 0, 0), "thigh_R": (18, 0, -10), "shin_R": (22, 0, 0)},
                 (0, 0, -0.026), None, None, set_mode(True)),
            ],
        ),
        # Defensive stance: angle crossbow across chest to parry
        "combat_defensive_stance": (
            48,
            [
                (1, {"pelvis": (6, 0, -14), "spine": (10, 0, 10), "head": (-12, 0, 4),
                     "upperArm_L": (-36, 0, -64), "forearm_L": (0, 0, -46),
                     "upperArm_R": (-42, 0, 38), "forearm_R": (0, 0, 78),
                     "thigh_L": (-24, 0, 8), "shin_L": (28, 0, 0), "thigh_R": (16, 0, -8), "shin_R": (22, 0, 0)},
                 (0, 0, -0.028), (0.6, -0.45, 0.65), None, set_mode(False)),
                (24, {"pelvis": (7, 0, -14), "spine": (12, 0, 10), "head": (-12, 0, 4),
                      "upperArm_L": (-34, 0, -66), "forearm_L": (0, 0, -44),
                      "upperArm_R": (-40, 0, 40), "forearm_R": (0, 0, 76),
                      "thigh_L": (-24, 0, 8), "shin_L": (28, 0, 0), "thigh_R": (16, 0, -8), "shin_R": (22, 0, 0)},
                 (0, 0, -0.032), (0.6, -0.45, 0.65), None, set_mode(False)),
                (48, {"pelvis": (6, 0, -14), "spine": (10, 0, 10), "head": (-12, 0, 4),
                      "upperArm_L": (-36, 0, -64), "forearm_L": (0, 0, -46),
                      "upperArm_R": (-42, 0, 38), "forearm_R": (0, 0, 78),
                      "thigh_L": (-24, 0, 8), "shin_L": (28, 0, 0), "thigh_R": (16, 0, -8), "shin_R": (22, 0, 0)},
                 (0, 0, -0.028), (0.6, -0.45, 0.65), None, set_mode(False)),
            ],
        ),
        "death": (
            36,
            [
                (1, {"pelvis": (4, 0, -8), "spine": (6, 0, 6), "head": (-6, 0, 0),
                     "upperArm_L": (-55, 0, -52), "forearm_L": (0, 0, -40),
                     "upperArm_R": (-62, 0, 22), "forearm_R": (0, 0, 58),
                     "thigh_L": (-14, 0, 6), "shin_L": (18, 0, 0), "thigh_R": (10, 0, -6), "shin_R": (14, 0, 0)},
                 (0, 0, -0.015), (0.0, -0.95, 0.25), None, set_mode(False)),
                (16, {"pelvis": (-32, 6, -6), "spine": (-14, 0, 4), "head": (16, 0, -8),
                      "upperArm_L": (-60, 0, -10), "forearm_L": (0, 0, -16),
                      "upperArm_R": (-64, 0, 8), "forearm_R": (0, 0, 20),
                      "thigh_L": (-32, 0, 10), "shin_L": (56, 0, 0), "thigh_R": (-20, 0, -10), "shin_R": (48, 0, 0)},
                 (0, 0.07, -0.09), (0.6, -0.7, 0.2), None, set_mode(False)),
                (36, {"pelvis": (-86, 8, 0), "spine": (-4, 0, 0), "head": (6, 0, -10),
                      "upperArm_L": (-68, 0, 18), "forearm_L": (0, 0, 12),
                      "upperArm_R": (-70, 0, -22), "forearm_R": (0, 0, -14),
                      "thigh_L": (-4, 0, 8), "shin_L": (10, 0, 0), "thigh_R": (-2, 0, -8), "shin_R": (8, 0, 0)},
                 (0, 0.16, -0.170), (0.75, -0.66, 0.0), None, set_mode(False)),
            ],
        ),
    }

    bake_humanoid_animations(arm_obj, anims)
    export_unit_blend_and_glb(cb_mesh, arm_obj, BLEND_OUT, GLB_OUT)


if __name__ == "__main__":
    build_and_export()

"""
Builds, rigs, and animates the rigged Swordsman unit (2000-3000 tris) -> swordsman_rigged.glb/.blend.
Run via: blender --background --python scripts/blender_swordsman_rigged.py
"""

import math
import os
import sys

import bpy
import bmesh
from mathutils import Euler, Vector

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
    build_heater_shield_bm,
    build_lofted_tube,
    build_nasal_helmet_bm,
    build_torso_neck_head_bm,
    build_trousers_bm,
    build_tunic_bm,
    clear_scene,
    create_humanoid_armature,
    create_mesh_obj,
    export_unit_blend_and_glb,
    make_chainmail_material,
    make_material,
    make_plate_material,
    make_shield_material,
    make_skin_material,
    set_bm_vertex_color,
)

GLB_OUT = os.path.join(ROOT_DIR, "public", "models", "units", "swordsman_rigged.glb")
BLEND_OUT = os.path.join(ROOT_DIR, "assets", "blender", "swordsman_rigged.blend")


def build_cape_bm():
    """Flowing back cape starting narrow at the neck and tinted in hard player color (R=1)."""
    bm = bmesh.new()
    uv_layer = bm.loops.layers.uv.new("UVMap")
    color_layer = bm.loops.layers.color.new("Col")
    rows = 6
    cols = 5
    z_vals = [0.472, 0.432, 0.358, 0.275, 0.192, 0.115]
    widths = [0.046, 0.072, 0.104, 0.124, 0.138, 0.148]
    y_vals = [0.036, 0.068, 0.090, 0.106, 0.120, 0.132]

    grid = []
    for r in range(rows):
        row = []
        for c in range(cols):
            t = c / (cols - 1)
            x = (-0.5 + t) * 2.0 * widths[r]
            curve = 0.014 * math.cos((t - 0.5) * math.pi)
            y = y_vals[r] + curve
            row.append(bm.verts.new((x, y, z_vals[r])))
        grid.append(row)

    for r in range(rows - 1):
        for c in range(cols - 1):
            f = bm.faces.new((grid[r][c], grid[r + 1][c], grid[r + 1][c + 1], grid[r][c + 1]))
            for loop in f.loops:
                co = loop.vert.co
                loop[uv_layer].uv = ((co.x / 0.30) + 0.5, (co.z - 0.11) / 0.37)
                loop[color_layer] = (1.0, 0.0, 0.0, 1.0)
    bm.normal_update()
    return bm


def build_sword_obj(mats):
    """One-handed medieval arming sword along local +Z."""
    bpy.ops.object.select_all(action="DESELECT")
    bm_grip = bmesh.new()
    build_lofted_tube(
        bm_grip,
        [
            (Vector((0, 0, -0.08)), 0.015, 0.015),  # pommel
            (Vector((0, 0, -0.06)), 0.010, 0.010),
            (Vector((0, 0, 0.04)), 0.010, 0.010),
        ],
        segs=8,
        p=2.0,
    )
    set_bm_vertex_color(bm_grip, (0.0, 0.0, 0.0, 1.0))
    grip = create_mesh_obj("Sword_Grip", bm_grip, mats["leather"])

    bm_blade = bmesh.new()
    # Crossguard
    build_lofted_tube(
        bm_blade,
        [
            (Vector((-0.055, 0, 0.045)), 0.006, 0.008),
            (Vector((0.0, 0, 0.045)), 0.008, 0.010),
            (Vector((0.055, 0, 0.045)), 0.006, 0.008),
        ],
        segs=6,
        p=2.0,
    )
    # Double-edged steel blade
    build_lofted_tube(
        bm_blade,
        [
            (Vector((0, 0, 0.050)), 0.018, 0.005),
            (Vector((0, 0, 0.280)), 0.015, 0.004),
            (Vector((0, 0, 0.420)), 0.010, 0.003),
            (Vector((0, 0, 0.470)), 0.002, 0.002),
        ],
        segs=6,
        p=1.6,
    )
    set_bm_vertex_color(bm_blade, (0.0, 0.0, 0.0, 1.0))
    blade = create_mesh_obj("Sword_Blade", bm_blade, mats["plate"])

    bpy.ops.object.select_all(action="DESELECT")
    grip.select_set(True)
    blade.select_set(True)
    bpy.context.view_layer.objects.active = blade
    bpy.ops.object.join()
    blade.name = "SwordWeapon"
    return blade


def build_and_export():
    clear_scene()
    mats = {
        "skin": make_skin_material("Swordsman"),
        "plate": make_plate_material("Swordsman"),
        "chainmail": make_chainmail_material("Swordsman"),
        "leather": make_material("SwordsmanLeather", (0.26, 0.16, 0.09, 1.0), metallic=0.04, roughness=0.80),
        "cape": make_material("SwordsmanCape", (0.61, 0.61, 0.61, 1.0), metallic=0.0, roughness=0.86, double_sided=True),
        "shield": make_shield_material("Swordsman"),
    }

    def tag(bm, rgba=(0.0, 0.0, 0.0, 1.0)):
        set_bm_vertex_color(bm, rgba)
        return bm

    parts = [
        create_mesh_obj("Body_TorsoHead", tag(build_torso_neck_head_bm()), mats["skin"]),
        create_mesh_obj("Body_Arm_L", tag(build_arm_bm(+1.0)), mats["skin"]),
        create_mesh_obj("Body_Arm_R", tag(build_arm_bm(-1.0)), mats["skin"]),
        create_mesh_obj("Armor_PlateCuirass", tag(build_tunic_bm()), mats["plate"]),
        create_mesh_obj("Garb_Belt", tag(build_belt_bm()), mats["leather"]),
        create_mesh_obj("Armor_Greaves", tag(build_trousers_bm()), mats["chainmail"]),
        create_mesh_obj("Garb_Boots", tag(build_boots_bm()), mats["leather"]),
        create_mesh_obj("Helmet_Nasal", tag(build_nasal_helmet_bm()), mats["plate"]),
        create_mesh_obj("Helmet_Chainmail", tag(build_chainmail_aventail_bm()), mats["chainmail"]),
        create_mesh_obj("Garb_Cape", build_cape_bm(), mats["cape"]),
    ]

    bpy.ops.object.select_all(action="DESELECT")
    for p in parts:
        p.select_set(True)
    swordsman_mesh = parts[0]
    swordsman_mesh.name = "MedievalSwordsman"
    bpy.context.view_layer.objects.active = swordsman_mesh
    bpy.ops.object.join()

    def configure_swordsman_shield_socket(eb, _add_bone):
        # Detach shield from left hand and mount on forearm_L
        sb = eb["shieldSocket"]
        sb.parent = eb["forearm_L"]
        sb.use_connect = False
        sb.head = Vector((0.235, -0.008, 0.386))
        sb.tail = Vector((0.235, -0.068, 0.386))
        sb.align_roll(Vector((0, 0, 1)))

    arm_obj = create_humanoid_armature("SwordsmanArmature", configure_swordsman_shield_socket)
    assign_humanoid_skin_weights(swordsman_mesh, arm_obj, cape_y_threshold=0.064)

    sword = build_sword_obj(mats)
    sword.parent = arm_obj
    sword.parent_type = "BONE"
    sword.parent_bone = "weaponSocket"
    sword.matrix_parent_inverse.identity()
    sword.location = Vector((0.0, -arm_obj.data.bones["weaponSocket"].length, 0.0))

    shield = build_heater_shield_bm(mats["shield"], mats["plate"])
    shield.parent = arm_obj
    shield.parent_type = "BONE"
    shield.parent_bone = "shieldSocket"
    shield.matrix_parent_inverse.identity()
    shield.location = Vector((0.0, -0.0618094, 0.0469022))
    shield.rotation_euler = Euler((-0.2279329, 0.0, 0.0), "XYZ")

    anims = {
        # Idle: subtle breathing cycle modeled after the peasant idle_stance, wide balanced stance (left leg/foot well away from body & right leg)
        "idle_stance": (
            72,
            [
                (1, {"pelvis": (0, 0, -6), "spine": (8, 0, 6), "chest": (6, 0, 0), "head": (-8, 0, 0),
                     "upperArm_L": (-16, -24, -46), "forearm_L": (0, 18, -96),
                     "upperArm_R": (-64, 0, 20), "forearm_R": (0, 0, 40),
                     "thigh_L": (-18, 0, -14), "shin_L": (22, 0, -10), "foot_L": (-4, 0, -12),
                     "thigh_R": (8, 0, 8), "shin_R": (10, 0, 14), "foot_R": (-8, 0, 6)},
                 (0, 0, -0.020), (0.0, -0.25, 1.0), (0.644, -0.765, 0.02)),
                (36, {"pelvis": (0, 0, -6), "spine": (11, 0, 6), "chest": (4, 0, 0), "head": (-5, 0, 0),
                      "upperArm_L": (-14, -24, -48), "forearm_L": (0, 18, -96),
                      "upperArm_R": (-62, 0, 20), "forearm_R": (0, 0, 38),
                      "thigh_L": (-18, 0, -14), "shin_L": (22, 0, -10), "foot_L": (-4, 0, -12),
                      "thigh_R": (8, 0, 8), "shin_R": (10, 0, 14), "foot_R": (-8, 0, 6)},
                 (0, 0, -0.017), (0.0, -0.25, 1.0), (0.644, -0.765, 0.02)),
                (72, {"pelvis": (0, 0, -6), "spine": (8, 0, 6), "chest": (6, 0, 0), "head": (-8, 0, 0),
                      "upperArm_L": (-16, -24, -46), "forearm_L": (0, 18, -96),
                      "upperArm_R": (-64, 0, 20), "forearm_R": (0, 0, 40),
                      "thigh_L": (-18, 0, -14), "shin_L": (22, 0, -10), "foot_L": (-4, 0, -12),
                      "thigh_R": (8, 0, 8), "shin_R": (10, 0, 14), "foot_R": (-8, 0, 6)},
                 (0, 0, -0.020), (0.0, -0.25, 1.0), (0.644, -0.765, 0.02)),
            ],
        ),
        # Secondary idle: stretch and raise sword up high, then return to ready stance
        "idle_raise_sword": (
            72,
            [
                (1, {"pelvis": (0, 0, -8), "spine": (6, 0, 6), "head": (-6, 0, 0),
                     "upperArm_L": (-16, -24, -46), "forearm_L": (0, 18, -96),
                     "upperArm_R": (-62, 0, 22), "forearm_R": (0, 0, 44),
                     "thigh_L": (-18, 0, -14), "shin_L": (22, 0, -10), "foot_L": (-4, 0, -12),
                     "thigh_R": (8, 0, 8), "shin_R": (10, 0, 14), "foot_R": (-8, 0, 6)},
                 (0, 0, -0.020), (0.0, -0.25, 1.0), (0.644, -0.765, 0.02)),
                (34, {"pelvis": (0, 0, -6), "spine": (-6, 0, 4), "head": (-12, 0, 0),
                      "upperArm_L": (-16, -24, -44), "forearm_L": (0, 18, -96),
                      "upperArm_R": (56, 0, 20), "forearm_R": (0, 0, 18),
                      "thigh_L": (-16, 0, -14), "shin_L": (20, 0, -10), "foot_L": (-4, 0, -12),
                      "thigh_R": (8, 0, 8), "shin_R": (10, 0, 14), "foot_R": (-8, 0, 6)},
                 (0, 0, -0.012), (0.0, -0.15, 1.0), (0.644, -0.765, 0.02)),
                (72, {"pelvis": (0, 0, -8), "spine": (6, 0, 6), "head": (-6, 0, 0),
                      "upperArm_L": (-16, -24, -46), "forearm_L": (0, 18, -96),
                      "upperArm_R": (-62, 0, 22), "forearm_R": (0, 0, 44),
                      "thigh_L": (-18, 0, -14), "shin_L": (22, 0, -10), "foot_L": (-4, 0, -12),
                      "thigh_R": (8, 0, 8), "shin_R": (10, 0, 14), "foot_R": (-8, 0, 6)},
                 (0, 0, -0.020), (0.0, -0.25, 1.0), (0.644, -0.765, 0.02)),
            ],
        ),
        "combat_move_advance": (
            24,
            [
                (1, {"pelvis": (8, 4, -10), "spine": (14, 0, 8), "head": (-14, 0, 0),
                     "upperArm_L": (-48, 0, -54), "forearm_L": (0, 0, -52),
                     "upperArm_R": (-56, 0, 20), "forearm_R": (0, 0, 60),
                     "thigh_L": (-40, 0, 4), "shin_L": (18, 0, 0), "thigh_R": (22, 0, -4), "shin_R": (16, 0, 0)},
                 (0, 0, -0.024), (0.0, -0.5, 0.86), (0.55, -0.82, 0.08)),
                (12, {"pelvis": (8, -4, 10), "spine": (14, 0, -8), "head": (-12, 0, 0),
                      "upperArm_L": (-46, 0, -58), "forearm_L": (0, 0, -50),
                      "upperArm_R": (-54, 0, 24), "forearm_R": (0, 0, 58),
                      "thigh_L": (22, 0, 4), "shin_L": (16, 0, 0), "thigh_R": (-40, 0, -4), "shin_R": (18, 0, 0)},
                 (0, 0, -0.024), (0.0, -0.5, 0.86), (0.55, -0.82, 0.08)),
                (24, {"pelvis": (8, 4, -10), "spine": (14, 0, 8), "head": (-14, 0, 0),
                      "upperArm_L": (-48, 0, -54), "forearm_L": (0, 0, -52),
                      "upperArm_R": (-56, 0, 20), "forearm_R": (0, 0, 60),
                      "thigh_L": (-40, 0, 4), "shin_L": (18, 0, 0), "thigh_R": (22, 0, -4), "shin_R": (16, 0, 0)},
                 (0, 0, -0.024), (0.0, -0.5, 0.86), (0.55, -0.82, 0.08)),
            ],
        ),
        "combat_attack_poke": (
            28,
            [
                (1, {"pelvis": (6, 0, -18), "spine": (10, 0, 10), "head": (-14, 0, 0),
                     "upperArm_L": (-46, 0, -62), "forearm_L": (0, 0, -58),
                     "upperArm_R": (-42, 0, -16), "forearm_R": (0, 0, 88),
                     "thigh_L": (-28, 0, 12), "shin_L": (34, 0, 0), "thigh_R": (20, 0, -12), "shin_R": (26, 0, 0)},
                 (0, 0, -0.032), (-0.3, -0.2, 0.9), (0.35, -0.92, 0.06)),
                (14, {"pelvis": (14, 0, 22), "spine": (24, 0, 16), "head": (-24, 0, -12),
                      "upperArm_L": (-42, 0, -72), "forearm_L": (0, 0, -42),
                      "upperArm_R": (-38, 0, 74), "forearm_R": (0, 0, 18),
                      "thigh_L": (-46, 0, 10), "shin_L": (50, 0, 0), "thigh_R": (34, 0, -10), "shin_R": (16, 0, 0)},
                 (0, -0.07, -0.048), (0.3, -0.92, 0.1), (0.45, -0.88, 0.04)),
                (28, {"pelvis": (6, 0, -18), "spine": (10, 0, 10), "head": (-14, 0, 0),
                      "upperArm_L": (-46, 0, -62), "forearm_L": (0, 0, -58),
                      "upperArm_R": (-42, 0, -16), "forearm_R": (0, 0, 88),
                      "thigh_L": (-28, 0, 12), "shin_L": (34, 0, 0), "thigh_R": (20, 0, -12), "shin_R": (26, 0, 0)},
                 (0, 0, -0.032), (-0.3, -0.2, 0.9), (0.35, -0.92, 0.06)),
            ],
        ),
        # Defensive stance: raise heater shield high in front
        "combat_defensive_stance": (
            48,
            [
                (1, {"pelvis": (6, 0, -22), "spine": (12, 0, 14), "head": (-16, 0, 6),
                     "upperArm_L": (-22, 0, -76), "forearm_L": (0, 0, -66),
                     "upperArm_R": (-56, 0, 14), "forearm_R": (0, 0, 78),
                     "thigh_L": (-28, 0, 8), "shin_L": (34, 0, 0), "thigh_R": (18, 0, -8), "shin_R": (26, 0, 0)},
                 (0, 0, -0.032), (0.2, -0.3, 0.9), (0.12, -0.98, 0.15)),
                (24, {"pelvis": (7, 0, -22), "spine": (14, 0, 14), "head": (-15, 0, 6),
                      "upperArm_L": (-20, 0, -78), "forearm_L": (0, 0, -64),
                      "upperArm_R": (-54, 0, 16), "forearm_R": (0, 0, 76),
                      "thigh_L": (-28, 0, 8), "shin_L": (34, 0, 0), "thigh_R": (18, 0, -8), "shin_R": (26, 0, 0)},
                 (0, 0, -0.036), (0.2, -0.3, 0.9), (0.12, -0.98, 0.15)),
                (48, {"pelvis": (6, 0, -22), "spine": (12, 0, 14), "head": (-16, 0, 6),
                      "upperArm_L": (-22, 0, -76), "forearm_L": (0, 0, -66),
                      "upperArm_R": (-56, 0, 14), "forearm_R": (0, 0, 78),
                      "thigh_L": (-28, 0, 8), "shin_L": (34, 0, 0), "thigh_R": (18, 0, -8), "shin_R": (26, 0, 0)},
                 (0, 0, -0.032), (0.2, -0.3, 0.9), (0.12, -0.98, 0.15)),
            ],
        ),
        "death": (
            36,
            [
                (1, {"pelvis": (4, 0, -10), "spine": (6, 0, 6), "head": (-6, 0, 0),
                     "upperArm_L": (-60, 0, -32), "forearm_L": (0, 0, -48),
                     "upperArm_R": (-62, 0, 22), "forearm_R": (0, 0, 44),
                     "thigh_L": (-14, 0, 6), "shin_L": (18, 0, 0), "thigh_R": (10, 0, -6), "shin_R": (14, 0, 0)},
                 (0, 0, -0.015), (0.0, -0.25, 1.0), (0.70, -0.70, 0.05)),
                (16, {"pelvis": (-32, 6, -6), "spine": (-14, 0, 4), "head": (16, 0, -8),
                      "upperArm_L": (-60, 0, -10), "forearm_L": (0, 0, -16),
                      "upperArm_R": (-64, 0, 8), "forearm_R": (0, 0, 20),
                      "thigh_L": (-32, 0, 10), "shin_L": (56, 0, 0), "thigh_R": (-20, 0, -10), "shin_R": (48, 0, 0)},
                 (0, 0.07, -0.09), (0.5, -0.7, 0.4), (0.5, -0.3, 0.8)),
                (36, {"pelvis": (-86, 8, 0), "spine": (-4, 0, 0), "head": (6, 0, -10),
                      "upperArm_L": (-68, 0, 18), "forearm_L": (0, 0, 12),
                      "upperArm_R": (-70, 0, -22), "forearm_R": (0, 0, -14),
                      "thigh_L": (-4, 0, 8), "shin_L": (10, 0, 0), "thigh_R": (-2, 0, -8), "shin_R": (8, 0, 0)},
                 (0, 0.16, -0.170), (0.75, -0.66, 0.0), (0.08, -0.06, 0.995)),
            ],
        ),
    }

    bake_humanoid_animations(arm_obj, anims)
    export_unit_blend_and_glb(swordsman_mesh, arm_obj, BLEND_OUT, GLB_OUT)


if __name__ == "__main__":
    build_and_export()

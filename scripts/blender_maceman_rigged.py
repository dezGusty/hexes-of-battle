"""
Builds, rigs, and animates the rigged Maceman unit (2000-3000 tris) -> maceman_rigged.glb/.blend.
Run via: blender --background --python scripts/blender_maceman_rigged.py
"""

import os
import sys

import bpy
import bmesh
from mathutils import Vector

sys.path.insert(0, os.path.dirname(__file__))
from blender_rigged_common import (
    ROOT_DIR,
    assign_humanoid_skin_weights,
    bake_humanoid_animations,
    build_arm_bm,
    build_belt_bm,
    build_boots_bm,
    build_chainmail_aventail_bm,
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
    make_gambeson_material,
    make_material,
    make_plate_material,
    make_skin_material,
    set_bm_vertex_color,
)

GLB_OUT = os.path.join(ROOT_DIR, "public", "models", "units", "maceman_rigged.glb")
BLEND_OUT = os.path.join(ROOT_DIR, "assets", "blender", "maceman_rigged.blend")


def build_two_handed_mace_obj(mats):
    """Long two-handed flanged steel mace along local +Z."""
    bpy.ops.object.select_all(action="DESELECT")
    bm_shaft = bmesh.new()
    build_lofted_tube(
        bm_shaft,
        [
            (Vector((0, 0, -0.20)), 0.012, 0.012),
            (Vector((0, 0, 0.00)), 0.013, 0.013),
            (Vector((0, 0, 0.36)), 0.013, 0.013),
        ],
        segs=8,
        p=2.0,
    )
    set_bm_vertex_color(bm_shaft, (0.0, 0.0, 0.0, 1.0))
    shaft = create_mesh_obj("Mace_Shaft", bm_shaft, mats["wood"])

    bm_head = bmesh.new()
    build_lofted_tube(
        bm_head,
        [
            (Vector((0, 0, 0.34)), 0.018, 0.018),
            (Vector((0, 0, 0.38)), 0.042, 0.042),
            (Vector((0, 0, 0.43)), 0.044, 0.044),
            (Vector((0, 0, 0.47)), 0.016, 0.016),
            (Vector((0, 0, 0.50)), 0.004, 0.004),
        ],
        segs=8,
        p=1.4,  # star-like flanged cross section
    )
    set_bm_vertex_color(bm_head, (0.0, 0.0, 0.0, 1.0))
    head = create_mesh_obj("Mace_Head", bm_head, mats["plate"])

    bpy.ops.object.select_all(action="DESELECT")
    shaft.select_set(True)
    head.select_set(True)
    bpy.context.view_layer.objects.active = shaft
    bpy.ops.object.join()
    shaft.name = "MaceWeapon"
    return shaft


def build_and_export():
    clear_scene()
    mats = {
        "skin": make_skin_material("Maceman"),
        "gambeson": make_gambeson_material("Maceman"),
        "trousers": make_material("MacemanTrousers", (0.24, 0.20, 0.17, 1.0), metallic=0.0, roughness=0.92),
        "leather": make_material("MacemanLeather", (0.28, 0.18, 0.10, 1.0), metallic=0.04, roughness=0.82),
        "plate": make_plate_material("Maceman"),
        "chainmail": make_chainmail_material("Maceman"),
        "wood": make_material("MacemanWood", (0.38, 0.24, 0.13, 1.0), metallic=0.02, roughness=0.85),
    }

    def tag(bm, rgba=(0.0, 0.0, 0.0, 1.0)):
        set_bm_vertex_color(bm, rgba)
        return bm

    parts = [
        create_mesh_obj("Body_TorsoHead", tag(build_torso_neck_head_bm()), mats["skin"]),
        create_mesh_obj("Body_Arm_L", tag(build_arm_bm(+1.0)), mats["skin"]),
        create_mesh_obj("Body_Arm_R", tag(build_arm_bm(-1.0)), mats["skin"]),
        create_mesh_obj("Garb_Gambeson", tag(build_tunic_bm(), (1.0, 0.0, 0.0, 1.0)), mats["gambeson"]),
        create_mesh_obj("Garb_Belt", tag(build_belt_bm()), mats["leather"]),
        create_mesh_obj("Garb_Trousers", tag(build_trousers_bm()), mats["trousers"]),
        create_mesh_obj("Garb_Boots", tag(build_boots_bm()), mats["leather"]),
        create_mesh_obj("Helmet_Nasal", tag(build_nasal_helmet_bm()), mats["plate"]),
        create_mesh_obj("Helmet_Chainmail", tag(build_chainmail_aventail_bm()), mats["chainmail"]),
    ]

    bpy.ops.object.select_all(action="DESELECT")
    for p in parts:
        p.select_set(True)
    maceman_mesh = parts[0]
    maceman_mesh.name = "MedievalMaceman"
    bpy.context.view_layer.objects.active = maceman_mesh
    bpy.ops.object.join()

    arm_obj = create_humanoid_armature("MacemanArmature")
    assign_humanoid_skin_weights(maceman_mesh, arm_obj, cape_y_threshold=0.99)

    mace = build_two_handed_mace_obj(mats)
    mace.parent = arm_obj
    mace.parent_type = "BONE"
    mace.parent_bone = "weaponSocket"
    mace.matrix_parent_inverse.identity()

    def curl_pose(arm_r_rot, fore_r_rot, spine_x=4):
        return (
            {"pelvis": (0, 0, -6), "spine": (spine_x, 0, 4), "head": (-4, 0, 0),
             "upperArm_L": (-64, 0, -18), "forearm_L": (0, 0, -24),
             "upperArm_R": arm_r_rot, "forearm_R": fore_r_rot,
             "thigh_L": (-8, 0, 5), "shin_L": (10, 0, 0), "thigh_R": (6, 0, -5), "shin_R": (8, 0, 0)},
            (0, 0, -0.008),
            (0.0, -0.9, 0.4),
        )

    anims = {
        # Idle: use mace like a dumbbell for 3 quick lifts
        "idle_stance": (
            72,
            [
                (1, *curl_pose((-72, 0, 12), (0, 0, 20), 6)),
                (10, *curl_pose((-36, 0, 24), (0, 0, 110), 2)),
                (20, *curl_pose((-72, 0, 12), (0, 0, 20), 6)),
                (30, *curl_pose((-36, 0, 24), (0, 0, 110), 2)),
                (40, *curl_pose((-72, 0, 12), (0, 0, 20), 6)),
                (50, *curl_pose((-36, 0, 24), (0, 0, 110), 2)),
                (62, *curl_pose((-72, 0, 12), (0, 0, 20), 6)),
                (72, *curl_pose((-72, 0, 12), (0, 0, 20), 6)),
            ],
        ),
        "combat_move_advance": (
            24,
            [
                (1, {"pelvis": (8, 4, -8), "spine": (12, 0, 6), "head": (-12, 0, 0),
                     "upperArm_L": (-48, 0, -56), "forearm_L": (0, 0, -48),
                     "upperArm_R": (-54, 0, 26), "forearm_R": (0, 0, 64),
                     "thigh_L": (-38, 0, 4), "shin_L": (18, 0, 0), "thigh_R": (22, 0, -4), "shin_R": (16, 0, 0)},
                 (0, 0, -0.022), (0.65, -0.4, 0.65)),
                (12, {"pelvis": (8, -4, 8), "spine": (12, 0, -6), "head": (-12, 0, 0),
                      "upperArm_L": (-46, 0, -58), "forearm_L": (0, 0, -46),
                      "upperArm_R": (-52, 0, 28), "forearm_R": (0, 0, 62),
                      "thigh_L": (22, 0, 4), "shin_L": (16, 0, 0), "thigh_R": (-38, 0, -4), "shin_R": (18, 0, 0)},
                 (0, 0, -0.022), (0.65, -0.4, 0.65)),
                (24, {"pelvis": (8, 4, -8), "spine": (12, 0, 6), "head": (-12, 0, 0),
                      "upperArm_L": (-48, 0, -56), "forearm_L": (0, 0, -48),
                      "upperArm_R": (-54, 0, 26), "forearm_R": (0, 0, 64),
                      "thigh_L": (-38, 0, 4), "shin_L": (18, 0, 0), "thigh_R": (22, 0, -4), "shin_R": (16, 0, 0)},
                 (0, 0, -0.022), (0.65, -0.4, 0.65)),
            ],
        ),
        "combat_attack_poke": (
            30,
            [
                (1, {"pelvis": (6, 0, -14), "spine": (10, 0, 8), "head": (-12, 0, 0),
                     "upperArm_L": (-44, 0, -58), "forearm_L": (0, 0, -54),
                     "upperArm_R": (-50, 0, 28), "forearm_R": (0, 0, 72),
                     "thigh_L": (-26, 0, 10), "shin_L": (30, 0, 0), "thigh_R": (18, 0, -10), "shin_R": (24, 0, 0)},
                 (0, 0, -0.028), (0.6, -0.4, 0.7)),
                (10, {"pelvis": (2, 0, -24), "spine": (-12, 0, -10), "head": (10, 0, 10),
                      "upperArm_L": (36, 0, -42), "forearm_L": (0, 0, -34),
                      "upperArm_R": (44, 0, 22), "forearm_R": (0, 0, 42),
                      "thigh_L": (-22, 0, 10), "shin_L": (26, 0, 0), "thigh_R": (22, 0, -10), "shin_R": (30, 0, 0)},
                 (0, 0.03, -0.024), (0.2, 0.6, 0.78)),
                (18, {"pelvis": (16, 0, 18), "spine": (26, 0, 14), "head": (-24, 0, -10),
                      "upperArm_L": (-36, 0, -76), "forearm_L": (0, 0, -24),
                      "upperArm_R": (-38, 0, 76), "forearm_R": (0, 0, 20),
                      "thigh_L": (-46, 0, 10), "shin_L": (50, 0, 0), "thigh_R": (34, 0, -10), "shin_R": (16, 0, 0)},
                 (0, -0.07, -0.048), (0.0, -0.95, -0.25)),
                (30, {"pelvis": (6, 0, -14), "spine": (10, 0, 8), "head": (-12, 0, 0),
                      "upperArm_L": (-44, 0, -58), "forearm_L": (0, 0, -54),
                      "upperArm_R": (-50, 0, 28), "forearm_R": (0, 0, 72),
                      "thigh_L": (-26, 0, 10), "shin_L": (30, 0, 0), "thigh_R": (18, 0, -10), "shin_R": (24, 0, 0)},
                 (0, 0, -0.028), (0.6, -0.4, 0.7)),
            ],
        ),
        # Defensive stance: brace and hold two-handed mace diagonally across front to block
        "combat_defensive_stance": (
            48,
            [
                (1, {"pelvis": (6, 0, -16), "spine": (12, 0, 12), "head": (-14, 0, 4),
                     "upperArm_L": (-30, 0, -68), "forearm_L": (0, 0, -52),
                     "upperArm_R": (-38, 0, 44), "forearm_R": (0, 0, 80),
                     "thigh_L": (-26, 0, 8), "shin_L": (30, 0, 0), "thigh_R": (18, 0, -8), "shin_R": (24, 0, 0)},
                 (0, 0, -0.030), (0.72, -0.25, 0.65)),
                (24, {"pelvis": (7, 0, -16), "spine": (14, 0, 12), "head": (-13, 0, 4),
                      "upperArm_L": (-28, 0, -70), "forearm_L": (0, 0, -50),
                      "upperArm_R": (-36, 0, 46), "forearm_R": (0, 0, 78),
                      "thigh_L": (-26, 0, 8), "shin_L": (30, 0, 0), "thigh_R": (18, 0, -8), "shin_R": (24, 0, 0)},
                 (0, 0, -0.034), (0.72, -0.25, 0.65)),
                (48, {"pelvis": (6, 0, -16), "spine": (12, 0, 12), "head": (-14, 0, 4),
                      "upperArm_L": (-30, 0, -68), "forearm_L": (0, 0, -52),
                      "upperArm_R": (-38, 0, 44), "forearm_R": (0, 0, 80),
                      "thigh_L": (-26, 0, 8), "shin_L": (30, 0, 0), "thigh_R": (18, 0, -8), "shin_R": (24, 0, 0)},
                 (0, 0, -0.030), (0.72, -0.25, 0.65)),
            ],
        ),
        "death": (
            36,
            [
                (1, {"pelvis": (4, 0, -8), "spine": (6, 0, 6), "head": (-6, 0, 0),
                     "upperArm_L": (-54, 0, -40), "forearm_L": (0, 0, -35),
                     "upperArm_R": (-60, 0, 20), "forearm_R": (0, 0, 45),
                     "thigh_L": (-14, 0, 6), "shin_L": (18, 0, 0), "thigh_R": (10, 0, -6), "shin_R": (14, 0, 0)},
                 (0, 0, -0.015), (0.65, -0.4, 0.65)),
                (16, {"pelvis": (-32, 6, -6), "spine": (-14, 0, 4), "head": (16, 0, -8),
                      "upperArm_L": (-60, 0, -10), "forearm_L": (0, 0, -16),
                      "upperArm_R": (-64, 0, 8), "forearm_R": (0, 0, 20),
                      "thigh_L": (-32, 0, 10), "shin_L": (56, 0, 0), "thigh_R": (-20, 0, -10), "shin_R": (48, 0, 0)},
                 (0, 0.07, -0.09), (0.6, -0.6, 0.4)),
                (36, {"pelvis": (-86, 8, 0), "spine": (-4, 0, 0), "head": (6, 0, -10),
                      "upperArm_L": (-68, 0, 18), "forearm_L": (0, 0, 12),
                      "upperArm_R": (-70, 0, -22), "forearm_R": (0, 0, -14),
                      "thigh_L": (-4, 0, 8), "shin_L": (10, 0, 0), "thigh_R": (-2, 0, -8), "shin_R": (8, 0, 0)},
                 (0, 0.16, -0.170), (0.75, -0.66, 0.0)),
            ],
        ),
    }

    bake_humanoid_animations(arm_obj, anims)
    export_unit_blend_and_glb(maceman_mesh, arm_obj, BLEND_OUT, GLB_OUT)


if __name__ == "__main__":
    build_and_export()

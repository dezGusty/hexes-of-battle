"""
Builds, rigs, and animates the rigged Heavy Armored Knight on Warhorse (2000-3000 tris)
-> armored_knight_rigged.glb/.blend.
Run via: blender --background --python scripts/blender_armored_knight_rigged.py
"""

import math
import os
import sys

import bpy
import bmesh
from mathutils import Euler, Matrix, Vector

sys.path.insert(0, os.path.dirname(__file__))
from blender_rigged_common import (
    ROOT_DIR,
    apply_cylindrical_uv,
    build_arm_bm,
    build_boots_bm,
    build_heater_shield_bm,
    build_lofted_tube,
    build_torso_neck_head_bm,
    build_trousers_bm,
    build_tunic_bm,
    clear_scene,
    create_mesh_obj,
    export_unit_blend_and_glb,
    make_chainmail_material,
    make_material,
    make_plate_material,
    make_shield_material,
    make_skin_material,
    set_bm_vertex_color,
)

GLB_OUT = os.path.join(ROOT_DIR, "public", "models", "units", "armored_knight_rigged.glb")
BLEND_OUT = os.path.join(ROOT_DIR, "assets", "blender", "armored_knight_rigged.blend")

RIDER_Z_OFFSET = 0.255
RIDER_Y_OFFSET = 0.015


def build_horse_body_bm():
    """Organic sculpted warhorse torso, neck, head, ears, mane, and tail."""
    bm = bmesh.new()
    # Barrel torso (-Y is forward)
    build_lofted_tube(
        bm,
        [
            (Vector((0.0, 0.24, 0.34)), 0.065, 0.070),
            (Vector((0.0, 0.14, 0.38)), 0.095, 0.105),
            (Vector((0.0, 0.00, 0.36)), 0.092, 0.102),
            (Vector((0.0, -0.14, 0.39)), 0.098, 0.110),
            (Vector((0.0, -0.22, 0.37)), 0.068, 0.078),
        ],
        segs=12,
        p=2.1,
    )
    # Arched neck & sculpted horse head
    build_lofted_tube(
        bm,
        [
            (Vector((0.0, -0.17, 0.40)), 0.058, 0.068),
            (Vector((0.0, -0.24, 0.50)), 0.044, 0.056),
            (Vector((0.0, -0.29, 0.58)), 0.036, 0.046),
            (Vector((0.0, -0.34, 0.57)), 0.034, 0.044),
            (Vector((0.0, -0.41, 0.50)), 0.022, 0.026),
        ],
        segs=10,
        p=2.0,
    )
    # Ears
    for side in (-1.0, 1.0):
        build_lofted_tube(
            bm,
            [
                (Vector((side * 0.022, -0.29, 0.60)), 0.008, 0.010),
                (Vector((side * 0.026, -0.28, 0.64)), 0.003, 0.004),
            ],
            segs=5,
            p=2.0,
        )
    # Tail
    build_lofted_tube(
        bm,
        [
            (Vector((0.0, 0.24, 0.37)), 0.018, 0.018),
            (Vector((0.0, 0.29, 0.28)), 0.024, 0.024),
            (Vector((0.0, 0.31, 0.16)), 0.014, 0.014),
        ],
        segs=6,
        p=2.0,
    )
    set_bm_vertex_color(bm, (0.0, 0.0, 0.0, 1.0))
    return bm


def build_horse_legs_bm():
    """Four articulated horse legs with hooves (Y: front=-0.16, rear=+0.17)."""
    bm = bmesh.new()
    specs = [
        (0.062, -0.16), (-0.062, -0.16),
        (0.065, 0.17), (-0.065, 0.17),
    ]
    for lx, ly in specs:
        build_lofted_tube(
            bm,
            [
                (Vector((lx, ly, 0.35)), 0.030, 0.034),
                (Vector((lx, ly, 0.19)), 0.020, 0.022),
                (Vector((lx, ly, 0.04)), 0.016, 0.018),
                (Vector((lx, ly, 0.00)), 0.020, 0.022),
            ],
            segs=8,
            p=2.0,
        )
    set_bm_vertex_color(bm, (0.0, 0.0, 0.0, 1.0))
    return bm


def build_saddle_bm():
    bm = bmesh.new()
    build_lofted_tube(
        bm,
        [
            (Vector((0.0, 0.08, 0.45)), 0.095, 0.024),
            (Vector((0.0, 0.00, 0.44)), 0.096, 0.018),
            (Vector((0.0, -0.08, 0.46)), 0.092, 0.024),
        ],
        segs=10,
        p=2.2,
    )
    set_bm_vertex_color(bm, (0.0, 0.0, 0.0, 1.0))
    return bm


def build_great_helm_bm():
    """Full medieval great helm (flat-topped cylindrical visor helmet)."""
    bm = bmesh.new()
    build_lofted_tube(
        bm,
        [
            (Vector((0.0, -0.014, 0.495)), 0.056, 0.062),
            (Vector((0.0, -0.014, 0.555)), 0.057, 0.063),
            (Vector((0.0, -0.013, 0.608)), 0.053, 0.058),
            (Vector((0.0, -0.012, 0.625)), 0.024, 0.026),
        ],
        segs=16,
        p=2.1,
    )
    set_bm_vertex_color(bm, (0.0, 0.0, 0.0, 1.0))
    return bm


def build_helm_feather_bm():
    """Sweeping helmet plume feather in the player's color (R=1)."""
    bm = bmesh.new()
    build_lofted_tube(
        bm,
        [
            (Vector((0.0, -0.010, 0.620)), 0.008, 0.012),
            (Vector((0.0, 0.035, 0.675)), 0.014, 0.024),
            (Vector((0.0, 0.095, 0.655)), 0.012, 0.020),
            (Vector((0.0, 0.145, 0.595)), 0.005, 0.008),
        ],
        segs=8,
        p=2.0,
    )
    apply_cylindrical_uv(bm, 0.58, 0.12, 1.0)
    set_bm_vertex_color(bm, (1.0, 0.0, 0.0, 1.0))
    return bm


def build_one_handed_mace_obj(mats):
    """One-handed flanged steel mace along local +Z."""
    bpy.ops.object.select_all(action="DESELECT")
    bm_shaft = bmesh.new()
    build_lofted_tube(
        bm_shaft,
        [
            (Vector((0, 0, -0.08)), 0.011, 0.011),
            (Vector((0, 0, 0.22)), 0.011, 0.011),
        ],
        segs=8,
        p=2.0,
    )
    set_bm_vertex_color(bm_shaft, (0.0, 0.0, 0.0, 1.0))
    shaft = create_mesh_obj("KnightMace_Shaft", bm_shaft, mats["wood"])

    bm_head = bmesh.new()
    build_lofted_tube(
        bm_head,
        [
            (Vector((0, 0, 0.21)), 0.016, 0.016),
            (Vector((0, 0, 0.25)), 0.038, 0.038),
            (Vector((0, 0, 0.29)), 0.038, 0.038),
            (Vector((0, 0, 0.33)), 0.010, 0.010),
        ],
        segs=8,
        p=1.4,
    )
    set_bm_vertex_color(bm_head, (0.0, 0.0, 0.0, 1.0))
    head = create_mesh_obj("KnightMace_Head", bm_head, mats["plate"])

    bpy.ops.object.select_all(action="DESELECT")
    shaft.select_set(True)
    head.select_set(True)
    bpy.context.view_layer.objects.active = shaft
    bpy.ops.object.join()
    shaft.name = "KnightMaceWeapon"
    return shaft


def offset_bm(bm, dy, dz):
    for v in bm.verts:
        v.co.y += dy
        v.co.z += dz
    return bm


def create_mounted_armature():
    arm_data = bpy.data.armatures.new("KnightArmature")
    arm_obj = bpy.data.objects.new("KnightArmature", arm_data)
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

    # Horse skeleton (horse_root pivots around rear hooves when rearing!)
    add_bone("root", (0, 0, 0), (0, 0, 0.08))
    add_bone("horse_body", (0, 0.12, 0.36), (0, -0.16, 0.38), "root", roll_vec=(0, 0, 1))
    add_bone("horse_neck", (0, -0.16, 0.38), (0, -0.30, 0.58), "horse_body", connected=True)
    add_bone("horse_leg_FL", (0.062, -0.16, 0.35), (0.062, -0.16, 0.00), "horse_body")
    add_bone("horse_leg_FR", (-0.062, -0.16, 0.35), (-0.062, -0.16, 0.00), "horse_body")
    add_bone("horse_leg_RL", (0.065, 0.17, 0.35), (0.065, 0.17, 0.00), "horse_body")
    add_bone("horse_leg_RR", (-0.065, 0.17, 0.35), (-0.065, 0.17, 0.00), "horse_body")

    # Rider skeleton parented to horse_body
    rz, ry = RIDER_Z_OFFSET, RIDER_Y_OFFSET
    add_bone("pelvis", (0, ry, 0.245 + rz), (0, ry, 0.300 + rz), "horse_body")
    add_bone("spine", (0, ry, 0.300 + rz), (0, ry - 0.006, 0.380 + rz), "pelvis", connected=True)
    add_bone("chest", (0, ry - 0.006, 0.380 + rz), (0, ry - 0.012, 0.470 + rz), "spine", connected=True)
    add_bone("neck", (0, ry - 0.012, 0.470 + rz), (0, ry - 0.014, 0.505 + rz), "chest", connected=True)
    add_bone("head", (0, ry - 0.014, 0.505 + rz), (0, ry - 0.010, 0.585 + rz), "neck", connected=True)

    add_bone("shoulder_L", (0.045, ry - 0.006, 0.402 + rz), (0.088, ry - 0.006, 0.398 + rz), "chest", roll_vec=(0, 0, 1))
    add_bone("upperArm_L", (0.088, ry - 0.006, 0.398 + rz), (0.175, ry - 0.006, 0.398 + rz), "shoulder_L", connected=True, roll_vec=(0, 0, 1))
    add_bone("forearm_L", (0.175, ry - 0.006, 0.398 + rz), (0.265, ry - 0.008, 0.398 + rz), "upperArm_L", connected=True, roll_vec=(0, 0, 1))
    add_bone("hand_L", (0.265, ry - 0.008, 0.398 + rz), (0.320, ry - 0.013, 0.398 + rz), "forearm_L", connected=True, roll_vec=(0, 0, 1))
    add_bone("shieldSocket", (0.245, ry - 0.008, 0.425 + rz), (0.245, ry - 0.068, 0.425 + rz), "forearm_L", roll_vec=(0, 0, 1))

    add_bone("shoulder_R", (-0.045, ry - 0.006, 0.402 + rz), (-0.088, ry - 0.006, 0.398 + rz), "chest", roll_vec=(0, 0, 1))
    add_bone("upperArm_R", (-0.088, ry - 0.006, 0.398 + rz), (-0.175, ry - 0.006, 0.398 + rz), "shoulder_R", connected=True, roll_vec=(0, 0, 1))
    add_bone("forearm_R", (-0.175, ry - 0.006, 0.398 + rz), (-0.265, ry - 0.008, 0.398 + rz), "upperArm_R", connected=True, roll_vec=(0, 0, 1))
    add_bone("hand_R", (-0.265, ry - 0.008, 0.398 + rz), (-0.320, ry - 0.013, 0.398 + rz), "forearm_R", connected=True, roll_vec=(0, 0, 1))
    add_bone("weaponSocket", (-0.295, ry - 0.011, 0.398 + rz), (-0.295, ry - 0.071, 0.398 + rz), "hand_R", roll_vec=(0, 0, 1))

    add_bone("thigh_L", (0.046, ry - 0.002, 0.230 + rz), (0.050, ry - 0.006, 0.120 + rz), "pelvis")
    add_bone("shin_L", (0.050, ry - 0.006, 0.120 + rz), (0.050, ry + 0.002, 0.036 + rz), "thigh_L", connected=True)
    add_bone("thigh_R", (-0.046, ry - 0.002, 0.230 + rz), (-0.050, ry - 0.006, 0.120 + rz), "pelvis")
    add_bone("shin_R", (-0.050, ry - 0.006, 0.120 + rz), (-0.050, ry + 0.002, 0.036 + rz), "thigh_R", connected=True)

    bpy.ops.object.mode_set(mode="OBJECT")
    return arm_obj


def assign_mounted_skin_weights(mesh_obj, arm_obj):
    vgroups = {b.name: mesh_obj.vertex_groups.new(name=b.name) for b in arm_obj.data.bones}

    def smoothstep(e0, e1, x):
        t = max(0.0, min(1.0, (x - e0) / max(1e-5, e1 - e0)))
        return t * t * (3.0 - 2.0 * t)

    for v in mesh_obj.data.vertices:
        x, y, z = v.co.x, v.co.y, v.co.z
        weights = {}

        # Horse legs (below z = 0.36 and separated front/rear)
        if z < 0.36 and abs(x) > 0.025 and (y < -0.09 or y > 0.10):
            if y < -0.09:
                weights["horse_leg_FL" if x > 0 else "horse_leg_FR"] = 1.0
            else:
                weights["horse_leg_RL" if x > 0 else "horse_leg_RR"] = 1.0
        # Horse neck/head (forward y < -0.19)
        elif y < -0.19 and z < 0.66:
            t = smoothstep(-0.19, -0.25, y)
            weights["horse_body"] = 1.0 - t
            weights["horse_neck"] = t
        # Horse torso & saddle (below rider pelvis z < 0.48)
        elif z < 0.48:
            weights["horse_body"] = 1.0
        else:
            # Rider (shifted by RIDER_Z_OFFSET)
            rz = z - RIDER_Z_OFFSET
            if abs(x) > 0.075 and 0.345 <= rz <= 0.465:
                side = "L" if x > 0 else "R"
                ax = abs(x)
                if ax < 0.105:
                    t = smoothstep(0.075, 0.105, ax)
                    weights[f"shoulder_{side}"] = 1.0 - t
                    weights[f"upperArm_{side}"] = t
                elif ax < 0.195:
                    t = smoothstep(0.155, 0.195, ax)
                    weights[f"upperArm_{side}"] = 1.0 - t
                    weights[f"forearm_{side}"] = t
                elif ax < 0.275:
                    t = smoothstep(0.245, 0.275, ax)
                    weights[f"forearm_{side}"] = 1.0 - t
                    weights[f"hand_{side}"] = t
                else:
                    weights[f"hand_{side}"] = 1.0
            elif rz < 0.245:
                side = "L" if x >= 0 else "R"
                if rz > 0.215:
                    t = smoothstep(0.215, 0.245, rz)
                    weights[f"thigh_{side}"] = 1.0 - t
                    weights["pelvis"] = t
                elif rz > 0.105:
                    t = smoothstep(0.105, 0.145, rz)
                    weights[f"shin_{side}"] = 1.0 - t
                    weights[f"thigh_{side}"] = t
                else:
                    weights[f"shin_{side}"] = 1.0
            else:
                if rz < 0.310:
                    t = smoothstep(0.280, 0.310, rz)
                    weights["pelvis"] = 1.0 - t
                    weights["spine"] = t
                elif rz < 0.385:
                    t = smoothstep(0.355, 0.385, rz)
                    weights["spine"] = 1.0 - t
                    weights["chest"] = t
                elif rz < 0.470:
                    t = smoothstep(0.455, 0.470, rz)
                    weights["chest"] = 1.0 - t
                    weights["neck"] = t
                elif rz < 0.505:
                    t = smoothstep(0.485, 0.505, rz)
                    weights["neck"] = 1.0 - t
                    weights["head"] = t
                else:
                    weights["head"] = 1.0

        total = sum(weights.values())
        for bname, w in weights.items():
            if w > 0.001:
                vgroups[bname].add([v.index], w / total, "REPLACE")

    mesh_obj.parent = arm_obj
    mod = mesh_obj.modifiers.new(name="Armature", type="ARMATURE")
    mod.object = arm_obj


def bake_mounted_animations(arm_obj):
    bpy.context.scene.render.fps = 30
    if not arm_obj.animation_data:
        arm_obj.animation_data_create()
    pb = arm_obj.pose.bones
    hb_local = pb["horse_body"].bone.matrix_local.to_3x3()

    def reset_pose():
        for b in pb:
            b.location = (0.0, 0.0, 0.0)
            b.rotation_mode = "XYZ"
            b.rotation_euler = (0.0, 0.0, 0.0)

    def align_socket(bone_name: str, target_world_dir: Vector):
        bpy.context.view_layer.update()
        ws = pb[bone_name]
        parent_rot = (arm_obj.matrix_world @ ws.parent.matrix).to_3x3().normalized()
        z_w = target_world_dir.normalized()
        x_ref = Vector((1.0, 0.0, 0.0))
        if abs(z_w.dot(x_ref)) > 0.9:
            x_ref = Vector((0.0, 1.0, 0.0))
        y_w = z_w.cross(x_ref).normalized()
        x_w = y_w.cross(z_w).normalized()
        desired_world_rot = Matrix((x_w, y_w, z_w)).transposed()
        rest_local_rot = ws.bone.matrix_local.to_3x3()
        parent_rest_rot = ws.parent.bone.matrix_local.to_3x3()
        rest_rel = parent_rest_rot.inverted() @ rest_local_rot
        local_rot = (parent_rot @ rest_rel).inverted() @ desired_world_rot
        ws.rotation_euler = local_rot.to_euler("XYZ")

    def key_pose(frame, rot_dict, horse_loc=(0, 0, 0), w_dir=(0, -0.3, 0.95), s_dir=(0.7, -0.7, 0.05)):
        reset_pose()
        pb["horse_body"].location = hb_local.inverted() @ Vector(horse_loc)
        pb["horse_body"].keyframe_insert(data_path="location", frame=frame)
        for bname, deg in rot_dict.items():
            if bname in pb:
                pb[bname].rotation_euler = Euler((math.radians(deg[0]), math.radians(deg[1]), math.radians(deg[2])), "XYZ")
                pb[bname].keyframe_insert(data_path="rotation_euler", frame=frame)
        align_socket("weaponSocket", Vector(w_dir))
        pb["weaponSocket"].keyframe_insert(data_path="rotation_euler", frame=frame)
        align_socket("shieldSocket", Vector(s_dir))
        pb["shieldSocket"].keyframe_insert(data_path="rotation_euler", frame=frame)

    rider_base = {
        "thigh_L": (-36, 0, 26), "shin_L": (42, 0, 0),
        "thigh_R": (-36, 0, -26), "shin_R": (42, 0, 0),
        "upperArm_L": (-56, 0, -34), "forearm_L": (0, 0, -48),
        "upperArm_R": (-60, 0, 20), "forearm_R": (0, 0, 48),
    }

    anims = {
        # Idle: horse raises briefly on hind legs (rearing), then lands smoothly
        "idle_stance": (
            72,
            [
                (1, {**rider_base, "horse_body": (0, 0, 0), "horse_neck": (0, 0, 0)}, (0, 0, 0), (0, -0.25, 0.96), (0.7, -0.7, 0.05)),
                (28, {**rider_base, "horse_body": (26, 0, 0), "horse_neck": (-18, 0, 0),
                      "horse_leg_FL": (-38, 0, 0), "horse_leg_FR": (-44, 0, 0),
                      "horse_leg_RL": (-24, 0, 0), "horse_leg_RR": (-24, 0, 0),
                      "spine": (18, 0, 0), "head": (-14, 0, 0)},
                 (0, 0.04, 0.05), (0, -0.1, 0.99), (0.7, -0.7, 0.05)),
                (52, {**rider_base, "horse_body": (0, 0, 0), "horse_neck": (0, 0, 0)}, (0, 0, 0), (0, -0.25, 0.96), (0.7, -0.7, 0.05)),
                (72, {**rider_base, "horse_body": (0, 0, 0), "horse_neck": (0, 0, 0)}, (0, 0, 0), (0, -0.25, 0.96), (0.7, -0.7, 0.05)),
            ],
        ),
        "combat_move_advance": (
            24,
            [
                (1, {**rider_base, "horse_body": (6, 0, 0), "horse_neck": (6, 0, 0),
                     "horse_leg_FL": (-34, 0, 0), "horse_leg_FR": (-18, 0, 0),
                     "horse_leg_RL": (28, 0, 0), "horse_leg_RR": (16, 0, 0)},
                 (0, 0, 0.015), (0, -0.3, 0.95), (0.7, -0.7, 0.05)),
                (12, {**rider_base, "horse_body": (-6, 0, 0), "horse_neck": (-6, 0, 0),
                      "horse_leg_FL": (26, 0, 0), "horse_leg_FR": (18, 0, 0),
                      "horse_leg_RL": (-30, 0, 0), "horse_leg_RR": (-16, 0, 0)},
                 (0, 0, -0.010), (0, -0.3, 0.95), (0.7, -0.7, 0.05)),
                (24, {**rider_base, "horse_body": (6, 0, 0), "horse_neck": (6, 0, 0),
                      "horse_leg_FL": (-34, 0, 0), "horse_leg_FR": (-18, 0, 0),
                      "horse_leg_RL": (28, 0, 0), "horse_leg_RR": (16, 0, 0)},
                 (0, 0, 0.015), (0, -0.3, 0.95), (0.7, -0.7, 0.05)),
            ],
        ),
        "combat_attack_poke": (
            28,
            [
                (1, {**rider_base, "spine": (6, 0, -14), "upperArm_R": (36, 0, 14), "forearm_R": (0, 0, 56)},
                 (0, 0, 0), (0, 0.2, 0.98), (0.6, -0.8, 0.05)),
                (14, {**rider_base, "spine": (24, 0, 18), "upperArm_R": (-38, 0, 76), "forearm_R": (0, 0, 16)},
                 (0, -0.03, 0), (0.2, -0.95, -0.2), (0.6, -0.8, 0.05)),
                (28, {**rider_base}, (0, 0, 0), (0, -0.25, 0.96), (0.7, -0.7, 0.05)),
            ],
        ),
        "combat_defensive_stance": (
            48,
            [
                (1, {**rider_base, "upperArm_L": (-24, 0, -76), "forearm_L": (0, 0, -64)},
                 (0, 0, 0), (0, -0.25, 0.96), (0.15, -0.98, 0.12)),
                (24, {**rider_base, "upperArm_L": (-22, 0, -78), "forearm_L": (0, 0, -62)},
                 (0, 0, 0.006), (0, -0.25, 0.96), (0.15, -0.98, 0.12)),
                (48, {**rider_base, "upperArm_L": (-24, 0, -76), "forearm_L": (0, 0, -64)},
                 (0, 0, 0), (0, -0.25, 0.96), (0.15, -0.98, 0.12)),
            ],
        ),
        "death": (
            36,
            [
                (1, {**rider_base, "horse_body": (0, 0, 0)}, (0, 0, 0), (0, -0.25, 0.96), (0.7, -0.7, 0.05)),
                (16, {**rider_base, "horse_body": (-20, 42, 0), "horse_leg_FL": (-40, 0, 0), "horse_leg_RL": (30, 0, 0)},
                 (0, 0, -0.14), (0.5, -0.6, 0.4), (0.5, -0.3, 0.8)),
                (36, {**rider_base, "horse_body": (-12, 86, 0), "horse_neck": (14, 0, 0),
                      "horse_leg_FL": (-35, 0, 0), "horse_leg_FR": (-25, 0, 0),
                      "horse_leg_RL": (25, 0, 0), "horse_leg_RR": (18, 0, 0),
                      "upperArm_L": (-68, 0, 18), "forearm_L": (0, 0, 12),
                      "upperArm_R": (-70, 0, -22), "forearm_R": (0, 0, -14)},
                 (0, 0, -0.275), (0.75, -0.66, 0.0), (0.08, -0.06, 0.995)),
            ],
        ),
    }

    for action_name, (end_frame, keyframes) in anims.items():
        act = bpy.data.actions.new(name=action_name)
        arm_obj.animation_data.action = act
        for frame, rot_dict, h_loc, w_dir, s_dir in keyframes:
            key_pose(frame, rot_dict, h_loc, w_dir, s_dir)
        track = arm_obj.animation_data.nla_tracks.new()
        track.name = action_name
        strip = track.strips.new(action_name, 1, act)
        strip.action_frame_start = 1
        strip.action_frame_end = end_frame
    arm_obj.animation_data.action = None


def build_and_export():
    clear_scene()
    mats = {
        "skin": make_skin_material("Knight"),
        "plate": make_plate_material("Knight"),
        "chainmail": make_chainmail_material("Knight"),
        "leather": make_material("KnightLeather", (0.26, 0.16, 0.09, 1.0), metallic=0.04, roughness=0.80),
        "horse": make_material("WarhorseCoat", (0.26, 0.17, 0.11, 1.0), metallic=0.02, roughness=0.78),
        "feather": make_material("KnightHelmFeather", (0.85, 0.85, 0.85, 1.0), metallic=0.0, roughness=0.75),
        "wood": make_material("KnightMaceWood", (0.38, 0.24, 0.13, 1.0), metallic=0.02, roughness=0.85),
        "shield": make_shield_material("Knight"),
    }

    def rider(bm, rgba=(0.0, 0.0, 0.0, 1.0)):
        set_bm_vertex_color(bm, rgba)
        return offset_bm(bm, RIDER_Y_OFFSET, RIDER_Z_OFFSET)

    parts = [
        create_mesh_obj("Horse_Body", build_horse_body_bm(), mats["horse"]),
        create_mesh_obj("Horse_Legs", build_horse_legs_bm(), mats["horse"]),
        create_mesh_obj("Horse_Saddle", build_saddle_bm(), mats["leather"]),
        create_mesh_obj("Knight_TorsoHead", rider(build_torso_neck_head_bm()), mats["skin"]),
        create_mesh_obj("Knight_Arm_L", rider(build_arm_bm(+1.0)), mats["skin"]),
        create_mesh_obj("Knight_Arm_R", rider(build_arm_bm(-1.0)), mats["skin"]),
        create_mesh_obj("Knight_PlateArmor", rider(build_tunic_bm()), mats["plate"]),
        create_mesh_obj("Knight_Greaves", rider(build_trousers_bm()), mats["plate"]),
        create_mesh_obj("Knight_Boots", rider(build_boots_bm()), mats["leather"]),
        create_mesh_obj("Knight_GreatHelm", rider(build_great_helm_bm()), mats["plate"]),
        create_mesh_obj("Knight_HelmFeather", offset_bm(build_helm_feather_bm(), RIDER_Y_OFFSET, RIDER_Z_OFFSET), mats["feather"]),
    ]

    bpy.ops.object.select_all(action="DESELECT")
    for p in parts:
        p.select_set(True)
    knight_mesh = parts[0]
    knight_mesh.name = "MedievalArmoredKnight"
    bpy.context.view_layer.objects.active = knight_mesh
    bpy.ops.object.join()

    arm_obj = create_mounted_armature()
    assign_mounted_skin_weights(knight_mesh, arm_obj)

    mace = build_one_handed_mace_obj(mats)
    mace.parent = arm_obj
    mace.parent_type = "BONE"
    mace.parent_bone = "weaponSocket"
    mace.matrix_parent_inverse.identity()

    shield = build_heater_shield_bm(mats["shield"], mats["plate"], shield_w=0.125, shield_h=0.165)
    shield.parent = arm_obj
    shield.parent_type = "BONE"
    shield.parent_bone = "shieldSocket"
    shield.matrix_parent_inverse.identity()

    bake_mounted_animations(arm_obj)
    export_unit_blend_and_glb(knight_mesh, arm_obj, BLEND_OUT, GLB_OUT)


if __name__ == "__main__":
    build_and_export()

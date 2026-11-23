"""
Shared Blender 5.x utilities for building, skinning, texturing, and animating
high-quality 2000-3000 tri rigged units for Hexes of Battle.

Blender axes: -Y = forward, +X = character's left, +Z = up.
glTF exporter (export_yup=True) converts this to Three.js: +Z = forward, +X = left, +Y = up.

Vertex color ('Col' -> COLOR_0) convention for applyRiggedTeamAndBannerShader:
  - R = 1.0, G = 0.0 -> tinted by player/team color
  - R = 0.0, G = 1.0 -> overlaid with player banner from UVMap [0.02..0.98]
  - R = 0.0, G = 0.0 -> original material/texture only
"""

import math
import os
import random

import bpy
import bmesh
from mathutils import Euler, Matrix, Vector

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def make_material(name: str, rgba, metallic: float = 0.02, roughness: float = 0.85, double_sided: bool = False):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = rgba
        bsdf.inputs["Metallic"].default_value = metallic
        bsdf.inputs["Roughness"].default_value = roughness
    mat.diffuse_color = rgba
    if double_sided:
        mat.use_backface_culling = False
    return mat


def _make_tex_image(name: str, size: int, pixel_fn):
    img = bpy.data.images.new(name, width=size, height=size, alpha=False)
    pixels = [0.0] * (size * size * 4)
    for y in range(size):
        v = y / size
        for x in range(size):
            u = x / size
            r, g, b = pixel_fn(u, v, x, y)
            idx = (y * size + x) * 4
            pixels[idx] = r
            pixels[idx + 1] = g
            pixels[idx + 2] = b
            pixels[idx + 3] = 1.0
    img.pixels.foreach_set(pixels)
    img.pack()
    return img


def make_textured_material(name: str, tex_name: str, size: int, pixel_fn, metallic=0.0, roughness=0.82, bump_strength=0.0, double_sided=False):
    mat = make_material(name, (0.8, 0.8, 0.8, 1.0), metallic=metallic, roughness=roughness, double_sided=double_sided)
    img = _make_tex_image(tex_name, size, pixel_fn)
    nt = mat.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    tex_node = nt.nodes.new("ShaderNodeTexImage")
    tex_node.image = img
    nt.links.new(tex_node.outputs["Color"], bsdf.inputs["Base Color"])
    if bump_strength > 0.0:
        bump = nt.nodes.new("ShaderNodeBump")
        bump.inputs["Strength"].default_value = bump_strength
        bump.inputs["Distance"].default_value = 0.005
        nt.links.new(tex_node.outputs["Color"], bump.inputs["Height"])
        nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def make_skin_material(prefix="Unit"):
    rng = random.Random(19)
    return make_textured_material(
        f"{prefix}Skin",
        f"tex_{prefix.lower()}_skin",
        128,
        lambda u, v, _x, _y: (
            (lambda b: (b, b * 0.84, b * 0.69))(
                max(0.76, min(0.95, 0.87 + 0.015 * math.sin(u * math.pi * 10.0) * math.cos(v * math.pi * 10.0) + (rng.random() - 0.5) * 0.025))
            )
        ),
        metallic=0.0,
        roughness=0.76,
    )


def make_gambeson_material(prefix="Unit"):
    rng = random.Random(42)

    def px(u, v, _x, _y):
        d1 = abs(((u * 6.0 + v * 6.0) % 1.0) - 0.5) * 2.0
        d2 = abs(((u * 6.0 - v * 6.0) % 1.0) - 0.5) * 2.0
        seam = max(0.0, 1.0 - min(d1, d2) * 7.5)
        puff = min(1.0, (min(d1, d2) ** 0.55) * 1.15)
        weave = 0.03 * math.sin(u * math.pi * 64.0) * math.sin(v * math.pi * 64.0)
        grain = (rng.random() - 0.5) * 0.035
        lum = max(0.25, min(0.96, 0.72 + 0.18 * puff - 0.34 * seam + weave + grain))
        return (lum, lum * 0.96, lum * 0.88)

    return make_textured_material(f"{prefix}Gambeson", f"tex_{prefix.lower()}_gambeson", 256, px, metallic=0.0, roughness=0.88, bump_strength=0.28)


def make_chainmail_material(prefix="Unit"):
    def px(u, v, _x, _y):
        gx = (u * 16.0) % 1.0 - 0.5
        gy = (v * 16.0) % 1.0 - 0.5
        r1 = math.hypot(gx, gy)
        r2 = math.hypot(((u * 16.0 + 0.5) % 1.0) - 0.5, ((v * 16.0 + 0.5) % 1.0) - 0.5)
        ring1 = math.exp(-((r1 - 0.30) ** 2) / 0.008)
        ring2 = math.exp(-((r2 - 0.30) ** 2) / 0.008)
        lum = 0.18 + 0.44 * max(ring1, ring2)
        return (lum * 0.94, lum * 0.97, lum)

    return make_textured_material(f"{prefix}Chainmail", f"tex_{prefix.lower()}_chainmail", 128, px, metallic=0.76, roughness=0.42, bump_strength=0.40)


def make_plate_material(prefix="Unit"):
    rng = random.Random(77)

    def px(u, v, _x, _y):
        brush = 0.018 * math.sin(u * math.pi * 36.0 + v * 3.0)
        grain = (rng.random() - 0.5) * 0.015
        lum = max(0.68, min(0.88, 0.78 + brush + grain))
        return (lum * 0.96, lum * 0.98, lum)

    return make_textured_material(f"{prefix}Plate", f"tex_{prefix.lower()}_plate", 128, px, metallic=0.92, roughness=0.18, bump_strength=0.06)


def make_shield_material(prefix="Unit"):
    rng = random.Random(91)

    def px(u, v, x, _y):
        plank_seam = 1.0 if ((x * 5) % 128) < 2 else 0.0
        grain = 0.05 * math.sin(v * math.pi * 24.0 + math.sin(u * math.pi * 6.0) * 1.5)
        noise = (rng.random() - 0.5) * 0.04
        lum = max(0.30, min(0.85, 0.68 + grain + noise - 0.22 * plank_seam))
        return (lum * 0.96, lum * 0.84, lum * 0.66)

    return make_textured_material(f"{prefix}ShieldFace", f"tex_{prefix.lower()}_shield", 128, px, metallic=0.04, roughness=0.76)


def set_bm_vertex_color(bm, rgba):
    color_layer = bm.loops.layers.color.get("Col") or bm.loops.layers.color.new("Col")
    for face in bm.faces:
        for loop in face.loops:
            loop[color_layer] = rgba


def apply_cylindrical_uv(bm, z_min=0.18, z_span=0.32, scale=2.0):
    uv_layer = bm.loops.layers.uv.get("UVMap") or bm.loops.layers.uv.new("UVMap")
    for face in bm.faces:
        for loop in face.loops:
            co = loop.vert.co
            u = (math.atan2(co.y, co.x) / (2.0 * math.pi)) + 0.5
            v = (co.z - z_min) / max(1e-4, z_span)
            loop[uv_layer].uv = (u * scale, v * scale)


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
        rf = (r_fwd[0] if cf >= 0 else r_fwd[1]) if isinstance(r_fwd, tuple) else r_fwd
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
    rings = []
    for i, (c, rl, rf) in enumerate(stations):
        if i == 0:
            tangent = (stations[1][0] - c).normalized()
        elif i == len(stations) - 1:
            tangent = (c - stations[-2][0]).normalized()
        else:
            tangent = (stations[i + 1][0] - stations[i - 1][0]).normalized()

        ref = Vector((0.0, -1.0, 0.0))
        if abs(tangent.dot(ref)) > 0.92:
            ref = Vector((0.0, 0.0, 1.0))
        lat_vec = ref.cross(tangent).normalized()
        fwd_vec = tangent.cross(lat_vec).normalized()
        rings.append(make_ring(bm, c, lat_vec, fwd_vec, rl, rf, segs, p))
    return bridge_rings(bm, rings, cap_start=cap_start, cap_end=cap_end)


def create_mesh_obj(name: str, bm, mat):
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    for poly in obj.data.polygons:
        poly.use_smooth = True
    return obj


# ---------------------------------------------------------------------------------------
# Shared Humanoid Anatomy Builders
# ---------------------------------------------------------------------------------------
def build_torso_neck_head_bm():
    bm = bmesh.new()
    stations = [
        (Vector((0.0, 0.000, 0.242)), 0.088, (0.072, 0.068)),
        (Vector((0.0, -0.002, 0.295)), 0.080, (0.064, 0.058)),
        (Vector((0.0, -0.005, 0.365)), 0.098, (0.075, 0.064)),
        (Vector((0.0, -0.008, 0.428)), 0.104, (0.074, 0.064)),
        (Vector((0.0, -0.011, 0.460)), 0.050, (0.044, 0.040)),
        (Vector((0.0, -0.013, 0.476)), 0.032, (0.033, 0.033)),
        (Vector((0.0, -0.014, 0.496)), 0.031, (0.033, 0.033)),
        (Vector((0.0, -0.016, 0.514)), 0.041, (0.048, 0.042)),
        (Vector((0.0, -0.020, 0.540)), 0.046, (0.056, 0.046)),
        (Vector((0.0, -0.018, 0.568)), 0.047, (0.052, 0.049)),
        (Vector((0.0, -0.014, 0.594)), 0.038, (0.040, 0.042)),
        (Vector((0.0, -0.010, 0.610)), 0.016, (0.018, 0.018)),
    ]
    build_lofted_tube(bm, stations, segs=16, p=2.1, cap_start=True, cap_end=True)
    bm.normal_update()
    return bm


def build_arm_bm(side: float):
    bm = bmesh.new()
    stations = [
        (Vector((side * 0.085, -0.006, 0.402)), 0.036, 0.036),
        (Vector((side * 0.145, -0.005, 0.398)), 0.029, 0.029),
        (Vector((side * 0.195, -0.004, 0.398)), 0.025, 0.025),
        (Vector((side * 0.250, -0.007, 0.398)), 0.020, 0.020),
        (Vector((side * 0.275, -0.010, 0.398)), 0.017, 0.020),
        (Vector((side * 0.305, -0.013, 0.398)), 0.020, 0.024),
        (Vector((side * 0.320, -0.014, 0.398)), 0.015, 0.020),
    ]
    build_lofted_tube(bm, stations, segs=12, p=2.0, cap_start=True, cap_end=True)
    return bm


def build_tunic_bm(collar_z=0.476, sleeves=True):
    bm = bmesh.new()
    stations = [
        (Vector((0.0, -0.002, 0.194)), 0.104, (0.086, 0.080)),
        (Vector((0.0, 0.000, 0.252)), 0.096, (0.078, 0.072)),
        (Vector((0.0, -0.002, 0.312)), 0.094, (0.076, 0.070)),
        (Vector((0.0, -0.006, 0.382)), 0.114, (0.090, 0.080)),
        (Vector((0.0, -0.009, 0.436)), 0.118, (0.088, 0.078)),
        (Vector((0.0, -0.011, 0.465)), 0.082, (0.062, 0.058)),
        (Vector((0.0, -0.013, collar_z)), 0.047, (0.046, 0.044)),
        (Vector((0.0, -0.013, collar_z - 0.001)), 0.036, (0.036, 0.034)),
        (Vector((0.0, -0.013, collar_z - 0.015)), 0.035, (0.035, 0.033)),
    ]
    build_lofted_tube(bm, stations, segs=18, p=2.2, cap_start=False, cap_end=False)
    if sleeves:
        for side in (-1.0, 1.0):
            s_stations = [
                (Vector((side * 0.084, -0.006, 0.402)), 0.046, 0.048),
                (Vector((side * 0.135, -0.006, 0.398)), 0.040, 0.042),
                (Vector((side * 0.180, -0.005, 0.398)), 0.036, 0.038),
                (Vector((side * 0.179, -0.005, 0.398)), 0.026, 0.027),
                (Vector((side * 0.166, -0.005, 0.398)), 0.025, 0.026),
            ]
            build_lofted_tube(bm, s_stations, segs=10, p=2.0, cap_start=True, cap_end=False)
    apply_cylindrical_uv(bm, 0.18, 0.30, 2.0)
    return bm


def build_belt_bm(z_low=0.285, z_high=0.310):
    bm = bmesh.new()
    build_lofted_tube(
        bm,
        [
            (Vector((0.0, -0.001, z_low)), 0.098, (0.081, 0.075)),
            (Vector((0.0, -0.001, z_high)), 0.098, (0.081, 0.075)),
        ],
        segs=16,
        p=2.2,
    )
    return bm


def build_trousers_bm():
    bm = bmesh.new()
    for side in (-1.0, 1.0):
        sx = side * 0.048
        stations = [
            (Vector((sx * 0.92, 0.0, 0.252)), 0.038, 0.041),
            (Vector((sx, -0.002, 0.212)), 0.044, 0.046),
            (Vector((sx, -0.004, 0.165)), 0.039, 0.041),
            (Vector((sx, -0.005, 0.120)), 0.034, 0.036),
            (Vector((sx, 0.000, 0.078)), 0.031, 0.033),
        ]
        build_lofted_tube(bm, stations, segs=10, p=2.1, cap_start=True, cap_end=False)
    return bm


def build_boots_bm():
    bm = bmesh.new()
    for side in (-1.0, 1.0):
        sx = side * 0.048
        build_lofted_tube(
            bm,
            [
                (Vector((sx, 0.000, 0.088)), 0.035, 0.037),
                (Vector((sx, 0.000, 0.036)), 0.031, 0.033),
                (Vector((sx, 0.000, 0.000)), 0.031, 0.033),
            ],
            segs=10,
            p=2.1,
        )
        build_lofted_tube(
            bm,
            [
                (Vector((sx, 0.018, 0.016)), 0.031, 0.016),
                (Vector((sx, -0.025, 0.016)), 0.032, 0.016),
                (Vector((sx, -0.068, 0.013)), 0.028, 0.013),
            ],
            segs=10,
            p=2.2,
        )
    return bm


def build_chainmail_aventail_bm(z_bottom=0.478, z_top=0.552):
    bm = bmesh.new()
    uv_layer = bm.loops.layers.uv.new("UVMap")
    arc_segs = 12
    z_rings = [
        (z_top, 0.055, 0.060, -0.020),
        ((z_top + z_bottom) * 0.5 + 0.012, 0.054, 0.057, -0.020),
        ((z_top + z_bottom) * 0.5 - 0.012, 0.050, 0.054, -0.018),
        (z_bottom, 0.049, 0.052, -0.016),
    ]
    ang_start = -0.14 * math.pi
    ang_end = 1.14 * math.pi
    ring_verts = []
    for z, rx, ry, cy in z_rings:
        row = []
        for s in range(arc_segs + 1):
            t = s / arc_segs
            ang = ang_start + t * (ang_end - ang_start)
            row.append(bm.verts.new((math.cos(ang) * rx, cy + math.sin(ang) * ry, z)))
        ring_verts.append(row)

    for r in range(len(ring_verts) - 1):
        for s in range(arc_segs):
            f = bm.faces.new((ring_verts[r][s], ring_verts[r][s + 1], ring_verts[r + 1][s + 1], ring_verts[r + 1][s]))
            for loop in f.loops:
                co = loop.vert.co
                loop[uv_layer].uv = (math.atan2(co.y, co.x) * 0.8, (co.z - 0.47) * 6.0)
    bm.normal_update()
    return bm


def build_nasal_helmet_bm():
    """Medieval nasal helmet (centered over head + front nose guard)."""
    bm = bmesh.new()
    build_lofted_tube(
        bm,
        [
            (Vector((0.0, -0.021, 0.548)), 0.055, 0.059),
            (Vector((0.0, -0.019, 0.578)), 0.052, 0.056),
            (Vector((0.0, -0.016, 0.606)), 0.036, 0.038),
            (Vector((0.0, -0.014, 0.630)), 0.006, 0.006),
        ],
        segs=18,
        p=2.0,
        cap_start=False,
        cap_end=True,
    )
    # Nose guard bar projecting down over bridge of nose (-Y)
    build_lofted_tube(
        bm,
        [
            (Vector((0.0, -0.080, 0.550)), 0.006, 0.004),
            (Vector((0.0, -0.081, 0.520)), 0.005, 0.004),
        ],
        segs=6,
        p=2.2,
    )
    return bm


def build_heater_shield_bm(banner_mat, iron_mat, shield_w=0.135, shield_h=0.175):
    """Creates a heater shield mesh with banner-mapped front face."""
    bpy.ops.object.select_all(action="DESELECT")
    bm_board = bmesh.new()
    uv_layer = bm_board.loops.layers.uv.new("UVMap")
    color_layer = bm_board.loops.layers.color.new("Col")

    # Heater shield outline (flat top, curved tapering bottom tip)
    profile = [
        (-shield_w, shield_h * 0.50),
        (0.0, shield_h * 0.50),
        (shield_w, shield_h * 0.50),
        (shield_w * 0.94, shield_h * 0.10),
        (shield_w * 0.68, -shield_h * 0.28),
        (0.0, -shield_h * 0.58),
        (-shield_w * 0.68, -shield_h * 0.28),
        (-shield_w * 0.94, shield_h * 0.10),
    ]
    z_back, z_front = -0.009, 0.009
    front_vs = [bm_board.verts.new((px, py, z_front)) for px, py in profile]
    back_vs = [bm_board.verts.new((px, py, z_back)) for px, py in profile]
    f_front = bm_board.faces.new(front_vs)
    f_back = bm_board.faces.new(list(reversed(back_vs)))
    n = len(profile)
    for i in range(n):
        j = (i + 1) % n
        bm_board.faces.new((back_vs[i], back_vs[j], front_vs[j], front_vs[i]))

    bm_board.normal_update()
    for face in bm_board.faces:
        is_front = face is f_front
        for loop in face.loops:
            if is_front:
                co = loop.vert.co
                u = 0.5 + (co.x / (2.0 * shield_w)) * 0.90
                v = 0.5 + ((co.y + shield_h * 0.04) / (1.12 * shield_h)) * 0.90
                loop[uv_layer].uv = (max(0.03, min(0.97, u)), max(0.03, min(0.97, v)))
                loop[color_layer] = (0.0, 1.0, 0.0, 1.0)
            else:
                loop[uv_layer].uv = (0.0, 0.0)
                loop[color_layer] = (0.0, 0.0, 0.0, 1.0)

    shield = create_mesh_obj("Shield", bm_board, banner_mat)
    # Add subtle iron rim bevel via solidify/second material? Keep clean single object with rim edge loop if needed
    return shield


def build_knife_bm():
    """Creates a simple close-combat dagger/knife along local +Z."""
    bm = bmesh.new()
    build_lofted_tube(
        bm,
        [
            (Vector((0, 0, -0.06)), 0.007, 0.007),
            (Vector((0, 0, 0.01)), 0.007, 0.007),
            (Vector((0, 0, 0.02)), 0.016, 0.006),
            (Vector((0, 0, 0.03)), 0.009, 0.003),
            (Vector((0, 0, 0.15)), 0.006, 0.002),
            (Vector((0, 0, 0.19)), 0.001, 0.001),
        ],
        segs=6,
        p=1.8,
    )
    set_bm_vertex_color(bm, (0.0, 0.0, 0.0, 1.0))
    return bm


# ---------------------------------------------------------------------------------------
# Humanoid Armature, Skinning & Animation Baking
# ---------------------------------------------------------------------------------------
def create_humanoid_armature(arm_name="UnitArmature", extra_bones_fn=None):
    arm_data = bpy.data.armatures.new(arm_name)
    arm_obj = bpy.data.objects.new(arm_name, arm_data)
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

    add_bone("shoulder_L", (0.045, -0.006, 0.402), (0.088, -0.006, 0.398), "chest", roll_vec=(0, 0, 1))
    add_bone("upperArm_L", (0.088, -0.006, 0.398), (0.175, -0.006, 0.398), "shoulder_L", connected=True, roll_vec=(0, 0, 1))
    add_bone("forearm_L", (0.175, -0.006, 0.398), (0.265, -0.008, 0.398), "upperArm_L", connected=True, roll_vec=(0, 0, 1))
    add_bone("hand_L", (0.265, -0.008, 0.398), (0.320, -0.013, 0.398), "forearm_L", connected=True, roll_vec=(0, 0, 1))
    add_bone("shieldSocket", (0.245, -0.008, 0.425), (0.245, -0.068, 0.425), "forearm_L", roll_vec=(0, 0, 1))

    add_bone("shoulder_R", (-0.045, -0.006, 0.402), (-0.088, -0.006, 0.398), "chest", roll_vec=(0, 0, 1))
    add_bone("upperArm_R", (-0.088, -0.006, 0.398), (-0.175, -0.006, 0.398), "shoulder_R", connected=True, roll_vec=(0, 0, 1))
    add_bone("forearm_R", (-0.175, -0.006, 0.398), (-0.265, -0.008, 0.398), "upperArm_R", connected=True, roll_vec=(0, 0, 1))
    add_bone("hand_R", (-0.265, -0.008, 0.398), (-0.320, -0.013, 0.398), "forearm_R", connected=True, roll_vec=(0, 0, 1))
    add_bone("weaponSocket", (-0.295, -0.011, 0.398), (-0.295, -0.071, 0.398), "hand_R", roll_vec=(0, 0, 1))

    add_bone("thigh_L", (0.046, -0.002, 0.230), (0.050, -0.006, 0.120), "pelvis")
    add_bone("shin_L", (0.050, -0.006, 0.120), (0.050, 0.002, 0.036), "thigh_L", connected=True)
    add_bone("foot_L", (0.050, 0.002, 0.036), (0.050, -0.048, 0.008), "shin_L", connected=True)

    add_bone("thigh_R", (-0.046, -0.002, 0.230), (-0.050, -0.006, 0.120), "pelvis")
    add_bone("shin_R", (-0.050, -0.006, 0.120), (-0.050, 0.002, 0.036), "thigh_R", connected=True)
    add_bone("foot_R", (-0.050, 0.002, 0.036), (-0.050, -0.048, 0.008), "shin_R", connected=True)

    if extra_bones_fn:
        extra_bones_fn(eb, add_bone)

    bpy.ops.object.mode_set(mode="OBJECT")
    return arm_obj


def assign_humanoid_skin_weights(mesh_obj, arm_obj, cape_y_threshold=0.065):
    bone_names = [b.name for b in arm_obj.data.bones]
    vgroups = {name: mesh_obj.vertex_groups.new(name=name) for name in bone_names}

    def smoothstep(edge0, edge1, x):
        t = max(0.0, min(1.0, (x - edge0) / max(1e-5, edge1 - edge0)))
        return t * t * (3.0 - 2.0 * t)

    for v in mesh_obj.data.vertices:
        x, y, z = v.co.x, v.co.y, v.co.z
        weights = {}

        if y > cape_y_threshold and z < 0.44:
            # Back cape / pavise: follow chest & spine cleanly without leg clipping
            if z > 0.34:
                t = smoothstep(0.34, 0.42, z)
                weights["spine"] = 1.0 - t
                weights["chest"] = t
            else:
                t = smoothstep(0.16, 0.34, z)
                weights["pelvis"] = 1.0 - t
                weights["spine"] = t
        elif abs(x) > 0.075 and 0.345 <= z <= 0.465:
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
        elif z < 0.245:
            side = "L" if x >= 0 else "R"
            if z > 0.215:
                t = smoothstep(0.215, 0.245, z)
                weights[f"thigh_{side}"] = 1.0 - t
                weights["pelvis"] = t
            elif z > 0.105:
                t = smoothstep(0.105, 0.145, z)
                weights[f"shin_{side}"] = 1.0 - t
                weights[f"thigh_{side}"] = t
            elif z > 0.028:
                t = smoothstep(0.028, 0.050, z)
                weights[f"foot_{side}"] = 1.0 - t
                weights[f"shin_{side}"] = t
            else:
                weights[f"foot_{side}"] = 1.0
        else:
            if z < 0.310:
                t = smoothstep(0.280, 0.310, z)
                weights["pelvis"] = 1.0 - t
                weights["spine"] = t
            elif z < 0.385:
                t = smoothstep(0.355, 0.385, z)
                weights["spine"] = 1.0 - t
                weights["chest"] = t
            elif z < 0.470:
                t = smoothstep(0.455, 0.470, z)
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


def bake_humanoid_animations(arm_obj, anims: dict):
    """Bakes NLA animation tracks with world-space pelvis_loc and socket alignment."""
    bpy.context.scene.render.fps = 30
    if not arm_obj.animation_data:
        arm_obj.animation_data_create()
    pb = arm_obj.pose.bones

    def reset_pose():
        for b in pb:
            b.location = (0.0, 0.0, 0.0)
            b.scale = (1.0, 1.0, 1.0)
            b.rotation_mode = "XYZ"
            b.rotation_euler = (0.0, 0.0, 0.0)

    def align_socket(bone_name: str, target_world_dir: Vector):
        if bone_name not in pb:
            return
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

    pelvis_local_mat = pb["pelvis"].bone.matrix_local.to_3x3()

    def key_pose(frame: int, bone_rot_deg: dict, pelvis_loc=(0.0, 0.0, 0.0), w_dir=None, s_dir=None, extra_fn=None):
        reset_pose()
        pb["pelvis"].location = pelvis_local_mat.inverted() @ Vector(pelvis_loc)
        pb["pelvis"].keyframe_insert(data_path="location", frame=frame)
        for bname, deg in bone_rot_deg.items():
            if bname in pb:
                pb[bname].rotation_euler = Euler((math.radians(deg[0]), math.radians(deg[1]), math.radians(deg[2])), "XYZ")
                pb[bname].keyframe_insert(data_path="rotation_euler", frame=frame)
        if w_dir is not None and "weaponSocket" in pb:
            align_socket("weaponSocket", Vector(w_dir))
            pb["weaponSocket"].keyframe_insert(data_path="rotation_euler", frame=frame)
        if s_dir is not None and "shieldSocket" in pb:
            align_socket("shieldSocket", Vector(s_dir))
            pb["shieldSocket"].keyframe_insert(data_path="rotation_euler", frame=frame)
        if extra_fn:
            extra_fn(pb, frame, align_socket)

    for action_name, (end_frame, keyframes) in anims.items():
        act = bpy.data.actions.new(name=action_name)
        arm_obj.animation_data.action = act
        for kf in keyframes:
            frame, rot_dict, p_loc = kf[0], kf[1], kf[2]
            w_dir = kf[3] if len(kf) > 3 else None
            s_dir = kf[4] if len(kf) > 4 else None
            extra_fn = kf[5] if len(kf) > 5 else None
            key_pose(frame, rot_dict, p_loc, w_dir, s_dir, extra_fn)

        track = arm_obj.animation_data.nla_tracks.new()
        track.name = action_name
        strip = track.strips.new(action_name, 1, act)
        strip.action_frame_start = 1
        strip.action_frame_end = end_frame

    arm_obj.animation_data.action = None


def export_unit_blend_and_glb(mesh_obj, arm_obj, blend_out: str, glb_out: str):
    tri_count = sum(len(p.vertices) - 2 for p in mesh_obj.data.polygons)
    print(f"Built {mesh_obj.name} mesh with ~{tri_count} triangles and {len(arm_obj.animation_data.nla_tracks)} NLA animation tracks.")
    os.makedirs(os.path.dirname(glb_out), exist_ok=True)
    os.makedirs(os.path.dirname(blend_out), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=glb_out,
        export_format="GLB",
        export_yup=True,
        export_apply=True,
        export_materials="EXPORT",
        export_vertex_color="NAME",
        export_vertex_color_name="Col",
        export_all_vertex_colors=False,
        export_animations=True,
        export_nla_strips=True,
        will_save_settings=True,
    )
    bpy.ops.wm.save_as_mainfile(filepath=blend_out)
    print(f"Exported GLB -> {glb_out}")
    print(f"Saved BLEND  -> {blend_out}")

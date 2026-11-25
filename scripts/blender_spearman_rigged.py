"""
Headless Blender 5.x script to build, rig (Armature + smooth skin weights),
and animate a detailed, organic-proportioned Medieval Spearman unit for Hexes of Battle.

Features:
  - Continuous, connected anatomical body in the style & realistic ratios of Peasant:
    sculpted face, light beige skin, kettle metal helmet, padded gambeson tunic,
    leather belt, trousers, and boots.
  - Full humanoid Armature with weaponSocket (hand_R) and shieldSocket (forearm_L).
  - Armed with a one-handed ash spear (SpearWeapon) and round bossed shield (Shield).
  - 5 keyframed animations exported as glTF NLA clips:
      idle_stance, combat_defensive_stance, combat_move_advance,
      combat_attack_poke, death

Blender axes: -Y = forward, +X = character's left, +Z = up.
glTF exporter (export_yup=True) converts this to Three.js: +Z = forward, +X = left, +Y = up.

Run via:
  blender --background --python scripts/blender_spearman_rigged.py
"""

import math
import os
import random

import bpy
import bmesh
from mathutils import Euler, Matrix, Vector

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
GLB_OUT = os.path.join(ROOT_DIR, "public", "models", "units", "spearman_rigged.glb")
BLEND_OUT = os.path.join(ROOT_DIR, "assets", "blender", "spearman_rigged.blend")


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


def create_skin_texture(size: int = 128):
    """Generates a light beige organic skin texture for face, neck, and arms."""
    img = bpy.data.images.new("tex_spearman_skin", width=size, height=size, alpha=False)
    pixels = [0.0] * (size * size * 4)
    rng = random.Random(19)
    for y in range(size):
        v = y / size
        for x in range(size):
            u = x / size
            sub_tone = 0.015 * math.sin(u * math.pi * 10.0) * math.cos(v * math.pi * 10.0)
            pore = (rng.random() - 0.5) * 0.025
            base = max(0.76, min(0.95, 0.87 + sub_tone + pore))
            idx = (y * size + x) * 4
            pixels[idx] = base
            pixels[idx + 1] = base * 0.84
            pixels[idx + 2] = base * 0.69
            pixels[idx + 3] = 1.0
    img.pixels.foreach_set(pixels)
    img.pack()
    return img


def make_skin_material():
    mat = make_material("SpearmanSkin", (0.87, 0.73, 0.60, 1.0), metallic=0.0, roughness=0.76)
    tex_img = create_skin_texture(128)
    nt = mat.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    tex_node = nt.nodes.new("ShaderNodeTexImage")
    tex_node.image = tex_img
    nt.links.new(tex_node.outputs["Color"], bsdf.inputs["Base Color"])
    return mat


def create_gambeson_texture(size: int = 256):
    """Generates a worn beige/tan wool-linen quilted gambeson with black cross-stitching and heavy embossing."""
    img = bpy.data.images.new("tex_spearman_gambeson", width=size, height=size, alpha=False)
    pixels = [0.0] * (size * size * 4)
    rng = random.Random(42)

    for y in range(size):
        v = y / size
        for x in range(size):
            u = x / size
            # Diamond cross-stitch grid
            p1 = (u * 6.0 + v * 6.0)
            p2 = (u * 6.0 - v * 6.0)
            d1 = abs((p1 % 1.0) - 0.5) * 2.0
            d2 = abs((p2 % 1.0) - 0.5) * 2.0
            d_min = min(d1, d2)

            # Black cross-stitch seam with subtle stitch-dash modulation
            stitch_dash = 0.75 + 0.25 * math.sin((p1 if d1 < d2 else p2) * math.pi * 14.0)
            seam = max(0.0, 1.0 - d_min * 8.5) * stitch_dash

            # Heavy embossed puff between stitches
            puff = min(1.0, (d_min ** 0.42) * 1.22)
            # Coarse wool & linen cross-weave + worn mottling
            weave = 0.045 * math.sin(u * math.pi * 72.0) * math.sin(v * math.pi * 72.0)
            wear = 0.06 * math.sin(u * math.pi * 8.0 + 0.7) * math.cos(v * math.pi * 10.0)
            grain = (rng.random() - 0.5) * 0.055

            base_lum = max(0.28, min(0.84, 0.50 + 0.24 * puff + weave + wear + grain))
            # Mix toward black cross-stitch along seams
            r = base_lum * 0.92 * (1.0 - seam) + 0.06 * seam
            g = base_lum * 0.78 * (1.0 - seam) + 0.05 * seam
            b = base_lum * 0.58 * (1.0 - seam) + 0.05 * seam

            idx = (y * size + x) * 4
            pixels[idx] = max(0.03, min(0.95, r))
            pixels[idx + 1] = max(0.03, min(0.95, g))
            pixels[idx + 2] = max(0.03, min(0.95, b))
            pixels[idx + 3] = 1.0

    img.pixels.foreach_set(pixels)
    img.pack()
    return img


def _gambeson_height(u: float, v: float) -> float:
    p1 = (u * 6.0 + v * 6.0)
    p2 = (u * 6.0 - v * 6.0)
    d1 = abs((p1 % 1.0) - 0.5) * 2.0
    d2 = abs((p2 % 1.0) - 0.5) * 2.0
    d_min = min(d1, d2)
    puff = min(1.0, (d_min ** 0.42) * 1.22)
    weave = 0.03 * math.sin(u * math.pi * 72.0) * math.sin(v * math.pi * 72.0)
    return puff + weave


def create_gambeson_normal_texture(size: int = 256):
    """Generates a strong tangent-space normal map for the quilted gambeson."""
    img = bpy.data.images.new("tex_spearman_gambeson_normal", width=size, height=size, alpha=False)
    img.colorspace_settings.name = "Non-Color"
    pixels = [0.0] * (size * size * 4)
    eps = 1.0 / size
    strength = 4.5  # strong embossing relief

    for y in range(size):
        v = y / size
        for x in range(size):
            u = x / size
            h_l = _gambeson_height(u - eps, v)
            h_r = _gambeson_height(u + eps, v)
            h_d = _gambeson_height(u, v - eps)
            h_u = _gambeson_height(u, v + eps)
            dx = (h_r - h_l) * strength
            dy = (h_u - h_d) * strength
            nx, ny, nz = -dx, -dy, 1.0
            inv_len = 1.0 / math.sqrt(nx * nx + ny * ny + nz * nz)
            nx *= inv_len
            ny *= inv_len
            nz *= inv_len
            idx = (y * size + x) * 4
            pixels[idx] = nx * 0.5 + 0.5
            pixels[idx + 1] = ny * 0.5 + 0.5
            pixels[idx + 2] = nz * 0.5 + 0.5
            pixels[idx + 3] = 1.0

    img.pixels.foreach_set(pixels)
    img.pack()
    return img


def make_gambeson_material():
    mat = make_material("SpearmanGambeson", (0.64, 0.54, 0.40, 1.0), metallic=0.0, roughness=0.90)
    tex_img = create_gambeson_texture(256)
    norm_img = create_gambeson_normal_texture(256)
    nt = mat.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    tex_node = nt.nodes.new("ShaderNodeTexImage")
    tex_node.image = tex_img
    nt.links.new(tex_node.outputs["Color"], bsdf.inputs["Base Color"])

    norm_tex = nt.nodes.new("ShaderNodeTexImage")
    norm_tex.image = norm_img
    norm_map = nt.nodes.new("ShaderNodeNormalMap")
    norm_map.inputs["Strength"].default_value = 1.8
    nt.links.new(norm_tex.outputs["Color"], norm_map.inputs["Color"])
    nt.links.new(norm_map.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def make_trousers_material():
    mat = make_material("SpearmanTrousers", (0.62, 0.62, 0.64, 1.0), metallic=0.0, roughness=0.90)
    img = bpy.data.images.new("tex_spearman_trousers", width=64, height=64, alpha=False)
    pixels = [0.0] * (64 * 64 * 4)
    for y in range(64):
        for x in range(64):
            lum = 0.62 + 0.03 * math.sin(x * 0.8 + y * 0.8)
            idx = (y * 64 + x) * 4
            pixels[idx] = lum
            pixels[idx + 1] = lum
            pixels[idx + 2] = lum
            pixels[idx + 3] = 1.0
    img.pixels.foreach_set(pixels)
    img.pack()
    nt = mat.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    tex_node = nt.nodes.new("ShaderNodeTexImage")
    tex_node.image = img
    nt.links.new(tex_node.outputs["Color"], bsdf.inputs["Base Color"])
    return mat


def create_chainmail_texture(size: int = 128):
    """Generates a seamless interlocking steel chainmail ring texture."""
    img = bpy.data.images.new("tex_spearman_chainmail", width=size, height=size, alpha=False)
    pixels = [0.0] * (size * size * 4)
    for y in range(size):
        v = y / size
        for x in range(size):
            u = x / size
            gx = (u * 16.0) % 1.0 - 0.5
            gy = (v * 16.0) % 1.0 - 0.5
            r1 = math.hypot(gx, gy)
            r2 = math.hypot(((u * 16.0 + 0.5) % 1.0) - 0.5, ((v * 16.0 + 0.5) % 1.0) - 0.5)
            ring1 = math.exp(-((r1 - 0.30) ** 2) / 0.008)
            ring2 = math.exp(-((r2 - 0.30) ** 2) / 0.008)
            lum = 0.16 + 0.44 * max(ring1, ring2)
            idx = (y * size + x) * 4
            pixels[idx] = lum * 0.94
            pixels[idx + 1] = lum * 0.97
            pixels[idx + 2] = lum
            pixels[idx + 3] = 1.0
    img.pixels.foreach_set(pixels)
    img.pack()
    return img


def make_chainmail_material():
    # Solid neutral base so applyRiggedTeamAndBannerShader renders the aventail in solid player color
    mat = make_material("SpearmanChainmail", (0.61, 0.61, 0.61, 1.0), metallic=0.18, roughness=0.62)
    return mat


def create_plate_armor_texture(size: int = 128):
    """Generates a bright polished steel texture for the reflective kettle helmet."""
    img = bpy.data.images.new("tex_spearman_plate", width=size, height=size, alpha=False)
    pixels = [0.0] * (size * size * 4)
    rng = random.Random(77)
    for y in range(size):
        v = y / size
        for x in range(size):
            u = x / size
            brush = 0.018 * math.sin(u * math.pi * 36.0 + v * 3.0)
            grain = (rng.random() - 0.5) * 0.015
            lum = max(0.68, min(0.88, 0.78 + brush + grain))
            idx = (y * size + x) * 4
            pixels[idx] = lum * 0.96
            pixels[idx + 1] = lum * 0.98
            pixels[idx + 2] = lum
            pixels[idx + 3] = 1.0
    img.pixels.foreach_set(pixels)
    img.pack()
    return img


def make_plate_armor_material():
    mat = make_material("SpearmanHelmetIron", (0.76, 0.79, 0.84, 1.0), metallic=0.92, roughness=0.18)
    tex_img = create_plate_armor_texture(128)
    nt = mat.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    tex_node = nt.nodes.new("ShaderNodeTexImage")
    tex_node.image = tex_img
    nt.links.new(tex_node.outputs["Color"], bsdf.inputs["Base Color"])
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.06
    bump.inputs["Distance"].default_value = 0.002
    nt.links.new(tex_node.outputs["Color"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def create_shield_texture(size: int = 128):
    """Generates a warm wooden plank texture for the shield face under the player banner."""
    img = bpy.data.images.new("tex_spearman_shield", width=size, height=size, alpha=False)
    pixels = [0.0] * (size * size * 4)
    rng = random.Random(91)
    for y in range(size):
        v = y / size
        for x in range(size):
            u = x / size
            plank_seam = 1.0 if ((x * 5) % size) < 2 else 0.0
            grain = 0.05 * math.sin(v * math.pi * 24.0 + math.sin(u * math.pi * 6.0) * 1.5)
            noise = (rng.random() - 0.5) * 0.04
            lum = max(0.30, min(0.85, 0.68 + grain + noise - 0.22 * plank_seam))
            idx = (y * size + x) * 4
            pixels[idx] = lum * 0.96
            pixels[idx + 1] = lum * 0.84
            pixels[idx + 2] = lum * 0.66
            pixels[idx + 3] = 1.0
    img.pixels.foreach_set(pixels)
    img.pack()
    return img


def make_shield_material():
    mat = make_material("ShieldFace", (0.68, 0.58, 0.44, 1.0), metallic=0.04, roughness=0.76)
    tex_img = create_shield_texture(128)
    nt = mat.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    tex_node = nt.nodes.new("ShaderNodeTexImage")
    tex_node.image = tex_img
    nt.links.new(tex_node.outputs["Color"], bsdf.inputs["Base Color"])
    return mat


def set_bm_vertex_color(bm, rgba):
    """Assigns a uniform vertex color attribute ('Col') to all face loops of a bmesh."""
    color_layer = bm.loops.layers.color.get("Col") or bm.loops.layers.color.new("Col")
    for face in bm.faces:
        for loop in face.loops:
            loop[color_layer] = rgba


# ---------------------------------------------------------------------------------------
# Lofting & Organic Mesh Helpers (matching Peasant proportions)
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
# Anatomical Body & Equipment Builders
# ---------------------------------------------------------------------------------------
def build_torso_neck_head_bm():
    bm = bmesh.new()
    stations = [
        (Vector((0.0, 0.002, 0.232)), 0.072, (0.056, 0.052)),
        (Vector((0.0, 0.000, 0.275)), 0.082, (0.064, 0.058)),
        (Vector((0.0, -0.002, 0.320)), 0.076, (0.060, 0.054)),
        (Vector((0.0, -0.006, 0.375)), 0.092, (0.070, 0.060)),
        (Vector((0.0, -0.009, 0.425)), 0.104, (0.072, 0.062)),
        (Vector((0.0, -0.011, 0.460)), 0.074, (0.050, 0.048)),
        (Vector((0.0, -0.013, 0.478)), 0.036, (0.036, 0.034)),
        (Vector((0.0, -0.014, 0.502)), 0.034, (0.035, 0.033)),
        (Vector((0.0, -0.018, 0.514)), 0.038, (0.046, 0.042)),
        (Vector((0.0, -0.018, 0.538)), 0.048, (0.056, 0.052)),
        (Vector((0.0, -0.014, 0.562)), 0.049, (0.055, 0.054)),
        (Vector((0.0, -0.010, 0.580)), 0.042, (0.046, 0.046)),
        (Vector((0.0, -0.008, 0.592)), 0.022, (0.024, 0.024)),
    ]
    build_lofted_tube(bm, stations, segs=20, p=2.15, cap_start=True, cap_end=True)

    # Sculpted nose bridge
    for v in bm.verts:
        if 0.526 <= v.co.z <= 0.550 and v.co.y < -0.045 and abs(v.co.x) < 0.016:
            t = 1.0 - abs(v.co.x) / 0.016
            v.co.y -= 0.012 * t
    bm.normal_update()
    return bm


def build_arm_bm(side: float):
    bm = bmesh.new()
    stations = [
        (Vector((side * 0.078, -0.006, 0.402)), 0.036, 0.038),
        (Vector((side * 0.125, -0.006, 0.398)), 0.031, 0.032),
        (Vector((side * 0.175, -0.004, 0.398)), 0.027, 0.028),
        (Vector((side * 0.220, -0.007, 0.398)), 0.025, 0.026),
        (Vector((side * 0.265, -0.010, 0.398)), 0.021, 0.022),
        (Vector((side * 0.295, -0.012, 0.398)), 0.023, 0.026),
        (Vector((side * 0.320, -0.014, 0.398)), 0.015, 0.020),
    ]
    build_lofted_tube(bm, stations, segs=14, p=2.0, cap_start=True, cap_end=True)
    return bm


def build_tunic_bm():
    """Thick quilted padded gambeson armor hugging the neck with inward thickness cuffs at neck and sleeves."""
    bm = bmesh.new()
    uv_layer = bm.loops.layers.uv.new("UVMap")
    rng = random.Random(101)
    stations = [
        (Vector((0.0, -0.002, 0.194)), 0.106, (0.088, 0.082)),
        (Vector((0.0, 0.000, 0.252)), 0.098, (0.080, 0.074)),
        (Vector((0.0, -0.002, 0.312)), 0.096, (0.078, 0.072)),
        (Vector((0.0, -0.006, 0.382)), 0.116, (0.092, 0.082)),
        (Vector((0.0, -0.009, 0.436)), 0.122, (0.090, 0.080)),
        (Vector((0.0, -0.011, 0.465)), 0.084, (0.064, 0.060)),
        (Vector((0.0, -0.013, 0.484)), 0.047, (0.046, 0.044)),  # snug collar outer rim
        (Vector((0.0, -0.013, 0.483)), 0.036, (0.036, 0.034)),  # collar thickness lip
        (Vector((0.0, -0.013, 0.468)), 0.035, (0.035, 0.033)),  # inward neck cuff
    ]
    build_lofted_tube(bm, stations, segs=20, p=2.2, cap_start=False, cap_end=False)

    # Thick padded gambeson sleeves with inward thickness cuff around the arms
    for side in (-1.0, 1.0):
        s_stations = [
            (Vector((side * 0.084, -0.006, 0.402)), 0.048, 0.050),
            (Vector((side * 0.135, -0.006, 0.398)), 0.042, 0.044),
            (Vector((side * 0.182, -0.005, 0.398)), 0.038, 0.040),  # outer cuff rim
            (Vector((side * 0.181, -0.005, 0.398)), 0.027, 0.028),  # sleeve thickness lip
            (Vector((side * 0.168, -0.005, 0.398)), 0.026, 0.027),  # inward sleeve cuff
        ]
        build_lofted_tube(bm, s_stations, segs=12, p=2.0, cap_start=True, cap_end=False)

    for v in bm.verts:
        v.co.x += (rng.random() - 0.5) * 0.002
        v.co.y += (rng.random() - 0.5) * 0.002
    bm.normal_update()

    # Cylindrical/planar UV projection for quilted gambeson texture
    for face in bm.faces:
        for loop in face.loops:
            co = loop.vert.co
            ang = math.atan2(co.y, co.x)
            u = (ang / (2.0 * math.pi)) + 0.5
            v_coord = (co.z - 0.18) / 0.30
            loop[uv_layer].uv = (u * 2.0, v_coord * 2.0)
    return bm


def build_belt_bm():
    bm = bmesh.new()
    stations = [
        (Vector((0.0, -0.001, 0.285)), 0.098, (0.081, 0.075)),
        (Vector((0.0, -0.001, 0.310)), 0.098, (0.081, 0.075)),
    ]
    build_lofted_tube(bm, stations, segs=18, p=2.2, cap_start=True, cap_end=True)
    return bm


def build_trousers_bm():
    """Simplified trousers tapered in their upper side towards the pelvis, ending cleanly into boots."""
    bm = bmesh.new()
    for side in (-1.0, 1.0):
        sx = side * 0.048
        stations = [
            (Vector((sx * 0.92, 0.0, 0.252)), 0.038, 0.041),    # tapered inward toward pelvis
            (Vector((sx, -0.002, 0.212)), 0.044, 0.046),
            (Vector((sx, -0.004, 0.165)), 0.039, 0.041),
            (Vector((sx, -0.005, 0.120)), 0.034, 0.036),
            (Vector((sx, 0.000, 0.078)), 0.031, 0.033),
        ]
        build_lofted_tube(bm, stations, segs=10, p=2.1, cap_start=True, cap_end=False)
    return bm


def build_boots_bm():
    """Combined lower-leg boot & foot mesh with a clean 90-degree ankle angle."""
    bm = bmesh.new()
    for side in (-1.0, 1.0):
        sx = side * 0.048
        # Vertical boot shaft (90 degrees to ground)
        shaft_stations = [
            (Vector((sx, 0.000, 0.088)), 0.035, 0.037),
            (Vector((sx, 0.000, 0.036)), 0.031, 0.033),
            (Vector((sx, 0.000, 0.000)), 0.031, 0.033),
        ]
        build_lofted_tube(bm, shaft_stations, segs=10, p=2.1, cap_start=True, cap_end=True)

        # Horizontal boot foot extending forward (-Y) at 90 degrees
        foot_stations = [
            (Vector((sx, 0.018, 0.016)), 0.031, 0.016),
            (Vector((sx, -0.025, 0.016)), 0.032, 0.016),
            (Vector((sx, -0.068, 0.013)), 0.028, 0.013),
        ]
        build_lofted_tube(bm, foot_stations, segs=10, p=2.2, cap_start=True, cap_end=True)
    return bm


def build_kettle_helmet_bm():
    """Pointed medieval kettle helmet fitted over the head."""
    bm = bmesh.new()
    stations = [
        (Vector((0.0, -0.014, 0.546)), 0.086, 0.092),  # wide kettle brim outer edge
        (Vector((0.0, -0.014, 0.556)), 0.062, 0.068),  # brim-to-bowl crease
        (Vector((0.0, -0.013, 0.578)), 0.055, 0.061),  # upper bowl
        (Vector((0.0, -0.011, 0.606)), 0.036, 0.040),  # tapered pointed cone
        (Vector((0.0, -0.010, 0.634)), 0.006, 0.006),  # pointed apex
    ]
    build_lofted_tube(bm, stations, segs=22, p=2.0, cap_start=False, cap_end=True)
    return bm


def build_helmet_chainmail_bm():
    """Chainmail aventail protecting the sides and back of the head and neck, open at front face."""
    bm = bmesh.new()
    uv_layer = bm.loops.layers.uv.new("UVMap")
    arc_segs = 14
    z_rings = [
        (0.552, 0.055, 0.061, -0.014),
        (0.526, 0.054, 0.058, -0.015),
        (0.502, 0.050, 0.054, -0.014),
        (0.478, 0.049, 0.052, -0.013),
    ]
    # Angle 0 is +X (left), pi/2 is +Y (back), pi is -X (right); open front (-Y)
    ang_start = -0.14 * math.pi
    ang_end = 1.14 * math.pi
    ring_verts = []
    for z, rx, ry, cy in z_rings:
        row = []
        for s in range(arc_segs + 1):
            t = s / arc_segs
            ang = ang_start + t * (ang_end - ang_start)
            x = math.cos(ang) * rx
            y = cy + math.sin(ang) * ry
            row.append(bm.verts.new((x, y, z)))
        ring_verts.append(row)

    for r in range(len(ring_verts) - 1):
        for s in range(arc_segs):
            v0 = ring_verts[r][s]
            v1 = ring_verts[r][s + 1]
            v2 = ring_verts[r + 1][s + 1]
            v3 = ring_verts[r + 1][s]
            f = bm.faces.new((v0, v1, v2, v3))
            for loop in f.loops:
                co = loop.vert.co
                loop[uv_layer].uv = (math.atan2(co.y, co.x) * 0.8, (co.z - 0.47) * 6.0)
    bm.normal_update()
    return bm


def build_spear_obj(mats):
    """Creates a one-handed ash spear aligned along local +Z (weaponSocket forward)."""
    bpy.ops.object.select_all(action="DESELECT")
    parts = []

    # Ash wood shaft (centered around grip at z = 0, extending -0.30..+0.62)
    bm_shaft = bmesh.new()
    build_lofted_tube(
        bm_shaft,
        [
            (Vector((0, 0, -0.30)), 0.011, 0.011),
            (Vector((0, 0, 0.00)), 0.012, 0.012),
            (Vector((0, 0, 0.52)), 0.011, 0.011),
        ],
        segs=10,
        p=2.0,
    )
    parts.append(create_mesh_obj("Spear_Shaft", bm_shaft, mats["wood"]))

    # Leather grip wrap at hand position
    bm_grip = bmesh.new()
    build_lofted_tube(
        bm_grip,
        [
            (Vector((0, 0, -0.06)), 0.014, 0.014),
            (Vector((0, 0, 0.06)), 0.014, 0.014),
        ],
        segs=10,
        p=2.0,
    )
    parts.append(create_mesh_obj("Spear_Grip", bm_grip, mats["leather"]))

    # Leaf-shaped steel spearhead (+Z tip)
    bm_head = bmesh.new()
    build_lofted_tube(
        bm_head,
        [
            (Vector((0, 0, 0.51)), 0.014, 0.014),
            (Vector((0, 0, 0.54)), 0.024, 0.010),
            (Vector((0, 0, 0.60)), 0.018, 0.008),
            (Vector((0, 0, 0.68)), 0.002, 0.002),
        ],
        segs=8,
        p=1.8,
    )
    parts.append(create_mesh_obj("Spear_Head", bm_head, mats["steel"]))

    bpy.ops.object.select_all(action="DESELECT")
    for p in parts:
        p.select_set(True)
    spear = parts[0]
    spear.name = "SpearWeapon"
    bpy.context.view_layer.objects.active = spear
    bpy.ops.object.join()
    return spear


def build_shield_obj(mats):
    """Creates a round wooden shield with iron rim and central steel boss."""
    bpy.ops.object.select_all(action="DESELECT")
    parts = []

    # Wooden disc (local +Z faces outward from forearm_L)
    bm_disc = bmesh.new()
    uv_layer = bm_disc.loops.layers.uv.new("UVMap")
    color_layer = bm_disc.loops.layers.color.new("Col")
    shield_r = 0.145
    build_lofted_tube(
        bm_disc,
        [
            (Vector((0, 0, -0.010)), shield_r, shield_r),
            (Vector((0, 0, 0.010)), shield_r, shield_r),
        ],
        segs=20,
        p=2.0,
    )
    for face in bm_disc.faces:
        is_front = face.normal.z > 0.5
        for loop in face.loops:
            if is_front:
                co = loop.vert.co
                u = 0.5 + (co.x / (2.0 * shield_r)) * 0.92
                v = 0.5 + (co.y / (2.0 * shield_r)) * 0.92
                loop[uv_layer].uv = (u, v)
                loop[color_layer] = (0.0, 1.0, 0.0, 1.0)  # G=1 -> player banner mask
            else:
                loop[uv_layer].uv = (0.0, 0.0)
                loop[color_layer] = (0.0, 0.0, 0.0, 1.0)
    parts.append(create_mesh_obj("Shield_Board", bm_disc, mats["shield_paint"]))

    # Iron outer rim ring
    bm_rim = bmesh.new()
    build_lofted_tube(
        bm_rim,
        [
            (Vector((0, 0, -0.012)), 0.152, 0.152),
            (Vector((0, 0, 0.012)), 0.152, 0.152),
        ],
        segs=20,
        p=2.0,
        cap_start=False,
        cap_end=False,
    )
    set_bm_vertex_color(bm_rim, (0.0, 0.0, 0.0, 1.0))
    parts.append(create_mesh_obj("Shield_Rim", bm_rim, mats["iron"]))

    # Central steel boss dome
    bm_boss = bmesh.new()
    build_lofted_tube(
        bm_boss,
        [
            (Vector((0, 0, 0.008)), 0.040, 0.040),
            (Vector((0, 0, 0.026)), 0.026, 0.026),
            (Vector((0, 0, 0.036)), 0.006, 0.006),
        ],
        segs=12,
        p=2.0,
    )
    set_bm_vertex_color(bm_boss, (0.0, 0.0, 0.0, 1.0))
    parts.append(create_mesh_obj("Shield_Boss", bm_boss, mats["steel"]))

    bpy.ops.object.select_all(action="DESELECT")
    for p in parts:
        p.select_set(True)
    shield = parts[0]
    shield.name = "Shield"
    bpy.context.view_layer.objects.active = shield
    bpy.ops.object.join()
    return shield


# ---------------------------------------------------------------------------------------
# Armature, Skin Weighting & 5 Keyframed Animations
# ---------------------------------------------------------------------------------------
def create_armature():
    arm_data = bpy.data.armatures.new("SpearmanArmature")
    arm_obj = bpy.data.objects.new("SpearmanArmature", arm_data)
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
    # shieldSocket on outer side of forearm_L (+Z points outward along arm normal)
    add_bone("shieldSocket", (0.225, -0.008, 0.430), (0.225, -0.068, 0.430), "forearm_L", roll_vec=(0, 0, 1))

    add_bone("shoulder_R", (-0.045, -0.006, 0.402), (-0.088, -0.006, 0.398), "chest", roll_vec=(0, 0, 1))
    add_bone("upperArm_R", (-0.088, -0.006, 0.398), (-0.175, -0.006, 0.398), "shoulder_R", connected=True, roll_vec=(0, 0, 1))
    add_bone("forearm_R", (-0.175, -0.006, 0.398), (-0.265, -0.008, 0.398), "upperArm_R", connected=True, roll_vec=(0, 0, 1))
    add_bone("hand_R", (-0.265, -0.008, 0.398), (-0.320, -0.013, 0.398), "forearm_R", connected=True, roll_vec=(0, 0, 1))
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
    bone_names = [b.name for b in arm_obj.data.bones]
    vgroups = {name: mesh_obj.vertex_groups.new(name=name) for name in bone_names}

    def smoothstep(edge0, edge1, x):
        t = max(0.0, min(1.0, (x - edge0) / max(1e-5, edge1 - edge0)))
        return t * t * (3.0 - 2.0 * t)

    for v in mesh_obj.data.vertices:
        x, y, z = v.co.x, v.co.y, v.co.z
        weights = {}

        if abs(x) > 0.075 and 0.345 <= z <= 0.465:
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


def bake_animations(arm_obj):
    """Creates all 5 animation actions and pushes them to NLA tracks for glTF export."""
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

    def key_pose(frame: int, bone_rot_deg: dict, pelvis_loc=(0.0, 0.0, 0.0), spear_dir=None, shield_dir=(0.7, -0.7, 0.0)):
        reset_pose()
        pelvis_local_mat = pb["pelvis"].bone.matrix_local.to_3x3()
        pb["pelvis"].location = pelvis_local_mat.inverted() @ Vector(pelvis_loc)
        pb["pelvis"].keyframe_insert(data_path="location", frame=frame)
        for bname, deg in bone_rot_deg.items():
            if bname in pb:
                pb[bname].rotation_euler = Euler(
                    (math.radians(deg[0]), math.radians(deg[1]), math.radians(deg[2])), "XYZ"
                )
                pb[bname].keyframe_insert(data_path="rotation_euler", frame=frame)
        if spear_dir is not None:
            align_socket("weaponSocket", Vector(spear_dir))
            pb["weaponSocket"].keyframe_insert(data_path="rotation_euler", frame=frame)
        if shield_dir is not None:
            align_socket("shieldSocket", Vector(shield_dir))
            pb["shieldSocket"].keyframe_insert(data_path="rotation_euler", frame=frame)

    # Note: In T-pose:
    #   Blender -Y = forward, +X = character's left, +Z = up
    #   Left arm (_L): rx < 0 lowers arm, rz < 0 swings forward (-Y)
    #   Right arm (_R): rx < 0 lowers arm, rz > 0 swings forward (-Y)
    anims = {
        # 1. Idle stance: alert sentinel posture, shield at left side, spear held upright-forward
        "idle_stance": (
            72,
            [
                (1, {"pelvis": (0, 0, -6), "spine": (6, 0, 6), "chest": (4, 0, 0), "head": (-6, 0, 0),
                     "upperArm_L": (-64, 0, -28), "forearm_L": (0, 0, -48),
                     "upperArm_R": (-66, 0, 22), "forearm_R": (0, 0, 42),
                     "thigh_L": (-8, 0, 5), "shin_L": (10, 0, 0), "thigh_R": (6, 0, -5), "shin_R": (8, 0, 0)},
                 (0, 0, -0.008), (0.0, -0.25, 1.0), (0.70, -0.70, 0.05)),
                (36, {"pelvis": (0, 0, -6), "spine": (9, 0, 6), "chest": (3, 0, 0), "head": (-4, 0, 0),
                      "upperArm_L": (-62, 0, -30), "forearm_L": (0, 0, -50),
                      "upperArm_R": (-64, 0, 24), "forearm_R": (0, 0, 40),
                      "thigh_L": (-8, 0, 5), "shin_L": (10, 0, 0), "thigh_R": (6, 0, -5), "shin_R": (8, 0, 0)},
                 (0, 0, -0.004), (0.0, -0.25, 1.0), (0.70, -0.70, 0.05)),
                (72, {"pelvis": (0, 0, -6), "spine": (6, 0, 6), "chest": (4, 0, 0), "head": (-6, 0, 0),
                      "upperArm_L": (-64, 0, -28), "forearm_L": (0, 0, -48),
                      "upperArm_R": (-66, 0, 22), "forearm_R": (0, 0, 42),
                      "thigh_L": (-8, 0, 5), "shin_L": (10, 0, 0), "thigh_R": (6, 0, -5), "shin_R": (8, 0, 0)},
                 (0, 0, -0.008), (0.0, -0.25, 1.0), (0.70, -0.70, 0.05)),
            ],
        ),
        # 2. Defensive stance: braced low with shield forward and spear pointed directly toward the front (-Y)
        "combat_defensive_stance": (
            54,
            [
                (1, {"pelvis": (6, 0, -18), "spine": (12, 0, 12), "chest": (6, 0, 4), "head": (-16, 0, 2),
                     "upperArm_L": (-46, 0, -62), "forearm_L": (0, 0, -58),
                     "upperArm_R": (-56, 0, 22), "forearm_R": (0, 0, 76),
                     "thigh_L": (-28, 0, 8), "shin_L": (34, 0, 0), "thigh_R": (18, 0, -8), "shin_R": (26, 0, 0)},
                 (0, 0, -0.032), (0.0, -1.0, 0.05), (0.35, -0.92, 0.06)),
                (27, {"pelvis": (7, 0, -18), "spine": (14, 0, 12), "chest": (6, 0, 4), "head": (-14, 0, 2),
                      "upperArm_L": (-44, 0, -64), "forearm_L": (0, 0, -56),
                      "upperArm_R": (-54, 0, 24), "forearm_R": (0, 0, 74),
                      "thigh_L": (-28, 0, 8), "shin_L": (34, 0, 0), "thigh_R": (18, 0, -8), "shin_R": (26, 0, 0)},
                 (0, 0, -0.037), (0.0, -1.0, 0.05), (0.35, -0.92, 0.06)),
                (54, {"pelvis": (6, 0, -18), "spine": (12, 0, 12), "chest": (6, 0, 4), "head": (-16, 0, 2),
                      "upperArm_L": (-46, 0, -62), "forearm_L": (0, 0, -58),
                      "upperArm_R": (-56, 0, 22), "forearm_R": (0, 0, 76),
                      "thigh_L": (-28, 0, 8), "shin_L": (34, 0, 0), "thigh_R": (18, 0, -8), "shin_R": (26, 0, 0)},
                 (0, 0, -0.032), (0.0, -1.0, 0.05), (0.35, -0.92, 0.06)),
            ],
        ),
        # 3. Walk: brisk march with spear pointed up and forward at ~45 degree angle (0, -1, 1)
        "combat_move_advance": (
            24,
            [
                (1, {"pelvis": (8, 4, -10), "spine": (14, 0, 8), "head": (-14, 0, 0),
                     "upperArm_L": (-48, 0, -56), "forearm_L": (0, 0, -52),
                     "upperArm_R": (-58, 0, 20), "forearm_R": (0, 0, 64),
                     "thigh_L": (-40, 0, 4), "shin_L": (18, 0, 0), "thigh_R": (22, 0, -4), "shin_R": (16, 0, 0)},
                 (0, 0, -0.025), (0.0, -0.707, 0.707), (0.55, -0.82, 0.08)),
                (12, {"pelvis": (8, -4, 10), "spine": (14, 0, -8), "head": (-12, 0, 0),
                      "upperArm_L": (-46, 0, -60), "forearm_L": (0, 0, -50),
                      "upperArm_R": (-56, 0, 24), "forearm_R": (0, 0, 62),
                      "thigh_L": (22, 0, 4), "shin_L": (16, 0, 0), "thigh_R": (-40, 0, -4), "shin_R": (18, 0, 0)},
                 (0, 0, -0.025), (0.0, -0.707, 0.707), (0.55, -0.82, 0.08)),
                (24, {"pelvis": (8, 4, -10), "spine": (14, 0, 8), "head": (-14, 0, 0),
                      "upperArm_L": (-48, 0, -56), "forearm_L": (0, 0, -52),
                      "upperArm_R": (-58, 0, 20), "forearm_R": (0, 0, 64),
                      "thigh_L": (-40, 0, 4), "shin_L": (18, 0, 0), "thigh_R": (22, 0, -4), "shin_R": (16, 0, 0)},
                 (0, 0, -0.025), (0.0, -0.707, 0.707), (0.55, -0.82, 0.08)),
            ],
        ),
        # 4. Attack: wide balanced stance -> pull spear back & lean upper body back -> thrust spear forward & lean torso forward for reach
        "combat_attack_poke": (
            30,
            [
                # Braced wide stance
                (1, {"pelvis": (6, 0, -18), "spine": (10, 0, 10), "chest": (6, 0, 4), "head": (-14, 0, 0),
                     "upperArm_L": (-46, 0, -62), "forearm_L": (0, 0, -58),
                     "upperArm_R": (-56, 0, 22), "forearm_R": (0, 0, 76),
                     "thigh_L": (-30, 0, 12), "shin_L": (36, 0, 0), "thigh_R": (22, 0, -12), "shin_R": (28, 0, 0)},
                 (0, 0, -0.036), (0.0, -1.0, 0.05), (0.35, -0.92, 0.06)),
                # Windup: pull spear back with hand, lean upper body/torso slightly backward (+Y / negative pitch)
                (9, {"pelvis": (2, 0, -34), "spine": (-10, 0, -14), "chest": (-8, 0, -6), "head": (12, 0, 14),
                     "upperArm_L": (-52, 0, -54), "forearm_L": (0, 0, -66),
                     "upperArm_R": (-56, 0, -24), "forearm_R": (0, 0, 102),
                     "thigh_L": (-24, 0, 12), "shin_L": (28, 0, 0), "thigh_R": (26, 0, -12), "shin_R": (36, 0, 0)},
                 (0, 0.042, -0.040), (0.0, -1.0, 0.04), (0.35, -0.92, 0.08)),
                # Thrust: push spear forward, bring upper body/torso forward (-Y) for extended reach
                (17, {"pelvis": (16, 0, 14), "spine": (26, 0, 16), "chest": (14, 0, 8), "head": (-26, 0, -12),
                      "upperArm_L": (-42, 0, -76), "forearm_L": (0, 0, -40),
                      "upperArm_R": (-44, 0, 74), "forearm_R": (0, 0, 12),
                      "thigh_L": (-50, 0, 10), "shin_L": (54, 0, 0), "thigh_R": (38, 0, -10), "shin_R": (16, 0, 0)},
                 (0, -0.075, -0.052), (0.0, -1.0, 0.02), (0.45, -0.88, 0.04)),
                # Recover back to braced stance
                (30, {"pelvis": (6, 0, -18), "spine": (10, 0, 10), "chest": (6, 0, 4), "head": (-14, 0, 0),
                      "upperArm_L": (-46, 0, -62), "forearm_L": (0, 0, -58),
                      "upperArm_R": (-56, 0, 22), "forearm_R": (0, 0, 76),
                      "thigh_L": (-30, 0, 12), "shin_L": (36, 0, 0), "thigh_R": (22, 0, -12), "shin_R": (28, 0, 0)},
                 (0, 0, -0.036), (0.0, -1.0, 0.05), (0.35, -0.92, 0.06)),
            ],
        ),
        # 5. Death animation: stagger, knees buckle, collapse backward onto the ground
        "death": (
            36,
            [
                (1, {"pelvis": (6, 0, -18), "spine": (10, 0, 10), "head": (-14, 0, 0),
                     "upperArm_L": (-46, 0, -62), "forearm_L": (0, 0, -58),
                     "upperArm_R": (-56, 0, 22), "forearm_R": (0, 0, 76),
                     "thigh_L": (-28, 0, 8), "shin_L": (34, 0, 0), "thigh_R": (18, 0, -8), "shin_R": (26, 0, 0)},
                 (0, 0, -0.032), (0.0, -1.0, 0.05), (0.35, -0.92, 0.06)),
                (12, {"pelvis": (-24, 6, -10), "spine": (-16, 0, 6), "head": (18, 0, -8),
                      "upperArm_L": (-58, 0, -24), "forearm_L": (0, 0, -28),
                      "upperArm_R": (-62, 0, 10), "forearm_R": (0, 0, 34),
                      "thigh_L": (-36, 0, 10), "shin_L": (64, 0, 0), "thigh_R": (-24, 0, -10), "shin_R": (56, 0, 0)},
                 (0, 0.06, -0.08), (0.2, -0.8, 0.55), (0.55, -0.35, 0.75)),
                (26, {"pelvis": (-82, 8, 0), "spine": (-6, 0, 0), "head": (8, 0, -10),
                      "upperArm_L": (-64, 0, 14), "forearm_L": (0, 0, 10),
                      "upperArm_R": (-66, 0, -16), "forearm_R": (0, 0, -12),
                      "thigh_L": (-8, 0, 8), "shin_L": (16, 0, 0), "thigh_R": (-4, 0, -8), "shin_R": (12, 0, 0)},
                 (0, 0.14, -0.155), (0.65, -0.75, 0.02), (0.12, -0.08, 0.99)),
                (36, {"pelvis": (-86, 8, 0), "spine": (-4, 0, 0), "head": (6, 0, -10),
                      "upperArm_L": (-68, 0, 18), "forearm_L": (0, 0, 12),
                      "upperArm_R": (-70, 0, -22), "forearm_R": (0, 0, -14),
                      "thigh_L": (-4, 0, 8), "shin_L": (10, 0, 0), "thigh_R": (-2, 0, -8), "shin_R": (8, 0, 0)},
                 (0, 0.16, -0.170), (0.75, -0.66, 0.0), (0.08, -0.06, 0.995)),
            ],
        ),
    }

    for action_name, (end_frame, keyframes) in anims.items():
        act = bpy.data.actions.new(name=action_name)
        arm_obj.animation_data.action = act
        for frame, rot_dict, p_loc, s_dir, sh_dir in keyframes:
            key_pose(frame, rot_dict, p_loc, s_dir, sh_dir)

        track = arm_obj.animation_data.nla_tracks.new()
        track.name = action_name
        strip = track.strips.new(action_name, 1, act)
        strip.action_frame_start = 1
        strip.action_frame_end = end_frame

    arm_obj.animation_data.action = None


def build_and_export():
    clear_scene()

    mats = {
        "skin": make_skin_material(),
        "tunic": make_gambeson_material(),
        "trousers": make_trousers_material(),
        "belt": make_material("SpearmanBelt", (0.61, 0.61, 0.61, 1.0), metallic=0.05, roughness=0.78),
        "leather": make_material("SpearmanLeather", (0.28, 0.18, 0.10, 1.0), metallic=0.04, roughness=0.82),
        "iron": make_plate_armor_material(),
        "chainmail": make_chainmail_material(),
        "steel": make_material("SpearmanSteel", (0.64, 0.67, 0.72, 1.0), metallic=0.86, roughness=0.28),
        "wood": make_material("SpearAshWood", (0.38, 0.26, 0.14, 1.0), metallic=0.02, roughness=0.85),
        "shield_paint": make_shield_material(),
    }

    def tagged_bm(bm, rgba):
        set_bm_vertex_color(bm, rgba)
        return bm

    parts = [
        create_mesh_obj("Body_TorsoHead", tagged_bm(build_torso_neck_head_bm(), (0.0, 0.0, 0.0, 1.0)), mats["skin"]),
        create_mesh_obj("Body_Arm_L", tagged_bm(build_arm_bm(+1.0), (0.0, 0.0, 0.0, 1.0)), mats["skin"]),
        create_mesh_obj("Body_Arm_R", tagged_bm(build_arm_bm(-1.0), (0.0, 0.0, 0.0, 1.0)), mats["skin"]),
        create_mesh_obj("Garb_Tunic", tagged_bm(build_tunic_bm(), (0.0, 0.0, 0.0, 1.0)), mats["tunic"]),
        create_mesh_obj("Garb_Belt", tagged_bm(build_belt_bm(), (1.0, 0.0, 0.0, 1.0)), mats["belt"]),
        create_mesh_obj("Garb_Trousers", tagged_bm(build_trousers_bm(), (1.0, 0.0, 0.0, 1.0)), mats["trousers"]),
        create_mesh_obj("Garb_Boots", tagged_bm(build_boots_bm(), (0.0, 0.0, 0.0, 1.0)), mats["leather"]),
        create_mesh_obj("Helmet_Kettle", tagged_bm(build_kettle_helmet_bm(), (0.0, 0.0, 0.0, 1.0)), mats["iron"]),
        create_mesh_obj("Helmet_Chainmail", tagged_bm(build_helmet_chainmail_bm(), (1.0, 0.0, 0.0, 1.0)), mats["chainmail"]),
    ]

    bpy.ops.object.select_all(action="DESELECT")
    for p in parts:
        p.select_set(True)
    spearman_mesh = parts[0]
    spearman_mesh.name = "MedievalSpearman"
    bpy.context.view_layer.objects.active = spearman_mesh
    bpy.ops.object.join()

    arm_obj = create_armature()
    assign_smooth_skin_weights(spearman_mesh, arm_obj)

    spear = build_spear_obj(mats)
    spear.parent = arm_obj
    spear.parent_type = "BONE"
    spear.parent_bone = "weaponSocket"
    spear.matrix_parent_inverse.identity()
    spear.location = Vector((0.0, 0.0, 0.0))

    shield = build_shield_obj(mats)
    shield.parent = arm_obj
    shield.parent_type = "BONE"
    shield.parent_bone = "shieldSocket"
    shield.matrix_parent_inverse.identity()
    shield.location = Vector((0.0, 0.0, 0.0))

    bake_animations(arm_obj)

    tri_count = sum(len(p.vertices) - 2 for p in spearman_mesh.data.polygons)
    print(
        f"Built MedievalSpearman mesh with ~{tri_count} triangles and "
        f"{len(arm_obj.animation_data.nla_tracks)} NLA animation tracks."
    )

    os.makedirs(os.path.dirname(GLB_OUT), exist_ok=True)
    os.makedirs(os.path.dirname(BLEND_OUT), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=GLB_OUT,
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
    bpy.ops.wm.save_as_mainfile(filepath=BLEND_OUT)
    print(f"Exported GLB -> {GLB_OUT}")
    print(f"Saved BLEND  -> {BLEND_OUT}")


if __name__ == "__main__":
    build_and_export()

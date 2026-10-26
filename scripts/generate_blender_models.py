"""
Headless Blender 5.x script to generate stylized low-poly medieval 3D unit models
and low-poly 3D forest trees for Hexes of Battle.

Generates:
  - public/models/units/{peasant,peasant_archer,swordsman,spearman,crossbowman,barbarian,slinger}.glb
  - public/models/terrain/{forest_pine,forest_oak}.glb
  - assets/blender/{peasant,peasant_archer,swordsman,spearman,crossbowman,barbarian,slinger,forest_trees}.blend

Run via:
  blender --background --python scripts/generate_blender_models.py
"""

import os
import sys
import math
import bpy
import bmesh
from mathutils import Vector, Euler

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blender_peasant import assemble_peasant  # noqa: E402
from blender_swordsman import assemble_swordsman  # noqa: E402
from blender_archer import assemble_archer  # noqa: E402
from blender_spearman import assemble_spearman  # noqa: E402
from blender_barbarian import assemble_barbarian  # noqa: E402

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
UNITS_GLB_DIR = os.path.join(ROOT_DIR, "public", "models", "units")
TERRAIN_GLB_DIR = os.path.join(ROOT_DIR, "public", "models", "terrain")
UNIT_TEXTURES_DIR = os.path.join(ROOT_DIR, "public", "textures", "units")
TERRAIN_TEXTURES_DIR = os.path.join(ROOT_DIR, "public", "textures", "terrain")
BLEND_DIR = os.path.join(ROOT_DIR, "assets", "blender")

os.makedirs(UNITS_GLB_DIR, exist_ok=True)
os.makedirs(TERRAIN_GLB_DIR, exist_ok=True)
os.makedirs(UNIT_TEXTURES_DIR, exist_ok=True)
os.makedirs(TERRAIN_TEXTURES_DIR, exist_ok=True)
os.makedirs(BLEND_DIR, exist_ok=True)


def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def make_material(name: str, rgba, metallic: float = 0.05, roughness: float = 0.75):
    mat = bpy.data.materials.get(name)
    if mat is None:
        mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = rgba
        bsdf.inputs["Metallic"].default_value = metallic
        bsdf.inputs["Roughness"].default_value = roughness
    mat.diffuse_color = rgba
    return mat


def make_textured_material(name: str, png_path: str, rgba=(1.0, 1.0, 1.0, 1.0), metallic: float = 0.08, roughness: float = 0.72):
    mat = make_material(name, rgba, metallic=metallic, roughness=roughness)
    if os.path.exists(png_path):
        nodes = mat.node_tree.nodes
        links = mat.node_tree.links
        bsdf = nodes.get("Principled BSDF")
        tex_node = nodes.new("ShaderNodeTexImage")
        img = bpy.data.images.load(png_path, check_existing=True)
        tex_node.image = img
        if bsdf:
            links.new(tex_node.outputs["Color"], bsdf.inputs["Base Color"])
    return mat


def create_mesh_object(
    name: str,
    bm: bmesh.types.BMesh,
    material,
    parent=None,
    location=(0.0, 0.0, 0.0),
    rotation=(0.0, 0.0, 0.0),
    smooth: bool = True,
):
    for face in bm.faces:
        face.smooth = smooth
    mesh = bpy.data.meshes.new(name + "_Mesh")
    bm.normal_update()
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.location = Vector(location)
    obj.rotation_euler = Euler(rotation, "XYZ")
    if material is not None:
        obj.data.materials.append(material)
    if parent is not None:
        obj.parent = parent
    return obj


def bm_add_cylinder(bm, r_bottom, r_top, depth, segments=16, center=(0, 0, 0), rot_euler=(0, 0, 0)):
    ret = bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=True,
        segments=max(segments, 12),
        radius1=r_bottom,
        radius2=r_top,
        depth=depth,
    )
    verts = ret["verts"]
    if any(rot_euler):
        bmesh.ops.rotate(bm, verts=verts, cent=(0, 0, 0), matrix=Euler(rot_euler, "XYZ").to_matrix())
    if any(center):
        bmesh.ops.translate(bm, verts=verts, vec=center)
    return verts


def bm_add_box(bm, sx, sy, sz, center=(0, 0, 0), rot_euler=(0, 0, 0)):
    ret = bmesh.ops.create_cube(bm, size=1.0)
    verts = ret["verts"]
    bmesh.ops.scale(bm, verts=verts, vec=(sx, sy, sz))
    if any(rot_euler):
        bmesh.ops.rotate(bm, verts=verts, cent=(0, 0, 0), matrix=Euler(rot_euler, "XYZ").to_matrix())
    if any(center):
        bmesh.ops.translate(bm, verts=verts, vec=center)
    return verts


def bm_add_sphere(bm, radius, segments=20, ring_count=14, center=(0, 0, 0), scale=(1, 1, 1)):
    ret = bmesh.ops.create_uvsphere(
        bm,
        u_segments=max(segments, 16),
        v_segments=max(ring_count, 12),
        radius=radius,
    )
    verts = ret["verts"]
    if scale != (1, 1, 1):
        bmesh.ops.scale(bm, verts=verts, vec=scale)
    if any(center):
        bmesh.ops.translate(bm, verts=verts, vec=center)
    return verts


def bm_add_icosphere(bm, radius, subdivisions=2, center=(0, 0, 0), scale=(1, 1, 1)):
    ret = bmesh.ops.create_icosphere(bm, subdivisions=max(subdivisions, 2), radius=radius)
    verts = ret["verts"]
    if scale != (1, 1, 1):
        bmesh.ops.scale(bm, verts=verts, vec=scale)
    if any(center):
        bmesh.ops.translate(bm, verts=verts, vec=center)
    return verts


def create_common_palette():
    return {
        "skin": make_material("Skin", (0.87, 0.70, 0.56, 1.0), metallic=0.0, roughness=0.75),
        "team": make_material("TeamColor", (0.22, 0.42, 0.78, 1.0), metallic=0.08, roughness=0.70),
        "cloth_brown": make_material("ClothBrown", (0.42, 0.30, 0.19, 1.0), metallic=0.0, roughness=0.88),
        "leather": make_material("Leather", (0.34, 0.21, 0.11, 1.0), metallic=0.05, roughness=0.75),
        "dark_leather": make_material("DarkLeather", (0.18, 0.12, 0.08, 1.0), metallic=0.05, roughness=0.80),
        "iron": make_material("ForgedIron", (0.48, 0.51, 0.55, 1.0), metallic=0.82, roughness=0.38),
        "steel": make_material("PolishedSteel", (0.72, 0.75, 0.80, 1.0), metallic=0.88, roughness=0.28),
        "chainmail": make_material("Chainmail", (0.38, 0.41, 0.45, 1.0), metallic=0.75, roughness=0.52),
        "brass": make_material("BurnishedBrass", (0.82, 0.65, 0.24, 1.0), metallic=0.85, roughness=0.32),
        "wood": make_material("AshWood", (0.46, 0.31, 0.16, 1.0), metallic=0.02, roughness=0.82),
        "fur": make_material("WolfFur", (0.28, 0.24, 0.20, 1.0), metallic=0.0, roughness=0.92),
        "feather": make_material("FeatherWhite", (0.90, 0.88, 0.82, 1.0), metallic=0.0, roughness=0.70),
        "stone": make_material("SlingStone", (0.52, 0.50, 0.47, 1.0), metallic=0.05, roughness=0.85),
    }


def build_base_humanoid(unit_name: str, pal: dict, torso_mat, leg_mat, arm_mat, has_pauldrons=False, muscular=False):
    """
    Constructs articulated medieval humanoid hierarchy in Blender (Z-up in Blender, exported as Y-up in glTF):
      - Torso (root object at (0,0,0), spans z = 0.38..0.82)
      - Head (child of Torso at z = 0.88)
      - Arm_L (child of Torso at y = +0.20, z = 0.76)
      - Arm_R (child of Torso at y = -0.20, z = 0.76)
      - Leg_L (child of Torso at y = +0.09, z = 0.40)
      - Leg_R (child of Torso at y = -0.09, z = 0.40)
    Note: Forward direction in Three.js East (angle=0) corresponds to +X in Blender (+X -> +X, +Z -> +Y).
    """
    # 1. Torso + Tunic Skirt + Belt
    bm_torso = bmesh.new()
    chest_w = 0.20 if muscular else 0.175
    waist_w = 0.145
    # Upper chest & waist
    bm_add_cylinder(bm_torso, waist_w, chest_w, 0.36, segments=8, center=(0, 0, 0.62))
    # Tunic / surcoat skirt
    bm_add_cylinder(bm_torso, 0.175, waist_w, 0.16, segments=8, center=(0, 0, 0.38))
    # Belt ring
    bm_add_cylinder(bm_torso, 0.155, 0.155, 0.045, segments=8, center=(0, 0, 0.45))
    torso_obj = create_mesh_object("Torso", bm_torso, torso_mat, parent=None, location=(0, 0, 0))

    # TeamColor tabard / heraldic chest emblem on Torso so every unit carries TeamColor
    bm_tabard = bmesh.new()
    bm_add_box(bm_tabard, 0.23, 0.18, 0.34, center=(0.02, 0, 0.56))
    create_mesh_object("Tabard_Team", bm_tabard, pal["team"], parent=torso_obj)

    # 2. Head (centered at z = 0.90)
    bm_head = bmesh.new()
    bm_add_sphere(bm_head, 0.125, segments=10, ring_count=8, center=(0, 0, 0))
    # Nose on +X (forward)
    bm_add_box(bm_head, 0.05, 0.035, 0.045, center=(0.12, 0, -0.01))
    head_obj = create_mesh_object("Head", bm_head, pal["skin"], parent=torso_obj, location=(0, 0, 0.91))

    # 3. Left & Right Legs (pivot at hip z = 0.38, extending down to z = -0.38 => world z = 0.0)
    for side_name, y_sign in [("Leg_L", 1.0), ("Leg_R", -1.0)]:
        bm_leg = bmesh.new()
        bm_add_cylinder(bm_leg, 0.055, 0.072, 0.28, segments=8, center=(0, 0, -0.14))
        bm_leg_obj = create_mesh_object(side_name, bm_leg, leg_mat, parent=torso_obj, location=(0, y_sign * 0.085, 0.38))

        # Boot at bottom of leg
        bm_boot = bmesh.new()
        bm_add_cylinder(bm_boot, 0.062, 0.058, 0.13, segments=8, center=(0, 0, -0.31))
        bm_add_box(bm_boot, 0.14, 0.085, 0.06, center=(0.03, 0, -0.35))
        create_mesh_object(side_name + "_Boot", bm_boot, pal["dark_leather"], parent=bm_leg_obj)
        if side_name == "Leg_L":
            leg_l = bm_leg_obj
        else:
            leg_r = bm_leg_obj

    # 4. Left & Right Arms (pivot at shoulder z = 0.74, y = +/- 0.20)
    for side_name, y_sign in [("Arm_L", 1.0), ("Arm_R", -1.0)]:
        bm_arm = bmesh.new()
        if has_pauldrons:
            bm_add_sphere(bm_arm, 0.078, segments=8, ring_count=6, center=(0, y_sign * 0.01, 0.01), scale=(1.0, 1.0, 0.8))
        bm_add_cylinder(bm_arm, 0.048, 0.060, 0.27, segments=8, center=(0.03, 0, -0.13), rot_euler=(0, math.radians(-14), 0))
        arm_obj = create_mesh_object(side_name, bm_arm, arm_mat, parent=torso_obj, location=(0, y_sign * 0.195, 0.74))

        # Hand at wrist
        bm_hand = bmesh.new()
        bm_add_sphere(bm_hand, 0.046, segments=8, ring_count=6, center=(0.065, 0, -0.26))
        create_mesh_object(side_name + "_Hand", bm_hand, pal["skin"], parent=arm_obj)
        if side_name == "Arm_L":
            arm_l = arm_obj
        else:
            arm_r = arm_obj

    return {
        "torso": torso_obj,
        "head": head_obj,
        "arm_l": arm_l,
        "arm_r": arm_r,
        "leg_l": leg_l,
        "leg_r": leg_r,
    }


def export_current_model(unit_name: str, is_terrain: bool = False):
    blend_path = os.path.join(BLEND_DIR, f"{unit_name}.blend")
    glb_dir = TERRAIN_GLB_DIR if is_terrain else UNITS_GLB_DIR
    glb_path = os.path.join(glb_dir, f"{unit_name}.glb")

    bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    bpy.ops.export_scene.gltf(
        filepath=glb_path,
        export_format="GLB",
        export_yup=True,
        export_apply=True,
        export_materials="EXPORT",
    )
    print(f"Exported {glb_path} and {blend_path}")


def build_peasant():
    """Higher-fidelity bare-headed peasant (see scripts/blender_peasant.py)."""
    clear_scene()
    assemble_peasant(create_mesh_object, make_material)
    export_current_model("peasant")


def build_peasant_archer():
    """Higher-fidelity archer with bycocket hunting hat & feather (see scripts/blender_archer.py)."""
    clear_scene()
    assemble_archer(create_mesh_object, make_material)
    export_current_model("peasant_archer")


def build_swordsman():
    """Higher-fidelity swordsman (see scripts/blender_swordsman.py)."""
    clear_scene()
    assemble_swordsman(create_mesh_object, make_material)
    export_current_model("swordsman")


def build_spearman():
    """Higher-fidelity spearman with kettle hat, gambeson, round shield, and pike (see scripts/blender_spearman.py)."""
    clear_scene()
    assemble_spearman(create_mesh_object, make_material)
    export_current_model("spearman")


def build_crossbowman():
    clear_scene()
    pal = create_common_palette()
    rig = build_base_humanoid("crossbowman", pal, pal["dark_leather"], pal["cloth_brown"], pal["leather"], has_pauldrons=True)

    # Kettle / Sallet Helmet
    bm_helm = bmesh.new()
    bm_add_sphere(bm_helm, 0.138, segments=10, ring_count=8, center=(0, 0, 0.03), scale=(1.06, 1.0, 1.0))
    bm_add_cylinder(bm_helm, 0.18, 0.14, 0.03, segments=10, center=(-0.02, 0, 0.01))
    create_mesh_object("Helmet", bm_helm, pal["iron"], parent=rig["head"])

    # Pavise shield strapped on back
    bm_pavise = bmesh.new()
    bm_add_box(bm_pavise, 0.04, 0.28, 0.42, center=(-0.14, 0, 0.62))
    create_mesh_object("Back_Pavise", bm_pavise, pal["team"], parent=rig["torso"])

    # Heavy Crossbow in Arm_R
    bm_stock = bmesh.new()
    bm_add_box(bm_stock, 0.46, 0.055, 0.075, center=(0.24, 0, -0.22), rot_euler=(0, math.radians(10), 0))
    xbow_obj = create_mesh_object("Weapon", bm_stock, pal["wood"], parent=rig["arm_r"])

    bm_prod = bmesh.new()
    bm_add_box(bm_prod, 0.045, 0.44, 0.032, center=(0.42, 0, -0.19), rot_euler=(0, math.radians(10), 0))
    # Stirrup at front
    bm_add_cylinder(bm_prod, 0.04, 0.04, 0.02, segments=6, center=(0.48, 0, -0.18))
    create_mesh_object("Crossbow_Prod", bm_prod, pal["steel"], parent=xbow_obj)

    export_current_model("crossbowman")


def build_barbarian():
    """Higher-fidelity barbarian with heavy fur mantle, horned helm, and double-bitted battleaxe (see scripts/blender_barbarian.py)."""
    clear_scene()
    assemble_barbarian(create_mesh_object, make_material)
    export_current_model("barbarian")


def build_slinger():
    clear_scene()
    pal = create_common_palette()
    rig = build_base_humanoid("slinger", pal, pal["cloth_brown"], pal["cloth_brown"], pal["skin"], has_pauldrons=False)

    # Slinger Headband
    bm_band = bmesh.new()
    bm_add_cylinder(bm_band, 0.132, 0.132, 0.04, segments=10, center=(0, 0, 0.04))
    create_mesh_object("Headband", bm_band, pal["team"], parent=rig["head"])

    # Stone Pouch at hip
    bm_pouch = bmesh.new()
    bm_add_sphere(bm_pouch, 0.075, segments=8, ring_count=6, center=(0.04, -0.15, 0.42))
    create_mesh_object("Stone_Pouch", bm_pouch, pal["leather"], parent=rig["torso"])

    # Small Buckler on Arm_L
    bm_buckler = bmesh.new()
    bm_add_cylinder(bm_buckler, 0.13, 0.13, 0.03, segments=10, center=(0.08, 0.08, -0.20), rot_euler=(math.radians(80), 0, 0))
    create_mesh_object("Shield", bm_buckler, pal["brass"], parent=rig["arm_l"])

    # Braided Leather Sling & Stone in Arm_R
    bm_sling = bmesh.new()
    bm_add_cylinder(bm_sling, 0.012, 0.016, 0.34, segments=6, center=(0.08, -0.02, -0.40), rot_euler=(math.radians(15), 0, 0))
    sling_obj = create_mesh_object("Weapon", bm_sling, pal["leather"], parent=rig["arm_r"])

    bm_stone = bmesh.new()
    bm_add_icosphere(bm_stone, 0.045, subdivisions=1, center=(0.09, -0.05, -0.56))
    create_mesh_object("Sling_Stone", bm_stone, pal["stone"], parent=sling_obj)

    export_current_model("slinger")


def build_healer():
    clear_scene()
    pal = create_common_palette()

    mat_cloth = make_textured_material(
        "PeasantCloth",
        os.path.join(UNIT_TEXTURES_DIR, "peasant_cloth.png"),
        rgba=(0.42, 0.30, 0.19, 1.0),
        metallic=0.02,
        roughness=0.86,
    )
    mat_face = make_textured_material(
        "PeasantFace",
        os.path.join(UNIT_TEXTURES_DIR, "peasant_face.png"),
        rgba=(1.0, 1.0, 1.0, 1.0),
        metallic=0.04,
        roughness=0.76,
    )
    mat_gear = make_textured_material(
        "HealerGear",
        os.path.join(UNIT_TEXTURES_DIR, "healer_gear.png"),
        rgba=(0.55, 0.42, 0.28, 1.0),
        metallic=0.45,
        roughness=0.60,
    )

    rig = build_base_humanoid("healer", pal, mat_cloth, mat_cloth, mat_cloth)
    rig["head"].data.materials[0] = mat_face

    # 1. Cloth Coif / Hood on Head
    bm_coif = bmesh.new()
    bm_add_sphere(bm_coif, 0.138, segments=20, ring_count=14, center=(-0.01, 0, 0.02), scale=(1.05, 1.02, 1.05))
    bm_add_cylinder(bm_coif, 0.15, 0.13, 0.08, segments=16, center=(-0.02, 0, -0.06))
    create_mesh_object("Helmet_Coif", bm_coif, pal["team"], parent=rig["head"])

    # 2. Remedies Satchel at Hip / Torso
    bm_satchel = bmesh.new()
    bm_add_box(bm_satchel, 0.12, 0.08, 0.14, center=(0.08, 0.16, 0.40))
    bm_add_box(bm_satchel, 0.125, 0.085, 0.065, center=(0.08, 0.16, 0.44))
    bm_add_box(bm_satchel, 0.035, 0.02, 0.03, center=(0.145, 0.16, 0.42))
    bm_add_box(bm_satchel, 0.028, 0.015, 0.46, center=(0.09, 0.05, 0.60), rot_euler=(0, math.radians(-24), math.radians(14)))
    create_mesh_object("Satchel", bm_satchel, mat_gear, parent=rig["torso"])

    # 3. Simple Wooden Buckler Shield on Arm_L
    bm_buckler = bmesh.new()
    bm_add_cylinder(bm_buckler, 0.18, 0.18, 0.028, segments=16, center=(0.09, 0.08, -0.18), rot_euler=(0, math.radians(90), 0))
    bm_add_sphere(bm_buckler, 0.05, segments=14, ring_count=10, center=(0.105, 0.08, -0.18))
    create_mesh_object("Shield", bm_buckler, mat_gear, parent=rig["arm_l"])

    # 4. Remedy Knife / Dagger in Arm_R
    bm_knife = bmesh.new()
    bm_add_box(bm_knife, 0.015, 0.038, 0.22, center=(0.12, 0, -0.10), rot_euler=(0, math.radians(-26), 0))
    bm_add_cylinder(bm_knife, 0.022, 0.0, 0.08, segments=6, center=(0.19, 0, -0.03), rot_euler=(0, math.radians(-26), 0))
    bm_add_box(bm_knife, 0.028, 0.075, 0.025, center=(0.05, 0, -0.17), rot_euler=(0, math.radians(-26), 0))
    bm_add_cylinder(bm_knife, 0.02, 0.022, 0.10, segments=10, center=(0.015, 0, -0.21), rot_euler=(0, math.radians(-26), 0))
    create_mesh_object("Weapon", bm_knife, mat_gear, parent=rig["arm_r"])

    export_current_model("healer")


def build_maceman():
    clear_scene()
    pal = create_common_palette()

    mat_armor = make_textured_material(
        "MacemanArmor",
        os.path.join(UNIT_TEXTURES_DIR, "maceman_armor.png"),
        rgba=(0.78, 0.71, 0.58, 1.0),
        metallic=0.05,
        roughness=0.82,
    )
    mat_face = make_textured_material(
        "SpearmanFace",
        os.path.join(UNIT_TEXTURES_DIR, "spearman_face.png"),
        rgba=(1.0, 1.0, 1.0, 1.0),
        metallic=0.25,
        roughness=0.68,
    )
    mat_gear = make_textured_material(
        "MacemanGear",
        os.path.join(UNIT_TEXTURES_DIR, "maceman_gear.png"),
        rgba=(0.60, 0.62, 0.65, 1.0),
        metallic=0.65,
        roughness=0.40,
    )

    # 1. Lightly armored humanoid in quilted gambeson
    rig = build_base_humanoid("maceman", pal, mat_armor, mat_armor, mat_armor, has_pauldrons=False)
    rig["head"].data.materials[0] = mat_face

    # Padded Arming Cap / Gambeson Coif on Head
    bm_coif = bmesh.new()
    bm_add_sphere(bm_coif, 0.138, segments=20, ring_count=14, center=(-0.01, 0, 0.02), scale=(1.04, 1.02, 1.04))
    bm_add_cylinder(bm_coif, 0.155, 0.135, 0.08, segments=16, center=(-0.01, 0, -0.06))
    create_mesh_object("Helmet_Coif", bm_coif, mat_armor, parent=rig["head"])

    # Gambeson Collar / Padded Shoulder Mantle on Torso
    bm_collar = bmesh.new()
    bm_add_cylinder(bm_collar, 0.21, 0.18, 0.12, segments=14, center=(0, 0, 0.72))
    create_mesh_object("Gambeson_Collar", bm_collar, mat_armor, parent=rig["torso"])

    # 2. Two-Handed Stance (no shield, holds mace with both hands)
    # Rotate Arm_L forward/inward to grasp lower haft, and Arm_R forward to grip upper haft
    rig["arm_l"].rotation_euler = (math.radians(-32), math.radians(-38), math.radians(24))
    rig["arm_r"].rotation_euler = (math.radians(22), math.radians(-30), math.radians(-15))

    # Mace Haft (Long reinforced hardwood haft) in Arm_R
    bm_mace = bmesh.new()
    bm_add_cylinder(bm_mace, 0.020, 0.022, 0.95, segments=12, center=(0.14, 0.08, -0.06), rot_euler=(0, math.radians(34), 0))
    mace_obj = create_mesh_object("Weapon", bm_mace, mat_gear, parent=rig["arm_r"])

    # Heavy Flanged Mace Head
    bm_head = bmesh.new()
    bm_add_cylinder(bm_head, 0.045, 0.040, 0.18, segments=12, center=(0.42, 0.08, 0.35), rot_euler=(0, math.radians(34), 0))
    for i in range(6):
        flange_rot = math.radians(i * 60)
        bm_add_box(bm_head, 0.08, 0.016, 0.16, center=(0.42, 0.08, 0.35), rot_euler=(flange_rot, math.radians(34), 0))
    create_mesh_object("Weapon_Flanges", bm_head, mat_gear, parent=mace_obj)

    # Armor-penetrating top spike
    bm_spike = bmesh.new()
    bm_add_cylinder(bm_spike, 0.002, 0.024, 0.14, segments=8, center=(0.51, 0.08, 0.48), rot_euler=(0, math.radians(34), 0))
    create_mesh_object("Weapon_Spike", bm_spike, mat_gear, parent=mace_obj)

    # Pommel counterweight at base of haft
    bm_pommel = bmesh.new()
    bm_add_sphere(bm_pommel, 0.038, segments=12, ring_count=8, center=(-0.16, 0.08, -0.48))
    create_mesh_object("Weapon_Pommel", bm_pommel, mat_gear, parent=mace_obj)

    export_current_model("maceman")


def build_armored_knight():
    clear_scene()
    pal = create_common_palette()

    mat_armor = make_textured_material(
        "KnightArmor",
        os.path.join(UNIT_TEXTURES_DIR, "armored_knight_armor.png"),
        rgba=(0.75, 0.78, 0.82, 1.0),
        metallic=0.88,
        roughness=0.28,
    )
    mat_gear = make_textured_material(
        "KnightGear",
        os.path.join(UNIT_TEXTURES_DIR, "armored_knight_gear.png"),
        rgba=(0.70, 0.72, 0.75, 1.0),
        metallic=0.72,
        roughness=0.40,
    )
    mat_horse = make_material("WarhorseCoat", (0.26, 0.16, 0.10, 1.0), metallic=0.02, roughness=0.76)
    mat_barding = make_material("WarhorseBarding", (0.18, 0.32, 0.62, 1.0), metallic=0.15, roughness=0.68)

    # -------------------------------------------------------------
    # 1. WARHORSE
    # -------------------------------------------------------------
    # Horse Root Body
    bm_horse_body = bmesh.new()
    # Barrel torso of the horse
    bm_add_cylinder(bm_horse_body, 0.17, 0.19, 0.62, segments=14, center=(0, 0, 0.44), rot_euler=(0, math.radians(90), 0))
    bm_add_sphere(bm_horse_body, 0.185, segments=14, ring_count=10, center=(0.28, 0, 0.45), scale=(1.05, 0.95, 1.0))
    bm_add_sphere(bm_horse_body, 0.180, segments=14, ring_count=10, center=(-0.28, 0, 0.46), scale=(1.05, 0.95, 1.0))
    horse_root = create_mesh_object("Root", bm_horse_body, mat_horse)

    # Barding / Caparison draped over the horse flank
    bm_barding = bmesh.new()
    bm_add_box(bm_barding, 0.68, 0.38, 0.28, center=(0, 0, 0.36))
    create_mesh_object("Horse_Barding", bm_barding, mat_barding, parent=horse_root)

    # Steel Crinet / Neck Armor & Neck
    bm_neck = bmesh.new()
    bm_add_cylinder(bm_neck, 0.13, 0.09, 0.38, segments=12, center=(0.32, 0, 0.62), rot_euler=(0, math.radians(-42), 0))
    create_mesh_object("Horse_Neck", bm_neck, mat_horse, parent=horse_root)

    # Horse Head & Muzzle
    bm_hhead = bmesh.new()
    bm_add_cylinder(bm_hhead, 0.095, 0.055, 0.28, segments=12, center=(0.48, 0, 0.76), rot_euler=(0, math.radians(48), 0))
    # Armored Chanfron plate over forehead & nose
    bm_add_box(bm_hhead, 0.11, 0.14, 0.22, center=(0.50, 0, 0.79), rot_euler=(0, math.radians(48), 0))
    # Forehead Chanfron spike
    bm_add_cylinder(bm_hhead, 0.002, 0.02, 0.12, segments=8, center=(0.57, 0, 0.88), rot_euler=(0, math.radians(48), 0))
    # Horse Ears
    bm_add_cylinder(bm_hhead, 0.022, 0.004, 0.09, segments=6, center=(0.38, 0.065, 0.86), rot_euler=(math.radians(14), math.radians(-18), 0))
    bm_add_cylinder(bm_hhead, 0.022, 0.004, 0.09, segments=6, center=(0.38, -0.065, 0.86), rot_euler=(math.radians(-14), math.radians(-18), 0))
    create_mesh_object("Horse_Head", bm_hhead, mat_armor, parent=horse_root)

    # 4 Horse Legs (pivots at shoulder/hip height z = 0.44 extending to ground z = 0.0)
    leg_positions = [
        ("Front_L", 0.24, 0.14),
        ("Front_R", 0.24, -0.14),
        ("Rear_L", -0.25, 0.14),
        ("Rear_R", -0.25, -0.14),
    ]
    for leg_name, lx, ly in leg_positions:
        bm_leg = bmesh.new()
        bm_add_cylinder(bm_leg, 0.058, 0.042, 0.24, segments=10, center=(0, 0, -0.12))
        bm_add_cylinder(bm_leg, 0.040, 0.032, 0.22, segments=10, center=(0, 0, -0.32))
        bm_add_cylinder(bm_leg, 0.042, 0.038, 0.05, segments=10, center=(0, 0, -0.42))
        create_mesh_object(f"Horse_Leg_{leg_name}", bm_leg, mat_horse, parent=horse_root, location=(lx, ly, 0.44))

    # Horse Tail
    bm_tail = bmesh.new()
    bm_add_cylinder(bm_tail, 0.045, 0.015, 0.32, segments=8, center=(-0.04, 0, -0.11), rot_euler=(0, math.radians(22), 0))
    create_mesh_object("Horse_Tail", bm_tail, pal["cloth_brown"], parent=horse_root, location=(-0.36, 0, 0.46))

    # Saddle & Stirrup Straps
    bm_saddle = bmesh.new()
    bm_add_box(bm_saddle, 0.26, 0.28, 0.10, center=(0.02, 0, 0.55))
    bm_add_box(bm_saddle, 0.06, 0.26, 0.14, center=(-0.10, 0, 0.60))
    bm_add_box(bm_saddle, 0.06, 0.24, 0.12, center=(0.14, 0, 0.58))
    create_mesh_object("Saddle", bm_saddle, pal["dark_leather"], parent=horse_root)

    # -------------------------------------------------------------
    # 2. ARMORED KNIGHT RIDER
    # -------------------------------------------------------------
    # Torso (Full Plate Cuirass & Chainmail Aventail)
    bm_torso = bmesh.new()
    bm_add_box(bm_torso, 0.18, 0.26, 0.28, center=(0.02, 0, 0.74))
    bm_add_cylinder(bm_torso, 0.12, 0.14, 0.26, segments=12, center=(0.02, 0, 0.74))
    bm_add_cylinder(bm_torso, 0.09, 0.08, 0.07, segments=12, center=(0.02, 0, 0.90))
    torso_obj = create_mesh_object("Torso", bm_torso, mat_armor, parent=horse_root)

    # Knight Head & Full Great Helm
    bm_helm = bmesh.new()
    bm_add_sphere(bm_helm, 0.115, segments=16, ring_count=12, center=(0.02, 0, 1.03), scale=(1.02, 1.0, 1.12))
    bm_add_cylinder(bm_helm, 0.115, 0.115, 0.12, segments=14, center=(0.02, 0, 0.99))
    bm_add_box(bm_helm, 0.02, 0.13, 0.016, center=(0.13, 0, 1.02))
    bm_add_cylinder(bm_helm, 0.118, 0.118, 0.022, segments=14, center=(0.02, 0, 1.04))
    create_mesh_object("Head", bm_helm, mat_armor, parent=torso_obj)

    # Knight Mounted Legs (Left & Right astride horse in stirrups)
    bm_leg_l = bmesh.new()
    bm_add_cylinder(bm_leg_l, 0.065, 0.052, 0.26, segments=10, center=(0.08, 0.18, 0.62), rot_euler=(math.radians(35), math.radians(15), 0))
    bm_add_cylinder(bm_leg_l, 0.050, 0.040, 0.24, segments=10, center=(0.14, 0.19, 0.43), rot_euler=(math.radians(10), 0, 0))
    bm_add_box(bm_leg_l, 0.06, 0.07, 0.09, center=(0.16, 0.19, 0.32))
    create_mesh_object("Leg_L", bm_leg_l, mat_armor, parent=torso_obj)

    bm_leg_r = bmesh.new()
    bm_add_cylinder(bm_leg_r, 0.065, 0.052, 0.26, segments=10, center=(0.08, -0.18, 0.62), rot_euler=(math.radians(-35), math.radians(15), 0))
    bm_add_cylinder(bm_leg_r, 0.050, 0.040, 0.24, segments=10, center=(0.14, -0.19, 0.43), rot_euler=(math.radians(-10), 0, 0))
    bm_add_box(bm_leg_r, 0.06, 0.07, 0.09, center=(0.16, -0.19, 0.32))
    create_mesh_object("Leg_R", bm_leg_r, mat_armor, parent=torso_obj)

    # Pauldrons
    bm_pauldron = bmesh.new()
    bm_add_sphere(bm_pauldron, 0.085, segments=12, ring_count=8, center=(0.02, 0.18, 0.85), scale=(1.1, 0.9, 1.0))
    bm_add_sphere(bm_pauldron, 0.085, segments=12, ring_count=8, center=(0.02, -0.18, 0.85), scale=(1.1, 0.9, 1.0))
    create_mesh_object("Pauldrons", bm_pauldron, mat_armor, parent=torso_obj)

    # Arm_L (Holding horse reins / heater shield)
    bm_arm_l = bmesh.new()
    bm_add_cylinder(bm_arm_l, 0.052, 0.042, 0.26, segments=10, center=(0.12, 0.17, 0.75), rot_euler=(math.radians(-25), math.radians(35), 0))
    bm_add_box(bm_arm_l, 0.04, 0.24, 0.30, center=(0.18, 0.22, 0.70), rot_euler=(0, math.radians(15), math.radians(10)))
    create_mesh_object("Arm_L", bm_arm_l, mat_armor, parent=torso_obj)

    # Arm_R (Holding heavy flanged mace, raised forward)
    bm_arm_r = bmesh.new()
    bm_add_cylinder(bm_arm_r, 0.052, 0.042, 0.26, segments=10, center=(0.08, -0.18, 0.80), rot_euler=(math.radians(20), math.radians(-35), 0))
    arm_r_obj = create_mesh_object("Arm_R", bm_arm_r, mat_armor, parent=torso_obj)

    # Mace Haft (Arm_R)
    bm_mace = bmesh.new()
    bm_add_cylinder(bm_mace, 0.018, 0.020, 0.72, segments=10, center=(0.20, -0.22, 0.94), rot_euler=(0, math.radians(40), 0))
    mace_obj = create_mesh_object("Weapon", bm_mace, mat_gear, parent=arm_r_obj)

    # Flanged Mace Head
    bm_mhead = bmesh.new()
    bm_add_cylinder(bm_mhead, 0.038, 0.034, 0.16, segments=12, center=(0.42, -0.22, 1.20), rot_euler=(0, math.radians(40), 0))
    for i in range(6):
        frot = math.radians(i * 60)
        bm_add_box(bm_mhead, 0.075, 0.014, 0.14, center=(0.42, -0.22, 1.20), rot_euler=(frot, math.radians(40), 0))
    bm_add_cylinder(bm_mhead, 0.002, 0.020, 0.12, segments=8, center=(0.49, -0.22, 1.29), rot_euler=(0, math.radians(40), 0))
    create_mesh_object("Weapon_Head", bm_mhead, mat_gear, parent=mace_obj)

    # Counterweight Pommel
    bm_pommel = bmesh.new()
    bm_add_sphere(bm_pommel, 0.034, segments=10, ring_count=8, center=(-0.05, -0.22, 0.63))
    create_mesh_object("Weapon_Pommel", bm_pommel, mat_gear, parent=mace_obj)

    export_current_model("armored_knight")


def build_forest_trees():
    """
    Generates low-poly 3D forest trees at ~0.90 world units tall (75% of the ~1.20 average unit height).
    Exports forest_pine.glb, forest_oak.glb, and assets/blender/forest_trees.blend.
    """
    bark_png = os.path.join(TERRAIN_TEXTURES_DIR, "tree_bark.png")
    foliage_png = os.path.join(TERRAIN_TEXTURES_DIR, "tree_foliage.png")

    # 1. Forest Pine (total height = 0.90)
    clear_scene()
    trunk_mat = make_textured_material("TreeBark", bark_png, (0.36, 0.23, 0.13, 1.0), metallic=0.0, roughness=0.92)
    pine_dark = make_textured_material("PineFoliageDark", foliage_png, (0.14, 0.34, 0.16, 1.0), metallic=0.0, roughness=0.86)
    pine_mid = make_textured_material("PineFoliageMid", foliage_png, (0.19, 0.43, 0.21, 1.0), metallic=0.0, roughness=0.84)
    pine_light = make_textured_material("PineFoliageLight", foliage_png, (0.25, 0.51, 0.25, 1.0), metallic=0.0, roughness=0.82)

    bm_trunk = bmesh.new()
    bm_add_cylinder(bm_trunk, 0.065, 0.042, 0.28, segments=10, center=(0, 0, 0.14))
    pine_root = create_mesh_object("Tree_Pine_Trunk", bm_trunk, trunk_mat)

    bm_tier1 = bmesh.new()
    bm_add_cylinder(bm_tier1, 0.26, 0.04, 0.34, segments=12, center=(0, 0, 0.40))
    create_mesh_object("Tree_Pine_Tier1", bm_tier1, pine_dark, parent=pine_root)

    bm_tier2 = bmesh.new()
    bm_add_cylinder(bm_tier2, 0.21, 0.03, 0.30, segments=12, center=(0, 0, 0.59))
    create_mesh_object("Tree_Pine_Tier2", bm_tier2, pine_mid, parent=pine_root)

    bm_tier3 = bmesh.new()
    bm_add_cylinder(bm_tier3, 0.15, 0.005, 0.26, segments=12, center=(0, 0, 0.77))
    create_mesh_object("Tree_Pine_Tier3", bm_tier3, pine_light, parent=pine_root)

    export_current_model("forest_pine", is_terrain=True)

    # 2. Forest Oak (total height = 0.90)
    clear_scene()
    trunk_mat = make_textured_material("TreeBark", bark_png, (0.36, 0.23, 0.13, 1.0), metallic=0.0, roughness=0.92)
    oak_main = make_textured_material("OakFoliageMain", foliage_png, (0.22, 0.46, 0.19, 1.0), metallic=0.0, roughness=0.85)
    oak_accent = make_textured_material("OakFoliageAccent", foliage_png, (0.29, 0.54, 0.23, 1.0), metallic=0.0, roughness=0.82)

    bm_oak_trunk = bmesh.new()
    bm_add_cylinder(bm_oak_trunk, 0.075, 0.050, 0.36, segments=10, center=(0, 0, 0.18))
    oak_root = create_mesh_object("Tree_Oak_Trunk", bm_oak_trunk, trunk_mat)

    bm_crown_main = bmesh.new()
    bm_add_icosphere(bm_crown_main, 0.25, subdivisions=2, center=(0, 0, 0.58), scale=(1.08, 1.05, 0.95))
    create_mesh_object("Tree_Oak_CrownMain", bm_crown_main, oak_main, parent=oak_root)

    bm_crown_sub = bmesh.new()
    bm_add_icosphere(bm_crown_sub, 0.17, subdivisions=2, center=(0.12, 0.08, 0.52))
    bm_add_icosphere(bm_crown_sub, 0.16, subdivisions=2, center=(-0.11, -0.09, 0.54))
    bm_add_icosphere(bm_crown_sub, 0.15, subdivisions=2, center=(0.02, -0.04, 0.75))
    create_mesh_object("Tree_Oak_CrownClusters", bm_crown_sub, oak_accent, parent=oak_root)

    export_current_model("forest_oak", is_terrain=True)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(BLEND_DIR, "forest_trees.blend"))


ALL_BUILDERS = [
    ("peasant", build_peasant),
    ("peasant_archer", build_peasant_archer),
    ("swordsman", build_swordsman),
    ("spearman", build_spearman),
    ("crossbowman", build_crossbowman),
    ("barbarian", build_barbarian),
    ("slinger", build_slinger),
    ("healer", build_healer),
    ("maceman", build_maceman),
    ("armored_knight", build_armored_knight),
    ("forest_trees", build_forest_trees),
]


if __name__ == "__main__":
    # Optional selection: blender --background --python scripts/generate_blender_models.py -- peasant healer
    selected = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    for key, builder in ALL_BUILDERS:
        if not selected or key in selected:
            builder()
    print("Blender 3D models (.glb and .blend) generated successfully!")

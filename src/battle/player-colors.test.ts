import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as THREE from "three";
import * as path from "path";
import * as fs from "fs";
import { Battle } from "../battle";
import { HexMap } from "../shared/hex-map";
import { DEFAULT_COMBAT_CONFIG } from "./combat-rules";
import { CreatureType } from "./creature";
import {
  parseColorToHex,
  parseColorToRgba,
  configurePlayerColors,
  resetPlayerColorsToDefault,
  getPlayerColorsConfig,
  getTeamColorHex,
  buildArticulatedUnit3DMesh,
  instantiateGlbUnitTemplate,
} from "../render3d/units/unit-mesh-builder";

describe("Player Specific Colors Configuration in Battle Config", () => {
  beforeEach(() => {
    resetPlayerColorsToDefault();
  });

  afterEach(() => {
    resetPlayerColorsToDefault();
  });

  describe("1. Color Parsing (RGB, RGBA, Hex, Array, Object)", () => {
    it("should parse standard rgb(r, g, b) strings", () => {
      expect(parseColorToHex("rgb(47, 99, 199)")).toBe(0x2f63c7);
      expect(parseColorToHex("rgb(199, 54, 54)")).toBe(0xc73636);
      expect(parseColorToHex("rgb(0, 255, 128)")).toBe(0x00ff80);
      expect(parseColorToHex("rgb( 255 , 255 , 255 )")).toBe(0xffffff);
    });

    it("should parse rgba(r, g, b, a) strings", () => {
      expect(parseColorToHex("rgba(47, 99, 199, 1.0)")).toBe(0x2f63c7);
      expect(parseColorToHex("rgba(0, 200, 255, 0.85)")).toBe(0x00c8ff);
      const rgba = parseColorToRgba("rgba(47, 99, 199, 0.75)");
      expect(rgba.r).toBe(47);
      expect(rgba.g).toBe(99);
      expect(rgba.b).toBe(199);
      expect(rgba.a).toBe(0.75);
    });

    it("should parse hex strings and numbers", () => {
      expect(parseColorToHex("#2f63c7")).toBe(0x2f63c7);
      expect(parseColorToHex("2f63c7")).toBe(0x2f63c7);
      expect(parseColorToHex("0x2f63c7")).toBe(0x2f63c7);
      expect(parseColorToHex(0x2f63c7)).toBe(0x2f63c7);
      expect(parseColorToHex("#ff0000")).toBe(0xff0000);
      expect(parseColorToHex("#0f0")).toBe(0x00ff00);
    });

    it("should parse [r, g, b] and [r, g, b, a] arrays", () => {
      expect(parseColorToHex([47, 99, 199])).toBe(0x2f63c7);
      expect(parseColorToHex([199, 54, 54, 1.0])).toBe(0xc73636);
      expect(parseColorToHex([0, 128, 255])).toBe(0x0080ff);
    });

    it("should parse { r, g, b } objects", () => {
      expect(parseColorToHex({ r: 47, g: 99, b: 199 })).toBe(0x2f63c7);
      expect(parseColorToHex({ red: 199, green: 54, blue: 54 })).toBe(0xc73636);
    });

    it("should fallback to default for invalid or null inputs", () => {
      expect(parseColorToHex(null, 0x123456)).toBe(0x123456);
      expect(parseColorToHex(undefined, 0x123456)).toBe(0x123456);
      expect(parseColorToHex("invalid_color", 0x123456)).toBe(0x123456);
    });
  });

  describe("2. Default Configuration and Settings in combat_config.json", () => {
    it("should define playerColors in public/combat_config.json with default blue and red nuances", () => {
      const cfgPath = path.resolve(__dirname, "../../public/combat_config.json");
      expect(fs.existsSync(cfgPath)).toBe(true);

      const json = JSON.parse(fs.readFileSync(cfgPath, "utf-8"));
      expect(json.playerColors).toBeDefined();
      expect(json.playerColors.player1).toBeDefined();
      expect(json.playerColors.player2).toBeDefined();

      // Verify that the configured values parse as valid color hexes
      const p1Hex = parseColorToHex(json.playerColors.player1);
      const p2Hex = parseColorToHex(json.playerColors.player2);
      expect(p1Hex).toBeGreaterThan(0);
      expect(p2Hex).toBeGreaterThan(0);
    });

    it("should include playerColors in DEFAULT_COMBAT_CONFIG", () => {
      expect(DEFAULT_COMBAT_CONFIG.playerColors).toBeDefined();
      expect(parseColorToHex(DEFAULT_COMBAT_CONFIG.playerColors?.player1)).toBe(0x2f63c7);
      expect(parseColorToHex(DEFAULT_COMBAT_CONFIG.playerColors?.player2)).toBe(0xc73636);
      expect(parseColorToHex(DEFAULT_COMBAT_CONFIG.playerColors?.hero)).toBe(0xd4af37);
    });
  });

  describe("3. Dynamic Configuration via configurePlayerColors and Battle.setCombatConfig", () => {
    it("should dynamically change Player 1 color nuance when configured", () => {
      // Default: Player 1 = 0x2f63c7
      expect(getTeamColorHex(0)).toBe(0x2f63c7);
      expect(getTeamColorHex(1)).toBe(0xc73636);

      // Change Player 1 to custom teal RGB: rgb(0, 180, 216)
      configurePlayerColors({
        player1: "rgb(0, 180, 216)",
      });

      expect(getTeamColorHex(0)).toBe(0x00b4d8);
      expect(getTeamColorHex(1)).toBe(0xc73636); // Player 2 unchanged

      // Change Player 1 using RGBA: rgba(33, 150, 243, 1.0)
      configurePlayerColors({
        player1: "rgba(33, 150, 243, 1.0)",
      });
      expect(getTeamColorHex(0)).toBe(0x2196f3);
    });

    it("should dynamically change Player 2 color nuance when configured", () => {
      // Change Player 2 to crimson: rgb(220, 20, 60)
      configurePlayerColors({
        player2: "rgb(220, 20, 60)",
      });

      expect(getTeamColorHex(0)).toBe(0x2f63c7); // Player 1 unchanged
      expect(getTeamColorHex(1)).toBe(0xdc143c);
    });

    it("should update player colors when Battle.setCombatConfig is called", () => {
      const battle = new Battle(new HexMap(8, 8));
      expect(getTeamColorHex(0)).toBe(0x2f63c7);

      battle.setCombatConfig({
        ...DEFAULT_COMBAT_CONFIG,
        playerColors: {
          player1: "rgb(65, 105, 225)", // Royal blue
          player2: "rgb(255, 69, 0)",    // Orange-red
          hero: "rgb(255, 215, 0)",      // Gold
        },
      });

      expect(getTeamColorHex(0)).toBe(0x4169e1);
      expect(getTeamColorHex(1)).toBe(0xff4500);
      expect(getTeamColorHex(0, true)).toBe(0xffd700);

      const config = getPlayerColorsConfig();
      expect(config.player1).toBe(0x4169e1);
      expect(config.player2).toBe(0xff4500);
      expect(config.hero).toBe(0xffd700);
    });

    it("should apply configured player colors to procedural 3D articulated unit meshes", () => {
      // Set Player 1 to distinctive bright cyan
      configurePlayerColors({
        player1: "rgb(0, 255, 200)",
      });

      const healerP1 = buildArticulatedUnit3DMesh(CreatureType.HEALER, 0, false);
      expect(healerP1).toBeDefined();

      // Check vertex colors baked into compacted articulated unit geometry
      let foundConfiguredColor = false;
      const expectedHex = 0x00ffc8;
      const tempColor = new THREE.Color();

      healerP1.traverse((node: any) => {
        if (node.geometry && node.geometry.getAttribute("color")) {
          const colAttr = node.geometry.getAttribute("color");
          for (let i = 0; i < colAttr.count; i++) {
            tempColor.setRGB(colAttr.getX(i), colAttr.getY(i), colAttr.getZ(i));
            if (tempColor.getHex() === expectedHex) {
              foundConfiguredColor = true;
              break;
            }
          }
        }
      });
      expect(foundConfiguredColor).toBe(true);
    });

    it("should apply configured player colors to GLB unit template materials and vertex colors", () => {
      configurePlayerColors({
        player1: "rgb(0, 255, 200)",
        player2: "rgb(255, 100, 50)",
      });

      // Create a mock GLB scene hierarchy with team colored parts
      const mockScene = new THREE.Group();
      const torso = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({ name: "Mat_Torso" })
      );
      torso.name = "Torso";

      const teamArmband = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.5, 1),
        new THREE.MeshStandardMaterial({ name: "Armband_Team_P1" })
      );
      teamArmband.name = "Armband_Team";
      torso.add(teamArmband);
      mockScene.add(torso);

      // Instantiate for Player 1 (armyAlignment = 0)
      const instanceP1 = instantiateGlbUnitTemplate(mockScene, "custom_unit", 0, false);
      let p1ColorFound = false;
      const tempColor = new THREE.Color();
      instanceP1.traverse((node: any) => {
        if (node.geometry && node.geometry.getAttribute("color")) {
          const colAttr = node.geometry.getAttribute("color");
          for (let i = 0; i < colAttr.count; i++) {
            tempColor.setRGB(colAttr.getX(i), colAttr.getY(i), colAttr.getZ(i));
            if (tempColor.getHex() === 0x00ffc8) {
              p1ColorFound = true;
              break;
            }
          }
        }
      });
      expect(p1ColorFound).toBe(true);

      // Instantiate for Player 2 (armyAlignment = 1)
      const instanceP2 = instantiateGlbUnitTemplate(mockScene, "custom_unit", 1, false);
      let p2ColorFound = false;
      instanceP2.traverse((node: any) => {
        if (node.geometry && node.geometry.getAttribute("color")) {
          const colAttr = node.geometry.getAttribute("color");
          for (let i = 0; i < colAttr.count; i++) {
            tempColor.setRGB(colAttr.getX(i), colAttr.getY(i), colAttr.getZ(i));
            if (tempColor.getHex() === 0xff6432) {
              p2ColorFound = true;
              break;
            }
          }
        }
      });
      expect(p2ColorFound).toBe(true);
    });
  });
});

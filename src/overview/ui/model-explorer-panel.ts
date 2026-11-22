import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { Texture } from 'pixi.js';
import { CreatureType } from '../../battle/creature';
import {
  UNIT_GLB_PATHS,
  buildArticulatedUnit3DMesh,
  buildLowPolyForestTreeMesh,
  ForestTreeVariant,
  instantiateGlbUnitTemplate,
} from '../../render3d/units/unit-mesh-builder';
import {
  buildCropFieldMesh,
  buildFarmFenceMesh,
  buildFarmhouseMesh,
  buildForestLogMesh,
  buildForestRockMesh,
  buildHaystackMesh,
  buildWindmillMesh,
} from '../../render3d/decorations/battle-environment-3d';
import { createRetreatFlagMesh } from '../../render3d/decorations/retreat-flag-3d';
import {
  createOverviewAgricultureModel,
  createOverviewBridgeModel,
  createOverviewDefenseModel,
  createOverviewResourceBuildingModel,
  createOverviewSettlementModel,
} from '../../render3d/overview/overview-models-3d';
import { createOverviewCowModel } from '../../render3d/overview/overview-cow-3d';
import { createOverviewPeasantModel } from '../../render3d/overview/overview-peasant-3d';
import { createOverviewWheatFieldModel } from '../../render3d/overview/overview-wheat-field-3d';

export type ModelExplorerCategory =
  | 'Settlements & Defenses'
  | 'Buildings & Agriculture'
  | 'Trees & Foliage'
  | 'Units'
  | 'Battle Scene: Units'
  | 'Battle Scene: Terrain & Props';

export interface ModelAnimationController {
  names: string[];
  play: (name: string) => void;
  stop: () => void;
  update: (dt: number) => void;
  setLoop?: (loop: boolean) => void;
}

export interface ModelExplorerEntry {
  id: string;
  label: string;
  category: ModelExplorerCategory;
  lazyLoad?: boolean;
  create: () => THREE.Object3D | Promise<THREE.Object3D>;
}

function attachClipAnimationController(
  target: THREE.Object3D,
  clips: THREE.AnimationClip[]
): void {
  if (!clips || clips.length === 0) return;
  const mixer = new THREE.AnimationMixer(target);
  const actions: Record<string, THREE.AnimationAction> = {};
  const names: string[] = [];
  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];
    const name = clip.name || `animation_${i + 1}`;
    names.push(name);
    actions[name] = mixer.clipAction(clip);
  }
  let active: THREE.AnimationAction | null = null;
  let loopEnabled = true;
  const applyActionLoop = (action: THREE.AnimationAction, loop: boolean) => {
    action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
    action.clampWhenFinished = !loop;
  };
  const controller: ModelAnimationController = {
    names,
    play: (name: string) => {
      const next = actions[name];
      if (!next) return;
      applyActionLoop(next, loopEnabled);
      next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
      if (active && active !== next) {
        active.crossFadeTo(next, 0.25, false);
      }
      active = next;
    },
    stop: () => {
      mixer.stopAllAction();
      active = null;
    },
    update: (dt: number) => {
      mixer.update(dt);
    },
    setLoop: (loop: boolean) => {
      loopEnabled = loop;
      for (const action of Object.values(actions)) {
        applyActionLoop(action, loop);
      }
    },
  };
  target.userData.animationController = controller;
}

function resolveAnimationController(model: THREE.Object3D): ModelAnimationController | null {
  if (model.userData?.animationController) {
    return model.userData.animationController as ModelAnimationController;
  }
  const peasant = model.userData?.peasantController as
    | {
        actions: Record<string, THREE.AnimationAction>;
        mixer: THREE.AnimationMixer;
        playAnimation: (name: string, fade?: number) => unknown;
        update: (dt: number) => void;
        mesh?: THREE.SkinnedMesh;
      }
    | undefined;
  if (peasant) {
    let loopEnabled = true;
    const applyActionLoop = (action: THREE.AnimationAction, loop: boolean) => {
      action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
      action.clampWhenFinished = !loop;
    };
    return {
      names: Object.keys(peasant.actions),
      play: (name: string) => {
        peasant.playAnimation(name, 0.25);
        const action = peasant.actions[name];
        if (action) {
          applyActionLoop(action, loopEnabled);
        }
      },
      stop: () => {
        peasant.mixer.stopAllAction();
        peasant.mesh?.skeleton?.pose();
      },
      update: (dt: number) => {
        peasant.update(dt);
      },
      setLoop: (loop: boolean) => {
        loopEnabled = loop;
        for (const action of Object.values(peasant.actions)) {
          applyActionLoop(action, loop);
        }
      },
    };
  }
  return null;
}

function formatUnitDisplayName(unitKey: string): string {
  return unitKey
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

async function loadBattleUnitGlbModel(unitKey: string, glbPath: string): Promise<THREE.Object3D> {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(glbPath);
  const instance = instantiateGlbUnitTemplate(gltf.scene, unitKey, 0, false);
  attachClipAnimationController(instance, gltf.animations);
  // Dispose intermediate template geometries/materials immediately (textures remain referenced by instance until unload)
  gltf.scene.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry?.dispose();
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      for (const m of mats) {
        m?.dispose();
      }
    }
  });
  return instance;
}

async function loadBattleTreeGlbModel(glbPath: string): Promise<THREE.Object3D> {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(glbPath);
  gltf.scene.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  attachClipAnimationController(gltf.scene, gltf.animations);
  return gltf.scene;
}

export function getModelExplorerCatalog(): ModelExplorerEntry[] {
  const treeVariants: Array<{ id: ForestTreeVariant; label: string }> = [
    { id: 'oak', label: 'Oak Tree' },
    { id: 'pine', label: 'Pine Tree' },
    { id: 'birch', label: 'Birch Tree' },
    { id: 'willow', label: 'Willow Tree' },
    { id: 'maple', label: 'Maple Tree' },
    { id: 'card_oak', label: 'Oak Tree (Alpha Card)' },
    { id: 'card_pine', label: 'Pine Tree (Alpha Card)' },
    { id: 'card_birch', label: 'Birch Tree (Alpha Card)' },
    { id: 'card_willow', label: 'Willow Tree (Alpha Card)' },
    { id: 'card_maple', label: 'Maple Tree (Alpha Card)' },
  ];

  const unitTypes: Array<{ type: CreatureType; label: string; isHero?: boolean }> = [
    { type: CreatureType.PEASANT, label: 'Peasant' },
    { type: CreatureType.PEASANT_ARCHER, label: 'Peasant Archer' },
    { type: CreatureType.SLINGER, label: 'Slinger' },
    { type: CreatureType.SWORDSMAN, label: 'Swordsman' },
    { type: CreatureType.SPEARMAN, label: 'Spearman' },
    { type: CreatureType.MACEMAN, label: 'Maceman' },
    { type: CreatureType.CROSSBOWMAN, label: 'Crossbowman' },
    { type: CreatureType.ARCHER, label: 'Archer' },
    { type: CreatureType.HEALER, label: 'Healer' },
    { type: CreatureType.BARBARIAN, label: 'Barbarian' },
    { type: CreatureType.HEAVY_KNIGHTS, label: 'Heavy Knights' },
    { type: CreatureType.ARMORED_KNIGHT, label: 'Armored Knight' },
    { type: CreatureType.BEHEMOTH, label: 'Behemoth' },
    { type: CreatureType.HERO_COMMANDER, label: 'Hero Commander', isHero: true },
  ];

  return [
    {
      id: 'settlement_village',
      label: 'Settlement: Village',
      category: 'Settlements & Defenses',
      create: () => createOverviewSettlementModel('village', '#3498db'),
    },
    {
      id: 'settlement_town',
      label: 'Settlement: Town',
      category: 'Settlements & Defenses',
      create: () => createOverviewSettlementModel('town', '#3498db'),
    },
    {
      id: 'settlement_city',
      label: 'Settlement: City',
      category: 'Settlements & Defenses',
      create: () => createOverviewSettlementModel('city', '#3498db'),
    },
    {
      id: 'defense_palisade',
      label: 'Defense: Palisade',
      category: 'Settlements & Defenses',
      create: () => createOverviewDefenseModel('palisade'),
    },
    {
      id: 'defense_keep',
      label: 'Defense: Keep',
      category: 'Settlements & Defenses',
      create: () => createOverviewDefenseModel('keep'),
    },
    {
      id: 'defense_castle',
      label: 'Defense: Castle',
      category: 'Settlements & Defenses',
      create: () => createOverviewDefenseModel('castle'),
    },
    {
      id: 'building_lumber_camp',
      label: 'Lumber Camp',
      category: 'Buildings & Agriculture',
      create: () => createOverviewResourceBuildingModel('lumber_camp'),
    },
    {
      id: 'building_quarry',
      label: 'Quarry',
      category: 'Buildings & Agriculture',
      create: () => createOverviewResourceBuildingModel('quarry'),
    },
    {
      id: 'building_iron_mine',
      label: 'Iron Mine',
      category: 'Buildings & Agriculture',
      create: () => createOverviewResourceBuildingModel('iron_mine'),
    },
    {
      id: 'building_gold_mine',
      label: 'Gold Mine',
      category: 'Buildings & Agriculture',
      create: () => createOverviewResourceBuildingModel('gold_mine'),
    },
    {
      id: 'agri_wheat',
      label: 'Grain / Wheat Field',
      category: 'Buildings & Agriculture',
      create: () => createOverviewWheatFieldModel(1, { includeSoilBase: true }),
    },
    {
      id: 'agri_cattle',
      label: 'Cattle Pasture',
      category: 'Buildings & Agriculture',
      create: () => createOverviewAgricultureModel('cattle', 1),
    },
    {
      id: 'agri_cow',
      label: 'Cow',
      category: 'Buildings & Agriculture',
      create: () => createOverviewCowModel(1),
    },
    {
      id: 'agri_sheep',
      label: 'Sheep Pasture',
      category: 'Buildings & Agriculture',
      create: () => createOverviewAgricultureModel('sheep', 1),
    },
    {
      id: 'agri_horses',
      label: 'Horses Pasture',
      category: 'Buildings & Agriculture',
      create: () => createOverviewAgricultureModel('horses', 1),
    },
    {
      id: 'structure_bridge',
      label: 'River Bridge',
      category: 'Buildings & Agriculture',
      create: () => createOverviewBridgeModel(),
    },
    ...treeVariants.map((tv) => ({
      id: `tree_${tv.id}`,
      label: tv.label,
      category: 'Trees & Foliage' as const,
      create: () => buildLowPolyForestTreeMesh(tv.id, 1),
    })),
    ...unitTypes.map((ut) => ({
      id: `unit_${CreatureType[ut.type].toLowerCase()}`,
      label: ut.label,
      category: 'Units' as const,
      create: () =>
        ut.type === CreatureType.PEASANT
          ? createOverviewPeasantModel(707)
          : buildArticulatedUnit3DMesh(ut.type, 0, Boolean(ut.isHero)),
    })),
    // Battle-scene-only models (lazy loaded on click, unloaded on switch)
    {
      id: 'battle_unit_peasant_rigged',
      label: 'Battle Unit: Peasant (Rigged GLB) - lazy load',
      category: 'Battle Scene: Units' as const,
      lazyLoad: true,
      create: () => loadBattleTreeGlbModel('models/units/peasant_rigged.glb'),
    },
    {
      id: 'battle_unit_spearman_rigged',
      label: 'Battle Unit: Spearman (Rigged GLB) - lazy load',
      category: 'Battle Scene: Units' as const,
      lazyLoad: true,
      create: () => loadBattleTreeGlbModel('models/units/spearman_rigged.glb'),
    },
    ...Object.entries(UNIT_GLB_PATHS).map(([unitKey, glbPath]) => ({
      id: `battle_unit_${unitKey}`,
      label: `Battle Unit: ${formatUnitDisplayName(unitKey)} - lazy load`,
      category: 'Battle Scene: Units' as const,
      lazyLoad: true,
      create: () => loadBattleUnitGlbModel(unitKey, glbPath),
    })),
    {
      id: 'battle_tree_oak',
      label: 'Battle Tree: Forest Oak (GLB) - lazy load',
      category: 'Battle Scene: Terrain & Props' as const,
      lazyLoad: true,
      create: () => loadBattleTreeGlbModel('models/terrain/forest_oak.glb'),
    },
    {
      id: 'battle_tree_pine',
      label: 'Battle Tree: Forest Pine (GLB) - lazy load',
      category: 'Battle Scene: Terrain & Props' as const,
      lazyLoad: true,
      create: () => loadBattleTreeGlbModel('models/terrain/forest_pine.glb'),
    },
    {
      id: 'battle_prop_forest_rock',
      label: 'Battle Prop: Forest Rock - lazy load',
      category: 'Battle Scene: Terrain & Props' as const,
      lazyLoad: true,
      create: () => buildForestRockMesh(1.0, 1),
    },
    {
      id: 'battle_prop_forest_log',
      label: 'Battle Prop: Forest Log - lazy load',
      category: 'Battle Scene: Terrain & Props' as const,
      lazyLoad: true,
      create: () => buildForestLogMesh(1.0),
    },
    {
      id: 'battle_prop_farmhouse',
      label: 'Battle Prop: Farmhouse - lazy load',
      category: 'Battle Scene: Terrain & Props' as const,
      lazyLoad: true,
      create: () => buildFarmhouseMesh(1.0, false),
    },
    {
      id: 'battle_prop_barn',
      label: 'Battle Prop: Barn - lazy load',
      category: 'Battle Scene: Terrain & Props' as const,
      lazyLoad: true,
      create: () => buildFarmhouseMesh(1.0, true),
    },
    {
      id: 'battle_prop_windmill',
      label: 'Battle Prop: Windmill - lazy load',
      category: 'Battle Scene: Terrain & Props' as const,
      lazyLoad: true,
      create: () => buildWindmillMesh(1.0),
    },
    {
      id: 'battle_prop_haystack',
      label: 'Battle Prop: Haystack - lazy load',
      category: 'Battle Scene: Terrain & Props' as const,
      lazyLoad: true,
      create: () => buildHaystackMesh(1.0),
    },
    {
      id: 'battle_prop_crop_field',
      label: 'Battle Prop: Crop Field - lazy load',
      category: 'Battle Scene: Terrain & Props' as const,
      lazyLoad: true,
      create: () => buildCropFieldMesh(1.8, 1.4),
    },
    {
      id: 'battle_prop_farm_fence',
      label: 'Battle Prop: Farm Fence - lazy load',
      category: 'Battle Scene: Terrain & Props' as const,
      lazyLoad: true,
      create: () => buildFarmFenceMesh(1.6),
    },
    {
      id: 'battle_prop_retreat_flag',
      label: 'Battle Prop: Retreat Flag - lazy load',
      category: 'Battle Scene: Terrain & Props' as const,
      lazyLoad: true,
      create: () => createRetreatFlagMesh(0, 0, 0),
    },
  ];
}

function countObjectTriangles(obj: THREE.Object3D): number {
  let tris = 0;
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh && child.geometry) {
      const geo = child.geometry;
      const count = geo.index
        ? geo.index.count / 3
        : (geo.getAttribute('position')?.count ?? 0) / 3;
      const mult = child instanceof THREE.InstancedMesh ? child.count : 1;
      tris += Math.round(count * mult);
    }
  });
  return tris;
}

export interface ModelExplorerPanelOptions {
  cursorTexture?: Texture;
  onVisibilityChange?: (visible: boolean) => void;
}

export class ModelExplorerPanel {
  public readonly entries: ModelExplorerEntry[];
  private rootElement: HTMLElement | null = null;
  private cursorElement: HTMLCanvasElement | null = null;
  private viewportElement: HTMLElement | null = null;
  private statsElement: HTMLElement | null = null;
  private listButtons = new Map<string, HTMLButtonElement>();
  private animListElement: HTMLElement | null = null;
  private animButtons = new Map<string, HTMLButtonElement>();
  private loopButton: HTMLButtonElement | null = null;
  private loopEnabled: boolean = true;
  private wireframeButton: HTMLButtonElement | null = null;
  private closeButton: HTMLButtonElement | null = null;
  private wireframeEnabled: boolean = false;

  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private currentModel: THREE.Object3D | null = null;
  private activeAnimController: ModelAnimationController | null = null;
  private selectedAnimation: string = 'none';
  private randomAnimTimer: number = 0;
  private selectedId: string | null = null;
  private loadRequestSeq: number = 0;
  private visible: boolean = false;
  private rafId: number | null = null;

  // Orbit camera state
  private cameraTarget = new THREE.Vector3(0, 0.3, 0);
  private orbitYaw: number = Math.PI * 0.25;
  private orbitPitch: number = Math.PI * 0.18;
  private orbitDistance: number = 2.6;
  private minDistance: number = 0.5;
  private maxDistance: number = 14.0;
  private isDragging: boolean = false;
  private lastPointerX: number = 0;
  private lastPointerY: number = 0;
  private hasClientPointer: boolean = false;
  private lastClientX: number = 0;
  private lastClientY: number = 0;

  private boundKeyDown?: (e: KeyboardEvent) => void;
  private boundResize?: () => void;
  private boundTrackPointer?: (e: PointerEvent) => void;

  constructor(
    private readonly hostContainer?: HTMLElement,
    private readonly options: ModelExplorerPanelOptions = {}
  ) {
    this.entries = getModelExplorerCatalog();
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      this.boundTrackPointer = (e: PointerEvent) => {
        this.lastClientX = e.clientX;
        this.lastClientY = e.clientY;
        this.hasClientPointer = true;
        if (this.visible) {
          this.updateCursorOverlayPosition();
        }
      };
      window.addEventListener('pointermove', this.boundTrackPointer);
    }
  }

  public getModelEntries(): ModelExplorerEntry[] {
    return this.entries;
  }

  public getSelectedModelId(): string | null {
    return this.selectedId;
  }

  public getAvailableAnimations(): string[] {
    const modelAnims = this.activeAnimController?.names ?? [];
    if (modelAnims.length === 0) return [];
    return ['none', 'random', ...modelAnims];
  }

  public getSelectedAnimation(): string {
    return this.selectedAnimation;
  }

  public selectAnimation(name: string): void {
    const available = this.getAvailableAnimations();
    if (!available.includes(name)) return;
    this.selectedAnimation = name;
    this.updateAnimationButtonsHighlight();

    if (!this.activeAnimController) return;
    if (name === 'none') {
      this.activeAnimController.stop();
      this.renderFrame();
    } else if (name === 'random') {
      this.playRandomAnimation();
    } else {
      this.activeAnimController.play(name);
      this.activeAnimController.update(0);
      this.renderFrame();
    }
  }

  private playRandomAnimation(): void {
    const names = this.activeAnimController?.names ?? [];
    if (!this.activeAnimController || names.length === 0) return;
    const picked = names[Math.floor(Math.random() * names.length)];
    this.activeAnimController.play(picked);
    this.randomAnimTimer = 2.6;
  }

  private updateAnimationButtonsHighlight(): void {
    for (const [animName, btn] of this.animButtons.entries()) {
      const active = animName === this.selectedAnimation;
      btn.style.background = active ? 'rgba(218, 176, 86, 0.28)' : 'rgba(20, 28, 38, 0.72)';
      btn.style.borderColor = active ? '#e4be66' : '#3d4c5d';
      btn.style.color = active ? '#ffebaa' : '#dce6f2';
    }
  }

  private updateLoopButtonVisual(): void {
    if (!this.loopButton) return;
    this.loopButton.textContent = this.loopEnabled ? 'Loop: On' : 'Loop: Off';
    this.loopButton.style.background = this.loopEnabled
      ? 'rgba(218, 176, 86, 0.28)'
      : 'rgba(20, 28, 38, 0.72)';
    this.loopButton.style.borderColor = this.loopEnabled ? '#e4be66' : '#3d4c5d';
    this.loopButton.style.color = this.loopEnabled ? '#ffebaa' : '#dce6f2';
  }

  public getLoopButton(): HTMLButtonElement | null {
    return this.loopButton;
  }

  public isLoopEnabled(): boolean {
    return this.loopEnabled;
  }

  public toggleLoop(): boolean {
    this.setLoop(!this.loopEnabled);
    return this.loopEnabled;
  }

  public setLoop(enabled: boolean): void {
    this.loopEnabled = enabled;
    this.updateLoopButtonVisual();
    this.activeAnimController?.setLoop?.(enabled);
  }

  private rebuildAnimationPanel(): void {
    const container = this.animListElement;
    if (!container) return;
    container.innerHTML = '';
    this.animButtons.clear();
    this.loopButton = null;

    const options = this.getAvailableAnimations();
    if (options.length > 0) {
      const loopBtn = document.createElement('button');
      loopBtn.style.display = 'block';
      loopBtn.style.width = '100%';
      loopBtn.style.textAlign = 'left';
      loopBtn.style.padding = '7px 10px';
      loopBtn.style.marginBottom = '8px';
      loopBtn.style.border = '1px solid #3d4c5d';
      loopBtn.style.borderRadius = '4px';
      loopBtn.style.cursor = 'pointer';
      loopBtn.style.fontSize = '13px';
      loopBtn.style.fontWeight = 'bold';
      loopBtn.addEventListener('click', () => this.toggleLoop());
      this.loopButton = loopBtn;
      this.updateLoopButtonVisual();
      container.appendChild(loopBtn);
    }

    for (const animName of options) {
      const btn = document.createElement('button');
      btn.textContent = animName;
      btn.style.display = 'block';
      btn.style.width = '100%';
      btn.style.textAlign = 'left';
      btn.style.padding = '7px 10px';
      btn.style.marginBottom = '4px';
      btn.style.background = 'rgba(20, 28, 38, 0.72)';
      btn.style.color = '#dce6f2';
      btn.style.border = '1px solid #3d4c5d';
      btn.style.borderRadius = '4px';
      btn.style.cursor = 'pointer';
      btn.style.fontSize = '13px';
      btn.addEventListener('click', () => this.selectAnimation(animName));
      this.animButtons.set(animName, btn);
      container.appendChild(btn);
    }

    if ((this.activeAnimController?.names.length ?? 0) === 0) {
      const emptyNote = document.createElement('div');
      emptyNote.textContent = 'No skeletal clips on this model.';
      emptyNote.style.fontSize = '11px';
      emptyNote.style.color = '#7e93aa';
      emptyNote.style.marginTop = '8px';
      emptyNote.style.padding = '0 4px';
      container.appendChild(emptyNote);
    }

    this.updateAnimationButtonsHighlight();
  }

  public isVisible(): boolean {
    return this.visible;
  }

  public getCameraOrbitState(): { yaw: number; pitch: number; distance: number } {
    return {
      yaw: this.orbitYaw,
      pitch: this.orbitPitch,
      distance: this.orbitDistance,
    };
  }

  public getCloseButton(): HTMLButtonElement | null {
    return this.closeButton;
  }

  public getWireframeButton(): HTMLButtonElement | null {
    return this.wireframeButton;
  }

  public isWireframeEnabled(): boolean {
    return this.wireframeEnabled;
  }

  public toggleWireframe(): boolean {
    this.setWireframe(!this.wireframeEnabled);
    return this.wireframeEnabled;
  }

  public setWireframe(enabled: boolean): void {
    this.wireframeEnabled = enabled;
    if (this.wireframeButton) {
      this.wireframeButton.textContent = enabled ? 'Wireframe: On' : 'Wireframe: Off';
      this.wireframeButton.style.background = enabled
        ? 'rgba(218, 176, 86, 0.28)'
        : 'rgba(28, 38, 52, 0.9)';
      this.wireframeButton.style.borderColor = enabled ? '#e4be66' : '#4f6278';
      this.wireframeButton.style.color = enabled ? '#ffebaa' : '#dce6f2';
    }
    if (this.currentModel) {
      this.applyWireframeToModel(this.currentModel, enabled);
      this.renderFrame();
    }
  }

  private applyWireframeToModel(obj: THREE.Object3D, enabled: boolean): void {
    obj.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        for (const mat of mats) {
          if ('wireframe' in mat) {
            (mat as THREE.MeshStandardMaterial).wireframe = enabled;
            mat.needsUpdate = true;
          }
        }
      }
    });
  }

  public getCursorElement(): HTMLCanvasElement | null {
    return this.cursorElement;
  }

  private updateCursorOverlayPosition(): void {
    if (!this.cursorElement || !this.visible || !this.hasClientPointer) return;
    this.cursorElement.style.display = 'block';
    this.cursorElement.style.transform = `translate3d(${this.lastClientX}px, ${this.lastClientY}px, 0)`;
  }

  public show(): void {
    if (typeof document === 'undefined') return;
    if (!this.rootElement) {
      this.buildDom();
    }
    if (this.rootElement) {
      this.rootElement.style.display = 'flex';
    }
    this.visible = true;
    this.options.onVisibilityChange?.(true);
    this.updateCursorOverlayPosition();
    this.handleResize();

    if (!this.selectedId && this.entries.length > 0) {
      this.selectModel(this.entries[0].id);
    }
    this.startRenderLoop();
  }

  public hide(): void {
    this.visible = false;
    this.stopRenderLoop();
    if (this.rootElement) {
      this.rootElement.style.display = 'none';
    }
    if (this.cursorElement) {
      this.cursorElement.style.display = 'none';
    }
    this.options.onVisibilityChange?.(false);
  }

  private unloadCurrentModel(): void {
    this.activeAnimController?.stop();
    this.activeAnimController = null;
    if (this.currentModel) {
      if (this.wireframeEnabled) {
        this.applyWireframeToModel(this.currentModel, false);
      }
      this.scene?.remove(this.currentModel);
      this.disposeModel(this.currentModel);
      this.currentModel = null;
    }
  }

  public async selectModel(id: string): Promise<void> {
    const entry = this.entries.find((e) => e.id === id);
    if (!entry) return;
    const reqSeq = ++this.loadRequestSeq;
    this.selectedId = entry.id;

    for (const [btnId, btn] of this.listButtons.entries()) {
      const active = btnId === id;
      btn.style.background = active ? 'rgba(218, 176, 86, 0.28)' : 'rgba(20, 28, 38, 0.72)';
      btn.style.borderColor = active ? '#e4be66' : '#3d4c5d';
      btn.style.color = active ? '#ffebaa' : '#dce6f2';
    }

    // Unload any previously displayed model before loading the next one
    this.unloadCurrentModel();

    if (entry.lazyLoad && this.statsElement) {
      this.statsElement.textContent = `Loading ${entry.label}...`;
      this.renderFrame();
    }

    let model: THREE.Object3D;
    try {
      const created = entry.create();
      model = created instanceof Promise ? await created : created;
    } catch (err) {
      if (reqSeq === this.loadRequestSeq && this.statsElement) {
        const msg = err instanceof Error ? err.message : String(err);
        this.statsElement.textContent = `Failed to load ${entry.label}: ${msg}`;
      }
      return;
    }

    // If user clicked another model or closed/disposed the panel while loading, unload immediately
    if (reqSeq !== this.loadRequestSeq || !this.scene) {
      this.disposeModel(model);
      return;
    }

    this.currentModel = model;
    if (this.wireframeEnabled) {
      this.applyWireframeToModel(model, true);
    }

    // Frame model automatically from bounding box
    const box = new THREE.Box3().setFromObject(model);
    if (!box.isEmpty()) {
      const center = new THREE.Vector3();
      const size = new THREE.Vector3();
      box.getCenter(center);
      box.getSize(size);
      model.position.x -= center.x;
      model.position.z -= center.z;
      model.position.y -= box.min.y;

      const maxDim = Math.max(0.35, size.x, size.y, size.z);
      this.cameraTarget.set(0, size.y * 0.45, 0);
      this.orbitDistance = Math.max(0.9, maxDim * 2.15);
      this.minDistance = Math.max(0.3, maxDim * 0.55);
      this.maxDistance = Math.max(6.0, maxDim * 7.5);
    } else {
      this.cameraTarget.set(0, 0.25, 0);
      this.orbitDistance = 2.4;
    }

    this.scene.add(model);
    this.updateCameraTransform();

    this.activeAnimController = resolveAnimationController(model);
    if (this.activeAnimController && this.activeAnimController.names.length > 0) {
      this.activeAnimController.setLoop?.(this.loopEnabled);
      this.selectedAnimation = this.activeAnimController.names[0];
      this.activeAnimController.play(this.selectedAnimation);
    } else {
      this.selectedAnimation = 'none';
    }
    this.rebuildAnimationPanel();

    if (this.statsElement) {
      const tris = countObjectTriangles(model);
      this.statsElement.textContent = `${entry.label} • ${entry.category} • ~${tris.toLocaleString()} tris (Drag to rotate • Scroll to zoom)`;
    }
    this.renderFrame();
  }

  public orbitBy(deltaX: number, deltaY: number): void {
    this.orbitYaw -= deltaX * 0.008;
    this.orbitPitch = Math.max(
      -Math.PI * 0.15,
      Math.min(Math.PI * 0.47, this.orbitPitch + deltaY * 0.008)
    );
    this.updateCameraTransform();
  }

  public zoomBy(deltaY: number): void {
    const factor = deltaY > 0 ? 1.12 : 0.89;
    this.orbitDistance = Math.max(
      this.minDistance,
      Math.min(this.maxDistance, this.orbitDistance * factor)
    );
    this.updateCameraTransform();
  }

  private updateCameraTransform(): void {
    if (!this.camera) return;
    const cosP = Math.cos(this.orbitPitch);
    const x = this.cameraTarget.x + this.orbitDistance * cosP * Math.cos(this.orbitYaw);
    const y = this.cameraTarget.y + this.orbitDistance * Math.sin(this.orbitPitch);
    const z = this.cameraTarget.z + this.orbitDistance * cosP * Math.sin(this.orbitYaw);
    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.cameraTarget);
  }

  private buildDom(): void {
    const parent =
      this.hostContainer ??
      (typeof document.getElementById === 'function' ? document.getElementById('game') : null) ??
      document.body;

    const root = document.createElement('div');
    root.id = 'model-explorer-panel';
    root.style.position = 'fixed';
    root.style.inset = '24px';
    root.style.zIndex = '200';
    root.style.display = 'none';
    root.style.flexDirection = 'column';
    root.style.background = 'rgba(13, 18, 26, 0.96)';
    root.style.border = '2px solid #7e6840';
    root.style.borderRadius = '8px';
    root.style.boxShadow = '0 18px 48px rgba(0,0,0,0.75)';
    root.style.color = '#e8eef5';
    root.style.fontFamily = 'sans-serif';
    root.style.overflow = 'hidden';

    // Stop clicks/wheel from reaching the map canvas below
    root.addEventListener('pointerdown', (e) => e.stopPropagation());
    root.addEventListener('wheel', (e) => e.stopPropagation());

    // Header bar
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.justifyContent = 'space-between';
    header.style.padding = '10px 16px';
    header.style.background = 'rgba(24, 32, 44, 0.95)';
    header.style.borderBottom = '1px solid #4c4230';

    const titleWrap = document.createElement('div');
    const title = document.createElement('div');
    title.textContent = '3D Model Explorer';
    title.style.fontSize = '18px';
    title.style.fontWeight = 'bold';
    title.style.color = '#f6dc99';

    const stats = document.createElement('div');
    stats.style.fontSize = '12px';
    stats.style.color = '#9db2c9';
    stats.style.marginTop = '2px';
    this.statsElement = stats;
    titleWrap.appendChild(title);
    titleWrap.appendChild(stats);

    const headerActions = document.createElement('div');
    headerActions.style.display = 'flex';
    headerActions.style.alignItems = 'center';
    headerActions.style.gap = '8px';

    const wireframeBtn = document.createElement('button');
    wireframeBtn.textContent = this.wireframeEnabled ? 'Wireframe: On' : 'Wireframe: Off';
    wireframeBtn.style.padding = '6px 12px';
    wireframeBtn.style.background = this.wireframeEnabled
      ? 'rgba(218, 176, 86, 0.28)'
      : 'rgba(28, 38, 52, 0.9)';
    wireframeBtn.style.color = this.wireframeEnabled ? '#ffebaa' : '#dce6f2';
    wireframeBtn.style.border = this.wireframeEnabled ? '1px solid #e4be66' : '1px solid #4f6278';
    wireframeBtn.style.borderRadius = '4px';
    wireframeBtn.style.cursor = 'pointer';
    wireframeBtn.style.fontWeight = 'bold';
    wireframeBtn.addEventListener('click', () => this.toggleWireframe());
    this.wireframeButton = wireframeBtn;

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.padding = '6px 16px';
    closeBtn.style.background = '#5a2424';
    closeBtn.style.color = '#ffecec';
    closeBtn.style.border = '1px solid #9c5252';
    closeBtn.style.borderRadius = '4px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.fontWeight = 'bold';
    closeBtn.addEventListener('click', () => this.hide());
    this.closeButton = closeBtn;

    headerActions.appendChild(wireframeBtn);
    headerActions.appendChild(closeBtn);
    header.appendChild(titleWrap);
    header.appendChild(headerActions);

    // Body: Left catalog list + Right 3D viewport
    const body = document.createElement('div');
    body.style.display = 'flex';
    body.style.flex = '1';
    body.style.minHeight = '0';

    const sidebar = document.createElement('div');
    sidebar.style.width = '280px';
    sidebar.style.overflowY = 'auto';
    sidebar.style.padding = '10px';
    sidebar.style.borderRight = '1px solid #354252';
    sidebar.style.background = 'rgba(10, 14, 20, 0.85)';

    let lastCat = '';
    for (const entry of this.entries) {
      if (entry.category !== lastCat) {
        lastCat = entry.category;
        const catHeader = document.createElement('div');
        catHeader.textContent = entry.category;
        catHeader.style.fontSize = '11px';
        catHeader.style.textTransform = 'uppercase';
        catHeader.style.letterSpacing = '0.08em';
        catHeader.style.color = '#d8b467';
        catHeader.style.margin = '10px 4px 6px';
        sidebar.appendChild(catHeader);
      }
      const btn = document.createElement('button');
      btn.textContent = entry.label;
      btn.style.display = 'block';
      btn.style.width = '100%';
      btn.style.textAlign = 'left';
      btn.style.padding = '7px 10px';
      btn.style.marginBottom = '4px';
      btn.style.background = 'rgba(20, 28, 38, 0.72)';
      btn.style.color = '#dce6f2';
      btn.style.border = '1px solid #3d4c5d';
      btn.style.borderRadius = '4px';
      btn.style.cursor = 'pointer';
      btn.style.fontSize = '13px';
      btn.addEventListener('click', () => this.selectModel(entry.id));
      this.listButtons.set(entry.id, btn);
      sidebar.appendChild(btn);
    }

    const viewport = document.createElement('div');
    viewport.style.flex = '1';
    viewport.style.position = 'relative';
    viewport.style.background = 'radial-gradient(circle at 50% 45%, #202c3c 0%, #0d131c 100%)';
    viewport.style.cursor = 'grab';
    this.viewportElement = viewport;

    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    viewport.appendChild(canvas);

    // Mouse orbit & zoom controls
    viewport.addEventListener('pointerdown', (e) => {
      this.isDragging = true;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
      viewport.style.cursor = 'grabbing';
    });
    viewport.addEventListener('pointermove', (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.lastPointerX;
      const dy = e.clientY - this.lastPointerY;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
      this.orbitBy(dx, dy);
    });
    const endDrag = () => {
      this.isDragging = false;
      viewport.style.cursor = 'grab';
    };
    viewport.addEventListener('pointerup', endDrag);
    viewport.addEventListener('pointerleave', endDrag);
    viewport.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.zoomBy(e.deltaY);
      },
      { passive: false }
    );

    // Right-side Animation selector panel
    const animSidebar = document.createElement('div');
    animSidebar.style.width = '230px';
    animSidebar.style.overflowY = 'auto';
    animSidebar.style.padding = '10px';
    animSidebar.style.borderLeft = '1px solid #354252';
    animSidebar.style.background = 'rgba(10, 14, 20, 0.85)';

    const animHeader = document.createElement('div');
    animHeader.textContent = 'Animations';
    animHeader.style.fontSize = '11px';
    animHeader.style.textTransform = 'uppercase';
    animHeader.style.letterSpacing = '0.08em';
    animHeader.style.color = '#d8b467';
    animHeader.style.margin = '4px 4px 8px';
    animSidebar.appendChild(animHeader);

    const animList = document.createElement('div');
    this.animListElement = animList;
    animSidebar.appendChild(animList);
    this.rebuildAnimationPanel();

    body.appendChild(sidebar);
    body.appendChild(viewport);
    body.appendChild(animSidebar);
    root.appendChild(header);
    root.appendChild(body);
    parent.appendChild(root);
    this.rootElement = root;

    if (this.options.cursorTexture) {
      const cursorCanvas = document.createElement('canvas');
      cursorCanvas.id = 'model-explorer-soft-cursor';
      cursorCanvas.style.position = 'fixed';
      cursorCanvas.style.top = '0';
      cursorCanvas.style.left = '0';
      cursorCanvas.style.zIndex = '300';
      cursorCanvas.style.pointerEvents = 'none';
      cursorCanvas.style.display = 'none';
      const frame = this.options.cursorTexture.frame;
      const resource = (
        this.options.cursorTexture.source as { resource?: CanvasImageSource } | undefined
      )?.resource;
      if (
        frame &&
        resource &&
        frame.width > 0 &&
        frame.height > 0 &&
        typeof cursorCanvas.getContext === 'function'
      ) {
        const ctx = cursorCanvas.getContext('2d');
        if (ctx) {
          cursorCanvas.width = frame.width;
          cursorCanvas.height = frame.height;
          ctx.drawImage(
            resource,
            frame.x,
            frame.y,
            frame.width,
            frame.height,
            0,
            0,
            frame.width,
            frame.height
          );
        }
      }
      parent.appendChild(cursorCanvas);
      this.cursorElement = cursorCanvas;
    }

    this.initThreeViewport(canvas);

    this.boundKeyDown = (e: KeyboardEvent) => {
      if (this.visible && e.key === 'Escape') {
        e.stopPropagation();
        this.hide();
      }
    };
    window.addEventListener('keydown', this.boundKeyDown);

    this.boundResize = () => {
      if (this.visible) this.handleResize();
    };
    window.addEventListener('resize', this.boundResize);
  }

  private initThreeViewport(canvas: HTMLCanvasElement): void {
    const scene = new THREE.Scene();
    this.scene = scene;

    const ambient = new THREE.AmbientLight(0xffffff, 0.35);
    const hemi = new THREE.HemisphereLight(0x9ab8ea, 0x3b3228, 0.45);
    const dir = new THREE.DirectionalLight(0xffe8c2, 2.2);
    dir.position.set(-5, 8, -4);
    const fill = new THREE.DirectionalLight(0x9ec0ff, 0.55);
    fill.position.set(5, 4, 6);
    const grid = new THREE.GridHelper(4, 16, 0x4c627a, 0x263242);
    grid.position.y = -0.002;

    scene.add(ambient, hemi, dir, fill, grid);

    this.camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.05, 100);
    this.updateCameraTransform();

    try {
      const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      this.renderer = renderer;
    } catch {
      this.renderer = {
        setSize: () => {},
        render: () => {},
        dispose: () => {},
      } as any;
    }
  }

  private handleResize(): void {
    if (!this.viewportElement || !this.camera || !this.renderer) return;
    const w = Math.max(1, this.viewportElement.clientWidth || 800);
    const h = Math.max(1, this.viewportElement.clientHeight || 600);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  private renderFrame(): void {
    if (!this.renderer || !this.scene || !this.camera) return;
    this.renderer.render(this.scene, this.camera);
  }

  private startRenderLoop(): void {
    if (this.rafId !== null || typeof requestAnimationFrame === 'undefined') return;
    let lastTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const tick = (now?: number) => {
      if (!this.visible) {
        this.rafId = null;
        return;
      }
      const curr = typeof now === 'number' ? now : Date.now();
      const dt = Math.min(0.1, Math.max(0, (curr - lastTime) / 1000));
      lastTime = curr;
      if (this.selectedAnimation !== 'none') {
        if (this.activeAnimController) {
          if (this.selectedAnimation === 'random') {
            this.randomAnimTimer -= dt;
            if (this.randomAnimTimer <= 0) {
              this.playRandomAnimation();
            }
          }
          this.activeAnimController.update(dt);
        } else if (
          this.currentModel &&
          typeof this.currentModel.userData.updateAnimation === 'function'
        ) {
          (this.currentModel.userData.updateAnimation as (delta: number) => void)(dt);
        }
      }
      this.renderFrame();
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private stopRenderLoop(): void {
    if (this.rafId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private disposeModel(obj: THREE.Object3D): void {
    obj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (!child.geometry?.userData?.isSharedAsset) {
          child.geometry?.dispose();
        }
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        for (const m of mats) {
          if (m && !m.userData?.isSharedAsset && !m.userData?.isOverviewWheatMaterial) {
            const texKeys = [
              'map',
              'bumpMap',
              'roughnessMap',
              'normalMap',
              'emissiveMap',
              'alphaMap',
              'aoMap',
              'metalnessMap',
              'specularMap',
            ] as const;
            for (const key of texKeys) {
              const tex = (m as any)[key] as THREE.Texture | null | undefined;
              if (tex && !tex.userData?.isSharedAsset) {
                tex.dispose();
              }
            }
            m.dispose();
          }
        }
      }
    });
  }

  public dispose(): void {
    this.loadRequestSeq++;
    this.hide();
    if (this.boundKeyDown) {
      window.removeEventListener('keydown', this.boundKeyDown);
      this.boundKeyDown = undefined;
    }
    if (this.boundResize) {
      window.removeEventListener('resize', this.boundResize);
      this.boundResize = undefined;
    }
    if (this.boundTrackPointer) {
      window.removeEventListener('pointermove', this.boundTrackPointer);
      this.boundTrackPointer = undefined;
    }
    this.unloadCurrentModel();
    this.renderer?.dispose();
    this.renderer = null;
    this.scene?.clear();
    this.scene = null;
    this.camera = null;
    this.listButtons.clear();
    this.animButtons.clear();
    this.animListElement = null;
    if (this.cursorElement?.parentElement) {
      this.cursorElement.parentElement.removeChild(this.cursorElement);
    }
    this.cursorElement = null;
    if (this.rootElement?.parentElement) {
      this.rootElement.parentElement.removeChild(this.rootElement);
    }
    this.rootElement = null;
  }
}

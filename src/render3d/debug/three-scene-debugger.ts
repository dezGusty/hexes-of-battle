import * as THREE from 'three';
import GUI from 'lil-gui';
import { ThreeSceneManager } from '../three-scene-manager';
import { BattleView3D } from '../battle-view-3d';

export interface SceneDebuggerOptions {
  autoOpen?: boolean;
  hotkey?: string; // e.g. 'F2' or '`'
  onToggle?: (visible: boolean) => void;
}

export class ThreeSceneDebugger {
  public readonly gui: GUI;
  private sceneManager: ThreeSceneManager;
  private battleView: BattleView3D;
  private options?: SceneDebuggerOptions;

  // Selection & Highlighting
  private selectedObject: THREE.Object3D | null = null;
  private highlightHelper: THREE.BoxHelper | null = null;
  private highlightColor: string = '#ffff00';
  private autoHighlightOnChange: boolean = true;

  // Scene Helpers
  private axesHelper: THREE.AxesHelper | null = null;
  private gridHelper: THREE.GridHelper | null = null;
  private lightHelper: THREE.DirectionalLightHelper | null = null;

  // Object mapping for dropdown
  private entityMap: Map<string, THREE.Object3D> = new Map();
  private entityDropdownController: any = null;

  // GUI Folders
  private inspectorFolder!: GUI;
  private selectedObjectFolder!: GUI;
  private cameraFolder!: GUI;
  private lightingFolder!: GUI;
  private commandsFolder!: GUI;
  private statsFolder!: GUI;

  private boundKeyDown?: (e: KeyboardEvent) => void;
  private boundPointerDownInspect?: (e: MouseEvent) => void;
  private autoRefreshTimer: number = 0;

  // State objects for lil-gui bindings
  private inspectorState = {
    selectedEntityKey: '(None)',
    highlightColor: '#ffff00',
    autoHighlight: true,
    liveTracking: true,
    trackCamera: false,
    autoRefresh: false,
    freezePreviews: false,
    clickToInspect: false,
    filterCategory: 'All',
  };

  private cameraState = {
    distance: 18,
    yaw: 0,
    pitch: Math.PI / 6,
  };

  private lightingState = {
    dirIntensity: 1.2,
    dirColor: '#fff5e6',
    ambientIntensity: 0.65,
    ambientColor: '#ffffff',
    hemiIntensity: 0.45,
    hemiSkyColor: '#ddeeff',
    hemiGroundColor: '#223322',
    fogDensity: 0.018,
    fogColor: '#0f1c26',
    showAxes: false,
    showGrid: false,
    showLightHelper: false,
  };

  private statsState = {
    totalObjects: 0,
    totalMeshes: 0,
    totalLights: 0,
    activeSquads: 0,
  };

  constructor(
    sceneManager: ThreeSceneManager,
    battleView: BattleView3D,
    options?: SceneDebuggerOptions
  ) {
    this.sceneManager = sceneManager;
    this.battleView = battleView;
    this.options = options;

    if (typeof document === 'undefined') {
      const createMockStyle = (): any => ({
        setProperty: () => {},
        getPropertyValue: () => '',
        removeProperty: () => '',
      });
      const createMockEl = (): any => {
        const el: any = {
          style: createMockStyle(),
          classList: { add: () => {}, remove: () => {}, contains: () => false, toggle: () => false },
          appendChild: (c: any) => c,
          removeChild: (c: any) => c,
          replaceChildren: () => {},
          insertBefore: (c: any) => c,
          remove: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          setAttribute: () => {},
          getAttribute: () => '',
          hasAttribute: () => false,
          removeAttribute: () => {},
          toggleAttribute: () => false,
          querySelector: () => null,
          querySelectorAll: () => [],
          children: [],
          innerHTML: '',
          innerText: '',
          textContent: '',
          getContext: () => null,
        };
        return el;
      };
      (globalThis as any).document = {
        createElement: () => createMockEl(),
        head: createMockEl(),
        body: createMockEl(),
        querySelector: () => null,
        querySelectorAll: () => [],
      };
      if (typeof window === 'undefined') {
        (globalThis as any).window = {
          addEventListener: () => {},
          removeEventListener: () => {},
          matchMedia: () => ({ matches: false, addListener: () => {}, removeListener: () => {} }),
        };
      } else if (!(window as any).matchMedia) {
        (window as any).matchMedia = () => ({ matches: false, addListener: () => {}, removeListener: () => {} });
      }

      if (typeof globalThis.requestAnimationFrame === 'undefined') {
        globalThis.requestAnimationFrame = (cb: any) => setTimeout(cb, 16) as any;
        globalThis.cancelAnimationFrame = (id: any) => clearTimeout(id);
      }
    }

    this.gui = new GUI({ title: '🛠️ 3D Scene Inspector', width: 320 });
    if (this.gui.domElement) {
      this.gui.domElement.style.zIndex = '9999';
    }

    if (options?.autoOpen === false || (!options?.autoOpen && options?.autoOpen !== true)) {
      this.gui.hide();
    } else if (options?.autoOpen === true) {
      this.gui.show();
    }

    this.setupInspectorFolder();
    this.setupCameraFolder();
    this.setupLightingFolder();
    this.setupCommandsFolder();
    this.setupStatsFolder();
    this.setupKeybindings(options?.hotkey ?? 'F2');

    // Setup Click-To-Inspect Raycast Picker
    if (typeof window !== 'undefined') {
      this.boundPointerDownInspect = (e: MouseEvent) => {
        if (!this.inspectorState.clickToInspect) return;
        const domEl = (this.sceneManager.renderer as any)?.domElement;
        if (domEl && e.target !== domEl) return;

        const hits = this.sceneManager.raycastFromScreen(e.clientX, e.clientY, [this.sceneManager.scene]);
        if (hits.length > 0) {
          const hit = hits.find((h) => !h.object.name.startsWith('__Debug'))?.object;
          if (hit) {
            this.selectObject(hit);
            this.refreshEntityList(true);
          }
        }
      };
      window.addEventListener('pointerdown', this.boundPointerDownInspect);
    }

    // Initial population
    this.refreshEntityList();
    this.updateStats();
  }

  private setupInspectorFolder(): void {
    this.inspectorFolder = this.gui.addFolder('🔍 Entity Inspector');

    // Category filter
    this.inspectorFolder
      .add(this.inspectorState, 'filterCategory', [
        'All',
        'Tactical & Path Previews',
        'Squads / Units',
        'Hex Board',
        'Lights',
        'Meshes',
      ])
      .name('Category')
      .onChange(() => {
        this.refreshEntityList();
      });

    // Dropdown for selecting an object
    this.entityDropdownController = this.inspectorFolder
      .add(this.inspectorState, 'selectedEntityKey', ['(None)'])
      .name('Entity')
      .onChange((key: string) => {
        const obj = this.entityMap.get(key) || null;
        this.selectObject(obj);
      });

    const refreshAction = {
      refresh: () => {
        this.refreshEntityList();
        this.updateStats();
      },
    };
    this.inspectorFolder.add(refreshAction, 'refresh').name('🔄 Refresh Entity List');

    // Live Tracking & Auto-Refresh Controls
    this.inspectorFolder
      .add(this.inspectorState, 'autoRefresh')
      .name('⚡ Auto-Refresh List (Live)')
      .onChange((val: boolean) => {
        if (val) {
          this.refreshEntityList(true);
        }
      });

    this.inspectorFolder
      .add(this.inspectorState, 'liveTracking')
      .name('📡 Live Track & Highlight');

    this.inspectorFolder
      .add(this.inspectorState, 'freezePreviews')
      .name('📌 Freeze / Pin Previews')
      .onChange((val: boolean) => {
        const hexBoard = (this.battleView as any).hexBoard;
        if (hexBoard) {
          hexBoard.freezePreviews = val;
        }
      });

    this.inspectorFolder
      .add(this.inspectorState, 'clickToInspect')
      .name('🎯 Click 3D Map to Inspect');

    this.inspectorFolder
      .add(this.inspectorState, 'trackCamera')
      .name('🎥 Follow Target (Camera)');

    this.inspectorFolder
      .addColor(this.inspectorState, 'highlightColor')
      .name('Highlight Color')
      .onChange((color: string) => {
        this.highlightColor = color;
        if (this.highlightHelper && this.selectedObject) {
          this.highlightObject(this.selectedObject);
        }
      });

    this.inspectorFolder
      .add(this.inspectorState, 'autoHighlight')
      .name('Auto Highlight')
      .onChange((val: boolean) => {
        this.autoHighlightOnChange = val;
        if (!val) {
          this.clearHighlight();
        } else if (this.selectedObject) {
          this.highlightObject(this.selectedObject);
        }
      });

    const actionsFolder = this.inspectorFolder.addFolder('Actions');
    const actions = {
      focus: () => {
        if (this.selectedObject) {
          this.focusCameraOnObject(this.selectedObject);
        }
      },
      highlight: () => {
        if (this.selectedObject) {
          this.highlightObject(this.selectedObject);
        }
      },
      clear: () => {
        this.clearHighlight();
      },
      wireframe: () => {
        if (this.selectedObject) {
          this.toggleWireframe(this.selectedObject);
        }
      },
      log: () => {
        if (this.selectedObject) {
          console.log('Selected Three.js Entity:', this.selectedObject);
        }
      },
    };

    actionsFolder.add(actions, 'focus').name('🎯 Focus Camera on Entity');
    actionsFolder.add(actions, 'highlight').name('✨ Highlight Entity');
    actionsFolder.add(actions, 'clear').name('🚫 Clear Highlight');
    actionsFolder.add(actions, 'wireframe').name('🕸️ Toggle Wireframe');
    actionsFolder.add(actions, 'log').name('📋 Log to Console');

    // Subfolder dynamically showing properties of the selected object
    this.selectedObjectFolder = this.inspectorFolder.addFolder('Object Properties');
    this.selectedObjectFolder.close();
  }

  private setupCameraFolder(): void {
    this.cameraFolder = this.gui.addFolder('🎥 Camera Controls');
    this.cameraFolder.close();

    const config = this.sceneManager.getCameraConfig();

    this.cameraFolder
      .add(this.sceneManager.camera, 'fov', 20, 90, 1)
      .name('FOV')
      .onChange(() => {
        this.sceneManager.camera.updateProjectionMatrix();
      });

    this.cameraFolder
      .add(this.cameraState, 'distance', config.minDistance, config.maxDistance, 0.5)
      .name('Distance')
      .listen()
      .onChange((val: number) => {
        this.sceneManager.setCameraDistance(val);
      });

    this.cameraFolder
      .add(this.cameraState, 'pitch', config.minPitch, config.maxPitch, 0.02)
      .name('Pitch')
      .listen()
      .onChange((val: number) => {
        this.sceneManager.setCameraPitch(val);
      });

    this.cameraFolder
      .add(this.cameraState, 'yaw', -Math.PI, Math.PI, 0.05)
      .name('Yaw')
      .listen()
      .onChange((val: number) => {
        this.sceneManager.setCameraYaw(val);
      });

    const camActions = {
      reset: () => {
        this.sceneManager.resetCamera();
        this.syncCameraState();
      },
      center: () => {
        this.sceneManager.setCameraTarget(new THREE.Vector3(0, 0, 0));
        this.syncCameraState();
      },
      focusActive: () => {
        const active = this.battleView.battle.getActiveCreature();
        if (active) {
          const squad = this.battleView.squadVisuals.get(active.GUID.toString());
          if (squad) {
            this.focusCameraOnObject(squad.rootGroup);
          }
        }
      },
    };

    this.cameraFolder.add(camActions, 'reset').name('🔄 Reset Camera');
    this.cameraFolder.add(camActions, 'center').name('📍 Focus Arena Center');
    this.cameraFolder.add(camActions, 'focusActive').name('👤 Focus Active Creature');
  }

  private setupLightingFolder(): void {
    this.lightingFolder = this.gui.addFolder('💡 Lighting & Environment');
    this.lightingFolder.close();

    const dirLight = this.sceneManager.getDirLight();
    const ambientLight = this.sceneManager.getAmbientLight();
    const hemiLight = this.sceneManager.getHemiLight();

    if (dirLight) {
      const sunFolder = this.lightingFolder.addFolder('Sun / Directional');
      sunFolder.add(dirLight, 'intensity', 0, 3, 0.05).name('Intensity');
      sunFolder
        .addColor(this.lightingState, 'dirColor')
        .name('Color')
        .onChange((c: string) => dirLight.color.set(c));

      sunFolder.add(dirLight.position, 'x', -40, 40, 1).name('Pos X');
      sunFolder.add(dirLight.position, 'y', 0, 50, 1).name('Pos Y');
      sunFolder.add(dirLight.position, 'z', -40, 40, 1).name('Pos Z');
      sunFolder.add(dirLight, 'castShadow').name('Cast Shadows');
    }

    if (ambientLight) {
      const ambFolder = this.lightingFolder.addFolder('Ambient');
      ambFolder.add(ambientLight, 'intensity', 0, 2, 0.05).name('Intensity');
      ambFolder
        .addColor(this.lightingState, 'ambientColor')
        .name('Color')
        .onChange((c: string) => ambientLight.color.set(c));
    }

    if (hemiLight) {
      const hemiFolder = this.lightingFolder.addFolder('Hemisphere');
      hemiFolder.add(hemiLight, 'intensity', 0, 2, 0.05).name('Intensity');
      hemiFolder
        .addColor(this.lightingState, 'hemiSkyColor')
        .name('Sky Color')
        .onChange((c: string) => hemiLight.color.set(c));
      hemiFolder
        .addColor(this.lightingState, 'hemiGroundColor')
        .name('Ground Color')
        .onChange((c: string) => hemiLight.groundColor.set(c));
    }

    if (this.sceneManager.scene.fog && this.sceneManager.scene.fog instanceof THREE.FogExp2) {
      const fog = this.sceneManager.scene.fog;
      const fogFolder = this.lightingFolder.addFolder('Fog');
      fogFolder.add(fog, 'density', 0, 0.08, 0.001).name('Density');
      fogFolder
        .addColor(this.lightingState, 'fogColor')
        .name('Color')
        .onChange((c: string) => fog.color.set(c));
    }

    const helpersFolder = this.lightingFolder.addFolder('Visual Helpers');
    helpersFolder
      .add(this.lightingState, 'showAxes')
      .name('Axes Helper')
      .onChange((val: boolean) => {
        if (val) {
          if (!this.axesHelper) {
            this.axesHelper = new THREE.AxesHelper(5);
            this.axesHelper.name = '__DebugAxesHelper';
            this.sceneManager.scene.add(this.axesHelper);
          }
        } else if (this.axesHelper) {
          this.sceneManager.scene.remove(this.axesHelper);
          this.axesHelper.dispose();
          this.axesHelper = null;
        }
      });

    helpersFolder
      .add(this.lightingState, 'showGrid')
      .name('3D Plane Grid')
      .onChange((val: boolean) => {
        if (val) {
          if (!this.gridHelper) {
            this.gridHelper = new THREE.GridHelper(30, 30, 0x00ffff, 0x444444);
            this.gridHelper.name = '__DebugGridHelper';
            this.gridHelper.position.y = 0.02;
            this.sceneManager.scene.add(this.gridHelper);
          }
        } else if (this.gridHelper) {
          this.sceneManager.scene.remove(this.gridHelper);
          this.gridHelper.dispose();
          this.gridHelper = null;
        }
      });

    helpersFolder
      .add(this.lightingState, 'showLightHelper')
      .name('Directional Light Helper')
      .onChange((val: boolean) => {
        if (val && dirLight) {
          if (!this.lightHelper) {
            this.lightHelper = new THREE.DirectionalLightHelper(dirLight, 3);
            this.lightHelper.name = '__DebugLightHelper';
            this.sceneManager.scene.add(this.lightHelper);
          }
        } else if (this.lightHelper) {
          this.sceneManager.scene.remove(this.lightHelper);
          this.lightHelper.dispose();
          this.lightHelper = null;
        }
      });
  }

  private setupCommandsFolder(): void {
    this.commandsFolder = this.gui.addFolder('⚡ Battle Commands & Cheats');
    this.commandsFolder.close();

    const commands = {
      nextTurn: () => {
        this.battleView.battle.nextTurn();
      },
      nextUnit: () => {
        this.battleView.battle.selectNextUnitAndGetIndex();
      },
      restUnit: () => {
        const active = this.battleView.battle.getActiveCreature();
        if (active) {
          this.battleView.battle.restActiveCreature();
        }
      },
      killActive: () => {
        const active = this.battleView.battle.getActiveCreature();
        if (active) {
          active.stats.remaining_health = 0;
        }
      },
      deal15Dmg: () => {
        const active = this.battleView.battle.getActiveCreature();
        if (active) {
          active.stats.remaining_health = Math.max(0, active.stats.remaining_health - 15);
        }
      },
      heal20: () => {
        const active = this.battleView.battle.getActiveCreature();
        if (active) {
          active.stats.remaining_health = Math.min(active.stats.health, active.stats.remaining_health + 20);
        }
      },
      toggleGrid: () => {
        const cur = (this.battleView as any).hexBoard;
        if (cur) {
          const isGridVisible = (cur as any).showGrid ?? true;
          this.battleView.setGridVisible(!isGridVisible);
        }
      },
      toggleCoords: () => {
        const cur = (this.battleView as any).hexBoard;
        if (cur) {
          const isCoordsVisible = (cur as any).showCoords ?? true;
          this.battleView.setCoordsVisible(!isCoordsVisible);
        }
      },
    };

    this.commandsFolder.add(commands, 'nextTurn').name('⏭️ End / Next Turn');
    this.commandsFolder.add(commands, 'nextUnit').name('⏭️ Select Next Unit');
    this.commandsFolder.add(commands, 'restUnit').name('💤 Rest Active Unit');
    this.commandsFolder.add(commands, 'killActive').name('💀 Kill Active Creature');
    this.commandsFolder.add(commands, 'deal15Dmg').name('💥 Deal 15 Damage to Active');
    this.commandsFolder.add(commands, 'heal20').name('💚 Heal Active (+20 HP)');
    this.commandsFolder.add(commands, 'toggleGrid').name('🌐 Toggle Hex Grid Lines');
    this.commandsFolder.add(commands, 'toggleCoords').name('🔢 Toggle Hex Coordinates');
  }

  private setupStatsFolder(): void {
    this.statsFolder = this.gui.addFolder('📊 Scene Statistics');
    this.statsFolder.close();

    this.statsFolder.add(this.statsState, 'totalObjects').name('Total Objects').listen().disable();
    this.statsFolder.add(this.statsState, 'totalMeshes').name('Total Meshes').listen().disable();
    this.statsFolder.add(this.statsState, 'totalLights').name('Total Lights').listen().disable();
    this.statsFolder.add(this.statsState, 'activeSquads').name('Active Squads').listen().disable();

    const statsAction = {
      refresh: () => {
        this.updateStats();
      },
    };
    this.statsFolder.add(statsAction, 'refresh').name('🔄 Refresh Stats');
  }

  private setupKeybindings(hotkey: string): void {
    this.boundKeyDown = (e: KeyboardEvent) => {
      // Toggle GUI with hotkey (default F2 or `)
      if (e.key === hotkey || (hotkey === '`' && e.key === 'Backquote')) {
        e.preventDefault();
        this.toggle();
      }
    };
    window.addEventListener('keydown', this.boundKeyDown);
  }

  public toggle(): void {
    if (this.gui._hidden) {
      this.gui.show();
    } else {
      this.gui.hide();
    }
    this.options?.onToggle?.(this.isVisible());
  }

  public isVisible(): boolean {
    return !this.gui._hidden;
  }

  public setVisible(visible: boolean): void {
    if (visible) {
      this.gui.show();
    } else {
      this.gui.hide();
    }
    this.options?.onToggle?.(this.isVisible());
  }

  public refreshEntityList(preserveSelection: boolean = false): void {
    const prevKey = this.inspectorState.selectedEntityKey;
    const prevObj = this.selectedObject;
    this.entityMap.clear();
    const names: string[] = ['(None)'];
    const category = this.inspectorState.filterCategory;

    const traverseScene = (root: THREE.Object3D) => {
      root.traverse((obj) => {
        // Skip internal debug helpers
        if (
          obj === this.highlightHelper ||
          obj === this.axesHelper ||
          obj === this.gridHelper ||
          obj === this.lightHelper ||
          obj.name.startsWith('__Debug')
        ) {
          return;
        }

        let include = false;
        const isSelfOrAncestor = (test: (o: THREE.Object3D) => boolean): boolean => {
          let curr: THREE.Object3D | null = obj;
          while (curr) {
            if (test(curr)) return true;
            curr = curr.parent;
          }
          return false;
        };

        if (category === 'All') {
          include = true;
        } else if (category === 'Tactical & Path Previews') {
          include = isSelfOrAncestor((o) =>
            Boolean(
              o.name &&
                (o.name.includes('Path') ||
                  o.name.includes('Waypoint') ||
                  o.name.includes('Attack') ||
                  o.name.includes('Reach') ||
                  o.name.includes('Facing') ||
                  o.name.includes('Reticle') ||
                  o.name.includes('TileHover') ||
                  o.name.includes('TileSelected'))
            )
          );
        } else if (category === 'Squads / Units') {
          include = isSelfOrAncestor((o) => Boolean(o.name && (o.name.startsWith('Squad_') || (o.parent && o.parent.name.startsWith('Squad_')))));
        } else if (category === 'Hex Board') {
          include = isSelfOrAncestor((o) =>
            Boolean(
              o.name &&
                (o.name.includes('Hex') ||
                  o.name.includes('Board') ||
                  o.name.includes('Grid') ||
                  o.name.includes('Coord') ||
                  o.name.includes('Terrain') ||
                  o.name.includes('Path') ||
                  o.name.includes('Attack') ||
                  o.name.includes('Reach'))
            )
          );
        } else if (category === 'Lights') {
          include = obj instanceof THREE.Light;
        } else if (category === 'Meshes') {
          include = obj instanceof THREE.Mesh || obj instanceof THREE.Sprite || obj instanceof THREE.Line;
        }

        if (include) {
          const readableName = this.formatObjectName(obj);
          // Ensure unique key in map
          let uniqueKey = readableName;
          let counter = 1;
          while (this.entityMap.has(uniqueKey)) {
            uniqueKey = `${readableName} (${counter++})`;
          }
          this.entityMap.set(uniqueKey, obj);
          names.push(uniqueKey);
        }
      });
    };

    traverseScene(this.sceneManager.scene);

    // Update lil-gui dropdown options
    if (this.entityDropdownController) {
      this.entityDropdownController.options(names);
      let matchedKey = '(None)';

      if (preserveSelection) {
        if (this.entityMap.has(prevKey) && this.entityMap.get(prevKey) === prevObj) {
          matchedKey = prevKey;
        } else if (prevObj) {
          const found = [...this.entityMap.entries()].find(([_, val]) => val === prevObj);
          if (found) {
            matchedKey = found[0];
          }
        }
      }

      if (matchedKey !== '(None)') {
        this.inspectorState.selectedEntityKey = matchedKey;
        this.entityDropdownController.setValue(matchedKey);
      } else if (!this.entityMap.has(this.inspectorState.selectedEntityKey)) {
        this.inspectorState.selectedEntityKey = '(None)';
        if (!preserveSelection) {
          this.selectObject(null);
        }
      }
    }
  }

  private formatObjectName(obj: THREE.Object3D): string {
    const type = obj.type || 'Object3D';
    if (obj.name && obj.name.trim().length > 0) {
      return `[${type}] ${obj.name}`;
    }
    return `[${type}] id:${obj.id}`;
  }

  public selectObject(obj: THREE.Object3D | null): void {
    this.selectedObject = obj;

    // Safely clear all direct controllers and child folders in selectedObjectFolder
    if (this.selectedObjectFolder && this.selectedObjectFolder.children) {
      const directChildren = [...this.selectedObjectFolder.children];
      directChildren.forEach((child) => {
        try {
          child.destroy();
        } catch {
          // ignore DOM already removed
        }
      });
    }

    if (!obj) {
      this.clearHighlight();
      this.selectedObjectFolder.title('Object Properties (None)');
      return;
    }

    this.selectedObjectFolder.title(`Properties: ${obj.name || obj.type}`);
    this.selectedObjectFolder.open();

    // General info
    const info = {
      type: obj.type || 'Object3D',
      id: obj.id,
      uuid: obj.uuid ? obj.uuid.slice(0, 8) : '',
      visible: Boolean(obj.visible),
    };

    try {
      this.selectedObjectFolder.add(info, 'type').name('Type').disable();
      this.selectedObjectFolder.add(info, 'id').name('ID').disable();
      this.selectedObjectFolder.add(info, 'uuid').name('UUID').disable();
      this.selectedObjectFolder
        .add(info, 'visible')
        .name('Visible')
        .onChange((v: boolean) => {
          obj.visible = v;
        });

      if (obj.position) {
        // Transform controls
        const posFolder = this.selectedObjectFolder.addFolder('Position');
        posFolder.add(obj.position, 'x').step(0.1).listen();
        posFolder.add(obj.position, 'y').step(0.1).listen();
        posFolder.add(obj.position, 'z').step(0.1).listen();
      }

      if (obj.scale) {
        const scaleFolder = this.selectedObjectFolder.addFolder('Scale');
        scaleFolder.add(obj.scale, 'x', 0.01, 10, 0.05).listen();
        scaleFolder.add(obj.scale, 'y', 0.01, 10, 0.05).listen();
        scaleFolder.add(obj.scale, 'z', 0.01, 10, 0.05).listen();
      }
    } catch {
      // safe fallback
    }

    if (this.autoHighlightOnChange) {
      this.highlightObject(obj);
    }
  }

  public highlightObject(obj: THREE.Object3D): void {
    this.clearHighlight();
    if (!obj) return;

    try {
      const colorNum = new THREE.Color(this.highlightColor).getHex();
      this.highlightHelper = new THREE.BoxHelper(obj, colorNum);
      this.highlightHelper.name = '__DebugSelectionHighlight';
      (this.highlightHelper.material as THREE.LineBasicMaterial).depthTest = false;
      (this.highlightHelper.material as THREE.LineBasicMaterial).transparent = true;
      (this.highlightHelper.material as THREE.LineBasicMaterial).opacity = 0.9;
      this.highlightHelper.renderOrder = 9999;

      this.sceneManager.scene.add(this.highlightHelper);
    } catch {
      this.clearHighlight();
    }
  }

  public clearHighlight(): void {
    if (this.highlightHelper) {
      this.sceneManager.scene.remove(this.highlightHelper);
      this.highlightHelper.dispose();
      this.highlightHelper = null;
    }
  }

  public focusCameraOnObject(obj: THREE.Object3D): void {
    const box = new THREE.Box3().setFromObject(obj);
    if (box.isEmpty()) {
      // If object has no geometry bounding box, fallback to its world position
      const worldPos = new THREE.Vector3();
      obj.getWorldPosition(worldPos);
      this.sceneManager.setCameraTarget(worldPos);
      this.syncCameraState();
      return;
    }

    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.sceneManager.camera.fov * (Math.PI / 180);
    const calculatedDistance = Math.max(
      maxDim / (2 * Math.tan(fov / 2)) * 1.5,
      this.sceneManager.getCameraConfig().minDistance
    );

    const clampedDistance = Math.min(
      calculatedDistance,
      this.sceneManager.getCameraConfig().maxDistance
    );

    this.sceneManager.setCameraTarget(center, clampedDistance);
    this.syncCameraState();
  }

  public toggleWireframe(obj: THREE.Object3D): void {
    obj.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => {
            if ('wireframe' in mat) {
              (mat as any).wireframe = !(mat as any).wireframe;
            }
          });
        } else if ('wireframe' in child.material) {
          (child.material as any).wireframe = !(child.material as any).wireframe;
        }
      }
    });
  }

  public updateStats(): void {
    let objects = 0;
    let meshes = 0;
    let lights = 0;

    this.sceneManager.scene.traverse((obj) => {
      objects++;
      if (obj instanceof THREE.Mesh) meshes++;
      if (obj instanceof THREE.Light) lights++;
    });

    this.statsState.totalObjects = objects;
    this.statsState.totalMeshes = meshes;
    this.statsState.totalLights = lights;
    this.statsState.activeSquads = this.battleView.squadVisuals.size;
  }

  private syncCameraState(): void {
    this.cameraState.distance = this.sceneManager.getCameraDistance();
    this.cameraState.yaw = this.sceneManager.getCameraYaw();
    this.cameraState.pitch = this.sceneManager.getCameraPitch();
  }

  public update(deltaMs: number): void {
    // 1. Auto-refresh entity list periodically if enabled
    if (this.inspectorState.autoRefresh && this.isVisible()) {
      this.autoRefreshTimer += deltaMs;
      if (this.autoRefreshTimer >= 600) {
        this.autoRefreshTimer = 0;
        this.refreshEntityList(true);
        this.updateStats();
      }
    }

    // 2. Real-time Live Tracking & Bounding Box update
    if (this.selectedObject) {
      if (this.highlightHelper) {
        if (
          this.selectedObject.children &&
          this.selectedObject.children.length === 0 &&
          !(this.selectedObject instanceof THREE.Mesh) &&
          !(this.selectedObject instanceof THREE.Line) &&
          !(this.selectedObject instanceof THREE.Sprite)
        ) {
          // Empty group (e.g. inactive path preview)
          this.highlightHelper.visible = false;
        } else {
          this.highlightHelper.visible = true;
          try {
            if (this.inspectorState.liveTracking) {
              this.highlightHelper.setFromObject(this.selectedObject);
            } else {
              this.highlightHelper.update();
            }
          } catch {
            // fallback
          }
        }
      } else if (this.inspectorState.autoHighlight) {
        this.highlightObject(this.selectedObject);
      }

      // Camera follow / tracking
      if (this.inspectorState.trackCamera) {
        const worldPos = new THREE.Vector3();
        this.selectedObject.getWorldPosition(worldPos);
        this.sceneManager.setCameraTarget(worldPos);
        this.syncCameraState();
      }
    }
  }

  public dispose(): void {
    this.clearHighlight();
    if (this.axesHelper) {
      this.sceneManager.scene.remove(this.axesHelper);
      this.axesHelper.dispose();
      this.axesHelper = null;
    }
    if (this.gridHelper) {
      this.sceneManager.scene.remove(this.gridHelper);
      this.gridHelper.dispose();
      this.gridHelper = null;
    }
    if (this.lightHelper) {
      this.sceneManager.scene.remove(this.lightHelper);
      this.lightHelper.dispose();
      this.lightHelper = null;
    }
    if (this.boundKeyDown && typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.boundKeyDown);
    }
    if (this.boundPointerDownInspect && typeof window !== 'undefined') {
      window.removeEventListener('pointerdown', this.boundPointerDownInspect);
    }
    this.gui.destroy();
  }
}

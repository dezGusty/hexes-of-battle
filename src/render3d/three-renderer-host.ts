import * as THREE from 'three';

/**
 * Owns a single shared WebGLRenderer and canvas element so multiple 3D scenes
 * (e.g., Battle and 3D Overview Map) can render without recreating the WebGL context.
 */
export class ThreeRendererHost {
  public readonly canvas: HTMLCanvasElement;
  public readonly renderer: THREE.WebGLRenderer;
  public readonly hasRealWebGL: boolean;

  constructor(container: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'webgl-3d-canvas';
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.zIndex = '0';
    this.canvas.style.outline = 'none';

    container.appendChild(this.canvas);

    const width = container.clientWidth || 1920;
    const height = container.clientHeight || 1080;

    let renderer: THREE.WebGLRenderer;
    let hasRealWebGL = false;

    try {
      renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      renderer.setClearColor(0x0a141d, 1.0);
      renderer.setSize(width, height, false);
      hasRealWebGL = true;
    } catch {
      // Headless or non-WebGL test environment fallback
      renderer = {
        domElement: this.canvas,
        setPixelRatio: () => {},
        setSize: () => {},
        setClearColor: () => {},
        render: () => {},
        dispose: () => {},
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
        shadowMap: { enabled: true, type: THREE.PCFShadowMap },
      } as any;
    }

    this.renderer = renderer;
    this.hasRealWebGL = hasRealWebGL;
  }

  public resize(width: number, height: number): void {
    this.renderer.setSize(width, height, false);
  }

  public dispose(): void {
    this.renderer.dispose();
    if (this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
    }
  }
}

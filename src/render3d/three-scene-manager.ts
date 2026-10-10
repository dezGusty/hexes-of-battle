import * as THREE from 'three';
import { Camera3DConfig } from './types';
import { Coords } from '../shared';

export class ThreeSceneManager {
  public readonly scene: THREE.Scene = new THREE.Scene();
  public readonly camera: THREE.PerspectiveCamera;
  public readonly renderer: THREE.WebGLRenderer;

  public readonly canvas: HTMLCanvasElement;
  private containerElement: HTMLElement;

  // Camera Orbit / Navigation parameters
  private cameraTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private cameraDistance: number = 18.0;
  private cameraYaw: number = 0; // horizontal rotation in radians
  private cameraPitch: number = Math.PI * 0.32; // ~57 degrees pitch

  private cameraConfig: Camera3DConfig = {
    fov: 40,
    near: 0.1,
    far: 200,
    initialDistance: 18.0,
    minDistance: 8.0,
    maxDistance: 32.0,
    initialPitch: Math.PI * 0.32,
    minPitch: Math.PI * 0.15,
    maxPitch: Math.PI * 0.45,
  };

  // Lighting
  private dirLight!: THREE.DirectionalLight;
  private ambientLight!: THREE.AmbientLight;
  private hemiLight!: THREE.HemisphereLight;

  // Raycasting
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouseVec: THREE.Vector2 = new THREE.Vector2();

  constructor(container: HTMLElement) {
    this.containerElement = container;
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'webgl-3d-canvas';
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.zIndex = '0';
    this.canvas.style.outline = 'none';

    this.containerElement.appendChild(this.canvas);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0x0a141d, 1.0);

    const width = this.containerElement.clientWidth || 1920;
    const height = this.containerElement.clientHeight || 1080;
    this.renderer.setSize(width, height, false);

    this.camera = new THREE.PerspectiveCamera(
      this.cameraConfig.fov,
      width / Math.max(1, height),
      this.cameraConfig.near,
      this.cameraConfig.far
    );

    this.setupLighting();
    this.setupSkyBackground();
    this.updateCameraPosition();
  }

  private setupLighting(): void {
    // Ambient light
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    this.ambientLight.name = 'AmbientLight';
    this.scene.add(this.ambientLight);

    // Hemisphere light (sky vs ground bounce)
    this.hemiLight = new THREE.HemisphereLight(0xddeeff, 0x223322, 0.45);
    this.hemiLight.name = 'HemisphereLight';
    this.scene.add(this.hemiLight);

    // Directional Sunlight with soft shadows
    this.dirLight = new THREE.DirectionalLight(0xfff5e6, 1.2);
    this.dirLight.name = 'DirectionalLight';
    this.dirLight.position.set(12, 22, 10);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 50;
    const shadowSize = 14;
    this.dirLight.shadow.camera.left = -shadowSize;
    this.dirLight.shadow.camera.right = shadowSize;
    this.dirLight.shadow.camera.top = shadowSize;
    this.dirLight.shadow.camera.bottom = -shadowSize;
    this.dirLight.shadow.bias = -0.0005;
    this.scene.add(this.dirLight);
  }

  private setupSkyBackground(): void {
    // Soft atmospheric background fog
    this.scene.fog = new THREE.FogExp2(0x0f1c26, 0.018);
  }

  public getCameraConfig(): Camera3DConfig {
    return this.cameraConfig;
  }

  public getCameraDistance(): number {
    return this.cameraDistance;
  }

  public setCameraDistance(distance: number): void {
    this.cameraDistance = Math.max(
      this.cameraConfig.minDistance,
      Math.min(this.cameraConfig.maxDistance, distance)
    );
    this.updateCameraPosition();
  }

  public getCameraYaw(): number {
    return this.cameraYaw;
  }

  public setCameraYaw(yaw: number): void {
    this.cameraYaw = yaw;
    this.updateCameraPosition();
  }

  public getCameraPitch(): number {
    return this.cameraPitch;
  }

  public setCameraPitch(pitch: number): void {
    this.cameraPitch = Math.max(
      this.cameraConfig.minPitch,
      Math.min(this.cameraConfig.maxPitch, pitch)
    );
    this.updateCameraPosition();
  }

  public getCameraTarget(): THREE.Vector3 {
    return this.cameraTarget;
  }

  public getDirLight(): THREE.DirectionalLight {
    return this.dirLight;
  }

  public getAmbientLight(): THREE.AmbientLight {
    return this.ambientLight;
  }

  public getHemiLight(): THREE.HemisphereLight {
    return this.hemiLight;
  }

  public updateCameraPosition(): void {
    // Calculate spherical coordinates relative to target
    const x = this.cameraTarget.x + this.cameraDistance * Math.sin(this.cameraPitch) * Math.sin(this.cameraYaw);
    const y = this.cameraTarget.y + this.cameraDistance * Math.cos(this.cameraPitch);
    const z = this.cameraTarget.z + this.cameraDistance * Math.sin(this.cameraPitch) * Math.cos(this.cameraYaw);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.cameraTarget);
  }

  public rotateCamera(deltaYaw: number, deltaPitch: number = 0): void {
    this.cameraYaw += deltaYaw;
    this.cameraPitch = Math.max(
      this.cameraConfig.minPitch,
      Math.min(this.cameraConfig.maxPitch, this.cameraPitch + deltaPitch)
    );
    this.updateCameraPosition();
  }

  public zoomCamera(deltaDistance: number): void {
    this.cameraDistance = Math.max(
      this.cameraConfig.minDistance,
      Math.min(this.cameraConfig.maxDistance, this.cameraDistance + deltaDistance)
    );
    this.updateCameraPosition();
  }

  public setZoomLevel(normalized: number): void {
    const base = this.cameraConfig.initialDistance;
    this.cameraDistance = Math.max(
      this.cameraConfig.minDistance,
      Math.min(this.cameraConfig.maxDistance, base / Math.max(0.1, normalized))
    );
    this.updateCameraPosition();
  }

  public panCamera(deltaX: number, deltaZ: number): void {
    // Pan relative to camera facing angle
    const cos = Math.cos(this.cameraYaw);
    const sin = Math.sin(this.cameraYaw);

    const worldDx = deltaX * cos + deltaZ * sin;
    const worldDz = -deltaX * sin + deltaZ * cos;

    this.cameraTarget.x += worldDx;
    this.cameraTarget.z += worldDz;
    this.updateCameraPosition();
  }

  public setCameraTarget(target: THREE.Vector3, distance?: number): void {
    this.cameraTarget.copy(target);
    if (distance !== undefined) {
      this.cameraDistance = distance;
    }
    this.updateCameraPosition();
  }

  public resetCamera(): void {
    this.cameraTarget.set(0, 0, 0);
    this.cameraYaw = 0;
    this.cameraPitch = this.cameraConfig.initialPitch;
    this.cameraDistance = this.cameraConfig.initialDistance;
    this.updateCameraPosition();
  }

  /**
   * Raycasts from screen coordinates (pixels) to find intersected objects.
   */
  public raycastFromScreen(
    screenX: number,
    screenY: number,
    objects: THREE.Object3D[]
  ): THREE.Intersection[] {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseVec.x = ((screenX - rect.left) / rect.width) * 2 - 1;
    this.mouseVec.y = -((screenY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouseVec, this.camera);
    return this.raycaster.intersectObjects(objects, true);
  }

  /**
   * Projects a 3D world position to 2D screen coordinates.
   */
  public projectToScreen(worldPos: THREE.Vector3): Coords {
    const vector = worldPos.clone().project(this.camera);
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: ((vector.x + 1) * 0.5) * rect.width + rect.left,
      y: ((-vector.y + 1) * 0.5) * rect.height + rect.top,
    };
  }

  public resize(width: number, height: number): void {
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.renderer.dispose();
    if (this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
    }
  }
}

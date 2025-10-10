import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { RenderingContext } from "@chameleon/core";

export class ThreeAdapter {
  name = "three";
  renderer!: THREE.WebGLRenderer;
  scene!: THREE.Scene;
  camera!: THREE.PerspectiveCamera;
  private rafId: number | null = null;
  private mixers: THREE.AnimationMixer[] = [];

  async init(container: HTMLElement, ctx?: RenderingContext) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio || 1);
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      45,
      (container.clientWidth || window.innerWidth) / (container.clientHeight || window.innerHeight),
      0.1,
      1000
    );
    this.camera.position.set(0, 1.6, 3);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
    hemi.position.set(0, 10, 0);
    this.scene.add(hemi);

    ctx && (ctx.engineHandles = { renderer: this.renderer, scene: this.scene, camera: this.camera });
  }

  async loadResource(src: string) {
    const loader = new GLTFLoader();
    return loader.loadAsync(src);
  }

  async parseResource(raw: any) {
    return raw;
  }

  async buildScene(parsed: any, ctx?: RenderingContext) {
    if (parsed?.scene) {
      this.scene.add(parsed.scene);
      if (parsed.animations?.length) {
        const mixer = new THREE.AnimationMixer(parsed.scene);
        parsed.animations.forEach((clip: any) => mixer.clipAction(clip).play());
        this.mixers.push(mixer);
      }
      ctx && (ctx.scene = this.scene);
    }
    return ctx;
  }

  startRenderLoop(ctx: RenderingContext, onFrame: (dt: number) => void) {
    const clock = new THREE.Clock();
    const loop = () => {
      if (ctx.abortSignal && ctx.abortSignal.aborted) {
        if (this.rafId) cancelAnimationFrame(this.rafId);
        this.rafId = null;
        return;
      }
      const dt = clock.getDelta();
      this.mixers.forEach((m) => m.update(dt));
      onFrame(dt);
      this.renderer.render(this.scene, this.camera);
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stopRenderLoop() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }

  createTextureFromElement(el: any) {
    if (el instanceof HTMLVideoElement) return new (THREE as any).VideoTexture(el);
    if (el instanceof HTMLImageElement) {
      const t = new THREE.Texture(el);
      t.needsUpdate = true;
      return t;
    }
    if (el instanceof HTMLCanvasElement) return new THREE.CanvasTexture(el);
    return null;
  }

  updateVideoTexture(_v: HTMLVideoElement) {
    /* three handles auto-update */
  }

  async applyCustomShader(shader: any, ctx: RenderingContext) {
    if (!shader?.code) return;
    this.scene &&
      this.scene.traverse &&
      this.scene.traverse((child: any) => {
        if (child.isMesh) {
          const mat = new (THREE as any).ShaderMaterial({
            uniforms: shader.uniforms ?? {},
            vertexShader:
              shader.vertex || "void main(){gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);} ",
            fragmentShader: shader.code
          });
          child.material = mat;
        }
      });
  }

  dispose() {
    this.renderer.dispose();
  }
}

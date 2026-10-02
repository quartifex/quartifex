// The WebGL variant of @quartifex/volumetric, published as `@quartifex/volumetric/three`:
// screen-space light shafts for a three.js scene. Each frame: (1) an occlusion pass, the
// light's disc with the scene drawn black over it, at a fraction of the canvas size; (2) a
// radial blur of that toward the light (the shafts); (3) the scene as normal, then the
// shafts added on top, tinted by colour temperature, with dust motes that sample the shafts
// so they only glow inside the light. three.js is a peer.
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  type Camera,
  Color,
  HalfFloatType,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  PlaneGeometry,
  Points,
  Scene,
  ShaderMaterial,
  UnsignedByteType,
  Vector2,
  Vector3,
  type WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import {
  dustField,
  kelvinToRgb,
  lightAt,
  type Mote,
  moteAt,
  qualityFor,
  resolveSettings,
  type Settings,
  type VolumetricQuality,
} from "./index.js";

export type VolumetricOptions = {
  settings?: Partial<Settings>;
  quality?: VolumetricQuality;
  reducedMotion?: boolean;
  /**
   * Where the light is in the world (a sun far away, or a lamp). The shafts follow it as the
   * camera moves (with dolly, through chapters). Without it, `settings.source` places the
   * light in screen space.
   */
  sun?: [number, number, number];
  seed?: number;
};

export type Volumetric = {
  /** Draw the scene with its light shafts. Call instead of `renderer.render(scene, camera)`. */
  render(scene: Scene, camera: Camera, seconds?: number): void;
  setSize(width: number, height: number): void;
  update(settings: Partial<Settings>): void;
  setQuality(quality: VolumetricQuality): void;
  setReducedMotion(on: boolean): void;
  setSun(sun: [number, number, number] | null): void;
  dispose(): void;
};

const VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const DISC = /* glsl */ `
uniform vec2 lightPos;
uniform float aspect;
uniform float radius;
varying vec2 vUv;
void main() {
  vec2 d = (vUv - lightPos) * vec2(aspect, 1.0);
  float r = length(d);
  float core = smoothstep(radius, radius * 0.4, r);
  // A broad glow, like a bright sky around the sun: occluders cut shafts out of it.
  float halo = 0.55 * smoothstep(radius * 12.0, 0.0, r);
  gl_FragColor = vec4(vec3(core + halo), 1.0);
}`;

const BLUR = /* glsl */ `
uniform sampler2D tOcclusion;
uniform vec2 lightPos;
uniform float density;
uniform float decay;
uniform float weight;
uniform float exposure;
varying vec2 vUv;
void main() {
  vec2 delta = (vUv - lightPos) * density / float(SAMPLES);
  vec2 uv = vUv;
  float illumination = 1.0;
  vec3 colour = vec3(0.0);
  for (int i = 0; i < SAMPLES; i++) {
    uv -= delta;
    colour += texture2D(tOcclusion, uv).rgb * illumination * weight;
    illumination *= decay;
  }
  gl_FragColor = vec4(colour * exposure, 1.0);
}`;

const COMPOSITE = /* glsl */ `
uniform sampler2D tShafts;
uniform vec3 tint;
uniform float intensity;
varying vec2 vUv;
void main() {
  gl_FragColor = vec4(texture2D(tShafts, vUv).rgb * tint * intensity, 1.0);
}`;

const DUST_VERTEX = /* glsl */ `
attribute float size;
uniform float pixelRatio;
varying vec2 vScreen;
void main() {
  vScreen = position.xy * 0.5 + 0.5;
  gl_PointSize = size * pixelRatio;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const DUST_FRAGMENT = /* glsl */ `
uniform sampler2D tShafts;
uniform vec3 tint;
uniform float amount;
varying vec2 vScreen;
void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  float lit = clamp(dot(texture2D(tShafts, vScreen).rgb, vec3(0.333)) * 2.5, 0.0, 1.0);
  gl_FragColor = vec4(tint * lit * amount * smoothstep(0.5, 0.1, d), 1.0);
}`;

/** Create the shaft pass for a renderer. Size it with `setSize` (drawing-buffer pixels). */
export function createVolumetric(
  renderer: WebGLRenderer,
  options: VolumetricOptions = {},
): Volumetric {
  let settings = resolveSettings(options.settings);
  let reduced = Boolean(options.reducedMotion);
  let quality = options.quality ?? qualityFor({ reducedMotion: reduced });
  let sun = options.sun ? new Vector3(...options.sun) : null;
  const seed = options.seed ?? 7;
  const start = performance.now();

  // Half-float targets keep the long blur free of banding; where the GPU (or a software
  // renderer) cannot render to them, 8-bit targets still work.
  const half =
    renderer.extensions.has("EXT_color_buffer_half_float") ||
    renderer.extensions.has("EXT_color_buffer_float");
  const target = () =>
    new WebGLRenderTarget(1, 1, {
      type: half ? HalfFloatType : UnsignedByteType,
      depthBuffer: true,
      stencilBuffer: false,
    });
  const occlusion = target();
  const shafts = target();
  const quadCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const plane = new PlaneGeometry(2, 2);
  const lightPos = new Vector2(0.5, 0.5);

  const disc = new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: DISC,
    uniforms: { lightPos: { value: lightPos }, aspect: { value: 1 }, radius: { value: 0.045 } },
    depthTest: false,
    depthWrite: false,
  });
  const blur = new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: BLUR,
    defines: { SAMPLES: quality.samples },
    uniforms: {
      tOcclusion: { value: occlusion.texture },
      lightPos: { value: lightPos },
      density: { value: 0.9 },
      decay: { value: 0.95 },
      weight: { value: 0.4 },
      exposure: { value: 0.5 },
    },
    depthTest: false,
    depthWrite: false,
  });
  const tint = new Color();
  const composite = new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: COMPOSITE,
    uniforms: {
      tShafts: { value: shafts.texture },
      tint: { value: tint },
      intensity: { value: 1 },
    },
    blending: AdditiveBlending,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const dustMaterial = new ShaderMaterial({
    vertexShader: DUST_VERTEX,
    fragmentShader: DUST_FRAGMENT,
    uniforms: {
      tShafts: { value: shafts.texture },
      tint: { value: tint },
      amount: { value: 1 },
      pixelRatio: { value: 1 },
    },
    blending: AdditiveBlending,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });

  const quadScene = (material: ShaderMaterial) => {
    const scene = new Scene();
    scene.add(new Mesh(plane, material));
    return scene;
  };
  const discScene = quadScene(disc);
  const blurScene = quadScene(blur);
  const overlayScene = quadScene(composite);

  let motes: Mote[] = [];
  const dustGeometry = new BufferGeometry();
  const dust = new Points(dustGeometry, dustMaterial);
  dust.frustumCulled = false;
  overlayScene.add(dust);
  const buildDust = () => {
    motes = dustField(quality.particles, seed);
    dustGeometry.setAttribute(
      "position",
      new BufferAttribute(new Float32Array(motes.length * 3), 3),
    );
    dustGeometry.setAttribute(
      "size",
      new BufferAttribute(new Float32Array(motes.map((m) => m.size * (1.5 + (1 - m.z) * 2.5))), 1),
    );
  };
  buildDust();

  const black = new MeshBasicMaterial({ color: 0x000000 });
  // Uniforms change through .value: three keeps references to the uniform objects themselves.
  const set = (material: ShaderMaterial, name: string, value: unknown) => {
    const uniform = material.uniforms[name];
    if (uniform) uniform.value = value;
  };
  const projected = new Vector3();
  let width = 1;
  let height = 1;

  const applySettings = (density: number) => {
    // scatter: how far the shafts reach (blur length and how slowly they fade).
    // Long, soft shafts: the blur reaches most of the way to the light, decaying slowly.
    set(blur, "density", 0.75 + settings.scatter * 0.25);
    set(blur, "decay", 0.93 + settings.scatter * 0.055);
    set(blur, "weight", 0.3);
    set(blur, "exposure", (0.15 + density * 0.55) * Math.sqrt(48 / quality.samples));
    const [r, g, b] = kelvinToRgb(settings.temperature);
    tint.setRGB(r, g, b);
    set(dustMaterial, "amount", settings.dust);
  };

  return {
    render(scene, camera, seconds = (performance.now() - start) / 1000) {
      const still = reduced || !quality.animate;
      const light = lightAt(settings, seconds, still);
      let visibility = 1;
      if (sun) {
        projected.copy(sun).project(camera);
        lightPos.set(projected.x * 0.5 + 0.5, projected.y * 0.5 + 0.5);
        // Behind the camera, the light casts no shafts into the view.
        visibility = projected.z > 1 ? 0 : 1;
      } else {
        lightPos.set(light.source.x, 1 - light.source.y);
      }
      // Fade out as the light leaves the frame by more than half a frame.
      const outside = Math.max(Math.abs(lightPos.x - 0.5), Math.abs(lightPos.y - 0.5)) - 0.5;
      visibility *= Math.max(0, 1 - Math.max(0, outside) / 0.6);
      applySettings(light.density);
      set(composite, "intensity", visibility);
      set(disc, "aspect", width / height);

      const autoClear = renderer.autoClear;
      const clearColor = renderer.getClearColor(new Color());
      const clearAlpha = renderer.getClearAlpha();
      const background = scene.background;
      const override = scene.overrideMaterial;

      // 1. Occlusion: the light's disc, the scene in black over it.
      renderer.setRenderTarget(occlusion);
      renderer.setClearColor(0x000000, 1);
      renderer.clear();
      renderer.autoClear = false;
      renderer.render(discScene, quadCamera);
      scene.background = null;
      scene.overrideMaterial = black;
      renderer.render(scene, camera);
      scene.overrideMaterial = override;
      scene.background = background;

      // 2. Shafts: blur toward the light.
      renderer.setRenderTarget(shafts);
      renderer.clear();
      renderer.render(blurScene, quadCamera);

      // 3. The scene, then the shafts and dust added over it.
      renderer.setRenderTarget(null);
      renderer.setClearColor(clearColor, clearAlpha);
      renderer.clear();
      renderer.render(scene, camera);
      const positions = dustGeometry.getAttribute("position") as BufferAttribute;
      motes.forEach((mote, i) => {
        const at = moteAt(mote, seconds, still);
        positions.setXYZ(i, at.x * 2 - 1, 1 - at.y * 2, 0);
      });
      positions.needsUpdate = true;
      dustGeometry.setDrawRange(0, Math.round(motes.length * Math.min(1, settings.dust * 1.5)));
      set(dustMaterial, "pixelRatio", renderer.getPixelRatio());
      renderer.render(overlayScene, quadCamera);
      renderer.autoClear = autoClear;
    },
    setSize(w, h) {
      width = Math.max(1, w);
      height = Math.max(1, h);
      const sw = Math.max(1, Math.round(width * quality.resolution));
      const sh = Math.max(1, Math.round(height * quality.resolution));
      occlusion.setSize(sw, sh);
      shafts.setSize(sw, sh);
    },
    update(next) {
      settings = resolveSettings({
        ...settings,
        ...next,
        source: { ...settings.source, ...next.source },
      });
    },
    setQuality(next) {
      const resized = next.resolution !== quality.resolution;
      if (next.samples !== quality.samples) {
        blur.defines = { SAMPLES: next.samples };
        blur.needsUpdate = true;
      }
      const rebuild = next.particles !== quality.particles;
      quality = next;
      if (rebuild) buildDust();
      if (resized) this.setSize(width, height);
    },
    setReducedMotion(on) {
      reduced = on;
    },
    setSun(next) {
      sun = next ? new Vector3(...next) : null;
    },
    dispose() {
      occlusion.dispose();
      shafts.dispose();
      plane.dispose();
      dustGeometry.dispose();
      for (const m of [disc, blur, composite, dustMaterial, black]) m.dispose();
    },
  };
}

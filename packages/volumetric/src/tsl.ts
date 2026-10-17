// @quartifex/volumetric/tsl: the light shafts as a TSL node graph, for three's
// WebGPURenderer and its post-processing (`PostProcessing` from three/webgpu). It is the same
// design as the WebGL pass in ./three, rebuilt in nodes because WebGPURenderer cannot run
// GLSL ShaderMaterials: an occlusion image (the light's disc and broad glow, cut out wherever
// the scene's depth says something stands in front of the sky), blurred radially towards the
// light (GPU Gems 3, chapter 13), tinted by the colour temperature and added to the scene.
// It runs on both of WebGPURenderer's backends (WebGPU, and WebGL2 when WebGPU is missing).
import type { Camera, Vector3 } from "three";
import { radialBlur } from "three/addons/tsl/display/radialBlur.js";
import {
  float,
  int,
  length,
  max,
  pow,
  screenSize,
  smoothstep,
  uniform,
  uv,
  vec2,
  vec3,
  vec4,
} from "three/tsl";
import { type Node, Vector3 as V3 } from "three/webgpu";
import {
  kelvinToRgb,
  lightAt,
  qualityFor,
  resolveSettings,
  type Settings,
  type VolumetricQuality,
} from "./index.js";

export type TslVolumetricOptions = {
  /** The scene's colour, e.g. `pass(scene, camera).getTextureNode("output")`. */
  color: Node<"vec4">;
  /** The scene's depth from the same pass, `getTextureNode("depth")` (0 near, 1 sky). */
  depth: Node<"vec4">;
  /** Where the light is in the world. Projected through the camera every frame. */
  sun: Vector3 | [number, number, number];
  settings?: Partial<Settings>;
  quality?: VolumetricQuality;
};

export type TslVolumetric = {
  /** The composited image: the scene plus the shafts. Use as `postProcessing.outputNode`. */
  node: Node;
  /** The shafts alone (before they are added), for a custom composite. */
  shafts: Node;
  /** Call once a frame, before rendering: projects the light and applies its drift. */
  update(camera: Camera, seconds: number): void;
  /** Change the look without rebuilding the graph (sample count is fixed at creation). */
  setSettings(settings: Partial<Settings>): void;
  /** How strong the light is on screen right now, 0 to 1 (0 when it is behind the camera). */
  readonly visibility: number;
};

const toVector = (sun: TslVolumetricOptions["sun"]) =>
  Array.isArray(sun) ? new V3(sun[0], sun[1], sun[2]) : new V3().copy(sun);

/** Build the light-shaft graph. Sample count comes from `quality` (default `qualityFor()`). */
export function createTslVolumetric(options: TslVolumetricOptions): TslVolumetric {
  const quality = options.quality ?? qualityFor();
  let settings = resolveSettings(options.settings);
  const world = toVector(options.sun);
  const projected = new V3();

  const sunUv = uniform(vec2(0.5, -0.1));
  const tint = uniform(vec3(...kelvinToRgb(settings.temperature)));
  const strength = uniform(float(settings.density));
  const decay = uniform(float(0.93 + settings.scatter * 0.055));
  const exposure = uniform(float(0.4));
  const fade = uniform(float(1));

  // The light's disc and a broad glow around it, corrected for the screen's aspect.
  const aspect = screenSize.x.div(screenSize.y);
  const offset = uv().sub(sunUv).mul(vec2(aspect, 1));
  const d = length(offset);
  const disc = smoothstep(float(0.09), float(0.02), d);
  const glow = pow(max(float(0), float(1).sub(d.div(0.85))), float(2.2)).mul(0.6);
  // Sky is depth 1; anything nearer occludes the light.
  const sky = smoothstep(float(0.9995), float(1), options.depth.r);
  const occlusion = disc.add(glow).mul(sky).mul(fade);

  const shafts = radialBlur(vec4(vec3(occlusion), 1), {
    center: sunUv,
    weight: float(0.3),
    decay,
    count: int(quality.samples),
    exposure,
  }) as Node<"vec4">;
  const lit = shafts.rgb.mul(tint).mul(strength);
  const node = vec4(options.color.rgb.add(lit), 1);

  const apply = () => {
    tint.value.set(...kelvinToRgb(settings.temperature));
    decay.value = 0.93 + settings.scatter * 0.055;
    exposure.value = (0.15 + settings.density * 0.55) * Math.sqrt(48 / quality.samples);
  };
  apply();

  let visibility = 1;
  return {
    node,
    shafts: lit,
    update(camera, seconds) {
      const light = lightAt(settings, seconds, !quality.animate);
      strength.value = light.density;
      projected.copy(world).project(camera);
      // Behind the camera the projection flips; fade the light out instead.
      const behind = projected.z > 1;
      visibility = behind ? 0 : 1;
      fade.value = visibility;
      sunUv.value.set((projected.x + 1) / 2, (1 - projected.y) / 2);
    },
    setSettings(next) {
      settings = resolveSettings({ ...settings, ...next });
      apply();
    },
    get visibility() {
      return visibility;
    },
  };
}

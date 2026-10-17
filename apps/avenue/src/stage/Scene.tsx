"use client";
// The 3D stage: the AVENUE car at night on three's WebGPURenderer (WebGPU, or WebGL2 where
// WebGPU is missing), through React Three Fiber. Loaded only after first paint, by Stage.
//
// Light: a studio of soft light strips rendered into an environment map (the paint and glass
// reflections), an overhead pool of light, and volumetric shafts from a high light behind the
// car (@quartifex/volumetric/tsl). Post: light bloom on the screens and lamps, a vignette.
// Camera: @quartifex/dolly's rig on the page's scroll, then the demo's seat views.
import { createRig } from "@quartifex/dolly";
import type { Understudy } from "@quartifex/understudy";
import { Governor, useQuality } from "@quartifex/understudy/r3f";
import { createTslVolumetric, type TslVolumetric } from "@quartifex/volumetric/tsl";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { gsap } from "gsap";
import { useEffect, useMemo, useRef } from "react";
import type { Object3D } from "three";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { bloom } from "three/addons/tsl/display/BloomNode.js";
import {
  distance,
  float,
  length,
  mix,
  pass,
  positionWorld,
  smoothstep,
  uniform,
  uv,
  vec2,
  vec3,
  vec4,
} from "three/tsl";
import type { Node } from "three/webgpu";
import * as THREE from "three/webgpu";
import { demo } from "@/demo/store";
import { SEAT_IDS, type SeatId } from "@/demo/system";
import { DOOR_OPEN, journeyPath, SCREEN_WAKE, SUN, seatView } from "@/stage/paths";
import { drawScreen, screenCanvasSize } from "@/stage/screens";
import { frame, stage } from "@/stage/state";
import { CAR, SEATS } from "@/three/shape";

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Fetch the GLB with real byte progress into the stage store, then parse it. */
async function loadCar(url: string): Promise<THREE.Group> {
  const response = await fetch(url);
  if (!response.ok || !response.body) throw new Error(`car: ${response.status}`);
  const total = Number(response.headers.get("content-length")) || null;
  stage.set({ total, loaded: 0 });
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.byteLength;
    stage.set({ loaded });
  }
  const bytes = new Uint8Array(loaded);
  let at = 0;
  for (const c of chunks) {
    bytes.set(c, at);
    at += c.byteLength;
  }
  stage.set({ total: loaded, loaded });
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.parseAsync(bytes.buffer, "");
  return gltf.scene as unknown as THREE.Group;
}

/** A dark studio with soft light strips, rendered once into the environment map. */
function studio(renderer: THREE.WebGPURenderer): THREE.Texture {
  const env = new THREE.Scene();
  env.background = new THREE.Color(0x010102);
  const strip = (
    w: number,
    h: number,
    pos: [number, number, number],
    rot: [number, number, number],
    value: number,
    warm = false,
  ) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(warm ? 1 : 0.92, warm ? 0.78 : 0.95, warm ? 0.56 : 1).multiplyScalar(
          value,
        ),
        side: THREE.DoubleSide,
      }),
    );
    m.position.set(...pos);
    m.rotation.set(...rot);
    env.add(m);
  };
  // Three long strips overhead along the car, a tall soft panel to the left, a low warm strip
  // behind: the reflections that draw the car's lines in the dark.
  strip(9, 0.35, [0, 4, 0.9], [Math.PI / 2, 0, 0], 3.2);
  strip(9, 0.35, [0, 4, -0.9], [Math.PI / 2, 0, 0], 2.6);
  strip(9, 0.2, [0, 4.2, 0], [Math.PI / 2, 0, 0], 2.0);
  strip(4, 2.4, [0, 1.6, 6], [0, Math.PI, 0], 0.55);
  strip(12, 0.25, [0, 0.6, -7], [0, 0, 0], 0.9, true);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const target = pmrem.fromScene(env, 0.025);
  pmrem.dispose();
  return target.texture;
}

function floor(): THREE.Mesh {
  const material = new THREE.MeshStandardNodeMaterial({ roughness: 0.42, metalness: 0 });
  const p = positionWorld.xz;
  const centre = vec2(CAR.length / 2, 0);
  // A pool of light under the car, falling off into the dark.
  const pool = smoothstep(float(9), float(0.5), distance(p, centre));
  // A soft contact shadow the shape of the car's footprint.
  const footprint = length(p.sub(centre).div(vec2(CAR.length / 2 + 0.25, 1.15)));
  const shade = mix(float(0.12), float(1), smoothstep(float(0.62), float(1.25), footprint));
  // Into the dark: the floor meets the background with no visible edge.
  const far = smoothstep(float(7), float(22), distance(p, centre));
  const lit = mix(vec3(0.004, 0.0045, 0.005), vec3(0.05, 0.05, 0.052), pool).mul(shade);
  material.colorNode = mix(lit, vec3(0), far);
  material.roughnessNode = mix(float(0.42), float(1), far);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(CAR.length / 2, 0, 0);
  return mesh;
}

type ScreenSlot = {
  seat: SeatId;
  canvas: HTMLCanvasElement;
  texture: THREE.CanvasTexture;
  material: THREE.MeshBasicMaterial;
};

function clock() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function Car({ understudy, lite }: { understudy: Understudy; lite: boolean }) {
  const gl = useThree((s) => s.gl) as unknown as THREE.WebGPURenderer;
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const quality = useQuality(understudy);
  const group = useRef<THREE.Group | null>(null);
  const door = useRef<Object3D | null>(null);
  const screens = useRef<ScreenSlot[]>([]);
  const cabinLight = useRef<THREE.PointLight | null>(null);
  const volumetric = useRef<TslVolumetric | null>(null);
  const pipeline = useRef<THREE.RenderPipeline | null>(null);
  const rig = useMemo(
    () => createRig(journeyPath, { damping: 3.2, reducedMotion: frame.reducedMotion }),
    [],
  );
  // The demo's camera: a pose that GSAP tweens between seat views.
  const seatPose = useRef({ px: 0, py: 0, pz: 0, tx: 0, ty: 0, tz: 0, fov: 45, w: 0 });

  // Scene: environment, floor, lights, the car.
  // biome-ignore lint/correctness/useExhaustiveDependencies: drawAll reads the latest state when called; the scene is built once per renderer
  useEffect(() => {
    let disposed = false;
    scene.environment = studio(gl);
    scene.environmentIntensity = 0.9;
    scene.background = new THREE.Color(0x000000);
    const ground = floor();
    scene.add(ground);
    const key = new THREE.SpotLight(0xfff1e0, 55, 14, 0.62, 0.9, 2);
    key.position.set(CAR.length / 2, 6.2, 0.6);
    key.target.position.set(CAR.length / 2, 0.4, 0);
    scene.add(key, key.target);
    const rim = new THREE.DirectionalLight(0xb9c7ff, 0.35);
    rim.position.set(-6, 3, -8);
    scene.add(rim);
    const cabin = new THREE.PointLight(0xffc98a, 0, 2.6, 2);
    cabin.position.set(3.3, 1.3, 0);
    scene.add(cabin);
    cabinLight.current = cabin;

    loadCar(lite ? "/models/avenue-car-lite.glb" : "/models/avenue-car.glb")
      .then((car) => {
        if (disposed) return;
        group.current = car;
        door.current = car.getObjectByName("door-rear-left") ?? null;
        car.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (!mesh.isMesh) return;
          const m = mesh.material as THREE.MeshPhysicalMaterial;
          if (m.name === "glass") {
            m.depthWrite = false;
            m.envMapIntensity = 1.4;
          }
          if (m.name === "paint") m.envMapIntensity = 1.25;
        });
        // Swap each screen's material for a live canvas texture.
        screens.current = SEAT_IDS.map((seat) => {
          const mesh = car.getObjectByName(`screen-${seat}`) as THREE.Mesh | undefined;
          const canvas = document.createElement("canvas");
          [canvas.width, canvas.height] = screenCanvasSize(seat);
          const texture = new THREE.CanvasTexture(canvas);
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.flipY = false;
          texture.anisotropy = 4;
          const material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
          material.color.setScalar(0);
          if (mesh) mesh.material = material;
          return { seat, canvas, texture, material };
        });
        drawAll();
        scene.add(car);
      })
      .catch(() => understudy.demote("The car model could not be loaded"));

    return () => {
      disposed = true;
      scene.remove(ground, key, key.target, rim, cabin);
      if (group.current) scene.remove(group.current);
    };
  }, [gl, scene, lite, understudy]);

  // Redraw the screens whenever the demo's state changes (and each minute for the clock).
  const drawAll = () => {
    const system = demo.get().system;
    const time = clock();
    for (const slot of screens.current) {
      const ctx = slot.canvas.getContext("2d");
      if (!ctx) continue;
      drawScreen(ctx, slot.seat, system, time);
      slot.texture.needsUpdate = true;
    }
  };
  useEffect(() => {
    const off = demo.subscribe(drawAll);
    const id = window.setInterval(drawAll, 30_000);
    return () => {
      off();
      window.clearInterval(id);
    };
  });

  // Post-processing: scene pass, volumetric light, bloom, vignette. Off on lower quality steps.
  useEffect(() => {
    if (!quality.post) {
      pipeline.current = null;
      volumetric.current = null;
      return;
    }
    const rp = new THREE.RenderPipeline(gl);
    const scenePass = pass(scene, camera);
    const color = scenePass.getTextureNode("output");
    const depth = scenePass.getTextureNode("depth");
    const vol = createTslVolumetric({
      color,
      depth,
      sun: SUN,
      settings: {
        density: 0.62,
        scatter: 0.8,
        temperature: 5200,
        drift: frame.reducedMotion ? 0 : 0.35,
      },
    });
    const glow = bloom(color, 0.45, 0.32, 0.78);
    const centred = uv().sub(0.5).mul(vec2(1.2, 1));
    const vignette = mix(
      float(1),
      float(0.62),
      smoothstep(float(0.38), float(0.95), length(centred)),
    );
    rp.outputNode = vec4(
      (vol.node as Node<"vec4">).rgb.add((glow as unknown as Node<"vec4">).rgb).mul(vignette),
      1,
    );
    pipeline.current = rp;
    volumetric.current = vol;
    return () => {
      rp.dispose();
      pipeline.current = null;
    };
  }, [gl, scene, camera, quality.post]);

  // The demo: fly to a seat (or cut, under reduced motion).
  useEffect(() => {
    const fly = (seat: SeatId, demoOn: boolean) => {
      const v = seatView(seat);
      const p = seatPose.current;
      const goal = {
        px: v.position[0],
        py: v.position[1],
        pz: v.position[2],
        tx: v.target[0],
        ty: v.target[1],
        tz: v.target[2],
        fov: v.fov,
        w: demoOn ? 1 : 0,
      };
      if (p.w === 0 && demoOn) {
        // Start the blend from wherever the journey camera is.
        Object.assign(p, {
          px: camera.position.x,
          py: camera.position.y,
          pz: camera.position.z,
          tx: rig.state.target[0],
          ty: rig.state.target[1],
          tz: rig.state.target[2],
          fov: camera.fov,
        });
      }
      gsap.killTweensOf(p);
      if (frame.reducedMotion) {
        Object.assign(p, goal);
        stage.set({ moving: false });
        return;
      }
      stage.set({ moving: true });
      gsap.to(p, {
        ...(demoOn ? goal : { w: 0 }),
        duration: 1.1,
        ease: "power2.inOut",
        onComplete: () => stage.set({ moving: false }),
      });
    };
    let last = { demo: stage.get().demo, seat: stage.get().seat };
    if (last.demo) fly(last.seat, true);
    const off = stage.subscribe(() => {
      const { demo: d, seat } = stage.get();
      if (d !== last.demo || seat !== last.seat) fly(seat, d);
      last = { demo: d, seat };
    });
    return () => {
      off();
    };
  }, [camera, rig]);

  const look = useMemo(() => new THREE.Vector3(), []);
  const corners = useMemo(
    () => [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()],
    [],
  );
  const drewFirst = useRef(false);

  useFrame((state, dt) => {
    const p = frame.progress;
    frame.time += dt;
    const aspect = size.width / Math.max(1, size.height);
    const j = rig.update(p, Math.min(dt, 0.1), aspect, stage.get().bucket);
    const sp = seatPose.current;
    const w = sp.w;
    // Journey camera, blended towards the seat view as the demo takes over.
    const idle = frame.reducedMotion
      ? 0
      : Math.sin(frame.time * 0.18) * 0.12 * (1 - smooth(0, 0.2, p));
    camera.position.set(
      j.position[0] + (sp.px - j.position[0]) * w + idle,
      j.position[1] + (sp.py - j.position[1]) * w,
      j.position[2] + (sp.pz - j.position[2]) * w,
    );
    look.set(
      j.target[0] + (sp.tx - j.target[0]) * w,
      j.target[1] + (sp.ty - j.target[1]) * w,
      j.target[2] + (sp.tz - j.target[2]) * w,
    );
    camera.fov = j.fov + (sp.fov - j.fov) * w;
    camera.lookAt(look);
    camera.updateProjectionMatrix();

    if (door.current)
      door.current.rotation.y = smooth(DOOR_OPEN.from, DOOR_OPEN.to, p) * DOOR_OPEN.angle * (1 - w);
    const system = demo.get().system;
    for (const slot of screens.current) {
      const [a, b] = SCREEN_WAKE[slot.seat];
      const wake = Math.max(smooth(a, b, p), w);
      slot.material.color.setScalar(
        wake * (0.35 + 0.65 * system.seats[slot.seat].brightness) * 1.6,
      );
    }
    if (cabinLight.current)
      cabinLight.current.intensity = smooth(0.62, 0.86, p) * (0.4 + system.ambient * 2.2);
    if (volumetric.current) {
      volumetric.current.setSettings({ density: 0.62 * (1 - smooth(0.3, 0.55, p)) });
      volumetric.current.update(camera, frame.time);
    }

    // The selected screen's rectangle on the page, for the demo panel to grow from.
    if (stage.get().demo) {
      const sc = SEATS[stage.get().seat].screen;
      const [cx, cy, cz] = sc.center;
      const [sw, sh] = sc.size;
      const cs = Math.cos(sc.tilt);
      const sn = Math.sin(sc.tilt);
      let i = 0;
      for (const [a, b] of [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ] as const) {
        const up = (b * sh) / 2;
        corners[i++]?.set(cx - up * sn, cy + up * cs, cz - (a * sw) / 2).project(camera);
      }
      const xs = corners.map((v) => ((v.x + 1) / 2) * size.width);
      const ys = corners.map((v) => ((1 - v.y) / 2) * size.height);
      const r = frame.rect;
      r.x = Math.min(...xs);
      r.y = Math.min(...ys);
      r.width = Math.max(...xs) - r.x;
      r.height = Math.max(...ys) - r.y;
      r.visible = corners.every((v) => v.z < 1);
      frame.onRect?.(r);
    }

    if (pipeline.current) pipeline.current.render();
    else gl.render(state.scene, camera);
    if (!drewFirst.current && group.current) {
      drewFirst.current = true;
      stage.set({ ready: true });
    }
  }, 1);

  return <Governor understudy={understudy} />;
}

/** The R3F canvas on three's WebGPURenderer, which falls back to WebGL2 by itself. */
export default function Scene({
  understudy,
  lite,
  active,
}: {
  understudy: Understudy;
  lite: boolean;
  active: boolean;
}) {
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={[1, 2]}
      camera={{ fov: 26, near: 0.05, far: 80, position: [2.7, 0.78, 9.6] }}
      gl={async (props) => {
        const renderer = new THREE.WebGPURenderer({
          canvas: props.canvas as HTMLCanvasElement,
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
        });
        await renderer.init();
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.05;
        const backend = (renderer.backend as { isWebGPUBackend?: boolean }).isWebGPUBackend
          ? "webgpu"
          : "webgl";
        stage.set({ backend });
        return renderer as unknown as import("three").WebGLRenderer;
      }}
      aria-hidden="true"
    >
      <Car understudy={understudy} lite={lite} />
    </Canvas>
  );
}

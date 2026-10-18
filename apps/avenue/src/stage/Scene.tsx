"use client";
// The 3D stage: the demo car in a dusk-blue studio. A cyclorama gradient and a floor that fades
// into it keep the car in clean space; its reflections come from a real sky (Poly Haven, CC0),
// so the paint and glass read as they would outdoors. The cabin holds AVENUE's four screens,
// painted live from the demo's state.
// The camera follows the page: each chapter (camera.ts) has a start and an end pose, scroll
// says where between them we are, and the camera eases there. The demo takes over the camera
// for the seat views.
import { Environment, Lightformer, MeshReflectorMaterial } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { gsap } from "gsap";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { demo } from "@/demo/store";
import { SEAT_IDS, type SeatId } from "@/demo/system";
import { CHAPTER_BY_ID, CHAPTERS, type Pose, poseAt, SCREENS, seatPose } from "@/stage/camera";
import { drawScreen, screenCanvasSize } from "@/stage/screens";
import { frame, stage } from "@/stage/state";

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

type Finish = Partial<THREE.MeshPhysicalMaterialParameters> & { keepMap?: boolean };

/** The finishes, by the model's material names; anything not listed keeps its own textures. */
const FINISH: Record<string, Finish> = {
  // Pearl white with a clear coat: holds the sky's highlights, so the car reads on dark pages.
  body: {
    color: "#e4e8ee",
    metalness: 0.3,
    roughness: 0.26,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    keepMap: false,
  },
  black_ext: {
    color: "#0a0b0d",
    metalness: 0.1,
    roughness: 0.28,
    clearcoat: 0.8,
    clearcoatRoughness: 0.08,
  },
  black_ext_ao: {
    color: "#0a0b0d",
    metalness: 0.1,
    roughness: 0.32,
    clearcoat: 0.6,
    clearcoatRoughness: 0.1,
  },
  carbono: { metalness: 0.2, roughness: 0.3, clearcoat: 1 },
  glass: {
    color: "#141a22",
    metalness: 0,
    roughness: 0.02,
    transparent: true,
    opacity: 0.62,
    envMapIntensity: 1.4,
  },
  caliper: { metalness: 0.4, roughness: 0.35 },
  tires: { metalness: 0, roughness: 0.88 },
  rim1: { metalness: 1, roughness: 0.28 },
  rim2: { metalness: 1, roughness: 0.35 },
  bmwlogo: { metalness: 0.7, roughness: 0.35 },
  disc: { metalness: 0.9, roughness: 0.45 },
  metallic_int: { metalness: 1, roughness: 0.3 },
  black_m: { color: "#d8dbe0", metalness: 1, roughness: 0.18 },
  // Door mirrors.
  Material__44: { color: "#ffffff", metalness: 1, roughness: 0.02, keepMap: false },
  Material__45: { color: "#ffffff", metalness: 1, roughness: 0.02, keepMap: false },
  Material__46: { color: "#ffffff", metalness: 1, roughness: 0.02, keepMap: false },
  Front: { roughness: 0.45 },
  license: { roughness: 0.45 },
};

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

type ScreenSlot = {
  seat: SeatId;
  canvas: HTMLCanvasElement;
  texture: THREE.CanvasTexture;
  material: THREE.MeshBasicMaterial;
  mesh: THREE.Mesh;
};

/** The platform's light cycles slowly through the brand's colours. */
const PLATFORM_COLOURS = ["#2d63ee", "#9cc6ff", "#7a5cff", "#ff6a2b"].map(
  (c) => new THREE.Color(c),
);
const platformColour = new THREE.Color();
function cycleColour(t: number, out: THREE.Color) {
  const n = PLATFORM_COLOURS.length;
  const x = (t / 7) % n;
  const i = Math.floor(x);
  const f = x - i;
  const e = f * f * (3 - 2 * f);
  const a = PLATFORM_COLOURS[i] as THREE.Color;
  const b = PLATFORM_COLOURS[(i + 1) % n] as THREE.Color;
  return out.copy(a).lerp(b, e);
}

/** Bloom on desktop: the lamps, the screens and the platform ring glow. */
let composer: EffectComposer | null = null;

function clock() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** Build the four screens as planes with live canvas textures, plus the dash glass bar. */
function buildScreens(): { group: THREE.Group; slots: ScreenSlot[] } {
  const group = new THREE.Group();
  group.name = "avenue-screens";
  const slots = SEAT_IDS.map((seat) => {
    const def = SCREENS[seat];
    const canvas = document.createElement("canvas");
    [canvas.width, canvas.height] = screenCanvasSize(seat);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    const material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
    material.color.setScalar(0);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(def.size[0], def.size[1]), material);
    mesh.name = `screen-${seat}`;
    mesh.position.set(...def.center);
    mesh.rotation.order = "YXZ";
    mesh.rotation.y = def.yaw;
    mesh.rotation.x = def.tilt;
    // Sit just proud of whatever is behind it.
    mesh.translateZ(0.004);
    group.add(mesh);
    return { seat, canvas, texture, material, mesh };
  });
  return { group, slots };
}

/** How bright each screen is per chapter: they wake one after another as the camera enters. */
function screenWake(seat: SeatId): number {
  const { chapter, local } = frame;
  if (chapter === "hero" || chapter === "problem") return 0;
  if (chapter === "cabin") {
    const order = SEAT_IDS.indexOf(seat);
    return smooth(0.55 + order * 0.1, 0.7 + order * 0.1, local);
  }
  return 1;
}

function Car({ lite }: { lite: boolean }) {
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const group = useRef<THREE.Group | null>(null);
  const glass = useRef<THREE.MeshPhysicalMaterial[]>([]);
  const lamps = useRef<THREE.MeshPhysicalMaterial | null>(null);
  const screens = useRef<ScreenSlot[]>([]);
  const cabinLight = useRef<THREE.PointLight>(null);
  const cabinFill = useRef<THREE.PointLight>(null);
  const hazard = useRef<THREE.Group>(null);
  const turn = useRef<THREE.Group>(null);
  const key = useRef<THREE.DirectionalLight>(null);
  const rim = useRef<THREE.SpotLight>(null);
  const ring = useRef<THREE.MeshBasicMaterial>(null);
  const glow = useRef<THREE.MeshBasicMaterial>(null);
  const target = useMemo(() => new THREE.Vector3(), []);
  const goalPos = useMemo(() => new THREE.Vector3(), []);
  const goalTarget = useMemo(() => new THREE.Vector3(), []);
  const goalFov = useRef(30);
  const seatBlend = useRef({ w: 0, pose: seatPose("driver") as Pose });
  const drewFirst = useRef(false);

  // Load the car, dress it, add the screens.
  // biome-ignore lint/correctness/useExhaustiveDependencies: built once per model; drawAll reads live state
  useEffect(() => {
    let disposed = false;
    loadCar(lite ? "/media/avenue-car-mobile.glb" : "/media/avenue-car.glb")
      .then((car) => {
        if (disposed) return;
        const seen = new Map<string, THREE.MeshPhysicalMaterial>();
        car.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (!mesh.isMesh) return;
          const old = mesh.material as THREE.MeshStandardMaterial;
          const name = old.name;
          let m = seen.get(name);
          if (!m) {
            const { keepMap = true, ...finish } = FINISH[name] ?? {};
            m = new THREE.MeshPhysicalMaterial({
              name,
              map: keepMap ? (old.map ?? null) : null,
              normalMap: old.normalMap ?? null,
              color: old.color,
              roughness: old.roughness,
              metalness: old.metalness,
              transparent: old.transparent,
              alphaTest: old.alphaTest,
              side: name === "glass" ? THREE.DoubleSide : THREE.FrontSide,
              ...finish,
            });
            if (name === "glass") {
              m.depthWrite = false;
              glass.current.push(m);
            }
            if (name === "lights") {
              // The lamp atlas glows a little: white for the headlamps, red for the tails.
              m.emissiveMap = m.map;
              m.emissive.set("#ffffff");
              m.emissiveIntensity = 3.2;
              lamps.current = m;
            }
            seen.set(name, m);
          }
          mesh.material = m;
          if (name === "glass") mesh.renderOrder = 2;
          mesh.castShadow = !/glass/.test(name);
        });
        const built = buildScreens();
        car.add(built.group);
        screens.current = built.slots;
        group.current = car;
        drawAll();
        turn.current?.add(car);
      })
      .catch(() => stage.set({ rung: "poster" }));
    return () => {
      disposed = true;
      if (group.current) turn.current?.remove(group.current);
    };
  }, [scene, lite]);

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

  // The demo: blend from the journey's camera to a seat view, and between seats.
  useEffect(() => {
    let last = { demo: stage.get().demo, seat: stage.get().seat };
    const go = (seat: SeatId, on: boolean) => {
      const b = seatBlend.current;
      gsap.killTweensOf(b);
      const to = seatPose(seat);
      if (frame.reducedMotion) {
        b.pose = to;
        b.w = on ? 1 : 0;
        stage.set({ moving: false });
        return;
      }
      stage.set({ moving: true });
      if (on && b.w > 0.01) {
        // Seat to seat: let the damped camera do the flying.
        b.pose = to;
        gsap.delayedCall(1.1, () => stage.set({ moving: false }));
      } else {
        b.pose = to;
        gsap.to(b, {
          w: on ? 1 : 0,
          duration: 1.2,
          ease: "power3.inOut",
          onComplete: () => stage.set({ moving: false }),
        });
      }
    };
    if (last.demo) go(last.seat, true);
    return stage.subscribe(() => {
      const { demo: d, seat } = stage.get();
      if (d !== last.demo || seat !== last.seat) go(seat, d);
      last = { demo: d, seat };
    });
  }, []);

  const corners = useMemo(
    () => [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()],
    [],
  );

  useFrame((state, dt) => {
    frame.time += dt;
    const chapter = CHAPTER_BY_ID[frame.chapter] ?? CHAPTERS[0];
    if (!chapter) return;
    const journey = poseAt(chapter, frame.local);
    const b = seatBlend.current;
    const w = b.w;
    const mix = (a: number, c: number) => a + (c - a) * w;
    // A breath of drift and pointer parallax outside the car only.
    const outside = !chapter.inside && w < 0.5;
    const drift = frame.reducedMotion || !outside ? 0 : Math.sin(frame.time * 0.16) * 0.12;
    const px = outside && !frame.reducedMotion ? frame.pointer.x * 0.25 : 0;
    const py = outside && !frame.reducedMotion ? frame.pointer.y * 0.08 : 0;
    goalPos.set(
      mix(journey.pos[0] + drift + px, b.pose.pos[0]),
      mix(journey.pos[1] + py, b.pose.pos[1]),
      mix(journey.pos[2], b.pose.pos[2]),
    );
    goalTarget.set(
      mix(journey.target[0], b.pose.target[0]),
      mix(journey.target[1], b.pose.target[1]),
      mix(journey.target[2], b.pose.target[2]),
    );
    goalFov.current = mix(journey.fov, b.pose.fov);
    // Ease towards the goal (critically damped feel); cut under reduced motion.
    const k = frame.reducedMotion ? 1 : 1 - Math.exp(-dt * (w > 0.01 ? 3.2 : 5.5));
    if (!drewFirst.current || frame.cut) {
      frame.cut = false;
      camera.position.copy(goalPos);
      target.copy(goalTarget);
      camera.fov = goalFov.current;
    } else {
      camera.position.lerp(goalPos, k);
      target.lerp(goalTarget, k);
    }
    camera.fov += (goalFov.current - camera.fov) * k;
    camera.lookAt(target);
    camera.updateProjectionMatrix();

    // Inside: glass turns see-through so the road shows; the cabin light comes up.
    const inside = chapter.inside || w > 0.5 ? 1 : 0;
    for (const g of glass.current)
      g.opacity += ((inside ? 0.22 : 0.62) - g.opacity) * Math.min(1, dt * 4);
    if (cabinFill.current)
      cabinFill.current.intensity +=
        ((inside ? 0.9 : 0) - cabinFill.current.intensity) * Math.min(1, dt * 3);
    if (cabinLight.current) {
      const ambient = demo.get().system.ambient;
      cabinLight.current.intensity +=
        ((inside ? 1.1 + ambient * 1.6 : 0) - cabinLight.current.intensity) * Math.min(1, dt * 3);
    }
    // Screens: wake with the story, follow each seat's brightness.
    const system = demo.get().system;
    for (const slot of screens.current) {
      const wake = Math.max(screenWake(slot.seat), w);
      slot.material.color.setScalar(
        wake * (0.45 + 0.55 * system.seats[slot.seat].brightness) * 1.25,
      );
    }
    // Hazard lights in the SOS chapter, or while SOS runs in the demo.
    if (hazard.current) {
      const on = frame.chapter === "sos" || system.sos.state !== "idle";
      const blink = on && Math.sin(frame.time * Math.PI * 2 * 1.3) > 0 ? 1 : 0;
      for (const l of hazard.current.children) (l as THREE.PointLight).intensity = blink * 6;
    }

    // The selected screen's rectangle on the page, for the demo panel to grow from.
    if (stage.get().demo) {
      const slot = screens.current.find((s) => s.seat === stage.get().seat);
      if (slot) {
        const geo = slot.mesh.geometry as THREE.PlaneGeometry;
        const { width: sw, height: sh } = geo.parameters;
        let i = 0;
        for (const [a, c] of [
          [-1, -1],
          [1, -1],
          [1, 1],
          [-1, 1],
        ] as const) {
          const v = corners[i++];
          if (!v) continue;
          v.set((a * sw) / 2, (c * sh) / 2, 0);
          slot.mesh.localToWorld(v);
          v.project(camera);
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
    }

    // The turntable: the visitor can turn the car a little outside; it eases back on release.
    // Inside the cabin it is always square, so the seat views line up.
    if (turn.current) {
      const exterior = !chapter.inside && w < 0.01;
      const want = exterior ? frame.drag : 0;
      if (!exterior && (frame.reducedMotion || Math.abs(turn.current.rotation.y) < 0.002))
        turn.current.rotation.y = 0;
      else turn.current.rotation.y += (want - turn.current.rotation.y) * Math.min(1, dt * 4);
    }
    // The light moves: the key light swings slowly round, the reflections drift across the
    // paint, and the platform's ring and rim light cycle through the brand colours.
    const t = frame.reducedMotion ? 0 : frame.time;
    if (key.current) {
      const a = -2.35 + Math.sin(t * 0.09) * 0.85;
      key.current.position.set(Math.cos(a) * 8, 8, Math.sin(a) * 8);
    }
    cycleColour(t, platformColour);
    if (ring.current) ring.current.color.copy(platformColour).multiplyScalar(6);
    if (glow.current) glow.current.color.copy(platformColour);
    if (rim.current) {
      rim.current.color.copy(platformColour);
      const r = 1.1 + t * 0.12;
      rim.current.position.set(Math.cos(r) * 7, 2.6, Math.sin(r) * 7);
    }
    state.scene.environmentRotation.y = 1.2 + Math.sin(t * 0.05) * 0.6;

    if (composer) composer.render(dt);
    else state.gl.render(state.scene, camera);
    if (!drewFirst.current && group.current) {
      drewFirst.current = true;
      stage.set({ ready: true });
    }
  }, 1);

  return (
    <>
      {/* Key: high and soft from the front left, as a photographer lights a car at dusk;
          a cool rim behind draws the roofline; a low fill lifts the sills. */}
      <directionalLight
        ref={key}
        position={[-6, 8, -5]}
        intensity={2.2}
        color="#fff6ea"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-4.5}
        shadow-camera-right={4.5}
        shadow-camera-top={4.5}
        shadow-camera-bottom={-4.5}
        shadow-camera-near={1}
        shadow-camera-far={24}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-radius={6}
      />
      <directionalLight position={[6, 5, 7]} intensity={1.0} color="#a9c6ff" />
      {/* A coloured rim light that circles the car, in the platform's colour. */}
      <spotLight
        ref={rim}
        position={[5, 2.6, 5]}
        angle={0.5}
        penumbra={1}
        intensity={40}
        distance={16}
        decay={1.4}
      />
      <group ref={turn}>
        <Plinth lite={lite} ring={ring} glow={glow} />
        {/* Lamps lit from inside: two white headlamps, two red tail-lamps. */}
        <pointLight
          position={[-0.72, 0.95, -2.36]}
          intensity={1.6}
          distance={2.4}
          decay={2}
          color="#e9f1ff"
        />
        <pointLight
          position={[0.72, 0.95, -2.36]}
          intensity={1.6}
          distance={2.4}
          decay={2}
          color="#e9f1ff"
        />
        <pointLight
          position={[-0.76, 1.02, 2.34]}
          intensity={1.4}
          distance={2}
          decay={2}
          color="#ff2418"
        />
        <pointLight
          position={[0.76, 1.02, 2.34]}
          intensity={1.4}
          distance={2}
          decay={2}
          color="#ff2418"
        />
      </group>
      <directionalLight position={[5, 1.2, -6]} intensity={0.5} color="#c8d6ff" />
      <hemisphereLight args={["#b9c9ea", "#1c2433", 0.45]} />
      <group ref={hazard}>
        <pointLight
          position={[-0.76, 0.95, -2.42]}
          intensity={0}
          distance={3}
          decay={2}
          color="#ffa040"
        />
        <pointLight
          position={[0.76, 0.95, -2.42]}
          intensity={0}
          distance={3}
          decay={2}
          color="#ffa040"
        />
        <pointLight
          position={[-0.8, 1.0, 2.4]}
          intensity={0}
          distance={3}
          decay={2}
          color="#ffa040"
        />
        <pointLight
          position={[0.8, 1.0, 2.4]}
          intensity={0}
          distance={3}
          decay={2}
          color="#ffa040"
        />
      </group>
      {/* The cabin's ambient light, warm, from the roof lining. */}
      <pointLight
        ref={cabinLight}
        position={[0, 1.48, 0.1]}
        intensity={0}
        distance={3.4}
        decay={2}
        color="#ffe2c8"
      />
      {/* A cool fill over the rear bench, so the seats and the dash read from the back. */}
      <pointLight
        ref={cabinFill}
        position={[0, 1.42, 0.95]}
        intensity={0}
        distance={3}
        decay={1.6}
        color="#dfe8ff"
      />
    </>
  );
}

/** The studio: a dusk-blue cyclorama (a gradient from deep night at the top to a lit horizon)
 *  and a floor that fades into it, so the car stands in clean space like a showroom shot. */
function Studio() {
  const scene = useThree((s) => s.scene);
  const floor = useMemo(
    () =>
      radial([
        [0, "#fff"],
        [0.38, "#fff"],
        [1, "#000"],
      ]),
    [],
  );
  useEffect(() => {
    const c = document.createElement("canvas");
    c.width = 4;
    c.height = 512;
    const g = c.getContext("2d");
    if (g) {
      const l = g.createLinearGradient(0, 0, 0, 512);
      l.addColorStop(0, "#0a0e17");
      l.addColorStop(0.45, "#18233a");
      l.addColorStop(0.62, "#2e3c58");
      l.addColorStop(1, "#2e3c58");
      g.fillStyle = l;
      g.fillRect(0, 0, 4, 512);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    scene.background = t;
    return () => {
      scene.background = null;
      t.dispose();
    };
  }, [scene]);
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={-PLINTH_H - 0.004} renderOrder={-1}>
      <circleGeometry args={[18, 96]} />
      <meshBasicMaterial
        color="#2e3c58"
        alphaMap={floor}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

/** A radial gradient texture, from the centre out. */
function radial(stops: Array<[number, string]>, w = 256, h = 256) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  if (g) {
    g.translate(w / 2, h / 2);
    g.scale(1, h / w);
    const r = g.createRadialGradient(0, 0, 0, 0, 0, w / 2);
    for (const [at, colour] of stops) r.addColorStop(at, colour);
    g.fillStyle = r;
    g.fillRect(-w / 2, -w / 2, w, w);
  }
  return new THREE.CanvasTexture(c);
}

const PLINTH_R = 3.35;
const PLINTH_H = 0.09;

/** The turntable the car stands on: a dark, polished disc that reflects the car, a thin ring
 *  of light round its edge in the cycling brand colour, a glow on the floor beneath, the key
 *  light's shadow and a soft contact shadow under the car. */
function Plinth({
  lite,
  ring,
  glow,
}: {
  lite: boolean;
  ring: React.RefObject<THREE.MeshBasicMaterial | null>;
  glow: React.RefObject<THREE.MeshBasicMaterial | null>;
}) {
  const blob = useMemo(
    () =>
      radial(
        [
          [0, "rgba(2,4,9,0.95)"],
          [0.55, "rgba(2,4,9,0.7)"],
          [1, "rgba(2,4,9,0)"],
        ],
        128,
        256,
      ),
    [],
  );
  const halo = useMemo(
    () =>
      radial([
        [0, "rgba(255,255,255,0)"],
        [0.62, "rgba(255,255,255,0.0)"],
        [0.7, "rgba(255,255,255,0.55)"],
        [1, "rgba(255,255,255,0)"],
      ]),
    [],
  );
  return (
    <group>
      {/* The body of the plinth. */}
      <mesh position-y={-PLINTH_H / 2} receiveShadow>
        <cylinderGeometry args={[PLINTH_R, PLINTH_R + 0.05, PLINTH_H, 128, 1, true]} />
        <meshStandardMaterial color="#070a10" metalness={0.8} roughness={0.4} />
      </mesh>
      {/* Its polished top. */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.0005} receiveShadow>
        <circleGeometry args={[PLINTH_R, 128]} />
        {lite ? (
          <meshStandardMaterial color="#121826" metalness={0.85} roughness={0.28} />
        ) : (
          <MeshReflectorMaterial
            resolution={1024}
            blur={[420, 140]}
            mixBlur={1}
            mixStrength={1.6}
            mixContrast={1.05}
            depthScale={1.2}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.4}
            roughness={0.78}
            metalness={0.5}
            color="#0b101a"
            mirror={0.45}
          />
        )}
      </mesh>
      {/* The ring of light round the edge. */}
      <mesh rotation-x={Math.PI / 2} position-y={-0.004}>
        <torusGeometry args={[PLINTH_R + 0.012, 0.011, 8, 256]} />
        <meshBasicMaterial ref={ring} color="#2d63ee" toneMapped={false} />
      </mesh>
      {/* Its glow on the floor. */}
      <mesh rotation-x={-Math.PI / 2} position-y={-PLINTH_H + 0.002}>
        <planeGeometry args={[PLINTH_R * 3.2, PLINTH_R * 3.2]} />
        <meshBasicMaterial
          ref={glow}
          alphaMap={halo}
          color="#2d63ee"
          transparent
          opacity={0.2}
          depthWrite={false}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {/* The car's shadows on the plinth. */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.003} renderOrder={1}>
        <planeGeometry args={[2.9, 5.9]} />
        <meshBasicMaterial map={blob} transparent depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.002} receiveShadow renderOrder={0}>
        <circleGeometry args={[PLINTH_R, 96]} />
        <shadowMaterial transparent opacity={0.45} color="#03050b" depthWrite={false} />
      </mesh>
    </group>
  );
}

/** Bloom, on desktop: renders the scene through an HDR target with a soft glow above a high
 *  threshold, so only the lamps, the screens and the platform ring bloom. */
function Post() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);
  useEffect(() => {
    const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
    const c = new EffectComposer(gl, rt);
    c.addPass(new RenderPass(scene, camera));
    c.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), 0.42, 0.5, 2.4));
    c.addPass(new OutputPass());
    composer = c;
    return () => {
      composer = null;
      c.dispose();
      rt.dispose();
    };
  }, [gl, scene, camera]);
  useEffect(() => {
    composer?.setPixelRatio(dpr);
    composer?.setSize(size.width, size.height);
  }, [size, dpr]);
  return null;
}

/** The R3F canvas. `active` pauses rendering when the stage is off screen. */
export default function Scene({ lite, active }: { lite: boolean; active: boolean }) {
  return (
    <Canvas
      shadows
      frameloop={active ? "always" : "never"}
      dpr={[1, lite ? 1.5 : 1.75]}
      camera={{ fov: 28, near: 0.03, far: 200, position: [-5.6, 1.15, -5.4] }}
      gl={{ antialias: true, powerPreference: "high-performance", alpha: false }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1;
        stage.set({ rung: "3d" });
      }}
      aria-hidden="true"
    >
      <Suspense fallback={null}>
        {/* The sky for real-world reflections, plus studio light strips: the long, clean
            highlights a car photographer hangs over and beside the car. */}
        <Environment files="/media/sky.hdr" environmentIntensity={1.05} frames={3} resolution={512}>
          <Lightformer
            form="rect"
            intensity={3.2}
            position={[0, 6, 0]}
            rotation-x={Math.PI / 2}
            scale={[12, 1.4, 1]}
          />
          <Lightformer
            form="rect"
            intensity={1.6}
            position={[-6, 2.2, 0]}
            rotation-y={Math.PI / 2}
            scale={[14, 0.8, 1]}
          />
          <Lightformer
            form="rect"
            intensity={1.6}
            position={[6, 2.2, 0]}
            rotation-y={-Math.PI / 2}
            scale={[14, 0.8, 1]}
          />
          <Lightformer
            form="ring"
            intensity={2}
            color="#9cc6ff"
            position={[0, 3.5, -9]}
            scale={4}
          />
        </Environment>
      </Suspense>
      <Studio />
      <Car lite={lite} />
      {lite ? null : <Post />}
    </Canvas>
  );
}

"use client";
// The 3D stage: the car in a pale studio, lit the way a car is photographed for a launch: long
// softboxes overhead and along the sides for the reflections, a soft shadow pooled under it.
// The camera follows the page (camera.ts): round the car, through the driver's door as it
// opens, into the seat as the screens wake, then round to the back seats. AVENUE draws on the
// car's own screens (the driver display, the portrait centre display, the head-up display)
// and on two screens it adds to the backs of the front headrests, live from the demo's state.
import { AccumulativeShadows, Environment, Lightformer, RandomizedLight } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, N8AO, ToneMapping, Vignette } from "@react-three/postprocessing";
import { gsap } from "gsap";
import { ToneMappingMode } from "postprocessing";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { demo } from "@/demo/store";
import type { SeatId } from "@/demo/system";
import {
  CHAPTER_BY_ID,
  CHAPTERS,
  type Pose,
  poseAt,
  SEAT_SURFACE,
  SURFACE_IDS,
  SURFACES,
  type SurfaceId,
  seatPose,
} from "@/stage/camera";
import { drawSurface } from "@/stage/screens";
import { frame, stage } from "@/stage/state";

const MEDIA = "https://res.cloudinary.com/whn427bg/raw/upload/quartifex/avenue";
export const CAR_URL = `${MEDIA}/avenue-car-v2.glb`;
export const CAR_URL_LITE = `${MEDIA}/avenue-car-v2-mobile.glb`;

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

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const clock = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

type Slot = {
  id: SurfaceId;
  canvas: HTMLCanvasElement;
  texture: THREE.CanvasTexture;
  material: THREE.MeshBasicMaterial;
  mesh: THREE.Mesh;
};

/** The five surfaces as planes laid on the measured glass, with live canvas textures, and the
 *  two headrest screens' housings. */
function buildSurfaces(): { group: THREE.Group; slots: Slot[] } {
  const group = new THREE.Group();
  group.name = "avenue-surfaces";
  const housing = new THREE.MeshPhysicalMaterial({
    color: "#0b0c0e",
    roughness: 0.35,
    metalness: 0.2,
    clearcoat: 0.6,
  });
  const slots = SURFACE_IDS.map((id) => {
    const def = SURFACES[id];
    const canvas = document.createElement("canvas");
    [canvas.width, canvas.height] = def.px;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    const hud = id === "hud";
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      toneMapped: false,
      transparent: hud,
      depthWrite: !hud,
      blending: hud ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    material.color.setScalar(0);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(def.size[0], def.size[1]), material);
    mesh.name = `surface-${id}`;
    const c = new THREE.Vector3(...def.center);
    const n = new THREE.Vector3(...def.normal).normalize();
    mesh.position.copy(c);
    mesh.lookAt(c.clone().add(n));
    mesh.translateZ(0.0015);
    if (hud) mesh.renderOrder = 5;
    group.add(mesh);
    if (id === "rearLeft" || id === "rearRight") {
      // AVENUE's rear screen: a slim slab clipped to the headrest.
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(def.size[0] + 0.014, def.size[1] + 0.014, 0.012),
        housing,
      );
      body.position.copy(mesh.position);
      body.quaternion.copy(mesh.quaternion);
      body.translateZ(-0.0075);
      group.add(body);
    }
    return { id, canvas, texture, material, mesh };
  });
  return { group, slots };
}

/** How awake each surface is in the story: the car is off in the studio, the driver's screens
 *  wake as the camera sits down, the rear screens as it turns round. */
function wake(id: SurfaceId): number {
  const { chapter, local } = frame;
  if (chapter === "hero" || chapter === "enter") return 0;
  if (chapter === "cabin") {
    if (id === "cluster") return smooth(0.45, 0.62, local);
    if (id === "centre") return smooth(0.58, 0.76, local);
    if (id === "hud") return smooth(0.72, 0.9, local);
    return smooth(0.8, 1, local) * 0.6;
  }
  return 1;
}

/** How far the driver's door is open, by chapter. */
function doorOpen(): number {
  const { chapter, local } = frame;
  if (chapter === "enter") return smooth(0.3, 0.85, local);
  if (chapter === "cabin") return 1 - smooth(0.62, 0.95, local);
  return 0;
}

function Car({ lite }: { lite: boolean }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const group = useRef<THREE.Group | null>(null);
  const turn = useRef<THREE.Group>(null);
  const glass = useRef<THREE.MeshPhysicalMaterial[]>([]);
  const slots = useRef<Slot[]>([]);
  const door = useRef<THREE.Object3D | null>(null);
  const cabinLight = useRef<THREE.PointLight>(null);
  const rearLight = useRef<THREE.PointLight>(null);
  const hazard = useRef<THREE.Group>(null);
  const [placed, setPlaced] = useState(false);
  const target = useMemo(() => new THREE.Vector3(), []);
  const goalPos = useMemo(() => new THREE.Vector3(), []);
  const goalTarget = useMemo(() => new THREE.Vector3(), []);
  const goalFov = useRef(26);
  const seatBlend = useRef({ w: 0, pose: seatPose("driver") as Pose });
  const drewFirst = useRef(false);

  // Load the car, finish it, add AVENUE's surfaces.
  // biome-ignore lint/correctness/useExhaustiveDependencies: built once per model; drawAll reads live state
  useEffect(() => {
    let disposed = false;
    loadCar(lite ? CAR_URL_LITE : CAR_URL)
      .then((car) => {
        if (disposed) return;
        const cabinGlass = new Map<THREE.Material, THREE.MeshPhysicalMaterial>();
        car.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (!mesh.isMesh) return;
          // the car's own screen glass: AVENUE draws there instead
          if (mesh.name.startsWith("SCREEN_")) {
            mesh.visible = false;
            return;
          }
          const m = mesh.material as THREE.MeshPhysicalMaterial;
          if (m.name === "magnesium") {
            // the paint: a metallic base under a hard clear lacquer
            m.metalness = 0.62;
            m.roughness = 0.42;
            m.clearcoat = 1;
            m.clearcoatRoughness = 0.035;
            m.envMapIntensity = 1.15;
          }
          if (m.transparent && /Glass/.test(m.name)) {
            m.depthWrite = false;
            mesh.renderOrder = 2;
            // windows, windscreen and roof clear up from inside; the lamp lenses do not
            if (/window|windshield|door|roof|sunroof/i.test(mesh.name)) {
              let c = cabinGlass.get(m);
              if (!c) {
                c = m.clone();
                c.side = THREE.DoubleSide;
                c.userData.base = m.opacity;
                cabinGlass.set(m, c);
                glass.current.push(c);
              }
              mesh.material = c;
            }
          }
        });
        door.current = car.getObjectByName("ANCHOR_Door_FrontRight") ?? null;
        const built = buildSurfaces();
        car.add(built.group);
        slots.current = built.slots;
        group.current = car;
        drawAll();
        turn.current?.add(car);
        setPlaced(true);
      })
      .catch(() => stage.set({ rung: "poster" }));
    return () => {
      disposed = true;
      if (group.current) turn.current?.remove(group.current);
    };
  }, [lite]);

  const drawAll = () => {
    const system = demo.get().system;
    const time = clock();
    for (const slot of slots.current) {
      const ctx = slot.canvas.getContext("2d");
      if (!ctx) continue;
      drawSurface(ctx, slot.id, system, time);
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
      b.pose = to;
      if (on && b.w > 0.01) gsap.delayedCall(1.1, () => stage.set({ moving: false }));
      else
        gsap.to(b, {
          w: on ? 1 : 0,
          duration: 1.2,
          ease: "power3.inOut",
          onComplete: () => stage.set({ moving: false }),
        });
    };
    if (last.demo) go(last.seat, true);
    return stage.subscribe(() => {
      const { demo: d, seat } = stage.get();
      if (d !== last.demo || seat !== last.seat) go(seat, d);
      last = { demo: d, seat };
    });
  }, []);

  const outsideW = useRef(1);
  const corners = useMemo(
    () => [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()],
    [],
  );

  useFrame((_, dt) => {
    frame.time += dt;
    const chapter = CHAPTER_BY_ID[frame.chapter] ?? CHAPTERS[0];
    if (!chapter) return;
    const journey = poseAt(chapter, frame.local);
    const b = seatBlend.current;
    const w = b.w;
    const mix = (a: number, c: number) => a + (c - a) * w;
    const outside = !chapter.inside && w < 0.5;
    const still = frame.reducedMotion;
    // The slow drift and the pointer's pull ease out as the camera goes inside, rather than
    // stopping on the frame the chapter changes (which read as a jolt between chapters).
    outsideW.current += ((outside && !still ? 1 : 0) - outsideW.current) * Math.min(1, dt * 1.6);
    const ow = outsideW.current;
    const drift = Math.sin(frame.time * 0.15) * 0.1 * ow;
    const px = frame.pointer.x * 0.22 * ow;
    const py = frame.pointer.y * 0.06 * ow;
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
    const k = still ? 1 : 1 - Math.exp(-dt * (w > 0.01 ? 3.2 : 5.2));
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
    // Portrait screens (phones): widen the lens so the car still fits across, and slide the
    // picture so it clears the words: up outside (the words sit low), down in the cabin (they
    // sit high).
    const aspect = size.width / Math.max(1, size.height);
    if (aspect < 1 && w < 0.5) {
      const widen = Math.min(2.4, (1.25 / aspect) ** 0.75);
      const half = Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * widen);
      const fov = camera.fov;
      camera.fov = THREE.MathUtils.radToDeg(half * 2);
      camera.setViewOffset(
        size.width,
        size.height,
        0,
        size.height * (chapter.inside ? -0.12 : 0.17),
        size.width,
        size.height,
      );
      camera.updateProjectionMatrix();
      camera.fov = fov;
    } else {
      camera.clearViewOffset();
      camera.updateProjectionMatrix();
    }

    // The door swings on its hinge.
    if (door.current) {
      const want = -1.08 * (still ? (doorOpen() > 0.5 ? 1 : 0) : doorOpen());
      door.current.rotation.y += (want - door.current.rotation.y) * Math.min(1, dt * 6);
    }

    // Inside: the glass clears so the studio shows; the cabin light comes up.
    const inside = chapter.inside || w > 0.5 ? 1 : 0;
    for (const g of glass.current) {
      const base = (g.userData.base as number) ?? 0.5;
      g.opacity += ((inside ? base * 0.35 : base) - g.opacity) * Math.min(1, dt * 4);
    }
    const system = demo.get().system;
    if (cabinLight.current)
      cabinLight.current.intensity +=
        ((inside ? 0.6 + system.ambient * 1.4 : 0.15) - cabinLight.current.intensity) *
        Math.min(1, dt * 3);
    if (rearLight.current)
      rearLight.current.intensity +=
        ((inside ? 0.7 : 0) - rearLight.current.intensity) * Math.min(1, dt * 3);
    for (const slot of slots.current) {
      const awake = Math.max(wake(slot.id), w);
      const seat: SeatId =
        slot.id === "rearLeft" ? "rearLeft" : slot.id === "rearRight" ? "rearRight" : "driver";
      const lum = slot.id === "hud" ? 3.6 : 0.5 + 0.5 * system.seats[seat].brightness;
      slot.material.color.setScalar(awake * lum * 1.2);
    }
    if (hazard.current) {
      const on = system.sos.state !== "idle";
      const blink = on && Math.sin(frame.time * Math.PI * 2 * 1.3) > 0 ? 1 : 0;
      for (const l of hazard.current.children) (l as THREE.PointLight).intensity = blink * 5;
    }

    // The selected screen's rectangle on the page, for the demo panel to grow from.
    if (stage.get().demo) {
      const slot = slots.current.find((s) => s.id === SEAT_SURFACE[stage.get().seat]);
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

    // The visitor can turn the car a little in the studio; it is square once inside.
    if (turn.current) {
      const exterior = !chapter.inside && w < 0.01 && frame.chapter === "hero";
      const want = exterior ? frame.drag : 0;
      turn.current.rotation.y += (want - turn.current.rotation.y) * Math.min(1, dt * 4);
      if (!exterior && Math.abs(turn.current.rotation.y) < 0.002) turn.current.rotation.y = 0;
    }

    if (!drewFirst.current && group.current) {
      drewFirst.current = true;
      stage.set({ ready: true });
    }
  });

  return (
    <>
      <directionalLight position={[-4, 9, -3]} intensity={1.6} color="#fffaf2" />
      <directionalLight position={[5, 4, 6]} intensity={0.5} color="#eef2f8" />
      <hemisphereLight args={["#ffffff", "#a8a49d", 0.3]} />
      <group ref={turn}>
        {placed ? (
          <AccumulativeShadows
            temporal
            frames={lite ? 40 : 100}
            alphaTest={0.75}
            opacity={0.85}
            scale={10}
            color="#3a3631"
            position={[0, 0.002, 0]}
            resolution={lite ? 512 : 1024}
          >
            <RandomizedLight
              amount={8}
              radius={4}
              ambient={0.6}
              intensity={1.2}
              position={[0, 8, 0]}
              bias={0.0005}
            />
          </AccumulativeShadows>
        ) : null}
      </group>
      {/* The cabin's light: warm from the roof lining, and a little over the back seats. */}
      <pointLight
        ref={cabinLight}
        position={[0, 1.5, -0.1]}
        intensity={0}
        distance={2.6}
        decay={2}
        color="#ffe6cf"
      />
      <pointLight
        ref={rearLight}
        position={[0, 1.48, 0.95]}
        intensity={0}
        distance={2.4}
        decay={2}
        color="#f1f4ff"
      />
      <group ref={hazard}>
        {(
          [
            [-0.8, 0.9, -2.3],
            [0.8, 0.9, -2.3],
            [-0.82, 1.0, 2.3],
            [0.82, 1.0, 2.3],
          ] as const
        ).map((p) => (
          <pointLight
            key={p.join()}
            position={p}
            intensity={0}
            distance={3}
            decay={2}
            color="#ffa040"
          />
        ))}
      </group>
    </>
  );
}

/** The studio: a pale cyclorama (a soft gradient, lighter at the horizon) and a floor that is
 *  the same colour, so the car stands in clean space. */
function Studio() {
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const c = document.createElement("canvas");
    c.width = 4;
    c.height = 512;
    const g = c.getContext("2d");
    if (g) {
      const l = g.createLinearGradient(0, 0, 0, 512);
      l.addColorStop(0, "#c9c7c3");
      l.addColorStop(0.5, "#e2e0dc");
      l.addColorStop(0.62, "#ebe9e5");
      l.addColorStop(1, "#ebe9e5");
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
    <mesh rotation-x={-Math.PI / 2} position-y={-0.001} renderOrder={-1}>
      <circleGeometry args={[40, 96]} />
      <meshStandardMaterial color="#e3e1dd" roughness={0.95} metalness={0} />
    </mesh>
  );
}

/** The finish: ambient occlusion settles the car and darkens the cabin's corners; bloom only
 *  above full white, so only the screens and lamps glow; AgX tone mapping; a soft vignette. */
function Post({ lite }: { lite: boolean }) {
  return (
    <EffectComposer multisampling={lite ? 0 : 4} enableNormalPass={false}>
      <N8AO
        aoRadius={0.5}
        distanceFalloff={0.6}
        intensity={2}
        quality={lite ? "low" : "high"}
        halfRes={lite}
        color="#1a1714"
      />
      <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.25} intensity={0.4} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette offset={0.32} darkness={0.32} />
    </EffectComposer>
  );
}

/** The R3F canvas. `active` pauses rendering when the stage is off screen. */
export default function Scene({ lite, active }: { lite: boolean; active: boolean }) {
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={[1, lite ? 1.5 : 1.75]}
      camera={{ fov: 26, near: 0.02, far: 200, position: [-5.3, 1.05, -6.4] }}
      gl={{ antialias: true, powerPreference: "high-performance", alpha: false }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.NoToneMapping;
        gl.toneMappingExposure = 0.92;
        stage.set({ rung: "3d" });
      }}
      aria-hidden="true"
    >
      <Suspense fallback={null}>
        <Environment environmentIntensity={1} frames={1} resolution={512}>
          <color attach="background" args={["#d8d6d2"]} />
          {/* overhead softboxes, long and narrow: the highlights down the bonnet and roof */}
          <Lightformer
            form="rect"
            intensity={4}
            position={[0, 7, 0]}
            rotation-x={Math.PI / 2}
            scale={[14, 2, 1]}
          />
          <Lightformer
            form="rect"
            intensity={2}
            position={[0, 6, 4.5]}
            rotation-x={Math.PI / 2.4}
            scale={[12, 0.8, 1]}
          />
          <Lightformer
            form="rect"
            intensity={2}
            position={[0, 6, -4.5]}
            rotation-x={Math.PI / 1.7}
            scale={[12, 0.8, 1]}
          />
          {/* side strips at shoulder height: the line that runs along the doors */}
          <Lightformer
            form="rect"
            intensity={2.6}
            position={[-7, 2, 0]}
            rotation-y={Math.PI / 2}
            scale={[16, 1, 1]}
          />
          <Lightformer
            form="rect"
            intensity={2.6}
            position={[7, 2, 0]}
            rotation-y={-Math.PI / 2}
            scale={[16, 1, 1]}
          />
          {/* the pale floor, bouncing light back into the sills */}
          <Lightformer
            form="rect"
            intensity={0.9}
            color="#efece6"
            position={[0, -0.5, 0]}
            rotation-x={-Math.PI / 2}
            scale={[30, 30, 1]}
          />
        </Environment>
      </Suspense>
      <Studio />
      <Car lite={lite} />
      <Post lite={lite} />
    </Canvas>
  );
}

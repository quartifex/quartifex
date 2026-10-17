"use client";
// The 3D stage: the demo car on a moonlit road. The road is a day photo (Poly Haven, CC0)
// graded day-for-night and projected onto the ground, so the car sits on real asphalt; its
// reflections come from the same light. Headlights throw two pools onto the road; the cabin
// holds AVENUE's four screens, painted live from the demo's state.
// The camera follows the page: each chapter (camera.ts) has a start and an end pose, scroll
// says where between them we are, and the camera eases there. The demo takes over the camera
// for the seat views.
import { ContactShadows, Environment } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { gsap } from "gsap";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
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

type Finish = Partial<THREE.MeshPhysicalMaterialParameters>;

/** The finishes, by the model's material names. A deep midnight-blue paint with a clear coat. */
const FINISH: Record<string, Finish> = {
  PAINT: {
    color: "#0c1424",
    metalness: 0.62,
    roughness: 0.3,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
  },
  GLASS: { color: "#07090c", metalness: 0.1, roughness: 0.03, transparent: true, opacity: 0.72 },
  METAL_PIANO: { color: "#040506", metalness: 0.2, roughness: 0.1, clearcoat: 1 },
  METAL_SATIN: { color: "#8d939c", metalness: 1, roughness: 0.32 },
  METAL_CHROME: { color: "#d8dce2", metalness: 1, roughness: 0.08 },
  METAL_GREY: { color: "#4a4e55", metalness: 0.9, roughness: 0.4 },
  Gar_alu: { color: "#7d828a", metalness: 1, roughness: 0.3 },
  SOLID_BLACK: { color: "#07080a", metalness: 0, roughness: 0.6 },
  PLASTIC: { color: "#101216", metalness: 0, roughness: 0.72 },
  GRILLE: { color: "#15171b", metalness: 0.6, roughness: 0.38 },
  CARBON: { color: "#0e0f12", metalness: 0.3, roughness: 0.35, clearcoat: 0.8 },
  RUBBER: { color: "#0a0a0b", metalness: 0, roughness: 0.92 },
  TIRES: { color: "#0b0b0c", metalness: 0, roughness: 0.9 },
  WHEELS_FACE: { color: "#23262c", metalness: 1, roughness: 0.28 },
  WHEELS_METAL: { color: "#5d6168", metalness: 1, roughness: 0.3 },
  WHEELS_BLACK: { color: "#09090a", metalness: 0.4, roughness: 0.5 },
  LIGHTS: {
    color: "#dfe8ff",
    metalness: 0,
    roughness: 0.15,
    emissive: "#cfe0ff",
    emissiveIntensity: 2.4,
  },
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

function clock() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** Build the four screens as planes with live canvas textures, plus the dash glass bar. */
function buildScreens(): { group: THREE.Group; slots: ScreenSlot[] } {
  const group = new THREE.Group();
  group.name = "avenue-screens";
  // The black glass the driver and co-pilot screens sit in: one bar from pillar to pillar.
  const bar = new THREE.Mesh(
    new THREE.PlaneGeometry(1.18, 0.19),
    new THREE.MeshPhysicalMaterial({
      color: "#030406",
      roughness: 0.06,
      metalness: 0.3,
      clearcoat: 1,
    }),
  );
  bar.position.set(-0.03, 1.005, -0.66);
  bar.rotation.x = SCREENS.driver.tilt;
  group.add(bar);
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
  const hazard = useRef<THREE.Group>(null);
  const target = useMemo(() => new THREE.Vector3(), []);
  const goalPos = useMemo(() => new THREE.Vector3(), []);
  const goalTarget = useMemo(() => new THREE.Vector3(), []);
  const goalFov = useRef(30);
  const seatBlend = useRef({ w: 0, pose: seatPose("rearLeft") as Pose });
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
          mesh.castShadow = false;
          const old = mesh.material as THREE.MeshStandardMaterial;
          const name = old.name;
          let m = seen.get(name);
          if (!m) {
            const finish = FINISH[name];
            m = new THREE.MeshPhysicalMaterial({
              name,
              map: old.map ?? null,
              // The interior atlas reads too light at night: knock it back to espresso and graphite.
              color: old.map ? "#5e5a57" : "#1a1c20",
              roughness: old.map ? 0.66 : 0.6,
              metalness: 0,
              side: name === "GLASS" ? THREE.DoubleSide : THREE.FrontSide,
              ...(finish ?? {}),
            });
            if (name === "GLASS") {
              m.depthWrite = false;
              glass.current.push(m);
            }
            if (name === "LIGHTS") lamps.current = m;
            seen.set(name, m);
          }
          mesh.material = m;
          if (name === "GLASS") mesh.renderOrder = 2;
        });
        const built = buildScreens();
        car.add(built.group);
        screens.current = built.slots;
        group.current = car;
        drawAll();
        scene.add(car);
      })
      .catch(() => stage.set({ rung: "poster" }));
    return () => {
      disposed = true;
      if (group.current) scene.remove(group.current);
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
    if (!drewFirst.current) {
      camera.position.copy(goalPos);
      target.copy(goalTarget);
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
      g.opacity += ((inside ? 0.28 : 0.72) - g.opacity) * Math.min(1, dt * 4);
    if (cabinLight.current) {
      const ambient = demo.get().system.ambient;
      cabinLight.current.intensity +=
        ((inside ? 0.18 + ambient * 0.55 : 0) - cabinLight.current.intensity) * Math.min(1, dt * 3);
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

    state.gl.render(state.scene, camera);
    if (!drewFirst.current && group.current) {
      drewFirst.current = true;
      stage.set({ ready: true });
    }
  }, 1);

  return (
    <>
      {/* Moonlight from high behind, cool; a soft fill from the other side. */}
      <directionalLight position={[6, 9, 8]} intensity={0.9} color="#bcd0ff" />
      <directionalLight position={[-8, 4, -6]} intensity={0.25} color="#8fa7d8" />
      {/* Headlights: two pools on the road ahead of the nose. */}
      <spotLight
        position={[-0.62, 0.7, -2.45]}
        target-position={[-0.9, 0, -9]}
        angle={0.42}
        penumbra={0.9}
        intensity={60}
        distance={18}
        decay={1.6}
        color="#e6eeff"
      />
      <spotLight
        position={[0.62, 0.7, -2.45]}
        target-position={[0.9, 0, -9]}
        angle={0.42}
        penumbra={0.9}
        intensity={60}
        distance={18}
        decay={1.6}
        color="#e6eeff"
      />
      {/* Tail-lights glow on the road behind. */}
      <pointLight
        position={[0, 0.8, 2.75]}
        intensity={2.2}
        distance={3.5}
        decay={2}
        color="#ff2a1a"
      />
      <group ref={hazard}>
        <pointLight
          position={[-0.8, 0.75, -2.5]}
          intensity={0}
          distance={3}
          decay={2}
          color="#ffa040"
        />
        <pointLight
          position={[0.8, 0.75, -2.5]}
          intensity={0}
          distance={3}
          decay={2}
          color="#ffa040"
        />
        <pointLight
          position={[-0.75, 0.85, 2.5]}
          intensity={0}
          distance={3}
          decay={2}
          color="#ffa040"
        />
        <pointLight
          position={[0.75, 0.85, 2.5]}
          intensity={0}
          distance={3}
          decay={2}
          color="#ffa040"
        />
      </group>
      {/* The cabin's ambient light, warm, from the roof lining. */}
      <pointLight
        ref={cabinLight}
        position={[0, 1.25, 0.4]}
        intensity={0}
        distance={2.2}
        decay={2}
        color="#ffe2c8"
      />
      <ContactShadows
        position={[0, 0.005, 0]}
        scale={[3.2, 6.4]}
        resolution={512}
        blur={2.4}
        opacity={0.85}
        far={1.4}
        frames={1}
      />
    </>
  );
}

/** The R3F canvas. `active` pauses rendering when the stage is off screen. */
export default function Scene({ lite, active }: { lite: boolean; active: boolean }) {
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={[1, lite ? 1.5 : 1.75]}
      camera={{ fov: 30, near: 0.03, far: 200, position: [-3.9, 0.62, -5.6] }}
      gl={{ antialias: true, powerPreference: "high-performance", alpha: false }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.25;
        stage.set({ rung: "3d" });
      }}
      aria-hidden="true"
    >
      <Suspense fallback={null}>
        <Environment
          files="/media/road-night.hdr"
          background
          ground={{ height: 1.6, radius: 42, scale: 90 }}
          environmentIntensity={1.4}
          backgroundIntensity={1.0}
        />
      </Suspense>
      <Car lite={lite} />
    </Canvas>
  );
}

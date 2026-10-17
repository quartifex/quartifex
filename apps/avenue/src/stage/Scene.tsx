"use client";
// The 3D stage: the demo car in a dusk-blue studio. A cyclorama gradient and a floor that fades
// into it keep the car in clean space; its reflections come from a real sky (Poly Haven, CC0),
// so the paint and glass read as they would outdoors. The cabin holds AVENUE's four screens,
// painted live from the demo's state.
// The camera follows the page: each chapter (camera.ts) has a start and an end pose, scroll
// says where between them we are, and the camera eases there. The demo takes over the camera
// for the seat views.
import { Environment } from "@react-three/drei";
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
              m.emissiveIntensity = 0.35;
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

    state.gl.render(state.scene, camera);
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
      <directionalLight position={[6, 5, 7]} intensity={1.2} color="#a9c6ff" />
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
  const floor = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d");
    if (g) {
      const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
      r.addColorStop(0, "#fff");
      r.addColorStop(0.38, "#fff");
      r.addColorStop(1, "#000");
      g.fillStyle = r;
      g.fillRect(0, 0, 256, 256);
    }
    return new THREE.CanvasTexture(c);
  }, []);
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
  // A soft contact shadow under the car, drawn once: darkest under the sills, fading out.
  const blob = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 256;
    const g = c.getContext("2d");
    if (g) {
      g.translate(64, 128);
      g.scale(1, 2.1);
      const r = g.createRadialGradient(0, 0, 0, 0, 0, 62);
      r.addColorStop(0, "rgba(2,4,9,0.95)");
      r.addColorStop(0.55, "rgba(2,4,9,0.7)");
      r.addColorStop(1, "rgba(2,4,9,0)");
      g.fillStyle = r;
      g.fillRect(-64, -64, 128, 128);
    }
    return new THREE.CanvasTexture(c);
  }, []);
  return (
    <>
      <mesh rotation-x={-Math.PI / 2} position-y={0.003} renderOrder={1}>
        <planeGeometry args={[2.9, 5.9]} />
        <meshBasicMaterial map={blob} transparent depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.002} receiveShadow renderOrder={0}>
        <planeGeometry args={[18, 18]} />
        <shadowMaterial transparent opacity={0.42} color="#03050b" depthWrite={false} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={-0.01} renderOrder={-1}>
        <circleGeometry args={[16, 96]} />
        <meshBasicMaterial
          color="#2e3c58"
          alphaMap={floor}
          transparent
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </>
  );
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
        <Environment
          files="/media/sky.hdr"
          environmentIntensity={1}
          environmentRotation={[0, 1.2, 0]}
        />
      </Suspense>
      <Studio />
      <Car lite={lite} />
    </Canvas>
  );
}

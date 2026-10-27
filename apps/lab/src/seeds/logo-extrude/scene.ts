// logo-extrude's scene: an SVG mark parsed, extruded with a bevel and lit in a studio.
// Lab code: no API promises.
import * as T from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";

export type ExtrudeOptions = {
  svg: string;
  depth: number;
  bevel: number;
  segments: number;
  finish: "metal" | "clay" | "glass";
};

export type Extruder = {
  build: (o: ExtrudeOptions) => void;
  turn: (dx: number, dy: number) => void;
  setAuto: (on: boolean) => void;
  dispose: () => void;
};

const FINISH = {
  metal: () => new T.MeshStandardMaterial({ color: 0xd9d4c7, metalness: 1, roughness: 0.22 }),
  clay: () => new T.MeshStandardMaterial({ color: 0xff5a3c, metalness: 0, roughness: 0.75 }),
  glass: () =>
    new T.MeshPhysicalMaterial({
      color: 0x34d1bf,
      roughness: 0.08,
      transmission: 0.85,
      thickness: 1.2,
      ior: 1.45,
      clearcoat: 1,
    }),
};

export function mountExtruder(host: HTMLElement): Extruder {
  const renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.toneMapping = T.ACESFilmicToneMapping;
  host.prepend(renderer.domElement);
  const scene = new T.Scene();
  const pm = new T.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new T.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0, 9);
  const rim = new T.DirectionalLight(0xcfe0ff, 1.4);
  rim.position.set(-4, 3, -3);
  scene.add(rim);
  const key = new T.DirectionalLight(0xfff1e6, 1.8);
  key.position.set(4, 5, 6);
  scene.add(key);
  const group = new T.Group();
  scene.add(group);
  let mesh: T.Mesh | null = null;
  let yaw = -0.5;
  let pitch = 0.25;
  let auto = true;
  let raf = 0;

  const build = (o: ExtrudeOptions) => {
    if (mesh) {
      group.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as T.Material).dispose();
    }
    const data = new SVGLoader().parse(o.svg);
    const shapes = data.paths.flatMap((p) => SVGLoader.createShapes(p));
    const geo = new T.ExtrudeGeometry(shapes, {
      depth: o.depth * 20,
      bevelEnabled: o.bevel > 0,
      bevelThickness: o.bevel * 6,
      bevelSize: o.bevel * 4,
      bevelSegments: o.segments,
      curveSegments: 48,
    });
    geo.center();
    // SVG y runs down: flip y, and z with it, so the faces keep their winding
    geo.scale(0.03, -0.03, -0.03);
    geo.computeVertexNormals();
    mesh = new T.Mesh(geo, FINISH[o.finish]());
    group.add(mesh);
  };

  const fit = () => {
    const w = host.clientWidth;
    const h = host.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.z = w / h < 1 ? 13 : 9;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(fit);
  ro.observe(host);
  fit();
  let last = performance.now();
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(50, now - last);
    last = now;
    if (auto) yaw += dt * 0.0004;
    group.rotation.set(pitch, yaw, 0);
    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(frame);

  return {
    build,
    turn: (dx, dy) => {
      yaw += dx;
      pitch = Math.max(-0.8, Math.min(0.8, pitch + dy));
    },
    setAuto: (on) => {
      auto = on;
    },
    dispose: () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      if (mesh) mesh.geometry.dispose();
      renderer.dispose();
      pm.dispose();
      renderer.domElement.remove();
    },
  };
}

// mini-explode's whole scene: three parts, one value, one small file. Lab code.
import * as T from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

export type Explode = { set: (t: number) => void; turn: (dy: number) => void; dispose: () => void };

export function mountExplode(host: HTMLElement, labels: HTMLElement[]): Explode {
  const renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.toneMapping = T.ACESFilmicToneMapping;
  host.prepend(renderer.domElement);
  const scene = new T.Scene();
  const pm = new T.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new T.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(5.4, 3.4, 8.6);
  camera.lookAt(0, 1.55, 0);
  const lathe = (pts: [number, number][]) =>
    new T.LatheGeometry(
      pts.map(([x, y]) => new T.Vector2(x, y)),
      96,
    );
  const metal = new T.MeshStandardMaterial({ color: 0xd9d4c7, metalness: 1, roughness: 0.25 });
  const glass = new T.MeshPhysicalMaterial({
    color: 0x34d1bf,
    roughness: 0.15,
    transmission: 0.6,
    thickness: 0.4,
    clearcoat: 1,
  });
  const dark = new T.MeshStandardMaterial({ color: 0x1b1b1d, roughness: 0.6 });
  const base = new T.Mesh(
    lathe([
      [0, 0],
      [1.05, 0],
      [1.1, 0.08],
      [1.1, 0.28],
      [0, 0.28],
    ]),
    dark,
  );
  const body = new T.Mesh(
    lathe([
      [0, 0],
      [0.95, 0],
      [1, 0.12],
      [1, 1.7],
      [0.7, 1.95],
      [0.5, 2.05],
      [0.5, 2.2],
    ]),
    glass,
  );
  const lid = new T.Mesh(
    lathe([
      [0, 0],
      [0.62, 0],
      [0.62, 0.42],
      [0.55, 0.5],
      [0, 0.5],
    ]),
    metal,
  );
  const parts = [
    { mesh: base, rest: 0, out: -0.9 },
    { mesh: body, rest: 0.28, out: 0.28 },
    { mesh: lid, rest: 2.2, out: 3.6 },
  ];
  const group = new T.Group();
  for (const p of parts) group.add(p.mesh);
  scene.add(group);
  const key = new T.DirectionalLight(0xffffff, 1.6);
  key.position.set(3, 5, 4);
  scene.add(key);
  let t = 0;
  let yaw = 0.4;
  const v = new T.Vector3();
  const render = () => {
    for (const p of parts) p.mesh.position.y = p.rest + (p.out - p.rest) * t;
    group.rotation.y = yaw;
    renderer.render(scene, camera);
    // pin each label to the right edge of its part
    parts.forEach((p, i) => {
      const el = labels[i];
      if (!el) return;
      p.mesh.geometry.computeBoundingBox();
      const bb = p.mesh.geometry.boundingBox;
      v.set(1.15, (bb ? (bb.min.y + bb.max.y) / 2 : 0) + p.mesh.position.y, 0).project(camera);
      const r = renderer.domElement.getBoundingClientRect();
      el.style.transform = `translate(${((v.x + 1) / 2) * r.width}px, ${((1 - v.y) / 2) * r.height}px)`;
      el.style.opacity = String(Math.min(1, t * 3));
    });
  };
  const fit = () => {
    const w = host.clientWidth;
    const h = host.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 1 ? 44 : 30;
    camera.updateProjectionMatrix();
    render();
  };
  const ro = new ResizeObserver(fit);
  ro.observe(host);
  fit();
  return {
    set: (next) => {
      t = next;
      render();
    },
    turn: (dy) => {
      yaw += dy;
      render();
    },
    dispose: () => {
      ro.disconnect();
      renderer.dispose();
      pm.dispose();
      renderer.domElement.remove();
    },
  };
}

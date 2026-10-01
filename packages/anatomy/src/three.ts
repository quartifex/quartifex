// three.js binding for @quartifex/anatomy, published as `@quartifex/anatomy/three`.
// Reads the parts from an Object3D hierarchy and moves them; three.js is a peer.
import { Box3, type Object3D, Vector3 } from "three";
import { type Exploded, type ExplodeOptions, explode, type Part, type Vec3 } from "./index.js";

export type ExplosionOptions = ExplodeOptions & {
  /** How many levels below the root are parts. Default 1 (direct children). */
  levels?: number;
};

export type Explosion = {
  parts: Part[];
  /** Move every part to `progress` (0 to 1) and return the offsets and annotations. */
  set(progress: number): Exploded;
  /** Put every part back where it was. */
  reset(): void;
};

/**
 * Explode the children of `root`. A child's `name` is its id; `userData.label` gives it an
 * annotation, and `userData.explode` ([x, y, z], assembly space) overrides its direction.
 */
export function createExplosion(root: Object3D, options: ExplosionOptions = {}): Explosion {
  const levels = options.levels ?? 1;
  root.updateWorldMatrix(true, true);
  const toRoot = root.matrixWorld.clone().invert();
  const nodes: Array<{ object: Object3D; part: Part; original: Vector3 }> = [];

  const visit = (object: Object3D, depth: number) => {
    for (const child of object.children) {
      const box = new Box3().setFromObject(child);
      if (box.isEmpty()) continue;
      const center = box.getCenter(new Vector3()).applyMatrix4(toRoot);
      const data = child.userData as { label?: unknown; explode?: unknown };
      const override =
        Array.isArray(data.explode) && data.explode.length === 3
          ? (data.explode as Vec3)
          : undefined;
      nodes.push({
        object: child,
        original: child.position.clone(),
        part: {
          id: child.name || child.uuid,
          center: center.toArray() as Vec3,
          depth,
          ...(typeof data.label === "string" ? { label: data.label } : {}),
          ...(override ? { explode: override } : {}),
        },
      });
      if (depth + 1 < levels) visit(child, depth + 1);
    }
  };
  visit(root, 0);
  const parts = nodes.map((n) => n.part);

  // Offsets are in assembly (root) space; each part moves in its parent's space.
  const rootToParent = (object: Object3D, offset: Vec3) => {
    const parent = object.parent ?? root;
    const a = new Vector3(...offset).applyMatrix4(root.matrixWorld);
    const b = new Vector3(0, 0, 0).applyMatrix4(root.matrixWorld);
    const inverse = parent.matrixWorld.clone().invert();
    return a.applyMatrix4(inverse).sub(b.applyMatrix4(inverse));
  };

  return {
    parts,
    set(progress) {
      const result = explode(parts, progress, options);
      for (const node of nodes) {
        const offset = result.offsets.get(node.part.id) ?? [0, 0, 0];
        node.object.position.copy(node.original).add(rootToParent(node.object, offset));
      }
      return result;
    },
    reset() {
      for (const node of nodes) node.object.position.copy(node.original);
    },
  };
}

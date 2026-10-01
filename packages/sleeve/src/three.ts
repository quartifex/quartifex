// three.js binding for @quartifex/sleeve, published as `@quartifex/sleeve/three`. Builds
// the label as BufferGeometry and one mesh per layer (print, finish, varnish), with decals
// stacked above it. three.js is a peer.
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  type ColorRepresentation,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  NoColorSpace,
  SRGBColorSpace,
  type Texture,
} from "three";
import {
  type Band,
  type Decal,
  decalPatch,
  FINISHES,
  type Finish,
  type FinishParams,
  type SleeveOptions,
  sleeveGeometry,
} from "./index.js";

/** One printed or finished layer of the label, bottom first. */
export type SleeveLayer = {
  /** The print, authored at `labelAspect()`. Maps with no colour space are treated as sRGB. */
  map?: Texture;
  /** Where this layer exists (white) and does not (black): die-cut shapes, spot varnish, foil areas. */
  mask?: Texture;
  color?: ColorRepresentation;
  /** A preset or your own values. Default "satin". */
  finish?: Finish | Partial<FinishParams>;
};

export type SleeveDecal = Decal & { layers: SleeveLayer[] };

export type CreateSleeveOptions = SleeveOptions & {
  layers: SleeveLayer[];
  decals?: SleeveDecal[];
};

/** The label's geometry as a three.js BufferGeometry. */
export function createSleeveGeometry(band: Band, options: SleeveOptions = {}): BufferGeometry {
  const g = sleeveGeometry(band, options);
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(g.positions, 3));
  geometry.setAttribute("normal", new BufferAttribute(g.normals, 3));
  geometry.setAttribute("uv", new BufferAttribute(g.uvs, 2));
  geometry.setIndex(new BufferAttribute(g.indices, 1));
  geometry.computeBoundingSphere();
  return geometry;
}

/** A MeshPhysicalMaterial for one layer. */
export function createLayerMaterial(layer: SleeveLayer): MeshPhysicalMaterial {
  const finish: FinishParams = {
    ...FINISHES.satin,
    ...(typeof layer.finish === "string" ? FINISHES[layer.finish] : layer.finish),
  };
  if (layer.map && layer.map.colorSpace === NoColorSpace) layer.map.colorSpace = SRGBColorSpace;
  const material = new MeshPhysicalMaterial({
    roughness: finish.roughness,
    metalness: finish.metalness,
    clearcoat: finish.clearcoat,
    clearcoatRoughness: finish.clearcoatRoughness,
    color: layer.color ?? (finish.additive ? 0x000000 : 0xffffff),
  });
  if (layer.map) material.map = layer.map;
  if (layer.mask) {
    material.alphaMap = layer.mask;
    material.transparent = true;
    // Die-cut edges stay crisp in the depth buffer.
    material.alphaTest = finish.additive ? 0 : 0.5;
  }
  if (finish.additive) {
    // Black plus additive blending: only the reflections land on the print below.
    material.blending = AdditiveBlending;
    material.transparent = true;
    material.depthWrite = false;
  }
  return material;
}

function layerMeshes(
  band: Band,
  options: SleeveOptions,
  layers: SleeveLayer[],
  first: number,
  name: string,
): Mesh[] {
  return layers.map((layer, i) => {
    const mesh = new Mesh(
      createSleeveGeometry(band, { ...options, layer: first + i }),
      createLayerMaterial(layer),
    );
    mesh.name = `${name}-${i}`;
    mesh.renderOrder = first + i;
    return mesh;
  });
}

/**
 * The label as a Group: one mesh per layer, each lifted one step above the last, then the
 * decals above those. Add it to the vessel's group; the vessel's axis is the Y axis.
 */
export function createSleeve(band: Band, options: CreateSleeveOptions): Group {
  const { layers, decals = [], ...shape } = options;
  const group = new Group();
  group.name = "sleeve";
  group.add(...layerMeshes(band, shape, layers, shape.layer ?? 0, "label"));
  let next = (shape.layer ?? 0) + layers.length;
  decals.forEach((decal, i) => {
    const patch = decalPatch(band, decal);
    const options: SleeveOptions = {
      ...patch.options,
      ...(shape.lift === undefined ? {} : { lift: shape.lift }),
    };
    group.add(...layerMeshes(patch.band, options, decal.layers, next, `decal-${i}`));
    next += decal.layers.length;
  });
  return group;
}

/** Free the geometries and materials a sleeve created (not your textures). */
export function disposeSleeve(group: Group): void {
  group.traverse((object) => {
    if (object instanceof Mesh) {
      object.geometry.dispose();
      (object.material as MeshPhysicalMaterial).dispose();
    }
  });
}

// React Three Fiber adapter for @quartifex/sleeve, published as `@quartifex/sleeve/react`.
// @react-three/fiber is an optional peer, needed only here.
import type { ThreeElements } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import type { Band } from "./index.js";
import { type CreateSleeveOptions, createSleeve, disposeSleeve } from "./three.js";

export type SleeveProps = CreateSleeveOptions & {
  band: Band;
} & Pick<ThreeElements["group"], "position" | "rotation" | "scale" | "name" | "visible">;

/**
 * A label wrapped around the vessel's Y axis. Place it inside the vessel's group. The
 * geometry is rebuilt when the band or a shape option changes; textures are yours to dispose.
 */
export function Sleeve({
  band,
  layers,
  decals,
  coverage,
  seam,
  mapping,
  radialSegments,
  heightSegments,
  lift,
  thickness,
  layer,
  ...group
}: SleeveProps) {
  const { radius, radiusTop, height, y } = band;
  const sleeve = useMemo(
    () =>
      createSleeve(
        {
          radius,
          height,
          ...(radiusTop === undefined ? {} : { radiusTop }),
          ...(y === undefined ? {} : { y }),
        },
        {
          layers,
          ...(decals ? { decals } : {}),
          ...(coverage === undefined ? {} : { coverage }),
          ...(seam === undefined ? {} : { seam }),
          ...(mapping ? { mapping } : {}),
          ...(radialSegments === undefined ? {} : { radialSegments }),
          ...(heightSegments === undefined ? {} : { heightSegments }),
          ...(lift === undefined ? {} : { lift }),
          ...(thickness === undefined ? {} : { thickness }),
          ...(layer === undefined ? {} : { layer }),
        },
      ),
    [
      radius,
      radiusTop,
      height,
      y,
      layers,
      decals,
      coverage,
      seam,
      mapping,
      radialSegments,
      heightSegments,
      lift,
      thickness,
      layer,
    ],
  );
  useEffect(() => () => disposeSleeve(sleeve), [sleeve]);
  return (
    <group {...group}>
      <primitive object={sleeve} />
    </group>
  );
}

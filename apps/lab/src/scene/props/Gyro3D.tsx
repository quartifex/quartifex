"use client";

// The understudy demo's gyroscope in WebGL: three brass gimbal rings on a graphite stand,
// posed by the same angles as the pre-rendered sequence (scripts/gyro.mjs), so the hand-off
// from WebGL to the image sequence lands on the same pose. Concept visual.
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";
import { GYRO, gyroAngles } from "../../../scripts/gyro.mjs";

const BRASS = "#c9a45c";
const GRAPHITE = "#3a3d40";

/** The camera that matches the sequence's frames. */
export const GYRO_CAMERA = {
  fov: 38,
  position: [0, 1 + 6 * Math.sin(0.22), 6 * Math.cos(0.22)] as [number, number, number],
  target: [0, 1, 0] as [number, number, number],
};

function Ring({ radius, tube }: { radius: number; tube: number }) {
  return (
    <mesh castShadow>
      <torusGeometry args={[radius, tube, 16, 160]} />
      <meshPhysicalMaterial color={BRASS} metalness={1} roughness={0.28} />
    </mesh>
  );
}

/** Posed by `progress()` (0 to 1) every frame. */
export function Gyro3D({ progress }: { progress: () => number }) {
  const outer = useRef<Group>(null);
  const middle = useRef<Group>(null);
  const inner = useRef<Group>(null);
  const [r0, r1, r2] = GYRO.rings;
  useFrame(() => {
    const a = gyroAngles(progress());
    if (outer.current) outer.current.rotation.y = a.outer;
    if (middle.current) middle.current.rotation.x = a.middle;
    if (inner.current) inner.current.rotation.z = a.inner;
  });
  return (
    <group>
      <mesh position={[0, 0.03, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[0.5, 0.56, 0.06, 64]} />
        <meshPhysicalMaterial color={GRAPHITE} roughness={0.5} />
      </mesh>
      <mesh position={[0, (GYRO.centre - r0) / 2, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, GYRO.centre - r0, 24]} />
        <meshPhysicalMaterial color={GRAPHITE} roughness={0.4} />
      </mesh>
      <group position={[0, GYRO.centre, 0]}>
        <group ref={outer}>
          <Ring radius={r0} tube={0.035} />
          <group ref={middle}>
            <group rotation={[0, Math.PI / 2, 0]}>
              <Ring radius={r1} tube={0.03} />
            </group>
            <group ref={inner}>
              <group rotation={[Math.PI / 2, 0, 0]}>
                <Ring radius={r2} tube={0.025} />
                <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
                  <cylinderGeometry args={[GYRO.rotor, GYRO.rotor, 0.05, 64]} />
                  <meshPhysicalMaterial color={GRAPHITE} metalness={0.6} roughness={0.3} />
                </mesh>
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}

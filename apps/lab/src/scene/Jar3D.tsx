"use client";

// The jar, in 3D: five named parts with labels in userData (for anatomy), dark surfaces
// with teal hairline edges (the brand: hairlines, no gradients), on a hairline floor.
import { Edges } from "@react-three/drei";

const SURFACE = "#0d0e0e";
const TEAL = "#3fbead";

function Part({
  name,
  label,
  y,
  radius,
  height,
  segments = 48,
}: {
  name: string;
  label: string;
  y: number;
  radius: number;
  height: number;
  segments?: number;
}) {
  return (
    <mesh name={name} position={[0, y, 0]} userData={{ label }}>
      <cylinderGeometry args={[radius, radius, height, segments]} />
      <meshStandardMaterial color={SURFACE} roughness={0.6} metalness={0.1} />
      <Edges color={TEAL} threshold={20} />
    </mesh>
  );
}

/** The jar's parts, bottom to top. Total height about 2.2 units, centred on y = 1.1. */
export function Jar3D() {
  return (
    <>
      <Part name="base" label="Base ring" y={0.06} radius={0.62} height={0.12} />
      <Part name="body" label="Body" y={0.75} radius={0.6} height={1.26} />
      <Part name="band" label="Label band" y={0.8} radius={0.615} height={0.42} />
      <Part name="seal" label="Seal" y={1.42} radius={0.5} height={0.08} />
      <Part name="lid" label="Lid" y={1.62} radius={0.52} height={0.32} />
    </>
  );
}

/** Hairline floor grid and soft light. */
export function Stage() {
  return (
    <>
      <color attach="background" args={["#050505"]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 5, 4]} intensity={1.2} />
      <gridHelper args={[20, 40, TEAL, "#123a35"]} position={[0, 0, 0]} />
    </>
  );
}

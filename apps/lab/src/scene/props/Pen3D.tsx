"use client";

// A fountain pen for the anatomy demo, lying along the X axis: six named parts with labels
// in userData. Assembled, the cap covers the nib and section; exploding along X pulls it off
// and spreads the rest. Burgundy resin, gold trim, on a warm dark ground: concept visual.
import type { ReactNode } from "react";

const RESIN = "#4a1d22";
const GOLD = "#c9a45c";
const BLACK = "#121111";
/** Height of the pen's axis above the ground. */
const Y = 0.6;

function Part({
  name,
  label,
  x,
  children,
}: {
  name: string;
  label: string;
  x: number;
  children: ReactNode;
}) {
  return (
    <group name={name} position={[x, Y, 0]} userData={{ label }}>
      {children}
    </group>
  );
}

/** A cylinder lying along X. */
function Tube({
  r,
  r2 = r,
  length,
  color,
  metal = false,
  x = 0,
}: {
  r: number;
  r2?: number;
  length: number;
  color: string;
  metal?: boolean;
  x?: number;
}) {
  return (
    <mesh position={[x, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
      <cylinderGeometry args={[r2, r, length, 64]} />
      <meshPhysicalMaterial
        color={color}
        metalness={metal ? 1 : 0}
        roughness={metal ? 0.25 : 0.32}
        clearcoat={metal ? 0 : 1}
        clearcoatRoughness={0.08}
      />
    </mesh>
  );
}

/** The pen's parts, about 3.6 units long along X. Direct children, so anatomy sees each part. */
export function Pen3D() {
  return (
    <>
      <Part name="end-cap" label="End cap" x={-1.72}>
        <Tube r={0.15} r2={0.12} length={0.22} color={RESIN} />
        <Tube r={0.155} length={0.03} color={GOLD} metal x={0.1} />
      </Part>
      <Part name="barrel" label="Barrel" x={-0.8}>
        <Tube r={0.16} r2={0.155} length={1.62} color={RESIN} />
      </Part>
      <Part name="converter" label="Ink converter" x={-0.62}>
        <Tube r={0.085} length={1.1} color="#2b2f33" />
        <Tube r={0.09} length={0.06} color={GOLD} metal x={-0.56} />
      </Part>
      <Part name="section" label="Grip section" x={0.32}>
        <Tube r={0.14} r2={0.11} length={0.5} color={BLACK} />
      </Part>
      <Part name="nib" label="Nib" x={0.78}>
        <mesh rotation={[0, 0, -Math.PI / 2]} scale={[1, 1, 0.35]}>
          <coneGeometry args={[0.11, 0.48, 48]} />
          <meshPhysicalMaterial color={GOLD} metalness={1} roughness={0.2} />
        </mesh>
      </Part>
      <Part name="cap" label="Cap and clip" x={0.62}>
        <Tube r={0.18} r2={0.17} length={1.2} color={RESIN} />
        <Tube r={0.183} length={0.08} color={GOLD} metal x={-0.52} />
        <mesh position={[0.05, 0.2, 0]}>
          <boxGeometry args={[0.9, 0.03, 0.06]} />
          <meshPhysicalMaterial color={GOLD} metalness={1} roughness={0.25} />
        </mesh>
      </Part>
    </>
  );
}

/** Warm studio ground and light for the pen. */
export function PenStage() {
  return (
    <>
      <color attach="background" args={["#0d0b0a"]} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[2, 5, 4]} intensity={1.8} color="#fff4e6" />
      <directionalLight position={[-4, 2, -3]} intensity={0.6} color="#9fb7ff" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#0f0d0c" roughness={1} envMapIntensity={0.15} />
      </mesh>
    </>
  );
}

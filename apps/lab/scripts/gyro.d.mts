// Types for gyro.mjs, so the app can import the same gyroscope as the build script.
export declare const GYRO: {
  frames: number;
  width: number;
  height: number;
  rings: [number, number, number];
  rotor: number;
  centre: number;
};
export declare function gyroAngles(p: number): { outer: number; middle: number; inner: number };
export declare function gyroMatrices(p: number): number[][];
export declare function gyroFrame(index: number, frames?: number): string;

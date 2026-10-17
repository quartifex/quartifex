import { PerspectiveCamera } from "three";
import { texture } from "three/tsl";
import { Texture } from "three/webgpu";
import { describe, expect, it } from "vitest";
import { createTslVolumetric } from "./tsl.js";

const camera = () => {
  const c = new PerspectiveCamera(40, 16 / 9, 0.1, 100);
  c.position.set(0, 1, 6);
  c.lookAt(0, 1, 0);
  c.updateMatrixWorld();
  return c;
};

describe("tsl", () => {
  it("builds a graph and projects the light into screen space", () => {
    const v = createTslVolumetric({
      color: texture(new Texture()),
      depth: texture(new Texture()),
      sun: [0, 6, -10],
      quality: { samples: 24, resolution: 0.5, beams: 7, particles: 0, animate: false },
    });
    expect(v.node).toBeTruthy();
    v.update(camera(), 0);
    expect(v.visibility).toBe(1);
  });

  it("fades the light out when it is behind the camera", () => {
    const v = createTslVolumetric({
      color: texture(new Texture()),
      depth: texture(new Texture()),
      sun: [0, 2, 40],
    });
    v.update(camera(), 0);
    expect(v.visibility).toBe(0);
  });
});

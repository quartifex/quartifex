import { describe, expect, it } from "vitest";
import { githubLinks, parseCatalog } from "./catalog";

const lib = {
  id: "L01",
  kind: "lib",
  name: "reel",
  order: 7,
  state: "not started",
  prompt: "P2",
  category: "Scroll & sequence",
  deps: ["L29", "L02"],
  libs: null,
};

describe("parseCatalog", () => {
  it("normalises a library entry", () => {
    const [item] = parseCatalog([lib]);
    expect(item).toMatchObject({
      id: "L01",
      kind: "lib",
      name: "reel",
      deps: ["L29", "L02"],
      libs: [],
    });
    expect(item?.description).toBeNull();
  });

  it("splits a site's comma-separated library list", () => {
    const [item] = parseCatalog([
      { ...lib, id: "S01", kind: "site", name: "quasar", libs: "L01, L02,L08" },
    ]);
    expect(item?.libs).toEqual(["L01", "L02", "L08"]);
  });

  it("accepts Lab seeds, which have a description and no category", () => {
    const [item] = parseCatalog([
      {
        id: "LB01",
        kind: "lab",
        name: "glint",
        description: "Light sweep",
        order: 4,
        state: "not started",
        prompt: "P8",
      },
    ]);
    expect(item).toMatchObject({
      kind: "lab",
      description: "Light sweep",
      category: null,
      deps: [],
    });
  });

  it("rejects malformed input instead of guessing", () => {
    expect(() => parseCatalog({})).toThrow(/expected an array/);
    expect(() => parseCatalog([{ ...lib, kind: "tool" }])).toThrow(/unknown kind/);
    expect(() => parseCatalog([{ ...lib, name: "" }])).toThrow(/missing "name"/);
    expect(() => parseCatalog([{ ...lib, order: "7" }])).toThrow(/missing "order"/);
  });
});

describe("githubLinks", () => {
  const [built] = parseCatalog([{ ...lib, state: "built" }]);
  const [soon] = parseCatalog([lib]);
  const [seed] = parseCatalog([
    { id: "LB13", kind: "lab", name: "frameguide", order: 1, state: "built", prompt: "P1" },
  ]);

  it("links a built library's source and README, and nothing before it is built", () => {
    if (!built || !soon || !seed) throw new Error("fixture");
    expect(githubLinks(built)).toEqual({
      source: "https://github.com/quartifex/quartifex/tree/main/packages/reel",
      readme: "https://github.com/quartifex/quartifex/tree/main/packages/reel#readme",
    });
    expect(githubLinks(soon)).toBeNull();
    expect(githubLinks(seed)).toEqual({
      source: "https://github.com/quartifex/quartifex/tree/main/apps/lab/src/seeds/frameguide",
      readme: null,
    });
  });
});

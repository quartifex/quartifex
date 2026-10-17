# freight: avenue-car.glb

**Verdict: PASS**

| | Before | After |
| --- | --- | --- |
| File size | 2377.7 kB | 337.3 kB |
| Triangles | 69818 | 69818 |
| Vertices | 56634 | 36666 |
| Draw calls | 21 | 21 |
| Materials | 10 | 10 |
| Textures | 0, 0.0 kB | 0, 0.0 kB |
| Largest texture | 0 px | 0 px |

## Steps

- names: 5 issues
- dedupe: accessors, meshes, textures, materials
- prune: unused nodes, materials, textures, attributes
- weld: identical vertices merged, every primitive indexed
- compress: Meshopt (EXT_meshopt_compression), quantized

## Budget

| Metric | Value | Limit | |
| --- | --- | --- | --- |
| bytes | 345380 | 4000000 | pass |
| triangles | 69818 | 260000 | pass |
| drawCalls | 21 | 40 | pass |
| materials | 10 | 12 | pass |

## Names

- node "tyre": duplicate
- node "tyre": duplicate
- node "rim": duplicate
- node "tyre": duplicate
- node "rim-mirrored": duplicate

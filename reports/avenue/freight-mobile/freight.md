# freight: avenue-car-lite.glb

**Verdict: PASS**

| | Before | After |
| --- | --- | --- |
| File size | 619.6 kB | 112.7 kB |
| Triangles | 18498 | 18498 |
| Vertices | 14902 | 10134 |
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
| bytes | 115396 | 1500000 | pass |
| triangles | 18498 | 90000 | pass |
| drawCalls | 21 | 40 | pass |
| materials | 10 | 12 | pass |

## Names

- node "tyre": duplicate
- node "tyre": duplicate
- node "rim": duplicate
- node "tyre": duplicate
- node "rim-mirrored": duplicate

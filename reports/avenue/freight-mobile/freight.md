# freight: avenue-car-lite.glb

**Verdict: PASS**

| | Before | After |
| --- | --- | --- |
| File size | 789.9 kB | 152.4 kB |
| Triangles | 24294 | 24294 |
| Vertices | 18122 | 13354 |
| Draw calls | 23 | 23 |
| Materials | 12 | 12 |
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
| bytes | 156068 | 1500000 | pass |
| triangles | 24294 | 90000 | pass |
| drawCalls | 23 | 40 | pass |
| materials | 12 | 12 | pass |

## Names

- node "tyre": duplicate
- node "tyre": duplicate
- node "rim": duplicate
- node "tyre": duplicate
- node "rim-mirrored": duplicate

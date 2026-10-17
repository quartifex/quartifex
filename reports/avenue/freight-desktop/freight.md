# freight: avenue-car.glb

**Verdict: PASS**

| | Before | After |
| --- | --- | --- |
| File size | 2998.4 kB | 465.1 kB |
| Triangles | 91714 | 91714 |
| Vertices | 68226 | 48258 |
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
| bytes | 476256 | 4000000 | pass |
| triangles | 91714 | 260000 | pass |
| drawCalls | 23 | 40 | pass |
| materials | 12 | 12 | pass |

## Names

- node "tyre": duplicate
- node "tyre": duplicate
- node "rim": duplicate
- node "tyre": duplicate
- node "rim-mirrored": duplicate

---
"@quartifex/rushes": patch
"@quartifex/reel": patch
"@quartifex/heft": patch
"@quartifex/contactsheet": patch
---

Fixes and additions found while building anyframe: rushes accepts frames drawn in code
(`{ frames, render }`); reel can draw with an art-directed `stage` (for example safeframe's
crop); heft reads one app's budget from `budget.json` (`--app`) and reports paths with forward
slashes; contactsheet's report loads every image eagerly and its PNG step can no longer hang.

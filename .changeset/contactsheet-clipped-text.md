---
"@quartifex/contactsheet": patch
---

Text and tap targets are measured by the part that can be seen: clipped by any ancestor that hides or scrolls its overflow. Text scrolled out of a nested scroller (a demo's simulated page, a carousel) no longer counts as overlapping the page around it, and a target or canvas scrolled fully out of view is no longer checked.

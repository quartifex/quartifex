import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { runHeft } from "../src/index.js";

// Two synthetic pages: a light one, and a heavy one that shifts layout after load,
// blocks every scroll for 80 ms and ships a big script.
const LIGHT = `<!doctype html><html><body style="margin:0;font:16px system-ui">
<section style="height:300vh;background:#050505;color:#edeae4"><h1>Light</h1><button>Buy</button></section></body></html>`;
const HEAVY = `<!doctype html><html><body style="margin:0;font:16px system-ui">
<script src="big.js"></script>
<section style="height:300vh;background:#050505;color:#edeae4"><h1>Heavy</h1><button>Buy</button></section>
<script>
  setTimeout(() => { const ad = document.createElement("div"); ad.style.height = "400px"; document.body.prepend(ad); }, 100);
  addEventListener("scroll", () => { const until = performance.now() + 80; while (performance.now() < until) {} }, { passive: true });
  document.querySelector("button").addEventListener("click", () => { const until = performance.now() + 250; while (performance.now() < until) {} });
</script></body></html>`;

test("passes a light page and fails a heavy one on bytes, long frames, CLS and INP", async () => {
  test.setTimeout(90_000);
  const dir = await mkdtemp(path.join(tmpdir(), "heft-e2e-"));
  await writeFile(path.join(dir, "light.html"), LIGHT);
  await writeFile(path.join(dir, "heavy.html"), HEAVY);
  await writeFile(path.join(dir, "big.js"), `/*${"x".repeat(400_000)}*/`);
  const server = createServer(async (req, res) => {
    try {
      const file = path.join(dir, (req.url ?? "/").split("?")[0] as string);
      const body = await readFile(file);
      res.writeHead(200, {
        "content-type": file.endsWith(".js") ? "text/javascript" : "text/html",
      });
      res.end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const budget = {
    page: { transferBytes: 200_000, scriptBytes: 100_000 },
    scroll: { durationMs: 2500, longFrames: 2, cls: 0.1, inp: 200 },
  };
  const channel = process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {};

  const light = await runHeft({ url: `${base}/light.html`, budget, ...channel });
  expect(light.pass, light.markdown).toBe(true);
  expect(light.measurements.scroll?.frames).toBeGreaterThan(20);

  const heavy = await runHeft({ url: `${base}/heavy.html`, budget, out: dir, ...channel });
  server.close();
  const failed = heavy.findings
    .filter((f) => !f.pass)
    .map((f) => f.metric)
    .sort();
  expect(failed).toEqual([
    "page.scriptBytes",
    "page.transferBytes",
    "scroll.cls",
    "scroll.inp",
    "scroll.longFrames",
  ]);
  expect(await readFile(path.join(dir, "heft.md"), "utf8")).toContain("5 over budget");
});

// Starts the production build on a free port for the sheet and heft scripts, and stops it.
import { spawn } from "node:child_process";
import path from "node:path";

const app = path.join(import.meta.dirname, "..");
const next = path.join(app, "node_modules", "next", "dist", "bin", "next");

/** Run `fn(url)` against `next start` on `port`, then stop the server. */
export async function withServer(port, fn) {
  const server = spawn(process.execPath, [next, "start", app, "--port", String(port)], {
    stdio: ["ignore", "pipe", "inherit"],
  });
  const url = `http://localhost:${port}`;
  try {
    for (let i = 0; i < 60; i++) {
      try {
        if ((await fetch(url)).ok) break;
      } catch {
        // Not up yet.
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    return await fn(url);
  } finally {
    server.kill();
  }
}

export const REPORTS = path.join(app, "..", "..", "reports", "reelhouse");
